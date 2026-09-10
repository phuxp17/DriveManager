package com.drivemanager.storagehub.contact;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRepository extends JpaRepository<Contact, Contact.ContactId> {
    List<Contact> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Contact> findByUserIdAndContactUserId(UUID userId, UUID contactUserId);
    boolean existsByUserIdAndContactUserId(UUID userId, UUID contactUserId);
}
