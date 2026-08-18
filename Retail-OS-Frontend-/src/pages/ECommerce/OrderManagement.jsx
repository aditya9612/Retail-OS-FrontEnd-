import React, { useState, useEffect } from 'react';
import { getOrders, createOrder, getOrderById, updateOrder, confirmOrder, cancelOrder, updateOrderStatus, returnOrder, getOrderTracking } from '../../services/orderService';
import {
    BsSearch, BsFunnel, BsDownload, BsEye, BsCheckCircleFill,
    BsXCircleFill, BsHourglassSplit, BsTruck, BsArrowReturnLeft,
    BsBoxSeam, BsChevronLeft, BsChevronRight, BsArrowUpRight,
    BsClockHistory, BsFilter,
} from 'react-icons/bs';

const statusConfig = {
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: <BsClockHistory size={11} /> },
    Confirmed: { color: '#6366f1', bg: '#eef2ff', icon: <BsCheckCircleFill size={11} /> },
    Packed: { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsBoxSeam size={11} /> },
    Shipped: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsTruck size={11} /> },
    'Out for Delivery': { color: '#f97316', bg: '#fff7ed', icon: <BsTruck size={11} /> },
    Delivered: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
    Returned: { color: '#6b7280', bg: '#f9fafb', icon: <BsArrowReturnLeft size={11} /> },
};



const allStatuses = ['All', ...Object.keys(statusConfig)];
const allPayments = ['All Payments', 'POS', 'UPI', 'Card', 'Cash', 'Wallet'];
const fmt = (n) => '₹' + n.toLocaleString('en-IN');
const PAGE_SIZE = 8;

const inpStyle = {
    width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, color: '#111827', outline: 'none',
    boxSizing: 'border-box', background: '#fff',
};

const OrderDetail = ({ order, onClose, onStatusChange, onOrderUpdated }) => {
    const [status, setStatus] = useState(order.status);
    const sc = statusConfig[status] || { color: '#6b7280', bg: '#f9fafb', icon: null };
    const trackingSteps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentStep = trackingSteps.indexOf(status);

    // Live tracking history from API
    const [trackingHistory, setTrackingHistory] = useState([]);
    const [trackingLoading, setTrackingLoading] = useState(false);

    const fetchTracking = async () => {
        if (!order.rawId) return;
        setTrackingLoading(true);
        try {
            const data = await getOrderTracking(order.rawId);
            const events = Array.isArray(data) ? data : [];
            // Sort newest first
            setTrackingHistory(events.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
        } catch (err) {
            console.error('Error fetching tracking:', err);
        } finally {
            setTrackingLoading(false);
        }
    };

    useEffect(() => {
        fetchTracking();
    }, [order.rawId]);

    // Edit form state
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null); // { type: 'success'|'error', text }
    const [form, setForm] = useState({
        customer_id: order.rawId ? String(order.rawId) : '1',
        coupon_code: order.coupon || '',
        discount_amount: String(order.discount || 0),
        delivery_address: order.city || '',
        notes: order.notes || '',
        status: order.status ? order.status.toLowerCase() : 'draft',
    });

    const handleFormChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            const payload = {
                customer_id: parseInt(form.customer_id, 10) || 1,
                coupon_code: form.coupon_code,
                discount_amount: parseFloat(form.discount_amount) || 0,
                delivery_address: form.delivery_address,
                notes: form.notes,
                status: form.status,
            };
            await updateOrder(order.rawId, payload);
            setSaveMsg({ type: 'success', text: 'Order updated successfully!' });
            setEditMode(false);
            if (onOrderUpdated) onOrderUpdated();
        } catch (err) {
            console.error('Error updating order:', err);
            setSaveMsg({ type: 'error', text: 'Failed to update order. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Confirm order handler
    const [confirming, setConfirming] = useState(false);
    const handleConfirm = async () => {
        if (!order.rawId) return;
        setConfirming(true);
        setSaveMsg(null);
        try {
            await confirmOrder(order.rawId);
            setSaveMsg({ type: 'success', text: 'Order confirmed successfully!' });
            setStatus('Confirmed');
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error confirming order:', err);
            setSaveMsg({ type: 'error', text: 'Failed to confirm order. Please try again.' });
        } finally {
            setConfirming(false);
        }
    };

    // Cancel order handler
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const handleCancel = async () => {
        if (!order.rawId) return;
        setCancelling(true);
        setSaveMsg(null);
        try {
            await cancelOrder(order.rawId);
            setSaveMsg({ type: 'success', text: 'Order cancelled successfully!' });
            setStatus('Cancelled');
            setShowCancelConfirm(false);
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error cancelling order:', err);
            setSaveMsg({ type: 'error', text: err?.response?.data?.detail || 'Failed to cancel order. Please try again.' });
            setShowCancelConfirm(false);
        } finally {
            setCancelling(false);
        }
    };

    // Update status handler (PATCH /orders/{id}/status)
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [pendingStatus, setPendingStatus] = useState(null); // status value being set
    const [statusRemarks, setStatusRemarks] = useState('');
    const handleStatusUpdate = async (newStatus) => {
        if (!order.rawId || newStatus === status) return;
        setUpdatingStatus(true);
        setSaveMsg(null);
        const autoRemarks = `Status updated to ${newStatus}`;
        try {
            await updateOrderStatus(order.rawId, newStatus.toLowerCase().replace(/ /g, '_'), statusRemarks || autoRemarks);
            setSaveMsg({ type: 'success', text: `Order status updated to "${newStatus}" successfully!` });
            setStatus(newStatus);
            onStatusChange(order.id, newStatus);
            setPendingStatus(null);
            setStatusRemarks('');
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error updating order status:', err);
            setSaveMsg({ type: 'error', text: err?.response?.data?.detail || 'Failed to update status. Please try again.' });
            setPendingStatus(null);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Return order handler
    const [returning, setReturning] = useState(false);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const handleReturn = async () => {
        if (!order.rawId) return;
        setReturning(true);
        setSaveMsg(null);
        try {
            await returnOrder(order.rawId);
            setSaveMsg({ type: 'success', text: 'Order marked as returned successfully!' });
            setStatus('Returned');
            setShowReturnConfirm(false);
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error returning order:', err);
            setSaveMsg({ type: 'error', text: err?.response?.data?.detail || 'Failed to process return. Please try again.' });
            setShowReturnConfirm(false);
        } finally {
            setReturning(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Order {order.id}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{order.date} · {order.customer}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={() => { setEditMode(e => !e); setSaveMsg(null); }}
                            style={{
                                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                border: '1.5px solid #6366f1', background: editMode ? '#6366f1' : '#eef2ff', color: editMode ? '#fff' : '#6366f1',
                            }}>
                            {editMode ? 'Cancel' : '✏️ Edit'}
                        </button>
                        <button className="ec-modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Save message banner */}
                {saveMsg && (
                    <div style={{
                        padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600,
                        background: saveMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: saveMsg.type === 'success' ? '#10b981' : '#ef4444',
                        border: `1px solid ${saveMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    }}>
                        {saveMsg.text}
                    </div>
                )}

                {/* Edit Form */}
                {editMode ? (
                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Edit Order Details
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Customer ID</label>
                                <input style={inpStyle} name="customer_id" value={form.customer_id} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Coupon Code</label>
                                <input style={inpStyle} name="coupon_code" value={form.coupon_code} onChange={handleFormChange} placeholder="e.g. FLAT100" />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Discount Amount (₹)</label>
                                <input style={inpStyle} name="discount_amount" type="number" value={form.discount_amount} onChange={handleFormChange} />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Status</label>
                                <select style={inpStyle} name="status" value={form.status} onChange={handleFormChange}>
                                    {['draft', 'pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'].map(s => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Delivery Address</label>
                                <input style={inpStyle} name="delivery_address" value={form.delivery_address} onChange={handleFormChange} placeholder="Full delivery address" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Notes</label>
                                <textarea style={{ ...inpStyle, resize: 'vertical', minHeight: 60 }} name="notes" value={form.notes} onChange={handleFormChange} placeholder="Additional notes..." />
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                marginTop: 12, padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                background: saving ? '#c7d2fe' : '#6366f1', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
                            }}>
                            {saving ? 'Saving…' : '💾 Save Changes'}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Order Tracking — static stepper */}
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', margin: '0 0 16px' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Timeline</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                {trackingSteps.map((step, i) => (
                                    <React.Fragment key={step}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <div style={{
                                                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: i <= currentStep ? '#6366f1' : '#e5e7eb',
                                                color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {i < currentStep ? '✓' : i + 1}
                                            </div>
                                            <span style={{ fontSize: 9, color: i <= currentStep ? '#6366f1' : '#9ca3af', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {step === 'Out for Delivery' ? 'Out for\nDelivery' : step}
                                            </span>
                                        </div>
                                        {i < trackingSteps.length - 1 && (
                                            <div style={{ flex: 1, height: 2, background: i < currentStep ? '#6366f1' : '#e5e7eb', margin: '0 2px', marginBottom: 20 }} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Tracking History — live from API */}
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking History</p>
                                <button
                                    onClick={fetchTracking}
                                    disabled={trackingLoading}
                                    style={{
                                        fontSize: 11, fontWeight: 600, color: '#6366f1', background: 'none',
                                        border: 'none', cursor: 'pointer', padding: '2px 6px',
                                        opacity: trackingLoading ? 0.5 : 1,
                                    }}>
                                    {trackingLoading ? '…' : '↻ Refresh'}
                                </button>
                            </div>
                            {trackingLoading ? (
                                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Loading history…</p>
                            ) : trackingHistory.length === 0 ? (
                                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>No tracking events yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 220, overflowY: 'auto' }}>
                                    {trackingHistory.map((event, idx) => {
                                        const evStatusKey = event.status
                                            ? event.status.charAt(0).toUpperCase() + event.status.slice(1).replace(/_/g, ' ')
                                            : 'Unknown';
                                        const evSc = statusConfig[evStatusKey] || { color: '#6b7280', bg: '#f3f4f6' };
                                        const evDate = new Date(event.updated_at);
                                        const evDateStr = evDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                        const evTimeStr = evDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={event.id} style={{ display: 'flex', gap: 12, paddingBottom: idx < trackingHistory.length - 1 ? 12 : 0, marginBottom: idx < trackingHistory.length - 1 ? 12 : 0, borderBottom: idx < trackingHistory.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                {/* Timeline dot + line */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: idx === 0 ? evSc.color : '#d1d5db', marginTop: 3 }} />
                                                    {idx < trackingHistory.length - 1 && <div style={{ width: 2, flex: 1, background: '#e5e7eb', marginTop: 3 }} />}
                                                </div>
                                                {/* Event detail */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: evSc.bg, color: evSc.color }}>
                                                            {evStatusKey}
                                                        </span>
                                                        {idx === 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: 4 }}>Latest</span>}
                                                    </div>
                                                    {event.remarks && event.remarks !== 'string' && (
                                                        <p style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>{event.remarks}</p>
                                                    )}
                                                    <p style={{ fontSize: 10, color: '#9ca3af' }}>{evDateStr} · {evTimeStr}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            {[
                                { label: 'Customer', value: order.customer },
                                { label: 'Email', value: order.email },
                                { label: 'Delivery Address', value: order.city },
                                { label: 'Payment', value: order.payment },
                                { label: 'Items', value: `${order.items} items` },
                                { label: 'Subtotal', value: fmt(order.subtotal) },
                                { label: 'Discount', value: order.discount > 0 ? `- ${fmt(order.discount)}` : 'None' },
                                { label: 'GST', value: fmt(order.gst) },
                                { label: 'Shipping', value: order.shipping === 0 ? 'Free' : fmt(order.shipping) },
                                { label: 'Notes', value: order.notes || '--' },
                            ].map((f, i) => (
                                <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                                        {f.label} {f.label === 'Discount' && order.coupon && <span style={{ textTransform: 'none', background: '#eef2ff', color: '#6366f1', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>{order.coupon}</span>}
                                    </p>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{f.value}</p>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>Grand Total</span>
                            <span style={{ fontWeight: 800, color: '#6366f1', fontSize: 16 }}>{fmt(order.total)}</span>
                        </div>

                        {/* Items List */}
                        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Items</p>
                            {order.products && order.products.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {order.products.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: idx < order.products.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.product_name}</p>
                                                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                    {fmt(parseFloat(item.unit_price))} × {item.quantity} {item.variant ? `(${item.variant})` : ''}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(parseFloat(item.total))}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: 12, color: '#9ca3af' }}>No items found.</p>
                            )}
                        </div>

                        {/* Update Order Status — API-backed */}
                        <div style={{ marginBottom: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Quick Status Update</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                {Object.keys(statusConfig).map(s => (
                                    <button key={s}
                                        onClick={() => setPendingStatus(pendingStatus === s ? null : s)}
                                        disabled={updatingStatus || cancelling || confirming}
                                        style={{
                                            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                            border: `1.5px solid ${status === s ? statusConfig[s].color :
                                                pendingStatus === s ? '#f59e0b' : '#e5e7eb'
                                                }`,
                                            background: status === s ? statusConfig[s].bg : pendingStatus === s ? '#fffbeb' : '#fff',
                                            color: status === s ? statusConfig[s].color : pendingStatus === s ? '#b45309' : '#6b7280',
                                            opacity: updatingStatus ? 0.6 : 1,
                                        }}>
                                        {status === s ? `✓ ${s}` : s}
                                    </button>
                                ))}
                            </div>

                            {/* Confirm panel for selected pending status */}
                            {pendingStatus && pendingStatus !== status && (
                                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '12px 14px' }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
                                        Change status to <strong>"{pendingStatus}"</strong>?
                                    </p>
                                    <input
                                        style={{ ...inpStyle, marginBottom: 8, fontSize: 12 }}
                                        placeholder={`Remarks (e.g. "Status updated to ${pendingStatus}")`}
                                        value={statusRemarks}
                                        onChange={e => setStatusRemarks(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => { setPendingStatus(null); setStatusRemarks(''); }}
                                            disabled={updatingStatus}
                                            style={{
                                                flex: 1, padding: '7px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                                                background: '#fff', color: '#374151', border: '1.5px solid #d1d5db', cursor: 'pointer',
                                            }}>
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(pendingStatus)}
                                            disabled={updatingStatus}
                                            style={{
                                                flex: 1, padding: '7px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                                background: updatingStatus ? '#c7d2fe' : '#6366f1', color: '#fff',
                                                border: 'none', cursor: updatingStatus ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            }}>
                                            {updatingStatus ? 'Updating…' : '✔ Confirm Update'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Order Action */}
                        {!['Confirmed', 'Delivered', 'Cancelled', 'Returned'].includes(status) && (
                            <div style={{ marginTop: 16 }}>
                                <button
                                    onClick={handleConfirm}
                                    disabled={confirming || cancelling}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                        background: confirming ? '#a7f3d0' : '#10b981', color: '#fff',
                                        border: 'none', cursor: confirming ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}>
                                    {confirming ? 'Confirming…' : '✅ Confirm Order'}
                                </button>
                            </div>
                        )}

                        {/* Cancel Order Action */}
                        {!['Cancelled', 'Returned', 'Delivered'].includes(status) && (
                            <div style={{ marginTop: 10 }}>
                                {!showCancelConfirm ? (
                                    <button
                                        onClick={() => setShowCancelConfirm(true)}
                                        disabled={cancelling || confirming || returning}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                            background: '#fff', color: '#ef4444',
                                            border: '1.5px solid #ef4444', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        }}>
                                        🚫 Cancel Order
                                    </button>
                                ) : (
                                    <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '12px 14px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 10, textAlign: 'center' }}>
                                            ⚠️ Are you sure you want to cancel this order?
                                        </p>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => setShowCancelConfirm(false)}
                                                disabled={cancelling}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                                                    background: '#fff', color: '#374151', border: '1.5px solid #d1d5db', cursor: 'pointer',
                                                }}>
                                                Keep Order
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                disabled={cancelling}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                                                    background: cancelling ? '#fca5a5' : '#ef4444', color: '#fff',
                                                    border: 'none', cursor: cancelling ? 'not-allowed' : 'pointer',
                                                }}>
                                                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Return Order Action — only for Delivered orders */}
                        {status === 'Delivered' && (
                            <div style={{ marginTop: 10 }}>
                                {!showReturnConfirm ? (
                                    <button
                                        onClick={() => setShowReturnConfirm(true)}
                                        disabled={returning || cancelling || confirming || updatingStatus}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                            background: '#fff', color: '#6b7280',
                                            border: '1.5px solid #9ca3af', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        }}>
                                        ↩️ Return Order
                                    </button>
                                ) : (
                                    <div style={{ background: '#f9fafb', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '12px 14px' }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, textAlign: 'center' }}>
                                            ↩️ Confirm return for this delivered order?
                                        </p>
                                        <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, textAlign: 'center' }}>
                                            This will mark the order as <strong>Returned</strong> and cannot be undone.
                                        </p>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => setShowReturnConfirm(false)}
                                                disabled={returning}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                                                    background: '#fff', color: '#374151', border: '1.5px solid #d1d5db', cursor: 'pointer',
                                                }}>
                                                Keep Order
                                            </button>
                                            <button
                                                onClick={handleReturn}
                                                disabled={returning}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                                                    background: returning ? '#d1d5db' : '#6b7280', color: '#fff',
                                                    border: 'none', cursor: returning ? 'not-allowed' : 'pointer',
                                                }}>
                                                {returning ? 'Processing…' : 'Yes, Return'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPayment, setFilterPayment] = useState('All Payments');
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchOrdersList = async () => {
        setLoading(true);
        try {
            const data = await getOrders({ store_id: 1, page: 1, page_size: 20 });
            const orderData = Array.isArray(data) ? data : (data.items || data.data || []);
            const mappedOrders = orderData.map(o => ({
                id: o.order_number || `ORD-${o.id}`,
                rawId: o.id,
                customer: `Customer ${o.customer_id}`,
                email: '--',
                date: new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                created_at: new Date(o.created_at).getTime(),
                items: o.items ? o.items.reduce((acc, i) => acc + i.quantity, 0) : 0,
                products: o.items || [],
                subtotal: parseFloat(o.subtotal || 0),
                gst: parseFloat(o.tax_amount || 0),
                discount: parseFloat(o.discount_amount || 0),
                coupon: o.coupon_code || '',
                shipping: 0,
                total: parseFloat(o.total_amount || 0),
                payment: o.order_type === 'pos' ? 'POS' : (o.order_type ? o.order_type.toUpperCase() : 'N/A'),
                status: o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : 'Pending',
                city: o.delivery_address || 'Walk-in',
                notes: o.notes || '',
                deliveryStatus: o.delivery_status || '--',
            })).sort((a, b) => b.created_at - a.created_at); // Sort newest first automatically

            setOrders(mappedOrders);
        } catch (err) {
            console.error("Error fetching orders:", err);
            let msg = 'Failed to load orders.';
            if (err.response?.data?.detail) {
                msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
            } else if (err.message) {
                msg = err.message;
            }
            if (err.response?.status === 404) {
                msg += ' (Store ID 1 might not exist)';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrdersList();
    }, []);

    const filtered = orders.filter(o => {
        const matchSearch = String(o.id || '').toLowerCase().includes(search.toLowerCase()) ||
            String(o.customer || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || o.status === filterStatus;
        const matchPayment = filterPayment === 'All Payments' || o.payment === filterPayment;
        return matchSearch && matchStatus && matchPayment;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStatusChange = (id, newStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    const handleCreateOrder = async () => {
        setIsCreating(true);
        try {
            // Fetch dynamically to avoid 404 Entity Not Found errors from hardcoded IDs
            let validProductId = 8;
            try {
                const { product } = await import('../../services/product.js');
                const productsResponse = await product.getAll();
                const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse.data || productsResponse.items || []);
                if (products.length > 0) {
                    validProductId = products[0].id;
                }
            } catch (e) { console.warn("Could not fetch dynamic product id", e); }

            let validCustomerId = 1;
            try {
                const { getCurrentUser } = await import('../../services/user.js');
                const user = await getCurrentUser();
                if (user && user.id) validCustomerId = user.id;
            } catch (e) { console.warn("Could not fetch dynamic customer id", e); }

            const payload = {
                store_id: 1,
                customer_id: validCustomerId,
                order_type: "ecommerce",
                coupon_code: "FLAT100",
                discount_amount: 100,
                delivery_address: "123 MG Road, Bengaluru, Karnataka",
                notes: "Online order with coupon",
                items: [
                    {
                        product_id: validProductId,
                        quantity: 2,
                        unit_price: 750.00,
                        discount: 50,
                        variant: "2L"
                    }
                ]
            };
            await createOrder(payload);
            await fetchOrdersList();
            alert("Order created successfully!"); // Adding success alert
        } catch (err) {
            console.error("Error creating order:", err);
            let msg = 'Failed to create order';
            if (err.response?.data?.detail) {
                msg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
            } else if (err.message) {
                msg = err.message;
            }
            alert(`Error: ${msg}\n\n(Ensure your store_id, product_id, and customer_id exist in the database)`);
        } finally {
            setIsCreating(false);
        }
    };

    const mapOrderDetail = (o) => ({
        id: o.order_number,
        rawId: o.id,
        customer: `Customer ${o.customer_id}`,
        email: '--',
        date: new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        items: o.items ? o.items.reduce((acc, i) => acc + i.quantity, 0) : 0,
        products: o.items || [],
        subtotal: parseFloat(o.subtotal || 0),
        gst: parseFloat(o.tax_amount || 0),
        discount: parseFloat(o.discount_amount || 0),
        coupon: o.coupon_code || '',
        shipping: 0,
        total: parseFloat(o.total_amount || 0),
        payment: o.order_type === 'pos' ? 'POS' : (o.order_type ? o.order_type.toUpperCase() : 'N/A'),
        status: o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : 'Pending',
        city: o.delivery_address || 'Walk-in',
        notes: o.notes || '',
        deliveryStatus: o.delivery_status || '--',
    });

    const handleViewOrder = async (order) => {
        // Use the numeric rawId if present (from list), else try to parse
        const numericId = order.rawId || null;
        if (!numericId) {
            setSelectedOrder(order);
            return;
        }
        setDetailLoading(true);
        try {
            const data = await getOrderById(numericId);
            setSelectedOrder(mapOrderDetail(data));
        } catch (err) {
            console.error('Error fetching order detail:', err);
            // Fall back to list-level data
            setSelectedOrder(order);
        } finally {
            setDetailLoading(false);
        }
    };

    const stats = [
        { label: 'Total Orders', value: orders.length, color: '#6366f1', bg: '#eef2ff' },
        { label: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Processing', value: orders.filter(o => ['Pending', 'Confirmed', 'Packed'].includes(o.status)).length, color: '#f59e0b', bg: '#fffbeb' },
        { label: 'Cancelled / Returned', value: orders.filter(o => ['Cancelled', 'Returned'].includes(o.status)).length, color: '#ef4444', bg: '#fef2f2' },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">📦 Order Management</h1>
                    <p className="adm-page-sub">Manage and track all online customer orders</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-primary" onClick={handleCreateOrder} disabled={isCreating}>
                        {isCreating ? 'Creating...' : '+ Create Order'}
                    </button>
                    <button className="adm-btn-secondary"><BsDownload size={14} /> Export CSV</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {stats.map((s, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by order ID or customer name..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 150 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {allStatuses.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 150 }} value={filterPayment}
                    onChange={e => { setFilterPayment(e.target.value); setPage(1); }}>
                    {allPayments.map(p => <option key={p}>{p}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading orders...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>{error}</td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No orders found</td></tr>
                        ) : (
                            paginated.map((order, i) => {
                                const sc = statusConfig[order.status] || { color: '#6b7280', bg: '#f9fafb', icon: null };
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>{order.id}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{order.customer}</p>
                                            <p style={{ fontSize: 11, color: '#9ca3af' }}>{order.city}</p>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{order.date}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{order.items} items</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827', fontSize: 13 }}>{fmt(order.total)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span className="adm-mode-tag">{order.payment}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                                {sc.icon} {order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}
                                                onClick={() => handleViewOrder(order)} disabled={detailLoading}>
                                                <BsEye size={12} /> {detailLoading ? '…' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <BsChevronLeft size={12} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    {p}
                                </button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                <BsChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)}
                    onStatusChange={(id, s) => { handleStatusChange(id, s); setSelectedOrder(prev => ({ ...prev, status: s })); }}
                    onOrderUpdated={() => { fetchOrdersList(); setSelectedOrder(null); }} />
            )}
        </div>
    );
};

export default OrderManagement;
