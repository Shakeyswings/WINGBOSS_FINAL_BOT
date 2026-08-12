# PLATFORM IDENTITY & CONTEXT CONTRACT

Status: PHASE 2 DESIGN
Applies to: Wing Boss Tenant #001 and future modular subscription AI Business Operating System tenants
Last updated: 2026-08-12

This document defines the minimum canonical identity/context foundation for the platform. It is a design contract only. It does not implement authentication, subscription billing, or full permission management.

## 1. Purpose

The platform needs a stable identity core that supports Wing Boss now and future multi-tenant, multi-location, multi-industry expansion later.

This contract must:

- let Wing Boss operate as Tenant #001
- preserve future businesses, locations, franchises, and industries
- keep Telegram and other channels as adapters, not the business domain
- separate identity, permissions, entitlements, and feature flags
- avoid duplicating tenant/business/location fields everywhere unnecessarily

## 2. Core Identity Hierarchy

### Ownership model

- A **Tenant** owns one or more **Businesses**.
- A **Business** owns one or more **Locations**.
- A **Location** belongs to exactly one **Business**.
- A **Location** does not belong to more than one business.
- A **Tenant** may own multiple businesses.
- A **Business** may have multiple locations.
- Business configuration lives at the **business** level by default.
- Location-specific overrides live at the **location** level.
- Tenant-level settings cover platform/account/subscription boundary concerns.

### Reference rules

- Orders should reference the business they belong to, and the location when location-specific fulfillment or inventory is involved.
- Inventory should reference the location that actually holds stock, with business-level templates or policies above it.
- Employees should reference the business membership and any location scope they are assigned to.
- Menu/catalog configuration should reference the business, with optional location overrides.

## 3. Actor and Execution Principal Model

The universal human identity is **Actor**.

The universal execution source for an operation is **ExecutionPrincipal**.

This is the smallest design-level concept that prevents domain operations from falsely requiring a human Actor while preserving auditability.

### Separation rules

- Authentication/channel identity is not the same as domain identity.
- Telegram user ID is an external identity mapping, not the universal platform primary key.
- External provider identity alone is not trusted authority.
- The same person may be both a customer and an employee.
- The same person may hold multiple memberships across multiple businesses.

### Execution principal rules

- Human-initiated actions use a human principal and remain attributable to `actor_id`.
- Trusted non-human actions use a system, integration, scheduled-job, or AI principal and remain attributable to a source reference.
- Non-human execution sources may be auditable without gaining human permissions.
- This contract does not implement service accounts or authentication.

### External identity mapping

External provider identities are mapped through an adapter-backed relationship such as:

- Telegram
- future web login
- future POS identity
- future delivery provider identity
- future payment provider identity

## 4. Tenant Context

`TenantContext` is the minimum trusted application/domain context used to resolve business operations.

It should provide the minimal identifiers required for operations such as menu loading, order creation, pricing, permission checks, inventory reads, employee events, analytics events, scheduled jobs, integrations, and authorized AI workflows.

### Required context fields

- `tenant_id`
- `business_id`
- `execution_principal`
- `channel_context` or equivalent external-source metadata

### Conditional context fields

- `execution_principal.actor_id` when the principal is human
- `location_id` when the operation is location-scoped
- `customer_id` when the operation is customer-scoped
- `employee_id` when the operation is employee-scoped

### Context ownership rules

- `TenantContext` is resolved and validated at trusted application boundaries.
- Domain logic should receive only the minimum context it needs.
- Do not duplicate tenant/business/location IDs into every entity unless the entity is actually scoped that way.
- Non-human execution sources may enter the context only through trusted application boundaries and never via external provider identity alone.

## 5. Roles and Permissions

Minimum universal relationship:

`Actor -> Membership -> Role -> Permission`

### Definitions

- **Actor**: canonical person identity.
- **Membership**: the actor's relationship to a business, optionally scoped to one or more locations, and the canonical source of business membership, role assignment, permission derivation, and location access scope.
- **Role**: a named bundle of permissions.
- **Permission**: an action-oriented capability such as `order.accept`.

### Example roles

Examples only, not hard-coded universal roles:

- OWNER
- MANAGER
- STAFF
- CUSTOMER

### Example permissions

- `order.accept`
- `order.start_cooking`
- `order.mark_ready`
- `payment.verify`
- `inventory.adjust`
- `staff.manage`
- `training.manage`
- `analytics.view`
- `business.configure`

### Permission rules

- Permissions are capability/action oriented.
- Roles aggregate permissions.
- Membership grants a role within a business and possibly a location scope.
- Employee is a staff-domain profile, not a second authorization system.
- Employee must not independently grant business authority, role assignment, or location authority.
- A person may have multiple memberships and/or multiple roles.

## 6. Modules, Entitlements, and Feature Flags

These concepts are separate.

### Entitlement

Entitlement answers: "Does this business have access to this capability?"

### Permission

Permission answers: "May this actor perform this action?"

### Feature flag

Feature flag answers: "Is this capability operationally enabled/configured right now?"

### Module

A module is a coherent capability family exposed by the platform.

### Feature

A feature is a concrete capability or sub-capability inside a module.

### Subscription / plan relationship

- Plan -> entitlement -> module / feature availability.
- Billing may ship later, but the entitlement contract belongs in the core now.
- Entitlements do not grant actor permissions by themselves.
- Permissions do not create entitlements.
- Feature flags do not bypass authorization.

## 7. Feature-Flag Scope

Feature flags may exist at these scopes:

- platform
- tenant
- business
- location

### Precedence direction

For ordinary configuration inheritance, narrower scope may override broader scope when intentionally configured:

`location -> business -> tenant -> platform default`

Platform-level safety restrictions are authoritative and must not be bypassed by narrower scopes.

This is a precedence direction only; no feature-flag service is defined here.

## 8. Canonical Identifier Direction

Use opaque domain identifiers for all canonical IDs.

Do not prescribe UUID vs ULID vs database integer in this contract.

### Proposed opaque identifiers

- `tenant_id`
- `business_id`
- `location_id`
- `actor_id`
- `customer_id`
- `employee_id`
- `membership_id`
- `role_id`
- `permission_id`
- `module_id`
- `feature_id`
- `entitlement_id`

External provider IDs remain external mappings.

## 9. Design-Level Schemas

These are documentation schemas only.

```ts
type OpaqueId = string;

type ExternalProvider =
  | "telegram"
  | "web"
  | "pos"
  | "payment_provider"
  | "delivery_provider"
  | "other";

type Tenant = {
  tenant_id: OpaqueId;
  name: string;
  status: "active" | "suspended" | "closed";
  created_at: string;
  updated_at?: string;
  default_locale?: string;
  timezone?: string;
  notes?: string;
};

type Business = {
  business_id: OpaqueId;
  tenant_id: OpaqueId;
  name: string;
  business_type?: string;
  status: "active" | "inactive";
  default_locale?: string;
  default_currency?: string;
  config?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

type Location = {
  location_id: OpaqueId;
  business_id: OpaqueId;
  name: string;
  status: "active" | "inactive";
  address?: string;
  geo?: { lat: number; lon: number };
  overrides?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

type Actor = {
  actor_id: OpaqueId;
  display_name?: string;
  status: "active" | "disabled";
  created_at: string;
  updated_at?: string;
};

type ExecutionPrincipal = {
  principal_type: "actor" | "system" | "integration" | "scheduled_job" | "ai";
  actor_id?: OpaqueId;
  source_ref?: string;
  external_identity_id?: OpaqueId;
  display_label?: string;
};

type ExternalIdentity = {
  external_identity_id: OpaqueId;
  actor_id: OpaqueId;
  provider: ExternalProvider;
  external_user_id: string;
  business_id?: OpaqueId;
  location_id?: OpaqueId;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type Customer = {
  customer_id: OpaqueId;
  actor_id?: OpaqueId;
  tenant_id: OpaqueId;
  display_name?: string;
  preferred_language?: "km" | "en";
  status: "active" | "inactive";
  created_at: string;
  updated_at?: string;
};

type BusinessCustomerProfile = {
  business_customer_profile_id: OpaqueId;
  customer_id: OpaqueId;
  business_id: OpaqueId;
  location_scope?: OpaqueId[];
  status: "active" | "inactive";
  preferences?: Record<string, unknown>;
  marketing_consent?: "unknown" | "granted" | "revoked";
  rewards_account_id?: OpaqueId;
  created_at: string;
  updated_at?: string;
};

type Employee = {
  employee_id: OpaqueId;
  actor_id?: OpaqueId;
  tenant_id: OpaqueId;
  business_id: OpaqueId;
  status: "active" | "inactive";
  job_title?: string;
  home_location_id?: OpaqueId;
  created_at: string;
  updated_at?: string;
};

type Membership = {
  membership_id: OpaqueId;
  actor_id: OpaqueId;
  tenant_id: OpaqueId;
  business_id: OpaqueId;
  role_ids: OpaqueId[];
  location_scope?: OpaqueId[];
  status: "active" | "inactive" | "pending";
  created_at: string;
  updated_at?: string;
};

type Role = {
  role_id: OpaqueId;
  business_id?: OpaqueId;
  code: string;
  name: string;
  permission_ids: OpaqueId[];
  created_at: string;
};

type Permission = {
  permission_id: OpaqueId;
  code: string;
  description?: string;
  created_at?: string;
};

type Module = {
  module_id: OpaqueId;
  code: string;
  name: string;
  family?: string;
  description?: string;
  created_at?: string;
};

type Feature = {
  feature_id: OpaqueId;
  module_id: OpaqueId;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
};

type Entitlement = {
  entitlement_id: OpaqueId;
  tenant_id: OpaqueId;
  business_id: OpaqueId;
  module_id: OpaqueId;
  feature_id?: OpaqueId;
  status: "active" | "inactive";
  source?: "plan" | "manual" | "promotion";
  effective_from?: string;
  effective_to?: string;
};

type FeatureFlag = {
  feature_flag_id: OpaqueId;
  key: string;
  scope: "platform" | "tenant" | "business" | "location";
  scope_id?: OpaqueId;
  enabled: boolean;
  config?: Record<string, unknown>;
  created_at?: string;
};

type TenantContext = {
  tenant_id: OpaqueId;
  business_id: OpaqueId;
  location_id?: OpaqueId;
  execution_principal: ExecutionPrincipal;
  customer_id?: OpaqueId;
  employee_id?: OpaqueId;
  channel: string;
  channel_identity?: string;
  locale?: string;
  timezone?: string;
};
```

## 10. Ownership Matrix

| Resource | Tenant | Business | Location | Actor | Notes |
|---|---|---|---|---|---|
| catalog/menu | Business | Yes | Optional overrides | No | Business owns catalog; location may override availability/pricing |
| order | Business | Yes | Yes when location-specific | Yes | Order should point to business and often location |
| payment | Business | Yes | Optional | Yes | Payment belongs to business order context |
| fulfillment | Business | Yes | Yes | Yes | Delivery/pickup execution is location-aware |
| inventory | Business | Yes | Yes | No | Stock is usually location-scoped |
| employee | Business | Yes | Optional assignment | Yes | Employee identity is actor-linked, business-scoped |
| customer identity | Tenant | No | No | Yes | Canonical human customer identity shared across businesses |
| business customer profile | Business | Yes | Optional | Yes | Business-specific history, preferences, rewards, and consent |
| SOP | Tenant or Business | Usually business | Optional | No | Core knowledge may be shared, but business overrides are common |
| training | Business | Yes | Optional | Yes | Training is actor-facing and often business-scoped |
| promotion | Business | Yes | Optional | No | Promotions are usually business and location aware |
| supplier | Tenant or Business | Usually business | Optional | No | Procurement can be shared or localized |
| purchase order | Business | Yes | Optional | Yes | Purchasing is business-scoped |
| analytics event | Tenant | Yes | Yes | Yes | Events should carry scope context without excess duplication |
| reward account | Business | Yes | Optional | Yes | Customer reward balances are usually business-scoped |
| integration configuration | Tenant or Business | Depends | Optional | No | Provider config may be tenant-wide or business-specific |
| membership | Business | Yes | Optional | Yes | Sole source of business authority, role assignment, and location access scope |
| role | Business | Yes | Optional | Yes | Role definitions may be tenant-shared or business-specific |
| permission | Tenant | No | No | Yes | Permission catalog is universal; authorization comes via membership |

## 11. Wing Boss Tenant #001 Mapping

Conceptually:

- Tenant: Wing Boss ownership / subscription / platform account boundary
- Business: Wing Boss restaurant business
- Location: current operating location for the launch slice
- Channel: Telegram Mini App and Telegram bot

No seed data is created here.

No universal schema is hard-coded to these names.

## 12. Migration / Reconciliation Analysis

Recovered implementation pressures and how to treat them:

| Existing assumption | Pressure | Classification |
|---|---|---|
| Telegram user ID used as user identity | External provider identity leaked into domain identity | MIGRATE |
| Human actor assumed for all operations | Scheduled jobs, integrations, and AI workflows need non-human attribution | ADAPT |
| Single-business assumptions | Future platform needs many businesses | SUPERSEDE |
| Missing tenant / business / location references | Core identity not yet explicit | INVESTIGATE |
| Restaurant-specific roles | Core role model too narrow | ADAPT |
| Single-location storage | Future multi-location / franchise needs hierarchy | MIGRATE |
| Provider-specific coupling | Portability risk | SUPERSEDE |
| Business-specific customer relationship collapsed into global customer identity | Cross-business customer isolation would blur history/preferences/rewards | ADAPT |
| Employee independently controlling authorization | Membership must be sole authority for access control | SUPERSEDE |
| Location flag overriding platform safety restriction | Safety controls must remain authoritative | SUPERSEDE |

Notable recovered code assumptions:

- `WINGBOSS_FINAL_BOT` and `wingboss-direct` both use Telegram/user-linked identity in ways that are useful for current behavior but not universal core authority.
- `WINGBOSS_FINAL_BOT` stores `user_id` and `order_id` without verified tenant/business/location identifiers.
- `wingboss-direct` stores customer state in localStorage and backend JSON keyed primarily by Telegram/user identity.
- Roles and authorization are present but currently tied to owner/staff operational needs rather than a canonical cross-industry RBAC core.

## 13. Security Invariants

- No cross-tenant data access.
- Business / location access must respect membership and permissions.
- External provider identity must not grant domain authority by itself.
- Entitlement does not grant actor permission.
- Permission does not create subscription entitlement.
- Feature flag does not bypass authorization.
- Tenant context must be resolved / validated at trusted application boundaries.
- Sensitive administrative actions must be auditable.
- Secrets never belong in these domain entities.

## 14. Non-Goals

This task does not implement:

- authentication
- subscription billing
- payment billing providers
- full franchise management
- full user-management UI
- full permission catalog
- database migrations
- Prisma schema
- Supabase schema
- Telegram changes
- production code

## 15. Contract Acceptance Test

### Scenario A: Wing Boss operates one restaurant/location today
- Status: SUPPORTED

### Scenario B: Wing Boss opens a second location
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario C: One owner operates two different businesses
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario D: A manager may manage only one location
- Status: SUPPORTED

### Scenario E: An employee works at two locations
- Status: SUPPORTED

### Scenario F: A customer orders from multiple businesses on the future platform
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario G: A business subscribes to Inventory but not Staff Academy
- Status: SUPPORTED

### Scenario H: Staff Academy is entitled for the business, but a cashier lacks permission to manage training
- Status: SUPPORTED

### Scenario I: A future non-restaurant business uses the same identity / permission core
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario J: Telegram is replaced or supplemented by a web / mobile / POS channel
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario K: A scheduled inventory forecasting process executes without a human Actor
- Status: SUPPORTED

### Scenario L: An authorized AI workflow creates a recommendation that remains attributable to its execution source and does not gain human permissions automatically
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario M: One customer uses the future platform with two unrelated businesses while business-specific rewards/preferences remain isolated
- Status: SUPPORTED WITH FUTURE EXTENSION

### Scenario N: One employee works at two locations with one canonical authorization path
- Status: SUPPORTED

### Scenario O: A platform safety restriction disables a capability and a location-level flag cannot bypass that restriction
- Status: SUPPORTED

Any future-extension result is intentional and acceptable for Phase 2.

## 16. Anti-Overengineering Check

Removed as unjustified complexity:

- no subscription price table
- no authentication implementation
- no exhaustive permission catalog
- no full CRM
- no full employee HR model
- no franchise workflow implementation
- no database migration design
- no provider-specific integration implementation

Kept because it is required by launch, future multi-tenant isolation, provider portability, or module entitlements:

- tenant / business / location hierarchy
- actor / external identity separation
- membership / role / permission model
- module / entitlement / feature-flag separation
- opaque identifiers
- tenant context

## 17. Final Notes

This contract is intentionally minimal.

It is sufficient to begin Phase 2 canonical contract design without collapsing future Business OS expansion into Wing Boss-specific assumptions.
