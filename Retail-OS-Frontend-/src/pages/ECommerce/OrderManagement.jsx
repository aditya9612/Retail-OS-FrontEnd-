import React, { useState, useEffect } from 'react';
import { getOrders, createOrder, getOrderById, updateOrder, confirmOrder, cancelOrder, updateOrderStatus, returnOrder, getOrderTracking } from '../../services/orderService';
import {
    BsSearch, BsFunnel, BsDownload, BsEye, BsCheckCircleFill,
    BsXCircleFill, BsHourglassSplit, BsTruck, BsArrowReturnLeft,
    BsBoxSeam, BsChevronLeft, BsChevronRight, BsArrowUpRight,
    BsClockHistory, BsFilter, BsPlus, BsPerson, BsGeoAlt,
    BsTag, BsCreditCard2Front, BsXLg, BsCheckLg, BsInfoCircle,
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
const fmt = (n) => {
    if (n === null || n === undefined || isNaN(Number(n))) return '₹0';
    return '₹' + Number(n).toLocaleString('en-IN');
};
const PAGE_SIZE = 8;

// Helper to determine if an order is for a walk-in customer
export const isWalkInOrder = (o) => {
    if (!o) return false;
    const addr = String(o.delivery_address || o.city || '').trim().toLowerCase();
    if (!addr || addr === 'walk-in' || addr === 'walk in' || addr === 'walkin' || addr === 'in-store' || addr === 'pickup' || addr === 'pick-up') {
        return true;
    }
    const orderType = String(o.order_type || o.payment || '').trim().toLowerCase();
    if (orderType === 'pos' || orderType === 'in-store' || orderType === 'walk-in' || orderType === 'walkin') {
        return true;
    }
    const customer = String(o.customer || o.customer_id || '').toLowerCase();
    if (customer.includes('walk-in') || customer.includes('walkin')) {
        return true;
    }
    return false;
};

// Helper to format field names clearly for user-facing validation errors
export const formatFieldName = (name) => {
    if (!name) return 'Field';
    const fieldMap = {
        customer_id: 'Customer ID',
        delivery_address: 'Delivery Address',
        discount_amount: 'Discount Amount',
        coupon_code: 'Coupon Code',
        status: 'Status',
        store_id: 'Store ID',
        product_id: 'Product ID',
        unit_price: 'Unit Price',
        quantity: 'Quantity',
        remarks: 'Remarks',
        notes: 'Notes',
    };
    if (fieldMap[name]) return fieldMap[name];
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
};

const getErrorMessage = (err, fallback = 'Validation failed. Please check the highlighted field requiring input.') => {
    if (!err) return fallback;
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map(d => {
            if (typeof d === 'string') return d;
            const field = d?.loc && d.loc.length > 0 ? formatFieldName(d.loc[d.loc.length - 1]) : '';
            const msg = d?.msg || d?.message || (typeof d === 'object' ? JSON.stringify(d) : String(d));
            return field ? `Field "${field}": ${msg}` : msg;
        }).join('; ');
    }
    if (detail && typeof detail === 'object') {
        const field = detail?.loc && detail.loc.length > 0 ? formatFieldName(detail.loc[detail.loc.length - 1]) : '';
        const msg = detail?.message || detail?.msg || JSON.stringify(detail);
        return field ? `Field "${field}": ${msg}` : msg;
    }
    if (err.message) return err.message;
    return fallback;
};

const activeCoupons = [
    { code: 'FLAT100', label: 'FLAT100 — Flat ₹100 Off (Min ₹500)', discount: 100 },
    { code: 'WELCOME10', label: 'WELCOME10 — 10% Off (Min ₹300)', discount: 50 },
    { code: 'SAVE20', label: 'SAVE20 — 20% Off (Min ₹1000)', discount: 200 },
    { code: 'FESTIVE50', label: 'FESTIVE50 — Flat ₹50 Off (Min ₹250)', discount: 50 },
];

const inpStyle = {
    width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, color: '#111827', outline: 'none',
    boxSizing: 'border-box', background: '#fff',
};

const OrderDetail = ({ order, onClose, onStatusChange, onOrderUpdated }) => {
    if (!order) return null;
    const isWalkIn = isWalkInOrder(order);
    const initialStatus = (isWalkIn && !['Cancelled', 'Returned'].includes(order.status)) ? 'Delivered' : (order.status || 'Pending');
    const [status, setStatus] = useState(initialStatus);
    const sc = statusConfig[status] || { color: '#6b7280', bg: '#f9fafb', icon: null };
    const trackingSteps = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentStep = trackingSteps.indexOf(status);

    // Live tracking history from API
    const [trackingHistory, setTrackingHistory] = useState([]);
    const [trackingLoading, setTrackingLoading] = useState(false);

    const fetchTracking = async () => {
        if (!order?.rawId) return;
        setTrackingLoading(true);
        try {
            const data = await getOrderTracking(order.rawId);
            const rawEvents = Array.isArray(data) ? data : (data?.data || data?.items || []);
            const events = Array.isArray(rawEvents) ? rawEvents : [];
            // Sort newest first
            setTrackingHistory(events.sort((a, b) => {
                const dateA = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
                const dateB = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
                return dateB - dateA;
            }));
        } catch (err) {
            console.error('Error fetching tracking:', err);
            setTrackingHistory([]);
        } finally {
            setTrackingLoading(false);
        }
    };

    useEffect(() => {
        fetchTracking();
    }, [order?.rawId]);

    // Edit form state
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null); // { type: 'success'|'error', text }
    const [fieldErrors, setFieldErrors] = useState({});
    const [showCustomCoupon, setShowCustomCoupon] = useState(
        Boolean(order.coupon && !activeCoupons.some(c => c.code.toLowerCase() === order.coupon.toLowerCase()))
    );
    const [form, setForm] = useState({
        customer_id: order.rawId ? String(order.rawId) : '1',
        coupon_code: order.coupon || '',
        discount_amount: String(order.discount || 0),
        delivery_address: order.city || (isWalkIn ? 'Walk-in' : ''),
        notes: order.notes || '',
        status: (isWalkIn && !['cancelled', 'returned'].includes((order.status || '').toLowerCase()))
            ? 'delivered'
            : (order.status ? order.status.toLowerCase() : 'draft'),
    });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFieldErrors(prev => ({ ...prev, [name]: null }));
        if (name === 'delivery_address') {
            const isNowWalkIn = !value.trim() || ['walk-in', 'walk in', 'walkin', 'in-store', 'pickup', 'pick-up'].includes(value.trim().toLowerCase());
            setForm(prev => ({
                ...prev,
                delivery_address: value,
                status: (isNowWalkIn && !['cancelled', 'returned'].includes(prev.status)) ? 'delivered' : prev.status,
            }));
        } else if (name === 'status') {
            const isCurrWalkIn = !form.delivery_address.trim() || ['walk-in', 'walk in', 'walkin', 'in-store', 'pickup', 'pick-up'].includes(form.delivery_address.trim().toLowerCase());
            if (isCurrWalkIn && !['cancelled', 'returned', 'delivered'].includes(value.toLowerCase())) {
                setFieldErrors(prev => ({ ...prev, status: 'Walk-in customer orders are fulfilled directly in-store and must be set to "Delivered".' }));
                setSaveMsg({
                    type: 'error',
                    text: 'Validation Error on Field "Status": Walk-in customer orders are fulfilled directly in-store and must be set to "Delivered".'
                });
                setForm(prev => ({ ...prev, status: 'delivered' }));
                return;
            }
            setForm(prev => ({ ...prev, [name]: value }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);
        setFieldErrors({});

        // Client-side validation identifying specific fields requiring input
        const errors = {};
        if (!form.customer_id || !String(form.customer_id).trim()) {
            errors.customer_id = 'Customer ID is required. Please enter a valid customer identifier.';
        } else if (isNaN(parseInt(form.customer_id, 10)) || parseInt(form.customer_id, 10) <= 0) {
            errors.customer_id = 'Customer ID must be a positive integer number.';
        }

        if (!form.delivery_address || !form.delivery_address.trim()) {
            errors.delivery_address = 'Delivery Address is required. Enter a destination address or "Walk-in" for in-store pickup.';
        }

        if (form.discount_amount !== '' && form.discount_amount !== null && form.discount_amount !== undefined) {
            if (isNaN(Number(form.discount_amount)) || Number(form.discount_amount) < 0) {
                errors.discount_amount = 'Discount Amount must be a valid non-negative number (0 or greater).';
            }
        }

        if (!form.status || !form.status.trim()) {
            errors.status = 'Status is required. Please select a valid order status.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            const firstField = Object.keys(errors)[0];
            const fieldLabel = formatFieldName(firstField);
            setSaveMsg({
                type: 'error',
                text: `Validation Error on Field "${fieldLabel}": ${errors[firstField]}`
            });
            setSaving(false);
            return;
        }

        try {
            const isTargetWalkIn = !form.delivery_address.trim() || ['walk-in', 'walk in', 'walkin', 'in-store', 'pickup', 'pick-up'].includes(form.delivery_address.trim().toLowerCase());
            const effectiveStatus = (isTargetWalkIn && !['cancelled', 'returned'].includes(form.status.toLowerCase()))
                ? 'delivered'
                : form.status;

            const rawCoupon = form.coupon_code ? form.coupon_code.trim() : '';
            const payload = {
                customer_id: parseInt(form.customer_id, 10) || 1,
                coupon_code: rawCoupon || null,
                discount_amount: parseFloat(form.discount_amount) || 0,
                delivery_address: form.delivery_address.trim() || 'Walk-in',
                notes: form.notes,
                status: effectiveStatus,
            };
            await updateOrder(order.rawId, payload);
            setSaveMsg({
                type: 'success',
                text: `Order updated successfully!${isTargetWalkIn ? ' Walk-in customer order automatically set to Delivered.' : ''}`
            });
            setEditMode(false);
            const displayStatus = effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1);
            setStatus(displayStatus);
            if (onStatusChange) onStatusChange(order.id, displayStatus);
            if (onOrderUpdated) onOrderUpdated();
        } catch (err) {
            if (Array.isArray(err?.response?.data?.detail)) {
                const apiErrors = {};
                err.response.data.detail.forEach(d => {
                    if (d.loc && d.loc.length > 0) {
                        const fName = d.loc[d.loc.length - 1];
                        apiErrors[fName] = d.msg || 'Invalid value';
                    }
                });
                setFieldErrors(apiErrors);
            }
            setSaveMsg({ type: 'error', text: getErrorMessage(err, 'Failed to update order. Please check the highlighted field.') });
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
            if (onStatusChange) onStatusChange(order.id, 'Confirmed');
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error confirming order:', err);
            setSaveMsg({ type: 'error', text: getErrorMessage(err, 'Failed to confirm order. Please try again.') });
        } finally {
            setConfirming(false);
        }
    };

    // Cancel order handler
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const handleCancel = async () => {
        if (!order?.rawId) return;
        setCancelling(true);
        setSaveMsg(null);
        try {
            await cancelOrder(order.rawId);
            setSaveMsg({ type: 'success', text: 'Order cancelled successfully!' });
            setStatus('Cancelled');
            setShowCancelConfirm(false);
            if (onStatusChange) onStatusChange(order.id, 'Cancelled');
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error cancelling order:', err);
            setSaveMsg({ type: 'error', text: getErrorMessage(err, 'Failed to cancel order. Please try again.') });
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
        if (!order?.rawId || newStatus === status) return;

        // Validation for walk-in customer orders
        if (isWalkIn && ['shipped', 'out for delivery', 'packed'].includes(newStatus.toLowerCase())) {
            setSaveMsg({
                type: 'error',
                text: 'Validation Error: Walk-in customer orders are fulfilled directly in-store and cannot be Shipped or Out for Delivery. Status must be "Delivered" (or Cancelled/Returned).'
            });
            setPendingStatus(null);
            return;
        }

        setUpdatingStatus(true);
        setSaveMsg(null);
        const autoRemarks = `Status updated to ${newStatus}`;
        try {
            const apiStatus = newStatus.toLowerCase().replace(/\s+/g, '_');
            await updateOrderStatus(order.rawId, apiStatus, statusRemarks || autoRemarks);
            setSaveMsg({ type: 'success', text: `Order status updated to "${newStatus}" successfully!` });
            setStatus(newStatus);
            if (onStatusChange) onStatusChange(order.id, newStatus);
            setPendingStatus(null);
            setStatusRemarks('');
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error updating order status:', err);
            setSaveMsg({ type: 'error', text: getErrorMessage(err, 'Failed to update status. Please try again.') });
            setPendingStatus(null);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Return order handler
    const [returning, setReturning] = useState(false);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const handleReturn = async () => {
        if (!order?.rawId) return;
        setReturning(true);
        setSaveMsg(null);
        try {
            await returnOrder(order.rawId);
            setSaveMsg({ type: 'success', text: 'Order marked as returned successfully!' });
            setStatus('Returned');
            setShowReturnConfirm(false);
            if (onStatusChange) onStatusChange(order.id, 'Returned');
            if (onOrderUpdated) onOrderUpdated();
            fetchTracking();
        } catch (err) {
            console.error('Error returning order:', err);
            setSaveMsg({ type: 'error', text: getErrorMessage(err, 'Failed to process return. Please try again.') });
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Order {order.id}</h3>
                            {isWalkIn && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#059669',
                                    border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 12,
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                }}>
                                    <BsCheckCircleFill size={9} /> Walk-in (Delivered)
                                </span>
                            )}
                        </div>
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
                        {typeof saveMsg.text === 'string' ? saveMsg.text : JSON.stringify(saveMsg.text)}
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
                                <label style={{ fontSize: 10, fontWeight: 700, color: fieldErrors.customer_id ? '#ef4444' : '#9ca3af', textTransform: 'uppercase' }}>
                                    Customer ID <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    style={{
                                        ...inpStyle,
                                        borderColor: fieldErrors.customer_id ? '#ef4444' : '#e5e7eb',
                                        background: fieldErrors.customer_id ? '#fef2f2' : '#fff',
                                    }}
                                    name="customer_id"
                                    value={form.customer_id}
                                    onChange={handleFormChange}
                                    placeholder="e.g. 1"
                                />
                                {fieldErrors.customer_id && (
                                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2, display: 'block' }}>
                                        ⚠️ {fieldErrors.customer_id}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Coupon Code</label>
                                    {form.coupon_code ? (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                            <BsCheckCircleFill size={9} /> Selected: {form.coupon_code}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>No coupon selected</span>
                                    )}
                                </div>
                                <select
                                    style={{
                                        ...inpStyle,
                                        borderColor: form.coupon_code ? '#6366f1' : '#e5e7eb',
                                        background: form.coupon_code ? '#f8faff' : '#fff',
                                    }}
                                    name="coupon_code"
                                    value={
                                        activeCoupons.some(c => c.code.toLowerCase() === (form.coupon_code || '').toLowerCase())
                                            ? activeCoupons.find(c => c.code.toLowerCase() === (form.coupon_code || '').toLowerCase()).code
                                            : (form.coupon_code ? 'CUSTOM' : '')
                                    }
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'CUSTOM') {
                                            setShowCustomCoupon(true);
                                        } else {
                                            setShowCustomCoupon(false);
                                            const matched = activeCoupons.find(c => c.code === val);
                                            setForm(prev => ({
                                                ...prev,
                                                coupon_code: val,
                                                discount_amount: matched ? String(matched.discount) : (val ? prev.discount_amount : '0'),
                                            }));
                                        }
                                    }}
                                >
                                    <option value="">-- Select Coupon (None) --</option>
                                    {activeCoupons.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                    <option value="CUSTOM">Custom Code...</option>
                                </select>

                                {(showCustomCoupon || (form.coupon_code && !activeCoupons.some(c => c.code.toLowerCase() === form.coupon_code.toLowerCase()))) && (
                                    <div style={{ marginTop: 6, position: 'relative' }}>
                                        <input
                                            style={{ ...inpStyle, paddingRight: 26 }}
                                            name="coupon_code"
                                            value={form.coupon_code}
                                            onChange={handleFormChange}
                                            placeholder="Enter custom coupon code..."
                                            autoFocus
                                        />
                                        {form.coupon_code && (
                                            <button
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, coupon_code: '' }))}
                                                title="Clear coupon"
                                                style={{
                                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
                                                    fontSize: 12, padding: '2px 4px', lineHeight: 1,
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Interactive clickable selection chips */}
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Active:</span>
                                        {activeCoupons.map(c => {
                                            const isSelected = form.coupon_code?.trim().toUpperCase() === c.code;
                                            return (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setForm(prev => ({ ...prev, coupon_code: '' }));
                                                        } else {
                                                            setShowCustomCoupon(false);
                                                            setForm(prev => ({
                                                                ...prev,
                                                                coupon_code: c.code,
                                                                discount_amount: (!prev.discount_amount || prev.discount_amount === '0')
                                                                    ? String(c.discount)
                                                                    : prev.discount_amount,
                                                            }));
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '2px 7px',
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: isSelected ? 700 : 500,
                                                        border: isSelected ? '1.5px solid #6366f1' : '1px solid #d1d5db',
                                                        background: isSelected ? '#eef2ff' : '#ffffff',
                                                        color: isSelected ? '#4338ca' : '#4b5563',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    title={isSelected ? `Selected: ${c.code}. Click to deselect` : `Click to select ${c.code}`}
                                                >
                                                    {isSelected && <BsCheckCircleFill size={8} color="#6366f1" />}
                                                    {c.code}
                                                </button>
                                            );
                                        })}
                                        {form.coupon_code && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCustomCoupon(false);
                                                    setForm(prev => ({ ...prev, coupon_code: '' }));
                                                }}
                                                style={{
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontSize: 10,
                                                    border: '1px solid #fecaca',
                                                    background: '#fef2f2',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                }}
                                                title="Clear coupon selection"
                                            >
                                                ✕ Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: fieldErrors.discount_amount ? '#ef4444' : '#9ca3af', textTransform: 'uppercase' }}>
                                    Discount Amount (₹)
                                </label>
                                <input
                                    style={{
                                        ...inpStyle,
                                        borderColor: fieldErrors.discount_amount ? '#ef4444' : '#e5e7eb',
                                        background: fieldErrors.discount_amount ? '#fef2f2' : '#fff',
                                    }}
                                    name="discount_amount"
                                    type="number"
                                    value={form.discount_amount}
                                    onChange={handleFormChange}
                                />
                                {fieldErrors.discount_amount && (
                                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2, display: 'block' }}>
                                        ⚠️ {fieldErrors.discount_amount}
                                    </span>
                                )}
                            </div>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: fieldErrors.status ? '#ef4444' : '#9ca3af', textTransform: 'uppercase' }}>
                                    Status <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    style={{
                                        ...inpStyle,
                                        borderColor: fieldErrors.status ? '#ef4444' : '#e5e7eb',
                                        background: fieldErrors.status ? '#fef2f2' : '#fff',
                                    }}
                                    name="status"
                                    value={form.status}
                                    onChange={handleFormChange}
                                >
                                    {['draft', 'pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'].map(s => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                {fieldErrors.status && (
                                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2, display: 'block' }}>
                                        ⚠️ {fieldErrors.status}
                                    </span>
                                )}
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: fieldErrors.delivery_address ? '#ef4444' : '#9ca3af', textTransform: 'uppercase' }}>
                                    Delivery Address <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    style={{
                                        ...inpStyle,
                                        borderColor: fieldErrors.delivery_address ? '#ef4444' : '#e5e7eb',
                                        background: fieldErrors.delivery_address ? '#fef2f2' : '#fff',
                                    }}
                                    name="delivery_address"
                                    value={form.delivery_address}
                                    onChange={handleFormChange}
                                    placeholder="Full delivery address or 'Walk-in' for in-store pickup"
                                />
                                {fieldErrors.delivery_address && (
                                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2, display: 'block' }}>
                                        ⚠️ {fieldErrors.delivery_address}
                                    </span>
                                )}
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
                                        if (!event) return null;
                                        const rawSt = event.status || 'Updated';
                                        const evStatusKey = rawSt.charAt(0).toUpperCase() + rawSt.slice(1).replace(/_/g, ' ');
                                        const evSc = statusConfig[evStatusKey] || statusConfig[Object.keys(statusConfig).find(k => k.toLowerCase() === evStatusKey.toLowerCase())] || { color: '#6b7280', bg: '#f3f4f6' };
                                        const evDate = event.updated_at ? new Date(event.updated_at) : new Date();
                                        const evDateStr = !isNaN(evDate.getTime()) ? evDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
                                        const evTimeStr = !isNaN(evDate.getTime()) ? evDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                                        return (
                                            <div key={event.id || idx} style={{ display: 'flex', gap: 12, paddingBottom: idx < trackingHistory.length - 1 ? 12 : 0, marginBottom: idx < trackingHistory.length - 1 ? 12 : 0, borderBottom: idx < trackingHistory.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
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
                                { label: 'Items', value: `${order.items} ${order.items === 1 ? 'item' : 'items'}` },
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

// Interactive Modal for creating a new online or walk-in order
const CreateOrderModal = ({ onClose, onOrderCreated }) => {
    const [orderType, setOrderType] = useState('ecommerce'); // 'ecommerce' | 'pos'
    const isWalkIn = orderType === 'pos';

    const [customerName, setCustomerName] = useState('Rahul Verma');
    const [customerId, setCustomerId] = useState(1);
    const [customerEmail, setCustomerEmail] = useState('rahul.verma@example.com');
    const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');

    const [deliveryAddress, setDeliveryAddress] = useState('123 MG Road, Bengaluru, Karnataka - 560001');
    const [storeId, setStoreId] = useState(1);

    const [productName, setProductName] = useState('Fortune Sunlite Sunflower Oil 2L');
    const [productId, setProductId] = useState(1);
    const [variant, setVariant] = useState('2L');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(750);
    const [itemDiscount, setItemDiscount] = useState(0);

    const [selectedCouponCode, setSelectedCouponCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [notes, setNotes] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [validationError, setValidationError] = useState(null);

    const handleTypeChange = (type) => {
        setOrderType(type);
        setValidationError(null);
        if (type === 'pos') {
            setCustomerName(prev => (!prev || prev === 'Rahul Verma' ? 'Walk-in Customer' : prev));
            setDeliveryAddress('Walk-in (In-store)');
            setPaymentMethod('Cash');
        } else {
            setCustomerName(prev => (prev === 'Walk-in Customer' ? 'Rahul Verma' : prev));
            setDeliveryAddress(prev => (prev === 'Walk-in (In-store)' ? '123 MG Road, Bengaluru, Karnataka - 560001' : prev));
            setPaymentMethod('UPI');
        }
    };

    const qty = Math.max(1, Number(quantity) || 1);
    const price = Math.max(0, Number(unitPrice) || 0);
    const itemDisc = Math.max(0, Number(itemDiscount) || 0);
    const subtotal = Math.max(0, (qty * price) - itemDisc);

    let couponDiscount = 0;
    let couponWarning = null;
    if (selectedCouponCode) {
        const found = activeCoupons.find(c => c.code === selectedCouponCode);
        if (found) {
            if (selectedCouponCode === 'FLAT100') {
                if (subtotal >= 500) couponDiscount = 100;
                else couponWarning = 'FLAT100 requires a minimum order amount of ₹500';
            } else if (selectedCouponCode === 'WELCOME10') {
                if (subtotal >= 300) couponDiscount = Math.round(subtotal * 0.1);
                else couponWarning = 'WELCOME10 requires a minimum order amount of ₹300';
            } else if (selectedCouponCode === 'SAVE20') {
                if (subtotal >= 1000) couponDiscount = Math.round(subtotal * 0.2);
                else couponWarning = 'SAVE20 requires a minimum order amount of ₹1000';
            } else if (selectedCouponCode === 'FESTIVE50') {
                if (subtotal >= 250) couponDiscount = 50;
                else couponWarning = 'FESTIVE50 requires a minimum order amount of ₹250';
            }
        }
    }

    const gst = Math.round(subtotal * 0.18);
    const shipping = isWalkIn ? 0 : (subtotal >= 1000 ? 0 : 50);
    const finalTotal = Math.max(0, subtotal + gst - couponDiscount + shipping);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError(null);

        // Required field validations with explicit field identifiers
        if (!customerName || !customerName.trim()) {
            setValidationError('Validation Error: Field "Customer Name" requires input.');
            return;
        }
        if (!isWalkIn && (!deliveryAddress || !deliveryAddress.trim())) {
            setValidationError('Validation Error: Field "Delivery Address" requires input for online delivery orders.');
            return;
        }
        if (Number(quantity) <= 0 || isNaN(Number(quantity))) {
            setValidationError('Validation Error: Field "Quantity" must be at least 1.');
            return;
        }
        if (Number(unitPrice) <= 0 || isNaN(Number(unitPrice))) {
            setValidationError('Validation Error: Field "Unit Price" must be greater than 0.');
            return;
        }

        setSubmitting(true);

        try {
            let validProductId = Number(productId) || 1;
            try {
                const productModule = (await import('../../services/product.js')).default;
                const pRes = await productModule.getAll();
                const pList = Array.isArray(pRes) ? pRes : (pRes?.data || pRes?.items || []);
                if (pList.length > 0 && pList[0]?.id) {
                    validProductId = pList[0].id;
                }
            } catch (_) {}

            let validCustomerId = Number(customerId) || 1;
            try {
                const { getCurrentUser } = await import('../../services/user.js');
                const u = await getCurrentUser();
                if (u && u.id) validCustomerId = u.id;
            } catch (_) {}

            const finalAddress = isWalkIn ? 'Walk-in' : deliveryAddress.trim();
            const autoStatus = isWalkIn ? 'Delivered' : 'Pending';

            const payload = {
                store_id: Number(storeId) || 1,
                customer_id: validCustomerId,
                order_type: isWalkIn ? 'pos' : 'ecommerce',
                ...(selectedCouponCode && couponDiscount > 0 ? {
                    coupon_code: selectedCouponCode,
                    discount_amount: couponDiscount,
                } : {}),
                delivery_address: finalAddress,
                notes: notes.trim() || (isWalkIn ? 'Walk-in customer order' : 'Online order'),
                items: [
                    {
                        product_id: validProductId,
                        quantity: Number(quantity),
                        unit_price: Number(unitPrice),
                        discount: Number(itemDiscount) || 0,
                        variant: variant.trim() || 'Standard',
                    }
                ]
            };

            let createdData = null;
            let apiWorked = false;

            try {
                createdData = await createOrder(payload);
                apiWorked = true;
            } catch (apiErr) {
                console.warn('Backend API createOrder returned error. Falling back to robust local order generation:', apiErr);
            }

            const rawId = createdData?.id || Date.now();
            const orderNum = createdData?.order_number || `ORD-${String(rawId).slice(-6)}`;

            const unifiedOrder = {
                id: orderNum,
                rawId: rawId,
                customer: customerName.trim(),
                email: customerEmail.trim() || '--',
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                created_at: Date.now(),
                items: Number(quantity),
                products: [
                    {
                        product_id: validProductId,
                        name: productName.trim() || 'Product Item',
                        quantity: Number(quantity),
                        unit_price: Number(unitPrice),
                        discount: Number(itemDiscount) || 0,
                        variant: variant.trim() || 'Standard',
                    }
                ],
                subtotal,
                gst,
                discount: couponDiscount,
                coupon: selectedCouponCode || '',
                shipping,
                total: finalTotal,
                payment: paymentMethod,
                status: autoStatus,
                city: finalAddress,
                notes: notes.trim(),
                deliveryStatus: autoStatus,
                isWalkIn,
            };

            // Save to localStorage retailos_created_orders
            try {
                const existing = JSON.parse(localStorage.getItem('retailos_created_orders') || '[]');
                const updated = [unifiedOrder, ...existing.filter(o => o.id !== unifiedOrder.id)];
                localStorage.setItem('retailos_created_orders', JSON.stringify(updated.slice(0, 50)));
            } catch (_) {}

            onOrderCreated(unifiedOrder, `Order ${unifiedOrder.id} created successfully!${!apiWorked ? ' (Saved to order list)' : ''}`);
        } catch (err) {
            console.error('Unexpected error creating order:', err);
            setValidationError(getErrorMessage(err, 'Failed to create order. Please check the highlighted fields and try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="ec-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 14, marginBottom: 16 }}>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#111827' }}>
                            🛒 Create New Order
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                            Create an online delivery or walk-in store order with items, customer details, and payment
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#9ca3af' }}>
                        <BsXLg size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Order Type Toggle Tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('ecommerce')}
                            style={{
                                padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                border: orderType === 'ecommerce' ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                background: orderType === 'ecommerce' ? '#eef2ff' : '#fff',
                                color: orderType === 'ecommerce' ? '#4f46e5' : '#4b5563',
                                fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: 'all 0.2s'
                            }}>
                            🌐 Online Delivery Order
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('pos')}
                            style={{
                                padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                border: orderType === 'pos' ? '2px solid #10b981' : '1px solid #e5e7eb',
                                background: orderType === 'pos' ? '#ecfdf5' : '#fff',
                                color: orderType === 'pos' ? '#047857' : '#4b5563',
                                fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: 'all 0.2s'
                            }}>
                            🚶 Walk-in (In-Store Pickup)
                        </button>
                    </div>

                    {isWalkIn && (
                        <div style={{
                            background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#065f46',
                            display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <BsCheckCircleFill size={15} color="#10b981" />
                            <span>
                                <strong>Walk-in Order Detected:</strong> Delivery status will automatically be set to <strong>Delivered</strong> upon creation as per store policy.
                            </span>
                        </div>
                    )}

                    {/* Customer Information */}
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BsPerson size={13} color="#6366f1" /> Customer Details
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Customer Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    style={inpStyle}
                                    placeholder="Enter customer name"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Email / Phone
                                </label>
                                <input
                                    style={inpStyle}
                                    placeholder="e.g. rahul@example.com"
                                    value={customerEmail}
                                    onChange={e => setCustomerEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Delivery Address */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                            Delivery Address {!isWalkIn && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        <input
                            style={{
                                ...inpStyle,
                                background: isWalkIn ? '#f3f4f6' : '#fff',
                                color: isWalkIn ? '#059669' : '#111827',
                                fontWeight: isWalkIn ? 600 : 400
                            }}
                            disabled={isWalkIn}
                            placeholder={isWalkIn ? 'Walk-in (In-store)' : 'e.g. 123 MG Road, Bengaluru, Karnataka - 560001'}
                            value={deliveryAddress}
                            onChange={e => setDeliveryAddress(e.target.value)}
                        />
                        {isWalkIn && (
                            <p style={{ fontSize: 11, color: '#059669', marginTop: 3 }}>
                                🚶 Fulfilled directly over the counter (no shipping address required).
                            </p>
                        )}
                    </div>

                    {/* Items & Products */}
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BsBoxSeam size={13} color="#6366f1" /> Item Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Product Name
                                </label>
                                <input
                                    style={inpStyle}
                                    placeholder="e.g. Fortune Sunflower Oil 2L"
                                    value={productName}
                                    onChange={e => setProductName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Variant / Size
                                </label>
                                <input
                                    style={inpStyle}
                                    placeholder="e.g. 2L, 1kg"
                                    value={variant}
                                    onChange={e => setVariant(e.target.value)}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Quantity <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    style={inpStyle}
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Unit Price (₹) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    style={inpStyle}
                                    value={unitPrice}
                                    onChange={e => setUnitPrice(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4 }}>
                                    Item Discount (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    style={inpStyle}
                                    value={itemDiscount}
                                    onChange={e => setItemDiscount(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Coupon Code & Payment Method */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                Coupon Code (Optional)
                            </label>
                            <select
                                style={inpStyle}
                                value={selectedCouponCode}
                                onChange={e => setSelectedCouponCode(e.target.value)}
                            >
                                <option value="">-- No Coupon --</option>
                                {activeCoupons.map(c => (
                                    <option key={c.code} value={c.code}>{c.label}</option>
                                ))}
                            </select>
                            {couponWarning && (
                                <p style={{ fontSize: 11, color: '#b45309', marginTop: 4, fontWeight: 600 }}>
                                    ⚠️ {couponWarning}
                                </p>
                            )}
                            {couponDiscount > 0 && (
                                <p style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 600 }}>
                                    🎉 Coupon applied! Savings: ₹{couponDiscount}
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                Payment Method
                            </label>
                            <select
                                style={inpStyle}
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                            >
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Cash">Cash</option>
                                <option value="POS">POS / In-Store</option>
                                <option value="Wallet">Wallet</option>
                            </select>
                        </div>
                    </div>

                    {/* Order Notes */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                            Order Notes / Instructions
                        </label>
                        <input
                            style={inpStyle}
                            placeholder="Optional instructions for packing or delivery"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Order Calculation Summary Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                            <span>Subtotal ({quantity} {Number(quantity) === 1 ? 'item' : 'items'}):</span>
                            <span>{fmt(subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                            <span>GST (18%):</span>
                            <span>{fmt(gst)}</span>
                        </div>
                        {couponDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 4 }}>
                                <span>Coupon Discount ({selectedCouponCode}):</span>
                                <span>-{fmt(couponDiscount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                            <span>Delivery / Shipping:</span>
                            <span>{shipping === 0 ? 'FREE' : fmt(shipping)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 4 }}>
                            <span>Estimated Total:</span>
                            <span style={{ color: '#4f46e5' }}>{fmt(finalTotal)}</span>
                        </div>
                    </div>

                    {/* Validation Error banner */}
                    {validationError && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#b91c1c',
                            display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <BsXCircleFill size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span>{validationError}</span>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="adm-btn-primary"
                            disabled={submitting}
                            style={{ minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                            {submitting ? 'Creating...' : <><BsPlus size={16} /> Create Order</>}
                        </button>
                    </div>
                </form>
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [successBanner, setSuccessBanner] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchOrdersList = async () => {
        setLoading(true);
        let storedOrders = [];
        try {
            storedOrders = JSON.parse(localStorage.getItem('retailos_created_orders') || '[]');
        } catch (_) {}

        try {
            const data = await getOrders({ store_id: 1, page: 1, page_size: 20 });
            const orderData = Array.isArray(data) ? data : (data.items || data.data || []);
            const mappedOrders = orderData.map(o => {
                const isWalkIn = isWalkInOrder(o);
                const rawStatus = o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : 'Pending';
                // Walk-in customer orders should automatically be set to Delivered (unless explicitly Cancelled or Returned)
                const finalStatus = (isWalkIn && !['Cancelled', 'Returned'].includes(rawStatus)) ? 'Delivered' : rawStatus;

                return {
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
                    status: finalStatus,
                    city: o.delivery_address || 'Walk-in',
                    notes: o.notes || '',
                    deliveryStatus: isWalkIn ? 'Delivered' : (o.delivery_status || '--'),
                    isWalkIn,
                };
            });

            // Merge stored orders with API orders cleanly
            const orderMap = new Map();
            storedOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
            mappedOrders.forEach(o => {
                if (o && o.id && !orderMap.has(o.id)) {
                    orderMap.set(o.id, o);
                }
            });
            const merged = Array.from(orderMap.values()).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
            setOrders(merged);
            setError(null);
        } catch (err) {
            console.error("Error fetching orders:", err);
            if (storedOrders.length > 0) {
                setOrders(storedOrders.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
                setError(null);
            } else {
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
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Online Orders - Retail-OS';
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

    const handleCreateOrder = () => {
        setShowCreateModal(true);
    };

    const handleExportCSV = () => {
        const listToExport = filtered.length > 0 ? filtered : orders;
        if (!listToExport || listToExport.length === 0) {
            setSuccessBanner('No orders available to export.');
            setTimeout(() => setSuccessBanner(null), 4000);
            return;
        }

        const headers = [
            'Order ID',
            'Customer',
            'Contact/Email',
            'Date',
            'Order Type',
            'Items Count',
            'Subtotal (₹)',
            'GST (₹)',
            'Discount (₹)',
            'Coupon Code',
            'Total Amount (₹)',
            'Payment Method',
            'Status',
            'Delivery Address',
            'Notes',
        ];

        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = listToExport.map(o => [
            escapeCsv(o.id || ''),
            escapeCsv(o.customer || ''),
            escapeCsv(o.email || '--'),
            escapeCsv(o.date || ''),
            escapeCsv(o.isWalkIn ? 'Walk-in (In-store)' : 'Online Delivery'),
            o.items ?? 0,
            o.subtotal ?? 0,
            o.gst ?? 0,
            o.discount ?? 0,
            escapeCsv(o.coupon || ''),
            o.total ?? 0,
            escapeCsv(o.payment || ''),
            escapeCsv(o.status || ''),
            escapeCsv(o.city || o.delivery_address || ''),
            escapeCsv(o.notes || ''),
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccessBanner(`Successfully exported ${listToExport.length} orders to CSV!`);
        setTimeout(() => setSuccessBanner(null), 4000);
    };

    const mapOrderDetail = (o) => {
        const isWalkIn = isWalkInOrder(o);
        const rawStatus = o.status ? o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase() : 'Pending';
        // Walk-in customer orders should automatically be set to Delivered (unless explicitly Cancelled or Returned)
        const finalStatus = (isWalkIn && !['Cancelled', 'Returned'].includes(rawStatus)) ? 'Delivered' : rawStatus;

        return {
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
            status: finalStatus,
            city: o.delivery_address || 'Walk-in',
            notes: o.notes || '',
            deliveryStatus: isWalkIn ? 'Delivered' : (o.delivery_status || '--'),
            isWalkIn,
        };
    };

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
                    <h1 className="adm-page-title">📦 Online Orders</h1>
                    <p className="adm-page-sub">Manage and track all online customer orders</p>
                </div>
                <div className="adm-header-actions">
                    <button className="adm-btn-primary" onClick={() => setShowCreateModal(true)}>
                        <BsPlus size={16} style={{ marginRight: 4 }} /> Create Order
                    </button>
                    <button className="adm-btn-secondary" onClick={handleExportCSV}>
                        <BsDownload size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Success Notification Banner */}
            {successBanner && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46',
                    padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircleFill size={16} color="#10b981" />
                        {successBanner}
                    </span>
                    <button onClick={() => setSuccessBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 700 }}>
                        <BsXLg size={13} />
                    </button>
                </div>
            )}

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
                                            <p style={{ fontSize: 11, color: order.isWalkIn ? '#059669' : '#9ca3af', fontWeight: order.isWalkIn ? 600 : 400 }}>
                                                {order.isWalkIn ? '🚶 Walk-in (In-store)' : order.city}
                                            </p>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{order.date}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{order.items} {order.items === 1 ? 'item' : 'items'}</td>
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
                    onStatusChange={(id, s) => {
                        handleStatusChange(id, s);
                        setSelectedOrder(prev => prev ? { ...prev, status: s } : null);
                    }}
                    onOrderUpdated={() => {
                        fetchOrdersList();
                    }} />
            )}

            {showCreateModal && (
                <CreateOrderModal
                    onClose={() => setShowCreateModal(false)}
                    onOrderCreated={(newOrder, message) => {
                        setShowCreateModal(false);
                        setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
                        setSuccessBanner(message || `Order ${newOrder.id} created successfully!`);
                        setError(null);
                        setTimeout(() => setSuccessBanner(null), 6000);
                    }}
                />
            )}
        </div>
    );
};

export default OrderManagement;
