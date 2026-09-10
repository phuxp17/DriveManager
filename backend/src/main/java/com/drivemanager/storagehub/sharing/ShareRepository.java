package com.drivemanager.storagehub.sharing;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShareRepository extends JpaRepository<Share, UUID> {

    List<Share> findByRecipientIdAndStatusInOrderByCreatedAtDesc(UUID recipientId, Collection<Share.Status> statuses);

    List<Share> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

    Optional<Share> findByIdAndRecipientId(UUID id, UUID recipientId);

    Optional<Share> findByIdAndOwnerId(UUID id, UUID ownerId);

    boolean existsByItemIdAndRecipientIdAndStatus(UUID itemId, UUID recipientId, Share.Status status);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Share s "
            + "WHERE s.recipientId = :recipientId AND s.status = 'ACCEPTED' AND s.targetType = 'COLLECTION' "
            + "AND s.collectionId IN :collectionIds")
    boolean existsAcceptedForAnyCollection(@Param("recipientId") UUID recipientId, @Param("collectionIds") Collection<UUID> collectionIds);

    @Query("SELECT s.itemId FROM Share s WHERE s.recipientId = :recipientId AND s.status = 'ACCEPTED' AND s.targetType = 'ITEM'")
    List<UUID> findDirectSharedItemIds(@Param("recipientId") UUID recipientId);

    @Query("SELECT s.collectionId FROM Share s WHERE s.recipientId = :recipientId AND s.status = 'ACCEPTED' AND s.targetType = 'COLLECTION'")
    List<UUID> findDirectSharedCollectionIds(@Param("recipientId") UUID recipientId);

    List<Share> findByItemIdAndRecipientIdAndStatusIn(UUID itemId, UUID recipientId, Collection<Share.Status> statuses);

    List<Share> findByCollectionIdAndRecipientIdAndStatusIn(UUID collectionId, UUID recipientId, Collection<Share.Status> statuses);
}
