# Connection credential encryption

BE-005 foundation only: OAuth endpoints, credential persistence and provider refresh are not implemented yet.

`CredentialCipher` uses JDK AES-256-GCM, a fresh 12-byte random nonce per encryption and a 128-bit authentication tag. Its authenticated context includes the refresh-token purpose, format, key version and storage connection UUID. Moving ciphertext to another connection, modifying its version/content or using a wrong key fails closed.

Store the returned envelope in a connection-owned `bytea` field. Format: one byte format, four-byte big-endian key version, twelve-byte nonce, then ciphertext and GCM tag. Never serialize the plaintext credential into an API response or log. Java strings cannot be reliably erased; decrypted tokens must remain short-lived local variables and never enter session state.

Configure `storage.credentials.active-version` and `storage.credentials.keys.<version>` through an external Spring configuration/secret mount. Values in the key map are Base64-encoded random 32-byte keys. Do not commit real keys, place them on command lines, or store them in the credential database. The default empty keyring permits application functions without Google; encryption/decryption fails until configured. Invalid configured keys prevent bean creation with a sanitized error.

Rotation: add a new version, retain all old versions, switch active version, then re-encrypt stored credentials through a separately implemented migration job. Only retire old keys after checking no stored envelope uses them. This change supplies version support, not a rotation job or key management service.

Focused tests cover randomized encryption, round trips, connection binding, tampering, rotation, unavailable versions, malformed envelopes and invalid configuration. Live Google authorization is not exercised.
