package com.drivemanager.storagehub.collection;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    Optional<Collection> findByIdAndOwnerId(UUID id, UUID ownerId);
    List<Collection> findByOwnerIdAndParentIdAndDeletedAtIsNullOrderByNameAscIdAsc(UUID ownerId, UUID parentId);
    List<Collection> findByOwnerIdAndDeletedAtIsNull(UUID ownerId);
}
