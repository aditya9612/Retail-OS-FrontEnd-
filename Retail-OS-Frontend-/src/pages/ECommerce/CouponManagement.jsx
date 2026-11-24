import React, { useState, useEffect } from 'react';
import {
    BsPlus, BsSearch, BsPencilFill, BsTrashFill, BsCheckCircleFill,
    BsXCircleFill, BsTagFill, BsPercent, BsCurrencyRupee, BsTruck,
    BsPeople, BsClockHistory, BsInfoCircle, BsEye, BsEyeSlash,
    BsDownload, BsLightningFill, BsTicketPerforated, BsClipboard, BsCheck2,
    BsLockFill, BsUnlockFill, BsFileEarmarkSpreadsheet, BsFileEarmarkPdf,
} from 'react-icons/bs';
import {
    getCoupons, createCoupon, updateCoupon, deleteCoupon,
    getActiveCoupons, getExpiredCoupons, getCouponStats,
    activateCoupon, deactivateCoupon, getCoupon,
    validateCoupon, applyCoupon,
    getApplicableCoupons, exportCoupons, bulkGenerateCoupons, getCouponRedemptions,
} from '../../services/couponService';



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

// Reconciles and corrects any inconsistency between coupon title/code/configured fields and display values
const getReconciledCoupon = (c) => {
    if (!c) return c;
    let type = c.type || 'Percentage';
    let value = Number(c.value) || 0;
    let maxDiscount = c.maxDiscount !== null && c.maxDiscount !== undefined && c.maxDiscount !== '' ? Number(c.maxDiscount) : null;

    // Scan code and description for explicit discount values e.g. "25% SALE", "25%", "25% OFF", "SALE25"
    const text = `${c.code || ''} ${c.description || ''}`;
    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/i) || text.match(/(?:sale|off|save|disc)\s*(\d+)/i) || text.match(/(\d+)\s*(?:sale|off|%)/i);
    if (pctMatch) {
        const detected = Number(pctMatch[1]);
        if (detected > 0 && (value <= 1 || value < detected || text.includes('%'))) {
            value = detected;
            type = 'Percentage';
        }
    }

    // A percentage discount coupon showing Max Discount 1 (or maxDiscount <= 1 or maxDiscount < value) is inconsistent with configured discount
    if (type === 'Percentage') {
        if (maxDiscount !== null && (maxDiscount <= 1 || (value > 1 && maxDiscount < value))) {
            maxDiscount = null; // Unlimited
        }
    }

    return {
        ...c,
        type,
        value,
        maxDiscount,
    };
};

const DEFAULT_COUPONS = [
    {
        id: 'cpn-25sale',
        code: '25% SALE',
        description: '25% SALE - Special storewide discount on eligible orders',
        type: 'Percentage',
        value: 25,
        minOrder: 500,
        maxDiscount: null,
        startDate: '2026-01-01',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 15,
        eligibility: 'All',
        freeDelivery: false,
        status: 'Active',
    },
    {
        id: 'cpn-flat100',
        code: 'FLAT100',
        description: 'Flat ₹100 discount on orders above ₹500',
        type: 'Fixed',
        value: 100,
        minOrder: 500,
        maxDiscount: 100,
        startDate: '2026-01-01',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 24,
        eligibility: 'All',
        freeDelivery: false,
        status: 'Active',
    },
    {
        id: 'cpn-welcome10',
        code: 'WELCOME10',
        description: '10% off for new customers on orders above ₹300',
        type: 'Percentage',
        value: 10,
        minOrder: 300,
        maxDiscount: 200,
        startDate: '2026-01-01',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 42,
        eligibility: 'New Customers',
        freeDelivery: false,
        status: 'Active',
    },
    {
        id: 'cpn-save20',
        code: 'SAVE20',
        description: '20% off on bulk orders above ₹1000',
        type: 'Percentage',
        value: 20,
        minOrder: 1000,
        maxDiscount: 500,
        startDate: '2026-01-01',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 18,
        eligibility: 'All',
        freeDelivery: false,
        status: 'Active',
    },
    {
        id: 'cpn-festive50',
        code: 'FESTIVE50',
        description: 'Flat ₹50 festive discount on orders above ₹250',
        type: 'Fixed',
        value: 50,
        minOrder: 250,
        maxDiscount: 50,
        startDate: '2026-01-01',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 65,
        eligibility: 'All',
        freeDelivery: false,
        status: 'Active',
    },
    {
        id: 'cpn-freeship',
        code: 'FREESHIP',
        description: 'Free delivery on orders above ₹400',
        type: 'Free Delivery',
        value: 0,
        minOrder: 400,
        maxDiscount: null,
        startDate: '2026-01-01',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 31,
        eligibility: 'All',
        freeDelivery: true,
        status: 'Active',
    },
    {
        id: 'cpn-summer30',
        code: 'SUMMER30',
        description: '30% off upcoming seasonal launch discount',
        type: 'Percentage',
        value: 30,
        minOrder: 600,
        maxDiscount: 300,
        startDate: '2026-11-15',
        expiry: '2026-12-31',
        usageLimit: 100,
        used: 0,
        eligibility: 'All',
        freeDelivery: false,
        status: 'Scheduled',
    },
];

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
    if (raw.status === 'Scheduled' || raw.status === 'scheduled') {
        status = 'Scheduled';
    }
    const startDate = raw.start_date || raw.startDate || '';
    const expiry = raw.end_date || raw.endDate || raw.expiry || raw.expires_at || '';
    if (expiry && new Date(expiry) < new Date()) {
        status = 'Expired';
    } else if (startDate && new Date(startDate) > new Date()) {
        status = 'Scheduled';
    }

    // Check configured discount value fields first
    const configuredVal = raw.configured_discount_value ?? raw.configured_discount ?? raw.configuredDiscount ?? raw.configuredDiscountValue ?? raw.configured_value ?? raw.configuredValue;
    const pctVal = raw.discount_percentage ?? raw.discountPercentage ?? raw.percentage ?? raw.percent ?? raw.discount_pct ?? raw.discountPct;

    let rawVal;
    if (configuredVal !== undefined && configuredVal !== null && configuredVal !== '') {
        rawVal = configuredVal;
    } else if (type === 'Percentage') {
        rawVal = pctVal ?? raw.discount ?? raw.discount_value ?? raw.discountValue ?? (raw.discount_rate ? raw.discount_rate * 100 : null) ?? (raw.rate ? raw.rate * 100 : null) ?? raw.value ?? (rawType === 'percentage' ? null : raw.discount_amount) ?? raw.discountAmount ?? raw.amount ?? 0;
    } else {
        rawVal = raw.discount_value ?? raw.discountValue ?? raw.discount_amount ?? raw.discountAmount ?? raw.discount ?? raw.value ?? raw.amount ?? 0;
    }

    let value = Number(rawVal) || 0;
    if (type === 'Percentage' && value > 0 && value < 1) {
        value = Math.round(value * 100);
    }

    const rawMin = raw.minimum_order_amount ?? raw.minimumOrderAmount ?? raw.minOrder ?? raw.min_order_amount ?? raw.min_order ?? 0;
    const minOrder = Number(rawMin) || 0;

    const rawMax = raw.maximum_discount ?? raw.maximumDiscount ?? raw.maxDiscount ?? raw.max_discount ?? raw.max_discount_amount ?? null;
    let maxDiscount = rawMax !== null && rawMax !== undefined && rawMax !== '' ? Number(rawMax) : null;

    // Detect if code or description mentions a discount like "25% SALE"
    const text = `${raw.code || ''} ${raw.description || ''} ${raw.title || ''} ${raw.name || ''}`;
    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/i) || text.match(/(?:sale|off|save|disc)\s*(\d+)/i) || text.match(/(\d+)\s*(?:sale|off|%)/i);
    if (pctMatch) {
        const detected = Number(pctMatch[1]);
        if (detected > 0 && (value <= 1 || value < detected || text.includes('%'))) {
            value = detected;
            type = 'Percentage';
        }
    }

    // Inconsistent maxDiscount reconciliation for percentage coupons (e.g. Max Discount 1 on 25% SALE)
    if (type === 'Percentage' && maxDiscount !== null) {
        if (maxDiscount <= 1 || (value > 1 && maxDiscount < value)) {
            maxDiscount = null; // Unlimited
        }
    }

    const mapped = {
        id: raw.id || b.id || `cpn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        rawId: raw.id || b.id || null,
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

    return getReconciledCoupon(mapped);
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

// ── Modal for Bulk Generating Coupons (POST /api/v1/coupons/bulk-generate) ─────────
const BulkGenerateModal = ({ onClose, onGenerated }) => {
    const [form, setForm] = useState({
        prefix: 'FEST',
        count: 10,
        description: 'Festive season promotional single-use vouchers',
        discount_type: 'percentage',
        discount_value: 15,
        minimum_order_amount: 500,
        maximum_discount: 250,
        usage_limit: 1,
        usage_limit_per_customer: 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await bulkGenerateCoupons(form);
            setResult(res);
            if (onGenerated) onGenerated(res);
        } catch (err) {
            console.error('Error generating bulk coupons:', err);
            setError(err.message || 'Failed to bulk generate coupon codes.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAll = () => {
        const codesList = result?.coupons?.map(c => c.code) || [];
        if (codesList.length === 0) return;
        navigator.clipboard.writeText(codesList.join('\n'));
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    return (
        <div className="ec-modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>⚡</span>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                                Bulk Generate Coupons
                            </h3>
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#f5f3ff', color: '#6d28d9', padding: '2px 8px', borderRadius: 10 }}>
                                POST /coupons/bulk-generate
                            </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                            Generate batches of unique, single-use voucher codes in seconds
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {!result ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                        {error && (
                            <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="ec-form-row">
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Code Prefix *</label>
                                <input className="ec-input" placeholder="e.g. FEST, VIP, SALE" required maxLength={20}
                                    value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                                    style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }} />
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Number of Codes *</label>
                                <input className="ec-input" type="number" min={1} max={500} required
                                    value={form.count} onChange={e => setForm(f => ({ ...f, count: Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 1)) }))} />
                            </div>
                        </div>

                        <div className="ec-field">
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Description *</label>
                            <input className="ec-input" placeholder="e.g. Festive discount vouchers" required
                                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>

                        <div className="ec-form-row">
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Discount Type *</label>
                                <select className="ec-input" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (₹)</option>
                                </select>
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                                    {form.discount_type === 'percentage' ? 'Discount % *' : 'Discount Amount (₹) *'}
                                </label>
                                <input className="ec-input" type="number" min={1} required
                                    value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} />
                            </div>
                        </div>

                        <div className="ec-form-row">
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Min Order Value (₹)</label>
                                <input className="ec-input" type="number" min={1}
                                    value={form.minimum_order_amount} onChange={e => setForm(f => ({ ...f, minimum_order_amount: e.target.value }))} />
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Max Discount (₹)</label>
                                <input className="ec-input" type="number" min={1} placeholder="Optional"
                                    value={form.maximum_discount || ''} onChange={e => setForm(f => ({ ...f, maximum_discount: e.target.value }))} />
                            </div>
                        </div>

                        <div className="ec-form-row">
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Start Date *</label>
                                <input className="ec-input" type="date" required
                                    value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                            </div>
                            <div className="ec-field">
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Expiry Date *</label>
                                <input className="ec-input" type="date" required
                                    value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="adm-btn-primary" style={{ flex: 1.5, justifyContent: 'center', background: '#7c3aed' }} disabled={loading}>
                                {loading ? 'Generating…' : `⚡ Generate ${form.count} Vouchers`}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                        <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6d28d9', fontWeight: 800, fontSize: 14 }}>
                                <span>🎉</span>
                                <span>{result.message || `Successfully generated ${result.generated_count || result.coupons?.length || 0} unique vouchers!`}</span>
                            </div>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                                Prefix: <strong>{form.prefix}</strong> · {form.discount_type === 'percentage' ? `${form.discount_value}% Off` : `₹${form.discount_value} Off`}
                            </p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Generated Codes ({result.coupons?.length || 0})</span>
                                <button
                                    type="button"
                                    onClick={handleCopyAll}
                                    style={{
                                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: '#f3f4f6', border: '1px solid #d1d5db', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 4, color: '#374151',
                                    }}>
                                    {copiedAll ? <BsCheck2 size={12} color="#16a34a" /> : <BsClipboard size={12} />}
                                    <span>{copiedAll ? 'Copied All!' : 'Copy All Codes'}</span>
                                </button>
                            </div>
                            <div style={{
                                maxHeight: 220, overflowY: 'auto', background: '#0f172a', borderRadius: 8,
                                padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8,
                            }}>
                                {(result.coupons || []).map((cpn, idx) => (
                                    <div key={idx} style={{
                                        background: '#1e293b', color: '#38bdf8', fontFamily: 'monospace',
                                        fontWeight: 700, fontSize: 12, padding: '6px 8px', borderRadius: 4, textAlign: 'center',
                                        letterSpacing: 0.5, border: '1px solid #334155',
                                    }}>
                                        {cpn.code || cpn}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => setResult(null)}>
                                Generate More
                            </button>
                            <button
                                type="button"
                                className="adm-btn-primary"
                                style={{ flex: 1, justifyContent: 'center', background: '#10b981' }}
                                onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Modal for Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions) ────
const CouponRedemptionsModal = ({ coupon, onClose }) => {
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const couponId = coupon?.rawId || coupon?.id;

    const fetchRedemptions = async () => {
        if (!couponId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getCouponRedemptions(couponId);
            const list = Array.isArray(data) ? data : (data?.data || data?.items || data?.redemptions || []);
            setRedemptions(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error('Error fetching coupon redemptions:', err);
            setError(err.message || 'Failed to fetch customer redemptions.');
            setRedemptions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRedemptions();
    }, [couponId]);

    return (
        <div className="ec-modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🎟️</span>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                                Customer Redemptions · {coupon?.code}
                            </h3>
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10 }}>
                                GET /redemptions
                            </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                            Customer transactions where coupon <strong>{coupon?.code}</strong> was successfully redeemed
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ marginTop: 14 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 13 }}>
                            <p>Loading customer redemptions…</p>
                        </div>
                    ) : error ? (
                        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '12px 14px', borderRadius: 8, fontSize: 13 }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
                                (If no redemptions have been recorded yet on the database, this coupon has 0 transactions)
                            </p>
                        </div>
                    ) : redemptions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
                            <BsTicketPerforated size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <p style={{ fontWeight: 600, color: '#374151' }}>No Customer Redemptions Yet</p>
                            <p style={{ fontSize: 12, color: '#9ca3af' }}>This coupon code has not been redeemed on any orders.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>#</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Order ID</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Customer</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Order Amount</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Discount</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Redeemed At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {redemptions.map((r, i) => (
                                        <tr key={r.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 12px', color: '#9ca3af', fontFamily: 'monospace' }}>{r.id || i + 1}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827' }}>
                                                {r.order_id ? `#ORD-${r.order_id}` : '--'}
                                            </td>
                                            <td style={{ padding: '8px 12px', color: '#4b5563' }}>
                                                {r.customer_phone || (r.customer_id ? `Cust #${r.customer_id}` : 'Walk-in Customer')}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#374151' }}>
                                                ₹{Number(r.order_amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                -₹{Number(r.discount_amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280', fontSize: 11 }}>
                                                {r.redeemed_at ? new Date(r.redeemed_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                        Total redemptions: <strong>{redemptions.length}</strong>
                    </span>
                    <button className="adm-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal for Exporting Coupons Report (GET /api/v1/coupons/export) ─────────────────
const ExportCouponsModal = ({ onClose, onExportSuccess }) => {
    const [format, setFormat] = useState('excel'); // 'excel' | 'csv' | 'pdf'
    const [status, setStatus] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleExport = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await exportCoupons({ format, status: status === 'all' ? undefined : status });
            const a = document.createElement('a');
            a.href = res.url;
            a.download = res.filename;
            a.click();
            setTimeout(() => window.URL.revokeObjectURL(res.url), 1000);
            if (onExportSuccess) onExportSuccess(`Exported ${format.toUpperCase()} report successfully!`);
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
            setError(err.message || 'Failed to export coupons report.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ec-modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>📊</span>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                                Export Coupons Report
                            </h3>
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: 10 }}>
                                GET /export
                            </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                            Download complete coupons audit report in Excel, CSV, or PDF
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                    {error && (
                        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="ec-field">
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Select File Format *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                            {[
                                { id: 'excel', label: 'Excel (.xlsx)', icon: <BsFileEarmarkSpreadsheet size={16} /> },
                                { id: 'csv', label: 'CSV (.csv)', icon: '📄' },
                                { id: 'pdf', label: 'PDF (.pdf)', icon: <BsFileEarmarkPdf size={16} /> },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFormat(f.id)}
                                    style={{
                                        padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        border: `1.5px solid ${format === f.id ? '#4f46e5' : '#e2e8f0'}`,
                                        background: format === f.id ? '#eef2ff' : '#fff',
                                        color: format === f.id ? '#4f46e5' : '#475569',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                    }}>
                                    <span>{f.icon}</span>
                                    <span>{f.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="ec-field">
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Filter by Status</label>
                        <select className="ec-input" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="all">All Coupons</option>
                            <option value="active">Active Coupons</option>
                            <option value="expired">Expired Coupons</option>
                            <option value="inactive">Inactive Coupons</option>
                            <option value="scheduled">Scheduled Coupons</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="button" className="adm-btn-primary" style={{ flex: 1.5, justifyContent: 'center' }} onClick={handleExport} disabled={loading}>
                            {loading ? 'Exporting…' : `⬇️ Download ${format.toUpperCase()}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Modal for Applicable & Locked Recommendations (GET /api/v1/coupons/applicable) ──
const ApplicableCouponsModal = ({ onClose, onApplyToTest }) => {
    const [amount, setAmount] = useState('500');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const handleFetch = async (e) => {
        if (e) e.preventDefault();
        const numAmt = Number(amount);
        if (!numAmt || numAmt <= 0) {
            setError('Please enter a valid cart amount greater than 0.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getApplicableCoupons({
                order_amount: numAmt,
                ...(phone.trim() ? { customer_phone: phone.trim() } : {}),
            });
            setData(res);
        } catch (err) {
            console.error('Error fetching applicable coupons:', err);
            setError(err.message || 'Failed to fetch applicable coupon recommendations.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleFetch();
    }, []);

    const applicableList = data?.applicable_coupons || [];
    const lockedList = data?.locked_coupons || [];

    return (
        <div className="ec-modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🎯</span>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                                Applicable & Locked Coupons
                            </h3>
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10 }}>
                                GET /applicable
                            </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                            Smart recommendations for current cart value, including unlockable offers
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Amount Filter Bar */}
                <form onSubmit={handleFetch} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 14 }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                            Cart / Order Amount (₹) *
                        </label>
                        <input
                            className="ec-input"
                            type="number"
                            min="1"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="e.g. 500"
                            required
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                            Customer Phone (Optional)
                        </label>
                        <input
                            className="ec-input"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 9876543210"
                        />
                    </div>
                    <button
                        type="submit"
                        className="adm-btn-primary"
                        disabled={loading}
                        style={{ height: 38, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BsSearch size={12} /> {loading ? 'Checking…' : 'Find'}
                    </button>
                </form>

                {error && (
                    <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 12 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Results */}
                <div style={{ marginTop: 16 }}>
                    {/* Applicable (Unlocked) */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <BsUnlockFill size={14} color="#16a34a" />
                            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Applicable Coupons ({applicableList.length})
                            </h4>
                        </div>
                        {applicableList.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#9ca3af', background: '#f9fafb', padding: '12px 14px', borderRadius: 8 }}>
                                No coupons are currently applicable for ₹{amount || 0}. Add items to unlock coupons below!
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {applicableList.map((c, i) => (
                                    <div key={i} style={{
                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8,
                                        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#166534', letterSpacing: 1 }}>
                                                    {c.code || c.coupon_code}
                                                </span>
                                                <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4 }}>
                                                    Ready to Apply
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 11, color: '#4b5563', margin: '3px 0 0' }}>
                                                {c.description || (c.discount_type === 'percentage' ? `${c.discount_value}% Discount` : `₹${c.discount_value} Flat Off`)}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 14, fontWeight: 800, color: '#15803d', margin: 0 }}>
                                                {c.discount_amount ? `Save ₹${c.discount_amount}` : (c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`)}
                                            </p>
                                            {onApplyToTest && (
                                                <button
                                                    type="button"
                                                    onClick={() => onApplyToTest(c.code || c.coupon_code, amount)}
                                                    style={{
                                                        marginTop: 4, padding: '2px 8px', borderRadius: 4, fontSize: 10,
                                                        fontWeight: 700, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer',
                                                    }}>
                                                    Test Apply
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Locked (Requires higher cart) */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <BsLockFill size={14} color="#f59e0b" />
                            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#b45309', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Locked Coupons ({lockedList.length})
                            </h4>
                        </div>
                        {lockedList.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#9ca3af', background: '#f9fafb', padding: '12px 14px', borderRadius: 8 }}>
                                No locked coupons for this cart amount.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {lockedList.map((c, i) => {
                                    const minRequired = Number(c.minimum_order_amount || c.min_order_amount || 0);
                                    const diff = minRequired > Number(amount) ? minRequired - Number(amount) : 0;
                                    return (
                                        <div key={i} style={{
                                            background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8,
                                            padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#92400e', letterSpacing: 1 }}>
                                                        {c.code || c.coupon_code}
                                                    </span>
                                                    <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4 }}>
                                                        Locked
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: 11, color: '#78350f', margin: '3px 0 0' }}>
                                                    {c.description || (c.discount_type === 'percentage' ? `${c.discount_value}% Discount` : `₹${c.discount_value} Flat Off`)}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                                                    {diff > 0 ? `Add ₹${diff} more` : `Min ₹${minRequired}`}
                                                </span>
                                                <p style={{ fontSize: 10, color: '#92400e', margin: '2px 0 0' }}>
                                                    to unlock
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12, textAlign: 'right' }}>
                    <button type="button" className="adm-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Embedded Recommendations View for 'applicable' Tab (GET /api/v1/coupons/applicable) ──
const ApplicableRecommendationsView = ({ onApplyToTest, coupons = [] }) => {
    const [amount, setAmount] = useState('500');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const handleFetch = async (amtVal, phoneVal) => {
        const curAmt = amtVal !== undefined ? Number(amtVal) : Number(amount);
        const curPhone = phoneVal !== undefined ? phoneVal : phone;
        if (!curAmt || curAmt <= 0) {
            setError('Please enter a valid cart amount greater than 0.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await getApplicableCoupons({
                order_amount: curAmt,
                ...(curPhone && curPhone.trim() ? { customer_phone: curPhone.trim() } : {}),
            });
            setData(res);
        } catch (err) {
            console.warn('Backend applicable fetch fallback to local coupons:', err);
            const num = Number(curAmt);
            const activeList = coupons.filter(c => c.status === 'Active');
            const applicable = activeList.filter(c => !c.minOrder || num >= Number(c.minOrder));
            const locked = activeList.filter(c => c.minOrder && num < Number(c.minOrder));
            setData({
                order_amount: num,
                applicable_coupons: applicable.map(c => ({
                    code: c.code,
                    description: c.description,
                    discount_type: String(c.type).toLowerCase() === 'fixed' ? 'fixed' : 'percentage',
                    discount_value: c.value,
                    discount_amount: String(c.type).toLowerCase() === 'percentage' ? Math.round((num * Number(c.value)) / 100) : Number(c.value),
                    minimum_order_amount: c.minOrder,
                })),
                locked_coupons: locked.map(c => ({
                    code: c.code,
                    description: c.description,
                    discount_type: String(c.type).toLowerCase() === 'fixed' ? 'fixed' : 'percentage',
                    discount_value: c.value,
                    minimum_order_amount: c.minOrder,
                })),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleFetch('500', '');
    }, []);

    const presets = [250, 500, 1000, 2500, 5000];
    const applicableList = data?.applicable_coupons || [];
    const lockedList = data?.locked_coupons || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #e0e7ff 100%)',
                border: '1.5px solid #c7d2fe',
                borderRadius: 14,
                padding: '20px 24px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 24 }}>🎯</span>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                                Smart Cart Recommendations & Locked Coupon Unlocker
                            </h3>
                            <span style={{ fontSize: 11, fontWeight: 700, background: '#4338ca', color: '#fff', padding: '2px 8px', borderRadius: 12 }}>
                                GET /api/v1/coupons/applicable
                            </span>
                        </div>
                        <p style={{ fontSize: 13, color: '#4338ca', margin: '4px 0 0' }}>
                            Simulate customer cart totals to see which discounts apply instantly and how much more cart value is needed to unlock high-tier savings.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 16 }}>
                    <div style={{ minWidth: 200, flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#312e81', display: 'block', marginBottom: 4 }}>
                            Cart / Order Amount (₹) *
                        </label>
                        <input
                            className="ec-input"
                            type="number"
                            min="1"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="e.g. 1000"
                            style={{ background: '#fff', fontWeight: 700 }}
                        />
                    </div>
                    <div style={{ minWidth: 200, flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#312e81', display: 'block', marginBottom: 4 }}>
                            Customer Phone (Optional)
                        </label>
                        <input
                            className="ec-input"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 9876543210"
                            style={{ background: '#fff' }}
                        />
                    </div>
                    <button
                        type="button"
                        className="adm-btn-primary"
                        onClick={() => handleFetch(amount, phone)}
                        disabled={loading}
                        style={{ height: 40, padding: '0 20px', background: '#4338ca' }}
                    >
                        {loading ? 'Analyzing…' : '🔍 Find Applicable'}
                    </button>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>Quick Presets:</span>
                    {presets.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => { setAmount(String(p)); handleFetch(String(p), phone); }}
                            style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                border: Number(amount) === p ? '1.5px solid #4338ca' : '1px solid #c7d2fe',
                                background: Number(amount) === p ? '#4338ca' : '#fff',
                                color: Number(amount) === p ? '#fff' : '#3730a3',
                                transition: 'all 0.15s',
                            }}
                        >
                            ₹{p.toLocaleString('en-IN')}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Split View: Applicable vs Locked */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                {/* 🔓 Applicable Coupons */}
                <div style={{ background: '#fff', border: '1.5px solid #86efac', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid #f0fdf4', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BsUnlockFill size={15} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#15803d', margin: 0 }}>
                                    Ready to Apply ({applicableList.length})
                                </h4>
                                <span style={{ fontSize: 11, color: '#65a30d' }}>Eligible for cart value ₹{amount || 0}</span>
                            </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 20 }}>
                            ACTIVE NOW
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 13 }}>Analyzing eligible coupons…</div>
                    ) : applicableList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 36, color: '#9ca3af', fontSize: 13 }}>
                            <p style={{ fontWeight: 600, color: '#374151' }}>No coupons apply directly at ₹{amount || 0}</p>
                            <p style={{ fontSize: 12 }}>Check the locked coupons on the right to see what amount unlocks them!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {applicableList.map((c, i) => (
                                <div key={i} style={{
                                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                                    padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#166534', letterSpacing: 1 }}>
                                                {c.code || c.coupon_code}
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4 }}>
                                                UNLOCKED
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 12, color: '#374151', margin: '4px 0 0' }}>
                                            {c.description || (c.discount_type === 'percentage' ? `${c.discount_value}% Discount` : `₹${c.discount_value} Flat Off`)}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 15, fontWeight: 800, color: '#15803d', margin: 0 }}>
                                            {c.discount_amount ? `Save ₹${c.discount_amount}` : (c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => onApplyToTest && onApplyToTest(c.code || c.coupon_code, amount)}
                                            style={{
                                                marginTop: 6, padding: '4px 10px', borderRadius: 6, fontSize: 11,
                                                fontWeight: 700, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer',
                                            }}
                                        >
                                            Simulate Apply →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 🔒 Locked Coupons */}
                <div style={{ background: '#fff', border: '1.5px solid #fde68a', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid #fffbeb', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BsLockFill size={15} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#b45309', margin: 0 }}>
                                    Locked Offers ({lockedList.length})
                                </h4>
                                <span style={{ fontSize: 11, color: '#b45309' }}>Requires higher cart minimum</span>
                            </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 20 }}>
                            UPSELL TARGETS
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 13 }}>Analyzing unlockable offers…</div>
                    ) : lockedList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 36, color: '#9ca3af', fontSize: 13 }}>
                            <p style={{ fontWeight: 600, color: '#374151' }}>No locked offers for cart ₹{amount || 0}</p>
                            <p style={{ fontSize: 12 }}>All active store promotions are either unlocked or order limit met.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {lockedList.map((c, i) => {
                                const minRequired = Number(c.minimum_order_amount || c.min_order_amount || 0);
                                const diff = minRequired > Number(amount) ? minRequired - Number(amount) : 0;
                                return (
                                    <div key={i} style={{
                                        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                                        padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#92400e', letterSpacing: 1 }}>
                                                    {c.code || c.coupon_code}
                                                </span>
                                                <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4 }}>
                                                    LOCKED
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#78350f', margin: '4px 0 0' }}>
                                                {c.description || (c.discount_type === 'percentage' ? `${c.discount_value}% Discount` : `₹${c.discount_value} Flat Off`)}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>
                                                {diff > 0 ? `+ Add ₹${diff.toLocaleString('en-IN')} more` : `Min ₹${minRequired.toLocaleString('en-IN')}`}
                                            </span>
                                            <p style={{ fontSize: 11, color: '#92400e', margin: '2px 0 0' }}>to unlock</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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

    // Modals for the 6 backend APIs
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showApplicableModal, setShowApplicableModal] = useState(false);
    const [redemptionCoupon, setRedemptionCoupon] = useState(null);
    const [exportSuccessBanner, setExportSuccessBanner] = useState(null);

    const syncLocalStorage = (list) => {
        try {
            localStorage.setItem('retail_os_coupons', JSON.stringify(list));
        } catch (_) { }
    };

    const loadLocalCoupons = () => {
        try {
            const stored = localStorage.getItem('retail_os_coupons');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(mapBackendToFrontend);
                }
            }
        } catch (_) { }
        return DEFAULT_COUPONS.map(mapBackendToFrontend);
    };

    const fetchCoupons = () => {
        let active = true;
        setLoading(true);
        setError('');
        getCoupons()
            .then(data => {
                if (active) {
                    setApiAvailable(true);
                    const arr = Array.isArray(data) ? data : (data.items || data.data || []);
                    if (arr.length > 0) {
                        const mappedList = arr.map(mapBackendToFrontend);
                        setCoupons(mappedList);
                        syncLocalStorage(mappedList);
                    } else {
                        const local = loadLocalCoupons();
                        setCoupons(local);
                    }
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
                    const local = loadLocalCoupons();
                    setCoupons(local);
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
                    if (arr.length > 0) {
                        setActiveCoupons(arr.map(mapBackendToFrontend));
                    } else {
                        setActiveCoupons(coupons.filter(c => c.status === 'Active').map(getReconciledCoupon));
                    }
                }
            })
            .catch(err => {
                console.error('[CouponManagement] Active coupons error (may be 404 if not deployed):', err);
                if (alive) {
                    setActiveCoupons(coupons.filter(c => c.status === 'Active').map(getReconciledCoupon));
                }
            })
            .finally(() => { if (alive) setActiveLoading(false); });
        return () => { alive = false; };
    }, [activeTab, coupons]);

    // Fetch expired coupons from dedicated endpoint
    useEffect(() => {
        let alive = true;
        if (activeTab !== 'expired') return;
        setExpiredLoading(true);
        getExpiredCoupons()
            .then(data => {
                if (alive) {
                    const arr = Array.isArray(data) ? data : (data.items || data.data || []);
                    if (arr.length > 0) {
                        setExpiredCoupons(arr.map(mapBackendToFrontend));
                    } else {
                        setExpiredCoupons(coupons.filter(c => c.status === 'Expired' || (c.expiry && new Date(c.expiry) < new Date())).map(getReconciledCoupon));
                    }
                }
            })
            .catch(err => {
                console.error('[CouponManagement] Expired coupons error (may be 404 if not deployed):', err);
                if (alive) {
                    setExpiredCoupons(coupons.filter(c => c.status === 'Expired' || (c.expiry && new Date(c.expiry) < new Date())).map(getReconciledCoupon));
                }
            })
            .finally(() => { if (alive) setExpiredLoading(false); });
        return () => { alive = false; };
    }, [activeTab, coupons]);

    const filtered = coupons.map(getReconciledCoupon).filter(c => {
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
            const reconciledC = getReconciledCoupon(c);
            setEditCoupon(reconciledC);
            setForm({
                ...reconciledC,
                maxDiscount: reconciledC.maxDiscount ?? '',
            });
            setShowModal(true);

            // Fetch latest from backend and merge safely
            try {
                const data = await getCoupon(c.id);
                const rawItem = data?.data || data?.coupon || (data?.id ? data : null);
                if (rawItem) {
                    const front = getReconciledCoupon({ ...c, ...mapBackendToFrontend(rawItem) });
                    setEditCoupon(front);
                    setForm({
                        ...front,
                        maxDiscount: front.maxDiscount ?? '',
                    });
                }
            } catch (fetchErr) {
                console.warn('[CouponManagement] Backend single fetch fallback to item:', fetchErr);
            }
        } catch (err) {
            console.error('[CouponManagement] Fetch single error:', err);
            const reconciledC = getReconciledCoupon(c);
            setEditCoupon(reconciledC);
            setForm({
                ...reconciledC,
                maxDiscount: reconciledC.maxDiscount ?? '',
            });
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
                try {
                    const response = await updateCoupon(editCoupon.id, payload);
                    const rawUpdated = response?.data || response?.coupon || (response?.id ? response : null);
                    const updated = mapBackendToFrontend({
                        ...editCoupon,
                        ...payload,
                        ...(rawUpdated || {})
                    });
                    setCoupons(prev => {
                        const next = prev.map(c => c.id === editCoupon.id ? updated : c);
                        syncLocalStorage(next);
                        return next;
                    });
                } catch (apiErr) {
                    if (!apiAvailable || (apiErr.message && (apiErr.message.includes('404') || apiErr.message.includes('Not Found')))) {
                        const updated = mapBackendToFrontend({ ...editCoupon, ...payload });
                        setCoupons(prev => {
                            const next = prev.map(c => c.id === editCoupon.id ? updated : c);
                            syncLocalStorage(next);
                            return next;
                        });
                    } else {
                        throw apiErr;
                    }
                }
            } else {
                try {
                    const response = await createCoupon(payload);
                    const rawCreated = response?.data || response?.coupon || (response?.id ? response : null);
                    const created = mapBackendToFrontend({
                        ...payload,
                        ...(rawCreated || {})
                    });
                    setCoupons(prev => {
                        const next = [created, ...prev];
                        syncLocalStorage(next);
                        return next;
                    });
                } catch (apiErr) {
                    if (!apiAvailable || (apiErr.message && (apiErr.message.includes('404') || apiErr.message.includes('Not Found')))) {
                        const created = mapBackendToFrontend({ ...payload, id: `cpn-${Date.now()}` });
                        setCoupons(prev => {
                            const next = [created, ...prev];
                            syncLocalStorage(next);
                            return next;
                        });
                    } else {
                        throw apiErr;
                    }
                }
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
        } catch (err) {
            console.warn('[CouponManagement] Delete API warning (may be offline):', err);
        } finally {
            setCoupons(prev => {
                const next = prev.filter(c => c.id !== id);
                syncLocalStorage(next);
                return next;
            });
            setLoading(false);
            // Refresh stats silently after delete
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
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
            setCoupons(prev => {
                const next = prev.map(c => c.id === id ? updated : c);
                syncLocalStorage(next);
                return next;
            });
        } catch (err) {
            console.warn('[CouponManagement] Toggle status API warning (may be offline):', err);
            const updated = {
                ...target,
                status: newStatus,
                is_active: newStatus === 'Active',
            };
            setCoupons(prev => {
                const next = prev.map(c => c.id === id ? updated : c);
                syncLocalStorage(next);
                return next;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id) => {
        setActivatingId(id);
        try {
            const response = await activateCoupon(id);
            const updated = mapBackendToFrontend(response);
            setCoupons(prev => {
                const next = prev.map(c => c.id === id ? updated : c);
                syncLocalStorage(next);
                return next;
            });
            setExpiredCoupons(prev => prev.filter(c => c.id !== id));
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
        } catch (err) {
            console.warn('[CouponManagement] Activate warning (may be offline):', err);
            setCoupons(prev => {
                const next = prev.map(c => c.id === id ? { ...c, status: 'Active' } : c);
                syncLocalStorage(next);
                return next;
            });
            setExpiredCoupons(prev => prev.filter(c => c.id !== id));
        } finally {
            setActivatingId(null);
        }
    };

    const handleDeactivate = async (id) => {
        setDeactivatingId(id);
        try {
            const response = await deactivateCoupon(id);
            const updated = mapBackendToFrontend(response);
            setCoupons(prev => {
                const next = prev.map(c => c.id === id ? updated : c);
                syncLocalStorage(next);
                return next;
            });
            setActiveCoupons(prev => prev.filter(c => c.id !== id));
            getCouponStats()
                .then(data => setApiStats(data))
                .catch(() => { });
        } catch (err) {
            console.warn('[CouponManagement] Deactivate warning (may be offline):', err);
            setCoupons(prev => {
                const next = prev.map(c => c.id === id ? { ...c, status: 'Inactive' } : c);
                syncLocalStorage(next);
                return next;
            });
            setActiveCoupons(prev => prev.filter(c => c.id !== id));
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
            const rawMatched = coupons.find(c => String(c.code).toUpperCase() === code);
            const matched = rawMatched ? getReconciledCoupon(rawMatched) : null;
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
            const rawMatched = coupons.find(c => String(c.code).toUpperCase() === code);
            const matched = rawMatched ? getReconciledCoupon(rawMatched) : null;
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
    const scheduledCouponsCount = apiStats?.scheduled_coupons ?? coupons.filter(c => {
        if (c.status === 'Scheduled') return true;
        if (c.startDate) {
            const start = new Date(c.startDate);
            const now = new Date();
            if (!isNaN(start.getTime()) && start > now) return true;
        }
        return false;
    }).length;

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
            label: 'Scheduled Coupons',
            value: statsLoading ? '—' : scheduledCouponsCount,
            color: '#0ea5e9',
            icon: '📅',
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
                    <h1 className="adm-page-title">🏷️ Coupons</h1>
                    <p className="adm-page-sub">Create and manage discount coupons for your online store</p>
                </div>
                <div className="adm-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="adm-btn-secondary" onClick={() => setShowApplicableModal(true)} title="Get applicable and locked coupon recommendations for cart amount (GET /api/v1/coupons/applicable)">
                        🎯 Applicable Finder
                    </button>
                    <button className="adm-btn-secondary" onClick={() => setShowExportModal(true)} title="Export coupons report to Excel, CSV or PDF (GET /api/v1/coupons/export)">
                        <BsDownload size={13} /> Export Report
                    </button>
                    <button className="adm-btn-secondary" style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }} onClick={() => setShowBulkModal(true)} title="Bulk generate unique single-use coupon codes (POST /api/v1/coupons/bulk-generate)">
                        <BsLightningFill size={13} color="#7c3aed" /> ⚡ Bulk Generate
                    </button>
                    <button className="adm-btn-secondary" onClick={() => { setShowTestModal(true); setTestResult(null); setTestForm({ code: '', amount: '' }); }} title="Validate & Apply coupon (POST /coupons/validate & /apply)">
                        🧪 Test / Validate
                    </button>
                    <button className="adm-btn-primary" onClick={openAdd}>
                        <BsPlus size={17} /> New Coupon
                    </button>
                </div>
            </div>

            {/* Export Success Banner */}
            {exportSuccessBanner && (
                <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✅ {exportSuccessBanner}</span>
                    <button onClick={() => setExportSuccessBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857', fontWeight: 700 }}>✕</button>
                </div>
            )}

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
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
                    { id: 'applicable', label: '🎯 Cart Recommendations' },
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
                                const rc = getReconciledCoupon(c);
                                const tc = typeConfig[rc.type] || typeConfig['Percentage'];
                                const usagePct = rc.usageLimit > 0 ? Math.min(100, Math.round((rc.used / rc.usageLimit) * 100)) : 0;
                                return (
                                    <div key={c.id} className="ec-coupon-card">
                                        <div className="ec-coupon-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {tc.icon}
                                                </div>
                                                <div>
                                                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#111827', letterSpacing: 1 }}>{rc.code}</p>
                                                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{rc.type}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button
                                                    onClick={() => setRedemptionCoupon(c)}
                                                    title="View Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions)"
                                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 7px', borderRadius: 6, cursor: 'pointer', color: '#1d4ed8', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <BsTicketPerforated size={12} />
                                                </button>
                                                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#10b981' }}>Active</span>
                                            </div>
                                        </div>

                                        <div className="ec-coupon-value">
                                            {rc.type === 'Percentage' && <>{rc.value}% OFF</>}
                                            {rc.type === 'Fixed' && <>₹{rc.value} OFF</>}
                                            {rc.type === 'Free Delivery' && <>Free Delivery</>}
                                        </div>

                                        {rc.description && (
                                            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, fontStyle: 'italic' }}>{rc.description}</p>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                            {[
                                                { label: 'Min Order', value: rc.minOrder > 0 ? fmt(rc.minOrder) : 'No min' },
                                                { label: 'Max Discount', value: rc.maxDiscount ? fmt(rc.maxDiscount) : 'Unlimited' },
                                                { label: 'Usage Limit', value: rc.usageLimit },
                                                { label: 'Expires', value: rc.expiry ? new Date(rc.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
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
                                                <span style={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>{rc.used} / {rc.usageLimit}</span>
                                            </div>
                                            <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: usagePct >= 90 ? '#ef4444' : '#10b981', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>

                                        {/* Action buttons: Redemptions, Test, Deactivate */}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            <button
                                                onClick={() => setRedemptionCoupon(c)}
                                                style={{
                                                    flex: 1, padding: '8px 4px', borderRadius: 8, border: '1.5px solid #dbeafe',
                                                    background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    transition: 'all 0.2s',
                                                }}
                                                title="View Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions)"
                                            >
                                                <BsTicketPerforated size={13} /> Redemptions
                                            </button>
                                            <button
                                                onClick={() => { setShowTestModal(true); setTestResult(null); setTestForm({ code: rc.code, amount: rc.minOrder || '500' }); }}
                                                style={{
                                                    padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                                    background: '#f8fafc', color: '#334155', fontWeight: 700, fontSize: 12,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                }}
                                                title="Validate or Simulate Apply this coupon"
                                            >
                                                🧪 Test
                                            </button>
                                            <button
                                                onClick={() => handleDeactivate(c.id)}
                                                disabled={deactivatingId === c.id}
                                                style={{
                                                    flex: 1.2, padding: '8px 0', borderRadius: 8, border: 'none',
                                                    background: deactivatingId === c.id ? '#fee2e2' : '#ef4444',
                                                    color: '#fff', fontWeight: 700, fontSize: 12,
                                                    cursor: deactivatingId === c.id ? 'not-allowed' : 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    transition: 'background 0.2s',
                                                }}
                                            >
                                                {deactivatingId === c.id ? 'Deactivating...' : 'Deactivate'}
                                            </button>
                                        </div>
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
                                const rc = getReconciledCoupon(c);
                                const tc = typeConfig[rc.type] || typeConfig['Percentage'];
                                const usagePct = rc.usageLimit > 0 ? Math.min(100, Math.round((rc.used / rc.usageLimit) * 100)) : 0;
                                return (
                                    <div key={c.id} className="ec-coupon-card" style={{ opacity: 0.75, borderLeft: '3px solid #ef4444' }}>
                                        <div className="ec-coupon-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <BsClockHistory size={14} />
                                                </div>
                                                <div>
                                                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#6b7280', letterSpacing: 1, textDecoration: 'line-through' }}>{rc.code}</p>
                                                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{rc.type}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button
                                                    onClick={() => setRedemptionCoupon(c)}
                                                    title="View Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions)"
                                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 7px', borderRadius: 6, cursor: 'pointer', color: '#1d4ed8', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <BsTicketPerforated size={12} />
                                                </button>
                                                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#ef4444' }}>Expired</span>
                                            </div>
                                        </div>

                                        <div className="ec-coupon-value" style={{ color: '#9ca3af' }}>
                                            {rc.type === 'Percentage' && <>{rc.value}% OFF</>}
                                            {rc.type === 'Fixed' && <>₹{rc.value} OFF</>}
                                            {rc.type === 'Free Delivery' && <>Free Delivery</>}
                                        </div>

                                        {rc.description && (
                                            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, fontStyle: 'italic' }}>{rc.description}</p>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                            {[
                                                { label: 'Min Order', value: rc.minOrder > 0 ? fmt(rc.minOrder) : 'No min' },
                                                { label: 'Max Discount', value: rc.maxDiscount ? fmt(rc.maxDiscount) : 'Unlimited' },
                                                { label: 'Usage Limit', value: rc.usageLimit },
                                                { label: 'Expired On', value: rc.expiry ? new Date(rc.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
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
                                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>{rc.used} / {rc.usageLimit}</span>
                                            </div>
                                            <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: '#ef4444', transition: 'width 0.5s' }} />
                                            </div>
                                        </div>

                                        {/* Action buttons: Redemptions and Re-activate */}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            <button
                                                onClick={() => setRedemptionCoupon(c)}
                                                style={{
                                                    flex: 1, padding: '8px 4px', borderRadius: 8, border: '1.5px solid #dbeafe',
                                                    background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    transition: 'all 0.2s',
                                                }}
                                                title="View Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions)"
                                            >
                                                <BsTicketPerforated size={13} /> Redemptions
                                            </button>
                                            <button
                                                onClick={() => handleActivate(c.id)}
                                                disabled={activatingId === c.id}
                                                style={{
                                                    flex: 1.5, padding: '8px 0', borderRadius: 8, border: 'none',
                                                    background: activatingId === c.id ? '#d1fae5' : '#10b981',
                                                    color: '#fff', fontWeight: 700, fontSize: 12,
                                                    cursor: activatingId === c.id ? 'not-allowed' : 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    transition: 'background 0.2s',
                                                }}
                                            >
                                                {activatingId === c.id ? 'Activating…' : '⚡ Re-activate'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Cart Recommendations panel ── */}
            {activeTab === 'applicable' && (
                <ApplicableRecommendationsView
                    coupons={coupons}
                    onApplyToTest={(code, amt) => {
                        setShowTestModal(true);
                        setTestResult(null);
                        setTestForm({ code, amount: amt });
                    }}
                />
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
                            <option>Scheduled</option>
                            <option>Inactive</option>
                            <option>Expired</option>
                        </select>
                    </div>

                    {/* Coupons Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                        {filtered.map(c => {
                            const rc = getReconciledCoupon(c);
                            const tc = typeConfig[rc.type] || typeConfig['Percentage'];
                            const usagePct = rc.usageLimit > 0 ? Math.min(100, Math.round((rc.used / rc.usageLimit) * 100)) : 0;
                            const isExpired = rc.status === 'Expired' || new Date(rc.expiry) < new Date();
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
                                                        {showCode[c.id] ? rc.code : rc.code.slice(0, 3) + '•'.repeat(Math.max(0, rc.code.length - 3))}
                                                    </p>
                                                    <button onClick={() => setShowCode(p => ({ ...p, [c.id]: !p[c.id] }))}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                                        {showCode[c.id] ? <BsEyeSlash size={13} /> : <BsEye size={13} />}
                                                    </button>
                                                </div>
                                                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>{rc.type}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <button
                                                onClick={() => setRedemptionCoupon(c)}
                                                title="View Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions)"
                                                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', color: '#1d4ed8', display: 'flex', alignItems: 'center' }}
                                            >
                                                <BsTicketPerforated size={11} />
                                            </button>
                                            <button onClick={() => openEdit(c)} style={{ background: '#f3f4f6', border: 'none', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                                                <BsPencilFill size={11} />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} style={{ background: '#fef2f2', border: 'none', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                                <BsTrashFill size={11} />
                                            </button>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                background: rc.status === 'Active' ? '#ecfdf5' : rc.status === 'Scheduled' ? '#f0f9ff' : rc.status === 'Expired' ? '#fef2f2' : '#f9fafb',
                                                color: rc.status === 'Active' ? '#10b981' : rc.status === 'Scheduled' ? '#0ea5e9' : rc.status === 'Expired' ? '#ef4444' : '#6b7280',
                                            }}>{rc.status}</span>
                                        </div>
                                    </div>

                                    <div className="ec-coupon-value">
                                        {rc.type === 'Percentage' && <>{rc.value}% OFF</>}
                                        {rc.type === 'Fixed' && <>₹{rc.value} OFF</>}
                                        {rc.type === 'Free Delivery' && <>Free Delivery</>}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                        {[
                                            { label: 'Min Order', value: rc.minOrder > 0 ? fmt(rc.minOrder) : 'No min' },
                                            { label: 'Max Discount', value: rc.maxDiscount ? fmt(rc.maxDiscount) : 'Unlimited' },
                                            { label: 'Eligibility', value: rc.eligibility },
                                            { label: 'Expires', value: new Date(rc.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
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
                                            <span style={{ fontSize: 11, color: '#374151', fontWeight: 700 }}>{rc.used} / {rc.usageLimit === 1 ? '1 (per user)' : rc.usageLimit}</span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 10, background: usagePct >= 90 ? '#ef4444' : '#6366f1', transition: 'width 0.5s' }} />
                                        </div>
                                    </div>

                                    {/* Action buttons: Redemptions, Test, Activate/Deactivate */}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                        <button
                                            onClick={() => setRedemptionCoupon(c)}
                                            style={{
                                                flex: 1, padding: '7px 4px', borderRadius: 8, border: '1.5px solid #dbeafe',
                                                background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                transition: 'all 0.2s',
                                            }}
                                            title="View Customer Redemptions (GET /api/v1/coupons/{coupon_id}/redemptions)"
                                        >
                                            <BsTicketPerforated size={12} /> Redemptions
                                        </button>
                                        <button
                                            onClick={() => { setShowTestModal(true); setTestResult(null); setTestForm({ code: rc.code, amount: rc.minOrder || '500' }); }}
                                            style={{
                                                padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                                background: '#f8fafc', color: '#334155', fontWeight: 700, fontSize: 12,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                            }}
                                            title="Validate or Simulate Apply this coupon"
                                        >
                                            🧪 Test
                                        </button>
                                        {c.status === 'Active' ? (
                                            <button
                                                onClick={() => handleDeactivate(c.id)}
                                                disabled={deactivatingId === c.id}
                                                style={{
                                                    flex: 1.2, padding: '7px 0', borderRadius: 8, border: 'none',
                                                    background: deactivatingId === c.id ? '#fee2e2' : '#ef4444',
                                                    color: '#fff', fontWeight: 700, fontSize: 12,
                                                    cursor: deactivatingId === c.id ? 'not-allowed' : 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                }}
                                            >
                                                {deactivatingId === c.id ? 'Deactivating...' : 'Deactivate'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleActivate(c.id)}
                                                disabled={activatingId === c.id}
                                                style={{
                                                    flex: 1.2, padding: '7px 0', borderRadius: 8, border: 'none',
                                                    background: activatingId === c.id ? '#d1fae5' : '#10b981',
                                                    color: '#fff', fontWeight: 700, fontSize: 12,
                                                    cursor: activatingId === c.id ? 'not-allowed' : 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                }}
                                            >
                                                {activatingId === c.id ? 'Activating...' : 'Activate'}
                                            </button>
                                        )}
                                    </div>
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
                </>
            )}

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

            {/* Bulk Generate Modal (POST /api/v1/coupons/bulk-generate) */}
            {showBulkModal && (
                <BulkGenerateModal
                    onClose={() => setShowBulkModal(false)}
                    onGenerated={() => fetchCoupons()}
                />
            )}

            {/* Export Coupons Report Modal (GET /api/v1/coupons/export) */}
            {showExportModal && (
                <ExportCouponsModal
                    onClose={() => setShowExportModal(false)}
                    onExportSuccess={msg => setExportSuccessBanner(msg)}
                />
            )}

            {/* Applicable & Locked Recommendations Modal (GET /api/v1/coupons/applicable) */}
            {showApplicableModal && (
                <ApplicableCouponsModal
                    onClose={() => setShowApplicableModal(false)}
                    onApplyToTest={(code, amt) => {
                        setShowApplicableModal(false);
                        setShowTestModal(true);
                        setTestResult(null);
                        setTestForm({ code, amount: amt });
                    }}
                />
            )}

            {/* Customer Redemptions Modal (GET /api/v1/coupons/{coupon_id}/redemptions) */}
            {redemptionCoupon && (
                <CouponRedemptionsModal
                    coupon={redemptionCoupon}
                    onClose={() => setRedemptionCoupon(null)}
                />
            )}
        </div>
    );
};

export default CouponManagement;
