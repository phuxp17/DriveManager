package com.drivemanager.storagehub.storage.connection;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/storage-connections")
public class StorageConnectionController {
    private final StorageOAuthService service; public StorageConnectionController(StorageOAuthService service){this.service=service;}
    @GetMapping public List<StorageConnectionDtos.ConnectionResponse> list(Authentication a){return service.list(a.getName());}
    @PostMapping("/google/connect") public StorageConnectionDtos.ConnectResponse connect(Authentication a,HttpSession s){return new StorageConnectionDtos.ConnectResponse(service.begin(a.getName(),s.getId(),null));}
    @PostMapping("/{id}/reconnect") public StorageConnectionDtos.ConnectResponse reconnect(@PathVariable UUID id,Authentication a,HttpSession s){return new StorageConnectionDtos.ConnectResponse(service.begin(a.getName(),s.getId(),id));}
    @GetMapping("/google/callback") public ResponseEntity<Void> callback(@RequestParam String state,@RequestParam(required=false) String code,@RequestParam(required=false) String error,Authentication a,HttpSession s){ if(error!=null||code==null) throw new IllegalArgumentException("Google authorization was not completed"); var pending=service.consume(a.getName(),s.getId(),state); service.complete(pending,code); return ResponseEntity.noContent().header(HttpHeaders.CACHE_CONTROL,"no-store").build(); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void disconnect(@PathVariable UUID id,Authentication a){service.disconnect(a.getName(),id);}
}
