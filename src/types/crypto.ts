/**
 * Cryptography-related types
 */

export interface EncryptedPackage {
    /** Encrypted payload data */
    encrypted_payload: string;

    /** Encrypted AES key (encrypted with server's RSA public key) */
    encrypted_aes_key: string;

    /** Client's public key in PEM format */
    client_public_key: string;

    /** Unique identifier for this encrypted package */
    payload_id: string;

    /** Nonce/IV used for AES encryption (base64 encoded) */
    nonce: string;
}

export interface ProtectionInfo {
    /** Whether memory can be locked (mlock) */
    canLock: boolean;

    /** Whether the platform provides secure memory protection */
    isPlatformSecure: boolean;

    /** Method used for memory protection */
    method: 'mlock' | 'zero-only' | 'none';

    /** Additional information about protection status */
    details?: string;
}

export interface SecureMemoryConfig {
    /** Enable secure memory protection */
    enabled: boolean;

    /** Prefer native addon if available (Node.js only) */
    preferNative?: boolean;
}
