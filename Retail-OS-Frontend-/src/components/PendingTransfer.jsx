import React, { useState, useEffect } from "react";
import { getMovements } from "../api/inventoryApi";
import "./PendingTransfer.css";

const DEFAULT_TRANSFERS = [
  {
    id: 1,
    transferId: "TR001",
    source: "Main Warehouse",
    destination: "Branch Warehouse",
    date: "05 Jul 2026",
    status: "Pending",
  },
  {
    id: 2,
    transferId: "TR002",
    source: "Central Warehouse",
    destination: "Store Warehouse",
    date: "05 Jul 2026",
    status: "Approved",
  },
  {
    id: 3,
    transferId: "TR003",
    source: "Main Warehouse",
    destination: "Cold Storage",
    date: "06 Jul 2026",
    status: "In Transit",
  },
  {
    id: 4,
    transferId: "TR004",
    source: "Branch Warehouse",
    destination: "Main Warehouse",
    date: "06 Jul 2026",
    status: "Pending",
  },
];

const PendingTransfer = () => {
  const [transferData, setTransferData] = useState(DEFAULT_TRANSFERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getMovements();
      const data = Array.isArray(response) ? response : (response?.data || response?.content || []);
      if (data && data.length > 0) {
        setTransferData(data);
      }
    } catch (err) {
      console.error("Fetch Movements Error:", err);
      setError("Failed to load inventory movements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  return (
    <div className="pending-transfer">
      <div className="pending-transfer-header">
        <div>
          <h2>🚚 Pending Transfers</h2>
          <p>
            Monitor warehouse transfer requests and their current status.
          </p>
        </div>

        <button className="view-all-btn" onClick={fetchMovements}>
          {loading ? "Refreshing..." : "View All"}
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
            <th>Transfer ID</th>
            <th>Source Warehouse</th>
            <th>Destination Warehouse</th>
            <th>Transfer Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {transferData.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{item.transferId || item.id || `TR00${idx + 1}`}</td>
              <td>{item.source || item.sourceWarehouse || item.fromLocation || "—"}</td>
              <td>{item.destination || item.destinationWarehouse || item.toLocation || "—"}</td>
              <td>{item.date || item.createdAt || item.transferDate || "—"}</td>
              <td>
                <span
                  className={`transfer-status ${(item.status || "Pending")
                    .toLowerCase()
                    .replace(/\s/g, "-")}`}
                >
                  {item.status || "Pending"}
                </span>
              </td>
              <td>
                <button className="transfer-action-btn">
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PendingTransfer;