const SUPABASE_URL = 'https://gnlrmnsdmpjzitsysowq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubHJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQ2MzEzNCwiZXhwIjoyMDY1MDM5MTM0fQ.tUsZQliAfbsbTLwIIiY35sNwsqm-U8SQVTcjjo93kL8';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase client:', window.supabaseClient);
async function fetchShipments() {
  const { data, error } = await window.supabaseClient
    .from('trackings')
    .select(`
      id, tracking_number, container_number, cost,
      shipment_products:shipment_products (
        id, product_id, quantity, cost_share,
        product:products (id, name)
      ),
      shipment_documents:shipment_documents (
        id, type, url
      )
    `)
    .order('id', { ascending: false });
  console.log('DATA:', data, 'ERROR:', error);
  if (error) {
    alert('Errore caricamento spedizioni: ' + error.message);
    return [];
  }
  return data;
}

function renderShipments(shipments) {
  const container = document.getElementById('shipments-container');
  container.innerHTML = '';
  shipments.forEach(shipment => {
    const card = document.createElement('div');
    card.className = 'shipment-card';
    card.innerHTML = `
      <div class="shipment-header">
        <div>
          <strong>Tracking:</strong> ${shipment.tracking_number || shipment.container_number || shipment.id}
        </div>
        <div class="shipment-actions">
          <button class="add-btn" onclick="openProductModal(${shipment.id})">Associa Prodotti</button>
          <button class="add-btn" onclick="openCostModal(${shipment.id})">Gestisci Costi</button>
          <button class="add-btn" onclick="openDocumentModal(${shipment.id})">Allega Documenti</button>
        </div>
      </div>
      <div>
        <strong>Prodotti:</strong>
        <div class="shipment-products">
          ${(shipment.shipment_products || []).map(sp =>
            `<span class="product-pill">${sp.product?.name || 'Prodotto #' + sp.product_id}</span>`
          ).join('') || '<em>Nessun prodotto associato</em>'}
        </div>
      </div>
      <div>
        <strong>Costo spedizione:</strong> ${shipment.cost ? shipment.cost + ' €' : '<em>Non inserito</em>'}
      </div>
      <div>
        <strong>Documenti:</strong>
        <div class="documents-list">
          ${(shipment.shipment_documents || []).map(doc =>
            `<a class="document-link" href="${doc.url}" target="_blank">${doc.type}</a>`
          ).join('') || '<em>Nessun documento allegato</em>'}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function main() {
  const shipments = await fetchShipments();
  renderShipments(shipments);
}
main();

// Placeholder per modali avanzate (da implementare)
window.openProductModal = function(shipmentId) {
  alert('Qui puoi implementare la UI per associare prodotti alla spedizione #' + shipmentId);
};
window.openCostModal = function(shipmentId) {
  alert('Qui puoi implementare la UI per gestire e splittare i costi della spedizione #' + shipmentId);
};
window.openDocumentModal = function(shipmentId) {
  alert('Qui puoi implementare la UI per allegare documenti alla spedizione #' + shipmentId);
};