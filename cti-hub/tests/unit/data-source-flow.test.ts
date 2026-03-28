import { describe, expect, it } from "vitest";
import { completeDataSourceBuilder } from "../../src/ui/data-sources/data-source-flow";

describe("data source builder flow", () => {
  it("returns ready data source for chat attachment", () => {
    const source = completeDataSourceBuilder({ id: "nb-1", name: "Launch Plan" });
    expect(source.status).toBe("ready");
  });
});
