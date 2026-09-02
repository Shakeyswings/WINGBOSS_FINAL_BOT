# Sweet Lab Implementation

## Summary
- Added Sweet Lab stage, fryer, and finisher helpers in `src/domain/wingboss.ts`.
- Added governed current-menu Sweet Lab products and topping pricing.
- Added a browseable Sweet Lab preview path in `src/flows/architecture.flow.ts`.
- Wired `🍰 Sweet Lab` into the main browse menu.

## Current status
- Savory and dessert fryer identities are distinct.
- Sweet Lab current products are priced at 595 minor units each.
- The topping pool is governed and includes two toppings before the 75-minor-unit add-on charge applies.

## Notes
- Dessert oil isolation is enforced as a validation rule.
- No speculative dessert recipe details were introduced.
