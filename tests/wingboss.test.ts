import { describe, expect, it } from "vitest";
import {
  BOSS_HEAT_CHARGE_MINOR,
  BOSS_MODE_PRICE_MINOR,
  BOSS_MODE_PRICE_STATUS,
  BOSS_RECIPE_STAGES,
  CURATED_BOSS_BUILDS,
  SWEET_LAB_FINISHERS,
  SWEET_LAB_FRYERS,
  SWEET_LAB_STAGES,
  buildBossRecipeSignature,
  calculateD4ChargeMinor,
  getBossHeatChargeMinor,
  getVisibleCuratedBossBuilds,
  isBossSelectionCustomerSelectable,
  renderBossKitchenInstructions,
  validateBossSelection,
  validateD4PickAny3,
  validateSweetFinishersHaveNoPrice,
  validateSweetFryerIsolation
} from "../src/domain/wingboss.ts";

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

  it("treats primary and finish flavor order as distinct", () => {
    const forward = buildBossRecipeSignature({
      primaryFlavorId: "s6_honey_teriyaki",
      bossFinishFlavorId: "s3_buffalo",
      heatLevel: "revenge",
      finisherIds: ["r6_garlic_parm"]
    });
    const reverse = buildBossRecipeSignature({
      primaryFlavorId: "s3_buffalo",
      bossFinishFlavorId: "s6_honey_teriyaki",
      heatLevel: "revenge",
      finisherIds: ["r6_garlic_parm"]
    });

    expect(forward).not.toBe(reverse);
  });

  it("rejects unvalidated boss paths", () => {
    expect(
      validateBossSelection({
        primaryFlavorId: "s6_honey_teriyaki",
        bossFinishFlavorId: "s3_buffalo",
        heatLevel: "revenge",
        finisherIds: ["r6_garlic_parm"],
        kitchenValidated: false
      }).valid
    ).toBe(false);
  });

  it("keeps valid boss paths blocked from customer ordering until cost approval exists", () => {
    const selection = {
      primaryFlavorId: "s6_honey_teriyaki",
      bossFinishFlavorId: "s3_buffalo",
      heatLevel: "revenge" as const,
      finisherIds: ["r6_garlic_parm"],
      kitchenValidated: true
    };

    expect(validateBossSelection(selection).valid).toBe(true);
    expect(isBossSelectionCustomerSelectable(selection)).toBe(false);
    expect(BOSS_MODE_PRICE_MINOR).toBeNull();
    expect(BOSS_MODE_PRICE_STATUS).toBe("NEEDS_COST_INPUT");
  });

  it("renders ordered kitchen instructions", () => {
    expect(
      renderBossKitchenInstructions({
        primaryFlavorId: "s6_honey_teriyaki",
        bossFinishFlavorId: "s3_buffalo",
        heatLevel: "revenge",
        finisherIds: ["r6_garlic_parm", "d1_ranch"],
        kitchenValidated: true
      })
    ).toEqual([
      "BOSS MODE",
      "1. PRIMARY - s6_honey_teriyaki",
      "2. BOSS COOK - validated re-fry profile",
      "3. FINISH FLAVOR - s3_buffalo",
      "4. HEAT - revenge",
      "5. FINISH - r6_garlic_parm / d1_ranch"
    ]);
  });

  it("accepts the approved D4 splits and rejects invalid options", () => {
    expect(validateD4PickAny3(["r1_cajun", "r2_midnight_rub", "r3_buffalo_dust"]).valid).toBe(true);
    expect(validateD4PickAny3(["d1_ranch", "d2_fireback", "d3_hot_honey"]).valid).toBe(true);
    expect(validateD4PickAny3(["r1_cajun", "d1_ranch", "d3_hot_honey"]).valid).toBe(true);
    expect(validateD4PickAny3(["r1_cajun", "r2_midnight_rub", "d1_ranch"]).valid).toBe(true);
    expect(validateD4PickAny3(["r1_cajun", "r1_cajun", "d1_ranch"]).valid).toBe(false);
    expect(validateD4PickAny3(["r1_cajun", "d1_ranch"]).valid).toBe(false);
    expect(validateD4PickAny3(["r1_cajun", "d1_ranch", "not_real"]).valid).toBe(false);
    expect(calculateD4ChargeMinor(["r1_cajun", "r2_midnight_rub", "d1_ranch"])).toBe(100);
  });

  it("keeps heat charges explicit and separate from recipe semantics", () => {
    expect(BOSS_HEAT_CHARGE_MINOR).toMatchObject({ mild: 0, standard: 0, hot: 25, spicy: 50, extreme: 75, revenge: 100, nuclear: 125 });
    expect(getBossHeatChargeMinor("revenge")).toBe(100);
    expect(getBossHeatChargeMinor("standard")).toBe(0);
  });

  it("keeps Sweet Lab fryer isolation and finisher pricing rules intact", () => {
    expect(validateSweetFryerIsolation(SWEET_LAB_FRYERS.savory.id, SWEET_LAB_FRYERS.sweet.id).valid).toBe(true);
    expect(validateSweetFryerIsolation(SWEET_LAB_FRYERS.savory.id, SWEET_LAB_FRYERS.savory.id).valid).toBe(false);
    expect(validateSweetFinishersHaveNoPrice().valid).toBe(true);
    expect(SWEET_LAB_FINISHERS.every((finisher) => finisher.price_minor === null)).toBe(true);
    expect(SWEET_LAB_STAGES).toEqual(["DESSERT_BASE", "PANCAKE_BATTER", "SWEET_FRY", "POWDERED_SUGAR", "OPTIONAL_SWEET_FINISHERS"]);
  });

  it("keeps curated boss builds non-production until validated", () => {
    expect(CURATED_BOSS_BUILDS.length).toBe(4);
    expect(getVisibleCuratedBossBuilds()).toEqual([]);
    expect(CURATED_BOSS_BUILDS.every((build) => !build.kitchenValidated && !build.productionVisible)).toBe(true);
  });
});
