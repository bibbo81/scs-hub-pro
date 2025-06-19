// netlify/functions/shipsgo-proxy.js
// Proxy per bypassare CORS e chiamare le API ShipsGo

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-ShipsGo-Version, X-ShipsGo-Endpoint',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Get request details
        const { 
            version = 'v1', 
            endpoint = '',
            method = 'GET'
        } = event.queryStringParameters || {};
        
        const requestBody = event.body ? JSON.parse(event.body) : null;
        
        // Get API credentials from environment
        const SHIPSGO_V1_KEY = process.env.SHIPSGO_V1_KEY || '2dc0c6d92ccb59e7d903825c4ebeb521';
        const SHIPSGO_V2_TOKEN = process.env.SHIPSGO_V2_TOKEN || '505751c2-2745-4d83-b4e7-d35ccddd0628';

        let apiUrl = '';
        let apiHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'SupplyChainHub/1.0'
        };
        let apiBody = null;

        // Route to appropriate API version
        if (version === 'v1' || version === 'v1.2') {
            // ShipsGo v1.2 - Container/Maritime
            const baseUrl = 'https://shipsgo.com/api/v1.2';
            
            switch(endpoint) {
                case 'container/add':
                    apiUrl = `${baseUrl}/container/add?authCode=${SHIPSGO_V1_KEY}`;
                    apiBody = requestBody;
                    break;
                    
                case 'container/info':
                    const containerNumber = event.queryStringParameters.containerNumber;
                    apiUrl = `${baseUrl}/container/info?authCode=${SHIPSGO_V1_KEY}&containerNumber=${containerNumber}`;
                    break;
                    
                case 'test':
                    apiUrl = `${baseUrl}/test?authCode=${SHIPSGO_V1_KEY}`;
                    break;
                    
                default:
                    throw new Error(`Unknown v1.2 endpoint: ${endpoint}`);
            }
            
        } else if (version === 'v2' || version === 'v2.0') {
            // ShipsGo v2.0 - AWB/Air
            const baseUrl = 'https://api.shipsgo.com/api/v2';
            apiHeaders['X-Shipsgo-User-Token'] = SHIPSGO_V2_TOKEN;
            
            switch(endpoint) {
                case 'airtracking/shipments':
                    if (event.httpMethod === 'POST') {
                        apiUrl = `${baseUrl}/airtracking/shipments`;
                        apiBody = requestBody;
                    } else {
                        const awbNumber = event.queryStringParameters.awbNumber;
                        apiUrl = `${baseUrl}/airtracking/shipments?awbNumber=${awbNumber}`;
                    }
                    break;
                    
                case 'test':
                    apiUrl = `${baseUrl}/test`;
                    break;
                    
                default:
                    throw new Error(`Unknown v2.0 endpoint: ${endpoint}`);
            }
            
        } else {
            throw new Error(`Unknown API version: ${version}`);
        }

        console.log(`[Proxy] Calling ${apiUrl}`);

        // Make the API request
        const response = await fetch(apiUrl, {
            method: event.httpMethod,
            headers: apiHeaders,
            body: apiBody ? JSON.stringify(apiBody) : undefined
        });

        const responseData = await response.text();
        let jsonData;
        
        try {
            jsonData = JSON.parse(responseData);
        } catch (e) {
            jsonData = { raw: responseData };
        }

        console.log(`[Proxy] Response status: ${response.status}`);

        return {
            statusCode: response.status,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: response.ok,
                status: response.status,
                data: jsonData,
                debug: {
                    url: apiUrl.replace(SHIPSGO_V1_KEY, 'xxx').replace(SHIPSGO_V2_TOKEN, 'xxx'),
                    method: event.httpMethod,
                    version: version
                }
            })
        };

    } catch (error) {
        console.error('[Proxy] Error:', error);
        
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
