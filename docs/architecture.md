# System Architecture

## High-Level View

A standard 3-tier web application: a React SPA talks to a stateless Spring Boot
REST API, which persists to a relational database. Authentication is JWT-based,
delivered via HTTP-only cookies. The SPA is served as static assets in
production.

```
┌──────────────────────┐        HTTPS         ┌──────────────────────┐
│                      │ ───────────────────> │                      │
│   React SPA (Vite)   │   JSON over REST     │  Spring Boot API     │
│   TypeScript         │ <─────────────────── │  (Stateless, JWT)    │
│   TailwindCSS        │   AUTH-TOKEN cookie  │                      │
└──────────────────────┘                      └──────────┬───────────┘
                                                         │
                                                         │ JPA / JDBC
                                                         ▼
                                              ┌──────────────────────┐
                                              │   MySQL              │
                                              │   (Flyway-managed)   │
                                              └──────────────────────┘
```

## Module Boundaries

The backend is package-by-feature inside a single Spring Boot application
(modular monolith). Cross-cutting concerns live in dedicated packages.

```
backend/
├── config/        <- Security, CORS, beans
├── controller/    <- REST endpoints (thin)
├── service/       <- Business logic + transaction boundaries
├── repository/    <- Spring Data JPA interfaces
├── model/         <- JPA entities
├── dto/           <- Request/response DTOs
├── mapper/        <- Entity <-> DTO mapping
├── filter/        <- JwtAuthenticationFilter
├── crypto/        <- AES-GCM JPA converter
└── exception/     <- Global exception handler
```

## Request Lifecycle

```
Browser
   │
   │ 1. Request with AUTH-TOKEN cookie
   ▼
CORS filter
   │
   ▼
JwtAuthenticationFilter
   │  - extracts token from Authorization header OR cookie
   │  - validates signature + expiry
   │  - loads UserDetails, populates SecurityContext
   ▼
Spring Security FilterChain
   │  - authorizeHttpRequests rules
   ▼
@PreAuthorize on controller method
   │
   ▼
Controller → Service (transactional) → Repository → DB
   │
   │ Service also writes to AuditLog
   ▼
Response (DTO via mapper)
```

## Authentication Flow

See [`../diagrams/auth-flow.md`](../diagrams/auth-flow.md) for the sequence
diagram. Summary:

1. `POST /api/auth/login` with credentials → BCrypt-verified → JWT issued.
2. Token returned both in JSON body and as an HTTP-only `AUTH-TOKEN` cookie
   (cookie used for browser sessions, header used for non-browser clients).
3. Subsequent requests carry the token; the filter populates the
   `SecurityContext`.
4. `POST /api/auth/refresh` rotates the token using the current authenticated
   identity (sliding expiry, capped).
5. `POST /api/auth/logout` clears the cookie.

## Authorization Model

Three coarse roles plus method-level checks:

| Role       | Scope                                                       |
| ---------- | ----------------------------------------------------------- |
| `ADMIN`    | Full access, user management, deletions, system config      |
| `DOCTOR`   | Clinical read/write across assigned patients                |
| `NURSE`    | Read + limited write (observations, scheduling)             |

Enforced two ways:

- Path-based: `SecurityConfig.securityFilterChain` permits `/api/auth/**`
  unauthenticated; everything else requires authentication.
- Method-based: `@PreAuthorize("hasRole('ADMIN')")` on sensitive endpoints
  (deletions, user creation, audit log access).

See [`../diagrams/role-access-matrix.md`](../diagrams/role-access-matrix.md).

## Data Flow for a Typical Read

A clinician opening a patient profile:

1. SPA navigates to `/patients/:phn/profile`.
2. `useQuery` (TanStack Query) calls `GET /api/patient/{phn}/profile`.
3. `JwtAuthenticationFilter` authenticates.
4. `PatientController.getProfileByPhn` calls
   `auditService.logPatientAccess(user, role, "VIEW", phn)`.
5. `PatientService` fetches the entity graph, returns a `PatientProfileDTO`.
6. Sensitive identifier fields are decrypted on read by the JPA converter.
7. SPA caches the response under the patient key; subsequent navigations are
   instant.

## Audit Logging

Every read or write of a patient record produces an audit row containing:

- actor username + role
- action (`VIEW`, `CREATE`, `UPDATE`, `DELETE`)
- resource identifier (patient number)
- timestamp
- free-text reason / context

The audit log is queryable through an admin-only endpoint and surfaces in a
dedicated UI page.

## Encryption at Rest

Selected identifier columns are wrapped by a custom
`AttributeConverter<String, String>` that performs AES-GCM encryption with a
key loaded from environment configuration. Encryption is transparent to JPA
code — entities still hold plain strings in memory.

This protects against database dump leakage scenarios while leaving the
application logic unchanged.
