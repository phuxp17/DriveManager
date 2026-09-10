package com.drivemanager.storagehub.item;

import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@ResponseStatus(HttpStatus.NO_CONTENT)
public class ItemLifecycleController {
    private final ItemLifecycleService lifecycle;
    public ItemLifecycleController(ItemLifecycleService lifecycle) { this.lifecycle = lifecycle; }
    @PutMapping("/api/v1/items/{id}/review")
    void review(Principal p, @PathVariable UUID id) { lifecycle.review(p.getName(), id, true); }
    @DeleteMapping("/api/v1/items/{id}/review")
    void inbox(Principal p, @PathVariable UUID id) { lifecycle.review(p.getName(), id, false); }
    @PutMapping("/api/v1/items/{id}/archive")
    void archive(Principal p, @PathVariable UUID id) { lifecycle.archive(p.getName(), id, true); }
    @DeleteMapping("/api/v1/items/{id}/archive")
    void unarchive(Principal p, @PathVariable UUID id) { lifecycle.archive(p.getName(), id, false); }
    @DeleteMapping("/api/v1/items/{id}")
    void trash(Principal p, @PathVariable UUID id) { lifecycle.trash(p.getName(), id); }
    @PostMapping("/api/v1/trash/items/{id}/restore")
    void restore(Principal p, @PathVariable UUID id) { lifecycle.restore(p.getName(), id); }
    @DeleteMapping("/api/v1/trash/items/{id}")
    void purge(Principal p, @PathVariable UUID id) { lifecycle.purge(p.getName(), id); }
    @PutMapping("/api/v1/users/me/favorites/{id}")
    void favorite(Principal p, @PathVariable UUID id) { lifecycle.favorite(p.getName(), id, true); }
    @DeleteMapping("/api/v1/users/me/favorites/{id}")
    void unfavorite(Principal p, @PathVariable UUID id) { lifecycle.favorite(p.getName(), id, false); }
    @PostMapping("/api/v1/items/{id}/opens")
    void opened(Principal p, @PathVariable UUID id) { lifecycle.opened(p.getName(), id); }
}
