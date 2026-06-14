import { describe, it, expect } from "vitest";
import type { ConnectionTier } from "@prisma/client";
import { canonicalPair, groupByTier, type TieredEdge } from "@/lib/connections";

const A = "acc_aaa";
const B = "acc_bbb";
const C = "acc_ccc";

function edge(x: string, y: string, tier: ConnectionTier): TieredEdge {
  const [accountAId, accountBId] = canonicalPair(x, y);
  return { accountAId, accountBId, tier };
}

describe("canonicalPair (one row per unordered pair)", () => {
  it("orders the pair the same way regardless of argument order", () => {
    expect(canonicalPair(A, B)).toEqual([A, B]);
    expect(canonicalPair(B, A)).toEqual([A, B]); // same canonical result
  });

  it("puts the lexicographically smaller id first", () => {
    const [low, high] = canonicalPair(C, A);
    expect(low).toBe(A);
    expect(high).toBe(C);
  });
});

describe("groupByTier (whose events the viewer may see)", () => {
  it("returns the OTHER side of each edge, split by tier", () => {
    const edges = [edge(A, B, "FAMILY"), edge(A, C, "GENERAL")];
    const { family, general } = groupByTier(A, edges);
    expect([...family]).toEqual([B]);
    expect([...general]).toEqual([C]);
  });

  it("works the same when `accountId` is the canonical-B side of an edge", () => {
    // C > A so the edge stores accountA=A, accountB=C; querying as C must still
    // surface A as the counterpart.
    const { general } = groupByTier(C, [edge(A, C, "GENERAL")]);
    expect([...general]).toEqual([A]);
  });

  it("never includes the viewer themselves", () => {
    const { family, general } = groupByTier(A, [edge(A, B, "FAMILY")]);
    expect(family.has(A)).toBe(false);
    expect(general.has(A)).toBe(false);
  });

  it("a FAMILY edge grants FAMILY tier (broader visibility), GENERAL grants only general", () => {
    const fam = groupByTier(A, [edge(A, B, "FAMILY")]);
    expect(fam.family.has(B)).toBe(true);
    expect(fam.general.has(B)).toBe(false);

    const gen = groupByTier(A, [edge(A, B, "GENERAL")]);
    expect(gen.general.has(B)).toBe(true);
    expect(gen.family.has(B)).toBe(false);
  });

  it("empty graph yields empty sets", () => {
    const { family, general } = groupByTier(A, []);
    expect(family.size).toBe(0);
    expect(general.size).toBe(0);
  });
});
