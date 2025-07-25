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
        const shipmentDetails = await dataManager.getShipmentDetails(shipmentId);
        if (!shipmentDetails) {
            notificationSystem.error("Spedizione non trovata.");
            return;
        }
        renderShipmentInfo(shipmentDetails);
        renderProductsTable(shipmentDetails.products);
        await renderDocumentsTable(shipmentDetails.documents);
        renderAdditionalCosts(shipmentDetails.additionalCosts);
    } catch (error) {
        console.error("Errore caricamento dettagli spedizione:", error);
        notificationSystem.error("Impossibile caricare i dettagli della spedizione.");
    }
}

function renderShipmentInfo(shipment) {
    document.getElementById('shipmentNumberTitle').textContent = `Spedizione ${shipment.shipment_number || ''}`;
    document.getElementById('shipmentNumber').textContent = shipment.shipment_number || '-';
    document.getElementById('shipmentStatus').innerHTML = formatStatus(shipment.status);
    document.getElementById('shipmentDate').textContent = formatDate(shipment.created_at);
    document.getElementById('shipmentOrigin').textContent = shipment.tracking?.origin_country || shipment.origin || '-';
    document.getElementById('shipmentDestination').textContent = shipment.tracking?.destination_country || shipment.destination || '-';
    document.getElementById('shipmentCarrier').textContent = shipment.carrier?.name || 'N/A';
    
    const freightCostInput = document.getElementById('freightCost');
    const otherCostsInput = document.getElementById('otherCosts');
    freightCostInput.value = shipment.freight_cost || 0;
    otherCostsInput.value = shipment.other_costs || 0;
    updateTotalCost();
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nessun prodotto associato.</td></tr>';
        updateTotals([]); // Passa un array vuoto per azzerare i totali
        return;
    }
    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.classList.add('product-row');
        tr.dataset.itemId = product.id; // Usa l'ID dell'item per un accesso più facile
        tr.innerHTML = `
            <td>${product.product?.name || product.name || '-'}<small class="text-muted d-block">${product.product?.sku || ''}</small></td>
            <td>${product.quantity || 0}</td>
            <td>${formatWeight(product.total_weight_kg)}</td>
            <td>${formatVolume(product.total_volume_cbm)}</td>
            <td>${formatCurrency(product.allocated_cost)}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm edit-product-btn" data-item-id="${product.id}" title="Modifica Prodotto"><i class="fas fa-edit"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-product-btn" data-item-id="${product.id}" title="Elimina Prodotto"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateTotals(products);
}

function updateTotals(products) {
    let totalWeight = 0, totalVolume = 0, totalAllocatedCost = 0;
    products.forEach(product => {
        totalWeight += product.total_weight_kg || 0;
        totalVolume += product.total_volume_cbm || 0;
        totalAllocatedCost += product.allocated_cost || 0;
    });
    document.getElementById('totalWeight').textContent = formatWeight(totalWeight);
    document.getElementById('totalVolume').textContent = formatVolume(totalVolume);
    document.getElementById('totalAllocatedCost').textContent = formatCurrency(totalAllocatedCost);
}

async function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '';
    if (!documents || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessun documento caricato.</td></tr>';
        return;
    }
    for (const doc of documents) {
        const signedUrl = await dataManager.getPublicFileUrl(doc.file_path);
        const tr = document.createElement('tr');
        tr.dataset.documentId = doc.id;
        tr.innerHTML = `
            <td><a href="${signedUrl || '#'}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt mr-2 text-primary"></i>${doc.document_name}</a></td>
            <td>${doc.document_type || '-'}</td>
            <td>${formatDate(doc.created_at)}</td>
            <td>${doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}</td>
            <td>
                <button class="sol-btn sol-btn-secondary sol-btn-sm download-document-btn" title="Scarica"><i class="fas fa-download"></i></button>
                <button class="sol-btn sol-btn-primary sol-btn-sm replace-document-btn" title="Sostituisci"><i class="fas fa-exchange-alt"></i></button>
                <button class="sol-btn sol-btn-danger sol-btn-sm delete-document-btn" title="Elimina"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

function updateTotalCost() {
    const freightCost = parseFloat(document.getElementById('freightCost').value) || 0;
    const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;
    const totalCost = freightCost + otherCosts;
    document.getElementById('shipmentTotalCost').textContent = formatCurrency(totalCost);
}

function setupEventListeners() {
    document.getElementById('addProductBtn')?.addEventListener('click', addProduct);
    document.getElementById('uploadDocumentBtn')?.addEventListener('click', uploadDocument);
    document.getElementById('changeCarrierBtn')?.addEventListener('click', changeShipmentCarrier);
    document.getElementById('saveCostsBtn')?.addEventListener('click', saveCosts);
    document.getElementById('addAdditionalCostBtn')?.addEventListener('click', addAdditionalCost);

    document.getElementById('freightCost').addEventListener('input', updateTotalCost);
    document.getElementById('otherCosts').addEventListener('input', updateTotalCost);

    document.getElementById('productsTableBody')?.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.edit-product-btn');
        if (editBtn) {
            editProduct(editBtn.dataset.itemId);
        }
        const deleteBtn = event.target.closest('.delete-product-btn');
        if (deleteBtn) {
            deleteProduct(deleteBtn.dataset.itemId);
        }
    });

    document.getElementById('documentsTableBody')?.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const documentId = button.closest('tr').dataset.documentId;
        if (button.classList.contains('delete-document-btn')) deleteDocument(documentId);
        else if (button.classList.contains('replace-document-btn')) replaceDocument(documentId);
        else if (button.classList.contains('download-document-btn')) downloadDocument(documentId);
    });

    document.getElementById('additionalCostsList')?.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-additional-cost-btn');
        if (deleteBtn) {
            deleteAdditionalCost(deleteBtn.dataset.costId);
        }
    });
}

async function saveCosts() {
    const shipmentId = getShipmentIdFromURL();
    const freightCost = parseFloat(document.getElementById('freightCost').value) || 0;
    const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;
    try {
        notificationSystem.info('Salvataggio dei costi in corso...');
        await dataManager.updateShipmentCosts(shipmentId, freightCost, otherCosts);
        await dataManager.allocateCosts(shipmentId);
        notificationSystem.success('Costi salvati con successo!');
        loadShipmentDetails(shipmentId);
    } catch (error) {
        notificationSystem.error(`Errore durante il salvataggio: ${error.message}`);
    }
}

async function changeShipmentCarrier() {
    try {
        const carriers = await dataManager.getCarriers();
        if (!carriers || carriers.length === 0) {
            notificationSystem.info('Nessun corriere disponibile.');
            return;
        }
        const modalContent = `
            <div class="sol-form">
                <div class="sol-form-group">
                    <label for="carrierSelect" class="sol-form-label">Seleziona un corriere</label>
                    <select id="carrierSelect" class="sol-form-input">
                        ${carriers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        ModalSystem.show({
            title: 'Cambia Corriere',
            content: modalContent,
            buttons: [
                { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },
                {
                    text: 'Salva',
                    class: 'sol-btn sol-btn-primary',
                    onclick: async () => {
                        const selectedCarrierId = document.getElementById('carrierSelect').value;
                        const shipmentId = getShipmentIdFromURL();
                        try {
                            notificationSystem.info('Aggiornamento corriere...');
                            await dataManager.updateShipmentCarrier(shipmentId, selectedCarrierId);
                            notificationSystem.success('Corriere aggiornato!');
                            loadShipmentDetails(shipmentId);
                            return true;
                        } catch (error) {
                            notificationSystem.error(`Errore: ${error.message}`);
                            return false;
                        }
                    }
                }
            ]
        });
    } catch (error) {
        notificationSystem.error('Impossibile caricare la lista dei corrieri.');
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
                    const file = document.getElementById('fileInput').files[0];
                    if (!documentType || !file) {
                        notificationSystem.warning('Per favore, compila tutti i campi.');
                        return false;
                    }
                    const shipmentId = getShipmentIdFromURL();
                    try {
                        notificationSystem.info('Caricamento del documento in corso...');
                        await dataManager.uploadShipmentDocument(shipmentId, file, documentType);
                        notificationSystem.success('Documento caricato con successo!');
                        loadShipmentDetails(shipmentId);
                        return true;
                    } catch (error) {
                        notificationSystem.error(`Errore durante il caricamento: ${error.message}`);
                        return false;
                    }
                }
            }
        ]
    });
}

async function deleteDocument(documentId) {
    const confirmed = await ModalSystem.confirm({ title: 'Conferma Eliminazione', content: 'Sei sicuro di voler eliminare questo documento?', confirmText: 'Elimina', cancelText: 'Annulla' });
    if (confirmed) {
        try {
            notificationSystem.info('Eliminazione in corso...');
            await dataManager.deleteShipmentDocument(documentId);
            notificationSystem.success('Documento eliminato.');
            loadShipmentDetails(getShipmentIdFromURL());
        } catch (error) {
            notificationSystem.error(`Errore: ${error.message}`);
        }
    }
}

function replaceDocument(documentId) {
    const modalContent = `
        <div class="sol-form">
            <p>Seleziona il nuovo file.</p>
            <div class="sol-form-group">
                <label for="replaceFileInput" class="sol-form-label">Nuovo File</label>
                <input type="file" id="replaceFileInput" class="sol-form-input">
            </div>
        </div>
    `;
    ModalSystem.show({
        title: 'Sostituisci Documento',
        content: modalContent,
        buttons: [
            { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },
            {
                text: 'Sostituisci',
                class: 'sol-btn sol-btn-primary',
                onclick: async function() {
                    const newFile = document.getElementById('replaceFileInput').files[0];
                    if (!newFile) {
                        notificationSystem.warning('Seleziona un file.');
                        return false;
                    }
                    try {
                        notificationSystem.info('Sostituzione in corso...');
                        await dataManager.replaceShipmentDocument(documentId, newFile);
                        notificationSystem.success('Documento sostituito.');
                        loadShipmentDetails(getShipmentIdFromURL());
                        return true;
                    } catch (error) {
                        notificationSystem.error(`Errore: ${error.message}`);
                        return false;
                    }
                }
            }
        ]
    });
}

async function downloadDocument(documentId) {
    try {
        notificationSystem.info('Preparazione del download...');
        const doc = (await dataManager.getShipmentDetails(getShipmentIdFromURL())).documents.find(d => d.id === documentId);
        if (!doc) throw new Error('Documento non trovato.');
        const signedUrl = await dataManager.getPublicFileUrl(doc.file_path);
        if (!signedUrl) throw new Error('Impossibile generare il link.');
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`Errore di rete: ${response.statusText}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.document_name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        notificationSystem.error(`Errore durante il download: ${error.message}`);
    }
}

async function editProduct(shipmentItemId) {
    const shipmentId = getShipmentIdFromURL();
    try {
        const shipmentDetails = await dataManager.getShipmentDetails(shipmentId);
        const itemToEdit = shipmentDetails.products.find(p => p.id === shipmentItemId);

        if (!itemToEdit) {
            notificationSystem.error('Prodotto non trovato nella spedizione.');
            return;
        }

        const modalContent = `
            <div class="sol-form">
                <div class="sol-form-group">
                    <label for="editQuantity" class="sol-form-label">Quantità</label>
                    <input type="number" id="editQuantity" class="sol-form-input" value="${itemToEdit.quantity || 1}" min="1">
                </div>
                <div class="sol-form-group">
                    <label for="editWeight" class="sol-form-label">Peso Totale (kg)</label>
                    <input type="number" id="editWeight" class="sol-form-input" value="${(itemToEdit.total_weight_kg || 0)}" min="0" step="0.01">
                </div>
                <div class="sol-form-group">
                    <label for="editVolume" class="sol-form-label">Volume Totale (m³)</label>
                    <input type="number" id="editVolume" class="sol-form-input" value="${(itemToEdit.total_volume_cbm || 0)}" min="0" step="0.01">
                </div>
            </div>
        `;

        ModalSystem.show({
            title: `Modifica Prodotto: ${itemToEdit.product?.name || itemToEdit.name}`,
            content: modalContent,
            buttons: [
                { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },
                {
                    text: 'Salva Modifiche',
                    class: 'sol-btn sol-btn-primary',
                    onclick: async () => {
                        const quantity = parseInt(document.getElementById('editQuantity').value, 10);
                        const totalWeight = parseFloat(document.getElementById('editWeight').value) || 0;
                        const totalVolume = parseFloat(document.getElementById('editVolume').value) || 0;

                        if (isNaN(quantity) || quantity <= 0) {
                            notificationSystem.error('La quantità deve essere un numero valido maggiore di zero.');
                            return false;
                        }

                        const updatedData = {
                            quantity: quantity,
                            weight_kg: quantity > 0 ? totalWeight / quantity : 0,
                            volume_cbm: quantity > 0 ? totalVolume / quantity : 0,
                        };

                        try {
                            notificationSystem.info('Salvataggio modifiche...');
                            await dataManager.updateShipmentItem(shipmentItemId, updatedData);
                            await dataManager.allocateCosts(shipmentId); // Ricalcola i costi
                            notificationSystem.success('Prodotto aggiornato con successo!');
                            loadShipmentDetails(shipmentId);
                            return true; // Chiude la modale
                        } catch (error) {
                            notificationSystem.error(`Errore durante l'aggiornamento: ${error.message}`);
                            return false; // Non chiude la modale
                        }
                    }
                }
            ]
        });

    } catch (error) {
        notificationSystem.error('Impossibile caricare i dettagli del prodotto da modificare.');
    }
}

async function deleteProduct(productId) {
    const confirmed = await ModalSystem.confirm({ title: 'Conferma Eliminazione', content: 'Sei sicuro di voler rimuovere questo prodotto?', confirmText: 'Elimina', cancelText: 'Annulla' });
    if (confirmed) {
        try {
            await dataManager.deleteShipmentItem(productId); // Assicurati che dataManager abbia deleteShipmentItem
            notificationSystem.success('Prodotto rimosso.');
            loadShipmentDetails(getShipmentIdFromURL());
        } catch (error) {
            notificationSystem.error('Errore durante la rimozione del prodotto.');
        }
    }
}

async function addProduct() {
    try {
        const allProducts = await dataManager.getAllProducts();
        let selectedProducts = new Set();

        const renderProductList = (productsToRender) => {
            const productListContainer = document.getElementById('productListContainer');
            if (!productListContainer) return;
            productListContainer.innerHTML = productsToRender.map(p => `
                <div class="product-list-row" data-product-id="${p.id}">
                    <div class="col-check">
                        <input type="checkbox" class="sol-form-check-input" id="product-check-${p.id}" ${selectedProducts.has(p.id) ? 'checked' : ''}>
                    </div>
                    <div class="col-sku text-muted">${p.sku}</div>
                    <div class="col-name">${p.name}</div>
                    <div class="col-weight">
                        <input type="number" class="sol-form-input sol-form-input-sm product-weight-input" placeholder="kg Tot." min="0" step="0.01" value="">
                    </div>
                    <div class="col-volume">
                        <input type="number" class="sol-form-input sol-form-input-sm product-volume-input" placeholder="m³ Tot." min="0" step="0.01" value="">
                    </div>
                    <div class="col-qty">
                        <input type="number" class="sol-form-input sol-form-input-sm product-quantity-input" placeholder="Q.tà" min="1" value="1">
                    </div>
                </div>
            `).join('');
        };

        const modalContent = `
            <div class="product-selection-modal">
                <div class="sol-form">
                    <div class="sol-form-group">
                        <input type="text" id="productSearchInput" class="sol-form-input" placeholder="Cerca per nome, SKU...">
                    </div>
                </div>
                <div class="product-list-row product-list-header">
                    <div class="col-check"></div>
                    <div class="col-sku">Cod. Prodotto</div>
                    <div class="col-name">Descrizione</div>
                    <div class="col-weight">Peso Totale (kg)</div>
                    <div class="col-volume">Volume Totale (m³)</div>
                    <div class="col-qty">Quantità</div>
                </div>
                <div id="productListContainer" style="max-height:400px;overflow-y:auto;border:1px solid #e0e6ed;border-top:none;border-radius:0 0 5px 5px;background:#fff;"></div>
            </div>
        `;

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
                        const shipmentId = getShipmentIdFromURL();
                        const itemsToAdd = [];
                        
                        // Itera solo sui prodotti visibili e selezionati per ottenere i valori corretti dagli input.
                        document.querySelectorAll('#productListContainer .product-list-row').forEach(row => {
                            const checkbox = row.querySelector('input[type="checkbox"]');
                            if (checkbox && checkbox.checked) {
                                const productId = row.dataset.productId;
                                const product = allProducts.find(p => p.id === productId);
                                if (product) {
                                    const quantity = parseInt(row.querySelector('.product-quantity-input').value, 10) || 1;
                                    const totalVolume = parseFloat(row.querySelector('.product-volume-input').value) || 0;
                                    const totalWeight = parseFloat(row.querySelector('.product-weight-input').value) || 0;
                                    
                                    // Calcola i valori unitari da quelli totali
                                    const unitVolume = quantity > 0 ? totalVolume / quantity : 0;
                                    const unitWeight = quantity > 0 ? totalWeight / quantity : 0;

                                    itemsToAdd.push({ ...product, quantity, volume_cbm: unitVolume, weight_kg: unitWeight, product_id: productId });
                                }
                            }
                        });

                        try {
                            notificationSystem.info('Aggiunta prodotti in corso...');
                            for (const item of itemsToAdd) {
                                await dataManager.addShipmentItem(shipmentId, item);
                            }
                            notificationSystem.success('Prodotti aggiunti con successo!');
                            loadShipmentDetails(shipmentId);
                            return true;
                        } catch (error) {
                            notificationSystem.error(`Errore: ${error.message}`);
                            return false;
                        }
                    }
                }
            ]
        });

        renderProductList(allProducts);

        document.getElementById('productSearchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredProducts = allProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) || 
                p.sku.toLowerCase().includes(searchTerm)
            );
            renderProductList(filteredProducts);
        });

        document.getElementById('productListContainer').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const row = e.target.closest('.product-list-row');
                if (row) {
                    const productId = row.dataset.productId;
                    if (e.target.checked) {
                        selectedProducts.add(productId);
                    } else {
                        selectedProducts.delete(productId);
                    }
                }
            }
        });

    } catch (error) {
        notificationSystem.error('Impossibile caricare la lista dei prodotti.');
    }
}

function formatCurrency(value) { return (typeof value === 'number') ? value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '€ 0,00'; }
function formatWeight(value) { return (typeof value === 'number') ? `${value.toFixed(3)} kg` : '0 kg'; }
function formatVolume(value) { return (typeof value === 'number') ? `${value.toFixed(3)} m³` : '0 m³'; }
function formatDate(dateString) { return dateString ? new Date(dateString).toLocaleDateString('it-IT') : '-'; }
function formatStatus(rawStatus) {    const statusKey = (rawStatus || 'registered').toLowerCase().replace(/ /g, '_');    const label = rawStatus || 'Registrato';    return `<span class="status-badge status-${statusKey}">${label}</span>`;}function renderAdditionalCosts(costs) {    const container = document.getElementById('additionalCostsList');    container.innerHTML = '';    if (!costs || costs.length === 0) {        container.innerHTML = '<p>Nessun costo aggiuntivo.</p>';        return;    }    const table = document.createElement('table');    table.className = 'data-table';    table.innerHTML = `        <thead>            <tr>                <th>Tipo</th>                <th>Importo</th>                <th>Note</th>                <th>Azioni</th>            </tr>        </thead>        <tbody>            ${costs.map(cost => `                <tr>                    <td>${cost.cost_type}</td>                    <td>${formatCurrency(cost.amount)}</td>                    <td>${cost.notes || '-'}</td>                    <td>                        <button class="sol-btn sol-btn-danger sol-btn-sm delete-additional-cost-btn" data-cost-id="${cost.id}" title="Elimina"><i class="fas fa-trash"></i></button>                    </td>                </tr>            `).join('')}        </tbody>    `;    container.appendChild(table);}async function addAdditionalCost() {    const modalContent = `        <div class="sol-form">            <div class="sol-form-group">                <label for="costTypeSelect" class="sol-form-label">Tipo di Costo</label>                <select id="costTypeSelect" class="sol-form-input">                    <option value="detention">Detention</option>                    <option value="demurrage">Demurrage</option>                </select>            </div>            <div class="sol-form-group">                <label for="amountInput" class="sol-form-label">Importo</label>                <input type="number" id="amountInput" class="sol-form-input" placeholder="0.00">            </div>            <div class="sol-form-group">                <label for="notesInput" class="sol-form-label">Note</label>                <textarea id="notesInput" class="sol-form-input" rows="3"></textarea>            </div>        </div>    `;    ModalSystem.show({        title: 'Aggiungi Costo Aggiuntivo',        content: modalContent,        buttons: [            { text: 'Annulla', class: 'sol-btn sol-btn-secondary', onclick: () => ModalSystem.close() },            {                text: 'Aggiungi',                class: 'sol-btn sol-btn-primary',                onclick: async () => {                    const shipmentId = getShipmentIdFromURL();                    const costData = {                        cost_type: document.getElementById('costTypeSelect').value,                        amount: parseFloat(document.getElementById('amountInput').value) || 0,                        notes: document.getElementById('notesInput').value.trim()                    };                    if (costData.amount <= 0) {                        notificationSystem.warning('L\'importo deve essere maggiore di zero.');                        return false;                    }                    try {                        notificationSystem.info('Aggiunta del costo in corso...');                        await dataManager.addAdditionalCost(shipmentId, costData);                        notificationSystem.success('Costo aggiuntivo aggiunto con successo!');                        loadShipmentDetails(shipmentId);                        return true;                    } catch (error) {                        notificationSystem.error(`Errore durante l\'aggiunta del costo: ${error.message}`);                        return false;                    }                }            }        ]    });}
