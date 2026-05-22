# Tech Stack — Detailed

## Frontend

| Choice                  | Why                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| React 18 + TypeScript   | Strong typing across DTO boundaries; team familiarity; large ecosystem.                                 |
| Vite                    | Fast dev server, ESM-native, far better DX than CRA for a growing form-heavy app.                       |
| TailwindCSS + shadcn/ui | Utility-first speed + accessible Radix primitives; avoids opinionated component lock-in.                |
| React Router v6         | Nested routes mirror the clinical workflow hierarchy (ward → patient → encounter).                      |
| TanStack Query          | Server-state caching, retry, and invalidation — replaced ad-hoc `useEffect` fetching mid-project.        |
| `useReducer` + Zod      | The largest nested clinical forms (KT donor/recipient, 80+ fields) use a custom dot-path reducer; Zod validates payloads and doubles as a TS type source. React Hook Form is used for simpler forms. |
| Recharts                | Lightweight, declarative trend charts for time-series clinical values.                                  |

## Backend

| Choice                            | Why                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Java 21 (LTS) + Spring Boot 3.5   | Mature, type-safe, opinionated where it should be; current LTS, team had Java experience. |
| Spring Security + Method Security | Industry-standard filter chain; declarative `@PreAuthorize` keeps auth near the code.    |
| Spring Data JPA + Hibernate       | Cuts repository boilerplate; works well with the deeply nested clinical entity graphs.   |
| jjwt 0.12                         | Active maintenance, clean fluent API for sign/verify.                                    |
| BCrypt (Spring Security)          | Default adaptive hash; no reason to roll our own.                                        |
| Lombok                            | Removes accessor noise from the many DTOs and entities.                                  |
| Flyway                            | Versioned, repeatable migrations — non-negotiable for a shared dev DB.                   |
| Apache PDFBox                     | Server-side PDF generation for discharge summaries without a headless browser.           |
| spring-dotenv                     | Loads `.env` into Spring properties so dev/prod use the same config mechanism.           |

## Storage

| Choice          | Why                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------- |
| MySQL 8         | Mandated by infra constraints; well-understood; good fit for relational clinical data.    |
| Flyway          | Schema-as-code; every change reviewable in a PR.                                          |

## Tooling

| Choice           | Why                                                                       |
| ---------------- | ------------------------------------------------------------------------- |
| Docker / Compose | Reproducible dev environment; "one command" onboarding.                   |
| Maven            | Standard for Spring; Spring Boot parent POM removes most config.          |
| ESLint           | Catches the usual React/TS footguns in CI.                                |
| Git + GitHub     | Conventional Commits style for changelogs; PR-based review workflow.      |

## What I Deliberately Did Not Use

- **A microservice split.** The system is one bounded context. A modular monolith
  is the right shape until traffic or team size forces otherwise.
- **NoSQL for everything.** Clinical data is highly relational; SQL was the
  correct primary store. Mongo was kept available for one document-shaped
  module but not used as a general escape hatch.
- **Redux.** TanStack Query owns server state; React Context owns auth and the
  few global UI flags. There was nothing left for Redux to do.
- **A GraphQL layer.** REST + DTOs covered the read patterns we actually had.
