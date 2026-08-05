import React, { useState, useEffect, useMemo } from 'react';
import {
    BsSearch, BsDownload, BsEye, BsChevronLeft, BsChevronRight,
    BsCheckCircleFill, BsXCircleFill, BsBagCheck,
    BsGraphUp, BsTrash, BsFunnel, BsBoxSeam
} from 'react-icons/bs';
import {
    getCustomers,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerStats,
    getBirthdayCustomers,
    getCustomerOrders,
} from '../../services/customer';
import {
    fmt,
    normalizeApiList,
    extractOrdersInfo,
    formatCustomerRecord,
    getApiErrorMessage,
} from '../../components/customers/customerHelpers';

const PAGE_SIZE = 8;

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={11} /> },
    Inactive: { color: '#6b7280', bg: '#f3f4f6', icon: null },
    Blocked: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={11} /> },
};

const typeCfg = {
    Regular: { color: '#6366f1', bg: '#eef2ff' },
    Wholesale: { color: '#8b5cf6', bg: '#f5f3ff' },
    VIP: { color: '#d97706', bg: '#fffbeb' },
    New: { color: '#0ea5e9', bg: '#f0f9ff' },
};

const KpiSkeleton = () => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', minHeight: 94 }}>
        <div style={{ width: '50%', height: 12, background: '#f3f4f6', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ width: '40%', height: 24, background: '#eef2ff', borderRadius: 6 }} />
    </div>
);

const TableRowSkeleton = () => (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
        {Array.from({ length: 10 }).map((_, i) => (
            <td key={i} style={{ padding: '14px 16px' }}>
                <div style={{ height: 16, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
            </td>
        ))}
    </tr>
);

const CustomerManagement = () => {
    // Initial Page Load: Loads ONLY 3 APIs required for E-Commerce page
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [customerStats, setCustomerStats] = useState(null);
    const [birthdayCustomers, setBirthdayCustomers] = useState([]);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterCity, setFilterCity] = useState('All');
    const [page, setPage] = useState(1);

    // On-Demand Drawer State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [ordersError, setOrdersError] = useState('');

    // Quick Actions
    const [deletingId, setDeletingId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError('');

            const [customersRes, statsRes, birthdaysRes] = await Promise.allSettled([
                getCustomers(),
                getCustomerStats(),
                getBirthdayCustomers(),
            ]);

            if (customersRes.status === 'fulfilled') {
                const list = normalizeApiList(customersRes.value);
                setCustomers(list.map(c => formatCustomerRecord(c)));
            } else {
                throw customersRes.reason;
            }

            if (statsRes.status === 'fulfilled') setCustomerStats(statsRes.value);
            if (birthdaysRes.status === 'fulfilled') setBirthdayCustomers(normalizeApiList(birthdaysRes.value));
        } catch (err) {
            console.error('Failed to load e-commerce customers:', err);
            setError('Unable to load customer management dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // ON-DEMAND: Loaded ONLY when clicking Eye icon
    const handleViewCustomerOrders = async (backendId) => {
        const localCust = customers.find(c => c.backendId === backendId);
        if (localCust) setSelectedCustomer(localCust);

        setViewLoading(true);
        setOrdersError('');
        setCustomerOrders([]);

        try {
            const [custDetailsRes, ordersRes] = await Promise.allSettled([
                getCustomerById(backendId),
                getCustomerOrders(backendId),
            ]);

            if (custDetailsRes.status === 'fulfilled') {
                const raw = custDetailsRes.value;
                const extracted = ordersRes.status === 'fulfilled' ? extractOrdersInfo(ordersRes.value) : {};
                const fullRecord = formatCustomerRecord(raw, extracted);
                setSelectedCustomer(fullRecord);
                setCustomers(prev => prev.map(c => c.backendId === backendId ? { ...c, ...fullRecord } : c));
            }

            if (ordersRes.status === 'fulfilled') {
                setCustomerOrders(normalizeApiList(ordersRes.value));
            }
        } catch (err) {
            console.error('Error fetching customer details on demand:', err);
            setOrdersError('Order history unavailable at the moment.');
        } finally {
            setViewLoading(false);
        }
    };

    // Active / Inactive Toggle
    const handleToggleStatus = async (customer) => {
        const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
        setUpdatingId(customer.backendId);

        try {
            setCustomers(prev => prev.map(c => c.backendId === customer.backendId ? { ...c, status: newStatus } : c));
            if (selectedCustomer?.backendId === customer.backendId) {
                setSelectedCustomer(prev => prev ? { ...prev, status: newStatus } : prev);
            }

            await updateCustomer(customer.backendId, { status: newStatus.toLowerCase() });
        } catch (err) {
            console.error('Status update failed:', err);
            setCustomers(prev => prev.map(c => c.backendId === customer.backendId ? { ...c, status: customer.status } : c));
            alert(getApiErrorMessage(err, 'Failed to update status.'));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteCustomer = (customer) => {
        if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) return;

        // TODO:
        // Uncomment and connect the Delete Customer API
        // once the backend endpoint is finalized.
        // await deleteCustomer(customer.backendId);

        console.log(`[UI DELETE] Soft deleting customer UI state for backendId: ${customer.backendId}`);
        setCustomers(prev => prev.filter(c => c.backendId !== customer.backendId));
        if (selectedCustomer?.backendId === customer.backendId) setSelectedCustomer(null);
    };

    const availableCities = useMemo(() => Array.from(new Set(customers.map(c => c.city).filter(Boolean))), [customers]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const query = search.trim().toLowerCase();
            const matchesSearch = !query ||
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone.includes(query) ||
                c.id.toLowerCase().includes(query) ||
                c.city.toLowerCase().includes(query);

            const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
            const matchesType = filterType === 'All' || c.type === filterType;
            const matchesCity = filterCity === 'All' || c.city === filterCity;

            return matchesSearch && matchesStatus && matchesType && matchesCity;
        });
    }, [customers, search, filterStatus, filterType, filterCity]);

    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
    const paginatedCustomers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredCustomers.slice(start, start + PAGE_SIZE);
    }, [filteredCustomers, page]);

    const totalCustomersCount = customerStats?.total ?? customerStats?.total_customers ?? customers.length;
    const activeCustomersCount = customerStats?.active ?? customerStats?.active_customers ?? customers.filter(c => c.status === 'Active').length;
    const newCustomersCount = customers.filter(c => {
        if (!c.registered || c.registered === 'Not available') return false;
        const regDate = new Date(c.registered);
        if (Number.isNaN(regDate.getTime())) return false;
        return (new Date() - regDate) / (1000 * 60 * 60 * 24) <= 30;
    }).length;

    const topSpenderObj = useMemo(() => {
        if (customers.length === 0) return { name: '—', amount: 0 };
        const top = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0];
        return { name: top.name, amount: top.totalSpent || 0 };
    }, [customers]);

    const totalOrdersCount = useMemo(() => customers.reduce((sum, c) => sum + (c.orders || 0), 0), [customers]);
    const avgOrderValue = useMemo(() => {
        const totalRev = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        return totalOrdersCount > 0 ? Math.round(totalRev / totalOrdersCount) : 0;
    }, [customers, totalOrdersCount]);

    return (
        <div className="dash-page" style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="adm-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, fontSize: 20 }}>
                            <BsBagCheck />
                        </span>
                        Customer Management
                    </h1>
                    <p className="adm-page-sub">Manage online store customer accounts, purchases, and order history.</p>
                </div>
                <div className="adm-header-actions">
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => {
                            const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customers, null, 2));
                            const anchor = document.createElement('a');
                            anchor.setAttribute("href", jsonStr);
                            anchor.setAttribute("download", "ecommerce_customers.json");
                            document.body.appendChild(anchor);
                            anchor.click();
                            anchor.remove();
                        }}
                    >
                        <BsDownload size={14} /> Export Data
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                {loading ? (
                    <>
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                    </>
                ) : (
                    <>
                        <div className="adm-kpi-card" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Store Customers</span>
                                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👥</span>
                            </div>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginTop: 10, marginBottom: 0 }}>{totalCustomersCount.toLocaleString('en-IN')}</p>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: 'inline-block', marginTop: 4 }}>Registered buyers</span>
                        </div>

                        <div className="adm-kpi-card" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Buyers</span>
                                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</span>
                            </div>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#10b981', marginTop: 10, marginBottom: 0 }}>{activeCustomersCount.toLocaleString('en-IN')}</p>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'inline-block', marginTop: 4 }}>
                                {totalCustomersCount > 0 ? `${Math.round((activeCustomersCount / totalCustomersCount) * 100)}% active` : '0%'}
                            </span>
                        </div>

                        <div className="adm-kpi-card" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New This Month</span>
                                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9ff', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🆕</span>
                            </div>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#0ea5e9', marginTop: 10, marginBottom: 0 }}>{newCustomersCount.toLocaleString('en-IN')}</p>
                            <span style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600, display: 'inline-block', marginTop: 4 }}>Last 30 days</span>
                        </div>

                        <div className="adm-kpi-card" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Spender</span>
                                <span style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👑</span>
                            </div>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6', marginTop: 10, marginBottom: 0 }}>{fmt(topSpenderObj.amount)}</p>
                            <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, display: 'inline-block', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                {topSpenderObj.name}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Upcoming Birthdays Notification Banner */}
            {birthdayCustomers.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 24 }}>🎂</span>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>Upcoming Store Birthdays</p>
                            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0 0' }}>
                                {birthdayCustomers.slice(0, 4).map(b => b.name || b.customer_name).join(', ')}
                                {birthdayCustomers.length > 4 ? ` +${birthdayCustomers.length - 4} more customers` : ''}
                            </p>
                        </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '6px 14px', borderRadius: 20, border: '1px solid #fde68a' }}>
                        {birthdayCustomers.length} Birthday{birthdayCustomers.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {/* E-Commerce Sales Analytics Highlights */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsGraphUp style={{ color: '#6366f1' }} size={16} />
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>E-Commerce Sales & Purchase Summary</h3>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 20 }}>Store Activity</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Recorded Orders</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4, margin: 0 }}>{totalOrdersCount} orders</p>
                    </div>

                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Average Order Value</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', marginTop: 4, margin: 0 }}>{fmt(avgOrderValue)}</p>
                    </div>

                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Active Spender Ratio</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 4, margin: 0 }}>
                            {customers.length > 0 ? `${Math.round((customers.filter(c => (c.orders || 0) > 0).length / customers.length) * 100)}% active` : '0%'}
                        </p>
                    </div>

                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Top Customer Lifetime Spend</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6', marginTop: 4, margin: 0 }}>{fmt(topSpenderObj.amount)}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                    <BsSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        className="ec-input"
                        style={{ paddingLeft: 36, width: '100%', height: 38, fontSize: 13 }}
                        placeholder="Search customer by name, email, phone or city..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BsFunnel size={13} style={{ color: '#6b7280' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Status:</span>
                        <select className="ec-input" style={{ height: 38, fontSize: 12 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Blocked">Blocked</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Type:</span>
                        <select className="ec-input" style={{ height: 38, fontSize: 12 }} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                            <option value="All">All Types</option>
                            <option value="Regular">Regular</option>
                            <option value="VIP">VIP</option>
                            <option value="Wholesale">Wholesale</option>
                            <option value="New">New</option>
                        </select>
                    </div>

                    {availableCities.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>City:</span>
                            <select className="ec-input" style={{ height: 38, fontSize: 12 }} value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1); }}>
                                <option value="All">All Cities</option>
                                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Customers Table with Dedicated Horizontal Scroll Container */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: '#fff' }}>
                <div className="table-scroll-container">
                    <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                {['Customer', 'Email', 'Phone', 'City', 'Orders', 'Total Spent', 'Avg. Order', 'Last Order', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && Array.from({ length: 6 }).map((_, idx) => <TableRowSkeleton key={idx} />)}

                            {!loading && error && (
                                <tr>
                                    <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
                                        {error}
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && paginatedCustomers.map((c) => {
                                const sc = statusCfg[c.status] || statusCfg.Inactive;
                                const tc = typeCfg[c.type] || typeCfg.Regular;
                                const isSelected = selectedCustomer?.backendId === c.backendId;

                                return (
                                    <tr
                                        key={c.backendId}
                                        style={{
                                            borderBottom: '1px solid #f3f4f6',
                                            background: isSelected ? '#f5f3ff' : 'transparent',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {/* Customer */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0, boxShadow: '0 2px 4px rgba(99,102,241,0.2)' }}>
                                                    {c.name ? c.name[0].toUpperCase() : 'C'}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{c.name}</p>
                                                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: tc.bg, color: tc.color }}>
                                                            {c.type}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace', margin: '2px 0 0 0' }}>{c.id}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{c.email || '—'}</td>

                                        {/* Phone */}
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#4b5563', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.phone || '—'}</td>

                                        {/* City */}
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{c.city}</td>

                                        {/* Orders Count */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: 8 }}>
                                                {c.orders} {c.orders === 1 ? 'order' : 'orders'}
                                            </span>
                                        </td>

                                        {/* Total Spent */}
                                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>{fmt(c.totalSpent)}</td>

                                        {/* Avg Order */}
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(c.avgOrder)}</td>

                                        {/* Last Order */}
                                        <td style={{ padding: '14px 16px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{c.lastOrder}</td>

                                        {/* Active/Inactive Toggle */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(c)}
                                                disabled={updatingId === c.backendId}
                                                title="Click to toggle Active/Inactive"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    padding: '4px 10px',
                                                    borderRadius: 20,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    background: sc.bg,
                                                    color: sc.color,
                                                    border: `1px solid ${sc.color}33`,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {sc.icon} {c.status}
                                            </button>
                                        </td>

                                        {/* Action Column */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    title="View Orders & Details"
                                                    aria-label="View Orders"
                                                    onClick={() => handleViewCustomerOrders(c.backendId)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 34,
                                                        height: 34,
                                                        padding: 0,
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                        color: '#6366f1',
                                                        borderColor: '#c7d2fe',
                                                        background: '#fff',
                                                    }}
                                                >
                                                    <BsEye size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    title="Delete Customer"
                                                    aria-label="Delete Customer"
                                                    onClick={() => handleDeleteCustomer(c)}
                                                    disabled={deletingId === c.backendId}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 34,
                                                        height: 34,
                                                        padding: 0,
                                                        borderRadius: 8,
                                                        color: '#ef4444',
                                                        borderColor: '#fecaca',
                                                        background: '#fff',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <BsTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {!loading && !error && paginatedCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                                        No e-commerce customers found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Fixed Pagination Footer */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length} customers
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="adm-btn-secondary" style={{ padding: '4px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <BsChevronLeft size={12} />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {p}
                                </button>
                            ))}

                            <button type="button" className="adm-btn-secondary" style={{ padding: '4px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                <BsChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ON-DEMAND CUSTOMER ORDERS & PROFILE DRAWER */}
            {selectedCustomer && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelectedCustomer(null)}>
                    <div
                        style={{ width: '100%', maxWidth: 540, background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
                                    {selectedCustomer.name[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{selectedCustomer.name}</h3>
                                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>{selectedCustomer.email} • {selectedCustomer.phone}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCustomer(null)}
                                style={{ border: 'none', background: '#e5e7eb', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontWeight: 700, color: '#4b5563' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Summary Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, background: '#f9fafb', padding: 14, borderRadius: 12, border: '1px solid #f3f4f6' }}>
                                <div>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Spent</p>
                                    <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginTop: 2, margin: 0 }}>{fmt(selectedCustomer.totalSpent)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Orders</p>
                                    <p style={{ fontSize: 15, fontWeight: 800, color: '#6366f1', marginTop: 2, margin: 0 }}>{selectedCustomer.orders}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Avg. Order</p>
                                    <p style={{ fontSize: 15, fontWeight: 800, color: '#10b981', marginTop: 2, margin: 0 }}>{fmt(selectedCustomer.avgOrder)}</p>
                                </div>
                            </div>

                            {/* Customer Profile Attributes */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 10 }}>
                                    <span style={{ color: '#6b7280', fontWeight: 600 }}>Location:</span>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#111827' }}>{selectedCustomer.city}</p>
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 10 }}>
                                    <span style={{ color: '#6b7280', fontWeight: 600 }}>Customer Segment:</span>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#6366f1' }}>{selectedCustomer.type}</p>
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 10 }}>
                                    <span style={{ color: '#6b7280', fontWeight: 600 }}>Account Status:</span>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: selectedCustomer.status === 'Active' ? '#10b981' : '#ef4444' }}>{selectedCustomer.status}</p>
                                </div>
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 10 }}>
                                    <span style={{ color: '#6b7280', fontWeight: 600 }}>Registered Date:</span>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#111827' }}>{selectedCustomer.registered}</p>
                                </div>
                            </div>

                            {/* Order History Section */}
                            <div>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BsBoxSeam style={{ color: '#6366f1' }} /> Order & Purchase History</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 12 }}>
                                        {customerOrders.length} records
                                    </span>
                                </h4>

                                {viewLoading && (
                                    <div style={{ padding: 30, textAlign: 'center', color: '#6366f1', fontSize: 13, background: '#f9fafb', borderRadius: 10 }}>
                                        Loading customer order history...
                                    </div>
                                )}

                                {!viewLoading && ordersError && (
                                    <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 10, fontSize: 12 }}>
                                        {ordersError}
                                    </div>
                                )}

                                {!viewLoading && !ordersError && customerOrders.length === 0 && (
                                    <div style={{ padding: 24, textAlign: 'center', background: '#f9fafb', borderRadius: 12, border: '1px border #e5e7eb', color: '#6b7280', fontSize: 12 }}>
                                        <BsBoxSeam size={24} style={{ color: '#9ca3af', marginBottom: 8 }} />
                                        <p style={{ margin: 0, fontWeight: 700, color: '#374151' }}>No Orders Recorded</p>
                                        <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>This customer has not placed any online store purchases yet.</p>
                                    </div>
                                )}

                                {!viewLoading && customerOrders.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                        {customerOrders.map((ord, idx) => (
                                            <div key={ord.id ?? idx} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                                                        Order #{ord.order_number || ord.id || `ORD-${idx + 1}`}
                                                    </p>
                                                    <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0 0' }}>
                                                        {ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-GB') : 'Recent'} • {ord.items_count || 1} item(s)
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: 14, fontWeight: 800, color: '#10b981', margin: 0 }}>
                                                        {fmt(ord.total_amount || ord.total || ord.amount || 0)}
                                                    </p>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#e0f2fe', color: '#0369a1' }}>
                                                        {ord.status || 'Completed'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="adm-btn-secondary" onClick={() => setSelectedCustomer(null)}>
                                Close Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;
