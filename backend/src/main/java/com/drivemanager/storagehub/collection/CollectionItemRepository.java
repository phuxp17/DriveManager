package com.drivemanager.storagehub.collection;
import java.util.*; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.Repository;
public interface CollectionItemRepository extends Repository<Collection,UUID>{
 @Modifying @Query(value="INSERT INTO collection_items(collection_id,item_id,owner_id,added_at) VALUES (:c,:i,:o,now()) ON CONFLICT DO NOTHING",nativeQuery=true) int add(UUID c,UUID i,UUID o);
 @Modifying @Query(value="DELETE FROM collection_items WHERE collection_id=:c AND item_id=:i AND owner_id=:o",nativeQuery=true) int remove(UUID c,UUID i,UUID o);
 @Query(value="SELECT EXISTS(SELECT 1 FROM collection_items WHERE collection_id=:c AND item_id=:i AND owner_id=:o)",nativeQuery=true) boolean exists(UUID c,UUID i,UUID o);
 @Query(value="SELECT collection_id FROM collection_items WHERE item_id=:itemId",nativeQuery=true) List<UUID> findCollectionIdsByItemId(UUID itemId);
}
