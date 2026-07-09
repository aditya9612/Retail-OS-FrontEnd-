import React from "react";
import "./ExpiryAlert.css";

const expiryProducts = [
  {
    id: 1,
    product: "Paracetamol 500mg",
    batch: "BT101",
    category: "Medicines",
    warehouse: "Main Warehouse",
    expiryDate: "15 Jul 2026",
    daysLeft: 10,
  },
  {
    id: 2,
    product: "Fresh Milk",
    batch: "BT202",
    category: "Dairy",
    warehouse: "Cold Storage",
    expiryDate: "18 Jul 2026",
    daysLeft: 13,
  },
  {
    id: 3,
    product: "Curd",
    batch: "BT303",
    category: "Dairy",
    warehouse: "Cold Storage",
    expiryDate: "20 Jul 2026",
    daysLeft: 15,
  },
  {
    id: 4,
    product: "Bread",
    batch: "BT404",
    category: "Bakery",
    warehouse: "Store Warehouse",
    expiryDate: "22 Jul 2026",
    daysLeft: 17,
  },
];

const ExpiryAlert = () => {
  return (
    <div className="expiry-alert">

      <div className="expiry-header">

        <div>
          <h2>⏰ Expiry Alerts</h2>
          <p>
            Products that are approaching their expiry date.
          </p>
        </div>

        <button className="view-all-btn">
          View All
        </button>

      </div>

      <table className="expiry-table">

        <thead>

          <tr>
            <th>Product</th>
            <th>Batch No.</th>
            <th>Category</th>
            <th>Warehouse</th>
            <th>Expiry Date</th>
            <th>Days Left</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          {expiryProducts.map((item) => (

            <tr key={item.id}>

              <td>{item.product}</td>

              <td>{item.batch}</td>

              <td>{item.category}</td>

              <td>{item.warehouse}</td>

              <td>{item.expiryDate}</td>

              <td>{item.daysLeft} Days</td>

              <td>
                <span className="expiry-badge">
                  Expiring Soon
                </span>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
};

export default ExpiryAlert;