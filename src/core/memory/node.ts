/**
 * Node.js secure memory implementation (pure JavaScript)
 * 
 * LIMITATIONS:
 * - This is a pure JavaScript implementation without native addons
 * - Cannot lock memory (no mlock support without native addon)
 * - JavaScript GC controls memory lifecycle
 * - Best effort: immediate zeroing to minimize exposure time
 * 
 * FUTURE ENHANCEMENT:
 * A native addon can be implemented separately to provide true mlock support.
 * See the native/ directory for an optional native implementation.
 */

import { SecureMemory, ProtectionInfo } from '../../types/crypto';

export class NodeSecureMemory implements SecureMemory {
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
            details:
                'Node.js environment (pure JS): memory locking not available without native addon. ' +
                'Using immediate zeroing only. ' +
                'For enhanced security, consider implementing the optional native addon (see native/ directory).',
        };
    }
}
