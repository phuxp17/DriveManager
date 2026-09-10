package com.drivemanager.storagehub.storage.connection;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OAuthAuthorizationRepository extends JpaRepository<OAuthAuthorization, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from OAuthAuthorization a where a.stateDigest = :digest")
    Optional<OAuthAuthorization> lockByStateDigest(@Param("digest") byte[] digest);
}
