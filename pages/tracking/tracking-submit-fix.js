// tracking-submit-fix.js - Fix per mostrare il workflow quando si invia il form
(function() {
    'use strict';
    
    console.log('🔧 TRACKING SUBMIT FIX: Initializing...');
    
    // Flag per tracciare se abbiamo già intercettato
    let isIntercepted = false;
    
    // Funzione per intercettare il form quando viene creato
    function interceptFormWhenReady() {
        // Se già intercettato, esci
        if (isIntercepted) return;
        
        const form = document.getElementById('enhancedSingleForm');
        const submitBtn = document.getElementById('enhSubmitBtn');
        
        if (!form) {
            // Il form non esiste ancora, non è un errore
            return;
        }
        
        console.log('✅ Form found, intercepting submit');
        isIntercepted = true;
        
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
    
    // Use App.onReady to ensure all modules are loaded before observing
    App.onReady(() => {
        // Usa MutationObserver per rilevare quando il form viene aggiunto al DOM
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (document.getElementById('enhancedSingleForm')) {
                        interceptFormWhenReady();
                        if (isIntercepted) {
                            observer.disconnect();
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Controlla anche subito nel caso il form esista già
        interceptFormWhenReady();
    });
    
    // Funzione di cleanup
    window.resetSubmitFix = function() {
        isIntercepted = false;
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
        console.log('- Is intercepted:', isIntercepted);
        console.log('- Observer active:', !!observer);
        
        return {
            formReady: !!document.getElementById('enhancedSingleForm'),
            workflowReady: typeof window.showWorkflowModal === 'function',
            intercepted: isIntercepted
        };
    };
    
    console.log('✅ TRACKING SUBMIT FIX: Applied (with MutationObserver)');
    
})();