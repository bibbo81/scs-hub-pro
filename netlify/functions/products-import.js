// netlify/functions/products-import.js

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Dati inviati dal frontend (import-wizard)
        const { data } = JSON.parse(event.body);

        if (!data || data.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No data to import.' }) };
        }

        // Inizializza il client di Supabase
        // Assicurati di aver impostato queste variabili d'ambiente nel tuo account Netlify
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY // Usa la service role key per avere pieni permessi
        );

        // Usa 'upsert'. Inserisce nuove righe, o aggiorna quelle esistenti se trova
        // una corrispondenza sulla chiave primaria (es. lo 'sku').
        const { error } = await supabase
            .from('products') // Il nome della tua tabella su Supabase
            .upsert(data, { onConflict: 'sku' }); // Specifica la colonna per i conflitti

        if (error) {
            // Se c'è un errore dal database, lo catturiamo
            throw error;
        }

        // Successo!
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `${data.length} products imported successfully.`
            })
        };

    } catch (error) {
        console.error('Error during Supabase import:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Failed to import data to Supabase.',
                details: error.message
            })
        };
    }
};