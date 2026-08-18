# Wing⚡Boss Boss Mode Architecture Patch v1

Status: OWNER-APPROVED ARCHITECTURE; NOT A PRICING RELEASE.
Approved: 2026-08-19 Asia/Phnom_Penh

## Governing rules
1. Boss Mode is an ordered recipe state machine.
2. Only kitchen-validated flavor paths may be sold.
3. Heat has explicit recipe/application semantics.
4. PRIMARY_FLAVOR, BOSS_FINISH_FLAVOR, and FINISHER are distinct commercial/recipe roles.
5. D4 is one PICK_ANY_3 entitlement across RUB and DRIZZLE finishers.
6. Boss Mode charge is null and NEEDS_COST_INPUT until measured.
7. Flat versus quantity-tier pricing must be tested from measured costs before approval.
8. Customer UX uses progressive disclosure; never display the full combinatorial matrix at once.
9. Initial launch scope is 4–6 kitchen-validated curated Boss Builds plus Build Your Own.

## State machine
BASE_CHICKEN -> PRIMARY_FLAVOR -> BOSS_COOK_STAGE -> BOSS_FINISH_FLAVOR -> HEAT_APPLICATION -> FINISHERS -> VALIDATION -> PRICE -> KDS_RECIPE

## Release guardrails
- No unvalidated path may be CURRENT or customer-selectable.
- No Boss Mode selling price may be inferred from generated estimates.
- Kitchen timing, oil use, sauce quantities, energy, labor, waste, and packaging must be measured for cost approval.
- Curated builds are recipe presets; they do not create independent hidden pricing logic.
