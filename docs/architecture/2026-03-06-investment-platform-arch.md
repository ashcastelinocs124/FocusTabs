# Investment Management Platform — Architecture

## Problem Statement

Individual retail investors increasingly hold positions across multiple brokerage accounts, creating a fragmented view of their overall portfolio. No single interface shows a unified holdings snapshot across brokers, forcing manual reconciliation. This platform solves that by pulling holdings data from supported brokers via Plaid's investment data product and presenting a unified dashboard. The six-month goal is a working, live unified view of holdings — nothing more.

---

## Design Bets

**Betting on:**
- Plaid's investment data product covers enough of the target user's brokers to be useful at launch
- Retail investors will tolerate 24–48 hour data staleness if it is clearly communicated
- A fetch-and-display model (minimal persistence) is sufficient for v1 value delivery
- Abstracting the aggregation layer now is cheap enough to justify given unresolved unit economics

**Wrong if:**
- Plaid's supported broker list is too narrow to serve even a focused user segment — no coverage means no product
- Users churn due to staleness or re-auth failures at a rate that makes retention impossible
- Legal review concludes that even transient display of aggregated holdings triggers compliance obligations that block launch
- Plaid's per-Item pricing makes the unit economics unworkable before any monetization is in place

---

## System Architecture

### Components

| Component | Responsibility | Interface |
|-----------|---------------|-----------|
| **Frontend Dashboard** | Render unified portfolio view, display per-holding last-synced timestamp, surface connection health status | REST or GraphQL over HTTPS |
| **API Server** | Orchestrate data requests, enforce auth, call aggregation layer, assemble unified view | REST/GraphQL; internal calls to aggregation layer |
| **Aggregation Layer (Provider Interface)** | Abstract data provider behind a common interface; current implementation backed by Plaid | Internal service interface — swappable |
| **Plaid Adapter** | Concrete implementation of the provider interface; calls Plaid's `/investments/holdings/get` and related endpoints | Plaid API (HTTPS, OAuth + access token per Item) |
| **Connection Health Monitor** | Track per-broker connection status; detect degraded or broken links; trigger alerts | Internal scheduler + outbound notifications |
| **Status Page** | Publicly visible broker connection health; reduces support load | Static or hosted (e.g. Statuspage.io) |
| **User Auth** | Authenticate users; manage sessions | JWT-based |
| **Notification Service** | Email users when their broker connection degrades; proactive, not reactive | Email provider (e.g. SendGrid); triggered by Connection Health Monitor |
| **Link Flow (Plaid Link)** | Onboarding UI component for users to connect broker accounts via Plaid | Plaid Link SDK (client-side) |

---

### Data Flow

1. User completes onboarding; frontend renders Plaid Link SDK for broker connection.
2. User authenticates their broker account through Plaid Link. Plaid returns a `public_token`.
3. API Server exchanges `public_token` for a persistent `access_token` via Plaid adapter. Access token stored (encrypted) per user-broker pair.
4. User requests portfolio view via frontend.
5. API Server calls the Aggregation Layer with a unified fetch request.
6. Aggregation Layer (Plaid Adapter) calls `GET /investments/holdings/get` and `GET /accounts/get` for each linked Item using the stored access token.
7. Plaid returns holdings data along with a last-updated timestamp per account.
8. Aggregation Layer normalizes the response into a provider-agnostic holdings schema and returns it to the API Server.
9. API Server assembles the unified view across all linked brokers and passes it to the frontend.
10. Frontend renders holdings; displays per-data-point last-synced timestamp prominently. No data is shown without its staleness indicator.
11. Connection Health Monitor runs on a schedule; calls Plaid's Item status endpoints; marks degraded connections; updates Status Page and triggers Notification Service if a connection breaks.

---

### Key Design Decisions

| Decision | Rationale | Trade-off accepted |
|----------|-----------|-------------------|
| **Aggregation layer abstracted behind a provider interface** | Unit economics of Plaid are unresolved. Hardcoding Plaid makes a future provider swap expensive. Abstraction keeps the option open at low upfront cost. | Slightly more engineering work at the start; interface must not leak Plaid-specific concepts |
| **Fetch-and-display; minimize persistence of holdings snapshots** | Legal/regulatory exposure is unresolved. Caching holdings data increases GLBA/privacy/SEC surface area. Fetch-on-demand limits that exposure until legal review is complete. | No historical portfolio tracking in v1; performance cost from live fetches on each view load |
| **Last-synced timestamp on every data point** | Plaid data can be 24–48 hours stale. Hiding this destroys user trust. Surfacing it sets correct expectations. | UI must budget space and hierarchy for this; cannot be optional |
| **Scope to supported brokers only; set expectations at onboarding** | Plaid's investment product has incomplete broker coverage. Claiming universal coverage and failing is worse than being upfront. | Reduces addressable user base at launch; requires maintaining a supported broker list |
| **Proactive connection health monitoring and outbound alerts** | Re-auth churn is an accepted risk. Users must not discover broken connections themselves. | Requires monitoring infrastructure and notification pipeline from day one |

---

## Resolved Concerns

✓ **Broker Coverage Gaps** — Scoped to brokers with reliable Plaid investment data coverage. Supported broker list communicated explicitly at onboarding. No claim of universal coverage.

✓ **Data Freshness** — Last-synced timestamp displayed on every data point. Staleness is never hidden. This is a UI requirement, not a nice-to-have.

✓ **Re-auth Churn** — Accepted as an operational reality. Mitigated by: (a) Connection Health Monitor tracking per-broker status continuously, (b) public Status Page, (c) proactive email notifications to affected users before they notice a broken connection.

---

## Accepted Risks

⚠ **Re-auth outages (2–4 weeks possible)** — Credential-based scraping breaks when brokers update MFA or login flows. Structurally unavoidable with this aggregation approach. Monitor: track connection success rate per broker; set alert thresholds; maintain public incident history on Status Page.

⚠ **Plaid investment coverage gaps at runtime** — Even within Plaid's supported broker list, individual account types or data fields may return incomplete data. Monitor: track per-broker data completeness at the field level; surface known gaps in onboarding copy.

---

## Open Questions

These must be resolved before finalizing the data model or committing to Plaid:

1. **Legal and Regulatory Review (BLOCKING for data model)** — Does storing aggregated holdings data — even transiently — trigger GLBA, state privacy laws (CCPA), or SEC obligations? What is the minimum data retention posture that satisfies functionality while minimizing regulatory surface area? The fetch-and-display default is a holding pattern until this is answered.

2. **Plaid Unit Economics (BLOCKING for full Plaid commitment)** — What is the per-Item cost at projected user volumes across 3, 6, and 12 months? At what user count does Plaid become unsustainable without monetization? The provider abstraction buys time but does not eliminate the question.

3. **Supported Broker List** — Which specific brokers will be listed as supported at launch? Requires hands-on validation of Plaid's investment data product against actual accounts — not just Plaid's published documentation.

---

## Success Criteria

- A user can connect at least two broker accounts and see a unified holdings view within a single session, with no manual data entry.
- Every data point in the unified view displays a last-synced timestamp.
- Connection failures are surfaced to users via email and Status Page within a defined SLA (SLA TBD).
- The aggregation layer can be pointed at a second data provider without changes to the API Server or frontend.
- Legal review is complete and its conclusions are reflected in the data model before any user data is stored.

---

## Next Step

**Commission the legal review.** This is the single action that must happen before writing production code. It determines whether the fetch-and-display architecture is a final decision or a temporary constraint, and it gates the data model. Everything else — provider abstraction, UI, monitoring — can be designed in parallel, but no data model should be finalized until the regulatory posture is understood.
