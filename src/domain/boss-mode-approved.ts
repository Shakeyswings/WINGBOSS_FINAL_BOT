export type BossModeWingQuantity = 6 | 12 | 20 | 36;
export type BossModeProtein = "bone_in" | "boneless";

export const BOSS_MODE_ELIGIBLE_PROTEIN: BossModeProtein = "bone_in";

export const BOSS_MODE_SURCHARGE_MINOR: Readonly<Record<BossModeWingQuantity, number>> = {
  6: 225,
  12: 395,
  20: 595,
  36: 1095
};

export const FIRE_STORM_FLAVOR_ID = "s1_fire_storm" as const;
export const FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR = 125 as const;

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

export function isBossModeProteinEligible(protein: BossModeProtein): boolean {
  return protein === BOSS_MODE_ELIGIBLE_PROTEIN;
}

export function getBossModeSurchargeMinor(wingQuantity: number): number | null {
  if (!Number.isInteger(wingQuantity)) return null;
  return BOSS_MODE_SURCHARGE_MINOR[wingQuantity as BossModeWingQuantity] ?? null;
}

/**
 * Fire Storm is a special Boss-finish charge of USD 1.25 per complete 6-wing unit.
 * The owner explicitly established 12 wings => USD 2.50.
 * Quantities that are not exact multiples of 6 are intentionally unresolved here;
 * this function never invents a rounding rule.
 */
export function getFireStormBossFinishChargeMinor(wingQuantity: number): number | null {
  if (!Number.isInteger(wingQuantity) || wingQuantity <= 0 || wingQuantity % 6 !== 0) return null;
  return (wingQuantity / 6) * FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR;
}

export function getBossModeAdditionalChargeMinor(
  wingQuantity: number,
  bossFinishFlavorId: string
): number | null {
  const bossCharge = getBossModeSurchargeMinor(wingQuantity);
  if (bossCharge === null) return null;

  if (bossFinishFlavorId !== FIRE_STORM_FLAVOR_ID) return bossCharge;

  const fireStormCharge = getFireStormBossFinishChargeMinor(wingQuantity);
  if (fireStormCharge === null) return null;

  return bossCharge + fireStormCharge;
}

export function getApprovedBossBuildById(buildId: string): ApprovedBossBuild | null {
  return APPROVED_POPULAR_BOSS_BUILDS.find((build) => build.id === buildId) ?? null;
}
