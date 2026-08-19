import { describe, expect, it } from "vitest";
import {
  APPROVED_BOSS_BUILD_SPECS,
  APPROVED_POPULAR_BOSS_BUILDS,
  FIRE_STORM_BOSS_FINISH_CHARGE_MINOR_BY_WING_COUNT,
  BOSS_MODE_SURCHARGE_MINOR,
  FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR,
  FIRE_STORM_FLAVOR_ID,
  getApprovedBossBuildById,
  getApprovedBossBuildOrderTotalMinor,
  getBoneInWingBasePriceMinor,
  getBossModeAdditionalChargeMinor,
  getBossModeAdditionalFinisherChargeMinor,
  getBossModeOrderTotalMinor,
  getBossModeQuantitySurchargeMinor,
  getBossModeSurchargeMinor,
  getFireStormBossFinishChargeMinor,
  isBossModeProteinEligible,
  isBossModeWingTypeEligible
} from "../src/domain/boss-mode-approved.ts";
import { getCurrentMenuVariantEntry } from "../src/menu/current-menu.ts";

describe("approved Boss Mode pricing", () => {
  it("keeps the old Boss Mode compatibility API intact", () => {
    expect(isBossModeProteinEligible("bone_in")).toBe(true);
    expect(isBossModeProteinEligible("boneless")).toBe(false);
    expect(isBossModeWingTypeEligible("bone_in")).toBe(true);
    expect(isBossModeWingTypeEligible("boneless")).toBe(false);
    expect(BOSS_MODE_SURCHARGE_MINOR).toEqual({ 6: 225, 12: 395, 20: 595, 36: 1095 });
    expect(getBossModeSurchargeMinor(6)).toBe(225);
    expect(getBossModeSurchargeMinor(12)).toBe(395);
    expect(getBossModeSurchargeMinor(20)).toBe(595);
    expect(getBossModeSurchargeMinor(36)).toBe(1095);
    expect(getBossModeSurchargeMinor(10)).toBeNull();
    expect(FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR).toBe(125);
    expect(APPROVED_POPULAR_BOSS_BUILDS).toEqual([
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
        bossFinishFlavorId: "s1_fire_storm"
      }
    ]);
    expect(getApprovedBossBuildById("boss_build_buffalo_boss")?.displayName).toBe("Buffalo Boss");
    expect(getApprovedBossBuildById("missing-build")).toBeNull();
  });

  it("resolves the canonical 6pc Bone-In base price from the current menu", () => {
    expect(getCurrentMenuVariantEntry("a4_6pc")?.price_minor).toBe(675);
    expect(getBoneInWingBasePriceMinor(6)).toBe(675);
  });

  it("keeps approved Boss Mode surcharge amounts intact", () => {
    expect(getBossModeQuantitySurchargeMinor(6)).toBe(225);
    expect(getBossModeQuantitySurchargeMinor(12)).toBe(395);
    expect(getBossModeQuantitySurchargeMinor(20)).toBe(595);
    expect(getBossModeQuantitySurchargeMinor(36)).toBe(1095);
    expect(getBossModeQuantitySurchargeMinor(8)).toBeNull();
  });

  it("keeps Fire Storm charge as a per-6-wing rule", () => {
    expect(getFireStormBossFinishChargeMinor(6)).toBe(125);
    expect(getFireStormBossFinishChargeMinor(12)).toBe(250);
    expect(getFireStormBossFinishChargeMinor(18)).toBe(375);
    expect(getFireStormBossFinishChargeMinor(20)).toBe(415);
    expect(getFireStormBossFinishChargeMinor(24)).toBe(500);
    expect(getFireStormBossFinishChargeMinor(30)).toBe(625);
    expect(getFireStormBossFinishChargeMinor(36)).toBe(750);
    expect(FIRE_STORM_BOSS_FINISH_CHARGE_MINOR_BY_WING_COUNT).toEqual({ 6: 125, 12: 250, 18: 375, 20: 415, 24: 500, 30: 625, 36: 750 });
    expect(getFireStormBossFinishChargeMinor(7)).toBeNull();
  });

  it("keeps the special Fire Storm add-on separate from the base Boss surcharge", () => {
    expect(getBossModeAdditionalChargeMinor(12, FIRE_STORM_FLAVOR_ID)).toBe(645);
    expect(getBossModeAdditionalChargeMinor(12, "s3_buffalo")).toBe(395);
    expect(getBossModeAdditionalChargeMinor(20, FIRE_STORM_FLAVOR_ID)).toBe(1010);
  });

  it("adds heat, D4, and paid finisher charges without double charging included components", () => {
    expect(getBossModeAdditionalFinisherChargeMinor(["r1_cajun", "d1_ranch"])).toBe(100);
    expect(
      getBossModeOrderTotalMinor(6, FIRE_STORM_FLAVOR_ID, {
        heatLevel: "hot",
        d4SelectionIds: ["r1_cajun", "r2_midnight_rub", "d1_ranch"],
        additionalFinisherIds: ["r3_buffalo_dust"]
      })
    ).toBe(1200);
    expect(
      getBossModeOrderTotalMinor(6, FIRE_STORM_FLAVOR_ID, {
        heatLevel: "hot",
        d4SelectionIds: ["r1_cajun", "r2_midnight_rub", "d1_ranch"],
        additionalFinisherIds: ["r1_cajun"]
      })
    ).toBeNull();
  });

  it("calculates Crazy Horse 6-wing total correctly", () => {
    expect(getBossModeOrderTotalMinor(6, FIRE_STORM_FLAVOR_ID)).toBe(1025);
    expect(getBossModeOrderTotalMinor(6, "s3_buffalo")).toBe(900);
  });

  it("calculates Crazy Horse 20-wing total correctly", () => {
    expect(getBossModeOrderTotalMinor(20, FIRE_STORM_FLAVOR_ID)).toBe(3085);
    expect(getBossModeAdditionalChargeMinor(20, FIRE_STORM_FLAVOR_ID)).toBe(1010);
    expect(getApprovedBossBuildOrderTotalMinor("boss_build_crazy_horse", 20)).toBe(3085);
  });

  it("keeps named approved builds aligned with the approved totals", () => {
    expect(APPROVED_BOSS_BUILD_SPECS.boss_build_buffalo_boss.label).toBe("Buffalo Boss");
    expect(APPROVED_BOSS_BUILD_SPECS.boss_build_kingpin.label).toBe("Kingpin");
    expect(APPROVED_BOSS_BUILD_SPECS.boss_build_crazy_horse.label).toBe("Crazy Horse");
    expect(getApprovedBossBuildOrderTotalMinor("boss_build_buffalo_boss", 6)).toBe(900);
    expect(getApprovedBossBuildOrderTotalMinor("boss_build_kingpin", 6)).toBe(900);
    expect(getApprovedBossBuildOrderTotalMinor("boss_build_crazy_horse", 6)).toBe(1025);
  });

  it("returns null for unresolved base prices and unsupported quantities", () => {
    expect(getBoneInWingBasePriceMinor(12)).toBeNull();
    expect(getBoneInWingBasePriceMinor(12)).not.toBe(0);
    expect(getBossModeQuantitySurchargeMinor(7)).toBeNull();
    expect(getBossModeOrderTotalMinor(12, "s3_buffalo")).toBeNull();
  });
});
