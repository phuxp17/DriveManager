package com.drivemanager.storagehub.contact;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class ContactDtos {
    private ContactDtos() {}

    public record AddContactRequest(
            @NotBlank String email,
            @Size(max = 100) String alias
    ) {}

    public record ContactResponse(
            UUID contactUserId,
            String email,
            String displayName,
            String alias,
            Instant createdAt
    ) {}
}
