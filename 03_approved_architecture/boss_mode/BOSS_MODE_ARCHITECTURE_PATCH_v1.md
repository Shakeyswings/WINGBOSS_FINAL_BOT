# Wing⚡Boss Boss Mode Architecture Patch v1

Status: OWNER-APPROVED ARCHITECTURE WITH APPROVED QUANTITY-TIER SELLING PRICES; NOT A COST-RELEASE.
Approved: 2026-08-19 Asia/Phnom_Penh

## Governing rules
1. Boss Mode is an ordered recipe state machine.
2. Only kitchen-validated flavor paths may be sold.
3. Heat has explicit recipe/application semantics.
4. PRIMARY_FLAVOR, BOSS_FINISH_FLAVOR, and FINISHER are distinct commercial/recipe roles.
5. D4 is one PICK_ANY_3 entitlement across RUB and DRIZZLE finishers.
6. Boss Mode selling tiers are approved for 6/12/20/36 wings.
7. Cost inputs remain separate from selling prices and are still required for profitability analysis.
8. Customer UX uses progressive disclosure; never display the full combinatorial matrix at once.
9. Initial launch scope is 4–6 kitchen-validated curated Boss Builds plus Build Your Own.

## State machine
BASE_CHICKEN -> PRIMARY_FLAVOR -> BOSS_COOK_STAGE -> BOSS_FINISH_FLAVOR -> HEAT_APPLICATION -> FINISHERS -> VALIDATION -> PRICE -> KDS_RECIPE

## Release guardrails
- No unvalidated path may be CURRENT or customer-selectable.
- No Boss Mode selling price may be inferred outside the approved quantity-tier pricing.
- Kitchen timing, oil use, sauce quantities, energy, labor, waste, and packaging must be measured for cost approval.
- Curated builds are recipe presets; they do not create independent hidden pricing logic.
