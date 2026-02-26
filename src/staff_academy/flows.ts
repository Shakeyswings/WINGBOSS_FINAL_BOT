import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import { loadBank, pickForRole, gradeQuestion, type Role } from "./bank.ts";
import { getRole, setRole } from "./profile.repo.ts";
import { logAttempt } from "./attempts.repo.ts";

function staffId(ctx: WBContext) {
  return String(ctx.from?.id ?? "");
}

function isAllowed(ctx: WBContext) {
  const id = staffId(ctx);
  if (id === String(ctx.env.OWNER_TELEGRAM_ID)) return true;

  const csv = String(ctx.env.STAFF_ALLOWLIST_IDS ?? "");
  const allow = new Set(csv.split(",").map((s) => s.trim()).filter(Boolean));
  return allow.has(id);
}

function lang(ctx: WBContext) {
  return (ctx.session.lang ?? ctx.env.DEFAULT_LANG) === "km" ? "km" : "en";
}

function tr(ctx: WBContext, kmText: string, enText: string) {
  return lang(ctx) === "km" ? kmText : enText;
}

function cbData(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

async function respond(ctx: WBContext, text: string, keyboard?: any) {
  await ctx.reply(text, Markup.removeKeyboard());
  if (keyboard) return ctx.reply("—", keyboard);
}

const ROLES: Role[] = ["Cook", "Fryer", "Waitress", "Bartender", "Manager"];

export async function academyFlow(ctx: WBContext) {
  if (!isAllowed(ctx)) return ctx.reply("⛔ Staff Academy is gated.");

  const data = cbData(ctx) || "academy:home";
  const parts = data.split(":");
  const step = parts[1] ?? "home";
  const a = parts[2];
  const b = parts[3];

  const sid = staffId(ctx);
  const role = (await getRole(sid)) ?? "Cook";

  if (step === "home") {
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("✅ Continue Training", "academy:drill")],
      [Markup.button.callback("🧠 Quick Drill", "academy:drill")],
      [Markup.button.callback(`🧑‍🍳 Role: ${role}`, "academy:role")],
      [Markup.button.callback("🧾 My Progress", "academy:progress")]
    ]);
    return respond(ctx, "🎓 Staff Academy\nTrain → Drill → Verify → Certify", kb);
  }

  if (step === "role") {
    const rows = ROLES.map((r) => [Markup.button.callback(r, `academy:set_role:${r}`)]);
    rows.push([Markup.button.callback("⬅️ Back", "academy:home")]);
    return respond(ctx, "Choose your role:", Markup.inlineKeyboard(rows));
  }

  if (step === "set_role") {
    const nextRole = a as Role;
    if (!ROLES.includes(nextRole)) return respond(ctx, "Invalid role.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "academy:role")]]));
    await setRole(sid, nextRole);
    return respond(ctx, `✅ Role set: ${nextRole}`, Markup.inlineKeyboard([[Markup.button.callback("🧠 Start Drill", "academy:drill")]]));
  }

  if (step === "drill") {
    const bank = await loadBank();
    const qs = pickForRole(bank, role);
    if (qs.length === 0) return respond(ctx, "No questions yet for this role.", Markup.inlineKeyboard([[Markup.button.callback("🧑‍🍳 Set Role", "academy:role")]]));

    const q = qs[Math.floor(Math.random() * qs.length)];
    const prompt = lang(ctx) === "km" ? q.prompt_km : q.prompt_en;

    const rows = q.options.map((o) => [Markup.button.callback(lang(ctx) === "km" ? o.km : o.en, `academy:answer:${q.id}:${o.id}`)]);
    rows.push([Markup.button.callback("⬅️ Home", "academy:home")]);
    return respond(ctx, `🧠 Quick Drill (${role})\n\n${prompt}`, Markup.inlineKeyboard(rows));
  }

  if (step === "answer") {
    const qid = a ?? "";
    const ans = b ?? "";

    const bank = await loadBank();
    const q = bank.questions.find((x) => x.id === qid);
    if (!q) return respond(ctx, "Question not found.", Markup.inlineKeyboard([[Markup.button.callback("🧠 Drill", "academy:drill")]]));

    const g = gradeQuestion(q, ans);

    await logAttempt({
      ts: new Date().toISOString(),
      staff_id: sid,
      role,
      question_id: qid,
      answer_id: ans,
      score: g.score,
      passed: g.passed
    });

    const notes = lang(ctx) === "km" ? (q.notes_km ?? "") : (q.notes_en ?? "");
    const msg = g.passed ? "✅ Correct." : "❌ Not correct.";
    const extra = notes ? `\n\n📌 ${notes}` : "";
    return respond(ctx, `${msg}${extra}`, Markup.inlineKeyboard([[Markup.button.callback("🧠 Next Drill", "academy:drill")], [Markup.button.callback("🏠 Home", "academy:home")]]));
  }

  if (step === "progress") {
    return respond(
      ctx,
      `🧾 Progress\nRole: ${role}\n\n(Quiz attempts logged to data/staff_quiz_attempts.json)`,
      Markup.inlineKeyboard([[Markup.button.callback("🧠 Quick Drill", "academy:drill")], [Markup.button.callback("🏠 Home", "academy:home")]])
    );
  }

  return respond(ctx, "Academy.", Markup.inlineKeyboard([[Markup.button.callback("🏠 Home", "academy:home")]]));
}
