"""Forge Leanstral — Tier-3 formal verification for smart contracts.

v1.0: Runs solc compiler check + basic slither analysis if available.
Falls back to "manual review required" if tools are not installed.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger("forge.gates.leanstral")


@dataclass(frozen=True)
class VerificationResult:
    """Result of a Leanstral formal verification run."""

    passed: bool
    proof_output: str
    duration_ms: float
    requires_manual_review: bool = False
    error: Optional[str] = None


async def _check_tool_available(tool: str) -> bool:
    """Check if a command-line tool is available on PATH."""
    try:
        proc = await asyncio.create_subprocess_exec(
            tool, "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        return proc.returncode == 0
    except FileNotFoundError:
        return False


async def _run_solc(contract_path: str) -> tuple[bool, str]:
    """Run the Solidity compiler check.

    Args:
        contract_path: Path to the .sol file.

    Returns:
        Tuple of (passed, output).
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "solc", "--bin", contract_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, stderr_bytes = await proc.communicate()
        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        passed = proc.returncode == 0
        return passed, stdout + ("\n" + stderr if stderr else "")
    except FileNotFoundError:
        return False, "solc not found on PATH"


async def _run_slither(contract_path: str) -> tuple[bool, str]:
    """Run slither static analysis.

    Args:
        contract_path: Path to the contract file or directory.

    Returns:
        Tuple of (passed, output).
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "slither", contract_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, stderr_bytes = await proc.communicate()
        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        # Slither returns 0 when no high/medium issues found
        passed = proc.returncode == 0
        return passed, stdout + ("\n" + stderr if stderr else "")
    except FileNotFoundError:
        return False, "slither not found on PATH"


class LeanstralVerifier:
    """Tier-3 formal verification runner.

    Mandatory for all smart contract changes (contracts/ directory).
    For v1.0: runs solc compiler check + basic slither analysis if available.
    Falls back to "manual review required" when tools are unavailable.
    """

    async def verify_contract(self, contract_path: str) -> VerificationResult:
        """Run formal verification on a smart contract.

        Args:
            contract_path: Path to the contract file to verify.

        Returns:
            VerificationResult with proof status and output.
        """
        start = time.monotonic()
        contract = Path(contract_path)

        if not contract.exists():
            duration_ms = (time.monotonic() - start) * 1000
            return VerificationResult(
                passed=False,
                proof_output=f"Contract file not found: {contract_path}",
                duration_ms=duration_ms,
                error="File not found",
            )

        outputs: list[str] = []
        all_passed = True
        has_tools = False

        # Step 1: solc compiler check
        solc_available = await _check_tool_available("solc")
        if solc_available:
            has_tools = True
            solc_passed, solc_output = await _run_solc(contract_path)
            outputs.append(f"=== solc compiler check ===\n{solc_output}")
            if not solc_passed:
                all_passed = False
                logger.warning("solc check failed for %s", contract_path)
        else:
            outputs.append("solc not available, skipping compiler check")

        # Step 2: slither static analysis
        slither_available = await _check_tool_available("slither")
        if slither_available:
            has_tools = True
            slither_passed, slither_output = await _run_slither(contract_path)
            outputs.append(f"=== slither analysis ===\n{slither_output}")
            if not slither_passed:
                all_passed = False
                logger.warning("slither analysis failed for %s", contract_path)
        else:
            outputs.append("slither not available, skipping static analysis")

        duration_ms = (time.monotonic() - start) * 1000
        proof_output = "\n\n".join(outputs)

        # If no tools available, mark for manual review
        if not has_tools:
            logger.info(
                "No verification tools available for %s, marking for manual review",
                contract_path,
            )
            return VerificationResult(
                passed=False,
                proof_output=proof_output,
                duration_ms=duration_ms,
                requires_manual_review=True,
                error="No verification tools (solc, slither) available. Manual review required.",
            )

        return VerificationResult(
            passed=all_passed,
            proof_output=proof_output,
            duration_ms=duration_ms,
        )
