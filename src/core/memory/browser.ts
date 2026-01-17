/**
 * Browser secure memory implementation
 * 
 * LIMITATIONS:
 * - Cannot lock memory (no OS-level mlock in browsers)
 * - JavaScript GC controls memory lifecycle
 * - Best effort: immediate zeroing to minimize exposure time
 */

import { SecureMemory, ProtectionInfo } from '../../types/crypto';

export class BrowserSecureMemory implements SecureMemory {
    /**
     * Zero memory immediately
     * Note: This doesn't prevent JavaScript GC from moving/copying the data
     */
    zeroMemory(data: ArrayBuffer): void {
        const view = new Uint8Array(data);
        view.fill(0);
    }

    /**
     * Get protection information
     */
    getProtectionInfo(): ProtectionInfo {
        return {
            canLock: false,
            isPlatformSecure: false,
            method: 'zero-only',
            details: 'Browser environment: memory locking not available. Using immediate zeroing only.',
        };
    }
}
