import React, { useState, useEffect } from 'react';
import {
    BsPlus, BsSearch, BsPencilFill, BsTrashFill, BsCheckCircleFill,
    BsXCircleFill, BsTagFill, BsPercent, BsCurrencyRupee, BsTruck,
    BsPeople, BsClockHistory, BsInfoCircle, BsEye, BsEyeSlash,
} from 'react-icons/bs';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, getActiveCoupons, getExpiredCoupons, getCouponStats, activateCoupon, deactivateCoupon, getCoupon, validateCoupon, applyCoupon } from '../../services/couponService';



const typeConfig = {
    'Percentage': { icon: <BsPercent size={13} />, color: '#6366f1', bg: '#eef2ff' },
    'Fixed': { icon: <BsCurrencyRupee size={13} />, color: '#10b981', bg: '#ecfdf5' },
    'Free Delivery': { icon: <BsTruck size={13} />, color: '#f97316', bg: '#fff7ed' },
};

const eligibilities = ['All', 'New Customers', 'Existing Customers', 'Premium Customers'];
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

const EMPTY = {
    code: '', description: '', type: 'Percentage', value: '', minOrder: '', maxDiscount: '',
    startDate: new Date().toISOString().split('T')[0],
    expiry: '', usageLimit: '', eligibility: 'All', freeDelivery: false, status: 'Active',
};

const mapBackendToFrontend = (b) => {
    if (!b) return { ...EMPTY };
    const raw = b?.data || b?.coupon || b || {};

    const rawType = String(raw.discount_type || raw.discountType || raw.type || '').toLowerCase();
    let type = 'Percentage';
    if (rawType === 'fixed' || rawType === 'flat' || rawType === 'amount') {
        type = 'Fixed';
    } else if (rawType === 'free_delivery' || rawType === 'freedelivery' || rawType === 'free_shipping') {
        type = 'Free Delivery';
    } else if (rawType === 'percentage' || rawType === 'percent') {
        type = 'Percentage';
    }

    let status = raw.is_active || raw.status === 'Active' ? 'Active' : 'Inactive';
    const expiry = raw.end_date || raw.endDate || raw.expiry || raw.expires_at || '';
    if (expiry && new Date(expiry) < new Date()) {
        status = 'Expired';
    }

    const rawVal = raw.discount_value ?? raw.discountValue ?? raw.discount_amount ?? raw.discountAmount ?? raw.discount ?? raw.value ?? raw.amount ?? 0;
    let value = Number(rawVal) || 0;
    if (type === 'Percentage' && value > 0 && value < 1) {
        value = Math.round(value * 100);
    }

    const rawMin = raw.minimum_order_amount ?? raw.minimumOrderAmount ?? raw.minOrder ?? raw.min_order_amount ?? raw.min_order ?? 0;
    const minOrder = Number(rawMin) || 0;

    const rawMax = raw.maximum_discount ?? raw.maximumDiscount ?? raw.maxDiscount ?? raw.max_discount ?? null;
    const maxDiscount = rawMax !== null && rawMax !== undefined && rawMax !== '' ? Number(rawMax) : null;

    return {
        id: raw.id || b.id,
        code: String(raw.code || '').toUpperCase(),
        type,
        value,
        minOrder,
        maxDiscount,
        expiry,
        startDate: raw.start_date || raw.startDate || '',
        usageLimit: Number(raw.usage_limit ?? raw.usageLimit ?? raw.limit ?? 100) || 100,
        used: Number(raw.used_count ?? raw.usedCount ?? raw.used ?? 0) || 0,
        eligibility: raw.eligibility || 'All',
        freeDelivery: type === 'Free Delivery',
        status,
        description: raw.description || '',
    };
};

const mapFrontendToBackend = (form) => {
    const isFixed = String(form.type).toLowerCase() === 'fixed';
    const isFree = String(form.type).toLowerCase() === 'free delivery' || String(form.type).toLowerCase() === 'free_delivery';
    const discType = isFixed ? 'fixed' : (isFree ? 'free_delivery' : 'percentage');
    const numVal = Number(form.value) || 0;

    return {
        code: form.code,
        description: form.description || `${form.code} coupon`,
        discount_type: discType,
        discount_value: numVal,
        discount_amount: numVal,
        value: numVal,
        minimum_order_amount: Number(form.minOrder) || 0,
        maximum_discount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usage_limit: Number(form.usageLimit) || 100,
        start_date: form.startDate || new Date().toISOString().split('T')[0],
        end_date: form.expiry,
        is_active: form.status === 'Active',
    };
};

const validateMaxDiscount = (form) => {
    if (!form || form.type === 'Free Delivery') return null;
    if (form.maxDiscount === null || form.maxDiscount === undefined || form.maxDiscount === '') return null;

    const maxDisc = Number(form.maxDiscount);
    if (isNaN(maxDisc) || maxDisc <= 0) {
        return 'Maximum discount must be greater than 0.';
    }

    if (form.type === 'Fixed') {
        const discAmount = Number(form.value) || 0;
        if (discAmount > 0 && maxDisc < discAmount) {
            return `Maximum discount (₹${maxDisc}) cannot be smaller than discount amount (₹${discAmount}).`;
        }
    } else if (form.type === 'Percentage') {
        const minOrder = Number(form.minOrder) || 0;
        const pct = Number(form.value) || 0;
        if (minOrder > 0 && pct > 0) {
            const minDiscAmount = (minOrder * pct) / 100;
            if (maxDisc < minDiscAmount) {
                return `Maximum discount (₹${maxDisc}) cannot be smaller than discount amount on minimum order (₹${minDiscAmount.toFixed(2).replace(/\.00$/, '')}).`;
            }
        } else if (pct > 0 && maxDisc < pct) {
            return `Maximum discount (₹${maxDisc}) cannot be smaller than discount value (${pct}%).`;
        }
    }

    return null;
};

const CouponManagement = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [apiAvailable, setApiAvailable] = useState(true); // tracks if backend coupon module exists
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All Types');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editCoupon, setEditCoupon] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const maxDiscountError = validateMaxDiscount(form);
    const [showCode, setShowCode] = useState({});
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active'
    const [activeCoupons, setActiveCoupons] = useState([]);
    const [activeLoading, setActiveLoading] = useState(false);
    const [expiredCoupons, setExpiredCoupons] = useState([]);
    const [expiredLoading, setExpiredLoading] = useState(false);
    const [apiStats, setApiStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activatingId, setActivatingId] = useState(null);
    const [deactivatingId, setDeactivatingId] = useState(null);

    // Test Coupon Feature
    const [showTestModal, setShowTestModal] = useState(false);
    const [testForm, setTestForm] = useState({ code: '', amount: '' });
    const [testResult, setTestResult] = useState(null);
    const [testLoading, setTestLoading] = useState(false);

    const fetchCoupons = () => {
        let active = true;
        setLoading(true);
        setError('');
        getCoupons()
            .then(data => {
                if (active) {
                    setApiAvailable(true);
                    const arr = Array.isArray(data) ? data : (data.items || data.data || []);
                    setCoupons(arr.map(mapBackendToFrontend));
                }
            })
            .catch(err => {
                console.error('[CouponManagement] Fetch error:', err);
                if (active) {
                    // 404 means the coupon module is not deployed yet on the backend
                    if (err.message && (err.message.includes('404') || err.message.includes('Not Found') || err.message.includes('Request failed (404)'))) {
                        setApiAvailable(false);
                        setError(''); // don't show red error banner, show the orange notice instead
                    } else {
                        setError(err.message || 'Failed to fetch coupons from server.');
                    }
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    };

    useEffect(() => {
        const cleanup = fetchCoupons();
        return cleanup;
    }, []);

    // Fetch coupon stats from dedicated endpoint on mount
    useEffect(() => {
        let alive = true;
        setStatsLoading(true);
        getCouponStats()
            .then(data => { if (alive) setApiStats(data); })
            .catch(err => {
                console.error('[CouponManagement] Stats error:', err);
                // silently ignore 404 — stats endpoint may not exist yet
            })
            .finally(() => { if (alive) setStatsLoading(false); });
        return () => { alive = false; };
    }, []);

    // Fetch active-only coupons from dedicated endpoint
    useEffect(() => {
        let alive = true;
        if (activeTab !== 'active') return;
        setActiveLoading(true);
        getActiveCoupons()
            .then(data => {
                if (alive) {
                    const arr = Array.isArray(data) ? data : (data.items || data.data || []);
                    setActiveCoupons(arr.map(mapBackendToFrontend));
                }
            })
            .catch(err => console.error('[CouponManagement] Active coupons error (may be 404 if not deployed):', err))
            .finally(() => { if (alive) setActiveLoading(false); });
        return () => { alive = false; };
    }, [activeTab]);

    // Fetch expired coupons from dedicated endpoint
    useEffect(() => {
        let alive = true;
        if (activeTab !== 'expired') return;
        setExpiredLoading(true);
        getExpiredCoupons()
            .then(data => {
                if (alive) {
                    const arr = Array.isArray(data) ? data : (data.items || data.data || []);
                    setExpiredCoupons(arr.map(mapBackendToFrontend));
                }
            })
            .catch(err => console.error('[CouponManagement] Expired coupons error (may be 404 if not deployed):', err))
            .finally(() => { if (alive) setExpiredLoading(false); });
        return () => { alive = false; };
    }, [activeTab]);

    const filtered = coupons.filter(c => {
        const matchSearch = c.code.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'All Types' || c.type === filterType;
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    const openAdd = () => { setError(''); setEditCoupon(null); setForm(EMPTY); setShowModal(true); };

    const openEdit = async (c) => {
        try {
            setLoading(true);
            setError('');
            // Seed immediately from clicked coupon c so values are never mismatched or empty
            setEditCoupon(c);
            setForm({ ...c });
            setShowModal(true);

            // Fetch latest from backend and merge safely
            try {
                const data = await getCoupon(c.id);
                const rawItem = data?.data || data?.coupon || (data?.id ? data : null);
                if (rawItem) {
                    const front = { ...c, ...mapBackendToFrontend(rawItem) };
                    setEditCoupon(front);
                    setForm({ ...front });
                }
            } catch (fetchErr) {
                console.warn('[CouponManagement] Backend single fetch fallback to item:', fetchErr);
            }
        } catch (err) {
            console.error('[CouponManagement] Fetch single error:', err);
            setEditCoupon(c);
            setForm({ ...c });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => { setShowModal(false); setEditCoupon(null); setError(''); };

    const handleSave = async () => {
        if (!form.code || !form.expiry) {
            setError('Please fill in required fields: Coupon Code and Expiry Date.');
            return;
        }
        const maxDiscErr = validateMaxDiscount(form);
        if (maxDiscErr) {
            setError(maxDiscErr);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const payload = mapFrontendToBackend(form);
            if (editCoupon) {
                const response = await updateCoupon(editCoupon.id, payload);
                const rawUpdated = response?.data || response?.coupon || (response?.id ? response : null);
                const updated = mapBackendToFrontend({
                    ...editCoupon,
                    ...payload,
                    ...(rawUpdated || {})
                });
                setCoupons(prev => prev.map(c => c.id === editCoupon.id ? updated : c));
            } else {
                const response = await createCoupon(payload);
                const rawCreated = response?.data || response?.coupon || (response?.id ? response : null);
                const created = mapBackendToFrontend({
                    ...payload,
                    ...(rawCreated || {})
                });
                setCoupons(prev => [created, ...prev]);
            }
            // Refresh stats silently after save
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
            closeModal();
        } catch (err) {
            console.error('[CouponManagement] Save error:', err);
            setError(err.message || 'Failed to save coupon.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this coupon?')) return;
        setLoading(true);
        setError('');
        try {
            await deleteCoupon(id);
            setCoupons(prev => prev.filter(c => c.id !== id));
            // Refresh stats silently after delete
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
        } catch (err) {
            console.error('[CouponManagement] Delete error:', err);
            alert(err.message || 'Failed to delete coupon.');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id) => {
        const target = coupons.find(c => c.id === id);
        if (!target) return;
        const newStatus = target.status === 'Active' ? 'Inactive' : 'Active';
        const numVal = Number(target.value) || 0;
        setLoading(true);
        setError('');
        try {
            const response = await updateCoupon(id, {
                code: target.code,
                description: target.description,
                discount_type: String(target.type).toLowerCase() === 'fixed' ? 'fixed' : (String(target.type).toLowerCase().includes('free') ? 'free_delivery' : 'percentage'),
                discount_value: numVal,
                discount_amount: numVal,
                minimum_order_amount: Number(target.minOrder) || 0,
                maximum_discount: target.maxDiscount ? Number(target.maxDiscount) : null,
                usage_limit: target.usageLimit,
                start_date: new Date().toISOString().split('T')[0],
                end_date: target.expiry,
                is_active: newStatus === 'Active',
            });
            const rawItem = response?.data || response?.coupon || (response?.id ? response : null);
            const updated = mapBackendToFrontend({
                ...target,
                status: newStatus,
                is_active: newStatus === 'Active',
                ...(rawItem || {})
            });
            setCoupons(prev => prev.map(c => c.id === id ? updated : c));
        } catch (err) {
            console.error('[CouponManagement] Toggle status error:', err);
            alert(err.message || 'Failed to update status.');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id) => {
        setActivatingId(id);
        try {
            const response = await activateCoupon(id);
            const updated = mapBackendToFrontend(response);
            // Sync main list
            setCoupons(prev => prev.map(c => c.id === id ? updated : c));
            // Remove from expired panel if present
            setExpiredCoupons(prev => prev.filter(c => c.id !== id));
            // Refresh stats silently
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
        } catch (err) {
            console.error('[CouponManagement] Activate error:', err);
            alert(err.message || 'Failed to activate coupon.');
        } finally {
            setActivatingId(null);
        }
    };

    const handleDeactivate = async (id) => {
        setDeactivatingId(id);
        try {
            const response = await deactivateCoupon(id);
            const updated = mapBackendToFrontend(response);
            setCoupons(prev => prev.map(c => c.id === id ? updated : c));
            setActiveCoupons(prev => prev.filter(c => c.id !== id));
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
        } catch (err) {
            console.error('[CouponManagement] Deactivate error:', err);
            alert(err.message || 'Failed to deactivate coupon.');
        } finally {
            setDeactivatingId(null);
        }
    };

    const handleTestCoupon = async () => {
        if (!testForm.code || !testForm.amount) return;
        setTestLoading(true);
        setTestResult(null);
        const code = testForm.code.trim().toUpperCase();
        const amt = Number(testForm.amount) || 0;
        try {
            const data = await validateCoupon(code, amt);
            setTestResult({ success: data.valid, message: data.message });
        } catch (err) {
            // Local fallback match from available coupons
            const matched = coupons.find(c => String(c.code).toUpperCase() === code);
            if (matched) {
                if (matched.minOrder && amt < matched.minOrder) {
                    setTestResult({ success: false, message: `Minimum order amount of ₹${matched.minOrder} required.` });
                } else if (matched.status !== 'Active') {
                    setTestResult({ success: false, message: `Coupon is ${matched.status.toLowerCase()}.` });
                } else {
                    setTestResult({ success: true, message: `Coupon ${code} is valid!` });
                }
            } else {
                setTestResult({ success: false, message: err.message || 'Validation failed.' });
            }
        } finally {
            setTestLoading(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!testForm.code || !testForm.amount) return;
        setTestLoading(true);
        setTestResult(null);
        const code = testForm.code.trim().toUpperCase();
        const amt = Number(testForm.amount) || 0;
        try {
            const data = await applyCoupon(code, amt);
            const orig = Number(data.original_amount ?? data.original ?? amt);
            const disc = Number(data.discount_amount ?? data.discount ?? 0);
            const fin = Number(data.final_amount ?? data.final ?? (orig - disc));
            setTestResult({
                success: true,
                message: data.message || 'Applied successfully',
                original: orig,
                discount: disc,
                final: Math.max(0, fin),
            });
        } catch (err) {
            // Calculate accurate discount matching coupon value
            const matched = coupons.find(c => String(c.code).toUpperCase() === code);
            if (matched) {
                if (matched.minOrder && amt < matched.minOrder) {
                    setTestResult({ success: false, message: `Minimum order amount of ₹${matched.minOrder} required.` });
                } else if (matched.status !== 'Active') {
                    setTestResult({ success: false, message: `Coupon is ${matched.status.toLowerCase()}.` });
                } else {
                    let discount = 0;
                    const typeLower = String(matched.type).toLowerCase();
                    if (typeLower === 'percentage') {
                        discount = (amt * Number(matched.value)) / 100;
                        if (matched.maxDiscount && discount > Number(matched.maxDiscount)) {
                            discount = Number(matched.maxDiscount);
                        }
                    } else if (typeLower === 'fixed' || typeLower === 'flat') {
                        discount = Number(matched.value);
                    } else if (typeLower === 'free delivery' || typeLower === 'free_delivery') {
                        discount = 0;
                    }
                    discount = Math.min(amt, Math.round(discount * 100) / 100);
                    const finalAmount = Math.max(0, amt - discount);
                    setTestResult({
                        success: true,
                        message: `Coupon ${code} applied successfully!`,
                        original: amt,
                        discount: discount,
                        final: finalAmount,
                    });
                }
            } else {
                setTestResult({ success: false, message: err.message || 'Failed to apply coupon.' });
            }
        } finally {
            setTestLoading(false);
        }
    };

    // Stats — prefer live API data, fall back to local counts
    const stats = [
        {
            label: 'Total Coupons',
            value: statsLoading ? '—' : (apiStats ? apiStats.total_coupons : coupons.length),
            color: '#6366f1',
            icon: '🏷️',
        },
        {
            label: 'Active Coupons',
            value: statsLoading ? '—' : (apiStats ? apiStats.active_coupons : coupons.filter(c => c.status === 'Active').length),
            color: '#10b981',
            icon: '✅',
        },
        {
            label: 'Expired Coupons',
            value: statsLoading ? '—' : (apiStats ? apiStats.expired_coupons : coupons.filter(c => c.status === 'Expired').length),
            color: '#ef4444',
            icon: '⏰',
        },
        {
            label: 'Total Redemptions',
            value: statsLoading ? '—' : (apiStats ? apiStats.total_used : coupons.reduce((s, c) => s + c.used, 0)),
            color: '#f59e0b',
            icon: '🎟️',
        },
        {
            label: 'Inactive Coupons',
            value: statsLoading ? '—' : (apiStats ? apiStats.inactive_coupons : coupons.filter(c => c.status === 'Inactive').length),
            color: '#6b7280',
            icon: '⛔',
        },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🏷️ Coupon Management</h1>
                    <p className="adm-page-sub">Create and manage discount coupons for your online store</p>
                </div>
                <div className="adm-header-actions" style={{ display: 'flex', gap: 10 }}>
                    <button className="adm-btn-secondary" onClick={() => { setShowTestModal(true); setTestResult(null); setTestForm({ code: '', amount: '' }); }}>
                        🧪 Test Coupon
                    </button>
                    <button className="adm-btn-primary" onClick={openAdd}>
                        <BsPlus size={17} /> New Coupon
                    </button>
                </div>
            </div>

            {/* API Unavailable Banner */}
            {!apiAvailable && (
                <div style={{
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    border: '1.5px solid #fb923c',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>🔌</span>
                    <div>
                        <p style={{ fontWeight: 700, color: '#c2410c', fontSize: 14, marginBottom: 4 }}>
                            Coupon API Not Available (404)
                        </p>
                        <p style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.5 }}>
                            The <code style={{ background: '#fed7aa', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>/api/v1/coupons</code> endpoint is returning <strong>404 Not Found</strong>.
                            This means the Coupon module has not been deployed on the backend server yet.
                            Please ask your backend team to deploy the coupon API routes.
                        </p>
                        <button
                            onClick={fetchCoupons}
                            style={{ marginTop: 10, padding: '6px 14px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                            🔄 Retry Connection
                        </button>
                    </div>
                </div>
            )}

            {/* Stats — from /api/v1/coupons/stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                {stats.map((s, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                            <span style={{ fontSize: 16 }}>{s.icon}</span>
                        </div>
                        <p style={{
                            fontSize: 28, fontWeight: 800, color: s.color, marginTop: 2,
                            opacity: statsLoading ? 0.4 : 1,
                            transition: 'opacity 0.3s',
                        }}>{s.value}</p>
                        {statsLoading && (
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                                background: `linear-gradient(90deg, transparent, ${s.color}55, transparent)`,
                                animation: 'shimmer 1.2s infinite',
                            }} />
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Tab bar */}
            <div className="adm-tab-bar">
                {[
                    { id: 'all', label: '📋 All Coupons' },
                    { id: 'active', label: '✅ Active Coupons' },
                    { id: 'expired', label: '⏰ Expired Coupons' },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`adm-tab ${activeTab === t.id ? 'adm-tab--active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Active Coupons panel ── */}
            {activeTab === 'active' && (
                <>
                    {activeLoading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
                            <p>Loading active coupons...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {activeCoupons.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14, gridColumn: '1/-1' }}>
                                    <BsTagFill size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                                    <p>No active coupons found</p>
                                </div>
                            ) : activeCoupons.map(c => {
                                const tc = typeConfig[c.type] || typeConfig['Percentage'];
                                const usagePct = c.usageLimit > 0 ? Math.min(100, Math.round((c.used / c.usageLimit) * 100)) : 0;
                                return (
                                    <div key={c.id} className="ec-coupon-card">
                                        <div className="ec-coupon-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {tc.icon}
                                                </div>
                                                <div>
                                                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#111827', letterSpacing: 1 }}>{c.code}</p>
                                                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{c.type}</span>
                                                </div>
                                            </div>
                                            <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#10b981' }}>Active</span>
                                        </div>

                                        <div className="ec-coupon-value">
                                            {c.type === 'Percentage' && <>{c.value}% OFF</>}
                                            {c.type === 'Fixed' && <>₹{c.value} OFF</>}
                                            {c.type === 'Free Delivery' && <>Free Delivery</>}
                                        </div>

                                        {c.description && (
                                            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, fontStyle: 'italic' }}>{c.description}</p>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                            {[
                                                { label: 'Min Order', value: c.minOrder > 0 ? fmt(c.minOrder) : 'No min' },
                                                { label: 'Max Discount', value: c.maxDiscount ? fmt(c.maxDiscount) : 'Unlimited' },
                                                { label: 'Usage Limit', value: c.usageLimit },
                                                { label: 'Expires', value: c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                                            ].map((f, i) => (
                                                <div key={i} style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 1 }}>{f.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Usage Progress */}
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Usage</span>
                                                <span style={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>{c.used} / {c.usageLimit}</span>
                                            </div>
                                            <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: usagePct >= 90 ? '#ef4444' : '#10b981', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>

                                        {/* Deactivate button */}
                                        <button
                                            onClick={() => handleDeactivate(c.id)}
                                            disabled={deactivatingId === c.id}
                                            style={{
                                                width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                                                background: deactivatingId === c.id ? '#fee2e2' : '#ef4444',
                                                color: '#fff', fontWeight: 700, fontSize: 13,
                                                cursor: deactivatingId === c.id ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                transition: 'background 0.2s',
                                                marginTop: 4,
                                            }}
                                        >
                                            {deactivatingId === c.id ? 'Deactivating...' : 'Deactivate Coupon'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Expired Coupons panel ── */}
            {activeTab === 'expired' && (
                <>
                    {expiredLoading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
                            <p>Loading expired coupons...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {expiredCoupons.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14, gridColumn: '1/-1' }}>
                                    <BsClockHistory size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                                    <p>No expired coupons found</p>
                                </div>
                            ) : expiredCoupons.map(c => {
                                const tc = typeConfig[c.type] || typeConfig['Percentage'];
                                const usagePct = c.usageLimit > 0 ? Math.min(100, Math.round((c.used / c.usageLimit) * 100)) : 0;
                                return (
                                    <div key={c.id} className="ec-coupon-card" style={{ opacity: 0.75, borderLeft: '3px solid #ef4444' }}>
                                        <div className="ec-coupon-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <BsClockHistory size={14} />
                                                </div>
                                                <div>
                                                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#6b7280', letterSpacing: 1, textDecoration: 'line-through' }}>{c.code}</p>
                                                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{c.type}</span>
                                                </div>
                                            </div>
                                            <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#ef4444' }}>Expired</span>
                                        </div>

                                        <div className="ec-coupon-value" style={{ color: '#9ca3af' }}>
                                            {c.type === 'Percentage' && <>{c.value}% OFF</>}
                                            {c.type === 'Fixed' && <>₹{c.value} OFF</>}
                                            {c.type === 'Free Delivery' && <>Free Delivery</>}
                                        </div>

                                        {c.description && (
                                            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, fontStyle: 'italic' }}>{c.description}</p>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                            {[
                                                { label: 'Min Order', value: c.minOrder > 0 ? fmt(c.minOrder) : 'No min' },
                                                { label: 'Max Discount', value: c.maxDiscount ? fmt(c.maxDiscount) : 'Unlimited' },
                                                { label: 'Usage Limit', value: c.usageLimit },
                                                { label: 'Expired On', value: c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                                            ].map((f, i) => (
                                                <div key={i} style={{ background: '#fef2f2', borderRadius: 7, padding: '7px 10px' }}>
                                                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginTop: 1 }}>{f.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Usage Progress */}
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Total Used</span>
                                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>{c.used} / {c.usageLimit}</span>
                                            </div>
                                            <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: '#ef4444', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>

                                        {/* Re-activate button */}
                                        <button
                                            onClick={() => handleActivate(c.id)}
                                            disabled={activatingId === c.id}
                                            style={{
                                                width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                                                background: activatingId === c.id ? '#d1fae5' : '#10b981',
                                                color: '#fff', fontWeight: 700, fontSize: 13,
                                                cursor: activatingId === c.id ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                transition: 'background 0.2s',
                                                marginTop: 4,
                                            }}
                                        >
                                            {activatingId === c.id ? 'Activating…' : '⚡ Re-activate Coupon'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── All Coupons: Filters + Grid ── */}
            {activeTab === 'all' && (
                <>
                    {/* Filters */}
                    <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                            <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search coupon code..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="ec-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ minWidth: 140 }}>
                            <option>All Types</option>
                            <option>Percentage</option>
                            <option>Fixed</option>
                            <option>Free Delivery</option>
                        </select>
                        <select className="ec-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 120 }}>
                            <option>All</option>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Expired</option>
                        </select>
                    </div>

                    {/* Coupons Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                        {filtered.map(c => {
                            const tc = typeConfig[c.type];
                            const usagePct = c.usageLimit > 0 ? Math.min(100, Math.round((c.used / c.usageLimit) * 100)) : 0;
                            const isExpired = c.status === 'Expired' || new Date(c.expiry) < new Date();
                            return (
                                <div key={c.id} className="ec-coupon-card" style={{ opacity: isExpired ? 0.7 : 1 }}>
                                    <div className="ec-coupon-top">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {tc.icon}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#111827', letterSpacing: 1 }}>
                                                        {showCode[c.id] ? c.code : c.code.slice(0, 3) + '•'.repeat(Math.max(0, c.code.length - 3))}
                                                    </p>
                                                    <button onClick={() => setShowCode(p => ({ ...p, [c.id]: !p[c.id] }))}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                                        {showCode[c.id] ? <BsEyeSlash size={13} /> : <BsEye size={13} />}
                                                    </button>
                                                </div>
                                                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{c.type}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <button onClick={() => openEdit(c)} style={{ background: '#f3f4f6', border: 'none', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                                                <BsPencilFill size={11} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} style={{ background: '#fef2f2', border: 'none', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                                <BsTrashFill size={11} />
                                            </button>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                background: c.status === 'Active' ? '#ecfdf5' : c.status === 'Expired' ? '#fef2f2' : '#f9fafb',
                                                color: c.status === 'Active' ? '#10b981' : c.status === 'Expired' ? '#ef4444' : '#6b7280',
                                            }}>{c.status}</span>
                                        </div>
                                    </div>

                                    <div className="ec-coupon-value">
                                        {c.type === 'Percentage' && <>{c.value}% OFF</>}
                                        {c.type === 'Fixed' && <>₹{c.value} OFF</>}
                                        {c.type === 'Free Delivery' && <>Free Delivery</>}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                        {[
                                            { label: 'Min Order', value: c.minOrder > 0 ? fmt(c.minOrder) : 'No min' },
                                            { label: 'Max Discount', value: c.maxDiscount ? fmt(c.maxDiscount) : 'Unlimited' },
                                            { label: 'Eligibility', value: c.eligibility },
                                            { label: 'Expires', value: new Date(c.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                        ].map((f, i) => (
                                            <div key={i} style={{ background: '#f9fafb', borderRadius: 7, padding: '7px 10px' }}>
                                                <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 1 }}>{f.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Usage Progress */}
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Usage</span>
                                            <span style={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>{c.used} / {c.usageLimit === 1 ? '1 (per user)' : c.usageLimit}</span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: usagePct >= 90 ? '#ef4444' : '#6366f1', transition: 'width 0.5s' }} />
                                        </div>
                                    </div>

                                    {/* Activate button for Inactive / Expired coupons */}
                                    {c.status !== 'Active' && (
                                        <button
                                            onClick={() => handleActivate(c.id)}
                                            disabled={activatingId === c.id}
                                            style={{
                                                width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                                                background: activatingId === c.id ? '#d1fae5' : '#10b981',
                                                color: '#fff', fontWeight: 700, fontSize: 13,
                                                cursor: activatingId === c.id ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            {activatingId === c.id ? 'Activating...' : 'Activate Coupon'}
                                        </button>
                                    )}

                                    {/* Deactivate button for Active coupons */}
                                    {c.status === 'Active' && (
                                        <button
                                            onClick={() => handleDeactivate(c.id)}
                                            disabled={deactivatingId === c.id}
                                            style={{
                                                width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                                                background: deactivatingId === c.id ? '#fee2e2' : '#ef4444',
                                                color: '#fff', fontWeight: 700, fontSize: 13,
                                                cursor: deactivatingId === c.id ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            {deactivatingId === c.id ? 'Deactivating...' : 'Deactivate Coupon'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {loading && coupons.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
                            <p>Loading coupons from server...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
                            <BsTagFill size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p>No coupons found</p>
                        </div>
                    ) : null}

                    {/* Modal */}
                    {showModal && (
                        <div className="ec-modal-overlay" onClick={closeModal}>
                            <div className="ec-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                                <div className="ec-modal-header">
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                        {editCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                                    </h3>
                                    <button className="ec-modal-close" onClick={closeModal}>✕</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {error && (
                                        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
                                            ⚠️ {error}
                                        </div>
                                    )}
                                    <div className="ec-form-row">
                                        <div className="ec-field">
                                            <label>Coupon Code *</label>
                                            <input className="ec-input" placeholder="e.g. SAVE150" value={form.code} disabled={!!editCoupon}
                                                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1, cursor: editCoupon ? 'not-allowed' : 'text', opacity: editCoupon ? 0.7 : 1 }} />
                                        </div>
                                        <div className="ec-field">
                                            <label>Discount Type *</label>
                                            <select className="ec-input" value={form.type} disabled={!!editCoupon} style={{ cursor: editCoupon ? 'not-allowed' : 'pointer', opacity: editCoupon ? 0.7 : 1 }}
                                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                                <option>Percentage</option>
                                                <option>Fixed</option>
                                                <option>Free Delivery</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ec-field" style={{ gridColumn: '1/-1' }}>
                                        <label>Description</label>
                                        <input className="ec-input" placeholder="e.g. Flat ₹150 off on orders above ₹1000" value={form.description || ''}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    {form.type !== 'Free Delivery' && (
                                        <div className="ec-form-row">
                                            <div className="ec-field">
                                                <label>{form.type === 'Percentage' ? 'Discount %' : 'Discount Amount (₹)'} *</label>
                                                <input className="ec-input" type="number" min="0" value={form.value}
                                                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                                            </div>
                                            <div className="ec-field">
                                                <label>Max Discount (₹)</label>
                                                <input className="ec-input" type="number" min="0" placeholder="Leave blank for no limit" value={form.maxDiscount || ''}
                                                    style={maxDiscountError ? { borderColor: '#ef4444', background: '#fef2f2' } : undefined}
                                                    onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value || null }))} />
                                                {maxDiscountError && (
                                                    <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, display: 'block' }}>
                                                        ⚠️ {maxDiscountError}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="ec-form-row">
                                        <div className="ec-field">
                                            <label>Min Order Value (₹)</label>
                                            <input className="ec-input" type="number" min="0" value={form.minOrder}
                                                onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} />
                                        </div>
                                        <div className="ec-field">
                                            <label>Usage Limit</label>
                                            <input className="ec-input" type="number" min="1" value={form.usageLimit}
                                                onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="ec-form-row">
                                        <div className="ec-field">
                                            <label>Start Date *</label>
                                            <input className="ec-input" type="date" value={form.startDate || ''}
                                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                        </div>
                                        <div className="ec-field">
                                            <label>End (Expiry) Date *</label>
                                            <input className="ec-input" type="date" value={form.expiry}
                                                onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={closeModal} disabled={loading}>Cancel</button>
                                        <button className="adm-btn-primary"
                                            style={{
                                                flex: 1,
                                                justifyContent: 'center',
                                                opacity: (loading || !!maxDiscountError) ? 0.6 : 1,
                                                cursor: (loading || !!maxDiscountError) ? 'not-allowed' : 'pointer'
                                            }}
                                            onClick={handleSave}
                                            disabled={loading || !!maxDiscountError}
                                            title={maxDiscountError || undefined}
                                        >
                                            {loading ? 'Saving...' : editCoupon ? 'Save Changes' : 'Create Coupon'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Test Coupon Modal */}
                    {showTestModal && (
                        <div className="ec-modal-overlay" onClick={() => setShowTestModal(false)}>
                            <div className="ec-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                                <div className="ec-modal-header">
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>🧪 Validate Coupon</h3>
                                    <button className="ec-modal-close" onClick={() => setShowTestModal(false)}>✕</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                                    <div className="ec-field">
                                        <label>Coupon Code *</label>
                                        <input className="ec-input" placeholder="e.g. MEGA300" value={testForm.code}
                                            onChange={e => setTestForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }} />
                                    </div>
                                    <div className="ec-field">
                                        <label>Order Amount (₹) *</label>
                                        <input className="ec-input" type="number" min="0" placeholder="e.g. 1500" value={testForm.amount}
                                            onChange={e => setTestForm(f => ({ ...f, amount: e.target.value }))} />
                                    </div>

                                    {testResult && (
                                        <div style={{
                                            marginTop: 6, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                            background: testResult.success ? '#ecfdf5' : '#fef2f2',
                                            color: testResult.success ? '#047857' : '#b91c1c',
                                            border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`
                                        }}>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: testResult.final ? 8 : 0 }}>
                                                <span>{testResult.success ? '✅' : '❌'}</span>
                                                <span>{testResult.message}</span>
                                            </div>

                                            {testResult.final && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #d1fae5', color: '#374151', fontSize: 12 }}>
                                                    <div>
                                                        <span style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase' }}>Subtotal</span>
                                                        <p style={{ fontWeight: 700 }}>₹{testResult.original}</p>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase' }}>Discount</span>
                                                        <p style={{ fontWeight: 700, color: '#10b981' }}>-₹{testResult.discount}</p>
                                                    </div>
                                                    <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 2 }}>
                                                        <span style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase' }}>Final Amount</span>
                                                        <p style={{ fontWeight: 800, fontSize: 14 }}>₹{testResult.final}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                        <button className="adm-btn-secondary" style={{ flex: 0.8, justifyContent: 'center' }} onClick={() => setShowTestModal(false)} disabled={testLoading}>Close</button>
                                        <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#3b82f6' }} onClick={handleTestCoupon} disabled={testLoading || !testForm.code || !testForm.amount}>
                                            {testLoading ? '...' : 'Validate Only'}
                                        </button>
                                        <button className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#10b981' }} onClick={handleApplyCoupon} disabled={testLoading || !testForm.code || !testForm.amount}>
                                            {testLoading ? '...' : 'Simulate Apply'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CouponManagement;
