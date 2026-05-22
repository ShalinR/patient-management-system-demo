/*
 * ILLUSTRATIVE / REWRITTEN SAMPLE — not production source.
 *
 * Demonstrates the donor↔recipient matching pattern from the Kidney Transplant
 * module: a donor record carries an explicit status, and assignment is a single
 * transactional operation that keeps both the donor and the recipient consistent.
 * Field names are generalized and the code is simplified for readability.
 */
package com.example.clinic.transplant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DonorMatchingService {

    private final DonorRepository donors;
    private final RecipientRepository recipients;

    public DonorMatchingService(DonorRepository donors, RecipientRepository recipients) {
        this.donors = donors;
        this.recipients = recipients;
    }

    /** Donors that passed assessment and are not yet bound to a recipient. */
    public List<DonorDTO> findAvailableDonors() {
        return donors.findByStatus(DonorStatus.AVAILABLE).stream()
                .map(DonorDTO::from)
                .toList();
    }

    /**
     * Bind an available donor to a recipient. Both records are updated inside one
     * transaction, so the system can never end up in a half-matched state: either
     * the donor is marked assigned AND the recipient points back at it, or neither
     * change is persisted.
     */
    @Transactional
    public void assign(long donorId, long recipientId) {
        Donor donor = donors.findById(donorId)
                .orElseThrow(() -> new NotFoundException("Donor not found: " + donorId));
        Recipient recipient = recipients.findById(recipientId)
                .orElseThrow(() -> new NotFoundException("Recipient not found: " + recipientId));

        if (donor.getStatus() != DonorStatus.AVAILABLE) {
            throw new ConflictException("Donor is not available for assignment");
        }

        donor.setStatus(DonorStatus.ASSIGNED);
        donor.setAssignedRecipientRef(recipient.getReference());
        recipient.setAssignedDonor(donor);

        donors.save(donor);
        recipients.save(recipient);
    }

    /** Return a donor to the available pool, clearing both sides of the link. */
    @Transactional
    public void unassign(long donorId) {
        Donor donor = donors.findById(donorId)
                .orElseThrow(() -> new NotFoundException("Donor not found: " + donorId));

        recipients.findByAssignedDonor(donor)
                .ifPresent(r -> { r.setAssignedDonor(null); recipients.save(r); });

        donor.setStatus(DonorStatus.AVAILABLE);
        donor.setAssignedRecipientRef(null);
        donors.save(donor);
    }
}
