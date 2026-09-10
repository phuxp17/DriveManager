package com.drivemanager.storagehub.tag;

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
@RequestMapping("/api/v1/tags")
public class TagController {
    private final TagService service;
    public TagController(TagService service) { this.service = service; }
    record Create(@NotBlank @Size(max = 64) String name, @Size(max = 7) String color) {}
    record Merge(@NotNull UUID targetId) {}

    @GetMapping
    List<Tag> list(Principal p) { return service.list(p.getName()); }
    @PostMapping
    ResponseEntity<Tag> create(Principal p, @Valid @RequestBody Create r) {
        return ResponseEntity.status(201).body(service.create(p.getName(), r.name(), r.color()));
    }
    @PatchMapping("/{id}")
    Tag rename(Principal p, @PathVariable UUID id, @Valid @RequestBody Create r) {
        return service.rename(p.getName(), id, r.name(), r.color());
    }
    @RequestMapping(path = "/{id}/items/{item}", method = {RequestMethod.PUT, RequestMethod.POST})
    ResponseEntity<Void> add(Principal p, @PathVariable UUID id, @PathVariable UUID item) {
        service.add(p.getName(), item, id); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{id}/items/{item}")
    ResponseEntity<Void> remove(Principal p, @PathVariable UUID id, @PathVariable UUID item) {
        service.remove(p.getName(), item, id); return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/merge")
    ResponseEntity<Void> merge(Principal p, @PathVariable UUID id, @Valid @RequestBody Merge r) {
        service.merge(p.getName(), id, r.targetId()); return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(Principal p, @PathVariable UUID id) {
        service.delete(p.getName(), id); return ResponseEntity.noContent().build();
    }
}
