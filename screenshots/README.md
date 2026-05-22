# Screenshots

This folder holds UI screenshots for the portfolio. **Every image must use
fictional data only** — no real patient names, identifiers, dates of birth,
or clinical notes from the production system.

## Capture guidelines

Before taking a screenshot:

1. Seed a fresh local DB with the dummy dataset (see `seed-data` below).
2. Log in as the relevant fictional role account.
3. Confirm the URL bar shows `localhost` — never the production host.
4. Blur or crop out any element that could reveal an internal hostname, IP,
   or environment banner.

## Recommended shots

| Filename                       | What to show                                        |
| ------------------------------ | --------------------------------------------------- |
| `01-login.png`                 | Login page, branding generic                        |
| `02-dashboard.png`             | Role-aware dashboard for `DOCTOR` user              |
| `03-patient-profile.png`       | `John Doe` (PHN-0001) profile page                  |
| `04-admissions-list.png`       | Ward list with 3-4 dummy patients                   |
| `05-form-multistep.png`        | Multi-section clinical form with dummy entries      |
| `06-audit-log.png`             | Audit log as ADMIN, showing fictional activity      |
| `07-role-comparison.png`       | Side-by-side: same page as DOCTOR vs NURSE          |

## Dummy data to use

```
Patients:
  PHN-0001  John Doe         M  DOB 1980-01-01
  PHN-0002  Jane Roe         F  DOB 1975-05-20
  PHN-0003  Alex Sample      X  DOB 1992-11-03

Users:
  admin@example.test    role=ADMIN
  doctor@example.test   role=DOCTOR
  nurse@example.test    role=NURSE
```

Add the actual `.png` files here once captured. Keep file sizes reasonable
(< 500 KB each); compress with TinyPNG or `oxipng` if needed.
