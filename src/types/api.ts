/**
 * OpenAI-compatible API type definitions
 * These types match the OpenAI Chat Completion API for full compatibility
 */

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    name?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface FunctionDefinition {
    name: string;
    description?: string;
    parameters?: object;
}

export interface Tool {
    type: 'function';
    function: FunctionDefinition;
}

export type ToolChoice = 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };

export interface ChatCompletionRequest {
    model: string;
    messages: Message[];

    // Optional parameters (matching OpenAI API)
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | string[];
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    user?: string;

    // Tool/Function calling
    tools?: Tool[];
    tool_choice?: ToolChoice;

    // Additional parameters
    [key: string]: unknown;
}

export interface Usage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface Choice {
    index: number;
    message: Message;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
    logprobs?: unknown;
}

export interface ResponseMetadata {
    payload_id: string;
    processed_at: number;
    is_encrypted: boolean;
    encryption_algorithm: string;
    response_status: string;
}

export interface ChatCompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Choice[];
    usage?: Usage;
    system_fingerprint?: string;

    // NOMYO-specific metadata
    _metadata?: ResponseMetadata;
}

// Streaming types (for future implementation)
export interface ChatCompletionChunk {
    id: string;
    object: 'chat.completion.chunk';
    created: number;
    model: string;
    choices: {
        index: number;
        delta: Partial<Message>;
        finish_reason: string | null;
    }[];
}
