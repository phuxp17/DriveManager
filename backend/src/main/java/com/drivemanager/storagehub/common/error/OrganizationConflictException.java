package com.drivemanager.storagehub.common.error;

public class OrganizationConflictException extends RuntimeException {
    public OrganizationConflictException() { super(); }
    public OrganizationConflictException(String message) { super(message); }
}
