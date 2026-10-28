import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/api';
import { getInvoices } from '../../services/billingService';
import { getWarehouses, getWarehouseDashboard, getWarehouseById, deleteWarehouse, getWarehouseTransfers } from '../../api/warehouseApi';
import { warehouseService } from '../../services/warehouseService';
import userService from '../../services/userService';
import { listStores } from '../../services/inventoryService';
import grnService, { createGRN, getGRNs, getGRNById, getGRNStats, getGRNByNumber, exportGRNs, deleteGRN, qualityCheckGRN, receiveGRN, rejectGRN, getGRNHistory, downloadGRNPdf, getGRNPrintSlip } from '../../services/grnService';
import { getPurchaseOrders, getPurchaseOrder } from '../../api/purchaseOrdersApi';
import { listSuppliers } from '../../api/supplierApi';
import PurchaseOrderReturns from '../PurchaseOrderReturns';
import TransferStockModal from '../../components/TransferStockModel';
import { getStoreTransfers, getStoreTransfersSummary, getStoreTransferById, approveStoreTransfer, rejectStoreTransfer, dispatchStoreTransfer, receiveStoreTransfer, receiveStoreTransferWithDiscrepancy, checkStoreActiveStatus } from '../../services/storeTransferService';

import {
    BsSearch, BsPlus, BsDownload, BsFilter, BsCheckCircleFill, BsClockHistory,
    BsXCircleFill, BsPrinter, BsUpcScan, BsBuildings, BsTruck, BsArrowRepeat,
    BsArrowLeftRight, BsAwardFill, BsShieldLock, BsMegaphone, BsChatDots,
    BsStars, BsPlug, BsDisplay, BsCashStack, BsArrowReturnLeft, BsReceiptCutoff,
    BsCreditCard2Front, BsBoxSeam, BsSend, BsGear, BsTag, BsExclamationTriangle,
    BsTrash, BsShop, BsChevronLeft, BsChevronRight, BsX, BsEye, BsCheckCircle, BsXCircle,
    BsChevronDown, BsChevronUp
} from 'react-icons/bs';


/* ─────────────────────────────────────────────────────────────
   Shared Module Header & Wrapper
───────────────────────────────────────────────────────────── */
const ModuleContainer = ({ title, subtitle, icon, actionBtn, children }) => (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 24,
            paddingBottom: 20,
            borderBottom: '1px solid #e5e7eb'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: '#eef2ff',
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22
                }}>
                    {icon}
                </div>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                        {title}
                    </h1>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0 0' }}>
                        {subtitle}
                    </p>
                </div>
            </div>
            {actionBtn && <div>{actionBtn}</div>}
        </div>
        {children}
    </div>
);

const StatCard = ({ label, value, sub, color = '#6366f1' }) => (
    <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        flex: 1,
        minWidth: 180
    }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            {label}
        </p>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
            {value}
        </p>
        {sub && <p style={{ fontSize: 12, color, margin: '4px 0 0 0', fontWeight: 600 }}>{sub}</p>}
    </div>
);

/* ─────────────────────────────────────────────────────────────
   1. BILLING & GST: Returns & Refunds
───────────────────────────────────────────────────────────── */
export { ReturnsRefundsPage } from '../ReturnsRefunds';

/* ─────────────────────────────────────────────────────────────
   2. BILLING & GST: Credit Notes
───────────────────────────────────────────────────────────── */
export { CreditNotesPage } from '../CreditNotes';

/* ─────────────────────────────────────────────────────────────
   3. BILLING & GST: Payments
───────────────────────────────────────────────────────────── */
export const BillingPaymentsPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadPayments = async () => {
            setLoading(true);
            try {
                let list = [];
                const res = await getInvoices().catch(() => null);
                if (res) {
                    list = Array.isArray(res) ? res : (res?.data || res?.items || []);
                }
                const stored = localStorage.getItem('gst_invoices');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(loc => {
                            if (!list.some(inv => String(inv.id || inv.invoice_number) === String(loc.id))) {
                                list.push(loc);
                            }
                        });
                    }
                }

                if (isMounted) {
                    const mapped = list.map((inv, i) => {
                        const amt = Number(inv.total || inv.grand_total || inv.amount || 0);
                        const mode = inv.payment_mode || inv.paymentMode || inv.mode || 'Cash';
                        return {
                            ref: `TXN-${String(inv.id || i + 1).replace(/[^0-9A-Za-z]/g, '').slice(-8)}`,
                            inv: inv.id || inv.invoice_number || `INV-${i + 1}`,
                            method: mode,
                            term: mode === 'UPI' ? 'UPI QR' : mode === 'Card' ? 'Card Terminal' : 'Cash Counter',
                            rawAmt: amt,
                            amt: '₹' + amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                            time: inv.date || (inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : 'Today'),
                            status: inv.status || 'Success',
                        };
                    });
                    setPayments(mapped);
                }
            } catch (_) {
                if (isMounted) setPayments([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadPayments();
        return () => { isMounted = false; };
    }, []);

    const totalCollections = useMemo(() => {
        return payments.reduce((s, p) => s + (p.rawAmt || 0), 0);
    }, [payments]);

    const upiCollections = useMemo(() => {
        return payments.filter(p => (p.method || '').toLowerCase().includes('upi')).reduce((s, p) => s + (p.rawAmt || 0), 0);
    }, [payments]);

    const cardCollections = useMemo(() => {
        return payments.filter(p => (p.method || '').toLowerCase().includes('card')).reduce((s, p) => s + (p.rawAmt || 0), 0);
    }, [payments]);

    const cashCollections = useMemo(() => {
        return payments.filter(p => (p.method || '').toLowerCase().includes('cash')).reduce((s, p) => s + (p.rawAmt || 0), 0);
    }, [payments]);

    return (
        <ModuleContainer
            title="Payments & Settlements"
            subtitle="Real-time register of POS collections, UPI QR settlements, Cards, and cash drawer reconciliations"
            icon={<BsCreditCard2Front />}
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Total Collections" value={'₹' + totalCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })} sub={`${payments.length} Transactions`} color="#10b981" />
                <StatCard label="UPI / Dynamic QR" value={'₹' + upiCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })} sub={totalCollections > 0 ? `${Math.round((upiCollections / totalCollections) * 100)}% of total volume` : '0%'} color="#6366f1" />
                <StatCard label="Card POS" value={'₹' + cardCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })} sub="Settled automatically" color="#0ea5e9" />
                <StatCard label="Cash In Drawer" value={'₹' + cashCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })} sub="Cash collections" color="#f59e0b" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Live Payment Ledger</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 16px' }}>Txn Ref</th>
                            <th style={{ padding: '12px 16px' }}>Invoice ID</th>
                            <th style={{ padding: '12px 16px' }}>Method</th>
                            <th style={{ padding: '12px 16px' }}>Gateway / Terminal</th>
                            <th style={{ padding: '12px 16px' }}>Amount</th>
                            <th style={{ padding: '12px 16px' }}>Time</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '36px 16px', textAlign: 'center', color: '#9ca3af' }}>
                                    {loading ? 'Loading payment transactions...' : 'No payment transactions recorded yet'}
                                </td>
                            </tr>
                        ) : (
                            payments.map((tx, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{tx.ref}</td>
                                    <td style={{ padding: '12px 16px', color: '#6366f1' }}>{tx.inv}</td>
                                    <td style={{ padding: '12px 16px' }}><span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{tx.method}</span></td>
                                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{tx.term}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 800 }}>{tx.amt}</td>
                                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{tx.time}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '3px 8px', borderRadius: 10, background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: 11 }}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   4. PRODUCTS: Barcode
───────────────────────────────────────────────────────────── */
export const BarcodePage = () => {
    return (
        <ModuleContainer
            title="Barcode Management & Label Printing"
            subtitle="Generate EAN-13 / Code 128 barcodes, customize label sticker layouts, and batch print for products"
            icon={<BsUpcScan />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPrinter size={18} /> Print Barcode Batch
                </button>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Generate Single / Batch Barcode</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Select Product</label>
                            <input type="text" placeholder="Search product name or SKU..." style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Barcode Standard</label>
                                <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
                                    <option>EAN-13 (Standard Retail)</option>
                                    <option>Code 128</option>
                                    <option>QR Code (GST e-Invoice)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Label Size</label>
                                <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
                                    <option>50mm x 25mm (Thermal)</option>
                                    <option>38mm x 25mm (Standard)</option>
                                    <option>A4 Sheet (24 labels/sheet)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Copies to Print</label>
                            <input type="number" defaultValue="20" style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <button style={{
                            marginTop: 10, background: '#6366f1', color: '#fff', border: 'none', padding: '12px',
                            borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}>
                            <BsUpcScan size={18} /> Generate & Preview Labels
                        </button>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Live Label Preview</h3>
                    <div style={{
                        border: '2px dashed #cbd5e1', borderRadius: 10, padding: 20, textAlign: 'center',
                        background: '#f8fafc', minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: 280 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', margin: 0 }}>RetailOS Store</p>
                            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: '4px 0' }}>Classic Polo T-Shirt</p>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px 0' }}>Size: L | Color: Navy Blue</p>
                            <div style={{ background: '#1e293b', height: 42, width: 200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', letterSpacing: 4, fontFamily: 'monospace', fontSize: 15 }}>
                                ||||| | |||| |||
                            </div>
                            <p style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#334155', margin: '4px 0 0 0' }}>8901234567890</p>
                            <p style={{ fontSize: 15, fontWeight: 900, color: '#111827', margin: '6px 0 0 0' }}>MRP: ₹1,299.00 <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>(Incl. of GST)</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   5. INVENTORY: Warehouses
───────────────────────────────────────────────────────────── */
const extractWarehouses = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.warehouses)) return data.warehouses;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.results)) return data.results;
    return [];
};

const extractTransfers = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.transfers)) return data.transfers;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.transfers)) return data.data.transfers;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.data?.results)) return data.data.results;
    return [];
};

const formatWarehouseCount = (val) => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) return 0;
    return Number(val);
};

const formatWarehouseStockUnits = (val) => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "0";
    return Number(val).toLocaleString("en-IN");
};

const formatWarehouseStockValue = (val) => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const WarehousesPage = () => {
    const [searchParams] = useSearchParams();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(null);

    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [selectedWarehouseLoading, setSelectedWarehouseLoading] = useState(false);
    const [selectedWarehouseError, setSelectedWarehouseError] = useState(null);

    const [warehouseTransfers, setWarehouseTransfers] = useState([]);
    const [transfersLoading, setTransfersLoading] = useState(false);
    const [transfersError, setTransfersError] = useState(null);

    const [deletingId, setDeletingId] = useState(null);
    const [warehouseToDelete, setWarehouseToDelete] = useState(null);
    const [modalError, setModalError] = useState(null);
    const [deleteFeedback, setDeleteFeedback] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [storeFilter, setStoreFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const hasFetchedRef = useRef(false);

    const fetchWarehouses = async (overrideParams = {}) => {
        try {
            setLoading(true);
            setError(null);

            const activeSearch = overrideParams.search !== undefined ? overrideParams.search : search;
            const activeStatus = overrideParams.statusFilter !== undefined ? overrideParams.statusFilter : statusFilter;
            const activeStore = overrideParams.storeFilter !== undefined ? overrideParams.storeFilter : storeFilter;
            const activePage = overrideParams.page !== undefined ? overrideParams.page : page;
            const activePageSize = overrideParams.pageSize !== undefined ? overrideParams.pageSize : pageSize;

            const params = {};

            if (activeSearch && String(activeSearch).trim() !== "") {
                params.search = String(activeSearch).trim();
            }

            if (activeStatus === "active") {
                params.is_active = true;
            } else if (activeStatus === "inactive") {
                params.is_active = false;
            }

            if (activeStore && activeStore !== "all") {
                params.store_id = Number(activeStore);
            }

            if (overrideParams.page !== undefined || activeSearch || activeStatus !== "all" || activeStore !== "all") {
                params.page = activePage;
                params.page_size = activePageSize;
            }

            const data = await getWarehouses(params);
            const list = extractWarehouses(data);
            setWarehouses(list);
        } catch (err) {
            console.error("Failed to fetch warehouses:", err);
            const errorDetail =
                err?.response?.data?.detail?.message ||
                (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load warehouses";
            setError(errorDetail);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        fetchWarehouses({ page: 1 });
    };

    const handleResetFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setStoreFilter("all");
        setPage(1);
        fetchWarehouses({ search: "", statusFilter: "all", storeFilter: "all", page: 1 });
    };

    const fetchDashboard = async () => {
        try {
            setDashboardLoading(true);
            setDashboardError(null);
            const data = await getWarehouseDashboard();
            setDashboard(data);
        } catch (err) {
            console.error("Failed to fetch warehouse dashboard:", err);
            const errorDetail =
                err?.response?.data?.detail?.message ||
                (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load dashboard counts";
            setDashboardError(errorDetail);
        } finally {
            setDashboardLoading(false);
        }
    };

    const fetchTransfersForWarehouse = async (whId) => {
        if (!whId) return;
        try {
            setTransfersLoading(true);
            setTransfersError(null);
            const data = await getWarehouseTransfers(whId, { limit: 50 });
            setWarehouseTransfers(extractTransfers(data));
        } catch (err) {
            console.error(`Failed to fetch transfers for warehouse #${whId}:`, err);
            const errorDetail =
                err?.response?.data?.detail?.message ||
                (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load warehouse transfers";
            setTransfersError(errorDetail);
            setWarehouseTransfers([]);
        } finally {
            setTransfersLoading(false);
        }
    };

    const handleViewWarehouse = async (id) => {
        if (!id) return;
        const normalizedId = Number(id) || id;
        setSelectedWarehouseId(normalizedId);
        setSelectedWarehouseLoading(true);
        setSelectedWarehouseError(null);
        setSelectedWarehouse(null);
        setWarehouseTransfers([]);
        setTransfersError(null);
        fetchTransfersForWarehouse(normalizedId);
        try {
            const data = await getWarehouseById(normalizedId);
            const resolved = data?.data ?? data?.warehouse ?? data;
            setSelectedWarehouse(Array.isArray(resolved) ? resolved[0] : resolved);
        } catch (err) {
            console.error(`Failed to fetch warehouse #${id}:`, err);
            const errorDetail =
                err?.response?.data?.detail?.message ||
                (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load warehouse details";
            setSelectedWarehouseError(errorDetail);
        } finally {
            setSelectedWarehouseLoading(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedWarehouseId(null);
        setSelectedWarehouse(null);
        setSelectedWarehouseError(null);
        setWarehouseTransfers([]);
        setTransfersError(null);
    };

    const handleRequestDelete = (wh) => {
        if (!wh || !wh.id) return;
        setModalError(null);
        setWarehouseToDelete(wh);
    };

    const handleCancelDelete = () => {
        if (deletingId) return;
        setWarehouseToDelete(null);
        setModalError(null);
    };

    const handleConfirmDelete = async () => {
        if (!warehouseToDelete || !warehouseToDelete.id) return;
        const targetId = Number(warehouseToDelete.id) || warehouseToDelete.id;

        if (deletingId) return;

        try {
            setDeletingId(targetId);
            setModalError(null);

            const res = await warehouseService.deleteWarehouse(targetId);

            const successMsg = res?.message || `Warehouse #${targetId} deleted successfully.`;
            setDeleteFeedback({
                type: 'success',
                message: successMsg,
                warehouseId: targetId
            });

            setWarehouseToDelete(null);
            setModalError(null);

            if (selectedWarehouseId === targetId) {
                handleCloseModal();
            }

            await fetchWarehouses();
            await fetchDashboard();
        } catch (err) {
            console.error(`Failed to delete warehouse #${targetId}:`, err);

            const status = err?.response?.status;
            const resData = err?.response?.data;

            let backendMessage =
                resData?.message ||
                (typeof resData?.detail === 'string' ? resData.detail : null) ||
                resData?.detail?.message ||
                (Array.isArray(resData?.detail) && resData.detail[0]?.msg ? resData.detail[0].msg : null) ||
                err?.message ||
                "Failed to delete warehouse.";

            if (status === 409) {
                const conflictDetail = "Active stock restriction: Products have active stock stored here. All inventory must be transferred or cleared before this warehouse can be deleted.";
                setModalError({
                    isConflict: true,
                    message: backendMessage,
                    detail: conflictDetail
                });
                setDeleteFeedback({
                    type: 'conflict',
                    message: backendMessage,
                    detail: conflictDetail,
                    warehouseId: targetId
                });
            } else if (status === 401) {
                const authMsg = "Authentication expired. Please log in again.";
                setModalError({ isConflict: false, message: authMsg });
                setDeleteFeedback({ type: 'error', message: authMsg, warehouseId: targetId });
            } else if (status === 403) {
                const forbiddenMsg = backendMessage || "You do not have permission to delete this warehouse.";
                setModalError({ isConflict: false, message: forbiddenMsg });
                setDeleteFeedback({ type: 'error', message: forbiddenMsg, warehouseId: targetId });
            } else if (status === 404) {
                const notFoundMsg = backendMessage || `Warehouse #${targetId} was not found on the server.`;
                setModalError({ isConflict: false, message: notFoundMsg });
                setDeleteFeedback({ type: 'error', message: notFoundMsg, warehouseId: targetId });
            } else {
                setModalError({ isConflict: false, message: backendMessage });
                setDeleteFeedback({ type: 'error', message: backendMessage, warehouseId: targetId });
            }
        } finally {
            setDeletingId(null);
        }
    };


    const handleRefresh = () => {
        fetchWarehouses();
        fetchDashboard();
    };

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchWarehouses();
        fetchDashboard();
    }, []);

    useEffect(() => {
        const queryId = searchParams?.get('id') || searchParams?.get('warehouse_id');
        if (queryId) {
            handleViewWarehouse(queryId);
        }
    }, [searchParams]);

    const dashboardData = dashboard?.data ?? dashboard;

    const totalWarehouses = dashboardLoading
        ? "..."
        : (dashboardData?.total_warehouses !== undefined && dashboardData?.total_warehouses !== null)
            ? formatWarehouseCount(dashboardData.total_warehouses)
            : 0;

    const activeWarehouses = dashboardLoading
        ? "..."
        : (dashboardData?.active_warehouses !== undefined && dashboardData?.active_warehouses !== null)
            ? formatWarehouseCount(dashboardData.active_warehouses)
            : 0;

    const inactiveWarehouses = dashboardLoading
        ? "..."
        : (dashboardData?.inactive_warehouses !== undefined && dashboardData?.inactive_warehouses !== null)
            ? formatWarehouseCount(dashboardData.inactive_warehouses)
            : 0;

    const totalStockUnits = dashboardLoading
        ? "..."
        : (dashboardData?.total_stock_units !== undefined && dashboardData?.total_stock_units !== null)
            ? formatWarehouseStockUnits(dashboardData.total_stock_units)
            : "0";

    const totalStockValue = dashboardLoading
        ? "..."
        : (dashboardData?.total_stock_value !== undefined && dashboardData?.total_stock_value !== null)
            ? formatWarehouseStockValue(dashboardData.total_stock_value)
            : "₹0.00";

    return (
        <ModuleContainer
            title="Warehouses & Stock Locations"
            subtitle="Central depots, store stockrooms, transit hubs and multi-location inventory levels"
            icon={<BsBuildings />}
            actionBtn={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={handleRefresh}
                        disabled={loading || dashboardLoading}
                        title="Refresh Warehouses"
                        style={{
                            background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '10px 14px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: (loading || dashboardLoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <BsArrowRepeat size={16} /> Refresh
                    </button>
                    <button style={{
                        background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                        borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <BsPlus size={18} /> Add Warehouse
                    </button>
                </div>
            }
        >
            {/* Dashboard Stat Cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard
                    label="Total Warehouses"
                    value={totalWarehouses}
                    sub="Registered stock locations"
                    color="#6366f1"
                />
                <StatCard
                    label="Active Warehouses"
                    value={activeWarehouses}
                    sub="Operational & ready"
                    color="#10b981"
                />
                <StatCard
                    label="Inactive Warehouses"
                    value={inactiveWarehouses}
                    sub={Number(inactiveWarehouses) > 0 ? "Requires attention" : "All operational"}
                    color={Number(inactiveWarehouses) > 0 ? "#ef4444" : "#6b7280"}
                />
                <StatCard
                    label="Total Stock Units"
                    value={totalStockUnits}
                    sub="Units in warehouses"
                    color="#0ea5e9"
                />
                <StatCard
                    label="Total Stock Value"
                    value={totalStockValue}
                    sub="Inventory valuation"
                    color="#8b5cf6"
                />
            </div>

            {dashboardError && (
                <div style={{
                    fontSize: 12.5,
                    color: '#b91c1c',
                    background: '#fef2f2',
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #fee2e2',
                    marginBottom: 20
                }}>
                    Note: Could not refresh dashboard counts ({dashboardError}).
                </div>
            )}

            {/* Warehouse Delete Feedback Banner */}
            {deleteFeedback && (
                <div style={{
                    borderRadius: 10,
                    padding: '14px 18px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: deleteFeedback.type === 'success'
                        ? '#ecfdf5'
                        : (deleteFeedback.type === 'conflict' ? '#fffbeb' : '#fef2f2'),
                    border: `1px solid ${
                        deleteFeedback.type === 'success'
                            ? '#a7f3d0'
                            : (deleteFeedback.type === 'conflict' ? '#fde68a' : '#fecaca')
                    }`,
                    color: deleteFeedback.type === 'success'
                        ? '#065f46'
                        : (deleteFeedback.type === 'conflict' ? '#92400e' : '#991b1b')
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {deleteFeedback.type === 'success' ? (
                            <BsCheckCircleFill size={18} style={{ color: '#059669', marginTop: 2, flexShrink: 0 }} />
                        ) : (
                            <BsExclamationTriangle size={18} style={{
                                color: deleteFeedback.type === 'conflict' ? '#d97706' : '#dc2626',
                                marginTop: 2,
                                flexShrink: 0
                            }} />
                        )}
                        <div>
                            <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>
                                {deleteFeedback.type === 'success'
                                    ? 'Warehouse Deleted'
                                    : (deleteFeedback.type === 'conflict' ? 'Cannot Delete Warehouse (Active Stock Conflict)' : 'Failed to Delete Warehouse')}
                            </strong>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
                                {deleteFeedback.message}
                            </p>
                            {deleteFeedback.detail && (
                                <p style={{ margin: '6px 0 0 0', fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                                    {deleteFeedback.detail}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDeleteFeedback(null)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'currentColor',
                            opacity: 0.7,
                            fontSize: 16,
                            lineHeight: 1,
                            cursor: 'pointer',
                            padding: '2px 6px'
                        }}
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Warehouse Search and Filter Controls */}
            <form
                onSubmit={handleSearchSubmit}
                style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '14px 18px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <BsSearch style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search by name, code, ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 13.5,
                            outline: 'none',
                            color: '#111827',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ flex: '0 0 auto', minWidth: 140 }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStatusFilter(val);
                            fetchWarehouses({ statusFilter: val, page: 1 });
                        }}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 13,
                            color: '#374151',
                            background: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>

                <div style={{ flex: '0 0 auto', minWidth: 140 }}>
                    <input
                        type="number"
                        placeholder="Store ID (e.g. 2)"
                        value={storeFilter === 'all' ? '' : storeFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStoreFilter(val === '' ? 'all' : val);
                        }}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 13,
                            color: '#374151',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <BsSearch size={13} /> Filter
                </button>

                {(search.trim() || statusFilter !== 'all' || storeFilter !== 'all') && (
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        style={{
                            background: '#f3f4f6',
                            color: '#4b5563',
                            border: '1px solid #d1d5db',
                            padding: '8px 14px',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                        }}
                    >
                        Clear
                    </button>
                )}
            </form>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280' }}>
                    <div style={{
                        display: 'inline-block',
                        width: 32,
                        height: 32,
                        border: '3px solid #e5e7eb',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: 12
                    }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Loading warehouses...</p>
                </div>
            ) : error ? (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: 12,
                    padding: '20px 24px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14
                }}>
                    <BsExclamationTriangle size={22} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                            Unable to load warehouses
                        </strong>
                        <p style={{ fontSize: 13, color: '#b91c1c', margin: '0 0 12px 0' }}>{error}</p>
                        <button
                            onClick={() => fetchWarehouses()}
                            style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: 6,
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            ) : warehouses.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    color: '#6b7280'
                }}>
                    {search.trim() || statusFilter !== 'all' || storeFilter !== 'all' ? (
                        <>
                            <BsSearch size={34} style={{ color: '#9ca3af', marginBottom: 12 }} />
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
                                No Matching Warehouses Found
                            </h3>
                            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#6b7280' }}>
                                No active or registered warehouses matched your search criteria {storeFilter !== 'all' ? `for Store #${storeFilter}` : ''} (HTTP 200 OK with 0 records).
                            </p>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    padding: '7px 16px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Clear Search & Filters
                            </button>
                        </>
                    ) : (
                        <>
                            <BsBuildings size={36} style={{ color: '#9ca3af', marginBottom: 12 }} />
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
                                No Warehouses Found
                            </h3>
                            <p style={{ margin: 0, fontSize: 13 }}>There are currently no warehouses registered in this tenant.</p>
                        </>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                    {warehouses.map((wh, i) => {
                        const isActive = wh.is_active !== false;
                        const code = wh.code || `WH-${wh.id || (i + 1)}`;
                        const name = wh.name || `Warehouse #${wh.id}`;
                        const address = wh.address || wh.location || "Address not provided";
                        const storeId = wh.store_id ?? wh.storeId;
                        const storeName = wh.store_name || wh.storeName;
                        const tenantId = wh.tenant_id ?? wh.tenantId;

                        return (
                            <div
                                key={wh.id || i}
                                style={{
                                    background: '#fff',
                                    borderRadius: 12,
                                    border: '1px solid #e5e7eb',
                                    padding: 22,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>
                                            {code}
                                        </span>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '6px 0 2px 0' }}>
                                            {name}
                                        </h3>
                                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                                            {address}
                                        </p>
                                    </div>
                                    <span style={{
                                        background: isActive ? '#ecfdf5' : '#fef2f2',
                                        color: isActive ? '#059669' : '#dc2626',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 8px',
                                        borderRadius: 10
                                    }}>
                                        {isActive ? (wh.status || 'Active') : 'Inactive'}
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Store</span>
                                        <strong style={{ fontSize: 13, color: '#111827', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={storeName || (storeId != null ? `Store #${storeId}` : '-')}>
                                            {storeName ? `${storeName}${storeId != null ? ` (#${storeId})` : ''}` : (storeId != null ? `Store #${storeId}` : (wh.items || '-'))}
                                        </strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Tenant ID</span>
                                        <strong style={{ fontSize: 14, color: '#10b981' }}>
                                            {tenantId !== undefined && tenantId !== null ? `#${tenantId}` : (wh.value || '-')}
                                        </strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Created At</span>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                                            {wh.created_at ? new Date(wh.created_at).toLocaleDateString() : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Updated At</span>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                                            {wh.updated_at ? new Date(wh.updated_at).toLocaleDateString() : (wh.created_at ? new Date(wh.created_at).toLocaleDateString() : '-')}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => handleViewWarehouse(wh.id)}
                                        style={{
                                            flex: 1,
                                            background: '#f8fafc',
                                            color: '#4f46e5',
                                            border: '1px solid #e0e7ff',
                                            padding: '7px 12px',
                                            borderRadius: 8,
                                            fontSize: 12.5,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6
                                        }}
                                    >
                                        View Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRequestDelete(wh)}
                                        disabled={deletingId !== null}
                                        title={`Delete Warehouse #${wh.id}`}
                                        style={{
                                            background: '#fef2f2',
                                            color: '#dc2626',
                                            border: '1px solid #fee2e2',
                                            padding: '7px 12px',
                                            borderRadius: 8,
                                            fontSize: 12.5,
                                            fontWeight: 600,
                                            cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            opacity: deletingId === wh.id ? 0.6 : (deletingId !== null ? 0.4 : 1)
                                        }}
                                    >
                                        <BsTrash size={14} />
                                        {deletingId === wh.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Warehouse Details Modal (GET /api/v1/warehouses/{id}) */}
            {selectedWarehouseId && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: 20,
                    backdropFilter: 'blur(3px)'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 14,
                        width: '100%',
                        maxWidth: 780,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#fafafa'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    background: '#eef2ff',
                                    color: '#6366f1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsBuildings size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        Warehouse Details #{selectedWarehouseId}
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        GET /api/v1/warehouses/{selectedWarehouseId}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 20,
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                    color: '#9ca3af',
                                    padding: '4px 8px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {selectedWarehouseLoading ? (
                                <div style={{ textAlign: 'center', padding: '36px 0', color: '#6b7280' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        width: 32,
                                        height: 32,
                                        border: '3px solid #e5e7eb',
                                        borderTopColor: '#6366f1',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        marginBottom: 12
                                    }} />
                                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>Fetching warehouse details...</p>
                                </div>
                            ) : selectedWarehouseError ? (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                    borderRadius: 10,
                                    padding: 16,
                                    color: '#dc2626'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <BsExclamationTriangle size={20} style={{ marginTop: 2, flexShrink: 0 }} />
                                        <div>
                                            <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                                                Error Fetching Warehouse Details
                                            </strong>
                                            <p style={{ fontSize: 12.5, margin: '0 0 12px 0', color: '#b91c1c' }}>
                                                {selectedWarehouseError}
                                            </p>
                                            <button
                                                onClick={() => handleViewWarehouse(selectedWarehouseId)}
                                                style={{
                                                    background: '#dc2626',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    padding: '6px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedWarehouse ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#6366f1',
                                            background: '#eef2ff',
                                            padding: '3px 10px',
                                            borderRadius: 6
                                        }}>
                                            {selectedWarehouse.code || `WH-${selectedWarehouse.id}`}
                                        </span>
                                        <span style={{
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            padding: '3px 10px',
                                            borderRadius: 10,
                                            background: selectedWarehouse.is_active ? '#ecfdf5' : '#fef2f2',
                                            color: selectedWarehouse.is_active ? '#059669' : '#dc2626'
                                        }}>
                                            {selectedWarehouse.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                                            {selectedWarehouse.name}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                                            {selectedWarehouse.address || 'Address not specified'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Warehouse ID</span>
                                            <strong style={{ fontSize: 14, color: '#0f172a' }}>#{selectedWarehouse.id}</strong>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Tenant ID</span>
                                            <strong style={{ fontSize: 14, color: '#10b981' }}>#{selectedWarehouse.tenant_id}</strong>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Store Name</span>
                                            <strong style={{ fontSize: 13.5, color: '#0f172a' }}>
                                                {selectedWarehouse.store_name || '-'}
                                            </strong>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Store ID</span>
                                            <strong style={{ fontSize: 14, color: '#0f172a' }}>
                                                {selectedWarehouse.store_id != null ? `#${selectedWarehouse.store_id}` : 'None (Unassigned)'}
                                            </strong>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Created At</span>
                                            <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                                                {selectedWarehouse.created_at ? new Date(selectedWarehouse.created_at).toLocaleString() : '-'}
                                            </span>
                                        </div>
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Updated At</span>
                                            <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                                                {selectedWarehouse.updated_at ? new Date(selectedWarehouse.updated_at).toLocaleString() : (selectedWarehouse.created_at ? new Date(selectedWarehouse.created_at).toLocaleString() : '-')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Warehouse Transfers Section */}
                                    <div style={{ marginTop: 22, borderTop: '1px solid #e5e7eb', paddingTop: 18 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                            <div>
                                                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <BsArrowLeftRight size={15} color="#6366f1" /> Warehouse Transfers
                                                </h5>
                                                <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                                                    GET /api/v1/warehouses/{selectedWarehouseId}/transfers?limit=50
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fetchTransfersForWarehouse(selectedWarehouseId)}
                                                disabled={transfersLoading}
                                                style={{
                                                    background: '#f3f4f6',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: 6,
                                                    padding: '5px 12px',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#374151',
                                                    cursor: transfersLoading ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}
                                            >
                                                <BsArrowRepeat size={13} /> {transfersLoading ? 'Refreshing...' : 'Refresh'}
                                            </button>
                                        </div>

                                        {transfersLoading ? (
                                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    width: 24,
                                                    height: 24,
                                                    border: '2px solid #e5e7eb',
                                                    borderTopColor: '#6366f1',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite',
                                                    marginBottom: 8
                                                }} />
                                                <div style={{ fontSize: 13 }}>Loading transfers...</div>
                                            </div>
                                        ) : transfersError ? (
                                            <div style={{
                                                background: '#fef2f2',
                                                border: '1px solid #fee2e2',
                                                borderRadius: 8,
                                                padding: '12px 14px',
                                                color: '#dc2626',
                                                fontSize: 12.5,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 10
                                            }}>
                                                <span>{transfersError}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchTransfersForWarehouse(selectedWarehouseId)}
                                                    style={{
                                                        background: '#dc2626',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: 4,
                                                        padding: '4px 10px',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : warehouseTransfers.length === 0 ? (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '24px 12px',
                                                background: '#f9fafb',
                                                borderRadius: 8,
                                                border: '1px dashed #d1d5db',
                                                color: '#6b7280',
                                                fontSize: 13
                                            }}>
                                                No transfers found.
                                            </div>
                                        ) : (
                                            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                                                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                                        <tr>
                                                            <th style={{ padding: '8px 12px' }}>Transfer Number</th>
                                                            <th style={{ padding: '8px 12px' }}>Transfer Type</th>
                                                            <th style={{ padding: '8px 12px' }}>Source Store</th>
                                                            <th style={{ padding: '8px 12px' }}>Destination Store</th>
                                                            <th style={{ padding: '8px 12px' }}>Status</th>
                                                            <th style={{ padding: '8px 12px' }}>Item Count</th>
                                                            <th style={{ padding: '8px 12px' }}>Created Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {warehouseTransfers.map((tr, idx) => {
                                                            const trNum = tr.transfer_number || tr.transferNumber || tr.code || tr.reference || (tr.id ? `#${tr.id}` : '—');
                                                            const trType = tr.transfer_type || tr.transferType || tr.type || 'Warehouse Transfer';
                                                            const srcStore = tr.source_store_name || tr.sourceStoreName || tr.source_store?.name || (tr.source_store_id != null ? `Store #${tr.source_store_id}` : (tr.from_location_name || tr.from || '—'));
                                                            const dstStore = tr.destination_store_name || tr.destinationStoreName || tr.destination_store?.name || (tr.destination_store_id != null ? `Store #${tr.destination_store_id}` : (tr.to_location_name || tr.to || '—'));
                                                            const status = tr.status || 'Pending';
                                                            const itemCount = tr.item_count ?? tr.items_count ?? tr.total_items ?? tr.items?.length ?? tr.quantity ?? 0;
                                                            const createdDate = tr.created_at ? new Date(tr.created_at).toLocaleDateString() : (tr.date || '—');

                                                            return (
                                                                <tr key={tr.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#6366f1' }}>{trNum}</td>
                                                                    <td style={{ padding: '8px 12px', color: '#374151' }}>{trType}</td>
                                                                    <td style={{ padding: '8px 12px', color: '#374151' }}>{srcStore}</td>
                                                                    <td style={{ padding: '8px 12px', color: '#374151' }}>{dstStore}</td>
                                                                    <td style={{ padding: '8px 12px' }}>
                                                                        <span style={{
                                                                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                                                            background: status.toLowerCase().includes('complete') || status.toLowerCase().includes('received') ? '#ecfdf5' : (status.toLowerCase().includes('transit') ? '#eff6ff' : '#fffbeb'),
                                                                            color: status.toLowerCase().includes('complete') || status.toLowerCase().includes('received') ? '#059669' : (status.toLowerCase().includes('transit') ? '#2563eb' : '#d97706')
                                                                        }}>
                                                                            {status}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{itemCount}</td>
                                                                    <td style={{ padding: '8px 12px', color: '#6b7280' }}>{createdDate}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div style={{
                            padding: '14px 24px',
                            borderTop: '1px solid #e5e7eb',
                            background: '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12
                        }}>
                            {selectedWarehouse && (
                                <button
                                    type="button"
                                    onClick={() => handleRequestDelete(selectedWarehouse)}
                                    disabled={deletingId !== null}
                                    style={{
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fee2e2',
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        opacity: deletingId === selectedWarehouse.id ? 0.6 : (deletingId !== null ? 0.4 : 1)
                                    }}
                                >
                                    <BsTrash size={14} />
                                    {deletingId === selectedWarehouse.id ? 'Deleting...' : 'Delete Warehouse'}
                                </button>
                            )}
                            <button
                                onClick={handleCloseModal}
                                style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginLeft: 'auto'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warehouse Delete Confirmation Modal */}
            {warehouseToDelete && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: 20,
                    backdropFilter: 'blur(3px)'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 14,
                        width: '100%',
                        maxWidth: 480,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #fee2e2',
                            background: '#fef2f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsTrash size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                                        Confirm Warehouse Deletion
                                    </h3>
                                    <span style={{ fontSize: 11.5, color: '#b91c1c' }}>
                                        DELETE /api/v1/warehouses/{warehouseToDelete.id}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                disabled={deletingId !== null}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 18,
                                    lineHeight: 1,
                                    cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                                    color: '#9ca3af',
                                    padding: '4px 6px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '22px 24px' }}>
                            <p style={{ margin: '0 0 14px 0', fontSize: 14, color: '#1f2937', lineHeight: 1.5 }}>
                                Are you sure you want to delete warehouse <strong>{warehouseToDelete.name || `Warehouse #${warehouseToDelete.id}`}</strong> (ID: #{warehouseToDelete.id})?
                            </p>

                            <div style={{
                                background: '#fffbeb',
                                border: '1px solid #fef3c7',
                                borderRadius: 8,
                                padding: '12px 14px',
                                fontSize: 12.5,
                                color: '#92400e',
                                lineHeight: 1.45
                            }}>
                                <strong>Active Stock Restriction:</strong> The backend prevents deleting any warehouse that contains active stock (HTTP 409 Conflict). If stock exists, all inventory items must be transferred or cleared prior to deletion.
                            </div>

                            {modalError && (
                                <div style={{
                                    marginTop: 14,
                                    background: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                    borderRadius: 8,
                                    padding: '12px 14px',
                                    fontSize: 12.5,
                                    color: '#b91c1c',
                                    lineHeight: 1.45
                                }}>
                                    <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                                        {modalError.isConflict ? 'Cannot Delete Warehouse (HTTP 409 Conflict):' : 'Error Deleting Warehouse:'}
                                    </strong>
                                    <div>{modalError.message}</div>
                                    {modalError.detail && (
                                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                                            {modalError.detail}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{
                            padding: '14px 24px',
                            borderTop: '1px solid #e5e7eb',
                            background: '#fafafa',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10
                        }}>
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                disabled={deletingId !== null}
                                style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: deletingId !== null ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={deletingId !== null}
                                style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: deletingId !== null ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    opacity: deletingId !== null ? 0.7 : 1
                                }}
                            >
                                <BsTrash size={14} />
                                {deletingId !== null ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   6. INVENTORY: GRN (Goods Received Note)
───────────────────────────────────────────────────────────── */
export const GRNPage = () => {
    const [grns, setGrns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters corresponding strictly to GET /api/v1/grn query parameters
    const [filterPoId, setFilterPoId] = useState('');
    const [filterWarehouseId, setFilterWarehouseId] = useState('');
    const [filterStoreId, setFilterStoreId] = useState('');
    const [filterSupplierId, setFilterSupplierId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    // GRN Dashboard Statistics (strictly from GET /api/v1/grn/stats)
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);
    const [showRecentGrns, setShowRecentGrns] = useState(true);
    const statsRequestIdRef = useRef(0);

    // Metadata for creating GRN and filtering
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [stores, setStores] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const [formSuccess, setFormSuccess] = useState(null);

    // Form fields
    const [selectedPoId, setSelectedPoId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [transporterName, setTransporterName] = useState('');
    const [remarks, setRemarks] = useState('');
    const [items, setItems] = useState([]);
    const [isPoFullyReceived, setIsPoFullyReceived] = useState(false);
    const [poWarning, setPoWarning] = useState(null);
    const [loadingPoDetails, setLoadingPoDetails] = useState(false);

    // View Modal State (backed by GET /api/v1/grn/by-number/{grn_number})
    const [selectedGrn, setSelectedGrn] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const detailRequestIdRef = useRef(0);

    // GRN History State (strictly GET /api/v1/grn/{grn_id}/history)
    const [detailTab, setDetailTab] = useState('details'); // 'details' | 'history'
    const [historyData, setHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [historyGrnId, setHistoryGrnId] = useState(null);
    const historyRequestIdRef = useRef(0);

    // GRN Print & Download PDF State (strictly GET /api/v1/grn/{grn_id}/print?mode=download)
    const [downloadingPdfGrnId, setDownloadingPdfGrnId] = useState(null);
    const [pdfDownloadError, setPdfDownloadError] = useState(null);
    const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState(null);

    // GRN Print Slip State (strictly GET /api/v1/grn/{grn_id}/print-slip)
    const [fetchingSlipGrnId, setFetchingSlipGrnId] = useState(null);
    const [printSlipError, setPrintSlipError] = useState(null);
    const [isPrintSlipModalOpen, setIsPrintSlipModalOpen] = useState(false);
    const [printSlipHtml, setPrintSlipHtml] = useState('');
    const [printSlipGrn, setPrintSlipGrn] = useState(null);
    const printSlipIframeRef = useRef(null);

    // Delete GRN State (strictly DELETE /api/v1/grn/{grn_id})
    const [grnToDelete, setGrnToDelete] = useState(null);
    const [deletingGrnId, setDeletingGrnId] = useState(null);
    const [deleteGrnError, setDeleteGrnError] = useState(null);
    const [deleteGrnSuccess, setDeleteGrnSuccess] = useState(null);

    // Quality Check State (strictly POST /api/v1/grn/{grn_id}/quality-check)
    const [isQcModalOpen, setIsQcModalOpen] = useState(false);
    const [qcGrn, setQcGrn] = useState(null);
    const [qcItems, setQcItems] = useState([]);
    const [qcRemarks, setQcRemarks] = useState('');
    const [qcLoadingItems, setQcLoadingItems] = useState(false);
    const [qcSubmitting, setQcSubmitting] = useState(false);
    const [qcError, setQcError] = useState(null);
    const [qcSuccess, setQcSuccess] = useState(null);

    // Receive GRN State (strictly POST /api/v1/grn/{grn_id}/receive)
    const [receivingGrnId, setReceivingGrnId] = useState(null);
    const [receiveGrnError, setReceiveGrnError] = useState(null);
    const [receiveGrnSuccess, setReceiveGrnSuccess] = useState(null);

    // Reject GRN State (strictly POST /api/v1/grn/{grn_id}/reject?reason=...)
    const [grnToReject, setGrnToReject] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingGrnId, setRejectingGrnId] = useState(null);
    const [rejectGrnError, setRejectGrnError] = useState(null);
    const [rejectGrnSuccess, setRejectGrnSuccess] = useState(null);

    const formatGrnDate = (val, withTime = false) => {
        if (!val) return '—';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return String(val);
            return withTime ? d.toLocaleString() : d.toLocaleDateString();
        } catch {
            return String(val);
        }
    };

    /**
     * Fetch complete GRN details dynamically:
     * - Primary: GET /api/v1/grn/{grn_id} using getGRNById(record.id) when record.id is present
     * - Fallback: GET /api/v1/grn/by-number/{grn_number} using getGRNByNumber(record.grn_number) when record.id is missing but record.grn_number exists
     */
    const handleViewGrn = async (record) => {
        if (!record) return;

        // Pre-populate modal with current summary record so modal opens immediately
        setDetailTab('details');
        setSelectedGrn(record);
        setDetailLoading(true);
        setDetailError(null);

        const rawId = record.id ?? record.grn_id;
        const numericId = rawId !== undefined && rawId !== null ? Number(rawId) : NaN;
        const hasValidNumericId = Number.isSafeInteger(numericId) && numericId > 0;
        const grnNum = record.grn_number ? String(record.grn_number).trim() : '';
        const hasGrnNumber = Boolean(grnNum);

        if (!hasValidNumericId && !hasGrnNumber) {
            setDetailLoading(false);
            setDetailError('Missing GRN ID or GRN Number for this record.');
            return;
        }

        const requestId = ++detailRequestIdRef.current;

        try {
            let data;
            if (hasValidNumericId) {
                // Preferred: Use numericId to call getGRNById(grn.id)
                data = await getGRNById(numericId);
            } else {
                // Fallback: When record.id is missing but record.grn_number exists
                data = await getGRNByNumber(grnNum);
            }

            // Stale check: ensure user has not selected another record or closed the modal
            if (requestId === detailRequestIdRef.current) {
                const resolvedData = data?.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : (data || record);
                setSelectedGrn({ ...record, ...resolvedData });
                setDetailError(null);
            }
        } catch (err) {
            if (requestId === detailRequestIdRef.current) {
                console.error('Fetch GRN detail error:', err);
                let message = 'Failed to load complete GRN details.';
                if (err?.response?.status === 404) {
                    message = 'GRN record not found.';
                } else if (err?.response?.status === 422) {
                    const detail = err?.response?.data?.detail;
                    if (Array.isArray(detail)) {
                        message = `Validation Error: ${detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`;
                    } else {
                        message = typeof detail === 'string' ? detail : 'Validation error from server.';
                    }
                } else if (err?.response?.status === 500) {
                    message = 'Internal server error while loading GRN details.';
                } else if (err?.response?.data?.message) {
                    message = err.response.data.message;
                } else if (err?.message) {
                    message = err.message;
                }
                setDetailError(message);
            }
        } finally {
            if (requestId === detailRequestIdRef.current) {
                setDetailLoading(false);
            }
        }
    };

    /**
     * Fetch GRN history and event timeline:
     * Strictly calls GET /api/v1/grn/{grn_id}/history
     */
    const fetchGrnHistory = useCallback(async (grnId, record = null) => {
        const rawId = grnId ?? record?.id ?? record?.grn_id;
        const numericId = Number(rawId);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            setHistoryError('Invalid GRN ID. Cannot load history.');
            return;
        }

        const requestId = ++historyRequestIdRef.current;
        setHistoryLoading(true);
        setHistoryError(null);
        setHistoryGrnId(numericId);

        try {
            const data = await grnService.getGRNHistory(numericId);
            if (requestId === historyRequestIdRef.current) {
                const resolved = data?.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data;
                setHistoryData(resolved);
                setHistoryError(null);
            }
        } catch (err) {
            if (requestId === historyRequestIdRef.current) {
                console.error('Fetch GRN history error:', err);
                let message = 'Failed to load GRN history.';
                if (err?.response?.status === 404) {
                    message = 'GRN history not found.';
                } else if (err?.response?.status === 422) {
                    const detail = err?.response?.data?.detail;
                    if (Array.isArray(detail)) {
                        message = `Validation Error: ${detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`;
                    } else if (typeof detail === 'object' && detail?.message) {
                        message = detail.message;
                    } else {
                        message = typeof detail === 'string' ? detail : 'Validation error from server.';
                    }
                } else if (err?.response?.status === 401) {
                    message = 'Session expired or unauthorized. Please re-login.';
                } else if (err?.response?.status === 403) {
                    message = 'You do not have permission to view history for this GRN.';
                } else if (err?.response?.status === 500) {
                    message = 'Internal server error while loading GRN history. Please try again.';
                } else if (err?.response?.data?.message) {
                    message = err.response.data.message;
                } else if (err?.response?.data?.detail?.message) {
                    message = err.response.data.detail.message;
                } else if (err?.message) {
                    message = err.message;
                }
                setHistoryError(message);
                setHistoryData(null);
            }
        } finally {
            if (requestId === historyRequestIdRef.current) {
                setHistoryLoading(false);
            }
        }
    }, []);

    const handleViewHistory = (record) => {
        if (!record) return;
        const rawId = record.id ?? record.grn_id;
        setHistoryData(null);
        setHistoryError(null);
        setDetailTab('history');
        setSelectedGrn(record);
        fetchGrnHistory(rawId, record);
    };

    const handleCloseDetailModal = () => {
        detailRequestIdRef.current++;
        historyRequestIdRef.current++;
        setSelectedGrn(null);
        setDetailLoading(false);
        setDetailError(null);
        setDetailTab('details');
        setHistoryData(null);
        setHistoryError(null);
        setHistoryLoading(false);
        setHistoryGrnId(null);
    };

    const handleRetryDetail = () => {
        if (selectedGrn) {
            handleViewGrn(selectedGrn);
        }
    };

    // Export CSV State
    const [exportLoading, setExportLoading] = useState(false);
    const [exportError, setExportError] = useState(null);

    /**
     * Parse Content-Disposition header and extract safe filename
     */
    const extractFilename = (contentDisposition, fallback = 'grn_export.csv') => {
        if (!contentDisposition || typeof contentDisposition !== 'string') {
            return fallback;
        }

        // Try RFC 5987 filename*=UTF-8''...
        const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
            try {
                const decoded = decodeURIComponent(utf8Match[1].trim());
                return sanitizeFilename(decoded, fallback);
            } catch {
                // fallback
            }
        }

        // Try standard filename="..." or filename=...
        const match = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
        if (match) {
            const raw = (match[1] || match[2] || '').trim();
            return sanitizeFilename(raw, fallback);
        }

        return fallback;
    };

    const sanitizeFilename = (filename, fallback = 'grn_export.csv') => {
        if (!filename) return fallback;
        let clean = filename.replace(/["']/g, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
        if (!clean) return fallback;
        if (!clean.toLowerCase().endsWith('.csv')) {
            clean += '.csv';
        }
        return clean;
    };

    /**
     * Download backend-returned CSV Blob directly to client browser
     */
    const downloadCsvBlob = (blob, filename) => {
        const csvBlob = blob instanceof Blob && blob.type === 'text/csv'
            ? blob
            : new Blob([blob], { type: 'text/csv;charset=utf-8;' });

        const url = window.URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
    };

    /**
     * Parse error response that might have arrived as a Blob
     */
    const parseExportError = async (err) => {
        if (err?.response?.data instanceof Blob) {
            try {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.detail) {
                        if (Array.isArray(json.detail)) {
                            return json.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ');
                        }
                        return typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
                    }
                    if (json.message) return json.message;
                } catch {
                    if (text && text.length < 200) return text;
                }
            } catch {
                // fallback
            }
        }
        if (err?.response?.status === 401) return 'Session expired or unauthorized. Please re-login.';
        if (err?.response?.status === 422) return 'Validation error while generating CSV export.';
        if (err?.response?.status === 500) return 'Internal server error while generating CSV export.';
        return err?.message || 'Failed to download GRN CSV export.';
    };

    /**
     * Export GRN CSV handler:
     * Strictly calls GET /api/v1/grn/export using exportGRNs()
     */
    const handleExportCsv = async () => {
        if (exportLoading) return;

        setExportLoading(true);
        setExportError(null);

        try {
            // Include officially supported query parameters only if active
            const params = {};
            if (filterStatus && filterStatus !== 'all') {
                params.status = filterStatus;
            }

            const response = await exportGRNs(params);

            // Extract filename from response headers
            const contentDisposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
            const filename = extractFilename(contentDisposition, 'grn_export.csv');

            // Trigger direct browser download
            downloadCsvBlob(response.data, filename);
        } catch (err) {
            console.error('GRN CSV Export Error:', err);
            const errorMsg = await parseExportError(err);
            setExportError(errorMsg);
        } finally {
            setExportLoading(false);
        }
    };

    /**
     * PDF Filename extraction and sanitization
     */
    const sanitizePdfFilename = (filename, fallback = 'GRN.pdf') => {
        if (!filename) return fallback;
        let clean = filename.replace(/["']/g, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
        if (!clean) return fallback;
        if (!clean.toLowerCase().endsWith('.pdf')) {
            clean += '.pdf';
        }
        return clean;
    };

    const extractPdfFilename = (contentDisposition, fallback = 'GRN.pdf') => {
        if (!contentDisposition) return fallback;

        // Try RFC 5987 filename*=UTF-8''...
        const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
            try {
                const decoded = decodeURIComponent(utf8Match[1].trim());
                return sanitizePdfFilename(decoded, fallback);
            } catch {
                // fallback
            }
        }

        // Try standard filename="..." or filename=...
        const match = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
        if (match) {
            const raw = (match[1] || match[2] || '').trim();
            return sanitizePdfFilename(raw, fallback);
        }

        return fallback;
    };

    /**
     * Download backend-returned PDF Blob directly to client browser
     */
    const downloadPdfBlob = (blob, filename) => {
        const pdfBlob = blob instanceof Blob
            ? (blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' }))
            : new Blob([blob], { type: 'application/pdf' });

        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
    };

    /**
     * Parse PDF download error response that might have arrived as a Blob containing JSON
     */
    const parsePdfDownloadError = async (err) => {
        if (err?.response?.data instanceof Blob) {
            try {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.detail) {
                        if (Array.isArray(json.detail)) {
                            return `Validation error: ${json.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`;
                        }
                        if (typeof json.detail === 'object' && json.detail.message) {
                            return json.detail.message;
                        }
                        return typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
                    }
                    if (json.message) return json.message;
                } catch {
                    if (text && text.length < 200) return text;
                }
            } catch {
                // fallback
            }
        }

        if (err?.response?.status === 401) return 'Session expired or unauthorized. Please re-login.';
        if (err?.response?.status === 403) return 'You do not have permission to download this GRN PDF.';
        if (err?.response?.status === 404) return 'GRN PDF not found.';
        if (err?.response?.status === 422) {
            const backendDetail = err?.response?.data?.detail;
            if (typeof backendDetail === 'string') return backendDetail;
            if (Array.isArray(backendDetail)) {
                return `Validation error: ${backendDetail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`;
            }
            return 'Validation error while generating GRN PDF.';
        }
        if (err?.response?.status === 500) return 'Internal server error while generating GRN PDF. Please try again later.';
        if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.message?.toLowerCase().includes('network'))) {
            return 'Unable to download GRN PDF. Please try again.';
        }
        return err?.message || 'Unable to download GRN PDF. Please try again.';
    };

    /**
     * Download GRN PDF handler:
     * Calls GET /api/v1/grn/{grn_id}/download-pdf?format=pdf&mode=download via downloadGRNPdf(grnId)
     */
    const handleDownloadPdf = async (record) => {
        if (!record) return;

        const grnId = record.id ?? record.grn_id;
        if (grnId === undefined || grnId === null || String(grnId).trim() === '') {
            setPdfDownloadError('Invalid GRN ID. Cannot download PDF.');
            return;
        }

        const numericId = Number(grnId);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            setPdfDownloadError('Invalid GRN ID. Cannot download PDF.');
            return;
        }

        if (downloadingPdfGrnId === numericId) return;

        setDownloadingPdfGrnId(numericId);
        setPdfDownloadError(null);
        setPdfDownloadSuccess(null);

        try {
            const response = await downloadGRNPdf(numericId);

            // Verify that response is a valid non-empty blob
            if (!response?.data || (response.data instanceof Blob && response.data.size === 0)) {
                throw new Error('Received empty PDF response from server.');
            }

            // Derive fallback filename: GRN-{number}.pdf or GRN-{id}.pdf
            const grnNumber = record.grn_number || record.grnNumber;
            const fallbackFilename = grnNumber ? `${grnNumber}.pdf` : `GRN-${numericId}.pdf`;

            // Extract filename from Content-Disposition header if available
            const contentDisposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
            const filename = extractPdfFilename(contentDisposition, fallbackFilename);

            // Trigger browser download
            downloadPdfBlob(response.data, filename);

            setPdfDownloadSuccess(`Downloaded ${filename} successfully.`);
            setTimeout(() => {
                setPdfDownloadSuccess(null);
            }, 5000);
        } catch (err) {
            console.error('GRN PDF Download Error:', err);
            const errorMsg = await parsePdfDownloadError(err);
            setPdfDownloadError(errorMsg);
        } finally {
            setDownloadingPdfGrnId(null);
        }
    };

    /**
     * Parse error response from GET /api/v1/grn/{grn_id}/print-slip
     */
    const parsePrintSlipError = (err) => {
        if (err?.response?.data) {
            let parsed = null;
            if (typeof err.response.data === 'string') {
                try {
                    parsed = JSON.parse(err.response.data);
                } catch {
                    if (err.response.data.length < 200) parsed = { message: err.response.data };
                }
            } else if (typeof err.response.data === 'object') {
                parsed = err.response.data;
            }

            if (parsed) {
                if (parsed.detail) {
                    if (Array.isArray(parsed.detail)) {
                        return `Validation error: ${parsed.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`;
                    }
                    if (typeof parsed.detail === 'object' && parsed.detail.message) {
                        return parsed.detail.message;
                    }
                    return typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
                }
                if (parsed.message) return parsed.message;
            }
        }

        if (err?.response?.status === 401) return 'Session expired or unauthorized. Please re-login.';
        if (err?.response?.status === 403) return 'You do not have permission to view or print this GRN slip.';
        if (err?.response?.status === 404) return 'GRN print slip not found.';
        if (err?.response?.status === 422) return 'Validation error while generating GRN print slip.';
        if (err?.response?.status === 500) return 'Internal server error while generating GRN print slip. Please try again later.';
        if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.message?.toLowerCase().includes('network'))) {
            return 'Unable to load GRN print slip. Please try again.';
        }
        return err?.message || 'Unable to load GRN print slip. Please try again.';
    };

    /**
     * Safely prepare backend HTML for sandboxed preview:
     * - Preserves original printable content and layout
     * - Prevents navigation via unauthenticated relative API links inside the sandbox
     * - Ensures print media query prints cleanly without navigation bars
     */
    const preparePrintSlipHtml = (rawHtml) => {
        if (!rawHtml || typeof rawHtml !== 'string') return '';
        const helperCss = `
            <style id="retailos-print-helper">
                @media screen {
                    body {
                        margin: 0;
                        padding: 16px;
                        background: #f1f5f9;
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    /* Prevent unintended navigation via unauthenticated relative links */
                    a[href^="/api/"], a[href^="http://"], a[href^="https://"], .action-bar a:not([onclick*="print"]) {
                        pointer-events: none !important;
                        cursor: default !important;
                        opacity: 0.55 !important;
                        text-decoration: none !important;
                    }
                }
                @media print {
                    .action-bar, .actions, .no-print {
                        display: none !important;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff;
                    }
                }
            </style>
        `;

        if (rawHtml.includes('</head>')) {
            return rawHtml.replace('</head>', `${helperCss}</head>`);
        }
        return `${helperCss}${rawHtml}`;
    };

    /**
     * Fetch & Open Print Slip Preview
     * Calls GET /api/v1/grn/{grn_id}/print-slip via getGRNPrintSlip(grnId)
     */
    const handleOpenPrintSlip = async (record) => {
        if (!record) return;

        const grnId = record.id ?? record.grn_id;
        if (grnId === undefined || grnId === null || String(grnId).trim() === '') {
            setPrintSlipError('Invalid GRN ID. Cannot load print slip.');
            return;
        }

        const numericId = Number(grnId);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            setPrintSlipError('Invalid GRN ID. Cannot load print slip.');
            return;
        }

        if (fetchingSlipGrnId === numericId) return;

        setFetchingSlipGrnId(numericId);
        setPrintSlipError(null);

        try {
            const html = await getGRNPrintSlip(numericId);
            if (!html || typeof html !== 'string' || html.trim() === '') {
                throw new Error('Received empty print slip document from server.');
            }

            setPrintSlipHtml(html);
            setPrintSlipGrn(record);
            setIsPrintSlipModalOpen(true);
        } catch (err) {
            console.error('GRN Print Slip Error:', err);
            const errorMsg = parsePrintSlipError(err);
            setPrintSlipError(errorMsg);
        } finally {
            setFetchingSlipGrnId(null);
        }
    };

    /**
     * Trigger browser print dialog safely on the sandboxed preview iframe
     */
    const handleTriggerPrintSlipIframe = () => {
        try {
            if (printSlipIframeRef.current?.contentWindow) {
                printSlipIframeRef.current.contentWindow.focus();
                printSlipIframeRef.current.contentWindow.print();
            }
        } catch (err) {
            console.warn('Could not trigger iframe print directly, falling back:', err);
            handleOpenSlipInNewTab();
        }
    };

    /**
     * Open preview in a new browser tab using safe isolated Blob URL
     */
    const handleOpenSlipInNewTab = () => {
        try {
            if (!printSlipHtml) return;
            const preparedHtml = preparePrintSlipHtml(printSlipHtml);
            const blob = new Blob([preparedHtml], { type: 'text/html;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            if (!newWindow) {
                setPrintSlipError('Popup blocked by browser. Please allow popups or use the Print Slip button in the preview window.');
            }
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 60000);
        } catch (err) {
            console.error('Open new tab error:', err);
            setPrintSlipError('Unable to open preview in a new window.');
        }
    };

    const isGrnReceived = (statusStr) => {
        const s = String(statusStr || '').toLowerCase().trim();
        return s === 'received';
    };

    const isGrnReceiveEligible = (statusStr) => {
        const s = String(statusStr || '').toLowerCase().trim();
        if (s === 'received' || s === 'rejected') {
            return false;
        }
        return true;
    };

    const isGrnRejectEligible = (statusStr) => {
        const s = String(statusStr || '').toLowerCase().trim();
        if (s === 'received' || s === 'rejected') {
            return false;
        }
        return true;
    };

    const isGrnQcEligible = (statusStr) => {
        const s = String(statusStr || '').toLowerCase().trim();
        if (s === 'received' || s === 'rejected') {
            return false;
        }
        return true;
    };

    const handleOpenQcModal = async (record) => {
        if (!record) return;
        setQcError(null);
        setQcRemarks('');
        setQcGrn(record);
        setIsQcModalOpen(true);

        const grnId = record.id ?? record.grn_id;
        let itemsList = Array.isArray(record.items) ? record.items : [];
        if (itemsList.length === 0 && grnId) {
            setQcLoadingItems(true);
            try {
                const fullGrn = await getGRNById(Number(grnId));
                const resolvedGrn = fullGrn?.data && typeof fullGrn.data === 'object' && !Array.isArray(fullGrn.data) ? fullGrn.data : fullGrn;
                if (resolvedGrn && Array.isArray(resolvedGrn.items)) {
                    itemsList = resolvedGrn.items;
                    setQcGrn({ ...record, ...resolvedGrn });
                }
            } catch (err) {
                console.warn('Failed to load full GRN items for QC:', err);
            } finally {
                setQcLoadingItems(false);
            }
        }

        const mapped = itemsList.map(item => {
            const itemId = item.id;
            const ordQty = Number(item.ordered_quantity ?? item.quantity ?? 0);
            const recQty = Number(item.received_quantity ?? ordQty);
            const accQty = item.accepted_quantity != null ? Number(item.accepted_quantity) : recQty;
            const rejQty = item.rejected_quantity != null ? Number(item.rejected_quantity) : Math.max(0, recQty - accQty);

            return {
                item_id: itemId,
                product_id: item.product_id,
                product_name: item.product_name || `Product #${item.product_id || itemId}`,
                product_sku: item.product_sku || '',
                ordered_quantity: ordQty,
                received_quantity: recQty,
                accepted_quantity: accQty,
                rejected_quantity: rejQty,
                damage_reason: item.damage_reason || '',
                batch_number: item.batch_number || '',
                expiry_date: item.expiry_date ? String(item.expiry_date).split('T')[0] : '',
                remarks: item.remarks || ''
            };
        });

        setQcItems(mapped);
    };

    const handleCloseQcModal = () => {
        if (qcSubmitting) return;
        setIsQcModalOpen(false);
        setQcGrn(null);
        setQcItems([]);
        setQcRemarks('');
        setQcError(null);
    };

    const handleQcItemChange = (index, field, value) => {
        setQcItems(prev => {
            const updated = [...prev];
            const current = { ...updated[index] };

            if (field === 'accepted_quantity') {
                const num = Math.max(0, parseInt(value, 10) || 0);
                current.accepted_quantity = num;
                const recQty = Number(current.received_quantity) || 0;
                if (recQty > 0) {
                    current.rejected_quantity = Math.max(0, recQty - num);
                }
            } else if (field === 'rejected_quantity') {
                const num = Math.max(0, parseInt(value, 10) || 0);
                current.rejected_quantity = num;
                const recQty = Number(current.received_quantity) || 0;
                if (recQty > 0 && num <= recQty) {
                    current.accepted_quantity = Math.max(0, recQty - num);
                }
            } else {
                current[field] = value;
            }

            updated[index] = current;
            return updated;
        });
    };

    const handleSubmitQc = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setQcError(null);

        if (!qcGrn) return;
        if (qcSubmitting) return;

        const grnId = Number(qcGrn.id);
        if (!Number.isSafeInteger(grnId) || grnId <= 0) {
            setQcError("Invalid GRN ID.");
            return;
        }

        if (!qcItems || qcItems.length === 0) {
            setQcError("This GRN has no line items available for Quality Check.");
            return;
        }

        for (let i = 0; i < qcItems.length; i++) {
            const it = qcItems[i];
            const pLabel = it.product_name || `Item #${i + 1}`;

            if (!it.item_id || !Number.isSafeInteger(Number(it.item_id)) || Number(it.item_id) <= 0) {
                setQcError(`Line item "${pLabel}" has an invalid item_id.`);
                return;
            }

            const acc = Number(it.accepted_quantity);
            const rej = Number(it.rejected_quantity ?? 0);
            const rec = Number(it.received_quantity ?? 0);

            if (!Number.isInteger(acc) || acc < 0) {
                setQcError(`Accepted quantity for "${pLabel}" must be a non-negative integer.`);
                return;
            }

            if (!Number.isInteger(rej) || rej < 0) {
                setQcError(`Rejected quantity for "${pLabel}" must be a non-negative integer.`);
                return;
            }

            if (rec > 0 && (acc + rej) > rec) {
                setQcError(`For "${pLabel}", accepted (${acc}) + rejected (${rej}) exceeds received quantity (${rec}).`);
                return;
            }

            if (rej > 0 && (!it.damage_reason || !it.damage_reason.trim())) {
                setQcError(`Damage / rejection reason is required for "${pLabel}" when rejected quantity is greater than 0.`);
                return;
            }

            // Expiry date validation: cannot be in the past
            if (it.expiry_date && String(it.expiry_date).trim()) {
                const expVal = String(it.expiry_date).trim().split('T')[0];
                const todayStr = new Date().toISOString().split('T')[0];
                if (expVal < todayStr) {
                    setQcError(`Expiry date for "${pLabel}" cannot be in the past (${expVal}). Please select today or a future date, or leave it blank.`);
                    return;
                }
            }
        }

        const payload = {
            items: qcItems.map(it => ({
                item_id: Number(it.item_id),
                accepted_quantity: Number(it.accepted_quantity) || 0,
                rejected_quantity: Number(it.rejected_quantity) || 0,
                damage_reason: it.damage_reason && it.damage_reason.trim() ? it.damage_reason.trim().slice(0, 255) : null,
                batch_number: it.batch_number && it.batch_number.trim() ? it.batch_number.trim().slice(0, 100) : null,
                expiry_date: it.expiry_date && it.expiry_date.trim() ? it.expiry_date.trim() : null,
                remarks: it.remarks && it.remarks.trim() ? it.remarks.trim().slice(0, 500) : null,
            })),
            remarks: qcRemarks && qcRemarks.trim() ? qcRemarks.trim().slice(0, 1000) : null
        };

        setQcSubmitting(true);

        try {
            const updatedGrn = await qualityCheckGRN(grnId, payload);
            const grnNum = updatedGrn?.grn_number || qcGrn.grn_number || `GRN-${grnId}`;
            const successMsg = `Quality Check submitted successfully for ${grnNum}!`;
            setQcSuccess(successMsg);

            setIsQcModalOpen(false);
            setQcGrn(null);
            setQcItems([]);
            setQcRemarks('');

            if (selectedGrn && String(selectedGrn.id) === String(grnId)) {
                setSelectedGrn(updatedGrn);
            }

            await Promise.allSettled([
                fetchGrnData(),
                fetchGrnStats()
            ]);

            setTimeout(() => {
                setQcSuccess(prev => prev === successMsg ? null : prev);
            }, 5000);
        } catch (err) {
            console.error('Quality Check error:', err);

            if (err?.response?.status === 422) {
                const detail = err?.response?.data?.detail;
                if (Array.isArray(detail)) {
                    const validationMessages = detail.map(d => {
                        const field = d.loc ? d.loc.slice(-2).join(' -> ') : 'field';
                        return `${field}: ${d.msg}`;
                    }).join(', ');
                    setQcError(`Validation Error: ${validationMessages}`);
                } else if (typeof detail === 'object' && detail?.message) {
                    setQcError(detail.message);
                } else {
                    setQcError(typeof detail === 'string' ? detail : "Validation error from server.");
                }
            } else if (err?.response?.status === 409) {
                const conflictMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail || "Quality Check cannot be performed in the current GRN status.";
                setQcError(typeof conflictMsg === 'string' ? conflictMsg : JSON.stringify(conflictMsg));
            } else if (err?.response?.status === 400) {
                const badMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail || "Bad Request during Quality Check submission.";
                setQcError(typeof badMsg === 'string' ? badMsg : JSON.stringify(badMsg));
            } else if (err?.response?.status === 401) {
                setQcError("Session expired or unauthorized. Please re-login.");
            } else if (err?.response?.status === 403) {
                setQcError("You do not have permission to perform Quality Check on this GRN.");
            } else if (err?.response?.status === 404) {
                setQcError("GRN record or item not found.");
            } else if (err?.response?.status === 500) {
                setQcError("Internal server error while processing Quality Check. Please try again.");
            } else if (err?.response?.data?.message) {
                setQcError(err.response.data.message);
            } else if (err?.response?.data?.detail?.message) {
                setQcError(err.response.data.detail.message);
            } else if (err?.message) {
                setQcError(err.message);
            } else {
                setQcError("Failed to submit Quality Check.");
            }
        } finally {
            setQcSubmitting(false);
        }
    };

    /**
     * Receive Goods Receipt Note (GRN) into inventory:
     * Strictly calls POST /api/v1/grn/{grn_id}/receive via grnService.receive(grnId)
     */
    const handleReceiveGrn = async (record) => {
        console.log('[GRN Receive Button] handleReceiveGrn initiated with record:', record);
        if (!record) {
            console.warn('[GRN Receive Button] No record passed to handleReceiveGrn');
            return;
        }

        const rawId = record.id ?? record.grn_id;
        const grnId = Number(rawId);
        console.log('[GRN Receive Button] Extracted grnId:', grnId, 'status:', record.status, 'isGrnReceived:', isGrnReceived(record.status), 'isGrnReceiveEligible:', isGrnReceiveEligible(record.status));

        if (!Number.isSafeInteger(grnId) || grnId <= 0) {
            console.error('[GRN Receive Button] Invalid GRN ID:', rawId);
            setReceiveGrnError("Invalid GRN ID.");
            return;
        }

        // If grn.status is not eligible (received or rejected), do not call the API
        if (!isGrnReceiveEligible(record.status)) {
            console.warn('[GRN Receive Button] Record is not eligible for receive:', record);
            if (isGrnReceived(record.status)) {
                setReceiveGrnError("GRN has already been received and inventory updated");
            } else {
                setReceiveGrnError("Cannot receive a rejected GRN into inventory.");
            }
            return;
        }

        // Prevent duplicate API requests while receiving
        if (receivingGrnId) {
            console.warn('[GRN Receive Button] Receive API request already in progress for ID:', receivingGrnId);
            return;
        }

        setReceivingGrnId(grnId);
        setReceiveGrnError(null);
        setReceiveGrnSuccess(null);

        // Pre-receive validation: validate expiry dates for all items
        const todayStr = new Date().toISOString().split('T')[0];
        let itemsToCheck = Array.isArray(record.items) ? record.items : null;

        if (!itemsToCheck && selectedGrn && String(selectedGrn.id ?? selectedGrn.grn_id) === String(grnId) && Array.isArray(selectedGrn.items)) {
            itemsToCheck = selectedGrn.items;
        }

        if (!itemsToCheck) {
            try {
                const freshRes = await getGRNById(grnId);
                const freshData = freshRes?.data && typeof freshRes.data === 'object' && !Array.isArray(freshRes.data)
                    ? freshRes.data
                    : freshRes;
                if (freshData && Array.isArray(freshData.items)) {
                    itemsToCheck = freshData.items;
                }
            } catch (fetchErr) {
                console.warn('[GRN Receive Button] Could not pre-fetch GRN detail for expiry validation:', fetchErr);
            }
        }

        if (Array.isArray(itemsToCheck)) {
            for (const it of itemsToCheck) {
                const expDateStr = it.expiry_date ? String(it.expiry_date).split('T')[0] : null;
                if (expDateStr && expDateStr < todayStr) {
                    const prodName = it.product_name || (it.product_id != null ? `Product #${it.product_id}` : 'Item');
                    const expMsg = `Cannot receive GRN: Product "${prodName}" has an expired date (${expDateStr}). Expiry date cannot be in the past.`;
                    console.warn('[GRN Receive Button] Pre-receive expiry validation failed:', expMsg);
                    setReceiveGrnError(expMsg);
                    setReceivingGrnId(null);
                    return;
                }
            }
        }

        try {
            console.log('[GRN Receive Button] Dispatching grnService.receive for grnId:', grnId);
            const responseData = await grnService.receive(grnId);
            console.log('[GRN Receive Button] API call succeeded. Backend response:', responseData);

            const resolvedGrn = responseData?.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)
                ? responseData.data
                : responseData;

            // Display "GRN received successfully."
            const successMsg = "GRN received successfully.";
            setReceiveGrnSuccess(successMsg);

            // Optimistically update the GRN status to received in main list
            setGrns(prev => prev.map(item => {
                if (String(item.id ?? item.grn_id) === String(grnId)) {
                    return {
                        ...item,
                        ...(resolvedGrn && typeof resolvedGrn === 'object' ? resolvedGrn : {}),
                        status: 'received',
                    };
                }
                return item;
            }));

            // Optimistically update recent GRNs
            setStats(prev => {
                if (!prev || !Array.isArray(prev.recent_grns)) return prev;
                return {
                    ...prev,
                    recent_grns: prev.recent_grns.map(item => {
                        if (String(item.id ?? item.grn_id) === String(grnId)) {
                            return {
                                ...item,
                                ...(resolvedGrn && typeof resolvedGrn === 'object' ? resolvedGrn : {}),
                                status: 'received',
                            };
                        }
                        return item;
                    })
                };
            });

            // Update selectedGrn if open
            if (selectedGrn && String(selectedGrn.id ?? selectedGrn.grn_id) === String(grnId)) {
                setSelectedGrn(prev => ({
                    ...prev,
                    ...(resolvedGrn && typeof resolvedGrn === 'object' ? resolvedGrn : {}),
                    status: 'received',
                }));
                try {
                    const fresh = await getGRNById(grnId);
                    const freshData = fresh?.data && typeof fresh.data === 'object' && !Array.isArray(fresh.data)
                        ? fresh.data
                        : fresh;
                    if (freshData) {
                        setSelectedGrn(prev => ({
                            ...prev,
                            ...freshData,
                            status: 'received',
                        }));
                    }
                } catch (freshErr) {
                    console.warn('Could not refresh full GRN details after receive:', freshErr);
                }
                // Refresh history timeline to show the latest backend events
                fetchGrnHistory(grnId);
            }

            // Refresh main GRN table and Recent GRNs table
            await Promise.allSettled([
                fetchGrnData(),
                fetchGrnStats(),
            ]);

            // Auto-clear success message after 5 seconds
            setTimeout(() => {
                setReceiveGrnSuccess(prev => prev === successMsg ? null : prev);
            }, 5000);
        } catch (err) {
            console.error('[GRN Receive Button] Backend error received:', err, 'status:', err?.response?.status, 'data:', err?.response?.data);
            setReceiveGrnSuccess(null);

            // 409 Conflict: GRN already received or another business conflict
            if (err?.response?.status === 409) {
                const backendMsg =
                    err?.response?.data?.message ||
                    err?.response?.data?.detail?.message ||
                    (typeof err?.response?.data?.detail === 'string' ? err?.response?.data?.detail : null) ||
                    "GRN has already been received and inventory updated";
                setReceiveGrnError(backendMsg);

                // Refresh GRN listing, stats, and detail to reflect current backend status
                await Promise.allSettled([
                    fetchGrnData(),
                    fetchGrnStats(),
                    (selectedGrn && String(selectedGrn.id ?? selectedGrn.grn_id) === String(grnId))
                        ? getGRNById(grnId).then(res => {
                            const resData = res?.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res;
                            setSelectedGrn(prev => prev ? { ...prev, ...resData, status: 'received' } : resData);
                          }).catch(() => {})
                        : Promise.resolve()
                ]);
            } else if (err?.response?.status === 422) {
                // 422: Show validation errors returned by the backend clearly
                const resData = err?.response?.data;
                const backendMsg =
                    (typeof resData?.message === 'string' && resData.message.trim()) ||
                    (typeof resData?.detail?.message === 'string' && resData.detail.message.trim()) ||
                    (typeof resData?.detail === 'string' && resData.detail.trim()) ||
                    (Array.isArray(resData?.detail)
                        ? `Validation Error: ${resData.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`
                        : null) ||
                    (typeof resData?.error === 'string' && resData.error.trim()) ||
                    "Validation error: Expiry date cannot be in the past or invalid item data.";
                setReceiveGrnError(backendMsg);
            } else if (err?.response?.status === 401) {
                setReceiveGrnError("Session expired or unauthorized. Please re-login.");
            } else if (err?.response?.status === 403) {
                setReceiveGrnError("You do not have permission to receive this GRN into inventory.");
            } else if (err?.response?.status === 404) {
                setReceiveGrnError("GRN record not found.");
            } else if (err?.response?.status === 500) {
                setReceiveGrnError("Internal server error while receiving GRN. Please try again later.");
            } else if (err?.response?.data?.message) {
                setReceiveGrnError(err.response.data.message);
            } else if (err?.response?.data?.detail?.message) {
                setReceiveGrnError(err.response.data.detail.message);
            } else if (err?.message) {
                setReceiveGrnError(err.message);
            } else {
                setReceiveGrnError("Network error or failed to receive GRN.");
            }
        } finally {
            setReceivingGrnId(null);
        }
    };

    const handleRequestReceiveGrn = handleReceiveGrn;

    const handleRequestDeleteGrn = (record) => {
        if (!record) return;
        setDeleteGrnError(null);
        setGrnToDelete(record);
    };

    const handleCancelDeleteGrn = () => {
        if (deletingGrnId) return;
        setGrnToDelete(null);
        setDeleteGrnError(null);
    };

    const handleConfirmDeleteGrn = async () => {
        if (!grnToDelete) return;

        const rawId = grnToDelete.id ?? grnToDelete.grn_id;
        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            setDeleteGrnError("Invalid GRN ID. Cannot delete this record.");
            return;
        }

        if (deletingGrnId) return; // Prevent duplicate requests

        setDeletingGrnId(id);
        setDeleteGrnError(null);

        try {
            const response = await deleteGRN(id);
            const successMsg = response?.message || `GRN #${grnToDelete.grn_number || id} deleted successfully.`;
            setDeleteGrnSuccess(successMsg);
            setGrnToDelete(null);

            // If the deleted record was open in detail modal, close it
            if (selectedGrn && String(selectedGrn.id) === String(id)) {
                setSelectedGrn(null);
            }

            // Refresh GRN listing and statistics, preserving current search & filters
            await Promise.allSettled([
                fetchGrnData(),
                fetchGrnStats(),
            ]);

            // Auto-clear success message after 5 seconds
            setTimeout(() => {
                setDeleteGrnSuccess(prev => prev === successMsg ? null : prev);
            }, 5000);
        } catch (err) {
            console.error('Delete GRN error:', err);

            // 409 Conflict: backend returns "Cannot delete a GRN that has already been received into inventory"
            if (err?.response?.status === 409) {
                const backendMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail;
                const conflictMsg = (typeof backendMsg === 'string' && backendMsg.trim())
                    ? backendMsg
                    : "Cannot delete a GRN that has already been received into inventory";
                setDeleteGrnError(conflictMsg);
            } else if (err?.response?.status === 400) {
                const backendMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail;
                setDeleteGrnError(typeof backendMsg === 'string' ? backendMsg : 'Bad Request: unable to delete GRN.');
            } else if (err?.response?.status === 401) {
                setDeleteGrnError("Session expired or unauthorized. Please re-login.");
            } else if (err?.response?.status === 403) {
                const backendMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail;
                setDeleteGrnError(typeof backendMsg === 'string' ? backendMsg : "You do not have permission to delete this GRN.");
            } else if (err?.response?.status === 404) {
                setDeleteGrnError("GRN record not found.");
            } else if (err?.response?.status === 422) {
                const detail = err?.response?.data?.detail;
                if (Array.isArray(detail)) {
                    setDeleteGrnError(`Validation error: ${detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`);
                } else if (typeof detail === 'object' && detail?.message) {
                    setDeleteGrnError(detail.message);
                } else {
                    setDeleteGrnError(typeof detail === 'string' ? detail : "Validation error from server.");
                }
            } else if (err?.response?.status === 500) {
                setDeleteGrnError("Internal server error while deleting GRN. Please try again later.");
            } else if (err?.response?.data?.message) {
                setDeleteGrnError(err.response.data.message);
            } else if (err?.response?.data?.detail?.message) {
                setDeleteGrnError(err.response.data.detail.message);
            } else if (err?.message) {
                setDeleteGrnError(err.message);
            } else {
                setDeleteGrnError("Network error or failed to delete GRN record.");
            }
        } finally {
            setDeletingGrnId(null);
        }
    };

    /**
     * Reject Goods Receipt Note (GRN):
     * Strictly calls POST /api/v1/grn/{grn_id}/reject?reason=... via grnService.reject(id, reason)
     */
    const handleRequestRejectGrn = (record) => {
        if (!record) return;
        setRejectGrnError(null);
        setRejectReason('');
        setGrnToReject(record);
    };

    const handleCancelRejectGrn = () => {
        if (rejectingGrnId) return;
        setGrnToReject(null);
        setRejectReason('');
        setRejectGrnError(null);
    };

    const handleConfirmRejectGrn = async () => {
        if (!grnToReject) return;

        const rawId = grnToReject.id ?? grnToReject.grn_id;
        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            setRejectGrnError("Invalid GRN ID. Cannot reject this record.");
            return;
        }

        const trimmedReason = String(rejectReason || '').trim();
        if (!trimmedReason) {
            setRejectGrnError("Rejection reason is required. Please provide a valid reason.");
            return;
        }

        if (rejectingGrnId) return; // Prevent duplicate requests

        setRejectingGrnId(id);
        setRejectGrnError(null);

        try {
            const response = await grnService.reject(id, trimmedReason);
            const successMsg = response?.message || "GRN rejected successfully.";
            setRejectGrnSuccess(successMsg);
            setGrnToReject(null);
            setRejectReason('');

            // Optimistically update status in main GRN list
            setGrns(prev => prev.map(item => {
                if (String(item.id ?? item.grn_id) === String(id)) {
                    return {
                        ...item,
                        status: 'rejected',
                        rejection_reason: trimmedReason
                    };
                }
                return item;
            }));

            // Optimistically update status in recent GRNs
            setStats(prev => {
                if (!prev || !Array.isArray(prev.recent_grns)) return prev;
                return {
                    ...prev,
                    recent_grns: prev.recent_grns.map(item => {
                        if (String(item.id ?? item.grn_id) === String(id)) {
                            return {
                                ...item,
                                status: 'rejected',
                                rejection_reason: trimmedReason
                            };
                        }
                        return item;
                    })
                };
            });

            // If the rejected record was open in detail modal, refresh it
            if (selectedGrn && String(selectedGrn.id ?? selectedGrn.grn_id) === String(id)) {
                setSelectedGrn(prev => ({
                    ...prev,
                    status: 'rejected',
                    rejection_reason: trimmedReason
                }));
                try {
                    const fresh = await getGRNById(id);
                    const freshData = fresh?.data && typeof fresh.data === 'object' && !Array.isArray(fresh.data)
                        ? fresh.data
                        : fresh;
                    if (freshData) {
                        setSelectedGrn(prev => ({
                            ...prev,
                            ...freshData,
                            status: 'rejected',
                            rejection_reason: freshData.rejection_reason || trimmedReason
                        }));
                    }
                } catch (freshErr) {
                    console.warn('Could not refresh full GRN details after reject:', freshErr);
                }
                // Refresh history timeline to show the latest backend events
                fetchGrnHistory(id);
            }

            // Refresh GRN listing and statistics, preserving current search & filters
            await Promise.allSettled([
                fetchGrnData(),
                fetchGrnStats(),
            ]);

            // Auto-clear success message after 5 seconds
            setTimeout(() => {
                setRejectGrnSuccess(prev => prev === successMsg ? null : prev);
            }, 5000);
        } catch (err) {
            console.error('Reject GRN error:', err);

            // 409 Conflict: backend returns "Cannot reject a GRN that has already been received into inventory"
            if (err?.response?.status === 409) {
                const backendMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail;
                const conflictMsg = (typeof backendMsg === 'string' && backendMsg.trim())
                    ? backendMsg
                    : "Cannot reject a GRN that has already been received into inventory";
                setRejectGrnError(conflictMsg);

                // Refresh GRN listing to synchronize status
                await Promise.allSettled([
                    fetchGrnData(),
                    fetchGrnStats(),
                    (selectedGrn && String(selectedGrn.id ?? selectedGrn.grn_id) === String(id))
                        ? getGRNById(id).then(res => {
                            const resData = res?.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res;
                            setSelectedGrn(prev => prev ? { ...prev, ...resData } : resData);
                          }).catch(() => {})
                        : Promise.resolve()
                ]);
            } else if (err?.response?.status === 422) {
                const resData = err?.response?.data;
                const detail = resData?.detail;
                let validationMsg = '';
                if (typeof resData?.message === 'string' && resData.message.trim()) {
                    validationMsg = resData.message.trim();
                } else if (Array.isArray(detail)) {
                    validationMsg = `Validation Error: ${detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ')}`;
                } else if (typeof detail === 'object' && detail?.message) {
                    validationMsg = detail.message;
                } else if (typeof detail === 'string' && detail.trim()) {
                    validationMsg = detail.trim();
                } else if (typeof resData?.error === 'string' && resData.error.trim()) {
                    validationMsg = resData.error.trim();
                } else {
                    validationMsg = "Validation error: Rejection reason is missing or invalid.";
                }
                setRejectGrnError(validationMsg);
            } else if (err?.response?.status === 400) {
                const backendMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail;
                setRejectGrnError(typeof backendMsg === 'string' ? backendMsg : 'Bad Request: unable to reject GRN.');
            } else if (err?.response?.status === 401) {
                setRejectGrnError("Session expired or unauthorized. Please re-login.");
            } else if (err?.response?.status === 403) {
                const backendMsg = err?.response?.data?.message || err?.response?.data?.detail?.message || err?.response?.data?.detail;
                setRejectGrnError(typeof backendMsg === 'string' ? backendMsg : "You do not have permission to reject this GRN.");
            } else if (err?.response?.status === 404) {
                setRejectGrnError("GRN record not found.");
            } else if (err?.response?.status === 500) {
                setRejectGrnError("Internal server error while rejecting GRN. Please try again later.");
            } else if (err?.response?.data?.message) {
                setRejectGrnError(err.response.data.message);
            } else if (err?.response?.data?.detail?.message) {
                setRejectGrnError(err.response.data.detail.message);
            } else if (err?.message) {
                setRejectGrnError(err.message);
            } else {
                setRejectGrnError("Network error or failed to reject GRN record.");
            }
        } finally {
            setRejectingGrnId(null);
        }
    };

    const isPoCompletedOrReceived = (po) => {
        if (!po) return false;
        const status = String(po.status || po.backendStatus || '').toLowerCase();
        return status === 'received' || status === 'completed' || status === 'closed' || po.is_fully_received === true;
    };

    /**
     * Fetch GRN records strictly using GET /api/v1/grn
     * Sends ONLY query parameters with actual selected values
     */
    const fetchGrnData = useCallback(async (overrides = {}) => {
        setLoading(true);
        setError(null);
        try {
            const currentPo = overrides.purchase_order_id !== undefined ? overrides.purchase_order_id : filterPoId;
            const currentWh = overrides.warehouse_id !== undefined ? overrides.warehouse_id : filterWarehouseId;
            const currentStore = overrides.store_id !== undefined ? overrides.store_id : filterStoreId;
            const currentSup = overrides.supplier_id !== undefined ? overrides.supplier_id : filterSupplierId;
            const currentStatus = overrides.status !== undefined ? overrides.status : filterStatus;
            const currentSearch = overrides.search !== undefined ? overrides.search : search;

            const queryParams = {};
            if (currentPo && currentPo !== 'all') {
                queryParams.purchase_order_id = Number(currentPo) || currentPo;
            }
            if (currentWh && currentWh !== 'all') {
                queryParams.warehouse_id = Number(currentWh) || currentWh;
            }
            if (currentStore && currentStore !== 'all') {
                queryParams.store_id = Number(currentStore) || currentStore;
            }
            if (currentSup && currentSup !== 'all') {
                queryParams.supplier_id = Number(currentSup) || currentSup;
            }
            if (currentStatus && currentStatus !== 'all') {
                queryParams.status = String(currentStatus).trim();
            }
            if (currentSearch && String(currentSearch).trim()) {
                queryParams.search = String(currentSearch).trim();
            }

            const res = await getGRNs(queryParams);
            console.log("GET /api/v1/grn Raw Response:", res);
            const list = Array.isArray(res)
                ? res
                : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data?.items) ? res.data.items : [])));
            console.log("Parsed GRN list from GET /api/v1/grn:", list.map(g => ({
                id: g.id ?? g.grn_id,
                grn_number: g.grn_number,
                status: g.status ?? g.grn_status,
                eligible: isGrnReceiveEligible(g.status ?? g.grn_status)
            })));
            setGrns(list);
        } catch (err) {
            console.error('Failed to load GRNs from GET /api/v1/grn:', err);
            const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to load GRN records from backend';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            setGrns([]);
        } finally {
            setLoading(false);
        }
    }, [filterPoId, filterWarehouseId, filterStoreId, filterSupplierId, filterStatus, search]);

    /**
     * Fetch GRN dashboard statistics and recent GRN data
     * STRICT ENDPOINT: GET /api/v1/grn/stats
     */
    const fetchGrnStats = useCallback(async () => {
        const requestId = ++statsRequestIdRef.current;
        setStatsLoading(true);
        setStatsError(null);
        try {
            const data = await getGRNStats();
            console.log("GET /api/v1/grn/stats Raw Response:", data);
            if (requestId === statsRequestIdRef.current) {
                setStats(data && typeof data === 'object' ? data : {});
            }
        } catch (err) {
            console.error('Failed to load GRN stats from GET /api/v1/grn/stats:', err);
            if (requestId === statsRequestIdRef.current) {
                const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to load GRN statistics';
                setStatsError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
        } finally {
            if (requestId === statsRequestIdRef.current) {
                setStatsLoading(false);
            }
        }
    }, []);

    const fetchMetadata = useCallback(async () => {
        try {
            const [poRes, whRes, storeRes, supRes] = await Promise.allSettled([
                getPurchaseOrders(1, 100),
                getWarehouses(),
                listStores(),
                listSuppliers()
            ]);

            if (poRes.status === 'fulfilled') {
                const poData = poRes.value;
                const poList = Array.isArray(poData)
                    ? poData
                    : (Array.isArray(poData?.data) ? poData.data : (Array.isArray(poData?.items) ? poData.items : []));
                setPurchaseOrders(poList);
            }

            if (whRes.status === 'fulfilled') {
                const whData = whRes.value;
                const whList = Array.isArray(whData)
                    ? whData
                    : (Array.isArray(whData?.data) ? whData.data : (Array.isArray(whData?.items) ? whData.items : []));
                setWarehouses(whList);
            }

            if (storeRes.status === 'fulfilled') {
                const storeData = storeRes.value;
                const stList = Array.isArray(storeData)
                    ? storeData
                    : (Array.isArray(storeData?.data?.data) ? storeData.data.data : (Array.isArray(storeData?.data) ? storeData.data : []));
                setStores(stList);
            }

            if (supRes.status === 'fulfilled') {
                const supData = supRes.value;
                const supList = Array.isArray(supData)
                    ? supData
                    : (Array.isArray(supData?.data) ? supData.data : (Array.isArray(supData?.items) ? supData.items : []));
                setSuppliers(supList);
            }
        } catch (err) {
            console.warn('Error fetching metadata for GRN:', err);
        }
    }, []);

    useEffect(() => {
        fetchGrnData();
        fetchGrnStats();
        fetchMetadata();
    }, [fetchGrnData, fetchGrnStats, fetchMetadata]);

    const handleCloseCreateModal = () => {
        if (isSubmitting) return;
        setIsCreateModalOpen(false);
        setFormError(null);
        setFormSuccess(null);
        setSelectedPoId('');
        setInvoiceNumber('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setVehicleNumber('');
        setTransporterName('');
        setRemarks('');
        setItems([]);
        setIsPoFullyReceived(false);
        setPoWarning(null);
    };

    const handleOpenCreateModal = () => {
        setFormError(null);
        setFormSuccess(null);
        setSelectedPoId('');
        setSelectedWarehouseId(warehouses[0]?.id ? String(warehouses[0].id) : '');
        setSelectedStoreId(stores[0]?.id ? String(stores[0].id) : '');
        setInvoiceNumber('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setVehicleNumber('');
        setTransporterName('');
        setRemarks('');
        setItems([]);
        setIsPoFullyReceived(false);
        setPoWarning(null);
        setIsCreateModalOpen(true);
        fetchMetadata();
    };

    const handleSelectPo = async (poId) => {
        setSelectedPoId(poId);
        setFormError(null);
        setFormSuccess(null);
        setPoWarning(null);
        setIsPoFullyReceived(false);

        if (!poId) {
            setItems([]);
            setInvoiceNumber('');
            return;
        }

        const po = purchaseOrders.find(p => String(p.id) === String(poId));
        if (!po) return;

        // Auto-fill warehouse and store if available on the PO
        if (po.warehouse_id) setSelectedWarehouseId(String(po.warehouse_id));
        if (po.store_id) setSelectedStoreId(String(po.store_id));

        // When switching PO, do not silently reuse an old invoice number or auto-fill a known duplicate:
        if (po.invoice_number) {
            const trimmedPoInv = String(po.invoice_number).trim().toLowerCase();
            const existingGrnList = [
                ...(Array.isArray(grns) ? grns : []),
                ...((stats && Array.isArray(stats.recent_grns)) ? stats.recent_grns : [])
            ];
            const isAlreadyUsed = existingGrnList.some(g => String(g.invoice_number || '').trim().toLowerCase() === trimmedPoInv);
            if (!isAlreadyUsed) {
                setInvoiceNumber(String(po.invoice_number));
            } else {
                setInvoiceNumber('');
            }
        } else {
            // New PO does not have an invoice number, reset field so prior PO's invoice isn't silently reused
            setInvoiceNumber('');
        }

        // Check 409 Conflict eligibility: Is PO already fully received?
        if (isPoCompletedOrReceived(po)) {
            setIsPoFullyReceived(true);
            const poLabel = po.po_number || `PO-${po.id}`;
            setPoWarning(`Purchase Order #${poLabel} has already been fully received. Cannot create another GRN.`);
        }

        // Load items from PO or fetch full PO details
        let poItems = po.items || po.purchase_items || po.purchase_order_items || [];
        if (!poItems.length) {
            setLoadingPoDetails(true);
            try {
                const fullRes = await getPurchaseOrder(po.id);
                const fullPo = fullRes?.data || fullRes;
                poItems = fullPo?.items || fullPo?.purchase_items || fullPo?.purchase_order_items || [];
            } catch (err) {
                console.warn('Could not fetch single PO items:', err);
            } finally {
                setLoadingPoDetails(false);
            }
        }

        const mappedItems = poItems.map(item => {
            const pid = Number(item.product_id ?? item.productId ?? item.id);
            const ordQty = Number(item.ordered_quantity ?? item.quantity ?? 0);
            const cost = Number(item.unit_cost ?? item.cost_price ?? item.price ?? item.unit_price ?? 0);
            const pName = item.product_name || item.name || item.product?.name || `Product #${pid}`;
            return {
                product_id: pid,
                product_name: pName,
                ordered_quantity: ordQty,
                received_quantity: ordQty,
                accepted_quantity: ordQty,
                rejected_quantity: 0,
                damage_reason: '',
                unit_cost: cost,
                batch_number: '',
                expiry_date: '',
                remarks: ''
            };
        });

        setItems(mappedItems);
    };

    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            const current = { ...updated[index] };

            if (field === 'received_quantity') {
                const num = Math.max(0, Number(value) || 0);
                current.received_quantity = num;
                // Auto-adjust accepted = received - rejected
                current.accepted_quantity = Math.max(0, num - (Number(current.rejected_quantity) || 0));
            } else if (field === 'accepted_quantity') {
                const num = Math.max(0, Number(value) || 0);
                current.accepted_quantity = num;
                // Auto-adjust rejected = received - accepted
                current.rejected_quantity = Math.max(0, (Number(current.received_quantity) || 0) - num);
            } else if (field === 'rejected_quantity') {
                const num = Math.max(0, Number(value) || 0);
                current.rejected_quantity = num;
                // Auto-adjust accepted = received - rejected
                current.accepted_quantity = Math.max(0, (Number(current.received_quantity) || 0) - num);
            } else if (field === 'unit_cost') {
                current.unit_cost = Math.max(0, Number(value) || 0);
            } else {
                current[field] = value;
            }

            updated[index] = current;
            return updated;
        });
    };

    const handleSubmitGrn = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setFormError(null);
        setFormSuccess(null);

        if (isSubmitting) return;

        // 1. PO Validation
        if (!selectedPoId) {
            setFormError('Please select a Purchase Order.');
            return;
        }

        const po = purchaseOrders.find(p => String(p.id) === String(selectedPoId));
        if (isPoCompletedOrReceived(po) || isPoFullyReceived) {
            const poLabel = po?.po_number || `PO-${selectedPoId}`;
            setFormError(`Purchase Order #${poLabel} has already been fully received. Cannot create another GRN.`);
            return;
        }

        // 2. Warehouse and Store Validation
        if (!selectedWarehouseId) {
            setFormError('Receiving Warehouse is required.');
            return;
        }
        if (!selectedStoreId) {
            setFormError('Store is required.');
            return;
        }

        // 3. Invoice Validation
        const trimmedInvoice = invoiceNumber.trim();
        if (!trimmedInvoice) {
            setFormError('Invoice Number is required.');
            return;
        }
        if (!invoiceDate) {
            setFormError('Invoice Date is required.');
            return;
        }

        // Duplicate Invoice Validation: Compare entered invoice number against existing GRN records (case-insensitive)
        const existingGrnList = [
            ...(Array.isArray(grns) ? grns : []),
            ...((stats && Array.isArray(stats.recent_grns)) ? stats.recent_grns : [])
        ];
        const duplicateGrn = existingGrnList.find(g =>
            String(g.invoice_number || '').trim().toLowerCase() === trimmedInvoice.toLowerCase()
        );

        if (duplicateGrn) {
            const grnLabel = duplicateGrn.grn_number || (duplicateGrn.id ? `GRN-${duplicateGrn.id}` : null);
            const statusLabel = duplicateGrn.status ? ` with status '${duplicateGrn.status}'` : '';
            const msg = grnLabel
                ? `This invoice number is already used by an existing GRN (${grnLabel}${statusLabel}). Please enter a different invoice number.`
                : `This invoice number is already used by an existing GRN. Please enter a different invoice number.`;
            setFormError(msg);
            return;
        }

        // 4. Line Items Validation
        if (!items || items.length === 0) {
            setFormError('The selected Purchase Order has no product line items to inward.');
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const recv = Number(it.received_quantity);
            const acc = Number(it.accepted_quantity);
            const rej = Number(it.rejected_quantity || 0);

            if (recv < 0 || acc < 0 || rej < 0) {
                setFormError(`Quantities must be non-negative for ${it.product_name}.`);
                return;
            }

            if (acc + rej !== recv) {
                setFormError(`For ${it.product_name}: Accepted Quantity (${acc}) + Rejected Quantity (${rej}) must equal Received Quantity (${recv}).`);
                return;
            }

            if (rej > 0 && !String(it.damage_reason || '').trim()) {
                setFormError(`Please provide a damage/rejection reason for ${it.product_name} because rejected quantity is ${rej}.`);
                return;
            }

            // Expiry date validation: if provided, cannot be in the past
            if (it.expiry_date && String(it.expiry_date).trim()) {
                const expVal = String(it.expiry_date).trim().split('T')[0];
                const todayStr = new Date().toISOString().split('T')[0];
                if (expVal < todayStr) {
                    setFormError(`Expiry date for "${it.product_name || `Item ${i + 1}`}" cannot be in the past (${expVal}). Please select today or a future date, or leave it blank if expiry is not tracked.`);
                    return;
                }
            }
        }

        const totalReceived = items.reduce((sum, it) => sum + Number(it.received_quantity || 0), 0);
        if (totalReceived <= 0) {
            setFormError('Total received quantity must be greater than 0.');
            return;
        }

        // Construct exact backend schema payload
        const payload = {
            purchase_order_id: Number(selectedPoId),
            warehouse_id: Number(selectedWarehouseId),
            store_id: Number(selectedStoreId),
            invoice_number: invoiceNumber.trim(),
            invoice_date: invoiceDate,
            vehicle_number: vehicleNumber.trim() || undefined,
            transporter_name: transporterName.trim() || undefined,
            remarks: remarks.trim() || undefined,
            items: items.map(it => {
                const itemData = {
                    product_id: Number(it.product_id),
                    ordered_quantity: Number(it.ordered_quantity),
                    received_quantity: Number(it.received_quantity),
                    accepted_quantity: Number(it.accepted_quantity),
                    rejected_quantity: Number(it.rejected_quantity || 0),
                    damage_reason: it.damage_reason ? it.damage_reason.trim() : '',
                    unit_cost: Number(it.unit_cost || 0)
                };
                if (it.batch_number && it.batch_number.trim()) {
                    itemData.batch_number = it.batch_number.trim();
                }
                if (it.expiry_date && it.expiry_date.trim()) {
                    itemData.expiry_date = it.expiry_date.trim();
                } else {
                    itemData.expiry_date = null;
                }
                if (it.remarks && it.remarks.trim()) {
                    itemData.remarks = it.remarks.trim();
                }
                return itemData;
            })
        };

        setIsSubmitting(true);

        try {
            const response = await createGRN(payload);
            const createdData = response?.data || response;
            const grnNum = createdData?.grn_number || createdData?.id || response?.grn_number || 'New Note';
            setFormSuccess(`GRN #${grnNum} created successfully!`);

            // Refresh GRN records, stats, and POs
            await fetchGrnData();
            await fetchGrnStats();
            await fetchMetadata();

            // Close modal after brief success presentation and reset form
            setTimeout(() => {
                handleCloseCreateModal();
            }, 1800);
        } catch (err) {
            console.error('Create GRN Error:', err);
            if (err?.response?.status === 409) {
                // Exact 409 Conflict handling without auto-retry
                const resData = err?.response?.data;
                const conflictMsg =
                    (typeof resData?.message === 'string' && resData.message.trim()) ||
                    (typeof resData?.detail?.message === 'string' && resData.detail.message.trim()) ||
                    (typeof resData?.detail === 'string' && resData.detail.trim()) ||
                    (typeof resData?.error === 'string' && resData.error.trim()) ||
                    'A conflict occurred: A GRN with this invoice number or purchase order already exists.';
                setFormError(conflictMsg);

                // Only mark PO as fully received if the conflict message explicitly indicates PO receipt conflict
                const lowerMsg = String(conflictMsg).toLowerCase();
                if (lowerMsg.includes('purchase order') && (lowerMsg.includes('received') || lowerMsg.includes('completed'))) {
                    setIsPoFullyReceived(true);
                }

                // Refresh GRN data in background to ensure local list is synchronized
                fetchGrnData();
            } else if (err?.response?.status === 422) {
                const detail = err?.response?.data?.detail;
                if (Array.isArray(detail)) {
                    const validationMessages = detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join(', ');
                    setFormError(`Validation error: ${validationMessages}`);
                } else {
                    setFormError(typeof detail === 'string' ? detail : 'Invalid data format submitted to GRN API.');
                }
            } else {
                const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to create GRN.';
                setFormError(typeof message === 'string' ? message : JSON.stringify(message));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter handlers
    const handleFilterChange = (key, value) => {
        if (key === 'purchase_order_id') setFilterPoId(value);
        else if (key === 'warehouse_id') setFilterWarehouseId(value);
        else if (key === 'store_id') setFilterStoreId(value);
        else if (key === 'supplier_id') setFilterSupplierId(value);
        else if (key === 'status') setFilterStatus(value);

        fetchGrnData({ [key]: value });
    };

    const handleSearchSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        fetchGrnData({ search });
    };

    const handleRefreshAll = () => {
        fetchGrnData();
        fetchGrnStats();
    };

    const handleResetFilters = () => {
        setFilterPoId('');
        setFilterWarehouseId('');
        setFilterStoreId('');
        setFilterSupplierId('');
        setFilterStatus('');
        setSearch('');
        fetchGrnData({
            purchase_order_id: '',
            warehouse_id: '',
            store_id: '',
            supplier_id: '',
            status: '',
            search: ''
        });
        fetchGrnStats();
    };

    const hasActiveFilters = Boolean(
        (filterPoId && filterPoId !== 'all') ||
        (filterWarehouseId && filterWarehouseId !== 'all') ||
        (filterStoreId && filterStoreId !== 'all') ||
        (filterSupplierId && filterSupplierId !== 'all') ||
        (filterStatus && filterStatus !== 'all') ||
        (search && search.trim())
    );

    // Available suppliers derived from suppliers API or extracted from POs
    const availableSuppliers = suppliers.length > 0 ? suppliers : (() => {
        const map = new Map();
        purchaseOrders.forEach(po => {
            const sid = po.supplier_id || po.supplier?.id;
            const sname = po.supplier_name || po.supplier?.name;
            if (sid && !map.has(sid)) {
                map.set(sid, { id: sid, name: sname || `Supplier #${sid}` });
            }
        });
        return Array.from(map.values());
    })();

    const renderStatusBadge = (statusStr) => {
        const s = String(statusStr || '').toLowerCase();
        let bg = '#eff6ff';
        let color = '#2563eb';
        let label = statusStr || 'Pending';

        if (s === 'received') {
            bg = '#ecfdf5';
            color = '#059669';
            label = 'Received';
        } else if (s === 'rejected' || s.includes('damage') || s.includes('discrepancy')) {
            bg = '#fef2f2';
            color = '#dc2626';
            label = 'Rejected';
        } else if (s === 'pending' || s === 'draft') {
            bg = '#fffbeb';
            color = '#d97706';
            label = 'Pending';
        }

        return (
            <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                background: bg, color: color, textTransform: 'capitalize', display: 'inline-block'
            }}>
                {label}
            </span>
        );
    };

    return (
        <ModuleContainer
            title="Goods Received Notes (GRN)"
            subtitle="Inspect, inward physical shipments against purchase orders, and verify batch/expiry dates"
            icon={<BsTruck />}
            actionBtn={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={exportLoading}
                        title="Export GRN records to CSV"
                        style={{
                            background: '#ffffff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 16px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: exportLoading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                            opacity: exportLoading ? 0.7 : 1
                        }}
                    >
                        <BsDownload size={15} /> {exportLoading ? 'Exporting...' : 'Export CSV'}
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        style={{
                            background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        <BsPlus size={18} /> Create Inward GRN
                    </button>
                </div>
            }
        >
            {/* Success Banners */}
            {deleteGrnSuccess && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircle size={16} style={{ color: '#059669' }} />
                        <span><strong>Success:</strong> {deleteGrnSuccess}</span>
                    </div>
                    <button
                        onClick={() => setDeleteGrnSuccess(null)}
                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {qcSuccess && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircle size={16} style={{ color: '#059669' }} />
                        <span><strong>QC Completed:</strong> {qcSuccess}</span>
                    </div>
                    <button
                        onClick={() => setQcSuccess(null)}
                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {receiveGrnSuccess && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircle size={16} style={{ color: '#059669' }} />
                        <span><strong>Received:</strong> {receiveGrnSuccess}</span>
                    </div>
                    <button
                        onClick={() => setReceiveGrnSuccess(null)}
                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {receiveGrnError && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsExclamationTriangle size={16} style={{ color: '#dc2626' }} />
                        <span><strong>Error:</strong> {receiveGrnError}</span>
                    </div>
                    <button
                        onClick={() => setReceiveGrnError(null)}
                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {rejectGrnSuccess && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircle size={16} style={{ color: '#059669' }} />
                        <span><strong>Rejected:</strong> {rejectGrnSuccess}</span>
                    </div>
                    <button
                        onClick={() => setRejectGrnSuccess(null)}
                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {rejectGrnError && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsExclamationTriangle size={16} style={{ color: '#dc2626' }} />
                        <span><strong>Error:</strong> {rejectGrnError}</span>
                    </div>
                    <button
                        onClick={() => setRejectGrnError(null)}
                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {pdfDownloadSuccess && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircle size={16} style={{ color: '#059669' }} />
                        <span><strong>Downloaded:</strong> {pdfDownloadSuccess}</span>
                    </div>
                    <button
                        onClick={() => setPdfDownloadSuccess(null)}
                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {pdfDownloadError && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsExclamationTriangle size={16} style={{ color: '#dc2626' }} />
                        <span><strong>PDF Download Error:</strong> {pdfDownloadError}</span>
                    </div>
                    <button
                        onClick={() => setPdfDownloadError(null)}
                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {printSlipError && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsExclamationTriangle size={16} style={{ color: '#dc2626' }} />
                        <span><strong>Print Slip Error:</strong> {printSlipError}</span>
                    </div>
                    <button
                        onClick={() => setPrintSlipError(null)}
                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {/* Stat Cards strictly mapped from GET /api/v1/grn/stats */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard
                    label="Total GRNs"
                    value={statsLoading ? '...' : String(stats?.total_grns ?? 0)}
                    sub="Recorded in Retail OS"
                    color="#6366f1"
                />
                <StatCard
                    label="Pending GRNs"
                    value={statsLoading ? '...' : String(stats?.pending_grns ?? 0)}
                    sub="Awaiting inspection"
                    color="#f59e0b"
                />
                <StatCard
                    label="Received GRNs"
                    value={statsLoading ? '...' : String(stats?.received_grns ?? 0)}
                    sub="Inwarded to stock"
                    color="#10b981"
                />
                <StatCard
                    label="Rejected GRNs"
                    value={statsLoading ? '...' : String(stats?.rejected_grns ?? 0)}
                    sub="Discrepancies / damages"
                    color="#ef4444"
                />
                <StatCard
                    label="Received Today"
                    value={statsLoading ? '...' : String(stats?.received_today ?? 0)}
                    sub="Shipments arrived today"
                    color="#0ea5e9"
                />
                <StatCard
                    label="Total Inward Value"
                    value={statsLoading ? '...' : (
                        stats?.total_inward_value != null
                            ? `₹${Number(stats.total_inward_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '₹0.00'
                    )}
                    sub="Cumulative inventory cost"
                    color="#8b5cf6"
                />
            </div>

            {/* Error Banners */}
            {error && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span>{error}</span>
                    <button
                        onClick={handleRefreshAll}
                        style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                        Retry Listing
                    </button>
                </div>
            )}

            {statsError && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, color: '#b45309', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span><strong>Stats Note:</strong> {statsError}</span>
                    <button
                        onClick={fetchGrnStats}
                        style={{ background: '#b45309', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                        Retry Stats
                    </button>
                </div>
            )}

            {exportError && (
                <div style={{
                    marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span><strong>Export Error:</strong> {exportError}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={handleExportCsv}
                            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                            Retry Export
                        </button>
                        <button
                            onClick={() => setExportError(null)}
                            style={{ background: 'transparent', color: '#991b1b', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Recent GRNs Section from GET /api/v1/grn/stats */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsClockHistory style={{ color: '#6366f1' }} size={16} />
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Recent GRNs</h3>
                        <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                            {stats?.recent_grns?.length ?? 0} records
                        </span>
                    </div>
                    <button
                        onClick={() => setShowRecentGrns(!showRecentGrns)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6366f1', fontWeight: 600 }}
                    >
                        {showRecentGrns ? 'Collapse' : 'Expand'}
                    </button>
                </div>

                {showRecentGrns && (
                    <div>
                        {statsLoading ? (
                            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                                Loading recent GRNs...
                            </div>
                        ) : (!stats?.recent_grns || stats.recent_grns.length === 0) ? (
                            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#6b7280' }}>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#4b5563' }}>No recent GRN records found</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                        <tr>
                                            <th style={{ padding: '10px 14px' }}>GRN #</th>
                                            <th style={{ padding: '10px 14px' }}>PO Number</th>
                                            <th style={{ padding: '10px 14px' }}>Supplier</th>
                                            <th style={{ padding: '10px 14px' }}>Warehouse</th>
                                            <th style={{ padding: '10px 14px' }}>Store</th>
                                            <th style={{ padding: '10px 14px' }}>Status</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Items / Recv</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Cost Value</th>
                                            <th style={{ padding: '10px 14px' }}>Received / Created At</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recent_grns.map((rg, idx) => {
                                            const grnId = rg.id ?? rg.grn_id;
                                            const grnNum = rg.grn_number || (grnId ? `GRN-${grnId}` : '—');
                                            const grnStatus = rg.status ?? rg.grn_status ?? '';
                                            const eligible = isGrnReceiveEligible(grnStatus);
                                            const isReceiveDisabled = !eligible || Boolean(receivingGrnId);

                                            console.log("GRN Receive Debug:", {
                                                id: grnId,
                                                status: grnStatus,
                                                eligible: eligible,
                                                receivingGrnId,
                                                disabled: isReceiveDisabled
                                            });

                                            const poNum = rg.purchase_order_number || (rg.purchase_order_id ? `PO-${rg.purchase_order_id}` : '—');
                                            const supName = rg.supplier_name || '—';
                                            const whName = rg.warehouse_name || '—';
                                            const stName = rg.store_name || '—';
                                            const itemsCnt = rg.total_items_count ?? (Array.isArray(rg.items) ? rg.items.length : 0);
                                            const recvQty = rg.total_received_quantity ?? 0;
                                            const costVal = rg.total_cost_value != null ? `₹${Number(rg.total_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00';
                                            const dateStr = rg.received_at ? new Date(rg.received_at).toLocaleDateString() : (rg.created_at ? new Date(rg.created_at).toLocaleDateString() : '—');

                                            return (
                                                <tr key={grnId || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#6366f1' }}>
                                                        {grnNum}
                                                        <div style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 400 }}>ID: #{grnId ?? '—'}</div>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#374151' }}>{poNum}</td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{supName}</td>
                                                    <td style={{ padding: '10px 14px' }}>{whName}</td>
                                                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{stName}</td>
                                                    <td style={{ padding: '10px 14px' }}>{renderStatusBadge(grnStatus)}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                        {recvQty} pcs <span style={{ color: '#9ca3af' }}>({itemsCnt} items)</span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{costVal}</td>
                                                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 11.5 }}>{dateStr}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewGrn(rg);
                                                                }}
                                                                style={{ background: '#f3f4f6', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'auto', position: 'relative', zIndex: 2 }}
                                                                title={`View Goods Received Note ${grnNum}`}
                                                            >
                                                                <BsEye size={11} /> View Note
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewHistory(rg);
                                                                }}
                                                                style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'auto', position: 'relative', zIndex: 2 }}
                                                                title={`View History Timeline for ${grnNum}`}
                                                            >
                                                                <BsClockHistory size={11} /> History
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadPdf(rg);
                                                                }}
                                                                disabled={downloadingPdfGrnId === grnId}
                                                                title={`Download PDF for ${grnNum}`}
                                                                style={{
                                                                    background: '#f8fafc',
                                                                    color: '#475569',
                                                                    border: '1px solid #cbd5e1',
                                                                    borderRadius: 4,
                                                                    padding: '4px 8px',
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    cursor: downloadingPdfGrnId === grnId ? 'not-allowed' : 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    pointerEvents: 'auto',
                                                                    position: 'relative',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                <BsDownload size={11} /> {downloadingPdfGrnId === grnId ? 'Downloading...' : 'PDF'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenPrintSlip(rg);
                                                                }}
                                                                disabled={fetchingSlipGrnId === grnId}
                                                                title={`Print Slip for ${grnNum}`}
                                                                style={{
                                                                    background: '#f8fafc',
                                                                    color: '#475569',
                                                                    border: '1px solid #cbd5e1',
                                                                    borderRadius: 4,
                                                                    padding: '4px 8px',
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    cursor: fetchingSlipGrnId === grnId ? 'not-allowed' : 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    pointerEvents: 'auto',
                                                                    position: 'relative',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                <BsPrinter size={11} /> {fetchingSlipGrnId === grnId ? 'Loading...' : 'Print Slip'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenQcModal(rg);
                                                                }}
                                                                disabled={!isGrnQcEligible(grnStatus)}
                                                                title={!isGrnQcEligible(grnStatus) ? "Quality check can only be performed on pending GRN shipments" : `Perform Quality Check for ${grnNum}`}
                                                                style={{
                                                                    background: !isGrnQcEligible(grnStatus) ? '#f8fafc' : '#eff6ff',
                                                                    color: !isGrnQcEligible(grnStatus) ? '#94a3b8' : '#2563eb',
                                                                    border: !isGrnQcEligible(grnStatus) ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                                                    borderRadius: 4,
                                                                    padding: '4px 8px',
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    cursor: !isGrnQcEligible(grnStatus) ? 'not-allowed' : 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    opacity: !isGrnQcEligible(grnStatus) ? 0.6 : 1,
                                                                    pointerEvents: 'auto',
                                                                    position: 'relative',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                <BsShieldLock size={11} /> QC
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    console.log('[GRN Receive Button Click] Clicked Receive on Recent GRNs row:', rg);
                                                                    handleReceiveGrn(rg);
                                                                }}
                                                                disabled={isReceiveDisabled}
                                                                title={!eligible ? (isGrnReceived(grnStatus) ? "This GRN has already been received and inventory has been updated" : "Cannot receive a rejected GRN") : `Receive ${grnNum} into inventory`}
                                                                style={{
                                                                    background: !eligible ? '#f8fafc' : '#ecfdf5',
                                                                    color: !eligible ? '#94a3b8' : '#059669',
                                                                    border: !eligible ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                                                                    borderRadius: 4,
                                                                    padding: '4px 8px',
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    cursor: isReceiveDisabled ? 'not-allowed' : 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    opacity: !eligible ? 0.6 : 1,
                                                                    pointerEvents: 'auto',
                                                                    position: 'relative',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                <BsBoxSeam size={11} /> {receivingGrnId === grnId ? 'Receiving...' : 'Receive'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRequestRejectGrn(rg);
                                                                }}
                                                                disabled={!isGrnRejectEligible(grnStatus) || Boolean(rejectingGrnId)}
                                                                title={!isGrnRejectEligible(grnStatus) ? (isGrnReceived(grnStatus) ? "Cannot reject a GRN that has already been received into inventory" : "This GRN has already been rejected") : `Reject ${grnNum}`}
                                                                style={{
                                                                    background: !isGrnRejectEligible(grnStatus) ? '#f8fafc' : '#fff1f2',
                                                                    color: !isGrnRejectEligible(grnStatus) ? '#94a3b8' : '#e11d48',
                                                                    border: !isGrnRejectEligible(grnStatus) ? '1px solid #e2e8f0' : '1px solid #fecdd3',
                                                                    borderRadius: 4,
                                                                    padding: '4px 8px',
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    cursor: (!isGrnRejectEligible(grnStatus) || Boolean(rejectingGrnId)) ? 'not-allowed' : 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    opacity: !isGrnRejectEligible(grnStatus) ? 0.6 : 1,
                                                                    pointerEvents: 'auto',
                                                                    position: 'relative',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                <BsXCircle size={11} /> {rejectingGrnId === grnId ? 'Rejecting...' : 'Reject'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRequestDeleteGrn(rg);
                                                                }}
                                                                disabled={isGrnReceived(rg.status) || deletingGrnId === rg.id}
                                                                title={isGrnReceived(rg.status) ? "Cannot delete a GRN that has already been received into inventory" : `Delete ${grnNum}`}
                                                                style={{
                                                                    background: isGrnReceived(rg.status) ? '#f3f4f6' : '#fef2f2',
                                                                    color: isGrnReceived(rg.status) ? '#9ca3af' : '#dc2626',
                                                                    border: isGrnReceived(rg.status) ? '1px solid #e5e7eb' : '1px solid #fecaca',
                                                                    borderRadius: 4,
                                                                    padding: '4px 8px',
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    cursor: (isGrnReceived(rg.status) || deletingGrnId === rg.id) ? 'not-allowed' : 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    opacity: isGrnReceived(rg.status) ? 0.6 : 1,
                                                                    pointerEvents: 'auto',
                                                                    position: 'relative',
                                                                    zIndex: 2
                                                                }}
                                                            >
                                                                <BsTrash size={11} /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main GRN Table Container */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {/* Filter Bar with search and supported query parameters */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        {/* Search Input: query param `search` */}
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, width: 340, maxWidth: '100%' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <BsSearch style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    placeholder="Search by GRN #, invoice, PO #..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ width: '100%', padding: '8px 30px 8px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            fetchGrnData({ search: '' });
                                        }}
                                        style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}
                                    >
                                        <BsX size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                                Search
                            </button>
                        </form>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <BsX size={16} /> Clear Filters
                                </button>
                            )}
                            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
                                {loading ? 'Loading...' : `Showing ${grns.length} records`}
                            </span>
                            <button
                                onClick={handleRefreshAll}
                                title="Refresh GRN list and statistics"
                                style={{ background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#374151' }}
                            >
                                <BsArrowRepeat size={14} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Dropdown Filters corresponding to backend query parameters */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, paddingTop: 4 }}>
                        {/* purchase_order_id */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Purchase Order</label>
                            <select
                                value={filterPoId}
                                onChange={e => handleFilterChange('purchase_order_id', e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, background: '#fff', outline: 'none' }}
                            >
                                <option value="">All Purchase Orders</option>
                                {purchaseOrders.map(po => (
                                    <option key={po.id} value={po.id}>
                                        #{po.po_number || po.id} {po.supplier_name ? `(${po.supplier_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* warehouse_id */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Warehouse</label>
                            <select
                                value={filterWarehouseId}
                                onChange={e => handleFilterChange('warehouse_id', e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, background: '#fff', outline: 'none' }}
                            >
                                <option value="">All Warehouses</option>
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.name || `Warehouse #${wh.id}`}</option>
                                ))}
                            </select>
                        </div>

                        {/* store_id */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Store</label>
                            <select
                                value={filterStoreId}
                                onChange={e => handleFilterChange('store_id', e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, background: '#fff', outline: 'none' }}
                            >
                                <option value="">All Stores</option>
                                {stores.map(st => (
                                    <option key={st.id} value={st.id}>{st.name || `Store #${st.id}`}</option>
                                ))}
                            </select>
                        </div>

                        {/* supplier_id */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Supplier</label>
                            <select
                                value={filterSupplierId}
                                onChange={e => handleFilterChange('supplier_id', e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, background: '#fff', outline: 'none' }}
                            >
                                <option value="">All Suppliers</option>
                                {availableSuppliers.map(sup => (
                                    <option key={sup.id} value={sup.id}>{sup.name || `Supplier #${sup.id}`}</option>
                                ))}
                            </select>
                        </div>

                        {/* status: Exact supported backend statuses: pending, received, rejected */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Status</label>
                            <select
                                value={filterStatus}
                                onChange={e => handleFilterChange('status', e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, background: '#fff', outline: 'none' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="received">Received</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6b7280' }}>
                        <BsClockHistory size={24} style={{ animation: 'spin 1.5s linear infinite', marginBottom: 8, color: '#6366f1' }} />
                        <p style={{ margin: 0, fontSize: 14 }}>Loading Goods Received Notes from backend...</p>
                    </div>
                ) : grns.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6b7280' }}>
                        <BsTruck size={36} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#374151' }}>No GRN records found</p>
                        <p style={{ margin: '6px 0 16px 0', fontSize: 13, color: '#6b7280' }}>
                            {hasActiveFilters
                                ? 'No GRN records match your selected filter criteria. Try adjusting or clearing your filters.'
                                : 'No Goods Received Notes have been recorded yet.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                onClick={handleResetFilters}
                                style={{
                                    background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px',
                                    borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                                }}
                            >
                                <BsX size={16} /> Clear Filters
                            </button>
                        ) : (
                            <button
                                onClick={handleOpenCreateModal}
                                style={{
                                    background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px',
                                    borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                                }}
                            >
                                <BsPlus size={16} /> Create Inward GRN
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                <tr>
                                    <th style={{ padding: '12px 16px' }}>GRN #</th>
                                    <th style={{ padding: '12px 16px' }}>PO Reference</th>
                                    <th style={{ padding: '12px 16px' }}>Supplier</th>
                                    <th style={{ padding: '12px 16px' }}>Warehouse / Store</th>
                                    <th style={{ padding: '12px 16px' }}>Invoice</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Items / Quantities</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Value</th>
                                    <th style={{ padding: '12px 16px' }}>Status</th>
                                    <th style={{ padding: '12px 16px' }}>Date</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grns.map((row, i) => {
                                    const grnId = row.id ?? row.grn_id;
                                    const grnLabel = row.grn_number || (grnId ? `GRN-${grnId}` : '-');
                                    const grnStatus = row.status ?? row.grn_status ?? '';
                                    const eligible = isGrnReceiveEligible(grnStatus);
                                    const isReceiveDisabled = !eligible || Boolean(receivingGrnId);

                                    console.log("GRN Receive Debug:", {
                                        id: grnId,
                                        status: grnStatus,
                                        eligible: eligible,
                                        receivingGrnId,
                                        disabled: isReceiveDisabled
                                    });

                                    const poLabel = row.purchase_order_number || (row.purchase_order_id ? `PO-${row.purchase_order_id}` : '-');
                                    const supplierName = row.supplier_name || row.supplier?.name || '-';
                                    const warehouseName = row.warehouse_name || row.warehouse?.name || (row.warehouse_id ? `WH #${row.warehouse_id}` : '-');
                                    const storeName = row.store_name || row.store?.name || (row.store_id ? `Store #${row.store_id}` : '');
                                    const invoiceNo = row.invoice_number || '-';
                                    const invoiceDate = row.invoice_date || '';
                                    const itemsCount = row.total_items_count ?? (Array.isArray(row.items) ? row.items.length : 0);
                                    const receivedQty = row.total_received_quantity ?? 0;
                                    const acceptedQty = row.total_accepted_quantity ?? 0;
                                    const rejectedQty = row.total_rejected_quantity ?? 0;
                                    const totalCostValue = row.total_cost_value;
                                    const receivedAt = row.received_at;
                                    const createdAt = row.created_at;

                                    return (
                                        <tr key={grnId || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontWeight: 700, color: '#6366f1' }}>{grnLabel}</div>
                                                <div style={{ fontSize: 11, color: '#9ca3af' }}>ID: #{grnId ?? '-'}</div>
                                            </td>
                                            <td style={{ padding: '14px 16px', color: '#374151', fontWeight: 500 }}>
                                                {poLabel}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1f2937' }}>
                                                {supplierName}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontWeight: 500 }}>{warehouseName}</div>
                                                {storeName && <div style={{ fontSize: 11, color: '#6b7280' }}>{storeName}</div>}
                                            </td>
                                            <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                                                <div>{invoiceNo}</div>
                                                {invoiceDate && <div style={{ fontSize: 11, color: '#9ca3af' }}>{invoiceDate}</div>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: '#111827' }}>
                                                    {receivedQty} pcs <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>({itemsCount} items)</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                    <span style={{ color: '#059669' }}>Acc: {acceptedQty}</span>
                                                    {Number(rejectedQty) > 0 && <span style={{ color: '#dc2626', marginLeft: 6 }}>Rej: {rejectedQty}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                                                {totalCostValue ? `₹${Number(totalCostValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {renderStatusBadge(grnStatus)}
                                            </td>
                                            <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: 12 }}>
                                                <div>{receivedAt ? new Date(receivedAt).toLocaleDateString() : (createdAt ? new Date(createdAt).toLocaleDateString() : '-')}</div>
                                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{receivedAt ? 'Received' : (createdAt ? 'Created' : '')}</div>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewGrn(row);
                                                        }}
                                                        style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'auto', position: 'relative', zIndex: 2 }}
                                                        title={`View Note for ${grnLabel}`}
                                                    >
                                                        <BsEye size={12} /> View Note
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewHistory(row);
                                                        }}
                                                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'auto', position: 'relative', zIndex: 2 }}
                                                        title={`View History Timeline for ${grnLabel}`}
                                                    >
                                                        <BsClockHistory size={12} /> History
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadPdf(row);
                                                        }}
                                                        disabled={downloadingPdfGrnId === grnId}
                                                        title={`Download PDF for ${grnLabel}`}
                                                        style={{
                                                            background: '#f8fafc',
                                                            color: '#475569',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: 6,
                                                            padding: '6px 12px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: downloadingPdfGrnId === grnId ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BsDownload size={12} /> {downloadingPdfGrnId === grnId ? 'Downloading...' : 'PDF'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenPrintSlip(row);
                                                        }}
                                                        disabled={fetchingSlipGrnId === grnId}
                                                        title={`Print Slip for ${grnLabel}`}
                                                        style={{
                                                            background: '#f8fafc',
                                                            color: '#475569',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: 6,
                                                            padding: '6px 12px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: fetchingSlipGrnId === grnId ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BsPrinter size={12} /> {fetchingSlipGrnId === grnId ? 'Loading...' : 'Print Slip'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenQcModal(row);
                                                        }}
                                                        disabled={!isGrnQcEligible(grnStatus)}
                                                        title={!isGrnQcEligible(grnStatus) ? "Quality check can only be performed on pending GRN shipments" : `Perform Quality Check for ${grnLabel}`}
                                                        style={{
                                                            background: !isGrnQcEligible(grnStatus) ? '#f8fafc' : '#eff6ff',
                                                            color: !isGrnQcEligible(grnStatus) ? '#94a3b8' : '#2563eb',
                                                            border: !isGrnQcEligible(grnStatus) ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                                            borderRadius: 6,
                                                            padding: '6px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: !isGrnQcEligible(grnStatus) ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            opacity: !isGrnQcEligible(grnStatus) ? 0.6 : 1,
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BsShieldLock size={12} /> Quality Check
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log('[GRN Receive Button Click] Clicked Receive on Main GRN table row:', row);
                                                            handleReceiveGrn(row);
                                                        }}
                                                        disabled={isReceiveDisabled}
                                                        title={!eligible ? (isGrnReceived(grnStatus) ? "This GRN has already been received and inventory has been updated" : "Cannot receive a rejected GRN") : `Receive ${grnLabel} into inventory`}
                                                        style={{
                                                            background: !eligible ? '#f8fafc' : '#ecfdf5',
                                                            color: !eligible ? '#94a3b8' : '#059669',
                                                            border: !eligible ? '1px solid #e2e8f0' : '1px solid #a7f3d0',
                                                            borderRadius: 6,
                                                            padding: '6px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: isReceiveDisabled ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            opacity: !eligible ? 0.6 : 1,
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BsBoxSeam size={12} /> {receivingGrnId === grnId ? 'Receiving...' : 'Receive'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRequestRejectGrn(row);
                                                        }}
                                                        disabled={!isGrnRejectEligible(grnStatus) || Boolean(rejectingGrnId)}
                                                        title={!isGrnRejectEligible(grnStatus) ? (isGrnReceived(grnStatus) ? "Cannot reject a GRN that has already been received into inventory" : "This GRN has already been rejected") : `Reject ${grnLabel}`}
                                                        style={{
                                                            background: !isGrnRejectEligible(grnStatus) ? '#f8fafc' : '#fff1f2',
                                                            color: !isGrnRejectEligible(grnStatus) ? '#94a3b8' : '#e11d48',
                                                            border: !isGrnRejectEligible(grnStatus) ? '1px solid #e2e8f0' : '1px solid #fecdd3',
                                                            borderRadius: 6,
                                                            padding: '6px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: (!isGrnRejectEligible(grnStatus) || Boolean(rejectingGrnId)) ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            opacity: !isGrnRejectEligible(grnStatus) ? 0.6 : 1,
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BsXCircle size={12} /> {rejectingGrnId === grnId ? 'Rejecting...' : 'Reject'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRequestDeleteGrn(row);
                                                        }}
                                                        disabled={isGrnReceived(row.status) || deletingGrnId === row.id}
                                                        title={isGrnReceived(row.status) ? "Cannot delete a GRN that has already been received into inventory" : `Delete ${grnLabel}`}
                                                        style={{
                                                            background: isGrnReceived(row.status) ? '#f3f4f6' : '#fef2f2',
                                                            color: isGrnReceived(row.status) ? '#9ca3af' : '#dc2626',
                                                            border: isGrnReceived(row.status) ? '1px solid #e5e7eb' : '1px solid #fecaca',
                                                            borderRadius: 6,
                                                            padding: '6px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: (isGrnReceived(row.status) || deletingGrnId === row.id) ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            opacity: isGrnReceived(row.status) ? 0.6 : 1,
                                                            pointerEvents: 'auto',
                                                            position: 'relative',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BsTrash size={12} /> {deletingGrnId === row.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE INWARD GRN MODAL */}
            {isCreateModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 840,
                        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BsTruck size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Create Inward GRN</h3>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Post physical receipt against purchase order into warehouse inventory</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseCreateModal}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmitGrn} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* Alert Messages */}
                            {formError && (
                                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <BsExclamationTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div>{formError}</div>
                                </div>
                            )}

                            {formSuccess && (
                                <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, color: '#059669', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsCheckCircle size={18} style={{ flexShrink: 0 }} />
                                    <div>{formSuccess}</div>
                                </div>
                            )}

                            {poWarning && (
                                <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#b45309', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <BsExclamationTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <strong>409 Conflict Prevention:</strong> {poWarning}
                                    </div>
                                </div>
                            )}

                            {/* Section 1: Order & Destination Selection */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Purchase Order <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={selectedPoId}
                                        onChange={e => handleSelectPo(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
                                        required
                                    >
                                        <option value="">-- Select Real Purchase Order --</option>
                                        {purchaseOrders.map(po => {
                                            const poNum = po.po_number || `PO-${po.id}`;
                                            const supplier = po.supplier_name || po.supplier?.name || `Supplier #${po.supplier_id || ''}`;
                                            const isRecv = isPoCompletedOrReceived(po);
                                            return (
                                                <option key={po.id} value={po.id}>
                                                    #{poNum} - {supplier} {isRecv ? '(Fully Received)' : '(Pending)'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Receiving Warehouse <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={selectedWarehouseId}
                                        onChange={e => setSelectedWarehouseId(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
                                        required
                                    >
                                        <option value="">-- Select Warehouse --</option>
                                        {warehouses.map(wh => (
                                            <option key={wh.id} value={wh.id}>{wh.name || `Warehouse #${wh.id}`}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Store <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={selectedStoreId}
                                        onChange={e => setSelectedStoreId(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
                                        required
                                    >
                                        <option value="">-- Select Store --</option>
                                        {stores.map(st => (
                                            <option key={st.id} value={st.id}>{st.name || `Store #${st.id}`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Section 2: Invoice & Logistics Metadata */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Invoice Number <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. INV-2026-001"
                                        value={invoiceNumber}
                                        onChange={e => {
                                            setInvoiceNumber(e.target.value);
                                            if (formError && formError.toLowerCase().includes('invoice')) {
                                                setFormError(null);
                                            }
                                        }}
                                        style={{
                                            width: '100%', padding: '9px 12px',
                                            border: (formError && formError.toLowerCase().includes('invoice')) ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                            borderRadius: 8, fontSize: 13, boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Invoice Date <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={e => setInvoiceDate(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Vehicle Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. MH15AB1234"
                                        value={vehicleNumber}
                                        onChange={e => setVehicleNumber(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Transporter Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Nashik Logistics"
                                        value={transporterName}
                                        onChange={e => setTransporterName(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                    Receipt Remarks
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Goods received in good condition at dock 2"
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Section 3: Line Items Table */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                                        Purchase Order Line Items ({items.length})
                                    </label>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                        Accepted + Rejected must equal Received Quantity
                                    </span>
                                </div>

                                {loadingPoDetails ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
                                        Loading line items for selected PO...
                                    </div>
                                ) : items.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                        {selectedPoId ? 'No product line items found for this Purchase Order.' : 'Please select a Purchase Order above to load products.'}
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                            <thead style={{ background: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
                                                <tr>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product</th>
                                                    <th style={{ padding: '10px 8px', width: 80, textAlign: 'right' }}>Ord Qty</th>
                                                    <th style={{ padding: '10px 8px', width: 90, textAlign: 'right' }}>Recv Qty</th>
                                                    <th style={{ padding: '10px 8px', width: 90, textAlign: 'right' }}>Accept</th>
                                                    <th style={{ padding: '10px 8px', width: 90, textAlign: 'right' }}>Reject</th>
                                                    <th style={{ padding: '10px 8px', width: 90, textAlign: 'right' }}>Unit Cost</th>
                                                    <th style={{ padding: '10px 8px', width: 100 }}>Batch #</th>
                                                    <th style={{ padding: '10px 8px', width: 110 }}>Expiry Date</th>
                                                    <th style={{ padding: '10px 8px', width: 130 }}>Damage Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((it, idx) => (
                                                    <tr key={it.product_id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                                                            {it.product_name}
                                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>ID: {it.product_id}</div>
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                                                            {it.ordered_quantity}
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={it.received_quantity}
                                                                onChange={e => handleItemChange(idx, 'received_quantity', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, textAlign: 'right', boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={it.accepted_quantity}
                                                                onChange={e => handleItemChange(idx, 'accepted_quantity', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, textAlign: 'right', boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={it.rejected_quantity}
                                                                onChange={e => handleItemChange(idx, 'rejected_quantity', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 8px', border: Number(it.rejected_quantity) > 0 ? '1px solid #f87171' : '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, textAlign: 'right', boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={it.unit_cost}
                                                                onChange={e => handleItemChange(idx, 'unit_cost', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, textAlign: 'right', boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="BATCH-..."
                                                                value={it.batch_number}
                                                                onChange={e => handleItemChange(idx, 'batch_number', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="date"
                                                                min={new Date().toISOString().split('T')[0]}
                                                                value={it.expiry_date}
                                                                onChange={e => handleItemChange(idx, 'expiry_date', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder={Number(it.rejected_quantity) > 0 ? "Reason required" : "Optional"}
                                                                value={it.damage_reason}
                                                                onChange={e => handleItemChange(idx, 'damage_reason', e.target.value)}
                                                                style={{
                                                                    width: '100%', padding: '6px 8px',
                                                                    border: Number(it.rejected_quantity) > 0 && !it.damage_reason.trim() ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                                                    borderRadius: 6, fontSize: 12, boxSizing: 'border-box'
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    disabled={isSubmitting}
                                    style={{
                                        padding: '10px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                                        borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isPoFullyReceived || items.length === 0}
                                    style={{
                                        padding: '10px 22px',
                                        background: (isSubmitting || isPoFullyReceived || items.length === 0) ? '#94a3b8' : '#6366f1',
                                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#ffffff',
                                        cursor: (isSubmitting || isPoFullyReceived || items.length === 0) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                    title={isPoFullyReceived ? "This Purchase Order has already been fully received." : ""}
                                >
                                    {isSubmitting ? 'Submitting GRN...' : 'Post & Inward GRN'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW GRN NOTE DETAILS MODAL (Populated dynamically via GET /api/v1/grn/{grn_id} with by-number fallback) */}
            {selectedGrn && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 860,
                        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BsTruck size={20} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                                            Goods Received Note: {selectedGrn.grn_number || (selectedGrn.id ? `GRN-${selectedGrn.id}` : '—')}
                                        </h3>
                                        {detailLoading && (
                                            <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                                <BsArrowRepeat size={12} /> Loading details...
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                                        Status: {selectedGrn.status || 'Verified'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleCloseDetailModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <BsX size={26} />
                            </button>
                        </div>

                        {/* Modal Navigation Tabs */}
                        <div style={{
                            display: 'flex',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            padding: '0 24px',
                            gap: 12
                        }}>
                            <button
                                type="button"
                                onClick={() => setDetailTab('details')}
                                style={{
                                    padding: '12px 16px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: detailTab === 'details' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: detailTab === 'details' ? '#4f46e5' : '#64748b',
                                    fontWeight: detailTab === 'details' ? 700 : 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsEye size={14} /> Overview & Line Items
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDetailTab('history');
                                    const rawId = selectedGrn.id ?? selectedGrn.grn_id;
                                    if (rawId && (!historyData || historyGrnId !== Number(rawId))) {
                                        fetchGrnHistory(rawId, selectedGrn);
                                    }
                                }}
                                style={{
                                    padding: '12px 16px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: detailTab === 'history' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: detailTab === 'history' ? '#4f46e5' : '#64748b',
                                    fontWeight: detailTab === 'history' ? 700 : 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsClockHistory size={14} /> History & Timeline
                                {historyLoading && (
                                    <span style={{ fontSize: 10.5, background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                                        Loading...
                                    </span>
                                )}
                            </button>
                        </div>

                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {receiveGrnError && (
                                <div style={{
                                    padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsExclamationTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                                        <span><strong>Error:</strong> {receiveGrnError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReceiveGrnError(null)}
                                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {receiveGrnSuccess && (
                                <div style={{
                                    padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsCheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
                                        <span><strong>Received:</strong> {receiveGrnSuccess}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReceiveGrnSuccess(null)}
                                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {rejectGrnSuccess && (
                                <div style={{
                                    padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsCheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
                                        <span><strong>Rejected:</strong> {rejectGrnSuccess}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRejectGrnSuccess(null)}
                                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {rejectGrnError && (
                                <div style={{
                                    padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsExclamationTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                                        <span><strong>Error:</strong> {rejectGrnError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRejectGrnError(null)}
                                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {pdfDownloadSuccess && (
                                <div style={{
                                    padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0',
                                    borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsCheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }} />
                                        <span><strong>Downloaded:</strong> {pdfDownloadSuccess}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPdfDownloadSuccess(null)}
                                        style={{ background: 'transparent', color: '#065f46', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {pdfDownloadError && (
                                <div style={{
                                    padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsExclamationTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                                        <span><strong>PDF Download Error:</strong> {pdfDownloadError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPdfDownloadError(null)}
                                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {printSlipError && (
                                <div style={{
                                    padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BsExclamationTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                                        <span><strong>Print Slip Error:</strong> {printSlipError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPrintSlipError(null)}
                                        style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', padding: 2 }}
                                    >
                                        <BsX size={18} />
                                    </button>
                                </div>
                            )}

                            {detailTab === 'details' ? (
                                <>
                                    {/* API Error Banner with Retry */}
                                    {detailError && (
                                        <div style={{
                                            padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                                            borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex',
                                            justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <span><strong>Error loading details:</strong> {detailError}</span>
                                            <button
                                                type="button"
                                                onClick={handleRetryDetail}
                                                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}

                                    {/* GRN Overview Attributes Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>GRN #</span><strong>{selectedGrn.grn_number || (selectedGrn.id ? `GRN-${selectedGrn.id}` : '—')}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>System ID</span><strong>{selectedGrn.id != null ? `#${selectedGrn.id}` : '—'}</strong></div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>PO Reference</span>
                                            <strong>{selectedGrn.purchase_order_number || (selectedGrn.purchase_order_id ? `PO-${selectedGrn.purchase_order_id}` : '—')}</strong>
                                            {selectedGrn.purchase_order_id != null && <span style={{ fontSize: 10.5, color: '#94a3b8', display: 'block' }}>ID: #{selectedGrn.purchase_order_id}</span>}
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Supplier</span>
                                            <strong>{selectedGrn.supplier_name || selectedGrn.supplier?.name || '—'}</strong>
                                            {selectedGrn.supplier_id != null && <span style={{ fontSize: 10.5, color: '#94a3b8', display: 'block' }}>ID: #{selectedGrn.supplier_id}</span>}
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Warehouse</span>
                                            <strong>{selectedGrn.warehouse_name || selectedGrn.warehouse?.name || (selectedGrn.warehouse_id ? `WH #${selectedGrn.warehouse_id}` : '—')}</strong>
                                            {selectedGrn.warehouse_id != null && <span style={{ fontSize: 10.5, color: '#94a3b8', display: 'block' }}>ID: #{selectedGrn.warehouse_id}</span>}
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Store</span>
                                            <strong>{selectedGrn.store_name || selectedGrn.store?.name || (selectedGrn.store_id ? `Store #${selectedGrn.store_id}` : '—')}</strong>
                                            {selectedGrn.store_id != null && <span style={{ fontSize: 10.5, color: '#94a3b8', display: 'block' }}>ID: #{selectedGrn.store_id}</span>}
                                        </div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Status</span><div>{renderStatusBadge(selectedGrn.status)}</div></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Invoice Number</span><strong>{selectedGrn.invoice_number || '—'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Invoice Date</span><strong>{formatGrnDate(selectedGrn.invoice_date)}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Transporter</span><strong>{selectedGrn.transporter_name || '—'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Vehicle #</span><strong>{selectedGrn.vehicle_number || '—'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Created By</span><strong>{selectedGrn.created_by_name || '—'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Received By</span><strong>{selectedGrn.received_by_name || '—'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Total Items Count</span><strong>{selectedGrn.total_items_count ?? (Array.isArray(selectedGrn.items) ? selectedGrn.items.length : 0)} items</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Ordered Quantity</span><strong>{selectedGrn.total_ordered_quantity ?? 0} pcs</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Received Quantity</span><strong style={{ color: '#059669' }}>{selectedGrn.total_received_quantity ?? 0} pcs</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Accepted Quantity</span><strong style={{ color: '#059669' }}>{selectedGrn.total_accepted_quantity != null ? `${selectedGrn.total_accepted_quantity} pcs` : '—'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Rejected Quantity</span><strong style={{ color: Number(selectedGrn.total_rejected_quantity) > 0 ? '#dc2626' : '#64748b' }}>{selectedGrn.total_rejected_quantity ?? 0} pcs</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Total Cost Value</span><strong>{selectedGrn.total_cost_value != null ? `₹${Number(selectedGrn.total_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Received At</span><strong>{formatGrnDate(selectedGrn.received_at, true)}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Created At</span><strong>{formatGrnDate(selectedGrn.created_at, true)}</strong></div>
                                        <div><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Updated At</span><strong>{formatGrnDate(selectedGrn.updated_at, true)}</strong></div>
                                        <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Remarks</span><strong>{selectedGrn.remarks || '—'}</strong></div>
                                        {selectedGrn.rejection_reason && (
                                            <div style={{ gridColumn: '1 / -1', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca' }}>
                                                <span style={{ fontSize: 11, color: '#dc2626', display: 'block', fontWeight: 600 }}>Rejection Reason</span>
                                                <strong style={{ color: '#dc2626' }}>{selectedGrn.rejection_reason}</strong>
                                            </div>
                                        )}
                                    </div>

                                    {/* Itemized Received Breakdown */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Received Items Breakdown</h4>
                                            <span style={{ fontSize: 11, color: '#64748b' }}>
                                                {Array.isArray(selectedGrn.items) ? `${selectedGrn.items.length} items recorded` : '0 items'}
                                            </span>
                                        </div>
                                        {Array.isArray(selectedGrn.items) && selectedGrn.items.length > 0 ? (
                                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                    <thead style={{ background: '#f1f5f9', fontWeight: 600, color: '#475569' }}>
                                                        <tr>
                                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>SKU</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ordered</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Received</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Accepted</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rejected</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit Cost</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Batch</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Expiry</th>
                                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Remarks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedGrn.items.map((it, idx) => {
                                                            const prodName = it.product_name || (it.product_id != null ? `Product #${it.product_id}` : '—');
                                                            const prodSku = it.product_sku || '—';
                                                            const ordQty = it.ordered_quantity != null ? String(it.ordered_quantity) : '—';
                                                            const recQty = it.received_quantity != null ? String(it.received_quantity) : '—';
                                                            const accQty = it.accepted_quantity != null ? String(it.accepted_quantity) : '—';
                                                            const rejQty = it.rejected_quantity != null ? String(it.rejected_quantity) : '0';
                                                            const costFormatted = it.unit_cost != null ? `₹${Number(it.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
                                                            const batchNo = it.batch_number || '—';
                                                            const expDate = formatGrnDate(it.expiry_date);
                                                            const itemRemarks = it.remarks || '—';

                                                            return (
                                                                <tr key={it.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                                                                        <div>{prodName}</div>
                                                                        {it.product_id != null && <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 400 }}>ID: #{it.product_id}</div>}
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11.5 }}>{prodSku}</td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{ordQty}</td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{recQty}</td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{accQty}</td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: Number(it.rejected_quantity) > 0 ? '#dc2626' : '#475569' }}>
                                                                        {rejQty}
                                                                        {it.damage_reason ? ` (${it.damage_reason})` : ''}
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{costFormatted}</td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{batchNo}</td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{expDate}</td>
                                                                    <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 11.5 }}>{itemRemarks}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: 13, color: '#64748b', textAlign: 'center', padding: '16px 0', background: '#f8fafc', borderRadius: 8 }}>
                                                No itemized breakdown recorded on this note.
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* History & Audit Timeline View */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* History Meta Overview */}
                                    <div style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 10,
                                        padding: '16px 18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                                                    GRN Audit & Lifecycle History
                                                </h4>
                                                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                                                    Chronological record of status transitions, inwarding actions, and operator details
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const rawId = selectedGrn.id ?? selectedGrn.grn_id;
                                                    fetchGrnHistory(rawId, selectedGrn);
                                                }}
                                                disabled={historyLoading}
                                                style={{
                                                    background: '#ffffff',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: 6,
                                                    padding: '6px 12px',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#374151',
                                                    cursor: historyLoading ? 'not-allowed' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <BsArrowRepeat size={13} style={{ animation: historyLoading ? 'spin 1s linear infinite' : 'none' }} />
                                                {historyLoading ? 'Refreshing...' : 'Refresh Timeline'}
                                            </button>
                                        </div>

                                        {/* Overview Metadata Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, paddingTop: 6, borderTop: '1px solid #edf2f7' }}>
                                            <div>
                                                <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>GRN Number</span>
                                                <strong>{historyData?.grn_number || selectedGrn.grn_number || (selectedGrn.id ? `GRN-${selectedGrn.id}` : '—')}</strong>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Current Status</span>
                                                <div>{renderStatusBadge(historyData?.status || selectedGrn.status)}</div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Created Date</span>
                                                <strong>{formatGrnDate(historyData?.created_at || selectedGrn.created_at, true)}</strong>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Received Date</span>
                                                <strong>{(historyData?.received_at || selectedGrn.received_at) ? formatGrnDate(historyData?.received_at || selectedGrn.received_at, true) : 'Not received yet'}</strong>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Created By</span>
                                                <strong>{historyData?.created_by_name || selectedGrn.created_by_name || 'System Operator'}</strong>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Received By</span>
                                                <strong>{historyData?.received_by_name || selectedGrn.received_by_name || '—'}</strong>
                                            </div>
                                        </div>

                                        {(historyData?.rejection_reason || selectedGrn.rejection_reason) && (
                                            <div style={{
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                borderRadius: 6,
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                color: '#dc2626',
                                                fontSize: 12.5
                                            }}>
                                                <BsExclamationTriangle size={15} style={{ flexShrink: 0 }} />
                                                <div>
                                                    <strong>Rejection Reason:</strong> {historyData?.rejection_reason || selectedGrn.rejection_reason}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* History Error Banner */}
                                    {historyError && (
                                        <div style={{
                                            padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                                            borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex',
                                            justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <BsExclamationTriangle size={16} style={{ flexShrink: 0 }} />
                                                <span><strong>Error loading history:</strong> {historyError}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const rawId = selectedGrn.id ?? selectedGrn.grn_id;
                                                    fetchGrnHistory(rawId, selectedGrn);
                                                }}
                                                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}

                                    {/* History Loading Indicator */}
                                    {historyLoading && !historyData && (
                                        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                                            <BsClockHistory size={26} style={{ animation: 'spin 1.5s linear infinite', color: '#6366f1', marginBottom: 10 }} />
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Loading GRN history & event timeline...</p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#9ca3af' }}>Fetching audit records from backend API</p>
                                        </div>
                                    )}

                                    {/* Empty Timeline Fallback */}
                                    {!historyLoading && !historyError && (!historyData?.timeline || historyData.timeline.length === 0) && (
                                        <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                            <BsClockHistory size={30} style={{ color: '#94a3b8', marginBottom: 10 }} />
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>
                                                No history events available for this GRN.
                                            </p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
                                                Events will appear here as the GRN progresses through creation, quality checks, and inventory inwarding.
                                            </p>
                                        </div>
                                    )}

                                    {/* Vertical Event Timeline */}
                                    {Array.isArray(historyData?.timeline) && historyData.timeline.length > 0 && (
                                        <div style={{ padding: '8px 4px 16px 4px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                {([...historyData.timeline].sort((a, b) => {
                                                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                                                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                                                    return tA - tB;
                                                })).map((item, idx, arr) => {
                                                    const eventStr = String(item.event || '').toLowerCase();
                                                    let badgeBg = '#eef2ff';
                                                    let badgeColor = '#4f46e5';
                                                    let badgeBorder = '#c7d2fe';
                                                    let icon = <BsClockHistory size={15} />;

                                                    if (eventStr.includes('received') || eventStr.includes('inward')) {
                                                        badgeBg = '#ecfdf5';
                                                        badgeColor = '#059669';
                                                        badgeBorder = '#a7f3d0';
                                                        icon = <BsCheckCircleFill size={15} />;
                                                    } else if (eventStr.includes('reject')) {
                                                        badgeBg = '#fef2f2';
                                                        badgeColor = '#dc2626';
                                                        badgeBorder = '#fecaca';
                                                        icon = <BsXCircleFill size={15} />;
                                                    } else if (eventStr.includes('qc') || eventStr.includes('quality')) {
                                                        badgeBg = '#eff6ff';
                                                        badgeColor = '#2563eb';
                                                        badgeBorder = '#bfdbfe';
                                                        icon = <BsShieldLock size={15} />;
                                                    } else if (eventStr.includes('creat') || eventStr.includes('init')) {
                                                        badgeBg = '#eef2ff';
                                                        badgeColor = '#4f46e5';
                                                        badgeBorder = '#c7d2fe';
                                                        icon = <BsPlus size={18} />;
                                                    }

                                                    return (
                                                        <div key={idx} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                                                            {/* Vertical Connector Line */}
                                                            {idx < arr.length - 1 && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    left: 17,
                                                                    top: 36,
                                                                    bottom: -8,
                                                                    width: 2,
                                                                    background: '#e2e8f0',
                                                                    zIndex: 0
                                                                }} />
                                                            )}

                                                            {/* Icon Circle */}
                                                            <div style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                background: badgeBg,
                                                                color: badgeColor,
                                                                border: `2px solid ${badgeBorder}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                zIndex: 1,
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                {icon}
                                                            </div>

                                                            {/* Event Card */}
                                                            <div style={{
                                                                flex: 1,
                                                                background: '#ffffff',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: 10,
                                                                padding: '14px 18px',
                                                                marginBottom: 16,
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                                                                    <h5 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                                                                        {item.event || 'System Event'}
                                                                    </h5>
                                                                    <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                        <BsClockHistory size={11} /> {formatGrnDate(item.timestamp, true)}
                                                                    </span>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', marginBottom: 8 }}>
                                                                    <span style={{ fontWeight: 600, color: '#64748b' }}>Performed By:</span>
                                                                    <span style={{
                                                                        background: '#f1f5f9',
                                                                        color: '#334155',
                                                                        padding: '2px 8px',
                                                                        borderRadius: 4,
                                                                        fontWeight: 600,
                                                                        fontSize: 11.5
                                                                    }}>
                                                                        {item.performed_by || 'System Operator'}
                                                                    </span>
                                                                </div>

                                                                {item.details && (
                                                                    <div style={{
                                                                        fontSize: 12.5,
                                                                        color: '#334155',
                                                                        background: '#f8fafc',
                                                                        padding: '10px 14px',
                                                                        borderRadius: 6,
                                                                        border: '1px solid #f1f5f9',
                                                                        wordBreak: 'break-word',
                                                                        lineHeight: 1.5
                                                                    }}>
                                                                        {item.details}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(() => {
                                const modalGrnId = selectedGrn.id ?? selectedGrn.grn_id;
                                const modalGrnStatus = selectedGrn.status ?? selectedGrn.grn_status ?? '';
                                const modalEligible = isGrnReceiveEligible(modalGrnStatus);
                                const isModalDisabled = !modalEligible || Boolean(receivingGrnId);

                                console.log("GRN Receive Debug:", {
                                    id: modalGrnId,
                                    status: modalGrnStatus,
                                    eligible: modalEligible,
                                    receivingGrnId,
                                    disabled: isModalDisabled
                                });
                                return null;
                            })()}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPdf(selectedGrn)}
                                        disabled={downloadingPdfGrnId === (selectedGrn.id ?? selectedGrn.grn_id)}
                                        title={`Download PDF for ${selectedGrn.grn_number || (selectedGrn.id ? `GRN-${selectedGrn.id}` : 'this GRN')}`}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#f8fafc',
                                            color: '#1e293b',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: downloadingPdfGrnId === (selectedGrn.id ?? selectedGrn.grn_id) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <BsDownload size={14} /> {downloadingPdfGrnId === (selectedGrn.id ?? selectedGrn.grn_id) ? 'Downloading PDF...' : 'Download PDF'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPrintSlip(selectedGrn)}
                                        disabled={fetchingSlipGrnId === (selectedGrn.id ?? selectedGrn.grn_id)}
                                        title={`Open Print Slip for ${selectedGrn.grn_number || (selectedGrn.id ? `GRN-${selectedGrn.id}` : 'this GRN')}`}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#f8fafc',
                                            color: '#1e293b',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: fetchingSlipGrnId === (selectedGrn.id ?? selectedGrn.grn_id) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <BsPrinter size={14} /> {fetchingSlipGrnId === (selectedGrn.id ?? selectedGrn.grn_id) ? 'Loading Slip...' : 'Print Slip'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenQcModal(selectedGrn)}
                                        disabled={!isGrnQcEligible(selectedGrn.status ?? selectedGrn.grn_status)}
                                        title={!isGrnQcEligible(selectedGrn.status ?? selectedGrn.grn_status) ? "Quality check can only be performed on pending GRN records" : "Perform Quality Check"}
                                        style={{
                                            padding: '8px 16px',
                                            background: !isGrnQcEligible(selectedGrn.status ?? selectedGrn.grn_status) ? '#f1f5f9' : '#4f46e5',
                                            color: !isGrnQcEligible(selectedGrn.status ?? selectedGrn.grn_status) ? '#94a3b8' : '#ffffff',
                                            border: 'none',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: !isGrnQcEligible(selectedGrn.status ?? selectedGrn.grn_status) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            opacity: !isGrnQcEligible(selectedGrn.status ?? selectedGrn.grn_status) ? 0.6 : 1
                                        }}
                                    >
                                        <BsShieldLock size={14} /> Quality Check
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('[GRN Receive Button Click] Clicked Receive in GRN Detail Modal:', selectedGrn);
                                            handleReceiveGrn(selectedGrn);
                                        }}
                                        disabled={!isGrnReceiveEligible(selectedGrn.status ?? selectedGrn.grn_status) || Boolean(receivingGrnId)}
                                        title={!isGrnReceiveEligible(selectedGrn.status ?? selectedGrn.grn_status) ? (isGrnReceived(selectedGrn.status ?? selectedGrn.grn_status) ? "This GRN has already been received and inventory has been updated" : "Cannot receive a rejected GRN") : "Receive items into inventory"}
                                        style={{
                                            padding: '8px 16px',
                                            background: !isGrnReceiveEligible(selectedGrn.status ?? selectedGrn.grn_status) ? '#f1f5f9' : '#059669',
                                            color: !isGrnReceiveEligible(selectedGrn.status ?? selectedGrn.grn_status) ? '#94a3b8' : '#ffffff',
                                            border: 'none',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: (!isGrnReceiveEligible(selectedGrn.status ?? selectedGrn.grn_status) || Boolean(receivingGrnId)) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            opacity: !isGrnReceiveEligible(selectedGrn.status ?? selectedGrn.grn_status) ? 0.6 : 1
                                        }}
                                    >
                                        <BsBoxSeam size={14} /> {receivingGrnId === (selectedGrn.id ?? selectedGrn.grn_id) ? 'Receiving...' : 'Receive GRN'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRequestRejectGrn(selectedGrn)}
                                        disabled={!isGrnRejectEligible(selectedGrn.status ?? selectedGrn.grn_status) || Boolean(rejectingGrnId)}
                                        title={!isGrnRejectEligible(selectedGrn.status ?? selectedGrn.grn_status) ? (isGrnReceived(selectedGrn.status ?? selectedGrn.grn_status) ? "Cannot reject a GRN that has already been received into inventory" : "This GRN has already been rejected") : "Reject this Goods Received Note"}
                                        style={{
                                            padding: '8px 16px',
                                            background: !isGrnRejectEligible(selectedGrn.status ?? selectedGrn.grn_status) ? '#f1f5f9' : '#dc2626',
                                            color: !isGrnRejectEligible(selectedGrn.status ?? selectedGrn.grn_status) ? '#94a3b8' : '#ffffff',
                                            border: 'none',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: (!isGrnRejectEligible(selectedGrn.status ?? selectedGrn.grn_status) || Boolean(rejectingGrnId)) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            opacity: !isGrnRejectEligible(selectedGrn.status ?? selectedGrn.grn_status) ? 0.6 : 1
                                        }}
                                    >
                                        <BsXCircle size={14} /> {rejectingGrnId === (selectedGrn.id ?? selectedGrn.grn_id) ? 'Rejecting...' : 'Reject GRN'}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseDetailModal}
                                    style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Close Note
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QUALITY CHECK (QC) MODAL */}
            {isQcModalOpen && qcGrn && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1220, padding: 16
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 960,
                        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            position: 'sticky', top: 0, background: '#fff', zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 8, background: '#e0e7ff',
                                    color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <BsShieldLock size={20} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                                            Quality Check: {qcGrn.grn_number || (qcGrn.id ? `GRN-${qcGrn.id}` : 'Note')}
                                        </h3>
                                        <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                                            Status: {qcGrn.status || 'Pending'}
                                        </span>
                                    </div>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                                        Inspect incoming shipment items, approve accepted stock, specify rejected quantities with reasons, and assign batch / expiry.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseQcModal}
                                disabled={qcSubmitting}
                                style={{
                                    background: 'none', border: 'none', cursor: qcSubmitting ? 'not-allowed' : 'pointer',
                                    color: '#94a3b8', padding: 4
                                }}
                            >
                                <BsX size={26} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Error Banner */}
                            {qcError && (
                                <div style={{
                                    padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8
                                }}>
                                    <BsExclamationTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ flex: 1, wordBreak: 'break-word', fontWeight: 600 }}>
                                        {qcError}
                                    </div>
                                </div>
                            )}

                            {/* Shipment Context Cards */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 12, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 12
                            }}>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>PO Reference</span>
                                    <strong>{qcGrn.purchase_order_number || (qcGrn.purchase_order_id ? `PO-${qcGrn.purchase_order_id}` : '—')}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>Supplier</span>
                                    <strong>{qcGrn.supplier_name || '—'}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>Receiving Warehouse</span>
                                    <strong>{qcGrn.warehouse_name || '—'}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>Store</span>
                                    <strong>{qcGrn.store_name || '—'}</strong>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                                        Line Items to Inspect ({qcItems.length})
                                    </h4>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        Item ID maps to backend GRN Item ID
                                    </span>
                                </div>

                                {qcLoadingItems ? (
                                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                                        <BsClockHistory size={20} style={{ animation: 'spin 1.5s linear infinite', marginBottom: 6, color: '#6366f1' }} />
                                        <p style={{ margin: 0 }}>Loading line item details from backend...</p>
                                    </div>
                                ) : qcItems.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 13 }}>
                                        No line items found for Quality Check on this note.
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                                <tr>
                                                    <th style={{ padding: '10px 12px' }}>Product</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Recv Qty</th>
                                                    <th style={{ padding: '10px 12px', width: 100 }}>Accepted *</th>
                                                    <th style={{ padding: '10px 12px', width: 100 }}>Rejected</th>
                                                    <th style={{ padding: '10px 12px', minWidth: 150 }}>Damage Reason</th>
                                                    <th style={{ padding: '10px 12px', width: 110 }}>Batch #</th>
                                                    <th style={{ padding: '10px 12px', width: 125 }}>Expiry Date</th>
                                                    <th style={{ padding: '10px 12px', minWidth: 130 }}>Item Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {qcItems.map((it, idx) => {
                                                    const recQty = Number(it.received_quantity ?? 0);
                                                    const accQty = Number(it.accepted_quantity ?? 0);
                                                    const rejQty = Number(it.rejected_quantity ?? 0);
                                                    const isQtyExceeded = recQty > 0 && (accQty + rejQty) > recQty;
                                                    const isDamageRequired = rejQty > 0 && !it.damage_reason.trim();

                                                    return (
                                                        <tr key={it.item_id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fcfcfd' }}>
                                                            <td style={{ padding: '8px 12px' }}>
                                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{it.product_name}</div>
                                                                <div style={{ fontSize: 10.5, color: '#64748b' }}>
                                                                    SKU: {it.product_sku || '—'} | <span style={{ color: '#4f46e5' }}>Item ID: #{it.item_id}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                                {recQty}
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    value={it.accepted_quantity}
                                                                    onChange={e => handleQcItemChange(idx, 'accepted_quantity', e.target.value)}
                                                                    style={{
                                                                        width: '100%', padding: '6px 8px',
                                                                        border: isQtyExceeded ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                                                        borderRadius: 6, fontSize: 12, boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    value={it.rejected_quantity}
                                                                    onChange={e => handleQcItemChange(idx, 'rejected_quantity', e.target.value)}
                                                                    style={{
                                                                        width: '100%', padding: '6px 8px',
                                                                        border: isQtyExceeded || isDamageRequired ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                                                        borderRadius: 6, fontSize: 12, boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    maxLength={255}
                                                                    placeholder={rejQty > 0 ? "Required (damage reason)" : "Optional"}
                                                                    value={it.damage_reason}
                                                                    onChange={e => handleQcItemChange(idx, 'damage_reason', e.target.value)}
                                                                    style={{
                                                                        width: '100%', padding: '6px 8px',
                                                                        border: isDamageRequired ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                                                        borderRadius: 6, fontSize: 12, boxSizing: 'border-box'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    maxLength={100}
                                                                    placeholder="BATCH-..."
                                                                    value={it.batch_number}
                                                                    onChange={e => handleQcItemChange(idx, 'batch_number', e.target.value)}
                                                                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>
                                                                <input
                                                                    type="date"
                                                                    min={new Date().toISOString().split('T')[0]}
                                                                    value={it.expiry_date}
                                                                    onChange={e => handleQcItemChange(idx, 'expiry_date', e.target.value)}
                                                                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    maxLength={500}
                                                                    placeholder="Remarks..."
                                                                    value={it.remarks}
                                                                    onChange={e => handleQcItemChange(idx, 'remarks', e.target.value)}
                                                                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Overall QC Remarks */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                    Overall Quality Inspection Remarks
                                </label>
                                <textarea
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Enter inspection summary, overall consignment condition, or warehouse manager approval notes..."
                                    value={qcRemarks}
                                    onChange={e => setQcRemarks(e.target.value)}
                                    style={{
                                        width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
                                        borderRadius: 8, fontSize: 12.5, boxSizing: 'border-box', outline: 'none', resize: 'vertical'
                                    }}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseQcModal}
                                    disabled={qcSubmitting}
                                    style={{
                                        padding: '9px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                                        borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569',
                                        cursor: qcSubmitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitQc}
                                    disabled={qcSubmitting || qcLoadingItems || qcItems.length === 0}
                                    style={{
                                        padding: '9px 22px',
                                        background: (qcSubmitting || qcLoadingItems || qcItems.length === 0) ? '#94a3b8' : '#4f46e5',
                                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#ffffff',
                                        cursor: (qcSubmitting || qcLoadingItems || qcItems.length === 0) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                                    }}
                                >
                                    <BsCheckCircleFill size={15} />
                                    {qcSubmitting ? 'Submitting QC...' : 'Submit Quality Check'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE GRN CONFIRMATION MODAL */}
            {grnToDelete && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: 16
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 480,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px', borderBottom: '1px solid #fee2e2',
                            background: '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8, background: '#fee2e2',
                                    color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <BsExclamationTriangle size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                                        Confirm GRN Deletion
                                    </h3>
                                    <div style={{ fontSize: 12, color: '#b91c1c' }}>
                                        Permanent deletion of Goods Receipt Note
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelDeleteGrn}
                                disabled={Boolean(deletingGrnId)}
                                style={{
                                    background: 'none', border: 'none', cursor: deletingGrnId ? 'not-allowed' : 'pointer',
                                    color: '#9ca3af', padding: 4
                                }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Deletion Error / 409 Conflict Banner */}
                            {deleteGrnError && (
                                <div style={{
                                    padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8
                                }}>
                                    <BsExclamationTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ flex: 1, wordBreak: 'break-word', fontWeight: 600 }}>
                                        {deleteGrnError}
                                    </div>
                                </div>
                            )}

                            <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.5 }}>
                                Are you sure you want to delete Goods Receipt Note{' '}
                                <strong style={{ color: '#111827' }}>
                                    {grnToDelete.grn_number || (grnToDelete.id ? `GRN-${grnToDelete.id}` : '—')}
                                </strong>
                                {grnToDelete.id && <span style={{ color: '#6b7280' }}> (ID: #{grnToDelete.id})</span>}?
                            </p>

                            {/* Summary Box */}
                            <div style={{
                                background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
                                padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12
                            }}>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>PO Reference:</span>
                                    <strong style={{ color: '#1f2937' }}>
                                        {grnToDelete.purchase_order_number || (grnToDelete.purchase_order_id ? `PO-${grnToDelete.purchase_order_id}` : '—')}
                                    </strong>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>Status:</span>
                                    <div>{renderStatusBadge(grnToDelete.status)}</div>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>Supplier:</span>
                                    <span style={{ color: '#1f2937', fontWeight: 600 }}>
                                        {grnToDelete.supplier_name || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>Received Qty:</span>
                                    <span style={{ color: '#1f2937', fontWeight: 600 }}>
                                        {grnToDelete.total_received_quantity ?? 0} pcs
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                fontSize: 12, color: '#64748b', background: '#f8fafc',
                                padding: '8px 12px', borderRadius: 6, border: '1px dashed #cbd5e1'
                            }}>
                                <strong>Notice:</strong> Received inventory cannot be deleted once inwarded. This action will permanently remove this note record from Retail OS.
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
                            display: 'flex', justifyContent: 'flex-end', gap: 10
                        }}>
                            <button
                                type="button"
                                onClick={handleCancelDeleteGrn}
                                disabled={Boolean(deletingGrnId)}
                                style={{
                                    padding: '8px 16px', background: '#ffffff', border: '1px solid #d1d5db',
                                    borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#374151',
                                    cursor: deletingGrnId ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteGrn}
                                disabled={Boolean(deletingGrnId)}
                                style={{
                                    padding: '8px 18px', background: deletingGrnId ? '#94a3b8' : '#dc2626',
                                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#ffffff',
                                    cursor: deletingGrnId ? 'not-allowed' : 'pointer', display: 'flex',
                                    alignItems: 'center', gap: 6, boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                                }}
                            >
                                <BsTrash size={14} />
                                {deletingGrnId ? 'Deleting...' : 'Delete GRN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT GRN CONFIRMATION MODAL */}
            {grnToReject && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: 16
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 480,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px', borderBottom: '1px solid #fee2e2',
                            background: '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8, background: '#fee2e2',
                                    color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <BsXCircle size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                                        Reject Goods Receipt Note
                                    </h3>
                                    <div style={{ fontSize: 12, color: '#b91c1c' }}>
                                        Confirm rejection and provide mandatory reason
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelRejectGrn}
                                disabled={Boolean(rejectingGrnId)}
                                style={{
                                    background: 'none', border: 'none', cursor: rejectingGrnId ? 'not-allowed' : 'pointer',
                                    color: '#9ca3af', padding: 4
                                }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Rejection Error Banner */}
                            {rejectGrnError && (
                                <div style={{
                                    padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8
                                }}>
                                    <BsExclamationTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ flex: 1, wordBreak: 'break-word', fontWeight: 600 }}>
                                        {rejectGrnError}
                                    </div>
                                </div>
                            )}

                            <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.5 }}>
                                Are you sure you want to reject Goods Receipt Note{' '}
                                <strong style={{ color: '#111827' }}>
                                    {grnToReject.grn_number || (grnToReject.id ? `GRN-${grnToReject.id}` : '—')}
                                </strong>
                                {grnToReject.id && <span style={{ color: '#6b7280' }}> (ID: #{grnToReject.id})</span>}?
                            </p>

                            {/* Summary Box */}
                            <div style={{
                                background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
                                padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12
                            }}>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>PO Reference:</span>
                                    <strong style={{ color: '#1f2937' }}>
                                        {grnToReject.purchase_order_number || (grnToReject.purchase_order_id ? `PO-${grnToReject.purchase_order_id}` : '—')}
                                    </strong>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>Current Status:</span>
                                    <div>{renderStatusBadge(grnToReject.status)}</div>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>Supplier:</span>
                                    <span style={{ color: '#1f2937', fontWeight: 600 }}>
                                        {grnToReject.supplier_name || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280', display: 'block' }}>Received Qty:</span>
                                    <span style={{ color: '#1f2937', fontWeight: 600 }}>
                                        {grnToReject.total_received_quantity ?? 0} pcs
                                    </span>
                                </div>
                            </div>

                            {/* Reason Input */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    maxLength={500}
                                    placeholder="Enter specific reason for rejecting this GRN shipment (e.g. damaged goods, wrong specification, missing invoice)..."
                                    value={rejectReason}
                                    onChange={(e) => {
                                        setRejectReason(e.target.value);
                                        if (rejectGrnError) setRejectGrnError(null);
                                    }}
                                    disabled={Boolean(rejectingGrnId)}
                                    style={{
                                        width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1',
                                        borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical',
                                        background: rejectingGrnId ? '#f1f5f9' : '#fff'
                                    }}
                                />
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
                                    {rejectReason.length}/500
                                </div>
                            </div>

                            <div style={{
                                fontSize: 12, color: '#64748b', background: '#f8fafc',
                                padding: '8px 12px', borderRadius: 6, border: '1px dashed #cbd5e1'
                            }}>
                                <strong>Notice:</strong> Once rejected, this GRN cannot be received into inventory.
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
                            display: 'flex', justifyContent: 'flex-end', gap: 10
                        }}>
                            <button
                                type="button"
                                onClick={handleCancelRejectGrn}
                                disabled={Boolean(rejectingGrnId)}
                                style={{
                                    padding: '8px 16px', background: '#ffffff', border: '1px solid #d1d5db',
                                    borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#374151',
                                    cursor: rejectingGrnId ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRejectGrn}
                                disabled={Boolean(rejectingGrnId) || !rejectReason.trim()}
                                style={{
                                    padding: '8px 18px',
                                    background: (Boolean(rejectingGrnId) || !rejectReason.trim()) ? '#94a3b8' : '#dc2626',
                                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#ffffff',
                                    cursor: (Boolean(rejectingGrnId) || !rejectReason.trim()) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                                }}
                            >
                                <BsXCircle size={14} />
                                {rejectingGrnId ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GRN PRINT SLIP PREVIEW MODAL */}
            {isPrintSlipModalOpen && printSlipHtml && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1250,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16, backdropFilter: 'blur(3px)'
                }}>
                    <div style={{
                        background: '#ffffff', borderRadius: 12,
                        width: '100%', maxWidth: '980px', maxHeight: '94vh',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc', flexWrap: 'wrap', gap: 12
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 8,
                                    background: '#e0e7ff', color: '#4338ca',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <BsPrinter size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                        Goods Received Note Slip: {printSlipGrn?.grn_number || (printSlipGrn?.id ? `GRN-${printSlipGrn.id}` : 'Printable')}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <span style={{ fontSize: 11.5, color: '#64748b' }}>
                                            Status: <strong>{printSlipGrn?.status || 'Active'}</strong>
                                        </span>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>•</span>
                                        <span style={{ fontSize: 11.5, color: '#64748b' }}>
                                            Isolated A4 Document Preview
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleTriggerPrintSlipIframe}
                                    style={{
                                        padding: '8px 16px', background: '#4f46e5', color: '#ffffff',
                                        border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                        boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)'
                                    }}
                                    title="Open browser print dialog for this GRN slip"
                                >
                                    <BsPrinter size={15} /> Print Slip
                                </button>
                                {printSlipGrn && (
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPdf(printSlipGrn)}
                                        disabled={downloadingPdfGrnId === (printSlipGrn.id ?? printSlipGrn.grn_id)}
                                        style={{
                                            padding: '8px 14px', background: '#f8fafc', color: '#334155',
                                            border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontWeight: 600,
                                            cursor: downloadingPdfGrnId === (printSlipGrn.id ?? printSlipGrn.grn_id) ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex', alignItems: 'center', gap: 6
                                        }}
                                        title="Download original backend PDF binary"
                                    >
                                        <BsDownload size={14} /> {downloadingPdfGrnId === (printSlipGrn.id ?? printSlipGrn.grn_id) ? 'Downloading...' : 'PDF'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleOpenSlipInNewTab}
                                    style={{
                                        padding: '8px 12px', background: '#f8fafc', color: '#475569',
                                        border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
                                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                                    }}
                                    title="Open preview in a separate browser tab"
                                >
                                    New Tab
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPrintSlipModalOpen(false);
                                        setPrintSlipHtml('');
                                        setPrintSlipGrn(null);
                                    }}
                                    style={{
                                        background: 'transparent', border: 'none',
                                        cursor: 'pointer', color: '#64748b', padding: 4, display: 'flex'
                                    }}
                                    title="Close preview"
                                >
                                    <BsX size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Sandboxed Iframe Container */}
                        <div style={{ flex: 1, padding: 12, background: '#f8fafc', overflow: 'hidden', display: 'flex' }}>
                            <iframe
                                ref={printSlipIframeRef}
                                srcDoc={preparePrintSlipHtml(printSlipHtml)}
                                title={`GRN Slip ${printSlipGrn?.grn_number || ''}`}
                                sandbox="allow-scripts allow-modals"
                                style={{
                                    width: '100%', height: '72vh', border: '1px solid #cbd5e1',
                                    borderRadius: 8, background: '#ffffff'
                                }}
                            />
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 24px', borderTop: '1px solid #e2e8f0', background: '#ffffff',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                Tip: You can print directly using the <strong>Print Slip</strong> button above or the print button inside the slip.
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsPrintSlipModalOpen(false);
                                    setPrintSlipHtml('');
                                    setPrintSlipGrn(null);
                                }}
                                style={{
                                    padding: '7px 18px', background: '#f1f5f9', border: '1px solid #d1d5db',
                                    borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   7. INVENTORY: Purchase Returns
───────────────────────────────────────────────────────────── */
export const PurchaseReturnsPage = (props) => <PurchaseOrderReturns {...props} />;


/* ─────────────────────────────────────────────────────────────
   8. INVENTORY: Store Transfers
───────────────────────────────────────────────────────────── */
export const StoreTransfersPage = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Summary & Analytics State from GET /api/v1/store-transfers/summary
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    // Available Stores (for store selector filter & context)
    const [stores, setStores] = useState([]);
    // Inactive store IDs tracked to disable invalid transfer approvals
    const [inactiveStoreIds, setInactiveStoreIds] = useState(new Set());

    // Determine initial store ID dynamically from authorized user context (no hardcoded store_id=1)
    const [selectedStoreId, setSelectedStoreId] = useState(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const id = user.store_id || user.storeId || user.store?.id;
            if (id && Number(id) > 0) return String(id);
        } catch {
            // ignore
        }
        return "all";
    });

    // Toggle for Analytics panel (default true / open when summary is loaded)
    const [showAnalytics, setShowAnalytics] = useState(true);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Pagination State (Client view with skip/limit support)
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Expandable item details state: set of expanded transfer IDs
    const [expandedTransferIds, setExpandedTransferIds] = useState(new Set());

    // Create Stock Transfer Modal & Feedback State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createSuccessMsg, setCreateSuccessMsg] = useState("");

    // View Transfer Details Modal State (GET /api/v1/store-transfers/{transfer_id})
    const [selectedDetailsTransferId, setSelectedDetailsTransferId] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsData, setDetailsData] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState(null);

    const handleOpenDetailsModal = async (transferId) => {
        if (!transferId) return;
        setSelectedDetailsTransferId(transferId);
        setDetailsModalOpen(true);
        setDetailsData(null); // Clear stale details from previous selection
        setDetailsError(null);
        setDetailsLoading(true);

        try {
            const data = await getStoreTransferById(transferId);
            console.log(`STORE TRANSFER #${transferId} DETAILS =>`, data);
            setDetailsData(data);
            if (data?.source_store_id != null) {
                checkStoreActiveStatus(data.source_store_id).then((chk) => {
                    if (chk?.isInactiveOrDeleted) {
                        setInactiveStoreIds((prev) => new Set(prev).add(Number(data.source_store_id)));
                    }
                }).catch(() => {});
            }
        } catch (err) {
            console.error(`Failed to fetch store transfer #${transferId} details:`, err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detail?.message ||
                (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
                err?.message ||
                "Failed to load store transfer details";
            setDetailsError(msg);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleCloseDetailsModal = () => {
        setDetailsModalOpen(false);
        setDetailsData(null);
        setDetailsError(null);
        setSelectedDetailsTransferId(null);
    };

    // Transfer Approval State (PUT /api/v1/store-transfers/{transfer_id}/approve)
    const [confirmApproveTransfer, setConfirmApproveTransfer] = useState(null);
    const [approvingTransferId, setApprovingTransferId] = useState(null);
    const [approveError, setApproveError] = useState(null);
    const [approveSuccessMsg, setApproveSuccessMsg] = useState("");
    const isApprovingRef = useRef(false);

    const handleRequestApprove = async (transfer) => {
        if (!transfer || approvingTransferId || isApprovingRef.current) return;
        setApproveError(null);

        const trId = transfer.id;
        const trNum = transfer.transfer_number || `#${trId}`;
        const srcStoreId = transfer.source_store_id != null ? Number(transfer.source_store_id) : null;

        // 1. Immediate client check: only Pending transfers can be approved
        const rawStatus = transfer?.status;
        const normalized = normalizeStatus(rawStatus);
        if (normalized !== 'pending') {
            setApproveError({
                transferId: trId,
                transferNumber: trNum,
                message: `Transfer #${trNum} cannot be approved because its current status is "${rawStatus || 'Unknown'}". Only transfers in "Pending" status can be approved.`,
                backendDetail: `Current status is ${rawStatus}`,
                status: 400
            });
            return;
        }

        // 2. Client check: source store already known to be inactive or deleted
        if (srcStoreId && inactiveStoreIds.has(srcStoreId)) {
            setApproveError({
                transferId: trId,
                transferNumber: trNum,
                message: "Cannot approve this transfer because its source store is inactive or has been deleted.",
                backendDetail: "Source store is inactive or has been deleted",
                status: 400
            });
            return;
        }

        // 3. Verify latest transfer status from backend before showing confirmation modal
        let latestTransfer = transfer;
        try {
            const latest = await getStoreTransferById(trId);
            if (latest) {
                latestTransfer = latest;
                if (normalizeStatus(latest.status) !== 'pending') {
                    setApproveError({
                        transferId: trId,
                        transferNumber: trNum,
                        message: `Transfer #${trNum} cannot be approved because it has already transitioned to "${latest.status}". Only transfers in "Pending" status can be approved.`,
                        backendDetail: `Live backend status is ${latest.status}`,
                        status: 400
                    });
                    fetchTransfers();
                    return;
                }
            }
        } catch (fetchErr) {
            console.warn("Could not pre-fetch latest transfer details, using row data:", fetchErr);
        }

        // 4. Verify source store active status from backend
        const resolvedSrcStoreId = latestTransfer.source_store_id != null ? Number(latestTransfer.source_store_id) : srcStoreId;
        if (resolvedSrcStoreId) {
            try {
                const storeCheck = await checkStoreActiveStatus(resolvedSrcStoreId);
                if (storeCheck.isInactiveOrDeleted) {
                    setInactiveStoreIds((prev) => new Set(prev).add(resolvedSrcStoreId));
                    setApproveError({
                        transferId: trId,
                        transferNumber: trNum,
                        message: "Cannot approve this transfer because its source store is inactive or has been deleted.",
                        backendDetail: storeCheck.reason || "Source store is inactive or has been deleted",
                        status: 400
                    });
                    return;
                }
            } catch (err) {
                console.warn("Could not check store active status:", err);
            }
        }

        setConfirmApproveTransfer(latestTransfer);
    };

    const handleConfirmApprove = async (targetId = null) => {
        if (isApprovingRef.current || approvingTransferId) return;
        const transfer = confirmApproveTransfer;
        const trId = targetId || transfer?.id;
        if (!trId) return;

        const trNum = transfer?.transfer_number || `#${trId}`;

        isApprovingRef.current = true;
        setApprovingTransferId(trId);
        setApproveError(null);

        try {
            const result = await approveStoreTransfer(trId);
            console.log("APPROVE RESULT =>", result);
            setConfirmApproveTransfer(null);
            setApproveSuccessMsg(`Store Transfer ${trNum} approved successfully!`);

            // Refresh list and summary after successful approval
            fetchTransfers();
            fetchSummary(selectedStoreId);

            // If details modal is open for this transfer, reload latest backend details
            if (detailsModalOpen && selectedDetailsTransferId === trId) {
                handleOpenDetailsModal(trId);
            }
        } catch (err) {
            console.error(`Approval failed for transfer #${trId}:`, err);
            const status = err?.response?.status;
            const data = err?.response?.data;

            // Robust backend error message extraction
            let rawMsg = data?.message || data?.detail?.message;
            if (!rawMsg && typeof data?.detail === "string") {
                rawMsg = data.detail;
            } else if (!rawMsg && Array.isArray(data?.detail)) {
                rawMsg = data.detail.map(d => d?.msg || (typeof d === "string" ? d : JSON.stringify(d))).join("; ");
            } else if (!rawMsg && typeof data?.detail === "object" && data?.detail !== null) {
                rawMsg = data.detail.message || JSON.stringify(data.detail);
            }
            if (!rawMsg) {
                rawMsg = err?.message || "Failed to approve store transfer";
            }

            let userFriendlyMsg = rawMsg;
            const lowerMsg = String(rawMsg || '').toLowerCase();

            if (lowerMsg.includes("source store is inactive") || lowerMsg.includes("deleted") || lowerMsg.includes("has been deleted")) {
                userFriendlyMsg = "Cannot approve this transfer because its source store is inactive or has been deleted.";
                if (transfer?.source_store_id != null) {
                    setInactiveStoreIds((prev) => new Set(prev).add(Number(transfer.source_store_id)));
                }
            } else if (lowerMsg.includes("pending") || lowerMsg.includes("already approved") || lowerMsg.includes("cannot be approved") || lowerMsg.includes("invalid status")) {
                userFriendlyMsg = `Approval not permitted: Transfer is not in Pending status (${rawMsg}). Please refresh your transfer list.`;
            } else if (lowerMsg.includes("stock") || lowerMsg.includes("inventory") || lowerMsg.includes("insufficient") || lowerMsg.includes("quantity")) {
                userFriendlyMsg = `Approval failed: Insufficient stock in source store for requested item(s) (${rawMsg}).`;
            } else if (status === 400) {
                userFriendlyMsg = `Approval validation failed (HTTP 400): ${rawMsg}`;
            } else if (status === 401 || status === 403) {
                userFriendlyMsg = "Authentication or permission error: You are not authorized to approve store transfers.";
            } else if (status === 404) {
                userFriendlyMsg = `Store transfer #${trId} was not found on the server.`;
            } else if (status === 409) {
                userFriendlyMsg = `Conflict: ${rawMsg}`;
            } else if (status === 422) {
                userFriendlyMsg = `Validation error: ${rawMsg}`;
            }

            setApproveError({
                transferId: trId,
                transferNumber: trNum,
                message: userFriendlyMsg,
                backendDetail: rawMsg,
                status: status || 400
            });
            setConfirmApproveTransfer(null);
        } finally {
            setApprovingTransferId(null);
            isApprovingRef.current = false;
        }
    };

    // Transfer Rejection State (PUT /api/v1/store-transfers/{transfer_id}/reject)
    const [confirmRejectTransfer, setConfirmRejectTransfer] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectReasonError, setRejectReasonError] = useState("");
    const [rejectingTransferId, setRejectingTransferId] = useState(null);
    const [rejectError, setRejectError] = useState(null);
    const [rejectSuccessMsg, setRejectSuccessMsg] = useState("");
    const isRejectingRef = useRef(false);

    const handleRequestReject = (transfer) => {
        if (!transfer || rejectingTransferId || approvingTransferId) return;
        setRejectError(null);
        setRejectReasonError("");
        setRejectionReason("");
        setConfirmRejectTransfer(transfer);
    };

    const handleConfirmReject = async () => {
        if (!confirmRejectTransfer || rejectingTransferId || isRejectingRef.current) return;
        if (rejectionReason.length > 500) {
            setRejectReasonError("Rejection reason cannot exceed 500 characters.");
            return;
        }

        const transfer = confirmRejectTransfer;
        const trId = transfer.id;
        const trNum = transfer.transfer_number || `#${trId}`;

        isRejectingRef.current = true;
        setRejectingTransferId(trId);
        setRejectError(null);
        setRejectReasonError("");

        try {
            const result = await rejectStoreTransfer(trId, rejectionReason);
            console.log("REJECT RESULT =>", result);
            setConfirmRejectTransfer(null);
            setRejectionReason("");
            setRejectSuccessMsg(`Store Transfer ${trNum} rejected successfully!`);

            // Refresh list and summary after successful rejection
            fetchTransfers();
            fetchSummary(selectedStoreId);

            // If details modal is open for this transfer, reload latest backend details
            if (detailsModalOpen && selectedDetailsTransferId === trId) {
                handleOpenDetailsModal(trId);
            }
        } catch (err) {
            console.error(`Rejection failed for transfer #${trId}:`, err);
            const status = err?.response?.status;
            const data = err?.response?.data;
            const rawMsg =
                data?.message ||
                data?.detail?.message ||
                (typeof data?.detail === "string" ? data.detail : null) ||
                err?.message ||
                "Failed to reject store transfer";

            let userFriendlyMsg = rawMsg;
            const lowerMsg = String(rawMsg || '').toLowerCase();

            if (lowerMsg.includes("only pending transfers can be rejected") || (status === 400 && lowerMsg.includes("pending"))) {
                userFriendlyMsg = "Cannot reject this transfer because it is no longer in Pending status. Please refresh the transfer details.";
            } else if (status === 400) {
                userFriendlyMsg = `Rejection validation failed: ${rawMsg}`;
            } else if (status === 401 || status === 403) {
                userFriendlyMsg = "Authentication or permission error: You are not authorized to reject store transfers.";
            } else if (status === 404) {
                userFriendlyMsg = `Store transfer #${trId} not found on the server.`;
            } else if (status === 409) {
                userFriendlyMsg = `Conflict: ${rawMsg}`;
            } else if (status === 422) {
                userFriendlyMsg = `Validation error: ${rawMsg}`;
            }

            setRejectError({
                transferId: trId,
                transferNumber: trNum,
                message: userFriendlyMsg,
                backendDetail: rawMsg,
                status: status || 400
            });
            setConfirmRejectTransfer(null);
            setRejectionReason("");
        } finally {
            setRejectingTransferId(null);
            isRejectingRef.current = false;
        }
    };

    // Transfer Dispatch State (PUT /api/v1/store-transfers/{transfer_id}/dispatch)
    const [confirmDispatchTransfer, setConfirmDispatchTransfer] = useState(null);
    const [dispatchingTransferId, setDispatchingTransferId] = useState(null);
    const [dispatchError, setDispatchError] = useState(null);
    const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState("");
    const isDispatchingRef = useRef(false);

    const handleRequestDispatch = (transfer) => {
        if (!transfer || dispatchingTransferId || approvingTransferId || rejectingTransferId) return;
        setDispatchError(null);
        setConfirmDispatchTransfer(transfer);
    };

    const handleConfirmDispatch = async () => {
        if (!confirmDispatchTransfer || dispatchingTransferId || isDispatchingRef.current) return;
        const transfer = confirmDispatchTransfer;
        const trId = transfer.id;
        const trNum = transfer.transfer_number || `#${trId}`;

        isDispatchingRef.current = true;
        setDispatchingTransferId(trId);
        setDispatchError(null);

        try {
            const result = await dispatchStoreTransfer(trId);
            console.log("DISPATCH RESULT =>", result);
            setConfirmDispatchTransfer(null);
            setDispatchSuccessMsg(`Store Transfer ${trNum} dispatched successfully!`);

            // Refresh list and summary after successful dispatch
            fetchTransfers();
            fetchSummary(selectedStoreId);

            // If details modal is open for this transfer, reload latest backend details
            if (detailsModalOpen && selectedDetailsTransferId === trId) {
                handleOpenDetailsModal(trId);
            }
        } catch (err) {
            console.error(`Dispatch failed for transfer #${trId}:`, err);
            const status = err?.response?.status;
            const data = err?.response?.data;
            const rawMsg =
                data?.message ||
                data?.detail?.message ||
                (typeof data?.detail === "string" ? data.detail : null) ||
                err?.message ||
                "Failed to dispatch store transfer";

            let userFriendlyMsg = rawMsg;
            const lowerMsg = String(rawMsg || '').toLowerCase();

            if (lowerMsg.includes("only approved transfers can be dispatched") || (status === 400 && lowerMsg.includes("approved"))) {
                userFriendlyMsg = "Cannot dispatch this transfer because it is not currently Approved. Only approved transfers can be dispatched.";
            } else if (status === 400) {
                userFriendlyMsg = `Dispatch validation failed: ${rawMsg}`;
            } else if (status === 401 || status === 403) {
                userFriendlyMsg = "Authentication or permission error: You are not authorized to dispatch store transfers.";
            } else if (status === 404) {
                userFriendlyMsg = `Store transfer #${trId} not found on the server.`;
            } else if (status === 409) {
                userFriendlyMsg = `Conflict: ${rawMsg}`;
            } else if (status === 422) {
                userFriendlyMsg = `Validation error: ${rawMsg}`;
            }

            setDispatchError({
                transferId: trId,
                transferNumber: trNum,
                message: userFriendlyMsg,
                backendDetail: rawMsg,
                status: status || 400
            });
            setConfirmDispatchTransfer(null);
        } finally {
            setDispatchingTransferId(null);
            isDispatchingRef.current = false;
        }
    };

    // Transfer Receive State (PUT /api/v1/store-transfers/{transfer_id}/receive)
    const [confirmReceiveTransfer, setConfirmReceiveTransfer] = useState(null);
    const [receivingTransferId, setReceivingTransferId] = useState(null);
    const [receiveError, setReceiveError] = useState(null);
    const [receiveSuccessMsg, setReceiveSuccessMsg] = useState("");
    const isReceivingRef = useRef(false);

    const handleRequestReceive = (transfer) => {
        if (!transfer || receivingTransferId || approvingTransferId || rejectingTransferId || dispatchingTransferId) return;
        setReceiveError(null);
        setConfirmReceiveTransfer(transfer);
    };

    const handleConfirmReceive = async () => {
        if (!confirmReceiveTransfer || receivingTransferId || isReceivingRef.current) return;
        const transfer = confirmReceiveTransfer;
        const trId = transfer.id;
        const trNum = transfer.transfer_number || `#${trId}`;

        isReceivingRef.current = true;
        setReceivingTransferId(trId);
        setReceiveError(null);

        try {
            const result = await receiveStoreTransfer(trId);
            console.log("RECEIVE RESULT =>", result);
            setConfirmReceiveTransfer(null);
            setReceiveSuccessMsg(`Store Transfer ${trNum} received successfully!`);

            // Refresh list and summary after successful receipt
            fetchTransfers();
            fetchSummary(selectedStoreId);

            // If details modal is open for this transfer, reload latest backend details
            if (detailsModalOpen && selectedDetailsTransferId === trId) {
                handleOpenDetailsModal(trId);
            }
        } catch (err) {
            console.error(`Receive failed for transfer #${trId}:`, err);
            const status = err?.response?.status;
            const data = err?.response?.data;
            const rawMsg =
                data?.message ||
                data?.detail?.message ||
                (typeof data?.detail === "string" ? data.detail : null) ||
                err?.message ||
                "Failed to receive store transfer";

            let userFriendlyMsg = rawMsg;
            const lowerMsg = String(rawMsg || '').toLowerCase();

            if (lowerMsg.includes("only dispatched transfers can be received") || (status === 400 && lowerMsg.includes("dispatched"))) {
                userFriendlyMsg = "Cannot receive this transfer because it has not been dispatched yet. Only dispatched transfers can be received.";
            } else if (status === 400) {
                userFriendlyMsg = `Receive validation failed: ${rawMsg}`;
            } else if (status === 401 || status === 403) {
                userFriendlyMsg = "Authentication or permission error: You are not authorized to receive store transfers.";
            } else if (status === 404) {
                userFriendlyMsg = `Store transfer #${trId} not found on the server.`;
            } else if (status === 409) {
                userFriendlyMsg = `Conflict: ${rawMsg}`;
            } else if (status === 422) {
                userFriendlyMsg = `Validation error: ${rawMsg}`;
            }

            setReceiveError({
                transferId: trId,
                transferNumber: trNum,
                message: userFriendlyMsg,
                backendDetail: rawMsg,
                status: status || 400
            });
            setConfirmReceiveTransfer(null);
        } finally {
            setReceivingTransferId(null);
            isReceivingRef.current = false;
        }
    };

    // Transfer Receive With Discrepancy State (POST /api/v1/store-transfers/{transfer_id}/receive-with-discrepancy)
    const [discrepancyModalOpen, setDiscrepancyModalOpen] = useState(false);
    const [discrepancyTransfer, setDiscrepancyTransfer] = useState(null);
    const [verifyingDiscrepancyStatusId, setVerifyingDiscrepancyStatusId] = useState(null);
    const [discrepancyItems, setDiscrepancyItems] = useState([]);
    const [discrepancyNotes, setDiscrepancyNotes] = useState("Received with discrepancy");
    const [receivingDiscrepancyTransferId, setReceivingDiscrepancyTransferId] = useState(null);
    const [discrepancyError, setDiscrepancyError] = useState(null);
    const [discrepancySuccessMsg, setDiscrepancySuccessMsg] = useState("");
    const [discrepancyStatusWarning, setDiscrepancyStatusWarning] = useState("");
    const isSubmittingDiscrepancyRef = useRef(false);

    // Requirement 3, 4, 5: Fetch selected transfer's actual status from backend before enabling/opening Receive With Discrepancy
    const handleRequestReceiveWithDiscrepancy = async (transfer) => {
        if (!transfer || receivingDiscrepancyTransferId || isSubmittingDiscrepancyRef.current) return;
        const trId = Number(transfer.id);
        if (!Number.isSafeInteger(trId) || trId <= 0) return;

        setDiscrepancyError(null);
        setDiscrepancyStatusWarning("");
        setVerifyingDiscrepancyStatusId(trId);

        try {
            // Live status fetch directly from GET /api/v1/store-transfers/{transfer_id}
            const liveTransfer = await getStoreTransferById(trId);
            console.log(`VERIFIED LIVE TRANSFER #${trId} BEFORE RECEIVE WITH DISCREPANCY =>`, liveTransfer);

            const liveStatusNorm = normalizeStatus(liveTransfer?.status);

            // Allow this API action only when the transfer status is 'dispatched'
            if (liveStatusNorm !== 'dispatched') {
                const currentStatusDisplay = liveTransfer?.status || transfer.status || 'Unknown';
                let reason = `Current status is "${currentStatusDisplay}".`;
                if (liveStatusNorm === 'pending') {
                    reason += " Transfer is pending approval. It must be approved and dispatched before receiving with discrepancy.";
                } else if (liveStatusNorm === 'approved') {
                    reason += " Transfer is approved but has not been dispatched yet. Please dispatch it first.";
                } else if (liveStatusNorm === 'received') {
                    reason += " Transfer has already been received.";
                } else if (liveStatusNorm === 'rejected') {
                    reason += " Transfer was rejected and cannot be received.";
                }

                const msg = `Cannot receive with discrepancy: Only dispatched transfers can be received with discrepancy. ${reason}`;
                setDiscrepancyStatusWarning(msg);
                setDiscrepancyError({
                    transferId: trId,
                    transferNumber: liveTransfer?.transfer_number || transfer.transfer_number || `#${trId}`,
                    message: msg,
                    status: 400
                });

                // Update local transfer record with latest real status
                setTransfers(prev => prev.map(t => t.id === trId ? { ...t, ...liveTransfer } : t));
                return;
            }

            // Populate items from live server record
            const rawItems = Array.isArray(liveTransfer?.items) && liveTransfer.items.length > 0
                ? liveTransfer.items
                : (Array.isArray(transfer.items) && transfer.items.length > 0 ? transfer.items : []);

            const initialFormItems = rawItems.map(it => {
                const prodId = Number(it.product_id ?? it.productId ?? it.id);
                const dispQty = Number(it.quantity ?? it.dispatched_quantity ?? it.qty ?? 0);
                return {
                    product_id: prodId,
                    product_name: it.product_name || it.name || `Product #${prodId}`,
                    sku: it.sku || '—',
                    dispatched_quantity: dispQty,
                    received_quantity: dispQty, // Default all received, user enters damaged/missing
                    damaged_quantity: 0,
                    missing_quantity: 0,
                    remarks: "",
                    userEditedRemarks: false
                };
            });

            setDiscrepancyTransfer(liveTransfer);
            setDiscrepancyItems(initialFormItems);
            setDiscrepancyNotes("Received with discrepancy");
            setDiscrepancyModalOpen(true);
        } catch (err) {
            console.error(`Failed to verify status for transfer #${trId}:`, err);
            const errMsg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Failed to verify transfer status";
            setDiscrepancyError({
                transferId: trId,
                transferNumber: transfer.transfer_number || `#${trId}`,
                message: `Could not verify transfer status with the server: ${errMsg}`,
                status: err?.response?.status || 400
            });
        } finally {
            setVerifyingDiscrepancyStatusId(null);
        }
    };

    const handleUpdateDiscrepancyItem = (index, field, value) => {
        setDiscrepancyItems(prev => {
            const next = [...prev];
            const item = { ...next[index] };

            if (field === 'remarks') {
                item.remarks = String(value).slice(0, 255);
                item.userEditedRemarks = true;
            } else {
                const num = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
                item[field] = num;

                // Auto-sync remarks if user has not manually customized remarks
                const recQty = Number(field === 'received_quantity' ? (num === '' ? 0 : num) : (item.received_quantity || 0));
                const dmgQty = Number(field === 'damaged_quantity' ? (num === '' ? 0 : num) : (item.damaged_quantity || 0));
                const misQty = Number(field === 'missing_quantity' ? (num === '' ? 0 : num) : (item.missing_quantity || 0));

                if (!item.userEditedRemarks) {
                    const parts = [];
                    if (dmgQty > 0) parts.push(`${dmgQty} product${dmgQty > 1 ? 's' : ''} damaged`);
                    if (misQty > 0) parts.push(`${misQty} product${misQty > 1 ? 's' : ''} missing`);
                    item.remarks = parts.join(' and ');
                }
            }
            next[index] = item;
            return next;
        });
    };

    const handleRemarksChange = (index, value) => {
        setDiscrepancyItems(prev => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                remarks: String(value).slice(0, 255),
                userEditedRemarks: true
            };
            return next;
        });
    };

    const getDiscrepancyValidationErrors = () => {
        if (!discrepancyTransfer) return ["No transfer selected."];
        if (normalizeStatus(discrepancyTransfer.status) !== 'dispatched') {
            return [`Transfer status is "${discrepancyTransfer.status}". Only dispatched transfers can be received with discrepancy.`];
        }
        if (!discrepancyItems || discrepancyItems.length === 0) {
            return ["At least one transfer item is required."];
        }

        const errors = [];
        let hasAnyDiscrepancy = false;

        discrepancyItems.forEach((it, idx) => {
            const prodName = it.product_name || `Item #${idx + 1}`;
            const rec = it.received_quantity === '' ? 0 : Number(it.received_quantity);
            const dmg = it.damaged_quantity === '' ? 0 : Number(it.damaged_quantity);
            const mis = it.missing_quantity === '' ? 0 : Number(it.missing_quantity);
            const dispatched = Number(it.dispatched_quantity);

            if (!Number.isSafeInteger(it.product_id) || it.product_id <= 0) {
                errors.push(`${prodName}: Invalid Product ID.`);
            }
            if (!Number.isSafeInteger(rec) || rec < 0) {
                errors.push(`${prodName}: Received quantity must be a non-negative whole number.`);
            }
            if (!Number.isSafeInteger(dmg) || dmg < 0) {
                errors.push(`${prodName}: Damaged quantity must be a non-negative whole number.`);
            }
            if (!Number.isSafeInteger(mis) || mis < 0) {
                errors.push(`${prodName}: Missing quantity must be a non-negative whole number.`);
            }

            const accounted = (Number.isSafeInteger(rec) ? rec : 0) +
                              (Number.isSafeInteger(dmg) ? dmg : 0) +
                              (Number.isSafeInteger(mis) ? mis : 0);

            if (accounted !== dispatched) {
                errors.push(`${prodName}: Accounted quantity (${accounted}) does not match dispatched quantity (${dispatched}). [Received: ${rec || 0} + Damaged: ${dmg || 0} + Missing: ${mis || 0} = ${accounted}]`);
            }

            if (dmg > 0 || mis > 0 || rec < dispatched) {
                hasAnyDiscrepancy = true;
            }
        });

        if (!hasAnyDiscrepancy) {
            errors.push("No discrepancy reported (0 damaged, 0 missing, all items received). If all products arrived in full sellable condition, please use standard 'Confirm & Receive'.");
        }

        return errors;
    };

    const handleConfirmReceiveWithDiscrepancy = async () => {
        if (!discrepancyTransfer || receivingDiscrepancyTransferId || isSubmittingDiscrepancyRef.current) return;

        const validationErrors = getDiscrepancyValidationErrors();
        if (validationErrors.length > 0) {
            setDiscrepancyError({
                message: validationErrors[0],
                allErrors: validationErrors,
                status: 422
            });
            return;
        }

        const trId = Number(discrepancyTransfer.id);
        const trNum = discrepancyTransfer.transfer_number || `#${trId}`;

        // Requirement 8: Send exact request body structure
        const payload = {
            items: discrepancyItems.map(it => {
                const itemObj = {
                    product_id: Number(it.product_id),
                    received_quantity: Number(it.received_quantity || 0),
                    damaged_quantity: Number(it.damaged_quantity || 0),
                    missing_quantity: Number(it.missing_quantity || 0)
                };
                if (it.remarks && String(it.remarks).trim()) {
                    itemObj.remarks = String(it.remarks).trim().slice(0, 255);
                }
                return itemObj;
            }),
            notes: discrepancyNotes ? String(discrepancyNotes).trim().slice(0, 500) : "Received with discrepancy"
        };

        isSubmittingDiscrepancyRef.current = true;
        setReceivingDiscrepancyTransferId(trId);
        setDiscrepancyError(null);

        try {
            const result = await receiveStoreTransferWithDiscrepancy(trId, payload);
            console.log("RECEIVE WITH DISCREPANCY RESULT =>", result);

            setDiscrepancyModalOpen(false);
            setDiscrepancyTransfer(null);
            setDiscrepancyItems([]);

            const totalRec = result?.total_received_quantity ?? payload.items.reduce((acc, it) => acc + it.received_quantity, 0);
            const totalDmg = result?.total_damaged_quantity ?? payload.items.reduce((acc, it) => acc + it.damaged_quantity, 0);
            const totalMis = result?.total_missing_quantity ?? payload.items.reduce((acc, it) => acc + it.missing_quantity, 0);

            setDiscrepancySuccessMsg(
                `Store Transfer ${trNum} received with discrepancy recorded! (Received: ${totalRec}, Damaged: ${totalDmg}, Missing: ${totalMis})`
            );

            // Requirement 12: On successful response, update transfer status, discrepancy details, and transfer summary using real API data
            fetchTransfers();
            fetchSummary(selectedStoreId);

            // If details modal is open for this transfer, reload latest backend details
            if (detailsModalOpen && selectedDetailsTransferId === trId) {
                handleOpenDetailsModal(trId);
            }
        } catch (err) {
            console.error(`Receive with discrepancy failed for transfer #${trId}:`, err);
            const status = err?.response?.status;
            const data = err?.response?.data;

            let userFriendlyMsg = "";
            let backendDetail = "";

            if (status === 400) {
                backendDetail = data?.message || data?.detail?.message || (typeof data?.detail === 'string' ? data.detail : null) || err?.message || "Bad Request";
                if (String(backendDetail).toLowerCase().includes("only dispatched transfers")) {
                    userFriendlyMsg = "Cannot receive with discrepancy: Only dispatched transfers can be received with discrepancy. Please check the transfer status.";
                } else {
                    userFriendlyMsg = `Discrepancy receipt rejected (400): ${backendDetail}`;
                }
            } else if (status === 422) {
                if (Array.isArray(data?.detail)) {
                    backendDetail = data.detail.map(d => {
                        const loc = Array.isArray(d.loc) ? d.loc.filter(l => l !== 'body').join('.') : '';
                        return `${loc ? `[${loc}]: ` : ''}${d.msg || 'Invalid value'}`;
                    }).join('; ');
                } else {
                    backendDetail = data?.message || (typeof data?.detail === 'string' ? data.detail : null) || err?.message || "Validation Error";
                }
                userFriendlyMsg = `Validation failed (422): ${backendDetail}`;
            } else if (status === 401 || status === 403) {
                userFriendlyMsg = "Authentication or permission error: You are not authorized to perform this action.";
                backendDetail = data?.message || err?.message || "Unauthorized";
            } else if (status === 404) {
                userFriendlyMsg = `Store transfer #${trId} was not found on the server.`;
                backendDetail = "Not Found";
            } else {
                backendDetail = data?.message || (typeof data?.detail === 'string' ? data.detail : null) || err?.message || "An unexpected error occurred";
                userFriendlyMsg = `Failed to process discrepancy receipt: ${backendDetail}`;
            }

            setDiscrepancyError({
                transferId: trId,
                transferNumber: trNum,
                message: userFriendlyMsg,
                backendDetail: backendDetail,
                status: status || 400
            });
        } finally {
            setReceivingDiscrepancyTransferId(null);
            isSubmittingDiscrepancyRef.current = false;
        }
    };

    // Helper: Normalize status string for consistent comparisons
    const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

    // Format Date helper
    const formatDateTime = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return String(dateStr);
            return d.toLocaleString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return String(dateStr);
        }
    };

    // Load available stores list on mount for selector (handles direct JSON array or wrapped response)
    useEffect(() => {
        let isMounted = true;
        listStores()
            .then((res) => {
                if (!isMounted) return;
                let list = [];
                if (Array.isArray(res)) {
                    list = res;
                } else if (Array.isArray(res?.data)) {
                    list = res.data;
                } else if (Array.isArray(res?.stores)) {
                    list = res.stores;
                } else if (Array.isArray(res?.data?.stores)) {
                    list = res.data.stores;
                } else if (Array.isArray(res?.items)) {
                    list = res.items;
                }
                console.log("STORES API PROCESSED LIST =>", list);
                setStores(list);

                const inactiveSet = new Set();
                list.forEach((s) => {
                    if (s.is_active === false || s.status === 'inactive' || s.status === 'deactivated' || s.deleted_at || s.is_deleted) {
                        inactiveSet.add(Number(s.id));
                    }
                });
                if (inactiveSet.size > 0) {
                    setInactiveStoreIds((prev) => new Set([...prev, ...inactiveSet]));
                }
            })
            .catch((err) => {
                console.warn("Failed to load stores for transfer filter:", err?.message || err);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch store transfers from GET /api/v1/store-transfers?skip=0&limit=100
    const fetchTransfers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Calls GET /api/v1/store-transfers?skip=0&limit=100
            const responseData = await getStoreTransfers({ skip: 0, limit: 100 });
            const list = extractTransfers(responseData);

            console.log("STORE TRANSFERS API RESPONSE =>", list);
            setTransfers(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Failed to fetch store transfers:", err);
            const status = err?.response?.status;
            let errorDetail =
                err?.response?.data?.message ||
                err?.response?.data?.detail?.message ||
                (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
                err?.message ||
                "Failed to load store transfers";

            if (status === 401 || status === 403) {
                errorDetail = "Authentication error: Please log in to view store transfers.";
            } else if (status === 422) {
                errorDetail = `Validation error: ${errorDetail}`;
            } else if (status >= 500) {
                errorDetail = "Server error: Unable to load store transfers at this time.";
            }

            setError(errorDetail);
            setTransfers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch Summary from GET /api/v1/store-transfers/summary?store_id=...
    const fetchSummary = useCallback(async (storeId) => {
        try {
            setSummaryLoading(true);
            setSummaryError(null);

            const storeParam = storeId && storeId !== "all" ? Number(storeId) : null;
            const data = await getStoreTransfersSummary(storeParam);
            console.log("STORE TRANSFERS SUMMARY RESPONSE =>", data);
            setSummary(data || null);
        } catch (err) {
            console.warn("Store transfers summary notice:", err?.message || err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                err?.message ||
                "Summary metrics unavailable";
            setSummaryError(typeof msg === "string" ? msg : "Summary metrics unavailable");
            setSummary(null);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // Initial load: fetch complete transfers list
    useEffect(() => {
        fetchTransfers();
    }, [fetchTransfers]);

    // Fetch summary whenever selected store changes
    useEffect(() => {
        fetchSummary(selectedStoreId);
    }, [selectedStoreId, fetchSummary]);

    const handleRefresh = () => {
        fetchTransfers();
        fetchSummary(selectedStoreId);
    };

    const handleCreateSuccess = (newTransfer) => {
        const transferNum = newTransfer?.transfer_number || (newTransfer?.id ? `#${newTransfer.id}` : "");
        setCreateSuccessMsg(`Stock Transfer ${transferNum} created successfully! (201 Created)`);
        fetchTransfers();
        fetchSummary(selectedStoreId);
    };

    const toggleExpandRow = (id) => {
        setExpandedTransferIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Safe transfers array
    const safeTransfers = Array.isArray(transfers) ? transfers : [];

    // Authoritative counts from GET /api/v1/store-transfers/summary with fallback to loaded list
    const totalTransfersVal = summary?.total_transfers != null ? summary.total_transfers : safeTransfers.length;
    const pendingTransfersVal = summary?.pending_transfers != null ? summary.pending_transfers : safeTransfers.filter((t) => normalizeStatus(t.status) === 'pending').length;
    const receivedTransfersVal = summary?.received_transfers != null ? summary.received_transfers : safeTransfers.filter((t) => normalizeStatus(t.status) === 'received').length;
    const rejectedTransfersVal = summary?.rejected_transfers != null ? summary.rejected_transfers : safeTransfers.filter((t) => normalizeStatus(t.status) === 'rejected').length;
    const approvedTransfersVal = summary?.approved_transfers != null ? summary.approved_transfers : safeTransfers.filter((t) => normalizeStatus(t.status) === 'approved').length;
    const dispatchedTransfersVal = summary?.dispatched_transfers != null ? summary.dispatched_transfers : safeTransfers.filter((t) => normalizeStatus(t.status) === 'dispatched').length;
    const inTransitTransfersVal = summary?.in_transit_transfers != null ? summary.in_transit_transfers : safeTransfers.filter((t) => normalizeStatus(t.status) === 'in-transit').length;
    const totalUnitsVal = summary?.total_units_transferred;

    // Filter and search logic
    const filteredTransfers = useMemo(() => {
        return safeTransfers.filter((tr) => {
            // Store filter (matches either source or destination store)
            if (selectedStoreId !== "all") {
                const sId = String(selectedStoreId);
                const matchesSource = String(tr.source_store_id) === sId;
                const matchesDest = String(tr.destination_store_id) === sId;
                if (!matchesSource && !matchesDest) {
                    return false;
                }
            }

            const st = normalizeStatus(tr.status);
            if (statusFilter !== "all" && st !== normalizeStatus(statusFilter)) {
                return false;
            }

            if (!searchTerm.trim()) return true;

            const term = searchTerm.toLowerCase();
            const trNum = String(tr.transfer_number || tr.id || "").toLowerCase();
            const src = String(tr.source_store_name || "").toLowerCase();
            const dst = String(tr.destination_store_name || "").toLowerCase();
            const approver = String(tr.approved_by_name || "").toLowerCase();
            const itemsMatch = Array.isArray(tr.items) && tr.items.some((it) =>
                String(it.product_name || "").toLowerCase().includes(term) ||
                String(it.sku || "").toLowerCase().includes(term)
            );

            return (
                trNum.includes(term) ||
                src.includes(term) ||
                dst.includes(term) ||
                approver.includes(term) ||
                itemsMatch
            );
        });
    }, [safeTransfers, selectedStoreId, statusFilter, searchTerm]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
    const paginatedTransfers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredTransfers.slice(start, start + pageSize);
    }, [filteredTransfers, page, pageSize]);

    // Reset page to 1 on filter/search/store change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter, selectedStoreId]);

    return (
        <ModuleContainer
            title="Inter-Store Stock Transfers"
            subtitle="Transfer products between retail outlets, generate gate passes and track in-transit stock"
            icon={<BsArrowLeftRight />}
            actionBtn={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Refresh Transfers & Summary Analytics"
                        style={{
                            background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '10px 14px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <BsArrowRepeat size={16} /> {loading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{
                            background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <BsPlus size={18} /> Request Stock Transfer
                    </button>
                </div>
            }
        >
            {/* Create Success Banner */}
            {createSuccessMsg && (
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>✓ {createSuccessMsg}</span>
                    <button
                        type="button"
                        onClick={() => setCreateSuccessMsg("")}
                        style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 14 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Approval Error Alert */}
            {approveError && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '12px 18px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 16, color: '#dc2626', marginTop: 1 }}>⚠</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13.5 }}>
                                {approveError.message}
                            </div>
                            {approveError.backendDetail && approveError.backendDetail !== approveError.message && (
                                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                                    Backend validation message: <em>{approveError.backendDetail}</em> (HTTP {approveError.status})
                                </div>
                            )}
                            <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>
                                Store Transfer {approveError.transferNumber} remains in its current status. No changes were applied.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setApproveError(null)}
                        style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Approval Success Banner */}
            {approveSuccessMsg && (
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>✓ {approveSuccessMsg}</span>
                    <button
                        type="button"
                        onClick={() => setApproveSuccessMsg("")}
                        style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 14 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Rejection Error Alert Banner */}
            {rejectError && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 16, color: '#dc2626', marginTop: 1 }}>⚠</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13.5 }}>
                                {rejectError.message}
                            </div>
                            {rejectError.backendDetail && rejectError.backendDetail !== rejectError.message && (
                                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                                    Backend validation message: <em>{rejectError.backendDetail}</em> (HTTP {rejectError.status})
                                </div>
                            )}
                            <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>
                                Store Transfer {rejectError.transferNumber} remains in its current status. No changes were applied.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRejectError(null)}
                        style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Rejection Success Banner */}
            {rejectSuccessMsg && (
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>✓ {rejectSuccessMsg}</span>
                    <button
                        type="button"
                        onClick={() => setRejectSuccessMsg("")}
                        style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 14 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Dispatch Error Alert Banner */}
            {dispatchError && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 16, color: '#dc2626', marginTop: 1 }}>⚠</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13.5 }}>
                                {dispatchError.message}
                            </div>
                            {dispatchError.backendDetail && dispatchError.backendDetail !== dispatchError.message && (
                                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                                    Backend validation message: <em>{dispatchError.backendDetail}</em> (HTTP {dispatchError.status})
                                </div>
                            )}
                            <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>
                                Store Transfer {dispatchError.transferNumber} remains in its current status. No changes were applied.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDispatchError(null)}
                        style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Dispatch Success Banner */}
            {dispatchSuccessMsg && (
                <div style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>✓ {dispatchSuccessMsg}</span>
                    <button
                        type="button"
                        onClick={() => setDispatchSuccessMsg("")}
                        style={{ background: 'transparent', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Receive Error Alert Banner */}
            {receiveError && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 16, color: '#dc2626', marginTop: 1 }}>⚠</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13.5 }}>
                                {receiveError.message}
                            </div>
                            {receiveError.backendDetail && receiveError.backendDetail !== receiveError.message && (
                                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                                    Backend validation message: <em>{receiveError.backendDetail}</em> (HTTP {receiveError.status})
                                </div>
                            )}
                            <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>
                                Store Transfer {receiveError.transferNumber} remains in its current status. No changes were applied.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReceiveError(null)}
                        style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Receive Success Banner */}
            {receiveSuccessMsg && (
                <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>✓ {receiveSuccessMsg}</span>
                    <button
                        type="button"
                        onClick={() => setReceiveSuccessMsg("")}
                        style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: 14 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Discrepancy Error Alert Banner (e.g. 400 Bad Request / 422 Validation) */}
            {discrepancyError && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 16, color: '#dc2626', marginTop: 1 }}>⚠</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13.5 }}>
                                {discrepancyError.message}
                            </div>
                            {discrepancyError.backendDetail && discrepancyError.backendDetail !== discrepancyError.message && (
                                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 3 }}>
                                    Backend validation message: <em>{discrepancyError.backendDetail}</em> (HTTP {discrepancyError.status})
                                </div>
                            )}
                            {Array.isArray(discrepancyError.allErrors) && discrepancyError.allErrors.length > 1 && (
                                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#991b1b' }}>
                                    {discrepancyError.allErrors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}
                            {discrepancyError.transferNumber && (
                                <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>
                                    Store Transfer {discrepancyError.transferNumber} status was verified before submission.
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDiscrepancyError(null)}
                        style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Discrepancy Status Warning Alert Banner */}
            {discrepancyStatusWarning && (
                <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 16, color: '#d97706', marginTop: 1 }}>ℹ️</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13.5 }}>
                                Discrepancy Action Restriction Notice
                            </div>
                            <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 2 }}>
                                {discrepancyStatusWarning}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDiscrepancyStatusWarning("")}
                        style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Discrepancy Success Banner */}
            {discrepancySuccessMsg && (
                <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    padding: '12px 18px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BsCheckCircleFill color="#d97706" /> {discrepancySuccessMsg}
                    </span>
                    <button
                        type="button"
                        onClick={() => setDiscrepancySuccessMsg("")}
                        style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: 14 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Summary Error Alert (Non-blocking) */}
            {summaryError && (
                <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    color: '#92400e',
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>ℹ️ Summary analytics notice: {summaryError}. Showing direct store transfers list.</span>
                    <button
                        type="button"
                        onClick={() => fetchSummary(selectedStoreId)}
                        style={{
                            background: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Retry Summary
                    </button>
                </div>
            )}

            {/* Authoritative Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                <StatCard
                    label="Total Transfers"
                    value={loading && !summary ? "..." : `${totalTransfersVal} Transfers`}
                    sub={totalUnitsVal != null ? `${Number(totalUnitsVal).toLocaleString('en-IN')} units transferred` : (selectedStoreId === "all" ? "Company-wide transfers" : `Store #${selectedStoreId} volume`)}
                    color="#6366f1"
                />
                <StatCard
                    label="Pending Transfers"
                    value={loading && !summary ? "..." : `${pendingTransfersVal} Transfers`}
                    sub="Awaiting dispatch or check-in"
                    color="#f59e0b"
                />
                <StatCard
                    label="Received Transfers"
                    value={loading && !summary ? "..." : `${receivedTransfersVal} Transfers`}
                    sub="Successfully received"
                    color="#10b981"
                />
                <StatCard
                    label="Rejected Transfers"
                    value={loading && !summary ? "..." : `${rejectedTransfersVal} Transfers`}
                    sub="Declined or cancelled"
                    color="#ef4444"
                />
                {summary && (inTransitTransfersVal + approvedTransfersVal + dispatchedTransfersVal) > 0 && (
                    <StatCard
                        label="In Transit / Active"
                        value={`${inTransitTransfersVal + approvedTransfersVal + dispatchedTransfersVal} Transfers`}
                        sub={`In Transit: ${inTransitTransfersVal} • Dispatched: ${dispatchedTransfersVal} • Approved: ${approvedTransfersVal}`}
                        color="#8b5cf6"
                    />
                )}
            </div>

            {/* Store Transfer Analytics & Insights (from GET /api/v1/store-transfers/summary) */}
            {summary && (
                <div style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    padding: '16px 20px',
                    marginBottom: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: showAnalytics ? 16 : 0,
                            cursor: 'pointer'
                        }}
                        onClick={() => setShowAnalytics(!showAnalytics)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18, color: '#6366f1' }}>📊</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#111827' }}>
                                    Transfer Analytics & Insights
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                    Route volume, top products, and recent activity from GET /api/v1/store-transfers/summary
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            style={{
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#374151',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            {showAnalytics ? <>Collapse Insights <BsChevronUp size={12} /></> : <>Expand Insights <BsChevronDown size={12} /></>}
                        </button>
                    </div>

                    {showAnalytics && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                            gap: 16
                        }}>
                            {/* 1. Top Store Routes (Source & Destination) */}
                            <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                                    <BsShop style={{ color: '#6366f1' }} />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                                        Top Store Routes
                                    </span>
                                </div>

                                {/* Top Source Stores */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Top Source Stores
                                    </div>
                                    {Array.isArray(summary.top_source_stores) && summary.top_source_stores.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {summary.top_source_stores.map((st, i) => (
                                                <div key={st.store_id || i} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12.5
                                                }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{st.store_name}</span>
                                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 11.5 }}>
                                                        {st.transfer_count} transfers
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No source store data</div>
                                    )}
                                </div>

                                {/* Top Destination Stores */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Top Destination Stores
                                    </div>
                                    {Array.isArray(summary.top_destination_stores) && summary.top_destination_stores.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {summary.top_destination_stores.map((st, i) => (
                                                <div key={st.store_id || i} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    background: '#fff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12.5
                                                }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{st.store_name}</span>
                                                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 11.5 }}>
                                                        {st.transfer_count} transfers
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No destination store data</div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Top Transferred Products */}
                            <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                                    <BsBoxSeam style={{ color: '#0ea5e9' }} />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                                        Top Transferred Products
                                    </span>
                                </div>

                                {Array.isArray(summary.top_transferred_products) && summary.top_transferred_products.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {summary.top_transferred_products.map((p, i) => (
                                            <div key={p.product_id || i} style={{
                                                background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb',
                                                padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                            }}>
                                                <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {p.product_name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                                        {p.sku ? `SKU: ${p.sku}` : `ID: #${p.product_id}`}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0284c7' }}>
                                                        {Number(p.total_quantity || 0).toLocaleString('en-IN')}
                                                    </div>
                                                    <div style={{ fontSize: 10.5, color: '#64748b' }}>units</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                                        No product transfer metrics available
                                    </div>
                                )}
                            </div>

                            {/* 3. Recent Transfers Snapshot */}
                            <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                                    <BsClockHistory style={{ color: '#f59e0b' }} />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                                        Recent Activity Snapshot
                                    </span>
                                </div>

                                {Array.isArray(summary.recent_transfers) && summary.recent_transfers.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {summary.recent_transfers.slice(0, 5).map((rt, i) => {
                                            const stNorm = normalizeStatus(rt.status);
                                            let badgeBg = '#fef3c7';
                                            let badgeColor = '#b45309';
                                            if (stNorm === 'received') {
                                                badgeBg = '#dcfce7';
                                                badgeColor = '#15803d';
                                            } else if (stNorm === 'rejected') {
                                                badgeBg = '#fee2e2';
                                                badgeColor = '#b91c1c';
                                            }
                                            return (
                                                <div key={rt.id || i} style={{
                                                    background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb',
                                                    padding: '7px 10px', fontSize: 12
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                                        <span style={{ fontWeight: 700, color: '#4f46e5' }}>
                                                            {rt.transfer_number || `#${rt.id}`}
                                                        </span>
                                                        <span style={{ background: badgeBg, color: badgeColor, padding: '2px 6px', borderRadius: 8, fontSize: 10.5, fontWeight: 700 }}>
                                                            {rt.status || 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div style={{ color: '#475569', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span>{rt.source_store_name || 'Source'}</span>
                                                        <span>→</span>
                                                        <span style={{ fontWeight: 600, color: '#047857' }}>{rt.destination_store_name || 'Destination'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, fontSize: 10.5, color: '#94a3b8' }}>
                                                        <span>{rt.total_items} item{rt.total_items === 1 ? '' : 's'}</span>
                                                        <span>{formatDateTime(rt.created_at)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                                        No recent transfer snapshots found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Search, Store Selector & Status Filter Toolbar */}
            <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                        <BsSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search by transfer #, store, product, SKU, or approver..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 34px',
                                borderRadius: 8,
                                border: '1px solid #d1d5db',
                                fontSize: 13,
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Store Selector (Dynamic from stores list, no hardcoded store_id=1) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <BsShop size={14} /> Store:
                        </label>
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #d1d5db',
                                fontSize: 13,
                                color: '#111827',
                                background: '#fff',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: 160
                            }}
                        >
                            <option value="all">All Stores (Company-wide)</option>
                            {Array.isArray(stores) && stores.map((st) => (
                                <option key={st.id} value={String(st.id)}>
                                    {st.name || st.store_name || `Store #${st.id}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <BsFilter size={15} /> Status:
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #d1d5db',
                                fontSize: 13,
                                color: '#111827',
                                background: '#fff',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">All Status ({safeTransfers.length})</option>
                            <option value="Pending">Pending ({pendingTransfersVal})</option>
                            <option value="Approved">Approved ({approvedTransfersVal})</option>
                            <option value="Dispatched">Dispatched ({dispatchedTransfersVal})</option>
                            <option value="Received">Received ({receivedTransfersVal})</option>
                            <option value="Rejected">Rejected ({rejectedTransfersVal})</option>
                        </select>
                    </div>
                </div>

                <span style={{ fontSize: 12, color: '#6b7280' }}>
                    GET /api/v1/store-transfers?skip=0&limit=100
                </span>
            </div>

            {/* Store Transfers Table Container */}
            <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden'
            }}>
                <div
                    className="store-transfers-table-container custom-scrollbar"
                    style={{
                        overflowX: 'auto',
                        overflowY: 'auto',
                        maxHeight: '680px',
                        position: 'relative'
                    }}
                >
                    <table style={{
                        width: '100%',
                        minWidth: '1440px',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        textAlign: 'left',
                        fontSize: 13
                    }}>
                        <thead style={{
                            background: '#f9fafb',
                            color: '#4b5563',
                            fontWeight: 600
                        }}>
                            <tr>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 150, whiteSpace: 'nowrap' }}>Transfer Number</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 140 }}>Source Store</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 140 }}>Destination Store</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 200 }}>Product Details</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', textAlign: 'center', minWidth: 100, whiteSpace: 'nowrap' }}>Total Items</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', textAlign: 'right', minWidth: 110, whiteSpace: 'nowrap' }}>Quantity</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 130 }}>Status</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 150, whiteSpace: 'nowrap' }}>Created Date</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', minWidth: 140 }}>Approved By</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', textAlign: 'center', minWidth: 320, whiteSpace: 'nowrap' }}>Actions</th>
                            </tr>
                        </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        width: 24,
                                        height: 24,
                                        border: '3px solid #e5e7eb',
                                        borderTopColor: '#6366f1',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        marginBottom: 8
                                    }} />
                                    <div>Loading store transfers from backend...</div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '32px 16px', color: '#dc2626' }}>
                                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{error}</div>
                                    <button
                                        type="button"
                                        onClick={handleRefresh}
                                        style={{
                                            background: '#dc2626',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '6px 14px',
                                            borderRadius: 6,
                                            fontSize: 12.5,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Try Again
                                    </button>
                                </td>
                            </tr>
                        ) : paginatedTransfers.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280', fontSize: 14 }}>
                                    {searchTerm || statusFilter !== "all"
                                        ? "No store transfers found matching your filters."
                                        : "No store transfers found."}
                                </td>
                            </tr>
                        ) : (
                            paginatedTransfers.map((tr) => {
                                const trId = tr.id;
                                const trNum = tr.transfer_number || (trId ? `#${trId}` : '—');
                                const isSrcInactive = tr.source_store_id != null && inactiveStoreIds.has(Number(tr.source_store_id));
                                const srcStore = tr.source_store_name || (tr.source_store_id != null ? `Store #${tr.source_store_id}` : '—');
                                const dstStore = tr.destination_store_name || (tr.destination_store_id != null ? `Store #${tr.destination_store_id}` : '—');
                                const statusRaw = tr.status || 'Pending';
                                const statusNorm = normalizeStatus(statusRaw);

                                // Total items & quantity
                                const itemsArray = Array.isArray(tr.items) ? tr.items : [];
                                const totalItems = tr.total_items ?? (itemsArray.length > 0 ? itemsArray.length : 1);
                                const totalQuantity = tr.total_quantity ?? (
                                    itemsArray.length > 0
                                        ? itemsArray.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
                                        : 0
                                );

                                const createdDate = formatDateTime(tr.created_at);
                                const approvedBy = tr.approved_by_name || '—';
                                const isExpanded = expandedTransferIds.has(trId);

                                // Determine exact badge styling without altering status values
                                let badgeStyle = {
                                    padding: '3px 10px',
                                    borderRadius: 12,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    display: 'inline-block',
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a'
                                };

                                if (statusNorm === 'received') {
                                    badgeStyle = {
                                        padding: '3px 10px',
                                        borderRadius: 12,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-block',
                                        background: '#d1fae5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0'
                                    };
                                } else if (statusNorm === 'rejected') {
                                    badgeStyle = {
                                        padding: '3px 10px',
                                        borderRadius: 12,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-block',
                                        background: '#fee2e2',
                                        color: '#b91c1c',
                                        border: '1px solid #fecaca'
                                    };
                                } else if (statusNorm === 'approved') {
                                    badgeStyle = {
                                        padding: '3px 10px',
                                        borderRadius: 12,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-block',
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe'
                                    };
                                } else if (statusNorm === 'dispatched' || statusNorm === 'in-transit') {
                                    badgeStyle = {
                                        padding: '3px 10px',
                                        borderRadius: 12,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        display: 'inline-block',
                                        background: '#f3e8ff',
                                        color: '#7e22ce',
                                        border: '1px solid #e9d5ff'
                                    };
                                }

                                return (
                                    <React.Fragment key={trId || trNum}>
                                        <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', background: isExpanded ? '#fafafa' : '#fff' }}>
                                            {/* Transfer Number */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 700, color: '#6366f1' }}>{trNum}</div>
                                                {trId && <div style={{ fontSize: 11, color: '#9ca3af' }}>ID: #{trId}</div>}
                                            </td>

                                            {/* Source Store */}
                                            <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1f2937' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span>{srcStore}</span>
                                                    {isSrcInactive && (
                                                        <span
                                                            title="Source store is inactive or has been deleted"
                                                            style={{
                                                                padding: '1px 6px',
                                                                borderRadius: 4,
                                                                fontSize: 10.5,
                                                                fontWeight: 700,
                                                                background: '#fee2e2',
                                                                color: '#dc2626',
                                                                border: '1px solid #fecaca'
                                                            }}
                                                        >
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Destination Store */}
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#047857' }}>
                                                {dstStore}
                                            </td>

                                            {/* Product Details */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {itemsArray.length > 0 ? (
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                                            {itemsArray[0].product_name || `Product #${itemsArray[0].product_id}`}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#64748b' }}>
                                                            {itemsArray[0].sku ? `SKU: ${itemsArray[0].sku}` : ''}
                                                            {itemsArray.length > 1 && (
                                                                <span style={{ color: '#6366f1', marginLeft: 4, fontWeight: 500 }}>
                                                                    (+{itemsArray.length - 1} more item{itemsArray.length > 2 ? 's' : ''})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af' }}>—</span>
                                                )}
                                            </td>

                                            {/* Total Items */}
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                                                {totalItems}
                                            </td>

                                            {/* Quantity */}
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                {Number(totalQuantity).toLocaleString()}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={badgeStyle}>
                                                    {statusRaw}
                                                </span>
                                            </td>

                                            {/* Created Date */}
                                            <td style={{ padding: '12px 16px', color: '#4b5563', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                                                {createdDate}
                                            </td>

                                            {/* Approved By */}
                                            <td style={{ padding: '12px 16px', color: approvedBy !== '—' ? '#047857' : '#9ca3af', fontWeight: approvedBy !== '—' ? 600 : 400 }}>
                                                {approvedBy}
                                            </td>

                                            {/* Transfer Actions */}
                                            <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                                    {/* Approve button - only visible for Pending transfers */}
                                                    {normalizeStatus(statusRaw) === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestApprove(tr)}
                                                            disabled={isSrcInactive || approvingTransferId === trId || rejectingTransferId === trId || dispatchingTransferId === trId || receivingTransferId === trId}
                                                            title={isSrcInactive ? "Cannot approve this transfer because its source store is inactive or has been deleted." : "Approve this stock transfer"}
                                                            style={{
                                                                background: isSrcInactive ? '#f3f4f6' : '#ecfdf5',
                                                                color: isSrcInactive ? '#9ca3af' : '#059669',
                                                                border: isSrcInactive ? '1px solid #e5e7eb' : '1px solid #a7f3d0',
                                                                padding: '5px 9px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: (isSrcInactive || approvingTransferId === trId || rejectingTransferId === trId || dispatchingTransferId === trId || receivingTransferId === trId) ? 'not-allowed' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <BsCheckCircle size={13} /> {approvingTransferId === trId ? "..." : "Approve"}
                                                        </button>
                                                    )}
                                                    {/* Reject button - only visible for Pending transfers */}
                                                    {normalizeStatus(statusRaw) === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestReject(tr)}
                                                            disabled={rejectingTransferId === trId || approvingTransferId === trId || dispatchingTransferId === trId || receivingTransferId === trId}
                                                            title="Reject this stock transfer"
                                                            style={{
                                                                background: '#fef2f2',
                                                                color: '#dc2626',
                                                                border: '1px solid #fecaca',
                                                                padding: '5px 9px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: (rejectingTransferId === trId || approvingTransferId === trId || dispatchingTransferId === trId || receivingTransferId === trId) ? 'not-allowed' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <BsXCircle size={13} /> {rejectingTransferId === trId ? "..." : "Reject"}
                                                        </button>
                                                    )}
                                                    {/* Dispatch button - only visible for Approved transfers */}
                                                    {normalizeStatus(statusRaw) === 'approved' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestDispatch(tr)}
                                                            disabled={dispatchingTransferId === trId || approvingTransferId === trId || rejectingTransferId === trId || receivingTransferId === trId}
                                                            title="Dispatch this approved stock transfer"
                                                            style={{
                                                                background: '#eff6ff',
                                                                color: '#2563eb',
                                                                border: '1px solid #bfdbfe',
                                                                padding: '5px 9px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: (dispatchingTransferId === trId || approvingTransferId === trId || rejectingTransferId === trId || receivingTransferId === trId) ? 'not-allowed' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <BsTruck size={13} /> {dispatchingTransferId === trId ? "..." : "Dispatch"}
                                                        </button>
                                                    )}
                                                    {/* Receive button - only visible for Dispatched transfers */}
                                                    {normalizeStatus(statusRaw) === 'dispatched' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestReceive(tr)}
                                                            disabled={receivingTransferId === trId || dispatchingTransferId === trId || approvingTransferId === trId || rejectingTransferId === trId || receivingDiscrepancyTransferId === trId || verifyingDiscrepancyStatusId === trId}
                                                            title="Receive this dispatched stock transfer"
                                                            style={{
                                                                background: '#ecfdf5',
                                                                color: '#059669',
                                                                border: '1px solid #a7f3d0',
                                                                padding: '5px 9px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: (receivingTransferId === trId || dispatchingTransferId === trId || approvingTransferId === trId || rejectingTransferId === trId || receivingDiscrepancyTransferId === trId || verifyingDiscrepancyStatusId === trId) ? 'not-allowed' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <BsBoxSeam size={13} /> {receivingTransferId === trId ? "..." : "Receive"}
                                                        </button>
                                                    )}
                                                    {/* Receive With Discrepancy button */}
                                                    {normalizeStatus(statusRaw) === 'dispatched' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestReceiveWithDiscrepancy(tr)}
                                                            disabled={receivingDiscrepancyTransferId === trId || verifyingDiscrepancyStatusId === trId || receivingTransferId === trId || dispatchingTransferId === trId || approvingTransferId === trId || rejectingTransferId === trId}
                                                            title="Receive this dispatched transfer with discrepancy breakdown (good, damaged, missing)"
                                                            style={{
                                                                background: '#fffbeb',
                                                                color: '#b45309',
                                                                border: '1px solid #fde68a',
                                                                padding: '5px 9px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: (receivingDiscrepancyTransferId === trId || verifyingDiscrepancyStatusId === trId || receivingTransferId === trId || dispatchingTransferId === trId || approvingTransferId === trId || rejectingTransferId === trId) ? 'not-allowed' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <BsExclamationTriangle size={13} /> {verifyingDiscrepancyStatusId === trId ? "Verifying..." : receivingDiscrepancyTransferId === trId ? "..." : "Discrepancy"}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestReceiveWithDiscrepancy(tr)}
                                                            title={
                                                                normalizeStatus(statusRaw) === 'pending'
                                                                    ? `Receive with Discrepancy is disabled: transfer is pending approval and dispatch`
                                                                    : normalizeStatus(statusRaw) === 'approved'
                                                                    ? `Receive with Discrepancy is disabled: transfer must be dispatched first`
                                                                    : normalizeStatus(statusRaw) === 'received'
                                                                    ? `Transfer already received`
                                                                    : `Receive with Discrepancy is disabled for "${statusRaw}" transfers`
                                                            }
                                                            style={{
                                                                background: '#f9fafb',
                                                                color: '#9ca3af',
                                                                border: '1px solid #e5e7eb',
                                                                padding: '5px 9px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 500,
                                                                cursor: verifyingDiscrepancyStatusId === trId ? 'wait' : 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                opacity: 0.75
                                                            }}
                                                        >
                                                            <BsExclamationTriangle size={13} /> {verifyingDiscrepancyStatusId === trId ? "Verifying..." : "Discrepancy"}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetailsModal(trId)}
                                                        title="View full transfer details (GET API)"
                                                        style={{
                                                            background: '#eef2ff',
                                                            color: '#4f46e5',
                                                            border: '1px solid #c7d2fe',
                                                            padding: '5px 9px',
                                                            borderRadius: 6,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <BsEye size={13} /> View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpandRow(trId)}
                                                        title={isExpanded ? "Hide items breakdown" : "View items breakdown"}
                                                        style={{
                                                            background: isExpanded ? '#f1f5f9' : '#f9fafb',
                                                            color: '#475569',
                                                            border: '1px solid #e2e8f0',
                                                            padding: '5px 9px',
                                                            borderRadius: 6,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        {isExpanded ? (
                                                            <>Hide <BsChevronUp size={11} /></>
                                                        ) : (
                                                            <>Items <BsChevronDown size={11} /></>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expandable Items Breakdown Row */}
                                        {isExpanded && (
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                                                <td colSpan="10" style={{ padding: '14px 20px' }}>
                                                    <div style={{
                                                        background: '#fff',
                                                        borderRadius: 10,
                                                        border: '1px solid #e2e8f0',
                                                        padding: 14,
                                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
                                                    }}>
                                                        <div style={{
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            color: '#1e293b',
                                                            marginBottom: 10,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                            <span>
                                                                📦 Products in Transfer {trNum}
                                                            </span>
                                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                                                                {itemsArray.length} {itemsArray.length === 1 ? 'item' : 'items'} | Total: {Number(totalQuantity).toLocaleString()} units
                                                            </span>
                                                        </div>

                                                        {itemsArray.length > 0 ? (
                                                            <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                                                                <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', fontSize: 12.5 }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                                                                            <th style={{ padding: '8px 12px' }}>Product ID</th>
                                                                            <th style={{ padding: '8px 12px' }}>Product Name</th>
                                                                            <th style={{ padding: '8px 12px' }}>SKU</th>
                                                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Transfer Quantity</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {itemsArray.map((item, idx) => (
                                                                            <tr key={item.product_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                                <td style={{ padding: '8px 12px', color: '#6366f1', fontWeight: 600 }}>
                                                                                    #{item.product_id}
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0f172a' }}>
                                                                                    {item.product_name || '—'}
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                                                                    {item.sku || '—'}
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                                                    {Number(item.quantity).toLocaleString()}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#64748b', fontSize: 12 }}>
                                                                No individual item details returned for this transfer.
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Pagination Toolbar */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 16,
                    padding: '8px 4px'
                }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                        Showing {Math.min(filteredTransfers.length, (page - 1) * pageSize + 1)} to {Math.min(filteredTransfers.length, page * pageSize)} of {filteredTransfers.length} records
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            style={{
                                background: page <= 1 ? '#f3f4f6' : '#fff',
                                color: page <= 1 ? '#9ca3af' : '#374151',
                                border: '1px solid #d1d5db',
                                padding: '6px 12px',
                                borderRadius: 6,
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: page <= 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Previous
                        </button>

                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                            Page {page} of {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            style={{
                                background: page >= totalPages ? '#f3f4f6' : '#fff',
                                color: page >= totalPages ? '#9ca3af' : '#374151',
                                border: '1px solid #d1d5db',
                                padding: '6px 12px',
                                borderRadius: 6,
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* CREATE STOCK TRANSFER MODAL */}
            <TransferStockModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
                initialSourceStoreId={selectedStoreId !== "all" ? selectedStoreId : null}
            />

            {/* VIEW STORE TRANSFER DETAILS MODAL (GET /api/v1/store-transfers/{transfer_id}) */}
            {detailsModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: 16
                    }}
                    onClick={handleCloseDetailsModal}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 720,
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 22px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f9fafb'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: '#e0e7ff',
                                    color: '#4f46e5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsArrowLeftRight size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        Transfer Details {detailsData?.transfer_number ? `— ${detailsData.transfer_number}` : (selectedDetailsTransferId ? `— #${selectedDetailsTransferId}` : '')}
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                        Full record from GET /api/v1/store-transfers/{selectedDetailsTransferId}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseDetailsModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: 18,
                                    padding: '4px 8px',
                                    borderRadius: 6
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="modal-scrollable-body custom-scrollbar" style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
                            {detailsLoading ? (
                                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
                                    <div style={{
                                        display: 'inline-block',
                                        width: 28,
                                        height: 28,
                                        border: '3px solid #e5e7eb',
                                        borderTopColor: '#6366f1',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        marginBottom: 12
                                    }} />
                                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                                        Loading store transfer #{selectedDetailsTransferId} details from backend...
                                    </div>
                                </div>
                            ) : detailsError ? (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: 10,
                                    padding: '16px 20px',
                                    color: '#991b1b',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                                        ⚠ {detailsError}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDetailsModal(selectedDetailsTransferId)}
                                        style={{
                                            background: '#dc2626',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '6px 16px',
                                            borderRadius: 6,
                                            fontSize: 12.5,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : detailsData ? (
                                <div>
                                    {/* Source Store Inactive Notice */}
                                    {detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id)) && (
                                        <div style={{
                                            background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            borderRadius: 8,
                                            padding: '10px 14px',
                                            marginBottom: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            color: '#991b1b',
                                            fontSize: 13,
                                            fontWeight: 600
                                        }}>
                                            <BsExclamationTriangle size={16} style={{ flexShrink: 0 }} />
                                            <span>Cannot approve this transfer because its source store is inactive or has been deleted.</span>
                                        </div>
                                    )}

                                    {/* Key Details Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: 14,
                                        background: '#f8fafc',
                                        borderRadius: 10,
                                        border: '1px solid #e2e8f0',
                                        padding: '14px 16px',
                                        marginBottom: 20
                                    }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Transfer Number</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>{detailsData.transfer_number || `#${detailsData.id}`}</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                marginTop: 2,
                                                background: normalizeStatus(detailsData.status) === 'received' ? '#dcfce7' : normalizeStatus(detailsData.status) === 'rejected' ? '#fee2e2' : '#fef3c7',
                                                color: normalizeStatus(detailsData.status) === 'received' ? '#15803d' : normalizeStatus(detailsData.status) === 'rejected' ? '#b91c1c' : '#b45309'
                                            }}>
                                                {detailsData.status || 'Pending'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Source Store</span>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                                    {detailsData.source_store_name || (detailsData.source_store_id != null ? `Store #${detailsData.source_store_id}` : '—')}
                                                </span>
                                                {detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id)) && (
                                                    <span style={{
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        fontSize: 10.5,
                                                        fontWeight: 700,
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fecaca'
                                                    }}>
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Destination Store</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#047857' }}>
                                                {detailsData.destination_store_name || (detailsData.destination_store_id != null ? `Store #${detailsData.destination_store_id}` : '—')}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Created Date</span>
                                            <span style={{ fontSize: 12.5, color: '#334155' }}>{formatDateTime(detailsData.created_at)}</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Approved By</span>
                                            <span style={{ fontSize: 12.5, fontWeight: detailsData.approved_by_name ? 600 : 400, color: detailsData.approved_by_name ? '#047857' : '#94a3b8' }}>
                                                {detailsData.approved_by_name || 'Not Approved Yet'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Items</span>
                                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                                                {detailsData.total_items ?? (Array.isArray(detailsData.items) ? detailsData.items.length : 0)} items
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Quantity</span>
                                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0284c7' }}>
                                                {Number(detailsData.total_quantity ?? (Array.isArray(detailsData.items) ? detailsData.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) : 0)).toLocaleString()} units
                                            </span>
                                        </div>

                                        {/* Discrepancy Overview Banner inside Key Details Grid */}
                                        {(detailsData.has_discrepancy || detailsData.total_damaged_quantity > 0 || detailsData.total_missing_quantity > 0 || detailsData.discrepancy_notes) && (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                background: '#fffbeb',
                                                border: '1px solid #fde68a',
                                                borderRadius: 8,
                                                padding: '12px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontWeight: 700, fontSize: 13.5 }}>
                                                        <BsExclamationTriangle size={16} color="#d97706" />
                                                        <span>Discrepancy Details (Recorded on Receipt)</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5 }}>
                                                        <span>Dispatched: <strong>{Number(detailsData.total_dispatched_quantity ?? detailsData.total_quantity ?? 0).toLocaleString()}</strong></span>
                                                        <span>Good Received: <strong style={{ color: '#047857' }}>{Number(detailsData.total_received_quantity ?? 0).toLocaleString()}</strong></span>
                                                        <span>Damaged: <strong style={{ color: '#dc2626' }}>{Number(detailsData.total_damaged_quantity ?? 0).toLocaleString()}</strong></span>
                                                        <span>Missing: <strong style={{ color: '#d97706' }}>{Number(detailsData.total_missing_quantity ?? 0).toLocaleString()}</strong></span>
                                                    </div>
                                                </div>
                                                {detailsData.discrepancy_notes && (
                                                    <div style={{ fontSize: 12.5, color: '#b45309', borderTop: '1px dashed #fde68a', paddingTop: 6 }}>
                                                        <strong>Discrepancy Notes:</strong> {detailsData.discrepancy_notes}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Products Table */}
                                    <div className="custom-scrollbar" style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '10px 14px',
                                            borderBottom: '1px solid #e2e8f0',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#1e293b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            minWidth: '650px'
                                        }}>
                                            <span>📦 Transferred Products</span>
                                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                                                {Array.isArray(detailsData.items) ? detailsData.items.length : 0} item line{(Array.isArray(detailsData.items) && detailsData.items.length === 1) ? '' : 's'}
                                            </span>
                                        </div>
                                        <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                                    <th style={{ padding: '8px 12px' }}>Product ID</th>
                                                    <th style={{ padding: '8px 12px' }}>Product Name</th>
                                                    <th style={{ padding: '8px 12px' }}>SKU</th>
                                                    {(detailsData.has_discrepancy || detailsData.items?.some(it => it.damaged_quantity > 0 || it.missing_quantity > 0)) ? (
                                                        <>
                                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Dispatched</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#047857' }}>Received</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>Damaged</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#d97706' }}>Missing</th>
                                                            <th style={{ padding: '8px 12px' }}>Remarks</th>
                                                        </>
                                                    ) : (
                                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Quantity</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.isArray(detailsData.items) && detailsData.items.length > 0 ? (
                                                    detailsData.items.map((item, idx) => (
                                                        <tr key={item.product_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#6366f1' }}>
                                                                #{item.product_id}
                                                            </td>
                                                            <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0f172a' }}>
                                                                {item.product_name || '—'}
                                                            </td>
                                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                                                {item.sku || '—'}
                                                            </td>
                                                            {(detailsData.has_discrepancy || detailsData.items?.some(it => it.damaged_quantity > 0 || it.missing_quantity > 0)) ? (
                                                                <>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                                                                        {Number(item.dispatched_quantity ?? item.quantity ?? 0).toLocaleString()}
                                                                    </td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                                                                        {Number(item.received_quantity ?? item.quantity ?? 0).toLocaleString()}
                                                                    </td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.damaged_quantity > 0 ? '#dc2626' : '#9ca3af' }}>
                                                                        {Number(item.damaged_quantity ?? 0).toLocaleString()}
                                                                    </td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.missing_quantity > 0 ? '#d97706' : '#9ca3af' }}>
                                                                        {Number(item.missing_quantity ?? 0).toLocaleString()}
                                                                    </td>
                                                                    <td style={{ padding: '8px 12px', color: item.remarks ? '#1f2937' : '#9ca3af', fontStyle: item.remarks ? 'normal' : 'italic' }}>
                                                                        {item.remarks || '—'}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                                    {Number(item.quantity).toLocaleString()}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="8" style={{ textAlign: 'center', padding: '18px 12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            No product items found in this transfer record.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '12px 22px',
                            background: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                {detailsData && normalizeStatus(detailsData.status) === 'pending' && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={
                                                (detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id))) ||
                                                approvingTransferId === detailsData.id ||
                                                rejectingTransferId === detailsData.id
                                            }
                                            onClick={() => handleRequestApprove(detailsData)}
                                            title={
                                                detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id))
                                                    ? "Cannot approve this transfer because its source store is inactive or has been deleted."
                                                    : "Approve this stock transfer"
                                            }
                                            style={{
                                                background: detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id)) ? '#9ca3af' : '#059669',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '7px 18px',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: (
                                                    (detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id))) ||
                                                    approvingTransferId === detailsData.id ||
                                                    rejectingTransferId === detailsData.id
                                                ) ? 'not-allowed' : 'pointer',
                                                opacity: (
                                                    (detailsData.source_store_id != null && inactiveStoreIds.has(Number(detailsData.source_store_id))) ||
                                                    approvingTransferId === detailsData.id
                                                ) ? 0.7 : 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <BsCheckCircleFill size={13} />
                                            {approvingTransferId === detailsData.id ? 'Approving...' : 'Approve Transfer'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={rejectingTransferId === detailsData.id || approvingTransferId === detailsData.id}
                                            onClick={() => handleRequestReject(detailsData)}
                                            style={{
                                                background: '#dc2626',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '7px 18px',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: (rejectingTransferId === detailsData.id || approvingTransferId === detailsData.id) ? 'not-allowed' : 'pointer',
                                                opacity: rejectingTransferId === detailsData.id ? 0.7 : 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <BsXCircleFill size={13} />
                                            {rejectingTransferId === detailsData.id ? 'Rejecting...' : 'Reject Transfer'}
                                        </button>
                                    </>
                                )}
                                {detailsData && normalizeStatus(detailsData.status) === 'approved' && (
                                    <button
                                        type="button"
                                        disabled={dispatchingTransferId === detailsData.id}
                                        onClick={() => handleRequestDispatch(detailsData)}
                                        style={{
                                            background: '#2563eb',
                                            border: 'none',
                                            color: '#fff',
                                            padding: '7px 18px',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: dispatchingTransferId === detailsData.id ? 'not-allowed' : 'pointer',
                                            opacity: dispatchingTransferId === detailsData.id ? 0.7 : 1,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <BsTruck size={14} />
                                        {dispatchingTransferId === detailsData.id ? 'Dispatching...' : 'Dispatch Transfer'}
                                    </button>
                                )}
                                {detailsData && normalizeStatus(detailsData.status) === 'dispatched' && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={receivingTransferId === detailsData.id || receivingDiscrepancyTransferId === detailsData.id || verifyingDiscrepancyStatusId === detailsData.id}
                                            onClick={() => handleRequestReceive(detailsData)}
                                            style={{
                                                background: '#059669',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '7px 18px',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: (receivingTransferId === detailsData.id || receivingDiscrepancyTransferId === detailsData.id || verifyingDiscrepancyStatusId === detailsData.id) ? 'not-allowed' : 'pointer',
                                                opacity: receivingTransferId === detailsData.id ? 0.7 : 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <BsBoxSeam size={14} />
                                            {receivingTransferId === detailsData.id ? 'Receiving...' : 'Receive Transfer'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={receivingDiscrepancyTransferId === detailsData.id || verifyingDiscrepancyStatusId === detailsData.id || receivingTransferId === detailsData.id}
                                            onClick={() => handleRequestReceiveWithDiscrepancy(detailsData)}
                                            style={{
                                                background: '#d97706',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '7px 18px',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: (receivingDiscrepancyTransferId === detailsData.id || verifyingDiscrepancyStatusId === detailsData.id || receivingTransferId === detailsData.id) ? 'not-allowed' : 'pointer',
                                                opacity: (receivingDiscrepancyTransferId === detailsData.id || verifyingDiscrepancyStatusId === detailsData.id) ? 0.7 : 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6
                                            }}
                                        >
                                            <BsExclamationTriangle size={14} />
                                            {verifyingDiscrepancyStatusId === detailsData.id ? 'Verifying...' : receivingDiscrepancyTransferId === detailsData.id ? 'Receiving...' : 'Receive with Discrepancy'}
                                        </button>
                                    </>
                                )}
                                {detailsData && !['dispatched', 'pending', 'approved'].includes(normalizeStatus(detailsData.status)) && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '5px 12px',
                                        borderRadius: 6,
                                        background: detailsData.has_discrepancy ? '#fffbeb' : '#f8fafc',
                                        border: `1px solid ${detailsData.has_discrepancy ? '#fde68a' : '#e2e8f0'}`,
                                        fontSize: 12,
                                        color: detailsData.has_discrepancy ? '#b45309' : '#64748b'
                                    }}>
                                        <BsExclamationTriangle size={13} color={detailsData.has_discrepancy ? '#d97706' : '#94a3b8'} />
                                        <span>
                                            {detailsData.has_discrepancy
                                                ? "Transfer received with discrepancy recorded"
                                                : `Receive actions disabled: Transfer status is "${detailsData.status || 'Received'}"`}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseDetailsModal}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    padding: '7px 18px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Confirmation Modal */}
            {confirmApproveTransfer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        width: '100%',
                        maxWidth: 480,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f9fafb',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    background: '#d1fae5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsCheckCircleFill size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                    Confirm Transfer Approval
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={approvingTransferId === confirmApproveTransfer.id}
                                onClick={() => setConfirmApproveTransfer(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <BsX size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-scrollable-body custom-scrollbar" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            <p style={{ margin: '0 0 14px', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                                Are you sure you want to approve this stock transfer?
                            </p>
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 13,
                                color: '#475569',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                rowGap: 8,
                                columnGap: 12
                            }}>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Transfer #:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                    {confirmApproveTransfer.transfer_number || `#${confirmApproveTransfer.id}`}
                                </span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Source:</span>
                                <span>{confirmApproveTransfer.source_store_name || confirmApproveTransfer.source_store || `Store #${confirmApproveTransfer.source_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Destination:</span>
                                <span>{confirmApproveTransfer.destination_store_name || confirmApproveTransfer.destination_store || `Store #${confirmApproveTransfer.destination_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Items:</span>
                                <span>{confirmApproveTransfer.total_items ?? (confirmApproveTransfer.items?.length ?? 1)} item(s) (Qty: {confirmApproveTransfer.total_quantity ?? '—'})</span>
                            </div>
                            <p style={{ margin: '14px 0 0', fontSize: 12, color: '#6b7280' }}>
                                This action will validate source stock availability and transition this transfer to Approved.
                            </p>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            background: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                disabled={approvingTransferId === confirmApproveTransfer.id}
                                onClick={() => setConfirmApproveTransfer(null)}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    padding: '7px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={approvingTransferId === confirmApproveTransfer.id}
                                onClick={() => handleConfirmApprove(confirmApproveTransfer.id)}
                                style={{
                                    background: '#059669',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '7px 18px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: approvingTransferId === confirmApproveTransfer.id ? 'not-allowed' : 'pointer',
                                    opacity: approvingTransferId === confirmApproveTransfer.id ? 0.7 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsCheckCircleFill size={13} />
                                {approvingTransferId === confirmApproveTransfer.id ? 'Approving...' : 'Confirm & Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Confirmation Modal */}
            {confirmRejectTransfer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        width: '100%',
                        maxWidth: 480,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#fef2f2',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsXCircleFill size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                                    Confirm Transfer Rejection
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={rejectingTransferId === confirmRejectTransfer.id}
                                onClick={() => {
                                    setConfirmRejectTransfer(null);
                                    setRejectionReason("");
                                    setRejectReasonError("");
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <BsX size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-scrollable-body custom-scrollbar" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            <p style={{ margin: '0 0 14px', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                                Are you sure you want to reject this stock transfer? This action will transition the transfer to Rejected.
                            </p>
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 13,
                                color: '#475569',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                rowGap: 8,
                                columnGap: 12,
                                marginBottom: 16
                            }}>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Transfer #:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                    {confirmRejectTransfer.transfer_number || `#${confirmRejectTransfer.id}`}
                                </span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Source:</span>
                                <span>{confirmRejectTransfer.source_store_name || confirmRejectTransfer.source_store || `Store #${confirmRejectTransfer.source_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Destination:</span>
                                <span>{confirmRejectTransfer.destination_store_name || confirmRejectTransfer.destination_store || `Store #${confirmRejectTransfer.destination_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Items:</span>
                                <span>{confirmRejectTransfer.total_items ?? (confirmRejectTransfer.items?.length ?? 1)} item(s) (Qty: {confirmRejectTransfer.total_quantity ?? '—'})</span>
                            </div>

                            {/* Rejection Reason Input */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                        Rejection Reason <span style={{ fontWeight: 400, color: '#6b7280' }}>(Optional)</span>
                                    </label>
                                    <span style={{ fontSize: 11.5, color: rejectionReason.length > 500 ? '#dc2626' : '#6b7280' }}>
                                        {rejectionReason.length} / 500
                                    </span>
                                </div>
                                <textarea
                                    value={rejectionReason}
                                    maxLength={500}
                                    disabled={rejectingTransferId === confirmRejectTransfer.id}
                                    onChange={(e) => {
                                        setRejectionReason(e.target.value);
                                        if (e.target.value.length <= 500) {
                                            setRejectReasonError("");
                                        }
                                    }}
                                    placeholder="e.g. The source store does not have sufficient available stock to fulfill the requested transfer quantity."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: rejectReasonError ? '1px solid #ef4444' : '1px solid #d1d5db',
                                        fontSize: 13,
                                        color: '#1f2937',
                                        resize: 'vertical',
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                {rejectReasonError && (
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>
                                        {rejectReasonError}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            background: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                disabled={rejectingTransferId === confirmRejectTransfer.id}
                                onClick={() => {
                                    setConfirmRejectTransfer(null);
                                    setRejectionReason("");
                                    setRejectReasonError("");
                                }}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    padding: '7px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={rejectingTransferId === confirmRejectTransfer.id}
                                onClick={handleConfirmReject}
                                style={{
                                    background: '#dc2626',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '7px 18px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: rejectingTransferId === confirmRejectTransfer.id ? 'not-allowed' : 'pointer',
                                    opacity: rejectingTransferId === confirmRejectTransfer.id ? 0.7 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsXCircleFill size={13} />
                                {rejectingTransferId === confirmRejectTransfer.id ? 'Rejecting...' : 'Confirm & Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dispatch Confirmation Modal */}
            {confirmDispatchTransfer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        width: '100%',
                        maxWidth: 480,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#eff6ff',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    background: '#dbeafe',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsTruck size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e40af' }}>
                                    Confirm Transfer Dispatch
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={dispatchingTransferId === confirmDispatchTransfer.id}
                                onClick={() => setConfirmDispatchTransfer(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <BsX size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-scrollable-body custom-scrollbar" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            <p style={{ margin: '0 0 14px', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                                Are you sure you want to dispatch this approved stock transfer? This will transition the transfer to Dispatched and mark inventory in transit.
                            </p>
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 13,
                                color: '#475569',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                rowGap: 8,
                                columnGap: 12
                            }}>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Transfer #:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                    {confirmDispatchTransfer.transfer_number || `#${confirmDispatchTransfer.id}`}
                                </span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Current Status:</span>
                                <span>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: '#d1fae5',
                                        color: '#065f46'
                                    }}>
                                        {confirmDispatchTransfer.status || 'Approved'}
                                    </span>
                                </span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Source:</span>
                                <span>{confirmDispatchTransfer.source_store_name || confirmDispatchTransfer.source_store || `Store #${confirmDispatchTransfer.source_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Destination:</span>
                                <span>{confirmDispatchTransfer.destination_store_name || confirmDispatchTransfer.destination_store || `Store #${confirmDispatchTransfer.destination_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Items:</span>
                                <span>{confirmDispatchTransfer.total_items ?? (confirmDispatchTransfer.items?.length ?? 1)} item(s) (Qty: {confirmDispatchTransfer.total_quantity ?? '—'})</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            background: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                disabled={dispatchingTransferId === confirmDispatchTransfer.id}
                                onClick={() => setConfirmDispatchTransfer(null)}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    padding: '7px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={dispatchingTransferId === confirmDispatchTransfer.id}
                                onClick={handleConfirmDispatch}
                                style={{
                                    background: '#2563eb',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '7px 18px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: dispatchingTransferId === confirmDispatchTransfer.id ? 'not-allowed' : 'pointer',
                                    opacity: dispatchingTransferId === confirmDispatchTransfer.id ? 0.7 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsTruck size={14} />
                                {dispatchingTransferId === confirmDispatchTransfer.id ? 'Dispatching...' : 'Confirm & Dispatch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receive Confirmation Modal */}
            {confirmReceiveTransfer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        width: '100%',
                        maxWidth: 520,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ecfdf5',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    background: '#d1fae5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsBoxSeam size={17} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#065f46' }}>
                                    Confirm Transfer Receipt
                                </h3>
                            </div>
                            <button
                                type="button"
                                disabled={receivingTransferId === confirmReceiveTransfer.id}
                                onClick={() => setConfirmReceiveTransfer(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <BsX size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-scrollable-body custom-scrollbar" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            <p style={{ margin: '0 0 14px', fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                                Are you sure you want to receive this dispatched stock transfer? This will transition the transfer to Received and update inventory at the destination store.
                            </p>
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 13,
                                color: '#475569',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                rowGap: 8,
                                columnGap: 12
                            }}>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Transfer #:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                    {confirmReceiveTransfer.transfer_number || `#${confirmReceiveTransfer.id}`}
                                </span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Current Status:</span>
                                <span>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: '#dbeafe',
                                        color: '#1e40af'
                                    }}>
                                        {confirmReceiveTransfer.status || 'Dispatched'}
                                    </span>
                                </span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Source:</span>
                                <span>{confirmReceiveTransfer.source_store_name || confirmReceiveTransfer.source_store || `Store #${confirmReceiveTransfer.source_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Destination:</span>
                                <span>{confirmReceiveTransfer.destination_store_name || confirmReceiveTransfer.destination_store || `Store #${confirmReceiveTransfer.destination_store_id || 'N/A'}`}</span>

                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Items & Units:</span>
                                <span>{confirmReceiveTransfer.total_items ?? (confirmReceiveTransfer.items?.length ?? 1)} item(s) | Total: {Number(confirmReceiveTransfer.total_quantity ?? 0).toLocaleString()} units</span>
                            </div>

                            {/* Transferred Products Breakdown */}
                            <div style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                                    Products in this transfer:
                                </div>
                                <div style={{
                                    maxHeight: 160,
                                    overflowY: 'auto',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    background: '#fafafa'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                                        <thead>
                                            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                                                <th style={{ padding: '6px 10px', color: '#4b5563', fontWeight: 600 }}>Product</th>
                                                <th style={{ padding: '6px 10px', color: '#4b5563', fontWeight: 600 }}>SKU</th>
                                                <th style={{ padding: '6px 10px', color: '#4b5563', fontWeight: 600, textAlign: 'right' }}>Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(confirmReceiveTransfer.items) && confirmReceiveTransfer.items.length > 0 ? (
                                                confirmReceiveTransfer.items.map((it, idx) => (
                                                    <tr key={idx} style={{ borderBottom: idx < confirmReceiveTransfer.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                                        <td style={{ padding: '6px 10px', color: '#111827', fontWeight: 500 }}>
                                                            {it.product_name || `Product #${it.product_id}`}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', color: '#6b7280', fontFamily: 'monospace' }}>
                                                            {it.sku || '—'}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', color: '#047857', fontWeight: 700, textAlign: 'right' }}>
                                                            {Number(it.quantity || 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" style={{ padding: '8px 10px', color: '#6b7280', textAlign: 'center' }}>
                                                        {confirmReceiveTransfer.total_quantity != null ? `${Number(confirmReceiveTransfer.total_quantity).toLocaleString()} units` : '1 unit'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            background: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                disabled={receivingTransferId === confirmReceiveTransfer.id}
                                onClick={() => setConfirmReceiveTransfer(null)}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    padding: '7px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={receivingTransferId === confirmReceiveTransfer.id}
                                onClick={handleConfirmReceive}
                                style={{
                                    background: '#059669',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '7px 18px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: receivingTransferId === confirmReceiveTransfer.id ? 'not-allowed' : 'pointer',
                                    opacity: receivingTransferId === confirmReceiveTransfer.id ? 0.7 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsBoxSeam size={14} />
                                {receivingTransferId === confirmReceiveTransfer.id ? 'Receiving...' : 'Confirm & Receive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receive With Discrepancy Modal */}
            {discrepancyModalOpen && discrepancyTransfer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        width: '100%',
                        maxWidth: 820,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.15s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 22px',
                            borderBottom: '1px solid #fde68a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#fffbeb'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: '#fef3c7',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <BsExclamationTriangle size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                                        Receive Transfer With Discrepancy
                                    </h3>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b45309' }}>
                                        POST /api/v1/store-transfers/{discrepancyTransfer.id}/receive-with-discrepancy
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                onClick={() => {
                                    setDiscrepancyModalOpen(false);
                                    setDiscrepancyTransfer(null);
                                    setDiscrepancyError(null);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Subheader / Status Bar */}
                        <div style={{
                            padding: '10px 22px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 12.5,
                            gap: 12
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span><strong>Transfer:</strong> <span style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{discrepancyTransfer.transfer_number || `#${discrepancyTransfer.id}`}</span></span>
                                <span><strong>From:</strong> {discrepancyTransfer.source_store_name || `Store #${discrepancyTransfer.source_store_id || 'N/A'}`}</span>
                                <span><strong>To:</strong> {discrepancyTransfer.destination_store_name || `Store #${discrepancyTransfer.destination_store_id || 'N/A'}`}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    ✓ Status: Dispatched (Verified)
                                </span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="modal-scrollable-body custom-scrollbar" style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
                            {/* Guidelines */}
                            <div style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: 12.5,
                                color: '#1e40af',
                                marginBottom: 16,
                                lineHeight: 1.45
                            }}>
                                <strong>Instructions:</strong> Specify the actual quantity received in good sellable condition, damaged items, and missing items for each product line. The total <strong>(Received + Damaged + Missing)</strong> must match the <strong>Dispatched Quantity</strong> for each product.
                            </div>

                            {/* Items Discrepancy Table */}
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                                <div style={{
                                    padding: '8px 12px',
                                    background: '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#374151',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <span>Transfer Item Breakdown ({discrepancyItems.length} product{discrepancyItems.length === 1 ? '' : 's'})</span>
                                    <span style={{ fontSize: 11.5, fontWeight: 500, color: '#6b7280' }}>All quantities must be non-negative integers</span>
                                </div>

                                <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', fontSize: 12.5 }}>
                                        <thead>
                                            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', color: '#4b5563', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 10px', minWidth: 160 }}>Product</th>
                                                <th style={{ padding: '8px 8px', width: 85, textAlign: 'center' }}>Dispatched</th>
                                                <th style={{ padding: '8px 8px', width: 95, textAlign: 'center' }}>Received (Good)</th>
                                                <th style={{ padding: '8px 8px', width: 95, textAlign: 'center' }}>Damaged</th>
                                                <th style={{ padding: '8px 8px', width: 95, textAlign: 'center' }}>Missing</th>
                                                <th style={{ padding: '8px 8px', width: 80, textAlign: 'center' }}>Accounted</th>
                                                <th style={{ padding: '8px 10px', minWidth: 180 }}>Item Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {discrepancyItems.map((it, idx) => {
                                                const rec = Number(it.received_quantity || 0);
                                                const dmg = Number(it.damaged_quantity || 0);
                                                const mis = Number(it.missing_quantity || 0);
                                                const disp = Number(it.dispatched_quantity || 0);
                                                const accounted = rec + dmg + mis;
                                                const isBalanced = accounted === disp;

                                                return (
                                                    <tr key={it.product_id || idx} style={{
                                                        borderBottom: idx < discrepancyItems.length - 1 ? '1px solid #e5e7eb' : 'none',
                                                        background: !isBalanced ? '#fef2f2' : (dmg > 0 || mis > 0 ? '#fffbeb' : '#fff')
                                                    }}>
                                                        {/* Product Info */}
                                                        <td style={{ padding: '8px 10px' }}>
                                                            <div style={{ fontWeight: 600, color: '#111827' }}>
                                                                {it.product_name || `Product #${it.product_id}`}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                                ID: #{it.product_id} {it.sku && it.sku !== '—' ? `| SKU: ${it.sku}` : ''}
                                                            </div>
                                                        </td>

                                                        {/* Dispatched */}
                                                        <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: 6,
                                                                background: '#f1f5f9',
                                                                color: '#334155'
                                                            }}>
                                                                {disp}
                                                            </span>
                                                        </td>

                                                        {/* Received */}
                                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={disp}
                                                                value={it.received_quantity}
                                                                onChange={(e) => handleUpdateDiscrepancyItem(idx, 'received_quantity', e.target.value)}
                                                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                                                style={{
                                                                    width: '100%',
                                                                    maxWidth: 80,
                                                                    padding: '4px 6px',
                                                                    border: '1px solid #10b981',
                                                                    borderRadius: 6,
                                                                    fontSize: 12.5,
                                                                    fontWeight: 600,
                                                                    textAlign: 'center',
                                                                    color: '#065f46',
                                                                    background: '#f0fdf4'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Damaged */}
                                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={disp}
                                                                value={it.damaged_quantity}
                                                                onChange={(e) => handleUpdateDiscrepancyItem(idx, 'damaged_quantity', e.target.value)}
                                                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                                                style={{
                                                                    width: '100%',
                                                                    maxWidth: 80,
                                                                    padding: '4px 6px',
                                                                    border: dmg > 0 ? '1px solid #ef4444' : '1px solid #d1d5db',
                                                                    borderRadius: 6,
                                                                    fontSize: 12.5,
                                                                    fontWeight: 600,
                                                                    textAlign: 'center',
                                                                    color: dmg > 0 ? '#b91c1c' : '#374151',
                                                                    background: dmg > 0 ? '#fef2f2' : '#fff'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Missing */}
                                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={disp}
                                                                value={it.missing_quantity}
                                                                onChange={(e) => handleUpdateDiscrepancyItem(idx, 'missing_quantity', e.target.value)}
                                                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                                                style={{
                                                                    width: '100%',
                                                                    maxWidth: 80,
                                                                    padding: '4px 6px',
                                                                    border: mis > 0 ? '1px solid #f59e0b' : '1px solid #d1d5db',
                                                                    borderRadius: 6,
                                                                    fontSize: 12.5,
                                                                    fontWeight: 600,
                                                                    textAlign: 'center',
                                                                    color: mis > 0 ? '#b45309' : '#374151',
                                                                    background: mis > 0 ? '#fffbeb' : '#fff'
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Accounted Match */}
                                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 6px',
                                                                borderRadius: 10,
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                background: isBalanced ? '#d1fae5' : '#fee2e2',
                                                                color: isBalanced ? '#065f46' : '#991b1b',
                                                                border: `1px solid ${isBalanced ? '#a7f3d0' : '#fecaca'}`
                                                            }}>
                                                                {accounted}/{disp}
                                                            </span>
                                                        </td>

                                                        {/* Remarks */}
                                                        <td style={{ padding: '8px 10px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Remarks for this item"
                                                                value={it.remarks}
                                                                maxLength={255}
                                                                onChange={(e) => handleRemarksChange(idx, e.target.value)}
                                                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '4px 8px',
                                                                    border: '1px solid #d1d5db',
                                                                    borderRadius: 6,
                                                                    fontSize: 12,
                                                                    color: '#374151'
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Overall Notes */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                                    Overall Discrepancy Notes / Remarks (Optional, max 500 chars)
                                </label>
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    value={discrepancyNotes}
                                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                                    placeholder="e.g. Received with discrepancy: goods verified on arrival"
                                    disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        fontSize: 12.5,
                                        color: '#1f2937',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Summary Totals Bar */}
                            {(() => {
                                const totalDisp = discrepancyItems.reduce((acc, it) => acc + (Number(it.dispatched_quantity) || 0), 0);
                                const totalRec = discrepancyItems.reduce((acc, it) => acc + (Number(it.received_quantity) || 0), 0);
                                const totalDmg = discrepancyItems.reduce((acc, it) => acc + (Number(it.damaged_quantity) || 0), 0);
                                const totalMis = discrepancyItems.reduce((acc, it) => acc + (Number(it.missing_quantity) || 0), 0);
                                const totalAccounted = totalRec + totalDmg + totalMis;
                                const isAllBalanced = totalAccounted === totalDisp && discrepancyItems.every(it => ((Number(it.received_quantity) || 0) + (Number(it.damaged_quantity) || 0) + (Number(it.missing_quantity) || 0)) === (Number(it.dispatched_quantity) || 0));

                                return (
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 12,
                                        padding: '10px 14px',
                                        background: isAllBalanced ? '#f8fafc' : '#fef2f2',
                                        border: `1px solid ${isAllBalanced ? '#e2e8f0' : '#fecaca'}`,
                                        borderRadius: 8,
                                        fontSize: 12.5,
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                                            <span>Dispatched: <strong>{totalDisp}</strong></span>
                                            <span>Good Received: <strong style={{ color: '#047857' }}>{totalRec}</strong></span>
                                            <span>Damaged: <strong style={{ color: '#dc2626' }}>{totalDmg}</strong></span>
                                            <span>Missing: <strong style={{ color: '#d97706' }}>{totalMis}</strong></span>
                                        </div>
                                        <div>
                                            {isAllBalanced ? (
                                                <span style={{ color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    ✓ All quantities balanced ({totalAccounted}/{totalDisp})
                                                </span>
                                            ) : (
                                                <span style={{ color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    ⚠ Quantity mismatch: Accounted {totalAccounted} of {totalDisp} dispatched
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* In-Modal Error Display */}
                            {discrepancyError && (
                                <div style={{
                                    marginTop: 14,
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    color: '#991b1b',
                                    fontSize: 12.5
                                }}>
                                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                                        ⚠ {discrepancyError.message}
                                    </div>
                                    {discrepancyError.backendDetail && discrepancyError.backendDetail !== discrepancyError.message && (
                                        <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 2 }}>
                                            Backend response (HTTP {discrepancyError.status}): {discrepancyError.backendDetail}
                                        </div>
                                    )}
                                    {Array.isArray(discrepancyError.allErrors) && discrepancyError.allErrors.length > 1 && (
                                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 11.5 }}>
                                            {discrepancyError.allErrors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '12px 22px',
                            background: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 10
                        }}>
                            <button
                                type="button"
                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id}
                                onClick={() => {
                                    setDiscrepancyModalOpen(false);
                                    setDiscrepancyTransfer(null);
                                    setDiscrepancyError(null);
                                }}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #d1d5db',
                                    color: '#374151',
                                    padding: '7px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={receivingDiscrepancyTransferId === discrepancyTransfer.id || getDiscrepancyValidationErrors().length > 0}
                                onClick={handleConfirmReceiveWithDiscrepancy}
                                style={{
                                    background: '#d97706',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '7px 20px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: (receivingDiscrepancyTransferId === discrepancyTransfer.id || getDiscrepancyValidationErrors().length > 0) ? 'not-allowed' : 'pointer',
                                    opacity: (receivingDiscrepancyTransferId === discrepancyTransfer.id || getDiscrepancyValidationErrors().length > 0) ? 0.6 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <BsExclamationTriangle size={14} />
                                {receivingDiscrepancyTransferId === discrepancyTransfer.id ? 'Submitting Discrepancy Receipt...' : 'Confirm & Receive With Discrepancy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModuleContainer>
    );
};


/* ─────────────────────────────────────────────────────────────
   9. CUSTOMERS: Loyalty
───────────────────────────────────────────────────────────── */
export const CustomerLoyaltyPage = () => {
    return (
        <ModuleContainer
            title="Customer Loyalty & Rewards"
            subtitle="Points calculation, VIP membership tiers (Silver, Gold, Platinum), and points redemption engine"
            icon={<BsAwardFill />}
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Active Loyalty Members" value="4,820 Members" sub="+140 this week" color="#6366f1" />
                <StatCard label="Points In Circulation" value="3,84,000 Pts" sub="Liability: ₹38,400" color="#f59e0b" />
                <StatCard label="Redeemed (This Month)" value="42,500 Pts" sub="₹4,250 Saved by shoppers" color="#10b981" />
                <StatCard label="Avg Spend (Members)" value="₹2,450 / bill" sub="3.2x higher than non-members" color="#8b5cf6" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { tier: 'Silver Tier', criteria: 'Spend ₹0 - ₹10,000', rate: '1 pt per ₹100', perks: 'Birthday Special Discount 5%', color: '#94a3b8' },
                    { tier: 'Gold Tier', criteria: 'Spend ₹10,001 - ₹30,000', rate: '2 pts per ₹100', perks: 'Free Express Delivery + 10% Off', color: '#f59e0b' },
                    { tier: 'Platinum Tier', criteria: 'Spend ₹30,000+', rate: '3.5 pts per ₹100', perks: 'Dedicated Relationship Manager + VIP Pre-sale', color: '#6366f1' },
                ].map((tier, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, border: `1px solid #e5e7eb`, borderTop: `4px solid ${tier.color}`, padding: 20 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{tier.tier}</h4>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 12px 0' }}>{tier.criteria}</p>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 8 }}>
                            <strong>Earn Rate:</strong> {tier.rate}
                        </div>
                        <p style={{ fontSize: 12, color: '#374151', margin: 0 }}><strong>Perks:</strong> {tier.perks}</p>
                    </div>
                ))}
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   10. PEOPLE: Roles & Permissions
───────────────────────────────────────────────────────────── */
export const RolesPermissionsPage = () => {
    // Role selection & API state
    const [selectedRoleId, setSelectedRoleId] = useState(1); // Default: Admin (Role ID 1)
    const [selectedStoreId, setSelectedStoreId] = useState(1); // Default: Store ID 1
    const [stores, setStores] = useState([]);
    const [roleUsers, setRoleUsers] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [roleName, setRoleName] = useState('admin');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Dynamic Store List fetching
    useEffect(() => {
        let isMounted = true;
        listStores().then(res => {
            if (!isMounted) return;
            const storeList = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
            if (Array.isArray(storeList) && storeList.length > 0) {
                setStores(storeList);
            }
        }).catch(() => {});
        return () => { isMounted = false; };
    }, []);

    const defaultRolesList = [
        { id: 1, role: 'Super Admin / Admin', pos: 'Full', disc: 'Unlimited', inv: 'Full Control', tax: 'Full Control' },
        { id: 2, role: 'Store Manager', pos: 'Full', disc: 'Up to 25%', inv: 'Transfers & Inward', tax: 'View Only' },
        { id: 3, role: 'Cashier / POS Operator', pos: 'Create Invoices', disc: 'Requires Manager PIN', inv: 'No Access', tax: 'No Access' },
        { id: 4, role: 'Inventory Clerk', pos: 'No Access', disc: 'No Access', inv: 'Stock Inward & GRN', tax: 'No Access' },
    ];

    // Dynamic Roles state
    const [roles, setRoles] = useState(defaultRolesList);

    // Reassign Users state
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignSourceId, setReassignSourceId] = useState(1);
    const [reassignTargetId, setReassignTargetId] = useState('');
    const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);
    const [reassignSubmitting, setReassignSubmitting] = useState(false);
    const [reassignError, setReassignError] = useState(null);
    const [reassignSuccessBanner, setReassignSuccessBanner] = useState(null);

    // Reset to Default Modal state
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetRoleId, setResetRoleId] = useState(1);
    const [resetAcknowledged, setResetAcknowledged] = useState(false);
    const [resetSubmitting, setResetSubmitting] = useState(false);
    const [resetError, setResetError] = useState(null);
    const [resetSuccessBanner, setResetSuccessBanner] = useState(null);

    // Fetch dynamic roles list from API
    const fetchRoles = useCallback(async () => {
        try {
            const res = await userService.getRoles();
            const list = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
            if (Array.isArray(list) && list.length > 0) {
                const mapped = list.map(r => {
                    const existing = defaultRolesList.find(x => x.id === r.id);
                    return {
                        id: r.id,
                        role: r.name ? (r.name.charAt(0).toUpperCase() + r.name.slice(1).replace(/_/g, ' ')) : (existing?.role || `Role #${r.id}`),
                        name: r.name,
                        pos: existing?.pos || (r.permissions?.includes('billing:write') ? 'Full' : 'Standard'),
                        disc: existing?.disc || 'Standard',
                        inv: existing?.inv || (r.permissions?.includes('inventory:write') ? 'Full Control' : 'View Only'),
                        tax: existing?.tax || 'Standard',
                        user_count: r.user_count,
                        is_system: r.is_system
                    };
                });
                setRoles(mapped);
            }
        } catch {
            // retain default fallback roles
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const sourceRoleObj = roles.find(r => Number(r.id) === Number(reassignSourceId)) || { id: reassignSourceId, role: `Role #${reassignSourceId}` };
    const targetRoleObj = roles.find(r => Number(r.id) === Number(reassignTargetId)) || (reassignTargetId ? { id: reassignTargetId, role: `Role #${reassignTargetId}` } : null);

    const handleOpenReassignModal = (sourceId = null) => {
        const srcId = sourceId ? Number(sourceId) : Number(selectedRoleId);
        setReassignSourceId(srcId);
        setReassignTargetId('');
        setConfirmAcknowledged(false);
        setReassignError(null);
        setIsReassignModalOpen(true);
    };

    const handleCloseReassignModal = () => {
        if (reassignSubmitting) return;
        setIsReassignModalOpen(false);
        setReassignError(null);
    };

    const handleConfirmReassign = async () => {
        const sId = Number(reassignSourceId);
        const tId = Number(reassignTargetId);

        // Validation guard: source and target cannot be identical
        if (!tId || sId === tId) {
            setReassignError("Source and target roles cannot be the same.");
            return;
        }

        if (!confirmAcknowledged) {
            setReassignError("Please confirm user reassignment acknowledgment before proceeding.");
            return;
        }

        try {
            setReassignSubmitting(true);
            setReassignError(null);

            const response = await userService.reassignUsers(sId, tId);
            const resData = response?.data;

            const successMsg = resData?.message || `Successfully reassigned ${resData?.reassigned_count ?? ''} user(s).`;
            setReassignSuccessBanner({
                message: successMsg,
                reassigned_count: resData?.reassigned_count,
                source_role_name: resData?.source_role_name,
                target_role_name: resData?.target_role_name,
            });

            setIsReassignModalOpen(false);

            // Refresh user list for current role and stores
            await loadRoleUsers(selectedRoleId, selectedStoreId, page, pageSize);
            await fetchRoles();
        } catch (err) {
            console.error("Reassign Users API error:", err);
            const status = err?.response?.status;
            const resData = err?.response?.data;

            let errMsg = "Failed to reassign users. Please try again.";

            if (status === 409) {
                errMsg = resData?.message || resData?.detail?.message || (typeof resData?.detail === 'string' ? resData.detail : null) || "Source and target roles cannot be the same.";
            } else if (status === 401) {
                errMsg = "Unauthorized: Session expired. Please log in again.";
            } else if (status === 403) {
                errMsg = "Forbidden: Insufficient permissions to reassign role users.";
            } else if (status === 422) {
                const detail = resData?.detail;
                if (Array.isArray(detail)) {
                    errMsg = detail.map(d => d.msg || `${d.loc?.join('.')}: invalid`).join(', ');
                } else if (typeof detail === 'string') {
                    errMsg = detail;
                } else {
                    errMsg = resData?.message || "Validation error: Invalid role parameters.";
                }
            } else {
                errMsg = resData?.message || (typeof resData?.detail === 'string' ? resData.detail : null) || resData?.detail?.message || err?.message || "Failed to reassign users.";
            }

            setReassignError(errMsg);
        } finally {
            setReassignSubmitting(false);
        }
    };

    const selectedRoleObj = roles.find(r => Number(r.id) === Number(selectedRoleId)) || { id: selectedRoleId, role: `Role #${selectedRoleId}` };
    const resetRoleObj = roles.find(r => Number(r.id) === Number(resetRoleId)) || { id: resetRoleId, role: `Role #${resetRoleId}` };

    const handleOpenResetModal = (roleId = null) => {
        const targetId = roleId ? Number(roleId) : Number(selectedRoleId);
        setResetRoleId(targetId);
        setResetAcknowledged(false);
        setResetError(null);
        setIsResetModalOpen(true);
    };

    const handleCloseResetModal = () => {
        if (resetSubmitting) return;
        setIsResetModalOpen(false);
        setResetError(null);
    };

    const handleConfirmReset = async () => {
        const targetId = Number(resetRoleId);
        if (!targetId) {
            setResetError("Please select a valid role to reset.");
            return;
        }

        if (!resetAcknowledged) {
            setResetError("Please confirm acknowledgment before proceeding with the reset.");
            return;
        }

        try {
            setResetSubmitting(true);
            setResetError(null);

            const response = await userService.resetRoleToDefault(targetId);
            const resData = response?.data;

            const permissionsList = Array.isArray(resData?.permissions) ? resData.permissions : [];
            const roleDisplayName = resData?.name
                ? (resData.name.charAt(0).toUpperCase() + resData.name.slice(1).replace(/_/g, ' '))
                : (resetRoleObj?.role || `Role #${targetId}`);

            setResetSuccessBanner({
                message: `Role '${roleDisplayName}' (Role ID: ${targetId}) was successfully reset to system default permissions.`,
                roleId: targetId,
                roleName: resData?.name,
                permissions: permissionsList,
                userCount: resData?.user_count,
            });

            setIsResetModalOpen(false);

            // Refresh role details and users after success
            await fetchRoles();
            await loadRoleUsers(selectedRoleId, selectedStoreId, page, pageSize);
        } catch (err) {
            console.error(`Failed to reset role #${targetId}:`, err);
            const status = err?.response?.status;
            const resData = err?.response?.data;

            let errMsg = "Failed to reset role to defaults. Please try again.";

            if (status === 404) {
                errMsg = resData?.message || resData?.detail?.message || (typeof resData?.detail === 'string' ? resData.detail : null) || `Role #${targetId} not found or does not support default system reset.`;
            } else if (status === 401) {
                errMsg = "Unauthorized: Session expired. Please log in again.";
            } else if (status === 403) {
                errMsg = "Forbidden: Insufficient permissions to reset this role.";
            } else if (status === 422) {
                const detail = resData?.detail;
                if (Array.isArray(detail)) {
                    errMsg = detail.map(d => d.msg || `${d.loc?.join('.')}: invalid`).join(', ');
                } else if (typeof detail === 'string') {
                    errMsg = detail;
                } else {
                    errMsg = resData?.message || "Validation error: Invalid role parameters.";
                }
            } else {
                errMsg = resData?.message || (typeof resData?.detail === 'string' ? resData.detail : null) || resData?.detail?.message || err?.message || "Failed to reset role.";
            }

            setResetError(errMsg);
        } finally {
            setResetSubmitting(false);
        }
    };

    const loadRoleUsers = useCallback(async (roleId, storeId, pageNum, size) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: pageNum,
                page_size: size,
                ...(storeId !== '' && storeId !== undefined && storeId !== null ? { store_id: Number(storeId) } : {}),
            };
            const response = await userService.getRoleUsers(Number(roleId), params);
            const resData = response?.data;
            // Parse response correctly using response.users, response.total_users, response.page, response.page_size
            const userList = resData?.users || (Array.isArray(resData) ? resData : (resData?.items || []));
            setRoleUsers(userList);
            setTotalUsers(resData?.total_users ?? (Array.isArray(resData) ? resData.length : (resData?.total ?? userList.length)));
            if (resData?.role_name) {
                setRoleName(resData.role_name);
            }
            if (resData?.page !== undefined && Number.isFinite(Number(resData.page)) && Number(resData.page) !== pageNum) {
                setPage(Number(resData.page));
            }
            if (resData?.page_size !== undefined && Number.isFinite(Number(resData.page_size)) && Number(resData.page_size) !== size) {
                setPageSize(Number(resData.page_size));
            }
        } catch (err) {
            console.error(`Failed to load users for role ${roleId}:`, err);
            const errMsg = err?.response?.data?.detail?.message ||
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load role users";
            setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
            setRoleUsers([]);
            setTotalUsers(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoleUsers(selectedRoleId, selectedStoreId, page, pageSize);
    }, [selectedRoleId, selectedStoreId, page, pageSize, loadRoleUsers]);

    const handleRoleSelect = (roleId) => {
        setSelectedRoleId(roleId);
        setPage(1);
    };

    const handleStoreChange = (e) => {
        const val = e.target.value;
        setSelectedStoreId(val !== '' ? Number(val) : '');
        setPage(1);
    };

    const filteredUsers = roleUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.store_name || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

    return (
        <ModuleContainer
            title="Roles & Access Permissions"
            subtitle="Role-based access control matrix (RBAC) and assigned users for Cashiers, Store Managers, Accountants, and Admins"
            icon={<BsShieldLock />}
            actionBtn={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={() => handleOpenResetModal(selectedRoleId)}
                        title={`Reset ${selectedRoleObj?.role || 'role'} to factory default permissions`}
                        style={{
                            background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', padding: '9px 15px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <BsArrowRepeat size={14} /> Reset to Default
                    </button>
                    <button
                        onClick={() => handleOpenReassignModal(selectedRoleId)}
                        title="Reassign users from this role to another role"
                        style={{
                            background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '9px 16px',
                            borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <BsArrowLeftRight size={14} /> Reassign Role Users
                    </button>
                    <button style={{
                        background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                        borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <BsPlus size={18} /> Create New Role
                    </button>
                </div>
            }
        >
            {/* Roles Matrix Table */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 28 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Role Permissions Matrix</h3>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Click a role to view assigned users</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '14px 18px' }}>Role Name</th>
                            <th style={{ padding: '14px 18px' }}>Active Users</th>
                            <th style={{ padding: '14px 18px' }}>POS Billing Access</th>
                            <th style={{ padding: '14px 18px' }}>Price Override & Discounts</th>
                            <th style={{ padding: '14px 18px' }}>Inventory Adjustments</th>
                            <th style={{ padding: '14px 18px' }}>Tax & GST Reports</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((r) => {
                            const isSelected = selectedRoleId === r.id;
                            return (
                                <tr
                                    key={r.id}
                                    onClick={() => handleRoleSelect(r.id)}
                                    style={{
                                        borderBottom: '1px solid #f3f4f6',
                                        cursor: 'pointer',
                                        background: isSelected ? '#f5f3ff' : '#fff',
                                        transition: 'background 0.15s ease'
                                    }}
                                >
                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: isSelected ? '#4f46e5' : '#111827' }}>
                                        {r.role} {isSelected && <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>Selected</span>}
                                    </td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <span style={{
                                            background: isSelected ? '#6366f1' : '#f3f4f6',
                                            color: isSelected ? '#fff' : '#111827',
                                            padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600
                                        }}>
                                            {isSelected ? `${totalUsers} Users` : (r.user_count !== undefined ? `${r.user_count} Users` : 'View Users')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 600 }}>{r.pos || 'Standard'}</td>
                                    <td style={{ padding: '14px 18px' }}>{r.disc || 'Standard'}</td>
                                    <td style={{ padding: '14px 18px' }}>{r.inv || 'Standard'}</td>
                                    <td style={{ padding: '14px 18px' }}>{r.tax || 'Standard'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Assigned Role Users Section */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                    background: '#fcfcfd'
                }}>
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>
                            Users Assigned to Role: <span style={{ color: '#6366f1', textTransform: 'capitalize' }}>{roleName || 'Admin'}</span>
                        </h2>
                        <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0 0' }}>
                            Role ID: <strong>{selectedRoleId}</strong> • Store ID: <strong>{selectedStoreId || 'All'}</strong> • Total Users: <strong>{totalUsers}</strong>
                        </p>
                        {/* Display actual backend permissions including wildcard '*' */}
                        {selectedRoleObj?.permissions && selectedRoleObj.permissions.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                <span style={{ fontSize: 11.5, color: '#4b5563', fontWeight: 600 }}>Role Permissions:</span>
                                {selectedRoleObj.permissions.map((p, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                            background: p === '*' ? '#fef3c7' : '#e0e7ff',
                                            color: p === '*' ? '#b45309' : '#3730a3',
                                            border: p === '*' ? '1px solid #fcd34d' : '1px solid #c7d2fe',
                                            fontFamily: 'monospace'
                                        }}
                                    >
                                        {p === '*' ? '★ Full Access (*)' : p}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {/* Search Filter */}
                        <div style={{ position: 'relative', width: 200 }}>
                            <BsSearch style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af', fontSize: 12 }} />
                            <input
                                type="text"
                                placeholder="Search role users..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                            />
                        </div>

                        {/* Role Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>Role:</label>
                            <select
                                value={selectedRoleId}
                                onChange={(e) => handleRoleSelect(Number(e.target.value))}
                                style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
                            >
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.role} (Role ID: {r.id})</option>
                                ))}
                            </select>
                        </div>

                        {/* Store Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BsShop style={{ color: '#6366f1' }} />
                            <select
                                value={selectedStoreId}
                                onChange={handleStoreChange}
                                style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
                            >
                                {stores.length > 0 ? (
                                    stores.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name || s.store_name || `Store #${s.id}`} (ID: {s.id})
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="1">Store ID: 1 (Main Store)</option>
                                        <option value="2">Store ID: 2</option>
                                        <option value="3">Store ID: 3</option>
                                    </>
                                )}
                                <option value="">All Stores</option>
                            </select>
                        </div>

                        <button
                            onClick={() => loadRoleUsers(selectedRoleId, selectedStoreId, page, pageSize)}
                            title="Refresh Role Users"
                            style={{
                                background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8,
                                padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4b5563'
                            }}
                        >
                            <BsArrowRepeat className={loading ? 'spin' : ''} />
                        </button>

                        {/* Reset Role to Default Button */}
                        <button
                            onClick={() => handleOpenResetModal(selectedRoleId)}
                            title={`Reset ${selectedRoleObj?.role || 'role'} permissions to system default`}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                                borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                        >
                            <BsArrowRepeat size={13} /> Reset to Default
                        </button>

                        {/* Reassign Users Action Button */}
                        <button
                            onClick={() => handleOpenReassignModal(selectedRoleId)}
                            title="Reassign users from this role to another role"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe',
                                borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                        >
                            <BsArrowLeftRight size={13} /> Reassign Role Users
                        </button>
                    </div>
                </div>

                {/* Reset Default Success Banner */}
                {resetSuccessBanner && (
                    <div style={{
                        background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '12px 20px',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', color: '#1e40af', fontSize: 13
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <BsCheckCircleFill color="#2563eb" size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                            <div>
                                <div><strong>Success:</strong> {resetSuccessBanner.message}</div>
                                {resetSuccessBanner.permissions && resetSuccessBanner.permissions.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>Restored Permissions:</span>
                                        {resetSuccessBanner.permissions.map((p, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                                    background: p === '*' ? '#fef3c7' : '#dbeafe',
                                                    color: p === '*' ? '#b45309' : '#1e40af',
                                                    border: p === '*' ? '1px solid #fcd34d' : '1px solid #93c5fd',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {p === '*' ? '★ Full Access (*)' : p}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setResetSuccessBanner(null)}
                            style={{ background: 'transparent', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Reassignment Success Banner */}
                {reassignSuccessBanner && (
                    <div style={{
                        background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', padding: '12px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#065f46', fontSize: 13
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsCheckCircleFill color="#059669" size={16} />
                            <span>
                                <strong>Success:</strong> {reassignSuccessBanner.message}
                                {reassignSuccessBanner.reassigned_count !== undefined && (
                                    <span> (Reassigned Count: <strong>{reassignSuccessBanner.reassigned_count}</strong>)</span>
                                )}
                            </span>
                        </div>
                        <button
                            onClick={() => setReassignSuccessBanner(null)}
                            style={{ background: 'transparent', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '12px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b', fontSize: 13
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsExclamationTriangle />
                            <span><strong>Error loading role users:</strong> {error}</span>
                        </div>
                        <button
                            onClick={() => loadRoleUsers(selectedRoleId, selectedStoreId, page, pageSize)}
                            style={{
                                background: '#fff', border: '1px solid #f87171', borderRadius: 6,
                                padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#b91c1c', cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                            <tr>
                                <th style={{ padding: '12px 18px' }}>User ID</th>
                                <th style={{ padding: '12px 18px' }}>Full Name</th>
                                <th style={{ padding: '12px 18px' }}>Email Address</th>
                                <th style={{ padding: '12px 18px' }}>Phone</th>
                                <th style={{ padding: '12px 18px' }}>Store Name</th>
                                <th style={{ padding: '12px 18px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '36px 18px', textAlign: 'center', color: '#6b7280' }}>
                                        <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>Loading assigned role users...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '36px 18px', textAlign: 'center', color: '#6b7280' }}>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                                            {search ? `No role users matching "${search}"` : 'No users assigned to this role and store.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '14px 18px', color: '#9ca3af', fontWeight: 600 }}>#{u.id}</td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%', background: '#6366f1',
                                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12
                                                }}>
                                                    {(u.full_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <strong style={{ color: '#111827' }}>{u.full_name || 'N/A'}</strong>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 18px', color: '#6b7280' }}>{u.email || 'N/A'}</td>
                                        <td style={{ padding: '14px 18px', color: '#6b7280' }}>{u.phone ? u.phone : 'N/A'}</td>
                                        <td style={{ padding: '14px 18px', color: '#4b5563', fontWeight: 500 }}>
                                            {u.store_name || (u.store_id ? `Store #${u.store_id}` : 'N/A')}
                                        </td>
                                        <td style={{ padding: '14px 18px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                                                background: u.is_active ? '#ecfdf5' : '#fef2f2',
                                                color: u.is_active ? '#059669' : '#dc2626'
                                            }}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{
                    padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#6b7280'
                }}>
                    <div>
                        Showing <strong>{filteredUsers.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
                        <strong>{Math.min(page * pageSize, totalUsers)}</strong> of <strong>{totalUsers}</strong> users
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                                border: '1px solid #d1d5db', borderRadius: 6, background: page <= 1 ? '#f3f4f6' : '#fff',
                                color: page <= 1 ? '#9ca3af' : '#374151', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12
                            }}
                        >
                            <BsChevronLeft size={12} /> Previous
                        </button>
                        <span style={{ padding: '0 6px', fontWeight: 600 }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                                border: '1px solid #d1d5db', borderRadius: 6, background: page >= totalPages ? '#f3f4f6' : '#fff',
                                color: page >= totalPages ? '#9ca3af' : '#374151', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12
                            }}
                        >
                            Next <BsChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reassign Role Users Modal */}
            {isReassignModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(17, 24, 39, 0.55)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden', border: '1px solid #e5e7eb'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f9fafb'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, background: '#eef2ff',
                                    color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                                }}>
                                    <BsArrowLeftRight />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        Reassign Role Users
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                        Bulk transfer all users from source role to target role
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseReassignModal}
                                disabled={reassignSubmitting}
                                style={{
                                    background: 'transparent', border: 'none', color: '#9ca3af',
                                    fontSize: 18, cursor: reassignSubmitting ? 'not-allowed' : 'pointer', padding: 4
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Error Alert */}
                            {reassignError && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                                    padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
                                    color: '#991b1b', fontSize: 13
                                }}>
                                    <BsExclamationTriangle style={{ marginTop: 2, flexShrink: 0 }} />
                                    <div style={{ flex: 1, wordBreak: 'break-word' }}>{reassignError}</div>
                                </div>
                            )}

                            {/* Source Role Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Source Role (Move users from)
                                </label>
                                <select
                                    value={reassignSourceId}
                                    onChange={(e) => {
                                        setReassignSourceId(Number(e.target.value));
                                        setReassignError(null);
                                    }}
                                    disabled={reassignSubmitting}
                                    style={{
                                        width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
                                        borderRadius: 8, fontSize: 13.5, background: '#f9fafb', color: '#111827', fontWeight: 500
                                    }}
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.role} (Role ID: {r.id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Role Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Target Role (Move users to) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select
                                    value={reassignTargetId}
                                    onChange={(e) => {
                                        setReassignTargetId(e.target.value !== '' ? Number(e.target.value) : '');
                                        setReassignError(null);
                                    }}
                                    disabled={reassignSubmitting}
                                    style={{
                                        width: '100%', padding: '9px 12px',
                                        border: (reassignTargetId !== '' && Number(reassignTargetId) === Number(reassignSourceId)) ? '1px solid #ef4444' : '1px solid #d1d5db',
                                        borderRadius: 8, fontSize: 13.5, background: '#fff', color: '#111827', fontWeight: 500
                                    }}
                                >
                                    <option value="">-- Select Target Role --</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.role} (Role ID: {r.id})
                                        </option>
                                    ))}
                                </select>

                                {/* Validation Message: Source and target roles cannot be the same */}
                                {reassignTargetId !== '' && Number(reassignTargetId) === Number(reassignSourceId) && (
                                    <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsExclamationTriangle size={12} />
                                        Source and target roles cannot be the same.
                                    </div>
                                )}
                            </div>

                            {/* Caution & Confirmation Notice */}
                            <div style={{
                                background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8,
                                padding: '12px 14px', color: '#92400e', fontSize: 12.5, lineHeight: 1.45
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                                    <BsExclamationTriangle />
                                    <span>Confirmation Required</span>
                                </div>
                                <div>
                                    All active users currently assigned to <strong>{sourceRoleObj?.role || `Role #${reassignSourceId}`}</strong> will be atomically transferred to <strong>{targetRoleObj?.role || 'the target role'}</strong>. This operation cannot be automatically reversed.
                                </div>
                            </div>

                            {/* Explicit User Confirmation Checkbox */}
                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5,
                                color: '#374151', cursor: reassignSubmitting ? 'not-allowed' : 'pointer', userSelect: 'none'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={confirmAcknowledged}
                                    onChange={(e) => setConfirmAcknowledged(e.target.checked)}
                                    disabled={reassignSubmitting}
                                    style={{ marginTop: 2, cursor: 'pointer' }}
                                />
                                <span>
                                    I confirm that I want to reassign all users from <strong>{sourceRoleObj?.role || `Role #${reassignSourceId}`}</strong> to <strong>{targetRoleObj?.role || 'the selected target role'}</strong>.
                                </span>
                            </label>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '14px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
                            display: 'flex', justifyContent: 'flex-end', gap: 10
                        }}>
                            <button
                                onClick={handleCloseReassignModal}
                                disabled={reassignSubmitting}
                                style={{
                                    padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db',
                                    borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151',
                                    cursor: reassignSubmitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReassign}
                                disabled={!reassignTargetId || Number(reassignTargetId) === Number(reassignSourceId) || !confirmAcknowledged || reassignSubmitting}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                                    background: (!reassignTargetId || Number(reassignTargetId) === Number(reassignSourceId) || !confirmAcknowledged || reassignSubmitting) ? '#9ca3af' : '#4f46e5',
                                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                    cursor: (!reassignTargetId || Number(reassignTargetId) === Number(reassignSourceId) || !confirmAcknowledged || reassignSubmitting) ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                {reassignSubmitting && (
                                    <div style={{
                                        width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent',
                                        borderRadius: '50%', animation: 'spin 1s linear infinite'
                                    }} />
                                )}
                                {reassignSubmitting ? 'Reassigning Users...' : 'Confirm & Reassign Users'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Role to Default Modal */}
            {isResetModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(17, 24, 39, 0.55)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden', border: '1px solid #e5e7eb'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#fef2f2'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, background: '#fee2e2',
                                    color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                                }}>
                                    <BsArrowRepeat />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                                        Reset Role to Defaults
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#7f1d1d' }}>
                                        Restore official factory default permissions for this role
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseResetModal}
                                disabled={resetSubmitting}
                                style={{
                                    background: 'transparent', border: 'none', color: '#9ca3af',
                                    fontSize: 18, cursor: resetSubmitting ? 'not-allowed' : 'pointer', padding: 4
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Error Alert */}
                            {resetError && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                                    padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
                                    color: '#991b1b', fontSize: 13
                                }}>
                                    <BsExclamationTriangle style={{ marginTop: 2, flexShrink: 0 }} />
                                    <div style={{ flex: 1, wordBreak: 'break-word' }}>{resetError}</div>
                                </div>
                            )}

                            {/* Role to Reset Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Role to Reset
                                </label>
                                <select
                                    value={resetRoleId}
                                    onChange={(e) => {
                                        setResetRoleId(Number(e.target.value));
                                        setResetError(null);
                                    }}
                                    disabled={resetSubmitting}
                                    style={{
                                        width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
                                        borderRadius: 8, fontSize: 13.5, background: '#f9fafb', color: '#111827', fontWeight: 600
                                    }}
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.role} (Role ID: {r.id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Caution & Explanation Notice */}
                            <div style={{
                                background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8,
                                padding: '12px 14px', color: '#92400e', fontSize: 12.5, lineHeight: 1.45
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                                    <BsExclamationTriangle />
                                    <span>Warning: Permissions Overwrite</span>
                                </div>
                                <div>
                                    Resetting will overwrite all existing custom permissions for <strong>{resetRoleObj?.role || `Role #${resetRoleId}`}</strong> and replace them with the official system default permissions. User assignments will be kept intact.
                                </div>
                            </div>

                            {/* Explicit User Confirmation Checkbox */}
                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5,
                                color: '#374151', cursor: resetSubmitting ? 'not-allowed' : 'pointer', userSelect: 'none'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={resetAcknowledged}
                                    onChange={(e) => setResetAcknowledged(e.target.checked)}
                                    disabled={resetSubmitting}
                                    style={{ marginTop: 2, cursor: 'pointer' }}
                                />
                                <span>
                                    I understand and confirm that I want to reset <strong>{resetRoleObj?.role || `Role #${resetRoleId}`}</strong> to factory default permissions.
                                </span>
                            </label>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '14px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
                            display: 'flex', justifyContent: 'flex-end', gap: 10
                        }}>
                            <button
                                onClick={handleCloseResetModal}
                                disabled={resetSubmitting}
                                style={{
                                    padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db',
                                    borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151',
                                    cursor: resetSubmitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReset}
                                disabled={!resetAcknowledged || resetSubmitting}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                                    background: (!resetAcknowledged || resetSubmitting) ? '#9ca3af' : '#dc2626',
                                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                    cursor: (!resetAcknowledged || resetSubmitting) ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                {resetSubmitting && (
                                    <div style={{
                                        width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent',
                                        borderRadius: '50%', animation: 'spin 1s linear infinite'
                                    }} />
                                )}
                                {resetSubmitting ? 'Resetting to Defaults...' : 'Confirm & Reset to Default'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   11. WHATSAPP: Campaigns
───────────────────────────────────────────────────────────── */
export const WhatsAppCampaignsPage = () => {
    return (
        <ModuleContainer
            title="WhatsApp Marketing Campaigns"
            subtitle="Automated marketing broadcast templates, festival discount announcements and bill receipts via WhatsApp Cloud API"
            icon={<BsMegaphone />}
            actionBtn={
                <button style={{
                    background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsSend size={16} /> Broadcast New Campaign
                </button>
            }
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Messages Sent (This Month)" value="12,450" sub="98.2% Delivered" color="#10b981" />
                <StatCard label="Customer Read Rate" value="84.6%" sub="Industry Avg: 72%" color="#6366f1" />
                <StatCard label="Attributed Sales" value="₹1,84,000" sub="Direct link conversions" color="#0ea5e9" />
                <StatCard label="API Credit Balance" value="8,550 Credits" sub="Tier: Unlimited Tier" color="#f59e0b" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 18px' }}>Campaign Name</th>
                            <th style={{ padding: '12px 18px' }}>Audience Segment</th>
                            <th style={{ padding: '12px 18px' }}>Recipients</th>
                            <th style={{ padding: '12px 18px' }}>Sent Date</th>
                            <th style={{ padding: '12px 18px' }}>Open Rate</th>
                            <th style={{ padding: '12px 18px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { name: 'Diwali Mega Festive Sale 20% Off', seg: 'Repeat Customers (Gold/Platinum)', count: '1,840', date: '01 Oct 2026', read: '89.4%', status: 'Completed' },
                            { name: 'Abandoned POS Cart Follow-up', seg: 'Walk-ins (Enquiry only)', count: '320', date: 'Yesterday', read: '82.1%', status: 'Active' },
                            { name: 'Loyalty Points Expiry Reminder', seg: 'Expiring in < 15 days', count: '640', date: '28 Sep 2026', read: '91.2%', status: 'Completed' },
                        ].map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827' }}>{c.name}</td>
                                <td style={{ padding: '14px 18px', color: '#6366f1', fontWeight: 500 }}>{c.seg}</td>
                                <td style={{ padding: '14px 18px' }}>{c.count} contacts</td>
                                <td style={{ padding: '14px 18px', color: '#6b7280' }}>{c.date}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>{c.read}</td>
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{ padding: '3px 8px', borderRadius: 10, background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: 11 }}>
                                        {c.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   12. WHATSAPP: Support Chat
───────────────────────────────────────────────────────────── */
export const WhatsAppChatPage = () => {
    return (
        <ModuleContainer
            title="WhatsApp Live Support & Chat Console"
            subtitle="Chat directly with store customers, resolve order queries and share digital invoices instantly"
            icon={<BsChatDots />}
        >
            <div style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                height: 540, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden'
            }}>
                {/* Chat conversation list */}
                <div style={{ borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                        <input
                            type="text"
                            placeholder="Search chats by name or phone..."
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12.5 }}
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {[
                            { name: 'Kavita Joshi', phone: '+91 98210 99412', last: 'Can you please resend my invoice for yesterday?', time: '11:40 AM', unread: 1, active: true },
                            { name: 'Sameer Sheikh', phone: '+91 99102 33410', last: 'Is the Polo t-shirt in size XL available?', time: '10:15 AM', unread: 0 },
                            { name: 'Ananya Roy', phone: '+91 98114 55901', last: 'Thank you for the quick replacement!', time: 'Yesterday', unread: 0 },
                        ].map((chat, i) => (
                            <div key={i} style={{
                                padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                                background: chat.active ? '#eff6ff' : 'transparent'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{chat.name}</span>
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{chat.time}</span>
                                </div>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {chat.last}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat window */}
                <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                    <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Kavita Joshi</h4>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>● Online on WhatsApp</span>
                        </div>
                        <button style={{ background: '#eef2ff', color: '#6366f1', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                            Send Digital Invoice PDF
                        </button>
                    </div>

                    <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', maxWidth: '70%', fontSize: 13, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            Hello! I visited your Connaught Place store yesterday and purchased 2 items. Can you please resend my invoice copy?
                        </div>
                        <div style={{ alignSelf: 'flex-end', background: '#6366f1', color: '#fff', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', maxWidth: '70%', fontSize: 13 }}>
                            Hi Kavita! Sure, here is your GST Invoice #INV-2026-089 for ₹2,450.00. Thank you for shopping with us!
                        </div>
                    </div>

                    <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
                        <input
                            type="text"
                            placeholder="Type a message or select quick reply..."
                            style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                        />
                        <button style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   13. ANALYTICS: AI Insights
───────────────────────────────────────────────────────────── */
export const AIInsightsPage = () => {
    return (
        <ModuleContainer
            title="AI Retail Intelligence & Demand Forecasting"
            subtitle="Machine learning predictions for stockouts, deadstock alerts, peak traffic hours and intelligent bundling"
            icon={<BsStars />}
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', borderLeft: '4px solid #ef4444', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <BsExclamationTriangle color="#ef4444" size={16} />
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Predicted Stockout in 5 Days</h4>
                    </div>
                    <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px 0' }}>
                        <strong>Denim Jacket Slim Fit (Size M)</strong> is selling 3.4x faster than usual. Current inventory (18 units) will exhaust by Friday.
                    </p>
                    <button style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        Auto-generate PO to Supplier
                    </button>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <BsStars color="#10b981" size={16} />
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Smart Product Bundle Opportunity</h4>
                    </div>
                    <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px 0' }}>
                        42% of shoppers who buy <strong>Formal Shirt White</strong> also buy <strong>Leather Belt Classic</strong>. Bundle discount of 8% could increase basket size by ₹850.
                    </p>
                    <button style={{ background: '#ecfdf5', color: '#059669', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        Create POS Combo Rule
                    </button>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', borderLeft: '4px solid #6366f1', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <BsClockHistory color="#6366f1" size={16} />
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Upcoming Peak Store Hours</h4>
                    </div>
                    <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 12px 0' }}>
                        Foot traffic forecast indicates peak surge today between <strong>5:30 PM – 8:30 PM</strong>. Recommend opening Counter 3 for POS billing.
                    </p>
                    <button style={{ background: '#eef2ff', color: '#4f46e5', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        Assign Staff Roster
                    </button>
                </div>
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   14. SETTINGS: Integrations
───────────────────────────────────────────────────────────── */
export const IntegrationsPage = () => {
    return (
        <ModuleContainer
            title="Integrations & API Ecosystem"
            subtitle="Connect payment gateways, SMS & WhatsApp APIs, logistics partners and accounting software"
            icon={<BsPlug />}
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {[
                    { name: 'Razorpay Payment Gateway', cat: 'Payments & UPI QR', desc: 'Accept online payments, dynamic QR at checkout and split payments.', status: 'Connected', active: true },
                    { name: 'Pine Labs EDC Machine', cat: 'POS Card Swiping', desc: 'Automated credit/debit card swipe sync with POS counter billing.', status: 'Connected', active: true },
                    { name: 'WhatsApp Cloud API (Meta)', cat: 'Messaging & Notifications', desc: 'Direct WhatsApp broadcast for GST invoice PDFs and delivery updates.', status: 'Connected', active: true },
                    { name: 'Shiprocket Logistics', cat: 'E-Commerce Shipping', desc: 'Automated AWB generation, courier pickup, and order tracking.', status: 'Configured', active: true },
                    { name: 'Tally Prime / Zoho Books', cat: 'Accounting Sync', desc: 'Daily automated sales, purchases, and GST tax ledger synchronization.', status: 'Connect', active: false },
                ].map((item, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 22 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>{item.cat}</span>
                                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '8px 0 4px 0' }}>{item.name}</h4>
                            </div>
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                background: item.active ? '#ecfdf5' : '#f3f4f6',
                                color: item.active ? '#059669' : '#6b7280'
                            }}>
                                {item.status}
                            </span>
                        </div>
                        <p style={{ fontSize: 12.5, color: '#6b7280', margin: '10px 0 16px 0', lineHeight: 1.4 }}>{item.desc}</p>
                        <button style={{
                            width: '100%', background: item.active ? '#f9fafb' : '#6366f1',
                            color: item.active ? '#374151' : '#fff',
                            border: item.active ? '1px solid #d1d5db' : 'none',
                            padding: '8px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
                        }}>
                            {item.active ? 'Configure Settings' : 'Connect Now'}
                        </button>
                    </div>
                ))}
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   15. SETTINGS: Devices
───────────────────────────────────────────────────────────── */
export const DevicesPage = () => {
    return (
        <ModuleContainer
            title="POS Hardware & Peripheral Devices"
            subtitle="Configure thermal receipt printers, USB/Bluetooth barcode scanners, cash drawers and weighing scales"
            icon={<BsDisplay />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> Add Peripheral Device
                </button>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {[
                    { name: 'Epson TM-T82X Thermal Receipt Printer', type: 'Receipt Printer', port: 'USB & LAN Port (192.168.1.105)', status: 'Online & Ready', defaultDevice: true },
                    { name: 'Honeywell Voyager 1400g 2D Scanner', type: 'Barcode & QR Scanner', port: 'USB HID Keyboard Emulation', status: 'Active', defaultDevice: true },
                    { name: 'Posiflex Electronic Cash Drawer (24V)', type: 'Cash Drawer', port: 'RJ11 via Printer Kickout', status: 'Configured', defaultDevice: true },
                    { name: 'Citizen Customer Facing Display (VFD)', type: 'Pole Display', port: 'COM3 (9600 Baud)', status: 'Connected', defaultDevice: false },
                ].map((d, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 22 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>{d.type}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: 10 }}>{d.status}</span>
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '4px 0' }}>{d.name}</h4>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px 0' }}>{d.port}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ flex: 1, background: '#f3f4f6', border: 'none', padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Test Print / Ping
                            </button>
                            <button style={{ background: 'transparent', border: '1px solid #d1d5db', padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                                Configure
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ModuleContainer>
    );
};
