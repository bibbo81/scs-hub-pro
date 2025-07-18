import React, { useEffect, useState } from "react";
// In futuro importerai anche:
// import { getShipments } from "../../hooks/useShipmentsRegistry";
// import tableConfig from "../../utils/tableConfig";

export default function ShipmentsTable() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulazione fetch iniziale (in futuro collegherai a data-manager.js o Supabase)
  useEffect(() => {
    setLoading(true);
    // Simulazione mock data (puoi sostituire con getShipments())
    setTimeout(() => {
      setShipments([
        { id: 1, code: "SHP001", status: "In transito", carrier: "Maersk" },
        { id: 2, code: "SHP002", status: "Consegnata", carrier: "MSC" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) return <div className="loading">Caricamento spedizioni...</div>;

  return (
    <div className="shipments-table-container">
      <table className="shipments-table">
        <thead>
          <tr>
            <th>Codice</th>
            <th>Stato</th>
            <th>Vettore</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment) => (
            <tr key={shipment.id}>
              <td>{shipment.code}</td>
              <td>{shipment.status}</td>
              <td>{shipment.carrier}</td>
              <td>
                <button className="btn-small">Dettagli</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
