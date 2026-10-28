import React, { useState, useEffect, useCallback } from "react";
import { getWarehouseTransfers } from "../api/warehouseApi";
import { getMovements } from "../api/inventoryApi";
import "./PendingTransfer.css";

const extractTransfersList = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.transfers)) return response.transfers;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data?.transfers)) return response.data.transfers;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const PendingTransfer = ({ warehouseId = null }) => {
  const [transferData, setTransferData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let response;
      if (warehouseId) {
        response = await getWarehouseTransfers(warehouseId, { limit: 50 });
      } else {
        response = await getMovements();
      }
      const data = extractTransfersList(response);
      setTransferData(data);
    } catch (err) {
      console.error("Fetch Transfers Error:", err);
      const msg =
        err?.response?.data?.detail?.message ||
        (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load transfer data";
      setError(msg);
      setTransferData([]);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  return (
    <div className="pending-transfer">
      <div className="pending-transfer-header">
        <div>
          <h2>🚚 Warehouse Transfers</h2>
          <p>
            Monitor warehouse transfer requests and their current status.
          </p>
        </div>

        <button className="view-all-btn" onClick={fetchTransfers} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div style={{ padding: "10px", color: "#6366f1", fontSize: 13 }}>
          Loading transfer data...
        </div>
      )}

      {error && (
        <div style={{ padding: "10px", color: "#ef4444", fontSize: 13 }}>
          {error}
        </div>
      )}

      <table className="pending-transfer-table">
        <thead>
          <tr>
            <th>Transfer Number</th>
            <th>Transfer Type</th>
            <th>Source Store</th>
            <th>Destination Store</th>
            <th>Status</th>
            <th>Item Count</th>
            <th>Created Date</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {transferData.length === 0 && !loading && !error ? (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                No transfers found.
              </td>
            </tr>
          ) : (
            transferData.map((item, idx) => {
              const trNum = item.transfer_number || item.transferNumber || item.code || item.transferId || (item.id ? `#${item.id}` : `TR00${idx + 1}`);
              const trType = item.transfer_type || item.transferType || item.type || "Store Transfer";
              const srcStore = item.source_store_name || item.sourceStoreName || item.source_store?.name || (item.source_store_id != null ? `Store #${item.source_store_id}` : (item.sourceWarehouse || item.source || item.fromLocation || "—"));
              const dstStore = item.destination_store_name || item.destinationStoreName || item.destination_store?.name || (item.destination_store_id != null ? `Store #${item.destination_store_id}` : (item.destinationWarehouse || item.destination || item.toLocation || "—"));
              const status = item.status || "Pending";
              const itemCount = item.item_count ?? item.items_count ?? item.total_items ?? item.items?.length ?? item.quantity ?? 0;
              const dateVal = item.created_at ? new Date(item.created_at).toLocaleDateString() : (item.date || item.transferDate || "—");

              return (
                <tr key={item.id || idx}>
                  <td style={{ fontWeight: 600 }}>{trNum}</td>
                  <td>{trType}</td>
                  <td>{srcStore}</td>
                  <td>{dstStore}</td>
                  <td>
                    <span
                      className={`transfer-status ${(status)
                        .toLowerCase()
                        .replace(/\s/g, "-")}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td>{itemCount}</td>
                  <td>{dateVal}</td>
                  <td>
                    <button className="transfer-action-btn">
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PendingTransfer;