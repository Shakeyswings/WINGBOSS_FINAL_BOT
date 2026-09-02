# Boss Mode Implementation

## Summary
- Added a shared `src/domain/wingboss.ts` module for Boss Mode stage order, heat mapping, D4 validation, curated build fixtures, and kitchen validation helpers.
- Approved heat ladder is `mild`, `hot`, `spicy`, `extreme`, `revenge`, `nuclear` with `nuclear` priced at 125 minor units.
- Approved Boss Mode quantity surcharges are now governed as 6/12/20/36 tier pricing from the current menu source.
- Fire Storm boss-finish pricing now includes the explicit approved 20-wing charge.
- Added a browseable `BOSS MODE` preview path in `src/flows/architecture.flow.ts`.
- Wired `⚡ Boss Mode` into the main browse menu.

## Current status
- Boss Mode selling tiers are approved; cost inputs remain separate for profitability analysis.
- Fire Storm 20-wing selling charge is approved at 415 minor units.
- Curated builds exist only as non-production fixtures.
- Customer-selectable ordering stays blocked until validated path records exist.

## Notes
- Ordered recipe semantics and progressive disclosure are represented in preview form.
- No speculative base pricing was introduced outside the governed current menu.
