import React, { useState, useEffect, useMemo } from 'react';
import {
    BsSearch, BsDownload, BsPlus, BsEye, BsPencilSquare, BsTrash,
    BsTruck, BsBoxSeam, BsGeoAlt, BsCheckCircleFill, BsXCircleFill,
    BsClockFill, BsLightningChargeFill, BsToggleOn, BsToggleOff,
    BsArrowClockwise, BsCloudCheckFill, BsCloudSlashFill, BsCopy,
    BsFilter, BsStarFill, BsGraphUp, BsHouseDoor, BsShop, BsArrowRight,
    BsExclamationTriangle, BsPerson, BsPhone, BsEnvelope, BsTag,
} from 'react-icons/bs';
import { getDeliveries, updateDeliveryStatus } from '../../services/deliveryService';

// Standardized status color themes
const statusConfig = {
    Confirmed: { color: '#6366f1', bg: '#eef2ff', icon: <BsClockFill size={11} /> },
    Packed: { color: '#0ea5e9', bg: '#f0f9ff', icon: <BsBoxSeam size={11} /> },
    Shipped: { color: '#8b5cf6', bg: '#f5f3ff', icon: <BsTruck size={11} /> },
    'Out for Delivery': { color: '#f97316', bg: '#fff7ed', icon: <BsLightningChargeFill size={11} /> },
    Delivered: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Failed: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
};

const STATUS_OPTIONS = ['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Failed'];

const INITIAL_METHODS = [
    { id: 1, type: 'Home Delivery', icon: '🏠', partner: 'Dunzo', minDays: 2, maxDays: 5, charge: 60, freeAbove: 500, enabled: true, zones: ['Bangalore', 'Mumbai', 'Delhi', 'Chennai'] },
    { id: 2, type: 'Same Day Delivery', icon: '⚡', partner: 'Swiggy Genie', minDays: 0, maxDays: 0, charge: 99, freeAbove: 999, enabled: true, zones: ['Bangalore', 'Mumbai'] },
    { id: 3, type: 'Express Delivery', icon: '🚀', partner: 'Delhivery', minDays: 1, maxDays: 2, charge: 79, freeAbove: 799, enabled: true, zones: ['All India'] },
    { id: 4, type: 'Store Pickup', icon: '🏪', partner: 'Self', minDays: 0, maxDays: 0, charge: 0, freeAbove: 0, enabled: true, zones: ['In-store Only'] },
];

const DEMO_DELIVERIES = [
    {
        id: 'DEL-8821', order: 'ONL-10041', customer: 'Aarav Mehta', email: 'aarav.m@example.com', phone: '+91 98765 43210',
        city: 'Bangalore', address: '12 MG Road, Indiranagar, 560038', type: 'Express Delivery', partner: 'Delhivery',
        tracking: 'DL94820384', status: 'Out for Delivery', estimatedDate: '26 Jun 2026', updatedAt: '10:42 AM', rawId: 'DEL-8821',
        items: [{ name: 'Wireless Headphones X1', qty: 1, price: 2499 }, { name: 'USB-C Cable', qty: 2, price: 299 }]
    },
    {
        id: 'DEL-8820', order: 'ONL-10040', customer: 'Priya Sharma', email: 'priya.s@example.com', phone: '+91 98123 45678',
        city: 'Mumbai', address: '5B Andheri West, Lokhandwala, 400053', type: 'Home Delivery', partner: 'Dunzo',
        tracking: 'DZ73981239', status: 'Shipped', estimatedDate: '28 Jun 2026', updatedAt: 'Yesterday', rawId: 'DEL-8820',
        items: [{ name: 'Smart Fitness Watch', qty: 1, price: 4999 }]
    },
    {
        id: 'DEL-8819', order: 'ONL-10039', customer: 'Rohan Das', email: 'rohan.d@example.com', phone: '+91 97111 22334',
        city: 'Delhi', address: '34 Lajpat Nagar, Block B, 110024', type: 'Same Day Delivery', partner: 'Swiggy Genie',
        tracking: 'SG20938477', status: 'Packed', estimatedDate: '26 Jun 2026', updatedAt: '9:20 AM', rawId: 'DEL-8819',
        items: [{ name: 'Mechanical Keyboard', qty: 1, price: 3499 }]
    },
    {
        id: 'DEL-8818', order: 'ONL-10037', customer: 'Vikram Singh', email: 'vikram.s@example.com', phone: '+91 96543 21098',
        city: 'Chennai', address: '18 Anna Nagar, E Block, 600102', type: 'Express Delivery', partner: 'Delhivery',
        tracking: 'DL84738291', status: 'Delivered', estimatedDate: '25 Jun 2026', updatedAt: '25 Jun', rawId: 'DEL-8818',
        items: [{ name: 'Ergonomic Office Chair', qty: 1, price: 8999 }]
    },
    {
        id: 'DEL-8817', order: 'ONL-10035', customer: 'Arjun Kumar', email: 'arjun.k@example.com', phone: '+91 95000 11223',
        city: 'Kolkata', address: '23 Park Street, 700016', type: 'Home Delivery', partner: 'Dunzo',
        tracking: 'DZ84792038', status: 'Confirmed', estimatedDate: '29 Jun 2026', updatedAt: 'Yesterday', rawId: 'DEL-8817',
        items: [{ name: 'Bluetooth Speaker', qty: 1, price: 1799 }]
    },
    {
        id: 'DEL-8816', order: 'ONL-10034', customer: 'Neha Gupta', email: 'neha.g@example.com', phone: '+91 94112 33445',
        city: 'Bangalore', address: '88 Koramangala 4th Block, 560034', type: 'Same Day Delivery', partner: 'Swiggy Genie',
        tracking: 'SG99201923', status: 'Delivered', estimatedDate: '24 Jun 2026', updatedAt: '24 Jun', rawId: 'DEL-8816',
        items: [{ name: 'Organic Cotton T-Shirt', qty: 3, price: 599 }]
    },
    {
        id: 'DEL-8815', order: 'ONL-10031', customer: 'Kavita Verma', email: 'kavita.v@example.com', phone: '+91 93222 44556',
        city: 'Pune', address: '14 Viman Nagar, 411014', type: 'Store Pickup', partner: 'Self',
        tracking: 'IN-STORE-PICKUP', status: 'Packed', estimatedDate: '26 Jun 2026', updatedAt: 'Today', rawId: 'DEL-8815',
        items: [{ name: 'Leather Backpack', qty: 1, price: 3200 }]
    },
];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const extractDeliveryList = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.deliveries)) return data.deliveries;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.results)) return data.results;
        if (data.data && Array.isArray(data.data.items)) return data.data.items;
    }
    return [];
};

const mapBackendDeliveryToFrontend = (item) => {
    const rawId = item.id || item.delivery_id;
    let formattedId = 'DEL-000';
    if (item.delivery_id) {
        formattedId = String(item.delivery_id);
    } else if (item.id) {
        formattedId = String(item.id).startsWith('DEL-') ? String(item.id) : `DEL-${item.id}`;
    }

    return {
        id: formattedId,
        order: item.order_id || item.order_number || item.order || 'N/A',
        customer: item.customer_name || item.customer || item.user_name || item.recipient_name || 'Customer',
        email: item.customer_email || item.email || 'customer@example.com',
        phone: item.customer_phone || item.phone || 'N/A',
        city: item.city || item.delivery_city || item.destination_city || 'Bangalore',
        address: item.address || item.delivery_address || item.shipping_address || 'Address on record',
        type: item.delivery_type || item.type || item.shipping_method || 'Home Delivery',
        partner: item.courier_partner || item.partner || item.carrier || 'Delhivery',
        tracking: item.tracking_number || item.tracking_code || item.awb_number || item.tracking || 'N/A',
        status: item.status || 'Confirmed',
        estimatedDate: item.estimated_delivery_date || item.estimated_date || item.estimatedDate || 'TBD',
        updatedAt: item.updated_at || item.updatedAt || 'Just now',
        rawId: rawId || formattedId,
        items: item.items || [{ name: 'Order Items', qty: 1, price: item.total_amount || 999 }]
    };
};

const typeIcons = {
    'Home Delivery': '🏠',
    'Same Day Delivery': '⚡',
    'Express Delivery': '🚀',
    'Store Pickup': '🏪'
};

// Delivery Detail Drawer / Panel Component
const DeliveryDetailDrawer = ({ delivery, onClose, onStatusChange, isUpdating }) => {
    if (!delivery) return null;
    const sc = statusConfig[delivery.status] || { color: '#6b7280', bg: '#f9fafb' };

    const statusSteps = ['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(delivery.status);

    const copyTracking = () => {
        navigator.clipboard.writeText(delivery.tracking);
        alert(`Copied tracking code ${delivery.tracking} to clipboard!`);
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 520,
                    height: '100vh',
                    background: '#ffffff',
                    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideInRight 0.25s ease-out'
                }}
            >
                {/* Drawer Header */}
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: 6 }}>
                                {delivery.id}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                                Order: {delivery.order}
                            </span>
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 }}>Delivery Tracking Details</h2>
                    </div>
                    <button onClick={onClose} className="ec-modal-close" style={{ fontSize: 18 }}>✕</button>
                </div>

                {/* Drawer Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Status Banner */}
                    <div style={{ background: sc.bg, border: `1px solid ${sc.color}33`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</span>
                            <p style={{ fontSize: 20, fontWeight: 800, color: sc.color, margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {sc.icon} {delivery.status}
                            </p>
                        </div>
                        <select
                            disabled={isUpdating}
                            value={delivery.status}
                            onChange={e => onStatusChange(delivery, e.target.value)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                background: '#ffffff',
                                color: '#111827',
                                border: '1px solid #d1d5db',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stepper Timeline */}
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Shipment Progress Timeline</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                            {statusSteps.map((step, idx) => {
                                const isPassed = currentStepIndex >= idx;
                                const isCurrent = currentStepIndex === idx;

                                return (
                                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: isPassed ? 1 : 0.4 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: isPassed ? '#10b981' : '#e5e7eb',
                                            color: '#fff', fontSize: 12, fontWeight: 800,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {isPassed ? '✓' : idx + 1}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#10b981' : '#374151', margin: 0 }}>
                                                {step}
                                            </p>
                                            {isCurrent && (
                                                <span style={{ fontSize: 11, color: '#6b7280' }}>Updated: {delivery.updatedAt}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Customer & Address Information */}
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BsPerson style={{ color: '#6366f1' }} /> Recipient & Delivery Address
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {delivery.customer?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>{delivery.customer}</p>
                                    <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{delivery.email}</p>
                                </div>
                            </div>

                            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #f3f4f6' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', margin: 0 }}>Destination Address</p>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '4px 0 0 0' }}>{delivery.address}</p>
                                <p style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, margin: '2px 0 0 0' }}>City: {delivery.city}</p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#4b5563' }}>
                                <span><BsPhone style={{ color: '#6366f1', marginRight: 4 }} /> {delivery.phone}</span>
                            </div>
                        </div>
                    </div>

                    {/* Courier & Tracking Info */}
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BsTruck style={{ color: '#6366f1' }} /> Logistics & Tracking Info
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}>
                                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Courier Partner</span>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>{delivery.partner}</p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8 }}>
                                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Type</span>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>{typeIcons[delivery.type] || '🚚'} {delivery.type}</p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 8, gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>AWB Tracking Code</span>
                                    <button onClick={copyTracking} style={{ border: 'none', background: 'transparent', color: '#6366f1', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <BsCopy size={11} /> Copy Code
                                    </button>
                                </div>
                                <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#6366f1', margin: '4px 0 0 0' }}>
                                    {delivery.tracking}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Order Package Contents */}
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Package Contents</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {delivery.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '8px 10px', background: '#f9fafb', borderRadius: 8 }}>
                                    <div>
                                        <p style={{ fontWeight: 700, color: '#111827', margin: 0 }}>{item.name}</p>
                                        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Qty: {item.qty}</p>
                                    </div>
                                    <span style={{ fontWeight: 700, color: '#10b981' }}>{fmt(item.price * item.qty)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drawer Footer Actions */}
                <div style={{ padding: '16px 22px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                        Close
                    </button>
                    <button onClick={() => alert(`Printing Shipping Label for ${delivery.id}...`)} className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                        Print Shipping Label
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export Directory Modal Component
const ExportDeliveryModal = ({ onClose, deliveriesCount }) => {
    const [format, setFormat] = useState('csv');

    const handleExport = () => {
        alert(`Exporting ${deliveriesCount} delivery records as .${format.toUpperCase()} file...`);
        onClose();
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Export Delivery Directory</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Download delivery records & shipment tracking data</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Select File Format</label>
                        <select className="ec-input" value={format} onChange={e => setFormat(e.target.value)}>
                            <option value="csv">CSV File (.csv)</option>
                            <option value="excel">Excel Sheet (.xlsx)</option>
                            <option value="json">JSON Export (.json)</option>
                        </select>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                        Export contains <strong>{deliveriesCount}</strong> records matching active filters.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
                        <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleExport}>
                            <BsDownload size={14} /> Export File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Delivery Management Page
const DeliveryManagement = () => {
    const [methods, setMethods] = useState(INITIAL_METHODS);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiConnected, setApiConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Filter & Search states (Matching Customer Directory style)
    const [activeTab, setActiveTab] = useState('Active Deliveries');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterPartner, setFilterPartner] = useState('All');
    const [filterCity, setFilterCity] = useState('All');
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals & Drawer States
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [showMethodModal, setShowMethodModal] = useState(false);
    const [editMethod, setEditMethod] = useState(null);
    const [methodForm, setMethodForm] = useState({});

    // Pincode Lookup state
    const [checkPincode, setCheckPincode] = useState('');
    const [pincodeResult, setPincodeResult] = useState(null);

    const tabs = ['Active Deliveries', 'Delivery Methods', 'Zones & Charges'];

    const fetchDeliveriesFromApi = async () => {
        setLoading(true);
        setErrorMsg('');
        setIsDemoMode(false);
        try {
            const data = await getDeliveries();
            const rawList = extractDeliveryList(data);
            const formatted = rawList.map(mapBackendDeliveryToFrontend);

            if (formatted.length > 0) {
                setDeliveries(formatted);
                setApiConnected(true);
            } else {
                // If API returns empty array, default to demo mode gracefully
                setDeliveries(DEMO_DELIVERIES);
                setIsDemoMode(true);
                setApiConnected(true);
            }
        } catch (err) {
            console.warn('Backend Delivery API call error:', err.message);
            setErrorMsg(err.message || 'Failed to fetch from Delivery API');
            setApiConnected(false);
            setDeliveries(DEMO_DELIVERIES);
            setIsDemoMode(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveriesFromApi();
    }, []);

    const loadDemoData = () => {
        setDeliveries(DEMO_DELIVERIES);
        setIsDemoMode(true);
        setErrorMsg('');
    };

    const handleStatusChange = async (deliveryRecord, newStatus) => {
        const targetId = deliveryRecord.rawId || deliveryRecord.id;
        setUpdatingId(deliveryRecord.id);

        try {
            if (apiConnected && !isDemoMode) {
                await updateDeliveryStatus(targetId, newStatus);
            }
            setDeliveries(prev => prev.map(d => d.id === deliveryRecord.id ? { ...d, status: newStatus } : d));
            if (selectedDelivery && selectedDelivery.id === deliveryRecord.id) {
                setSelectedDelivery(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            console.warn('Status update API call error:', err.message);
            alert('Failed to update status on server: ' + (err.message || 'API Error'));
        } finally {
            setUpdatingId(null);
        }
    };

    // Filter Logic matching Customer Directory
    const availableCities = useMemo(() => {
        const cities = Array.from(new Set(deliveries.map(d => d.city).filter(Boolean)));
        return cities.sort();
    }, [deliveries]);

    const availablePartners = useMemo(() => {
        const partners = Array.from(new Set(deliveries.map(d => d.partner).filter(Boolean)));
        return partners.sort();
    }, [deliveries]);

    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            const matchesSearch =
                String(d.id || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.order || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.customer || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.tracking || '').toLowerCase().includes(search.toLowerCase()) ||
                String(d.phone || '').toLowerCase().includes(search.toLowerCase());

            const matchesStatus = filterStatus === 'All' || d.status === filterStatus;
            const matchesType = filterType === 'All' || d.type === filterType;
            const matchesPartner = filterPartner === 'All' || d.partner === filterPartner;
            const matchesCity = filterCity === 'All' || d.city === filterCity;

            return matchesSearch && matchesStatus && matchesType && matchesPartner && matchesCity;
        });
    }, [deliveries, search, filterStatus, filterType, filterPartner, filterCity]);

    const hasActiveFilters = search || filterStatus !== 'All' || filterType !== 'All' || filterPartner !== 'All' || filterCity !== 'All';

    const handleClearFilters = () => {
        setSearch('');
        setFilterStatus('All');
        setFilterType('All');
        setFilterPartner('All');
        setFilterCity('All');
    };

    // Checkbox bulk operations
    const handleToggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredDeliveries.map(d => d.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Method modal handlers
    const openAddMethod = () => {
        setEditMethod(null);
        setMethodForm({ type: '', partner: '', minDays: 1, maxDays: 3, charge: 60, freeAbove: 500, enabled: true, zones: ['All India'] });
        setShowMethodModal(true);
    };

    const openEditMethod = (m) => {
        setEditMethod(m);
        setMethodForm({ ...m });
        setShowMethodModal(true);
    };

    const handleSaveMethod = () => {
        if (editMethod) {
            setMethods(prev => prev.map(m => m.id === editMethod.id ? { ...methodForm, id: m.id } : m));
        } else {
            setMethods(prev => [...prev, { ...methodForm, id: Date.now(), icon: '🚚' }]);
        }
        setShowMethodModal(false);
    };

    const toggleMethod = (id) => {
        setMethods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    // Pincode test checker
    const handlePincodeCheck = () => {
        if (!checkPincode || checkPincode.length !== 6) {
            alert('Please enter a valid 6-digit pincode');
            return;
        }
        if (checkPincode.startsWith('56') || checkPincode.startsWith('40') || checkPincode.startsWith('11')) {
            setPincodeResult({ serviceable: true, msg: `${checkPincode} — Fully Serviceable (Home, Express, Same Day Available)` });
        } else {
            setPincodeResult({ serviceable: true, msg: `${checkPincode} — Standard Delivery Available (2-5 Business Days)` });
        }
    };

    // KPI Metrics calculation (dynamic based on deliveries dataset)
    const totalCount = deliveries.length;
    const outForDeliveryCount = useMemo(() => deliveries.filter(d => d.status === 'Out for Delivery').length, [deliveries]);
    const deliveredCount = useMemo(() => deliveries.filter(d => d.status === 'Delivered').length, [deliveries]);
    const shippedCount = useMemo(() => deliveries.filter(d => d.status === 'Shipped').length, [deliveries]);
    const pendingCount = useMemo(() => deliveries.filter(d => ['Confirmed', 'Packed'].includes(d.status)).length, [deliveries]);
    const failedCount = useMemo(() => deliveries.filter(d => d.status === 'Failed').length, [deliveries]);

    // Partner Order Counts & Rankings
    const courierRankings = useMemo(() => {
        if (!deliveries.length) return [];
        const partnerMap = {};
        deliveries.forEach(d => {
            const partner = d.partner || 'Self';
            partnerMap[partner] = (partnerMap[partner] || 0) + 1;
        });

        return Object.entries(partnerMap)
            .map(([partner, count]) => ({
                partner,
                count,
                percentage: Math.round((count / deliveries.length) * 100),
            }))
            .sort((a, b) => b.count - a.count);
    }, [deliveries]);

    const topPartner = courierRankings[0]?.partner || 'N/A';

    // Dynamic Success Rate Calculation
    const successRate = useMemo(() => {
        if (totalCount === 0) return '0.0%';
        const finishedCount = deliveredCount + failedCount;
        if (finishedCount > 0) {
            return ((deliveredCount / finishedCount) * 100).toFixed(1) + '%';
        }
        return ((deliveredCount / totalCount) * 100).toFixed(1) + '%';
    }, [deliveredCount, failedCount, totalCount]);

    // Dynamic Metro vs Tier 2 & Tier 3 Zone breakdown
    const zoneCoverage = useMemo(() => {
        if (!totalCount) return { metro: 0, nonMetro: 0 };
        const metroCities = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad'];
        const metroCount = deliveries.filter(d => metroCities.includes(d.city)).length;
        const metro = Math.round((metroCount / totalCount) * 100);
        return { metro, nonMetro: 100 - metro };
    }, [deliveries, totalCount]);

    const analyticsCardStyle = {
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '14px 16px',
        height: 190,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
    };

    return (
        <div className="dash-page" style={{ paddingBottom: 40 }}>
            {/* Header Section */}
            <div className="adm-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, fontSize: 20 }}>
                            <BsTruck />
                        </span>
                        Delivery Management & Operations
                    </h1>
                    <p className="adm-page-sub">Manage order shipments, delivery status pipeline, courier partners, zones, and pincode coverage.</p>
                </div>

                <div className="adm-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {apiConnected && !isDemoMode && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0' }}>
                            <BsCloudCheckFill size={13} /> Live API
                        </span>
                    )}
                    {isDemoMode && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                            Demo Data Mode
                        </span>
                    )}

                    <button className="adm-btn-secondary" onClick={fetchDeliveriesFromApi} disabled={loading} title="Fetch live data from GET /api/v1/delivery">
                        <BsArrowClockwise size={14} className={loading ? 'spin' : ''} />
                        {loading ? ' Fetching...' : ' Refresh API'}
                    </button>

                    <button className="adm-btn-secondary" onClick={() => setShowExportModal(true)}>
                        <BsDownload size={14} /> Export Directory
                    </button>

                    {activeTab === 'Delivery Methods' && (
                        <button className="adm-btn-primary" onClick={openAddMethod}>
                            <BsPlus size={18} /> Add Method
                        </button>
                    )}
                </div>
            </div>

            {/* API Connection Warning Bar */}
            {errorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#991b1b', fontWeight: 500 }}>
                        <BsCloudSlashFill size={16} color="#ef4444" />
                        <span>API Status: <strong>{errorMsg}</strong> (Falling back to demo data mode)</span>
                    </div>
                    <button onClick={loadDemoData} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Load Demo Data
                    </button>
                </div>
            )}

            {/* 5 KPI Cards Grid (Matching Customer Directory Style) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Deliveries</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', marginTop: 6, margin: 0 }}>{totalCount}</p>
                    <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Active shipment records</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Out for Delivery</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#f97316', marginTop: 6, margin: 0 }}>{outForDeliveryCount}</p>
                    <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>Drivers on the road</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Delivered Today</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 6, margin: 0 }}>{deliveredCount}</p>
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Fulfilled successfully</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Pending / In Transit</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 6, margin: 0 }}>{pendingCount + shippedCount}</p>
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>{pendingCount} packing, {shippedCount} shipped</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Top Logistics Partner</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', marginTop: 6, margin: 0 }}>{topPartner}</p>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Primary shipping courier ({courierRankings[0]?.count || 0} orders)</span>
                </div>
            </div>

            {/* Delivery Intelligence & Analytics Cards Grid */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsStarFill style={{ color: '#6366f1' }} /> Logistics Intelligence & Performance
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {/* Card 1: Courier Performance */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🏆 Courier Rankings
                            </span>
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Fulfillment</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {courierRankings.length === 0 ? (
                                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>No partner data available</p>
                            ) : (
                                courierRankings.map((p, idx) => (
                                    <div key={p.partner} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: '#f9fafb', borderRadius: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: idx === 0 ? '#d97706' : '#6b7280', background: idx === 0 ? '#fffbeb' : '#e5e7eb', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {idx + 1}
                                            </span>
                                            <span style={{ fontWeight: 600, color: '#111827' }}>{p.partner}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 10, color: '#6b7280' }}>{p.count} orders</span>
                                            <span style={{ fontWeight: 700, color: '#10b981' }}>{p.percentage}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Card 2: Delivery Completion Rate */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                📈 Success Rate
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>
                                {successRate}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Successful</span>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#10b981', margin: '2px 0 0 0' }}>{deliveredCount}</p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Failed / Return</span>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', margin: '2px 0 0 0' }}>{failedCount}</p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Target Completion</span>
                            <span style={{ fontWeight: 700, color: '#111827' }}>95.0% SLA</span>
                        </div>
                    </div>

                    {/* Card 3: Average Delivery Speed */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                ⚡ Speed Metrics
                            </span>
                            <BsClockFill size={15} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Same Day</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', margin: '2px 0 0 0' }}>3.5 hrs</p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Standard</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#0ea5e9', margin: '2px 0 0 0' }}>2.1 days</p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Avg Dispatch Time</span>
                            <span style={{ fontWeight: 700, color: '#111827' }}>45 mins</span>
                        </div>
                    </div>

                    {/* Card 4: Zone Coverage */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🌐 Zone Coverage
                            </span>
                            <BsGeoAlt size={15} style={{ color: '#f59e0b' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Metro Cities</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', margin: '2px 0 0 0' }}>{zoneCoverage.metro}%</p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Tier 2 & 3</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#6366f1', margin: '2px 0 0 0' }}>{zoneCoverage.nonMetro}%</p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Active Pincodes</span>
                            <span style={{ fontWeight: 700, color: '#111827' }}>18,450 pincodes</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="ec-tabs" style={{ marginBottom: 20 }}>
                {tabs.map(tab => (
                    <button key={tab} className={`ec-tab-btn ${activeTab === tab ? 'ec-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'Active Deliveries' && <BsTruck size={14} />}
                        {tab === 'Delivery Methods' && <BsBoxSeam size={14} />}
                        {tab === 'Zones & Charges' && <BsGeoAlt size={14} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* TAB 1: ACTIVE DELIVERIES DIRECTORY TABLE */}
            {activeTab === 'Active Deliveries' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* Search & Filter Controls Bar */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                                    <input
                                        type="text"
                                        className="ec-input"
                                        placeholder="Search by order ID, customer name, tracking code, city..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        style={{ paddingLeft: 34, width: '100%', height: 38 }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>Status:</span>
                                    <select
                                        className="ec-input"
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                                    >
                                        <option value="All">All Status</option>
                                        {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>Type:</span>
                                    <select
                                        className="ec-input"
                                        value={filterType}
                                        onChange={e => setFilterType(e.target.value)}
                                        style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                                    >
                                        <option value="All">All Types</option>
                                        <option value="Home Delivery">Home Delivery</option>
                                        <option value="Same Day Delivery">Same Day Delivery</option>
                                        <option value="Express Delivery">Express Delivery</option>
                                        <option value="Store Pickup">Store Pickup</option>
                                    </select>
                                </div>

                                {availablePartners.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>Partner:</span>
                                        <select
                                            className="ec-input"
                                            value={filterPartner}
                                            onChange={e => setFilterPartner(e.target.value)}
                                            style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                                        >
                                            <option value="All">All Partners</option>
                                            {availablePartners.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                )}

                                {availableCities.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>City:</span>
                                        <select
                                            className="ec-input"
                                            value={filterCity}
                                            onChange={e => setFilterCity(e.target.value)}
                                            style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                                        >
                                            <option value="All">All Cities</option>
                                            {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {hasActiveFilters && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                                <span style={{ fontSize: 11, color: '#374151', fontWeight: 700, background: '#f3f4f6', padding: '2px 8px', borderRadius: 12 }}>
                                    Showing {filteredDeliveries.length} of {totalCount} deliveries
                                </span>
                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>Active Filters:</span>
                                {search && (
                                    <span style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        Search: "{search}"
                                        <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                )}
                                {filterStatus !== 'All' && (
                                    <span style={{ fontSize: 11, background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        Status: {filterStatus}
                                        <button onClick={() => setFilterStatus('All')} style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                )}
                                {filterType !== 'All' && (
                                    <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        Type: {filterType}
                                        <button onClick={() => setFilterType('All')} style={{ border: 'none', background: 'transparent', color: '#d97706', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                )}
                                {filterPartner !== 'All' && (
                                    <span style={{ fontSize: 11, background: '#f0f9ff', color: '#0ea5e9', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        Partner: {filterPartner}
                                        <button onClick={() => setFilterPartner('All')} style={{ border: 'none', background: 'transparent', color: '#0ea5e9', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                )}
                                {filterCity !== 'All' && (
                                    <span style={{ fontSize: 11, background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        City: {filterCity}
                                        <button onClick={() => setFilterCity('All')} style={{ border: 'none', background: 'transparent', color: '#8b5cf6', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                    </span>
                                )}
                                <button onClick={handleClearFilters} style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }}>
                                    Clear All ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Directory Table with Horizontal Scrollbar */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 980 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 14px', width: 38 }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredDeliveries.length > 0 && selectedIds.length === filteredDeliveries.length}
                                            onChange={handleToggleSelectAll}
                                            style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                        />
                                    </th>
                                    <th style={{ padding: '12px 16px' }}>Delivery & Order ID</th>
                                    <th style={{ padding: '12px 16px' }}>Customer Info</th>
                                    <th style={{ padding: '12px 16px' }}>Delivery Type</th>
                                    <th style={{ padding: '12px 16px' }}>Logistics Partner</th>
                                    <th style={{ padding: '12px 16px' }}>AWB Tracking No.</th>
                                    <th style={{ padding: '12px 16px' }}>Estimated Date</th>
                                    <th style={{ padding: '12px 16px' }}>Status Action</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#6366f1', fontSize: 13, fontWeight: 600 }}>
                                            <BsArrowClockwise size={20} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                                            Fetching delivery records from server...
                                        </td>
                                    </tr>
                                ) : filteredDeliveries.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 }}>No Deliveries Found</p>
                                            <p style={{ fontSize: 12, marginTop: 4 }}>Try clearing search or adjusting active status filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDeliveries.map((d) => {
                                        const sc = statusConfig[d.status] || { color: '#6b7280', bg: '#f9fafb' };
                                        const isUpdating = updatingId === d.id;
                                        const isRowSelected = selectedIds.includes(d.id);

                                        return (
                                            <tr
                                                key={d.id}
                                                style={{ borderBottom: '1px solid #f3f4f6', background: isRowSelected ? '#f5f3ff' : 'transparent', transition: 'background 0.15s ease' }}
                                                className="table-row-hover"
                                            >
                                                <td style={{ padding: '14px 14px', width: 38 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isRowSelected}
                                                        onChange={() => handleToggleRow(d.id)}
                                                        style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                                    />
                                                </td>

                                                {/* Delivery & Order ID */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '2px 7px', borderRadius: 6, display: 'inline-block', width: 'max-content' }}>
                                                            {d.id}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                                            Order: <strong style={{ color: '#111827' }}>{d.order}</strong>
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Customer Info */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {d.customer?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 13 }}>{d.customer}</p>
                                                            <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0 0' }}>{d.city}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Delivery Type */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', fontWeight: 600 }}>
                                                        <span>{typeIcons[d.type] || '🚚'}</span> {d.type}
                                                    </span>
                                                </td>

                                                {/* Logistics Partner */}
                                                <td style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                                    {d.partner}
                                                </td>

                                                {/* Tracking Number */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                                        {d.tracking}
                                                    </span>
                                                </td>

                                                {/* Estimated Date */}
                                                <td style={{ padding: '14px 16px', fontSize: 12, color: '#4b5563', fontWeight: 500 }}>
                                                    {d.estimatedDate}
                                                </td>

                                                {/* Status Action Dropdown */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <select
                                                            disabled={isUpdating}
                                                            value={d.status}
                                                            onChange={e => handleStatusChange(d, e.target.value)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                borderRadius: 20,
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                background: sc.bg,
                                                                color: sc.color,
                                                                border: `1px solid ${sc.color}44`,
                                                                cursor: 'pointer',
                                                                outline: 'none',
                                                            }}
                                                        >
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <option key={opt} value={opt} style={{ background: '#fff', color: '#111827' }}>
                                                                    {opt}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {isUpdating && <span style={{ fontSize: 10, color: '#6366f1' }}>Updating...</span>}
                                                    </div>
                                                </td>

                                                {/* Row Actions */}
                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <button
                                                        type="button"
                                                        title="View Full Tracking Drawer"
                                                        onClick={() => setSelectedDelivery(d)}
                                                        style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6366f1', cursor: 'pointer' }}
                                                    >
                                                        <BsEye size={14} />
                                                    </button>
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

            {/* TAB 2: DELIVERY METHODS */}
            {activeTab === 'Delivery Methods' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {methods.map(m => (
                        <div key={m.id} className="ec-delivery-card" style={{ opacity: m.enabled ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                        {m.icon}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{m.type}</p>
                                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>via {m.partner}</p>
                                    </div>
                                </div>
                                <div onClick={() => toggleMethod(m.id)} style={{ cursor: 'pointer' }}>
                                    {m.enabled ? <BsToggleOn size={26} color="#6366f1" /> : <BsToggleOff size={26} color="#d1d5db" />}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                {[
                                    { label: 'Delivery Time', value: m.minDays === 0 && m.maxDays === 0 ? 'Same Day' : `${m.minDays}–${m.maxDays} days` },
                                    { label: 'Shipping Charge', value: m.charge === 0 ? 'Free' : fmt(m.charge) },
                                    { label: 'Free Above', value: m.freeAbove === 0 ? 'N/A' : fmt(m.freeAbove) },
                                    { label: 'Zones', value: m.zones.length > 1 ? `${m.zones.length} zones` : m.zones[0] },
                                ].map((f, i) => (
                                    <div key={i} style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                        <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>{f.label}</p>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '2px 0 0 0' }}>{f.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => openEditMethod(m)}>
                                    <BsPencilSquare size={12} /> Edit Config
                                </button>
                                <button
                                    onClick={() => setMethods(prev => prev.filter(x => x.id !== m.id))}
                                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <BsTrash size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 3: ZONES & PINCODE SERVICEABILITY */}
            {activeTab === 'Zones & Charges' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="ec-form-card-header"><BsGeoAlt size={16} color="#6366f1" /><h3>Regional Delivery Zone Tiers</h3></div>
                        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                            {[
                                { zone: 'Metro Cities', cities: 'Bangalore, Mumbai, Delhi, Chennai, Hyderabad, Kolkata', charge: 0, time: '2-3 days', eligible: ['Home', 'Express', 'Same Day'] },
                                { zone: 'Tier 2 Cities', cities: 'Pune, Jaipur, Ahmedabad, Lucknow, Indore, Bhopal', charge: 30, time: '3-5 days', eligible: ['Home', 'Express'] },
                                { zone: 'Tier 3 Cities', cities: 'All other pincode serviceable areas', charge: 60, time: '5-7 days', eligible: ['Home'] },
                                { zone: 'Remote Areas', cities: 'Rural / non-standard pincodes', charge: 100, time: '7-10 days', eligible: ['Home'] },
                            ].map((z, i) => (
                                <div key={i} style={{ padding: '14px 16px', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', alignItems: 'center', gap: 12 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{z.zone}</p>
                                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{z.cities}</p>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: z.charge === 0 ? '#10b981' : '#374151', margin: 0 }}>
                                        {z.charge === 0 ? 'Free' : `₹${z.charge} surcharge`}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{z.time}</p>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {z.eligible.map(e => (
                                            <span key={e} style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#eef2ff', color: '#6366f1' }}>{e}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="ec-form-card">
                        <div className="ec-form-card-header"><BsTruck size={16} color="#6366f1" /><h3>Connected Logistics Partners</h3></div>
                        {['Delhivery', 'Dunzo', 'Swiggy Genie', 'Shiprocket', 'DTDC'].map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{p}</p>
                                </div>
                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#10b981' }}>Active Integration</span>
                            </div>
                        ))}
                        <button className="adm-btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                            <BsPlus size={15} /> Connect Partner API
                        </button>
                    </div>

                    <div className="ec-form-card">
                        <div className="ec-form-card-header"><BsLightningChargeFill size={16} color="#f59e0b" /><h3>Pincode Serviceability Lookup</h3></div>
                        <div className="ec-field">
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Check Pincode Coverage</label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <input
                                    className="ec-input"
                                    placeholder="Enter 6-digit pincode (e.g. 560038)"
                                    style={{ flex: 1 }}
                                    value={checkPincode}
                                    onChange={e => setCheckPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                />
                                <button className="adm-btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handlePincodeCheck}>Check Pincode</button>
                            </div>
                        </div>

                        {pincodeResult && (
                            <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <BsCheckCircleFill size={14} color="#10b981" />
                                <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, margin: 0 }}>{pincodeResult.msg}</p>
                            </div>
                        )}

                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16, fontWeight: 600 }}>Bulk Pincode Coverage Import</p>
                        <button className="adm-btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={() => alert('Upload Pincode CSV file dialog coming soon!')}>
                            <BsDownload size={13} /> Upload Pincode CSV
                        </button>
                    </div>
                </div>
            )}

            {/* Slide-Over Delivery Detail Drawer */}
            {selectedDelivery && (
                <DeliveryDetailDrawer
                    delivery={selectedDelivery}
                    onClose={() => setSelectedDelivery(null)}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingId === selectedDelivery.id}
                />
            )}

            {/* Export Directory Modal */}
            {showExportModal && (
                <ExportDeliveryModal
                    onClose={() => setShowExportModal(false)}
                    deliveriesCount={filteredDeliveries.length}
                />
            )}

            {/* Edit / Add Delivery Method Modal */}
            {showMethodModal && (
                <div className="ec-modal-overlay" onClick={() => setShowMethodModal(false)}>
                    <div className="ec-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                {editMethod ? 'Edit Delivery Method' : 'Add New Delivery Method'}
                            </h3>
                            <button className="ec-modal-close" onClick={() => setShowMethodModal(false)}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                            <div className="ec-field">
                                <label style={{ fontSize: 12, fontWeight: 700 }}>Delivery Type Name</label>
                                <select className="ec-input" value={methodForm.type || ''} onChange={e => setMethodForm(f => ({ ...f, type: e.target.value }))}>
                                    <option value="">Select type...</option>
                                    <option>Home Delivery</option>
                                    <option>Same Day Delivery</option>
                                    <option>Express Delivery</option>
                                    <option>Store Pickup</option>
                                </select>
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 12, fontWeight: 700 }}>Courier Partner</label>
                                <input className="ec-input" value={methodForm.partner || ''} onChange={e => setMethodForm(f => ({ ...f, partner: e.target.value }))} />
                            </div>
                            <div className="ec-form-row" style={{ display: 'flex', gap: 10 }}>
                                <div className="ec-field" style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700 }}>Min Days</label>
                                    <input className="ec-input" type="number" min="0" value={methodForm.minDays || 0} onChange={e => setMethodForm(f => ({ ...f, minDays: Number(e.target.value) }))} />
                                </div>
                                <div className="ec-field" style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700 }}>Max Days</label>
                                    <input className="ec-input" type="number" min="0" value={methodForm.maxDays || 0} onChange={e => setMethodForm(f => ({ ...f, maxDays: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="ec-form-row" style={{ display: 'flex', gap: 10 }}>
                                <div className="ec-field" style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700 }}>Shipping Charge (₹)</label>
                                    <input className="ec-input" type="number" min="0" value={methodForm.charge || 0} onChange={e => setMethodForm(f => ({ ...f, charge: Number(e.target.value) }))} />
                                </div>
                                <div className="ec-field" style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700 }}>Free Delivery Above (₹)</label>
                                    <input className="ec-input" type="number" min="0" value={methodForm.freeAbove || 0} onChange={e => setMethodForm(f => ({ ...f, freeAbove: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowMethodModal(false)}>Cancel</button>
                                <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveMethod}>
                                    {editMethod ? 'Save Changes' : 'Add Method'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryManagement;
