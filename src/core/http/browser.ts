/**
 * Browser HTTP client using Fetch API
 */

import { HttpClient, HttpResponse, HttpRequestOptions } from './client';

export class BrowserHttpClient implements HttpClient {
    /**
     * Send POST request
     */
    async post(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
        const { headers = {}, body, timeout = 60000 } = options;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Read response body as ArrayBuffer
            const responseBody = await response.arrayBuffer();

            // Convert headers to plain object
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            return {
                statusCode: response.status,
                headers: responseHeaders,
                body: responseBody,
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Send GET request
     */
    async get(url: string, options: Omit<HttpRequestOptions, 'body'> = {}): Promise<HttpResponse> {
        const { headers = {}, timeout = 60000 } = options;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Read response body as ArrayBuffer
            const responseBody = await response.arrayBuffer();

            // Convert headers to plain object
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            return {
                statusCode: response.status,
                headers: responseHeaders,
                body: responseBody,
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
}
