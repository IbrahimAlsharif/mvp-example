import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Cross-session/device duplicate detection for bulk import (US-1.3 AC-9).
 * Given a batch of content checksums (the same SHA-256 contract US-1.2 uses),
 * returns the subset that ALREADY exist as persisted, non-deleted media on the
 * account's timeline — so the import UI can surface them for skip/keep instead
 * of blindly creating doubles. Checksum-based and content-blind (G4): no media,
 * filenames, or content cross the wire — only opaque hashes the client already
 * computed.
 */
const Body = z.object({ checksums: z.array(z.string().min(16)).max(5000) });

export async function POST(req: NextRequest) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  // Server-side, account-scoped: a duplicate is one of THIS user's existing
  // persisted items — never another account's (privacy) and never a per-job-only
  // check (works across sessions/devices).
  const existing = await prisma.media.findMany({
    where: {
      accountId: account.id,
      status: "PERSISTED",
      deletedAt: null,
      checksumSha256: { in: parsed.data.checksums },
    },
    select: { checksumSha256: true },
  });

  const duplicates = Array.from(new Set(existing.map((m) => m.checksumSha256)));
  return NextResponse.json({ ok: true, duplicates });
}
