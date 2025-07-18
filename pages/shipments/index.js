import React, { useState } from "react";
import KPIHeader from "./components/KPIHeader";
import ShipmentsTabs from "./components/Tabs/ShipmentsTabs";
import "./shipments.css"; // importa anche solarium.css se non incluso altrove

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState("registry");

  return (
    <main className="shipments-page">
      <KPIHeader />
      <ShipmentsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}
