# ORDER LIFECYCLE CONTRACT

Status: PHASE 2 DESIGN
Applies to: Wing Boss current customer ordering and fulfillment
Last updated: 2026-08-12

This document defines the canonical order, checkout, payment, and fulfillment lifecycle for Wing Boss. Telegram is a channel adapter only; it is not the order-domain authority.

## 1. Purpose

This contract must:

- define one canonical order lifecycle for the Wing Boss launch path
- separate order state, payment state, payment-proof state, and fulfillment state
- preserve payment-before-cooking enforcement
- support both delivery and pickup without collapsing them into one path
- reconcile historical order-state models through adapter mapping rather than blind copying
- preserve auditability, idempotency, concurrency safety, rewards compatibility, and multi-tenant boundaries

## 2. Order Domain Boundary

Order is a business-domain aggregate scoped to trusted resolved context:

- `tenant_id`
- `business_id`
- `location_id`

Order may reference:

- `order_id`
- optional `order_number`
- `customer_id`
- `actor_id` or execution principal reference
- `fulfillment_method`
- `order_status`
- `payment_status`
- `payment_proof_status`
- `fulfillment_status`
- pricing snapshot reference
- line items
- status history

External channel identifiers such as Telegram chat IDs, message IDs, callback IDs, and proof-message IDs are integration metadata only. They must never become canonical order identity or authorization authority.

## 3. Order Identity

Canonical identity:

- `order_id` is the stable internal identifier.

Optional human-facing identity:

- `order_number` may be used where useful for support or staff workflow.

Not canonical identity:

- Telegram message ID
- Telegram user ID
- payment-proof message ID
- customer-entered reference

## 4. Order Creation

An order may only be created from:

- canonical current menu selections
- canonical pricing result
- trusted tenant/business/location context
- validated fulfillment selection

The order must preserve the authoritative pricing snapshot produced under the pricing contract. Client-calculated totals are not authority.

Recommended creation boundary:

- cart/draft may exist during browsing
- canonical order creation occurs when validated checkout is submitted and pricing is locked

## 5. Canonical State Model

Use separate but related lifecycle concepts rather than one overloaded enum.

### 5.1 Order status

Canonical order status values:

- `DRAFT`
- `CHECKOUT_PENDING`
- `AWAITING_PAYMENT`
- `PAYMENT_SUBMITTED`
- `PAYMENT_VERIFIED`
- `SENT_TO_STAFF`
- `ACCEPTED`
- `COOKING`
- `READY`
- `OUT_FOR_DELIVERY`
- `READY_FOR_PICKUP`
- `DELIVERED`
- `PICKED_UP`
- `COMPLETED`
- `CANCELLED`
- `ISSUE` (non-terminal, optional extension point)

### 5.2 Payment status

Canonical payment status values:

- `NOT_REQUIRED`
- `AWAITING_PAYMENT`
- `PAYMENT_PENDING_VERIFICATION`
- `VERIFIED`
- `FAILED`
- `REFUNDED` (payment/refund extension, not a normal order lifecycle substitute)

### 5.3 Payment proof status

Canonical proof status values:

- `NONE`
- `SUBMITTED`
- `REJECTED`

### 5.4 Fulfillment status

Canonical fulfillment status values:

- `NONE`
- `DELIVERY_PENDING`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `PICKUP_PENDING`
- `READY_FOR_PICKUP`
- `PICKED_UP`

### 5.5 Authority relationships

- `PaymentStatus` is the authoritative source of payment truth.
- `PaymentProofStatus` is the authoritative source of proof / evidence state.
- `FulfillmentStatus` is the authoritative source of physical fulfillment state.
- `OrderStatus` coordinates workflow only.
- If `PAYMENT_SUBMITTED` or `PAYMENT_VERIFIED` appear in `OrderStatus`, they are workflow / projection states derived from authoritative payment-domain state.
- `OrderStatus.PAYMENT_VERIFIED` does not by itself establish payment truth and does not bypass `payment_status == VERIFIED` checks.
- `OrderStatus` must never override or contradict `PaymentStatus`.
- Authoritative payment verification requires `payment_status == VERIFIED`.

## 6. Historical State Reconciliation

Historical states are adapter inputs, not canonical authority.

### WINGBOSS_FINAL_BOT mapping

- `DRAFT` -> `DRAFT`
- `AWAITING_PAYMENT` -> `AWAITING_PAYMENT`
- `PAID` -> `PAYMENT_SUBMITTED` when only proof exists; `PAYMENT_VERIFIED` only when a verified payment record exists
- `SENT_TO_STAFF` -> `SENT_TO_STAFF`
- `ACCEPTED` -> `ACCEPTED`
- `COOKING` -> `COOKING`
- `READY` -> `READY`
- `BOOK_DRIVER` -> `DELIVERY_PENDING` or equivalent driver-booking state; it must not imply dispatch has occurred unless evidence supports it
- `DRIVER_PICKED_UP` -> `OUT_FOR_DELIVERY` or equivalent driver-collected / dispatch-in-progress state; it must not map directly to `DELIVERED`
- `DELIVERED` -> `DELIVERED`
- `REJECTED` -> `CANCELLED` or `ISSUE` depending on whether the order is terminally declined or needs correction

### wingboss-direct mapping

- `submitted` -> `CHECKOUT_PENDING` or `AWAITING_PAYMENT` depending on whether proof is required next
- `staff_review` -> `SENT_TO_STAFF`
- `confirmed_paid` -> `PAYMENT_VERIFIED`
- `need_info` -> `ISSUE`
- `cooking` -> `COOKING`
- `ready` -> `READY`
- `cancelled` -> `CANCELLED`
- `refunded` -> payment/refund extension only; not a normal canonical order-state substitute

## 7. Payment Proof vs Payment Verification

Non-negotiable rule:

- `PAYMENT_PROOF_SUBMITTED` does not equal `PAYMENT_VERIFIED`

Submitting an image, screenshot, bank proof, receipt, or transfer evidence must not automatically mark the payment as verified or paid.

Proof submission means evidence exists.
Verification means an authorized human or approved deterministic policy has accepted the payment.

UI text such as "PAID" must never bypass verification.

## 8. Payment-Before-Cooking Rule

Cooking cannot begin before required payment verification.

The transition to `COOKING` must fail if:

- payment verification is required
- and `payment_status != VERIFIED`

Telegram buttons, staff messages, proof submission, and AI interpretation may not bypass this invariant.

## 9. Staff Acceptance

Authorized staff may accept an order once it is ready for staff processing.

Acceptance must capture:

- `actor_id` or equivalent membership authority
- timestamp
- `order_id`

Acceptance authority must come from platform membership / role / permission checks, not from Telegram callback data alone.

## 10. Staff Order Card

One staff message/card per order is preserved as a useful projection.

The card may contain controls such as:

- Accept
- Cooking / Preparing
- Ready
- Out
- Completed
- Cancel

Button availability must be derived from allowed domain transitions.

A Telegram message edit does not itself constitute a state transition. The domain command succeeds first; UI projection updates second.

## 11. Fulfillment

Fulfillment method is explicit:

- `DELIVERY`
- `PICKUP`

### 11.1 Delivery path

Canonical delivery progression:

- `READY` -> `OUT_FOR_DELIVERY` -> `DELIVERED` -> `COMPLETED`

`DELIVERED` means physical handoff reported.
`COMPLETED` means the business lifecycle is closed successfully.

### 11.2 Pickup path

Canonical pickup progression:

- `READY` -> `READY_FOR_PICKUP` -> `PICKED_UP` -> `COMPLETED`

Pickup must not be forced through delivery-driver states.

`READY` is not the same as pickup completion.

## 12. Completed

`COMPLETED` is the terminal successful business state.

Completion means:

- payment requirements are satisfied
- food has been fulfilled
- delivery or pickup handoff occurred
- the order lifecycle is successfully closed

`COMPLETED` is required for rewards, lifetime spend, analytics, employee scorecards, future inventory reconciliation, and customer history.

`DELIVERED` is not a substitute for `COMPLETED`.

## 13. Cancelled

`CANCELLED` is the terminal unsuccessful state.

Cancellation must capture:

- actor
- timestamp
- reason
- prior state

Extension points are preserved for:

- refund required
- refund status
- inventory reversal
- customer notification

Refund logic is not implemented in this contract.

Arbitrary cancellation after completion is forbidden.

## 14. Transition Matrix

Canonical domain commands and valid transitions:

- `DRAFT` -> `CHECKOUT_PENDING`
- `CHECKOUT_PENDING` -> `AWAITING_PAYMENT`
- `AWAITING_PAYMENT` -> `PAYMENT_SUBMITTED`
- `PAYMENT_SUBMITTED` -> `PAYMENT_VERIFIED`
- `PAYMENT_VERIFIED` -> `SENT_TO_STAFF`
- `SENT_TO_STAFF` -> `ACCEPTED`
- `ACCEPTED` -> `COOKING`
- `COOKING` -> `READY`
- `READY` -> `OUT_FOR_DELIVERY` when fulfillment method is `DELIVERY`
- `READY` -> `READY_FOR_PICKUP` when fulfillment method is `PICKUP`
- `OUT_FOR_DELIVERY` -> `DELIVERED`
- `READY_FOR_PICKUP` -> `PICKED_UP`
- `DELIVERED` -> `COMPLETED`
- `PICKED_UP` -> `COMPLETED`
- any non-terminal state -> `CANCELLED` if allowed by policy and current state

Illegal transitions include at minimum:

- `AWAITING_PAYMENT` -> `COOKING`
- `PAYMENT_SUBMITTED` -> `COOKING`
- `READY` -> `COOKING` unless a future explicit reopen/correction mechanism is designed
- `COMPLETED` -> `COOKING`
- `CANCELLED` -> `READY`
- `DELIVERED` -> `READY`
- `PICKED_UP` -> `OUT_FOR_DELIVERY`

## 15. Authorization Model

Order actions must use canonical platform identity authority:

`Actor -> Membership -> Role -> Permission`

Example permissions:

- `order.read`
- `order.accept`
- `order.start_cooking`
- `order.mark_ready`
- `order.dispatch`
- `order.mark_delivered`
- `order.mark_picked_up`
- `order.complete`
- `order.cancel`
- `payment.verify`

Telegram group membership or callback possession is not sufficient authorization.

## 16. Idempotency and Concurrency

Order commands must be retry-safe.

Expected idempotent commands:

- create order
- submit payment proof
- verify payment
- accept order
- start cooking
- mark ready
- dispatch
- mark delivered/picked up
- complete
- cancel

Duplicate callbacks or webhooks must not create duplicate orders or duplicate state transitions.

Optimistic concurrency or equivalent version checking is required to prevent races such as:

- one staff member cancels while another starts cooking
- one staff member completes while another dispatches

## 17. Domain Events

Canonical domain event vocabulary:

- `ORDER_CREATED`
- `PAYMENT_PROOF_SUBMITTED`
- `PAYMENT_VERIFIED`
- `ORDER_ACCEPTED`
- `COOKING_STARTED`
- `ORDER_READY`
- `ORDER_DISPATCHED`
- `ORDER_DELIVERED`
- `ORDER_PICKED_UP`
- `ORDER_COMPLETED`
- `ORDER_CANCELLED`

Each event should include:

- `event_id`
- `order_id`
- `tenant_id`
- `business_id`
- `location_id`
- `occurred_at`
- actor or execution principal reference
- relevant state transition metadata

Telegram events are not canonical domain events.

## 18. Audit Trail

Every high-impact transition should be auditable.

Preserve:

- `order_id`
- `from_state`
- `to_state`
- actor
- `occurred_at`
- reason where applicable
- source channel / integration metadata where useful
- order version

Payment verification must preserve verifier identity and timestamp.

## 19. Customer Status Projection

Customer-visible status text may differ from canonical internal states.

Example:

- internal: `PAYMENT_SUBMITTED`
- customer UI: "Payment proof received - waiting for verification"

Internal states must not be collapsed just to simplify UI.

Localization may map canonical states to English, Khmer, and future languages.

## 20. Channel Adapters

Telegram Mini App and bot may:

- submit commands
- render order status
- receive payment proof
- render staff cards
- send customer updates

But domain logic remains channel-independent.

Future channels may include web, POS, or other messaging platforms without changing the core order lifecycle.

## 21. Multi-Tenant Boundary

Every order operation must remain scoped to:

- `tenant_id`
- `business_id`
- `location_id`

Cross-tenant order access or mutation is forbidden.

All state-transition commands must validate resolved trusted context.

## 22. Rewards Boundary

Rewards and loyalty must consume reliable domain events such as `ORDER_COMPLETED`.

Rewards must not be awarded from:

- `ORDER_CREATED`
- `PAYMENT_PROOF_SUBMITTED`
- `READY`
- `DELIVERED` alone

unless a future explicit policy says otherwise.

## 23. Staff Academy / Scorecard Boundary

Staff Academy and scorecards may observe events such as:

- `PAYMENT_VERIFIED`
- `ORDER_ACCEPTED`
- `COOKING_STARTED`
- `ORDER_READY`
- `ORDER_DISPATCHED`
- `ORDER_DELIVERED`
- `ORDER_PICKED_UP`
- `ORDER_COMPLETED`
- `ISSUE_RAISED`

Scoring logic does not belong in the Order aggregate.

## 24. Inventory Boundary

Future inventory logic may consume:

- `ORDER_ACCEPTED`
- `COOKING_STARTED`
- `ORDER_COMPLETED`
- `ORDER_CANCELLED`

depending on approved inventory policy.

Inventory deduction logic is not implemented in this contract.

## 25. AI Boundary

AI may:

- summarize order issues
- recommend customer-service responses
- recommend operational actions
- classify non-authoritative notes

AI may not authoritatively decide:

- payment verification
- order total
- valid state transition
- authorization
- completion
- cancellation
- refund

unless a future explicit authorized deterministic policy exists.

## 26. Future Extension Points

Preserve extension points for:

- refunds
- partial refunds
- scheduled orders
- preorders
- multiple payment methods
- POS-originated orders
- delivery orchestration
- driver assignment
- third-party delivery
- inventory reservation
- customer issue / dispute handling
- promotions / rewards
- multi-location routing

Do not activate them in this contract.

## 27. Acceptance Scenarios

### A. Successful delivery

- checkout
- awaiting payment
- proof submitted
- verified
- accepted
- cooking
- ready
- out for delivery
- delivered
- completed

### B. Successful pickup

- checkout
- awaiting payment
- proof submitted
- verified
- accepted
- cooking
- ready
- picked up
- completed

### C. Proof submitted but not verified

- proof submitted
- attempt cooking
- rejected

### D. Duplicate Accept callback

- first Accept succeeds
- second identical retry is idempotent / no duplicate transition

### E. Delivery order tries pickup transition

- rejected

### F. Pickup order tries out-for-delivery transition

- rejected

### G. Cancelled order tries Cooking

- rejected

### H. Completed order tries state mutation

- rejected

## 28. Conflict Reconciliation

This contract explicitly reconciles:

- CR-001 payment proof vs verification
- CR-002 delivered vs completed
- CR-003 pickup lifecycle
- CR-008 conflicting order state models
- CR-009 payment confirmation vs proof verification
- CR-011 proof incorrectly promoted to PAID
- CR-012 missing COMPLETED / pickup completion

Canonical decisions:

- proof submission and payment verification are separate, and `PaymentStatus` owns payment truth
- `DELIVERED` is not `COMPLETED`
- pickup uses a first-class path without driver states
- legacy states are mapped through adapters, not copied verbatim
- payment confirmation cannot bypass verification
- `PAID` from historical code is adapter-only ambiguity, not a canonical state
- `DRIVER_PICKED_UP` is a driver-collected / dispatch-in-progress condition, not customer delivery handoff
- only actual customer handoff may transition or map to `DELIVERED`

## 29. Status Language

This task creates a contract only.

Use evidence-backed project status:

- `DESIGNED`

Do not call the order lifecycle implemented or tested merely because the contract exists.
