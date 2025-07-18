import { renderKPIHeader } from './components/KPIHeader.js';
import { renderShipmentsTableFilters } from './components/ShipmentsTableFilters.js';
import { renderShipmentsTable } from './components/ShipmentsTable.js';
import { getShipmentsForOrganization } from '../../services/shipmentsService.js';
import { getCurrentUserWithOrganization } from '../../services/authService.js';

const app = document.getElementById('shipments-app');

async function initializeShipmentsPage() {
  try {
    const { user, organization_id } = await getCurrentUserWithOrganization();
    if (!user || !organization_id) {
      app.innerHTML = '<p>Errore di autenticazione. Riprova.</p>';
      return;
    }

    const shipments = await getShipmentsForOrganization(organization_id);

    // Render dei componenti
    app.appendChild(renderKPIHeader(shipments));
    app.appendChild(renderShipmentsTableFilters(shipments));
    app.appendChild(renderShipmentsTable(shipments));
  } catch (error) {
    console.error('Errore durante il caricamento della pagina shipments:', error);
    app.innerHTML = '<p>Si è verificato un errore durante il caricamento dei dati.</p>';
  }
}

initializeShipmentsPage();
