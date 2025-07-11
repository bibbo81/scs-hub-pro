// enhanced-logging.js - Improved logging for JS and initialization errors
// This should be loaded early to capture all errors

console.log('📊 Setting up enhanced logging system...');

class EnhancedLogging {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.maxStoredLogs = 50;
        this.logContainer = null;
        this.isDebugMode = this.checkDebugMode();
        this.setupLogCapture();
        this.createLogDisplay();
    }
    
    checkDebugMode() {
        return window.location.hostname === 'localhost' || 
               localStorage.getItem('debugMode') === 'true' ||
               window.location.search.includes('debug=true');
    }
    
    setupLogCapture() {
        // Capture console errors
        const originalError = console.error;
        console.error = (...args) => {
            this.logError(args.join(' '));
            originalError.apply(console, args);
        };
        
        // Capture console warnings
        const originalWarn = console.warn;
        console.warn = (...args) => {
            this.logWarning(args.join(' '));
            originalWarn.apply(console, args);
        };
        
        // Capture window errors
        window.addEventListener('error', (event) => {
            this.logError(`JS Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError(`Unhandled Promise Rejection: ${event.reason}`);
        });
    }
    
    logError(message) {
        const timestamp = new Date().toLocaleTimeString();
        const errorEntry = { timestamp, message, type: 'error' };
        
        this.errors.unshift(errorEntry);
        if (this.errors.length > this.maxStoredLogs) {
            this.errors.pop();
        }
        
        this.updateLogDisplay();
        
        // In debug mode, also show in UI
        if (this.isDebugMode) {
            this.showInlineError(message);
        }
    }
    
    logWarning(message) {
        const timestamp = new Date().toLocaleTimeString();
        const warningEntry = { timestamp, message, type: 'warning' };
        
        this.warnings.unshift(warningEntry);
        if (this.warnings.length > this.maxStoredLogs) {
            this.warnings.pop();
        }
        
        this.updateLogDisplay();
    }
    
    createLogDisplay() {
        // Only create log display in debug mode or when there are errors
        if (!this.isDebugMode) return;
        
        const container = document.createElement('div');
        container.id = 'enhanced-log-display';
        container.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 400px;
            max-height: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            overflow-y: auto;
            display: none;
        `;
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = '📊 Logs';
        toggleButton.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 420px;
            background: #007AFF;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            cursor: pointer;
            z-index: 10001;
        `;
        
        toggleButton.onclick = () => {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        };
        
        document.body.appendChild(container);
        document.body.appendChild(toggleButton);
        
        this.logContainer = container;
        this.toggleButton = toggleButton;
    }
    
    updateLogDisplay() {
        if (!this.logContainer) return;
        
        const allLogs = [
            ...this.errors.map(log => ({ ...log, type: 'error' })),
            ...this.warnings.map(log => ({ ...log, type: 'warning' }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const html = allLogs.slice(0, 20).map(log => {
            const color = log.type === 'error' ? '#ff6b6b' : '#feca57';
            const icon = log.type === 'error' ? '❌' : '⚠️';
            return `<div style="color: ${color}; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                ${icon} [${log.timestamp}] ${log.message}
            </div>`;
        }).join('');
        
        this.logContainer.innerHTML = html || '<div style="color: #27ae60;">✅ No errors logged</div>';
        
        // Update button to show error count
        const errorCount = this.errors.length;
        if (errorCount > 0) {
            this.toggleButton.innerHTML = `📊 Logs (${errorCount} errors)`;
            this.toggleButton.style.background = '#e74c3c';
        } else {
            this.toggleButton.innerHTML = '📊 Logs';
            this.toggleButton.style.background = '#007AFF';
        }
    }
    
    showInlineError(message) {
        // Create or update inline error display
        let errorDisplay = document.getElementById('inline-error-display');
        if (!errorDisplay) {
            errorDisplay = document.createElement('div');
            errorDisplay.id = 'inline-error-display';
            errorDisplay.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: #e74c3c;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 10002;
                max-width: 80%;
                text-align: center;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(errorDisplay);
        }
        
        errorDisplay.innerHTML = `❌ JS Error: ${message}`;
        errorDisplay.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDisplay) {
                errorDisplay.style.display = 'none';
            }
        }, 5000);
    }
    
    getErrorSummary() {
        return {
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            lastError: this.errors[0],
            lastWarning: this.warnings[0]
        };
    }
    
    clearLogs() {
        this.errors = [];
        this.warnings = [];
        this.updateLogDisplay();
    }
    
    exportLogs() {
        const logs = {
            errors: this.errors,
            warnings: this.warnings,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scs-hub-logs-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize enhanced logging
window.enhancedLogging = new EnhancedLogging();

// Provide global functions for easy access
window.getErrorSummary = () => window.enhancedLogging.getErrorSummary();
window.clearLogs = () => window.enhancedLogging.clearLogs();
window.exportLogs = () => window.enhancedLogging.exportLogs();

// Wait for DOM to be ready and then setup log display
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Setup logging display after a short delay to ensure other elements are loaded
        setTimeout(() => {
            if (!document.getElementById('enhanced-log-display')) {
                window.enhancedLogging.createLogDisplay();
            }
        }, 1000);
    });
} else {
    // DOM is already ready
    setTimeout(() => {
        if (!document.getElementById('enhanced-log-display')) {
            window.enhancedLogging.createLogDisplay();
        }
    }, 1000);
}

console.log('✅ Enhanced logging system initialized');