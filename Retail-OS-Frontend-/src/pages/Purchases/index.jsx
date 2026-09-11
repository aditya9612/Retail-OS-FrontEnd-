import React, { useEffect, useState } from "react";

import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  updatePurchaseOrderStatus,
} from "../../api/purchaseOrdersApi";

import { getSuppliers } from "../../api/supplierApi";
import axiosInstance from "../../api/axios";

import {
  BsSearch,
  BsPlus,
  BsEye,
  BsPencilFill,
  BsChevronLeft,
  BsChevronRight,
  BsCheckCircleFill,
  BsClockHistory,
  BsXCircleFill,
  BsTrashFill,
  BsCart3,
} from "react-icons/bs";

/* =====================================================
   STATUS CONFIG
===================================================== */

const STATUS_CONFIG = {
  Pending: {
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: <BsClockHistory size={11} />,
  },

  Received: {
    color: "#10b981",
    bg: "#ecfdf5",
    icon: <BsCheckCircleFill size={11} />,
  },

  Cancelled: {
    color: "#ef4444",
    bg: "#fef2f2",
    icon: <BsXCircleFill size={11} />,
  },
};

const PAGE_SIZE = 8;
const PURCHASE_FETCH_SIZE = 100;

/* =====================================================
   EMPTY ITEM
===================================================== */

const EMPTY_ITEM = {
  product_id: "",
  quantity: "",
  unit_price: "",
};

/* =====================================================
   EMPTY FORM
===================================================== */

const EMPTY_FORM = {
  supplier: "",
  store: "",
  remarks: "",
  items: [{ ...EMPTY_ITEM }],
};

/* =====================================================
   FORMATTERS
===================================================== */

const fmt = (n) => {
  if (n === null || n === undefined || n === "") {
    return "-";
  }

  const value = Number(n);

  if (!Number.isFinite(value)) {
    return "-";
  }

  return (
    "₹" +
    value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })
  );
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   STATUS HELPERS
===================================================== */

const normalizeStatus = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "draft":
    case "pending":
      return "Pending";

    case "received":
      return "Received";

    case "cancelled":
    case "canceled":
      return "Cancelled";

    default:
      return "Pending";
  }
};

const getBackendStatus = (status) => {
  switch (status) {
    case "Received":
      return "received";

    case "Cancelled":
      return "cancelled";

    case "Pending":
    default:
      return "draft";
  }
};

/* =====================================================
   SUPPLIER NAME
===================================================== */

const getSupplierDisplayName = (supplierId, suppliers) => {
  if (supplierId === null || supplierId === undefined) {
    return "-";
  }

  const supplier = suppliers.find(
    (item) =>
      Number(item?.id ?? item?.supplier_id) ===
      Number(supplierId)
  );

  if (!supplier) {
    return `Supplier #${supplierId}`;
  }

  return (
    supplier.name ||
    supplier.supplier_name ||
    supplier.company_name ||
    supplier.business_name ||
    `Supplier #${supplierId}`
  );
};

/* =====================================================
   PRODUCT NAME
===================================================== */

const getProductDisplayName = (product) => {
  return (
    product?.name ||
    product?.product_name ||
    product?.title ||
    product?.productName ||
    `Product #${product?.id ?? product?.product_id}`
  );
};

/* =====================================================
   STORE NAME
===================================================== */

const getStoreDisplayName = (store) => {
  return (
    store?.name ||
    store?.store_name ||
    store?.storeName ||
    store?.title ||
    `Store #${store?.id ?? store?.store_id}`
  );
};

/* =====================================================
   PURCHASE MAPPER
===================================================== */

const mapPurchaseOrder = (po, suppliers, fallback = {}) => {
  if (!po) {
    return fallback;
  }

  const supplierId =
    po?.supplier_id ??
    fallback?.supplierId ??
    null;

  const storeId =
    po?.store_id ??
    fallback?.storeId ??
    null;

  const rawItems = Array.isArray(po?.items)
    ? po.items
    : [];

  const items = rawItems.length
    ? rawItems.reduce(
        (sum, item) =>
          sum + Number(item?.quantity || 0),
        0
      )
    : fallback?.items ?? 0;

  return {
    id:
      po?.po_number ||
      (po?.id
        ? `PO-${po.id}`
        : fallback?.id || "-"),

    backendId:
      po?.id ??
      fallback?.backendId ??
      null,

    supplierId,

    supplier: getSupplierDisplayName(
      supplierId,
      suppliers
    ),

    storeId,

    purchaseDate: formatDate(
      po?.created_at ??
        fallback?.rawData?.created_at
    ),

    items,

    total: Number(
      po?.total_amount ??
        fallback?.total ??
        0
    ),

    status: normalizeStatus(
      po?.status ??
        fallback?.status
    ),

    remarks:
      po?.remarks ??
      fallback?.remarks ??
      "",

    rawData: po,
  };
};

/* =====================================================
   PURCHASE FORM MODAL
===================================================== */

const PurchaseFormModal = ({
  purchase,
  suppliers,
  products,
  stores,
  onClose,
  onSave,
}) => {
  const isNew = !purchase;

  const [form, setForm] = useState(
    purchase
      ? {
          supplier:
            purchase.supplierId ?? "",

          store:
            purchase.storeId ?? "",

          remarks:
            purchase.remarks === "-"
              ? ""
              : purchase.remarks ?? "",

          items:
            Array.isArray(
              purchase?.rawData?.items
            ) &&
            purchase.rawData.items.length > 0
              ? purchase.rawData.items.map(
                  (item) => ({
                    product_id:
                      item?.product_id ?? "",
                    quantity:
                      item?.quantity ?? "",
                    unit_price:
                      item?.unit_price ?? "",
                  })
                )
              : [{ ...EMPTY_ITEM }],
        }
      : {
          ...EMPTY_FORM,
        }
  );

  const [saving, setSaving] = useState(false);

  /* =====================================================
     SET FIELD
  ===================================================== */

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* =====================================================
     ITEM FUNCTIONS
  ===================================================== */

  const updateItem = (
    index,
    key,
    value
  ) => {
    setForm((prev) => {
      const updatedItems = [
        ...prev.items,
      ];

      updatedItems[index] = {
        ...updatedItems[index],
        [key]: value,
      };

      return {
        ...prev,
        items: updatedItems,
      };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...EMPTY_ITEM },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  };

  /* =====================================================
     TOTAL CALCULATION
  ===================================================== */

  const calculatedTotal = form.items.reduce(
    (sum, item) => {
      const quantity =
        Number(item.quantity) || 0;

      const unitPrice =
        Number(item.unit_price) || 0;

      return (
        sum +
        quantity * unitPrice
      );
    },
    0
  );

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async () => {
    if (
      !form.supplier ||
      Number(form.supplier) <= 0
    ) {
      alert(
        "Please select a valid supplier."
      );
      return;
    }

    if (
      !form.store ||
      Number(form.store) <= 0
    ) {
      alert(
        "Please select a valid store."
      );
      return;
    }

    /* =============================================
       CREATE VALIDATION
    ============================================= */

    if (isNew) {
      if (
        !Array.isArray(form.items) ||
        form.items.length === 0
      ) {
        alert(
          "Please add at least one product."
        );
        return;
      }

      for (
        let i = 0;
        i < form.items.length;
        i++
      ) {
        const item =
          form.items[i];

        if (
          !item.product_id ||
          Number(item.product_id) <= 0
        ) {
          alert(
            `Please select Product for item ${
              i + 1
            }.`
          );
          return;
        }

        if (
          !item.quantity ||
          Number(item.quantity) <= 0
        ) {
          alert(
            `Please enter a valid quantity for item ${
              i + 1
            }.`
          );
          return;
        }

        if (
          item.unit_price === "" ||
          Number(item.unit_price) < 0
        ) {
          alert(
            `Please enter a valid unit price for item ${
              i + 1
            }.`
          );
          return;
        }
      }
    }

    setSaving(true);

    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="ec-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ec-modal"
        style={{
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="ec-modal-header">
          <div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
              }}
            >
              {isNew
                ? "Create New Purchase"
                : `Edit: ${purchase.id}`}
            </h3>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              {isNew
                ? "Create a new purchase order"
                : "Update draft purchase order details"}
            </p>
          </div>

          <button
            className="ec-modal-close"
            onClick={onClose}
          >
            <BsXCircleFill size={16} />
          </button>
        </div>

        {/* API INFO */}

        <div
          style={{
            background: "#f8fafc",
            border:
              "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 16,
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          {isNew
            ? "Create Purchase Order with supplier, store and product items."
            : "Only draft purchase orders can be updated."}
        </div>

        {/* SUPPLIER */}

        <div className="ec-field">
          <label>
            Supplier *
          </label>

          <select
            className="ec-input"
            value={form.supplier}
            onChange={(e) =>
              set(
                "supplier",
                e.target.value
              )
            }
          >
            <option value="">
              Select Supplier
            </option>

            {suppliers.map(
              (supplier) => {
                const id =
                  supplier?.id ??
                  supplier?.supplier_id;

                return (
                  <option
                    key={id}
                    value={id}
                  >
                    {getSupplierDisplayName(
                      id,
                      suppliers
                    )}
                  </option>
                );
              }
            )}
          </select>
        </div>

        {/* STORE */}

        <div
          className="ec-field"
          style={{
            marginTop: 14,
          }}
        >
          <label>
            Store *
          </label>

          <select
            className="ec-input"
            value={form.store}
            onChange={(e) =>
              set(
                "store",
                e.target.value
              )
            }
          >
            <option value="">
              Select Store
            </option>

            {stores.map(
              (store) => {
                const id =
                  store?.id ??
                  store?.store_id;

                return (
                  <option
                    key={id}
                    value={id}
                  >
                    {getStoreDisplayName(
                      store
                    )}
                  </option>
                );
              }
            )}
          </select>
        </div>

        {/* PRODUCTS - CREATE */}

        {isNew && (
          <div
            style={{
              marginTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Purchase Items
                </p>

                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                  }}
                >
                  Add one or more products
                </span>
              </div>

              <button
                type="button"
                className="adm-btn-secondary"
                onClick={addItem}
                style={{
                  padding:
                    "6px 10px",
                  fontSize: 11,
                }}
              >
                <BsPlus size={14} />
                Add Product
              </button>
            </div>

            {form.items.map(
              (item, index) => {
                const lineTotal =
                  (Number(
                    item.quantity
                  ) || 0) *
                  (Number(
                    item.unit_price
                  ) || 0);

                return (
                  <div
                    key={index}
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                      background:
                        "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "2fr 1fr 1fr auto",
                        gap: 10,
                        alignItems:
                          "end",
                      }}
                    >
                      {/* PRODUCT */}

                      <div className="ec-field">
                        <label>
                          Product *
                        </label>

                        <select
                          className="ec-input"
                          value={
                            item.product_id
                          }
                          onChange={(
                            e
                          ) =>
                            updateItem(
                              index,
                              "product_id",
                              e.target
                                .value
                            )
                          }
                        >
                          <option value="">
                            Select Product
                          </option>

                          {products.map(
                            (
                              product
                            ) => {
                              const id =
                                product?.id ??
                                product?.product_id;

                              return (
                                <option
                                  key={
                                    id
                                  }
                                  value={
                                    id
                                  }
                                >
                                  {getProductDisplayName(
                                    product
                                  )}
                                </option>
                              );
                            }
                          )}
                        </select>
                      </div>

                      {/* QUANTITY */}

                      <div className="ec-field">
                        <label>
                          Quantity *
                        </label>

                        <input
                          className="ec-input"
                          type="number"
                          min="1"
                          value={
                            item.quantity
                          }
                          onChange={(
                            e
                          ) =>
                            updateItem(
                              index,
                              "quantity",
                              e.target
                                .value
                            )
                          }
                          placeholder="Qty"
                        />
                      </div>

                      {/* UNIT PRICE */}

                      <div className="ec-field">
                        <label>
                          Unit Price *
                        </label>

                        <input
                          className="ec-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.unit_price
                          }
                          onChange={(
                            e
                          ) =>
                            updateItem(
                              index,
                              "unit_price",
                              e.target
                                .value
                            )
                          }
                          placeholder="₹ Price"
                        />
                      </div>

                      {/* DELETE */}

                      <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() =>
                          removeItem(
                            index
                          )
                        }
                        disabled={
                          form.items
                            .length ===
                          1
                        }
                        style={{
                          height: 38,
                          width: 38,
                          padding: 0,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          color:
                            form.items
                              .length ===
                            1
                              ? "#d1d5db"
                              : "#ef4444",
                        }}
                        title="Remove Product"
                      >
                        <BsTrashFill
                          size={12}
                        />
                      </button>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "flex-end",
                        marginTop: 8,
                        fontSize: 11,
                        color: "#6b7280",
                      }}
                    >
                      Item Total:&nbsp;
                      <b
                        style={{
                          color:
                            "#111827",
                        }}
                      >
                        {fmt(
                          lineTotal
                        )}
                      </b>
                    </div>
                  </div>
                );
              }
            )}

            {/* TOTAL */}

            <div
              style={{
                marginTop: 12,
                background:
                  "#eef2ff",
                borderRadius: 8,
                padding:
                  "12px 14px",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color:
                    "#374151",
                  fontSize: 13,
                }}
              >
                Calculated Total
              </span>

              <span
                style={{
                  fontWeight: 800,
                  color:
                    "#6366f1",
                  fontSize: 17,
                }}
              >
                {fmt(
                  calculatedTotal
                )}
              </span>
            </div>
          </div>
        )}

        {/* EDIT TOTAL DISPLAY */}

        {!isNew && (
          <div
            style={{
              marginTop: 14,
              background:
                "#f9fafb",
              border:
                "1px solid #e5e7eb",
              borderRadius: 8,
              padding:
                "10px 12px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#9ca3af",
                fontWeight: 600,
                textTransform:
                  "uppercase",
              }}
            >
              Current Total
            </span>

            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#111827",
                marginTop: 3,
              }}
            >
              {fmt(
                purchase.total
              )}
            </div>

            <small
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              Total amount is not part of
              the PATCH request body.
            </small>
          </div>
        )}

        {/* REMARKS */}

        <div
          className="ec-field"
          style={{
            marginTop: 14,
          }}
        >
          <label>
            Remarks
          </label>

          <textarea
            className="ec-input"
            rows={3}
            value={form.remarks}
            onChange={(e) =>
              set(
                "remarks",
                e.target.value
              )
            }
            placeholder="Enter purchase order remarks"
            style={{
              resize: "vertical",
              minHeight: 80,
            }}
          />
        </div>

        {/* EDIT NOTE */}

        {!isNew && (
          <div
            style={{
              marginTop: 14,
              background:
                "#fffbeb",
              border:
                "1px solid #fde68a",
              borderRadius: 8,
              padding:
                "9px 11px",
              fontSize: 11,
              color: "#92400e",
            }}
          >
            This Purchase Order can be
            edited only while its backend
            status is <b>draft</b>.
          </div>
        )}

        {/* BUTTONS */}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent:
              "flex-end",
            marginTop: 20,
          }}
        >
          <button
            className="adm-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="adm-btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              "Saving..."
            ) : isNew ? (
              <>
                <BsPlus size={16} />
                Create Purchase
              </>
            ) : (
              <>
                <BsCheckCircleFill
                  size={13}
                />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   PURCHASE DETAILS MODAL
===================================================== */

const PurchaseDetailsModal = ({
  purchase,
  onClose,
}) => {
  if (!purchase) return null;

  const sc =
    STATUS_CONFIG[
      purchase.status
    ] ||
    STATUS_CONFIG.Pending;

  const rawItems = Array.isArray(
    purchase?.rawData?.items
  )
    ? purchase.rawData.items
    : [];

  return (
    <div
      className="ec-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ec-modal"
        style={{
          maxWidth: 650,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="ec-modal-header">
          <div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
              }}
            >
              Purchase {purchase.id}
            </h3>

            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 2,
              }}
            >
              Purchase order details
            </p>
          </div>

          <button
            className="ec-modal-close"
            onClick={onClose}
          >
            <BsXCircleFill size={16} />
          </button>
        </div>

        {/* DETAILS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 12,
          }}
        >
          {[
            [
              "Purchase Order",
              purchase.id,
            ],
            [
              "Supplier",
              purchase.supplier,
            ],
            [
              "Supplier ID",
              purchase.supplierId,
            ],
            [
              "Store ID",
              purchase.storeId,
            ],
            [
              "Purchase Date",
              purchase.purchaseDate,
            ],
            [
              "Items",
              `${purchase.items} items`,
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                style={{
                  background:
                    "#f9fafb",
                  borderRadius: 8,
                  padding:
                    "10px 12px",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    fontWeight: 600,
                    textTransform:
                      "uppercase",
                  }}
                >
                  {label}
                </p>

                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#111827",
                    marginTop: 3,
                  }}
                >
                  {value ?? "-"}
                </p>
              </div>
            )
          )}
        </div>

        {/* STATUS */}

        <div
          style={{
            marginTop: 14,
          }}
        >
          <span
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: 5,
              padding:
                "5px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              background:
                sc.bg,
              color:
                sc.color,
            }}
          >
            {sc.icon}
            {purchase.status}
          </span>
        </div>

        {/* ITEMS */}

        {rawItems.length > 0 && (
          <div
            style={{
              marginTop: 16,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Purchase Items
            </p>

            <div
              style={{
                border:
                  "1px solid #e5e7eb",
                borderRadius: 8,
                overflow:
                  "hidden",
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
                    }}
                  >
                    {[
                      "Product ID",
                      "Quantity",
                      "Unit Price",
                      "Total",
                    ].map(
                      (heading) => (
                        <th
                          key={
                            heading
                          }
                          style={{
                            padding:
                              "8px 10px",
                            textAlign:
                              heading ===
                                "Unit Price" ||
                              heading ===
                                "Total"
                                ? "right"
                                : "left",
                            fontSize: 10,
                            color:
                              "#6b7280",
                          }}
                        >
                          {
                            heading
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rawItems.map(
                    (
                      item,
                      index
                    ) => (
                      <tr
                        key={
                          item?.id ??
                          index
                        }
                        style={{
                          borderTop:
                            "1px solid #f3f4f6",
                        }}
                      >
                        <td
                          style={{
                            padding:
                              "8px 10px",
                            fontSize: 11,
                            color:
                              "#374151",
                          }}
                        >
                          {item?.product_id ??
                            "-"}
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 10px",
                            fontSize: 11,
                            color:
                              "#374151",
                          }}
                        >
                          {item?.quantity ??
                            0}
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 10px",
                            textAlign:
                              "right",
                            fontSize: 11,
                            color:
                              "#374151",
                          }}
                        >
                          {fmt(
                            item?.unit_price
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "8px 10px",
                            textAlign:
                              "right",
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              "#111827",
                          }}
                        >
                          {fmt(
                            item?.total
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REMARKS */}

        {purchase.remarks && (
          <div
            style={{
              marginTop: 14,
              background:
                "#f9fafb",
              borderRadius: 8,
              padding:
                "10px 12px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "#9ca3af",
                fontWeight: 600,
                textTransform:
                  "uppercase",
              }}
            >
              Remarks
            </p>

            <p
              style={{
                fontSize: 12,
                color: "#374151",
                marginTop: 4,
              }}
            >
              {purchase.remarks}
            </p>
          </div>
        )}

        {/* TOTAL */}

        <div
          style={{
            marginTop: 16,
            background:
              "#eef2ff",
            borderRadius: 8,
            padding:
              "12px 14px",
            display: "flex",
            justifyContent:
              "space-between",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Total Amount
          </span>

          <span
            style={{
              fontWeight: 800,
              color: "#6366f1",
              fontSize: 16,
            }}
          >
            {fmt(
              purchase.total
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   PURCHASES PAGE
===================================================== */

const Purchases = () => {
  const [purchases, setPurchases] =
    useState([]);

  const [suppliers, setSuppliers] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [stores, setStores] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [modal, setModal] =
    useState(null);

  /* =====================================================
     LOAD PURCHASE ORDERS
  ===================================================== */

  const loadPurchases = async (
    showLoader = true
  ) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const data =
        await getPurchaseOrders(
          1,
          PURCHASE_FETCH_SIZE
        );

      console.log(
        "Purchase Orders API:",
        data
      );

      const purchaseList =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data?.items
            )
          ? data.items
          : [];

      setPurchases(
        purchaseList.map(
          (po) =>
            mapPurchaseOrder(
              po,
              suppliers
            )
        )
      );
    } catch (err) {
      console.error(
        "Purchase Orders API Error:",
        err
      );

      console.error(
        "Status:",
        err?.response?.status
      );

      console.error(
        "Response:",
        err?.response?.data
      );

      setError(
        err?.response?.data
          ?.detail?.message ||
          err?.response?.data
            ?.message ||
          "Failed to load purchase orders"
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const fetchInitialData =
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            purchaseResponse,
            supplierResponse,
            productResponse,
            storeResponse,
          ] =
            await Promise.allSettled([
              getPurchaseOrders(
                1,
                PURCHASE_FETCH_SIZE
              ),

              getSuppliers(),

              axiosInstance.get(
                "/api/v1/products"
              ),

              axiosInstance.get(
                "/api/v1/stores/"
              ),
            ]);

          /* PURCHASE ORDERS */

          if (
            purchaseResponse.status ===
            "fulfilled"
          ) {
            const data =
              purchaseResponse.value;

            const purchaseList =
              Array.isArray(data)
                ? data
                : Array.isArray(
                    data?.items
                  )
                ? data.items
                : [];

            setPurchases(
              purchaseList.map(
                (po) =>
                  mapPurchaseOrder(
                    po,
                    []
                  )
              )
            );
          } else {
            console.error(
              "Purchase Orders API Error:",
              purchaseResponse.reason
            );

            setError(
              "Failed to load purchase orders"
            );
          }

          /* SUPPLIERS */

          if (
            supplierResponse.status ===
            "fulfilled"
          ) {
            const suppliersData =
              supplierResponse.value;

            const supplierList =
              Array.isArray(
                suppliersData
              )
                ? suppliersData
                : Array.isArray(
                    suppliersData?.items
                  )
                ? suppliersData.items
                : [];

            setSuppliers(
              supplierList
            );
          } else {
            console.error(
              "Suppliers API Error:",
              supplierResponse.reason
            );
          }

          /* PRODUCTS */

          if (
            productResponse.status ===
            "fulfilled"
          ) {
            const productResponseData =
              productResponse.value
                ?.data;

            const productList =
              Array.isArray(
                productResponseData
              )
                ? productResponseData
                : Array.isArray(
                    productResponseData?.items
                  )
                ? productResponseData.items
                : Array.isArray(
                    productResponseData?.data
                  )
                ? productResponseData.data
                : [];

            setProducts(
              productList
            );

            console.log(
              "Products API:",
              productList
            );
          } else {
            console.error(
              "Products API Error:",
              productResponse.reason
            );
          }

          /* STORES */

          if (
            storeResponse.status ===
            "fulfilled"
          ) {
            const storeResponseData =
              storeResponse.value
                ?.data;

            const storeList =
              Array.isArray(
                storeResponseData
              )
                ? storeResponseData
                : Array.isArray(
                    storeResponseData?.items
                  )
                ? storeResponseData.items
                : Array.isArray(
                    storeResponseData?.data
                  )
                ? storeResponseData.data
                : [];

            setStores(
              storeList
            );

            console.log(
              "Stores API:",
              storeList
            );
          } else {
            console.error(
              "Stores API Error:",
              storeResponse.reason
            );
          }
        } catch (err) {
          console.error(
            "Initial Purchase Page Error:",
            err
          );

          setError(
            "Failed to load purchase data"
          );
        } finally {
          setLoading(false);
        }
      };

    fetchInitialData();
  }, []);

  /* =====================================================
     UPDATE SUPPLIER NAMES
  ===================================================== */

  useEffect(() => {
    if (!suppliers.length) {
      return;
    }

    setPurchases(
      (prev) =>
        prev.map(
          (purchase) => ({
            ...purchase,

            supplier:
              getSupplierDisplayName(
                purchase.supplierId,
                suppliers
              ),
          })
        )
    );
  }, [suppliers]);

  /* =====================================================
     VIEW PURCHASE ORDER
  ===================================================== */

  const handleView = async (
    purchase
  ) => {
    try {
      setError("");

      const actualId =
        purchase?.rawData?.id;

      if (!actualId) {
        alert(
          "Purchase Order ID not found"
        );
        return;
      }

      const response =
        await getPurchaseOrderById(
          actualId
        );

      console.log(
        "Purchase Details API:",
        response
      );

      const detailData =
        response?.data ||
        response;

      const normalizedPurchase =
        mapPurchaseOrder(
          detailData,
          suppliers,
          purchase
        );

      setModal({
        type: "view",
        purchase:
          normalizedPurchase,
      });
    } catch (err) {
      console.error(
        "Get Purchase Details Error:",
        err
      );

      const message =
        err?.response?.data
          ?.detail?.message ||
        err?.response?.data
          ?.detail ||
        err?.response?.data
          ?.message ||
        "Failed to load purchase order details.";

      alert(
        typeof message ===
          "string"
          ? message
          : "Failed to load purchase order details."
      );
    }
  };

  /* =====================================================
     RECEIVE PURCHASE ORDER
  ===================================================== */

  const handleReceive = async (
    purchase
  ) => {
    try {
      setError("");

      const actualId =
        purchase?.rawData?.id;

      if (!actualId) {
        alert(
          "Purchase Order ID not found"
        );
        return;
      }

      console.log(
        "========== RECEIVE PURCHASE =========="
      );

      console.log(
        "Purchase ID:",
        actualId
      );

      const received =
        await receivePurchaseOrder(
          actualId
        );

      console.log(
        "RECEIVE RESPONSE:",
        received
      );

      await loadPurchases(
        false
      );

      alert(
        "Purchase Order received successfully!"
      );
    } catch (err) {
      console.error(
        "========== RECEIVE PURCHASE ERROR =========="
      );

      console.error(
        "FULL ERROR:",
        err
      );

      console.error(
        "STATUS:",
        err?.response?.status
      );

      console.error(
        "RESPONSE:",
        err?.response?.data
      );

      const message =
        err?.response?.data
          ?.detail?.message ||
        err?.response?.data
          ?.detail ||
        err?.response?.data
          ?.message ||
        "Failed to receive purchase order";

      alert(
        typeof message ===
          "string"
          ? message
          : "Failed to receive purchase order"
      );
    }
  };

  /* =====================================================
     STATUS UPDATE
  ===================================================== */

  const handleStatusChange = async (
    purchase,
    newStatus
  ) => {
    if (
      !purchase ||
      !newStatus ||
      newStatus ===
        purchase.status
    ) {
      return;
    }

    try {
      setError("");

      const actualId =
        purchase?.rawData?.id;

      if (!actualId) {
        alert(
          "Purchase Order ID not found"
        );
        return;
      }

      const backendStatus =
        getBackendStatus(
          newStatus
        );

      console.log(
        "========== UPDATE PURCHASE STATUS =========="
      );

      console.log(
        "Purchase ID:",
        actualId
      );

      console.log(
        "UI Status:",
        newStatus
      );

      console.log(
        "Backend Status:",
        backendStatus
      );

      const response =
        await updatePurchaseOrderStatus(
          actualId,
          {
            status:
              backendStatus,
          }
        );

      console.log(
        "STATUS UPDATE RESPONSE:",
        response
      );

      await loadPurchases(
        false
      );

      alert(
        "Purchase Order status updated successfully!"
      );
    } catch (err) {
      console.error(
        "========== STATUS UPDATE ERROR =========="
      );

      console.error(
        "FULL ERROR:",
        err
      );

      console.error(
        "STATUS:",
        err?.response?.status
      );

      console.error(
        "RESPONSE:",
        err?.response?.data
      );

      const message =
        err?.response?.data
          ?.detail?.message ||
        err?.response?.data
          ?.detail ||
        err?.response?.data
          ?.message ||
        "Failed to update purchase order status";

      alert(
        typeof message ===
          "string"
          ? message
          : "Failed to update purchase order status"
      );

      await loadPurchases(
        false
      );
    }
  };

  /* =====================================================
     SAVE PURCHASE
  ===================================================== */

  const handleSave = async (
    form
  ) => {
    try {
      setError("");

      /* =============================================
         CREATE PURCHASE
         
         POST:
         /api/v1/purchase-orders

         EXACT BACKEND BODY:

         {
           supplier_id,
           store_id,
           remarks,
           items: [
             {
               product_id,
               quantity,
               unit_price
             }
           ]
         }
      ============================================= */

      if (modal === "new") {
        const payload = {
          supplier_id:
            Number(form.supplier),

          store_id:
            Number(form.store),

          remarks:
            form.remarks?.trim() ||
            "",

          items:
            form.items.map(
              (item) => ({
                product_id:
                  Number(
                    item.product_id
                  ),

                quantity:
                  Number(
                    item.quantity
                  ),

                unit_price:
                  Number(
                    item.unit_price
                  ),
              })
            ),
        };

        console.log(
          "========== CREATE PURCHASE =========="
        );

        console.log(
          "FORM:",
          form
        );

        console.log(
          "POST PAYLOAD:",
          payload
        );

        const created =
          await createPurchaseOrder(
            payload
          );

        console.log(
          "CREATE RESPONSE:",
          created
        );

        setModal(null);

        await loadPurchases(
          false
        );

        alert(
          "Purchase Order created successfully!"
        );

        return;
      }

      /* =============================================
         EDIT PURCHASE

         PATCH:
         /api/v1/purchase-orders/{id}

         EXACT BACKEND BODY:

         {
           supplier_id,
           store_id,
           remarks
         }

         Only draft can be updated.
      ============================================= */

      if (
        modal?.rawData?.id
      ) {
        const actualId =
          modal.rawData.id;

        const currentBackendStatus =
          String(
            modal?.rawData?.status ||
              ""
          ).toLowerCase();

        if (
          currentBackendStatus !==
          "draft"
        ) {
          alert(
            "Only draft purchase orders can be updated."
          );
          return;
        }

        const payload = {
          supplier_id:
            Number(form.supplier),

          store_id:
            Number(form.store),

          remarks:
            form.remarks?.trim() ||
            "",
        };

        console.log(
          "========== UPDATE PURCHASE =========="
        );

        console.log(
          "Purchase ID:",
          actualId
        );

        console.log(
          "PATCH PAYLOAD:",
          payload
        );

        const updated =
          await updatePurchaseOrder(
            actualId,
            payload
          );

        console.log(
          "UPDATE RESPONSE:",
          updated
        );

        setModal(null);

        await loadPurchases(
          false
        );

        alert(
          "Purchase Order updated successfully!"
        );
      }
    } catch (err) {
      console.error(
        "========== PURCHASE SAVE ERROR =========="
      );

      console.error(
        "FULL ERROR:",
        err
      );

      console.error(
        "STATUS:",
        err?.response?.status
      );

      console.error(
        "RESPONSE DATA:",
        err?.response?.data
      );

      console.error(
        "REQUEST DATA:",
        err?.config?.data
      );

      const apiError =
        err?.response?.data;

      const message =
        apiError?.detail
          ?.message ||
        apiError?.detail ||
        apiError?.message ||
        "Failed to save purchase";

      alert(
        typeof message ===
          "string"
          ? message
          : JSON.stringify(
              message,
              null,
              2
            )
      );

      setError(
        typeof message ===
          "string"
          ? message
          : "Failed to save purchase"
      );
    }
  };

  /* =====================================================
     EDIT HANDLER
  ===================================================== */

  const handleEdit = (
    purchase
  ) => {
    const backendStatus =
      String(
        purchase?.rawData?.status ||
          ""
      ).toLowerCase();

    if (
      backendStatus !==
      "draft"
    ) {
      alert(
        "Only draft purchase orders can be updated."
      );
      return;
    }

    setModal(purchase);
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filtered =
    purchases.filter(
      (purchase) => {
        const q =
          search
            .trim()
            .toLowerCase();

        const matchSearch =
          !q ||
          purchase.id
            ?.toLowerCase()
            .includes(q) ||
          purchase.supplier
            ?.toLowerCase()
            .includes(q);

        const matchStatus =
          filterStatus ===
            "All" ||
          purchase.status ===
            filterStatus;

        return (
          matchSearch &&
          matchStatus
        );
      }
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
          PAGE_SIZE
      )
    );

  const paginated =
    filtered.slice(
      (page - 1) *
        PAGE_SIZE,
      page *
        PAGE_SIZE
    );

  /* =====================================================
     KPI
  ===================================================== */

  const totalPurchaseAmount =
    purchases.reduce(
      (sum, purchase) =>
        sum +
        Number(
          purchase.total || 0
        ),
      0
    );

  const pendingCount =
    purchases.filter(
      (purchase) =>
        purchase.status ===
        "Pending"
    ).length;

  const receivedCount =
    purchases.filter(
      (purchase) =>
        purchase.status ===
        "Received"
    ).length;

  const kpis = [
    {
      label:
        "Total Purchase Orders",
      value:
        purchases.length,
      color: "#6366f1",
      icon: <BsCart3 size={20} />,
    },

    {
      label: "Received",
      value:
        receivedCount,
      color: "#10b981",
      icon: <BsCheckCircleFill size={20} />,
    },

    {
      label: "Pending",
      value:
        pendingCount,
      color: "#f59e0b",
      icon: <BsClockHistory size={20} />,
    },

    {
      label:
        "Purchase Value",
      value: fmt(
        totalPurchaseAmount
      ),
      color: "#0ea5e9",
      icon: <span style={{ fontWeight: 800 }}>₹</span>,
    },
  ];

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="dash-page">

      {/* HEADER */}

      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">
            <BsCart3 size={20} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Purchases
          </h1>

          <p className="adm-page-sub">
            Manage purchase orders,
            suppliers and incoming
            stock
          </p>
        </div>

        <div className="adm-header-actions">
          <button
            className="adm-btn-primary"
            onClick={() =>
              setModal("new")
            }
          >
            <BsPlus size={17} />
            Add Purchase
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            background:
              "#fef2f2",
            color:
              "#dc2626",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div
          style={{
            padding: 20,
            textAlign:
              "center",
            color:
              "#6b7280",
          }}
        >
          Loading purchases...
        </div>
      )}

      {/* KPIs */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {kpis.map(
          (k, i) => (
            <div
              key={i}
              className="adm-kpi-card"
              style={{
                padding:
                  "14px 18px",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                }}
              >
                {k.icon}
              </span>

              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    "#9ca3af",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.05em",
                  marginTop: 8,
                }}
              >
                {k.label}
              </p>

              <p
                style={{
                  fontSize:
                    i === 3
                      ? 16
                      : 26,
                  fontWeight: 800,
                  color:
                    k.color,
                  marginTop: 4,
                }}
              >
                {k.value}
              </p>
            </div>
          )
        )}
      </div>

      {/* SEARCH + FILTER */}

      <div
        style={{
          background:
            "#fff",
          border:
            "1px solid #e8eaf0",
          borderRadius: 12,
          padding:
            "14px 16px",
          display: "flex",
          gap: 12,
          flexWrap:
            "wrap",
          alignItems:
            "center",
          marginTop: 16,
        }}
      >
        <div
          style={{
            position:
              "relative",
            flex: 1,
            minWidth: 220,
          }}
        >
          <BsSearch
            size={13}
            style={{
              position:
                "absolute",
              left: 11,
              top: "50%",
              transform:
                "translateY(-50%)",
              color:
                "#9ca3af",
            }}
          />

          <input
            className="ec-input"
            style={{
              paddingLeft: 32,
            }}
            placeholder="Search purchase ID or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(
                e.target.value
              );
              setPage(1);
            }}
          />
        </div>

        <select
          className="ec-input"
          style={{
            minWidth: 150,
          }}
          value={
            filterStatus
          }
          onChange={(e) => {
            setFilterStatus(
              e.target.value
            );
            setPage(1);
          }}
        >
          <option value="All">
            All Status
          </option>

          {Object.keys(
            STATUS_CONFIG
          ).map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            )
          )}
        </select>
      </div>

      {/* TABLE */}

      <div
        className="chart-card"
        style={{
          padding: 0,
          overflow:
            "hidden",
          marginTop: 16,
        }}
      >
        <div
          style={{
            overflowX:
              "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 950,
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
                  "Purchase ID",
                  "Supplier",
                  "Store",
                  "Date",
                  "Items",
                  "Total",
                  "Status",
                  "Actions",
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
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
                        letterSpacing:
                          "0.05em",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {
                        heading
                      }
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {paginated.map(
                (purchase) => {
                  const sc =
                    STATUS_CONFIG[
                      purchase.status
                    ] ||
                    STATUS_CONFIG.Pending;

                  const isDraft =
                    String(
                      purchase
                        ?.rawData
                        ?.status ||
                        ""
                    ).toLowerCase() ===
                    "draft";

                  return (
                    <tr
                      key={
                        purchase.backendId ||
                        purchase.id
                      }
                      style={{
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      {/* PURCHASE ID */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontFamily:
                            "monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            "#6b7280",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          purchase.id
                        }
                      </td>

                      {/* SUPPLIER */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color:
                              "#111827",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            purchase.supplier
                          }
                        </p>

                        <span
                          style={{
                            fontSize: 10,
                            color:
                              "#9ca3af",
                          }}
                        >
                          ID:{" "}
                          {
                            purchase.supplierId ??
                            "-"
                          }
                        </span>
                      </td>

                      {/* STORE */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 12,
                          color:
                            "#6b7280",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {purchase.storeId
                          ? `Store #${purchase.storeId}`
                          : "-"}
                      </td>

                      {/* DATE */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 12,
                          color:
                            "#6b7280",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          purchase.purchaseDate
                        }
                      </td>

                      {/* ITEMS */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 13,
                          color:
                            "#374151",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          purchase.items
                        }{" "}
                        items
                      </td>

                      {/* TOTAL */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          color:
                            "#111827",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {fmt(
                          purchase.total
                        )}
                      </td>

                      {/* STATUS */}

                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <select
                          value={
                            purchase.status
                          }
                          onChange={(e) =>
                            handleStatusChange(
                              purchase,
                              e.target.value
                            )
                          }
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            padding:
                              "5px 8px",
                            borderRadius:
                              20,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              sc.bg,
                            color:
                              sc.color,
                            border:
                              `1px solid ${sc.color}33`,
                            cursor:
                              "pointer",
                            outline:
                              "none",
                          }}
                        >
                          <option value="Pending">
                            Pending
                          </option>

                          <option value="Received">
                            Received
                          </option>

                          <option value="Cancelled">
                            Cancelled
                          </option>
                        </select>
                      </td>

                      {/* ACTIONS */}

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
                          {/* VIEW */}

                          <button
                            className="adm-btn-secondary"
                            style={{
                              padding:
                                "5px 9px",
                            }}
                            onClick={() =>
                              handleView(
                                purchase
                              )
                            }
                            title="View"
                          >
                            <BsEye
                              size={11}
                            />
                          </button>

                          {/* RECEIVE */}

                          {purchase.status ===
                            "Pending" && (
                            <button
                              className="adm-btn-primary"
                              style={{
                                padding:
                                  "5px 9px",
                                fontSize: 11,
                              }}
                              onClick={() =>
                                handleReceive(
                                  purchase
                                )
                              }
                              title="Receive Purchase"
                            >
                              <BsCheckCircleFill
                                size={11}
                              />
                            </button>
                          )}

                          {/* EDIT ONLY DRAFT */}

                          {isDraft && (
                            <button
                              className="adm-btn-secondary"
                              style={{
                                padding:
                                  "5px 9px",
                              }}
                              onClick={() =>
                                handleEdit(
                                  purchase
                                )
                              }
                              title="Edit Draft Purchase Order"
                            >
                              <BsPencilFill
                                size={11}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}

              {paginated.length ===
                0 &&
                !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: 40,
                        textAlign:
                          "center",
                        color:
                          "#9ca3af",
                        fontSize: 14,
                      }}
                    >
                      No purchases found
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              padding:
                "12px 16px",
              borderTop:
                "1px solid #f3f4f6",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color:
                  "#6b7280",
              }}
            >
              Showing{" "}
              {(page - 1) *
                PAGE_SIZE +
                1}
              –
              {Math.min(
                page *
                  PAGE_SIZE,
                filtered.length
              )}{" "}
              of{" "}
              {
                filtered.length
              }
            </span>

            <div
              style={{
                display:
                  "flex",
                gap: 6,
              }}
            >
              <button
                className="adm-btn-secondary"
                style={{
                  padding:
                    "5px 10px",
                }}
                disabled={
                  page === 1
                }
                onClick={() =>
                  setPage(
                    (p) =>
                      p - 1
                  )
                }
              >
                <BsChevronLeft
                  size={12}
                />
              </button>

              {Array.from(
                {
                  length:
                    totalPages,
                },
                (_, i) =>
                  i + 1
              ).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setPage(
                        p
                      )
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius:
                        6,
                      border: `1.5px solid ${
                        p ===
                        page
                          ? "#6366f1"
                          : "#e5e7eb"
                      }`,
                      background:
                        p ===
                        page
                          ? "#eef2ff"
                          : "#fff",
                      color:
                        p ===
                        page
                          ? "#6366f1"
                          : "#6b7280",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        "pointer",
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className="adm-btn-secondary"
                style={{
                  padding:
                    "5px 10px",
                }}
                disabled={
                  page ===
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (p) =>
                      p + 1
                  )
                }
              >
                <BsChevronRight
                  size={12}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}

      {modal &&
        modal !== "new" &&
        modal.type !==
          "view" && (
          <PurchaseFormModal
            purchase={
              modal
            }
            suppliers={
              suppliers
            }
            products={
              products
            }
            stores={
              stores
            }
            onClose={() =>
              setModal(null)
            }
            onSave={
              handleSave
            }
          />
        )}

      {modal ===
        "new" && (
        <PurchaseFormModal
          purchase={null}
          suppliers={
            suppliers
          }
          products={
            products
          }
          stores={
            stores
          }
          onClose={() =>
            setModal(null)
          }
          onSave={
            handleSave
          }
        />
      )}

      {/* VIEW MODAL */}

      {modal?.type ===
        "view" && (
        <PurchaseDetailsModal
          purchase={
            modal.purchase
          }
          onClose={() =>
            setModal(null)
          }
        />
      )}
    </div>
  );
};

export default Purchases;
