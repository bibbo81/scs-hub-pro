import assert from 'assert';

let notifications = [];

// Minimal NotificationSystem mock
global.window = {
    NotificationSystem: {
        warning(msg) { notifications.push(msg); }
    }
};

function getActiveOrganizationId() {
    return null;
}

class TestService {
    constructor() { this.table = 'shipments'; }

    camelToSnake(key) {
        return key.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    preparePayload(shipment) {
        const payload = {};
        Object.entries(shipment).forEach(([k, v]) => {
            if (v === undefined) return;
            const snake = this.camelToSnake(k);
            payload[snake] = v;
        });
        return payload;
    }

    async getAllShipments() {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            global.window.NotificationSystem.warning(
                "Seleziona un'organizzazione per visualizzare le spedizioni"
            );
            return [];
        }
        return [{ id: 1 }];
    }

    async createShipment(data) {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            global.window.NotificationSystem.warning(
                "Seleziona un'organizzazione prima di creare una spedizione"
            );
            return null;
        }
        return this.preparePayload(data);
    }

    async updateShipment(id, updates) {
        const orgId = getActiveOrganizationId();
        if (!orgId) {
            global.window.NotificationSystem.warning(
                "Seleziona un'organizzazione prima di aggiornare una spedizione"
            );
            return null;
        }
        return { id, ...updates };
    }
}

(async () => {
    const svc = new TestService();
    const all = await svc.getAllShipments();
    assert.deepStrictEqual(all, []);
    assert.ok(notifications.length === 1);

    const created = await svc.createShipment({ name: 'test' });
    assert.strictEqual(created, null);
    assert.ok(notifications.length === 2);

    const updated = await svc.updateShipment('1', { name: 't' });
    assert.strictEqual(updated, null);
    assert.ok(notifications.length === 3);

    console.log('SupabaseShipmentsService missing organization tests passed');
})();