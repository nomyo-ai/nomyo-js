# NOMYO.js - Secure JavaScript Chat Client

**OpenAI-compatible secure chat client with end-to-end encryption for NOMYO Inference Endpoints**

🔒 **All prompts and responses are automatically encrypted and decrypted**  
🔑 **Uses hybrid encryption (AES-256-GCM + RSA-OAEP with 4096-bit keys)**  
🔄 **Drop-in replacement for OpenAI's ChatCompletion API**  
🌐 **Works in both Node.js and browsers**

## 🚀 Quick Start

### Installation

```bash
npm install nomyo-js
```

### Basic Usage (Node.js)

```javascript
import { SecureChatCompletion } from 'nomyo-js';

// Initialize client (defaults to https://api.nomyo.ai:12434)
const client = new SecureChatCompletion({
  baseUrl: 'https://api.nomyo.ai:12434'
});

// Simple chat completion
const response = await client.create({
  model: 'Qwen/Qwen3-0.6B',
  messages: [
    { role: 'user', content: 'Hello! How are you today?' }
  ],
  temperature: 0.7
});

console.log(response.choices[0].message.content);
```

### Basic Usage (Browser)

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { SecureChatCompletion } from 'https://unpkg.com/nomyo-js/dist/browser/index.js';

    const client = new SecureChatCompletion({
      baseUrl: 'https://api.nomyo.ai:12434'
    });

    const response = await client.create({
      model: 'Qwen/Qwen3-0.6B',
      messages: [
        { role: 'user', content: 'What is 2+2?' }
      ]
    });

    console.log(response.choices[0].message.content);
  </script>
</head>
<body>
  <h1>NOMYO Secure Chat</h1>
</body>
</html>
```

## 🔐 Security Features

### Hybrid Encryption

-**Payload encryption**: AES-256-GCM (authenticated encryption)
- **Key exchange**: RSA-OAEP with SHA-256
- **Key size**: 4096-bit RSA keys
- **All communication**: End-to-end encrypted

### Key Management

- **Automatic key generation**: Keys are automatically generated on first use
- **Automatic key loading**: Existing keys are loaded automatically from `client_keys/` directory (Node.js only)
- **No manual intervention required**: The library handles key management automatically
- **Optional persistence**: Keys can be saved to `client_keys/` directory for reuse across sessions (Node.js only)
- **Password protection**: Optional password encryption for private keys (recommended for production)
- **Secure permissions**: Private keys stored with restricted permissions (600 - owner-only access)

### Secure Memory Protection

> [!NOTE]
> **Pure JavaScript Implementation**: This version uses pure JavaScript with immediate memory zeroing.
> OS-level memory locking (`mlock`) is NOT available without a native addon.
> For enhanced security in production, consider implementing the optional native addon (see `native/` directory).

- **Automatic cleanup**: Sensitive data is zeroed from memory immediately after use
- **Best-effort protection**: Minimizes exposure time of sensitive data
- **Fallback mechanism**: Graceful degradation if enhanced security is unavailable

## 🔄 OpenAI Compatibility

The `SecureChatCompletion` class provides **exact API compatibility** with OpenAI's `ChatCompletion.create()` method.

### Supported Parameters

All standard OpenAI parameters are supported:

- `model`: Model identifier
- `messages`: List of message objects
- `temperature`: Sampling temperature (0-2)
- `max_tokens`: Maximum tokens to generate
- `top_p`: Nucleus sampling
- `frequency_penalty`: Frequency penalty
- `presence_penalty`: Presence penalty
- `stop`: Stop sequences
- `n`: Number of completions
- `tools`: Tool definitions
- `tool_choice`: Tool selection strategy
- `user`: User identifier

### Response Format

Responses follow the OpenAI format exactly, with an additional `_metadata` field for debugging and security information:

```javascript
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "Qwen/Qwen3-0.6B",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  },
  "_metadata": {
    "payload_id": "openai-compat-abc123",
    "processed_at": 1765250382,
    "is_encrypted": true,
    "encryption_algorithm": "hybrid-aes256-rsa4096",
    "response_status": "success"
  }
}
```

## 🛠️ Usage Examples

### Basic Chat

```javascript
import { SecureChatCompletion } from 'nomyo-js';

const client = new SecureChatCompletion({
  baseUrl: 'https://api.nomyo.ai:12434'
});

const response = await client.create({
  model: 'Qwen/Qwen3-0.6B',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' }
  ],
  temperature: 0.7
});

console.log(response.choices[0].message.content);
```

### With Tools

```javascript
const response = await client.create({
  model: 'Qwen/Qwen3-0.6B',
  messages: [
    { role: 'user', content: "What's the weather in Paris?" }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather information',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          },
          required: ['location']
        }
      }
    }
  ]
});
```

### With API Key Authentication

```javascript
const client = new SecureChatCompletion({
  baseUrl: 'https://api.nomyo.ai:12434',
  apiKey: 'your-api-key-here'
});

// API key will be automatically included in all requests
const response = await client.create({
  model: 'Qwen/Qwen3-0.6B',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});
```

### Custom Key Management (Node.js)

```javascript
import { SecureCompletionClient } from 'nomyo-js';

const client = new SecureCompletionClient({
  routerUrl: 'https://api.nomyo.ai:12434'
});

// Generate keys with password protection
await client.generateKeys({
  saveToFile: true,
  keyDir: 'client_keys',
  password: 'your-secure-password'
});

// Or load existing keys
await client.loadKeys(
  'client_keys/private_key.pem',
  'client_keys/public_key.pem',
  'your-secure-password'
);
```

## 🧪 Platform Support

### Node.js

- **Minimum version**: Node.js 15+ (for `crypto.webcrypto`)
- **Recommended**: Node.js 18 LTS or later
- **Key storage**: File system (`client_keys/` directory)
- **Security**: Full implementation with automatic key persistence

### Browsers

- **Supported browsers**: Modern browsers with Web Crypto API support
  - Chrome 37+
  - Firefox 34+
  - Safari 11+
  - Edge 79+
- **Key storage**: In-memory only (keys not persisted for security)
- **Security**: Best-effort memory protection (no OS-level locking)

## 📚 API Reference

### SecureChatCompletion

#### Constructor

```typescript
new SecureChatCompletion(config?: {
  baseUrl?: string;         // Default: 'https://api.nomyo.ai:12434'
  allowHttp?: boolean;      // Default: false
  apiKey?: string;          // Default: undefined
  secureMemory?: boolean;   // Default: true
})
```

#### Methods

- `create(request: ChatCompletionRequest): Promise<ChatCompletionResponse>`
- `acreate(request: ChatCompletionRequest): Promise<ChatCompletionResponse>` (alias)

### SecureCompletionClient

Lower-level API for advanced use cases.

#### Constructor

```typescript
new SecureCompletionClient(config?: {
  routerUrl?: string;       // Default: 'https://api.nomyo.ai:12434'
  allowHttp?: boolean;      // Default: false
  secureMemory?: boolean;   // Default: true
  keySize?: 2048 | 4096;   // Default: 4096
})
```

#### Methods

- `generateKeys(options?: KeyGenOptions): Promise<void>`
- `loadKeys(privateKeyPath: string, publicKeyPath?: string, password?: string): Promise<void>`
- `fetchServerPublicKey(): Promise<string>`
- `encryptPayload(payload: object): Promise<ArrayBuffer>`
- `decryptResponse(encrypted: ArrayBuffer, payloadId: string): Promise<object>`
- `sendSecureRequest(payload: object, payloadId: string, apiKey?: string): Promise<object>`

## 🔧 Configuration

### Local Development (HTTP)

```javascript
const client = new SecureChatCompletion({
  baseUrl: 'http://localhost:12434',
  allowHttp: true  // Required for HTTP connections
});
```

⚠️ **Warning**: Only use HTTP for local development. Never use in production!

### Disable Secure Memory

```javascript
const client = new SecureChatCompletion({
  baseUrl: 'https://api.nomyo.ai:12434',
  secureMemory: false  // Disable memory protection (not recommended)
});
```

## 📝 Security Best Practices

- ✅ Always use HTTPS in production
- ✅ Use password protection for private keys (Node.js)
- ✅ Keep private keys secure (permissions set to 600)
- ✅ Never share your private key
- ✅ Verify server's public key fingerprint before first use
- ✅ Enable secure memory protection (default)

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests on the project repository.

## 📄 License

See LICENSE file for licensing information.

## 📞 Support

For questions or issues, please refer to the project documentation or open an issue.
