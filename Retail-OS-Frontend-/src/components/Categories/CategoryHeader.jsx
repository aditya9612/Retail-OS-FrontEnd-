import React, { useState, useRef, useEffect } from "react";
import { BsDownload, BsChevronDown, BsFileEarmarkSpreadsheet, BsFileEarmarkText } from "react-icons/bs";
import "./CategoryHeader.css";

const CategoryHeader = ({
  total,
  active,
  inactive,
  onAdd,
  onExport,
  isExporting = false,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportClick = (format) => {
    setShowExportMenu(false);
    if (typeof onExport === "function") {
      onExport(format);
    }
  };

  return (
    <div className="category-header">
      {/* Left */}
      <div className="category-header-left">
        <h1>Category Management</h1>
      </div>

      {/* Right */}
      <div className="category-header-right">
        {/* Export Dropdown (CSV / Excel) */}
        <div ref={dropdownRef} className="export-dropdown-container" style={{ position: "relative", display: "inline-block" }}>
          <button
            className="category-btn secondary-btn"
            type="button"
            onClick={() => setShowExportMenu((prev) => !prev)}
            disabled={isExporting}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Export Categories"
            aria-haspopup="true"
            aria-expanded={showExportMenu}
          >
            <BsDownload size={13} />
            <span>{isExporting ? "Exporting..." : "Export"}</span>
            <BsChevronDown size={11} />
          </button>

          {showExportMenu && (
            <div
              className="export-menu-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                zIndex: 9999,
                minWidth: 160,
                padding: "6px 0",
              }}
            >
              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExportClick("csv")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px 14px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#1e293b",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <BsFileEarmarkText size={15} color="#0284c7" />
                <span>Export CSV (.csv)</span>
              </button>
              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExportClick("excel")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px 14px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#1e293b",
                  cursor: "pointer",
                  borderTop: "1px solid #f1f5f9",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <BsFileEarmarkSpreadsheet size={15} color="#16a34a" />
                <span>Export Excel (.xlsx)</span>
              </button>
            </div>
          )}
        </div>

        <button
          className="category-btn primary-btn"
          onClick={onAdd}
        >
          + Add Category
        </button>
      </div>
    </div>
  );
};

export default CategoryHeader;
