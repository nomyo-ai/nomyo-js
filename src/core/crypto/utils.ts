/**
 * Cryptographic utility functions
 * Provides platform-agnostic implementations for Base64, PEM conversion, and random bytes
 */

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    // Use btoa if available (browser), otherwise use Buffer (Node.js)
    if (typeof btoa !== 'undefined') {
        return btoa(binary);
    } else {
        return Buffer.from(bytes).toString('base64');
    }
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Use atob if available (browser), otherwise use Buffer (Node.js)
    let binary: string;
    if (typeof atob !== 'undefined') {
        binary = atob(base64);
    } else {
        binary = Buffer.from(base64, 'base64').toString('binary');
    }

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);

    // Use crypto.getRandomValues if available (browser/Node.js), otherwise use crypto.randomBytes (Node.js)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        // Node.js fallback
        const nodeCrypto = require('crypto');
        const randomBytes = nodeCrypto.randomBytes(length);
        bytes.set(randomBytes);
    }

    return bytes;
}

/**
 * Convert string to ArrayBuffer (UTF-8 encoding)
 */
export function stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer to string (UTF-8 decoding)
 */
export function arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}

/**
 * Convert PEM format to ArrayBuffer
 * @param pem PEM-encoded key (with header/footer)
 * @param type Key type ('PUBLIC' or 'PRIVATE')
 */
export function pemToArrayBuffer(pem: string, type: 'PUBLIC' | 'PRIVATE'): ArrayBuffer {
    // Remove header, footer, and whitespace
    const header = `-----BEGIN ${type === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'} KEY-----`;
    const footer = `-----END ${type === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'} KEY-----`;

    const pemContents = pem
        .replace(header, '')
        .replace(footer, '')
        .replace(/\s/g, '');

    return base64ToArrayBuffer(pemContents);
}

/**
 * Convert ArrayBuffer to PEM format
 * @param buffer Key data as ArrayBuffer
 * @param type Key type ('PUBLIC' or 'PRIVATE')
 */
export function arrayBufferToPem(buffer: ArrayBuffer, type: 'PUBLIC' | 'PRIVATE'): string {
    const base64 = arrayBufferToBase64(buffer);
    const header = `-----BEGIN ${type === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'} KEY-----`;
    const footer = `-----END ${type === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'} KEY-----`;

    // Format with line breaks every 64 characters
    const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;

    return `${header}\n${formatted}\n${footer}`;
}

/**
 * Get the Web Crypto API (works in both browser and Node.js)
 */
export function getCrypto(): SubtleCrypto {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        return crypto.subtle;
    } else {
        // Node.js
        const nodeCrypto = require('crypto');
        return nodeCrypto.webcrypto.subtle;
    }
}
