# Sample Launch Security Review

> Fictional example showing the delivery format. It is not a report about a real company.

## Scope

- Stack: Next.js, Supabase, Stripe, Vercel
- Environment: read-only repository and staging
- Test identities: anonymous, user A, user B, administrator
- Excluded: production, real customer data, denial-of-service testing

## Launch decision

**Do not launch payments until the confirmed high-risk findings are fixed and re-tested.**

## Confirmed finding: cross-tenant order access

**Severity:** High  
**Evidence:** User A could request the identifier of an order created by user B through the staging API and receive its customer email and amount. The UI hid the record, but the server route checked only that the caller was signed in.

**Impact:** A valid user could read another tenant's order data.

**Recommended fix:** Derive tenant membership from the authenticated identity on the server and enforce the same ownership condition in database policy. Do not trust a tenant or record identifier supplied by the client.

**Re-test:** Repeat read, update, delete, export, and batch actions with anonymous, user A, user B, and administrator identities. Expected cross-tenant result: `403` or an empty set with no sensitive fields.

## Delivery contents

- Reproducible evidence for every confirmed finding
- False positives explicitly removed
- Prioritized fix plan
- One re-test after approved fixes
- Clear residual-risk and launch conclusion
