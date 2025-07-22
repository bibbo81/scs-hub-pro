import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import headerComponent from '/core/header-component.js';
import ModalSystem from '/core/modal-system.js';
document.addEventListener('DOMContentLoaded', async () => {
    await headerComponent.init();
    await dataManager.init();
 
    loadCarriers();
    setupEventListeners();
    enableTableSorting(); // Abilita l'ordinamento della tabella
});
 
async function loadCarriers() {
    const tbody = document.getElementById('carriersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Caricamento...</td></tr>';
 
    try {
        // Usa la nuova funzione per ottenere i dati con le statistiche
        const carriersWithStats = await dataManager.getCarriersWithStats();
        tbody.innerHTML = '';
 
        if (!carriersWithStats || carriersWithStats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessuno spedizioniere trovato. Inizia aggiungendone uno.</td></tr>';
            return;
        }
 
        carriersWithStats.forEach(carrier => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <a href="/carrier-details.html?id=${carrier.id}" class="font-weight-bold text-primary">
                        ${carrier.name || '-'}
                    </a>
                </td>
                <td>${carrier.shipment_count || 0}</td>
                <td>${formatCurrency(carrier.total_spent)}</td>
                <td>${formatCurrency(carrier.average_cost)}</td>
                <td class="table-actions">
                    <a href="/carrier-details.html?id=${carrier.id}" class="sol-btn sol-btn-primary sol-btn-sm" title="Vedi Dettagli">
                        <i class="fas fa-chart-line"></i>
                    </a>
                    <button class="sol-btn sol-btn-secondary sol-btn-sm edit-btn" data-id="${carrier.id}" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="sol-btn sol-btn-danger sol-btn-sm delete-btn" data-id="${carrier.id}" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
 
    } catch (error) {
        console.error("Errore caricamento spedizionieri:", error);
        notificationSystem.error("Impossibile caricare gli spedizionieri.");
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Errore nel caricamento dei dati.</td></tr>';
    }
}
 
/**
 * Formatta un numero come valuta EUR.
 * @param {number} value - Il valore numerico.
 * @returns {string} La stringa formattata.
 */
function formatCurrency(value) {
    if (typeof value !== 'number') return '€ 0,00';
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}
 
function setupEventListeners() {
    document.getElementById('addCarrierBtn').addEventListener('click', () => {
        showCarrierForm();
    });

    const tableBody = document.getElementById('carriersTableBody');
    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const carrierId = editBtn.dataset.id;
            const carrier = await dataManager.getCarrierById(carrierId);
            if (carrier) {
                showCarrierForm(carrier);
            }
        }
 
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const carrierId = deleteBtn.dataset.id;
            handleDeleteCarrier(carrierId);
        }
    });
}
 
/**
 * Abilita l'ordinamento sulle colonne della tabella.
 */
function enableTableSorting() {
    document.querySelectorAll(".data-table .sortable").forEach(th => {
        th.style.cursor = "pointer";
        th.addEventListener("click", () => {
            const table = th.closest("table");
            const tbody = table.querySelector("tbody");
            const index = Array.from(th.parentNode.children).indexOf(th);
            const isAsc = th.classList.contains("asc");
            const newIsAsc = !isAsc;
 
            // Rimuovi classi di ordinamento da tutti gli header
            table.querySelectorAll("th").forEach(h => h.classList.remove("asc", "desc"));
            // Aggiungi la nuova classe all'header cliccato
            th.classList.toggle("asc", newIsAsc);
            th.classList.toggle("desc", !newIsAsc);
 
            // Ordina le righe
            const rows = Array.from(tbody.querySelectorAll("tr"));
            rows.sort((a, b) => {
                const aText = a.children[index]?.textContent.trim() || '';
                const bText = b.children[index]?.textContent.trim() || '';
                
                // Gestione speciale per colonne numeriche/valuta
                if (index > 0 && index < 4) { // Colonne # Spedizioni, Spesa, Costo Medio
                    const aValue = parseFloat(aText.replace(/[^0-9,-]+/g, "").replace(',', '.'));
                    const bValue = parseFloat(bText.replace(/[^0-9,-]+/g, "").replace(',', '.'));
                    if (!isNaN(aValue) && !isNaN(bValue)) {
                        return newIsAsc ? aValue - bValue : bValue - aValue;
                    }
                }
                
                // Ordinamento standard per testo
                const comparison = aText.localeCompare(bText, 'it-IT', { numeric: true, sensitivity: 'base' });
                return newIsAsc ? comparison : -comparison;
            });
 
            // Ri-appendi le righe ordinate
            rows.forEach(row => tbody.appendChild(row));
        });
    });
}
 
function showCarrierForm(carrier = null) {
    const isEditing = carrier !== null;
    const title = isEditing ? 'Modifica Spedizioniere' : 'Aggiungi Spedizioniere';

    ModalSystem.show({
        title: title,
        size: 'lg',
        content: `
            <form id="carrierForm" class="sol-form">
                <div class="sol-form-grid">
                    <div class="sol-form-group">
                        <label for="name" class="sol-form-label">Nome Spedizioniere*</label>
                        <input type="text" id="name" class="sol-form-input" value="${carrier?.name || ''}" required>
                    </div>
                    <div class="sol-form-group">
                        <label for="contact_person" class="sol-form-label">Contatto</label>
                        <input type="text" id="contact_person" class="sol-form-input" value="${carrier?.contact_person || ''}">
                    </div>
                    <div class="sol-form-group">
                        <label for="email" class="sol-form-label">Email</label>
                        <input type="email" id="email" class="sol-form-input" value="${carrier?.email || ''}">
                    </div>
                    <div class="sol-form-group">
                        <label for="phone" class="sol-form-label">Telefono</label>
                        <input type="tel" id="phone" class="sol-form-input" value="${carrier?.phone || ''}">
                    </div>
                </div>
                <div class="sol-form-group">
                    <label for="address" class="sol-form-label">Indirizzo</label>
                    <input type="text" id="address" class="sol-form-input" value="${carrier?.address || ''}">
                </div>
                <div class="sol-form-group">
                    <label for="notes" class="sol-form-label">Note</label>
                    <textarea id="notes" class="sol-form-textarea">${carrier?.notes || ''}</textarea>
                </div>
            </form>
        `,
        actions: [
            { label: 'Annulla', variant: 'secondary', action: () => ModalSystem.close() },
            {
                label: isEditing ? 'Salva Modifiche' : 'Aggiungi',
                variant: 'primary',
                action: async () => {
                    const formData = {
                        name: document.getElementById('name').value,
                        contact_person: document.getElementById('contact_person').value,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value,
                        address: document.getElementById('address').value,
                        notes: document.getElementById('notes').value,
                    };

                    try {
                        if (isEditing) {
                            await dataManager.updateCarrier(carrier.id, formData);
                            notificationSystem.success('Spedizioniere aggiornato!');
                        } else {
                            await dataManager.addCarrier(formData);
                            notificationSystem.success('Spedizioniere aggiunto!');
                        }
                        ModalSystem.close();
                        loadCarriers();
                    } catch (error) {
                        notificationSystem.error(`Errore: ${error.message}`);
                    }
                }
            }
        ]
    });
}

async function handleDeleteCarrier(carrierId) {
    const confirmed = await ModalSystem.confirm({
        title: 'Conferma Eliminazione',
        message: 'Sei sicuro di voler eliminare questo spedizioniere? L\'azione è irreversibile.',
        confirmLabel: 'Elimina',
        cancelLabel: 'Annulla'
    });

    if (confirmed) {
        try {
            await dataManager.deleteCarrier(carrierId);
            notificationSystem.success('Spedizioniere eliminato con successo.');
            loadCarriers();
        } catch (error) {
            notificationSystem.error(`Errore durante l'eliminazione: ${error.message}`);
        }
    }
}
