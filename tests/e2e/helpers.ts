import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

/**
 * E2E helpers that talk to the DB directly to set up fixtures (invitations) and
 * to read the dev-only confirm token, so the browser test drives the real app
 * without a mail provider. Uses its own PrismaClient (separate process from the
 * dev server).
 */
const prisma = new PrismaClient();

export async function createInvite(email?: string): Promise<string> {
  const token = "e2e-" + randomBytes(8).toString("hex");
  await prisma.invitation.create({
    data: { token, email: email?.toLowerCase(), expiresAt: new Date(Date.now() + 3600_000) },
  });
  return token;
}

export async function latestConfirmToken(email: string): Promise<string> {
  const acc = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });
  if (!acc) throw new Error("account not found for " + email);
  const tok = await prisma.emailToken.findFirst({
    where: { accountId: acc.id, purpose: "confirm", usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!tok) throw new Error("confirm token not found");
  return tok.token;
}

export async function cleanupEmail(email: string): Promise<void> {
  await prisma.account.deleteMany({ where: { email: email.toLowerCase() } });
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export function uniqueEmail(tag: string): string {
  return `e2e.${tag}.${randomBytes(5).toString("hex")}@example.com`;
}

/**
 * Register + confirm an account directly against the API using the given
 * Playwright request context, so that context is left holding a logged-in
 * session cookie. Used to create the "second account" for the privacy check.
 */
export async function registerAndConfirm(
  request: { post: (url: string, opts: { data: unknown }) => Promise<{ json: () => Promise<{ devConfirmUrl?: string }> }>; get: (url: string) => Promise<unknown> },
  email: string,
): Promise<void> {
  const invite = await createInvite();
  const res = await request.post("/api/auth/signup", {
    data: { email, password: "password123", invite },
  });
  const body = await res.json();
  if (!body.devConfirmUrl) throw new Error("no devConfirmUrl (is the server in dev mode?)");
  await request.get(body.devConfirmUrl);
}
