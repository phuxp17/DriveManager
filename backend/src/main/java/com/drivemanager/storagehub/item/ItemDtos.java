package com.drivemanager.storagehub.item;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class ItemDtos {
    private ItemDtos() {}
    public record CreateLink(@NotBlank @Size(max = 255) String name,
                             @Size(max = 10000) String description,
                             @NotBlank @Size(max = 8192) String url) {}
    public record PatchItem(@Size(max = 255) String name, @Size(max = 10000) String description,
                            @NotNull @PositiveOrZero Long expectedVersion) {}
    public record ImportFileRequest(@NotNull UUID connectionId, @NotBlank String driveFileId,
                                    @Size(max = 255) String name, @Size(max = 10000) String description) {}
    public record ItemResponse(UUID id, UUID ownerId, Item.Type type, String name, String description,
                               String url, String domain, Instant createdAt, Instant updatedAt, long version,
                               Instant reviewedAt, Instant archivedAt, Instant deletedAt,
                               String originalFilename, String mimeType, Long sizeBytes) {
        public ItemResponse(UUID id, UUID ownerId, Item.Type type, String name, String description,
                            String url, String domain, Instant createdAt, Instant updatedAt, long version,
                            Instant reviewedAt, Instant archivedAt, Instant deletedAt) {
            this(id, ownerId, type, name, description, url, domain, createdAt, updatedAt, version, reviewedAt, archivedAt, deletedAt, null, null, null);
        }
    }
}
