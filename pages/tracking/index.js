// /pages/tracking/index.js - VERSIONE CON FIX STRUTTURALE DEFINITIVO PER LINTER TYPESCRIPT

// =================================================================================
// SEZIONE DELLE FUNZIONI DI FORMATTAZIONE (A PROVA DI LINTER)
// Per risolvere i conflitti con l'analizzatore di sintassi, tutte le funzioni
// che generano HTML sono definite qui, separatamente e con una sintassi
// estremamente sicura (concatenazione di stringhe) per evitare ogni ambiguità.
// =================================================================================

/**
 * Formatta la colonna dello stato in un badge colorato.
 * @param {string} status - Lo stato del tracking.
 * @returns {string} La stringa HTML per il badge.
 */
function formatStatus(status) {
    var safeStatus = status || '';
    var statusText = safeStatus.replace(/_/g, ' ');
    return '<span class="sol-badge status-' + safeStatus + '">' + statusText + '</span>';
}

/**
 * Formatta la data ETA nel formato gg/mm/aaaa.
 * @param {string | Date} date - La data da formattare.
 * @returns {string} La data formattata o un trattino.
 */
function formatEta(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT');
}

/**
 * Formatta la data dell'ultimo aggiornamento con l'orario.
 * @param {string | Date} date - La data da formattare.
 * @returns {string} La data e l'ora formattate o un trattino.
 */
function formatLastUpdate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('it-IT');
}

/**
 * Formatta la colonna delle azioni con i pulsanti.
 * @param {*} value - Il valore della cella (non usato).
 * @param {object} row - L'oggetto dati dell'intera riga.
 * @returns {string} La stringa HTML per i pulsanti.
 */
function formatActions(value, row) {
    var viewButton = '<button class="sol-btn sol-btn-sm sol-btn-icon" onclick="window.viewTrackingDetails(\'' + row.id + '\')" title="Dettagli"><i class="fas fa-eye"></i></button>';
    var deleteButton = '<button class="sol-btn sol-btn-sm sol-btn-icon sol-btn-danger" onclick="window.deleteTracking(\'' + row.id + '\')" title="Elimina"><i class="fas fa-trash"></i></button>';
    return viewButton + ' ' + deleteButton;
}


// =================================================================================
// LOGICA PRINCIPALE DELLA PAGINA
// =================================================================================

/**
 * Funzione di inizializzazione principale per l'intera pagina di tracking.
 */
async function initializeTrackingPage() {
    console.log('🚀 [Tracking.init] Avvio inizializzazione pagina tracking...');

    var coreModules = ['TableManager', 'ModalSystem', 'notificationSystem', 'trackingService', 'supabase', 'supabaseTrackingService', 'ExportManager', 'headerComponent'];
    for (var i = 0; i < coreModules.length; i++) {
        var moduleName = coreModules[i];
        if (!window[moduleName]) {
            console.error('❌ [Tracking.init] Modulo core mancante: ' + moduleName + '.');
            document.body.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1>Errore Critico</h1><p>Il modulo <strong>' + moduleName + '</strong> non è stato caricato. Controlla la console.</p></div>';
            return;
        }
    }
    console.log('✅ [Tracking.init] Tutti i moduli core sono presenti.');

    try {
        await window.headerComponent.init();
        await window.trackingService.initialize();
        await loadAndRenderTrackings();
        setupEventListeners();
        startAutoRefresh();
        console.log('🎉 [Tracking.init] Pagina tracking inizializzata con successo!');
    } catch (error) {
        console.error('❌ [Tracking.init] Errore grave durante l\'inizializzazione:', error);
        window.notificationSystem.error('Errore critico', { subtitle: 'Impossibile inizializzare la pagina.' });
    }
}

/**
 * Carica i dati dei tracking e aggiorna l'intera interfaccia.
 */
async function loadAndRenderTrackings() {
    console.log('🔄 [Tracking.load] Caricamento dati...');
    if (window.trackingTable) window.trackingTable.loading(true);

    try {
        var trackings = await window.supabaseTrackingService.getAllTrackings();
        console.log('📊 [Tracking.load] Trovati ' + trackings.length + ' tracking.');
        window.currentTrackings = trackings;

        renderStats(trackings);
        renderTrackingTable(trackings);
    } catch (error) {
        console.error('❌ [Tracking.load] Impossibile caricare i dati:', error);
        window.notificationSystem.error('Errore di caricamento dati', { subtitle: error.message });
    } finally {
        if (window.trackingTable) window.trackingTable.loading(false);
    }
}

/**
 * Renderizza la tabella dei tracking.
 * @param {Array} trackings - L'array dei dati di tracking.
 */
function renderTrackingTable(trackings) {
    var tableContainer = document.getElementById('trackingTableContainer');
    if (!tableContainer) return;

    // L'array delle colonne ora è pulito e referenzia solo le funzioni definite sopra.
    var allColumns = [
        { key: 'select', label: '', width: '40px', sortable: false, type: 'checkbox' },
        { key: 'tracking_number', label: 'Tracking #', sortable: true },
        { key: 'status', label: 'Stato', sortable: true, formatter: formatStatus },
        { key: 'carrier_code', label: 'Vettore', sortable: true },
        { key: 'origin_port', label: 'Origine', sortable: true },
        { key: 'destination_port', label: 'Destinazione', sortable: true },
        { key: 'eta', label: 'ETA', sortable: true, formatter: formatEta },
        { key: 'last_update', label: 'Ultimo Agg.', sortable: true, formatter: formatLastUpdate },
        { key: 'actions', label: 'Azioni', sortable: false, formatter: formatActions }
    ];

    if (!window.trackingTable) {
        window.trackingTable = new window.TableManager('trackingTableContainer', {
            columns: allColumns,
            data: trackings,
            searchable: true,
            selectable: true,
            emptyMessage: 'Nessun tracking trovato. Aggiungi il primo per iniziare!',
            onSelectionChange: handleSelectionChange,
        });
    } else {
        window.trackingTable.setData(trackings);
    }
}

/**
 * Renderizza le card delle statistiche.
 * @param {Array} trackings - L'array di tutti i tracking.
 */
function renderStats(trackings) {
    var statsContainer = document.getElementById('statsGrid');
    if (!statsContainer) return;
    var stats = {
        total: trackings.length,
        in_transit: trackings.filter(function(t) { return t.status === 'in_transit'; }).length,
        delivered: trackings.filter(function(t) { return t.status === 'delivered'; }).length,
        delayed: trackings.filter(function(t) { return t.status === 'delayed' || t.status === 'exception'; }).length,
    };
    statsContainer.innerHTML =
        '<div class="sol-stat-card"><div class="sol-stat-icon"><i class="fas fa-box"></i></div><div class="sol-stat-content"><div class="sol-stat-value">' + stats.total + '</div><div class="sol-stat-label">Totale</div></div></div>' +
        '<div class="sol-stat-card"><div class="sol-stat-icon"><i class="fas fa-ship"></i></div><div class="sol-stat-content"><div class="sol-stat-value">' + stats.in_transit + '</div><div class="sol-stat-label">In Transito</div></div></div>' +
        '<div class="sol-stat-card"><div class="sol-stat-icon"><i class="fas fa-check-circle"></i></div><div class="sol-stat-content"><div class="sol-stat-value">' + stats.delivered + '</div><div class="sol-stat-label">Consegnati</div></div></div>' +
        '<div class="sol-stat-card"><div class="sol-stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="sol-stat-content"><div class="sol-stat-value">' + stats.delayed + '</div><div class="sol-stat-label">Criticità</div></div></div>';
}

/**
 * Imposta gli event listener per i pulsanti e i filtri della pagina.
 */
function setupEventListeners() {
    document.getElementById('addTrackingBtn')?.addEventListener('click', function() {
        if (window.showEnhancedTrackingForm) {
            window.showEnhancedTrackingForm(loadAndRenderTrackings);
        }
    });

    document.getElementById('refreshAllBtn')?.addEventListener('click', loadAndRenderTrackings);
    
    document.getElementById('exportExcelBtn')?.addEventListener('click', function() {
        if (window.ExportManager) {
            window.ExportManager.exportToExcel(window.currentTrackings, 'tracking_export');
        } else {
            console.error("ExportManager non disponibile.");
        }
    });

    var searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            if (window.trackingTable) {
                window.trackingTable.search(e.target.value);
            }
        });
    }
    
    document.getElementById('manageColumnsBtn')?.addEventListener('click', function() {
        if (window.trackingTable) {
            window.trackingTable.showColumnManager();
        }
    });
}

/**
 * Gestisce la visibilità della barra delle azioni di gruppo.
 * @param {Array} selectedItems - Gli elementi selezionati dalla tabella.
 */
function handleSelectionChange(selectedItems) {
    var bulkActionsContainer = document.getElementById('bulkActionsContainer');
    if (!bulkActionsContainer) return;

    if (selectedItems.length > 0) {
        bulkActionsContainer.innerHTML =
            '<div class="sol-bulk-actions-bar">' +
                '<span class="selected-count">' + selectedItems.length + ' selezionati</span>' +
                '<div class="actions">' +
                    '<button class="sol-btn sol-btn-sm" onclick="bulkRefresh()"><i class="fas fa-sync-alt"></i> Aggiorna</button>' +
                    '<button class="sol-btn sol-btn-sm sol-btn-danger" onclick="bulkDelete()"><i class="fas fa-trash"></i> Elimina</button>' +
                '</div>' +
            '</div>';
        bulkActionsContainer.style.display = 'block';
    } else {
        bulkActionsContainer.style.display = 'none';
    }
}

/**
 * Avvia l'aggiornamento automatico dei dati.
 */
function startAutoRefresh() {
    if (window.autoRefreshInterval) clearInterval(window.autoRefreshInterval);
    window.autoRefreshInterval = setInterval(loadAndRenderTrackings, 5 * 60 * 1000);
    console.log('🕒 [Auto-Refresh] Aggiornamento automatico attivato.');
}


// --- FUNZIONI PER MODALI E AZIONI DI GRUPPO ---

function createProgressModal(title, message) {
    if (!window.ModalSystem) return;
    window.ModalSystem.show({
        id: 'progress-modal',
        title: title,
        content: '<p>' + message + '</p><div class="sol-progress-bar"><div id="progress-bar-inner" style="width: 0%;"></div></div><p id="progress-modal-status">0%</p>',
        closeButton: false,
    });
}

function updateProgressModal(percentage, statusText) {
    var progressBar = document.getElementById('progress-bar-inner');
    var statusEl = document.getElementById('progress-modal-status');
    if (progressBar) progressBar.style.width = percentage + '%';
    if (statusEl) statusEl.textContent = statusText;
    if (percentage >= 100) {
        setTimeout(function() { window.ModalSystem.hide('progress-modal'); }, 1000);
    }
}


// --- FUNZIONI GLOBALI (chiamate da onclick) ---

window.viewTrackingDetails = function(id) {
    var tracking = window.currentTrackings.find(function(t) { return t.id.toString() === id.toString(); });
    if (tracking && window.ModalSystem) {
        window.ModalSystem.alert({
            title: 'Dettagli Tracking: ' + tracking.tracking_number,
            content: '<pre style="white-space: pre-wrap; word-break: break-all;">' + JSON.stringify(tracking, null, 2) + '</pre>',
            size: 'large'
        });
    }
};

window.deleteTracking = async function(id) {
    var confirmed = await window.ModalSystem.confirm({ title: 'Conferma Eliminazione', message: 'Sei sicuro di voler eliminare questo tracking?' });
    if (!confirmed) return;
    try {
        await window.supabaseTrackingService.deleteTracking(id);
        window.notificationSystem.success('Tracking eliminato!');
        await loadAndRenderTrackings();
    } catch (error) {
        window.notificationSystem.error('Eliminazione fallita', { subtitle: error.message });
    }
};

window.bulkDelete = async function() {
    if (!window.trackingTable) return;
    var selected = window.trackingTable.getSelectedItems();
    if (selected.length === 0) return;
    
    var confirmed = await window.ModalSystem.confirm({ title: 'Eliminare ' + selected.length + ' tracking?', message: 'L\'azione è irreversibile.' });
    if (!confirmed) return;

    createProgressModal('Eliminazione in corso', 'Sto eliminando ' + selected.length + ' tracking...');
    for (var i = 0; i < selected.length; i++) {
        try {
            await window.supabaseTrackingService.deleteTracking(selected[i].id);
            updateProgressModal(((i + 1) / selected.length) * 100, 'Eliminato ' + (i + 1) + ' di ' + selected.length);
        } catch (e) {
            console.error('Errore eliminando ' + selected[i].id + ':', e);
        }
    }
    await loadAndRenderTrackings();
};

window.bulkRefresh = function() {
    window.notificationSystem.info('Funzione non ancora implementata');
};


// Punto di ingresso dell'applicazione: attende che il DOM sia pronto.
document.addEventListener('DOMContentLoaded', initializeTrackingPage);