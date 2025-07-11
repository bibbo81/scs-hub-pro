// session-validation-fix.js - Prevent infinite login loops
// This should be loaded early to fix session validation issues

console.log('🔧 Setting up improved session validation...');

class SessionValidator {
    constructor() {
        this.lastValidationTime = 0;
        this.validationCooldown = 5000; // 5 seconds cooldown
        this.redirectCooldown = 10000; // 10 seconds cooldown for redirects
        this.lastRedirectTime = 0;
        this.redirectAttempts = 0;
        this.maxRedirectAttempts = 3;
        this.sessionState = null;
        this.jsErrorOccurred = false;
        
        this.setupErrorTracking();
    }
    
    setupErrorTracking() {
        // Track JS errors to prevent auth redirects when it's just a JS issue
        const originalErrorHandler = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            console.warn('🚨 JS Error detected:', message);
            
            // Don't consider auth-related errors as preventing login redirects
            if (!message.includes('Session expired') && 
                !message.includes('unauthorized') && 
                !message.includes('401')) {
                this.jsErrorOccurred = true;
                console.log('🛡️ JS error detected, will prevent unnecessary auth redirects');
            }
            
            if (originalErrorHandler) {
                originalErrorHandler.apply(window, arguments);
            }
        };
        
        // Also track unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason;
            if (error && !String(error).includes('Session expired') && 
                !String(error).includes('unauthorized') &&
                !String(error).includes('401')) {
                this.jsErrorOccurred = true;
                console.log('🛡️ Unhandled rejection detected, will prevent unnecessary auth redirects');
            }
        });
    }
    
    async validateSession() {
        const now = Date.now();
        
        // Cooldown check
        if (now - this.lastValidationTime < this.validationCooldown) {
            console.log('⏰ Session validation cooldown active');
            return this.sessionState;
        }
        
        this.lastValidationTime = now;
        
        try {
            // Wait for Supabase to be ready
            if (window.supabaseReady) {
                await window.supabaseReady;
            }
            
            // Check if we have a session
            if (window.currentSession && window.currentUser) {
                console.log('✅ Valid session found');
                this.sessionState = { valid: true, session: window.currentSession };
                return this.sessionState;
            }
            
            // Try to get session from Supabase directly if available
            if (window.authSupabase && window.authSupabase.getSession) {
                const { data } = await window.authSupabase.getSession();
                if (data.session) {
                    console.log('✅ Valid session from Supabase');
                    this.sessionState = { valid: true, session: data.session };
                    return this.sessionState;
                }
            }
            
            console.log('❌ No valid session found');
            this.sessionState = { valid: false };
            return this.sessionState;
            
        } catch (error) {
            console.error('🚨 Error validating session:', error);
            
            // If it's an auth error, mark session as invalid
            if (error.message?.includes('Session expired') || 
                error.message?.includes('unauthorized') ||
                error.message?.includes('401')) {
                this.sessionState = { valid: false, authError: true };
            } else {
                // For other errors, don't change session state
                console.log('🛡️ Non-auth error during validation, keeping current state');
            }
            
            return this.sessionState;
        }
    }
    
    shouldRedirectToLogin() {
        const now = Date.now();
        
        // Check redirect cooldown
        if (now - this.lastRedirectTime < this.redirectCooldown) {
            console.log('⏰ Redirect cooldown active');
            return false;
        }
        
        // Check max redirect attempts
        if (this.redirectAttempts >= this.maxRedirectAttempts) {
            console.log('🚫 Max redirect attempts reached');
            return false;
        }
        
        // Don't redirect if JS error occurred recently
        if (this.jsErrorOccurred) {
            console.log('🛡️ JS error present, avoiding redirect');
            return false;
        }
        
        // Only redirect if we have a confirmed invalid session
        if (!this.sessionState || this.sessionState.valid) {
            return false;
        }
        
        // Only redirect for auth errors, not other types of errors
        if (!this.sessionState.authError) {
            console.log('🛡️ No auth error, avoiding redirect');
            return false;
        }
        
        return true;
    }
    
    performRedirect() {
        if (!this.shouldRedirectToLogin()) {
            return false;
        }
        
        const now = Date.now();
        this.lastRedirectTime = now;
        this.redirectAttempts++;
        
        console.log(`🔄 Performing redirect to login (attempt ${this.redirectAttempts})`);
        
        // Show user-friendly message before redirect
        if (window.safeGlobals && window.safeGlobals.showError) {
            window.safeGlobals.showError('Session scaduta. Reindirizzamento al login...');
        }
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        
        return true;
    }
    
    resetJsErrorFlag() {
        this.jsErrorOccurred = false;
        console.log('🔄 JS error flag reset');
    }
    
    resetRedirectAttempts() {
        this.redirectAttempts = 0;
        this.lastRedirectTime = 0;
        console.log('🔄 Redirect attempts reset');
    }
}

// Create global instance
window.sessionValidator = new SessionValidator();

// Enhanced auth check function that prevents infinite loops
window.safeAuthCheck = async function() {
    // Don't check auth on login page
    if (window.location.pathname.includes('login.html')) {
        return true;
    }
    
    const sessionState = await window.sessionValidator.validateSession();
    
    if (!sessionState || !sessionState.valid) {
        console.log('🔐 Invalid session detected');
        return window.sessionValidator.performRedirect();
    }
    
    return true;
};

// Reset error flags periodically
setInterval(() => {
    window.sessionValidator.resetJsErrorFlag();
}, 30000); // Reset every 30 seconds

console.log('✅ Session validation fix loaded');