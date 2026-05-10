"""
One-off market pricing research script — fetches competitor product pages,
strips HTML, prints lines of text within +/- 90 chars of a $X.XX price.

Used by the 2026-05-09 tea/instant/functional pricing research task.
"""
import urllib.request, re, ssl, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from concurrent.futures import ThreadPoolExecutor

URLS = [
    # Final round — try Verve / Waka / Cometeer via different paths
    ("verve-shop", "https://www.vervecoffee.com/collections/shop-all-coffee"),
    ("verve-cold-brew-instant", "https://www.vervecoffee.com/products/cold-brew-instant-coffee"),
    ("waka-jar", "https://wakacoffee.com/products/colombian-jar"),
    ("cometeer-subscription", "https://cometeer.com/pages/subscription"),
    ("cometeer-shop-2", "https://cometeer.com/products/the-blend"),
    ("waka-products-json2", "https://wakacoffee.com/products.json?limit=30&page=1"),
    ("verve-products-json2", "https://www.vervecoffee.com/products.json?limit=30"),
]

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UAS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]
UA = UAS[0]


def fetch(item):
    """Fetch URL. If JSON, parse Shopify products.json into compact (title, variant, price, weight) tuples.
    If HTML, strip tags and emit price-context windows."""
    import json as _json
    import random as _random
    label, url = item
    ua = _random.choice(UAS)
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "identity",
            "DNT": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "no-cache",
        })
        with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
            body = r.read().decode("utf-8", errors="ignore")
        is_json = url.endswith(".json") or url.endswith(".json?limit=20") or "products.json" in url
        if is_json:
            try:
                data = _json.loads(body)
            except Exception:
                return (label, url, len(body), ["NON-JSON RESPONSE: " + body[:200]], None)
            lines = []
            for p in data.get("products", []):
                title = p.get("title", "?")
                ptype = p.get("product_type", "")
                tags = ",".join(p.get("tags", [])[:3]) if isinstance(p.get("tags"), list) else ""
                for v in p.get("variants", []):
                    price = v.get("price")
                    vt = v.get("title", "")
                    grams = v.get("grams")
                    sku = v.get("sku", "")
                    lines.append(f"{title} | type={ptype} | variant={vt} | ${price} | {grams}g | sku={sku} | tags={tags}")
            return (label, url, len(body), lines[:80], None)
        # HTML fallback
        s = re.sub(r"<script[\s\S]*?</script>", " ", body, flags=re.I)
        s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
        s = re.sub(r"<[^>]+>", " ", s)
        s = (s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&#39;", "'")
              .replace("&quot;", '"').replace("&#x27;", "'"))
        s = re.sub(r"\s+", " ", s)
        hits = re.findall(r".{0,90}\$\s?\d{1,3}(?:\.\d{2})?.{0,90}", s)
        seen, uniq = set(), []
        for h in hits:
            k = h.strip()
            if k not in seen:
                seen.add(k)
                uniq.append(k)
        return (label, url, len(body), uniq[:30], None)
    except Exception as e:
        return (label, url, 0, [], str(e))


def main():
    # Sequential, long pacing to avoid Cloudflare anti-bot.
    import time, random
    results = []
    for u in URLS:
        results.append(fetch(u))
        time.sleep(random.uniform(8.0, 15.0))
    for label, url, size, hits, err in results:
        print(f"\n=== {label} === size={size}")
        if err:
            print("  ERR:", err)
            continue
        for h in hits:
            print("  *", h.strip())


if __name__ == "__main__":
    main()
