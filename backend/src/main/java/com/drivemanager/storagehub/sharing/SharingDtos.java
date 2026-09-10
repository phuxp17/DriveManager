package com.drivemanager.storagehub.sharing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class SharingDtos {
    private SharingDtos() {}

    public record CreateShareRequest(
            @NotNull Share.TargetType targetType,
            @NotNull UUID targetId,
            @NotBlank String recipientEmail
    ) {}

    public record ShareResponse(
            UUID id,
            UUID ownerId,
            String ownerEmail,
            Share.TargetType targetType,
            UUID targetId,
            String targetName,
            UUID recipientId,
            String recipientEmail,
            String permission,
            String status,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
