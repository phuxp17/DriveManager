package com.drivemanager.storagehub.item;

import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/items")
public class ItemFileController {

    private final ItemFileService fileService;

    public ItemFileController(ItemFileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/files/upload")
    public ResponseEntity<ItemDtos.ItemResponse> upload(
            Principal principal,
            @RequestParam("connectionId") UUID connectionId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description) {
        ItemDtos.ItemResponse response = fileService.upload(principal.getName(), connectionId, file, name, description);
        return ResponseEntity.created(URI.create("/api/v1/items/" + response.id())).body(response);
    }

    @PostMapping("/files/import")
    public ResponseEntity<ItemDtos.ItemResponse> importFile(
            Principal principal,
            @Valid @RequestBody ItemDtos.ImportFileRequest request) {
        ItemDtos.ItemResponse response = fileService.importExisting(principal.getName(), request);
        return ResponseEntity.created(URI.create("/api/v1/items/" + response.id())).body(response);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<StreamingResponseBody> download(
            Principal principal,
            @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
        return fileService.download(principal.getName(), id, rangeHeader);
    }
}
