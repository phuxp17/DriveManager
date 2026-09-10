package com.drivemanager.storagehub.collection;

import com.drivemanager.storagehub.auth.AuthService;
import com.drivemanager.storagehub.common.error.OrganizationConflictException;
import com.drivemanager.storagehub.item.Item;
import com.drivemanager.storagehub.item.ItemNotFoundException;
import com.drivemanager.storagehub.item.ItemRepository;
import com.drivemanager.storagehub.user.ApplicationUserRepository;
import java.text.Normalizer;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CollectionService {
    private static final int MAX_DEPTH = 10;
    private final CollectionRepository collections;
    private final CollectionItemRepository memberships;
    private final ItemRepository items;
    private final AuthService auth;
    private final ApplicationUserRepository users;

    public CollectionService(CollectionRepository collections, CollectionItemRepository memberships,
                             ItemRepository items, AuthService auth, ApplicationUserRepository users) {
        this.collections = collections;
        this.memberships = memberships;
        this.items = items;
        this.auth = auth;
        this.users = users;
    }

    @Transactional
    public Collection create(String principal, String name, UUID parentId) {
        UUID owner = lockedOwner(principal);
        validateParent(owner, parentId, null);
        String clean = cleanName(name);
        return persist(new Collection(owner, clean, normalize(clean), parentId));
    }

    @Transactional(readOnly = true)
    public List<Collection> children(String principal, UUID parent) {
        UUID owner = auth.currentUser(principal).id();
        if (parent != null) active(owner, parent);
        return collections.findByOwnerIdAndParentIdAndDeletedAtIsNullOrderByNameAscIdAsc(owner, parent);
    }

    @Transactional(readOnly = true)
    public Collection get(String principal, UUID id) {
        return active(auth.currentUser(principal).id(), id);
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public List<Collection> ancestors(String principal, UUID id) {
        UUID owner = auth.currentUser(principal).id();
        Collection target = active(owner, id);
        List<Collection> path = new ArrayList<>();
        Set<UUID> visited = new HashSet<>();
        UUID cursor = target.getParentId();
        while (cursor != null) {
            if (!visited.add(cursor) || visited.size() >= MAX_DEPTH) throw new OrganizationConflictException();
            Collection parent = active(owner, cursor);
            path.add(parent);
            cursor = parent.getParentId();
        }
        Collections.reverse(path);
        return path;
    }

    @Transactional
    public Collection rename(String principal, UUID id, String name) {
        Collection collection = active(lockedOwner(principal), id);
        String clean = cleanName(name);
        collection.rename(clean, normalize(clean));
        return persist(collection);
    }

    @Transactional
    public void moveCollection(String principal, UUID id, UUID parentId) {
        UUID owner = lockedOwner(principal);
        Collection collection = active(owner, id);
        validateParent(owner, parentId, id);
        collection.parent(parentId);
        persist(collection);
    }

    @Transactional
    public void addItem(String principal, UUID collectionId, UUID itemId) {
        UUID owner = lockedOwner(principal);
        active(owner, collectionId);
        Item item = lockedItem(owner, itemId);
        if (memberships.add(collectionId, itemId, owner) > 0) item.markOrganizationChanged();
    }

    @Transactional
    public void removeItem(String principal, UUID collectionId, UUID itemId) {
        UUID owner = lockedOwner(principal);
        active(owner, collectionId);
        Item item = lockedItem(owner, itemId);
        if (memberships.remove(collectionId, itemId, owner) > 0) item.markOrganizationChanged();
    }

    @Transactional
    public void moveItem(String principal, UUID itemId, UUID source, UUID destination) {
        if (source == null || destination == null) throw new IllegalArgumentException();
        UUID owner = lockedOwner(principal);
        active(owner, source);
        active(owner, destination);
        Item item = lockedItem(owner, itemId);
        if (!memberships.exists(source, itemId, owner)) throw new NoSuchElementException();
        if (source.equals(destination)) return;
        memberships.add(destination, itemId, owner);
        memberships.remove(source, itemId, owner);
        item.markOrganizationChanged();
    }

    @Transactional
    public void delete(String principal, UUID id) {
        UUID owner = lockedOwner(principal);
        Collection collection = active(owner, id);
        var children = collections.findByOwnerIdAndParentIdAndDeletedAtIsNullOrderByNameAscIdAsc(owner, id);
        collection.delete();
        try {
            // Free its sibling name before reparenting children; a later conflict rolls this transaction back.
            collections.flush();
            for (Collection child : children) child.parent(collection.getParentId());
            collections.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new OrganizationConflictException();
        }
    }

    @Transactional
    public void restore(String principal, UUID id) {
        UUID owner = lockedOwner(principal);
        Collection collection = owned(owner, id);
        if (collection.getDeletedAt() == null) return;
        if (collection.getParentId() != null) {
            var parent = collections.findByIdAndOwnerId(collection.getParentId(), owner);
            if (parent.isEmpty() || parent.get().getDeletedAt() != null) collection.parent(null);
        }
        validateParent(owner, collection.getParentId(), id);
        collection.restore();
        persist(collection);
    }

    private void validateParent(UUID owner, UUID parent, UUID moving) {
        Set<UUID> visited = new HashSet<>();
        UUID cursor = parent;
        int parentDepth = 0;
        while (cursor != null) {
            if (cursor.equals(moving) || !visited.add(cursor)) throw new IllegalArgumentException("Collection cycle");
            cursor = active(owner, cursor).getParentId();
            if (++parentDepth >= MAX_DEPTH) throw new IllegalArgumentException("Collection depth");
        }
        int height = moving == null ? 1 : subtreeHeight(owner, moving);
        if (parentDepth + height > MAX_DEPTH) throw new IllegalArgumentException("Collection depth");
    }

    private int subtreeHeight(UUID owner, UUID root) {
        Map<UUID, List<UUID>> children = new HashMap<>();
        for (Collection c : collections.findByOwnerIdAndDeletedAtIsNull(owner)) {
            if (c.getParentId() != null) children.computeIfAbsent(c.getParentId(), k -> new ArrayList<>()).add(c.getId());
        }
        record Node(UUID id, int depth) {}
        var queue = new ArrayDeque<Node>();
        Set<UUID> visited = new HashSet<>();
        queue.add(new Node(root, 1));
        int max = 1;
        while (!queue.isEmpty()) {
            Node node = queue.remove();
            if (!visited.add(node.id()) || node.depth() > MAX_DEPTH) throw new IllegalArgumentException("Collection tree");
            max = Math.max(max, node.depth());
            for (UUID child : children.getOrDefault(node.id(), List.of())) queue.add(new Node(child, node.depth() + 1));
        }
        return max;
    }

    private Collection persist(Collection collection) {
        try { return collections.saveAndFlush(collection); }
        catch (DataIntegrityViolationException ex) { throw new OrganizationConflictException(); }
    }
    private Collection owned(UUID owner, UUID id) {
        return collections.findByIdAndOwnerId(id, owner).orElseThrow(NoSuchElementException::new);
    }
    private Collection active(UUID owner, UUID id) {
        Collection collection = owned(owner, id);
        if (collection.getDeletedAt() != null) throw new NoSuchElementException();
        return collection;
    }
    private Item lockedItem(UUID owner, UUID id) {
        Item item = items.findOwnedForUpdate(id, owner).orElseThrow(ItemNotFoundException::new);
        if (item.getDeletedAt() != null) throw new ItemNotFoundException();
        return item;
    }
    private UUID lockedOwner(String principal) {
        UUID owner = auth.currentUser(principal).id();
        // ponytail: serialize organization writes per user; finer locks only if measured contention warrants it.
        users.findByIdForUpdate(owner).orElseThrow(NoSuchElementException::new);
        return owner;
    }
    private static String cleanName(String name) {
        if (name == null) throw new IllegalArgumentException();
        String clean = Normalizer.normalize(name.strip(), Normalizer.Form.NFC);
        if (clean.isBlank() || clean.length() > 120 || normalize(clean).length() > 120) throw new IllegalArgumentException();
        return clean;
    }
    private static String normalize(String name) { return name.toLowerCase(Locale.ROOT); }
}
