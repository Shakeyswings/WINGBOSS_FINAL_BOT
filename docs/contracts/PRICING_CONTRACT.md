# PRICING CONTRACT

Status: PHASE 2 DESIGN
Applies to: Wing Boss current customer ordering only
Last updated: 2026-08-12

This document defines the canonical pricing authority and deterministic pricing model for the current menu. It is a design contract only.

## 1. Purpose

The pricing contract must:

- make the backend/domain the sole pricing authority
- keep the Mini App as a display and capture surface only
- calculate totals deterministically from approved menu data and explicit business rules
- prevent customer-submitted totals from becoming authoritative
- preserve future support for discounts, fees, taxes, and multi-location overrides only when explicitly approved

## 2. Pricing Authority

Canonical pricing authority is the server/domain layer.

Allowed inputs:

- `authoritative-sources/menu.current.json`
- canonical quantity selections
- canonical modifier selections
- explicit future pricing rules when owner-approved

Not authoritative:

- client-calculated totals
- customer-submitted totals
- Telegram payload totals
- historical menu pricing
- historical flavor-vault pricing assumptions

## 3. Money Representation

All money values must use exact minor-unit integers.

Canonical representation:

- `currency`: `USD`
- `amount_minor`: integer

Rules:

- no float pricing authority
- no rounding-by-client authority
- no implied currency conversion
- no hidden precision loss

Canonical money examples:

- `$0.25 = 25`
- `$0.50 = 50`
- `$0.75 = 75`
- `$1.00 = 100`

## 4. Pricing Scope

Pricing is defined at the business level by default and may later support location overrides.

Base product and variant prices are resolved from `authoritative-sources/menu.current.json`. The pricing engine may not invent an independent price table.

Pricing may vary by:

- item
- variant
- modifier option
- quantity
- pricing context
- explicit location override

Pricing does not currently define:

- promotions
- discounts
- tax policy
- delivery fees
- service fees
- tips

Those topics require separate owner-approved contracts before they become active pricing inputs.

## 5. Deterministic Calculation Rules

The canonical calculation pipeline is:

1. Resolve the active menu item or modifier from canonical menu data.
2. Apply quantity.
3. Resolve the selected variant.
4. Apply selected modifier option prices in their active pricing context.
5. Apply any quantity-scaled modifier rules.
6. Apply any explicit owner-approved pricing rule.
7. Sum all minor-unit values.
8. Emit authoritative line totals and order totals.

Rules:

- The same input must always produce the same result.
- The backend must be able to recalculate totals from first principles.
- No unchecked client total may replace a server-calculated total.
- Unknown or unresolved price data must block authoritative purchase totals until confirmed.

## 6. Validation Invariants

Pricing validation must enforce:

- every purchasable line has a known price source
- every selected modifier with a charge has a known price source
- no unresolved price can be included as authoritative
- subtotal, fees, and total are internally consistent
- quantities are positive integers
- currency is explicit and consistent
- location overrides, when present, are applied deterministically

## 7. Menu Relationship

`menu.current.json` is the canonical current-menu source.

Pricing must not invent items or modifiers not present in canonical menu data.

Pricing may reference:

- item base price
- modifier option price
- variant price
- included vs paid modifiers

### Contextual modifier pricing

The same canonical option may price differently depending on context.

- Dry rub as primary wing flavor is included at `$0.00`.
- Dry rub as a general add-on is `+$0.50`.
- Dusted Rub is `+$0.50 per 6 applicable wings` and requires a dry-rub wing context.
- Drizzle as normal add-on use is `+$0.50`.
- Drizzle in the C1 included finish context is `$0.00`.
- Dip as normal add-on use is `+$0.75`.
- Dip in the C1 included finish context is `$0.00`.
- Sauce on the Side is `30 ml` at `+$1.00` and excludes Fire Storm only for that operation.
- The A3 Boneless upgrade is `+$1.50` as an upgrade modifier, not a standalone variant.
- C1 includes one dry rub and one free drizzle-or-dip within its base price.
- Primary wing flavor choices from S1-S7 and R1-R6 are included at `$0.00` in the primary flavor context.
- ADD +1 WING FLAVOR is `+$1.00` when `wing_quantity >= 20` and adds one additional flavor selection with no generic portion split.

Pricing may not:

- promote historical-only values into current authority
- infer missing prices from legacy repositories
- silently substitute client display values for canonical values

## 8. Future Extensions

This contract intentionally leaves room for later approved additions:

- discount rules
- promotions
- coupons
- tax handling
- delivery fees
- service fees
- location-specific price overrides
- subscription-based pricing rules for future tenants

Those extensions must be introduced as explicit rules, not as hidden behavior.

## 9. Acceptance Scenarios

### A. Mini App shows estimated prices before checkout
- Status: SUPPORTED

### B. Backend recalculates totals from canonical menu data
- Status: REQUIRED

### C. Customer submits a modified total
- Status: REJECTED AS AUTHORITATIVE

### D. A historical repo contains a different price
- Status: REJECTED AS AUTHORITY

### E. A location override changes one item price later
- Status: SUPPORTED WITH FUTURE EXTENSION

### F. A future discount engine is added later
- Status: SUPPORTED WITH FUTURE EXTENSION

### G. A3 Boneless upgrade is selected
- Status: SUPPORTED

### H. C1 included dry rub and included finish are selected
- Status: SUPPORTED

### I. Dusted Rub is applied to rub wings
- Status: SUPPORTED

### J. Side sauce is requested
- Status: SUPPORTED

## 10. Current Recovery Disposition

This contract establishes the pricing boundary for later implementation and reconciliation.

It does not implement pricing code.
