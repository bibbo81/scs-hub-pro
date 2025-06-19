// netlify/functions/shipsgo-proxy.js - VERSIONE CORRETTA
// Proxy ottimizzato per bypassare CORS e gestire entrambe le API ShipsGo

exports.handler = async (event, context) => {
    // Headers CORS completi
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Shipsgo-User-Token, Authorization, X-ShipsGo-Version, X-ShipsGo-Endpoint',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400'
    };

    // Handle preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    console.log('[ShipsGo-Proxy] Request received:', {
        method: event.httpMethod,
        path: event.path,
        query: event.queryStringParameters,
        headers: Object.keys(event.headers || {})
    });

    try {
        // Parsing parametri dalla query string o body
        let requestData = {};
        
        if (event.httpMethod === 'GET') {
            requestData = event.queryStringParameters || {};
        } else if (event.body) {
            try {
                requestData = JSON.parse(event.body);
            } catch (parseError) {
                console.error('[ShipsGo-Proxy] JSON parse error:', parseError);
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid JSON in request body',
                        details: parseError.message
                    })
                };
            }
        }

        const {
            version = 'v1.2',
            endpoint = 'test',
            method = 'GET',
            params = {},
            body: requestBody = null
        } = requestData;

        console.log('[ShipsGo-Proxy] Parsed request:', {
            version,
            endpoint,
            method,
            params,
            bodySize: requestBody ? JSON.stringify(requestBody).length : 0
        });

        // Configurazione API - con fallback environment variables
        const apiConfig = {
            v1: {
                baseUrl: 'https://shipsgo.com/api/v1.2',
                authCode: process.env.SHIPSGO_V1_KEY || process.env.SHIPSGO_AUTH_CODE || '2dc0c6d92ccb59e7d903825c4ebeb521',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SupplyChainHub/1.0'
                }
            },
            v2: {
                baseUrl: 'https://api.shipsgo.com/api/v2',
                userToken: process.env.SHIPSGO_V2_TOKEN || process.env.SHIPSGO_USER_TOKEN || '505751c2-2745-4d83-b4e7-d35ccddd0628',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SupplyChainHub/1.0'
                }
            }
        };

        // Determina configurazione API
        let config;
        if (version === 'v2' || version === 'v2.0') {
            config = apiConfig.v2;
            config.headers['X-Shipsgo-User-Token'] = config.userToken;
        } else {
            config = apiConfig.v1;
        }

        // Costruisci URL
        let targetUrl = `${config.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        // Per v1.2, aggiungi authCode ai parametri query
        if (version !== 'v2' && version !== 'v2.0') {
            const urlObj = new URL(targetUrl);
            urlObj.searchParams.set('authCode', config.authCode);
            
            // Aggiungi altri parametri query
            Object.keys(params).forEach(key => {
                if (key !== 'authCode') { // Evita duplicati
                    urlObj.searchParams.set(key, params[key]);
                }
            });
            
            targetUrl = urlObj.toString();
        } else {
            // Per v2.0, aggiungi parametri query normalmente
            const urlObj = new URL(targetUrl);
            Object.keys(params).forEach(key => {
                urlObj.searchParams.set(key, params[key]);
            });
            targetUrl = urlObj.toString();
        }

        console.log('[ShipsGo-Proxy] Target URL:', targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***'));

        // Opzioni fetch
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: { ...config.headers },
            timeout: 30000 // 30 secondi timeout
        };

        // Aggiungi body se presente
        if (requestBody && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            fetchOptions.body = JSON.stringify(requestBody);
        }

        console.log('[ShipsGo-Proxy] Making request to ShipsGo...');
        
        // Esegui richiesta con timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        fetchOptions.signal = controller.signal;

        const response = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);

        console.log('[ShipsGo-Proxy] ShipsGo response:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
        });

        // Leggi risposta
        const responseText = await response.text();
        let responseData;

        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            // Se non è JSON valido, ritorna come testo
            responseData = {
                raw: responseText,
                isRawResponse: true
            };
        }

        // Headers di risposta con info di debug
        const responseHeaders = {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Proxy-Status': response.status.toString(),
            'X-Proxy-Version': version,
            'X-Proxy-Endpoint': endpoint,
            'X-Proxy-Timestamp': new Date().toISOString()
        };

        // Risposta formattata
        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            metadata: {
                version: version,
                endpoint: endpoint,
                method: method,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - Date.now() // Placeholder
            }
        };

        // Aggiungi informazioni di debug se non in produzione
        if (process.env.NODE_ENV !== 'production') {
            result.debug = {
                targetUrl: targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***'),
                requestHeaders: Object.keys(fetchOptions.headers),
                responseHeaders: Object.fromEntries(response.headers.entries())
            };
        }

        return {
            statusCode: response.ok ? 200 : response.status,
            headers: responseHeaders,
            body: JSON.stringify(result, null, 2)
        };

    } catch (error) {
        console.error('[ShipsGo-Proxy] Error:', error);

        // Gestione errori specifici
        let errorMessage = error.message;
        let statusCode = 500;

        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout';
            statusCode = 408;
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'DNS resolution failed';
            statusCode = 502;
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused';
            statusCode = 502;
        }

        const errorResponse = {
            success: false,
            error: errorMessage,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            metadata: {
                userAgent: event.headers['user-agent'] || 'Unknown',
                origin: event.headers.origin || 'Unknown'
            }
        };

        // Aggiungi stack trace in development
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
        }

        return {
            statusCode: statusCode,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'X-Error-Type': error.name || 'Unknown'
            },
            body: JSON.stringify(errorResponse, null, 2)
        };
    }
};

// Funzione helper per test locali
if (require.main === module) {
    // Test runner per sviluppo locale
    const testEvent = {
        httpMethod: 'GET',
        queryStringParameters: {
            version: 'v1.2',
            endpoint: 'test'
        },
        headers: {},
        body: null
    };

    exports.handler(testEvent, {})
        .then(response => {
            console.log('Test response:', JSON.stringify(response, null, 2));
        })
        .catch(error => {
            console.error('Test error:', error);
        });
}