import dataManager from '/core/services/data-manager.js';
import notificationSystem from '/core/notification-system.js';
import headerComponent from '/core/header-component.js';
import ModalSystem from '/core/modal-system.js';
document.addEventListener('DOMContentLoaded', async () => {
    await headerComponent.init();
    await dataManager.init();

    loadCarriers();
    setupEventListeners();
});

async function loadCarriers() {
    const tbody = document.getElementById('carriersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Caricamento...</td></tr>';

    try {
        const carriers = await dataManager.getCarriers();
        tbody.innerHTML = '';

        if (!carriers || carriers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessuno spedizioniere trovato. Inizia aggiungendone uno.</td></tr>';
            return;
        }

        carriers.forEach(carrier => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${carrier.name || '-'}</td>
                <td>${carrier.contact_person || '-'}</td>
                <td>${carrier.email || '-'}</td>
                <td>${carrier.phone || '-'}</td>
                <td class="table-actions">
                    <button class="sol-btn sol-btn-secondary sol-btn-sm edit-btn" data-id="${carrier.id}"><i class="fas fa-edit"></i></button>
                    <button class="sol-btn sol-btn-danger sol-btn-sm delete-btn" data-id="${carrier.id}"><i class="fas fa-trash"></i></button>
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
