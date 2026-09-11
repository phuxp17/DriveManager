package com.drivemanager.storagehub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StorageHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(StorageHubApplication.class, args);
    }
}

