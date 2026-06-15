import { describe, it, expect } from "vitest";
import { visibilityClauses } from "@/lib/events/create";

const ME = "acc_me";
const FAM = "acc_family";
const GEN = "acc_general";
const STRANGER = "acc_stranger";

/**
 * The load-bearing J3/J9 visibility invariant, tested at the query-clause level
 * (no DB): a FAMILY connection sees FAMILY+PUBLIC_UNLISTED, a GENERAL connection
 * sees PUBLIC_UNLISTED only, ME_ONLY is never shared, and any author's PUBLIC is
 * visible to every authenticated viewer (the only connection-free cross-account
 * branch). Strangers see only their own events + any author's PUBLIC.
 */
describe("visibilityClauses (graph-backed timeline read path)", () => {
  it("always includes the viewer's own events plus the unconditional PUBLIC branch", () => {
    const or = visibilityClauses(ME, new Set(), new Set());
    expect(or).toContainEqual({ accountId: ME });
    // PUBLIC is visible to any authenticated viewer regardless of connection,
    // so it is always present as an account-unconstrained, circle-scoped branch.
    expect(or).toContainEqual({ circle: "PUBLIC" });
  });

  it("the PUBLIC branch has NO accountId filter (any author) but IS circle-scoped to PUBLIC only", () => {
    const or = visibilityClauses(ME, new Set([FAM]), new Set([GEN]));
    const pub = or.filter((c) => (c as any).circle === "PUBLIC");
    expect(pub).toHaveLength(1);
    expect((pub[0] as any).accountId).toBeUndefined(); // any author
    // and it never widens to other circles
    expect(Object.keys(pub[0] as object)).toEqual(["circle"]);
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

  it("a stranger (no connection) contributes no per-author branch — only own events + global PUBLIC remain", () => {
    const or = visibilityClauses(ME, new Set(), new Set());
    expect(or.some((c) => JSON.stringify(c).includes(STRANGER))).toBe(false);
    // own-events branch + the unconditional PUBLIC branch, nothing else
    expect(or).toHaveLength(2);
    expect(or).toContainEqual({ accountId: ME });
    expect(or).toContainEqual({ circle: "PUBLIC" });
  });

  it("an account that is BOTH family and general (shouldn't happen, but) still never gets FAMILY via general only", () => {
    // family set wins for the FAMILY branch; PUBLIC branch dedupes the id
    const or = visibilityClauses(ME, new Set([FAM]), new Set([FAM]));
    const pub = or.filter((c) => (c as any).circle === "PUBLIC_UNLISTED");
    expect(pub).toHaveLength(1);
    expect((pub[0] as any).accountId.in).toEqual([FAM]);
  });
});
