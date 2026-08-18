# Wing⚡Boss Boss Mode + Sweet Lab Implementation Plan

## Audit
- Runtime: Node.js + TypeScript
- Bot stack: Telegraf long-polling Telegram bot
- Package manager: npm
- Database: local JSON repos with optional Prisma DB path
- State management: Telegraf session middleware
- Menu/catalog: `authoritative-sources/menu.current.json` plus legacy shims
- Tests: Vitest
- Build: `tsc -p tsconfig.json`
- Lint: not configured

## Implementation
1. Add a small domain module for Boss Mode and Sweet Lab rules.
2. Add ordered recipe-state validation, D4 bundle validation, heat mapping, and fryer isolation checks.
3. Expose Boss Mode and Sweet Lab as browseable preview sections without inventing production prices.
4. Keep curated Boss builds non-production until kitchen validation exists.
5. Add unit tests for the approved invariants.

## Verification
- `npm run build`
- `npm test`
