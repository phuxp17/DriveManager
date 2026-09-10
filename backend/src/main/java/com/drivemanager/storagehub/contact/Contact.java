package com.drivemanager.storagehub.contact;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "contacts")
@IdClass(Contact.ContactId.class)
public class Contact {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "contact_user_id", nullable = false)
    private UUID contactUserId;

    @Column(length = 100)
    private String alias;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Contact() {}

    public Contact(UUID userId, UUID contactUserId, String alias) {
        this.userId = userId;
        this.contactUserId = contactUserId;
        this.alias = alias;
        this.createdAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public UUID getContactUserId() { return contactUserId; }
    public String getAlias() { return alias; }
    public void setAlias(String alias) { this.alias = alias; }
    public Instant getCreatedAt() { return createdAt; }

    public static class ContactId implements Serializable {
        private UUID userId;
        private UUID contactUserId;

        public ContactId() {}

        public ContactId(UUID userId, UUID contactUserId) {
            this.userId = userId;
            this.contactUserId = contactUserId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            ContactId contactId = (ContactId) o;
            return Objects.equals(userId, contactId.userId) && Objects.equals(contactUserId, contactId.contactUserId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, contactUserId);
        }
    }
}
