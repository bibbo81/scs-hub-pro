(function() {
    'use strict';
    
    console.log('🔧 TRACKING COMPLETE FIX: Starting comprehensive table/UI fixes...');
    
    // ========================================
    // FIX 1: TABLE RENDERING
    // ========================================
    
    async function fixTableRendering() {
        console.log('🔧 FIX 1: Fixing table rendering...');
        
        // Attendi che la pagina sia pronta
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
        
        // Fix per renderTable in index.js
        if (window.renderTable && typeof window.renderTable === 'function') {
            const originalRenderTable = window.renderTable;
            
            window.renderTable = function() {
                console.log('🔧 Enhanced renderTable called');
                
                const tbody = document.getElementById('trackingTableBody');
                const emptyState = document.getElementById('emptyState');
                const loadingState = document.getElementById('loadingState');
                
                // Nascondi loading
                if (loadingState) loadingState.style.display = 'none';
                
                // Se non ci sono tracking
                if (!window.filteredTrackings || window.filteredTrackings.length === 0) {
                    if (emptyState) emptyState.style.display = 'block';
                    if (tbody) tbody.style.display = 'none';
                    return;
                }
                
                // Mostra tabella
                if (emptyState) emptyState.style.display = 'none';
                if (tbody) {
                    tbody.style.display = '';
                    
                    // Renderizza righe
                    tbody.innerHTML = window.filteredTrackings.map(tracking => `
                        <tr>
                            <td>
                                <input type="checkbox" name="trackingCheckbox" value="${tracking.id}" 
                                       onchange="updateBulkActionsBar()">
                            </td>
                            <td>
                                <span class="tracking-number">${tracking.tracking_number || '-'}</span>
                            </td>
                            <td>
                                <span class="carrier-badge ${(tracking.carrier_code || '').toLowerCase()}">
                                    ${tracking.carrier_code || tracking.carrier || 'UNKNOWN'}
                                </span>
                            </td>
                            <td>${renderStatus(tracking.status || 'pending')}</td>
                            <td>${tracking.origin || tracking.origin_port || '-'}</td>
                            <td>${tracking.destination || tracking.destination_port || '-'}</td>
                            <td>${formatDate(tracking.updated_at || tracking.created_at)}</td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button class="sol-btn sol-btn-sm sol-btn-primary" 
                                            onclick="refreshTracking('${tracking.id}')"
                                            title="Aggiorna">
                                        <i class="fas fa-sync"></i>
                                    </button>
                                    <button class="sol-btn sol-btn-sm sol-btn-info" 
                                            onclick="viewDetails('${tracking.id}')"
                                            title="Dettagli">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="sol-btn sol-btn-sm sol-btn-danger" 
                                            onclick="deleteTracking('${tracking.id}')"
                                            title="Elimina">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
                
                // Chiama originale se esiste
                if (originalRenderTable && originalRenderTable !== window.renderTable) {
                    try {
                        originalRenderTable.call(this);
                    } catch (e) {
                        console.warn('Original renderTable error:', e);
                    }
                }
            };
        }
        
        // Assicura che le funzioni helper esistano
        if (!window.renderStatus) {
            window.renderStatus = function(status) {
                const statusConfig = {
                    delivered: { class: 'badge-success', icon: 'check-circle', text: 'Consegnato' },
                    in_transit: { class: 'badge-info', icon: 'truck', text: 'In transito' },
                    arrived: { class: 'badge-primary', icon: 'box', text: 'Arrivato' },
                    out_for_delivery: { class: 'badge-warning', icon: 'shipping-fast', text: 'In consegna' },
                    exception: { class: 'badge-danger', icon: 'exclamation-triangle', text: 'Eccezione' },
                    pending: { class: 'badge-secondary', icon: 'clock', text: 'In attesa' }
                };
                
                const config = statusConfig[status] || statusConfig.pending;
                
                return `
                    <span class="badge ${config.class}">
                        <i class="fas fa-${config.icon}"></i> ${config.text}
                    </span>
                `;
            };
        }
        
        if (!window.formatDate) {
            window.formatDate = function(dateString) {
                if (!dateString) return '-';
                
                const date = new Date(dateString);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                
                if (diffMins < 1) return 'Ora';
                if (diffMins < 60) return `${diffMins} min fa`;
                if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ore fa`;
                
                return date.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };
        }
        
        console.log('✅ Table rendering fixed');
    }
    
    // ========================================
    // FIX 2: EXPORT FUNCTIONALITY
    // ========================================
    
    function fixExportFunctionality() {
        console.log('🔧 FIX 2: Fixing export functionality...');
        
        // Override exportData con implementazione completa
        window.exportData = function(format = 'excel') {
            console.log('📥 Enhanced export called:', format);
            
            const trackings = window.filteredTrackings || window.trackings || [];
            
            if (trackings.length === 0) {
                alert('Nessun dato da esportare');
                return;
            }
            
            try {
                if (format === 'excel') {
                    exportToExcel(trackings);
                } else if (format === 'pdf') {
                    exportToPDF(trackings);
                } else {
                    exportToCSV(trackings);
                }
                
                window.NotificationSystem?.success(`Export ${format.toUpperCase()} completato`);
            } catch (error) {
                console.error('Export error:', error);
                window.NotificationSystem?.error('Errore durante l\'export');
            }
        };
        
        // Implementazione Excel export
        function exportToExcel(data) {
            // Headers mappati correttamente
            const headers = [
                'Tracking Number',
                'Carrier',
                'Status',
                'Origin',
                'Destination',
                'Reference',
                'Container Count',
                'Booking',
                'Created At',
                'Updated At'
            ];
            
            // Prepara i dati
            const rows = data.map(tracking => [
                tracking.tracking_number || '',
                tracking.carrier_code || tracking.carrier || '',
                tracking.status || 'pending',
                tracking.origin || tracking.origin_port || '',
                tracking.destination || tracking.destination_port || '',
                tracking.reference || '',
                tracking.container_count || '',
                tracking.booking || '',
                formatDateForExport(tracking.created_at),
                formatDateForExport(tracking.updated_at)
            ]);
            
            // Crea workbook
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Trackings');
            
            // Stili colonne
            const colWidths = [
                { wch: 20 }, // Tracking Number
                { wch: 15 }, // Carrier
                { wch: 15 }, // Status
                { wch: 20 }, // Origin
                { wch: 20 }, // Destination
                { wch: 20 }, // Reference
                { wch: 15 }, // Container Count
                { wch: 20 }, // Booking
                { wch: 20 }, // Created
                { wch: 20 }  // Updated
            ];
            ws['!cols'] = colWidths;
            
            // Download
            XLSX.writeFile(wb, `trackings_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        
        // Implementazione CSV export
        function exportToCSV(data) {
            const headers = [
                'tracking_number',
                'carrier_code',
                'status',
                'origin',
                'destination',
                'reference',
                'container_count',
                'booking',
                'created_at',
                'updated_at'
            ];
            
            const csv = [
                headers.join(','),
                ...data.map(tracking => 
                    headers.map(header => {
                        const value = tracking[header] || '';
                        return value.toString().includes(',') ? `"${value}"` : value;
                    }).join(',')
                )
            ].join('\n');
            
            downloadFile(csv, `trackings_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        }
        
        // Implementazione PDF export (base)
        function exportToPDF(data) {
            // Fallback: esporta come HTML stampabile
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Tracking Export</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        h1 { text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>Tracking Spedizioni - ${new Date().toLocaleDateString('it-IT')}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>Tracking Number</th>
                                <th>Carrier</th>
                                <th>Status</th>
                                <th>Origin</th>
                                <th>Destination</th>
                                <th>Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(t => `
                                <tr>
                                    <td>${t.tracking_number || '-'}</td>
                                    <td>${t.carrier_code || '-'}</td>
                                    <td>${t.status || 'pending'}</td>
                                    <td>${t.origin || '-'}</td>
                                    <td>${t.destination || '-'}</td>
                                    <td>${t.reference || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
        }
        
        // Helper functions
        function formatDateForExport(dateString) {
            if (!dateString) return '';
            return new Date(dateString).toLocaleString('it-IT');
        }
        
        function downloadFile(content, filename, type) {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        console.log('✅ Export functionality fixed');
    }
    
    // ========================================
    // FIX 3: IMPORT FUNCTIONALITY
    // ========================================
    
    function fixImportFunctionality() {
        console.log('🔧 FIX 3: Fixing import functionality...');
        
        window.showImportDialog = function() {
            console.log('📤 Enhanced import dialog');
            
            // Crea modal custom per import
            const modalHtml = `
                <div class="import-dialog">
                    <h3>Importa Tracking</h3>
                    <p>Seleziona un file CSV o Excel da importare:</p>
                    
                    <div class="import-dropzone" id="importDropzone">
                        <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                        <p>Trascina qui il file o clicca per selezionare</p>
                        <input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display: none;">
                    </div>
                    
                    <div class="import-info mt-3">
                        <small>Formati supportati: CSV, Excel (.xlsx, .xls)</small><br>
                        <small>Colonne richieste: tracking_number, carrier_code</small>
                    </div>
                    
                    <div class="mt-4">
                        <button class="sol-btn sol-btn-secondary" onclick="window.ModalSystem?.close()">
                            Annulla
                        </button>
                    </div>
                </div>
            `;
            
            if (window.ModalSystem && window.ModalSystem.show) {
                window.ModalSystem.show({
                    title: 'Importa Tracking',
                    content: modalHtml,
                    size: 'md'
                });
                
                // Setup dropzone
                setTimeout(setupImportDropzone, 100);
            } else {
                // Fallback semplice
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv,.xlsx,.xls';
                input.onchange = handleFileSelect;
                input.click();
            }
        };
        
        function setupImportDropzone() {
            const dropzone = document.getElementById('importDropzone');
            const fileInput = document.getElementById('importFileInput');
            
            if (!dropzone || !fileInput) return;
            
            dropzone.onclick = () => fileInput.click();
            fileInput.onchange = handleFileSelect;
            
            dropzone.ondragover = (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            };
            
            dropzone.ondragleave = () => {
                dropzone.classList.remove('dragover');
            };
            
            dropzone.ondrop = (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFile(files[0]);
                }
            };
        }
        
        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                handleFile(file);
            }
        }
        
        async function handleFile(file) {
            console.log('📁 Processing file:', file.name);
            
            try {
                window.ModalSystem?.close();
                window.NotificationSystem?.info('Elaborazione file in corso...');
                
                const extension = file.name.split('.').pop().toLowerCase();
                let data;
                
                if (extension === 'csv') {
                    data = await parseCSV(file);
                } else if (['xlsx', 'xls'].includes(extension)) {
                    data = await parseExcel(file);
                } else {
                    throw new Error('Formato file non supportato');
                }
                
                console.log('📊 Parsed data:', data.length, 'rows');
                
                // Processa e salva i tracking
                await processImportedData(data);
                
            } catch (error) {
                console.error('Import error:', error);
                window.NotificationSystem?.error('Errore importazione: ' + error.message);
            }
        }
        
        function parseCSV(file) {
            return new Promise((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            console.warn('CSV parse warnings:', results.errors);
                        }
                        resolve(results.data);
                    },
                    error: reject
                });
            });
        }
        
        function parseExcel(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const workbook = XLSX.read(e.target.result, { type: 'binary' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const data = XLSX.utils.sheet_to_json(firstSheet);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsBinaryString(file);
            });
        }
        
        async function processImportedData(data) {
            if (!data || data.length === 0) {
                throw new Error('Nessun dato valido trovato nel file');
            }
            
            // Column mapping
            const columnMap = {
                'Container': 'tracking_number',
                'Container Number': 'tracking_number',
                'AWB Number': 'tracking_number',
                'Tracking Number': 'tracking_number',
                'Carrier': 'carrier_code',
                'Shipping Line': 'carrier_code',
                'Status': 'status',
                'Origin': 'origin',
                'Destination': 'destination',
                'Reference': 'reference'
            };
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const row of data) {
                try {
                    // Mappa le colonne
                    const tracking = {};
                    for (const [fileCol, dbCol] of Object.entries(columnMap)) {
                        if (row[fileCol] !== undefined) {
                            tracking[dbCol] = row[fileCol];
                        }
                    }
                    
                    // Validazione minima
                    if (!tracking.tracking_number) {
                        console.warn('Skipping row without tracking number:', row);
                        errorCount++;
                        continue;
                    }
                    
                    // Default values
                    tracking.status = tracking.status || 'pending';
                    tracking.carrier_code = tracking.carrier_code || 'UNKNOWN';
                    
                    // Salva
                    if (window.addTracking) {
                        await window.addTracking(tracking);
                        successCount++;
                    }
                    
                } catch (error) {
                    console.error('Error processing row:', error, row);
                    errorCount++;
                }
            }
            
            // Report finale
            window.NotificationSystem?.success(
                `Import completato: ${successCount} tracking importati${errorCount > 0 ? `, ${errorCount} errori` : ''}`
            );
            
            // Ricarica tabella
            if (window.loadTrackings) {
                await window.loadTrackings();
            }
        }
        
        console.log('✅ Import functionality fixed');
    }
    
    // ========================================
    // FIX 4: DELETE FUNCTIONALITY
    // ========================================
    
    function fixDeleteFunctionality() {
        console.log('🔧 FIX 4: Fixing delete functionality...');
        
        window.deleteTracking = async function(id) {
            console.log('🗑️ Enhanced delete tracking:', id);
            
            // Trova il tracking per mostrare info
            const tracking = window.trackings?.find(t => t.id === id);
            const trackingNumber = tracking?.tracking_number || 'questo tracking';
            
            // Conferma con modal se disponibile
            if (window.ModalSystem && window.ModalSystem.show) {
                window.ModalSystem.show({
                    title: 'Conferma Eliminazione',
                    content: `
                        <p>Sei sicuro di voler eliminare il tracking <strong>${trackingNumber}</strong>?</p>
                        <p class="text-muted">Questa azione non può essere annullata.</p>
                    `,
                    size: 'sm',
                    actions: [
                        {
                            label: 'Annulla',
                            type: 'secondary',
                            handler: () => window.ModalSystem.close()
                        },
                        {
                            label: 'Elimina',
                            type: 'danger',
                            handler: async () => {
                                window.ModalSystem.close();
                                await performDelete(id);
                            }
                        }
                    ]
                });
            } else {
                // Fallback confirm
                if (confirm('⚠️ Questa operazione eliminerà anche la spedizione collegata. Procedere?')) {
                    await performDelete(id);
                }
            }
        };
        
        async function performDelete(id) {
            try {
                // Mostra loading
                window.NotificationSystem?.info('Eliminazione in corso...');
                
                // Elimina da Supabase
                if (window.supabaseTrackingService && window.supabaseTrackingService.deleteTracking) {
                    const result = await window.supabaseTrackingService.deleteTracking(id);
                    
                    if (result) {
                        window.NotificationSystem?.success('Tracking eliminato con successo');
                        
                        // Ricarica dati
                        if (window.loadTrackings) {
                            await window.loadTrackings();
                        }
                    } else {
                        throw new Error('Eliminazione fallita');
                    }
                } else {
                    // Fallback: rimuovi da array locale
                    window.trackings = window.trackings.filter(t => t.id !== id);
                    window.filteredTrackings = window.filteredTrackings.filter(t => t.id !== id);
                    
                    // Re-render
                    if (window.renderTable) {
                        window.renderTable();
                    }
                    
                    window.NotificationSystem?.success('Tracking rimosso localmente');
                }
                
            } catch (error) {
                console.error('Delete error:', error);
                window.NotificationSystem?.error('Errore durante l\'eliminazione: ' + error.message);
            }
        }
        
        console.log('✅ Delete functionality fixed');
    }
    
    // ========================================
    // FIX 5: STILI CSS
    // ========================================
    
    function fixStyles() {
        console.log('🔧 FIX 5: Fixing styles...');
        
        const style = document.createElement('style');
        style.textContent = `
            /* Fix tabella */
            #trackingTable {
                width: 100%;
                border-collapse: collapse;
            }
            
            #trackingTable th {
                background-color: #f8f9fa;
                font-weight: 600;
                text-align: left;
                padding: 12px;
                border-bottom: 2px solid #dee2e6;
                cursor: pointer;
                user-select: none;
            }
            
            #trackingTable th:hover {
                background-color: #e9ecef;
            }
            
            #trackingTable td {
                padding: 12px;
                border-bottom: 1px solid #dee2e6;
            }
            
            #trackingTable tbody tr:hover {
                background-color: #f8f9fa;
            }
            
            /* Fix carrier badges */
            .carrier-badge {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.875rem;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .carrier-badge.fedex { background: #4d148c; color: white; }
            .carrier-badge.dhl { background: #ffcc00; color: #d40511; }
            .carrier-badge.ups { background: #351c15; color: white; }
            .carrier-badge.gls { background: #0066cc; color: white; }
            .carrier-badge.tnt { background: #ff6600; color: white; }
            .carrier-badge.unknown { background: #6c757d; color: white; }
            
            /* Fix buttons */
            .btn-group {
                display: inline-flex;
                gap: 0.25rem;
            }
            
            .sol-btn-sm {
                padding: 0.25rem 0.5rem !important;
                font-size: 0.875rem !important;
                line-height: 1.5 !important;
            }
            
            /* Fix responsive */
            @media (max-width: 768px) {
                .table-responsive {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                #trackingTable {
                    min-width: 800px;
                }
            }
            
            /* Import dropzone */
            .import-dropzone {
                border: 2px dashed #dee2e6;
                border-radius: 0.5rem;
                padding: 3rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .import-dropzone:hover {
                border-color: #007bff;
                background-color: #f8f9fa;
            }
            
            .import-dropzone.dragover {
                border-color: #007bff;
                background-color: #e7f3ff;
            }
            
            /* Fix loading state */
            #loadingState {
                text-align: center;
                padding: 3rem;
            }
            
            #emptyState {
                text-align: center;
                padding: 3rem;
            }
            
            .spinner-border {
                display: inline-block;
                width: 2rem;
                height: 2rem;
                vertical-align: text-bottom;
                border: 0.25em solid currentColor;
                border-right-color: transparent;
                border-radius: 50%;
                animation: spinner-border 0.75s linear infinite;
            }
            
            @keyframes spinner-border {
                to { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ Styles fixed');
    }
    
    // ========================================
    // MAIN INITIALIZATION
    // ========================================
    
    async function initializeCompleteFixes() {
        console.log('🚀 Initializing complete fixes...');
        
        // Applica tutti i fix
        await fixTableRendering();
        fixExportFunctionality();
        fixImportFunctionality();
        fixDeleteFunctionality();
        fixStyles();
        
        // Forza un re-render dopo i fix
        setTimeout(() => {
            if (window.loadTrackings) {
                console.log('🔄 Forcing data reload after fixes...');
                window.loadTrackings();
            }
        }, 1000);
        
        console.log('✅ All complete fixes applied!');
        
        // Notifica
        if (window.NotificationSystem) {
            window.NotificationSystem.success('Sistema tracking completamente operativo');
        }
    }
    
    // Avvia quando pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCompleteFixes);
    } else {
        setTimeout(initializeCompleteFixes, 500);
    }
    
})();

console.log('✅ Tracking complete fix loaded');