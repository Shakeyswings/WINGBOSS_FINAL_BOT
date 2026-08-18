export const BOSS_RECIPE_STAGES = [
  "BASE_CHICKEN",
  "PRIMARY_FLAVOR",
  "BOSS_COOK_STAGE",
  "BOSS_FINISH_FLAVOR",
  "HEAT_APPLICATION",
  "FINISHERS",
  "VALIDATION",
  "PRICE",
  "KDS_RECIPE"
] as const;

export type BossRecipeStage = (typeof BOSS_RECIPE_STAGES)[number];

export type BossFlavorRole = "PRIMARY_FLAVOR" | "BOSS_FINISH_FLAVOR" | "FINISHER";

export type BossHeatLevel = "mild" | "standard" | "hot" | "spicy" | "extreme" | "revenge" | "nuclear";

export const BOSS_HEAT_CHARGE_MINOR: Record<BossHeatLevel, number> = {
  mild: 0,
  standard: 0,
  hot: 25,
  spicy: 50,
  extreme: 75,
  revenge: 100,
  nuclear: 125
};

export const BOSS_MODE_PRICE_MINOR: number | null = null;
export const BOSS_MODE_PRICE_STATUS = "NEEDS_COST_INPUT" as const;

export const BOSS_PRIMARY_FLAVORS = [
  { id: "s1_fire_storm", label: "Fire Storm" },
  { id: "s2_jerk", label: "Jerk" },
  { id: "s3_buffalo", label: "Buffalo" },
  { id: "s4_texas_bbq", label: "Texas BBQ" },
  { id: "s5_korean", label: "Korean" },
  { id: "s6_honey_teriyaki", label: "Honey Teriyaki" },
  { id: "s7_spicy_peanut", label: "Spicy Peanut" },
  { id: "r1_cajun", label: "Cajun" },
  { id: "r2_midnight_rub", label: "Midnight Rub" },
  { id: "r3_buffalo_dust", label: "Buffalo Dust" },
  { id: "r4_kampot_pepper_hot_honey", label: "Kampot Pepper Hot Honey" },
  { id: "r5_lemon_pepper", label: "Lemon Pepper" },
  { id: "r6_garlic_parm", label: "Garlic Parm" }
] as const;

export const BOSS_FINISH_FLAVORS = [
  { id: "s3_buffalo", label: "Buffalo" },
  { id: "s4_texas_bbq", label: "Texas BBQ" },
  { id: "s6_honey_teriyaki", label: "Honey Teriyaki" },
  { id: "r3_buffalo_dust", label: "Buffalo Dust" },
  { id: "r4_kampot_pepper_hot_honey", label: "Kampot Pepper Hot Honey" },
  { id: "r5_lemon_pepper", label: "Lemon Pepper" },
  { id: "r6_garlic_parm", label: "Garlic Parm" }
] as const;

export const BOSS_FINISHERS = [
  { id: "r6_garlic_parm", label: "Garlic Parm", price_minor: 50 },
  { id: "d1_ranch", label: "Ranch", price_minor: 50 },
  { id: "d2_fireback", label: "Fireback", price_minor: 50 },
  { id: "d3_hot_honey", label: "Hot Honey", price_minor: 50 }
] as const;

export type BossSelection = {
  primaryFlavorId: string;
  bossFinishFlavorId: string;
  heatLevel: BossHeatLevel;
  finisherIds: string[];
  kitchenValidated: boolean;
};

export type ValidationResult = {
  valid: boolean;
  reasons: string[];
};

export function buildBossRecipeSignature(selection: Pick<BossSelection, "primaryFlavorId" | "bossFinishFlavorId" | "heatLevel" | "finisherIds">): string {
  return [selection.primaryFlavorId, selection.bossFinishFlavorId, selection.heatLevel, ...selection.finisherIds].join("|");
}

export function validateBossSelection(selection: BossSelection): ValidationResult {
  const reasons: string[] = [];

  if (!selection.primaryFlavorId) reasons.push("Primary flavor is required.");
  if (!selection.bossFinishFlavorId) reasons.push("Boss finish flavor is required.");
  if (!selection.kitchenValidated) reasons.push("Boss path is not kitchen validated.");
  if (!(selection.heatLevel in BOSS_HEAT_CHARGE_MINOR)) reasons.push("Heat level is not approved.");

  if (selection.primaryFlavorId && selection.bossFinishFlavorId && selection.primaryFlavorId === selection.bossFinishFlavorId) {
    reasons.push("Primary and boss finish flavors must stay in distinct recipe positions.");
  }

  const finishers = new Set<string>(BOSS_FINISHERS.map((finisher) => finisher.id));
  for (const finisherId of selection.finisherIds) {
    if (!finishers.has(finisherId)) reasons.push(`Unsupported finisher: ${finisherId}`);
  }

  return { valid: reasons.length === 0, reasons };
}

export function isBossSelectionCustomerSelectable(selection: BossSelection): boolean {
  return validateBossSelection(selection).valid && BOSS_MODE_PRICE_MINOR !== null && BOSS_MODE_PRICE_STATUS !== "NEEDS_COST_INPUT";
}

export function getBossHeatChargeMinor(level: BossHeatLevel): number {
  return BOSS_HEAT_CHARGE_MINOR[level];
}

export function renderBossKitchenInstructions(selection: BossSelection): string[] {
  return [
    "BOSS MODE",
    `1. PRIMARY - ${selection.primaryFlavorId}`,
    "2. BOSS COOK - validated re-fry profile",
    `3. FINISH FLAVOR - ${selection.bossFinishFlavorId}`,
    `4. HEAT - ${selection.heatLevel}`,
    selection.finisherIds.length ? `5. FINISH - ${selection.finisherIds.join(" / ")}` : "5. FINISH - none"
  ];
}

export function validateD4PickAny3(selectionIds: string[]): ValidationResult & { rubCount: number; drizzleCount: number } {
  const reasons: string[] = [];
  const pool = new Map([
    ["r1_cajun", "rub"],
    ["r2_midnight_rub", "rub"],
    ["r3_buffalo_dust", "rub"],
    ["r4_kampot_pepper_hot_honey", "rub"],
    ["r5_lemon_pepper", "rub"],
    ["r6_garlic_parm", "rub"],
    ["d1_ranch", "drizzle"],
    ["d2_fireback", "drizzle"],
    ["d3_hot_honey", "drizzle"]
  ]);

  if (selectionIds.length !== 3) reasons.push("D4 must contain exactly three selections.");

  const unique = new Set(selectionIds);
  if (unique.size !== selectionIds.length) reasons.push("D4 selections must be unique.");

  let rubCount = 0;
  let drizzleCount = 0;
  for (const id of selectionIds) {
    const kind = pool.get(id);
    if (!kind) {
      reasons.push(`Unsupported D4 option: ${id}`);
      continue;
    }
    if (kind === "rub") rubCount += 1;
    if (kind === "drizzle") drizzleCount += 1;
  }

  return { valid: reasons.length === 0, reasons, rubCount, drizzleCount };
}

export function calculateD4ChargeMinor(selectionIds: string[]): number | null {
  const validation = validateD4PickAny3(selectionIds);
  return validation.valid ? 100 : null;
}

export type CuratedBossBuild = {
  id: string;
  label: string;
  recipeSignature: string;
  kitchenValidated: boolean;
  productionVisible: boolean;
};

export const CURATED_BOSS_BUILDS: CuratedBossBuild[] = [
  {
    id: "honey_teriyaki_buffalo",
    label: "Honey Teriyaki -> Buffalo",
    recipeSignature: buildBossRecipeSignature({
      primaryFlavorId: "s6_honey_teriyaki",
      bossFinishFlavorId: "s3_buffalo",
      heatLevel: "revenge",
      finisherIds: ["r6_garlic_parm", "d1_ranch", "d3_hot_honey"]
    }),
    kitchenValidated: false,
    productionVisible: false
  },
  {
    id: "cajun_buffalo_dust",
    label: "Cajun -> Buffalo Dust",
    recipeSignature: buildBossRecipeSignature({
      primaryFlavorId: "r1_cajun",
      bossFinishFlavorId: "r3_buffalo_dust",
      heatLevel: "hot",
      finisherIds: ["r6_garlic_parm"]
    }),
    kitchenValidated: false,
    productionVisible: false
  },
  {
    id: "korean_fireback",
    label: "Korean -> Fireback",
    recipeSignature: buildBossRecipeSignature({
      primaryFlavorId: "s5_korean",
      bossFinishFlavorId: "d2_fireback",
      heatLevel: "spicy",
      finisherIds: ["d1_ranch"]
    }),
    kitchenValidated: false,
    productionVisible: false
  },
  {
    id: "bbq_garlic_parm",
    label: "Texas BBQ -> Garlic Parm",
    recipeSignature: buildBossRecipeSignature({
      primaryFlavorId: "s4_texas_bbq",
      bossFinishFlavorId: "r6_garlic_parm",
      heatLevel: "extreme",
      finisherIds: ["d1_ranch", "d2_fireback"]
    }),
    kitchenValidated: false,
    productionVisible: false
  }
];

export function getVisibleCuratedBossBuilds(): CuratedBossBuild[] {
  return CURATED_BOSS_BUILDS.filter((build) => build.kitchenValidated && build.productionVisible);
}

export const SWEET_LAB_STAGES = [
  "DESSERT_BASE",
  "PANCAKE_BATTER",
  "SWEET_FRY",
  "POWDERED_SUGAR",
  "OPTIONAL_SWEET_FINISHERS"
] as const;

export type SweetLabStage = (typeof SWEET_LAB_STAGES)[number];

export const SWEET_LAB_FRYERS = {
  savory: { id: "boss_mode_savory_fryer", kind: "savory" as const },
  sweet: { id: "sweet_lab_dessert_fryer", kind: "dessert" as const }
};

export const SWEET_LAB_FINISHERS = [
  { id: "chocolate_drizzle", label: "Chocolate drizzle", price_minor: null },
  { id: "caramel_drizzle", label: "Caramel drizzle", price_minor: null },
  { id: "regular_honey", label: "Regular honey", price_minor: null },
  { id: "hot_honey", label: "Hot honey", price_minor: null },
  { id: "whipped_cream", label: "Whipped cream", price_minor: null },
  { id: "fruit_drizzle", label: "Fruit-flavored drizzle", price_minor: null }
] as const;

export function validateSweetFryerIsolation(savoryFryerId: string, dessertFryerId: string): ValidationResult {
  if (!savoryFryerId || !dessertFryerId) {
    return { valid: false, reasons: ["Both fryer ids are required."] };
  }

  if (savoryFryerId === dessertFryerId) {
    return { valid: false, reasons: ["Sweet Lab fryer must stay isolated from savory fryer."] };
  }

  return { valid: true, reasons: [] };
}

export function validateSweetFinishersHaveNoPrice(): ValidationResult {
  const reasons = SWEET_LAB_FINISHERS.filter((finisher) => finisher.price_minor !== null).map((finisher) => `${finisher.id} has a price`);
  return { valid: reasons.length === 0, reasons };
}
