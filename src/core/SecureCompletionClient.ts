/**
 * Secure Completion Client
 * Main client class for encrypted communication with NOMYO router
 * 
 * Port of Python's SecureCompletionClient with full API compatibility
 */

import { ClientConfig } from '../types/client';
import { EncryptedPackage } from '../types/crypto';
import { KeyManager } from './crypto/keys';
import { AESEncryption } from './crypto/encryption';
import { RSAOperations } from './crypto/rsa';
import { createHttpClient, HttpClient } from './http/client';
import { createSecureMemory, SecureByteContext } from './memory/secure';
import { SecurityError, APIConnectionError } from '../errors';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    stringToArrayBuffer,
    arrayBufferToString,
} from './crypto/utils';

export class SecureCompletionClient {
    private routerUrl: string;
    private allowHttp: boolean;
    private secureMemory: boolean;
    private keyManager: KeyManager;
    private aes: AESEncryption;
    private rsa: RSAOperations;
    private httpClient: HttpClient;
    private secureMemoryImpl = createSecureMemory();

    constructor(config: ClientConfig = { routerUrl: 'https://api.nomyo.ai:12434' }) {
        const {
            routerUrl = 'https://api.nomyo.ai:12434',
            allowHttp = false,
            secureMemory = true,
            keySize = 4096,
        } = config;

        this.routerUrl = routerUrl.replace(/\/$/, ''); // Remove trailing slash
        this.allowHttp = allowHttp;
        this.secureMemory = secureMemory;

        // Validate HTTPS for security
        if (!this.routerUrl.startsWith('https://')) {
            if (!allowHttp) {
                console.warn(
                    '⚠️  WARNING: Using HTTP instead of HTTPS. ' +
                    'This is INSECURE and should only be used for local development. ' +
                    'Man-in-the-middle attacks are possible!'
                );
            } else {
                console.log('HTTP mode enabled for local development (INSECURE)');
            }
        }

        // Initialize components
        this.keyManager = new KeyManager();
        this.aes = new AESEncryption();
        this.rsa = new RSAOperations();
        this.httpClient = createHttpClient();

        // Log memory protection info
        const protectionInfo = this.secureMemoryImpl.getProtectionInfo();
        console.log(`Memory protection: ${protectionInfo.method} (${protectionInfo.details})`);
    }

    /**
     * Generate RSA key pair
     */
    async generateKeys(options: {
        saveToFile?: boolean;
        keyDir?: string;
        password?: string;
    } = {}): Promise<void> {
        await this.keyManager.generateKeys({
            keySize: 4096,
            ...options,
        });
    }

    /**
     * Load existing keys from files (Node.js only)
     */
    async loadKeys(
        privateKeyPath: string,
        publicKeyPath?: string,
        password?: string
    ): Promise<void> {
        await this.keyManager.loadKeys(
            { privateKeyPath, publicKeyPath },
            password
        );
    }

    /**
     * Ensure keys are loaded, generate if necessary
     */
    private async ensureKeys(): Promise<void> {
        if (this.keyManager.hasKeys()) {
            return;
        }

        // Try to load keys from default location (Node.js only)
        if (typeof window === 'undefined') {
            try {
                const fs = require('fs').promises;
                const path = require('path');

                const privateKeyPath = path.join('client_keys', 'private_key.pem');
                const publicKeyPath = path.join('client_keys', 'public_key.pem');

                // Check if keys exist
                await fs.access(privateKeyPath);
                await fs.access(publicKeyPath);

                // Load keys
                await this.loadKeys(privateKeyPath, publicKeyPath);
                console.log('Loaded existing keys from client_keys/');
                return;
            } catch (error) {
                // Keys don't exist, generate new ones
                console.log('No existing keys found, generating new keys...');
            }
        }

        // Generate new keys
        await this.generateKeys({
            saveToFile: typeof window === 'undefined', // Only save in Node.js
            keyDir: 'client_keys',
        });
    }

    /**
     * Fetch server's public key from /pki/public_key endpoint
     */
    async fetchServerPublicKey(): Promise<string> {
        console.log("Fetching server's public key...");

        // Security check: Ensure HTTPS is used unless HTTP explicitly allowed
        if (!this.routerUrl.startsWith('https://')) {
            if (!this.allowHttp) {
                throw new SecurityError(
                    'Server public key must be fetched over HTTPS to prevent MITM attacks. ' +
                    'For local development, initialize with allowHttp=true: ' +
                    'new SecureChatCompletion({ baseUrl: "http://localhost:12434", allowHttp: true })'
                );
            } else {
                console.warn('Fetching key over HTTP (local development mode)');
            }
        }

        const url = `${this.routerUrl}/pki/public_key`;

        try {
            const response = await this.httpClient.get(url, { timeout: 60000 });

            if (response.statusCode === 200) {
                const serverPublicKey = arrayBufferToString(response.body);

                // Validate it's a valid PEM key
                try {
                    await this.rsa.importPublicKey(serverPublicKey);
                } catch (error) {
                    throw new Error('Server returned invalid public key format');
                }

                if (this.routerUrl.startsWith('https://')) {
                    console.log("Server's public key fetched securely over HTTPS");
                } else {
                    console.warn("Server's public key fetched over HTTP (INSECURE)");
                }

                return serverPublicKey;
            } else {
                throw new Error(`Failed to fetch server's public key: HTTP ${response.statusCode}`);
            }
        } catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new APIConnectionError(`Failed to fetch server's public key: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Encrypt a payload using hybrid encryption (AES-256-GCM + RSA-OAEP)
     */
    async encryptPayload(payload: object): Promise<ArrayBuffer> {
        console.log('Encrypting payload...');

        // Validate payload
        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be an object');
        }

        // Ensure keys are loaded
        await this.ensureKeys();

        // Serialize payload to JSON
        const payloadJson = JSON.stringify(payload);
        const payloadBytes = stringToArrayBuffer(payloadJson);

        // Validate payload size (prevent DoS)
        const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB limit
        if (payloadBytes.byteLength > MAX_PAYLOAD_SIZE) {
            throw new Error(`Payload too large: ${payloadBytes.byteLength} bytes (max: ${MAX_PAYLOAD_SIZE})`);
        }

        console.log(`Payload size: ${payloadBytes.byteLength} bytes`);

        // Use secure memory context if enabled
        if (this.secureMemory) {
            const context = new SecureByteContext(payloadBytes, true);
            return await context.use(async (protectedPayload) => {
                return await this.performEncryption(protectedPayload);
            });
        } else {
            return await this.performEncryption(payloadBytes);
        }
    }

    /**
     * Perform the actual encryption (separated for secure memory context)
     */
    private async performEncryption(payloadBytes: ArrayBuffer): Promise<ArrayBuffer> {
        // Generate AES key
        const aesKey = await this.aes.generateKey();
        const aesKeyBytes = await this.aes.exportKey(aesKey);

        // Protect AES key in memory
        const aesContext = new SecureByteContext(aesKeyBytes, this.secureMemory);
        return await aesContext.use(async (protectedAesKey) => {
            // Encrypt payload with AES-GCM
            const { ciphertext, nonce } = await this.aes.encrypt(payloadBytes, aesKey);

            // Fetch server's public key
            const serverPublicKeyPem = await this.fetchServerPublicKey();
            const serverPublicKey = await this.rsa.importPublicKey(serverPublicKeyPem);

            // Encrypt AES key with server's RSA public key
            const encryptedAesKey = await this.rsa.encryptKey(protectedAesKey, serverPublicKey);

            // Create encrypted package (matching Python format)
            const encryptedPackage = {
                version: '1.0',
                algorithm: 'hybrid-aes256-rsa4096',
                encrypted_payload: {
                    ciphertext: arrayBufferToBase64(ciphertext),
                    nonce: arrayBufferToBase64(nonce),
                    // Note: GCM tag is included in ciphertext in Web Crypto API
                },
                encrypted_aes_key: arrayBufferToBase64(encryptedAesKey),
                key_algorithm: 'RSA-OAEP-SHA256',
                payload_algorithm: 'AES-256-GCM',
            };

            // Serialize package to JSON
            const packageJson = JSON.stringify(encryptedPackage);
            const packageBytes = stringToArrayBuffer(packageJson);

            console.log(`Encrypted package size: ${packageBytes.byteLength} bytes`);

            return packageBytes;
        });
    }

    /**
     * Decrypt a response from the secure endpoint
     */
    async decryptResponse(encryptedResponse: ArrayBuffer, payloadId: string): Promise<object> {
        console.log('Decrypting response...');

        // Validate input
        if (!encryptedResponse || encryptedResponse.byteLength === 0) {
            throw new Error('Empty encrypted response');
        }

        // Parse encrypted package
        let packageData: any;
        try {
            const packageJson = arrayBufferToString(encryptedResponse);
            packageData = JSON.parse(packageJson);
        } catch (error) {
            throw new Error('Invalid encrypted package format: malformed JSON');
        }

        // Validate package structure
        const requiredFields = ['version', 'algorithm', 'encrypted_payload', 'encrypted_aes_key'];
        for (const field of requiredFields) {
            if (!(field in packageData)) {
                throw new Error(`Missing required field in encrypted package: ${field}`);
            }
        }

        // Validate encrypted_payload structure
        const payloadRequired = ['ciphertext', 'nonce'];
        for (const field of payloadRequired) {
            if (!(field in packageData.encrypted_payload)) {
                throw new Error(`Missing field in encrypted_payload: ${field}`);
            }
        }

        // Decrypt AES key with private key
        try {
            const encryptedAesKey = base64ToArrayBuffer(packageData.encrypted_aes_key);
            const privateKey = this.keyManager.getPrivateKey();
            const aesKeyBytes = await this.rsa.decryptKey(encryptedAesKey, privateKey);

            // Use secure memory context for AES key
            const aesContext = new SecureByteContext(aesKeyBytes, this.secureMemory);
            const response = await aesContext.use(async (protectedAesKey) => {
                // Import AES key
                const aesKey = await this.aes.importKey(protectedAesKey);

                // Decrypt payload with AES-GCM
                const ciphertext = base64ToArrayBuffer(packageData.encrypted_payload.ciphertext);
                const nonce = base64ToArrayBuffer(packageData.encrypted_payload.nonce);

                const plaintext = await this.aes.decrypt(ciphertext, nonce, aesKey);

                // Use secure memory for plaintext
                const plaintextContext = new SecureByteContext(plaintext, this.secureMemory);
                return await plaintextContext.use(async (protectedPlaintext) => {
                    // Parse decrypted response
                    const responseJson = arrayBufferToString(protectedPlaintext);
                    return JSON.parse(responseJson);
                });
            });

            // Add metadata
            if (!response._metadata) {
                response._metadata = {};
            }
            response._metadata = {
                ...response._metadata,
                payload_id: payloadId,
                processed_at: packageData.processed_at,
                is_encrypted: true,
                encryption_algorithm: packageData.algorithm,
            };

            console.log('Response decrypted successfully');
            return response;
        } catch (error) {
            // Don't leak specific decryption errors (timing attacks)
            throw new SecurityError('Decryption failed: integrity check or authentication failed');
        }
    }

    /**
     * Send a secure chat completion request to the router
     */
    async sendSecureRequest(
        payload: object,
        payloadId: string,
        apiKey?: string
    ): Promise<object> {
        console.log('Sending secure chat completion request...');

        // Ensure keys are loaded
        await this.ensureKeys();

        // Step 1: Encrypt the payload
        const encryptedPayload = await this.encryptPayload(payload);

        // Step 2: Prepare headers
        const publicKeyPem = await this.keyManager.getPublicKeyPEM();
        const headers: Record<string, string> = {
            'X-Payload-ID': payloadId,
            'X-Public-Key': encodeURIComponent(publicKeyPem),
            'Content-Type': 'application/octet-stream',
        };

        // Add Authorization header if api_key is provided
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // Step 3: Send request to router
        const url = `${this.routerUrl}/v1/chat/secure_completion`;
        console.log(`Target URL: ${url}`);

        try {
            const response = await this.httpClient.post(url, {
                headers,
                body: encryptedPayload,
                timeout: 60000,
            });

            console.log(`HTTP Status: ${response.statusCode}`);

            if (response.statusCode === 200) {
                // Step 4: Decrypt the response
                const decryptedResponse = await this.decryptResponse(response.body, payloadId);
                return decryptedResponse;
            } else {
                // Handle error responses
                const { handleErrorResponse } = await import('../errors');
                throw this.handleErrorResponse(response);
            }
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Request timeout') {
                    throw new APIConnectionError('Connection to server timed out');
                }
                throw new APIConnectionError(`Failed to connect to router: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Handle error HTTP responses
     */
    private handleErrorResponse(response: { statusCode: number; body: ArrayBuffer }): Error {
        const {
            AuthenticationError,
            InvalidRequestError,
            RateLimitError,
            ServerError,
            APIError,
        } = require('../errors');

        let errorData: any = {};
        try {
            const errorJson = arrayBufferToString(response.body);
            errorData = JSON.parse(errorJson);
        } catch (e) {
            // Ignore JSON parse errors
        }

        const detail = errorData.detail || 'Unknown error';

        switch (response.statusCode) {
            case 400:
                return new InvalidRequestError(`Bad request: ${detail}`, 400, errorData);
            case 401:
                return new AuthenticationError(`Invalid API key or authentication failed: ${detail}`, 401, errorData);
            case 404:
                return new APIError(`Endpoint not found: ${detail}`, 404, errorData);
            case 429:
                return new RateLimitError(`Rate limit exceeded: ${detail}`, 429, errorData);
            case 500:
                return new ServerError(`Server error: ${detail}`, 500, errorData);
            default:
                return new APIError(`Unexpected status code: ${response.statusCode}`, response.statusCode, errorData);
        }
    }
}
