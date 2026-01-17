/**
 * Secure memory interface and context manager
 * 
 * IMPORTANT: This is a pure JavaScript implementation that provides memory zeroing only.
 * OS-level memory locking (mlock) is NOT implemented in this version.
 * 
 * For production use, consider implementing a native addon for true memory locking.
 * See SECURITY.md for details on memory protection limitations.
 */

import { ProtectionInfo } from '../../types/crypto';

export interface SecureMemory {
    /**
     * Zero memory (fill with zeros)
     * Note: This is best-effort. JavaScript GC controls actual memory lifecycle.
     */
    zeroMemory(data: ArrayBuffer): void;

    /**
     * Get memory protection information
     */
    getProtectionInfo(): ProtectionInfo;
}

/**
 * Secure byte context manager
 * Ensures memory is zeroed even if an exception occurs (similar to Python's context manager)
 */
export class SecureByteContext {
    private data: ArrayBuffer;
    private secureMemory: SecureMemory;
    private useSecure: boolean;

    constructor(data: ArrayBuffer, useSecure: boolean = true) {
        this.data = data;
        this.useSecure = useSecure;
        this.secureMemory = createSecureMemory();
    }

    /**
     * Use the secure data within a function
     * Ensures memory is zeroed after use, even if an exception occurs
     */
    async use<T>(fn: (data: ArrayBuffer) => Promise<T>): Promise<T> {
        try {
            return await fn(this.data);
        } finally {
            // Always zero memory, even if exception occurred
            if (this.useSecure) {
                this.secureMemory.zeroMemory(this.data);
            }
        }
    }
}

/**
 * Create a secure memory implementation for the current platform
 */
export function createSecureMemory(): SecureMemory {
    if (typeof window !== 'undefined') {
        // Browser environment
        const BrowserSecureMemory = require('./browser').BrowserSecureMemory;
        return new BrowserSecureMemory();
    } else {
        // Node.js environment
        const NodeSecureMemory = require('./node').NodeSecureMemory;
        return new NodeSecureMemory();
    }
}
