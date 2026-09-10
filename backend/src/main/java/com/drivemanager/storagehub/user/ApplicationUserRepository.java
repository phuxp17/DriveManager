package com.drivemanager.storagehub.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface ApplicationUserRepository extends JpaRepository<ApplicationUser, UUID> {

    Optional<ApplicationUser> findByNormalizedEmail(String normalizedEmail);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ApplicationUser> findByEmailVerificationTokenHash(String tokenHash);

    boolean existsByNormalizedEmail(String normalizedEmail);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from ApplicationUser u where u.id = :id")
    Optional<ApplicationUser> findByIdForUpdate(UUID id);
}
