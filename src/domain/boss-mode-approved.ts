import {
  getBossD4ChargeMinor,
  getBossD4PoolOptions,
  getBossHeatChargeMinor,
  getBossKnownFlavorIds,
  getBossPaidDryRubChargeMinor,
  getBossPaidDrizzleChargeMinor
} from "./boss-menu-adapter.ts";
import { getCurrentMenuVariantEntry } from "../menu/current-menu.ts";

export const FIRE_STORM_FLAVOR_ID = "s1_fire_storm";
export const FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR = 125 as const;

export type BossModeWingQuantity = 6 | 12 | 20 | 36;
export type BossModeProtein = "bone_in" | "boneless";

export const BOSS_MODE_ELIGIBLE_PROTEIN: BossModeProtein = "bone_in";
export const BOSS_MODE_WING_TYPE_ELIGIBILITY = {
  bone_in: true,
  boneless: false
} as const;

export const BOSS_MODE_SURCHARGE_MINOR_BY_WING_COUNT: Record<number, number> = {
  6: 225,
  12: 395,
  20: 595,
  36: 1095
};

export const BOSS_MODE_SURCHARGE_MINOR: Readonly<Record<BossModeWingQuantity, number>> =
  BOSS_MODE_SURCHARGE_MINOR_BY_WING_COUNT as Readonly<Record<BossModeWingQuantity, number>>;

export type ApprovedBossBuild = {
  id: string;
  displayName: string;
  primaryFlavorId: string;
  bossFinishFlavorId: string;
};

export const APPROVED_POPULAR_BOSS_BUILDS: readonly ApprovedBossBuild[] = [
  {
    id: "boss_build_buffalo_boss",
    displayName: "Buffalo Boss",
    primaryFlavorId: "s3_buffalo",
    bossFinishFlavorId: "s3_buffalo"
  },
  {
    id: "boss_build_kingpin",
    displayName: "Kingpin",
    primaryFlavorId: "s6_honey_teriyaki",
    bossFinishFlavorId: "s3_buffalo"
  },
  {
    id: "boss_build_crazy_horse",
    displayName: "Crazy Horse",
    primaryFlavorId: "s3_buffalo",
    bossFinishFlavorId: FIRE_STORM_FLAVOR_ID
  }
] as const;

export const APPROVED_BOSS_BUILD_SPECS = {
  boss_build_buffalo_boss: {
    id: "boss_build_buffalo_boss",
    label: "Buffalo Boss",
    primaryFlavorId: "s3_buffalo",
    finishFlavorId: "s3_buffalo"
  },
  boss_build_kingpin: {
    id: "boss_build_kingpin",
    label: "Kingpin",
    primaryFlavorId: "s6_honey_teriyaki",
    finishFlavorId: "s3_buffalo"
  },
  boss_build_crazy_horse: {
    id: "boss_build_crazy_horse",
    label: "Crazy Horse",
    primaryFlavorId: "s3_buffalo",
    finishFlavorId: FIRE_STORM_FLAVOR_ID
  }
} as const;

export type ApprovedBossBuildId = keyof typeof APPROVED_BOSS_BUILD_SPECS;

const BONE_IN_BASE_VARIANT_BY_WING_COUNT: Record<number, string> = {
  6: "a4_6pc",
  10: "a4_10pc",
  20: "a4_20pc",
  36: "a4_36pc",
  50: "a4_50pc"
};

function isKnownBossFinishFlavorId(id: string): boolean {
  return getBossKnownFlavorIds().includes(id);
}

export function isBossModeProteinEligible(protein: BossModeProtein): boolean {
  return protein === BOSS_MODE_ELIGIBLE_PROTEIN;
}

export function isBossModeWingTypeEligible(wingType: "bone_in" | "boneless"): boolean {
  return BOSS_MODE_WING_TYPE_ELIGIBILITY[wingType];
}

export function getBossModeSurchargeMinor(wingQuantity: number): number | null {
  if (!Number.isInteger(wingQuantity)) return null;
  return BOSS_MODE_SURCHARGE_MINOR[wingQuantity as BossModeWingQuantity] ?? null;
}

export function getBossModeQuantitySurchargeMinor(wingQuantity: number): number | null {
  return getBossModeSurchargeMinor(wingQuantity);
}

export function getBoneInWingBasePriceMinor(wingQuantity: number): number | null {
  const variantId = BONE_IN_BASE_VARIANT_BY_WING_COUNT[wingQuantity];
  if (!variantId) return null;

  return getCurrentMenuVariantEntry(variantId)?.price_minor ?? null;
}

/**
 * Fire Storm is a special Boss-finish charge of USD 1.25 per complete 6-wing unit.
 * Quantities that are not exact multiples of 6 are intentionally unresolved here;
 * this function never invents a rounding rule.
 */
export function getFireStormBossFinishChargeMinor(wingQuantity: number): number | null {
  if (!Number.isInteger(wingQuantity) || wingQuantity <= 0 || wingQuantity % 6 !== 0) return null;
  return (wingQuantity / 6) * FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR;
}

export function getBossModeAdditionalChargeMinor(wingQuantity: number, bossFinishFlavorId: string): number | null {
  const bossCharge = getBossModeSurchargeMinor(wingQuantity);
  if (bossCharge === null) return null;

  if (bossFinishFlavorId !== FIRE_STORM_FLAVOR_ID) return bossCharge;

  const fireStormCharge = getFireStormBossFinishChargeMinor(wingQuantity);
  if (fireStormCharge === null) return null;

  return bossCharge + fireStormCharge;
}

export function getBossModeAdditionalFinisherChargeMinor(finisherIds: string[]): number | null {
  if (new Set(finisherIds).size !== finisherIds.length) return null;

  let total = 0;
  for (const finisherId of finisherIds) {
    const chargeMinor = getBossPaidDryRubChargeMinor(finisherId) ?? getBossPaidDrizzleChargeMinor(finisherId);
    if (chargeMinor === null) return null;
    total += chargeMinor;
  }

  return total;
}

export type BossModeOrderChargeExtras = {
  heatLevel?: string | null;
  d4SelectionIds?: string[];
  additionalFinisherIds?: string[];
};

export function getBossModeOrderTotalMinor(wingQuantity: number, bossFinishFlavorId: string, extras: BossModeOrderChargeExtras = {}): number | null {
  if (!isKnownBossFinishFlavorId(bossFinishFlavorId)) return null;

  const basePriceMinor = getBoneInWingBasePriceMinor(wingQuantity);
  const bossSurchargeMinor = getBossModeQuantitySurchargeMinor(wingQuantity);
  if (basePriceMinor === null || bossSurchargeMinor === null) return null;

  const selectedIds = [...(extras.d4SelectionIds ?? []), ...(extras.additionalFinisherIds ?? [])];
  if (new Set(selectedIds).size !== selectedIds.length) return null;

  const specialChargeMinor = bossFinishFlavorId === FIRE_STORM_FLAVOR_ID ? getFireStormBossFinishChargeMinor(wingQuantity) : 0;
  if (specialChargeMinor === null) return null;

  const heatChargeMinor = extras.heatLevel ? getBossHeatChargeMinor(extras.heatLevel) : 0;
  if (heatChargeMinor === null) return null;

  const d4ChargeMinor = extras.d4SelectionIds ? getBossD4ChargeMinorForSelection(extras.d4SelectionIds) : 0;
  if (d4ChargeMinor === null) return null;

  const extraFinisherChargeMinor = extras.additionalFinisherIds ? getBossModeAdditionalFinisherChargeMinor(extras.additionalFinisherIds) : 0;
  if (extraFinisherChargeMinor === null) return null;

  return basePriceMinor + bossSurchargeMinor + specialChargeMinor + heatChargeMinor + d4ChargeMinor + extraFinisherChargeMinor;
}

function getBossD4ChargeMinorForSelection(selectionIds: string[]): number | null {
  if (selectionIds.length !== 3) return null;
  if (new Set(selectionIds).size !== selectionIds.length) return null;

  const pool = new Set(getBossD4PoolOptions().map((option) => option.id));
  for (const id of selectionIds) {
    if (!pool.has(id)) return null;
  }

  return getBossD4ChargeMinor();
}

export function getApprovedBossBuildById(buildId: string): ApprovedBossBuild | null {
  return APPROVED_POPULAR_BOSS_BUILDS.find((build) => build.id === buildId) ?? null;
}

export function getApprovedBossBuildOrderTotalMinor(buildId: ApprovedBossBuildId, wingQuantity: number): number | null {
  const build = APPROVED_BOSS_BUILD_SPECS[buildId];
  return getBossModeOrderTotalMinor(wingQuantity, build.finishFlavorId);
}
