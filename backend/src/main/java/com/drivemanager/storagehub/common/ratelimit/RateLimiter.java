package com.drivemanager.storagehub.common.ratelimit;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(RateLimitProperties.class)
public class RateLimiter {

    private static final long WINDOW_MILLIS = 60_000L;
    private static final int MAX_ENTRIES = 10_000;

    private final RateLimitProperties properties;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(RateLimitProperties properties) {
        this.properties = properties;
    }

    public synchronized boolean tryAcquire(String key, int limitPerMinute) {
        if (!properties.isEnabled() || limitPerMinute <= 0) {
            return true;
        }
        long now = System.currentTimeMillis();
        pruneIfOversized(now);

        Window window = windows.get(key);
        if (window == null) {
            if (windows.size() >= MAX_ENTRIES) {
                windows.keySet().stream().findFirst().ifPresent(windows::remove);
            }
            window = new Window();
            windows.put(key, window);
        }
        return window.tryAcquire(now, limitPerMinute, WINDOW_MILLIS);
    }

    public void reset() {
        windows.clear();
    }

    int size() {
        return windows.size();
    }

    private void pruneIfOversized(long now) {
        if (windows.size() > MAX_ENTRIES) {
            windows.entrySet().removeIf(entry -> entry.getValue().isExpired(now, WINDOW_MILLIS));
        }
    }

    private static final class Window {
        private final ConcurrentLinkedDeque<Long> timestamps = new ConcurrentLinkedDeque<>();

        synchronized boolean tryAcquire(long now, int limit, long windowMillis) {
            long cutoff = now - windowMillis;
            while (!timestamps.isEmpty() && timestamps.peekFirst() <= cutoff) {
                timestamps.pollFirst();
            }
            if (timestamps.size() < limit) {
                timestamps.addLast(now);
                return true;
            }
            return false;
        }

        synchronized boolean isExpired(long now, long windowMillis) {
            return timestamps.isEmpty() || (timestamps.peekLast() <= now - windowMillis);
        }
    }
}
