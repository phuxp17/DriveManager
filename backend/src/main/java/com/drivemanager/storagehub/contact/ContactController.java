package com.drivemanager.storagehub.contact;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContactDtos.ContactResponse addContact(Principal principal, @Valid @RequestBody ContactDtos.AddContactRequest request) {
        return contactService.addContact(principal.getName(), request);
    }

    @GetMapping
    public List<ContactDtos.ContactResponse> list(Principal principal) {
        return contactService.list(principal.getName());
    }

    @DeleteMapping("/{contactUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(Principal principal, @PathVariable UUID contactUserId) {
        contactService.remove(principal.getName(), contactUserId);
    }
}
