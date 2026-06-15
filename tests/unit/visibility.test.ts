import { describe, it, expect } from "vitest";
import { visibilityClauses } from "@/lib/events/create";

const ME = "acc_me";
const FAM = "acc_family";
const GEN = "acc_general";
const STRANGER = "acc_stranger";

/**
 * The load-bearing J3/J9 visibility invariant, tested at the query-clause level
 * (no DB): a FAMILY connection sees FAMILY+PUBLIC_UNLISTED, a GENERAL connection
 * sees PUBLIC_UNLISTED only, ME_ONLY is never shared, strangers see nothing.
 */
describe("visibilityClauses (graph-backed timeline read path)", () => {
  it("always includes the viewer's own events (every circle)", () => {
    const or = visibilityClauses(ME, new Set(), new Set());
    expect(or).toEqual([{ accountId: ME }]);
  });

  it("a FAMILY connection adds that author's FAMILY events and PUBLIC_UNLISTED events", () => {
    const or = visibilityClauses(ME, new Set([FAM]), new Set());
    expect(or).toContainEqual({ accountId: ME });
    expect(or).toContainEqual({ accountId: { in: [FAM] }, circle: "FAMILY" });
    expect(or).toContainEqual({ accountId: { in: [FAM] }, circle: "PUBLIC_UNLISTED" });
  });

  it("a GENERAL connection adds ONLY that author's PUBLIC_UNLISTED events (never FAMILY)", () => {
    const or = visibilityClauses(ME, new Set(), new Set([GEN]));
    const familyBranch = or.find((c) => (c as any).circle === "FAMILY");
    expect(familyBranch).toBeUndefined();
    expect(or).toContainEqual({ accountId: { in: [GEN] }, circle: "PUBLIC_UNLISTED" });
  });

  it("NEVER emits a branch that could return another account's ME_ONLY", () => {
    const or = visibilityClauses(ME, new Set([FAM]), new Set([GEN]));
    const leaks = or.filter(
      (c) => (c as any).circle === "ME_ONLY" || ((c as any).accountId?.in && !(c as any).circle),
    );
    // the only unconstrained-circle branch is the viewer's OWN events
    expect(leaks).toEqual([]);
  });

  it("a stranger (no connection) contributes no branch — only own events remain", () => {
    const or = visibilityClauses(ME, new Set(), new Set());
    expect(or.some((c) => JSON.stringify(c).includes(STRANGER))).toBe(false);
    expect(or).toHaveLength(1);
  });

  it("an account that is BOTH family and general (shouldn't happen, but) still never gets FAMILY via general only", () => {
    // family set wins for the FAMILY branch; PUBLIC branch dedupes the id
    const or = visibilityClauses(ME, new Set([FAM]), new Set([FAM]));
    const pub = or.filter((c) => (c as any).circle === "PUBLIC_UNLISTED");
    expect(pub).toHaveLength(1);
    expect((pub[0] as any).accountId.in).toEqual([FAM]);
  });
});
