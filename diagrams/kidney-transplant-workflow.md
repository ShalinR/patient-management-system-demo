# Kidney Transplant — Workflow Diagrams

## 1. The transplant pipeline

```mermaid
flowchart LR
    subgraph Evaluation
        D[Donor assessment]
        R[Recipient assessment]
    end
    IM[Immunological matching<br/>HLA · blood group · cross-match]
    A{Compatible?}
    ASG[Assign donor → recipient]
    SUR[Transplant surgery record]
    FU[Post-transplant follow-up]

    D --> IM
    R --> IM
    IM --> A
    A -- yes --> ASG
    A -- no --> D
    ASG --> SUR
    SUR --> FU
    FU --> FU
```

## 2. Donor record state machine

A donor that passes assessment enters the `available` pool. Assignment binds the
donor to a recipient; unassignment returns it to the pool. Modeling this
explicitly on the donor record kept the matching rules and UI simple.

```mermaid
stateDiagram-v2
    [*] --> Draft: create assessment
    Draft --> Available: assessment complete
    Available --> Assigned: assign(recipient)
    Assigned --> Available: unassign()
    Assigned --> Transplanted: surgery recorded
    Transplanted --> [*]
```

## 3. Assignment as a single transaction

```mermaid
sequenceDiagram
    autonumber
    actor Coordinator
    participant SPA as React SPA (matching screen)
    participant API as KT Controller
    participant Svc as DonorMatchingService
    participant DB as MySQL

    Coordinator->>SPA: pick available donor + recipient
    SPA->>API: POST /donor-assessment/assign {donorId, recipientId}
    API->>Svc: assign(donorId, recipientId)
    activate Svc
    Note over Svc,DB: single @Transactional boundary
    Svc->>DB: donor.status = assigned, bind recipient
    Svc->>DB: recipient.assignedDonor = donor
    deactivate Svc
    Svc-->>API: ok (both committed together)
    API-->>SPA: 200 OK
    SPA->>SPA: invalidate "available donors" query
```

## 4. Assessment aggregate (nested data shape)

```mermaid
classDiagram
    class DonorAssessment {
        +id
        +status: available|assigned
        +assignedRecipientRef
    }
    class Demographics
    class Comorbidities
    class SystemicInquiry
    class Examination
    class ImmunologicalDetails {
        +bloodGroup
    }
    class HlaTyping {
        +locusA
        +locusB
        +locusDR
    }
    class CrossMatch {
        +tCell
        +bCell
    }

    DonorAssessment *-- Demographics
    DonorAssessment *-- Comorbidities
    DonorAssessment *-- SystemicInquiry
    DonorAssessment *-- Examination
    DonorAssessment *-- ImmunologicalDetails
    ImmunologicalDetails *-- HlaTyping
    ImmunologicalDetails *-- CrossMatch
```
