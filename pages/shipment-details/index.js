import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import headerComponent from '/core/header-component.js';
import ModalSystem from '/core/modal-system.js';

document.addEventListener('DOMContentLoaded', async () => {
    await headerComponent.init();
    await dataManager.init();

    const shipmentId = getShipmentIdFromURL();
    if (!shipmentId) {
        notificationSystem.error("ID Spedizione non trovato nell'URL.");
        document.body.innerHTML += '<p>Errore: ID spedizione mancante.</p>';
        return;
    }

    loadShipmentDetails(shipmentId);
    setupEventListeners();
});

function getShipmentIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadShipmentDetails(shipmentId) {
    try {
        // Chiama la funzione aggiornata nel dataManager
        const shipmentDetails = await dataManager.getShipmentDetails(shipmentId);

        if (!shipmentDetails) {
            notificationSystem.error("Spedizione non trovata.");
            return;
        }

        renderShipmentInfo(shipmentDetails);
        renderProductsTable(shipmentDetails.products);
        renderDocumentsTable(shipmentDetails.documents);

    } catch (error) {
        console.error("Errore caricamento dettagli spedizione:", error);
        notificationSystem.error("Impossibile caricare i dettagli della spedizione.");
    }
}

function renderShipmentInfo(shipment) {
    document.getElementById('shipmentNumberTitle').textContent = `Spedizione ${shipment.shipment_number || ''}`;
    document.getElementById('shipmentNumber').textContent = shipment.shipment_number || '-';
    document.getElementById('shipmentStatus').innerHTML = formatStatus(shipment.status); // Usa innerHTML per il badge
    document.getElementById('shipmentDate').textContent = formatDate(shipment.created_at);
    document.getElementById('shipmentOrigin').textContent = shipment.origin || '-';
    document.getElementById('shipmentDestination').textContent = shipment.destination || '-';
    // Mostra il nome dello spedizioniere
    document.getElementById('shipmentCarrier').textContent = shipment.carrier?.name || '-';
    document.getElementById('shipmentTotalCost').textContent = formatCurrency(shipment.total_cost);
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nessun prodotto associato.</td></tr>';
        return;
    }

    let totalValue = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let totalAllocatedCost = 0;

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.classList.add('product-row'); // Aggiungi una classe per lo stile
        tr.innerHTML = `
            <td>
                ${product.product?.name || product.name || '-'}
                <small class="text-muted d-block">${product.product?.sku || ''}</small>
            </td>
            <td>${product.quantity || 0}</td>
            <td>${formatCurrency(product.unit_value)}</td>
            <td>${formatCurrency(product.total_value)}</td>
            <td>${formatWeight(product.weight_kg)}</td>
            <td>${formatVolume(product.volume_cbm)}</td>
            <td>${formatCurrency(product.allocated_cost)}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm edit-product-btn" data-product-id="${product.id}" title="Modifica Prodotto"><i class="fas fa-edit"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-product-btn" data-product-id="${product.id}" title="Elimina Prodotto"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);

        totalValue += product.total_value || 0;
        totalWeight += product.total_weight_kg || 0;
        totalVolume += product.total_volume_cbm || 0;
        totalAllocatedCost += product.allocated_cost || 0;
    });

    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalWeight').textContent = formatWeight(totalWeight);
    document.getElementById('totalVolume').textContent = formatVolume(totalVolume);
    document.getElementById('totalAllocatedCost').textContent = formatCurrency(totalAllocatedCost);
}

function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '';

    if (!documents || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun documento caricato.</td></tr>';
        return;
    }

    documents.forEach(doc => {
        const publicURL = dataManager.getPublicFileUrl(doc.file_path);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><a href="${publicURL}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt mr-2 text-primary"></i>${doc.document_name}</a></td>
            <td>${doc.document_type || '-'}</td>
            <td>${formatDate(doc.created_at)}</td>
            <td>${doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}</td>
            <td>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-document-btn" data-document-id="${doc.id}" title="Elimina Documento"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatCurrency(value) {
    if (typeof value !== 'number') return '€ 0,00';
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function formatWeight(value) {
    if (typeof value !== 'number') return '0 kg';
    return `${value.toFixed(3)} kg`;
}

function formatVolume(value) {
    if (typeof value !== 'number') return '0 m³';
    return `${value.toFixed(3)} m³`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
}

function formatStatus(rawStatus) {
    const statusKey = (rawStatus || 'registered').toLowerCase().replace(/ /g, '_');
    const label = rawStatus || 'Registrato';
    return `<span class="status-badge status-${statusKey}">${label}</span>`;
}

function setupEventListeners() {
    // Pulsanti statici
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', addProduct);
    }

    const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');
    if (uploadDocumentBtn) {
        uploadDocumentBtn.addEventListener('click', uploadDocument);
    }

    // Delega eventi per pulsanti dinamici nella tabella prodotti
    const productsTableBody = document.getElementById('productsTableBody');
    if (productsTableBody) {
        productsTableBody.addEventListener('click', (event) => {
            const editBtn = event.target.closest('.edit-product-btn');
            if (editBtn) {
                const productId = editBtn.dataset.productId;
                editProduct(productId);
                return;
            }

            const deleteBtn = event.target.closest('.delete-product-btn');
            if (deleteBtn) {
                const productId = deleteBtn.dataset.productId;
                deleteProduct(productId);
                return;
            }
        });
    }

    // Delega eventi per pulsanti dinamici nella tabella documenti
    const documentsTableBody = document.getElementById('documentsTableBody');
    if (documentsTableBody) {
        documentsTableBody.addEventListener('click', (event) => {
            const deleteBtn = event.target.closest('.delete-document-btn');
            if (deleteBtn) {
                const documentId = deleteBtn.dataset.documentId;
                deleteDocument(documentId);
            }
        });
    }
}

// Funzioni placeholder per le azioni (da implementare)
function editProduct(productId) {
    notificationSystem.info(`Funzione "Modifica Prodotto" (ID: ${productId}) non ancora implementata.`);
}

async function deleteProduct(productId) {
    const confirmed = await ModalSystem.confirm({
        title: 'Conferma Eliminazione',
        content: 'Sei sicuro di voler rimuovere questo prodotto dalla spedizione?',
        confirmText: 'Elimina',
        cancelText: 'Annulla'
    });

    if (confirmed) {
        try {
            notificationSystem.info('Rimozione prodotto in corso...');
            await dataManager.deleteShipmentItem(productId);
            notificationSystem.success('Prodotto rimosso con successo!');
            const shipmentId = getShipmentIdFromURL();
            loadShipmentDetails(shipmentId); // Ricarica i dettagli per aggiornare la tabella
        } catch (error) {
            notificationSystem.error('Errore durante la rimozione del prodotto.');
        }
    }
}

async function uploadDocument() {
    const modalContent = `
        <div class="sol-form">
            <div class="sol-form-group">
                <label for="documentTypeInput" class="sol-form-label">Tipo di Documento</label>
                <input type="text" id="documentTypeInput" class="sol-form-input" placeholder="Es. Fattura, Bolla di carico...">
            </div>
            <div class="sol-form-group">
                <label for="fileInput" class="sol-form-label">Seleziona File</label>
                <input type="file" id="fileInput" class="sol-form-input">
            </div>
        </div>
    `;

    ModalSystem.show({
        title: 'Carica Nuovo Documento',
        content: modalContent,
        buttons: [
            { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },
            {
                text: 'Carica',
                class: 'sol-btn sol-btn-primary',
                onclick: async function() {
                    const documentType = document.getElementById('documentTypeInput').value.trim();
                    const fileInput = document.getElementById('fileInput');
                    const file = fileInput.files[0];

                    if (!documentType || !file) {
                        notificationSystem.warning('Per favore, compila tutti i campi.');
                        return false; // Non chiudere la modale
                    }

                    const shipmentId = getShipmentIdFromURL();
                    try {
                        notificationSystem.info('Caricamento del documento in corso...');
                        await dataManager.uploadShipmentDocument(shipmentId, file, documentType);
                        notificationSystem.success('Documento caricato con successo!');
                        loadShipmentDetails(shipmentId); // Ricarica i dettagli per aggiornare la tabella
                        return true; // Chiudi la modale
                    } catch (error) {
                        notificationSystem.error(`Errore durante il caricamento: ${error.message}`);
                        return false; // Non chiudere la modale
                    }
                }
            }
        ]
    });
}
function deleteDocument(documentId) {
    notificationSystem.info(`Funzione "Elimina Documento" (ID: ${documentId}) non ancora implementata.`);
}

async function addProduct() {
    try {
        const allProducts = await dataManager.getAllProducts();
        const modalContent = `
            <div class="sol-form"><div class="sol-form-group"><input type="text" id="productSearchInput" class="sol-form-input" placeholder="Cerca per nome, SKU..."></div></div>
            <div id="productListContainer" class="product-list-container"></div>
            <style>.product-list-container{max-height:400px;overflow-y:auto;border:1px solid #e0e6ed;border-radius:5px;margin-top:1rem;background:#fff;}.product-table{width:100%;border-collapse:collapse;}.product-table th,.product-table td{padding:8px 12px;text-align:left;border-bottom:1px solid #e0e6ed;font-size:14px;}.product-table th{background-color:#f8f9fa;font-weight:600;}.product-table tr:hover{background-color:#f1f1f1;}.product-table .quantity-input{width:70px;padding:4px 8px;}.product-table .volume-input{width:80px;padding:4px 8px;}.product-table .product-row-checkbox{width:16px;height:16px;}</style>`;

        ModalSystem.show({
            title: 'Aggiungi Prodotti alla Spedizione',
            size: 'lg',
            content: modalContent,
            buttons: [
                { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },
                {
                    text: 'Aggiungi Selezionati',
                    class: 'sol-btn sol-btn-primary',
                    onclick: async function() {
                        const selectedItems = [];
                        document.querySelectorAll('.product-row-checkbox:checked').forEach(checkbox => {
                            const row = checkbox.closest('tr');
                            const productId = checkbox.dataset.productId;
                            const quantityInput = row.querySelector('.quantity-input');
                            const volumeInput = row.querySelector('.volume-input'); // Cattura l'input del volume
                            const quantity = parseInt(quantityInput.value, 10);
                            const volume = parseFloat(volumeInput.value) || 0; // Leggi il valore del volume

                            if (quantity > 0) {
                                const product = allProducts.find(p => p.id === productId);
                                if (product) selectedItems.push({ product, quantity, volume }); // Aggiungi il volume agli item selezionati
                            }
                        });

                        if (selectedItems.length === 0) {
                            notificationSystem.warning('Nessun prodotto selezionato o quantità non valida.');
                            return false; // Non chiudere la modale
                        }

                        const shipmentId = getShipmentIdFromURL();
                        try {
                            notificationSystem.info(`Aggiunta di ${selectedItems.length} prodotti...`);
                            const addPromises = selectedItems.map(({ product, quantity, volume }) => { // Destruttura il volume
                                const q = parseInt(quantity, 10);
                                const uv = parseFloat(product.unit_value || 0);
                                const w = parseFloat(product.weight_kg || 0);
                                const vol = parseFloat(volume || 0); // Usa il volume dal form

                                const productData = {
                                    product_id: String(product.id),
                                    name: String(product.name || 'Senza nome'),
                                    sku: String(product.sku || 'N/D'),
                                    quantity: isNaN(q) ? 1 : q,
                                    unit_value: isNaN(uv) ? 0 : uv,
                                    weight_kg: isNaN(w) ? 0 : w,
                                    volume_cbm: isNaN(vol) ? 0 : vol, // Assegna il volume
                                };
                                return dataManager.addShipmentItem(shipmentId, productData);
                            });
                            await Promise.all(addPromises);
                            notificationSystem.success(`${selectedItems.length} prodotti aggiunti!`);
                            loadShipmentDetails(shipmentId);
                            return true; // Chiudi la modale in caso di successo
                        } catch (error) {
                            console.error('Errore dettagliato aggiunta prodotto:', JSON.stringify(error, null, 2));
                            notificationSystem.error(`Errore: ${error.message || 'Dettagli nella console.'}`);
                            return false; // Non chiudere la modale in caso di errore
                        }
                    }
                }
            ]
        });

        setTimeout(() => {
            const searchInput = document.getElementById('productSearchInput');
            const listContainer = document.getElementById('productListContainer');
            if (!searchInput || !listContainer) return;

            const renderTable = (productsToRender) => {
                if (productsToRender.length === 0) {
                    listContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#6c757d;">Nessun prodotto trovato.</div>';
                    return;
                }
                // Aggiungi la colonna Volume (m³)
                const tableHTML = `<table class="product-table"><thead><tr><th></th><th>Prodotto</th><th>SKU</th><th>Volume (m³)</th><th>Quantità</th></tr></thead><tbody id="product-table-body">${productsToRender.map(p=>`<tr><td><input type="checkbox" class="product-row-checkbox" data-product-id="${p.id}"></td><td>${p.name||'Senza nome'}</td><td>${p.sku||'N/D'}</td><td><input type="number" class="sol-form-input volume-input" value="0" min="0" step="0.01" disabled></td><td><input type="number" class="sol-form-input quantity-input" value="1" min="1" disabled></td></tr>`).join('')}</tbody></table>`;
                listContainer.innerHTML = tableHTML;
            };

            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filtered = allProducts.filter(p => (p.name||'').toLowerCase().includes(searchTerm) || (p.sku||'').toLowerCase().includes(searchTerm));
                renderTable(filtered);
            });

            listContainer.addEventListener('change', (event) => {
                if (event.target.matches('.product-row-checkbox')) {
                    const checkbox = event.target;
                    const row = checkbox.closest('tr');
                    const quantityInput = row.querySelector('.quantity-input');
                    const volumeInput = row.querySelector('.volume-input'); // Seleziona l'input del volume
                    
                    // Abilita/disabilita entrambi i campi
                    quantityInput.disabled = !checkbox.checked;
                    volumeInput.disabled = !checkbox.checked;

                    if (checkbox.checked) {
                        quantityInput.focus();
                        quantityInput.select();
                    }
                }
            });
            renderTable(allProducts);
        }, 150);
    } catch (error) {
        notificationSystem.error('Impossibile caricare la lista dei prodotti.');
        console.error('Errore caricamento prodotti per la ricerca:', error);
    }
}
