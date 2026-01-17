/**
 * RSA-OAEP operations for key exchange
 * Matches the Python implementation using RSA-OAEP with SHA-256
 */

import { getCrypto, pemToArrayBuffer, arrayBufferToPem, stringToArrayBuffer, arrayBufferToString } from './utils';

export class RSAOperations {
    private subtle: SubtleCrypto;

    constructor() {
        this.subtle = getCrypto();
    }

    /**
     * Generate RSA key pair (2048 or 4096 bit)
     * @param keySize Key size in bits (default: 4096)
     */
    async generateKeyPair(keySize: 2048 | 4096 = 4096): Promise<CryptoKeyPair> {
        return await this.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: keySize,
                publicExponent: new Uint8Array([1, 0, 1]), // 65537
                hash: 'SHA-256',
            },
            true, // extractable
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt AES key with RSA public key
     * @param aesKey Raw AES key bytes
     * @param publicKey RSA public key
     * @returns Encrypted AES key
     */
    async encryptKey(aesKey: ArrayBuffer, publicKey: CryptoKey): Promise<ArrayBuffer> {
        return await this.subtle.encrypt(
            {
                name: 'RSA-OAEP',
            },
            publicKey,
            aesKey
        );
    }

    /**
     * Decrypt AES key with RSA private key
     * @param encryptedKey Encrypted AES key
     * @param privateKey RSA private key
     * @returns Decrypted AES key (raw bytes)
     */
    async decryptKey(encryptedKey: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> {
        try {
            return await this.subtle.decrypt(
                {
                    name: 'RSA-OAEP',
                },
                privateKey,
                encryptedKey
            );
        } catch (error) {
            throw new Error(`RSA-OAEP decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Export public key to PEM format (SPKI)
     * @param publicKey RSA public key
     * @returns PEM-encoded public key
     */
    async exportPublicKey(publicKey: CryptoKey): Promise<string> {
        const exported = await this.subtle.exportKey('spki', publicKey);
        return arrayBufferToPem(exported, 'PUBLIC');
    }

    /**
     * Import public key from PEM format
     * @param pem PEM-encoded public key
     * @returns RSA public key
     */
    async importPublicKey(pem: string): Promise<CryptoKey> {
        const keyData = pemToArrayBuffer(pem, 'PUBLIC');

        return await this.subtle.importKey(
            'spki',
            keyData,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['encrypt']
        );
    }

    /**
     * Export private key to PEM format (PKCS8), optionally encrypted with password
     * @param privateKey RSA private key
     * @param password Optional password to encrypt the private key
     * @returns PEM-encoded private key
     */
    async exportPrivateKey(privateKey: CryptoKey, password?: string): Promise<string> {
        const exported = await this.subtle.exportKey('pkcs8', privateKey);

        if (password) {
            // Encrypt the private key with password using PBKDF2 + AES-256-CBC
            const encryptedKey = await this.encryptPrivateKeyWithPassword(exported, password);
            return encryptedKey;
        }

        return arrayBufferToPem(exported, 'PRIVATE');
    }

    /**
     * Import private key from PEM format, optionally decrypting with password
     * @param pem PEM-encoded private key
     * @param password Optional password if private key is encrypted
     * @returns RSA private key
     */
    async importPrivateKey(pem: string, password?: string): Promise<CryptoKey> {
        let keyData: ArrayBuffer;

        if (password) {
            // Decrypt the private key with password
            keyData = await this.decryptPrivateKeyWithPassword(pem, password);
        } else {
            keyData = pemToArrayBuffer(pem, 'PRIVATE');
        }

        return await this.subtle.importKey(
            'pkcs8',
            keyData,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['decrypt']
        );
    }

    /**
     * Encrypt private key with password using PBKDF2 + AES-256-CBC
     * @param keyData Private key data (PKCS8)
     * @param password Password to encrypt with
     * @returns PEM-encoded encrypted private key
     */
    private async encryptPrivateKeyWithPassword(keyData: ArrayBuffer, password: string): Promise<string> {
        // Derive encryption key from password using PBKDF2
        const passwordKey = await this.subtle.importKey(
            'raw',
            stringToArrayBuffer(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const derivedKey = await this.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            passwordKey,
            { name: 'AES-CBC', length: 256 },
            false,
            ['encrypt']
        );

        // Encrypt private key with AES-256-CBC
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encrypted = await this.subtle.encrypt(
            {
                name: 'AES-CBC',
                iv: iv,
            },
            derivedKey,
            keyData
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        return arrayBufferToPem(combined.buffer, 'PRIVATE');
    }

    /**
     * Decrypt private key with password
     * @param pem PEM-encoded encrypted private key
     * @param password Password to decrypt with
     * @returns Decrypted private key data (PKCS8)
     */
    private async decryptPrivateKeyWithPassword(pem: string, password: string): Promise<ArrayBuffer> {
        const combined = pemToArrayBuffer(pem, 'PRIVATE');
        const combinedArray = new Uint8Array(combined);

        // Extract salt, iv, and encrypted data
        const salt = combinedArray.slice(0, 16);
        const iv = combinedArray.slice(16, 32);
        const encrypted = combinedArray.slice(32);

        // Derive decryption key from password
        const passwordKey = await this.subtle.importKey(
            'raw',
            stringToArrayBuffer(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const derivedKey = await this.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            passwordKey,
            { name: 'AES-CBC', length: 256 },
            false,
            ['decrypt']
        );

        // Decrypt private key
        try {
            return await this.subtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: iv,
                },
                derivedKey,
                encrypted
            );
        } catch (error) {
            throw new Error('Failed to decrypt private key: invalid password or corrupted key');
        }
    }
}
