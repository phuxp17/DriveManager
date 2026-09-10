package com.drivemanager.storagehub.item;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface ItemRepository extends JpaRepository<Item, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Item i where i.id = :id and i.ownerId = :ownerId")
    Optional<Item> findOwnedForUpdate(UUID id, UUID ownerId);
    @EntityGraph(attributePaths = {"link", "file"})
    Optional<Item> findByIdAndDeletedAtIsNull(UUID id);
    @EntityGraph(attributePaths = {"link", "file"})
    Optional<Item> findByIdAndOwnerIdAndDeletedAtIsNull(UUID id, UUID ownerId);
    @EntityGraph(attributePaths = {"link", "file"})
    Page<Item> findByOwnerIdAndDeletedAtIsNull(UUID ownerId, Pageable pageable);
}
