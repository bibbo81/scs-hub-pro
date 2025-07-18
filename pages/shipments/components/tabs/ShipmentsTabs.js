import React from "react";
import RegistryTab from "./RegistryTab";
// Gli altri tab li importerai man mano che li implementi:
// import ProductsLinkTab from "./ProductsLinkTab";
// import CostAnalysisTab from "./CostAnalysisTab";
// import BIdashboardTab from "./BIdashboardTab";
// import RoutesTab from "./RoutesTab";
// import DocumentsTab from "./DocumentsTab";
// import TimelineTab from "./TimelineTab";

export default function ShipmentsTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { key: "registry", label: "Registro" },
    { key: "products-link", label: "Prodotti" },
    { key: "cost-analysis", label: "Analisi Costi" },
    { key: "bi-dashboard", label: "BI Dashboard" },
    { key: "routes", label: "Rotte" },
    { key: "documents", label: "Documenti" },
    { key: "timeline", label: "Timeline" },
  ];

  return (
    <section className="shipments-tabs">
      <nav className="tabs-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="tabs-content">
        {activeTab === "registry" && <RegistryTab />}
        {/* Attiverai questi solo quando i componenti saranno pronti:
        {activeTab === "products-link" && <ProductsLinkTab />}
        {activeTab === "cost-analysis" && <CostAnalysisTab />}
        {activeTab === "bi-dashboard" && <BIdashboardTab />}
        {activeTab === "routes" && <RoutesTab />}
        {activeTab === "documents" && <DocumentsTab />}
        {activeTab === "timeline" && <TimelineTab />} */}
      </div>
    </section>
  );
}
