import React, { useEffect, useState } from "react";
import {
  getPurchaseOrderReturns,
  getPurchaseOrderReturnById,
  updatePurchaseOrderReturn,
  approvePurchaseOrderReturn,
  rejectPurchaseOrderReturn,
  completePurchaseOrderReturn,
  createPurchaseOrderReturn,
} from "../../services/purchaseOrderReturnsService";

import "./PurchaseOrderReturns.css";

const PurchaseOrderReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedReturn, setSelectedReturn] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [editingReturn, setEditingReturn] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    reason: "",
    remarks: "",
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    purchase_order_id: "",
    reason: "",
    remarks: "",
    purchase_order_item_id: "",
    product_id: "",
    quantity: "",
  });

  // =====================================================
  // Get All Purchase Order Returns
  // =====================================================
  const fetchPurchaseOrderReturns = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getPurchaseOrderReturns(page, pageSize);

      console.log("Purchase Order Returns:", data);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setReturns(list);
    } catch (err) {
      console.error(
        "Failed to fetch purchase order returns:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to load purchase order returns.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      }

      setError(message);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrderReturns();
  }, [page]);

  // =====================================================
  // Get Purchase Order Return By ID
  // =====================================================
  const handleViewDetails = async (returnId) => {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setSelectedReturn(null);

      const data = await getPurchaseOrderReturnById(returnId);

      console.log("Purchase Order Return Details:", data);

      setSelectedReturn(data);
    } catch (err) {
      console.error(
        "Failed to fetch purchase order return details:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to load purchase order return details.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      }

      setDetailsError(message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedReturn(null);
    setDetailsError("");
  };

  // =====================================================
  // Edit Purchase Order Return
  // =====================================================
  const handleEditReturn = (item) => {
    setEditingReturn(item);

    setEditForm({
      reason: item?.reason || "",
      remarks: item?.remarks || "",
    });

    setActionError("");
    setActionSuccess("");
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCancelEdit = () => {
    setEditingReturn(null);

    setEditForm({
      reason: "",
      remarks: "",
    });
  };

  // =====================================================
  // Update Purchase Order Return
  // =====================================================
  const handleUpdateReturn = async (event) => {
    event.preventDefault();

    if (!editingReturn?.id) {
      setActionError(
        "No purchase order return selected for update."
      );
      setActionSuccess("");
      return;
    }

    if (
      String(editingReturn.status || "").toLowerCase() !==
      "requested"
    ) {
      setActionError("Only requested returns can be updated.");
      setActionSuccess("");
      return;
    }

    if (
      !editForm.reason.trim() ||
      !editForm.remarks.trim()
    ) {
      setActionError("Reason and remarks are required.");
      setActionSuccess("");
      return;
    }

    try {
      setUpdating(true);
      setActionError("");
      setActionSuccess("");

      const payload = {
        reason: editForm.reason.trim(),
        remarks: editForm.remarks.trim(),
      };

      const data = await updatePurchaseOrderReturn(
        editingReturn.id,
        payload
      );

      console.log(
        "Purchase Order Return Updated:",
        data
      );

      const updatedId = editingReturn.id;

      setActionSuccess(
        "Purchase Order Return #" +
          updatedId +
          " updated successfully."
      );

      setEditingReturn(null);

      setEditForm({
        reason: "",
        remarks: "",
      });

      await fetchPurchaseOrderReturns();

      if (selectedReturn?.id === updatedId) {
        try {
          const updatedReturn =
            await getPurchaseOrderReturnById(updatedId);

          setSelectedReturn(updatedReturn);
        } catch (detailsErr) {
          console.error(
            "Failed to refresh return details:",
            detailsErr
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to update purchase order return:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to update purchase order return.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      } else if (Array.isArray(detail)) {
        message =
          detail
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(" | ") || message;
      }

      setActionError(message);
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // Approve Purchase Order Return
  // =====================================================
  const handleApprove = async (returnId) => {
    const confirmed = window.confirm(
      "Are you sure you want to approve Purchase Order Return #" +
        returnId +
        "?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setApprovingId(returnId);
      setActionError("");
      setActionSuccess("");

      const data = await approvePurchaseOrderReturn(returnId);

      console.log(
        "Purchase Order Return Approved:",
        data
      );

      setActionSuccess(
        "Purchase Order Return #" +
          returnId +
          " approved successfully."
      );

      await fetchPurchaseOrderReturns();

      if (selectedReturn?.id === returnId) {
        try {
          const updatedReturn =
            await getPurchaseOrderReturnById(returnId);

          setSelectedReturn(updatedReturn);
        } catch (detailsErr) {
          console.error(
            "Failed to refresh return details:",
            detailsErr
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to approve purchase order return:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to approve purchase order return.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      }

      setActionError(message);
    } finally {
      setApprovingId(null);
    }
  };

  // =====================================================
  // Reject Purchase Order Return
  // =====================================================
  const handleReject = async (returnId) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject Purchase Order Return #" +
        returnId +
        "?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setRejectingId(returnId);
      setActionError("");
      setActionSuccess("");

      const data = await rejectPurchaseOrderReturn(returnId);

      console.log(
        "Purchase Order Return Rejected:",
        data
      );

      setActionSuccess(
        "Purchase Order Return #" +
          returnId +
          " rejected successfully."
      );

      await fetchPurchaseOrderReturns();

      if (selectedReturn?.id === returnId) {
        try {
          const updatedReturn =
            await getPurchaseOrderReturnById(returnId);

          setSelectedReturn(updatedReturn);
        } catch (detailsErr) {
          console.error(
            "Failed to refresh return details:",
            detailsErr
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to reject purchase order return:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to reject purchase order return.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      }

      setActionError(message);
    } finally {
      setRejectingId(null);
    }
  };

  // =====================================================
  // Complete Purchase Order Return
  // =====================================================
  const handleComplete = async (returnId) => {
    const confirmed = window.confirm(
      "Are you sure you want to complete Purchase Order Return #" +
        returnId +
        "?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCompletingId(returnId);
      setActionError("");
      setActionSuccess("");

      const data =
        await completePurchaseOrderReturn(returnId);

      console.log(
        "Purchase Order Return Completed:",
        data
      );

      setActionSuccess(
        "Purchase Order Return #" +
          returnId +
          " completed successfully."
      );

      await fetchPurchaseOrderReturns();

      if (selectedReturn?.id === returnId) {
        try {
          const updatedReturn =
            await getPurchaseOrderReturnById(returnId);

          setSelectedReturn(updatedReturn);
        } catch (detailsErr) {
          console.error(
            "Failed to refresh return details:",
            detailsErr
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to complete purchase order return:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to complete purchase order return.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      }

      setActionError(message);
    } finally {
      setCompletingId(null);
    }
  };

  // =====================================================
  // Create Purchase Order Return
  // =====================================================
  const handleCreateInputChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateReturn = async (event) => {
    event.preventDefault();

    if (
      !createForm.purchase_order_id ||
      !createForm.reason.trim() ||
      !createForm.remarks.trim() ||
      !createForm.purchase_order_item_id ||
      !createForm.product_id ||
      !createForm.quantity
    ) {
      setActionError(
        "Please fill all Create Return fields."
      );
      setActionSuccess("");
      return;
    }

    try {
      setCreating(true);
      setActionError("");
      setActionSuccess("");

      const payload = {
        purchase_order_id: Number(
          createForm.purchase_order_id
        ),
        reason: createForm.reason.trim(),
        remarks: createForm.remarks.trim(),
        items: [
          {
            purchase_order_item_id: Number(
              createForm.purchase_order_item_id
            ),
            product_id: Number(createForm.product_id),
            quantity: Number(createForm.quantity),
          },
        ],
      };

      const data =
        await createPurchaseOrderReturn(payload);

      console.log(
        "Purchase Order Return Created:",
        data
      );

      setActionSuccess(
        "Purchase Order Return #" +
          (data?.id ?? "") +
          " created successfully."
      );

      setShowCreateForm(false);

      setCreateForm({
        purchase_order_id: "",
        reason: "",
        remarks: "",
        purchase_order_item_id: "",
        product_id: "",
        quantity: "",
      });

      if (page !== 1) {
        setPage(1);
      } else {
        await fetchPurchaseOrderReturns();
      }
    } catch (err) {
      console.error(
        "Failed to create purchase order return:",
        err
      );

      const detail = err?.response?.data?.detail;

      let message =
        err?.response?.data?.message ||
        "Failed to create purchase order return.";

      if (typeof detail === "string") {
        message = detail;
      } else if (detail?.message) {
        message = detail.message;
      } else if (Array.isArray(detail)) {
        message =
          detail
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(" | ") || message;
      }

      setActionError(message);
    } finally {
      setCreating(false);
    }
  };

  // =====================================================
  // Search + Status Filter
  // =====================================================
  const filteredReturns = returns.filter((item) => {
    const searchValue = searchTerm
      .trim()
      .toLowerCase();

    const matchesSearch =
      searchValue === "" ||
      String(item.id ?? "")
        .toLowerCase()
        .includes(searchValue) ||
      String(item.purchase_order_id ?? "")
        .toLowerCase()
        .includes(searchValue) ||
      String(item.reason ?? "")
        .toLowerCase()
        .includes(searchValue) ||
      String(item.remarks ?? "")
        .toLowerCase()
        .includes(searchValue);

    const matchesStatus =
      statusFilter === "all" ||
      String(item.status ?? "").toLowerCase() ===
        statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN");
  };

  return (
    <div className="purchase-order-returns-page">
      <div className="purchase-order-returns-header">
        <div>
          <h2>Purchase Order Returns</h2>
          <p>View and manage purchase order returns.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm(
              (current) => !current
            );
            setActionError("");
            setActionSuccess("");
          }}
        >
          {showCreateForm
            ? "Cancel"
            : "Create Return"}
        </button>
      </div>

      {showCreateForm && (
        <form
          className="purchase-order-return-details"
          onSubmit={handleCreateReturn}
        >
          <div className="purchase-order-return-details-header">
            <h3>Create Purchase Order Return</h3>
          </div>

          <div className="purchase-order-return-details-grid">
            <label>
              Purchase Order ID
              <input
                type="number"
                min="1"
                name="purchase_order_id"
                value={createForm.purchase_order_id}
                onChange={handleCreateInputChange}
                required
              />
            </label>

            <label>
              PO Item ID
              <input
                type="number"
                min="1"
                name="purchase_order_item_id"
                value={
                  createForm.purchase_order_item_id
                }
                onChange={handleCreateInputChange}
                required
              />
            </label>

            <label>
              Product ID
              <input
                type="number"
                min="1"
                name="product_id"
                value={createForm.product_id}
                onChange={handleCreateInputChange}
                required
              />
            </label>

            <label>
              Quantity
              <input
                type="number"
                min="1"
                name="quantity"
                value={createForm.quantity}
                onChange={handleCreateInputChange}
                required
              />
            </label>
          </div>

          <div className="purchase-order-return-details-text">
            <label>
              Reason
              <select
                name="reason"
                value={createForm.reason}
                onChange={handleCreateInputChange}
                required
              >
                <option value="">
                  Select return reason
                </option>
                <option value="damaged">
                  Damaged
                </option>
              </select>
            </label>

            <label>
              Remarks
              <textarea
                name="remarks"
                value={createForm.remarks}
                onChange={handleCreateInputChange}
                placeholder="Enter return remarks"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={creating}
          >
            {creating
              ? "Creating..."
              : "Create Return"}
          </button>
        </form>
      )}

      <div className="purchase-order-returns-filters">
        <div className="purchase-order-returns-search">
          <input
            type="text"
            placeholder="Search by Return ID, PO ID, Reason or Remarks..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <div className="purchase-order-returns-status-filter">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">
              All Status
            </option>
            <option value="requested">
              Requested
            </option>
            <option value="approved">
              Approved
            </option>
            <option value="rejected">
              Rejected
            </option>
            <option value="completed">
              Completed
            </option>
          </select>
        </div>
      </div>

      {error && (
        <div className="purchase-order-returns-error">
          {String(error)}
        </div>
      )}

      {actionError && (
        <div className="purchase-order-returns-error">
          {String(actionError)}
        </div>
      )}

      {actionSuccess && (
        <div className="purchase-order-returns-success">
          {actionSuccess}
        </div>
      )}

      {/* Returns Table */}
      <div className="purchase-order-returns-table-wrapper">
        {loading ? (
          <div className="purchase-order-returns-message">
            Loading purchase order returns...
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="purchase-order-returns-message">
            No purchase order returns found.
          </div>
        ) : (
          <table className="purchase-order-returns-table">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>PO ID</th>
                <th>Reason</th>
                <th>Remarks</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Items</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReturns.map((item) => {
                const itemStatus = String(
                  item.status || ""
                ).toLowerCase();

                const isProcessing =
                  approvingId === item.id ||
                  rejectingId === item.id ||
                  completingId === item.id ||
                  (updating &&
                    editingReturn?.id === item.id);

                return (
                  <tr key={item.id}>
                    <td>{item.id ?? "-"}</td>

                    <td>
                      {item.purchase_order_id ?? "-"}
                    </td>

                    <td>{item.reason || "-"}</td>

                    <td>{item.remarks || "-"}</td>

                    <td>
                      <span
                        className={
                          "purchase-order-return-status status-" +
                          itemStatus
                        }
                      >
                        {item.status || "-"}
                      </span>
                    </td>

                    <td>
                      {formatDate(item.created_at)}
                    </td>

                    <td>
                      {Array.isArray(item.items)
                        ? item.items.length
                        : 0}
                    </td>

                    <td>
                      <div className="purchase-order-return-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDetails(
                              item.id
                            )
                          }
                          disabled={
                            detailsLoading ||
                            isProcessing
                          }
                        >
                          View Details
                        </button>

                        {itemStatus ===
                          "requested" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleEditReturn(
                                  item
                                )
                              }
                              disabled={isProcessing}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleApprove(
                                  item.id
                                )
                              }
                              disabled={isProcessing}
                            >
                              {approvingId ===
                              item.id
                                ? "Approving..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleReject(
                                  item.id
                                )
                              }
                              disabled={isProcessing}
                            >
                              {rejectingId ===
                              item.id
                                ? "Rejecting..."
                                : "Reject"}
                            </button>
                          </>
                        )}

                        {itemStatus ===
                          "approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleComplete(
                                item.id
                              )
                            }
                            disabled={isProcessing}
                          >
                            {completingId ===
                            item.id
                              ? "Completing..."
                              : "Complete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Update Purchase Order Return */}
      {editingReturn && (
        <form
          className="purchase-order-return-details"
          onSubmit={handleUpdateReturn}
        >
          <div className="purchase-order-return-details-header">
            <h3>
              Update Purchase Order Return #
              {editingReturn.id}
            </h3>

            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={updating}
            >
              Cancel
            </button>
          </div>

          <div className="purchase-order-return-details-text">
            <label>
              Reason
              <input
                type="text"
                name="reason"
                value={editForm.reason}
                onChange={handleEditInputChange}
                placeholder="Enter return reason"
                required
              />
            </label>

            <label>
              Remarks
              <textarea
                name="remarks"
                value={editForm.remarks}
                onChange={handleEditInputChange}
                placeholder="Enter return remarks"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={updating}
          >
            {updating
              ? "Updating..."
              : "Update Return"}
          </button>
        </form>
      )}

      {/* Pagination */}
      <div className="purchase-order-returns-pagination">
        <button
          type="button"
          disabled={page === 1 || loading}
          onClick={() =>
            setPage((currentPage) =>
              Math.max(1, currentPage - 1)
            )
          }
        >
          Previous
        </button>

        <span>Page {page}</span>

        <button
          type="button"
          disabled={
            loading ||
            returns.length < pageSize
          }
          onClick={() =>
            setPage(
              (currentPage) => currentPage + 1
            )
          }
        >
          Next
        </button>
      </div>

      {/* Purchase Order Return Details */}
      {(detailsLoading ||
        detailsError ||
        selectedReturn) && (
        <div className="purchase-order-return-details">
          <div className="purchase-order-return-details-header">
            <h3>
              Purchase Order Return Details
            </h3>

            <button
              type="button"
              onClick={handleCloseDetails}
            >
              Close
            </button>
          </div>

          {detailsLoading && (
            <div className="purchase-order-returns-message">
              Loading return details...
            </div>
          )}

          {detailsError && (
            <div className="purchase-order-returns-error">
              {String(detailsError)}
            </div>
          )}

          {!detailsLoading &&
            !detailsError &&
            selectedReturn && (
              <>
                <div className="purchase-order-return-details-grid">
                  <p>
                    <strong>
                      Return ID:
                    </strong>{" "}
                    {selectedReturn.id ?? "-"}
                  </p>

                  <p>
                    <strong>
                      Purchase Order ID:
                    </strong>{" "}
                    {selectedReturn.purchase_order_id ??
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Tenant ID:
                    </strong>{" "}
                    {selectedReturn.tenant_id ??
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Status:
                    </strong>{" "}
                    <span
                      className={
                        "purchase-order-return-status status-" +
                        String(
                          selectedReturn.status ||
                            ""
                        ).toLowerCase()
                      }
                    >
                      {selectedReturn.status ||
                        "-"}
                    </span>
                  </p>

                  <p>
                    <strong>
                      Created At:
                    </strong>{" "}
                    {formatDate(
                      selectedReturn.created_at
                    )}
                  </p>
                </div>

                <div className="purchase-order-return-details-text">
                  <p>
                    <strong>
                      Reason:
                    </strong>{" "}
                    {selectedReturn.reason ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Remarks:
                    </strong>{" "}
                    {selectedReturn.remarks ||
                      "-"}
                  </p>
                </div>

                <h4>Items</h4>

                {Array.isArray(
                  selectedReturn.items
                ) &&
                selectedReturn.items.length >
                  0 ? (
                  <div className="purchase-order-returns-table-wrapper">
                    <table className="purchase-order-returns-table">
                      <thead>
                        <tr>
                          <th>Item ID</th>
                          <th>PO Item ID</th>
                          <th>Product ID</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedReturn.items.map(
                          (item) => (
                            <tr key={item.id}>
                              <td>
                                {item.id ?? "-"}
                              </td>

                              <td>
                                {item.purchase_order_item_id ??
                                  "-"}
                              </td>

                              <td>
                                {item.product_id ??
                                  "-"}
                              </td>

                              <td>
                                {item.quantity ??
                                  "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No items found.</p>
                )}
              </>
            )}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderReturns;
