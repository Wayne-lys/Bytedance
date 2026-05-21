import { describe, expect, it } from "vitest";
import { resolveDraftConflict } from "@/features/drafts/draft-service";

describe("draft conflict resolution", () => {
  it("uses local content when local is newer and user chooses local", () => {
    const result = resolveDraftConflict({
      local: { version: 3, updatedAt: new Date("2026-05-22T10:00:00Z") },
      cloud: { version: 2, updatedAt: new Date("2026-05-22T09:00:00Z") },
      preference: "local"
    });

    expect(result.action).toBe("use-local");
    expect(result.hasConflict).toBe(true);
  });

  it("uses cloud content when cloud is newer and user chooses cloud", () => {
    const result = resolveDraftConflict({
      local: { version: 2, updatedAt: new Date("2026-05-22T09:00:00Z") },
      cloud: { version: 3, updatedAt: new Date("2026-05-22T10:00:00Z") },
      preference: "cloud"
    });

    expect(result.action).toBe("use-cloud");
    expect(result.hasConflict).toBe(true);
  });

  it("syncs without conflict when versions match", () => {
    const result = resolveDraftConflict({
      local: { version: 2, updatedAt: new Date("2026-05-22T10:00:00Z") },
      cloud: { version: 2, updatedAt: new Date("2026-05-22T10:00:00Z") },
      preference: "local"
    });

    expect(result.action).toBe("sync");
    expect(result.hasConflict).toBe(false);
  });
});
