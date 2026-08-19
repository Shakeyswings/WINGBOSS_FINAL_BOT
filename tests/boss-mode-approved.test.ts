import { describe, expect, it } from "vitest";
import {
  APPROVED_POPULAR_BOSS_BUILDS,
  BOSS_MODE_SURCHARGE_MINOR,
  FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR,
  FIRE_STORM_FLAVOR_ID,
  getBossModeAdditionalChargeMinor,
  getBossModeSurchargeMinor,
  getFireStormBossFinishChargeMinor,
  isBossModeProteinEligible
} from "../src/domain/boss-mode-approved.ts";

describe("owner-approved Boss Mode rules", () => {
  it("allows Boss Mode only for bone-in wings", () => {
    expect(isBossModeProteinEligible("bone_in")).toBe(true);
    expect(isBossModeProteinEligible("boneless")).toBe(false);
  });

  it("uses the approved Boss Mode quantity surcharges", () => {
    expect(BOSS_MODE_SURCHARGE_MINOR).toEqual({
      6: 225,
      12: 395,
      20: 595,
      36: 1095
    });
    expect(getBossModeSurchargeMinor(6)).toBe(225);
    expect(getBossModeSurchargeMinor(12)).toBe(395);
    expect(getBossModeSurchargeMinor(20)).toBe(595);
    expect(getBossModeSurchargeMinor(36)).toBe(1095);
    expect(getBossModeSurchargeMinor(10)).toBeNull();
  });

  it("encodes the three approved named Boss builds exactly", () => {
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
  });

  it("charges Fire Storm at 125 minor units per complete 6-wing unit", () => {
    expect(FIRE_STORM_FLAVOR_ID).toBe("s1_fire_storm");
    expect(FIRE_STORM_BOSS_FINISH_CHARGE_PER_6_MINOR).toBe(125);
    expect(getFireStormBossFinishChargeMinor(6)).toBe(125);
    expect(getFireStormBossFinishChargeMinor(12)).toBe(250);
    expect(getFireStormBossFinishChargeMinor(18)).toBe(375);
    expect(getFireStormBossFinishChargeMinor(20)).toBeNull();
  });

  it("adds the Fire Storm special charge on top of the Boss Mode surcharge", () => {
    expect(getBossModeAdditionalChargeMinor(12, FIRE_STORM_FLAVOR_ID)).toBe(645);
    expect(getBossModeAdditionalChargeMinor(12, "s3_buffalo")).toBe(395);
    expect(getBossModeAdditionalChargeMinor(20, FIRE_STORM_FLAVOR_ID)).toBeNull();
  });
});
