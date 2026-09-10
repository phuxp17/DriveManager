package com.drivemanager.storagehub.contact;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.user.ApplicationUser;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {

    private final ContactRepository contacts;
    private final ApplicationUserRepository users;
    private final AuthService auth;

    public ContactService(ContactRepository contacts, ApplicationUserRepository users, AuthService auth) {
        this.contacts = contacts;
        this.users = users;
        this.auth = auth;
    }

    @Transactional
    public ContactDtos.ContactResponse addContact(String principal, ContactDtos.AddContactRequest request) {
        UUID currentUserId = auth.currentUser(principal).id();
        String normalized = request.email().strip().toLowerCase(Locale.ROOT);
        ApplicationUser targetUser = users.findByNormalizedEmail(normalized)
                .orElseThrow(() -> new IllegalArgumentException("User with email not found: " + request.email()));

        if (targetUser.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot add yourself as contact");
        }

        String alias = (request.alias() != null && !request.alias().strip().isEmpty())
                ? request.alias().strip() : null;

        Contact contact = contacts.findByUserIdAndContactUserId(currentUserId, targetUser.getId())
                .orElseGet(() -> new Contact(currentUserId, targetUser.getId(), alias));
        contact.setAlias(alias);

        contacts.save(contact);
        return new ContactDtos.ContactResponse(targetUser.getId(), targetUser.getEmail(),
                targetUser.getDisplayName(), contact.getAlias(), contact.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<ContactDtos.ContactResponse> list(String principal) {
        UUID currentUserId = auth.currentUser(principal).id();
        return contacts.findByUserIdOrderByCreatedAtDesc(currentUserId).stream()
                .map(c -> {
                    ApplicationUser u = users.findById(c.getContactUserId()).orElse(null);
                    if (u == null) return null;
                    return new ContactDtos.ContactResponse(u.getId(), u.getEmail(),
                            u.getDisplayName(), c.getAlias(), c.getCreatedAt());
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional
    public void remove(String principal, UUID contactUserId) {
        UUID currentUserId = auth.currentUser(principal).id();
        Contact contact = contacts.findByUserIdAndContactUserId(currentUserId, contactUserId)
                .orElseThrow(NoSuchElementException::new);
        contacts.delete(contact);
    }
}
