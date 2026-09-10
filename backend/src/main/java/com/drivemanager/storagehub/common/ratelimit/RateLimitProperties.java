package com.drivemanager.storagehub.common.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private int authLimit = 60;
    private int uploadLimit = 60;
    private int sharesLimit = 60;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getAuthLimit() {
        return authLimit;
    }

    public void setAuthLimit(int authLimit) {
        this.authLimit = authLimit;
    }

    public int getUploadLimit() {
        return uploadLimit;
    }

    public void setUploadLimit(int uploadLimit) {
        this.uploadLimit = uploadLimit;
    }

    public int getSharesLimit() {
        return sharesLimit;
    }

    public void setSharesLimit(int sharesLimit) {
        this.sharesLimit = sharesLimit;
    }
}
