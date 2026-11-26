import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BsClockHistory, BsCheckCircleFill, BsTruck, BsCurrencyRupee,
    BsXCircleFill, BsDownload, BsSearch, BsEye,
    BsChevronLeft, BsChevronRight, BsArrowRepeat,
    BsPlusLg, BsCheckLg, BsBoxSeam, BsPrinter, BsPencilSquare,
    BsXCircle, BsArrowLeftRight, BsCheck2Circle, BsExclamationTriangleFill
} from 'react-icons/bs';
import apiClient from '../../services/api';
import {
    getOrderReturns,
    getOrderReturnStats,
    getOrderReturnById,
    createOrderReturn,
    updateOrderReturn,
    updateOrderReturnStatus,
    approveOrderReturn,
    rejectOrderReturn,
    completeOrderReturn,
    createExchangeOrder,
    getOrderReturnSlip,
} from '../../services/returnRefundService';

const PAGE_SIZE = 6;
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const defaultStatusCfg = { color: '#6b7280', bg: '#f3f4f6', icon: <BsClockHistory size={10} /> };

const statusCfg = {
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsClockHistory size={10} /> },
    Approved: { color: '#6366f1', bg: '#eef2ff', icon: <BsCheckCircleFill size={10} /> },
    'Pickup Scheduled': { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsTruck size={10} /> },
    Refunded: { color: '#10b981', bg: '#ecfdf5', icon: <BsCurrencyRupee size={10} /> },
    Rejected: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={10} /> },
    Processing: { color: '#3b82f6', bg: '#eff6ff', icon: <BsClockHistory size={10} /> },
    Completed: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={10} /> },
};

const defaultReasonCfg = { color: '#6b7280', bg: '#f3f4f6', icon: '📦' };

const reasonCfg = {
    'Defective Product': { color: '#ef4444', bg: '#fef2f2', icon: '🔧' },
    'Wrong Product': { color: '#f59e0b', bg: '#fffbeb', icon: '📦' },
    'Damaged Product': { color: '#8b5cf6', bg: '#f5f3ff', icon: '💥' },
};

/* ── Return Decision Modal ─────────────── */
const ReturnModal = ({
    request,
    onClose,
    onAction,
    onApprove,
    onComplete,
    onReject,
    onPrintSlip,
    onExchange,
    onEdit
}) => {
    const [decision, setDecision] = useState(request.status);
    const [refundMethod, setRefundMethod] = useState(request.refundMethod === 'N/A' ? 'Original Payment' : request.refundMethod);
    const [pickupDate, setPickupDate] = useState(request.pickupDate || '');
    const [notes, setNotes] = useState('');

    const workflow = ['Pending', 'Approved', 'Pickup Scheduled', 'Refunded'];
    const currentStep = workflow.indexOf(request.status);

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Return Request {request.id}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Order {request.orderId} · {request.date}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Return Workflow */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Return Workflow</p>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {workflow.map((step, i) => (
                            <React.Fragment key={step}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= currentStep ? '#6366f1' : '#e5e7eb', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                        {i < currentStep ? '✓' : i + 1}
                                    </div>
                                    <span style={{ fontSize: 9, color: i <= currentStep ? '#6366f1' : '#9ca3af', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', maxWidth: 60 }}>{step}</span>
                                </div>
                                {i < workflow.length - 1 && (
                                    <div style={{ flex: 1, height: 2, background: i < currentStep ? '#6366f1' : '#e5e7eb', margin: '0 4px', marginBottom: 20 }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Modal Quick Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4f46e5', borderColor: '#c7d2fe' }}
                        onClick={() => onPrintSlip && onPrintSlip(request)}
                        title="Print / View Printable RMA Return Slip (GET /slip)"
                    >
                        <BsPrinter size={13} /> Print RMA Slip
                    </button>
                    {request.status !== 'Approved' && request.status !== 'Refunded' && request.status !== 'Rejected' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                            onClick={() => { onApprove && onApprove(request); onClose(); }}
                            title="Approve Return Request (POST /approve)"
                        >
                            <BsCheckLg size={13} /> Approve Return
                        </button>
                    )}
                    {(request.status === 'Approved' || request.status === 'Pickup Scheduled') && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                            onClick={() => { onComplete && onComplete(request); onClose(); }}
                            title="Complete Return & Restock (POST /complete)"
                        >
                            <BsBoxSeam size={13} /> Complete & Restock
                        </button>
                    )}
                    {request.status !== 'Refunded' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0284c7', borderColor: '#bae6fd' }}
                            onClick={() => { onExchange && onExchange(request); onClose(); }}
                            title="Generate Replacement Exchange Order (POST /exchange)"
                        >
                            <BsArrowLeftRight size={13} /> Exchange Order
                        </button>
                    )}
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2563eb', borderColor: '#bfdbfe' }}
                        onClick={() => { onEdit && onEdit(request); onClose(); }}
                        title="Edit Return Details (PATCH)"
                    >
                        <BsPencilSquare size={13} /> Edit Details
                    </button>
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Customer', value: request.customer },
                        { label: 'Customer Email', value: request.email },
                        { label: 'Product', value: (request.product && request.product.toLowerCase() !== 'product') ? request.product : '—' },
                        { label: 'Product SKU', value: request.sku || '—' },
                        { label: 'Quantity', value: `${request.qty} item(s)` },
                        { label: 'Condition', value: request.condition ? String(request.condition).toUpperCase() : 'SELLABLE' },
                        { label: 'Return Reason', value: request.reason },
                        { label: 'Refund Amount', value: fmt(request.amount) },
                        { label: 'Refund Method', value: request.refundMethod },
                        { label: 'Refund Status', value: request.refundStatus },
                    ].map((f, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{f.value}</p>
                        </div>
                    ))}
                </div>

                {/* Returned Items Breakdown (if items array present) */}
                {request.items && request.items.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Returned Items Breakdown ({request.items.length})
                        </p>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            {request.items.map((it, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderBottom: idx < request.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                                    fontSize: 12
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 600, color: '#111827' }}>{it.product_name || it.name || request.product}</p>
                                        <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#64748b', marginTop: 2, flexWrap: 'wrap' }}>
                                            {it.sku && <span style={{ fontFamily: 'monospace' }}>SKU: {it.sku}</span>}
                                            {it.condition && <span>• Condition: <strong>{it.condition}</strong></span>}
                                            {it.reason && <span>• Reason: {it.reason}</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                                        <p style={{ fontWeight: 700, color: '#111827' }}>
                                            {it.total_amount ? fmt(it.total_amount) : (it.unit_price ? fmt(Number(it.unit_price) * (Number(it.quantity) || 1)) : fmt(request.amount))}
                                        </p>
                                        <p style={{ fontSize: 11, color: '#9ca3af' }}>Qty: {it.quantity || 1} {it.unit_price ? `@ ${fmt(it.unit_price)}` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Customer description */}
                <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, border: '1px solid #fde047' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>📝 Customer's Description</p>
                    <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{request.description}</p>
                </div>

                {/* Decision */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Update Status</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                        {['Pending', 'Approved', 'Pickup Scheduled', 'Refunded'].map(s => {
                            const sc = statusCfg[s] || defaultStatusCfg;
                            const isSelected = decision === s;
                            return (
                                <button key={s} onClick={() => setDecision(s)}
                                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${isSelected ? sc.color : '#e5e7eb'}`, background: isSelected ? sc.bg : '#fff', color: isSelected ? sc.color : '#6b7280' }}>
                                    {s}
                                </button>
                            );
                        })}
                        <button onClick={() => { onReject && onReject(request); onClose(); }}
                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #ef4444', background: '#fef2f2', color: '#ef4444' }}>
                            Reject
                        </button>
                    </div>

                    {(decision === 'Approved' || decision === 'Pickup Scheduled') && (
                        <div className="ec-form-row" style={{ marginBottom: 12 }}>
                            <div className="ec-field">
                                <label>Refund Method</label>
                                <select className="ec-input" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                                    <option>Original Payment</option>
                                    <option>Wallet Credit</option>
                                </select>
                            </div>
                            <div className="ec-field">
                                <label>Pickup Date</label>
                                <input className="ec-input" type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div className="ec-field" style={{ marginBottom: 14 }}>
                        <label>Internal Notes (Optional)</label>
                        <textarea className="ec-textarea" rows={2} placeholder="Add notes for the team..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="adm-btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="adm-btn-primary" onClick={() => { onAction(request.id, decision, notes); onClose(); }}>
                            <BsCheckCircleFill size={13} /> Update Status
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Create Return Modal (POST /api/v1/order-returns) ──────────────── */
const CreateReturnModal = ({ onClose, onSuccess }) => {
    const [orderId, setOrderId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [reason, setReason] = useState('Incorrect size');
    const [customReason, setCustomReason] = useState('');
    const [returnType, setReturnType] = useState('refund');
    const [orderItemId, setOrderItemId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState('sellable');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!orderId) {
            setError('Order ID is required.');
            return;
        }
        if (!customerId) {
            setError('Customer ID is required.');
            return;
        }
        const finalReason = reason === 'Other' ? (customReason.trim() || 'Other reason') : reason;
        if (!finalReason || finalReason.trim().length < 3) {
            setError('Reason must be at least 3 characters.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const payload = {
                order_id: Number(orderId),
                customer_id: Number(customerId),
                reason: finalReason,
                return_type: returnType,
                remarks: remarks.trim(),
            };
            if (orderItemId) {
                payload.items = [{
                    order_item_id: Number(orderItemId),
                    quantity: Number(quantity) || 1,
                    reason: finalReason,
                    condition: condition,
                }];
            }
            await createOrderReturn(payload);
            onSuccess('Return request created successfully via POST /api/v1/order-returns!');
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create return request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Create New Return Request</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>POST /api/v1/order-returns</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '6px 0' }}>
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                            {error}
                        </div>
                    )}

                    <div className="ec-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Order ID *</label>
                            <input
                                className="ec-input"
                                type="number"
                                placeholder="e.g. 60"
                                value={orderId}
                                onChange={e => setOrderId(e.target.value)}
                                required
                            />
                        </div>
                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Customer ID *</label>
                            <input
                                className="ec-input"
                                type="number"
                                placeholder="e.g. 1"
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="ec-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Return Type</label>
                            <select className="ec-input" value={returnType} onChange={e => setReturnType(e.target.value)}>
                                <option value="refund">Refund</option>
                                <option value="exchange">Exchange</option>
                            </select>
                        </div>
                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Reason *</label>
                            <select className="ec-input" value={reason} onChange={e => setReason(e.target.value)}>
                                <option value="Incorrect size">Incorrect size</option>
                                <option value="Defective Product">Defective Product</option>
                                <option value="Wrong Product">Wrong Product</option>
                                <option value="Damaged in transit">Damaged in transit</option>
                                <option value="Other">Other Reason</option>
                            </select>
                        </div>
                    </div>

                    {reason === 'Other' && (
                        <div className="ec-field" style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Specific Reason *</label>
                            <input
                                className="ec-input"
                                placeholder="Describe return reason..."
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                            />
                        </div>
                    )}

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Item Details (Optional)</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div className="ec-field">
                                <label style={{ fontSize: 10, color: '#64748b' }}>Order Item ID</label>
                                <input
                                    className="ec-input"
                                    type="number"
                                    placeholder="e.g. 59"
                                    value={orderItemId}
                                    onChange={e => setOrderItemId(e.target.value)}
                                />
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 10, color: '#64748b' }}>Quantity</label>
                                <input
                                    className="ec-input"
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                />
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 10, color: '#64748b' }}>Condition</label>
                                <select className="ec-input" value={condition} onChange={e => setCondition(e.target.value)}>
                                    <option value="sellable">Sellable</option>
                                    <option value="defective">Defective</option>
                                    <option value="damaged">Damaged</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="ec-field" style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Remarks / Notes</label>
                        <textarea
                            className="ec-textarea"
                            rows={2}
                            placeholder="Customer note or internal remarks..."
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting}>
                            {submitting ? 'Creating...' : <><BsPlusLg size={13} /> Create Return</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Edit Return Modal (PATCH /api/v1/order-returns/{id}) ──────────── */
const EditReturnModal = ({ request, onClose, onSuccess }) => {
    const [reason, setReason] = useState(request.reason || '');
    const [remarks, setRemarks] = useState(request.description !== '—' ? request.description : '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await updateOrderReturn(request.rawId, {
                reason: reason.trim(),
                remarks: remarks.trim(),
            });
            onSuccess(`Return ${request.id} updated successfully via PATCH /order-returns!`);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to update return details.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Edit Return Details</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>PATCH /api/v1/order-returns/{request.rawId}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '6px 0' }}>
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                            {error}
                        </div>
                    )}

                    <div className="ec-field" style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Return Reason</label>
                        <input
                            className="ec-input"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            required
                        />
                    </div>

                    <div className="ec-field" style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Remarks / Notes</label>
                        <textarea
                            className="ec-textarea"
                            rows={3}
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Reject Return Modal (POST /api/v1/order-returns/{id}/reject) ──── */
const RejectReturnModal = ({ request, onClose, onSuccess }) => {
    const [reason, setReason] = useState('Return policy terms not met');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleReject = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await rejectOrderReturn(request.rawId, reason.trim() || 'Return policy terms not met');
            onSuccess(`Return ${request.id} rejected via POST /reject!`);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to reject return.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#ef4444' }}>Reject Return {request.id}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>POST /api/v1/order-returns/{request.rawId}/reject</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleReject} style={{ padding: '6px 0' }}>
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                            {error}
                        </div>
                    )}

                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                        Are you sure you want to reject return request <strong>{request.id}</strong>?
                    </p>

                    <div className="ec-field" style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Rejection Reason</label>
                        <textarea
                            className="ec-textarea"
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} disabled={submitting}>
                            {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Exchange Modal (POST /api/v1/order-returns/{id}/exchange) ──────── */
const ExchangeModal = ({ request, onClose, onSuccess }) => {
    const [notes, setNotes] = useState('Exchange order generated for replacement');
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState(request.qty || 1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleExchange = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                notes: notes.trim(),
                exchange_items: productId ? [{ product_id: Number(productId), quantity: Number(quantity) || 1 }] : [],
            };
            await createExchangeOrder(request.rawId, payload);
            onSuccess(`Exchange order generated for ${request.id} via POST /exchange!`);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to generate exchange order.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Generate Exchange Order</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>POST /api/v1/order-returns/{request.rawId}/exchange</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleExchange} style={{ padding: '6px 0' }}>
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                            {error}
                        </div>
                    )}

                    <div className="ec-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Replacement Product ID</label>
                            <input
                                className="ec-input"
                                type="number"
                                placeholder="e.g. 3"
                                value={productId}
                                onChange={e => setProductId(e.target.value)}
                            />
                        </div>
                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Quantity</label>
                            <input
                                className="ec-input"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="ec-field" style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Exchange Notes</label>
                        <textarea
                            className="ec-textarea"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting}>
                            {submitting ? 'Generating...' : <><BsArrowLeftRight size={13} /> Create Exchange</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Main Component ──────────────────── */
const ReturnManagement = () => {
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterReason, setFilterReason] = useState('All Reasons');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState(null);
    const [toast, setToast] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [exchangeTarget, setExchangeTarget] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 5000);
    };

    const allStatuses = ['All', 'Pending', 'Approved', 'Pickup Scheduled', 'Refunded', 'Rejected'];

    const allReasons = React.useMemo(() => {
        const standard = ['All Reasons', 'Incorrect size', 'Defective Product', 'Wrong Product', 'Damaged in transit'];
        const fromData = requests.map(r => r.reason).filter(Boolean);
        return Array.from(new Set([...standard, ...fromData]));
    }, [requests]);

    const normalizeStatus = (raw) => {
        if (!raw) return 'Pending';
        const s = String(raw).trim().toLowerCase().replace(/[_-]/g, ' ');
        if (s.includes('pickup') || s.includes('schedule')) return 'Pickup Scheduled';
        if (s.includes('refund') || s.includes('complete') || s.includes('return')) return 'Refunded';
        if (s.includes('reject') || s.includes('declin') || s.includes('cancel')) return 'Rejected';
        if (s.includes('approv') || s.includes('accept')) return 'Approved';
        if (s.includes('process') || s.includes('progress')) return 'Processing';
        if (s.includes('pend') || s.includes('request') || s.includes('open') || s.includes('init')) return 'Pending';
        return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const fetchReturns = React.useCallback(async () => {
        setLoading(true);
        try {
            const [listData, statsData] = await Promise.all([
                getOrderReturns().catch(err => {
                    console.warn('[ReturnManagement] getOrderReturns fallback:', err.message);
                    return apiClient.get('/order-returns').then(res => res?.data || res);
                }),
                getOrderReturnStats().catch(err => {
                    console.warn('[ReturnManagement] getOrderReturnStats fallback:', err.message);
                    return apiClient.get('/order-returns/stats').then(res => res?.data || res).catch(() => null);
                })
            ]);

            if (statsData && typeof statsData === 'object') {
                setStats(statsData);
            }

            const raw = listData;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.items)
                ? raw.items
                : Array.isArray(raw?.returns)
                ? raw.returns
                : Array.isArray(raw?.results)
                ? raw.results
                : (raw && typeof raw === 'object' && Object.values(raw).find(Array.isArray)) || [];

            const mapped = list.map(item => {
                const itemsList = Array.isArray(item.items)
                    ? item.items
                    : Array.isArray(item.order_items)
                    ? item.order_items
                    : Array.isArray(item.return_items)
                    ? item.return_items
                    : [];

                const extractName = (it) => {
                    if (!it) return '';
                    if (typeof it === 'string') {
                        const trimmed = it.trim();
                        return (trimmed.toLowerCase() === 'product' || trimmed.toLowerCase() === 'product name') ? '' : trimmed;
                    }
                    const name = it.product_name || it.name || it.product_title || it.title || '';
                    if (name && typeof name === 'string') {
                        const trimmed = name.trim();
                        return (trimmed.toLowerCase() === 'product' || trimmed.toLowerCase() === 'product name') ? '' : trimmed;
                    }
                    if (it.product) return extractName(it.product);
                    return '';
                };

                const productNamesFromItems = itemsList.map(extractName).filter(Boolean).join(', ');
                const directProductName = extractName(item.product_name) || extractName(item.product);
                const finalProductName = productNamesFromItems || directProductName || (itemsList[0]?.sku ? `SKU: ${itemsList[0].sku}` : (item.sku ? `SKU: ${item.sku}` : '—'));

                const itemsQty = itemsList.reduce((sum, it) => sum + (Number(it.quantity || it.qty) || 0), 0);
                const finalQty = itemsQty > 0 ? itemsQty : (Number(item.quantity || item.qty) || 1);

                const itemsTotalAmount = itemsList.reduce((sum, it) => {
                    const itAmt = Number(it.total_amount) || (Number(it.unit_price || 0) * Number(it.quantity || 1)) || 0;
                    return sum + itAmt;
                }, 0);
                const finalAmount = Number(item.refund_amount || item.amount || 0) || itemsTotalAmount || 0;

                const firstItem = itemsList[0] || {};
                const sku = firstItem.sku || item.sku || '';
                const condition = firstItem.condition || item.condition || '';
                const unitPrice = firstItem.unit_price || item.unit_price || null;

                // Prefer concise reason from item (e.g. "Incorrect size") or top-level reason
                const rawReason = firstItem.reason || item.reason || item.return_reason || 'Wrong Product';
                const reasonText = (rawReason && typeof rawReason === 'string') ? rawReason : 'Wrong Product';

                const notesOrDesc = item.notes || item.description || item.remarks || (item.reason && item.reason !== reasonText ? item.reason : '') || '—';

                // Customer resolution
                const customerName = (typeof item.customer === 'string' && item.customer.toLowerCase() !== 'customer' ? item.customer : '') ||
                    item.customer_name ||
                    (item.customer && typeof item.customer === 'object' ? (item.customer.name || item.customer.full_name || item.customer.customer_name) : '') ||
                    (item.user && typeof item.user === 'object' ? (item.user.name || item.user.full_name) : '') ||
                    item.user_name ||
                    (item.order && typeof item.order === 'object' ? (item.order.customer_name || item.order.customer) : '') ||
                    (item.customer_id ? `Customer #${item.customer_id}` : 'Customer');

                const customerEmail = item.customer_email ||
                    item.email ||
                    (item.customer && typeof item.customer === 'object' ? item.customer.email : '') ||
                    (item.user && typeof item.user === 'object' ? item.user.email : '') ||
                    (item.order && typeof item.order === 'object' ? (item.order.customer_email || item.order.email) : '') ||
                    '—';

                const normalizedSt = normalizeStatus(item.status);
                const isAlreadyRefunded = normalizedSt === 'Refunded' ||
                    String(item.status || '').toLowerCase().includes('refund') ||
                    String(item.status || '').toLowerCase().includes('complete');

                const refundStatus = item.refund_status
                    ? (item.refund_status.toLowerCase() === 'completed' || item.refund_status.toLowerCase() === 'refunded' ? 'Completed' : item.refund_status)
                    : (isAlreadyRefunded ? 'Completed' : 'Pending');

                return {
                    id: item.id ? `RET-${String(item.id).padStart(3, '0')}` : item.return_number || `RET-${Date.now()}`,
                    rawId: item.id,
                    orderId: item.order_number || (item.order_id ? `ONL-${item.order_id}` : '—'),
                    customer: customerName,
                    email: customerEmail,
                    date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.date || '—'),
                    product: finalProductName,
                    qty: finalQty,
                    amount: finalAmount,
                    reason: reasonText,
                    description: notesOrDesc,
                    status: normalizedSt,
                    pickupDate: item.pickup_date || null,
                    refundMethod: item.refund_method || 'Original Payment',
                    refundStatus: refundStatus,
                    items: itemsList,
                    sku: sku,
                    condition: condition,
                    unitPrice: unitPrice,
                    raw: item,
                };
            });
            setRequests(mapped);
        } catch (err) {
            console.warn('[ReturnManagement] Failed to fetch returns:', err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const filtered = requests.filter(r => {
        const query = search.toLowerCase();
        const matchSearch = String(r.id).toLowerCase().includes(query) ||
            String(r.orderId).toLowerCase().includes(query) ||
            String(r.customer).toLowerCase().includes(query) ||
            String(r.product).toLowerCase().includes(query) ||
            String(r.sku || '').toLowerCase().includes(query);
        const matchStatus = filterStatus === 'All' || r.status === filterStatus;
        const matchReason = filterReason === 'All Reasons' || r.reason === filterReason;
        return matchSearch && matchStatus && matchReason;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── CRUD Action Handlers (Wired to OpenAPI Endpoints) ──
    const handleView = async (r) => {
        setSelected(r);
        try {
            if (r.rawId) {
                const fresh = await getOrderReturnById(r.rawId);
                if (fresh && typeof fresh === 'object') {
                    setSelected(prev => ({ ...prev, ...fresh, raw: fresh }));
                }
            }
        } catch (_) {}
    };

    const handleApprove = async (r) => {
        setActionLoading(r.id);
        try {
            await approveOrderReturn(r.rawId);
            showToast(`Return ${r.id} approved successfully via POST /approve!`);
            await fetchReturns();
        } catch (err) {
            showToast(err.message || 'Failed to approve return.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleComplete = async (r) => {
        setActionLoading(r.id);
        try {
            await completeOrderReturn(r.rawId);
            showToast(`Return ${r.id} completed & inventory restocked via POST /complete!`);
            await fetchReturns();
        } catch (err) {
            showToast(err.message || 'Failed to complete return.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePrintSlip = async (r) => {
        try {
            showToast(`Generating Return Slip for ${r.id}...`);
            await getOrderReturnSlip(r.rawId, 'view');
        } catch (err) {
            showToast(err.message || 'Failed to generate return slip.', 'error');
        }
    };

    const handleStatusUpdate = async (id, newStatus, remarks = '') => {
        const target = requests.find(r => r.id === id);
        if (target && target.rawId) {
            try {
                await updateOrderReturnStatus(target.rawId, newStatus.toLowerCase(), remarks);
                showToast(`Return ${id} status updated to ${newStatus} via PATCH /status!`);
                await fetchReturns();
            } catch (err) {
                showToast(err.message || 'Failed to update status.', 'error');
            }
        }
    };

    const handleAction = handleStatusUpdate;

    const handleExport = () => {
        const listToExport = filtered.length > 0 ? filtered : requests;
        if (!listToExport || listToExport.length === 0) return;
        const headers = ['Return ID', 'Order ID', 'Customer', 'Email', 'Product', 'SKU', 'Condition', 'Qty', 'Amount', 'Reason', 'Refund Method', 'Refund Status', 'Date', 'Status'];
        const rows = listToExport.map(r => [
            `"${r.id}"`,
            `"${r.orderId}"`,
            `"${r.customer}"`,
            `"${r.email}"`,
            `"${r.product}"`,
            `"${r.sku || ''}"`,
            `"${r.condition || ''}"`,
            r.qty,
            r.amount,
            `"${r.reason}"`,
            `"${r.refundMethod}"`,
            `"${r.refundStatus}"`,
            `"${r.date}"`,
            `"${r.status}"`
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `returns_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const kpis = [
        {
            label: 'Total Requests',
            statusFilter: 'All',
            value: stats?.total_returns ?? requests.length,
            color: '#6366f1',
            bg: '#eef2ff',
            badgeBg: '#eef2ff',
            badgeColor: '#6366f1',
            badgeText: 'Total',
            icon: <BsArrowRepeat size={18} />,
            sub: 'All return records'
        },
        {
            label: 'Pending Review',
            statusFilter: 'Pending',
            value: stats?.requested_count ?? stats?.pending_count ?? requests.filter(r => r.status === 'Pending').length,
            color: '#f59e0b',
            bg: '#fffbeb',
            badgeBg: '#fffbeb',
            badgeColor: '#f59e0b',
            badgeText: 'Pending',
            icon: <BsClockHistory size={18} />,
            sub: 'Awaiting action'
        },
        {
            label: 'Pickup Scheduled',
            statusFilter: 'Pickup Scheduled',
            value: requests.filter(r => r.status === 'Pickup Scheduled').length,
            color: '#0ea5e9',
            bg: '#f0f9ff',
            badgeBg: '#f0f9ff',
            badgeColor: '#0ea5e9',
            badgeText: 'In Transit',
            icon: <BsTruck size={18} />,
            sub: 'Courier pickup scheduled'
        },
        {
            label: 'Refund Completed',
            statusFilter: 'Refunded',
            value: stats?.completed_count ?? requests.filter(r => r.status === 'Refunded').length,
            color: '#10b981',
            bg: '#ecfdf5',
            badgeBg: '#ecfdf5',
            badgeColor: '#10b981',
            badgeText: 'Completed',
            icon: <BsCheckCircleFill size={18} />,
            sub: 'Successfully refunded'
        },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#eef2ff',
                            color: '#6366f1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <BsArrowRepeat size={17} />
                        </span>
                        Return Requests
                    </h1>
                    <p className="adm-page-sub">Process customer return requests and manage refunds</p>
                </div>
                <div className="adm-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                        className="adm-btn-secondary"
                        onClick={() => fetchReturns()}
                        disabled={loading}
                        title="Refresh Return Requests and Metrics from API"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsArrowRepeat size={14} className={loading ? 'spin' : ''} /> Refresh
                    </button>
                    <button
                        className="adm-btn-secondary"
                        onClick={handleExport}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsDownload size={14} /> Export
                    </button>
                    <button
                        className="adm-btn-primary"
                        onClick={() => setShowCreateModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsPlusLg size={13} /> Create Return
                    </button>
                </div>
            </div>

            {/* Live Action Notification Toast */}
            {toast && (
                <div style={{
                    marginBottom: 14,
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: toast.type === 'error' ? '#dc2626' : '#15803d',
                    border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {toast.type === 'error' ? <BsExclamationTriangleFill size={16} /> : <BsCheckCircleFill size={16} />}
                        <span>{toast.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 16 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* KPIs */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 6
            }}>
                {kpis.map((k, i) => {
                    const isSelected = filterStatus === k.statusFilter && filterStatus !== 'All';
                    return (
                        <div
                            key={i}
                            className="adm-kpi-card"
                            onClick={() => {
                                setFilterStatus(k.statusFilter);
                                setPage(1);
                            }}
                            title={`Click to filter by ${k.label}`}
                            style={{
                                background: '#ffffff',
                                border: isSelected ? `2px solid ${k.color}` : '1px solid #e8eaf0',
                                borderRadius: 14,
                                padding: '16px 18px',
                                boxShadow: isSelected
                                    ? `0 4px 14px ${k.color}30`
                                    : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.08)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = isSelected
                                    ? `0 4px 14px ${k.color}30`
                                    : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: k.bg,
                                    color: k.color,
                                }}>
                                    {k.icon}
                                </div>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 20,
                                    background: k.badgeBg,
                                    color: k.badgeColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                }}>
                                    {k.badgeText}
                                </span>
                            </div>
                            <div>
                                <p style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    margin: '0 0 6px 0'
                                }}>
                                    {k.label}
                                </p>
                                <p style={{
                                    fontSize: 26,
                                    fontWeight: 800,
                                    color: '#111827',
                                    margin: '0 0 4px 0',
                                    lineHeight: 1.15
                                }}>
                                    {k.value}
                                </p>
                                <p style={{
                                    fontSize: 11,
                                    color: '#9ca3af',
                                    fontWeight: 500,
                                    margin: 0
                                }}>
                                    {k.sub}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters (Arranged in One Line) */}
            <div style={{
                background: '#fff',
                border: '1px solid #e8eaf0',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        className="ec-input"
                        style={{ paddingLeft: 34, width: '100%', height: 38 }}
                        placeholder="Search by return ID, customer or product..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div style={{ width: 170, flexShrink: 0 }}>
                    <select
                        className="ec-input"
                        style={{ width: '100%', height: 38, cursor: 'pointer' }}
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    >
                        {allStatuses.map(s => (
                            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                        ))}
                    </select>
                </div>
                <div style={{ width: 200, flexShrink: 0 }}>
                    <select
                        className="ec-input"
                        style={{ width: '100%', height: 38, cursor: 'pointer' }}
                        value={filterReason}
                        onChange={e => { setFilterReason(e.target.value); setPage(1); }}
                    >
                        {allReasons.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
                {(search || filterStatus !== 'All' || filterReason !== 'All Reasons') && (
                    <button
                        className="adm-btn-secondary"
                        style={{ height: 38, padding: '0 12px', fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}
                        onClick={() => { setSearch(''); setFilterStatus('All'); setFilterReason('All Reasons'); setPage(1); }}
                    >
                        ✕ Reset
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            {['Return ID', 'Customer', 'Product', 'Reason', 'Amount', 'Refund', 'Date', 'Status', 'Actions'].map(h => (
                                <th
                                    key={h}
                                    style={{
                                        background: '#f8fafc',
                                        color: '#64748b',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        padding: '12px 16px',
                                        textAlign: 'left',
                                        whiteSpace: 'nowrap',
                                        borderBottom: '1px solid #e2e8f0',
                                        verticalAlign: 'middle',
                                    }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                                    Loading real-time return requests…
                                </td>
                            </tr>
                        )}
                        {!loading && paginated.map((r, i) => {
                            const sc = statusCfg[r.status] || defaultStatusCfg;
                            const rc = reasonCfg[r.reason] || defaultReasonCfg;
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280', fontWeight: 600, minWidth: 95 }}>
                                        <p style={{ color: '#4f46e5', fontWeight: 700 }}>{r.id}</p>
                                        <p style={{ color: '#9ca3af', marginTop: 2, fontSize: 10 }}>{r.orderId}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', minWidth: 120 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.customer}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{r.email}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151', minWidth: 170, maxWidth: 240 }}>
                                        <p style={{ fontWeight: 600, color: '#111827', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }} title={r.product}>
                                            {r.product && r.product.toLowerCase() !== 'product' ? r.product : '—'}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                                            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>{r.qty} item(s)</span>
                                            {r.sku && (
                                                <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                                                    {r.sku}
                                                </span>
                                            )}
                                            {r.condition && (
                                                <span style={{ color: r.condition === 'sellable' ? '#059669' : '#d97706', fontSize: 10, textTransform: 'capitalize', fontWeight: 500 }}>
                                                    • {r.condition}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', minWidth: 150, maxWidth: 220 }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            padding: '4px 10px',
                                            borderRadius: 20,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: rc?.bg || '#f3f4f6',
                                            color: rc?.color || '#374151',
                                            lineHeight: 1.3,
                                            wordBreak: 'break-word',
                                            maxWidth: '100%'
                                        }} title={r.description && r.description !== '—' ? r.description : r.reason}>
                                            {rc?.icon} <span>{r.reason}</span>
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827', minWidth: 80, whiteSpace: 'nowrap' }}>
                                        {fmt(r.amount)}
                                    </td>
                                    <td style={{ padding: '12px 14px', minWidth: 120 }}>
                                        <p style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{r.refundMethod}</p>
                                        <p style={{
                                            fontSize: 11,
                                            color: r.refundStatus === 'Completed' || r.refundStatus === 'Refunded' ? '#10b981' : '#f59e0b',
                                            fontWeight: 600,
                                            marginTop: 1
                                        }}>
                                            {r.refundStatus}
                                        </p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', minWidth: 95 }}>{r.date}</td>
                                    <td style={{ padding: '12px 14px', minWidth: 120, whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc?.bg || '#f3f4f6', color: sc?.color || '#374151' }}>
                                            {sc?.icon || <BsClockHistory size={10} />} {r.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px 12px', minWidth: 200 }}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                            {/* 1. View / Process (GET /api/v1/order-returns/{return_id}) */}
                                            <button
                                                type="button"
                                                className="adm-btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                                onClick={() => handleView(r)}
                                                title="View & Process Return Details (GET /order-returns/{id})"
                                            >
                                                <BsEye size={12} /> Process
                                            </button>

                                            {/* 2. Approve Return (POST /api/v1/order-returns/{return_id}/approve) */}
                                            {r.status !== 'Approved' && r.status !== 'Refunded' && r.status !== 'Rejected' && (
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    style={{ padding: '4px 7px', fontSize: 11, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                                                    onClick={() => handleApprove(r)}
                                                    disabled={actionLoading === r.id}
                                                    title="Approve Return (POST /order-returns/{id}/approve)"
                                                >
                                                    <BsCheckLg size={12} />
                                                </button>
                                            )}

                                            {/* 3. Complete & Restock (POST /api/v1/order-returns/{return_id}/complete) */}
                                            {(r.status === 'Approved' || r.status === 'Pickup Scheduled') && (
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    style={{ padding: '4px 7px', fontSize: 11, color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                                                    onClick={() => handleComplete(r)}
                                                    disabled={actionLoading === r.id}
                                                    title="Complete Return & Restock Inventory (POST /order-returns/{id}/complete)"
                                                >
                                                    <BsBoxSeam size={12} />
                                                </button>
                                            )}

                                            {/* 4. Exchange Order (POST /api/v1/order-returns/{return_id}/exchange) */}
                                            {r.status !== 'Refunded' && (
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    style={{ padding: '4px 7px', fontSize: 11, color: '#8b5cf6', borderColor: '#ddd6fe', background: '#f5f3ff' }}
                                                    onClick={() => setExchangeTarget(r)}
                                                    title="Create Exchange Order (POST /order-returns/{id}/exchange)"
                                                >
                                                    <BsArrowLeftRight size={12} />
                                                </button>
                                            )}

                                            {/* 5. Print RMA Slip (GET /api/v1/order-returns/{return_id}/slip) */}
                                            <button
                                                type="button"
                                                className="adm-btn-secondary"
                                                style={{ padding: '4px 7px', fontSize: 11, color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                                                onClick={() => handlePrintSlip(r)}
                                                title="Print RMA Return Slip (GET /order-returns/{id}/slip)"
                                            >
                                                <BsPrinter size={12} />
                                            </button>

                                            {/* 6. Edit Return Details (PATCH /api/v1/order-returns/{return_id}) */}
                                            <button
                                                type="button"
                                                className="adm-btn-secondary"
                                                style={{ padding: '4px 7px', fontSize: 11, color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                                                onClick={() => setEditTarget(r)}
                                                title="Edit Return Details (PATCH /order-returns/{id})"
                                            >
                                                <BsPencilSquare size={12} />
                                            </button>

                                            {/* 7. Reject Return (POST /api/v1/order-returns/{return_id}/reject) */}
                                            {r.status !== 'Rejected' && r.status !== 'Refunded' && (
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    style={{ padding: '4px 7px', fontSize: 11, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                                                    onClick={() => setRejectTarget(r)}
                                                    title="Reject Return (POST /order-returns/{id}/reject)"
                                                >
                                                    <BsXCircle size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No return requests found</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#ffffff',
                    flexWrap: 'wrap',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                            {filtered.length === 0
                                ? 'No return requests'
                                : <>Showing <strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries</>
                            }
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    fontSize: 12,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {[5, 10, 20, 50].map(sz => (
                                    <option key={sz} value={sz}>{sz}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                opacity: page === 1 ? 0.5 : 1,
                                cursor: page === 1 ? 'not-allowed' : 'pointer'
                            }}
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <BsChevronLeft size={11} /> Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPage(p)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 6,
                                    border: `1.5px solid ${p === page ? '#6366f1' : '#e2e8f0'}`,
                                    background: p === page ? '#6366f1' : '#ffffff',
                                    color: p === page ? '#ffffff' : '#475569',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                opacity: page >= totalPages ? 0.5 : 1,
                                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                            }}
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next <BsChevronRight size={11} />
                        </button>
                    </div>
                </div>
            </div>

            {selected && (
                <ReturnModal
                    request={selected}
                    onClose={() => setSelected(null)}
                    onAction={handleAction}
                    onApprove={handleApprove}
                    onComplete={handleComplete}
                    onReject={setRejectTarget}
                    onPrintSlip={handlePrintSlip}
                    onExchange={setExchangeTarget}
                    onEdit={setEditTarget}
                />
            )}

            {showCreateModal && (
                <CreateReturnModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        showToast('New return request created successfully via POST /api/v1/order-returns!');
                        fetchReturns();
                    }}
                />
            )}

            {editTarget && (
                <EditReturnModal
                    request={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSuccess={() => {
                        setEditTarget(null);
                        showToast(`Return ${editTarget.id} updated successfully via PATCH /api/v1/order-returns!`);
                        fetchReturns();
                    }}
                />
            )}

            {rejectTarget && (
                <RejectReturnModal
                    request={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onSuccess={() => {
                        setRejectTarget(null);
                        showToast(`Return ${rejectTarget.id} marked as rejected via POST /reject!`);
                        fetchReturns();
                    }}
                />
            )}

            {exchangeTarget && (
                <ExchangeModal
                    request={exchangeTarget}
                    onClose={() => setExchangeTarget(null)}
                    onSuccess={(exOrder) => {
                        setExchangeTarget(null);
                        showToast(`Exchange order created successfully (Order #${exOrder?.id || ''}) via POST /exchange!`);
                        fetchReturns();
                    }}
                />
            )}
        </div>
    );
};

export default ReturnManagement;
