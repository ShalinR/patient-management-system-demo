# Patient Management System - Demo

> A sanitized portfolio version of a full-stack hospital renal-unit management
> system I built during my software engineering internship. This repository
> documents the architecture design decisions and representative (rewritten)
> code samples - **with a focus on the Kidney Transplant module my primary
> contribution.** No production code real patient data schema or
> client-specific workflows are included.

---

## What This Project Is

A web-based clinical management platform for a hospital renal (kidney) unit. It
digitizes inpatient and treatment workflows - ward management dialysis lab
investigations and **kidney transplant** - replacing paper records with a
role-aware audited electronic health record.

> **Note:** All names identifiers and data shown in this portfolio (e.g.,
> `Sarath Kumara` `PHN-0001`) are fictional. Module names schema fields and
> endpoints have been generalized. Institution-specific workflow logic has been
> removed. Code samples are **rewritten illustrations** of patterns I used not
> production source.

---

## My Primary Contribution: the Kidney Transplant (KT) Module

I designed and built the Kidney Transplant module end to end. It is one of the most
complex clinical area in the system and the deep-dive is here →
**[`docs/kidney-transplant-module.md`](docs/kidney-transplant-module.md)**.

Highlights:

- **Donor & recipient assessment workflows** - deeply nested clinical records
  (history examination comorbidities systemic inquiry) captured through large
  multi-section forms.
- **Immunological compatibility data** - HLA typing and cross-match details used
  to evaluate donor–recipient suitability.
- **Donor–recipient matching** - a status-driven assignment workflow
  (`available → assigned`) that links an evaluated donor to a recipient and
  keeps both records consistent.
- **Transplant surgery records & post-transplant follow-ups.**
- **Nested-form state engine** - a custom `useReducer` with dot-path field
  addressing to manage 80+ fields across sections without re-render storms.

## Cross-Cutting Contributions

Beyond the KT module I also worked on shared platform concerns:

- JWT authentication and role-based access control (ADMIN / DOCTOR / NURSE).
- An AES-GCM field-level encryption converter for sensitive identifiers at rest.
- The typed REST/DTO contract pattern shared across modules.
- Docker-based local orchestration for the team.

---

## Tech Stack

| Layer        | Technology                                                       |
| ------------ | ---------------------------------------------------------------- |
| Frontend     | React 18 TypeScript Vite TailwindCSS shadcn/ui React Router |
| State / Data | TanStack Query `useReducer` (nested forms) Zod                 |
| Backend      | Java 21 Spring Boot 3.5 Spring Security Spring Data JPA       |
| Auth         | JWT (jjwt 0.12) BCrypt HTTP-only cookies                       |
| Database     | MySQL 8 (primary) Flyway migrations                             |
| Reporting    | Apache PDFBox (PDF discharge summaries)                          |
| Build / Ops  | Maven npm Docker Docker Compose                               |

Full breakdown and rationale in [`docs/tech-stack.md`](docs/tech-stack.md).

---

## Repository Layout

```
portfolio-clinic-management/
├── README.md                          <- you are here
├── docs/
│   ├── kidney-transplant-module.md    <- ⭐ KT module deep-dive (primary work)
│   ├── architecture.md                <- system architecture & data flow
│   ├── tech-stack.md                  <- detailed stack rationale
│   ├── design-decisions.md            <- key engineering decisions + tradeoffs
│   └── challenges-and-learnings.md
├── diagrams/
│   ├── kidney-transplant-workflow.md  <- ⭐ KT pipeline + matching state machine
│   ├── system-architecture.md         <- mermaid system diagram
│   ├── auth-flow.md                   <- JWT login + refresh sequence
│   └── role-access-matrix.md
├── code-samples/                       <- rewritten generalized illustrations
│   ├── backend/
│   │   ├── DonorMatchingService.java   <- ⭐ donor↔recipient assignment pattern
│   │   ├── JwtTokenService.java
│   │   ├── SecurityConfig.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── SamplePatientController.java
│   └── frontend/
│       ├── nestedFormReducer.ts        <- ⭐ dot-path form state engine
│       ├── AuthContext.tsx
│       ├── ProtectedRoute.tsx
│       └── PatientCard.tsx
└── screenshots/                        <- placeholder + capture guidelines
```

---

## Why a Portfolio Version?

The production codebase is the proprietary property of the deploying institution
- it contains workflow logic schema and configuration that cannot be shared.
This repository preserves what I want to discuss in interviews: the architecture
I designed the patterns I applied and the lessons I took away without exposing
anything proprietary.
