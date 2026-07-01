import React from "react";
import {
  BsBoxSeam,
  BsUpcScan,
  BsExclamationTriangle,
  BsTags,
} from "react-icons/bs";

const stats = [
  {
    title: "Total Products",
    value: "1,248",
    sub: "+12% this month",
    icon: <BsBoxSeam size={22} />,
    iconBg: "#EEF2FF",
    iconColor: "#6366F1",
    badge: "+12%",
    badgeClass: "adm-kpi-badge adm-kpi-badge--up",
  },
  {
    title: "Barcodes",
    value: "1,102",
    sub: "Generated",
    icon: <BsUpcScan size={22} />,
    iconBg: "#ECFDF5",
    iconColor: "#10B981",
    badge: "+8%",
    badgeClass: "adm-kpi-badge adm-kpi-badge--up",
  },
  {
    title: "Low Stock",
    value: "28",
    sub: "Needs Restock",
    icon: <BsExclamationTriangle size={22} />,
    iconBg: "#FEF3C7",
    iconColor: "#F59E0B",
    badge: "-3%",
    badgeClass: "adm-kpi-badge adm-kpi-badge--down",
  },
  {
    title: "Categories",
    value: "32",
    sub: "Available",
    icon: <BsTags size={22} />,
    iconBg: "#F3E8FF",
    iconColor: "#8B5CF6",
    badge: "+2",
    badgeClass: "adm-kpi-badge adm-kpi-badge--up",
  },
];

const ProductStats = () => {
  return (
    <div className="adm-kpi-grid">
      {stats.map((item) => (
        <div className="adm-kpi-card" key={item.title}>
          <div className="adm-kpi-top">
            <div
              className="adm-kpi-icon"
              style={{
                background: item.iconBg,
                color: item.iconColor,
              }}
            >
              {item.icon}
            </div>

            <span className={item.badgeClass}>
              {item.badge}
            </span>
          </div>

          <div className="adm-kpi-label">
            {item.title}
          </div>

          <div className="adm-kpi-value">
            {item.value}
          </div>

          <div className="adm-kpi-sub">
            {item.sub}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductStats;