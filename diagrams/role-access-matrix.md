# Role-Based Access Matrix

Coarse roles with method-level overrides. Default-deny: any endpoint not
explicitly permitted requires authentication, and sensitive operations
require an explicit `@PreAuthorize` annotation.

| Resource / Action               | ADMIN | DOCTOR | NURSE |
| ------------------------------- | :---: | :----: | :---: |
| Login / logout                  |  ✔   |   ✔   |  ✔   |
| View patient profile            |  ✔   |   ✔   |  ✔   |
| Create patient                  |  ✔   |   ✔   |  ✔   |
| Update clinical records         |  ✔   |   ✔   |  ✔   |
| Update observations / schedule  |  ✔   |   ✔   |  ✔   |
| Delete patient                  |  ✔   |   ✗   |  ✗   |
| Create / disable users          |  ✔   |   ✗   |  ✗   |
| View audit log                  |  ✔   |   ✗   |  ✗   |
| Update system configuration     |  ✔   |   ✗   |  ✗   |

## How it's enforced

```java
// SecurityConfig.java — path-level baseline
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers("OPTIONS", "/**").permitAll()
    .anyRequest().authenticated()
)

// Per-method — admin-only operations
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
public ResponseEntity<Void> deletePatient(...) { ... }
```

## On the frontend

The `AuthContext` exposes `user.role`. Components and routes can conditionally
render or gate based on role, but the frontend never assumes a UI guard is
sufficient — the API is the source of truth for authorization. The UI only
hides what the API would reject anyway.
