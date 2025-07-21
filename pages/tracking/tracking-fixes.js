// tracking-fixes.js - FIX per workflow modal nel posto giusto
(function() {
    'use strict';
    
    console.log('🔧 TRACKING FIXES: Applying workflow modal fix...');
    
    // Variabile per tracciare se abbiamo già applicato il fix
    let isFixed = false;
    let originalShowWorkflowModal = null;

    function applyWorkflowFix() {
        if (isFixed || !window.showWorkflowModal) return;

        console.log('🎯 TRACKING FIXES: Applying fix to showWorkflowModal');

        const originalFn = window.showWorkflowModal;
        originalShowWorkflowModal = originalFn;

        window.showWorkflowModal = function() {
            console.log('🚀 TRACKING FIXES: showWorkflowModal called - FIXED VERSION');

            const existingModalContent = document.querySelector('.custom-modal-content');

            if (existingModalContent) {
                console.log('✅ Found existing modal content - inserting workflow inside');

                const formWrapper = existingModalContent.querySelector('.fullwidth-form-wrapper');
                if (formWrapper) {
                    formWrapper.style.display = 'none';
                }

                const existingWorkflow = existingModalContent.querySelector('.workflow-inside-modal');
                if (existingWorkflow) {
                    existingWorkflow.remove();
                }

                const workflowContainer = document.createElement('div');
                workflowContainer.className = 'workflow-inside-modal';
                workflowContainer.innerHTML = `
                    <div class="workflow-modal-content">
                        <h3>🚀 Elaborazione Tracking</h3>
                        <div class="workflow-container">
                            <div class="workflow-step" data-step="0">
                                <div class="step-icon">📋</div>
                                <div class="step-content">
                                    <h4>Validazione</h4>
                                    <p>Controllo dati inseriti</p>
                                    <span class="step-status pending">In corso...</span>
                                </div>
                            </div>
                            <div class="workflow-arrow">→</div>
                            <div class="workflow-step" data-step="1">
                                <div class="step-icon">🔄</div>
                                <div class="step-content">
                                    <h4>API Check</h4>
                                    <p>Recupero dati live</p>
                                    <span class="step-status waiting">In attesa</span>
                                </div>
                            </div>
                            <div class="workflow-arrow">→</div>
                            <div class="workflow-step" data-step="2">
                                <div class="step-icon">💾</div>
                                <div class="step-content">
                                    <h4>Salvataggio</h4>
                                    <p>Registrazione tracking</p>
                                    <span class="step-status waiting">In attesa</span>
                                </div>
                            </div>
                        </div>
                        <div class="workflow-result" style="display: none;"></div>
                    </div>
                    <style>
                    /* Styles remain the same */
                    </style>
                `;

                existingModalContent.appendChild(workflowContainer);
                window._workflowContainer = workflowContainer;

            } else {
                console.log('⚠️ No existing modal found - preventing default workflow modal');
                console.error('Cannot show workflow - no modal container found');
                window.NotificationSystem?.error('Errore: modal container non trovato');
            }
        };

        window.showWorkflowModal._isFixed = true;
        isFixed = true;
        
        window.dispatchEvent(new CustomEvent('workflowFixApplied'));
    }

    App.onReady(function() {
        if (window.showWorkflowModal && !isFixed) {
            applyWorkflowFix();
        } else if (!window.showWorkflowModal) {
            createShowWorkflowModal();
        }
    });
    
    // Ferma il check dopo 30 secondi
    setTimeout(() => clearInterval(checkInterval), 30000);
    
    // Override updateWorkflowStep per funzionare con il nuovo container
    const originalUpdateWorkflowStep = window.updateWorkflowStep;
    window.updateWorkflowStep = function(stepIndex, status, statusText) {
        console.log('📊 Update workflow step:', stepIndex, status, statusText);
        
        // Cerca nel container corretto
        let step = null;
        
        // Prima cerca nel nostro container interno
        if (window._workflowContainer) {
            step = window._workflowContainer.querySelector(`[data-step="${stepIndex}"]`);
        }
        
        // Se non trovato, cerca globalmente (per retrocompatibilità)
        if (!step) {
            step = document.querySelector(`[data-step="${stepIndex}"]`);
        }
        
        if (!step) {
            console.warn('Step not found:', stepIndex);
            return;
        }
        
        step.className = `workflow-step ${status}`;
        const statusEl = step.querySelector('.step-status');
        if (statusEl) {
            statusEl.className = `step-status ${status === 'completed' ? 'success' : status === 'error' ? 'error' : status}`;
            statusEl.textContent = statusText;
        }
    };
    
    // Override showWorkflowResult
    const originalShowWorkflowResult = window.showWorkflowResult;
    window.showWorkflowResult = function(success, message) {
        console.log('📊 Show workflow result:', success, message);
        
        // Cerca nel container corretto
        let resultDiv = null;
        
        // Prima cerca nel nostro container interno
        if (window._workflowContainer) {
            resultDiv = window._workflowContainer.querySelector('.workflow-result');
        }
        
        // Se non trovato, cerca globalmente
        if (!resultDiv) {
            resultDiv = document.querySelector('.workflow-result');
        }
        
        if (!resultDiv) {
            console.warn('Result div not found');
            return;
        }
        
        resultDiv.innerHTML = success ? `
            <div class="result-success">
                <i class="fas fa-check-circle"></i>
                <div>
                    <h4>Operazione completata!</h4>
                    <p>${message}</p>
                </div>
            </div>
        ` : `
            <div class="result-error">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <h4>Operazione fallita</h4>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        resultDiv.style.display = 'block';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'workflow-close';
        closeBtn.textContent = 'Chiudi';
        closeBtn.onclick = function() {
            // Ripristina il form
            const formWrapper = document.querySelector('.fullwidth-form-wrapper');
            if (formWrapper) {
                formWrapper.style.display = '';
            }
            
            // Rimuovi il workflow
            if (window._workflowContainer) {
                window._workflowContainer.remove();
                window._workflowContainer = null;
            }
            
            // Chiudi il modal dopo un breve ritardo se success
            if (success) {
                setTimeout(() => {
                    if (window.closeCustomModal) {
                        window.closeCustomModal();
                    }
                }, 500);
            }
        };
        resultDiv.appendChild(closeBtn);
    };
    
    // Override closeAllModals per pulire anche il nostro container
    const originalCloseAllModals = window.closeAllModals;
    window.closeAllModals = function() {
        console.log('🔧 Closing all modals (including workflow)');
        
        // Pulisci il nostro workflow container
        if (window._workflowContainer) {
            window._workflowContainer.remove();
            window._workflowContainer = null;
        }
        
        // Ripristina il form se nascosto
        const formWrapper = document.querySelector('.fullwidth-form-wrapper');
        if (formWrapper) {
            formWrapper.style.display = '';
        }
        
        // Chiama l'originale se esiste
        if (originalCloseAllModals && typeof originalCloseAllModals === 'function') {
            originalCloseAllModals.call(this);
        }
        
        // Fallback: rimuovi tutti i modal overlay
        document.querySelectorAll('.workflow-modal-overlay, .error-modal-overlay, .custom-fullwidth-modal').forEach(el => {
            el.classList.remove('active');
            setTimeout(() => el.remove(), 300);
        });
    };
    
    console.log('✅ TRACKING FIXES: Workflow modal fix applied');
    
    // Debug helper
    window.debugWorkflow = function() {
        console.log('🔍 Workflow Debug:');
        console.log('- showWorkflowModal defined:', typeof window.showWorkflowModal);
        console.log('- showWorkflowModal fixed:', window.showWorkflowModal?._isFixed);
        console.log('- _workflowContainer:', window._workflowContainer);
        console.log('- Custom modal visible:', !!document.querySelector('.custom-fullwidth-modal'));
        console.log('- Workflow overlays:', document.querySelectorAll('.workflow-modal-overlay').length);
        
        // Force fix if needed
        if (window.showWorkflowModal && !window.showWorkflowModal._isFixed) {
            console.log('🔧 Applying fix now...');
            applyWorkflowFix();
        }
        
        return {
            container: window._workflowContainer,
            overlays: document.querySelectorAll('.workflow-modal-overlay'),
            customModal: document.querySelector('.custom-fullwidth-modal'),
            isFixed: isFixed
        };
    };
    
    // Aggiungi anche un fix manuale che può essere chiamato
    window.fixWorkflowModal = function() {
        console.log('🔧 Manual workflow fix requested');
        isFixed = false; // Reset flag
        applyWorkflowFix();
    };
    
    // SE showWorkflowModal non esiste, CREALA noi!
    if (!window.showWorkflowModal) {
        console.log('⚠️ showWorkflowModal not found - creating it now!');
        
        window.showWorkflowModal = function() {
            console.log('🚀 TRACKING FIXES: Custom showWorkflowModal called');
            
            // Trova il modal container esistente
            const existingModalContent = document.querySelector('.custom-modal-content');
            
            if (existingModalContent) {
                console.log('✅ Found existing modal content - inserting workflow inside');
                
                // Nascondi il form esistente
                const formWrapper = existingModalContent.querySelector('.fullwidth-form-wrapper');
                if (formWrapper) {
                    formWrapper.style.display = 'none';
                }
                
                // Rimuovi eventuali workflow precedenti
                const existingWorkflow = existingModalContent.querySelector('.workflow-inside-modal');
                if (existingWorkflow) {
                    existingWorkflow.remove();
                }
                
                // Crea il workflow container DENTRO il modal esistente
                const workflowContainer = document.createElement('div');
                workflowContainer.className = 'workflow-inside-modal';
                workflowContainer.innerHTML = `
                    <div class="workflow-modal-content">
                        <h3>🚀 Elaborazione Tracking</h3>
                        <div class="workflow-container">
                            <div class="workflow-step" data-step="0">
                                <div class="step-icon">📋</div>
                                <div class="step-content">
                                    <h4>Validazione</h4>
                                    <p>Controllo dati inseriti</p>
                                    <span class="step-status pending">In corso...</span>
                                </div>
                            </div>
                            
                            <div class="workflow-arrow">→</div>
                            
                            <div class="workflow-step" data-step="1">
                                <div class="step-icon">🔄</div>
                                <div class="step-content">
                                    <h4>API Check</h4>
                                    <p>Recupero dati live</p>
                                    <span class="step-status waiting">In attesa</span>
                                </div>
                            </div>
                            
                            <div class="workflow-arrow">→</div>
                            
                            <div class="workflow-step" data-step="2">
                                <div class="step-icon">💾</div>
                                <div class="step-content">
                                    <h4>Salvataggio</h4>
                                    <p>Registrazione tracking</p>
                                    <span class="step-status waiting">In attesa</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="workflow-result" style="display: none;"></div>
                    </div>
                    
                    <style>
                    .workflow-inside-modal {
                        padding: 30px;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: fadeIn 0.3s ease;
                    }
                    
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .workflow-modal-content {
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        max-width: 800px;
                        width: 100%;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    
                    .workflow-modal-content h3 {
                        margin: 0 0 25px 0;
                        color: #333;
                        font-size: 24px;
                        text-align: center;
                    }
                    
                    .workflow-container {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 30px;
                    }
                    
                    .workflow-step {
                        flex: 1;
                        text-align: center;
                        padding: 20px;
                        border-radius: 8px;
                        background: #f8f9fa;
                        transition: all 0.3s ease;
                    }
                    
                    .workflow-step.completed {
                        background: #d4f4dd;
                    }
                    
                    .workflow-step.error {
                        background: #ffebee;
                    }
                    
                    .step-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                        color: #6c757d;
                    }
                    
                    .workflow-step.completed .step-icon {
                        color: #28a745;
                    }
                    
                    .workflow-step.error .step-icon {
                        color: #dc3545;
                    }
                    
                    .step-content h4 {
                        margin: 0 0 8px 0;
                        font-size: 16px;
                        color: #333;
                    }
                    
                    .step-content p {
                        margin: 0 0 12px 0;
                        font-size: 14px;
                        color: #6c757d;
                    }
                    
                    .step-status {
                        font-size: 14px;
                        font-weight: 500;
                        padding: 6px 12px;
                        border-radius: 20px;
                        display: inline-block;
                    }
                    
                    .step-status.pending {
                        background: #fff3cd;
                        color: #856404;
                        animation: pulse 1.5s infinite;
                    }
                    
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.6; }
                        100% { opacity: 1; }
                    }
                    
                    .step-status.waiting {
                        background: #e9ecef;
                        color: #6c757d;
                    }
                    
                    .step-status.success {
                        background: #28a745;
                        color: white;
                    }
                    
                    .step-status.error {
                        background: #dc3545;
                        color: white;
                    }
                    
                    .workflow-arrow {
                        font-size: 24px;
                        color: #6c757d;
                        margin: 0 20px;
                    }
                    
                    .workflow-result {
                        background: #f8f9fa;
                        border-radius: 8px;
                        padding: 20px;
                        margin-top: 20px;
                    }
                    
                    .workflow-result h4 {
                        margin: 0 0 15px 0;
                        color: #333;
                    }
                    
                    .result-success {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        color: #28a745;
                    }
                    
                    .result-success i {
                        font-size: 36px;
                    }
                    
                    .result-error {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        color: #dc3545;
                    }
                    
                    .result-error i {
                        font-size: 36px;
                    }
                    
                    .workflow-close {
                        display: block;
                        margin: 20px auto 0;
                        padding: 10px 24px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s ease;
                    }
                    
                    .workflow-close:hover {
                        background: #0056b3;
                    }
                    
                    @media (max-width: 768px) {
                        .workflow-container {
                            flex-direction: column;
                        }
                        
                        .workflow-arrow {
                            transform: rotate(90deg);
                            margin: 20px 0;
                        }
                        
                        .workflow-step {
                            width: 100%;
                        }
                    }
                    </style>
                `;
                
                // Inserisci nel modal esistente
                existingModalContent.appendChild(workflowContainer);
                
                // Salva riferimento globale per le funzioni di update
                window._workflowContainer = workflowContainer;
                
            } else {
                console.error('Cannot show workflow - no modal container found');
                window.NotificationSystem?.error('Errore: modal container non trovato');
            }
        };
        
        window.showWorkflowModal._isFixed = true;
    }
    
})();