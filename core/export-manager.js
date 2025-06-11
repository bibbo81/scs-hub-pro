// Export Manager per Supply Chain Hub
// Gestisce export avanzati in Excel (.xlsx) e PDF

window.ExportManager = (function() {
    'use strict';
    
    // Configurazione
    const config = {
        excelStyles: {
            header: {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "1a237e" } },
                alignment: { horizontal: "center", vertical: "center" }
            },
            delivered: { fill: { fgColor: { rgb: "4CAF50" } } },
            transit: { fill: { fgColor: { rgb: "2196F3" } } },
            pending: { fill: { fgColor: { rgb: "FF9800" } } },
            exception: { fill: { fgColor: { rgb: "F44336" } } }
        },
        pdfConfig: {
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true
        }
    };
    
    // Load libraries dinamicamente
    async function loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                // jsPDF si carica in window.jspdf.jsPDF
                console.log('[ExportManager] jsPDF loaded');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.head.appendChild(script);
        });
    }
    
    async function loadAutoTable() {
        return new Promise((resolve, reject) => {
            if (window.jspdfAutoTable) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script.onload = () => {
                console.log('[ExportManager] AutoTable loaded');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load AutoTable'));
            document.head.appendChild(script);
        });
    }
    
    // Export Excel avanzato
    async function exportToExcel(data, filename = 'tracking-export', options = {}) {
        try {
            // Assicurati che XLSX sia caricato
            if (!window.XLSX) {
                await window.ImportManager?.loadSheetJS();
            }
            
            if (!window.XLSX) {
                throw new Error('XLSX library non disponibile');
            }
            
            // Prepara workbook
            const wb = XLSX.utils.book_new();
            
            // Sheet 1: Tracking Data
            const trackingData = prepareTrackingData(data);
            const ws1 = XLSX.utils.json_to_sheet(trackingData, { 
                header: getTrackingHeaders(),
                dateNF: 'dd/mm/yyyy'
            });
            
            // Applica stili alle colonne
            applyExcelStyles(ws1, trackingData.length);
            
            // Aggiungi al workbook
            XLSX.utils.book_append_sheet(wb, ws1, "Tracking");
            
            // Sheet 2: Summary (se richiesto)
            if (options.includeSummary) {
                const summaryData = generateSummary(data);
                const ws2 = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(wb, ws2, "Summary");
            }
            
            // Sheet 3: Timeline Events (se ci sono eventi)
            if (options.includeTimeline && hasTimelineData(data)) {
                const timelineData = extractTimelineEvents(data);
                const ws3 = XLSX.utils.json_to_sheet(timelineData);
                XLSX.utils.book_append_sheet(wb, ws3, "Timeline");
            }
            
            // Salva file
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `${filename}-${date}.xlsx`);
            
            window.NotificationSystem?.success('Export Excel completato');
            
        } catch (error) {
            console.error('[ExportManager] Excel export error:', error);
            window.NotificationSystem?.error('Errore export Excel: ' + error.message);
        }
    }
    
    // Export PDF avanzato
    async function exportToPDF(data, filename = 'tracking-export', options = {}) {
        try {
            // Carica librerie
            await loadJsPDF();
            await loadAutoTable();
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF(config.pdfConfig);
            
            // Metadata
            doc.setProperties({
                title: 'Supply Chain Hub - Tracking Export',
                subject: 'Tracking Data Export',
                author: 'Supply Chain Hub',
                keywords: 'tracking, logistics, supply chain',
                creator: 'Supply Chain Hub v5.3'
            });
            
            // Header
            addPDFHeader(doc);
            
            // Tabella principale
            const tableData = prepareTableDataForPDF(data);
            
            doc.autoTable({
                head: [getTableHeaders()],
                body: tableData,
                startY: 40,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [26, 35, 126], // Blu scuro
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { cellWidth: 30 }, // Tracking Number
                    1: { cellWidth: 20 }, // Type
                    2: { cellWidth: 25 }, // Carrier
                    3: { cellWidth: 20 }, // Status
                    4: { cellWidth: 25 }, // Origin
                    5: { cellWidth: 25 }, // Destination
                    6: { cellWidth: 25 }, // ETA
                    7: { cellWidth: 'auto' } // Reference
                },
                didDrawCell: function(data) {
                    // Colora le celle status
                    if (data.column.index === 3 && data.cell.section === 'body') {
                        const status = data.cell.raw.toLowerCase();
                        const colors = {
                            'delivered': [76, 175, 80],
                            'in transit': [33, 150, 243],
                            'pending': [255, 152, 0],
                            'exception': [244, 67, 54]
                        };
                        
                        if (colors[status]) {
                            doc.setFillColor(...colors[status]);
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            doc.setTextColor(255);
                            doc.text(data.cell.raw, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                                align: 'center',
                                baseline: 'middle'
                            });
                        }
                    }
                }
            });
            
            // Footer
            addPDFFooter(doc);
            
            // Summary page (opzionale)
            if (options.includeSummary) {
                doc.addPage();
                addSummaryPage(doc, data);
            }
            
            // Salva
            const date = new Date().toISOString().split('T')[0];
            doc.save(`${filename}-${date}.pdf`);
            
            window.NotificationSystem?.success('Export PDF completato');
            
        } catch (error) {
            console.error('[ExportManager] PDF export error:', error);
            window.NotificationSystem?.error('Errore export PDF: ' + error.message);
        }
    }
    
    // Helper functions
    function prepareTrackingData(data) {
        return data.map(tracking => ({
            'Tracking Number': tracking.tracking_number || '-',
            'Type': tracking.tracking_type || '-',
            'Carrier': tracking.carrier_code || '-',
            'Status': tracking.status || '-',
            'Origin': tracking.origin_port || '-',
            'Destination': tracking.destination_port || '-',
            'ETA': formatDateForExport(tracking.eta),
            'ETD': formatDateForExport(tracking.etd),
            'ATA': formatDateForExport(tracking.ata),
            'ATD': formatDateForExport(tracking.atd),
            'Reference': tracking.reference_number || '-',
            'Container Size': tracking.container_size || '-',
            'Last Location': tracking.last_event_location || '-',
            'Last Update': formatDateForExport(tracking.last_update),
            'Created': formatDateForExport(tracking.created_at)
        }));
    }
    
    function getTrackingHeaders() {
        return [
            'Tracking Number', 'Type', 'Carrier', 'Status',
            'Origin', 'Destination', 'ETA', 'ETD', 'ATA', 'ATD',
            'Reference', 'Container Size', 'Last Location', 
            'Last Update', 'Created'
        ];
    }
    
    function applyExcelStyles(worksheet, rowCount) {
        // Imposta larghezza colonne
        worksheet['!cols'] = [
            { wch: 20 }, // Tracking Number
            { wch: 12 }, // Type
            { wch: 15 }, // Carrier
            { wch: 12 }, // Status
            { wch: 15 }, // Origin
            { wch: 15 }, // Destination
            { wch: 12 }, // ETA
            { wch: 12 }, // ETD
            { wch: 12 }, // ATA
            { wch: 12 }, // ATD
            { wch: 20 }, // Reference
            { wch: 12 }, // Container Size
            { wch: 20 }, // Last Location
            { wch: 16 }, // Last Update
            { wch: 16 }  // Created
        ];
        
        // Applica stili condizionali per status (se XLSX supporta)
        // Nota: Gli stili avanzati potrebbero richiedere xlsx-style
    }
    
    function generateSummary(data) {
        const summary = {
            'Total Trackings': data.length,
            'Delivered': data.filter(t => t.status === 'delivered').length,
            'In Transit': data.filter(t => t.status === 'in_transit').length,
            'Pending': data.filter(t => t.status === 'pending').length,
            'Exception': data.filter(t => t.status === 'exception').length
        };
        
        // Raggruppa per carrier
        const byCarrier = {};
        data.forEach(t => {
            const carrier = t.carrier_code || 'Unknown';
            byCarrier[carrier] = (byCarrier[carrier] || 0) + 1;
        });
        
        // Raggruppa per tipo
        const byType = {};
        data.forEach(t => {
            const type = t.tracking_type || 'Unknown';
            byType[type] = (byType[type] || 0) + 1;
        });
        
        return [
            { Category: 'Overview', Metric: 'Total Trackings', Value: summary['Total Trackings'] },
            { Category: 'Status', Metric: 'Delivered', Value: summary['Delivered'] },
            { Category: 'Status', Metric: 'In Transit', Value: summary['In Transit'] },
            { Category: 'Status', Metric: 'Pending', Value: summary['Pending'] },
            { Category: 'Status', Metric: 'Exception', Value: summary['Exception'] },
            ...Object.entries(byCarrier).map(([k, v]) => ({ Category: 'By Carrier', Metric: k, Value: v })),
            ...Object.entries(byType).map(([k, v]) => ({ Category: 'By Type', Metric: k, Value: v }))
        ];
    }
    
    function hasTimelineData(data) {
        return data.some(t => t.events && t.events.length > 0);
    }
    
    function extractTimelineEvents(data) {
        const events = [];
        
        data.forEach(tracking => {
            if (tracking.events) {
                tracking.events.forEach(event => {
                    events.push({
                        'Tracking Number': tracking.tracking_number,
                        'Event Date': formatDateForExport(event.date),
                        'Event Type': event.type || event.event,
                        'Location': event.location,
                        'Description': event.description,
                        'Status': event.status
                    });
                });
            }
        });
        
        return events;
    }
    
    function prepareTableDataForPDF(data) {
        return data.map(t => [
            t.tracking_number || '-',
            t.tracking_type || '-',
            t.carrier_code || '-',
            t.status || '-',
            t.origin_port || '-',
            t.destination_port || '-',
            formatDateForExport(t.eta),
            t.reference_number || '-'
        ]);
    }
    
    function getTableHeaders() {
        return ['Tracking', 'Type', 'Carrier', 'Status', 'Origin', 'Dest', 'ETA', 'Reference'];
    }
    
    function addPDFHeader(doc) {
        // Logo/Title
        doc.setFontSize(20);
        doc.setTextColor(26, 35, 126);
        doc.text('Supply Chain Hub', 20, 20);
        
        // Subtitle
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Tracking Export Report', 20, 28);
        
        // Date
        doc.setFontSize(10);
        const date = new Date().toLocaleString('it-IT');
        doc.text(`Generated: ${date}`, 20, 35);
        
        // Line
        doc.setDrawColor(26, 35, 126);
        doc.line(20, 37, 277, 37);
    }
    
    function addPDFFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer line
            doc.setDrawColor(200);
            doc.line(20, 190, 277, 190);
            
            // Page number
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Page ${i} of ${pageCount}`, 148, 195, { align: 'center' });
            
            // Copyright
            doc.text('© 2024 Supply Chain Hub - Confidential', 20, 195);
        }
    }
    
    function addSummaryPage(doc, data) {
        doc.setFontSize(16);
        doc.setTextColor(26, 35, 126);
        doc.text('Summary Report', 20, 20);
        
        // Statistics
        const stats = generateSummary(data);
        let y = 40;
        
        doc.setFontSize(10);
        doc.setTextColor(0);
        
        stats.forEach(stat => {
            doc.text(`${stat.Metric}: ${stat.Value}`, 20, y);
            y += 7;
        });
    }
    
    function formatDateForExport(date) {
        if (!date) return '';
        
        // Se è già nel formato DD/MM/YYYY, ritornalo
        if (typeof date === 'string' && date.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            return date;
        }
        
        // Altrimenti converti
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        return d.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // API pubblica
    return {
        exportToExcel,
        exportToPDF,
        
        // Export selezionati
        exportSelected: async function(selectedData, format = 'excel', filename = 'selected-trackings') {
            if (format === 'excel') {
                return exportToExcel(selectedData, filename, { includeSummary: true });
            } else if (format === 'pdf') {
                return exportToPDF(selectedData, filename, { includeSummary: true });
            }
        },
        
        // Export con filtri
        exportFiltered: async function(data, filters, format = 'excel') {
            const filtered = applyExportFilters(data, filters);
            const filename = `tracking-${filters.status || 'all'}-${filters.type || 'all'}`;
            
            if (format === 'excel') {
                return exportToExcel(filtered, filename, { 
                    includeSummary: true,
                    includeTimeline: true 
                });
            } else {
                return exportToPDF(filtered, filename, { includeSummary: true });
            }
        }
    };
    
    function applyExportFilters(data, filters) {
        return data.filter(item => {
            if (filters.status && item.status !== filters.status) return false;
            if (filters.type && item.tracking_type !== filters.type) return false;
            if (filters.carrier && item.carrier_code !== filters.carrier) return false;
            return true;
        });
    }
    
})();

// Auto-init al caricamento
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ExportManager] Initialized');
});