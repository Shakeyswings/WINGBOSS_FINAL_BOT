import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import {
  BOSS_FINISHERS,
  BOSS_FINISH_FLAVORS,
  BOSS_HEAT_RECORDS,
  BOSS_MODE_SURCHARGE_MINOR,
  BOSS_PRIMARY_FLAVORS,
  BOSS_RECIPE_STAGES,
  CURATED_BOSS_BUILDS,
  SWEET_LAB_FINISHERS,
  SWEET_LAB_PRODUCTS,
  SWEET_LAB_FRYERS,
  SWEET_LAB_STAGES,
  getVisibleCuratedBossBuilds,
  getSweetLabAdditionalToppingChargeMinor,
  isBossSelectionCustomerSelectable,
  renderBossKitchenInstructions,
  validateBossSelection,
  validateSweetFryerIsolation,
  validateSweetFinishersHaveNoPrice,
  type BossSelection,
  type BossHeatLevel
} from "../domain/wingboss.ts";
import { canAccessArchitecturePreview } from "./preview.ts";

type BossPreviewState = {
  primaryFlavorId?: string;
  bossFinishFlavorId?: string;
  heatLevel?: string;
  finisherIds?: string[];
};

function kb(rows: any[][]) {
  return Markup.inlineKeyboard(rows);
}

function buttonGrid(items: { label: string; data: string }[], perRow = 2) {
  const rows: any[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow).map((item) => Markup.button.callback(item.label, item.data)));
  }
  return rows;
}

function bossState(ctx: WBContext): BossPreviewState {
  if (!ctx.session.architecture) ctx.session.architecture = {};
  if (!ctx.session.architecture.boss) ctx.session.architecture.boss = { finisherIds: [] };
  if (!ctx.session.architecture.boss.finisherIds) ctx.session.architecture.boss.finisherIds = [];
  return ctx.session.architecture.boss;
}

function bossSelectionFromState(ctx: WBContext): BossSelection | null {
  const state = bossState(ctx);
  if (!state.primaryFlavorId || !state.bossFinishFlavorId || !state.heatLevel) return null;
  return {
    primaryFlavorId: state.primaryFlavorId,
    bossFinishFlavorId: state.bossFinishFlavorId,
    heatLevel: state.heatLevel as BossHeatLevel,
    finisherIds: state.finisherIds ?? [],
    kitchenValidated: false
  };
}

function findLabel(id: string, entries: readonly { id: string; label: string }[]) {
  return entries.find((entry) => entry.id === id)?.label ?? id;
}

function renderBossSurchargeTiers() {
  return [6, 12, 20, 36]
    .map((quantity) => {
      const surchargeMinor = BOSS_MODE_SURCHARGE_MINOR[quantity as 6 | 12 | 20 | 36];
      return `${quantity}=${surchargeMinor === undefined ? "?" : `$${(surchargeMinor / 100).toFixed(2)}`}`;
    })
    .join(" | ");
}

function renderSweetToppingCharges() {
  return [0, 1, 2, 3, 4, 5]
    .map((count) => {
      const chargeMinor = getSweetLabAdditionalToppingChargeMinor(count);
      return `${count}=${chargeMinor === null ? "?" : `$${(chargeMinor / 100).toFixed(2)}`}`;
    })
    .join(" | ");
}

function bossSummaryText(ctx: WBContext): string {
  const selection = bossSelectionFromState(ctx);
  if (!selection) return "No preview path selected yet.";

  const validation = validateBossSelection(selection);
  return [
    ...renderBossKitchenInstructions(selection),
    "",
    `Validation: ${validation.valid ? "PASS" : validation.reasons.join("; ")}`,
    `Customer selectable: ${isBossSelectionCustomerSelectable(selection) ? "YES" : "NO"}`,
    `Approved surcharge tiers: ${renderBossSurchargeTiers()}`
  ].join("\n");
}

export async function architectureFlow(ctx: WBContext) {
  const data = String((ctx.update as any)?.callback_query?.data ?? "arch:boss");
  const parts = data.split(":");
  const section = parts[1] ?? "boss";
  const step = parts[2] ?? "";
  const value = parts[3] ?? "";

  if (section === "boss") {
    if (!canAccessArchitecturePreview(ctx, "boss")) {
      return ctx.editMessageText(
        ctx.t("preview_unavailable"),
        kb([[Markup.button.callback("⬅️ Home", "home:back")]])
      );
    }

    const state = bossState(ctx);

    if (!step) {
      const visibleCurated = getVisibleCuratedBossBuilds();
      return ctx.editMessageText(
        [
          ctx.t("boss_mode"),
          ctx.t("boss_mode_tagline"),
          ctx.t("pick_any_3"),
          "",
          `Approved surcharge tiers: ${renderBossSurchargeTiers()}`,
          `State machine: ${BOSS_RECIPE_STAGES.join(" -> ")}`,
          `Curated build fixtures: ${CURATED_BOSS_BUILDS.length}`,
          `Visible now: ${visibleCurated.length}`,
          "",
          "Use progressive disclosure instead of a full matrix."
        ].join("\n"),
        kb([
          [Markup.button.callback("Start Build Your Own", "arch:boss:primary")],
          [Markup.button.callback("Show review", "arch:boss:review")],
          [Markup.button.callback("⬅️ Home", "home:back")]
        ])
      );
    }

    if (step === "primary") {
      if (value) state.primaryFlavorId = value;
      const selected = state.primaryFlavorId ? findLabel(state.primaryFlavorId, BOSS_PRIMARY_FLAVORS) : null;
      return ctx.editMessageText(
        [
          "PRIMARY_FLAVOR",
          "Choose the first flavor role.",
          selected ? `Selected: ${selected}` : "This is not the same thing as a boss finish flavor."
        ].join("\n"),
        kb([
          ...buttonGrid(BOSS_PRIMARY_FLAVORS.map((flavor) => ({ label: flavor.label, data: `arch:boss:primary:${flavor.id}` })), 2),
          [Markup.button.callback("Reveal boss finish flavors", "arch:boss:finish")],
          [Markup.button.callback("⬅️ Back", "arch:boss")]
        ])
      );
    }

    if (step === "finish") {
      if (value) state.bossFinishFlavorId = value;
      const selected = state.bossFinishFlavorId ? findLabel(state.bossFinishFlavorId, BOSS_FINISH_FLAVORS) : null;
      return ctx.editMessageText(
        [
          "BOSS_FINISH_FLAVOR",
          "Reveal the post-re-fry flavor role only after Boss Mode is selected.",
          selected ? `Selected: ${selected}` : "No boss finish flavor selected yet."
        ].join("\n"),
        kb([
          ...buttonGrid(BOSS_FINISH_FLAVORS.map((flavor) => ({ label: flavor.label, data: `arch:boss:finish:${flavor.id}` })), 2),
          [Markup.button.callback("Reveal heat rules", "arch:boss:heat")],
          [Markup.button.callback("⬅️ Back", "arch:boss")]
        ])
      );
    }

    if (step === "heat") {
      if (value) state.heatLevel = value;
      const selected = state.heatLevel ? state.heatLevel : null;
      return ctx.editMessageText(
        [
          "HEAT_APPLICATION",
          "Heat is tracked separately from the flavor role.",
          selected ? `Selected: ${selected}` : "No heat level selected yet.",
          `Charge ladder: ${BOSS_HEAT_RECORDS.map((record) => `${record.label}:${record.heatChargeMinor === 0 ? "free" : `$${(record.heatChargeMinor / 100).toFixed(2)}`}`).join(" | ")}`
        ].join("\n"),
        kb([
          ...buttonGrid(BOSS_HEAT_RECORDS.map((record) => ({ label: record.label, data: `arch:boss:heat:${record.heatLevel}` })), 2),
          [Markup.button.callback("Reveal finishers", "arch:boss:finishers")],
          [Markup.button.callback("⬅️ Back", "arch:boss")]
        ])
      );
    }

    if (step === "finishers") {
      if (value) {
        const finisherIds = new Set(state.finisherIds ?? []);
        if (finisherIds.has(value)) finisherIds.delete(value);
        else finisherIds.add(value);
        state.finisherIds = [...finisherIds];
      }

      const selectedFinishers = (state.finisherIds ?? []).map((id) => findLabel(id, BOSS_FINISHERS));
      return ctx.editMessageText(
        [
          "FINISHERS",
          "Optional final toppings stay separate from the boss finish flavor.",
          `Approved finishers: ${BOSS_FINISHERS.map((f) => f.label).join(", ")}`,
          selectedFinishers.length ? `Selected: ${selectedFinishers.join(" / ")}` : "None selected yet.",
          ctx.t("pick_any_3"),
          "",
          bossSummaryText(ctx)
        ].join("\n"),
        kb([
          ...buttonGrid(BOSS_FINISHERS.map((finisher) => ({ label: finisher.label, data: `arch:boss:finishers:${finisher.id}` })), 2),
          [Markup.button.callback("Show review", "arch:boss:review")],
          [Markup.button.callback("⬅️ Back", "arch:boss")]
        ])
      );
    }

    if (step === "review") {
      const validation = bossSelectionFromState(ctx);
      const selection = validation ? validateBossSelection(validation) : { valid: false, reasons: ["Select primary, finish, and heat first."] };
      return ctx.editMessageText(
        [
          "BOSS REVIEW",
          bossSummaryText(ctx),
          "",
          `Curated build fixtures available: ${CURATED_BOSS_BUILDS.length}`,
          `Kitchen validation: ${selection.valid ? "STRUCTURE OK" : selection.reasons.join("; ")}`,
          "",
          "Cost inputs stay tracked separately for profitability analysis."
        ].join("\n"),
        kb([[Markup.button.callback("⬅️ Back", "arch:boss")], [Markup.button.callback("⬅️ Home", "home:back")]])
      );
    }
  }

  if (section === "sweet") {
    if (!canAccessArchitecturePreview(ctx, "sweet")) {
      return ctx.editMessageText(
        ctx.t("preview_unavailable"),
        kb([[Markup.button.callback("⬅️ Home", "home:back")]])
      );
    }

    if (!step) {
      const fryerCheck = validateSweetFryerIsolation(SWEET_LAB_FRYERS.savory.id, SWEET_LAB_FRYERS.sweet.id);
      return ctx.editMessageText(
        [
          ctx.t("sweet_lab"),
          ctx.t("sweet_lab_tagline"),
          `Approved products: ${SWEET_LAB_PRODUCTS.map((product) => `${product.label} $${(product.price_minor! / 100).toFixed(2)}`).join(" | ")}`,
          `Included toppings: 2`,
          `Extra toppings after two: ${renderSweetToppingCharges()}`,
          `Approved topping pool: ${SWEET_LAB_FINISHERS.map((finisher) => finisher.label).join(", ")}`,
          `Fryer isolation: ${fryerCheck.valid ? "PASS" : "FAIL"}`,
          `Base flow: ${SWEET_LAB_STAGES.join(" -> ")}`,
          `Sweet finishers priced: ${validateSweetFinishersHaveNoPrice().valid ? "NO" : "YES"}`
        ].join("\n"),
        kb([
          [Markup.button.callback("Show dessert flow", "arch:sweet:flow")],
          [Markup.button.callback("Show fryer isolation", "arch:sweet:fryers")],
          [Markup.button.callback("⬅️ Home", "home:back")]
        ])
      );
    }

    if (step === "flow") {
      return ctx.editMessageText(
        [
          "Dessert development path",
          `1. ${SWEET_LAB_STAGES[0]}`,
          `2. ${SWEET_LAB_STAGES[1]}`,
          `3. ${SWEET_LAB_STAGES[2]}`,
          `4. ${SWEET_LAB_STAGES[3]}`,
          `5. ${SWEET_LAB_STAGES[4]}`,
          "",
          `Approved products: ${SWEET_LAB_PRODUCTS.map((product) => product.label).join(", ")}`,
          `Approved testing finishers: ${SWEET_LAB_FINISHERS.map((finisher) => finisher.label).join(", ")}`,
          "",
          "Dessert pricing comes from governed current-menu data."
        ].join("\n"),
        kb([[Markup.button.callback("⬅️ Back", "arch:sweet")], [Markup.button.callback("⬅️ Home", "home:back")]])
      );
    }

    if (step === "fryers") {
      const fryerCheck = validateSweetFryerIsolation(SWEET_LAB_FRYERS.savory.id, SWEET_LAB_FRYERS.sweet.id);
      return ctx.editMessageText(
        [
          "Fryer isolation",
          `Savory fryer: ${SWEET_LAB_FRYERS.savory.id}`,
          `Dessert fryer: ${SWEET_LAB_FRYERS.sweet.id}`,
          `Validation: ${fryerCheck.valid ? "PASS" : fryerCheck.reasons.join("; ")}`
        ].join("\n"),
        kb([[Markup.button.callback("⬅️ Back", "arch:sweet")], [Markup.button.callback("⬅️ Home", "home:back")]])
      );
    }
  }

  return ctx.editMessageText("Preview", kb([[Markup.button.callback("⬅️ Home", "home:back")]]));
}
