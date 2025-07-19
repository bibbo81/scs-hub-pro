import React, { useEffect, useState, useMemo } from "react";
// In futuro importerai anche:
// import { getShipments } from "../../hooks/useShipmentsRegistry";
// import tableConfig from "../../utils/tableConfig";
// import ModalSystem from '/core/modal-system.js'; // Assuming a modal system exists

export default function ShipmentsTable() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Simulazione fetch iniziale
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setShipments([
        { id: 1, code: "SHP001", status: "In transito", carrier: "Maersk" },
        { id: 2, code: "SHP002", status: "Consegnata", carrier: "MSC" },
        { id: 3, code: "SHP003", status: "In transito", carrier: "CMA CGM" },
        { id: 4, code: "SHP004", status: "Pianificata", carrier: "Maersk" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  // Memoized sorting logic
  const sortedShipments = useMemo(() => {
    let sortableItems = [...shipments];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [shipments, sortConfig]);

  // Function to request sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Function to get CSS class for sortable headers
  const getSortClassName = (name) => {
    if (!sortConfig.key) return '';
    if (sortConfig.key === name) {
      return sortConfig.direction === 'ascending' ? 'sorted-asc' : 'sorted-desc';
    }
    return '';
  };

  // Function to handle details button click
  const handleDetailsClick = (shipmentId) => {
    // In a real app, you would open a modal here.
    // Example: ModalSystem.open({ title: "Dettagli Spedizione", content: `ID: ${shipmentId}` });
    alert(`Mostra dettagli per la spedizione ID: ${shipmentId}`);
    console.log(`Opening details for shipment ID: ${shipmentId}`);
  };

  // Render a single row
  const renderRow = (shipment) => (
    <tr key={shipment.id}>
      <td>{shipment.code}</td>
      <td>{shipment.status}</td>
      <td>{shipment.carrier}</td>
      <td>
        <button 
          className="btn-small" 
          onClick={() => handleDetailsClick(shipment.id)}
        >
          Dettagli
        </button>
      </td>
    </tr>
  );

  if (loading) return <div className="loading">Caricamento spedizioni...</div>;

  return (
    <div className="shipments-table-container">
      <table className="shipments-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('code')} className={getSortClassName('code')}>
              Codice
            </th>
            <th onClick={() => requestSort('status')} className={getSortClassName('status')}>
              Stato
            </th>
            <th onClick={() => requestSort('carrier')} className={getSortClassName('carrier')}>
              Vettore
            </th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {sortedShipments.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}