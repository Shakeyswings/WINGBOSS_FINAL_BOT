# CURRENT MENU CONTRACT

Status: PHASE 2 DESIGN
Applies to: Wing Boss current customer ordering only
Last updated: 2026-08-12

This contract defines the canonical current menu model and the canonical machine-readable current menu source.

Source authority:

- `authoritative-sources/00_CURRENT_MENU_APPROVED_2026-08-12.jpg`

The historical 70-flavor system, historical bot menus, old menu JSON, and legacy flavor vault material are reference-only and may not populate current customer ordering unless the current approved source explicitly shows the concept.

## 1. Purpose

The current menu must:

- preserve the owner-approved active menu exactly as shown
- prevent historical menu/flavor contamination
- create a deterministic machine-readable source
- support later server-authoritative pricing and order validation
- preserve future catalog extension points for other businesses and industries
- avoid restaurant-specific assumptions in the universal catalog core

## 2. Source Authority

The exact authoritative source is:

- `authoritative-sources/00_CURRENT_MENU_APPROVED_2026-08-12.jpg`

Priority order for menu data:

1. Current owner-approved menu image
2. Current owner decisions
3. Current verified working code
4. Approved specifications
5. Audit / recovery reports
6. Historical implementations
7. Historical menu / flavor systems
8. Unknown / conflicting sources

If a text, price, item, or modifier cannot be read confidently from the image, do not guess. Mark it as `REQUIRES_OWNER_CONFIRMATION` and prevent it from becoming active purchasable data.

## 3. Universal Catalog Model

The minimum universal concepts required are:

- `Catalog`
- `CatalogCategory`
- `CatalogItem`
- `Variant`
- `ModifierGroup`
- `ModifierOption`
- `Price`
- `Availability`
- `LocationOverride`

### Universal / restaurant-specific distinction

- A Wing quantity or serving size is a `Variant`.
- Flavor selection is a `ModifierGroup`.
- Sauce, drizzle, dip, seasoning, side choice, and drink choice are `ModifierOption` families where appropriate.
- The universal names must not hard-code "wings".

## 4. Menu Ownership

The menu / catalog belongs primarily to `Business` with optional `Location` availability / override semantics.

Current menu scope in the canonical artifact:

- authority_status: `ACTIVE_CURRENT_MENU`
- business scope semantics: `Business` primary, `Location` optional override

Future businesses may each have their own catalogs under the same universal contract.

No invented tenant / business / location IDs are created in the canonical source file.

## 5. Identifier Rules

Stable visible codes are preserved where shown, including owner-facing codes such as `A1`, `A2`, `B1`, etc.

Distinctions:

- display / business code: owner-visible code such as `A1`
- canonical internal ID: deterministic machine-readable ID such as `a1_bone_in_combo`

Identity must not depend on array position.

UUID / ULID / database-generated identifiers are not prescribed here.

## 6. Price Representation

Prices must be exact and deterministic.

Canonical money representation:

- `currency`: `USD`
- `amount_minor`: integer minor units

This document does not decide implementation storage, only exact representation.

No AI-calculated prices.

No client-supplied price authority.

## 7. Modifier / Customization Contract

The current approved menu requires structure for:

- variant / quantity selection
- flavor selection
- heat selection where shown
- seasoning upgrades
- drizzles
- dips
- sides
- drinks
- included vs paid modifiers
- minimum selections
- maximum selections
- quantity-dependent rules

Historical flavor-vault structure may inform schema capability only. It may not populate active menu data unless the current source image explicitly shows it.

### 7A. Owner-Approved Current Decisions

Current owner decisions override ambiguous image transcription where they conflict.

- `A3` Flavor Box keeps the base product; `Boneless +$1.50` is an upgrade modifier, not a standalone variant.
- Wing flavor allocation rules are distinct from general customization rules:
  - 6 bone-in wings include exactly 1 flavor.
  - 8 boneless wings include exactly 1 flavor.
  - 12 wings include exactly 2 flavors.
  - 36 wings include exactly 3 flavors.
  - 48 wings include exactly 4 flavors.
  - The added wing flavor may be Sauce or Dry Rub.
  - The `+1 flavor` upgrade is eligible on wing orders of 20 wings or more.
- General dry-rub customization remains separate:
  - additional dry rub to any eligible item is `+$0.50`.
  - this does not increase wing flavor portions.
- `C1` is `CAJUN FRIED CORN`.
- `C1` includes exactly 1 dry rub choice.
- `C1` includes exactly 1 free drizzle OR 1 free dip.
- `D4` is `TRIPLE DRIZZ` for `+$1.00` and means Ranch + Fireback + Hot Honey.
- `S1` to `S7` are current Wing Boss chicken wing sauces used as the included primary wing flavor choice.
- `R1` to `R6` are current Wing Boss dry rubs used as the included primary wing flavor choice.
- Additional dry rub to any eligible item is `+$0.50`.
- Sauce on the side is a 30 ml contextual side-sauce option at `+$1.00`.
- Fire Storm is excluded from side-sauce eligibility.
- Additional drizzle to any eligible item is `+$0.50`.
- Triple Drizz is `+$1.00`.
- Heat / spice upgrades use the owner-approved fixed ladder: MILD `+$0.00`, HOT `+$0.25`, SPICY `+$0.50`, EXTREME `+$0.75`, NUCLEAR `+$1.00`.
- Dips are `+$0.75` and include Ranch, Fireback, Ketchup, and BBQ.
- Dusted rub is `+$0.50 per 6 wings` for rub wing items.
- `Add +1 Sauce / Rub` is the canonical additional wing-flavor upgrade at `+$1.00` for wing orders of 20 wings or more.

Pricing semantics are contextual:

- a sauce or dry rub may be included in a primary flavor-selection context at `+$0.00`
- the same dry rub may charge `+$0.50` when used as an add-on context
- sauce on the side is a 30 ml side portion at `+$1.00`
- dusted rub charges in 6-wing units using the applicable wing quantity divided by 6
- a drizzle may charge `+$0.50` normally and `+$0.00` when granted as C1's free finish choice
- a dip may charge `+$0.75` normally and `+$0.00` when granted as C1's free finish choice
- heat upgrades are fixed order-level surcharges, not per-wing charges

## 8. Historical Flavor Vault Boundary

The historical 70-flavor system is not active menu data.

It may later become reference / training content, recipe knowledge, optional future catalog features, flavor development source, or staff education material.

It may not automatically populate customer ordering.

No current menu item may be added solely because it appears in historical flavor data.

## 9. Current vs Future Data

The canonical source file distinguishes:

- `ACTIVE_CURRENT_MENU`
- `FUTURE_SCHEMA_CAPABILITY`
- `HISTORICAL_REFERENCE`
- `REQUIRES_OWNER_CONFIRMATION`

Only `ACTIVE_CURRENT_MENU` may be used to build purchasable current-menu data.

## 10. Transcription Notes from the Approved Image

This contract summarizes the visible owner-approved menu as captured in the current image.

### Active current categories and visible items

- A WINGS
  - A1 BONE-IN COMBO
  - A2 BONELESS COMBO
  - A3 FLAVOR BOX
  - A4 WINGS
  - A5 BONELESS WINGS

- B BURGERS
  - B1 SINGLE
  - B2 DOUBLE
  - B3 WESTERN BBQ
  - B4 SAUCE BOSS

- C SIDES
  - C1 FRIED CORN
  - C2 CAJUN FRIES
  - C3 ONION RINGS
  - C4 GARLIC FRIES
  - C5 SIDES SAMPLER

- S SAUCES
  - S1 FIRE STORM
  - S2 JERK
  - S3 BUFFALO
  - S4 TEXAS BBQ
  - S5 KOREAN
  - S6 HONEY TERIYAKI
  - S7 SPICY PEANUT

- R DRY RUB
  - R1 CAJUN
  - R2 MIDNIGHT RUB
  - R3 BUFFALO DUST
  - R4 KAMPOT PEPPER HOT HONEY
  - R5 LEMON PEPPER
  - R6 GARLIC PARM

- D DRIZZLES
  - D1 RANCH
  - D2 FIREBACK
  - D3 HOT HONEY
  - D4 ALL 3

- Sides / add-ons / drinks / dips visible in the extras panel
  - C1 DEEP FRIED CORN
  - C2 CAJUN FRIES
  - C3 ONION RINGS
  - C4 GARLIC FRIES
  - Drinks priced at +$1.25 with visible examples: Coke, Pepsi, Sting, Sprite, Schweppes
  - Dips priced at +$0.75 with visible examples: Ranch, Fireback, Ketchup, BBQ
  - Extra options visible: Triple Driz (+$1.00), Add +1 Sauce/Rub (+$1.00), Add +1 Beef Patty (+$2.25), Add +1 Cheese (+$0.75), Add +2 Wings (+$2.50), Spice Level (+$0.25), Drink (+$1.25), Carrots (+$0.75), Gloves (+$0.50)

### Ambiguous / owner-confirmation note

The image shows a bottom-right item with an icon and the label `MOST POPULAR`, but the exact transcription of one small text fragment in that promotional block is not sufficiently clear for canonical menu data. That fragment is marked `REQUIRES_OWNER_CONFIRMATION` and is not treated as active purchasable data.

## 11. Schema Validation Rules

Invariants for the canonical menu source:

- every active item has stable identity
- every purchasable variant has a valid price
- no unresolved price becomes purchasable
- no historical-only item is active
- modifier min <= max
- referenced modifier groups exist
- referenced options exist
- currency is explicit
- duplicate business / display codes are detected where uniqueness is required
- disabled / unavailable items cannot silently become purchasable
- location override cannot mutate canonical base data without explicit override semantics

Validators are not implemented in this task.

## 12. Server-Authoritative Pricing Handoff

`menu.current.json` must later support authoritative totals using:

- `menu.current.json`
- canonical modifier selections
- future explicit price rules

The client may display prices.

The client must not be trusted as price authority.

## 13. Localization Model

Preserve support for:

- English
- Khmer
- Chinese
- Korean
- Japanese
- Russian
- future languages

The image-visible source text is canonical. English or image-visible text must not be silently machine-translated during canonicalization.

Localized fields are extension points; they need not all appear in `menu.current.json` today.

## 14. Availability / Inventory Boundary

Catalog definition is separate from runtime inventory availability.

- Menu data may define whether an item is generally enabled.
- Runtime stock status belongs to inventory / availability logic.
- Current stock quantities do not belong in the menu.
- Location-specific availability is preserved as an extension point.

## 15. Business OS Cross-Industry Check

The universal catalog model can support:

- restaurant menu
- retail products
- salon / service offerings
- gym / service packages
- professional-service offerings

Optional catalog capabilities keep restaurant modifier logic from being forced onto every industry.

## 16. Migration / Reconciliation Pressures

Recovered implementation assumptions and how to treat them:

| Existing assumption | Pressure | Classification |
|---|---|---|
| old menu JSON files | historical source divergence | SUPERSEDE |
| placeholder prices | unsafe for canonical current menu | MIGRATE |
| historical flavor data | not active current menu authority | SUPERSEDE |
| current Mini App structures | useful UI donor only | ADAPT |
| FINAL_BOT menu schema | useful schema donor only | ADAPT |
| heat_cap mismatch | schema mismatch between historical and current menu concepts | INVESTIGATE |
| hard-coded pricing | violates server-authoritative pricing | MIGRATE |
| client-computed totals | not price authority | SUPERSEDE |
| legacy field-name mismatches | naming reconciliation required | INVESTIGATE |

## 17. Owner-Confirmation Gate

The current approved image is readable enough to canonicalize the active menu items and prices visible in the image.

If future review discovers a currently transcribed field is ambiguous, that field must be moved to `REQUIRES_OWNER_CONFIRMATION` and excluded from purchasable data until confirmed.

## 18. Current Menu JSON Requirements

`authoritative-sources/menu.current.json` must contain only current approved customer-ordering information derived from the authoritative image.

Required metadata:

- `schema_version`
- `authority_status`
- `source_artifact`
- `source_date`
- `currency`
- catalog / business scope semantics
- categories / items

It must be deterministic, readable, and suitable to become the sole input for Mini App menu UI, server pricing, cart validation, receipts, and staff tickets after later implementation/reconciliation.

## 19. Contract Acceptance Scenarios

### A. Wing Boss current menu renders from menu.current.json
- Status: SUPPORTED

### B. Server can later calculate prices without trusting the client
- Status: SUPPORTED

### C. Historical 70-flavor data cannot leak into the active menu
- Status: SUPPORTED

### D. A location may later mark an item unavailable
- Status: SUPPORTED WITH FUTURE EXTENSION

### E. Wing Boss adds a second location with optional local availability overrides
- Status: SUPPORTED WITH FUTURE EXTENSION

### F. Another restaurant tenant uses a different menu
- Status: SUPPORTED WITH FUTURE EXTENSION

### G. A retail business uses products/variants without restaurant flavor logic
- Status: SUPPORTED WITH FUTURE EXTENSION

### H. A service business uses catalog/service offerings without physical inventory
- Status: SUPPORTED WITH FUTURE EXTENSION

### I. A current price is unreadable in the source image
- Status: SUPPORTED

### J. An old repo contains a conflicting price
- Status: SUPPORTED

### K. A future translation is added without changing canonical pricing identity
- Status: SUPPORTED

## 20. Final Notes

This contract defines the current menu and the universal catalog core, not the whole commerce platform.

It is intentionally minimal and future-safe.
