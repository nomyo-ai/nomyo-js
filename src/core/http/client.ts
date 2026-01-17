/**
 * HTTP client abstraction
 * Provides a platform-agnostic interface for making HTTP requests
 */

export interface HttpResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: ArrayBuffer;
}

export interface HttpRequestOptions {
    headers?: Record<string, string>;
    body: ArrayBuffer | string;
    timeout?: number;
}

export interface HttpClient {
    post(url: string, options: HttpRequestOptions): Promise<HttpResponse>;
    get(url: string, options?: Omit<HttpRequestOptions, 'body'>): Promise<HttpResponse>;
}

/**
 * Create an HTTP client for the current platform
 */
export function createHttpClient(): HttpClient {
    if (typeof window !== 'undefined') {
        // Browser environment
        const BrowserHttpClient = require('./browser').BrowserHttpClient;
        return new BrowserHttpClient();
    } else {
        // Node.js environment
        const NodeHttpClient = require('./node').NodeHttpClient;
        return new NodeHttpClient();
    }
}
