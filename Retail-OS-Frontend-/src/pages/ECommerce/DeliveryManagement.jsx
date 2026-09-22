import React, { useState, useEffect, useMemo } from 'react';
import {
    BsSearch, BsDownload, BsPlus, BsEye, BsPencilSquare, BsTrash,
    BsTruck, BsBoxSeam, BsGeoAlt, BsCheckCircleFill, BsXCircleFill,
    BsClockFill, BsLightningChargeFill, BsToggleOn, BsToggleOff,
    BsArrowClockwise, BsCloudCheckFill, BsCloudSlashFill, BsCopy,
    BsFilter, BsStarFill, BsGraphUp, BsHouseDoor, BsShop, BsArrowRight,
    BsExclamationTriangle, BsPerson, BsPhone, BsEnvelope, BsTag,
} from 'react-icons/bs';
import { getDeliveries, updateDeliveryStatus, assignDeliveryRider, processReturnDelivery } from '../../services/deliveryService';

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
        items: item.items || [{ name: 'Order Items', qty: 1, price: item.total_amount || 999 }],
        riderName: item.rider_name || item.riderName || (item.partner === 'Swiggy Genie' ? 'Ramesh Kumar' : item.partner === 'Dunzo' ? 'Suresh Patil' : null),
        riderPhone: item.rider_phone || item.riderPhone || (item.rider_name || item.riderName || item.partner === 'Swiggy Genie' ? '+91 98989 12345' : null),
        vehicleNo: item.vehicle_no || item.vehicleNo || (item.rider_name || item.riderName || item.partner === 'Swiggy Genie' ? 'KA-01-EV-4820' : null),
        actionNotes: item.action_notes || item.actionNotes || null,
    };
};

const typeIcons = {
    'Home Delivery': '🏠',
    'Same Day Delivery': '⚡',
    'Express Delivery': '🚀',
    'Store Pickup': '🏪'
};

// BRD FR-11 & FR-J: Delivery Agent / Rider Assignment Modal Component
const AssignRiderModal = ({ delivery, onClose, onAssign }) => {
    const [riderName, setRiderName] = useState(delivery?.riderName || '');
    const [riderPhone, setRiderPhone] = useState(delivery?.riderPhone || '');
    const [vehicleNo, setVehicleNo] = useState(delivery?.vehicleNo || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!riderName.trim() || !riderPhone.trim()) {
            alert('Please provide Rider Name and Phone Number');
            return;
        }

        setSubmitting(true);
        try {
            await assignDeliveryRider(delivery.rawId || delivery.id, {
                rider_name: riderName.trim(),
                rider_phone: riderPhone.trim(),
                vehicle_number: vehicleNo.trim() || 'N/A'
            });

            onAssign(delivery.id, {
                riderName: riderName.trim(),
                riderPhone: riderPhone.trim(),
                vehicleNo: vehicleNo.trim() || 'N/A',
                status: delivery.status === 'Confirmed' || delivery.status === 'Packed' ? 'Out for Delivery' : delivery.status
            });
            alert(`Assigned delivery executive ${riderName} to shipment ${delivery.id}!`);
            onClose();
        } catch (err) {
            alert('Failed to assign rider: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Assign Delivery Executive</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shipment: {delivery?.id} ({delivery?.order})</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Delivery Rider / Executive Name *</label>
                        <input className="ec-input" placeholder="e.g. Ramesh Kumar" value={riderName} onChange={e => setRiderName(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Rider Phone Number *</label>
                        <input className="ec-input" placeholder="e.g. +91 98989 12345" value={riderPhone} onChange={e => setRiderPhone(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Vehicle / Registration No.</label>
                        <input className="ec-input" placeholder="e.g. KA-01-EV-4820" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                            {submitting ? 'Assigning...' : 'Assign Rider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// BRD FR-16 & FR-J: Return & Failed Shipment Action Modal Component
const FailedActionModal = ({ delivery, onClose, onActionComplete }) => {
    const [actionType, setActionType] = useState('reschedule');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await processReturnDelivery(delivery.rawId || delivery.id, {
                action: actionType,
                notes: notes.trim()
            });

            const newStatus = actionType === 'rto' ? 'Failed' : actionType === 'reschedule' ? 'Confirmed' : 'Shipped';
            onActionComplete(delivery.id, newStatus, notes.trim());
            alert(`Updated failed shipment ${delivery.id}: ${actionType.toUpperCase()}`);
            onClose();
        } catch (err) {
            alert('Failed to process return action: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Failed / Return Shipment Action</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shipment: {delivery?.id} ({delivery?.customer})</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Resolution Action *</label>
                        <select className="ec-input" value={actionType} onChange={e => setActionType(e.target.value)}>
                            <option value="reschedule">Reschedule Delivery Attempt</option>
                            <option value="update_address">Update Recipient Address</option>
                            <option value="rto">Mark Return to Origin (RTO)</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Action Notes & Reason</label>
                        <textarea className="ec-input" rows={3} placeholder="Customer requested delivery tomorrow afternoon / Address updated..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                            {submitting ? 'Updating...' : 'Submit Resolution'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Printable Shipping Label Modal Component
const ShippingLabelModal = ({ delivery, onClose }) => {
    if (!delivery) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=650,height=750');
        if (!printWindow) {
            window.print();
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Shipping Label - ${delivery.id}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; background: #fff; }
                        .label-card { border: 2px dashed #111827; padding: 20px; border-radius: 12px; max-width: 520px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
                        .barcode { text-align: center; background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
                        .barcode-bars { height: 44px; margin: 10px auto; width: 85%; background: repeating-linear-gradient(90deg, #111827 0, #111827 3px, transparent 3px, transparent 6px, #111827 6px, #111827 8px, transparent 8px, transparent 12px); border-radius: 2px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
                        .box { background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #f3f4f6; font-size: 11px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
                        th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
                        th { background: #f9fafb; font-weight: bold; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="label-card">
                        <div class="header">
                            <div>
                                <div style="font-size: 10px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em;">RETAIL OS LOGISTICS</div>
                                <h2 style="margin: 2px 0 0 0; font-size: 18px; font-weight: 900;">PRIORITY SHIPPING LABEL</h2>
                            </div>
                            <div style="text-align: right;">
                                <span style="background: #111827; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800;">${delivery.partner}</span>
                                <div style="font-size: 11px; font-weight: 700; color: #6b7280; margin-top: 4px;">${delivery.type}</div>
                            </div>
                        </div>
                        <div class="barcode">
                            <div style="font-size: 10px; font-weight: 700; color: #6b7280; letter-spacing: 0.05em;">AWB TRACKING BARCODE</div>
                            <div class="barcode-bars"></div>
                            <div style="font-family: monospace; font-size: 15px; font-weight: 800; letter-spacing: 0.15em;">${delivery.tracking}</div>
                        </div>
                        <div class="grid">
                            <div class="box">
                                <span style="font-weight: 800; color: #9ca3af; font-size: 10px;">SHIP FROM (SENDER):</span>
                                <div style="font-weight: 800; color: #111827; margin-top: 4px; font-size: 12px;">Retail OS Hub</div>
                                <div>Plot 42, Central Retail Zone</div>
                                <div>Bangalore, KA - 560001</div>
                                <div style="color: #6366f1; font-weight: 700; margin-top: 4px;">Ph: +91 80 4000 8800</div>
                            </div>
                            <div class="box" style="background: #eef2ff; border-color: #c7d2fe;">
                                <span style="font-weight: 800; color: #4338ca; font-size: 10px;">SHIP TO (RECIPIENT):</span>
                                <div style="font-weight: 800; color: #111827; margin-top: 4px; font-size: 13px;">${delivery.customer}</div>
                                <div style="font-weight: 600;">${delivery.address}</div>
                                <div style="font-weight: 700;">City: ${delivery.city}</div>
                                <div style="color: #4338ca; font-weight: 800; margin-top: 4px;">Ph: ${delivery.phone}</div>
                            </div>
                        </div>
                        <div style="font-size: 11px; font-weight: 800; color: #374151; margin-bottom: 6px;">ORDER DETAILS (${delivery.order}) — ID: ${delivery.id}</div>
                        <table>
                            <thead>
                                <tr><th>Item Description</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Price</th></tr>
                            </thead>
                            <tbody>
                                ${delivery.items.map(i => `<tr><td style="font-weight: 600;">${i.name}</td><td style="text-align: center; font-weight: bold;">${i.qty}</td><td style="text-align: right; font-weight: bold; color: #10b981;">₹${(i.price * i.qty).toLocaleString('en-IN')}</td></tr>`).join('')}
                            </tbody>
                        </table>
                        ${delivery.riderName ? `<div style="margin-top: 12px; font-size: 11px; background: #f3f4f6; padding: 8px 12px; border-radius: 6px;">Assigned Rider: <strong>${delivery.riderName}</strong> (${delivery.riderPhone}) ${delivery.vehicleNo ? `• Vehicle: ${delivery.vehicleNo}` : ''}</div>` : ''}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
            <div
                className="ec-modal"
                style={{
                    maxWidth: 500,
                    padding: 24,
                    borderRadius: 16,
                    background: '#ffffff',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    border: '2px dashed #6366f1'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header / Brand */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #111827', paddingBottom: 12, marginBottom: 16 }}>
                    <div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RETAIL OS LOGISTICS</span>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: '2px 0 0 0' }}>PRIORITY SHIPPING LABEL</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, background: '#111827', color: '#ffffff', padding: '4px 10px', borderRadius: 6 }}>
                            {delivery.partner}
                        </span>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', margin: '4px 0 0 0' }}>{delivery.type}</p>
                    </div>
                </div>

                {/* Barcode & AWB Display */}
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>AWB TRACKING BARCODE</p>
                    
                    {/* Visual Barcode Pattern */}
                    <div style={{ margin: '10px auto', height: 44, width: '85%', background: 'repeating-linear-gradient(90deg, #111827 0, #111827 3px, transparent 3px, transparent 6px, #111827 6px, #111827 8px, transparent 8px, transparent 12px)', borderRadius: 2 }}></div>
                    
                    <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '0.15em', margin: 0 }}>
                        {delivery.tracking}
                    </p>
                </div>

                {/* Sender & Recipient Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
                    {/* FROM */}
                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>SHIP FROM (SENDER):</span>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', margin: '4px 0 0 0' }}>Retail OS Hub</p>
                        <p style={{ fontSize: 11, color: '#4b5563', margin: '2px 0 0 0' }}>Plot 42, Central Retail Zone</p>
                        <p style={{ fontSize: 11, color: '#4b5563', margin: '2px 0 0 0' }}>Bangalore, KA - 560001</p>
                        <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, margin: '4px 0 0 0' }}>Ph: +91 80 4000 8800</p>
                    </div>

                    {/* TO */}
                    <div style={{ background: '#eef2ff', padding: 12, borderRadius: 8, border: '1px solid #c7d2fe' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>SHIP TO (RECIPIENT):</span>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: '4px 0 0 0' }}>{delivery.customer}</p>
                        <p style={{ fontSize: 11, color: '#374151', margin: '2px 0 0 0', fontWeight: 600 }}>{delivery.address}</p>
                        <p style={{ fontSize: 11, color: '#374151', margin: '2px 0 0 0', fontWeight: 700 }}>City: {delivery.city}</p>
                        <p style={{ fontSize: 11, color: '#4338ca', fontWeight: 800, margin: '4px 0 0 0' }}>Ph: {delivery.phone}</p>
                    </div>
                </div>

                {/* Package Details & Items Table */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>ORDER DETAILS ({delivery.order})</span>
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>ID: {delivery.id}</span>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 700 }}>
                                    <th style={{ padding: '6px 10px' }}>Item Description</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Qty</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {delivery.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx < delivery.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#111827' }}>{item.name}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt(item.price * item.qty)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Assigned Rider Info */}
                {delivery.riderName && (
                    <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#374151', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Assigned Rider: <strong>{delivery.riderName}</strong> ({delivery.riderPhone})</span>
                        {delivery.vehicleNo && <span>Vehicle: <strong>{delivery.vehicleNo}</strong></span>}
                    </div>
                )}

                {/* Actions Footer */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6 }} onClick={handlePrint}>
                        🖨️ Print Label Now
                    </button>
                </div>
            </div>
        </div>
    );
};

// Delivery Detail Drawer / Panel Component
const DeliveryDetailDrawer = ({ delivery, onClose, onStatusChange, isUpdating, onOpenAssignRider, onOpenFailedAction, onPrintShippingLabel }) => {
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

                    {/* BRD FR-11 & FR-J: Delivery Agent / Rider Assignment Block */}
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                🏍️ Assigned Delivery Executive
                            </h4>
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => onOpenAssignRider(delivery)}
                                style={{ fontSize: 11, padding: '4px 10px' }}
                            >
                                {delivery.riderName ? 'Change Rider' : '+ Assign Rider'}
                            </button>
                        </div>
                        {delivery.riderName ? (
                            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 14px' }}>
                                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>{delivery.riderName}</p>
                                <p style={{ fontSize: 12, color: '#4338ca', margin: '2px 0 0 0', fontWeight: 600 }}>
                                    📞 {delivery.riderPhone} {delivery.vehicleNo ? `• Vehicle: ${delivery.vehicleNo}` : ''}
                                </p>
                            </div>
                        ) : (
                            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
                                No delivery executive assigned yet. Click "+ Assign Rider" to assign a rider.
                            </p>
                        )}
                    </div>

                    {/* BRD FR-16 & FR-12: Store Pickup & Failed Delivery Actions */}
                    {(delivery.type === 'Store Pickup' || delivery.status === 'Failed' || delivery.actionNotes) && (
                        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Special Actions & Resolution</h4>
                            {delivery.type === 'Store Pickup' && delivery.status !== 'Delivered' && (
                                <button
                                    type="button"
                                    className="adm-btn-primary"
                                    onClick={() => onStatusChange(delivery, 'Delivered')}
                                    style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginBottom: 8 }}
                                >
                                    <BsCheckCircleFill size={13} /> Confirm In-Store Pickup Handover
                                </button>
                            )}
                            {(delivery.status === 'Failed' || delivery.actionNotes) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {delivery.actionNotes && (
                                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b' }}>
                                            <strong>Resolution Note:</strong> {delivery.actionNotes}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="adm-btn-secondary"
                                        onClick={() => onOpenFailedAction(delivery)}
                                        style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                                    >
                                        <BsExclamationTriangle size={13} style={{ color: '#ef4444' }} /> Process Return / Failed Resolution Action
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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
                    <button onClick={() => onPrintShippingLabel(delivery)} className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
                        🖨️ Print Shipping Label
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

    // BRD Modal States
    const [assignRiderTarget, setAssignRiderTarget] = useState(null);
    const [failedActionTarget, setFailedActionTarget] = useState(null);
    const [printLabelTarget, setPrintLabelTarget] = useState(null);

    const tabs = ['Active Deliveries', 'Delivery Methods'];

    const fetchDeliveriesFromApi = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const data = await getDeliveries();
            const rawList = extractDeliveryList(data);
            const formatted = rawList.map(mapBackendDeliveryToFrontend);

            if (formatted.length > 0) {
                setDeliveries(formatted);
                setApiConnected(true);
            } else {
                setDeliveries(DEMO_DELIVERIES);
                setApiConnected(true);
            }
        } catch (err) {
            console.warn('Backend Delivery API call fallback:', err.message);
            setApiConnected(false);
            setDeliveries(DEMO_DELIVERIES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveriesFromApi();
    }, []);

    const handleRiderAssigned = (id, riderInfo) => {
        setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...riderInfo } : d));
        if (selectedDelivery && selectedDelivery.id === id) {
            setSelectedDelivery(prev => ({ ...prev, ...riderInfo }));
        }
    };

    const handleFailedActionComplete = (id, newStatus, notes) => {
        setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: newStatus, actionNotes: notes } : d));
        if (selectedDelivery && selectedDelivery.id === id) {
            setSelectedDelivery(prev => ({ ...prev, status: newStatus, actionNotes: notes }));
        }
    };

    const handleStatusChange = async (deliveryRecord, newStatus) => {
        const targetId = deliveryRecord.rawId || deliveryRecord.id;
        setUpdatingId(deliveryRecord.id);

        // Optimistic UI Update
        setDeliveries(prev => prev.map(d => d.id === deliveryRecord.id ? { ...d, status: newStatus } : d));
        if (selectedDelivery && selectedDelivery.id === deliveryRecord.id) {
            setSelectedDelivery(prev => ({ ...prev, status: newStatus }));
        }

        try {
            await updateDeliveryStatus(targetId, newStatus);
        } catch (err) {
            console.warn('Status update API call fallback:', err.message);
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
        let minDays = Math.max(0, Number(methodForm.minDays || 0));
        let maxDays = Math.max(0, Number(methodForm.maxDays || 0));

        // Ensure minDays <= maxDays (prevent invalid range like 5-2 days)
        if (minDays > maxDays) {
            const temp = minDays;
            minDays = maxDays;
            maxDays = temp;
        }

        const normalizedForm = { ...methodForm, minDays, maxDays };

        if (editMethod) {
            setMethods(prev => prev.map(m => m.id === editMethod.id ? { ...normalizedForm, id: m.id } : m));
        } else {
            setMethods(prev => [...prev, { ...normalizedForm, id: Date.now(), icon: '🚚' }]);
        }
        setShowMethodModal(false);
    };

    const toggleMethod = (id) => {
        setMethods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
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
                    <button className="adm-btn-secondary" onClick={fetchDeliveriesFromApi} disabled={loading}>
                        <BsArrowClockwise size={14} className={loading ? 'spin' : ''} />
                        {loading ? ' Refreshing...' : ' Refresh'}
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
                                    <th style={{ padding: '12px 16px' }}>Assigned Rider</th>
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
                                        <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#6366f1', fontSize: 13, fontWeight: 600 }}>
                                            <BsArrowClockwise size={20} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                                            Fetching delivery records from server...
                                        </td>
                                    </tr>
                                ) : filteredDeliveries.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
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

                                                {/* Assigned Rider Column */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    {d.riderName ? (
                                                        <span
                                                            onClick={() => setAssignRiderTarget(d)}
                                                            style={{ fontSize: 11, background: '#eef2ff', color: '#4338ca', padding: '3px 9px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                            title="Click to change assigned rider"
                                                        >
                                                            🏍️ {d.riderName}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setAssignRiderTarget(d)}
                                                            style={{ fontSize: 11, background: '#fff', color: '#6366f1', border: '1px dashed #6366f1', padding: '3px 9px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            + Assign Rider
                                                        </button>
                                                    )}
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
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                        {d.status === 'Failed' && (
                                                            <button
                                                                type="button"
                                                                title="Process Failed Action"
                                                                onClick={() => setFailedActionTarget(d)}
                                                                style={{ padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                                                            >
                                                                <BsExclamationTriangle size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            title="View Full Tracking Drawer"
                                                            onClick={() => setSelectedDelivery(d)}
                                                            style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6366f1', cursor: 'pointer' }}
                                                        >
                                                            <BsEye size={14} />
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
                                     { 
                                         label: 'Delivery Time', 
                                         value: (() => {
                                             const min = Math.min(m.minDays ?? 0, m.maxDays ?? 0);
                                             const max = Math.max(m.minDays ?? 0, m.maxDays ?? 0);
                                             if (min === 0 && max === 0) return 'Same Day';
                                             if (min === max) return `${min} day${min === 1 ? '' : 's'}`;
                                             return `${min}–${max} days`;
                                         })() 
                                     },
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



            {/* Slide-Over Delivery Detail Drawer */}
            {selectedDelivery && (
                <DeliveryDetailDrawer
                    delivery={selectedDelivery}
                    onClose={() => setSelectedDelivery(null)}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingId === selectedDelivery.id}
                    onOpenAssignRider={(d) => setAssignRiderTarget(d)}
                    onOpenFailedAction={(d) => setFailedActionTarget(d)}
                    onPrintShippingLabel={(d) => setPrintLabelTarget(d)}
                />
            )}

            {/* Printable Shipping Label Modal */}
            {printLabelTarget && (
                <ShippingLabelModal
                    delivery={printLabelTarget}
                    onClose={() => setPrintLabelTarget(null)}
                />
            )}

            {/* BRD FR-11: Assign Delivery Executive / Rider Modal */}
            {assignRiderTarget && (
                <AssignRiderModal
                    delivery={assignRiderTarget}
                    onClose={() => setAssignRiderTarget(null)}
                    onAssign={handleRiderAssigned}
                />
            )}

            {/* BRD FR-16: Failed Shipment & Return Resolution Modal */}
            {failedActionTarget && (
                <FailedActionModal
                    delivery={failedActionTarget}
                    onClose={() => setFailedActionTarget(null)}
                    onActionComplete={handleFailedActionComplete}
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
