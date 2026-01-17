# Security Documentation - NOMYO.js

## Overview

NOMYO.js implements end-to-end encryption for OpenAI-compatible chat completions using hybrid cryptography. This document details the security architecture, current implementation status, and limitations.

---

## Encryption Architecture

### Hybrid Encryption (AES-256-GCM + RSA-OAEP)

**Request Encryption Flow:**
1. Client generates ephemeral AES-256 key (32 bytes)
2. Payload serialized to JSON and encrypted with AES-256-GCM
3. AES key encrypted with server's RSA-4096 public key (RSA-OAEP-SHA256)
4. Encrypted package sent to server with client's public key

**Response Decryption Flow:**
1. Server encrypts response with new AES-256 key
2. AES key encrypted with client's RSA public key
3. Client decrypts AES key with private RSA key
4. Client decrypts response with AES key

### Cryptographic Primitives

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| **Symmetric Encryption** | AES-256-GCM | 256-bit key, 96-bit nonce, 128-bit tag |
| **Asymmetric Encryption** | RSA-OAEP | 4096-bit modulus, SHA-256 hash, MGF1-SHA256 |
| **Key Derivation** | PBKDF2 | 100,000 iterations, SHA-256, 16-byte salt |
| **Private Key Encryption** | AES-256-CBC | 256-bit key (from PBKDF2), 128-bit IV |

---

## Current Implementation Status

### ✅ Fully Implemented

1. **Web Crypto API Integration**
   - Platform-agnostic cryptography (Node.js 15+ and modern browsers)
   - Hardware-accelerated when available
   - Constant-time operations (timing attack resistant)

2. **Hybrid Encryption**
   - AES-256-GCM for payload encryption
   - RSA-OAEP-SHA256 for key exchange
   - Authenticated encryption (GCM provides AEAD)
   - Unique nonce per encryption (96-bit random)

3. **Key Management**
   - 4096-bit RSA keys (default, configurable to 2048)
   - Automatic key generation on first use
   - File-based persistence (Node.js)
   - In-memory keys (browsers)
   - Password protection via PBKDF2 + AES-256-CBC

4. **Transport Security**
   - HTTPS enforcement (with warnings for HTTP)
   - Certificate validation (browsers/Node.js)
   - Optional HTTP for local development (explicit opt-in)

5. **Memory Protection (Pure JavaScript)**
   - Immediate zeroing of sensitive buffers
   - Context managers for automatic cleanup
   - Best-effort memory management

### ⚠️ Limitations (Pure JavaScript)

1. **No OS-Level Memory Locking**
   - Cannot use `mlock()` (Linux/macOS) or `VirtualLock()` (Windows)
   - JavaScript GC controls memory lifecycle
   - Memory may be paged to swap
   - **Impact**: Sensitive data could be written to disk during high memory pressure

2. **Memory Zeroing Only**
   - Zeroes `ArrayBuffer` contents immediately after use
   - Cannot prevent GC from copying data internally
   - Cannot guarantee memory won't be swapped
   - **Mitigation**: Minimizes exposure window

3. **Browser Limitations**
   - Keys not persisted (in-memory only)
   - No file system access
   - Subject to browser security policies
   - **Impact**: Keys regenerated on each page load

---

## Security Best Practices

### Deployment

✅ **DO:**
- Use HTTPS in production (enforced by default)
- Enable secure memory protection (default: `secureMemory: true`)
- Use password-protected private keys in Node.js
- Set private key file permissions to 600 (owner-only)
- Rotate keys periodically
- Validate server public key fingerprint on first use

❌ **DON'T:**
- Use HTTP in production (only for localhost development)
- Disable secure memory unless absolutely necessary
- Store unencrypted private keys
- Share private keys across systems
- Store keys in public repositories

### Key Management

**Node.js (Recommended):**
```javascript
const client = new SecureCompletionClient({ routerUrl: 'https://...' });

// Generate with password protection
await client.generateKeys({
  saveToFile: true,
  keyDir: 'client_keys',
  password: process.env.KEY_PASSWORD  // From environment variable
});
```

**Browsers (In-Memory):**
```javascript
// Keys generated automatically, not persisted
const client = new SecureChatCompletion({ baseUrl: 'https://...' });
```

### Environment Variables

```bash
# .env file (never commit to git)
NOMYO_API_KEY=your-api-key
NOMYO_KEY_PASSWORD=your-key-password
NOMYO_SERVER_URL=https://api.nomyo.ai:12434
```

---

## Cryptographic Implementation Details

### AES-256-GCM

```typescript
// Key generation
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,  // extractable
  ['encrypt', 'decrypt']
);

// Encryption
const nonce = crypto.getRandomValues(new Uint8Array(12));  // 96 bits
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: nonce, tagLength: 128 },
  key,
  plaintext
);
```

**Security Properties:**
- **Authenticated Encryption with Associated Data (AEAD)**
- **128-bit authentication tag** prevents tampering
- **Unique nonce requirement** - Never reuse nonce with same key
- **Ephemeral keys** - New AES key per request provides forward secrecy

### RSA-OAEP

```typescript
// Key generation
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSA-OAEP',
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),  // 65537
    hash: 'SHA-256'
  },
  true,
  ['encrypt', 'decrypt']
);

// Encryption
const encrypted = await crypto.subtle.encrypt(
  { name: 'RSA-OAEP' },
  publicKey,
  data
);
```

**Security Properties:**
- **OAEP padding** prevents chosen ciphertext attacks
- **SHA-256 hash** in MGF1 mask generation
- **4096-bit keys** provide ~152-bit security level
- **No label** (standard practice for hybrid encryption)

### Password-Protected Keys

```typescript
// Derive key from password
const salt = crypto.getRandomValues(new Uint8Array(16));
const passwordKey = await crypto.subtle.importKey(
  'raw',
  encoder.encode(password),
  'PBKDF2',
  false,
  ['deriveKey']
);

const derivedKey = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 100000,  // OWASP recommendation
    hash: 'SHA-256'
  },
  passwordKey,
  { name: 'AES-CBC', length: 256 },
  false,
  ['encrypt']
);

// Encrypt private key
const iv = crypto.getRandomValues(new Uint8Array(16));
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-CBC', iv: iv },
  derivedKey,
  privateKeyData
);

// Store: salt + iv + encrypted
```

**Security Properties:**
- **100,000 PBKDF2 iterations** (meets OWASP 2023 recommendations)
- **SHA-256 hash function**
- **16-byte random salt** (unique per key)
- **AES-256-CBC** for key encryption

---

## Memory Protection Details

### Current Implementation (Pure JavaScript)

```typescript
class SecureByteContext {
  async use<T>(fn: (data: ArrayBuffer) => Promise<T>): Promise<T> {
    try {
      return await fn(this.data);
    } finally {
      // Always zero, even if exception occurs
      if (this.useSecure) {
        new Uint8Array(this.data).fill(0);
      }
    }
  }
}
```

**What it does:**
- ✅ Zeroes memory immediately after use
- ✅ Guarantees cleanup even on exceptions
- ✅ Minimizes exposure window

**What it cannot do:**
- ❌ Prevent JavaScript GC from copying data
- ❌ Lock memory pages (no swap)
- ❌ Prevent core dumps from containing data
- ❌ Guarantee OS won't page data to disk

### Future: Native Addon (Optional)

A native Node.js addon can provide true memory protection:

**Linux/macOS:**
```c
#include <sys/mman.h>

// Lock memory
mlock(data, length);

// Zero and unlock
memset(data, 0, length);
munlock(data, length);
```

**Windows:**
```c
#include <windows.h>

// Lock memory
VirtualLock(data, length);

// Zero and unlock
SecureZeroMemory(data, length);
VirtualUnlock(data, length);
```

**Installation:**
```bash
# Optional dependency
npm install nomyo-native

# Will use native addon if available, fallback to pure JS otherwise
```

---

## Threat Model

### Protected Against

✅ **Network Eavesdropping**
- All data encrypted end-to-end
- HTTPS transport encryption
- Authenticated encryption prevents tampering

✅ **MITM Attacks**
- HTTPS certificate validation
- Server public key verification
- Warning on HTTP usage

✅ **Replay Attacks**
- Unique nonce per encryption
- Authenticated encryption with GCM
- Server timestamp validation (server-side)

✅ **Timing Attacks (Partial)**
- Web Crypto API uses constant-time operations
- No length leakage in comparisons

✅ **Key Compromise (Forward Secrecy)**
- Ephemeral AES keys
- Each request uses new AES key
- Compromise of one key affects only that request

### Not Protected Against (Pure JS)

⚠️ **Memory Inspection**
- Admin/root can read process memory
- Debuggers can access sensitive data
- Core dumps may contain keys
- **Mitigation**: Use native addon for `mlock` support

⚠️ **Swap File Exposure**
- OS may page memory to disk
- Sensitive data could persist in swap
- **Mitigation**: Disable swap or use native addon

⚠️ **Local Malware**
- Keyloggers can capture passwords
- Memory scrapers can extract keys
- **Mitigation**: Standard OS security practices

---

## Comparison: JavaScript vs Python Implementation

| Feature | Python | JavaScript (Pure) | JavaScript (+ Native Addon) |
|---------|--------|-------------------|----------------------------|
| **Encryption** | AES-256-GCM | ✅ AES-256-GCM | ✅ AES-256-GCM |
| **Key Exchange** | RSA-OAEP-4096 | ✅ RSA-OAEP-4096 | ✅ RSA-OAEP-4096 |
| **Memory Locking** | ✅ `mlock` | ❌ Not available | ✅ `mlock` |
| **Memory Zeroing** | ✅ Guaranteed | ✅ Best-effort | ✅ Guaranteed |
| **Key Persistence** | ✅ File-based | ✅ Node.js only | ✅ Node.js only |
| **Browser Support** | ❌ | ✅ | ❌ |
| **Zero Dependencies** | ❌ | ✅ | ❌ (native addon) |

---

## Audit & Compliance

### Recommendations for Production

1. **Code Review**
   - Review cryptographic implementations
   - Verify key generation randomness
   - Check for timing vulnerabilities

2. **Penetration Testing**
   - Test against MITM attacks
   - Verify HTTPS enforcement
   - Test key management security

3. **Compliance**
   - Document security architecture
   - Risk assessment for pure JS vs native
   - Decide if `mlock` is required for your use case

### Known Limitations

This implementation uses **pure JavaScript** without native addons. For maximum security:
- Consider implementing the optional native addon
- Or use the Python client in security-critical server environments
- Or accept the risk given other security controls (encrypted disk, no swap, etc.)

---

## References

- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - GCM mode
- [RFC 8017](https://datatracker.ietf.org/doc/html/rfc8017) - RSA-OAEP
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
