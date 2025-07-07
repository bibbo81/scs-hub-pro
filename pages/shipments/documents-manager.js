// documents-manager.js - Documents Management System for Shipments
// Path: /pages/shipments/documents-manager.js

// Protection Against Script Duplication
if (window.DocumentsManager) {
    console.log('⚠️ DocumentsManager already loaded, skipping...');
} else {
    class DocumentsManager {
        constructor() {
            this.documents = new Map();
            this.categories = [
                { id: 'bl', name: 'Bill of Lading', icon: 'fa-ship', color: 'primary' },
                { id: 'invoice', name: 'Commercial Invoice', icon: 'fa-file-invoice', color: 'success' },
                { id: 'packing', name: 'Packing List', icon: 'fa-list-alt', color: 'info' },
                { id: 'customs', name: 'Customs Documents', icon: 'fa-passport', color: 'warning' },
                { id: 'insurance', name: 'Insurance', icon: 'fa-shield-alt', color: 'danger' },
                { id: 'certificate', name: 'Certificates', icon: 'fa-certificate', color: 'purple' },
                { id: 'other', name: 'Other', icon: 'fa-folder', color: 'gray' }
            ];
            
            this.allowedFileTypes = [
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
                '.jpg', '.jpeg', '.png', '.tiff', '.bmp'
            ];
            
            this.maxFileSize = 10 * 1024 * 1024; // 10MB
            
            this.init();
        }
        
        async init() {
            console.log('📄 Initializing Documents Manager...');
            
            // Load saved documents
            this.loadDocuments();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Documents Manager initialized');
        }
        
        setupEventListeners() {
            // Listen for shipment updates
            window.addEventListener('shipmentsUpdated', (e) => {
                if (e.detail.action === 'delete') {
                    // Clean up documents for deleted shipment
                    this.removeShipmentDocuments(e.detail.shipment.id);
                }
            });
        }
        
        // DOCUMENT OPERATIONS
        async uploadDocument(shipmentId, file, metadata = {}) {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Generate document ID
            const docId = `DOC-${shipmentId}-${Date.now()}`;
            
            // Convert to base64 for storage (MVP approach)
            const base64 = await this.fileToBase64(file);
            
            const document = {
                id: docId,
                shipmentId,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                category: metadata.category || 'other',
                description: metadata.description || '',
                tags: metadata.tags || [],
                uploadedAt: new Date().toISOString(),
                uploadedBy: this.getCurrentUser(),
                base64Data: base64,
                status: 'active',
                version: 1,
                checksum: await this.generateChecksum(base64)
            };
            
            // Store document
            if (!this.documents.has(shipmentId)) {
                this.documents.set(shipmentId, []);
            }
            
            this.documents.get(shipmentId).push(document);
            this.saveDocuments();
            
            // Notify
            this.notifyDocumentChange('upload', document);
            
            return document;
        }
        
        async updateDocument(docId, updates) {
            let found = false;
            
            this.documents.forEach((docs, shipmentId) => {
                const index = docs.findIndex(d => d.id === docId);
                if (index !== -1) {
                    docs[index] = {
                        ...docs[index],
                        ...updates,
                        updatedAt: new Date().toISOString(),
                        updatedBy: this.getCurrentUser()
                    };
                    found = true;
                    this.notifyDocumentChange('update', docs[index]);
                }
            });
            
            if (!found) {
                throw new Error('Document not found');
            }
            
            this.saveDocuments();
        }
        
        async deleteDocument(docId) {
            let deleted = null;
            
            this.documents.forEach((docs, shipmentId) => {
                const index = docs.findIndex(d => d.id === docId);
                if (index !== -1) {
                    deleted = docs.splice(index, 1)[0];
                }
            });
            
            if (!deleted) {
                throw new Error('Document not found');
            }
            
            this.saveDocuments();
            this.notifyDocumentChange('delete', deleted);
            
            return deleted;
        }
        
        getShipmentDocuments(shipmentId) {
            return this.documents.get(shipmentId) || [];
        }
        
        getDocumentById(docId) {
            for (const [shipmentId, docs] of this.documents) {
                const doc = docs.find(d => d.id === docId);
                if (doc) return doc;
            }
            return null;
        }
        
        // VALIDATION
        validateFile(file) {
            // Check file type
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!this.allowedFileTypes.includes(extension)) {
                return {
                    valid: false,
                    error: `File type not allowed. Allowed types: ${this.allowedFileTypes.join(', ')}`
                };
            }
            
            // Check file size
            if (file.size > this.maxFileSize) {
                return {
                    valid: false,
                    error: `File too large. Maximum size: ${this.formatFileSize(this.maxFileSize)}`
                };
            }
            
            return { valid: true };
        }
        
        // FILE OPERATIONS
        async fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        base64ToBlob(base64) {
            const parts = base64.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            
            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }
            
            return new Blob([uInt8Array], { type: contentType });
        }
        
        downloadDocument(docId) {
            const doc = this.getDocumentById(docId);
            if (!doc) {
                throw new Error('Document not found');
            }
            
            // Convert base64 to blob
            const blob = this.base64ToBlob(doc.base64Data);
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.fileName;
            link.click();
            
            // Clean up
            URL.revokeObjectURL(url);
            
            // Log download
            this.logDocumentAccess(docId, 'download');
        }
        
        previewDocument(docId) {
            const doc = this.getDocumentById(docId);
            if (!doc) {
                throw new Error('Document not found');
            }
            
            // Check if preview is supported
            const previewableTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!previewableTypes.includes(doc.fileType)) {
                throw new Error('Preview not supported for this file type');
            }
            
            // Open in modal or new window
            if (doc.fileType === 'application/pdf') {
                window.open(doc.base64Data, '_blank');
            } else {
                // Show image in modal
                this.showImagePreview(doc);
            }
            
            // Log access
            this.logDocumentAccess(docId, 'preview');
        }
        
        // SEARCH & FILTER
        searchDocuments(query) {
            const results = [];
            const searchLower = query.toLowerCase();
            
            this.documents.forEach((docs, shipmentId) => {
                docs.forEach(doc => {
                    if (doc.fileName.toLowerCase().includes(searchLower) ||
                        doc.description.toLowerCase().includes(searchLower) ||
                        doc.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
                        results.push({ ...doc, shipmentId });
                    }
                });
            });
            
            return results;
        }
        
        filterByCategory(category) {
            const results = [];
            
            this.documents.forEach((docs, shipmentId) => {
                docs.filter(doc => doc.category === category)
                    .forEach(doc => results.push({ ...doc, shipmentId }));
            });
            
            return results;
        }
        
        // BULK OPERATIONS
        async uploadMultiple(shipmentId, files, metadata = {}) {
            const results = {
                success: [],
                errors: []
            };
            
            for (const file of files) {
                try {
                    const doc = await this.uploadDocument(shipmentId, file, metadata);
                    results.success.push(doc);
                } catch (error) {
                    results.errors.push({
                        fileName: file.name,
                        error: error.message
                    });
                }
            }
            
            return results;
        }
        
        exportDocumentsList(shipmentId = null) {
            let docs = [];
            
            if (shipmentId) {
                docs = this.getShipmentDocuments(shipmentId);
            } else {
                this.documents.forEach((shipmentDocs, sid) => {
                    docs.push(...shipmentDocs.map(d => ({ ...d, shipmentId: sid })));
                });
            }
            
            const exportData = docs.map(doc => ({
                'Document ID': doc.id,
                'Shipment ID': doc.shipmentId,
                'File Name': doc.fileName,
                'Category': this.getCategoryName(doc.category),
                'Size': this.formatFileSize(doc.fileSize),
                'Uploaded': new Date(doc.uploadedAt).toLocaleDateString('it-IT'),
                'Uploaded By': doc.uploadedBy,
                'Description': doc.description,
                'Tags': doc.tags.join(', ')
            }));
            
            return Papa.unparse(exportData);
        }
        
        // UTILITIES
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : 'Other';
        }
        
        getCategoryIcon(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.icon : 'fa-file';
        }
        
        getCategoryColor(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.color : 'gray';
        }
        
        getCurrentUser() {
            // In a real app this would come from the auth system
            return 'user@example.com';
        }
        
        async generateChecksum(data) {
            // Simple checksum for MVP
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
                const char = data.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }
        
        // STORAGE
        loadDocuments() {
            // Documents are kept in memory; persistence is handled server-side
            this.documents = new Map();
        }
        
        saveDocuments() {
            // Persistence removed; documents are synced via the backend
        }
        
        cleanupOldDocuments() {
            // Remove old documents to free up space
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months
            
            this.documents.forEach((docs, shipmentId) => {
                const filtered = docs.filter(doc => 
                    new Date(doc.uploadedAt) > cutoffDate
                );
                
                if (filtered.length < docs.length) {
                    this.documents.set(shipmentId, filtered);
                }
            });
            
            this.saveDocuments();
        }
        
        removeShipmentDocuments(shipmentId) {
            if (this.documents.has(shipmentId)) {
                this.documents.delete(shipmentId);
                this.saveDocuments();
            }
        }
        
        // NOTIFICATIONS
        notifyDocumentChange(action, document) {
            window.dispatchEvent(new CustomEvent('documentsUpdated', {
                detail: { action, document }
            }));
        }
        
        logDocumentAccess(docId, action) {
            // Log document access for audit trail
            const log = {
                docId,
                action,
                user: this.getCurrentUser(),
                timestamp: new Date().toISOString()
            };
            
            // In production, send to server
            console.log('Document access:', log);
        }
        
        // UI METHODS
        showUploadModal(shipmentId) {
            if (!window.ModalSystem) return;
            
            window.ModalSystem.show({
                title: 'Carica Documenti',
                content: this.getUploadModalContent(shipmentId),
                size: 'lg',
                buttons: [
                    {
                        text: 'Annulla',
                        class: 'sol-btn-glass',
                        onclick: () => window.ModalSystem.close()
                    },
                    {
                        text: 'Carica',
                        class: 'sol-btn-primary',
                        onclick: () => this.handleUpload(shipmentId)
                    }
                ]
            });
            
            // Setup drag & drop after modal is shown
            setTimeout(() => this.setupDragDrop(), 100);
        }
        
        getUploadModalContent(shipmentId) {
            return `
                <div class="document-upload-modal">
                    <div class="upload-zone" id="documentDropZone">
                        <i class="fas fa-cloud-upload-alt fa-3x" style="color: var(--sol-primary);"></i>
                        <h4>Trascina i file qui</h4>
                        <p>o clicca per selezionare</p>
                        <input type="file" id="documentFileInput" multiple accept="${this.allowedFileTypes.join(',')}" style="display: none;">
                    </div>
                    
                    <div class="uploaded-files-list" id="uploadedFilesList" style="display: none;">
                        <h5>File selezionati:</h5>
                        <div id="filesList"></div>
                    </div>
                    
                    <div class="upload-metadata" style="margin-top: 1.5rem;">
                        <div class="sol-form-group">
                            <label class="sol-form-label">Categoria</label>
                            <select class="sol-form-select" id="documentCategory">
                                ${this.categories.map(cat => 
                                    `<option value="${cat.id}">${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label">Descrizione (opzionale)</label>
                            <textarea class="sol-form-textarea" id="documentDescription" rows="2"></textarea>
                        </div>
                        
                        <div class="sol-form-group">
                            <label class="sol-form-label">Tags (separati da virgola)</label>
                            <input type="text" class="sol-form-input" id="documentTags" placeholder="es: urgente, doganale, originale">
                        </div>
                    </div>
                </div>
            `;
        }
        
        setupDragDrop() {
            const dropZone = document.getElementById('documentDropZone');
            const fileInput = document.getElementById('documentFileInput');
            
            if (!dropZone || !fileInput) return;
            
            // Click to select
            dropZone.addEventListener('click', () => fileInput.click());
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
            
            // Drag & Drop
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                this.handleFileSelect(e.dataTransfer.files);
            });
        }
        
        selectedFiles = [];
        
        handleFileSelect(files) {
            this.selectedFiles = Array.from(files);
            
            const filesList = document.getElementById('filesList');
            const uploadedList = document.getElementById('uploadedFilesList');
            
            if (!filesList || !uploadedList) return;
            
            // Show files list
            uploadedList.style.display = 'block';
            
            filesList.innerHTML = this.selectedFiles.map((file, index) => {
                const validation = this.validateFile(file);
                
                return `
                    <div class="file-item ${!validation.valid ? 'invalid' : ''}">
                        <i class="fas ${this.getFileIcon(file.type)}"></i>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        ${!validation.valid ? `<span class="error-msg">${validation.error}</span>` : ''}
                        <button class="remove-file" onclick="window.documentsManager.removeSelectedFile(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        removeSelectedFile(index) {
            this.selectedFiles.splice(index, 1);
            this.handleFileSelect(this.selectedFiles);
        }
        
        async handleUpload(shipmentId) {
            if (this.selectedFiles.length === 0) {
                window.NotificationSystem?.show('Errore', 'Seleziona almeno un file', 'error');
                return;
            }
            
            const metadata = {
                category: document.getElementById('documentCategory')?.value || 'other',
                description: document.getElementById('documentDescription')?.value || '',
                tags: document.getElementById('documentTags')?.value
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t) || []
            };
            
            // Show progress
            const progressModal = window.ModalSystem?.progress?.({
                title: 'Caricamento Documenti',
                message: 'Caricamento in corso...',
                showPercentage: true
            });
            
            try {
                const results = await this.uploadMultiple(shipmentId, this.selectedFiles, metadata);
                
                progressModal?.close();
                window.ModalSystem.close();
                
                // Show results
                if (results.errors.length > 0) {
                    window.NotificationSystem?.show(
                        'Caricamento Parziale',
                        `${results.success.length} file caricati, ${results.errors.length} errori`,
                        'warning'
                    );
                } else {
                    window.NotificationSystem?.show(
                        'Caricamento Completato',
                        `${results.success.length} documenti caricati con successo`,
                        'success'
                    );
                }
                
                // Refresh documents view
                this.refreshDocumentsView(shipmentId);
                
            } catch (error) {
                progressModal?.close();
                window.NotificationSystem?.show('Errore', error.message, 'error');
            }
        }
        
        showDocumentsList(shipmentId) {
            const documents = this.getShipmentDocuments(shipmentId);
            
            if (!window.ModalSystem) return;
            
            window.ModalSystem.show({
                title: 'Documenti Spedizione',
                content: this.getDocumentsListContent(shipmentId, documents),
                size: 'xl',
                buttons: [
                    {
                        text: 'Carica Nuovo',
                        class: 'sol-btn-primary',
                        onclick: () => {
                            window.ModalSystem.close();
                            this.showUploadModal(shipmentId);
                        }
                    },
                    {
                        text: 'Esporta Lista',
                        class: 'sol-btn-glass',
                        onclick: () => this.exportDocumentsList(shipmentId)
                    }
                ]
            });
        }
        
        getDocumentsListContent(shipmentId, documents) {
            if (documents.length === 0) {
                return `
                    <div style="text-align: center; padding: 3rem;">
                        <i class="fas fa-folder-open fa-4x" style="color: var(--sol-gray-400); margin-bottom: 1rem;"></i>
                        <h4>Nessun documento caricato</h4>
                        <p style="color: var(--sol-gray-600);">Carica i documenti per questa spedizione</p>
                    </div>
                `;
            }
            
            // Group by category
            const grouped = {};
            documents.forEach(doc => {
                if (!grouped[doc.category]) {
                    grouped[doc.category] = [];
                }
                grouped[doc.category].push(doc);
            });
            
            return `
                <div class="documents-list">
                    ${Object.entries(grouped).map(([category, docs]) => `
                        <div class="document-category-group">
                            <h5 class="category-header">
                                <i class="fas ${this.getCategoryIcon(category)}"></i>
                                ${this.getCategoryName(category)}
                                <span class="count">${docs.length}</span>
                            </h5>
                            <div class="documents-grid">
                                ${docs.map(doc => this.getDocumentCard(doc)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        getDocumentCard(doc) {
            return `
                <div class="document-card" data-doc-id="${doc.id}">
                    <div class="doc-icon">
                        <i class="fas ${this.getFileIcon(doc.fileType)} fa-2x"></i>
                    </div>
                    <div class="doc-info">
                        <h6 class="doc-name">${doc.fileName}</h6>
                        <p class="doc-meta">
                            ${this.formatFileSize(doc.fileSize)} • 
                            ${new Date(doc.uploadedAt).toLocaleDateString('it-IT')}
                        </p>
                        ${doc.description ? `<p class="doc-description">${doc.description}</p>` : ''}
                        ${doc.tags.length > 0 ? `
                            <div class="doc-tags">
                                ${doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="doc-actions">
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="window.documentsManager.previewDocument('${doc.id}')"
                                title="Anteprima">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="window.documentsManager.downloadDocument('${doc.id}')"
                                title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="sol-btn sol-btn-sm sol-btn-glass" 
                                onclick="window.documentsManager.deleteDocumentConfirm('${doc.id}')"
                                title="Elimina">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        getFileIcon(fileType) {
            const iconMap = {
                'application/pdf': 'fa-file-pdf',
                'application/msword': 'fa-file-word',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
                'application/vnd.ms-excel': 'fa-file-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
                'image/jpeg': 'fa-file-image',
                'image/jpg': 'fa-file-image',
                'image/png': 'fa-file-image',
                'image/tiff': 'fa-file-image',
                'image/bmp': 'fa-file-image'
            };
            
            return iconMap[fileType] || 'fa-file';
        }
        
        showImagePreview(doc) {
            if (!window.ModalSystem) return;
            
            window.ModalSystem.show({
                title: doc.fileName,
                content: `
                    <div style="text-align: center;">
                        <img src="${doc.base64Data}" style="max-width: 100%; max-height: 70vh;">
                    </div>
                `,
                size: 'xl'
            });
        }
        
        deleteDocumentConfirm(docId) {
            if (!window.ModalSystem) return;
            
            const doc = this.getDocumentById(docId);
            if (!doc) return;
            
            window.ModalSystem.confirm({
                title: 'Elimina Documento',
                message: `Sei sicuro di voler eliminare "${doc.fileName}"?`,
                confirmText: 'Elimina',
                confirmClass: 'sol-btn-danger',
                onConfirm: async () => {
                    try {
                        await this.deleteDocument(docId);
                        window.NotificationSystem?.show(
                            'Documento Eliminato',
                            'Il documento è stato eliminato con successo',
                            'success'
                        );
                        
                        // Refresh view if in modal
                        if (document.querySelector('.documents-list')) {
                            this.refreshDocumentsView(doc.shipmentId);
                        }
                    } catch (error) {
                        window.NotificationSystem?.show('Errore', error.message, 'error');
                    }
                }
            });
        }
        
        refreshDocumentsView(shipmentId) {
            // Update the documents count in the main UI
            const countElement = document.querySelector(`[data-shipment-id="${shipmentId}"] .doc-count`);
            if (countElement) {
                const count = this.getShipmentDocuments(shipmentId).length;
                countElement.textContent = count;
            }
            
            // If modal is open, refresh content
            const modalContent = document.querySelector('.documents-list');
            if (modalContent) {
                const documents = this.getShipmentDocuments(shipmentId);
                modalContent.innerHTML = this.getDocumentsListContent(shipmentId, documents);
            }
        }
        
        // STATISTICS
        getStatistics() {
            let totalDocs = 0;
            let totalSize = 0;
            const byCategory = {};
            const byType = {};
            
            this.documents.forEach(docs => {
                docs.forEach(doc => {
                    totalDocs++;
                    totalSize += doc.fileSize;
                    
                    // By category
                    byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
                    
                    // By file type
                    const ext = doc.fileName.split('.').pop().toLowerCase();
                    byType[ext] = (byType[ext] || 0) + 1;
                });
            });
            
            return {
                totalDocuments: totalDocs,
                totalSize: this.formatFileSize(totalSize),
                shipmentsWithDocs: this.documents.size,
                byCategory,
                byType,
                avgDocsPerShipment: this.documents.size > 0 
                    ? (totalDocs / this.documents.size).toFixed(1) 
                    : 0
            };
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        window.documentsManager = new DocumentsManager();
    });

    // Export
    window.DocumentsManager = DocumentsManager;

    // Styles for documents manager
    const style = document.createElement('style');
    style.textContent = `
        /* Upload Zone */
        .upload-zone {
            border: 2px dashed var(--sol-gray-300);
            border-radius: var(--sol-radius-lg);
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: all var(--sol-transition-fast);
        }
        
        .upload-zone:hover {
            border-color: var(--sol-primary);
            background: var(--sol-primary-light);
        }
        
        .upload-zone.drag-over {
            border-color: var(--sol-primary);
            background: var(--sol-primary-light);
            transform: scale(1.02);
        }
        
        /* File List */
        .file-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: var(--sol-gray-50);
            border-radius: var(--sol-radius-md);
            margin-bottom: 0.5rem;
        }
        
        .file-item.invalid {
            background: var(--sol-danger-light);
        }
        
        .file-item i {
            color: var(--sol-primary);
        }
        
        .file-name {
            flex: 1;
            font-weight: 500;
        }
        
        .file-size {
            color: var(--sol-gray-600);
            font-size: 0.875rem;
        }
        
        .error-msg {
            color: var(--sol-danger);
            font-size: 0.75rem;
        }
        
        .remove-file {
            background: none;
            border: none;
            color: var(--sol-gray-600);
            cursor: pointer;
            padding: 0.25rem;
        }
        
        .remove-file:hover {
            color: var(--sol-danger);
        }
        
        /* Documents List */
        .document-category-group {
            margin-bottom: 2rem;
        }
        
        .category-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            color: var(--sol-gray-800);
        }
        
        .category-header .count {
            margin-left: auto;
            background: var(--sol-gray-200);
            padding: 0.125rem 0.5rem;
            border-radius: 999px;
            font-size: 0.875rem;
        }
        
        .documents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1rem;
        }
        
        .document-card {
            background: white;
            border: 1px solid var(--sol-gray-200);
            border-radius: var(--sol-radius-lg);
            padding: 1.25rem;
            transition: all var(--sol-transition-fast);
        }
        
        .document-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--sol-shadow-md);
        }
        
        .doc-icon {
            margin-bottom: 1rem;
            color: var(--sol-primary);
        }
        
        .doc-name {
            margin: 0 0 0.25rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--sol-gray-800);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .doc-meta {
            margin: 0 0 0.5rem;
            font-size: 0.75rem;
            color: var(--sol-gray-600);
        }
        
        .doc-description {
            margin: 0.5rem 0;
            font-size: 0.8125rem;
            color: var(--sol-gray-700);
        }
        
        .doc-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            margin-top: 0.5rem;
        }
        
        .doc-tags .tag {
            background: var(--sol-primary-light);
            color: var(--sol-primary);
            padding: 0.125rem 0.5rem;
            border-radius: 999px;
            font-size: 0.75rem;
        }
        
        .doc-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }
    `;

    document.head.appendChild(style);

    console.log('[DocumentsManager] Module loaded');
}