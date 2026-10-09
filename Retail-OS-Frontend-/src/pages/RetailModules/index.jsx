import React, { useState } from 'react';
import {
    BsSearch, BsPlus, BsDownload, BsFilter, BsCheckCircleFill, BsClockHistory,
    BsXCircleFill, BsPrinter, BsUpcScan, BsBuildings, BsTruck, BsArrowRepeat,
    BsArrowLeftRight, BsAwardFill, BsShieldLock, BsMegaphone, BsChatDots,
    BsStars, BsPlug, BsDisplay, BsCashStack, BsArrowReturnLeft, BsReceiptCutoff,
    BsCreditCard2Front, BsBoxSeam, BsSend, BsGear, BsTag, BsExclamationTriangle
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
export const ReturnsRefundsPage = () => {
    const [search, setSearch] = useState('');
    const returnsData = [
        { id: 'RET-8901', inv: 'INV-2026-094', customer: 'Rahul Sharma', items: 2, amount: '₹1,450.00', type: 'Instant UPI', status: 'Completed', date: 'Today, 11:20 AM' },
        { id: 'RET-8902', inv: 'INV-2026-081', customer: 'Pooja Verma', items: 1, amount: '₹890.00', type: 'Credit Note', status: 'Completed', date: 'Yesterday' },
        { id: 'RET-8903', inv: 'INV-2026-077', customer: 'Kiran Deep', items: 3, amount: '₹3,200.00', type: 'Cash Refund', status: 'Pending Approval', date: '03 Oct 2026' },
        { id: 'RET-8904', inv: 'INV-2026-064', customer: 'Amitabh S.', items: 1, amount: '₹550.00', type: 'Original Card', status: 'Processing', date: '02 Oct 2026' },
    ];

    return (
        <ModuleContainer
            title="Returns & Refunds"
            subtitle="Manage customer counter returns, invoice item reversals, and refund settlements"
            icon={<BsArrowReturnLeft />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> New Return Request
                </button>
            }
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Today Returns" value="₹2,340.00" sub="3 Transactions" />
                <StatCard label="Pending Approval" value="1 Request" sub="Requires manager PIN" color="#f59e0b" />
                <StatCard label="Credit Notes Issued" value="₹890.00" sub="Valid for 90 days" color="#10b981" />
                <StatCard label="Return Rate" value="1.8%" sub="Within healthy limit (<3%)" color="#6366f1" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: 280 }}>
                        <BsSearch style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search by Return #, Invoice #..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                        />
                    </div>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Showing {returnsData.length} records</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 18px' }}>Return ID</th>
                            <th style={{ padding: '12px 18px' }}>Invoice</th>
                            <th style={{ padding: '12px 18px' }}>Customer</th>
                            <th style={{ padding: '12px 18px' }}>Items</th>
                            <th style={{ padding: '12px 18px' }}>Refund Amount</th>
                            <th style={{ padding: '12px 18px' }}>Refund Method</th>
                            <th style={{ padding: '12px 18px' }}>Status</th>
                            <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {returnsData.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#6366f1' }}>{row.id}</td>
                                <td style={{ padding: '14px 18px', color: '#374151' }}>{row.inv}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 500 }}>{row.customer}</td>
                                <td style={{ padding: '14px 18px' }}>{row.items} pcs</td>
                                <td style={{ padding: '14px 18px', fontWeight: 700 }}>{row.amount}</td>
                                <td style={{ padding: '14px 18px' }}><span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>{row.type}</span></td>
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                                        background: row.status === 'Completed' ? '#ecfdf5' : '#fffbeb',
                                        color: row.status === 'Completed' ? '#059669' : '#d97706'
                                    }}>
                                        {row.status}
                                    </span>
                                </td>
                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                    <button style={{ background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                                        Receipt
                                    </button>
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
   2. BILLING & GST: Credit Notes
───────────────────────────────────────────────────────────── */
export const CreditNotesPage = () => {
    return (
        <ModuleContainer
            title="Credit Notes"
            subtitle="Issue, track and redeem customer credit balances and GST credit notes"
            icon={<BsReceiptCutoff />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> Generate Credit Note
                </button>
            }
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Total Active Credit" value="₹14,820.00" sub="Available for redemption" color="#10b981" />
                <StatCard label="Issued This Month" value="18 Notes" sub="₹21,450.00 Total" />
                <StatCard label="Redeemed (30d)" value="₹12,600.00" sub="92% utilization rate" color="#6366f1" />
                <StatCard label="Expiring Soon" value="2 Notes" sub="Within next 7 days" color="#ef4444" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 18px' }}>CN Number</th>
                            <th style={{ padding: '12px 18px' }}>Customer Name</th>
                            <th style={{ padding: '12px 18px' }}>Original Invoice</th>
                            <th style={{ padding: '12px 18px' }}>Initial Value</th>
                            <th style={{ padding: '12px 18px' }}>Remaining Balance</th>
                            <th style={{ padding: '12px 18px' }}>Expiry Date</th>
                            <th style={{ padding: '12px 18px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { id: 'CN-2026-0041', name: 'Vikram Joshi', inv: 'INV-2026-081', init: '₹2,500.00', rem: '₹1,200.00', exp: '31 Dec 2026', status: 'Partially Used' },
                            { id: 'CN-2026-0040', name: 'Sneha Patel', inv: 'INV-2026-065', init: '₹1,850.00', rem: '₹1,850.00', exp: '24 Nov 2026', status: 'Active' },
                            { id: 'CN-2026-0039', name: 'Rohan Mehra', inv: 'INV-2026-052', init: '₹4,100.00', rem: '₹0.00', exp: '15 Oct 2026', status: 'Fully Redeemed' },
                        ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#6366f1' }}>{row.id}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 600 }}>{row.name}</td>
                                <td style={{ padding: '14px 18px', color: '#6b7280' }}>{row.inv}</td>
                                <td style={{ padding: '14px 18px' }}>{row.init}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: row.rem === '₹0.00' ? '#9ca3af' : '#10b981' }}>{row.rem}</td>
                                <td style={{ padding: '14px 18px', color: '#6b7280' }}>{row.exp}</td>
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                                        background: row.status === 'Active' ? '#ecfdf5' : row.status === 'Partially Used' ? '#eff6ff' : '#f3f4f6',
                                        color: row.status === 'Active' ? '#059669' : row.status === 'Partially Used' ? '#2563eb' : '#6b7280'
                                    }}>
                                        {row.status}
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
   3. BILLING & GST: Payments
───────────────────────────────────────────────────────────── */
export const BillingPaymentsPage = () => {
    return (
        <ModuleContainer
            title="Payments & Settlements"
            subtitle="Real-time register of POS collections, UPI QR settlements, Cards, and cash drawer reconciliations"
            icon={<BsCreditCard2Front />}
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Today's Collections" value="₹84,290.00" sub="142 Transactions" color="#10b981" />
                <StatCard label="UPI / Dynamic QR" value="₹54,120.00" sub="64% of total volume" color="#6366f1" />
                <StatCard label="Card POS (Pine Labs)" value="₹18,450.00" sub="Settled automatically" color="#0ea5e9" />
                <StatCard label="Cash In Drawer" value="₹11,720.00" sub="Float: ₹5,000.00" color="#f59e0b" />
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
                        {[
                            { ref: 'TXN-904123', inv: 'INV-2026-094', method: 'UPI QR', term: 'Razorpay POS', amt: '₹1,450.00', time: '11:42 AM', status: 'Success' },
                            { ref: 'TXN-904122', inv: 'INV-2026-093', method: 'Credit Card', term: 'PineLabs EDC #01', amt: '₹4,890.00', time: '11:28 AM', status: 'Success' },
                            { ref: 'TXN-904121', inv: 'INV-2026-092', method: 'Cash', term: 'Counter Drawer 1', amt: '₹620.00', time: '11:15 AM', status: 'Success' },
                            { ref: 'TXN-904120', inv: 'INV-2026-091', method: 'UPI QR', term: 'PhonePe Merchant', amt: '₹2,340.00', time: '10:52 AM', status: 'Success' },
                        ].map((tx, i) => (
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
                        ))}
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
export const WarehousesPage = () => {
    return (
        <ModuleContainer
            title="Warehouses & Stock Locations"
            subtitle="Central depots, store stockrooms, transit hubs and multi-location inventory levels"
            icon={<BsBuildings />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> Add Warehouse
                </button>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {[
                    { name: 'Central Depot - North Zone', code: 'WH-CENTRAL-01', location: 'Industrial Area Phase 2, Delhi', items: '14,850 SKUs', value: '₹42,80,000', manager: 'Rajesh Nair', status: 'Operational' },
                    { name: 'Main Retail Outlet Stockroom', code: 'WH-STORE-MAIN', location: 'Mall Road, Connaught Place', items: '3,420 SKUs', value: '₹14,50,000', manager: 'Sanjay Rawat', status: 'Operational' },
                    { name: 'West Zone Hub & Fulfillment', code: 'WH-WEST-02', location: 'Bhiwandi Logistic Park, Mumbai', items: '9,200 SKUs', value: '₹28,10,000', manager: 'Anil Desai', status: 'Operational' },
                ].map((wh, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>{wh.code}</span>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '6px 0 2px 0' }}>{wh.name}</h3>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{wh.location}</p>
                            </div>
                            <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10 }}>{wh.status}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Stored SKUs</span>
                                <strong style={{ fontSize: 14, color: '#111827' }}>{wh.items}</strong>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Inventory Value</span>
                                <strong style={{ fontSize: 14, color: '#10b981' }}>{wh.value}</strong>
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                                <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Warehouse Manager</span>
                                <span style={{ fontSize: 12.5, color: '#374151', fontWeight: 600 }}>{wh.manager}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ModuleContainer>
    );
};

/* ─────────────────────────────────────────────────────────────
   6. INVENTORY: GRN (Goods Received Note)
───────────────────────────────────────────────────────────── */
export const GRNPage = () => {
    return (
        <ModuleContainer
            title="Goods Received Notes (GRN)"
            subtitle="Inspect, inward physical shipments against purchase orders, and verify batch/expiry dates"
            icon={<BsTruck />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> Create Inward GRN
                </button>
            }
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Pending Inward Inspection" value="3 Shipments" sub="At unloading dock" color="#f59e0b" />
                <StatCard label="Inwarded This Month" value="48 GRNs" sub="₹34,50,000.00 Received" color="#10b981" />
                <StatCard label="Discrepancy Rate" value="0.4%" sub="Damages/Shortage flagged" color="#6366f1" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 18px' }}>GRN #</th>
                            <th style={{ padding: '12px 18px' }}>PO Reference</th>
                            <th style={{ padding: '12px 18px' }}>Vendor / Supplier</th>
                            <th style={{ padding: '12px 18px' }}>Receiving WH</th>
                            <th style={{ padding: '12px 18px' }}>Qty (Recv / Ord)</th>
                            <th style={{ padding: '12px 18px' }}>Status</th>
                            <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { grn: 'GRN-2026-104', po: 'PO-9821', vendor: 'Reliance Retail Ltd', wh: 'Central Depot', qty: '450 / 450 pcs', status: 'Accepted & Verified' },
                            { grn: 'GRN-2026-103', po: 'PO-9818', vendor: 'Apex Fashion Apparels', wh: 'Main Outlet', qty: '120 / 125 pcs', status: 'Partial / Discrepancy' },
                            { grn: 'GRN-2026-102', po: 'PO-9805', vendor: 'Nestle Distribution India', wh: 'Central Depot', qty: '800 / 800 pcs', status: 'Accepted & Verified' },
                        ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#6366f1' }}>{row.grn}</td>
                                <td style={{ padding: '14px 18px', color: '#374151' }}>{row.po}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 600 }}>{row.vendor}</td>
                                <td style={{ padding: '14px 18px' }}>{row.wh}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 600 }}>{row.qty}</td>
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                                        background: row.status.includes('Accepted') ? '#ecfdf5' : '#fffbeb',
                                        color: row.status.includes('Accepted') ? '#059669' : '#d97706'
                                    }}>
                                        {row.status}
                                    </span>
                                </td>
                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                    <button style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                        View Note
                                    </button>
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
   7. INVENTORY: Purchase Returns
───────────────────────────────────────────────────────────── */
export const PurchaseReturnsPage = () => {
    return (
        <ModuleContainer
            title="Purchase Returns & Debit Notes"
            subtitle="Manage supplier returns for damaged, expired or non-compliant stock items"
            icon={<BsArrowReturnLeft />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> New Vendor Return
                </button>
            }
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="Debit Notes Issued" value="₹42,500.00" sub="Recoverable from vendors" color="#ef4444" />
                <StatCard label="Pending Dispatch" value="2 Shipments" sub="Packed in warehouse" color="#f59e0b" />
                <StatCard label="Vendor Credit Settled" value="₹1,28,000.00" sub="Adjusted in PO billing" color="#10b981" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 16px' }}>Return Ref #</th>
                            <th style={{ padding: '12px 16px' }}>Supplier</th>
                            <th style={{ padding: '12px 16px' }}>Original PO</th>
                            <th style={{ padding: '12px 16px' }}>Return Reason</th>
                            <th style={{ padding: '12px 16px' }}>Debit Amount</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { ref: 'PR-2026-019', sup: 'Apex Fashion Apparels', po: 'PO-9818', reason: 'Stitching Defect (5 pcs)', amt: '₹4,500.00', status: 'Dispatched to Vendor' },
                            { ref: 'PR-2026-018', sup: 'Global Electronics Hub', po: 'PO-9790', reason: 'Short Expiry / Damaged Box', amt: '₹18,200.00', status: 'Credit Note Received' },
                        ].map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6366f1' }}>{r.ref}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.sup}</td>
                                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{r.po}</td>
                                <td style={{ padding: '12px 16px' }}>{r.reason}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 800 }}>{r.amt}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ padding: '3px 8px', borderRadius: 10, background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: 11 }}>
                                        {r.status}
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
   8. INVENTORY: Store Transfers
───────────────────────────────────────────────────────────── */
export const StoreTransfersPage = () => {
    return (
        <ModuleContainer
            title="Inter-Store Stock Transfers"
            subtitle="Transfer products between retail outlets, generate gate passes and track in-transit stock"
            icon={<BsArrowLeftRight />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> Request Stock Transfer
                </button>
            }
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatCard label="In Transit" value="3 Transfers" sub="Estimated delivery today" color="#0ea5e9" />
                <StatCard label="Pending Approval" value="1 Request" sub="CP Outlet -> West Depot" color="#f59e0b" />
                <StatCard label="Completed Transfers" value="128 Transfers" sub="99.8% reconciliation" color="#10b981" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: '12px 16px' }}>Transfer ID</th>
                            <th style={{ padding: '12px 16px' }}>From Location</th>
                            <th style={{ padding: '12px 16px' }}>To Location</th>
                            <th style={{ padding: '12px 16px' }}>Total Items</th>
                            <th style={{ padding: '12px 16px' }}>Vehicle / Memo</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { id: 'TRF-8812', from: 'Central Depot - North Zone', to: 'Main Retail Outlet', items: '120 units', memo: 'VAN-DL-4C-8921', status: 'In Transit' },
                            { id: 'TRF-8811', from: 'West Zone Hub', to: 'Main Retail Outlet', items: '45 units', memo: 'BLUEDART-8912', status: 'Received & Stored' },
                        ].map((tr, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6366f1' }}>{tr.id}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{tr.from}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10b981' }}>{tr.to}</td>
                                <td style={{ padding: '12px 16px' }}>{tr.items}</td>
                                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{tr.memo}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                        background: tr.status === 'In Transit' ? '#eff6ff' : '#ecfdf5',
                                        color: tr.status === 'In Transit' ? '#2563eb' : '#059669'
                                    }}>
                                        {tr.status}
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
    return (
        <ModuleContainer
            title="Roles & Access Permissions"
            subtitle="Role-based access control matrix (RBAC) for Cashiers, Store Managers, Accountants, and Admins"
            icon={<BsShieldLock />}
            actionBtn={
                <button style={{
                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <BsPlus size={18} /> Create New Role
                </button>
            }
        >
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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
                        {[
                            { role: 'Super Admin', users: 2, pos: 'Full', disc: 'Unlimited', inv: 'Full Control', tax: 'Full Control' },
                            { role: 'Store Manager', users: 4, pos: 'Full', disc: 'Up to 25%', inv: 'Transfers & Inward', tax: 'View Only' },
                            { role: 'Cashier / POS Operator', users: 8, pos: 'Create Invoices', disc: 'Requires Manager PIN', inv: 'No Access', tax: 'No Access' },
                            { role: 'Inventory Clerk', users: 3, pos: 'No Access', disc: 'No Access', inv: 'Stock Inward & GRN', tax: 'No Access' },
                        ].map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827' }}>{r.role}</td>
                                <td style={{ padding: '14px 18px' }}>
                                    <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{r.users} Staff</span>
                                </td>
                                <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 600 }}>{r.pos}</td>
                                <td style={{ padding: '14px 18px' }}>{r.disc}</td>
                                <td style={{ padding: '14px 18px' }}>{r.inv}</td>
                                <td style={{ padding: '14px 18px' }}>{r.tax}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
