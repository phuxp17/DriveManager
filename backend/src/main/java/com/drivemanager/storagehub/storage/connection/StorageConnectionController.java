package com.drivemanager.storagehub.storage.connection;

import com.drivemanager.storagehub.storage.google.GoogleDriveSyncService;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/storage-connections")
public class StorageConnectionController {
    private final StorageOAuthService service;
    private final GoogleDriveSyncService syncService;

    public StorageConnectionController(StorageOAuthService service, GoogleDriveSyncService syncService) {
        this.service = service;
        this.syncService = syncService;
    }

    @GetMapping
    public List<StorageConnectionDtos.ConnectionResponse> list(Authentication a) {
        return service.list(a.getName());
    }

    @PostMapping("/google/connect")
    public StorageConnectionDtos.ConnectResponse connect(Authentication a, HttpSession s) {
        return new StorageConnectionDtos.ConnectResponse(service.begin(a.getName(), s.getId(), null));
    }

    @PostMapping("/{id}/reconnect")
    public StorageConnectionDtos.ConnectResponse reconnect(@PathVariable UUID id, Authentication a, HttpSession s) {
        return new StorageConnectionDtos.ConnectResponse(service.begin(a.getName(), s.getId(), id));
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> callback(@RequestParam String state,
                                         @RequestParam(required = false) String code,
                                         @RequestParam(required = false) String error,
                                         Authentication a,
                                         HttpSession s) {
        if (error != null || code == null) throw new IllegalArgumentException("Google authorization was not completed");
        var pending = service.consume(a.getName(), s.getId(), state);
        UUID connectionId = service.complete(pending, code);
        syncService.syncConnectionAsync(connectionId);
        return ResponseEntity.noContent().header(HttpHeaders.CACHE_CONTROL, "no-store").build();
    }

    @PostMapping("/{id}/sync")
    public StorageConnectionDtos.SyncResultResponse sync(@PathVariable UUID id, Authentication a) {
        var res = syncService.syncConnection(id);
        return new StorageConnectionDtos.SyncResultResponse(res.newItems(), res.updatedItems(), res.totalItems());
    }

    @PostMapping("/sync-all")
    public StorageConnectionDtos.SyncResultResponse syncAll(Authentication a) {
        var res = syncService.syncAllUserConnections(a.getName());
        return new StorageConnectionDtos.SyncResultResponse(res.newItems(), res.updatedItems(), res.totalItems());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnect(@PathVariable UUID id, Authentication a) {
        service.disconnect(a.getName(), id);
    }
}

