import { env } from "@/lib/env";

/**
 * AI compose service (US-AI) — turns a user's prompt or rough note into a
 * polished Arabic memory entry the user can then edit.
 *
 * Two modes share one contract so the UI never changes:
 *  - "generate": the user gives an idea/prompt → produce a memory from scratch.
 *  - "improve":  the user has a rough draft → tighten + enrich it, same meaning.
 *
 * Engine is swappable. With no ANTHROPIC_API_KEY set we use a local heuristic
 * stub so the feature is fully usable in dev without a key; setting the key
 * switches to Claude with zero UI/contract change. Claude cannot be called by
 * the coding agent at runtime — this server route is the real caller.
 */

export type ComposeMode = "generate" | "improve";

export interface ComposeInput {
  mode: ComposeMode;
  /** generate: the idea/prompt. improve: the rough draft. */
  text: string;
  /** Optional context to ground the suggestion. */
  date?: string;
  hasMedia?: boolean;
}

export interface ComposeResult {
  text: string;
  engine: "claude" | "stub";
}

export const isAiLive = env.ANTHROPIC_API_KEY.length > 0;

export async function compose(input: ComposeInput): Promise<ComposeResult> {
  const text = input.text.trim();
  if (!text) throw new ComposeError("empty_input");
  if (text.length > 4000) throw new ComposeError("too_long");

  if (isAiLive) {
    const out = await composeWithClaude(input);
    return { text: out, engine: "claude" };
  }
  return { text: stubCompose(input), engine: "stub" };
}

export class ComposeError extends Error {}

// --- Claude engine (active when ANTHROPIC_API_KEY is set) -------------------
// Lazily import the SDK so the dependency is optional until a key is present.
async function composeWithClaude({ mode, text, date, hasMedia }: ComposeInput): Promise<string> {
  // Dynamic import keeps @anthropic-ai/sdk out of the bundle when unused.
  const { default: Anthropic } = await import("@anthropic-ai/sdk").catch(() => {
    throw new ComposeError("sdk_missing"); // key set but package not installed
  });
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const system =
    "أنت مساعد يكتب مدخلات يوميات/ذكريات شخصية بالعربية الفصحى المبسطة، بنبرة دافئة وصادقة وموجزة. " +
    "اكتب فقرة واحدة قصيرة (٢-٤ جمل) بصيغة المتكلم. لا تخترع تفاصيل غير موجودة. أعد النص فقط دون مقدمات.";
  const task =
    mode === "generate"
      ? `اكتب ذكرى من هذه الفكرة: «${text}».`
      : `حسّن صياغة هذه الذكرى مع الحفاظ على معناها وحقائقها: «${text}».`;
  const grounding = [
    date ? `التاريخ: ${date}.` : "",
    hasMedia ? "مرفق بها وسائط." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const msg = await client.messages.create({
    model: env.AI_MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: `${task} ${grounding}`.trim() }],
  });
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new ComposeError("empty_response");
  return block.text.trim();
}

// --- Stub engine (default; deterministic, no network) -----------------------
function stubCompose({ mode, text }: ComposeInput): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (mode === "improve") {
    // Light touch: ensure it ends on a full stop and reads as a complete thought.
    const ended = /[.!؟…]$/.test(clean) ? clean : clean + ".";
    return `${ended} لحظة أردتُ أن أحفظها كما هي.`;
  }
  // generate: wrap the idea into a first-person memory shell.
  return `اليوم ${clean}. كان يومًا أردتُ أن أوثّقه لأعود إليه لاحقًا.`;
}
