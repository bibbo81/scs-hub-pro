// global-functions-protection.js - Protect global functions from undefined errors
// This should be loaded early to prevent runtime errors

console.log('🛡️ Setting up global functions protection...');

// Safe access wrapper
function safeAccess(obj, path, fallback = null) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : fallback;
    }, obj);
}

// Create protected global functions
window.safeGlobals = {
    // Safe tracking service access
    trackingService: {
        hasApiKeys: () => safeAccess(window, 'trackingService.hasApiKeys', () => false)(),
        track: (...args) => {
            const service = safeAccess(window, 'trackingService.track');
            return service ? service.apply(window.trackingService, args) : Promise.resolve(null);
        },
        initialize: () => {
            const service = safeAccess(window, 'trackingService.initialize');
            return service ? service.apply(window.trackingService) : Promise.resolve(false);
        }
    },
    
    // Safe session access
    currentSession: () => safeAccess(window, 'currentSession'),
    currentUser: () => safeAccess(window, 'currentUser'),
    
    // Safe auth access
    auth: {
        logout: () => {
            const auth = safeAccess(window, 'auth.logout');
            if (auth) {
                auth.apply(window.auth);
            } else {
                console.warn('Auth logout not available, redirecting to login');
                window.location.href = '/login.html';
            }
        }
    },
    
    // Safe Supabase access
    supabase: () => safeAccess(window, 'supabase'),
    supabaseReady: () => window.supabaseReady || Promise.resolve(),
    
    // Safe notification system
    showError: (message) => {
        const notificationSystem = safeAccess(window, 'notificationSystem');
        if (notificationSystem && notificationSystem.error) {
            notificationSystem.error(message);
        } else {
            console.error('Notification System:', message);
            alert(message); // Fallback
        }
    },
    
    showSuccess: (message) => {
        const notificationSystem = safeAccess(window, 'notificationSystem');
        if (notificationSystem && notificationSystem.success) {
            notificationSystem.success(message);
        } else {
            console.log('Success:', message);
        }
    }
};

// Protect specific global checks that are commonly causing errors
const protectGlobalChecks = () => {
    // Protect window.trackingService.hasApiKeys checks
    if (!window.trackingService) {
        window.trackingService = {
            hasApiKeys: () => false,
            initialized: false
        };
    }
    
    // Ensure hasApiKeys is always a function
    if (window.trackingService && typeof window.trackingService.hasApiKeys !== 'function') {
        window.trackingService.hasApiKeys = () => false;
    }
};

// Set up protection immediately
protectGlobalChecks();

// Re-run protection after services load
document.addEventListener('DOMContentLoaded', protectGlobalChecks);

// Also protect after a delay to catch late initializations
setTimeout(protectGlobalChecks, 1000);

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { safeAccess, protectGlobalChecks };
}

console.log('✅ Global functions protection setup complete');