# Vibe Security — Review Authorization

This template defines the initial review boundary. Replace the blanks and confirm the completed scope in writing before access is provided.

## Project

- Client: ____________________
- Project: ____________________
- Repository: ____________________
- Staging environment: ____________________
- Stack: ____________________
- Selected service: [ ] $59 diagnostic  [ ] $299+ review and fixes  [ ] Custom

## Authorized actions

Select only what is required:

- [ ] Read the designated repository
- [ ] Run the project in a local or designated staging environment
- [ ] Review configuration, database policies, API authorization, payment integration, uploads, and client-side secret exposure
- [ ] Use synthetic records and designated test accounts
- [ ] Submit non-destructive requests to the designated staging environment

## Excluded unless separately authorized in writing

- Production testing or production changes
- Access to real customer data
- Denial-of-service, load, brute-force, social-engineering, or credential-stuffing tests
- Testing third-party systems outside the client-controlled scope
- Destructive actions or persistence

Do not send production secrets, real customer data, or long-lived credentials through an ordinary email or website form. Any required access should be temporary, revocable, least-privileged, and limited to the agreed environment.

## Delivery

The $59 diagnostic covers one repository or one representative workflow and includes:

- Evidence for manually confirmed findings
- False-positive removal
- Prioritized remediation guidance
- One re-test after approved fixes
- A launch or residual-risk conclusion limited to the agreed scope

The review does not promise absolute security and does not cover unknown issues outside the written scope. New feature development and fix implementation are quoted separately.

## Payment

- $59 diagnostic: paid in full before review begins
- Review plus fixes: 50% before work begins and 50% before final fix delivery, unless the written scope states otherwise
- A full refund is available before work begins; work already performed is non-refundable

## Confidentiality

Repository content, non-public findings, and client-provided information will be kept confidential for two years, except for information already public, independently known, authorized for release by the client, or required to be disclosed by law.

## Confirmation

The client confirms that they control the scoped systems or have authority to authorize this review.

- Client name and title: ____________________
- Written confirmation or signature: ____________________
- Date: ____________________
- Vibe Security confirmation: ____________________
