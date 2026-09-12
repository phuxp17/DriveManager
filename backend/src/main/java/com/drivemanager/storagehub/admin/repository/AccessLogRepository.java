package com.drivemanager.storagehub.admin.repository;

import com.drivemanager.storagehub.admin.model.AccessLog;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, UUID> {

    long countByTimestampAfter(Instant since);

    @Query("SELECT COUNT(DISTINCT a.clientIp) FROM AccessLog a")
    long countDistinctClientIp();

    @Query("SELECT COUNT(DISTINCT a.clientIp) FROM AccessLog a WHERE a.timestamp >= :since")
    long countDistinctClientIpSince(@Param("since") Instant since);

    @Query("SELECT COUNT(a) FROM AccessLog a WHERE a.statusCode >= :minStatus AND a.statusCode <= :maxStatus")
    long countByStatusCodeRange(@Param("minStatus") int minStatus, @Param("maxStatus") int maxStatus);

    @Query("SELECT COUNT(a) FROM AccessLog a WHERE a.timestamp >= :since AND a.statusCode >= :minStatus AND a.statusCode <= :maxStatus")
    long countByStatusCodeRangeSince(@Param("since") Instant since, @Param("minStatus") int minStatus, @Param("maxStatus") int maxStatus);

    @Query("SELECT AVG(a.durationMs) FROM AccessLog a WHERE a.timestamp >= :since")
    Double averageDurationMsSince(@Param("since") Instant since);

    @Query("SELECT a.path, COUNT(a) as cnt FROM AccessLog a WHERE a.timestamp >= :since GROUP BY a.path ORDER BY cnt DESC LIMIT :limit")
    List<Object[]> findTopPathsSince(@Param("since") Instant since, @Param("limit") int limit);

    Page<AccessLog> findAllByOrderByTimestampDesc(Pageable pageable);

    @Query("SELECT a FROM AccessLog a WHERE " +
           "(:path IS NULL OR LOWER(a.path) LIKE LOWER(CONCAT('%', :path, '%'))) AND " +
           "(:status IS NULL OR a.statusCode = :status) AND " +
           "(:ip IS NULL OR a.clientIp LIKE CONCAT('%', :ip, '%')) " +
           "ORDER BY a.timestamp DESC")
    Page<AccessLog> filterLogs(
            @Param("path") String path,
            @Param("status") Integer status,
            @Param("ip") String ip,
            Pageable pageable);

    @Query("SELECT a FROM AccessLog a WHERE a.timestamp >= :since ORDER BY a.timestamp ASC")
    List<AccessLog> findRecentLogsForTimeline(@Param("since") Instant since);
}
