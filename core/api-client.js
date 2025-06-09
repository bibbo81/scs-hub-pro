// api-client.js - Client API unificato con gestione errori ES6
import notificationSystem from '/core/notification-system.js';
import { authInit, auth } from '/core/auth-init.js';

export class ApiClient {
    constructor() {
        this.baseUrl = '/.netlify/functions';
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
        const token = authInit?.getToken() || 
                     localStorage.getItem('sb-access-token') ||
                     sessionStorage.getItem('sb-access-token');
        this.setToken(token);
        return token;
    }
    
    // Main request method
    async request(endpoint, options = {}) {
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
        
        try {
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
            
            // Check response status
            if (!response.ok) {
                const error = new Error(data.error || data.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }
            
            // Run response interceptors
            for (const interceptor of this.interceptors.response) {
                data = await interceptor(data, response) || data;
            }
            
            return data;
            
        } catch (error) {
            // Run error interceptors
            for (const interceptor of this.interceptors.error) {
                await interceptor(error);
            }
            
            // Default error handling
            this.handleError(error, options);
            throw error;
        }
    }
    
    // Error handling
    handleError(error, options = {}) {
        // Skip notification if specified
        if (options.silent) return;
        
        let message = 'Si è verificato un errore';
        
        if (error.status === 401) {
            message = 'Sessione scaduta. Effettua nuovamente il login.';
            // Auto logout after 2 seconds
            setTimeout(() => {
                auth?.logout();
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
}

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