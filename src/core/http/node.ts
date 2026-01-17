/**
 * Node.js HTTP client using native https module
 */

import { HttpClient, HttpResponse, HttpRequestOptions } from './client';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export class NodeHttpClient implements HttpClient {
    /**
     * Send POST request
     */
    async post(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
        const { headers = {}, body, timeout = 60000 } = options;

        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            // Convert body to Buffer
            const bodyBuffer = body instanceof ArrayBuffer
                ? Buffer.from(body)
                : Buffer.from(body, 'utf-8');

            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': bodyBuffer.length,
                },
                timeout: timeout,
            };

            const req = httpModule.request(requestOptions, (res) => {
                const chunks: Buffer[] = [];

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    const responseBody = Buffer.concat(chunks);

                    // Convert headers to plain object
                    const responseHeaders: Record<string, string> = {};
                    Object.entries(res.headers).forEach(([key, value]) => {
                        if (value) {
                            responseHeaders[key] = Array.isArray(value) ? value[0] : value;
                        }
                    });

                    resolve({
                        statusCode: res.statusCode || 0,
                        headers: responseHeaders,
                        body: responseBody.buffer.slice(
                            responseBody.byteOffset,
                            responseBody.byteOffset + responseBody.byteLength
                        ),
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(bodyBuffer);
            req.end();
        });
    }

    /**
     * Send GET request
     */
    async get(url: string, options: Omit<HttpRequestOptions, 'body'> = {}): Promise<HttpResponse> {
        const { headers = {}, timeout = 60000 } = options;

        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: headers,
                timeout: timeout,
            };

            const req = httpModule.request(requestOptions, (res) => {
                const chunks: Buffer[] = [];

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    const responseBody = Buffer.concat(chunks);

                    // Convert headers to plain object
                    const responseHeaders: Record<string, string> = {};
                    Object.entries(res.headers).forEach(([key, value]) => {
                        if (value) {
                            responseHeaders[key] = Array.isArray(value) ? value[0] : value;
                        }
                    });

                    resolve({
                        statusCode: res.statusCode || 0,
                        headers: responseHeaders,
                        body: responseBody.buffer.slice(
                            responseBody.byteOffset,
                            responseBody.byteOffset + responseBody.byteLength
                        ),
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }
}
