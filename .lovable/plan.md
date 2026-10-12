# Role-scoped UI for Org Admins

Three related bugs let an `org_admin` (without any `bouc_*` staff role) see or interact with data that should be restricted to BoucIO staff. All fixes are frontend-only and rely on the existing `useRoles` / `OrgScopeContext` plumbing.

## 1. Organizations page — restrict to the user's own org

**File:** `src/pages/Organizations.tsx`

Today the page calls `useOrganizationsApi()` unconditionally and renders the full list (KPI cards, filters, table, "New Organization" button). For an `org_admin`/`org_admin_enterprise` who is NOT also `bouc_admin`/`bouc_sre`/`bouc_engineer`, this exposes other tenants if the backend response leaks them (and the UI clearly suggests global control).

Changes:
- Read roles via `useRoles()` and compute `isBoucStaff` and `isOrgAdminOnly` (org_admin/org_admin_enterprise AND NOT bouc staff).
- Read `activeOrgId` from `useOrgScope()` (already pinned to the JWT `org_id` for org admins).
- If `isBoucStaff`: keep today's behaviour (full list + create button + KPIs + filters).
- If `isOrgAdminOnly`:
  - Hide the "New Organization" button, KPI row, status/tier filters, search, and the table.
  - Auto-open the existing detail view scoped to `activeOrgId` (call `fetchOrganization(activeOrgId)` on mount and render the same `Details` / `Members` panel inline — no dialog, no list).
  - Page header copy switches to "Your Organization" / "Manage members, billing, and SSO for {orgName}".
- If neither (defensive): render the existing `Unauthorized`-style empty state.

## 2. LLM Instructions — show only the active-org instructions

**Files:** `src/pages/LLMInstructions.tsx`, `src/lib/instructionsApi.ts`

`useInstructionsApi` already calls `GET /v1/admin/instructions` with the `X-Active-Org` header (via `adminApiClient`), so the backend should already filter by org. The remaining issues are:

- `instructions` is fetched once on hook mount; if the active org changes the page re-fetches (already wired in `LLMInstructions.tsx` via `useEffect([activeOrgId])`) — keep, but also have the hook clear state on org change to avoid showing stale generic data during the in-flight request.
- Update the page header copy to make the scope explicit:
  - For org admins: `"Instructions for {activeOrg.name}"` with a sub-line "These instructions apply only to your organization's users."
  - For BoucIO staff: keep "Global instructions applied to all users' LLM sessions." but only when the active org is one of the synthetic Bouc.io scopes; otherwise show the customer org's name.
- Add a defensive client-side filter: extend the `Instruction` interface with an optional `orgId` (mapped from `raw.org_id`) and, in the page, drop any instruction whose `orgId` is set and does not match `activeOrgId`. This guarantees no generic/global record leaks into an org admin's view even if the backend is misconfigured.

## 3. OrgSwitcher — pin org admin to their own org name (not the UUID)

**Files:** `src/context/OrgScopeContext.tsx`, `src/components/OrgSwitcher.tsx`

Today, when the user is an org admin only, `OrgScopeContext` builds the synthetic option as `{ id: jwtOrgId, name: jwtOrgId, ... }`. The UUID is then shown in the switcher badge. The dropdown is already correctly suppressed (`isPinned: true`, `canSwitch: false`), so no change is needed to the popover.

Changes:
- In `OrgScopeProvider`, when the user is an org admin (and not staff), resolve the real org name:
  - Call `GET /v1/admin/organizations/{jwtOrgId}` (already permitted for org admins by the backend) once after the JWT is available.
  - Store `{ id: jwtOrgId, name: resp.name, group: "customers" }` in `availableOrgs` and as `activeOrg`.
  - On failure, fall back to a short label like "Your Organization" rather than the UUID.
- `OrgSwitcher.tsx` requires no logic change; it will simply render the proper name in the pinned badge.

## Out of scope

- No backend changes. If the backend is not yet enforcing org scope on `/v1/admin/organizations` or `/v1/admin/instructions` for org admins, the frontend changes above make the UI safe but a follow-up backend ticket should be filed.
- No changes to `RoleProtectedRoute` / `AdminSidebar` (route guards already match the intended visibility).

## Technical notes

- Role helpers: `useRoles().hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_SRE, ROLES.BOUC_ENGINEER)` for staff detection; `hasRole(ROLES.ORG_ADMIN) || hasRole(ROLES.ORG_ADMIN_ENTERPRISE)` for org admin detection. Mirror the same predicates already used in `OrgScopeContext`.
- `adminApiClient` automatically attaches `X-Active-Org`; no manual header work needed.
- Keep existing toast/error patterns (`useOrgScopedToast`).

```text
Files touched
─────────────
src/pages/Organizations.tsx          (role-gated render)
src/pages/LLMInstructions.tsx        (scoped header + defensive filter)
src/lib/instructionsApi.ts           (clear on org change, expose orgId)
src/context/OrgScopeContext.tsx      (resolve real org name for org admins)
```
