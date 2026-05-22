# Challenges and Learnings

## Challenge 1 — Token delivery across two client types

The same backend needed to serve both a browser SPA (where storing JWTs in
`localStorage` is a known XSS hazard) and the possibility of script/API
clients in the future.

**What I tried first:** Tokens in `localStorage`. Easy, worked, felt wrong.

**What I changed to:** Backend issues the token both in the JSON body
*and* as an `HttpOnly`, `SameSite=Lax` cookie named `AUTH-TOKEN`. The
`JwtAuthenticationFilter` accepts either the cookie or the `Authorization`
header.

**Learning:** Auth transport is a UX-and-security joint decision, not a pure
security decision. Pick the transport that fits the client; let the server
accept both.

---

## Challenge 2 — Audit logging that actually survives errors

Early version logged audit rows from a Spring AOP `@Around` advice. It worked
for happy paths and silently dropped rows when the underlying transaction
rolled back. We discovered this only when QA noticed missing entries after a
validation failure.

**Fix:** Move audit writes into the service method, inside the same
`@Transactional` boundary as the business write. If the operation rolls back,
the audit row rolls back too — which is the correct behavior for a
compliance log.

**Learning:** Cross-cutting concerns are seductive but lie about being free.
Audit, security, and transactions are too important to leave to weaving order.

---

## Challenge 3 — Form state for deeply nested clinical records

Some forms had 80+ fields across nested sections (history, examination,
investigations). Naive `useState` per field caused a re-render storm; a
single `useState` object caused stale closures.

**Fix:** Built a small `useReducer` that addresses any nested field by a
dot-path string (e.g. `"immunologicalDetails.crossMatch.tCell"`) and updates
just that leaf immutably. Every field becomes a one-line `dispatch`, only the
changed subtree re-renders, and the same 30-line reducer is reused across the
donor, recipient, and surgery forms. Zod validates the assembled payload on
submit. (See the KT module deep-dive and `code-samples/frontend/nestedFormReducer.ts`.)

**Learning:** For a uniform update pattern ("set one deep leaf"), a tiny purpose-built
reducer beat reaching for a heavier form library — less abstraction to fight, fully
testable, and trivial to reuse.

---

## Challenge 4 — Encrypting identifier columns without breaking lookups

We wanted at-rest encryption on sensitive identifiers but still needed to
look patients up by those identifiers.

**Fix:** Two-column pattern. The encrypted column stores the
display/sensitive value (via the AES-GCM converter). A separate non-sensitive
reference identifier (system-generated, opaque) is what users actually look
up and what we index.

**Learning:** "Encrypt everything" runs into "but we need to query it" almost
immediately. Splitting concerns into "what we show" vs "what we look up" is
usually the right move.

---

## Challenge 5 — Onboarding a new contributor in under an hour

The original setup needed Java, Maven, Node, MySQL, and a populated schema.
Onboarding ran to a full day.

**Fix:** Wrote a Docker Compose stack and a `start-servers` script that
brings up the API, frontend, and DB with one command. New contributors get
to a working local environment before they finish their coffee.

**Learning:** Treat developer experience as a feature. The time saved
compounds over the project's life.

---

## Challenge 6 — Resisting feature scope creep on the SPA

Early in the project there was pressure to ship every form as a unique page
with bespoke layout. I pushed back and built a small set of reusable shells
(patient context bar, multi-section form layout, audit-aware table) that
every page composes.

**Result:** New pages take a fraction of the time to build, and the UX is
consistent across the system.

**Learning:** A few well-designed primitives beat a sea of one-off pages.
Pay the design cost early.

---

## Things I would do differently

- **Add integration tests sooner.** I leaned on unit tests + manual checks
  longer than I should have. The first integration test I wrote caught a
  filter-chain bug instantly.
- **Define the audit log schema before the first audit-emitting feature.**
  Retrofitting the schema once half the modules were emitting was avoidable.
- **Treat the DTO layer as a first-class module.** I let DTOs sit in a flat
  package; grouping them by feature alongside controllers would have aged
  better.
