// /core/services/shipments-service.js

import { supabase } from './supabase-client.js';

const TABLE_NAME = 'shipments';

const ShipmentsService = {
  /**
   * Ottiene tutte le spedizioni per una specifica organizzazione.
   * @param {string} organizationId
   * @returns {Promise<Array>}
   */
  async getShipmentsByOrganization(organizationId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        tracking:trackings!shipments_source_tracking_id_fkey (
          tracking_number,
          carrier_name,
          status,
          last_event_description
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore nel recupero delle spedizioni:', error.message, error.details, error.hint);
      throw error;
    }

    return data;
  },

  /**
   * Ottiene una spedizione per ID.
   * @param {string} shipmentId
   * @returns {Promise<Object|null>}
   */
  async getShipmentById(shipmentId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (error) {
      console.error('Errore nel recupero della spedizione:', error);
      return null;
    }

    return data;
  },

  /**
   * Crea una nuova spedizione.
   * @param {Object} shipment
   * @returns {Promise<Object>}
   */
  async createShipment(shipment) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([shipment])
      .select()
      .single();

    if (error) {
      console.error('Errore nella creazione della spedizione:', error);
      throw error;
    }

    return data;
  },

  /**
   * Aggiorna una spedizione.
   * @param {string} shipmentId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateShipment(shipmentId, updates) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', shipmentId)
      .select()
      .single();

    if (error) {
      console.error('Errore nell\'aggiornamento della spedizione:', error);
      throw error;
    }

    return data;
  },

  /**
   * Elimina una spedizione.
   * @param {string} shipmentId
   * @returns {Promise<void>}
   */
  async deleteShipment(shipmentId) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', shipmentId);

    if (error) {
      console.error('Errore nella cancellazione della spedizione:', error);
      throw error;
    }
  }
};

export default ShipmentsService;
