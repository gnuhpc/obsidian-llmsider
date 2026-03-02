import { requestUrl, RequestUrlResponse, Platform } from 'obsidian';
import * as https from 'https';
import * as http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Logger } from './logger';

export interface ObsidianFetchOptions extends RequestInit {
    proxyEnabled?: boolean;
    proxyType?: 'socks5' | 'http' | 'https';
    proxyHost?: string;
    proxyPort?: number;
    proxyAuth?: boolean;
    proxyUsername?: string;
    proxyPassword?: string;
}

/**
 * A fetch-compatible implementation for Obsidian that bypasses CORS
 * by using Node.js https module on Desktop and requestUrl on Mobile.
 */
export async function obsidianFetch(
    url: string | URL,
    options: ObsidianFetchOptions = {}
): Promise<Response> {
    const urlStr = url.toString();
    const isDesktop = Platform.isDesktop;

    if (isDesktop) {
        try {
            return await nodeFetch(urlStr, options);
        } catch (err) {
            // On Desktop, Node.js direct fetch can fail in some Electron environments
            // (e.g., network blocked by Electron security policy, GFW, or DNS issues).
            // Fall back to Obsidian's requestUrl API which has proper Electron network access.
            // Note: requestUrl does not support streaming, so streaming responses will be buffered.
            Logger.warn('[ObsidianFetch] nodeFetch failed, falling back to requestUrl:', err instanceof Error ? err.message : String(err));
            return obsidianRequestUrlFetch(urlStr, options);
        }
    } else {
        return obsidianRequestUrlFetch(urlStr, options);
    }
}

/**
 * Use Node.js https/http modules to bypass CORS and support streaming on Desktop.
 */
async function nodeFetch(urlStr: string, options: ObsidianFetchOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(urlStr);
            const isHttps = url.protocol === 'https:';
            const requestModule = isHttps ? https : http;

            const headers: Record<string, string> = {};
            if (options.headers) {
                if (options.headers instanceof Headers) {
                    options.headers.forEach((value, key) => {
                        headers[key] = value;
                    });
                } else if (Array.isArray(options.headers)) {
                    options.headers.forEach(([key, value]) => {
                        headers[key] = value;
                    });
                } else {
                    Object.entries(options.headers).forEach(([key, value]) => {
                        headers[key] = value as string;
                    });
                }
            }

            // Create proxy agent if enabled
            let agent: any = undefined;
            if (options.proxyEnabled && options.proxyHost && options.proxyPort) {
                const proxyAuth = options.proxyAuth && options.proxyUsername && options.proxyPassword
                    ? `${options.proxyUsername}:${options.proxyPassword}@`
                    : '';
                
                const proxyUrl = `${options.proxyType || 'http'}://${proxyAuth}${options.proxyHost}:${options.proxyPort}`;
                
                try {
                    if (options.proxyType === 'socks5') {
                        agent = new SocksProxyAgent(proxyUrl);
                    } else {
                        agent = new HttpsProxyAgent(proxyUrl);
                    }
                } catch (proxyError) {
                    Logger.error('[ObsidianFetch] Failed to create proxy agent:', proxyError);
                }
            }

            const requestOptions: https.RequestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers,
                agent,
                signal: options.signal
            };

            const req = requestModule.request(requestOptions, (res) => {
                const responseHeaders = new Headers();
                Object.entries(res.headers).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value.forEach(v => responseHeaders.append(key, v));
                    } else if (value) {
                        responseHeaders.set(key, value);
                    }
                });

                const stream = new ReadableStream({
                    start(controller) {
                        res.on('data', (chunk) => {
                            controller.enqueue(new Uint8Array(chunk));
                        });
                        res.on('end', () => {
                            controller.close();
                        });
                        res.on('error', (err) => {
                            controller.error(err);
                        });
                    }
                });

                const response = new Response(stream, {
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: responseHeaders
                });

                resolve(response);
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (options.signal) {
                options.signal.addEventListener('abort', () => {
                    req.destroy();
                    reject(new Error('Aborted'));
                });
            }

            if (options.body) {
                if (typeof options.body === 'string') {
                    req.write(options.body);
                } else if (options.body instanceof ArrayBuffer) {
                    req.write(Buffer.from(options.body));
                } else if (Buffer.isBuffer(options.body)) {
                    req.write(options.body);
                } else if (options.body instanceof Uint8Array) {
                    req.write(Buffer.from(options.body));
                } else {
                    // Handle other body types if necessary
                    req.write(options.body.toString());
                }
            }

            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Use Obsidian's requestUrl as fallback (primarily for Mobile).
 * Note: This does not support streaming!
 */
async function obsidianRequestUrlFetch(url: string, options: ObsidianFetchOptions): Promise<Response> {
    const headers: Record<string, string> = {};
    if (options.headers) {
        if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => {
                headers[key] = value;
            });
        } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
                headers[key] = value;
            });
        } else {
            Object.entries(options.headers).forEach(([key, value]) => {
                headers[key] = value as string;
            });
        }
    }

    const response = await requestUrl({
        url,
        method: options.method || 'GET',
        headers,
        body: options.body as string | ArrayBuffer,
        throw: false
    });

    const responseHeaders = new Headers();
    Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders.set(key, value);
    });

    return new Response(response.arrayBuffer, {
        status: response.status,
        headers: responseHeaders
    });
}
