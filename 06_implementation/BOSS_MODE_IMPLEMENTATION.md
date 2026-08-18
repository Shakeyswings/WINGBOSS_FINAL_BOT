# Boss Mode Implementation

## Summary
- Added a shared `src/domain/wingboss.ts` module for Boss Mode stage order, heat mapping, D4 validation, curated build fixtures, and kitchen validation helpers.
- Approved heat ladder is `mild`, `hot`, `spicy`, `extreme`, `revenge`, `nuclear` with `nuclear` priced at 125 minor units.
- Added a browseable `BOSS MODE` preview path in `src/flows/architecture.flow.ts`.
- Wired `⚡ Boss Mode` into the main browse menu.

## Current status
- Boss Mode price remains `null / NEEDS_COST_INPUT`.
- Curated builds exist only as non-production fixtures.
- Customer-selectable ordering stays blocked until kitchen validation and cost approval exist.

## Notes
- Ordered recipe semantics and progressive disclosure are represented in preview form.
- No production price was created.
