// ROLLBACK COMPLETO: Ripristina il reset button funzionante
// Questo script ripristina tutto allo stato funzionante originale

console.log('🔄 ROLLBACK: Restoring working reset button...');

// ===== EMERGENCY CLEANUP FIRST =====

// 1. Pulisci tutte le notifiche accumulate
function emergencyCleanupAll() {
    console.log('🧹 Emergency cleanup of all notifications...');
    
    // Selettori per tutte le possibili notifiche
    const selectors = [
        '.notification', '.toast', '.alert', '.sol-notification',
        '[class*="notification"]', '[class*="toast"]', '[class*="alert"]',
        'div[style*="position: fixed"]'
    ];
    
    let cleared = 0;
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            if (element.textContent && (
                element.textContent.includes('Reset') ||
                element.textContent.includes('Filtri') ||
                element.textContent.includes('azzerati') ||
                element.textContent.includes('Fix Applied')
            )) {
                element.remove();
                cleared++;
            }
        });
    });
    
    console.log(`✅ Cleared ${cleared} accumulated notifications`);
}

// 2. Ripristina NotificationSystem originale
function restoreNotificationSystem() {
    if (window.NotificationSystem && window.NotificationSystem._originalShow) {
        window.NotificationSystem.show = window.NotificationSystem._originalShow;
        delete window.NotificationSystem._originalShow;
        console.log('✅ NotificationSystem restored to original');
    }
}

// ===== RESTORE WORKING RESET FUNCTION =====

// Funzione reset semplice e funzionante
function workingResetFunction() {
    console.log('🔄 Working reset function called...');
    
    try {
        // Reset filter select
        const filterSelect = document.getElementById('linkedProductsFilter');
        if (filterSelect) {
            filterSelect.value = 'all';
            // Visual feedback
            filterSelect.style.background = '#e8f5e8';
            setTimeout(() => filterSelect.style.background = '', 500);
        }
        
        // Reset search input  
        const searchInput = document.getElementById('linkedProductsSearch');
        if (searchInput) {
            searchInput.value = '';
            // Visual feedback
            searchInput.style.background = '#e8f5e8';
            setTimeout(() => searchInput.style.background = '', 500);
        }
        
        // Apply filters to refresh the view
        if (window.enhancedApplyLinkedProductsFilters) {
            setTimeout(() => {
                window.enhancedApplyLinkedProductsFilters();
            }, 100);
        } else if (window.productLinkingV20Final && window.productLinkingV20Final.populateLinkedProductsGrid) {
            setTimeout(() => {
                window.productLinkingV20Final.populateLinkedProductsGrid();
            }, 100);
        }
        
        // Show success notification SEMPLICE
        setTimeout(() => {
            if (window.NotificationSystem && window.NotificationSystem.show) {
                // Mostra UNA SOLA notifica
                window.NotificationSystem.show('Reset', 'Filtri azzerati', 'success', 1500);
            } else {
                // Fallback: log nel console
                console.log('✅ SUCCESS: Filtri azzerati');
            }
        }, 200);
        
        console.log('✅ Reset completed successfully');
        
    } catch (error) {
        console.error('❌ Error in reset:', error);
    }
}

// ===== RESTORE EVENT LISTENERS =====

function restoreResetButtonListener() {
    console.log('🔧 Restoring reset button event listener...');
    
    const resetBtn = document.getElementById('resetLinkedFiltersBtn');
    if (!resetBtn) {
        console.warn('⚠️ Reset button not found');
        return;
    }
    
    // Rimuovi TUTTI i listener esistenti clonando il bottone
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    
    // Aggiungi UN SOLO listener semplice
    newResetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔄 Reset button clicked - calling working function');
        workingResetFunction();
    });
    
    // Visual feedback
    newResetBtn.addEventListener('mouseenter', () => {
        newResetBtn.style.transform = 'scale(1.05)';
    });
    
    newResetBtn.addEventListener('mouseleave', () => {
        newResetBtn.style.transform = '';
    });
    
    console.log('✅ Reset button listener restored');
}

// ===== CLEANUP STATES =====

function cleanupStates() {
    console.log('🧹 Cleaning up broken states...');
    
    // Reset variabili globali problematiche
    delete window.resetInProgress;
    delete window.recentNotifications;
    delete window.notificationCooldowns;
    delete window.filterTimeout;
    
    // Reset function references
    if (window.productLinkingV20Final) {
        // Ripristina la funzione reset originale
        window.productLinkingV20Final.resetLinkedProductsFilters = workingResetFunction;
    }
    
    // Aggiorna riferimento globale
    window.resetLinkedProductsFiltersGlobal = workingResetFunction;
    
    console.log('✅ States cleaned up');
}

// ===== MAIN ROLLBACK FUNCTION =====

function performCompleteRollback() {
    console.log('🚨 PERFORMING COMPLETE ROLLBACK...');
    
    try {
        // Step 1: Emergency cleanup
        emergencyCleanupAll();
        
        // Step 2: Restore notification system
        restoreNotificationSystem();
        
        // Step 3: Cleanup broken states
        cleanupStates();
        
        // Step 4: Restore reset button
        restoreResetButtonListener();
        
        console.log('✅ ROLLBACK COMPLETE - Reset button should work now');
        
        // Test notification
        setTimeout(() => {
            console.log('🎉 Rollback completed successfully!');
            if (window.NotificationSystem && window.NotificationSystem.show) {
                window.NotificationSystem.show('Rollback', 'Reset button restored!', 'success', 2000);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error during rollback:', error);
    }
}

// ===== GLOBAL FUNCTIONS =====

// Funzione per testare il reset
window.testResetButton = function() {
    console.log('🧪 Testing reset button...');
    workingResetFunction();
};

// Funzione per rollback manuale
window.performRollback = function() {
    performCompleteRollback();
};

// ===== AUTO-EXECUTE ROLLBACK =====

// Esegui rollback immediatamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performCompleteRollback);
} else {
    // Esegui subito se DOM è già pronto
    setTimeout(performCompleteRollback, 100);
}

// Fallback dopo 2 secondi
setTimeout(() => {
    if (document.getElementById('resetLinkedFiltersBtn')) {
        console.log('🔄 Fallback rollback execution...');
        performCompleteRollback();
    }
}, 2000);

console.log('🔄 Rollback script loaded');
console.log('🧪 Test function: window.testResetButton()');
console.log('🔧 Manual rollback: window.performRollback()');
