import React, { useEffect, useState } from "react";
import {
  BsSearch,
  BsPlus,
  BsPencilFill,
  BsTrashFill,
  BsCheckCircleFill,
} from "react-icons/bs";

import { supplier as supplierService } from "../../services/supplier";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

const SupplierFormModal = ({ supplier, onClose, onSave }) => {
  const isNew = !supplier;

  const [form, setForm] = useState(
    supplier
      ? {
          name: supplier.name || "",
          email: supplier.email || "",
          phone: supplier.phone || "",
          address: supplier.address || "",
        }
      : EMPTY_FORM
  );

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div
      className="ec-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ec-modal"
        style={{ maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ec-modal-header">
          <div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
              }}
            >
              {isNew ? "Add New Supplier" : `Edit: ${supplier.name}`}
            </h3>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              Enter supplier details
            </p>
          </div>

          <button
            className="ec-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Supplier Name */}
        <div className="ec-field">
          <label>Supplier Name *</label>

          <input
            className="ec-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Enter supplier name"
          />
        </div>

        {/* Email + Phone */}
        <div className="ec-form-row">
          <div className="ec-field">
            <label>Email</label>

            <input
              className="ec-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="supplier@example.com"
            />
          </div>

          <div className="ec-field">
            <label>Phone</label>

            <input
              className="ec-input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* Address */}
        <div className="ec-field">
          <label>Address</label>

          <textarea
            className="ec-textarea"
            rows={3}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Enter supplier address"
          />
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 18,
          }}
        >
          <button
            className="adm-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="adm-btn-primary"
            onClick={() => onSave(form)}
          >
            {isNew ? (
              <>
                <BsPlus size={16} />
                Add Supplier
              </>
            ) : (
              <>
                <BsCheckCircleFill size={13} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Supplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  // =========================
  // GET SUPPLIERS
  // =========================
  const loadSuppliers = async () => {
    try {
      setLoading(true);

      const response = await supplierService.getAll();

      console.log("Suppliers API Response:", response);

      /*
        Depending on API response:

        Case 1:
        response = []

        Case 2:
        response = {
          data: []
        }

        We handle both.
      */

      const supplierData = Array.isArray(response)
        ? response
        : response?.data || [];

      console.log("Supplier Data:", supplierData);

      setSuppliers(supplierData);
    } catch (error) {
      console.error("Failed to load suppliers:", error);

      if (error.response) {
        console.log(
          "Status:",
          error.response.status
        );

        console.log(
          "Data:",
          error.response.data
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // =========================
  // SEARCH
  // =========================
  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = search.toLowerCase();

    return (
      (supplier.name || "")
        .toLowerCase()
        .includes(q) ||
      (supplier.email || "")
        .toLowerCase()
        .includes(q) ||
      (supplier.phone || "")
        .toLowerCase()
        .includes(q)
    );
  });

  // =========================
  // ADD / UPDATE
  // =========================
  const handleSave = async (form) => {
    if (!form.name.trim()) {
      alert("Supplier name is required");
      return;
    }

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      };

      console.log("Supplier Payload:", payload);

      if (modal?.id) {
        await supplierService.update(
          modal.id,
          payload
        );

        alert("Supplier updated successfully!");
      } else {
        await supplierService.create(payload);

        alert("Supplier created successfully!");
      }

      setModal(null);

      await loadSuppliers();
    } catch (error) {
      console.error(
        "Supplier Save Error:",
        error
      );

      if (error.response) {
        console.log(
          "Status:",
          error.response.status
        );

        console.log(
          "API Error:",
          error.response.data
        );
      }

      alert("Supplier operation failed");
    }
  };

  // =========================
  // DELETE
  // =========================
  const deleteSupplier = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmDelete) return;

    try {
      await supplierService.remove(id);

      alert("Supplier deleted successfully!");

      await loadSuppliers();
    } catch (error) {
      console.error(
        "Delete Supplier Error:",
        error
      );

      if (error.response) {
        console.log(
          "Status:",
          error.response.status
        );

        console.log(
          "API Error:",
          error.response.data
        );
      }

      alert("Failed to delete supplier");
    }
  };

  // =========================
  // KPIs
  // =========================
  const totalSuppliers = suppliers.length;

  return (
    <div className="dash-page">

      {/* ================= HEADER ================= */}
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">
            🚚 Suppliers
          </h1>

          <p className="adm-page-sub">
            Manage your suppliers and vendor information
          </p>
        </div>

        <div className="adm-header-actions">
          <button
            className="adm-btn-primary"
            onClick={() => setModal("new")}
          >
            <BsPlus size={17} />
            Add Supplier
          </button>
        </div>
      </div>

      {/* ================= KPI ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div
          className="adm-kpi-card"
          style={{
            padding: "14px 18px",
          }}
        >
          <span style={{ fontSize: 22 }}>
            🚚
          </span>

          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#9ca3af",
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            Total Suppliers
          </p>

          <p
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#6366f1",
              marginTop: 4,
            }}
          >
            {totalSuppliers}
          </p>
        </div>
      </div>

      {/* ================= SEARCH ================= */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e8eaf0",
          borderRadius: 12,
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
          }}
        >
          <BsSearch
            size={13}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform:
                "translateY(-50%)",
              color: "#9ca3af",
            }}
          />

          <input
            className="ec-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div
        className="chart-card"
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background:
                  "#f9fafb",
                borderBottom:
                  "1px solid #e8eaf0",
              }}
            >
              {[
                "Supplier",
                "Email",
                "Phone",
                "Address",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding:
                      "12px 14px",
                    textAlign:
                      "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      "#9ca3af",
                    textTransform:
                      "uppercase",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>

            {/* LOADING */}
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 40,
                    textAlign:
                      "center",
                    color:
                      "#9ca3af",
                  }}
                >
                  Loading suppliers...
                </td>
              </tr>
            )}

            {/* DATA */}
            {!loading &&
              filteredSuppliers.map(
                (supplier) => (
                  <tr
                    key={
                      supplier.id
                    }
                    style={{
                      borderBottom:
                        "1px solid #f3f4f6",
                    }}
                  >
                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          "#111827",
                      }}
                    >
                      {supplier.name ||
                        "-"}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 12,
                        color:
                          "#6b7280",
                      }}
                    >
                      {supplier.email ||
                        "-"}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 12,
                        color:
                          "#6b7280",
                      }}
                    >
                      {supplier.phone ||
                        "-"}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 14px",
                        fontSize: 12,
                        color:
                          "#6b7280",
                      }}
                    >
                      {supplier.address ||
                        "-"}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 6,
                        }}
                      >
                        {/* EDIT */}
                        <button
                          className="adm-btn-secondary"
                          style={{
                            padding:
                              "5px 10px",
                          }}
                          onClick={() =>
                            setModal(
                              supplier
                            )
                          }
                        >
                          <BsPencilFill
                            size={11}
                          />
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() =>
                            deleteSupplier(
                              supplier.id
                            )
                          }
                          style={{
                            padding:
                              "5px 10px",
                            borderRadius:
                              8,
                            border:
                              "1px solid #fecaca",
                            background:
                              "#fef2f2",
                            color:
                              "#ef4444",
                            cursor:
                              "pointer",
                          }}
                        >
                          <BsTrashFill
                            size={11}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

            {/* EMPTY */}
            {!loading &&
              filteredSuppliers.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 40,
                      textAlign:
                        "center",
                      color:
                        "#9ca3af",
                      fontSize: 14,
                    }}
                  >
                    No suppliers found
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      {modal && (
        <SupplierFormModal
          supplier={
            modal === "new"
              ? null
              : modal
          }
          onClose={() =>
            setModal(null)
          }
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Supplier;