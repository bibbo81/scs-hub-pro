import React from "react";
import ShipmentsTable from "../ShipmentsTable";
import ShipmentsTableFilters from "../ShipmentsTableFilters";

export default function RegistryTab() {
  return (
    <div className="registry-tab">
      <ShipmentsTableFilters />
      <ShipmentsTable />
    </div>
  );
}
