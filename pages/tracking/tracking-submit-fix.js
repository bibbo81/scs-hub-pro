// tracking-submit-fix.js - Fix per mostrare il workflow quando si invia il form
(function() {
    'use strict';
    
    console.log('🔧 TRACKING SUBMIT FIX: Initializing...');
    
    // COSTANTI PER EVITARE LOOP
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 500; // ms
    let retryCount = 0;
    
    // Funzione per intercettare il submit del form
    function interceptFormSubmit() {
        // CONTROLLO RETRY COUNT
        if (retryCount++ >= MAX_RETRIES) {
            console.log('⚠️ Max retries reached for form interception');
            return;
        }
        
        // Cerca il form
        const form = document.getElementById('enhancedSingleForm');
        
        if (!form) {
            console.log(`⏳ Form not found, retry ${retryCount}/${MAX_RETRIES}...`);
            setTimeout(interceptFormSubmit, RETRY_DELAY);
            return;
        }
        
        console.log('✅ Form found, intercepting submit');
        
        // Reset retry count on success
        retryCount = 0;
        
        // Salva il vecchio handler se esiste
        const oldSubmitHandler = form.onsubmit;
        
        // Flag per evitare multiple intercettazioni
        if (form.dataset.intercepted === 'true') {
            console.log('⚠️ Form already intercepted, skipping');
            return;
        }
        form.dataset.intercepted = 'true';
        
        // Intercetta il submit
        form.addEventListener('submit', function(e) {
            console.log('🚀 Form submit intercepted!');
            
            // Se showWorkflowModal non esiste o non è stata chiamata, forza la sua visualizzazione
            if (window.showWorkflowModal && !window._workflowVisible) {
                console.log('📊 Showing workflow before processing...');
                
                // Previeni il submit normale
                e.preventDefault();
                e.stopPropagation();
                
                // Mostra il workflow
                window.showWorkflowModal();
                window._workflowVisible = true;
                
                // Continua con il submit dopo un breve delay
                setTimeout(() => {
                    console.log('📤 Continuing with form submission...');
                    
                    // Chiama il handler originale se esiste
                    if (window.handleEnhancedSubmit) {
                        window.handleEnhancedSubmit(e);
                    } else if (oldSubmitHandler) {
                        oldSubmitHandler.call(form, e);
                    } else {
                        // Fallback: invia il form normalmente
                        form.submit();
                    }
                }, 100);
                
                return false;
            }
        }, true); // Use capture phase to intercept before other handlers
        
        // Intercetta anche il bottone di submit
        const submitBtn = document.getElementById('enhSubmitBtn');
        if (submitBtn && submitBtn.dataset.intercepted !== 'true') {
            submitBtn.dataset.intercepted = 'true';
            const oldClickHandler = submitBtn.onclick;
            
            submitBtn.addEventListener('click', function(e) {
                console.log('🔘 Submit button clicked');
                
                // Se il workflow non è visibile, mostralo
                if (window.showWorkflowModal && !window._workflowVisible) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    window.showWorkflowModal();
                    window._workflowVisible = true;
                    
                    // Continua dopo un delay
                    setTimeout(() => {
                        if (oldClickHandler) {
                            oldClickHandler.call(submitBtn, e);
                        } else {
                            form.dispatchEvent(new Event('submit'));
                        }
                    }, 100);
                }
            }, true);
        }
    }
    
    // Reset workflow visibility when modal closes
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('custom-modal-close') || 
            e.target.classList.contains('workflow-close')) {
            window._workflowVisible = false;
        }
    });
    
    // Start intercepting when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptFormSubmit);
    } else {
        // Usa un delay maggiore per dare tempo ai componenti di caricarsi
        setTimeout(interceptFormSubmit, 1000);
    }
    
    // Funzione di cleanup per resettare lo stato
    window.resetSubmitFix = function() {
        retryCount = 0;
        window._workflowVisible = false;
        
        // Rimuovi flag di intercettazione
        const form = document.getElementById('enhancedSingleForm');
        if (form) {
            form.dataset.intercepted = 'false';
        }
        
        const submitBtn = document.getElementById('enhSubmitBtn');
        if (submitBtn) {
            submitBtn.dataset.intercepted = 'false';
        }
        
        console.log('✅ Submit fix reset completed');
    };
    
    // Debug helper
    window.debugSubmitFix = function() {
        console.log('📋 Submit Fix Debug:');
        console.log('- Form found:', !!document.getElementById('enhancedSingleForm'));
        console.log('- Form intercepted:', document.getElementById('enhancedSingleForm')?.dataset.intercepted);
        console.log('- Submit button found:', !!document.getElementById('enhSubmitBtn'));
        console.log('- Submit button intercepted:', document.getElementById('enhSubmitBtn')?.dataset.intercepted);
        console.log('- Workflow visible:', window._workflowVisible);
        console.log('- showWorkflowModal exists:', typeof window.showWorkflowModal);
        console.log('- handleEnhancedSubmit exists:', typeof window.handleEnhancedSubmit);
        console.log('- Retry count:', retryCount);
        console.log('- Max retries:', MAX_RETRIES);
        
        return {
            formReady: !!document.getElementById('enhancedSingleForm'),
            workflowReady: typeof window.showWorkflowModal === 'function',
            retryInfo: {
                current: retryCount,
                max: MAX_RETRIES
            }
        };
    };
    
    console.log('✅ TRACKING SUBMIT FIX: Applied (with retry limits)');
    
})();