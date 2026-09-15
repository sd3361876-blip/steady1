# Fix RevenueCat trial grant

## Scope
- Update only the existing trial server endpoint.
- Keep the current authentication, claim protection, trial UI, onboarding, access gate, purchases, restore, products, and offerings unchanged.

## Implementation
- Resolve the RevenueCat project and existing entitlement internal ID through v2.
- Check for the authenticated Supabase user ID as the RevenueCat customer.
- Create that customer through v2 only when RevenueCat confirms it is missing.
- Grant the entitlement through `POST /v2/projects/{project_id}/customers/{customer_id}/actions/grant_entitlement` using `entitlement_id` and the exact 30-day `expires_at` timestamp.
- Remove the incorrect grant attempts and legacy v1 fallback.
- Read back the customer state and confirm the granted entitlement before returning success.
- Preserve sanitized diagnostics without exposing credentials.

## Verification
- Run the project typecheck through the automatic validation harness.
- Report the exact file changed.
