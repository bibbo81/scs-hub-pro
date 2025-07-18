import React, { useState } from "react";

export default function ShipmentsTableFilters() {
  const [carrier, setCarrier] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    // In futuro: chiama la funzione di filtro/spedizioni da props o contesto
    console.log("Filtra per:", { carrier, status, search });
  };

  return (
    <div className="shipments-filters">
      <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
        <option value="">Tutti i vettori</option>
        <option value="Maersk">Maersk</option>
        <option value="MSC">MSC</option>
        <option value="CMA CGM">CMA CGM</option>
      </select>

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Tutti gli stati</option>
        <option value="In transito">In transito</option>
        <option value="Consegnata">Consegnata</option>
        <option value="In ritardo">In ritardo</option>
      </select>

      <input
        type="text"
        placeholder="Cerca per codice o riferimento"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <button className="btn-small" onClick={handleSearch}>
        Cerca
      </button>
    </div>
  );
}
