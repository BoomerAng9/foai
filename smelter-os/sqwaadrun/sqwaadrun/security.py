"""
Sqwaadrun Security Hardening Module
======================================
SSRF prevention, input validation, output sanitization, rate limiting,
audit logging, and abuse detection for the Sqwaadrun HTTP gateway.

Per Rish 2026-04-09: "secure the hell out of the code and protect it
from threats" BEFORE any commercial/SaaS deployment.

OWASP Top 10 coverage:
  A01 Broken Access Control   → auth_middleware + per-user quotas
  A03 Injection               → URL validation, no shell injection paths
  A05 Security Misconfiguration → bind to 127.0.0.1 in prod, not 0.0.0.0
  A07 SSRF                    → validate_target_url() blocks internal networks
  A09 Logging & Monitoring    → audit_log() on every mission
  A10 Server-Side Request Forgery → comprehensive SSRF blocklist
"""

import hashlib
import ipaddress
import logging
import os
import re
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger("Sqwaadrun.Security")

# ═════════════════════════════════════════════════════════════════
#  SSRF PREVENTION
# ═════════════════════════════════════════════════════════════════

# Networks that MUST NEVER be scraped
BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),         # RFC1918 private
    ipaddress.ip_network("172.16.0.0/12"),      # RFC1918 private
    ipaddress.ip_network("192.168.0.0/16"),     # RFC1918 private
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local (AWS/GCP metadata!)
    ipaddress.ip_network("100.64.0.0/10"),      # Carrier-grade NAT
    ipaddress.ip_network("0.0.0.0/8"),          # This network
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    ipaddress.ip_network("::1/128"),            # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),          # IPv6 link-local
]

# Hostnames that MUST NEVER be scraped (cloud metadata endpoints)
BLOCKED_HOSTNAMES = {
    "metadata.google.internal",
    "metadata.google.com",
    "169.254.169.254",          # AWS/GCP/Azure metadata
    "metadata",
    "localhost",
    "0.0.0.0",
    "kubernetes.default",
    "kubernetes.default.svc",
}

# Schemes we allow
ALLOWED_SCHEMES = {"http", "https"}

# Blocked schemes
BLOCKED_SCHEMES = {"file", "ftp", "gopher", "data", "javascript", "vbscript"}


class SSRFError(ValueError):
    """Raised when a target URL fails SSRF validation."""
    pass


def validate_target_url(url: str) -> str:
    """
    Validate a target URL against SSRF attacks. Returns the cleaned URL
    or raises SSRFError with a descriptive message.

    Checks:
    1. Scheme is http or https
    2. Hostname is not on the blocklist
    3. Resolved IP is not in a private/internal network
    4. No redirect to internal networks (checked at request time)
    5. Port is standard (80, 443) or in allowed range
    """
    if not url or not isinstance(url, str):
        raise SSRFError("empty or invalid URL")

    url = url.strip()

    # Parse
    try:
        parsed = urlparse(url)
    except Exception:
        raise SSRFError(f"malformed URL: {url[:100]}")

    # Scheme check
    scheme = (parsed.scheme or "").lower()
    if scheme in BLOCKED_SCHEMES:
        raise SSRFError(f"blocked scheme: {scheme}")
    if scheme not in ALLOWED_SCHEMES:
        raise SSRFError(f"unsupported scheme: {scheme}. Use http or https.")

    # Hostname check
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise SSRFError("no hostname in URL")
    if hostname in BLOCKED_HOSTNAMES:
        raise SSRFError(f"blocked hostname: {hostname}")

    # If hostname is a raw IP address, check it against blocked networks DIRECTLY
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        ip = None  # Not an IP literal — hostname will be DNS-resolved below

    if ip is not None:
        for network in BLOCKED_NETWORKS:
            if ip in network:
                raise SSRFError(
                    f"blocked IP address: {hostname} (in {network})"
                )

    # Port check (allow standard + high ports, block internal service ports)
    port = parsed.port
    if port and port not in (80, 443):
        raise SSRFError(f"blocked port: {port}")

    # DNS resolution check — resolve hostname and verify IP isn't internal
    try:
        resolved = socket.getaddrinfo(hostname, port or 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for family, _, _, _, sockaddr in resolved:
            ip_str = sockaddr[0]
            try:
                ip = ipaddress.ip_address(ip_str)
                for network in BLOCKED_NETWORKS:
                    if ip in network:
                        raise SSRFError(
                            f"hostname {hostname} resolves to internal IP {ip_str} "
                            f"(blocked network {network})"
                        )
            except ValueError:
                pass  # Non-IP address in resolution — unlikely but skip
    except SSRFError:
        raise
    except socket.gaierror:
        raise SSRFError(f"DNS resolution failed for {hostname}")
    except Exception as e:
        logger.warning(f"SSRF DNS check error for {hostname}: {e}")
        # Fail closed on DNS errors — block unknown hostnames
        raise SSRFError(f"DNS check failed for {hostname}: {e}")

    return url


def validate_targets(targets: list[str]) -> list[str]:
    """Validate a list of target URLs. Returns cleaned URLs, raises on first failure."""
    if not targets:
        raise SSRFError("no targets provided")
    if len(targets) > 500:
        raise SSRFError(f"too many targets: {len(targets)} (max 500)")

    cleaned = []
    for url in targets:
        cleaned.append(validate_target_url(url))
    return cleaned


# ═════════════════════════════════════════════════════════════════
#  INPUT SANITIZATION
# ═════════════════════════════════════════════════════════════════

MAX_INTENT_LENGTH = 2000
MAX_CONFIG_DEPTH = 3
MAX_CONFIG_SIZE = 10000  # characters when serialized

def sanitize_intent(intent: str) -> str:
    """Sanitize the intent string — strip control chars, limit length."""
    if not intent or not isinstance(intent, str):
        return ""
    # Strip control characters except newlines and tabs
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', intent)
    return cleaned[:MAX_INTENT_LENGTH]


def sanitize_config(config: dict, depth: int = 0) -> dict:
    """Recursively sanitize config dict — limit depth, strip dangerous keys."""
    if depth > MAX_CONFIG_DEPTH:
        return {}
    if not isinstance(config, dict):
        return {}

    BLOCKED_KEYS = {
        '__proto__', 'constructor', 'prototype',
        '__import__', 'eval', 'exec', 'system',
    }

    cleaned = {}
    for k, v in config.items():
        if not isinstance(k, str) or k in BLOCKED_KEYS:
            continue
        if isinstance(v, dict):
            cleaned[k] = sanitize_config(v, depth + 1)
        elif isinstance(v, (str, int, float, bool, type(None))):
            cleaned[k] = v
        elif isinstance(v, list):
            cleaned[k] = [
                item for item in v
                if isinstance(item, (str, int, float, bool, type(None)))
            ][:100]  # cap list length
    return cleaned


# ═════════════════════════════════════════════════════════════════
#  OUTPUT SANITIZATION
# ═════════════════════════════════════════════════════════════════

def sanitize_output(result: dict) -> dict:
    """Strip internal paths, IPs, and sensitive info from API responses."""
    import json
    text = json.dumps(result)

    # Strip absolute file paths (Windows and Unix)
    text = re.sub(r'[A-Z]:\\Users\\[^\s"]+', '[REDACTED_PATH]', text)
    text = re.sub(r'/home/[^\s"]+', '[REDACTED_PATH]', text)
    text = re.sub(r'/opt/[^\s"]+', '[REDACTED_PATH]', text)
    text = re.sub(r'/tmp/[^\s"]+', '[REDACTED_PATH]', text)

    # Strip internal IPs that might leak
    text = re.sub(r'(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d+\.\d+', '[REDACTED_IP]', text)

    # Strip API keys that might appear in error messages
    text = re.sub(r'(?:api[_-]?key|token|secret|password|authorization)["\s:=]+["\']?[A-Za-z0-9_\-]{20,}', '[REDACTED_SECRET]', text, flags=re.IGNORECASE)

    return json.loads(text)


# ═════════════════════════════════════════════════════════════════
#  RATE LIMITING (per-IP, sliding window)
# ═════════════════════════════════════════════════════════════════

class RateLimiter:
    """In-memory sliding-window rate limiter per client IP."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self._buckets: dict[str, list[float]] = {}

    def check(self, client_ip: str) -> tuple[bool, int]:
        """Returns (allowed, remaining). Prunes expired entries."""
        now = time.monotonic()
        bucket = self._buckets.setdefault(client_ip, [])
        # Prune expired
        cutoff = now - self.window
        self._buckets[client_ip] = [t for t in bucket if t > cutoff]
        bucket = self._buckets[client_ip]

        if len(bucket) >= self.max_requests:
            return False, 0

        bucket.append(now)
        return True, self.max_requests - len(bucket)


# Global rate limiter instances
mission_limiter = RateLimiter(max_requests=30, window_seconds=60)
scrape_limiter = RateLimiter(max_requests=60, window_seconds=60)
health_limiter = RateLimiter(max_requests=120, window_seconds=60)


# ═════════════════════════════════════════════════════════════════
#  AUDIT LOGGING
# ═════════════════════════════════════════════════════════════════

AUDIT_DIR = Path(os.environ.get("SQWAADRUN_AUDIT_DIR", "./data/audit"))

def audit_log(
    event_type: str,
    client_ip: str,
    user_id: Optional[str] = None,
    targets: Optional[list[str]] = None,
    result_status: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    """
    Append an audit entry to the daily log. Every mission, every
    auth failure, every rate limit hit gets logged.
    """
    try:
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_path = AUDIT_DIR / f"audit-{today}.jsonl"

        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "event": event_type,
            "client_ip": client_ip,
            "user_id": user_id,
            "targets": (targets or [])[:10],  # cap logged targets
            "status": result_status,
            "details": details or {},
        }

        import json
        with open(log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.warning(f"audit_log write failed: {e}")


# ═════════════════════════════════════════════════════════════════
#  DEPENDENCY AUDIT HELPER
# ═════════════════════════════════════════════════════════════════

def check_dependencies() -> dict:
    """
    Check installed Python packages for known issues.
    Returns a summary dict. Run at startup.
    """
    import importlib.metadata as meta
    issues = []
    installed = {d.metadata["Name"].lower(): d.metadata["Version"] for d in meta.distributions()}

    # Known-vulnerable package versions (add as discovered)
    KNOWN_VULNS = {
        "aiohttp": {"below": "3.9.0", "cve": "CVE-2024-23829 HTTP request smuggling"},
        "cryptography": {"below": "42.0.0", "cve": "CVE-2023-50782 RSA decryption timing"},
    }

    for pkg, vinfo in KNOWN_VULNS.items():
        if pkg in installed:
            # Simple version comparison (major.minor only)
            current = installed[pkg]
            threshold = vinfo["below"]
            if current < threshold:
                issues.append({
                    "package": pkg,
                    "installed": current,
                    "minimum_safe": threshold,
                    "cve": vinfo["cve"],
                })

    return {
        "total_packages": len(installed),
        "issues_found": len(issues),
        "issues": issues,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
