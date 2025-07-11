// api-client.js - Client API unificato con gestione errori ES6
import notificationSystem from '/core/notification-system.js';

export class ApiClient {
    constructor() {
        this.baseUrl = '/netlify/functions';
        this.token = null;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.interceptors = {
            request: [],
            response: [],
            error: []
        };
    }
    
    // Set token
    setToken(token) {
        this.token = token;
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
    }
    
    // Get token from auth
    refreshToken() {
        const token = window.authInit?.getToken() || 
                     localStorage.getItem('sb-access-token') ||
                     sessionStorage.getItem('sb-access-token');
        this.setToken(token);
        return token;
    }
    
    // Main request method with session protection
    async request(endpoint, options = {}) {
        try {
            // Wait for valid session before making API calls (except for login/public endpoints)
            const isAuthRequired = !this._isPublicEndpoint(endpoint);
            
            if (isAuthRequired) {
                console.log('🔄 [ApiClient] Waiting for valid session...');
                await window.supabaseReady;
                
                // Double-check session is still valid
                if (!window.currentSession || !window.currentUser) {
                    throw new Error('Session expired or invalid. Please log in again.');
                }
            }
            
            // Ensure we have latest token
            this.refreshToken();
            
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint}`;
            
            const config = {
                ...options,
                headers: {
                    ...this.defaultHeaders,
                    ...options.headers
                }
            };
            
            // Run request interceptors
            for (const interceptor of this.interceptors.request) {
                await interceptor(config);
            }
            
            // Show loading if specified
            let loadingId;
            if (options.loading) {
                loadingId = notificationSystem.loading(
                    typeof options.loading === 'string' ? options.loading : 'Caricamento...'
                );
            }
            
            const response = await fetch(url, config);
            const contentType = response.headers.get('content-type');
            
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            // Dismiss loading
            if (loadingId) {
                notificationSystem.dismiss(loadingId);
            }
            
            // Check response status and provide better error messages
            if (!response.ok) {
                let errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
                
                // Provide user-friendly messages for common errors
                if (response.status === 401) {
                    errorMessage = 'Session expired or unauthorized. Please log in again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission to perform this action.';
                } else if (response.status === 404) {
                    errorMessage = 'Resource not found.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
                
                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = data;
                throw error;
            }
            
            // Protect against null/undefined responses
            if (data && typeof data === 'object') {
                // Add safe accessors for common array operations
                this._addSafeAccessors(data);
            }
            
            // Run response interceptors
            for (const interceptor of this.interceptors.response) {
                data = await interceptor(data, response) || data;
            }
            
            return data;
            
        } catch (error) {
            // Dismiss loading on error
            if (loadingId) {
                notificationSystem.dismiss(loadingId);
            }
            
            // Enhanced error logging
            console.error(`❌ [ApiClient] ${config.method || 'GET'} ${url} failed:`, {
                error: error.message,
                status: error.status,
                endpoint,
                data: error.data
            });
            
            // Run error interceptors
            for (const interceptor of this.interceptors.error) {
                await interceptor(error);
            }
            
            // Default error handling
            this.handleError(error, options);
            throw error;
        }
    }
    
    // Helper to check if endpoint requires authentication
    _isPublicEndpoint(endpoint) {
        const publicEndpoints = [
            'login',
            'signup', 
            'reset-password',
            'config',
            'health'
        ];
        
        return publicEndpoints.some(pub => endpoint.includes(pub));
    }
    
    // Helper to add safe accessors to response data
    _addSafeAccessors(data) {
        // Protect array operations like map, filter, etc.
        if (Array.isArray(data)) {
            return data;
        }
        
        // Protect object properties that might be used in array operations
        const protectedProps = ['checkoutUrls', 'items', 'results', 'data'];
        protectedProps.forEach(prop => {
            if (data[prop] && !Array.isArray(data[prop])) {
                console.warn(`⚠️ [ApiClient] Property '${prop}' is not an array:`, typeof data[prop]);
                // Convert to empty array to prevent TypeError
                data[prop] = [];
            }
        });
        
        return data;
    }
    // ❌ RIMUOVI QUESTA RIGA 185: }
    
    // Enhanced error handling with better user feedback
    handleError(error, options = {}) {
        // Skip notification if specified
        if (options.silent) return;
        
        // Special handling for session-related errors
        if (error.message?.includes('Session expired') || error.message?.includes('unauthorized')) {
            notificationSystem.error('La tua sessione è scaduta. Verrai reindirizzato alla pagina di login.');
            setTimeout(() => {
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
            }, 2000);
            return;
        }
        
        // ADD THIS: Special handling for 404 in development with mock data
        if (error.status === 404 && (window.MockData?.enabled || window.FORCE_MOCK_API)) {
            console.log('[API] 404 error in dev mode, suppressing notification');
            return; // Don't show error notification in dev mode
        }
        
        let message = 'Si è verificato un errore';
        
        if (error.status === 401) {
            message = 'Sessione scaduta. Effettua nuovamente il login.';
            // Auto logout after 2 seconds
            setTimeout(() => {
                if (window.auth?.logout) {
                    window.auth.logout();
                } else if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
            }, 2000);
        } else if (error.status === 403) {
            message = 'Non hai i permessi per questa operazione';
        } else if (error.status === 404) {
            message = 'Risorsa non trovata';
        } else if (error.status === 422) {
            message = 'Dati non validi';
        } else if (error.status >= 500) {
            message = 'Errore del server. Riprova più tardi.';
        } else if (error.message) {
            message = error.message;
        }
        
        notificationSystem.error(message);
    }
    
    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'GET'
        });
    }
    
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }
    
    // Interceptors
    addRequestInterceptor(fn) {
        this.interceptors.request.push(fn);
    }
    
    addResponseInterceptor(fn) {
        this.interceptors.response.push(fn);
    }
    
    addErrorInterceptor(fn) {
        this.interceptors.error.push(fn);
    }
    
    // Utility methods
    async uploadFile(endpoint, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional fields
        if (options.data) {
            Object.entries(options.data).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        
        // Remove Content-Type to let browser set it with boundary
        const headers = { ...this.defaultHeaders };
        delete headers['Content-Type'];
        
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: formData,
            headers: {
                ...headers,
                ...options.headers
            }
        });
    }
    
    // Batch requests
    async batch(requests) {
        const promises = requests.map(req => {
            const { method, endpoint, data, options } = req;
            return this[method.toLowerCase()](endpoint, data, options)
                .then(result => ({ success: true, data: result }))
                .catch(error => ({ success: false, error }));
        });
        
        return Promise.all(promises);
    }
} // ✅ QUESTA È LA CHIUSURA CORRETTA DELLA CLASSE

// Create singleton instance
const apiClient = new ApiClient();

// Auto-refresh token on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        apiClient.refreshToken();
    });
} else {
    apiClient.refreshToken();
}

// Export singleton
export default apiClient;