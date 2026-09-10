package com.drivemanager.storagehub.sharing;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/shares")
public class ShareController {

    private final SharingService sharingService;

    public ShareController(SharingService sharingService) {
        this.sharingService = sharingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SharingDtos.ShareResponse create(Principal principal, @Valid @RequestBody SharingDtos.CreateShareRequest request) {
        return sharingService.createShare(principal.getName(), request);
    }

    @GetMapping("/incoming")
    public List<SharingDtos.ShareResponse> listIncoming(Principal principal) {
        return sharingService.listIncomingShares(principal.getName());
    }

    @GetMapping("/outgoing")
    public List<SharingDtos.ShareResponse> listOutgoing(Principal principal) {
        return sharingService.listOutgoingShares(principal.getName());
    }

    @PostMapping("/{id}/accept")
    public SharingDtos.ShareResponse accept(Principal principal, @PathVariable UUID id) {
        return sharingService.acceptShare(principal.getName(), id);
    }

    @PostMapping("/{id}/reject")
    public SharingDtos.ShareResponse reject(Principal principal, @PathVariable UUID id) {
        return sharingService.rejectShare(principal.getName(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeOrLeave(Principal principal, @PathVariable UUID id) {
        sharingService.revokeOrLeave(principal.getName(), id);
    }
}
