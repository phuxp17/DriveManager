package com.drivemanager.storagehub.item;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileContentRepository extends JpaRepository<FileContent, UUID> {
    Optional<FileContent> findByItemId(UUID itemId);
}
