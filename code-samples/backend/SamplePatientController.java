package com.example.clinic.controller;

import com.example.clinic.dto.PatientProfileDTO;
import com.example.clinic.dto.PatientCreateRequest;
import com.example.clinic.dto.PatientResponse;
import com.example.clinic.model.Patient;
import com.example.clinic.services.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Sample REST controller showing the conventions used across the API:
 *
 *   - Class-level @PreAuthorize: every endpoint requires authentication.
 *   - Method-level @PreAuthorize for elevated operations (delete).
 *   - Current user/role threaded into the service for audit logging.
 *   - DTOs in, DTOs out — entities never cross the controller boundary.
 *
 * All identifiers and patient data in this sample are fictional.
 *
 * Example request:
 *   GET /api/patients/PHN-0001/profile
 *   Cookie: AUTH-TOKEN=...
 *
 * Example response (truncated):
 *   {
 *     "phn": "PHN-0001",
 *     "fullName": "John Doe",
 *     "dateOfBirth": "1980-01-01",
 *     ...
 *   }
 */
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class SamplePatientController {

    private final PatientService service;

    @PostMapping
    public ResponseEntity<PatientResponse> create(@RequestBody PatientCreateRequest request) {
        Patient saved = service.create(request, currentUsername(), currentRole());
        return ResponseEntity.ok(PatientResponse.from(saved));
    }

    @GetMapping("/{phn}/profile")
    public ResponseEntity<PatientProfileDTO> getProfile(@PathVariable String phn) {
        service.audit(currentUsername(), currentRole(), "VIEW", phn, "Viewed patient profile");
        Optional<PatientProfileDTO> profile = service.getProfile(phn);
        return profile.map(ResponseEntity::ok)
                      .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id, currentUsername(), currentRole());
        return ResponseEntity.noContent().build();
    }

    private String currentUsername() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return (a != null && a.isAuthenticated() && !"anonymousUser".equals(a.getName()))
                ? a.getName() : "SYSTEM";
    }

    private String currentRole() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.isAuthenticated() && !a.getAuthorities().isEmpty()) {
            return a.getAuthorities().iterator().next().getAuthority();
        }
        return "SYSTEM";
    }
}
