import { describe, expect, it } from "vitest";
import { buildGeneratedTags, removeTopicTag } from "@/features/ai/generated-tags";

describe("generated tags", () => {
  it("builds short tags without copying the full topic", () => {
    const tags = buildGeneratedTags("头条", "通勤路上的轻量补能");

    expect(tags).toEqual(["头条", "AI创作", "短图文", "内容清单"]);
    expect(tags).not.toContain("通勤路上的轻量补能");
  });

  it("removes a cached full topic tag from comma-separated tag text", () => {
    expect(
      removeTopicTag("头条,AI创作,短图文,通勤路上的轻量补能", "通勤路上的轻量补能")
    ).toBe("头条,AI创作,短图文");
  });
});
