// netlify/functions/parse-excel.js

// Importa la libreria per leggere i file Excel

const XLSX = require('xlsx');

exports.handler = async (event, context) => {
    // Controlla che la richiesta sia di tipo POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Estrai il contenuto del file (in formato base64) dal corpo della richiesta
        const { file: base64File } = JSON.parse(event.body);

        if (!base64File) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No file data provided.' })
            };
        }

        // Leggi il file Excel dal buffer base64
        const workbook = XLSX.read(base64File, { type: 'base64' });

        // Prendi il nome del primo foglio di lavoro
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converte il foglio di lavoro in un oggetto JSON
        // La prima riga viene usata come intestazione (headers)
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Estrai solo le intestazioni per il mapping
        const headers = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0]) || [];

        // Ritorna una risposta di successo con i dati estratti
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                headers: headers,
                data: data
            })
        };

    } catch (error) {
        console.error('Error parsing Excel file:', error);
        // In caso di errore, ritorna un errore 500
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Failed to parse the Excel file.',
                details: error.message
            })
        };
    }
};