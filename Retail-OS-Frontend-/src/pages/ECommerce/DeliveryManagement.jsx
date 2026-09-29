import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BsSearch, BsDownload, BsPlus, BsEye, BsPencilSquare, BsTrash,
    BsTruck, BsBoxSeam, BsGeoAlt, BsCheckCircleFill, BsXCircleFill,
    BsClockFill, BsLightningChargeFill, BsToggleOn, BsToggleOff,
    BsArrowClockwise, BsCopy, BsPerson, BsPhone, BsEnvelope,
    BsExclamationTriangle, BsPrinter, BsFileEarmarkArrowUp,
    BsPinMapFill, BsCheckLg, BsXLg, BsInfoCircle,
} from 'react-icons/bs';
import {
    getDeliveries,
    createDelivery,
    getDeliveryById,
    updateDeliveryStatus,
    cancelDelivery,
    assignDeliveryPartner,
    updateDeliveryAddress,
    getDeliveryLabel,
    getDeliveryTracking,
    getDeliveryHistory,
    getDeliveryStats,
    exportDeliveries,
    getDeliveryMethods,
    createDeliveryMethod,
    updateDeliveryMethod,
    deleteDeliveryMethod,
    toggleDeliveryMethod,
    getDeliveryZones,
    createDeliveryZone,
    updateDeliveryZone,
    deleteDeliveryZone,
    getDeliveryPartners,
    connectDeliveryPartner,
    updateDeliveryPartner,
    deleteDeliveryPartner,
    uploadServiceability,
    checkPincodeServiceability,
} from '../../services/deliveryService';

import { getOrders } from '../../services/orderService';

// Standardized status color mapping for backend delivery status enum
const statusConfig = {
    pending: { label: 'Pending', color: '#6366f1', bg: '#eef2ff', icon: <BsClockFill size={11} /> },
    assigned: { label: 'Assigned', color: '#0ea5e9', bg: '#f0f9ff', icon: <BsPerson size={11} /> },
    out_for_delivery: { label: 'Out for Delivery', color: '#f97316', bg: '#fff7ed', icon: <BsLightningChargeFill size={11} /> },
    delivered: { label: 'Delivered', color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
};

const STATUS_ENUMS = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'];

const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

const fmtCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// ==========================================
// MODAL 1: CREATE DELIVERY SHIPMENT
// ==========================================
const CreateDeliveryModal = ({ onClose, onSuccess }) => {
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
                                {availableOrders.map(ord => (
                                    <option key={ord.id} value={ord.id}>
                                        Order #{ord.id} - {ord.customer_name || ord.customer?.name || `Customer #${ord.customer_id || 'N/A'}`} ({ord.status || 'Active'}) - ₹{ord.total_amount || ord.total || 0}
                                    </option>
                                ))}
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
                            Must be an existing order created under <strong>Online Orders</strong>.
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
    const [trackingNumber, setTrackingNumber] = useState(delivery?.tracking_number || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!deliveryPerson.trim()) {
            setError('Delivery Person / Partner name is required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                delivery_person: deliveryPerson.trim(),
                tracking_number: trackingNumber.trim() || null,
            };
            const res = await assignDeliveryPartner(delivery.id, payload);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
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
                            <div style="font-family: monospace; font-size: 15px; font-weight: 800;">${labelData.barcode || labelData.tracking_number || 'N/A'}</div>
                        </div>
                        <div class="grid">
                            <div class="box">
                                <span style="font-weight: 800; color: #9ca3af; font-size: 10px;">ORDER INFO:</span>
                                <div style="font-weight: 800; color: #111827; margin-top: 4px; font-size: 12px;">Order #${labelData.order_number || labelData.order_id}</div>
                                <div>Status: <strong>${labelData.status}</strong></div>
                                <div>Carrier/Rider: <strong>${labelData.delivery_person || 'Standard'}</strong></div>
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
                                {labelData.barcode || labelData.tracking_number || 'N/A'}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>ORDER DETAILS:</span>
                                <p style={{ fontWeight: 800, color: '#111827', margin: '4px 0 2px 0' }}>Order #{labelData.order_number || labelData.order_id}</p>
                                <p style={{ color: '#4b5563', margin: 0 }}>Delivery ID: #{labelData.delivery_id}</p>
                                <p style={{ color: '#4b5563', margin: '2px 0 0 0' }}>Status: <strong>{labelData.status}</strong></p>
                                <p style={{ color: '#6366f1', fontWeight: 700, margin: '4px 0 0 0' }}>Partner: {labelData.delivery_person || 'Self / Standard'}</p>
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
        try {
            const [delRes, trackRes, histRes] = await Promise.allSettled([
                getDeliveryById(deliveryId),
                getDeliveryTracking(deliveryId),
                getDeliveryHistory(deliveryId),
            ]);

            if (delRes.status === 'fulfilled') {
                setDelivery(delRes.value?.data || delRes.value);
            } else {
                throw new Error(delRes.reason?.response?.data?.detail || delRes.reason?.message || 'Failed to load delivery');
            }

            if (trackRes.status === 'fulfilled') {
                setTracking(trackRes.value?.data || trackRes.value);
            }
            if (histRes.status === 'fulfilled') {
                const histData = histRes.value?.data;
                setHistory(Array.isArray(histData) ? histData : (histData?.items || []));
            }
        } catch (err) {
            setError(err.message || 'Failed to load full delivery details.');
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
    const sc = statusConfig[delivery?.status] || { label: delivery?.status || 'Unknown', color: '#6b7280', bg: '#f9fafb' };

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
                            Fetching real-time tracking data...
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
                                {delivery.status === 'cancelled' || delivery.status === 'delivered' ? (
                                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280' }}>
                                        Final State
                                    </span>
                                ) : (
                                    <select
                                        disabled={updatingStatus}
                                        value={delivery.status}
                                        onChange={e => handleStatusUpdate(e.target.value)}
                                        style={{
                                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            background: '#fff', color: '#111827', border: '1px solid #d1d5db', cursor: 'pointer'
                                        }}
                                    >
                                        {STATUS_ENUMS.map(st => (
                                            <option key={st} value={st}>{statusConfig[st]?.label || st}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Tracking & Carrier Information */}
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BsTruck style={{ color: '#6366f1' }} /> Live Tracking & Logistics Partner
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}>
                                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Partner / Rider</span>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>
                                            {delivery.delivery_person || 'Not Assigned'}
                                        </p>
                                    </div>
                                    <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}>
                                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>AWB Tracking No.</span>
                                        <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#6366f1', margin: '2px 0 0 0' }}>
                                            {delivery.tracking_number || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                {tracking?.remarks && (
                                    <div style={{ marginTop: 10, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0369a1' }}>
                                        <strong>Live Remarks:</strong> {tracking.remarks}
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions Bar */}
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
                                <span>Delivered: {delivery.delivered_at ? formatDateTime(delivery.delivered_at) : 'In transit'}</span>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 22px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                        Close
                    </button>
                    <button
                        onClick={() => onOpenShippingLabel(deliveryId)}
                        className="adm-btn-primary"
                        style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                    >
                        <BsPrinter size={14} /> Shipping Label
                    </button>
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
                const jsonStr = JSON.stringify(data, null, 2);
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
    const [selectedIds, setSelectedIds] = useState([]);

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

    // Load Deliveries
    const loadDeliveries = useCallback(async () => {
        setLoadingDeliveries(true);
        try {
            const res = await getDeliveries();
            const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || (Array.isArray(res) ? res : []));
            setDeliveries(items);
        } catch (err) {
            showNotification(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to fetch deliveries', true);
        } finally {
            setLoadingDeliveries(false);
        }
    }, []);

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

    // Filter Deliveries
    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const matchesSearch =
                String(d.id || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.order_id || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.delivery_person || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.tracking_number || '').toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [deliveries, search, statusFilter]);

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
                        className="adm-btn-secondary"
                        onClick={() => {
                            if (activeTab === 'Deliveries') { loadDeliveries(); loadStats(); }
                            else if (activeTab === 'Delivery Methods') loadMethods();
                            else if (activeTab === 'Delivery Zones') loadZones();
                            else if (activeTab === 'Delivery Partners') loadPartners();
                        }}
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

            {/* 6 KPI Cards Grid (Directly Connected to /api/v1/delivery/stats) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Deliveries</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', marginTop: 4, margin: 0 }}>
                        {stats?.total_deliveries ?? deliveries.length}
                    </p>
                    <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>All registered shipments</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Pending</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginTop: 4, margin: 0 }}>
                        {stats?.pending_deliveries ?? deliveries.filter(d => d.status === 'pending').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Awaiting dispatch</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Assigned</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#0ea5e9', marginTop: 4, margin: 0 }}>
                        {stats?.assigned_deliveries ?? deliveries.filter(d => d.status === 'assigned').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600 }}>Partner/Rider assigned</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Out for Delivery</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#f97316', marginTop: 4, margin: 0 }}>
                        {stats?.out_for_delivery_deliveries ?? deliveries.filter(d => d.status === 'out_for_delivery').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#f97316', fontWeight: 600 }}>In active transit</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Delivered</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginTop: 4, margin: 0 }}>
                        {stats?.delivered_deliveries ?? deliveries.filter(d => d.status === 'delivered').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Fulfilled successfully</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Cancelled</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginTop: 4, margin: 0 }}>
                        {stats?.cancelled_deliveries ?? deliveries.filter(d => d.status === 'cancelled').length}
                    </p>
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Cancelled / RTO</span>
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
                            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                                <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                                <input
                                    type="text"
                                    className="ec-input"
                                    placeholder="Search by Delivery ID, Order ID, Driver, Tracking No..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ paddingLeft: 34, width: '100%', height: 38 }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>Status:</span>
                                <select
                                    className="ec-input"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                                >
                                    <option value="All">All Statuses</option>
                                    {STATUS_ENUMS.map(st => (
                                        <option key={st} value={st}>{statusConfig[st]?.label || st}</option>
                                    ))}
                                </select>
                                {(search || statusFilter !== 'All') && (
                                    <button
                                        onClick={() => { setSearch(''); setStatusFilter('All'); }}
                                        style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '0 8px' }}
                                    >
                                        Reset ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 900 }}>
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
                                    <th style={{ padding: '12px 16px' }}>Delivery & Order ID</th>
                                    <th style={{ padding: '12px 16px' }}>Assigned Person / Partner</th>
                                    <th style={{ padding: '12px 16px' }}>Tracking Number</th>
                                    <th style={{ padding: '12px 16px' }}>Status Pipeline</th>
                                    <th style={{ padding: '12px 16px' }}>Created Date</th>
                                    <th style={{ padding: '12px 16px' }}>Delivered At</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
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
                                        <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 }}>No Deliveries Found</p>
                                            <p style={{ fontSize: 12, marginTop: 4 }}>Click "+ Create Shipment" to register a new delivery record.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDeliveries.map(d => {
                                        const sc = statusConfig[d.status] || { label: d.status, color: '#6b7280', bg: '#f9fafb' };
                                        const isSelected = selectedIds.includes(d.id);

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
                                                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '2px 7px', borderRadius: 6, display: 'inline-block', width: 'max-content' }}>
                                                            #{d.id}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                                            Order: <strong style={{ color: '#111827' }}>#{d.order_id}</strong>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {d.delivery_person ? (
                                                        <span
                                                            onClick={() => setAssignPartnerTarget(d)}
                                                            style={{ fontSize: 12, background: '#eef2ff', color: '#4338ca', padding: '3px 9px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                            title="Click to reassign partner"
                                                        >
                                                            <BsPerson size={12} /> {d.delivery_person}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setAssignPartnerTarget(d)}
                                                            style={{ fontSize: 11, background: '#fff', color: '#6366f1', border: '1px dashed #6366f1', padding: '3px 8px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            + Assign Partner
                                                        </button>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                                        {d.tracking_number || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {d.status === 'cancelled' || d.status === 'delivered' ? (
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
                                                            value={d.status}
                                                            onChange={e => handleQuickStatusChange(d.id, e.target.value)}
                                                            style={{
                                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                                background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44`, cursor: 'pointer', outline: 'none'
                                                            }}
                                                        >
                                                            {STATUS_ENUMS.map(st => (
                                                                <option key={st} value={st} style={{ background: '#fff', color: '#111827' }}>
                                                                    {statusConfig[st]?.label || st}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: 11, color: '#6b7280' }}>
                                                    {formatDateTime(d.created_at)}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: 11, color: '#4b5563' }}>
                                                    {d.delivered_at ? formatDateTime(d.delivered_at) : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Pending</span>}
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            title="Print Shipping Label"
                                                            onClick={() => setPrintLabelDeliveryId(d.id)}
                                                            style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                                                        >
                                                            <BsPrinter size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="View Tracking & Audit History"
                                                            onClick={() => setDrawerDeliveryId(d.id)}
                                                            style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6366f1', cursor: 'pointer' }}
                                                        >
                                                            <BsEye size={13} />
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
                        setDrawerDeliveryId(null);
                        setAssignPartnerTarget(del);
                    }}
                    onOpenUpdateAddress={(del) => {
                        setDrawerDeliveryId(null);
                        setUpdateAddressTarget(del);
                    }}
                    onOpenCancel={(del) => {
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
