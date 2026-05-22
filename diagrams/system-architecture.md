# System Architecture Diagram

```mermaid
flowchart LR
    subgraph Browser
        SPA[React SPA<br/>Vite + TS + Tailwind]
    end

    subgraph API[Spring Boot API]
        SEC[Security Filter Chain]
        JWT[JwtAuthenticationFilter]
        CTRL[REST Controllers]
        SVC[Service Layer<br/>@Transactional]
        AUD[AuditService]
        CRYPTO[AES-GCM Converter]
        REPO[JPA Repositories]
    end

    subgraph DB[MySQL]
        TBL[(Application Tables)]
        AUDIT[(Audit Log)]
    end

    SPA -- "HTTPS + AUTH-TOKEN cookie" --> SEC
    SEC --> JWT
    JWT --> CTRL
    CTRL --> SVC
    SVC --> REPO
    SVC --> AUD
    AUD --> REPO
    REPO --> CRYPTO
    CRYPTO --> TBL
    AUD --> AUDIT
```

## Component Responsibilities

| Component                  | Owns                                                      |
| -------------------------- | --------------------------------------------------------- |
| `SecurityFilterChain`      | Path-based access rules, CSRF/CORS config                 |
| `JwtAuthenticationFilter`  | Token extraction, signature verification, context setup   |
| Controllers                | HTTP shape, DTO validation, `@PreAuthorize`               |
| Services                   | Business rules, transaction boundaries, audit calls       |
| `AuditService`             | Structured access logging, same-tx as the action          |
| `JpaAesGcmStringConverter` | Transparent field encryption on flagged columns           |
| Repositories               | Spring Data JPA queries                                   |
