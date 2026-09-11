package com.drivemanager.storagehub.storage.connection;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StorageConnectionRepository extends JpaRepository<StorageConnection, UUID> {
    List<StorageConnection> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
    Optional<StorageConnection> findByIdAndOwnerId(UUID id, UUID ownerId);
    Optional<StorageConnection> findByOwnerIdAndProviderAndProviderIssuerAndProviderSubject(UUID ownerId, String provider, String issuer, String subject);
    List<StorageConnection> findByStatus(String status);
}
