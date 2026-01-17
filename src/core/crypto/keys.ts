/**
 * Key management for RSA key pairs
 * Handles key generation, loading, and persistence
 * 
 * NOTE: Browser storage is NOT implemented in this version for security reasons.
 * Keys are kept in-memory only in browsers. For persistent keys, use Node.js.
 */

import { RSAOperations } from './rsa';
import { KeyGenOptions, KeyPaths } from '../../types/client';

export class KeyManager {
    private rsa: RSAOperations;
    private publicKey?: CryptoKey;
    private privateKey?: CryptoKey;
    private publicKeyPem?: string;

    constructor() {
        this.rsa = new RSAOperations();
    }

    /**
     * Generate new RSA key pair
     * @param options Key generation options
     */
    async generateKeys(options: KeyGenOptions = {}): Promise<void> {
        const {
            keySize = 4096,
            saveToFile = false,
            keyDir = 'client_keys',
            password,
        } = options;

        console.log(`Generating ${keySize}-bit RSA key pair...`);

        // Generate key pair
        const keyPair = await this.rsa.generateKeyPair(keySize);
        this.publicKey = keyPair.publicKey;
        this.privateKey = keyPair.privateKey;

        // Export public key to PEM
        this.publicKeyPem = await this.rsa.exportPublicKey(this.publicKey);

        console.log(`Generated ${keySize}-bit RSA key pair`);

        // Save to file if requested (Node.js only)
        if (saveToFile) {
            await this.saveKeys(keyDir, password);
        }
    }

    /**
     * Load keys from files (Node.js only)
     * @param paths Key file paths
     * @param password Optional password for encrypted private key
     */
    async loadKeys(paths: KeyPaths, password?: string): Promise<void> {
        // Check if we're in Node.js
        if (typeof window !== 'undefined') {
            throw new Error('File-based key loading is not supported in browsers. Use in-memory keys only.');
        }

        console.log('Loading keys from files...');

        const fs = require('fs').promises;
        const path = require('path');

        // Load private key
        const privateKeyPem = await fs.readFile(paths.privateKeyPath, 'utf-8');
        this.privateKey = await this.rsa.importPrivateKey(privateKeyPem, password);

        // Load or derive public key
        if (paths.publicKeyPath) {
            this.publicKeyPem = await fs.readFile(paths.publicKeyPath, 'utf-8');
            this.publicKey = await this.rsa.importPublicKey(this.publicKeyPem);
        } else {
            // Derive public key from private key's public component
            // For now, we'll require the public key file
            const publicKeyPath = path.join(
                path.dirname(paths.privateKeyPath),
                'public_key.pem'
            );
            this.publicKeyPem = await fs.readFile(publicKeyPath, 'utf-8');
            this.publicKey = await this.rsa.importPublicKey(this.publicKeyPem);
        }

        console.log('Keys loaded successfully');
    }

    /**
     * Save keys to files (Node.js only)
     * @param directory Directory to save keys
     * @param password Optional password to encrypt private key
     */
    async saveKeys(directory: string, password?: string): Promise<void> {
        // Check if we're in Node.js
        if (typeof window !== 'undefined') {
            throw new Error('File-based key saving is not supported in browsers');
        }

        if (!this.privateKey || !this.publicKey) {
            throw new Error('No keys to save. Generate or load keys first.');
        }

        const fs = require('fs').promises;
        const path = require('path');

        console.log(`Saving keys to ${directory}/...`);

        // Create directory if it doesn't exist
        await fs.mkdir(directory, { recursive: true });

        // Export and save private key
        const privateKeyPem = await this.rsa.exportPrivateKey(this.privateKey, password);
        const privateKeyPath = path.join(directory, 'private_key.pem');
        await fs.writeFile(privateKeyPath, privateKeyPem, 'utf-8');

        // Set restrictive permissions on private key (Unix-like systems)
        try {
            await fs.chmod(privateKeyPath, 0o600); // Owner read/write only
            console.log('Private key permissions set to 600 (owner-only access)');
        } catch (error) {
            console.warn('Could not set private key permissions:', error);
        }

        // Save public key
        if (!this.publicKeyPem) {
            this.publicKeyPem = await this.rsa.exportPublicKey(this.publicKey);
        }
        const publicKeyPath = path.join(directory, 'public_key.pem');
        await fs.writeFile(publicKeyPath, this.publicKeyPem, 'utf-8');

        // Set permissions on public key
        try {
            await fs.chmod(publicKeyPath, 0o644); // Owner read/write, others read
            console.log('Public key permissions set to 644');
        } catch (error) {
            console.warn('Could not set public key permissions:', error);
        }

        if (password) {
            console.log('Private key encrypted with password');
        } else {
            console.warn('Private key saved UNENCRYPTED (not recommended for production)');
        }

        console.log(`Keys saved to ${directory}/`);
    }

    /**
     * Get public key in PEM format
     */
    async getPublicKeyPEM(): Promise<string> {
        if (!this.publicKeyPem) {
            if (!this.publicKey) {
                throw new Error('No public key available. Generate or load keys first.');
            }
            this.publicKeyPem = await this.rsa.exportPublicKey(this.publicKey);
        }
        return this.publicKeyPem;
    }

    /**
     * Get private key (for internal use)
     */
    getPrivateKey(): CryptoKey {
        if (!this.privateKey) {
            throw new Error('No private key available. Generate or load keys first.');
        }
        return this.privateKey;
    }

    /**
     * Get public key (for internal use)
     */
    getPublicKey(): CryptoKey {
        if (!this.publicKey) {
            throw new Error('No public key available. Generate or load keys first.');
        }
        return this.publicKey;
    }

    /**
     * Check if keys are loaded
     */
    hasKeys(): boolean {
        return !!(this.privateKey && this.publicKey);
    }
}
