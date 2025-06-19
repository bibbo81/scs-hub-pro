// netlify/functions/shipsgo-proxy.js - VERSIONE CORRETTA
exports.handler = async (event, context) => {
    console.log('[ShipsGo-Proxy] Request received');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shipsgo-User-Token',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        let requestData = {};
        
        if (event.httpMethod === 'GET') {
            requestData = event.queryStringParameters || {};
        } else if (event.body) {
            requestData = JSON.parse(event.body);
        }

        const {
            version = 'v1.2',
            endpoint = '/ContainerService/GetShippingLineList',
            method = 'GET',
            params = {},
            body: requestBody = null
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
            headers: { 'Content-Type': 'application/json' }
        };

        if (isV2) {
            fetchOptions.headers['X-Shipsgo-User-Token'] = config.userToken;
        }

        if (requestBody && ['POST', 'PUT'].includes(method.toUpperCase())) {
            fetchOptions.body = JSON.stringify(requestBody);
        }

        // Make request
        const response = await fetch(targetUrl, fetchOptions);
        const responseText = await response.text();
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { raw: responseText };
        }

        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            metadata: {
                targetUrl: targetUrl.replace(/(authCode|User-Token)=[^&]+/g, '$1=***'),
                version,
                endpoint
            }
        };

        return {
            statusCode: response.ok ? 200 : response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(result, null, 2)
        };

    } catch (error) {
        console.error('[ShipsGo-Proxy] Error:', error);
        
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};