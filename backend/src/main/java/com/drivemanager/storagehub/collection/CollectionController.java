package com.drivemanager.storagehub.collection;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/collections")
public class CollectionController {
    private final CollectionService service;
    public CollectionController(CollectionService service) { this.service = service; }
    record Create(@NotBlank @Size(max = 120) String name, UUID parentId) {}
    record Rename(@NotBlank @Size(max = 120) String name) {}
    record Move(UUID parentId) {}
    record ItemMove(@NotNull UUID sourceCollectionId, @NotNull UUID destinationCollectionId) {}

    @PostMapping
    ResponseEntity<Collection> create(Principal p, @Valid @RequestBody Create r) {
        return ResponseEntity.status(201).body(service.create(p.getName(), r.name(), r.parentId()));
    }
    @GetMapping
    List<Collection> list(Principal p, @RequestParam(required = false) UUID parentId) {
        return service.children(p.getName(), parentId);
    }
    @GetMapping("/{id}")
    Collection get(Principal p, @PathVariable UUID id) { return service.get(p.getName(), id); }
    @GetMapping("/{id}/ancestors")
    List<Collection> ancestors(Principal p, @PathVariable UUID id) { return service.ancestors(p.getName(), id); }
    @PatchMapping("/{id}")
    Collection rename(Principal p, @PathVariable UUID id, @Valid @RequestBody Rename r) {
        return service.rename(p.getName(), id, r.name());
    }
    @RequestMapping(path = "/{id}/items/{item}", method = {RequestMethod.PUT, RequestMethod.POST})
    ResponseEntity<Void> add(Principal p, @PathVariable UUID id, @PathVariable UUID item) {
        service.addItem(p.getName(), id, item); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{id}/items/{item}")
    ResponseEntity<Void> remove(Principal p, @PathVariable UUID id, @PathVariable UUID item) {
        service.removeItem(p.getName(), id, item); return ResponseEntity.noContent().build();
    }
    @PostMapping("/items/{item}/move")
    ResponseEntity<Void> moveItem(Principal p, @PathVariable UUID item, @Valid @RequestBody ItemMove r) {
        service.moveItem(p.getName(), item, r.sourceCollectionId(), r.destinationCollectionId());
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{id}/parent")
    ResponseEntity<Void> move(Principal p, @PathVariable UUID id, @Valid @RequestBody Move r) {
        service.moveCollection(p.getName(), id, r.parentId()); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(Principal p, @PathVariable UUID id) {
        service.delete(p.getName(), id); return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/restore")
    ResponseEntity<Void> restore(Principal p, @PathVariable UUID id) {
        service.restore(p.getName(), id); return ResponseEntity.noContent().build();
    }
}
