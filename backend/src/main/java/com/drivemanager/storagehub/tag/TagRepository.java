package com.drivemanager.storagehub.tag;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface TagRepository extends JpaRepository<Tag,UUID>{Optional<Tag> findByIdAndOwnerId(UUID id,UUID ownerId); List<Tag> findByOwnerIdOrderByNameAsc(UUID ownerId);}
