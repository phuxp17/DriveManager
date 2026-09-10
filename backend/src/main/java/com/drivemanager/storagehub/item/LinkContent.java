package com.drivemanager.storagehub.item;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "link_contents")
public class LinkContent {
    @Id @Column(name = "item_id") private UUID itemId;
    @MapsId @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "item_id") private Item item;
    @Column(nullable = false, columnDefinition = "text") private String url;
    @Column(nullable = false, length = 253) private String domain;
    protected LinkContent() {}
    LinkContent(Item item, String url, String domain) {
        this.item = item;
        this.url = url;
        this.domain = domain;
    }
    public String getUrl() { return url; }
    public String getDomain() { return domain; }
}
