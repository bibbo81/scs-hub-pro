// netlify/functions/shipsgo-proxy.js - VERSIONE FINALE CORRETTA
// Fix per il problema di URL building

exports.handler = async (event, context) => {
    console.log('[ShipsGo-Proxy] Request received:', {
        method: event.httpMethod,
        query: event.queryStringParameters,
        bodyLength: event.body ? event.body.length : 0
    });

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shipsgo-User-Token',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Parse request data
        let requestData = {};
        
        if (event.httpMethod === 'GET') {
            requestData = event.queryStringParameters || {};
        } else if (event.body) {
            try {
                requestData = JSON.parse(event.body);
            } catch (e) {
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid JSON in request body',
                        details: e.message
                    })
                };
            }
        }

        console.log('[ShipsGo-Proxy] Parsed request data:', requestData);

        // Extract parameters with defaults
        const {
            version = 'v1.2',
            endpoint = 'test',
            method = 'GET',
            params = {},
            body: requestBody = null
        } = requestData;

        // API Configuration with environment variables
        const apiConfig = {
            v1: {
                baseUrl: 'https://shipsgo.com/api/v1.2',
                authCode: process.env.SHIPSGO_V1_KEY || process.env.SHIPSGO_AUTH_CODE || '2dc0c6d92ccb59e7d903825c4ebeb521'
            },
            v2: {
                baseUrl: 'https://api.shipsgo.com/api/v2',
                userToken: process.env.SHIPSGO_V2_TOKEN || process.env.SHIPSGO_USER_TOKEN || '505751c2-2745-4d83-b4e7-d35ccddd0628'
            }
        };

        // Determine which API to use
        const isV2 = version === 'v2' || version === 'v2.0';
        const config = isV2 ? apiConfig.v2 : apiConfig.v1;

        console.log('[ShipsGo-Proxy] Using API:', isV2 ? 'v2.0' : 'v1.2');

        // 🔧 FIX: Correct URL building
        let targetUrl;
        
        // Ensure endpoint starts with /
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        
        // Build base URL
        targetUrl = config.baseUrl + cleanEndpoint;
        
        console.log('[ShipsGo-Proxy] Base URL built:', targetUrl);

        // Build query parameters
        const urlObj = new URL(targetUrl);
        
        // For v1.2, add authCode to query params
        if (!isV2) {
            urlObj.searchParams.set('authCode', config.authCode);
            console.log('[ShipsGo-Proxy] Added authCode for v1.2');
        }
        
        // Add other parameters
        Object.keys(params).forEach(key => {
            if (key !== 'authCode') { // Avoid duplicates
                urlObj.searchParams.set(key, params[key]);
            }
        });

        // Special handling for test calls
        if (requestData.test === true || requestData.test === 'true') {
            console.log('[ShipsGo-Proxy] Test mode detected, using /test endpoint');
            urlObj.pathname = urlObj.pathname.replace(/\/test$/, '') + '/test';
        }

        targetUrl = urlObj.toString();
        
        console.log('[ShipsGo-Proxy] Final target URL:', targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***'));

        // Prepare fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'SupplyChainHub/1.0'
            }
        };

        // Add authentication header for v2.0
        if (isV2) {
            fetchOptions.headers['X-Shipsgo-User-Token'] = config.userToken;
            console.log('[ShipsGo-Proxy] Added User-Token header for v2.0');
        }

        // Add body for POST/PUT requests
        if (requestBody && ['POST', 'PUT'].includes(method.toUpperCase())) {
            fetchOptions.body = JSON.stringify(requestBody);
            console.log('[ShipsGo-Proxy] Added request body:', JSON.stringify(requestBody).length, 'bytes');
        }

        console.log('[ShipsGo-Proxy] Making request to ShipsGo...');

        // Make the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        fetchOptions.signal = controller.signal;

        const response = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);

        console.log('[ShipsGo-Proxy] ShipsGo response:', {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'content-type': response.headers.get('content-type'),
                'content-length': response.headers.get('content-length')
            }
        });

        // Read response
        const responseText = await response.text();
        let responseData;

        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.log('[ShipsGo-Proxy] Response is not JSON, treating as text');
            responseData = { raw: responseText, isRawResponse: true };
        }

        // Build final response
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
                targetUrl: targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***')
            }
        };

        // Add debug info in development
        if (process.env.NODE_ENV !== 'production') {
            result.debug = {
                requestData: requestData,
                finalUrl: targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***'),
                requestHeaders: Object.keys(fetchOptions.headers),
                responseSize: responseText.length
            };
        }

        return {
            statusCode: response.ok ? 200 : response.status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'X-Proxy-Status': response.status.toString(),
                'X-Proxy-Version': version
            },
            body: JSON.stringify(result, null, 2)
        };

    } catch (error) {
        console.error('[ShipsGo-Proxy] Error:', error);

        // Handle specific errors
        let statusCode = 500;
        let errorMessage = error.message;

        if (error.name === 'AbortError') {
            statusCode = 408;
            errorMessage = 'Request timeout - ShipsGo API took too long to respond';
        } else if (error.code === 'ENOTFOUND') {
            statusCode = 502;
            errorMessage = 'DNS resolution failed - cannot reach ShipsGo servers';
        } else if (error.code === 'ECONNREFUSED') {
            statusCode = 502;
            errorMessage = 'Connection refused - ShipsGo servers may be down';
        }

        const errorResponse = {
            success: false,
            error: errorMessage,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            metadata: {
                function: 'shipsgo-proxy',
                version: '1.0.0'
            }
        };

        // Add stack trace in development
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
            errorResponse.originalError = error.toString();
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

// 🧪 Helper function for local testing
if (require.main === module) {
    console.log('🧪 Testing ShipsGo Proxy locally...');
    
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
            console.log('✅ Test successful:', JSON.stringify(response, null, 2));
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
        });
}