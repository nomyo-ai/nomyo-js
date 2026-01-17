/**
 * OpenAI-compatible secure chat completion API
 * Provides a drop-in replacement for OpenAI's ChatCompletion API with end-to-end encryption
 */

import { SecureCompletionClient } from '../core/SecureCompletionClient';
import { ChatCompletionConfig } from '../types/client';
import { ChatCompletionRequest, ChatCompletionResponse } from '../types/api';

export class SecureChatCompletion {
    private client: SecureCompletionClient;
    private apiKey?: string;

    constructor(config: ChatCompletionConfig = {}) {
        const {
            baseUrl = 'https://api.nomyo.ai:12434',
            allowHttp = false,
            apiKey,
            secureMemory = true,
        } = config;

        this.apiKey = apiKey;
        this.client = new SecureCompletionClient({
            routerUrl: baseUrl,
            allowHttp,
            secureMemory,
        });
    }

    /**
     * Create a chat completion (matches OpenAI API)
     * @param request Chat completion request
     * @returns Chat completion response
     */
    async create(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        // Generate unique payload ID
        const payloadId = `openai-compat-${this.generatePayloadId()}`;

        // Extract API key from request or use instance key
        const apiKey = (request as any).api_key || this.apiKey;

        // Remove api_key from payload if present (it's in headers)
        const payload = { ...request };
        delete (payload as any).api_key;

        // Validate required fields
        if (!payload.model) {
            throw new Error('Missing required field: model');
        }
        if (!payload.messages || !Array.isArray(payload.messages)) {
            throw new Error('Missing or invalid required field: messages');
        }

        // Send secure request
        const response = await this.client.sendSecureRequest(
            payload,
            payloadId,
            apiKey
        );

        return response as ChatCompletionResponse;
    }

    /**
     * Async alias for create() (for compatibility with OpenAI SDK)
     */
    async acreate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        return this.create(request);
    }

    /**
     * Generate a unique payload ID
     */
    private generatePayloadId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${random}`;
    }
}
