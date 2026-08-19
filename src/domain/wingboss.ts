import {
  getBossD4ChargeMinor as getBossD4ChargeMinorFromAdapter,
  getBossD4PoolOptions,
  getBossFinishFlavorOptions,
  getBossFinisherOptions,
  getBossHeatChargeRecords,
  getBossKnownFlavorIds,
  getBossKnownFinisherIds,
  getBossKnownHeatLevels,
  getBossPaidDryRubChargeMinor,
  getBossPaidDrizzleChargeMinor,
  getBossPrimaryFlavorChargeMinor,
  getBossPrimaryFlavorOptions,
  resolveBossMenuLabel,
  type BossFinisherOption,
  type BossFlavorOption,
  type BossHeatChargeRecord
} from "./boss-menu-adapter.ts";

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

export type BossHeatLevel = "mild" | "hot" | "spicy" | "extreme" | "revenge" | "nuclear";

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

export type BossPathValidationRecord = {
  primaryFlavorId: string;
  finishFlavorId: string;
  cookProfileId: string | null;
  heatProfileId?: string | null;
  ownerApproved: boolean;
  kitchenValidated: boolean;
  publicationStatus: "PROPOSED" | "VALIDATED" | "CURRENT" | "RETIRED";
  evidenceId?: string | null;
};

export type BossBuildCandidate = {
  buildId: string;
  displayName: string;
  primaryFlavorId: string;
  finishFlavorId: string;
  heatId: string | null;
  finisherIds: string[];
  ownerApproved: boolean;
  kitchenValidated: boolean;
  publicationStatus: "PROPOSED" | "VALIDATED" | "CURRENT" | "RETIRED";
  evidenceId?: string | null;
  notes?: string | null;
};

export type CuratedBossBuild = BossBuildCandidate;

export const BOSS_PRIMARY_FLAVORS: BossFlavorOption[] = getBossPrimaryFlavorOptions();
export const BOSS_FINISH_FLAVORS: BossFlavorOption[] = getBossFinishFlavorOptions();
export const BOSS_FINISHERS: BossFinisherOption[] = getBossFinisherOptions();
export const BOSS_D4_POOL: BossFinisherOption[] = getBossD4PoolOptions();
export const BOSS_HEAT_RECORDS: BossHeatChargeRecord[] = getBossHeatChargeRecords();
export const BOSS_HEAT_LEVELS: BossHeatLevel[] = BOSS_HEAT_RECORDS.map((record) => record.heatLevel as BossHeatLevel);
export const BOSS_HEAT_CHARGE_MINOR = Object.fromEntries(BOSS_HEAT_RECORDS.map((record) => [record.heatLevel, record.heatChargeMinor])) as Record<BossHeatLevel, number>;

export const BOSS_MODE_PRICE_MINOR: number | null = null;
export const BOSS_MODE_PRICE_STATUS = "NEEDS_COST_INPUT" as const;

export const BOSS_PATH_VALIDATION_REGISTRY: BossPathValidationRecord[] = [];
export const BOSS_BUILD_CANDIDATES: BossBuildCandidate[] = [];
export const CURATED_BOSS_BUILDS: CuratedBossBuild[] = BOSS_BUILD_CANDIDATES;

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

export const SWEET_LAB_OIL_POOLS = {
  savory: { id: "boss_mode_savory_oil_pool", kind: "savory" as const },
  sweet: { id: "sweet_lab_dessert_oil_pool", kind: "dessert" as const }
};

export const SWEET_LAB_FINISHERS = [
  { id: "chocolate_drizzle", label: "Chocolate drizzle", price_minor: null },
  { id: "caramel_drizzle", label: "Caramel drizzle", price_minor: null },
  { id: "regular_honey", label: "Regular honey", price_minor: null },
  { id: "hot_honey", label: "Hot honey", price_minor: null },
  { id: "whipped_cream", label: "Whipped cream", price_minor: null },
  { id: "fruit_drizzle", label: "Fruit-flavored drizzle", price_minor: null }
] as const;

function isKnownBossFlavorId(id: string): boolean {
  return getBossKnownFlavorIds().includes(id);
}

function isKnownBossFinisherId(id: string): boolean {
  return getBossKnownFinisherIds().includes(id);
}

function isKnownBossHeatLevel(level: string): level is BossHeatLevel {
  return getBossKnownHeatLevels().includes(level);
}

export function buildBossRecipeSignature(selection: Pick<BossSelection, "primaryFlavorId" | "bossFinishFlavorId" | "heatLevel" | "finisherIds">): string {
  return [selection.primaryFlavorId, selection.bossFinishFlavorId, selection.heatLevel, ...selection.finisherIds].join("|");
}

export function validateBossSelection(selection: BossSelection): ValidationResult {
  const reasons: string[] = [];

  if (!selection.primaryFlavorId) reasons.push("Primary flavor is required.");
  if (!selection.bossFinishFlavorId) reasons.push("Boss finish flavor is required.");
  if (!selection.heatLevel) reasons.push("Heat level is required.");
  if (selection.primaryFlavorId && !isKnownBossFlavorId(selection.primaryFlavorId)) reasons.push("Primary flavor must come from the governed current menu.");
  if (selection.bossFinishFlavorId && !isKnownBossFlavorId(selection.bossFinishFlavorId)) reasons.push("Boss finish flavor must come from the governed current menu.");
  if (selection.heatLevel && !isKnownBossHeatLevel(selection.heatLevel)) reasons.push("Heat level must come from the governed current menu.");

  const finisherIds = selection.finisherIds ?? [];
  if (new Set(finisherIds).size !== finisherIds.length) reasons.push("Finishers must be unique.");

  for (const finisherId of finisherIds) {
    if (!isKnownBossFinisherId(finisherId)) reasons.push(`Unsupported finisher: ${finisherId}`);
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateBossPathRecord(record: BossPathValidationRecord): ValidationResult {
  const reasons: string[] = [];

  if (!record.primaryFlavorId) reasons.push("primaryFlavorId is required.");
  if (!record.finishFlavorId) reasons.push("finishFlavorId is required.");
  if (!record.cookProfileId) reasons.push("cookProfileId is required.");
  if (record.heatProfileId !== undefined && record.heatProfileId !== null && !isKnownBossHeatLevel(record.heatProfileId)) {
    reasons.push("heatProfileId must come from the governed current menu.");
  }
  if (!isKnownBossFlavorId(record.primaryFlavorId)) reasons.push(`Unsupported primary flavor: ${record.primaryFlavorId}`);
  if (!isKnownBossFlavorId(record.finishFlavorId)) reasons.push(`Unsupported finish flavor: ${record.finishFlavorId}`);
  if (!["PROPOSED", "VALIDATED", "CURRENT", "RETIRED"].includes(record.publicationStatus)) reasons.push(`Unsupported publication status: ${record.publicationStatus}`);
  if (typeof record.ownerApproved !== "boolean") reasons.push("ownerApproved must be boolean.");
  if (typeof record.kitchenValidated !== "boolean") reasons.push("kitchenValidated must be boolean.");

  return { valid: reasons.length === 0, reasons };
}

export function isBossPathOrderable(record: BossPathValidationRecord): boolean {
  const validation = validateBossPathRecord(record);
  return (
    validation.valid &&
    record.ownerApproved &&
    record.kitchenValidated &&
    record.publicationStatus === "CURRENT" &&
    record.evidenceId !== null &&
    record.evidenceId !== undefined &&
    record.heatProfileId !== null &&
    record.heatProfileId !== undefined &&
    record.cookProfileId !== null &&
    BOSS_MODE_PRICE_MINOR !== null &&
    BOSS_MODE_PRICE_STATUS !== "NEEDS_COST_INPUT"
  );
}

export function findBossPathValidationRecord(primaryFlavorId: string, finishFlavorId: string, heatProfileId: string | null): BossPathValidationRecord | null {
  return (
    BOSS_PATH_VALIDATION_REGISTRY.find(
      (record) =>
        record.primaryFlavorId === primaryFlavorId &&
        record.finishFlavorId === finishFlavorId &&
        (record.heatProfileId ?? null) === heatProfileId
    ) ?? null
  );
}

export function isBossSelectionCustomerSelectable(selection: BossSelection): boolean {
  const validation = validateBossSelection(selection);
  if (!validation.valid) return false;
  if (!selection.kitchenValidated) return false;
  if (BOSS_MODE_PRICE_MINOR === null || BOSS_MODE_PRICE_STATUS === "NEEDS_COST_INPUT") return false;

  const record = findBossPathValidationRecord(selection.primaryFlavorId, selection.bossFinishFlavorId, selection.heatLevel);
  return Boolean(record && isBossPathOrderable(record));
}

export function getBossHeatChargeMinor(level: BossHeatLevel): number {
  return BOSS_HEAT_CHARGE_MINOR[level];
}

export function renderBossKitchenInstructions(selection: BossSelection): string[] {
  const heatRecord = BOSS_HEAT_RECORDS.find((record) => record.heatLevel === selection.heatLevel);
  const selectedFinishers = selection.finisherIds.length ? selection.finisherIds.map((id) => resolveBossMenuLabel(id)).join(" / ") : "none";

  return [
    "BOSS MODE",
    `1. PRIMARY - ${resolveBossMenuLabel(selection.primaryFlavorId)}`,
    "2. BOSS COOK - validated re-fry profile",
    `3. FINISH FLAVOR - ${resolveBossMenuLabel(selection.bossFinishFlavorId)}`,
    `4. HEAT - ${heatRecord?.label ?? selection.heatLevel}`,
    `5. FINISH - ${selectedFinishers}`
  ];
}

export function validateD4PickAny3(selectionIds: string[]): ValidationResult & { rubCount: number; drizzleCount: number } {
  const reasons: string[] = [];
  const pool = new Map(BOSS_D4_POOL.map((option) => [option.id, option.kind] as const));

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
    if (kind === "dry_rub") rubCount += 1;
    if (kind === "drizzle") drizzleCount += 1;
  }

  return { valid: reasons.length === 0, reasons, rubCount, drizzleCount };
}

export function calculateD4ChargeMinor(selectionIds: string[]): number | null {
  const validation = validateD4PickAny3(selectionIds);
  return validation.valid ? getBossD4ChargeMinor() : null;
}

export function getBossD4ChargeMinor(): number | null {
  return getBossD4ChargeMinorFromAdapter();
}

export function getBossPrimaryFlavorCurrentChargeMinor(id: string): number | null {
  return getBossPrimaryFlavorChargeMinor(id);
}

export function getBossPaidDryRubCurrentChargeMinor(id: string): number | null {
  return getBossPaidDryRubChargeMinor(id);
}

export function getBossPaidDrizzleCurrentChargeMinor(id: string): number | null {
  return getBossPaidDrizzleChargeMinor(id);
}

export function getVisibleCuratedBossBuilds(): CuratedBossBuild[] {
  return CURATED_BOSS_BUILDS.filter(
    (build) => build.ownerApproved && build.kitchenValidated && build.publicationStatus === "CURRENT"
  );
}

export function validateSweetFryerIsolation(savoryFryerId: string, dessertFryerId: string): ValidationResult {
  if (!savoryFryerId || !dessertFryerId) {
    return { valid: false, reasons: ["Both fryer ids are required."] };
  }

  if (savoryFryerId === dessertFryerId) {
    return { valid: false, reasons: ["Sweet Lab fryer must stay isolated from savory fryer."] };
  }

  return { valid: true, reasons: [] };
}

export function validateSweetOilPoolIsolation(savoryOilPoolId: string, dessertOilPoolId: string): ValidationResult {
  if (!savoryOilPoolId || !dessertOilPoolId) {
    return { valid: false, reasons: ["Both oil pool ids are required."] };
  }

  if (savoryOilPoolId === dessertOilPoolId) {
    return { valid: false, reasons: ["Sweet Lab oil pool must stay isolated from savory oil pool."] };
  }

  return { valid: true, reasons: [] };
}

export function validateSweetFinishersHaveNoPrice(): ValidationResult {
  const reasons = SWEET_LAB_FINISHERS.filter((finisher) => finisher.price_minor !== null).map((finisher) => `${finisher.id} has a price`);
  return { valid: reasons.length === 0, reasons };
}

export * from "./boss-mode-approved.ts";
