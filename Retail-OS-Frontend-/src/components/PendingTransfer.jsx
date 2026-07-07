import React from "react";
import "./PendingTransfer.css";

const transferData = [
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
  return (
    <div className="pending-transfer">

      <div className="pending-transfer-header">

        <div>
          <h2>🚚 Pending Transfers</h2>
          <p>
            Monitor warehouse transfer requests and their current status.
          </p>
        </div>

        <button className="view-all-btn">
          View All
        </button>

      </div>

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

          {transferData.map((item) => (

            <tr key={item.id}>

              <td>{item.transferId}</td>

              <td>{item.source}</td>

              <td>{item.destination}</td>

              <td>{item.date}</td>

              <td>
                <span
                  className={`transfer-status ${item.status
                    .toLowerCase()
                    .replace(/\s/g, "-")}`}
                >
                  {item.status}
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