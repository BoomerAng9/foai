"""Smoke test: full ACHEEVY → General_Ang → Chicken_Hawk → Sqwaadrun chain."""
import asyncio
from sqwaadrun.general_ang import launch_full_stack, Policy


async def main():
    # Policy that auto-approves recon so we can smoke test fast
    policy = Policy(sign_off_threshold=500, daily_quota_per_domain=1000)
    squad, general, bridge = await launch_full_stack(
        policy=policy,
        doctrine_path="./data/doctrine.jsonl",
    )
    try:
        # 1. ACHEEVY fires an intent — natural language
        print("\n─── Intent 1: 'scrape the front page' ───")
        result = await bridge.scrape_intent(
            intent="scrape the front page of example.com",
            targets=["https://example.com"],
        )
        print(f"  mission: {result['mission_id']}")
        print(f"  type:    {result['type']}")
        print(f"  status:  {result['status']}")
        print(f"  results: {result['results_count']}")
        print(f"  error:   {result['error']}")
        assert result["status"] == "completed", f"Expected completed, got {result['status']}"
        assert result["error"] is None

        # 2. Intent that routes to a different mission type
        print("\n─── Intent 2: 'discover the sitemap' ───")
        result2 = await bridge.scrape_intent(
            intent="discover the sitemap for example.com",
            targets=["https://example.com"],
        )
        print(f"  mission: {result2['mission_id']}")
        print(f"  type:    {result2['type']}")
        print(f"  status:  {result2['status']}")
        assert result2["type"] == "survey", f"Expected survey, got {result2['type']}"

        # 3. Restricted mission type held for sign-off
        print("\n─── Intent 3: 'crawl all pages' (should be held) ───")
        result3 = await bridge.scrape_intent(
            intent="crawl all pages",
            targets=["https://example.com"],
            max_pages=5,
        )
        print(f"  mission:    {result3['mission_id']}")
        print(f"  status:     {result3['status']}")
        print(f"  needs_sign: {result3['needs_sign_off']}")
        assert result3["needs_sign_off"], "SWEEP should require sign-off"

        # 4. General_Ang approves
        print("\n─── General_Ang approves ───")
        approved = await bridge.approve(result3["mission_id"])
        print(f"  status: {approved['status']}")
        assert approved["status"] == "completed"

        # 5. Status report
        print("\n─── Bridge status ───")
        status = await bridge.status()
        print(f"  pending:          {len(status['pending'])}")
        print(f"  quota domains:    {len(status['quota'])}")
        print(f"  doctrine entries: {len(status['recent_doctrine'])}")
        assert len(status["recent_doctrine"]) >= 3

        print("\nALL CHECKS PASSED")

    finally:
        await squad.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
