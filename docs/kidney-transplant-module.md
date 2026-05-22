# Kidney Transplant (KT) Module — Deep Dive

> This was my primary contribution to the system. It is the most complex
> clinical area: long-running, multi-party (donor **and** recipient), and full
> of deeply nested medical data. This document explains how I designed and built
> it. All field names and data are generalized/fictional.

---

## 1. The clinical problem

A kidney transplant is not a single record — it is a **pipeline involving two
people** (a donor and a recipient) evaluated independently, then matched, then
operated on, then followed up for life. The module had to model each stage and
keep the two parties' records consistent as they move through it.

```
Donor evaluation ─┐
                  ├─▶ Compatibility / matching ─▶ Assignment ─▶ Surgery ─▶ Follow-up
Recipient eval. ──┘
```

See the visual pipeline and state machine in
[`../diagrams/kidney-transplant-workflow.md`](../diagrams/kidney-transplant-workflow.md).

## 2. Module responsibilities

| Stage | What the module does |
|-------|----------------------|
| **Donor assessment** | Capture a full donor work-up: demographics, history, examination, comorbidities, systemic inquiry |
| **Recipient assessment** | Capture the recipient work-up plus their renal-replacement history |
| **Immunological matching** | Record HLA typing, blood-group, and cross-match results used to judge compatibility |
| **Matching & assignment** | Mark assessed donors `available`, assign one to a recipient, keep both sides in sync, allow unassign |
| **Surgery** | Record the transplant operation (a large, detailed record) |
| **Follow-up** | Track post-transplant visits over time |

## 3. Data model (generalized)

The defining characteristic is **depth**. A donor or recipient assessment is not
a flat row — it is an aggregate of many nested clinical sub-records:

```
DonorAssessment
├── demographics            (name, age, gender, contact … )
├── comorbidities           (diabetes, hypertension, cardiac … )
├── systemicInquiry         (per-system review of symptoms)
├── examination             (vitals + per-system findings)
├── immunologicalDetails
│   ├── bloodGroup
│   ├── hlaTyping           (HLA-A / B / DR loci)
│   └── crossMatch          (T-cell / B-cell results)
└── status                  (available | assigned)

RecipientAssessment
├── demographics
├── comorbidities
├── rrtDetails              (prior dialysis / renal-replacement history)
├── immunologicalDetails
└── assignedDonorRef        (links to the matched donor)
```

The transplant **surgery** record is the largest single entity in the system
(80+ fields spanning pre-op, intra-op, and post-op detail).

### Design choice: aggregate persistence with cascade

Each assessment is persisted as one aggregate — the parent owns its nested
sub-records via cascading writes, so saving an assessment saves the whole graph
atomically. This matches how clinicians think about the record (one assessment,
not a dozen disconnected tables) and keeps the service layer simple.

### Design choice: DTOs separate from entities

The nested entity graph is never serialized directly. A layered DTO design
(`...DTO` → `...DataDTO` → entity) defines the exact wire shape, prevents
lazy-loading surprises, and lets the storage model evolve without breaking the
frontend contract.

## 4. The standout feature: donor–recipient matching

This is the piece I'm proudest of, because it's where the module stops being a
form and becomes a *workflow*.

A donor that passes assessment becomes `available`. A coordinator can then
**assign** that donor to a recipient. Assignment is a single transactional
operation that:

1. Flips the donor's status `available → assigned`.
2. Records which recipient the donor is bound to (by the recipient's identifier).
3. Keeps the recipient's record aware of its assigned donor.

`unassign` reverses it, returning the donor to the `available` pool. A query for
available donors powers the matching screen.

```
        ┌─────────────┐   assign(recipient)    ┌────────────┐
        │  available  │ ─────────────────────▶ │  assigned  │
        └─────────────┘                         └────────────┘
              ▲                                        │
              └──────────────  unassign  ──────────────┘
```

Modeling this as an explicit **state machine on the donor record** (rather than,
say, a join table edited ad hoc) made the rules easy to reason about and the UI
easy to drive: the matching screen is just "list `available` donors → pick a
recipient → assign". A generalized version of the service is in
[`../code-samples/backend/DonorMatchingService.java`](../code-samples/backend/DonorMatchingService.java).

## 5. Frontend engineering: taming the giant forms

The donor and recipient assessment forms have **80+ fields across many nested
sections**. Two naive approaches both fail here:

- `useState` per field → a re-render storm and unmanageable wiring.
- One big `useState` object with hand-written setters → stale-closure bugs and
  brittle deep updates.

### My solution: a dot-path `useReducer`

I built a small reducer that addresses any nested field by a **dot-path string**
(`"immunologicalDetails.hlaTyping.locusA"`) and immutably updates just that
leaf. Every form field becomes a one-liner:

```ts
dispatch({ type: "UPDATE_FIELD",
           payload: { form: "donor", field: "immunologicalDetails.crossMatch.tCell", value } });
```

Benefits:
- **One predictable update path** for the entire form tree — no bespoke setter
  per section.
- **Immutable updates** keyed by path, so React re-renders only what changed.
- The reducer is tiny, fully unit-testable, and reused across donor, recipient,
  and surgery forms.

A generalized, runnable version is in
[`../code-samples/frontend/nestedFormReducer.ts`](../code-samples/frontend/nestedFormReducer.ts).

### Supporting structure

Each KT screen is a self-contained feature folder — `components/`, `hooks/`
(e.g. a `useKidneyTransplant` hook owning the reducer + API calls), `services/`
(typed API client), `types/`, and `utils/` (the reducer + initial-state
factories). New sections drop in without touching unrelated code.

## 6. API design (generalized)

REST endpoints, grouped by sub-resource, all returning DTOs:

| Area | Representative endpoints |
|------|--------------------------|
| Donor assessment | `POST /donor-assessment`, `GET /donor-assessment/patient/{id}`, `GET /donor-assessment/available`, `POST /donor-assessment/assign`, `POST /donor-assessment/{id}/unassign`, `PATCH /donor-assessment/{id}/status` |
| Recipient assessment | `POST /recipient-assessment`, `GET /recipient-assessment/patient/{id}/latest`, `POST /recipient-assessment/{id}/assign-donor` |
| Surgery | `GET /…/surgery/{id}/exists`, `GET /…/surgery/{id}/latest`, `POST /…/surgery/{id}` |
| Follow-up | `POST /followup/{id}`, `GET /followup/{id}` |

Access is authenticated and role-gated; every patient-data access is written to
the audit log.

## 7. KT-specific challenges (and how I solved them)

1. **Keeping two records consistent during assignment.** Donor and recipient are
   separate aggregates. I made assignment a single `@Transactional` service
   operation so both sides commit together or not at all — no half-matched
   states.
2. **Deeply nested form state.** Solved with the dot-path reducer above instead
   of reaching for a heavier form library, because the update pattern (set one
   deep leaf) was uniform and a 30-line reducer covered it cleanly.
3. **Huge surgery record.** Broke the 80+ fields into logical sections backed by
   the same reducer and initial-state factory, so the form stays maintainable
   and the payload maps straight onto the aggregate.
4. **Compatibility data that's read often, written rarely.** Immunological
   details (HLA, cross-match) are modeled as their own nested sub-record so they
   can be displayed on the matching screen without loading the entire assessment.

## 8. What I'd build next

- A real **matching score** (HLA mismatch count + cross-match + blood-group
  compatibility) to rank available donors instead of manual selection.
- An **audit timeline** view per transplant case spanning both donor and
  recipient events.
- **Optimistic UI** on assignment via TanStack Query mutations with rollback.
