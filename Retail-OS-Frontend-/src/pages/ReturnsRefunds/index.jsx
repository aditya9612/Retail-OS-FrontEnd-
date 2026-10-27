import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BsArrowReturnLeft,
    BsPlus,
    BsSearch,
    BsDownload,
    BsEye,
    BsArrowClockwise,
    BsX,
    BsCheckCircleFill,
    BsXCircleFill,
    BsExclamationCircleFill,
    BsFileEarmarkPdf,
    BsCashStack,
    BsCurrencyRupee,
    BsCalendar3,
    BsInfoCircle,
    BsFilter,
    BsCheckLg,
    BsBoxSeam,
    BsPrinter,
    BsArrowRepeat,
    BsShieldCheck,
    BsReceipt,
} from 'react-icons/bs';
import {
    getOrderReturns,
    getOrderReturnStats,
    getOrderReturnById,
    createOrderReturn,
    approveOrderReturn,
    rejectOrderReturn,
    completeOrderReturn,
    getOrderReturnSlip,
    getRefunds,
    getPendingRefunds,
    createRefund,
    approveRefund,
    rejectRefund,
    getRefundReceiptPdf,
    getRefundThermalSlip,
    createExchangeOrder,
} from '../../services/returnRefundService.js';

export const ReturnsRefundsPage = () => {
    // ── Active Tab ────────────────────────────────────────────────────────────
    // 'returns' = Order Returns & RMAs | 'refunds' = Financial Refunds | 'pending' = Approvals Queue
    const [activeTab, setActiveTab] = useState('returns');

    // ── Data States ───────────────────────────────────────────────────────────
    const [returnsList, setReturnsList] = useState([]);
    const [refundsList, setRefundsList] = useState([]);
    const [pendingList, setPendingList] = useState([]);
    const [stats, setStats] = useState({
        total_returns: 0,
        requested_count: 0,
        approved_count: 0,
        completed_count: 0,
        rejected_count: 0,
        total_refund_amount: '0.00',
    });

    // ── Loading & Error States ────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // ── Search & Filter States ────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // ── Toast Alerts ──────────────────────────────────────────────────────────
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4500);
    };

    // ── Modals State ──────────────────────────────────────────────────────────
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createMode, setCreateMode] = useState('return'); // 'return' (Order RMA) or 'refund' (Invoice Refund)
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null); // { id, type: 'return'|'refund' }
    const [rejectionReason, setRejectionReason] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailsItem, setDetailsItem] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // ── Create Return Form State ──────────────────────────────────────────────
    const [returnForm, setReturnForm] = useState({
        order_id: '',
        customer_id: '',
        reason: 'Defective product',
        custom_reason: '',
        remarks: '',
        return_type: 'refund',
        items: [{ order_item_id: '', quantity: 1, condition: 'damaged', reason: '' }],
    });

    // ── Create Refund Form State ──────────────────────────────────────────────
    const [refundForm, setRefundForm] = useState({
        invoice_id: '',
        refund_amount: '',
        refund_method: 'cash',
        reason: 'Item returned counter settlement',
    });
    const [formSubmitting, setFormSubmitting] = useState(false);

    // ── Fetch All Data ────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Order Returns
            const returnsPromise = getOrderReturns({ limit: 100 }).catch(() => []);
            // 2. Fetch Refunds
            const refundsPromise = getRefunds({ page_size: 100 }).catch(() => []);
            // 3. Fetch Pending Refunds
            const pendingPromise = getPendingRefunds().catch(() => []);
            // 4. Fetch Returns Stats
            const statsPromise = getOrderReturnStats().catch(() => ({}));

            const [returnsRes, refundsRes, pendingRes, statsRes] = await Promise.all([
                returnsPromise,
                refundsPromise,
                pendingPromise,
                statsPromise,
            ]);

            setReturnsList(Array.isArray(returnsRes) ? returnsRes : []);
            setRefundsList(Array.isArray(refundsRes) ? refundsRes : []);
            setPendingList(Array.isArray(pendingRes) ? pendingRes : []);

            if (statsRes && typeof statsRes === 'object') {
                setStats({
                    total_returns: statsRes.total_returns ?? returnsRes.length ?? 0,
                    requested_count: statsRes.requested_count ?? 0,
                    approved_count: statsRes.approved_count ?? 0,
                    completed_count: statsRes.completed_count ?? 0,
                    rejected_count: statsRes.rejected_count ?? 0,
                    total_refund_amount: statsRes.total_refund_amount ?? '0.00',
                });
            }
        } catch (err) {
            showToast(err.message || 'Error loading returns data', 'error');
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Quick Filtered Datasets ───────────────────────────────────────────────
    const filteredReturns = useMemo(() => {
        let list = [...returnsList];
        if (statusFilter !== 'all') {
            list = list.filter((r) => String(r.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((r) =>
                String(r.return_number || `RET-${r.id}`).toLowerCase().includes(q) ||
                String(r.order_id || '').toLowerCase().includes(q) ||
                String(r.customer_id || '').toLowerCase().includes(q) ||
                String(r.reason || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [returnsList, statusFilter, search]);

    const filteredRefunds = useMemo(() => {
        let list = [...refundsList];
        if (statusFilter !== 'all') {
            list = list.filter((r) => String(r.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((r) =>
                String(r.id || '').toLowerCase().includes(q) ||
                String(r.invoice_number || r.invoice_id || '').toLowerCase().includes(q) ||
                String(r.customer_name || '').toLowerCase().includes(q) ||
                String(r.refund_method || '').toLowerCase().includes(q) ||
                String(r.credit_note_no || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [refundsList, statusFilter, search]);

    // ── Manager Actions Handlers ──────────────────────────────────────────────
    const handleApproveReturn = async (returnId) => {
        if (!window.confirm(`Are you sure you want to approve Return #RET-${returnId}?`)) return;
        setActionLoadingId(`approve-return-${returnId}`);
        try {
            await approveOrderReturn(returnId);
            showToast(`Return #RET-${returnId} approved successfully!`);
            fetchData();
        } catch (err) {
            showToast(err.message || 'Failed to approve return', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCompleteReturn = async (returnId) => {
        if (!window.confirm(`Complete Return #RET-${returnId}? This will restock valid items to active inventory.`)) return;
        setActionLoadingId(`complete-return-${returnId}`);
        try {
            await completeOrderReturn(returnId);
            showToast(`Return #RET-${returnId} completed and restocked to inventory!`);
            fetchData();
        } catch (err) {
            showToast(err.message || 'Failed to complete return', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleApproveRefund = async (refundId) => {
        if (!window.confirm(`Approve refund request #REF-${refundId}?`)) return;
        setActionLoadingId(`approve-refund-${refundId}`);
        try {
            await approveRefund(refundId);
            showToast(`Refund #REF-${refundId} approved successfully!`);
            fetchData();
        } catch (err) {
            showToast(err.message || 'Failed to approve refund', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const openRejectModal = (id, type) => {
        setRejectTarget({ id, type });
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!rejectTarget) return;
        const reason = rejectionReason.trim() || 'Return policy terms not met';
        setActionLoadingId(`reject-${rejectTarget.type}-${rejectTarget.id}`);
        try {
            if (rejectTarget.type === 'return') {
                await rejectOrderReturn(rejectTarget.id, reason);
                showToast(`Return #RET-${rejectTarget.id} rejected.`);
            } else {
                await rejectRefund(rejectTarget.id, reason);
                showToast(`Refund #REF-${rejectTarget.id} rejected.`);
            }
            setShowRejectModal(false);
            fetchData();
        } catch (err) {
            showToast(err.message || 'Failed to reject request', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Slip / Receipt Preview Handlers ───────────────────────────────────────
    const handleDownloadSlip = async (returnId) => {
        setActionLoadingId(`slip-${returnId}`);
        try {
            await getOrderReturnSlip(returnId, 'view');
            showToast('Return slip generated and opened in new tab.');
        } catch (err) {
            showToast(err.message || 'Failed to generate return slip', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownloadRefundPdf = async (refundId) => {
        setActionLoadingId(`pdf-${refundId}`);
        try {
            await getRefundReceiptPdf(refundId, 'download');
            showToast('Credit note PDF downloaded.');
        } catch (err) {
            showToast(err.message || 'Failed to download PDF', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownloadRefundThermal = async (refundId) => {
        setActionLoadingId(`thermal-${refundId}`);
        try {
            const res = await getRefundThermalSlip(refundId, { mode: 'preview' });
            if (res?.url) {
                window.open(res.url, '_blank');
                showToast('Thermal receipt preview opened.');
            }
        } catch (err) {
            showToast(err.message || 'Failed to generate thermal receipt', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── View Details Handler ──────────────────────────────────────────────────
    const handleViewDetails = async (returnId) => {
        setShowDetailsModal(true);
        setLoadingDetails(true);
        setDetailsItem(null);
        try {
            const data = await getOrderReturnById(returnId);
            setDetailsItem(data);
        } catch (err) {
            showToast(err.message || 'Failed to load details', 'error');
            setShowDetailsModal(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    // ── Form Items Manipulator ────────────────────────────────────────────────
    const addItemRow = () => {
        setReturnForm((prev) => ({
            ...prev,
            items: [...prev.items, { order_item_id: '', quantity: 1, condition: 'damaged', reason: '' }],
        }));
    };

    const removeItemRow = (idx) => {
        if (returnForm.items.length <= 1) return;
        setReturnForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx),
        }));
    };

    const updateItemRow = (idx, field, val) => {
        setReturnForm((prev) => {
            const updated = [...prev.items];
            updated[idx] = { ...updated[idx], [field]: val };
            return { ...prev, items: updated };
        });
    };

    // ── Submit Create Return / Refund ─────────────────────────────────────────
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormSubmitting(true);

        try {
            if (createMode === 'return') {
                if (!returnForm.order_id) throw new Error('Order ID is required.');
                if (!returnForm.customer_id) throw new Error('Customer ID is required.');

                const finalReason = returnForm.reason === 'Other'
                    ? (returnForm.custom_reason.trim() || 'Other customer return')
                    : returnForm.reason;

                const validItems = returnForm.items
                    .filter((it) => it.order_item_id && Number(it.order_item_id) > 0)
                    .map((it) => ({
                        order_item_id: Number(it.order_item_id),
                        quantity: Number(it.quantity) || 1,
                        condition: it.condition || 'good',
                        reason: it.reason || finalReason,
                    }));

                if (validItems.length === 0) {
                    throw new Error('Please specify at least one valid Order Item ID.');
                }

                await createOrderReturn({
                    order_id: Number(returnForm.order_id),
                    customer_id: Number(returnForm.customer_id),
                    reason: finalReason,
                    remarks: returnForm.remarks,
                    return_type: returnForm.return_type,
                    items: validItems,
                });

                showToast('Order Return request created successfully!');
            } else {
                if (!refundForm.invoice_id) throw new Error('Invoice ID is required.');
                if (!refundForm.refund_amount || Number(refundForm.refund_amount) <= 0) {
                    throw new Error('A valid positive refund amount is required.');
                }

                await createRefund({
                    invoice_id: Number(refundForm.invoice_id),
                    refund_amount: Number(refundForm.refund_amount),
                    refund_method: refundForm.refund_method,
                    reason: refundForm.reason,
                });

                showToast('Refund voucher initiated successfully!');
            }

            setShowCreateModal(false);
            // Reset forms
            setReturnForm({
                order_id: '',
                customer_id: '',
                reason: 'Defective product',
                custom_reason: '',
                remarks: '',
                return_type: 'refund',
                items: [{ order_item_id: '', quantity: 1, condition: 'damaged', reason: '' }],
            });
            setRefundForm({
                invoice_id: '',
                refund_amount: '',
                refund_method: 'cash',
                reason: 'Item returned counter settlement',
            });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Submission failed', 'error');
        } finally {
            setFormSubmitting(false);
        }
    };

    // ── Helper Badges ─────────────────────────────────────────────────────────
    const renderStatusBadge = (status) => {
        const s = String(status || '').toLowerCase();
        let bg = '#f3f4f6';
        let color = '#4b5563';
        let text = status || 'Pending';

        if (s.includes('request') || s.includes('pending')) {
            bg = '#fef3c7';
            color = '#b45309';
            text = 'Requested';
        } else if (s.includes('approv')) {
            bg = '#e0f2fe';
            color = '#0369a1';
            text = 'Approved';
        } else if (s.includes('complete')) {
            bg = '#ecfdf5';
            color = '#047857';
            text = 'Completed';
        } else if (s.includes('reject')) {
            bg = '#fef2f2';
            color = '#b91c1c';
            text = 'Rejected';
        }

        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: bg,
                color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
            }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                {text}
            </span>
        );
    };

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* ── Toast Alert ──────────────────────────────────────────────────── */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: 24,
                    right: 24,
                    zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    animation: 'fadeIn 0.2s ease-in-out',
                }}>
                    {toast.type === 'error' ? <BsExclamationCircleFill size={18} /> : <BsCheckCircleFill size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, display: 'inline-flex' }}>
                            <BsArrowReturnLeft size={22} />
                        </span>
                        Returns & Refunds
                    </h1>
                    <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
                        Customer return requests, inventory restock reversals, and manager refund authorization
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 16px',
                            background: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer',
                        }}
                    >
                        <BsArrowClockwise size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 18px',
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#fff',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                        }}
                    >
                        <BsPlus size={18} />
                        New Return Request
                    </button>
                </div>
            </div>

            {/* ── Top KPI StatCards ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Total Return Requests</span>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: 8, borderRadius: 8 }}><BsArrowReturnLeft size={16} /></span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '10px 0 4px' }}>
                        {stats.total_returns}
                    </p>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                        ₹{Number(stats.total_refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total Value
                    </span>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Pending Approval</span>
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: 8, borderRadius: 8 }}><BsExclamationCircleFill size={16} /></span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#d97706', margin: '10px 0 4px' }}>
                        {stats.requested_count}
                    </p>
                    <span style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>Requires manager authorization</span>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Completed & Restocked</span>
                        <span style={{ background: '#ecfdf5', color: '#059669', padding: 8, borderRadius: 8 }}><BsBoxSeam size={16} /></span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#059669', margin: '10px 0 4px' }}>
                        {stats.completed_count}
                    </p>
                    <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>Inventory returned to shelf</span>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Financial Refunds</span>
                        <span style={{ background: '#f0fdf4', color: '#16a34a', padding: 8, borderRadius: 8 }}><BsCurrencyRupee size={16} /></span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '10px 0 4px' }}>
                        {refundsList.length}
                    </p>
                    <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>Vouchers & direct payouts</span>
                </div>
            </div>

            {/* ── Main Container ───────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {/* ── Tab Switcher Header ──────────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setActiveTab('returns')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                fontSize: 13.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: activeTab === 'returns' ? '#6366f1' : 'transparent',
                                color: activeTab === 'returns' ? '#fff' : '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <BsArrowReturnLeft size={14} />
                            Order Returns & RMAs
                            <span style={{
                                background: activeTab === 'returns' ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                                color: activeTab === 'returns' ? '#fff' : '#374151',
                                padding: '1px 7px',
                                borderRadius: 12,
                                fontSize: 11.5,
                            }}>
                                {returnsList.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('refunds')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                fontSize: 13.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: activeTab === 'refunds' ? '#6366f1' : 'transparent',
                                color: activeTab === 'refunds' ? '#fff' : '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <BsCurrencyRupee size={14} />
                            Financial Refunds
                            <span style={{
                                background: activeTab === 'refunds' ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                                color: activeTab === 'refunds' ? '#fff' : '#374151',
                                padding: '1px 7px',
                                borderRadius: 12,
                                fontSize: 11.5,
                            }}>
                                {refundsList.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('pending')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                fontSize: 13.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: activeTab === 'pending' ? '#6366f1' : 'transparent',
                                color: activeTab === 'pending' ? '#fff' : '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <BsExclamationCircleFill size={14} color={activeTab === 'pending' ? '#fff' : '#d97706'} />
                            Pending Queue
                            {pendingList.length > 0 && (
                                <span style={{
                                    background: '#ef4444',
                                    color: '#fff',
                                    padding: '1px 7px',
                                    borderRadius: 12,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                }}>
                                    {pendingList.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter and Search Bar */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: 280 }}>
                            <BsSearch style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                            <input
                                type="text"
                                placeholder={activeTab === 'returns' ? "Search Return #, Order #..." : "Search Invoice #, Customer..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 36px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {activeTab !== 'pending' && (
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: '#374151',
                                    outline: 'none',
                                    background: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="requested">Requested / Pending</option>
                                <option value="approved">Approved</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* ── Tab Content: 1. Order Returns & RMAs ────────────────────────── */}
                {activeTab === 'returns' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                <tr>
                                    <th style={{ padding: '12px 18px' }}>Return #</th>
                                    <th style={{ padding: '12px 18px' }}>Order ID</th>
                                    <th style={{ padding: '12px 18px' }}>Customer ID</th>
                                    <th style={{ padding: '12px 18px' }}>Reason</th>
                                    <th style={{ padding: '12px 18px' }}>Type</th>
                                    <th style={{ padding: '12px 18px' }}>Refund Value</th>
                                    <th style={{ padding: '12px 18px' }}>Status</th>
                                    <th style={{ padding: '12px 18px' }}>Date</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                            <BsArrowClockwise size={20} className="spin" style={{ marginBottom: 8 }} />
                                            <div>Loading order returns records...</div>
                                        </td>
                                    </tr>
                                ) : filteredReturns.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '48px 18px', textAlign: 'center', color: '#9ca3af' }}>
                                            <BsArrowReturnLeft size={32} style={{ color: '#d1d5db', marginBottom: 8 }} />
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No return records found</div>
                                            <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4 }}>
                                                {search ? "No returns matched your search criteria." : "Create your first customer return request to track RMA items."}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReturns.map((row) => {
                                        const returnNum = row.return_number || `RET-${row.id}`;
                                        const status = String(row.status || '').toLowerCase();
                                        const isActionLoading = actionLoadingId?.includes(String(row.id));

                                        return (
                                            <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#6366f1' }}>
                                                    {returnNum}
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#374151', fontWeight: 600 }}>
                                                    #{row.order_id}
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#4b5563' }}>
                                                    Customer #{row.customer_id}
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#374151', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.reason}>
                                                    {row.reason}
                                                </td>
                                                <td style={{ padding: '14px 18px' }}>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 11.5,
                                                        fontWeight: 600,
                                                        background: row.return_type === 'exchange' ? '#fdf2f8' : '#eef2ff',
                                                        color: row.return_type === 'exchange' ? '#db2777' : '#4f46e5',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {row.return_type || 'refund'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827' }}>
                                                    ₹{Number(row.refund_amount || row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '14px 18px' }}>
                                                    {renderStatusBadge(row.status)}
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#6b7280', fontSize: 12 }}>
                                                    {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        {/* Manager Actions */}
                                                        {(status === 'requested' || status === 'pending') && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApproveReturn(row.id)}
                                                                    disabled={isActionLoading}
                                                                    title="Approve Return"
                                                                    style={{
                                                                        background: '#ecfdf5',
                                                                        border: '1px solid #10b981',
                                                                        color: '#059669',
                                                                        borderRadius: 6,
                                                                        padding: '4px 8px',
                                                                        fontSize: 12,
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 4,
                                                                    }}
                                                                >
                                                                    <BsCheckLg size={13} /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => openRejectModal(row.id, 'return')}
                                                                    disabled={isActionLoading}
                                                                    title="Reject Return"
                                                                    style={{
                                                                        background: '#fef2f2',
                                                                        border: '1px solid #ef4444',
                                                                        color: '#dc2626',
                                                                        borderRadius: 6,
                                                                        padding: '4px 8px',
                                                                        fontSize: 12,
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 4,
                                                                    }}
                                                                >
                                                                    <BsX size={15} /> Reject
                                                                </button>
                                                            </>
                                                        )}

                                                        {status === 'approved' && (
                                                            <button
                                                                onClick={() => handleCompleteReturn(row.id)}
                                                                disabled={isActionLoading}
                                                                title="Complete & Restock Inventory"
                                                                style={{
                                                                    background: '#eff6ff',
                                                                    border: '1px solid #3b82f6',
                                                                    color: '#1d4ed8',
                                                                    borderRadius: 6,
                                                                    padding: '4px 8px',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <BsBoxSeam size={12} /> Restock
                                                            </button>
                                                        )}

                                                        {/* Details and Slip Buttons */}
                                                        <button
                                                            onClick={() => handleViewDetails(row.id)}
                                                            title="View Details"
                                                            style={{
                                                                background: '#f3f4f6',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: 6,
                                                                padding: '4px 8px',
                                                                color: '#374151',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <BsEye size={13} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDownloadSlip(row.id)}
                                                            title="Print/Preview RMA Slip"
                                                            style={{
                                                                background: '#f3f4f6',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: 6,
                                                                padding: '4px 8px',
                                                                color: '#374151',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <BsPrinter size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Tab Content: 2. Financial Refunds ────────────────────────────── */}
                {activeTab === 'refunds' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                <tr>
                                    <th style={{ padding: '12px 18px' }}>Refund ID</th>
                                    <th style={{ padding: '12px 18px' }}>Invoice #</th>
                                    <th style={{ padding: '12px 18px' }}>Customer</th>
                                    <th style={{ padding: '12px 18px' }}>Amount</th>
                                    <th style={{ padding: '12px 18px' }}>Method</th>
                                    <th style={{ padding: '12px 18px' }}>Credit Note #</th>
                                    <th style={{ padding: '12px 18px' }}>Status</th>
                                    <th style={{ padding: '12px 18px' }}>Date</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                            <BsArrowClockwise size={20} className="spin" style={{ marginBottom: 8 }} />
                                            <div>Loading financial refunds...</div>
                                        </td>
                                    </tr>
                                ) : filteredRefunds.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '48px 18px', textAlign: 'center', color: '#9ca3af' }}>
                                            <BsCurrencyRupee size={32} style={{ color: '#d1d5db', marginBottom: 8 }} />
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No financial refund records found</div>
                                            <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4 }}>
                                                Process customer counter refunds or initiate credit notes.
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRefunds.map((row) => {
                                        const status = String(row.status || '').toLowerCase();
                                        const isActionLoading = actionLoadingId?.includes(String(row.id));

                                        return (
                                            <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#6366f1' }}>
                                                    REF-{row.id}
                                                </td>
                                                <td style={{ padding: '14px 18px', fontWeight: 600, color: '#374151' }}>
                                                    {row.invoice_number || `INV-${row.invoice_id}`}
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#4b5563' }}>
                                                    {row.customer_name || (row.customer_id ? `Customer #${row.customer_id}` : 'Walk-in Customer')}
                                                </td>
                                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827' }}>
                                                    ₹{Number(row.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '14px 18px' }}>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 11.5,
                                                        fontWeight: 600,
                                                        background: '#f3f4f6',
                                                        color: '#374151',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {row.refund_method || 'cash'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#4f46e5', fontWeight: 600 }}>
                                                    {row.credit_note_no || (row.credit_note_id ? `CN-${row.credit_note_id}` : '—')}
                                                </td>
                                                <td style={{ padding: '14px 18px' }}>
                                                    {renderStatusBadge(row.status)}
                                                </td>
                                                <td style={{ padding: '14px 18px', color: '#6b7280', fontSize: 12 }}>
                                                    {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        {(status === 'pending' || status === 'requested') && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApproveRefund(row.id)}
                                                                    disabled={isActionLoading}
                                                                    title="Approve Refund"
                                                                    style={{
                                                                        background: '#ecfdf5',
                                                                        border: '1px solid #10b981',
                                                                        color: '#059669',
                                                                        borderRadius: 6,
                                                                        padding: '4px 8px',
                                                                        fontSize: 12,
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => openRejectModal(row.id, 'refund')}
                                                                    disabled={isActionLoading}
                                                                    title="Reject Refund"
                                                                    style={{
                                                                        background: '#fef2f2',
                                                                        border: '1px solid #ef4444',
                                                                        color: '#dc2626',
                                                                        borderRadius: 6,
                                                                        padding: '4px 8px',
                                                                        fontSize: 12,
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleDownloadRefundPdf(row.id)}
                                                            disabled={isActionLoading}
                                                            title="Download Credit Note / Refund PDF"
                                                            style={{
                                                                background: '#eff6ff',
                                                                border: '1px solid #bfdbfe',
                                                                borderRadius: 6,
                                                                padding: '4px 8px',
                                                                color: '#2563eb',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            <BsFileEarmarkPdf size={13} /> PDF
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadRefundThermal(row.id)}
                                                            disabled={isActionLoading}
                                                            title="Preview 80mm ESC/POS Thermal Slip"
                                                            style={{
                                                                background: '#f3f4f6',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: 6,
                                                                padding: '4px 8px',
                                                                color: '#374151',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            <BsPrinter size={13} /> Thermal
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Tab Content: 3. Pending Approvals Queue ─────────────────────── */}
                {activeTab === 'pending' && (
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <BsShieldCheck size={20} color="#6366f1" />
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                Manager Review & Authorization Queue
                            </h3>
                        </div>
                        {pendingList.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', border: '1px dashed #e5e7eb', borderRadius: 10 }}>
                                <BsCheckCircleFill size={32} style={{ color: '#10b981', marginBottom: 8 }} />
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>All Caught Up!</div>
                                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                                    There are currently no refund or return requests awaiting manager sign-off.
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                {pendingList.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            border: '1px solid #fcd34d',
                                            borderRadius: 12,
                                            padding: 16,
                                            background: '#fffbeb',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 700, color: '#b45309', fontSize: 13 }}>REF-{item.id}</span>
                                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                                Pending Review
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                                            <strong>Invoice:</strong> {item.invoice_number || `INV-${item.invoice_id}`}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                                            <strong>Customer:</strong> {item.customer_name || 'Walk-in Customer'}
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '8px 0' }}>
                                            ₹{Number(item.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                                            {item.reason || 'No remarks provided'}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => handleApproveRefund(item.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    background: '#10b981',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    fontWeight: 600,
                                                    fontSize: 12.5,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(item.id, 'refund')}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    background: '#ef4444',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    fontWeight: 600,
                                                    fontSize: 12.5,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modal: Create New Return / Refund ────────────────────────────── */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: 20,
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 14,
                        width: '100%',
                        maxWidth: 620,
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '24px 28px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                    Create Return or Refund
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                                    Submit customer order return or direct invoice counter settlement
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {/* Segmented Mode Control */}
                        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 20 }}>
                            <button
                                type="button"
                                onClick={() => setCreateMode('return')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    background: createMode === 'return' ? '#fff' : 'transparent',
                                    color: createMode === 'return' ? '#4f46e5' : '#6b7280',
                                    boxShadow: createMode === 'return' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                Order Return (Item RMA)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateMode('refund')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    background: createMode === 'refund' ? '#fff' : 'transparent',
                                    color: createMode === 'refund' ? '#4f46e5' : '#6b7280',
                                    boxShadow: createMode === 'refund' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                Direct Invoice Refund
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit}>
                            {createMode === 'return' ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Order ID <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="e.g. 101"
                                                value={returnForm.order_id}
                                                onChange={(e) => setReturnForm({ ...returnForm, order_id: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Customer ID <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="e.g. 1"
                                                value={returnForm.customer_id}
                                                onChange={(e) => setReturnForm({ ...returnForm, customer_id: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Return Reason
                                            </label>
                                            <select
                                                value={returnForm.reason}
                                                onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
                                            >
                                                <option value="Defective product">Defective product</option>
                                                <option value="Damaged in transit">Damaged in transit</option>
                                                <option value="Wrong item received">Wrong item received</option>
                                                <option value="Size / Fit mismatch">Size / Fit mismatch</option>
                                                <option value="Customer changed mind">Customer changed mind</option>
                                                <option value="Other">Other (Custom reason)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Return Type
                                            </label>
                                            <select
                                                value={returnForm.return_type}
                                                onChange={(e) => setReturnForm({ ...returnForm, return_type: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
                                            >
                                                <option value="refund">Refund (Credit back / Cash)</option>
                                                <option value="exchange">Exchange (Replacement Item)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {returnForm.reason === 'Other' && (
                                        <div style={{ marginBottom: 14 }}>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Specify Custom Reason <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Explain return reason..."
                                                value={returnForm.custom_reason}
                                                onChange={(e) => setReturnForm({ ...returnForm, custom_reason: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                                            />
                                        </div>
                                    )}

                                    {/* Items Table */}
                                    <div style={{ marginBottom: 14, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>
                                                Items to Return
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addItemRow}
                                                style={{
                                                    background: '#eef2ff',
                                                    color: '#4f46e5',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    padding: '3px 8px',
                                                    fontSize: 11.5,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                + Add Another Item
                                            </button>
                                        </div>

                                        {returnForm.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    required
                                                    placeholder="Order Item ID"
                                                    value={item.order_item_id}
                                                    onChange={(e) => updateItemRow(idx, 'order_item_id', e.target.value)}
                                                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}
                                                />
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                                                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}
                                                />
                                                <select
                                                    value={item.condition}
                                                    onChange={(e) => updateItemRow(idx, 'condition', e.target.value)}
                                                    style={{ padding: '7px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, background: '#fff' }}
                                                >
                                                    <option value="good">Good / Restockable</option>
                                                    <option value="damaged">Damaged</option>
                                                    <option value="defective">Defective</option>
                                                </select>
                                                {returnForm.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItemRow(idx)}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                                                    >
                                                        <BsX size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginBottom: 18 }}>
                                        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                            Cashier Remarks (Optional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Internal notes or customer comments..."
                                            value={returnForm.remarks}
                                            onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical' }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: 14 }}>
                                        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                            Invoice ID <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="e.g. 1"
                                            value={refundForm.invoice_id}
                                            onChange={(e) => setRefundForm({ ...refundForm, invoice_id: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Refund Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                placeholder="0.00"
                                                value={refundForm.refund_amount}
                                                onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                Refund Settlement Method <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <select
                                                value={refundForm.refund_method}
                                                onChange={(e) => setRefundForm({ ...refundForm, refund_method: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
                                            >
                                                <option value="cash">Cash (Counter Payout)</option>
                                                <option value="upi">UPI / Online Refund</option>
                                                <option value="store_credit">Store Credit / Credit Note Voucher</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 18 }}>
                                        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                            Refund Reason
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Reason for refund settlement..."
                                            value={refundForm.reason}
                                            onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                                        />
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{
                                        padding: '10px 18px',
                                        background: '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: 13.5,
                                        fontWeight: 600,
                                        color: '#374151',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    style={{
                                        padding: '10px 22px',
                                        background: '#6366f1',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 13.5,
                                        fontWeight: 600,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {formSubmitting && <BsArrowClockwise size={14} className="spin" />}
                                    {createMode === 'return' ? 'Submit Return Request' : 'Issue Refund'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Rejection Reason ──────────────────────────────────────── */}
            {showRejectModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: 20,
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 14,
                        width: '100%',
                        maxWidth: 440,
                        padding: '24px 28px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ background: '#fee2e2', color: '#ef4444', padding: 8, borderRadius: 8 }}>
                                <BsXCircleFill size={18} />
                            </span>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                                Reject {rejectTarget?.type === 'return' ? 'Return' : 'Refund'} Request
                            </h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                            Please provide a formal rejection reason for audit logs and customer notification:
                        </p>
                        <textarea
                            rows={3}
                            required
                            placeholder="e.g. Returned after 15 days window, product tag missing..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                fontSize: 13,
                                marginBottom: 18,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                style={{
                                    padding: '8px 18px',
                                    background: '#ef4444',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Return Details ────────────────────────────────────────── */}
            {showDetailsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: 20,
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 14,
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '24px 28px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                Return Specification
                            </h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {loadingDetails || !detailsItem ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                <BsArrowClockwise size={20} className="spin" />
                                <div style={{ marginTop: 8 }}>Loading return information...</div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>RETURN NUMBER</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5', marginTop: 2 }}>
                                            {detailsItem.return_number || `RET-${detailsItem.id}`}
                                        </div>
                                    </div>
                                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>STATUS</div>
                                        <div style={{ marginTop: 2 }}>{renderStatusBadge(detailsItem.status)}</div>
                                    </div>
                                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>ORDER ID</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>
                                            #{detailsItem.order_id}
                                        </div>
                                    </div>
                                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>REFUND AMOUNT</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                                            ₹{Number(detailsItem.refund_amount || detailsItem.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>PRIMARY REASON</div>
                                    <div style={{ fontSize: 13, color: '#111827', background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>
                                        {detailsItem.reason || 'Not specified'}
                                    </div>
                                </div>

                                {detailsItem.remarks && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>REMARKS / NOTES</div>
                                        <div style={{ fontSize: 13, color: '#111827', background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>
                                            {detailsItem.remarks}
                                        </div>
                                    </div>
                                )}

                                {Array.isArray(detailsItem.items) && detailsItem.items.length > 0 && (
                                    <div style={{ marginBottom: 18 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>RETURNED ITEMS LIST</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                                            <thead style={{ background: '#f3f4f6' }}>
                                                <tr>
                                                    <th style={{ padding: '8px 10px' }}>Item ID</th>
                                                    <th style={{ padding: '8px 10px' }}>Quantity</th>
                                                    <th style={{ padding: '8px 10px' }}>Condition</th>
                                                    <th style={{ padding: '8px 10px' }}>Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailsItem.items.map((it, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>#{it.order_item_id}</td>
                                                        <td style={{ padding: '8px 10px' }}>{it.quantity}</td>
                                                        <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{it.condition || 'good'}</td>
                                                        <td style={{ padding: '8px 10px', color: '#6b7280' }}>{it.reason || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                                    <button
                                        onClick={() => handleDownloadSlip(detailsItem.id)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#eef2ff',
                                            color: '#4f46e5',
                                            border: '1px solid #c7d2fe',
                                            borderRadius: 6,
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <BsPrinter size={14} /> Open Return Slip
                                    </button>
                                    <button
                                        onClick={() => setShowDetailsModal(false)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#f3f4f6',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 6,
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ReturnsRefundsPage;
