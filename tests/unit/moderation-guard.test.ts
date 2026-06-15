import { describe, it, expect } from "vitest";
import {
  authorizeAccountAction,
  isHumanActor,
  AutoActionBlocked,
} from "@/lib/moderation/guard";

describe("US-3.4 account-action choke point (AC-3/AC-6/AC-10)", () => {
  it("only a human reviewer is an authorized actor", () => {
    expect(isHumanActor("human_reviewer")).toBe(true);
    expect(isHumanActor("automated")).toBe(false);
    expect(isHumanActor("system_job")).toBe(false);
  });

  it("a human reviewer may take an account action", () => {
    expect(() => authorizeAccountAction({ actor: "human_reviewer", action: "hold" })).not.toThrow();
    expect(() => authorizeAccountAction({ actor: "human_reviewer", action: "restore" })).not.toThrow();
  });

  it("any non-human actor is BLOCKED from every account-affecting action (no auto-ban)", () => {
    for (const action of ["delete", "lock", "suspend", "ban", "hold"] as const) {
      expect(() => authorizeAccountAction({ actor: "automated", action })).toThrow(AutoActionBlocked);
      expect(() => authorizeAccountAction({ actor: "system_job", action })).toThrow(AutoActionBlocked);
    }
  });

  it("the blocked-attempt error names the action (for the defect-signal telemetry)", () => {
    try {
      authorizeAccountAction({ actor: "automated", action: "delete" });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AutoActionBlocked);
      expect((e as AutoActionBlocked).action).toBe("delete");
    }
  });
});
