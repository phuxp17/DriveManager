package com.drivemanager.storagehub.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RateLimiterTest {
    @Test
    void keepsTheIpWindowCacheBounded() {
        RateLimitProperties properties = new RateLimitProperties();
        RateLimiter limiter = new RateLimiter(properties);
        for (int i = 0; i < 10_001; i++) limiter.tryAcquire("ip-" + i, 1);
        assertThat(limiter.size()).isLessThanOrEqualTo(10_000);
    }
}
