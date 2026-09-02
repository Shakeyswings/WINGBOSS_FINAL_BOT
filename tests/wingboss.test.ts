import { describe, expect, it } from "vitest";
import { buildTranslator } from "../src/i18n/index.ts";
import { browseFlow } from "../src/flows/browse.flow.ts";
import { architectureFlow } from "../src/flows/architecture.flow.ts";
import { loadCurrentMenuDocument, getCurrentMenuIndex } from "../src/menu/current-menu.ts";
import { loadMenu } from "../src/menu/loader.ts";
import { getBossPrimaryFlavorOptions } from "../src/domain/boss-menu-adapter.ts";
import {
  BOSS_D4_POOL,
  BOSS_HEAT_CHARGE_MINOR,
  BOSS_HEAT_RECORDS,
  BOSS_PATH_VALIDATION_REGISTRY,
  BOSS_RECIPE_STAGES,
  CURATED_BOSS_BUILDS,
  SWEET_LAB_FINISHERS,
  SWEET_LAB_FRYERS,
  SWEET_LAB_OIL_POOLS,
  SWEET_LAB_PRODUCTS,
  SWEET_LAB_STAGES,
  buildBossRecipeSignature,
  calculateD4ChargeMinor,
  getBossD4ChargeMinor,
  getBossHeatChargeMinor,
  getBossModeOrderTotalMinor,
  getBossPaidDryRubCurrentChargeMinor,
  getBossPaidDrizzleCurrentChargeMinor,
  getBossPrimaryFlavorCurrentChargeMinor,
  getSweetLabAdditionalToppingChargeMinor,
  getSweetLabProductPriceMinor,
  getVisibleCuratedBossBuilds,
  isBossPathOrderable,
  isBossSelectionCustomerSelectable,
  renderBossKitchenInstructions,
  validateBossPathRecord,
  validateBossSelection,
  validateD4PickAny3,
  validateSweetFinishersHaveNoPrice,
  validateSweetFryerIsolation,
  validateSweetOilPoolIsolation
} from "../src/domain/wingboss.ts";

function makeCtx(data: string, options?: { userId?: number; bossPreview?: boolean; sweetPreview?: boolean; deploymentEnv?: "production" | "development" | "test" }) {
  const calls: any[] = [];
  const ownerId = 101;
  const ctx = {
    env: {
      OWNER_TELEGRAM_ID: ownerId,
      STAFF_CHAT_ID: 999,
      BOT_TOKEN: "x".repeat(20),
      RUNTIME_MODE: "termux",
      DEPLOYMENT_ENV: options?.deploymentEnv ?? "production",
      BACKEND_MODE: "off",
      FAILOVER_MODE: "local",
      TIMEZONE: "Asia/Phnom_Penh",
      USD_TO_KHR: 4100,
      DEFAULT_LANG: "en",
      INCLUDE_ENGLISH_HINTS: false,
      MENU_PATH: "./menu/menu_bundle.v1.json",
      MENU_FALLBACK_PATH: "./menu/menu_bundle.v1.json",
      CLOSED_MODE: false,
      BUSY_MODE: false,
      BOSS_MODE_PREVIEW_ENABLED: options?.bossPreview ?? false,
      SWEET_LAB_PREVIEW_ENABLED: options?.sweetPreview ?? false,
      PAYMENT_PROOF_REQUIRED: true,
      GEOCODE_MODE: "osm",
      GEOCODE_CACHE_TTL_HOURS: 168,
      OWNER_NOTIFY_ISSUES: false
    },
    session: { state: "S0_HOME", architecture: { boss: { finisherIds: [] } } },
    from: { id: options?.userId ?? 200 },
    chat: { id: 1 },
    update: { callback_query: { data } },
    t: buildTranslator("en", false),
    editMessageText: async (...args: any[]) => {
      calls.push(args);
    },
    reply: async (...args: any[]) => {
      calls.push(["reply", ...args]);
    },
    calls
  };

  return ctx as any;
}

function buttonTexts(markup: any): string[] {
  const rows = markup?.reply_markup?.inline_keyboard;
  return Array.isArray(rows) ? rows.flat().map((button: any) => button.text) : [];
}

describe("WingBoss approved architecture", () => {
  it("preserves boss stage order", () => {
    expect(BOSS_RECIPE_STAGES).toEqual([
      "BASE_CHICKEN",
      "PRIMARY_FLAVOR",
      "BOSS_COOK_STAGE",
      "BOSS_FINISH_FLAVOR",
      "HEAT_APPLICATION",
      "FINISHERS",
      "VALIDATION",
      "PRICE",
      "KDS_RECIPE"
    ]);
  });

  it("treats primary and finish order as distinct", () => {
    const forward = buildBossRecipeSignature({
      primaryFlavorId: "s6_honey_teriyaki",
      bossFinishFlavorId: "s3_buffalo",
      heatLevel: "hot",
      finisherIds: ["r1_cajun"]
    });
    const reverse = buildBossRecipeSignature({
      primaryFlavorId: "s3_buffalo",
      bossFinishFlavorId: "s6_honey_teriyaki",
      heatLevel: "hot",
      finisherIds: ["r1_cajun"]
    });

    expect(forward).not.toBe(reverse);
  });

  it("allows the same flavor on both stages when validation permits", () => {
    const record = {
      primaryFlavorId: "s3_buffalo",
      finishFlavorId: "s3_buffalo",
      cookProfileId: "boss_cook_v1",
      heatProfileId: "hot",
      ownerApproved: true,
      kitchenValidated: true,
      publicationStatus: "CURRENT" as const,
      evidenceId: "evidence-1"
    };

    expect(validateBossPathRecord(record).valid).toBe(true);
    expect(isBossPathOrderable(record)).toBe(true);
    expect(
      validateBossSelection({
        primaryFlavorId: "s3_buffalo",
        bossFinishFlavorId: "s3_buffalo",
        heatLevel: "hot",
        finisherIds: [],
        kitchenValidated: true
      }).valid
    ).toBe(true);
  });

  it("keeps unvalidated boss paths out of ordering", () => {
    const selection = {
      primaryFlavorId: "s6_honey_teriyaki",
      bossFinishFlavorId: "s3_buffalo",
      heatLevel: "hot" as const,
      finisherIds: ["r1_cajun"],
      kitchenValidated: false
    };

    expect(validateBossSelection(selection).valid).toBe(true);
    expect(isBossSelectionCustomerSelectable(selection)).toBe(false);
  });

  it("keeps Boss quantity pricing approved while cost inputs remain separate", () => {
    const selection = {
      primaryFlavorId: "s6_honey_teriyaki",
      bossFinishFlavorId: "s3_buffalo",
      heatLevel: "hot" as const,
      finisherIds: ["r1_cajun"],
      kitchenValidated: true
    };
    const record = {
      primaryFlavorId: "s6_honey_teriyaki",
      finishFlavorId: "s3_buffalo",
      cookProfileId: "boss_cook_v1",
      heatProfileId: "hot",
      ownerApproved: true,
      kitchenValidated: true,
      publicationStatus: "CURRENT" as const,
      evidenceId: "evidence-1"
    };

    const originalLength = BOSS_PATH_VALIDATION_REGISTRY.length;
    BOSS_PATH_VALIDATION_REGISTRY.push(record);

    try {
      expect(isBossPathOrderable(record)).toBe(true);
      expect(isBossSelectionCustomerSelectable(selection)).toBe(true);
      expect(getBossModeOrderTotalMinor(6, "s3_buffalo", { heatLevel: "hot" })).toBe(925);
    } finally {
      BOSS_PATH_VALIDATION_REGISTRY.length = originalLength;
    }
  });

  it("hides Boss Mode and Sweet Lab from ordinary customers", async () => {
    const menu = {
      catalog: {
        categories: [
          { id: "a_wings", emoji: "🍗", name_en: "WINGS" },
          { id: "b_burgers", emoji: "🍔", name_en: "BURGERS" }
        ]
      }
    } as any;

    const customer = makeCtx("browse:root");
    await browseFlow(customer, menu, {} as any);
    const customerButtons = buttonTexts(customer.calls[0][1]);
    expect(customerButtons).not.toContain("⚡ Boss Mode");
    expect(customerButtons).not.toContain("🍰 Sweet Lab");

    const bossPreview = makeCtx("browse:root", { userId: 101 });
    await browseFlow(bossPreview, menu, {} as any);
    const bossButtons = buttonTexts(bossPreview.calls[0][1]);
    expect(bossButtons).toContain("⚡ Boss Mode");
    expect(bossButtons).toContain("🍰 Sweet Lab");

    const productionFlagged = makeCtx("browse:root", { bossPreview: true, sweetPreview: true });
    await browseFlow(productionFlagged, menu, {} as any);
    const productionFlaggedButtons = buttonTexts(productionFlagged.calls[0][1]);
    expect(productionFlaggedButtons).not.toContain("⚡ Boss Mode");
    expect(productionFlaggedButtons).not.toContain("🍰 Sweet Lab");

    const flagged = makeCtx("browse:root", {
      bossPreview: true,
      sweetPreview: true,
      deploymentEnv: "development"
    });
    await browseFlow(flagged, menu, {} as any);
    const flaggedButtons = buttonTexts(flagged.calls[0][1]);
    expect(flaggedButtons).toContain("⚡ Boss Mode");
    expect(flaggedButtons).toContain("🍰 Sweet Lab");

    const bossBlocked = makeCtx("arch:boss");
    await architectureFlow(bossBlocked);
    expect(bossBlocked.calls[0][0]).toBe("Preview unavailable.");

    const sweetBlocked = makeCtx("arch:sweet");
    await architectureFlow(sweetBlocked);
    expect(sweetBlocked.calls[0][0]).toBe("Preview unavailable.");
  });

  it("keeps curated boss builds absent until approval exists", () => {
    expect(CURATED_BOSS_BUILDS).toEqual([]);
    expect(getVisibleCuratedBossBuilds()).toEqual([]);
  });

  it("accepts valid D4 splits and rejects invalid modifiers", () => {
    expect(validateD4PickAny3(["r1_cajun", "r2_midnight_rub", "r3_buffalo_dust"]).valid).toBe(true);
    expect(validateD4PickAny3(["d1_ranch", "d2_fireback", "d3_hot_honey"]).valid).toBe(true);
    expect(validateD4PickAny3(["r1_cajun", "r2_midnight_rub", "d1_ranch"]).valid).toBe(true);
    expect(validateD4PickAny3(["r1_cajun", "d1_ranch", "d3_hot_honey"]).valid).toBe(true);
    expect(validateD4PickAny3(["r1_cajun", "r1_cajun", "d1_ranch"]).valid).toBe(false);
    expect(validateD4PickAny3(["r1_cajun", "d1_ranch"]).valid).toBe(false);
    expect(validateD4PickAny3(["r1_cajun", "d1_ranch", "not_real"]).valid).toBe(false);
    expect(calculateD4ChargeMinor(["r1_cajun", "r2_midnight_rub", "d1_ranch"])).toBe(getBossD4ChargeMinor());
  });

  it("keeps included primary rub free and paid finisher priced separately", () => {
    expect(getBossPrimaryFlavorCurrentChargeMinor("r1_cajun")).toBe(0);
    expect(getBossPaidDryRubCurrentChargeMinor("r1_cajun")).toBe(50);
    expect(getBossPaidDrizzleCurrentChargeMinor("d1_ranch")).toBe(50);
  });

  it("keeps heat charge and recipe application separate", () => {
    expect(BOSS_HEAT_RECORDS.every((record) => record.applicationStage === "HEAT_APPLICATION")).toBe(true);
    expect(BOSS_HEAT_RECORDS.every((record) => record.quantityScalingRule === "order_level_fixed")).toBe(true);
    expect(BOSS_HEAT_RECORDS.map((record) => record.heatLevel)).toEqual(["mild", "hot", "spicy", "extreme", "revenge", "nuclear"]);
    expect(BOSS_HEAT_CHARGE_MINOR.hot).toBe(25);
    expect(BOSS_HEAT_CHARGE_MINOR.revenge).toBe(100);
    expect(BOSS_HEAT_CHARGE_MINOR.nuclear).toBe(125);
    expect(getBossHeatChargeMinor("hot")).toBe(25);
  });

  it("renders the approved preview heat ladder and D4 finisher pool", async () => {
    const heatPreview = makeCtx("arch:boss:heat", { userId: 101 });
    await architectureFlow(heatPreview);
    expect(heatPreview.calls[0][0]).toContain("NUCLEAR:$1.00");
    expect(heatPreview.calls[0][0]).not.toContain("NUCLEAR:$1.25");

    const finisherPreview = makeCtx("arch:boss:finishers", { userId: 101 });
    await architectureFlow(finisherPreview);
    const finisherButtons = buttonTexts(finisherPreview.calls[0][1]);
    for (const option of BOSS_D4_POOL) {
      expect(finisherButtons).toContain(option.label);
    }
  });

  it("keeps sweet fryer and oil pool isolation intact", () => {
    expect(validateSweetFryerIsolation(SWEET_LAB_FRYERS.savory.id, SWEET_LAB_FRYERS.sweet.id).valid).toBe(true);
    expect(validateSweetFryerIsolation(SWEET_LAB_FRYERS.savory.id, SWEET_LAB_FRYERS.savory.id).valid).toBe(false);
    expect(validateSweetOilPoolIsolation(SWEET_LAB_OIL_POOLS.savory.id, SWEET_LAB_OIL_POOLS.sweet.id).valid).toBe(true);
    expect(validateSweetOilPoolIsolation(SWEET_LAB_OIL_POOLS.savory.id, SWEET_LAB_OIL_POOLS.savory.id).valid).toBe(false);
  });

  it("keeps Sweet Lab products and toppings approved", () => {
    expect(SWEET_LAB_PRODUCTS.map((product) => product.label)).toEqual(["Deep Fried Snickers", "Deep Fried Oreos", "Deep Fried Blasto"]);
    expect(SWEET_LAB_PRODUCTS.every((product) => product.price_minor === 595)).toBe(true);
    expect(SWEET_LAB_PRODUCTS.every((product) => product.includedToppingCount === 2)).toBe(true);
    expect(getSweetLabProductPriceMinor("y1_deep_fried_snickers")).toBe(595);
    expect(getSweetLabProductPriceMinor("y2_deep_fried_oreos")).toBe(595);
    expect(getSweetLabProductPriceMinor("y3_deep_fried_blasto")).toBe(595);
    expect(getSweetLabAdditionalToppingChargeMinor(0)).toBe(0);
    expect(getSweetLabAdditionalToppingChargeMinor(1)).toBe(0);
    expect(getSweetLabAdditionalToppingChargeMinor(2)).toBe(0);
    expect(getSweetLabAdditionalToppingChargeMinor(3)).toBe(75);
    expect(getSweetLabAdditionalToppingChargeMinor(4)).toBe(150);
    expect(getSweetLabAdditionalToppingChargeMinor(5)).toBe(225);
    expect(validateSweetFinishersHaveNoPrice().valid).toBe(true);
    expect(SWEET_LAB_FINISHERS.map((finisher) => finisher.label)).toEqual(["Caramel", "Chocolate", "Powdered Sugar", "Honey", "Hot Honey"]);
    expect(SWEET_LAB_FINISHERS.every((finisher) => finisher.price_minor === null)).toBe(true);
    expect(SWEET_LAB_STAGES).toEqual(["DESSERT_BASE", "PANCAKE_BATTER", "SWEET_FRY", "POWDERED_SUGAR", "OPTIONAL_SWEET_FINISHERS"]);
  });

  it("keeps historical menu data out of the current boss catalog", async () => {
    const currentMenu = loadCurrentMenuDocument();
    const currentIds = getBossPrimaryFlavorOptions().map((option) => option.id);
    const legacyMenu = await loadMenu("./menu/menu_bundle.v1.json");

    expect(currentMenu.historical_reference_boundary.historical_70_flavor_system).toBe("reference_only");
    expect(currentMenu.authority_status).toBe("ACTIVE_CURRENT_MENU");
    expect(currentIds).toEqual([
      "s1_fire_storm",
      "s2_jerk",
      "s3_buffalo",
      "s4_texas_bbq",
      "s5_korean",
      "s6_honey_teriyaki",
      "s7_spicy_peanut",
      "r1_cajun",
      "r2_midnight_rub",
      "r3_buffalo_dust",
      "r4_kampot_pepper_hot_honey",
      "r5_lemon_pepper",
      "r6_garlic_parm"
    ]);
    expect(legacyMenu.catalog.flavors).toHaveLength(0);
  });

  it("keeps canonical current-menu and legacy menu validation separate", async () => {
    expect(() => loadCurrentMenuDocument()).not.toThrow();
    const legacyMenu = await loadMenu("./menu/menu_bundle.v1.json");

    expect(legacyMenu.catalog.categories.length).toBeGreaterThan(0);
    expect(getCurrentMenuIndex().menu.authority_status).toBe("ACTIVE_CURRENT_MENU");
  });
});
