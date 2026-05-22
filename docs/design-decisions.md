# Key Design Decisions

A record of the engineering decisions I'm prepared to defend in interview.

---

## 1. Stateless JWT instead of server-side sessions

**Decision:** Issue signed JWTs with a short-to-medium expiry; carry them in
HTTP-only cookies for the SPA and `Authorization: Bearer` for non-browser
clients.

**Why:**
- No session store to operate; the API stays horizontally scalable.
- HTTP-only cookies block XSS exfiltration of the token.
- The `Bearer` header path keeps the same auth model usable by future
  integrations (mobile, scripts).

**Trade-off:** Revocation is harder than session deletion. Mitigated with a
short expiry plus a refresh endpoint that checks the current user's status on
every refresh, so a disabled account can't keep rotating tokens.

---

## 2. RBAC via Spring Security `@PreAuthorize`, not custom interceptors

**Decision:** Use `@EnableMethodSecurity` + `@PreAuthorize("hasRole(...)")` at
the controller method level.

**Why:**
- Authorization lives next to the endpoint it protects — readable, reviewable.
- One mechanism instead of two (filter chain for paths, annotations for
  methods).
- Aligns with how every Spring code review elsewhere checks auth.

**Trade-off:** Annotations are easy to forget on a new endpoint. Compensated
with a default-deny `anyRequest().authenticated()` rule, plus a code review
checklist that flags new controllers without explicit authorization.

---

## 3. DTOs everywhere, never expose JPA entities

**Decision:** Every request and response body is a DTO. Mappers translate
to/from entities at the service boundary.

**Why:**
- Entity graphs are deeply nested; serializing them leaks data and triggers
  lazy-load surprises.
- The wire shape and the storage shape need to evolve independently.
- DTOs are the contract the frontend types against — the entity model can
  change without breaking clients.

**Trade-off:** More classes, more mapping code. Worth it for a system that
will be maintained for years.

---

## 4. TanStack Query as the only server-state owner on the frontend

**Decision:** All API reads/writes go through `useQuery` / `useMutation`. No
ad-hoc `useEffect` + `fetch`.

**Why:**
- Caching, retries, deduplication, and invalidation come for free.
- Mid-project rewrite paid off immediately: the patient profile page stopped
  refetching on every tab switch.
- Forms get optimistic updates with rollback in ~5 lines.

**Trade-off:** Junior contributors have to learn it. The mental model
("queries are keyed cache entries; mutations invalidate keys") clicks fast.

---

## 5. Audit log threaded through the service layer, not via an aspect

**Decision:** Controllers extract the authenticated user and pass it
explicitly into service methods, which write the audit row in the same
transaction as the business operation.

**Why:**
- Same transaction = if the operation rolls back, the audit row rolls back
  with it. Critical for trustworthy logs.
- Explicit beats magical. AOP audit aspects always leak — they miss bulk
  operations, miss arguments, or log the wrong actor when chained calls cross
  contexts.

**Trade-off:** A few extra parameters on service methods. Readable and easy
to grep.

---

## 6. Field-level encryption via JPA AttributeConverter, not column-level DB encryption

**Decision:** A `JpaAesGcmStringConverter` implements `AttributeConverter<String, String>`
and is applied to sensitive identifier columns with `@Convert`.

**Why:**
- Encryption key lives in app config, not DB config — keeps key and ciphertext
  on different blast radii.
- Works on any backing DB without depending on vendor-specific TDE.
- Transparent to repository code: queries still treat fields as `String`.

**Trade-off:** Encrypted columns are not directly searchable. For the fields
chosen, exact lookups happen via separate indexed reference IDs, not the
encrypted value itself.

---

## 7. Modular monolith, not microservices

**Decision:** Single deployable Spring Boot app, organized package-by-feature.

**Why:**
- Team of 3 interns; microservices would have been pure overhead.
- One bounded context (patient care in one unit) — no domain boundary to split
  along.
- Local-first dev (`./mvnw spring-boot:run`) keeps onboarding to one command.

**Trade-off:** A future team that needs independent deploy cadence will have
to do the split. The package-by-feature layout was chosen specifically to
make that split mechanical if it ever happens.

---

## 8. Conventional Commits + atomic commits

**Decision:** `feat:`, `fix:`, `refactor:`, `chore:` prefixes; one logical
change per commit.

**Why:**
- The commit history doubles as the changelog.
- `git blame` actually answers "why" because each commit has one reason.
- Code review is faster when each commit is reviewable in isolation.
