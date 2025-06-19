// netlify/functions/shipsgo-proxy.js - RESPONSE FORMAT FIX
exports.handler = async (event, context) => {
    console.log('[ShipsGo-Proxy] Request received');

    // SIMPLIFIED CORS headers for better compatibility
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8'
    };

    // Handle preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ success: true })
        };
    }

    try {
        let requestData = {};
        
        if (event.httpMethod === 'GET') {
            requestData = event.queryStringParameters || {};
        } else if (event.body) {
            try {
                requestData = JSON.parse(event.body);
            } catch (parseError) {
                console.error('[ShipsGo-Proxy] Body parse error:', parseError);
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid JSON in request body'
                    })
                };
            }
        }

        const {
            version = 'v1.2',
            endpoint = '/ContainerService/GetShippingLineList',
            method = 'GET',
            params = {},
            data = {}
        } = requestData;

        // API Configuration
        const apiConfig = {
            v1: {
                baseUrl: 'https://shipsgo.com/api/v1.2',
                authCode: process.env.SHIPSGO_V1_KEY || '2dc0c6d92ccb59e7d903825c4ebeb521'
            },
            v2: {
                baseUrl: 'https://api.shipsgo.com/api/v2',
                userToken: process.env.SHIPSGO_V2_TOKEN || '505751c2-2745-4d83-b4e7-d35ccddd0628'
            }
        };

        const isV2 = version === 'v2' || version === 'v2.0';
        const config = isV2 ? apiConfig.v2 : apiConfig.v1;

        // Build URL
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        let targetUrl = config.baseUrl + cleanEndpoint;
        
        const urlObj = new URL(targetUrl);
        
        // Add auth for v1.2
        if (!isV2) {
            urlObj.searchParams.set('authCode', config.authCode);
        }
        
        // Add other params
        Object.keys(params).forEach(key => {
            if (key !== 'authCode') {
                urlObj.searchParams.set(key, params[key]);
            }
        });

        targetUrl = urlObj.toString();
        console.log('[ShipsGo-Proxy] Target URL:', targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***'));

        // Fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'SCH-TrackingSystem/1.0'
            },
            timeout: 30000 // 30 second timeout
        };

        if (isV2) {
            fetchOptions.headers['X-Shipsgo-User-Token'] = config.userToken;
        }

        if (data && Object.keys(data).length > 0 && ['POST', 'PUT'].includes(method.toUpperCase())) {
            const bodyData = { ...data };
            if (!isV2) {
                bodyData.authCode = config.authCode;
            }
            fetchOptions.body = JSON.stringify(bodyData);
        }

        // Make request to ShipsGo
        console.log('[ShipsGo-Proxy] Calling ShipsGo API...');
        const response = await fetch(targetUrl, fetchOptions);
        
        // Get response text first
        const responseText = await response.text();
        console.log('[ShipsGo-Proxy] Response status:', response.status);
        console.log('[ShipsGo-Proxy] Response size:', responseText.length, 'bytes');
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.warn('[ShipsGo-Proxy] JSON parse failed, returning raw text');
            responseData = { 
                raw_text: responseText,
                parse_error: parseError.message 
            };
        }

        // SIMPLIFIED response format for better Promise resolution
        const result = {
            success: response.ok,
            status: response.status,
            data: responseData
        };

        // Add error info if needed
        if (!response.ok) {
            result.error = response.statusText;
            result.statusText = response.statusText;
        }

        console.log('[ShipsGo-Proxy] Response success:', result.success);
        console.log('[ShipsGo-Proxy] Data type:', typeof result.data);

        // CRITICAL FIX: Return CLEAN JSON without pretty print
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result) // NO pretty print indentation
        };

    } catch (error) {
        console.error('[ShipsGo-Proxy] Function error:', error);
        
        // SIMPLIFIED error response
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message,
                code: 'PROXY_ERROR'
            })
        };
    }
};