package com.drivemanager.storagehub.collection;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="collections") public class Collection {
 @Id private UUID id; @Column(name="owner_id",nullable=false) private UUID ownerId; @Column(name="parent_id") private UUID parentId;
 @Column(nullable=false) private String name; @Column(name="normalized_name",nullable=false) private String normalizedName;
 @Column(name="deleted_at") private Instant deletedAt; @Column(name="created_at",nullable=false) private Instant createdAt; @Column(name="updated_at",nullable=false) private Instant updatedAt; @Version private long version;
 protected Collection(){} Collection(UUID owner,String name,String normalized,UUID parent){id=UUID.randomUUID();ownerId=owner;this.name=name;normalizedName=normalized;parentId=parent;createdAt=updatedAt=Instant.now();}
 void parent(UUID id){parentId=id;updatedAt=Instant.now();} void delete(){deletedAt=Instant.now();updatedAt=deletedAt;} void restore(){deletedAt=null;updatedAt=Instant.now();}
 void rename(String value,String normalized){name=value;normalizedName=normalized;updatedAt=Instant.now();}
 public long getVersion(){return version;}
 public UUID getId(){return id;} public UUID getOwnerId(){return ownerId;} public UUID getParentId(){return parentId;} public String getName(){return name;} public Instant getDeletedAt(){return deletedAt;}
}
