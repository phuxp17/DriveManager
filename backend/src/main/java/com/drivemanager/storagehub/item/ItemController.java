package com.drivemanager.storagehub.item;

import com.drivemanager.storagehub.item.ItemDtos.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/items")
public class ItemController {
    private final ItemService items;
    private final ItemViewsService views;
    public ItemController(ItemService items, ItemViewsService views) { this.items = items; this.views = views; }

    @PostMapping("/links")
    ResponseEntity<ItemResponse> createLink(Principal principal, @Valid @RequestBody CreateLink request) {
        var result = items.createLink(principal.getName(), request);
        return ResponseEntity.created(java.net.URI.create("/api/v1/items/" + result.id())).body(result);
    }
    @GetMapping
    ItemViewsService.Page list(Principal principal, @RequestParam(defaultValue = "active") String view,
                              @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size,
                              @RequestParam(required = false) String q, @RequestParam(required = false) String type,
                              @RequestParam(required = false) java.util.List<String> tags,
                              @RequestParam(required = false) UUID collectionId,
                              @RequestParam(required = false) Boolean favorite,
                              @RequestParam(required = false) java.time.Instant createdFrom,
                              @RequestParam(required = false) java.time.Instant createdBefore,
                              @RequestParam(required = false) String sort,
                              @RequestParam(required = false) UUID connectionId) {
        return views.list(principal.getName(), view, page, size,
                new ItemViewsService.Filters(q, type, tags, collectionId, favorite, createdFrom, createdBefore, sort, connectionId));
    }
    @GetMapping("/{id}")
    ItemResponse get(Principal principal, @PathVariable UUID id) { return items.get(principal.getName(), id); }
    @PatchMapping("/{id}")
    ItemResponse patch(Principal principal, @PathVariable UUID id, @Valid @RequestBody PatchItem request) {
        return items.patch(principal.getName(), id, request);
    }
}
