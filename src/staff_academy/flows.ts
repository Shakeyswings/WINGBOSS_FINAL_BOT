import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import { ACADEMY_MODULES, type AcademyModuleId } from "./modules.ts";
import { getProgress, markComplete, setCertified } from "./progress.repo.ts";
import { grade } from "./quiz.ts";

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

function pickLang(ctx: WBContext) {
  return (ctx.session.lang ?? ctx.env.DEFAULT_LANG) === "km" ? "km" : "en";
}

function t(ctx: WBContext, km: string, en: string) {
  return pickLang(ctx) === "km" ? km : en;
}

function parseData(ctx: WBContext): string {
  return String((ctx.update as any)?.callback_query?.data ?? "");
}

export async function academyFlow(ctx: WBContext) {
  if (!isAllowed(ctx)) return ctx.reply("⛔ Staff Academy is gated.");

  const data = parseData(ctx) || "academy:home";
  const parts = data.split(":");
  const step = parts[1] ?? "home";
  const a = parts[2];
  const b = parts[3];

  const sid = staffId(ctx);
  const prog = await getProgress(sid);

  if (step === "home") {
    return ctx.reply(
      "🎓 Staff Academy\nTrain → Drill → Verify → Certify",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Continue Training", "academy:modules")],
        [Markup.button.callback("📘 Modules", "academy:modules")],
        [Markup.button.callback("🧾 My Progress", "academy:progress")]
      ])
    );
  }

  if (step === "modules") {
    // gating: module 2 requires module 1 passed
    const m1Done = Boolean(prog.completed["M1_SOP_SEQUENCE"]);
    const rows = ACADEMY_MODULES.map((m) => {
      const done = Boolean(prog.completed[m.id]);
      const locked = m.id === "M2_READY_CHECKLIST" && !m1Done;
      const label = locked
        ? `🔒 ${t(ctx, m.name_km, m.name_en)}`
        : `${done ? "✅" : "⬜️"} ${t(ctx, m.name_km, m.name_en)}`;
      const cb = locked ? "academy:locked" : `academy:lesson:${m.id}:0`;
      return [Markup.button.callback(label, cb)];
    });
    rows.push([Markup.button.callback("⬅️ Home", "academy:home")]);
    return ctx.reply("📘 Modules:", Markup.inlineKeyboard(rows));
  }

  if (step === "locked") {
    return ctx.reply("🔒 Complete Module 1 first.");
  }

  if (step === "lesson") {
    const moduleId = a as AcademyModuleId;
    const idx = Math.max(0, Number(b ?? "0"));
    const mod = ACADEMY_MODULES.find((m) => m.id === moduleId);
    if (!mod) return ctx.reply("Module not found.");

    const screen = mod.screens[Math.min(idx, mod.screens.length - 1)];
    const title = t(ctx, screen.title_km, screen.title_en);
    const body = t(ctx, screen.body_km, screen.body_en);

    const prev = idx > 0 ? Markup.button.callback("⬅️ Prev", `academy:lesson:${moduleId}:${idx - 1}`) : null;
    const next =
      idx < mod.screens.length - 1 ? Markup.button.callback("➡️ Next", `academy:lesson:${moduleId}:${idx + 1}`) : null;
    const quizBtn = idx === mod.screens.length - 1 ? Markup.button.callback("🧠 Quiz", `academy:quiz:${moduleId}`) : null;

    const navRow = [prev, next, quizBtn].filter(Boolean) as any[];
    return ctx.reply(`${title}\n\n${body}`, Markup.inlineKeyboard([navRow, [Markup.button.callback("📘 Modules", "academy:modules")]]));
  }

  if (step === "quiz") {
    const moduleId = a as AcademyModuleId;
    const mod = ACADEMY_MODULES.find((m) => m.id === moduleId);
    if (!mod) return ctx.reply("Module not found.");

    const q = t(ctx, mod.quiz.question_km, mod.quiz.question_en);
    const rows = mod.quiz.options.map((o) => [Markup.button.callback(t(ctx, o.km, o.en), `academy:answer:${moduleId}:${o.id}`)]);
    rows.push([Markup.button.callback("⬅️ Back", `academy:lesson:${moduleId}:0`)]);
    return ctx.reply(`🧠 Quiz\n\n${q}`, Markup.inlineKeyboard(rows));
  }

  if (step === "answer") {
    const moduleId = a as AcademyModuleId;
    const answerId = b ?? "";
    const mod = ACADEMY_MODULES.find((m) => m.id === moduleId);
    if (!mod) return ctx.reply("Module not found.");

    const score = grade(mod, answerId);
    const pass = score >= ctx.env.ACADEMY_PASS_PERCENT;

    if (pass) await markComplete(sid, moduleId, score);

    const msg = pass
      ? `✅ Passed (${score}%). Next module unlocked.`
      : `❌ Not passed (${score}%). Review and retry.`;

    return ctx.reply(
      msg,
      Markup.inlineKeyboard([
        [Markup.button.callback("📘 Modules", "academy:modules")],
        [Markup.button.callback("🏠 Home", "academy:home")]
      ])
    );
  }

  if (step === "progress") {
    const doneCount = Object.keys(prog.completed || {}).length;
    const cert = prog.certified ? "✅ Certified" : "⬜️ Not certified";
    const canCertify = Boolean(prog.completed["M1_SOP_SEQUENCE"] && prog.completed["M2_READY_CHECKLIST"]);
    const rows = [
      [Markup.button.callback("📘 Modules", "academy:modules")],
      [Markup.button.callback("🏠 Home", "academy:home")]
    ];
    if (canCertify && !prog.certified) rows.unshift([Markup.button.callback("🏅 Request Certification", "academy:cert_request")]);
    return ctx.reply(`🧾 Progress\nModules done: ${doneCount}/${ACADEMY_MODULES.length}\n${cert}`, Markup.inlineKeyboard(rows));
  }

  if (step === "cert_request") {
    // Owner certifies (manager action placeholder)
    return ctx.reply(
      "🏅 Certification requires manager approval.\nOwner: use button below.",
      Markup.inlineKeyboard([[Markup.button.callback("✅ Certify (Owner only)", `academy:certify:${sid}`)]])
    );
  }

  if (step === "certify") {
    // owner only
    if (String(ctx.from?.id ?? "") !== String(ctx.env.OWNER_TELEGRAM_ID)) {
      return ctx.reply("⛔ Owner only.");
    }
    const targetId = a ?? "";
    if (!targetId) return ctx.reply("Missing staff id.");
    await setCertified(targetId, true);
    return ctx.reply(`✅ Certified staff: ${targetId}`);
  }

  return ctx.reply("Academy.");
}
