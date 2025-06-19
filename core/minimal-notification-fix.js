// MINIMAL FIX: Solo notifiche duplicate, mantiene reset funzionante
// Questo fix mantiene TUTTO come era prima, aggiunge solo prevenzione notifiche

console.log('🔧 Loading MINIMAL Notification Fix - Preserving Reset Functionality...');

// ===== NOTIFICATION MANAGEMENT ONLY =====

// Traccia le notifiche recenti per prevenire duplicati
window.recentNotifications = window.recentNotifications || {};
window.notificationCooldowns = window.notificationCooldowns || {};

// Funzione per pulire notifiche duplicate esistenti
function clearDuplicateNotifications() {
    try {
        const notificationSelectors = [
            '.notification',
            '.toast', 
            '.alert',
            '.sol-notification',
            '[class*="notification"]'
        ];
        
        let cleared = 0;
        notificationSelectors.forEach(selector => {
            const notifications = document.querySelectorAll(selector);
            const seenTexts = new Set();
            
            notifications.forEach(notification => {
                const text = notification.textContent?.trim();
                if (text && seenTexts.has(text)) {
                    // È un duplicato, rimuovilo
                    notification.style.transition = 'opacity 0.3s ease';
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                    cleared++;
                } else if (text) {
                    seenTexts.add(text);
                }
            });
        });
        
        if (cleared > 0) {
            console.log(`🧹 Cleared ${cleared} duplicate notifications`);
        }
        
        return cleared;
        
    } catch (error) {
        console.error('❌ Error clearing duplicates:', error);
        return 0;
    }
}

// Override del NotificationSystem per prevenire duplicati
function setupNotificationPrevention() {
    if (window.NotificationSystem && typeof window.NotificationSystem.show === 'function') {
        // Salva la funzione originale
        if (!window.NotificationSystem._originalShow) {
            window.NotificationSystem._originalShow = window.NotificationSystem.show;
        }
        
        // Override con prevenzione duplicati
        window.NotificationSystem.show = function(title, message, type, duration) {
            const notificationKey = `${title}-${message}-${type}`;
            const now = Date.now();
            
            // Check cooldown (3 secondi per prevenire spam)
            if (window.notificationCooldowns[notificationKey]) {
                const timeSince = now - window.notificationCooldowns[notificationKey];
                if (timeSince < 3000) {
                    console.log(`🚫 Notification prevented (cooldown): ${title} - ${message}`);
                    return;
                }
            }
            
            // Pulisci duplicati esistenti prima di mostrare la nuova
            clearDuplicateNotifications();
            
            // Imposta cooldown
            window.notificationCooldowns[notificationKey] = now;
            
            // Chiama la funzione originale
            return this._originalShow.call(this, title, message, type, duration);
        };
        
        console.log('✅ NotificationSystem override installed');
    }
}

// Funzione per ripristinare NotificationSystem originale
function restoreOriginalNotificationSystem() {
    if (window.NotificationSystem && window.NotificationSystem._originalShow) {
        window.NotificationSystem.show = window.NotificationSystem._originalShow;
        console.log('✅ Original NotificationSystem restored');
    }
}

// ===== PRESERVE EXISTING RESET FUNCTIONALITY =====

// NON tocchiamo la funzione reset esistente, solo aggiungiamo cleanup notifiche
function enhanceExistingResetFunction() {
    // Trova la funzione reset esistente
    const originalReset = window.resetLinkedProductsFiltersGlobal;
    
    if (originalReset && typeof originalReset === 'function') {
        console.log('📝 Enhancing existing reset function...');
        
        // Crea versione enhanced che pulisce notifiche ma mantiene tutto il resto
        window.resetLinkedProductsFiltersGlobal = function(...args) {
            console.log('🔄 Enhanced reset called - clearing notifications first...');
            
            // Step 1: Pulisci notifiche duplicate PRIMA del reset
            clearDuplicateNotifications();
            
            // Step 2: Chiama la funzione originale che già funziona
            try {
                return originalReset.apply(this, args);
            } catch (error) {
                console.error('❌ Error in original reset function:', error);
                
                // Fallback: chiamata diretta alle funzioni base
                try {
                    const filterSelect = document.getElementById('linkedProductsFilter');
                    const searchInput = document.getElementById('linkedProductsSearch');
                    
                    if (filterSelect) filterSelect.value = 'all';
                    if (searchInput) searchInput.value = '';
                    
                    if (window.enhancedApplyLinkedProductsFilters) {
                        window.enhancedApplyLinkedProductsFilters();
                    }
                    
                    console.log('✅ Fallback reset completed');
                } catch (fallbackError) {
                    console.error('❌ Fallback reset failed:', fallbackError);
                }
            }
        };
        
        console.log('✅ Existing reset function enhanced');
    } else {
        console.warn('⚠️ Original reset function not found, using fallback');
        
        // Fallback: crea funzione reset semplice
        window.resetLinkedProductsFiltersGlobal = function() {
            console.log('🔄 Fallback reset function called...');
            
            clearDuplicateNotifications();
            
            const filterSelect = document.getElementById('linkedProductsFilter');
            const searchInput = document.getElementById('linkedProductsSearch');
            
            if (filterSelect) {
                filterSelect.value = 'all';
                filterSelect.style.background = '#e8f5e8';
                setTimeout(() => filterSelect.style.background = '', 500);
            }
            
            if (searchInput) {
                searchInput.value = '';
                searchInput.style.background = '#e8f5e8';
                setTimeout(() => searchInput.style.background = '', 500);
            }
            
            // Trigger filter application
            if (window.enhancedApplyLinkedProductsFilters) {
                window.enhancedApplyLinkedProductsFilters();
            } else if (window.productLinkingV20Final && window.productLinkingV20Final.populateLinkedProductsGrid) {
                window.productLinkingV20Final.populateLinkedProductsGrid();
            }
            
            // Show single notification (con prevenzione duplicati già attiva)
            if (window.NotificationSystem) {
                window.NotificationSystem.show('Reset', 'Filtri prodotti azzerati', 'success', 2000);
            }
            
            console.log('✅ Fallback reset completed');
        };
    }
}

// ===== EMERGENCY CLEANUP =====

// Funzione emergenza per pulire tutto
window.emergencyNotificationCleanup = function() {
    console.log('🚨 EMERGENCY: Comprehensive notification cleanup...');
    
    try {
        // 1. Rimuovi override NotificationSystem
        restoreOriginalNotificationSystem();
        
        // 2. Pulisci tutte le notifiche
        const allSelectors = [
            '.notification', '.toast', '.alert', '.sol-notification',
            '[class*="notification"]', '[class*="toast"]', '[class*="alert"]',
            'div[style*="position: fixed"]'
        ];
        
        let totalCleared = 0;
        allSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.textContent && (
                    el.textContent.includes('Reset') || 
                    el.textContent.includes('Filtri') ||
                    el.textContent.includes('azzerati')
                )) {
                    el.remove();
                    totalCleared++;
                }
            });
        });
        
        // 3. Reset stati
        window.recentNotifications = {};
        window.notificationCooldowns = {};
        
        console.log(`✅ Emergency cleanup complete: ${totalCleared} notifications removed`);
        return totalCleared;
        
    } catch (error) {
        console.error('❌ Emergency cleanup error:', error);
        return 0;
    }
};

// ===== INITIALIZATION =====

function initializeMinimalFix() {
    console.log('🚀 Initializing minimal notification fix...');
    
    try {
        // 1. Setup notification prevention
        setupNotificationPrevention();
        
        // 2. Enhance existing reset (don't replace!)
        enhanceExistingResetFunction();
        
        // 3. Initial cleanup of existing duplicates
        clearDuplicateNotifications();
        
        // 4. Reset cooldown states
        window.recentNotifications = {};
        window.notificationCooldowns = {};
        
        console.log('✅ Minimal notification fix initialized');
        console.log('📝 Reset functionality preserved');
        console.log('🛡️ Duplicate notifications prevented');
        
        // Show single confirmation (with our prevention already active)
        setTimeout(() => {
            if (window.NotificationSystem) {
                window.NotificationSystem.show('Fix Applied', 'Notifiche duplicate risolte!', 'success', 2000);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error initializing minimal fix:', error);
    }
}

// ===== AUTO-INITIALIZE =====

// Initialize immediately if DOM ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMinimalFix);
} else {
    // Small delay to ensure other scripts have loaded
    setTimeout(initializeMinimalFix, 200);
}

// Fallback initialization
setTimeout(() => {
    if (!window.minimalNotificationFixLoaded) {
        console.log('🔄 Fallback initialization of minimal notification fix...');
        initializeMinimalFix();
        window.minimalNotificationFixLoaded = true;
    }
}, 2000);

console.log('🛡️ Minimal Notification Fix loaded');
console.log('🚨 Emergency function: window.emergencyNotificationCleanup()');
console.log('✅ Reset button functionality preserved');
