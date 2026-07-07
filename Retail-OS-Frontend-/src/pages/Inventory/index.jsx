import InventoryHeader from "../../components/InventoryHeader";
import InventoryCards from "../../components/InventoryCards";
import InventoryFilters from "../../components/InventoryFilters";
import InventoryTable from "../../components/InventoryTable";
import LowStockAlert from "../../components/LowStockAlert";
import ExpiryAlert from "../../components/ExpiryAlert";
import PendingTransfer from "../../components/PendingTransfer";
import StockSummaryChart from "../../components/StockSummaryChart";

const Inventory = () => {
  return (
    <div>
      <InventoryHeader />
      <InventoryCards />   

        <StockSummaryChart />

      <InventoryFilters />
      <InventoryTable />
      <LowStockAlert />  
      <ExpiryAlert />
      < PendingTransfer />
     
    </div>
  );
};

export default Inventory;