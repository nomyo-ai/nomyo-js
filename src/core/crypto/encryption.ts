/**
 * AES-256-GCM encryption and decryption using Web Crypto API
 * Matches the Python implementation using AES-256-GCM with random nonces
 */

import { getCrypto, arrayBufferToBase64, base64ToArrayBuffer, generateRandomBytes } from './utils';

export class AESEncryption {
    private subtle: SubtleCrypto;

    constructor() {
        this.subtle = getCrypto();
    }

    /**
     * Generate a random 256-bit AES key
     */
    async generateKey(): Promise<CryptoKey> {
        return await this.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256, // 256-bit key
            },
            true, // extractable
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data with AES-256-GCM
     * @param data Data to encrypt
     * @param key AES key
     * @returns Object containing ciphertext and nonce
     */
    async encrypt(
        data: ArrayBuffer,
        key: CryptoKey
    ): Promise<{ ciphertext: ArrayBuffer; nonce: ArrayBuffer }> {
        // Generate random 96-bit (12-byte) nonce
        const nonce = generateRandomBytes(12);

        // Encrypt with AES-GCM
        const ciphertext = await this.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
                tagLength: 128, // 128-bit authentication tag
            },
            key,
            data
        );

        return {
            ciphertext,
            nonce: nonce.buffer,
        };
    }

    /**
     * Decrypt data with AES-256-GCM
     * @param ciphertext Encrypted data
     * @param nonce Nonce/IV used for encryption
     * @param key AES key
     * @returns Decrypted plaintext
     */
    async decrypt(
        ciphertext: ArrayBuffer,
        nonce: ArrayBuffer,
        key: CryptoKey
    ): Promise<ArrayBuffer> {
        try {
            const plaintext = await this.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    tagLength: 128,
                },
                key,
                ciphertext
            );

            return plaintext;
        } catch (error) {
            throw new Error(`AES-GCM decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Export AES key as raw bytes
     * @param key CryptoKey to export
     * @returns Raw key bytes
     */
    async exportKey(key: CryptoKey): Promise<ArrayBuffer> {
        return await this.subtle.exportKey('raw', key);
    }

    /**
     * Import AES key from raw bytes
     * @param keyData Raw key bytes (must be 32 bytes for AES-256)
     * @returns Imported CryptoKey
     */
    async importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
        if (keyData.byteLength !== 32) {
            throw new Error(`Invalid AES key length: expected 32 bytes, got ${keyData.byteLength}`);
        }

        return await this.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );
    }
}
