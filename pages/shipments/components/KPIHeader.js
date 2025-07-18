import React from "react";
// In futuro: importa hook o helpers da /hooks/useShipmentsRegistry.js

export default function KPIHeader() {
  // Mock temporaneo: in futuro prendi i dati reali da Supabase o API
  const kpiData = [
    { label: "Totale spedizioni", value: 134 },
    { label: "In transito", value: 14 },
    { label: "Consegnate", value: 104 },
    { label: "In ritardo", value: 16 },
    { label: "Costo totale", value: "€76.000" },
    { label: "Transit time medio", value: "7 gg" },
  ];

  return (
    <section className="kpi-header">
      {kpiData.map((kpi, index) => (
        <div className="kpi-card" key={index}>
          <span className="kpi-value">{kpi.value}</span>
          <span className="kpi-label">{kpi.label}</span>
        </div>
      ))}
    </section>
  );
}
