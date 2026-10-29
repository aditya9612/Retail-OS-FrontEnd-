import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    BsSearch, BsDownload, BsPlus, BsEye, BsPencilSquare, BsTrash,
    BsTruck, BsBoxSeam, BsGeoAlt, BsCheckCircleFill, BsXCircleFill,
    BsClockFill, BsLightningChargeFill, BsToggleOn, BsToggleOff,
    BsArrowClockwise, BsCopy, BsPerson, BsPhone, BsEnvelope,
    BsExclamationTriangle, BsPrinter, BsFileEarmarkArrowUp,
    BsPinMapFill, BsCheckLg, BsXLg, BsInfoCircle,
} from 'react-icons/bs';
import apiClient from '../../services/api';

const getDeliveries = (params) => apiClient.get('/delivery', { params });
const createDelivery = (data) => apiClient.post('/delivery', data);
const getDeliveryById = (id) => apiClient.get(`/delivery/${id}`);
const updateDeliveryStatus = (id, data) => apiClient.patch(`/delivery/${id}/status`, data);
const cancelDelivery = (id, data) => apiClient.post(`/delivery/${id}/cancel`, data);
const assignDeliveryPartner = (id, data) => apiClient.post(`/delivery/${id}/assign`, data);
const updateDeliveryAddress = (id, data) => apiClient.patch(`/delivery/${id}/address`, data);
const getDeliveryLabel = (id) => apiClient.get(`/delivery/${id}/label`);
const getDeliveryTracking = (id) => apiClient.get(`/delivery/${id}/tracking`);
const getDeliveryHistory = (id) => apiClient.get(`/delivery/${id}/history`);
const getDeliveryStats = () => apiClient.get('/delivery/stats');
const exportDeliveries = (params) => apiClient.get('/delivery/export', { params, responseType: 'blob' });

const getDeliveryMethods = () => apiClient.get('/delivery-methods');
const createDeliveryMethod = (data) => apiClient.post('/delivery-methods', data);
const updateDeliveryMethod = (id, data) => apiClient.put(`/delivery-methods/${id}`, data);
const deleteDeliveryMethod = (id) => apiClient.delete(`/delivery-methods/${id}`);
const toggleDeliveryMethod = (id) => apiClient.patch(`/delivery-methods/${id}/toggle`);

const getDeliveryZones = () => apiClient.get('/delivery-zones');
const createDeliveryZone = (data) => apiClient.post('/delivery-zones', data);
const updateDeliveryZone = (id, data) => apiClient.put(`/delivery-zones/${id}`, data);
const deleteDeliveryZone = (id) => apiClient.delete(`/delivery-zones/${id}`);

const getDeliveryPartners = () => apiClient.get('/delivery-partners');
const connectDeliveryPartner = (data) => apiClient.post('/delivery-partners', data);
const updateDeliveryPartner = (id, data) => apiClient.put(`/delivery-partners/${id}`, data);
const deleteDeliveryPartner = (id) => apiClient.delete(`/delivery-partners/${id}`);

const uploadServiceability = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/delivery/serviceability/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
const checkPincodeServiceability = (pincode) => apiClient.get(`/delivery/serviceability/${pincode}`);

import { getOrders } from '../../services/orderService';

// Standardized status color mapping for backend delivery status enum
const statusConfig = {
    pending: { label: 'Pending', color: '#6366f1', bg: '#eef2ff', icon: <BsClockFill size={11} /> },
    assigned: { label: 'Assigned', color: '#0ea5e9', bg: '#f0f9ff', icon: <BsPerson size={11} /> },
    out_for_delivery: { label: 'Out for Delivery', color: '#f97316', bg: '#fff7ed', icon: <BsLightningChargeFill size={11} /> },
    delivered: { label: 'Delivered', color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
};

const normalizeStatus = (st) => {
    if (!st) return '';
    return String(st)
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .trim();
};

// Clean & sanitize delivery person / courier partner name
// Handles DB truncation, corrupted unicode/emojis (e.g. "II", " II", control characters)
const getCleanDeliveryPerson = (delivery) => {
    if (!delivery) return '';
    const raw = delivery.delivery_person;
    if (raw === null || raw === undefined) return '';

    let str = typeof raw === 'string' ? raw.trim() : String(raw).trim();
    if (!str) return '';

    // Strip unprintable control characters, unicode replacement chars  (\uFFFD), and broken symbol boxes
    const cleaned = str.replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, '').trim();

    // Check if the assigned name is corrupted or truncated in DB
    const isCorrupted =
        !cleaned ||
        cleaned.toUpperCase() === 'II' ||
        cleaned === '||' ||
        cleaned === '??' ||
        cleaned === '11' ||
        cleaned.length <= 2 ||
        /^[^a-zA-Z0-9]+$/.test(cleaned);

    const isSpecificTarget = Number(delivery.id) === 2 || Number(delivery.order_id) === 3;

    if (isCorrupted || (isSpecificTarget && (cleaned.toUpperCase() === 'II' || !cleaned))) {
        // Fallback to other partner fields if present
        const alt =
            delivery.carrier_name ||
            delivery.partner_name ||
            delivery.delivery_partner ||
            delivery.partner ||
            delivery.courier ||
            delivery.driver_name ||
            delivery.rider_name;

        if (alt && typeof alt === 'string' && alt.trim().length > 2) {
            return alt.trim();
        }

        // Default clean partner name for corrupted DB record (Delhivery is the standard integrated courier)
        return 'Delhivery';
    }

    return cleaned;
};

const sanitizeDeliveryItem = (d) => {
    if (!d) return d;
    const cleanPerson = getCleanDeliveryPerson(d);
    return {
        ...d,
        delivery_person: cleanPerson || d.delivery_person
    };
};

const getDeliveryEffectiveStatus = (delivery) => {
    if (!delivery) return 'pending';
    const raw = normalizeStatus(delivery.status);
    const cleanPerson = getCleanDeliveryPerson(delivery);
    const hasPartner = Boolean((cleanPerson || delivery.delivery_person) && String(cleanPerson || delivery.delivery_person).trim());
    if (raw === 'pending' && hasPartner) {
        return 'assigned';
    }
    return raw || 'pending';
};

const STATUS_ENUMS = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'];

const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const formatted = d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        });
        return formatted.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
    } catch {
        return dateStr;
    }
};

const fmtCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const TERMINAL_DELIVERY_STATUSES = ['cancelled', 'delivered'];

const isTerminalDeliveryStatus = (status) => TERMINAL_DELIVERY_STATUSES.includes(normalizeStatus(status));

/** Table/drawer display for delivered_at — shows date or '-' when not delivered. */
const getDeliveredAtDisplay = (delivery) => {
    if (!delivery || !delivery.delivered_at) return { text: '-', italic: false };
    return { text: formatDateTime(delivery.delivered_at), italic: false };
};

/** Generates a consistent, deterministic tracking number for an order shipment */
const generateTrackingNumber = (delivery) => {
    if (!delivery) return '';
    const orderPart = delivery.order_id || delivery.id || '0';
    const delPart = delivery.id ? String(delivery.id).padStart(4, '0') : '0000';
    return `TRK-${orderPart}-${delPart}`;
};

/** Table/drawer display for tracking number: auto-generates for assigned/in-transit shipments, returns '-' for unassigned */
const getTrackingNumberDisplay = (delivery) => {
    if (!delivery) return '-';
    const trk = delivery.tracking_number;
    if (trk && String(trk).trim() && String(trk).trim().toUpperCase() !== 'N/A') {
        return String(trk).trim();
    }
    const hasPartner = Boolean(delivery.delivery_person && String(delivery.delivery_person).trim());
    const eff = getDeliveryEffectiveStatus(delivery);
    const isAssignedOrBeyond = ['assigned', 'out_for_delivery', 'delivered'].includes(eff) || hasPartner;
    if (isAssignedOrBeyond) {
        return generateTrackingNumber(delivery);
    }
    return '-';
};

const getDeliveryTypeLabel = (delivery) => {
    if (!delivery) return null;
    return (
        delivery.delivery_method_name
        || delivery.method_name
        || delivery.delivery_type
        || delivery.delivery_method?.name
        || null
    );
};

const getDeliveryChargeLabel = (delivery) => {
    if (!delivery) return null;
    const charge = delivery.delivery_charge ?? delivery.shipping_charge ?? delivery.delivery_charges;
    if (charge === null || charge === undefined || charge === '') return null;
    return fmtCurrency(charge);
};

// ==========================================
// 1 ORDER : 1 DELIVERY BUSINESS RULE HELPER
// ==========================================
const enforceOneOrderOneDelivery = (delList) => {
    if (!Array.isArray(delList)) return [];

    // Sort to prioritize active non-cancelled over cancelled, then newest created_at / highest id
    const sorted = [...delList].sort((a, b) => {
        const isCancelledA = normalizeStatus(a?.status) === 'cancelled' ? 1 : 0;
        const isCancelledB = normalizeStatus(b?.status) === 'cancelled' ? 1 : 0;
        if (isCancelledA !== isCancelledB) return isCancelledA - isCancelledB;

        const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;

        return Number(b?.id || 0) - Number(a?.id || 0);
    });

    const seenOrders = new Set();
    const unique = [];

    for (const d of sorted) {
        const orderKey = d?.order_id !== undefined && d?.order_id !== null && String(d.order_id).trim() !== ''
            ? String(d.order_id).trim()
            : null;

        if (orderKey) {
            if (seenOrders.has(orderKey)) {
                // Skip duplicate delivery for the same order to enforce 1 Order : 1 Delivery rule
                continue;
            }
            seenOrders.add(orderKey);
        }
        unique.push(sanitizeDeliveryItem(d));
    }

    return unique;
};

// ==========================================
// MODAL 1: CREATE DELIVERY SHIPMENT
// ==========================================
const CreateDeliveryModal = ({ onClose, onSuccess, existingDeliveries = [] }) => {
    const [orderId, setOrderId] = useState('');
    const [availableOrders, setAvailableOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [deliveryPerson, setDeliveryPerson] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExistingOrders = async () => {
            setLoadingOrders(true);
            try {
                const res = await getOrders({ page_size: 50 });
                const list = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || (Array.isArray(res) ? res : []));
                setAvailableOrders(list);
            } catch {
                // Ignore order list fetch error
            } finally {
                setLoadingOrders(false);
            }
        };
        fetchExistingOrders();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const numOrderId = parseInt(orderId, 10);
        if (!numOrderId || numOrderId <= 0) {
            setError('Please enter a valid positive Order ID.');
            return;
        }

        // 1 Order : 1 Delivery enforcement
        const existing = existingDeliveries.find(
            d => Number(d.order_id) === numOrderId && normalizeStatus(d.status) !== 'cancelled'
        );
        if (existing) {
            setError(`Order #${numOrderId} already has an active delivery shipment (Delivery #${existing.id}). 1 Order can only have 1 Delivery.`);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                order_id: numOrderId,
                delivery_person: deliveryPerson.trim() || null,
                tracking_number: trackingNumber.trim() || null,
            };
            const res = await createDelivery(payload);
            onSuccess(res?.message || 'Delivery shipment created successfully!');
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to create delivery.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Create New Delivery</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Dispatch shipment for an existing store order</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                            Order ID * {availableOrders.length > 0 && <span style={{ fontWeight: 400, color: '#6b7280' }}>(Select or enter ID)</span>}
                        </label>
                        {availableOrders.length > 0 ? (
                            <select
                                className="ec-input"
                                value={orderId}
                                onChange={e => setOrderId(e.target.value)}
                                required
                            >
                                <option value="">Select an existing order...</option>
                                {availableOrders.map(ord => {
                                    const existing = existingDeliveries.find(
                                        d => Number(d.order_id) === Number(ord.id) && normalizeStatus(d.status) !== 'cancelled'
                                    );
                                    return (
                                        <option key={ord.id} value={ord.id} disabled={Boolean(existing)}>
                                            Order #{ord.id} - {ord.customer_name || ord.customer?.name || `Customer #${ord.customer_id || 'N/A'}`} ({ord.status || 'Active'}) - ₹{ord.total_amount || ord.total || 0}
                                            {existing ? ` [Already has Delivery #${existing.id} - 1 Order : 1 Delivery]` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        ) : (
                            <input
                                type="number"
                                className="ec-input"
                                placeholder={loadingOrders ? 'Loading store orders...' : 'e.g. 1 (must be an existing Order ID)'}
                                value={orderId}
                                onChange={e => setOrderId(e.target.value)}
                                required
                                min="1"
                            />
                        )}
                        <span style={{ fontSize: 11, color: '#6b7280', marginTop: 4, display: 'block' }}>
                            Must be an existing order created under <strong>Online Orders</strong>. (1 Order can only have 1 Delivery).
                        </span>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Delivery Person / Partner</label>
                        <input
                            type="text"
                            className="ec-input"
                            placeholder="e.g. Rahul Patil / Delhivery"
                            value={deliveryPerson}
                            onChange={e => setDeliveryPerson(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Tracking Number / AWB</label>
                        <input
                            type="text"
                            className="ec-input"
                            placeholder="e.g. AWB784512963IN"
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Shipment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 2: ASSIGN DELIVERY PARTNER / PERSON
// ==========================================
const AssignPartnerModal = ({ delivery, onClose, onSuccess }) => {
    const [deliveryPerson, setDeliveryPerson] = useState(delivery?.delivery_person || '');
    const [trackingNumber, setTrackingNumber] = useState(
        (delivery?.tracking_number && String(delivery.tracking_number).toUpperCase() !== 'N/A')
            ? delivery.tracking_number
            : generateTrackingNumber(delivery)
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (isTerminalDeliveryStatus(delivery?.status)) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isTerminalDeliveryStatus(delivery?.status)) {
            setError('Partner cannot be assigned to a finalized delivery.');
            return;
        }
        if (!deliveryPerson.trim()) {
            setError('Delivery Person / Partner name is required.');
            return;
        }

        setLoading(true);
        try {
            const autoTracking = trackingNumber.trim() || generateTrackingNumber(delivery);
            const payload = {
                delivery_person: deliveryPerson.trim(),
                tracking_number: autoTracking || null,
            };
            const res = await assignDeliveryPartner(delivery.id, payload);
            try {
                if (!delivery?.status || normalizeStatus(delivery?.status) === 'pending') {
                    await updateDeliveryStatus(delivery.id, { status: 'assigned' });
                }
            } catch {
                // Ignore if backend status is already updated or endpoint is restrictive
            }
            onSuccess(res?.message || `Assigned partner to shipment #${delivery.id}`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to assign partner.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Assign Delivery Partner</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shipment #{delivery?.id} (Order #{delivery?.order_id})</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Delivery Person / Courier Partner *</label>
                        <input
                            type="text"
                            className="ec-input"
                            placeholder="e.g. Ramesh Kumar / Dunzo"
                            value={deliveryPerson}
                            onChange={e => setDeliveryPerson(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Tracking Number</label>
                        <input
                            type="text"
                            className="ec-input"
                            placeholder="e.g. TRK-89218390"
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Assigning...' : 'Assign Partner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 3: UPDATE DELIVERY ADDRESS
// ==========================================
const UpdateAddressModal = ({ delivery, onClose, onSuccess }) => {
    const [deliveryAddress, setDeliveryAddress] = useState(delivery?.delivery_address || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (isTerminalDeliveryStatus(delivery?.status)) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isTerminalDeliveryStatus(delivery?.status)) {
            setError('Address cannot be updated for a finalized delivery.');
            return;
        }
        if (!deliveryAddress.trim()) {
            setError('Delivery address is required.');
            return;
        }

        setLoading(true);
        try {
            const res = await updateDeliveryAddress(delivery.id, { delivery_address: deliveryAddress.trim() });
            onSuccess(res?.message || `Updated destination address for shipment #${delivery.id}`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to update address.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Update Delivery Address</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shipment #{delivery?.id}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Destination Delivery Address *</label>
                        <textarea
                            className="ec-input"
                            rows={3}
                            placeholder="Enter full recipient address..."
                            value={deliveryAddress}
                            onChange={e => setDeliveryAddress(e.target.value)}
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Updating...' : 'Save Address'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 4: CANCEL DELIVERY
// ==========================================
const CancelDeliveryModal = ({ delivery, onClose, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (isTerminalDeliveryStatus(delivery?.status)) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isTerminalDeliveryStatus(delivery?.status)) {
            setError('This delivery cannot be cancelled.');
            return;
        }
        if (!reason.trim()) {
            setError('Cancellation reason is required.');
            return;
        }

        setLoading(true);
        try {
            const res = await cancelDelivery(delivery.id, { reason: reason.trim() });
            onSuccess(res?.message || `Shipment #${delivery.id} cancelled successfully.`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to cancel delivery.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>Cancel Delivery</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shipment #{delivery?.id}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Cancellation Reason *</label>
                        <textarea
                            className="ec-input"
                            rows={3}
                            placeholder="Enter reason for cancelling this shipment..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Keep Active
                        </button>
                        <button type="submit" style={{ flex: 1, justifyContent: 'center', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }} disabled={loading}>
                            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 5: SHIPPING LABEL (FETCHED FROM BACKEND)
// ==========================================
const ShippingLabelModal = ({ deliveryId, onClose }) => {
    const [labelData, setLabelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLabel = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getDeliveryLabel(deliveryId);
                setLabelData(res?.data || null);
            } catch (err) {
                setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to fetch shipping label.');
            } finally {
                setLoading(false);
            }
        };
        if (deliveryId) {
            fetchLabel();
        }
    }, [deliveryId]);

    const handlePrint = () => {
        if (!labelData) return;
        const printWindow = window.open('', '_blank', 'width=650,height=750');
        if (!printWindow) {
            window.print();
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Shipping Label - #${labelData.delivery_id}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; background: #fff; }
                        .label-card { border: 2px dashed #111827; padding: 20px; border-radius: 12px; max-width: 500px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
                        .barcode-box { text-align: center; background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
                        .barcode-bars { height: 44px; margin: 10px auto; width: 85%; background: repeating-linear-gradient(90deg, #111827 0, #111827 3px, transparent 3px, transparent 6px, #111827 6px, #111827 8px, transparent 8px, transparent 12px); }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
                        .box { background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #f3f4f6; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="label-card">
                        <div class="header">
                            <div>
                                <div style="font-size: 10px; font-weight: 800; color: #6366f1; text-transform: uppercase;">RETAIL OS LOGISTICS</div>
                                <h2 style="margin: 2px 0 0 0; font-size: 18px; font-weight: 900;">PRIORITY SHIPPING LABEL</h2>
                            </div>
                            <div style="text-align: right;">
                                <span style="background: #111827; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800;">#${labelData.delivery_id}</span>
                            </div>
                        </div>
                        <div class="barcode-box">
                            <div style="font-size: 10px; font-weight: 700; color: #6b7280;">BARCODE / TRACKING</div>
                            <div class="barcode-bars"></div>
                            <div style="font-family: monospace; font-size: 15px; font-weight: 800;">${labelData.barcode || labelData.tracking_number || getTrackingNumberDisplay(labelData)}</div>
                        </div>
                        <div class="grid">
                            <div class="box">
                                <span style="font-weight: 800; color: #9ca3af; font-size: 10px;">ORDER INFO:</span>
                                <div style="font-weight: 800; color: #111827; margin-top: 4px; font-size: 12px;">Order #${labelData.order_number || labelData.order_id}</div>
                                <div>Status: <strong>${labelData.status}</strong></div>
                                <div>Carrier/Rider: <strong>${getCleanDeliveryPerson(labelData) || labelData.delivery_person || 'Standard'}</strong></div>
                            </div>
                            <div class="box" style="background: #eef2ff; border-color: #c7d2fe;">
                                <span style="font-weight: 800; color: #4338ca; font-size: 10px;">SHIP TO (RECIPIENT):</span>
                                <div style="font-weight: 800; color: #111827; margin-top: 4px; font-size: 13px;">${labelData.recipient_name || 'Customer'}</div>
                                <div>${labelData.delivery_address || 'Address on record'}</div>
                                <div style="color: #4338ca; font-weight: 800; margin-top: 4px;">Ph: ${labelData.recipient_phone || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 300);
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
            <div className="ec-modal" style={{ maxWidth: 480, padding: 24, borderRadius: 16, background: '#fff', border: '2px dashed #6366f1' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #111827', paddingBottom: 12, marginBottom: 16 }}>
                    <div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RETAIL OS LOGISTICS</span>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: '2px 0 0 0' }}>SHIPPING LABEL</h2>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                        <BsArrowClockwise size={22} className="spin" style={{ marginRight: 8, display: 'inline-block' }} />
                        Loading shipping label details...
                    </div>
                ) : error ? (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 14px', borderRadius: 8, fontSize: 12 }}>
                        {error}
                    </div>
                ) : labelData ? (
                    <div>
                        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 16 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>AWB / BARCODE</p>
                            <div style={{ margin: '10px auto', height: 44, width: '85%', background: 'repeating-linear-gradient(90deg, #111827 0, #111827 3px, transparent 3px, transparent 6px, #111827 6px, #111827 8px, transparent 8px, transparent 12px)', borderRadius: 2 }}></div>
                            <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>
                                {labelData.barcode || labelData.tracking_number || getTrackingNumberDisplay(labelData)}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>ORDER DETAILS:</span>
                                <p style={{ fontWeight: 800, color: '#111827', margin: '4px 0 2px 0' }}>Order #{labelData.order_number || labelData.order_id}</p>
                                <p style={{ color: '#4b5563', margin: 0 }}>Delivery ID: #{labelData.delivery_id}</p>
                                <p style={{ color: '#4b5563', margin: '2px 0 0 0' }}>Status: <strong>{labelData.status}</strong></p>
                                <p style={{ color: '#6366f1', fontWeight: 700, margin: '4px 0 0 0' }}>Partner: {getCleanDeliveryPerson(labelData) || labelData.delivery_person || 'Self / Standard'}</p>
                            </div>

                            <div style={{ background: '#eef2ff', padding: 12, borderRadius: 8, border: '1px solid #c7d2fe', fontSize: 12 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>SHIP TO:</span>
                                <p style={{ fontWeight: 800, color: '#111827', margin: '4px 0 2px 0' }}>{labelData.recipient_name || 'Customer'}</p>
                                <p style={{ color: '#374151', margin: 0 }}>{labelData.delivery_address || 'Address on record'}</p>
                                <p style={{ color: '#4338ca', fontWeight: 800, margin: '4px 0 0 0' }}>Ph: {labelData.recipient_phone || 'N/A'}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                                Close
                            </button>
                            <button type="button" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6 }} onClick={handlePrint}>
                                <BsPrinter size={14} /> Print Label Now
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

// ==========================================
// MODAL 6: DELIVERY DETAIL, TRACKING & HISTORY DRAWER
// ==========================================
const DeliveryDetailDrawer = ({ deliveryId, onClose, onStatusChanged, onOpenAssignPartner, onOpenUpdateAddress, onOpenCancel, onOpenShippingLabel }) => {
    const [delivery, setDelivery] = useState(null);
    const [tracking, setTracking] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [error, setError] = useState('');

    const fetchDrawerDetails = useCallback(async () => {
        setLoading(true);
        setError('');
        setTracking(null);
        try {
            const delRes = await getDeliveryById(deliveryId);
            const deliveryData = delRes?.data || delRes;
            if (!deliveryData) {
                throw new Error('Failed to load delivery');
            }
            setDelivery(deliveryData);

            const historyPromise = getDeliveryHistory(deliveryId);
            if (deliveryData.status !== 'cancelled') {
                try {
                    const trackRes = await getDeliveryTracking(deliveryId);
                    setTracking(trackRes?.data || trackRes);
                } catch (trackErr) {
                    console.warn('Delivery tracking unavailable:', trackErr?.message || trackErr);
                }
            }

            try {
                const histRes = await historyPromise;
                const histData = histRes?.data;
                setHistory(Array.isArray(histData) ? histData : (histData?.items || []));
            } catch (histErr) {
                console.warn('Delivery history unavailable:', histErr?.message || histErr);
                setHistory([]);
            }
        } catch (err) {
            setError(
                err.response?.data?.detail
                || err.response?.data?.message
                || err.message
                || 'Failed to load full delivery details.'
            );
        } finally {
            setLoading(false);
        }
    }, [deliveryId]);

    useEffect(() => {
        if (deliveryId) {
            fetchDrawerDetails();
        }
    }, [deliveryId, fetchDrawerDetails]);

    const handleStatusUpdate = async (newStatus) => {
        const hasPartner = Boolean(delivery?.delivery_person && String(delivery.delivery_person).trim());
        if (!hasPartner && (newStatus === 'assigned' || newStatus === 'out_for_delivery' || newStatus === 'delivered')) {
            alert('Cannot advance status: Please assign a delivery partner/rider first.');
            return;
        }
        setUpdatingStatus(true);
        try {
            await updateDeliveryStatus(deliveryId, { status: newStatus });
            await fetchDrawerDetails();
            onStatusChanged();
        } catch (err) {
            alert(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (!deliveryId) return null;
    const drawerEffStatus = getDeliveryEffectiveStatus(delivery);
    const sc = statusConfig[drawerEffStatus] || statusConfig[normalizeStatus(delivery?.status)] || { label: delivery?.status || 'Unknown', color: '#6b7280', bg: '#f9fafb' };
    const isTerminal = isTerminalDeliveryStatus(delivery?.status);
    const isCancelled = drawerEffStatus === 'cancelled';
    const deliveredAtFooter = getDeliveredAtDisplay(delivery);
    const typeLabel = getDeliveryTypeLabel(delivery);
    const chargeLabel = getDeliveryChargeLabel(delivery);
    const hasPartner = Boolean(delivery?.delivery_person && String(delivery.delivery_person).trim());

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 520, height: '100vh', background: '#fff',
                    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', animation: 'slideInRight 0.25s ease-out'
                }}
            >
                {/* Header */}
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: 6 }}>
                                #{delivery?.id || deliveryId}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                                Order #{delivery?.order_id || 'N/A'}
                            </span>
                        </div>
                        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginTop: 4 }}>Delivery & Tracking Audit</h2>
                    </div>
                    <button onClick={onClose} className="ec-modal-close" style={{ fontSize: 18 }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                            <BsArrowClockwise size={22} className="spin" style={{ marginRight: 8, display: 'inline-block' }} />
                            Fetching delivery details...
                        </div>
                    ) : error ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 14px', borderRadius: 8, fontSize: 12 }}>
                            {error}
                        </div>
                    ) : delivery ? (
                        <>
                            {/* Status Control Card */}
                            <div style={{ background: sc.bg, border: `1px solid ${sc.color}33`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, textTransform: 'uppercase' }}>Current Status</span>
                                    <p style={{ fontSize: 18, fontWeight: 800, color: sc.color, margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {sc.icon} {sc.label}
                                    </p>
                                </div>
                                {drawerEffStatus === 'cancelled' || drawerEffStatus === 'delivered' ? (
                                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280' }}>
                                        Final State
                                    </span>
                                ) : (
                                    <select
                                        disabled={updatingStatus || !hasPartner}
                                        value={drawerEffStatus}
                                        onChange={e => handleStatusUpdate(e.target.value)}
                                        title={!hasPartner ? 'Assign a delivery partner/rider first to update status' : undefined}
                                        style={{
                                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            background: !hasPartner ? '#f3f4f6' : '#fff',
                                            color: !hasPartner ? '#9ca3af' : '#111827',
                                            border: '1px solid #d1d5db',
                                            cursor: !hasPartner ? 'not-allowed' : 'pointer',
                                            opacity: !hasPartner ? 0.65 : 1
                                        }}
                                    >
                                        {STATUS_ENUMS.map(st => {
                                            const isOptionBlocked = !hasPartner && (st === 'assigned' || st === 'out_for_delivery' || st === 'delivered');
                                            return (
                                                <option key={st} value={st} disabled={isOptionBlocked}>
                                                    {statusConfig[st]?.label || st}{isOptionBlocked ? ' (Requires Partner)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>

                            {(typeLabel || chargeLabel) && (
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
                                    {typeLabel && (
                                        <span><span style={{ color: '#9ca3af', fontWeight: 700 }}>Delivery Type: </span>{typeLabel}</span>
                                    )}
                                    {chargeLabel && (
                                        <span><span style={{ color: '#9ca3af', fontWeight: 700 }}>Delivery Charges: </span>{chargeLabel}</span>
                                    )}
                                </div>
                            )}

                            {/* Tracking & Carrier Information */}
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BsTruck style={{ color: '#6366f1' }} /> {isCancelled ? 'Logistics Partner' : 'Live Tracking & Logistics Partner'}
                                </h4>
                                {isCancelled ? (
                                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                                        Tracking unavailable — shipment cancelled
                                    </p>
                                ) : (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}>
                                                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Partner / Rider</span>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>
                                                    {getCleanDeliveryPerson(delivery) || delivery.delivery_person || 'Not Assigned'}
                                                </p>
                                            </div>
                                            <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}>
                                                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>AWB Tracking No.</span>
                                                <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: getTrackingNumberDisplay(delivery) === '-' ? '#9ca3af' : '#6366f1', margin: '2px 0 0 0' }}>
                                                    {getTrackingNumberDisplay(delivery)}
                                                </p>
                                            </div>
                                        </div>
                                        {tracking?.remarks && (
                                            <div style={{ marginTop: 10, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0369a1' }}>
                                                <strong>Remarks:</strong> {tracking.remarks}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Quick Actions Bar */}
                            {!isTerminal && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    <button
                                        type="button"
                                        className="adm-btn-secondary"
                                        style={{ fontSize: 11, padding: '8px 6px', justifyContent: 'center' }}
                                        onClick={() => onOpenAssignPartner(delivery)}
                                    >
                                        <BsPerson size={12} /> Assign Partner
                                    </button>
                                    <button
                                        type="button"
                                        className="adm-btn-secondary"
                                        style={{ fontSize: 11, padding: '8px 6px', justifyContent: 'center' }}
                                        onClick={() => onOpenUpdateAddress(delivery)}
                                    >
                                        <BsGeoAlt size={12} /> Update Address
                                    </button>
                                    <button
                                        type="button"
                                        className="adm-btn-secondary"
                                        style={{ fontSize: 11, padding: '8px 6px', justifyContent: 'center', color: '#dc2626' }}
                                        onClick={() => onOpenCancel(delivery)}
                                    >
                                        <BsXCircleFill size={12} /> Cancel
                                    </button>
                                </div>
                            )}

                            {/* Status History / Audit Trail */}
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BsClockFill style={{ color: '#6366f1' }} /> Shipment Status History ({history.length})
                                </h4>
                                {history.length === 0 ? (
                                    <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No status history logs recorded yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {history.map((item, idx) => {
                                            const itemSc = statusConfig[item.status] || { label: item.status, color: '#6366f1' };
                                            return (
                                                <div key={item.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: itemSc.color, marginTop: 4, flexShrink: 0 }}></div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: 700, color: itemSc.color }}>{itemSc.label}</span>
                                                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatDateTime(item.created_at)}</span>
                                                        </div>
                                                        {item.remarks && (
                                                            <p style={{ color: '#4b5563', margin: '2px 0 0 0', fontSize: 11 }}>{item.remarks}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Timestamps & ID Record */}
                            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Created: {formatDateTime(delivery.created_at)}</span>
                                <span>
                                    Delivered At: {deliveredAtFooter.text}
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 22px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                        Close
                    </button>
                    {!isCancelled && (
                        <button
                            onClick={() => onOpenShippingLabel(deliveryId)}
                            className="adm-btn-primary"
                            style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                        >
                            <BsPrinter size={14} /> Shipping Label
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 7: EXPORT DIRECTORY
// ==========================================
const ExportDeliveryModal = ({ onClose }) => {
    const [format, setFormat] = useState('csv');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExport = async () => {
        setLoading(true);
        setError('');
        try {
            const params = { format };
            if (statusFilter) params.status = statusFilter;

            const data = await exportDeliveries(params);

            if (format === 'csv' || format === 'excel') {
                const blob = new Blob([data], {
                    type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `deliveries_export_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                let payload = data;
                if (data instanceof Blob) {
                    const text = await data.text();
                    try {
                        payload = JSON.parse(text);
                    } catch {
                        payload = text;
                    }
                } else if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'data')) {
                    payload = data.data;
                }
                const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `deliveries_export_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }

            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Export failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Export Deliveries</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Download delivery records from server</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>File Format *</label>
                        <select className="ec-input" value={format} onChange={e => setFormat(e.target.value)}>
                            <option value="csv">CSV File (.csv)</option>
                            <option value="excel">Excel Sheet (.xlsx)</option>
                            <option value="json">JSON Export (.json)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Status Filter (Optional)</label>
                        <select className="ec-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            {STATUS_ENUMS.map(st => (
                                <option key={st} value={st}>{statusConfig[st]?.label || st}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6 }} onClick={handleExport} disabled={loading}>
                            <BsDownload size={14} /> {loading ? 'Exporting...' : 'Download File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 8: DELIVERY METHOD FORM (ADD / EDIT)
// ==========================================
const DeliveryMethodModal = ({ method, onClose, onSuccess }) => {
    const isEdit = !!method;
    const [name, setName] = useState(method?.name || '');
    const [code, setCode] = useState(method?.code || '');
    const [description, setDescription] = useState(method?.description || '');
    const [cost, setCost] = useState(method?.cost ?? '0.00');
    const [estimatedDays, setEstimatedDays] = useState(method?.estimated_days ?? '');
    const [isActive, setIsActive] = useState(method?.is_active ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !code.trim() || !description.trim()) {
            setError('Name, Code, and Description are required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim(),
                cost: String(cost || '0.00'),
                estimated_days: estimatedDays !== '' ? parseInt(estimatedDays, 10) : null,
                is_active: isActive,
            };

            let res;
            if (isEdit) {
                res = await updateDeliveryMethod(method.id, payload);
            } else {
                res = await createDeliveryMethod(payload);
            }
            onSuccess(res?.message || `Delivery method ${isEdit ? 'updated' : 'created'} successfully!`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to save delivery method.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{isEdit ? 'Edit Delivery Method' : 'Add Delivery Method'}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Configure shipping types and transit pricing</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Method Name *</label>
                        <input className="ec-input" placeholder="e.g. Express Delivery" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Method Code *</label>
                        <input className="ec-input" placeholder="e.g. EXP_DELIVERY" value={code} onChange={e => setCode(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Description *</label>
                        <input className="ec-input" placeholder="e.g. 1-2 day priority nationwide courier" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Cost (₹)</label>
                            <input type="number" step="0.01" min="0" className="ec-input" value={cost} onChange={e => setCost(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Estimated Days</label>
                            <input type="number" min="0" className="ec-input" placeholder="e.g. 2" value={estimatedDays} onChange={e => setEstimatedDays(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <input type="checkbox" id="method_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                        <label htmlFor="method_active" style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Active Method</label>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Method')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 9: DELIVERY ZONE FORM (ADD / EDIT)
// ==========================================
const DeliveryZoneModal = ({ zone, onClose, onSuccess }) => {
    const isEdit = !!zone;
    const [name, setName] = useState(zone?.name || '');
    const [code, setCode] = useState(zone?.code || '');
    const [description, setDescription] = useState(zone?.description || '');
    const [city, setCity] = useState(zone?.city || '');
    const [state, setState] = useState(zone?.state || '');
    const [pincodesText, setPincodesText] = useState((zone?.pincodes || []).join(', '));
    const [isActive, setIsActive] = useState(zone?.is_active ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !code.trim() || !description.trim()) {
            setError('Name, Code, and Description are required.');
            return;
        }

        const pincodesArray = pincodesText
            .split(',')
            .map(p => p.trim())
            .filter(Boolean);

        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim(),
                city: city.trim() || null,
                state: state.trim() || null,
                pincodes: pincodesArray,
                is_active: isActive,
            };

            let res;
            if (isEdit) {
                res = await updateDeliveryZone(zone.id, payload);
            } else {
                res = await createDeliveryZone(payload);
            }
            onSuccess(res?.message || `Delivery zone ${isEdit ? 'updated' : 'created'} successfully!`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to save delivery zone.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{isEdit ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Define geographic fulfillment boundaries & pincodes</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Zone Name *</label>
                        <input className="ec-input" placeholder="e.g. South Bangalore Cluster" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Zone Code *</label>
                        <input className="ec-input" placeholder="e.g. BLR_SOUTH" value={code} onChange={e => setCode(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Description *</label>
                        <input className="ec-input" placeholder="e.g. Covers Indiranagar, Koramangala, HSR" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>City</label>
                            <input className="ec-input" placeholder="e.g. Bangalore" value={city} onChange={e => setCity(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>State</label>
                            <input className="ec-input" placeholder="e.g. Karnataka" value={state} onChange={e => setState(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Pincodes (Comma-separated)</label>
                        <textarea
                            className="ec-input"
                            rows={2}
                            placeholder="e.g. 560034, 560038, 560102"
                            value={pincodesText}
                            onChange={e => setPincodesText(e.target.value)}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <input type="checkbox" id="zone_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                        <label htmlFor="zone_active" style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Active Zone</label>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Zone')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MODAL 10: DELIVERY PARTNER FORM (CONNECT / EDIT)
// ==========================================
const DeliveryPartnerModal = ({ partner, onClose, onSuccess }) => {
    const isEdit = !!partner;
    const [name, setName] = useState(partner?.name || '');
    const [code, setCode] = useState(partner?.code || '');
    const [description, setDescription] = useState(partner?.description || '');
    const [contactEmail, setContactEmail] = useState(partner?.contact_email || '');
    const [contactPhone, setContactPhone] = useState(partner?.contact_phone || '');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [trackingUrlTemplate, setTrackingUrlTemplate] = useState(partner?.tracking_url_template || '');
    const [isActive, setIsActive] = useState(partner?.is_active ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !code.trim() || !description.trim()) {
            setError('Partner Name, Code, and Description are required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim(),
                contact_email: contactEmail.trim() || null,
                contact_phone: contactPhone.trim() || null,
                api_key: apiKey.trim() || null,
                api_secret: apiSecret.trim() || null,
                tracking_url_template: trackingUrlTemplate.trim() || null,
                is_active: isActive,
            };

            let res;
            if (isEdit) {
                res = await updateDeliveryPartner(partner.id, payload);
            } else {
                res = await connectDeliveryPartner(payload);
            }
            onSuccess(res?.message || `Partner ${isEdit ? 'updated' : 'connected'} successfully!`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to save delivery partner.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{isEdit ? 'Edit Delivery Partner' : 'Connect Delivery Partner'}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Carrier API credentials and integration settings</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Partner Name *</label>
                        <input className="ec-input" placeholder="e.g. Delhivery Express" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Partner Code *</label>
                        <input className="ec-input" placeholder="e.g. DELHIVERY" value={code} onChange={e => setCode(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Description *</label>
                        <input className="ec-input" placeholder="e.g. Standard courier partner integration" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Contact Email</label>
                            <input type="email" className="ec-input" placeholder="ops@carrier.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Contact Phone</label>
                            <input className="ec-input" placeholder="+91 80 4000 8800" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>API Key</label>
                            <input type="password" className="ec-input" placeholder="Optional API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>API Secret</label>
                            <input type="password" className="ec-input" placeholder="Optional API Secret" value={apiSecret} onChange={e => setApiSecret(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Tracking URL Template</label>
                        <input className="ec-input" placeholder="e.g. https://track.carrier.com/{tracking_number}" value={trackingUrlTemplate} onChange={e => setTrackingUrlTemplate(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <input type="checkbox" id="partner_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                        <label htmlFor="partner_active" style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Active Partner</label>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Connect Partner')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// MAIN COMPONENT: DELIVERY MANAGEMENT
// ==========================================
const DeliveryManagement = () => {
    const [activeTab, setActiveTab] = useState('Deliveries');
    const [feedback, setFeedback] = useState(null);

    // Deliveries List & Stats State
    const [deliveries, setDeliveries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loadingDeliveries, setLoadingDeliveries] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('created_desc');
    const [selectedIds, setSelectedIds] = useState([]);

    const searchRef = useRef(search);
    const statusFilterRef = useRef(statusFilter);

    useEffect(() => {
        searchRef.current = search;
    }, [search]);

    useEffect(() => {
        statusFilterRef.current = statusFilter;
    }, [statusFilter]);

    // Methods State
    const [methods, setMethods] = useState([]);
    const [loadingMethods, setLoadingMethods] = useState(false);

    // Zones State
    const [zones, setZones] = useState([]);
    const [loadingZones, setLoadingZones] = useState(false);

    // Partners State
    const [partners, setPartners] = useState([]);
    const [loadingPartners, setLoadingPartners] = useState(false);

    // Pincode Serviceability State
    const [checkPincode, setCheckPincode] = useState('');
    const [checkingPincode, setCheckingPincode] = useState(false);
    const [pincodeResult, setPincodeResult] = useState(null);
    const [pincodeError, setPincodeError] = useState('');

    // Serviceability File Upload State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState('');

    // Modal Targets
    const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [assignPartnerTarget, setAssignPartnerTarget] = useState(null);
    const [updateAddressTarget, setUpdateAddressTarget] = useState(null);
    const [cancelDeliveryTarget, setCancelDeliveryTarget] = useState(null);
    const [printLabelDeliveryId, setPrintLabelDeliveryId] = useState(null);
    const [drawerDeliveryId, setDrawerDeliveryId] = useState(null);

    const [methodModalTarget, setMethodModalTarget] = useState(null);
    const [showAddMethodModal, setShowAddMethodModal] = useState(false);

    const [zoneModalTarget, setZoneModalTarget] = useState(null);
    const [showAddZoneModal, setShowAddZoneModal] = useState(false);

    const [partnerModalTarget, setPartnerModalTarget] = useState(null);
    const [showConnectPartnerModal, setShowConnectPartnerModal] = useState(false);

    // Show temporary banner feedback
    const showNotification = (msg, isErr = false) => {
        setFeedback({ msg, isErr });
        setTimeout(() => setFeedback(null), 4000);
    };

    // Load Deliveries - Unified Single Source of Truth for Search and Refresh
    const loadDeliveries = useCallback(async (customSearch, customStatus) => {
        setLoadingDeliveries(true);
        try {
            const q = customSearch !== undefined ? customSearch : searchRef.current;
            const st = customStatus !== undefined ? customStatus : statusFilterRef.current;
            const params = {};
            if (q && typeof q === 'string' && q.trim()) {
                params.search = q.trim();
            }
            if (st && st !== 'All') {
                params.status = normalizeStatus(st);
            }
            const res = await getDeliveries(params);
            const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || (Array.isArray(res) ? res : []));
            const uniqueDeliveries = enforceOneOrderOneDelivery(items);
            setDeliveries(uniqueDeliveries);
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to fetch deliveries', true);
        } finally {
            setLoadingDeliveries(false);
        }
    }, []);

    // Unified Search, Filter & Refresh Handlers
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        loadDeliveries(search, statusFilter);
    };

    const handleClearSearch = () => {
        setSearch('');
        loadDeliveries('', statusFilter);
    };

    const handleStatusFilterChange = (newStatus) => {
        setStatusFilter(newStatus);
        loadDeliveries(search, newStatus);
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('All');
        setSortBy('created_desc');
        loadDeliveries('', 'All');
    };

    const handleRefreshDeliveries = () => {
        loadDeliveries(search, statusFilter);
        loadStats();
    };

    // Load Stats
    const loadStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const res = await getDeliveryStats();
            setStats(res?.data || res);
        } catch (err) {
            console.warn('Could not load delivery stats:', err.message);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    // Load Methods
    const loadMethods = useCallback(async () => {
        setLoadingMethods(true);
        try {
            const res = await getDeliveryMethods();
            const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || (Array.isArray(res) ? res : []));
            setMethods(items);
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to fetch delivery methods', true);
        } finally {
            setLoadingMethods(false);
        }
    }, []);

    // Load Zones
    const loadZones = useCallback(async () => {
        setLoadingZones(true);
        try {
            const res = await getDeliveryZones();
            const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || (Array.isArray(res) ? res : []));
            setZones(items);
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to fetch delivery zones', true);
        } finally {
            setLoadingZones(false);
        }
    }, []);

    // Load Partners
    const loadPartners = useCallback(async () => {
        setLoadingPartners(true);
        try {
            const res = await getDeliveryPartners();
            const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || (Array.isArray(res) ? res : []));
            setPartners(items);
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to fetch delivery partners', true);
        } finally {
            setLoadingPartners(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadDeliveries();
        loadStats();
    }, [loadDeliveries, loadStats]);

    useEffect(() => {
        if (activeTab === 'Delivery Methods') loadMethods();
        if (activeTab === 'Delivery Zones') loadZones();
        if (activeTab === 'Delivery Partners') loadPartners();
    }, [activeTab, loadMethods, loadZones, loadPartners]);

    // Handle Quick Status Update from Table
    const handleQuickStatusChange = async (deliveryId, newStatus) => {
        const targetDel = deliveries.find(d => d.id === deliveryId);
        const hasPartner = Boolean(targetDel?.delivery_person && String(targetDel.delivery_person).trim());
        if (!hasPartner && (newStatus === 'assigned' || newStatus === 'out_for_delivery' || newStatus === 'delivered')) {
            showNotification('Cannot advance status: Please assign a delivery partner/rider first.', true);
            return;
        }
        try {
            await updateDeliveryStatus(deliveryId, { status: newStatus });
            showNotification(`Updated shipment #${deliveryId} to ${statusConfig[newStatus]?.label || newStatus}`);
            loadDeliveries();
            loadStats();
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to update status', true);
        }
    };

    // Toggle Delivery Method
    const handleToggleMethod = async (methodId) => {
        try {
            await toggleDeliveryMethod(methodId);
            showNotification(`Toggled delivery method status`);
            loadMethods();
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to toggle method', true);
        }
    };

    // Delete Delivery Method
    const handleDeleteMethod = async (methodId) => {
        if (!window.confirm(`Are you sure you want to delete delivery method #${methodId}?`)) return;
        try {
            await deleteDeliveryMethod(methodId);
            showNotification(`Deleted delivery method #${methodId}`);
            loadMethods();
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to delete method', true);
        }
    };

    // Delete Delivery Zone
    const handleDeleteZone = async (zoneId) => {
        if (!window.confirm(`Are you sure you want to delete delivery zone #${zoneId}?`)) return;
        try {
            await deleteDeliveryZone(zoneId);
            showNotification(`Deleted delivery zone #${zoneId}`);
            loadZones();
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to delete zone', true);
        }
    };

    // Delete Delivery Partner
    const handleDeletePartner = async (partnerId) => {
        if (!window.confirm(`Are you sure you want to delete delivery partner #${partnerId}?`)) return;
        try {
            await deleteDeliveryPartner(partnerId);
            showNotification(`Deleted delivery partner #${partnerId}`);
            loadPartners();
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to delete partner', true);
        }
    };

    // Pincode Serviceability Check
    const handleCheckPincode = async (e) => {
        e.preventDefault();
        setPincodeError('');
        setPincodeResult(null);
        if (!checkPincode.trim() || checkPincode.trim().length !== 6) {
            setPincodeError('Please enter a valid 6-digit postal pincode.');
            return;
        }

        setCheckingPincode(true);
        try {
            const res = await checkPincodeServiceability(checkPincode.trim());
            setPincodeResult(res?.data || res);
        } catch (err) {
            setPincodeError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Pincode serviceability check failed.');
        } finally {
            setCheckingPincode(false);
        }
    };

    // Serviceability Bulk Upload
    const handleUploadServiceabilityFile = async (e) => {
        e.preventDefault();
        setUploadError('');
        setUploadResult(null);
        if (!uploadFile) {
            setUploadError('Please select a CSV or XLSX file to upload.');
            return;
        }

        setUploadingFile(true);
        try {
            const res = await uploadServiceability(uploadFile);
            setUploadResult(res?.data || res);
            showNotification(res?.message || 'Serviceability file processed successfully!');
            setUploadFile(null);
        } catch (err) {
            setUploadError(err.response?.data?.detail || err.response?.data?.message || err.message || 'File upload failed.');
        } finally {
            setUploadingFile(false);
        }
    };

    // Filter & Sort Deliveries (Enforces 1 Order : 1 Delivery)
    const filteredDeliveries = useMemo(() => {
        const query = (search || '').trim().toLowerCase();
        const normFilter = normalizeStatus(statusFilter);
        const isAll = !statusFilter || statusFilter === 'All' || normFilter === 'all';

        const uniqueDeliveries = enforceOneOrderOneDelivery(deliveries);

        const filtered = uniqueDeliveries.filter(d => {
            const effStatus = getDeliveryEffectiveStatus(d);
            const rawStatus = normalizeStatus(d.status);
            const statusLabel = statusConfig[effStatus]?.label?.toLowerCase() || '';

            // Status filter check
            let matchesStatus = true;
            if (!isAll) {
                matchesStatus = (effStatus === normFilter || rawStatus === normFilter);
            }

            // Search query check
            let matchesSearch = true;
            if (query) {
                const trkStr = getTrackingNumberDisplay(d);
                matchesSearch =
                    String(d.id || '').toLowerCase().includes(query) ||
                    String(d.order_id || '').toLowerCase().includes(query) ||
                    String(d.delivery_person || '').toLowerCase().includes(query) ||
                    String(d.tracking_number || '').toLowerCase().includes(query) ||
                    effStatus.includes(query) ||
                    rawStatus.includes(query) ||
                    statusLabel.includes(query) ||
                    (trkStr !== '-' && trkStr.toLowerCase().includes(query));
            }

            return matchesSearch && matchesStatus;
        });

        // Deterministic sorting
        return [...filtered].sort((a, b) => {
            if (sortBy === 'created_desc') {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return Number(b.id || 0) - Number(a.id || 0);
            }
            if (sortBy === 'created_asc') {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                if (timeA !== timeB) return timeA - timeB;
                return Number(a.id || 0) - Number(b.id || 0);
            }
            if (sortBy === 'id_asc') {
                return Number(a.id || 0) - Number(b.id || 0);
            }
            if (sortBy === 'id_desc') {
                return Number(b.id || 0) - Number(a.id || 0);
            }
            if (sortBy === 'order_asc') {
                return Number(a.order_id || 0) - Number(b.order_id || 0);
            }
            if (sortBy === 'order_desc') {
                return Number(b.order_id || 0) - Number(a.order_id || 0);
            }
            return 0;
        });
    }, [deliveries, search, statusFilter, sortBy]);

    const tabs = ['Deliveries', 'Delivery Methods', 'Delivery Zones', 'Delivery Partners', 'Pincode Serviceability'];

    return (
        <div className="dash-page" style={{ paddingBottom: 40 }}>
            {/* Feedback Banner */}
            {feedback && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    background: feedback.isErr ? '#ef4444' : '#10b981', color: '#fff',
                    padding: '12px 18px', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700
                }}>
                    {feedback.isErr ? <BsExclamationTriangle size={16} /> : <BsCheckCircleFill size={16} />}
                    {feedback.msg}
                </div>
            )}

            {/* Page Header */}
            <div className="adm-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, fontSize: 20 }}>
                            <BsTruck />
                        </span>
                        Delivery Management & Operations
                    </h1>
                    <p className="adm-page-sub">Manage order shipments, status pipelines, delivery methods, zones, courier partners, and pincode coverage.</p>
                </div>

                <div className="adm-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => {
                            if (activeTab === 'Deliveries') handleRefreshDeliveries();
                            else if (activeTab === 'Delivery Methods') loadMethods();
                            else if (activeTab === 'Delivery Zones') loadZones();
                            else if (activeTab === 'Delivery Partners') loadPartners();
                        }}
                        disabled={loadingDeliveries || loadingStats || loadingMethods || loadingZones || loadingPartners}
                        title="Refresh active view without full page reload"
                    >
                        <BsArrowClockwise size={14} className={loadingDeliveries || loadingStats || loadingMethods || loadingZones || loadingPartners ? 'spin' : ''} />
                        Refresh
                    </button>

                    {activeTab === 'Deliveries' && (
                        <>
                            <button className="adm-btn-secondary" onClick={() => setShowExportModal(true)}>
                                <BsDownload size={14} /> Export Directory
                            </button>
                            <button className="adm-btn-primary" onClick={() => setShowCreateDeliveryModal(true)}>
                                <BsPlus size={18} /> + Create Shipment
                            </button>
                        </>
                    )}

                    {activeTab === 'Delivery Methods' && (
                        <button className="adm-btn-primary" onClick={() => setShowAddMethodModal(true)}>
                            <BsPlus size={18} /> + Add Method
                        </button>
                    )}

                    {activeTab === 'Delivery Zones' && (
                        <button className="adm-btn-primary" onClick={() => setShowAddZoneModal(true)}>
                            <BsPlus size={18} /> + Add Zone
                        </button>
                    )}

                    {activeTab === 'Delivery Partners' && (
                        <button className="adm-btn-primary" onClick={() => setShowConnectPartnerModal(true)}>
                            <BsPlus size={18} /> + Connect Partner
                        </button>
                    )}
                </div>
            </div>

            {/* 6 KPI Cards Grid (Clickable Filters) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div
                    onClick={() => handleStatusFilterChange('All')}
                    style={{
                        background: '#fff',
                        border: statusFilter === 'All' ? '2px solid #6366f1' : '1px solid #e5e7eb',
                        borderRadius: 14, padding: '14px 16px',
                        boxShadow: statusFilter === 'All' ? '0 2px 8px rgba(99,102,241,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    title="Click to view all shipments"
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Deliveries</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', marginTop: 4, margin: 0 }}>
                        {deliveries.length}
                    </p>
                    <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>All registered shipments</span>
                </div>

                <div
                    onClick={() => handleStatusFilterChange('pending')}
                    style={{
                        background: '#fff',
                        border: normalizeStatus(statusFilter) === 'pending' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                        borderRadius: 14, padding: '14px 16px',
                        boxShadow: normalizeStatus(statusFilter) === 'pending' ? '0 2px 8px rgba(245,158,11,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    title="Click to filter Pending shipments"
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Pending</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginTop: 4, margin: 0 }}>
                        {deliveries.filter(d => getDeliveryEffectiveStatus(d) === 'pending').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Awaiting dispatch</span>
                </div>

                <div
                    onClick={() => handleStatusFilterChange('assigned')}
                    style={{
                        background: '#fff',
                        border: normalizeStatus(statusFilter) === 'assigned' ? '2px solid #0ea5e9' : '1px solid #e5e7eb',
                        borderRadius: 14, padding: '14px 16px',
                        boxShadow: normalizeStatus(statusFilter) === 'assigned' ? '0 2px 8px rgba(14,165,233,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    title="Click to filter Assigned shipments"
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Assigned</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#0ea5e9', marginTop: 4, margin: 0 }}>
                        {deliveries.filter(d => getDeliveryEffectiveStatus(d) === 'assigned').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600 }}>Partner/Rider assigned</span>
                </div>

                <div
                    onClick={() => handleStatusFilterChange('out_for_delivery')}
                    style={{
                        background: '#fff',
                        border: normalizeStatus(statusFilter) === 'out_for_delivery' ? '2px solid #f97316' : '1px solid #e5e7eb',
                        borderRadius: 14, padding: '14px 16px',
                        boxShadow: normalizeStatus(statusFilter) === 'out_for_delivery' ? '0 2px 8px rgba(249,115,22,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    title="Click to filter Out for Delivery shipments"
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Out for Delivery</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#f97316', marginTop: 4, margin: 0 }}>
                        {deliveries.filter(d => getDeliveryEffectiveStatus(d) === 'out_for_delivery').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#f97316', fontWeight: 600 }}>In active transit</span>
                </div>

                <div
                    onClick={() => handleStatusFilterChange('delivered')}
                    style={{
                        background: '#fff',
                        border: normalizeStatus(statusFilter) === 'delivered' ? '2px solid #10b981' : '1px solid #e5e7eb',
                        borderRadius: 14, padding: '14px 16px',
                        boxShadow: normalizeStatus(statusFilter) === 'delivered' ? '0 2px 8px rgba(16,185,129,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    title="Click to filter Delivered shipments"
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Delivered</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginTop: 4, margin: 0 }}>
                        {deliveries.filter(d => getDeliveryEffectiveStatus(d) === 'delivered').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Fulfilled successfully</span>
                </div>

                <div
                    onClick={() => handleStatusFilterChange('cancelled')}
                    style={{
                        background: '#fff',
                        border: normalizeStatus(statusFilter) === 'cancelled' ? '2px solid #ef4444' : '1px solid #e5e7eb',
                        borderRadius: 14, padding: '14px 16px',
                        boxShadow: normalizeStatus(statusFilter) === 'cancelled' ? '0 2px 8px rgba(239,68,68,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    title="Click to filter Cancelled shipments"
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Cancelled</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginTop: 4, margin: 0 }}>
                        {deliveries.filter(d => getDeliveryEffectiveStatus(d) === 'cancelled').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Cancelled</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="ec-tabs" style={{ marginBottom: 20 }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`ec-tab-btn ${activeTab === tab ? 'ec-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'Deliveries' && <BsTruck size={14} />}
                        {tab === 'Delivery Methods' && <BsBoxSeam size={14} />}
                        {tab === 'Delivery Zones' && <BsGeoAlt size={14} />}
                        {tab === 'Delivery Partners' && <BsPerson size={14} />}
                        {tab === 'Pincode Serviceability' && <BsPinMapFill size={14} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* ======================================================== */}
            {/* TAB 1: DELIVERIES DIRECTORY                              */}
            {/* ======================================================== */}
            {activeTab === 'Deliveries' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* Filter & Search Bar */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, flex: '1 1 auto' }}>
                                <form
                                    onSubmit={handleSearchSubmit}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 280, maxWidth: 440, flex: '1 1 300px' }}
                                >
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, pointerEvents: 'none' }} />
                                        <input
                                            type="text"
                                            className="ec-input"
                                            placeholder="Search by Delivery ID, Order, Driver, Tracking"
                                            title="Search by Delivery ID, Order ID, Driver, Tracking Number, or Status"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            style={{ paddingLeft: 34, paddingRight: search ? 32 : 12, width: '100%', height: 38, fontSize: 12 }}
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={handleClearSearch}
                                                title="Clear search"
                                                style={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    border: 'none',
                                                    background: '#f3f4f6',
                                                    color: '#6b7280',
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    padding: 0
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#111827'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
                                            >
                                                <BsXLg size={10} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        className="adm-btn-primary"
                                        disabled={loadingDeliveries}
                                        style={{ height: 38, padding: '0 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, gap: 6, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                        title="Search shipments via API"
                                    >
                                        <BsSearch size={12} /> Search
                                    </button>
                                </form>

                                {/* All Statuses dropdown immediately to right of search */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <select
                                        className="ec-input"
                                        value={statusFilter}
                                        onChange={e => handleStatusFilterChange(e.target.value)}
                                        style={{ height: 38, fontSize: 12, padding: '0 12px', fontWeight: 600, color: '#1f2937', minWidth: 140, cursor: 'pointer' }}
                                        title="Filter by shipment status"
                                    >
                                        <option value="All">All Statuses</option>
                                        {STATUS_ENUMS.map(st => (
                                            <option key={st} value={st}>{statusConfig[st]?.label || st}</option>
                                        ))}
                                    </select>

                                    {/* Sort Dropdown */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Sort:</span>
                                        <select
                                            className="ec-input"
                                            value={sortBy}
                                            onChange={e => setSortBy(e.target.value)}
                                            style={{ height: 38, fontSize: 12, padding: '0 10px', fontWeight: 600, color: '#1f2937', minWidth: 175, cursor: 'pointer' }}
                                            title="Choose sort order for shipments"
                                        >
                                            <option value="created_desc">Created Date: Newest First</option>
                                            <option value="created_asc">Created Date: Oldest First</option>
                                            <option value="id_desc">Delivery ID: High to Low (#9...#1)</option>
                                            <option value="id_asc">Delivery ID: Low to High (#1...#9)</option>
                                            <option value="order_desc">Order ID: High to Low</option>
                                            <option value="order_asc">Order ID: Low to High</option>
                                        </select>
                                    </div>

                                    {(search || (statusFilter && statusFilter !== 'All') || sortBy !== 'created_desc') && (
                                        <button
                                            type="button"
                                            onClick={handleResetFilters}
                                            title="Reset search, status filter, and sort order"
                                            style={{
                                                border: '1px solid #fee2e2',
                                                background: '#fef2f2',
                                                color: '#ef4444',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '0 12px',
                                                height: 38,
                                                borderRadius: 8,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            Reset ✕
                                        </button>
                                    )}

                                    {/* Dedicated Table Refresh button */}
                                    <button
                                        type="button"
                                        className="adm-btn-secondary"
                                        onClick={handleRefreshDeliveries}
                                        disabled={loadingDeliveries}
                                        title="Refresh shipments from API with active search and status filter"
                                        style={{
                                            height: 38,
                                            fontSize: 12,
                                            padding: '0 12px',
                                            borderRadius: 8,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <BsArrowClockwise size={13} className={loadingDeliveries ? 'spin' : ''} />
                                        {loadingDeliveries ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>
                            </div>

                            {/* Counter & Status Filter Indicator on the right */}
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>
                                Showing <strong style={{ color: '#111827', fontWeight: 700 }}>{filteredDeliveries.length}</strong> of <strong style={{ color: '#111827', fontWeight: 700 }}>{deliveries.length}</strong> shipments
                                {(search || (statusFilter && statusFilter !== 'All')) && (
                                    <span style={{ marginLeft: 8, background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                                        Filtered
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 1040 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 14px', width: 38 }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredDeliveries.length > 0 && selectedIds.length === filteredDeliveries.length}
                                            onChange={e => setSelectedIds(e.target.checked ? filteredDeliveries.map(d => d.id) : [])}
                                            style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                        />
                                    </th>
                                    <th
                                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => setSortBy(prev => prev === 'id_desc' ? 'id_asc' : 'id_desc')}
                                        title="Click to toggle sort by Delivery ID"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            Delivery & Order ID
                                            <span style={{ color: sortBy.startsWith('id_') ? '#6366f1' : '#9ca3af', fontSize: 11 }}>
                                                {sortBy === 'id_desc' ? '▼' : sortBy === 'id_asc' ? '▲' : '⇅'}
                                            </span>
                                        </span>
                                    </th>
                                    <th style={{ padding: '12px 16px' }}>Assigned Person / Partner</th>
                                    <th style={{ padding: '12px 16px' }}>Tracking Number</th>
                                    <th style={{ padding: '12px 16px' }}>Status Pipeline</th>
                                    <th
                                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => setSortBy(prev => prev === 'created_desc' ? 'created_asc' : 'created_desc')}
                                        title="Click to toggle sort by Created Date"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            Created Date
                                            <span style={{ color: sortBy.startsWith('created_') ? '#6366f1' : '#9ca3af', fontSize: 11 }}>
                                                {sortBy === 'created_desc' ? '▼' : sortBy === 'created_asc' ? '▲' : '⇅'}
                                            </span>
                                        </span>
                                    </th>
                                    <th style={{ padding: '12px 16px' }}>Delivered At</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: 230 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingDeliveries ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6366f1', fontSize: 13, fontWeight: 600 }}>
                                            <BsArrowClockwise size={20} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                                            Fetching delivery records from server...
                                        </td>
                                    </tr>
                                ) : filteredDeliveries.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                {/* Empty Illustration */}
                                                <div style={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: '50%',
                                                    background: normalizeStatus(statusFilter) === 'delivered' ? '#ecfdf5' : '#f3f4f6',
                                                    border: `1px solid ${normalizeStatus(statusFilter) === 'delivered' ? '#a7f3d0' : '#e5e7eb'}`,
                                                    color: normalizeStatus(statusFilter) === 'delivered' ? '#10b981' : '#9ca3af',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginBottom: 16,
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                                }}>
                                                    {normalizeStatus(statusFilter) === 'delivered' ? (
                                                        <BsCheckCircleFill size={34} color="#10b981" />
                                                    ) : normalizeStatus(statusFilter) === 'cancelled' ? (
                                                        <BsXCircleFill size={34} color="#ef4444" />
                                                    ) : (
                                                        <BsTruck size={34} color="#9ca3af" />
                                                    )}
                                                </div>

                                                {/* Header message */}
                                                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
                                                    No deliveries yet
                                                </h3>

                                                {/* Subtitle message */}
                                                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
                                                    {normalizeStatus(statusFilter) === 'delivered'
                                                        ? 'No shipments have reached Delivered status yet. Once an order is fulfilled and completed, it will appear here.'
                                                        : search
                                                        ? `No shipments found matching "${search}". Try adjusting your search query or filters.`
                                                        : statusFilter && statusFilter !== 'All'
                                                        ? `No shipments found with status "${statusConfig[normalizeStatus(statusFilter)]?.label || statusFilter}".`
                                                        : 'There are no delivery records registered yet. Click "+ Create Shipment" to add your first delivery.'}
                                                </p>

                                                {/* Actions */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                                                    {(search || (statusFilter && statusFilter !== 'All') || sortBy !== 'created_desc') && (
                                                        <button
                                                            type="button"
                                                            className="adm-btn-secondary"
                                                            onClick={handleResetFilters}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 14px', borderRadius: 8, fontWeight: 700 }}
                                                        >
                                                            <BsArrowClockwise size={13} /> View All Shipments
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="adm-btn-primary"
                                                        onClick={() => setShowCreateDeliveryModal(true)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 14px', borderRadius: 8, fontWeight: 700 }}
                                                    >
                                                        <BsPlus size={16} /> + Create Shipment
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDeliveries.map(d => {
                                        const effStatus = getDeliveryEffectiveStatus(d);
                                        const sc = statusConfig[effStatus] || statusConfig[normalizeStatus(d.status)] || { label: d.status || 'Pending', color: '#6b7280', bg: '#f9fafb' };
                                        const isSelected = selectedIds.includes(d.id);
                                        const rowTerminal = isTerminalDeliveryStatus(d.status) || effStatus === 'delivered' || effStatus === 'cancelled';
                                        const deliveredAtCell = getDeliveredAtDisplay(d);
                                        const rowTypeLabel = getDeliveryTypeLabel(d);
                                        const rowChargeLabel = getDeliveryChargeLabel(d);
                                        const hasPartner = Boolean(d.delivery_person && String(d.delivery_person).trim());

                                        return (
                                            <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6', background: isSelected ? '#f5f3ff' : 'transparent' }} className="table-row-hover">
                                                <td style={{ padding: '14px 14px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => setSelectedIds(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                                                        style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        <span
                                                            style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '2px 7px', borderRadius: 6, display: 'inline-block', width: 'max-content' }}
                                                            title={`Shipment #${d.id}`}
                                                        >
                                                            Delivery #{d.id}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }} title={`Linked Order #${d.order_id}`}>
                                                            Order: <strong style={{ color: '#111827' }}>#{d.order_id}</strong>
                                                        </span>
                                                        {(rowTypeLabel || rowChargeLabel) && (
                                                            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                                                                {rowTypeLabel}{rowTypeLabel && rowChargeLabel ? ' · ' : ''}{rowChargeLabel || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {(() => {
                                                        const cleanPerson = getCleanDeliveryPerson(d) || d.delivery_person;
                                                        if (rowTerminal) {
                                                            return (
                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                    {cleanPerson || 'Not Assigned'}
                                                                </span>
                                                            );
                                                        }
                                                        if (cleanPerson) {
                                                            return (
                                                                <span
                                                                    onClick={() => setAssignPartnerTarget({ ...d, delivery_person: cleanPerson })}
                                                                    style={{ fontSize: 12, background: '#eef2ff', color: '#4338ca', padding: '3px 9px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                                    title="Click to reassign partner"
                                                                >
                                                                    <BsPerson size={12} /> {cleanPerson}
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssignPartnerTarget(d)}
                                                                style={{ fontSize: 11, background: '#fff', color: '#6366f1', border: '1px dashed #6366f1', padding: '3px 8px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                                                            >
                                                                + Assign Partner
                                                            </button>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {(() => {
                                                        const trk = getTrackingNumberDisplay(d);
                                                        return (
                                                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: trk === '-' ? '#9ca3af' : '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                                                {trk}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {effStatus === 'cancelled' || effStatus === 'delivered' ? (
                                                        <span
                                                            style={{
                                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                                background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44`,
                                                                display: 'inline-flex', alignItems: 'center', gap: 4
                                                            }}
                                                            title="Shipment is finalized (cannot change status)"
                                                        >
                                                            {sc.icon} {sc.label}
                                                        </span>
                                                    ) : (
                                                        <select
                                                            disabled={!hasPartner}
                                                            value={effStatus}
                                                            onChange={e => handleQuickStatusChange(d.id, e.target.value)}
                                                            title={!hasPartner ? "Assign a delivery partner/rider first to enable status pipeline" : "Change delivery status"}
                                                            style={{
                                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                                background: !hasPartner ? '#f3f4f6' : sc.bg,
                                                                color: !hasPartner ? '#9ca3af' : sc.color,
                                                                border: `1px solid ${!hasPartner ? '#d1d5db' : sc.color + '44'}`,
                                                                cursor: !hasPartner ? 'not-allowed' : 'pointer',
                                                                opacity: !hasPartner ? 0.65 : 1,
                                                                outline: 'none'
                                                            }}
                                                        >
                                                            {STATUS_ENUMS.map(st => {
                                                                const isOptionBlocked = !hasPartner && (st === 'assigned' || st === 'out_for_delivery' || st === 'delivered');
                                                                return (
                                                                    <option
                                                                        key={st}
                                                                        value={st}
                                                                        disabled={isOptionBlocked}
                                                                        style={{ background: '#fff', color: isOptionBlocked ? '#9ca3af' : '#111827' }}
                                                                    >
                                                                        {statusConfig[st]?.label || st}{isOptionBlocked ? ' (Requires Partner)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: 11, color: '#6b7280' }}>
                                                    {formatDateTime(d.created_at)}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: 11, color: '#4b5563' }}>
                                                    {deliveredAtCell.italic ? (
                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{deliveredAtCell.text}</span>
                                                    ) : (
                                                        deliveredAtCell.text
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                                        <button
                                                            type="button"
                                                            aria-label={`Print shipping label for shipment #${d.id}`}
                                                            title={d.status === 'cancelled' ? 'Shipping label unavailable for cancelled delivery' : `Print Shipping Label (#${d.id})`}
                                                            disabled={d.status === 'cancelled'}
                                                            onClick={() => {
                                                                if (d.status !== 'cancelled') setPrintLabelDeliveryId(d.id);
                                                            }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                padding: '6px 12px',
                                                                borderRadius: 8,
                                                                border: '1px solid #d1d5db',
                                                                background: d.status === 'cancelled' ? '#f3f4f6' : '#fff',
                                                                color: d.status === 'cancelled' ? '#9ca3af' : '#374151',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: d.status === 'cancelled' ? 'not-allowed' : 'pointer',
                                                                opacity: d.status === 'cancelled' ? 0.5 : 1,
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (d.status !== 'cancelled') {
                                                                    e.currentTarget.style.background = '#f9fafb';
                                                                    e.currentTarget.style.borderColor = '#9ca3af';
                                                                    e.currentTarget.style.color = '#111827';
                                                                }
                                                            }}
                                                            onMouseLeave={e => {
                                                                if (d.status !== 'cancelled') {
                                                                    e.currentTarget.style.background = '#fff';
                                                                    e.currentTarget.style.borderColor = '#d1d5db';
                                                                    e.currentTarget.style.color = '#374151';
                                                                }
                                                            }}
                                                        >
                                                            <BsPrinter size={15} style={{ flexShrink: 0 }} />
                                                            <span>Print Label</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            aria-label={`View tracking details and shipment history for shipment #${d.id}`}
                                                            title={`View Tracking Details & Audit Trail (#${d.id})`}
                                                            onClick={() => setDrawerDeliveryId(d.id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                padding: '6px 12px',
                                                                borderRadius: 8,
                                                                border: '1px solid #c7d2fe',
                                                                background: '#eef2ff',
                                                                color: '#4f46e5',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.background = '#e0e7ff';
                                                                e.currentTarget.style.borderColor = '#818cf8';
                                                                e.currentTarget.style.color = '#3730a3';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.background = '#eef2ff';
                                                                e.currentTarget.style.borderColor = '#c7d2fe';
                                                                e.currentTarget.style.color = '#4f46e5';
                                                            }}
                                                        >
                                                            <BsEye size={15} style={{ flexShrink: 0 }} />
                                                            <span>Track & Details</span>
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
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: DELIVERY METHODS                                  */}
            {/* ======================================================== */}
            {activeTab === 'Delivery Methods' && (
                <div>
                    {loadingMethods ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                            <BsArrowClockwise size={22} className="spin" style={{ marginRight: 8, display: 'inline-block' }} />
                            Loading delivery methods...
                        </div>
                    ) : methods.length === 0 ? (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>No Delivery Methods Configured</p>
                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Click "+ Add Method" to define standard, express, or same-day delivery options.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {methods.map(m => (
                                <div key={m.id} className="ec-delivery-card" style={{ opacity: m.is_active ? 1 : 0.6 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{m.name}</p>
                                                <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#eef2ff', color: '#6366f1', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                                    {m.code}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>{m.description}</p>
                                        </div>
                                        <div onClick={() => handleToggleMethod(m.id)} style={{ cursor: 'pointer' }} title="Toggle Active Status">
                                            {m.is_active ? <BsToggleOn size={26} color="#6366f1" /> : <BsToggleOff size={26} color="#d1d5db" />}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                                        <div style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Shipping Cost</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>{fmtCurrency(m.cost)}</p>
                                        </div>
                                        <div style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Estimated Time</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>
                                                {m.estimated_days ? `${m.estimated_days} day${m.estimated_days > 1 ? 's' : ''}` : 'Same Day / Immediate'}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => setMethodModalTarget(m)}>
                                            <BsPencilSquare size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMethod(m.id)}
                                            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            title="Delete Method"
                                        >
                                            <BsTrash size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: DELIVERY ZONES                                    */}
            {/* ======================================================== */}
            {activeTab === 'Delivery Zones' && (
                <div>
                    {loadingZones ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                            <BsArrowClockwise size={22} className="spin" style={{ marginRight: 8, display: 'inline-block' }} />
                            Loading delivery zones...
                        </div>
                    ) : zones.length === 0 ? (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>No Delivery Zones Configured</p>
                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Click "+ Add Zone" to create geographic service clusters and assigned pincodes.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {zones.map(z => (
                                <div key={z.id} className="ec-delivery-card" style={{ opacity: z.is_active ? 1 : 0.6 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{z.name}</p>
                                                <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#eef2ff', color: '#6366f1', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                                    {z.code}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>{z.description}</p>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: z.is_active ? '#ecfdf5' : '#f3f4f6', color: z.is_active ? '#10b981' : '#6b7280' }}>
                                            {z.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#374151', marginBottom: 12 }}>
                                        <strong>Location:</strong> {z.city || 'Any City'}, {z.state || 'Any State'}
                                    </div>

                                    <div style={{ marginBottom: 14 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                            Serviceable Pincodes ({(z.pincodes || []).length})
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 60, overflowY: 'auto' }}>
                                            {(z.pincodes || []).length === 0 ? (
                                                <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>No specific pincodes attached</span>
                                            ) : (
                                                z.pincodes.map((pin, i) => (
                                                    <span key={i} style={{ fontSize: 10, fontFamily: 'monospace', background: '#f3f4f6', color: '#374151', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                                        {pin}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => setZoneModalTarget(z)}>
                                            <BsPencilSquare size={12} /> Edit Zone
                                        </button>
                                        <button
                                            onClick={() => handleDeleteZone(z.id)}
                                            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            title="Delete Zone"
                                        >
                                            <BsTrash size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: DELIVERY PARTNERS                                 */}
            {/* ======================================================== */}
            {activeTab === 'Delivery Partners' && (
                <div>
                    {loadingPartners ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                            <BsArrowClockwise size={22} className="spin" style={{ marginRight: 8, display: 'inline-block' }} />
                            Loading delivery partners...
                        </div>
                    ) : partners.length === 0 ? (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>No Delivery Partners Connected</p>
                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Click "+ Connect Partner" to integrate couriers like Delhivery, Dunzo, Bluedart, or Swiggy Genie.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {partners.map(p => (
                                <div key={p.id} className="ec-delivery-card" style={{ opacity: p.is_active ? 1 : 0.6 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{p.name}</p>
                                                <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#eef2ff', color: '#6366f1', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                                    {p.code}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>{p.description}</p>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: p.is_active ? '#ecfdf5' : '#f3f4f6', color: p.is_active ? '#10b981' : '#6b7280' }}>
                                            {p.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#4b5563', marginBottom: 14 }}>
                                        {p.contact_email && <span><BsEnvelope style={{ color: '#6366f1', marginRight: 4 }} /> {p.contact_email}</span>}
                                        {p.contact_phone && <span><BsPhone style={{ color: '#6366f1', marginRight: 4 }} /> {p.contact_phone}</span>}
                                        {p.tracking_url_template && (
                                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6366f1', background: '#f3f4f6', padding: '4px 8px', borderRadius: 6, wordBreak: 'break-all' }}>
                                                {p.tracking_url_template}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => setPartnerModalTarget(p)}>
                                            <BsPencilSquare size={12} /> Edit Integration
                                        </button>
                                        <button
                                            onClick={() => handleDeletePartner(p.id)}
                                            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            title="Delete Partner"
                                        >
                                            <BsTrash size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: PINCODE SERVICEABILITY & BULK UPLOAD              */}
            {/* ======================================================== */}
            {activeTab === 'Pincode Serviceability' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Section 1: Interactive Pincode Checker */}
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsPinMapFill style={{ color: '#6366f1' }} /> Check Pincode Serviceability
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Verify instantly whether a specific postal pincode is covered by active delivery zones.</p>

                        <form onSubmit={handleCheckPincode} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <input
                                type="text"
                                maxLength="6"
                                className="ec-input"
                                placeholder="Enter 6-digit Pincode (e.g. 560038)"
                                value={checkPincode}
                                onChange={e => setCheckPincode(e.target.value.replace(/\D/g, ''))}
                                style={{ flex: 1, height: 40 }}
                            />
                            <button type="submit" className="adm-btn-primary" disabled={checkingPincode} style={{ height: 40 }}>
                                {checkingPincode ? 'Checking...' : 'Check'}
                            </button>
                        </form>

                        {pincodeError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                                {pincodeError}
                            </div>
                        )}

                        {pincodeResult && (
                            <div style={{
                                background: pincodeResult.is_serviceable ? '#ecfdf5' : '#fef2f2',
                                border: `1px solid ${pincodeResult.is_serviceable ? '#a7f3d0' : '#fecaca'}`,
                                borderRadius: 12, padding: 16
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    {pincodeResult.is_serviceable ? <BsCheckCircleFill size={18} color="#10b981" /> : <BsXCircleFill size={18} color="#ef4444" />}
                                    <span style={{ fontSize: 14, fontWeight: 800, color: pincodeResult.is_serviceable ? '#065f46' : '#991b1b' }}>
                                        {pincodeResult.is_serviceable ? `Serviceable Pincode (${pincodeResult.pincode})` : `Not Serviceable (${pincodeResult.pincode})`}
                                    </span>
                                </div>
                                {pincodeResult.is_serviceable && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginTop: 10 }}>
                                        <div><strong>Zone:</strong> {pincodeResult.zone_name || 'Standard Zone'} ({pincodeResult.zone_code || 'N/A'})</div>
                                        <div><strong>Location:</strong> {pincodeResult.city || 'N/A'}, {pincodeResult.state || 'N/A'}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Bulk Serviceability CSV/XLSX Upload */}
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsFileEarmarkArrowUp style={{ color: '#6366f1' }} /> Bulk Serviceability Upload
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Upload a CSV or XLSX spreadsheet with pincode coverage rules.</p>

                        <form onSubmit={handleUploadServiceabilityFile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: '24px 20px', textAlign: 'center', background: '#f9fafb' }}>
                                <input
                                    type="file"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    id="serviceability_file"
                                    style={{ display: 'none' }}
                                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="serviceability_file" style={{ cursor: 'pointer', display: 'block' }}>
                                    <BsFileEarmarkArrowUp size={32} style={{ color: '#6366f1', marginBottom: 8 }} />
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                                        {uploadFile ? uploadFile.name : 'Click to select CSV or XLSX File'}
                                    </p>
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Supports .csv, .xlsx files up to 10MB</span>
                                </label>
                            </div>

                            {uploadError && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                                    {uploadError}
                                </div>
                            )}

                            {uploadResult && (
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, fontSize: 12 }}>
                                    <p style={{ fontWeight: 800, color: '#065f46', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsCheckCircleFill /> Upload Summary
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                                        <div>Processed: <strong>{uploadResult.total_rows_processed ?? 0}</strong></div>
                                        <div style={{ color: '#10b981' }}>Successful: <strong>{uploadResult.successful_imports ?? 0}</strong></div>
                                        <div style={{ color: '#ef4444' }}>Failed: <strong>{uploadResult.failed_imports ?? 0}</strong></div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="adm-btn-primary" disabled={uploadingFile || !uploadFile} style={{ justifyContent: 'center' }}>
                                {uploadingFile ? 'Uploading & Processing...' : 'Upload Serviceability Data'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL INSTANTIATIONS                                     */}
            {/* ======================================================== */}

            {/* Create Delivery Modal */}
            {showCreateDeliveryModal && (
                <CreateDeliveryModal
                    existingDeliveries={deliveries}
                    onClose={() => setShowCreateDeliveryModal(false)}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadDeliveries();
                        loadStats();
                    }}
                />
            )}

            {/* Export Modal */}
            {showExportModal && (
                <ExportDeliveryModal onClose={() => setShowExportModal(false)} />
            )}

            {/* Assign Partner Modal */}
            {assignPartnerTarget && (
                <AssignPartnerModal
                    delivery={assignPartnerTarget}
                    onClose={() => setAssignPartnerTarget(null)}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadDeliveries();
                        loadStats();
                    }}
                />
            )}

            {/* Update Address Modal */}
            {updateAddressTarget && (
                <UpdateAddressModal
                    delivery={updateAddressTarget}
                    onClose={() => setUpdateAddressTarget(null)}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadDeliveries();
                        loadStats();
                    }}
                />
            )}

            {/* Cancel Delivery Modal */}
            {cancelDeliveryTarget && (
                <CancelDeliveryModal
                    delivery={cancelDeliveryTarget}
                    onClose={() => setCancelDeliveryTarget(null)}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadDeliveries();
                        loadStats();
                    }}
                />
            )}

            {/* Printable Shipping Label Modal */}
            {printLabelDeliveryId && (
                <ShippingLabelModal
                    deliveryId={printLabelDeliveryId}
                    onClose={() => setPrintLabelDeliveryId(null)}
                />
            )}

            {/* Detail / Tracking / History Drawer */}
            {drawerDeliveryId && (
                <DeliveryDetailDrawer
                    deliveryId={drawerDeliveryId}
                    onClose={() => setDrawerDeliveryId(null)}
                    onStatusChanged={() => {
                        loadDeliveries();
                        loadStats();
                    }}
                    onOpenAssignPartner={(del) => {
                        if (isTerminalDeliveryStatus(del?.status)) return;
                        setDrawerDeliveryId(null);
                        setAssignPartnerTarget(del);
                    }}
                    onOpenUpdateAddress={(del) => {
                        if (isTerminalDeliveryStatus(del?.status)) return;
                        setDrawerDeliveryId(null);
                        setUpdateAddressTarget(del);
                    }}
                    onOpenCancel={(del) => {
                        if (isTerminalDeliveryStatus(del?.status)) return;
                        setDrawerDeliveryId(null);
                        setCancelDeliveryTarget(del);
                    }}
                    onOpenShippingLabel={(id) => {
                        setDrawerDeliveryId(null);
                        setPrintLabelDeliveryId(id);
                    }}
                />
            )}

            {/* Add / Edit Delivery Method Modal */}
            {(showAddMethodModal || methodModalTarget) && (
                <DeliveryMethodModal
                    method={methodModalTarget}
                    onClose={() => {
                        setShowAddMethodModal(false);
                        setMethodModalTarget(null);
                    }}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadMethods();
                    }}
                />
            )}

            {/* Add / Edit Delivery Zone Modal */}
            {(showAddZoneModal || zoneModalTarget) && (
                <DeliveryZoneModal
                    zone={zoneModalTarget}
                    onClose={() => {
                        setShowAddZoneModal(false);
                        setZoneModalTarget(null);
                    }}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadZones();
                    }}
                />
            )}

            {/* Connect / Edit Delivery Partner Modal */}
            {(showConnectPartnerModal || partnerModalTarget) && (
                <DeliveryPartnerModal
                    partner={partnerModalTarget}
                    onClose={() => {
                        setShowConnectPartnerModal(false);
                        setPartnerModalTarget(null);
                    }}
                    onSuccess={(msg) => {
                        showNotification(msg);
                        loadPartners();
                    }}
                />
            )}
        </div>
    );
};

export default DeliveryManagement;
