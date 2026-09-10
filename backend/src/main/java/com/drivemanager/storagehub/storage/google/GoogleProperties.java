package com.drivemanager.storagehub.storage.google;
import org.springframework.boot.context.properties.ConfigurationProperties;
@ConfigurationProperties("storage.google")
public class GoogleProperties {
    private String clientId = ""; private String clientSecret = ""; private String redirectUri = "";
    public String getClientId(){return clientId;} public void setClientId(String value){clientId=value;}
    public String getClientSecret(){return clientSecret;} public void setClientSecret(String value){clientSecret=value;}
    public String getRedirectUri(){return redirectUri;} public void setRedirectUri(String value){redirectUri=value;}
    public boolean configured(){return !clientId.isBlank() && !clientSecret.isBlank() && !redirectUri.isBlank();}
}
