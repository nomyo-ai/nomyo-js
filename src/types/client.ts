/**
 * Client configuration types
 */

export interface ClientConfig {
    /** Base URL of the NOMYO router (e.g., https://api.nomyo.ai:12434) */
    routerUrl: string;

    /** Allow HTTP connections (ONLY for local development, never in production) */
    allowHttp?: boolean;

    /** Enable secure memory protection (zeroing) */
    secureMemory?: boolean;

    /** RSA key size in bits (2048 or 4096) */
    keySize?: 2048 | 4096;

    /** Optional API key for authentication */
    apiKey?: string;
}

export interface KeyGenOptions {
    /** RSA key size in bits */
    keySize?: 2048 | 4096;

    /** Save keys to file system (Node.js only) */
    saveToFile?: boolean;

    /** Directory to save keys (default: 'client_keys') */
    keyDir?: string;

    /** Password to encrypt private key (recommended for production) */
    password?: string;
}

export interface KeyPaths {
    /** Path to private key file */
    privateKeyPath: string;

    /** Path to public key file (optional, will derive from private key path) */
    publicKeyPath?: string;
}

export interface ChatCompletionConfig {
    /** Base URL of the NOMYO router */
    baseUrl?: string;

    /** Allow HTTP connections */
    allowHttp?: boolean;

    /** API key for authentication */
    apiKey?: string;

    /** Enable secure memory protection */
    secureMemory?: boolean;
}
