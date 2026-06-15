import { NextResponse } from "next/server";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { buildAccountExport, verifyExportIntegrity } from "@/lib/events/export";
import { emit } from "@/lib/telemetry";

/**
 * GET /api/export — the J4 step-5 open-format export (US-4 portability /
 * "outlive the company"). Auth-gated; exports ONLY the caller's own data as a
 * downloadable JSON attachment. Content-blind telemetry records the count only,
 * never content.
 */
export async function GET() {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  emit("export_requested", {});
  const data = await buildAccountExport(account.id);
  // Self-verify the manifest before delivery (US-1.4 AC-4). A read-only check;
  // it never mutates the source. A mismatch is surfaced as a content-blind
  // signal rather than silently shipping a corrupt archive.
  const problems = verifyExportIntegrity(data);
  emit("account_export", { event_count: data.eventCount });
  emit("export_integrity_verified", { result: problems.length === 0 ? "ok" : "mismatch" });
  emit("export_completed", { media_count: data.manifest.mediaCount });

  const stamp = data.exportedAt.slice(0, 10);
  const filename = `human-timeline-export-${stamp}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
