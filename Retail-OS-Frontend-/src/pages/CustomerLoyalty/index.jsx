import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BsAwardFill,
    BsStarFill,
    BsPlusCircle,
    BsGift,
    BsPencilSquare,
    BsClockHistory,
    BsSearch,
    BsFilter,
    BsDownload,
    BsArrowRepeat,
    BsCheckCircleFill,
    BsXCircleFill,
    BsExclamationTriangleFill,
    BsShieldCheck,
    BsCoin,
    BsTrophyFill,
    BsPersonFill,
    BsPhone,
    BsEnvelope,
    BsChevronLeft,
    BsChevronRight,
    BsX,
    BsArrowUpRight,
    BsArrowDownLeft,
    BsLightningChargeFill,
    BsInfoCircleFill
} from 'react-icons/bs';
import {
    getCustomers,
    getCustomerLoyalty,
    addLoyalty,
    earnLoyalty,
    redeemLoyalty,
    getLoyaltyHistory,
    getLoyaltyReport,
    getTopCustomers,
    getCustomerStats
} from '../../services/customer';
import {
    fmt,
    normalizeApiList,
    getApiErrorMessage
} from '../../components/customers/customerHelpers';

// 1 Point = ₹0.10 (10 points = ₹1.00)
const POINTS_TO_INR_RATE = 0.10;
const PAGE_SIZE = 10;

const TIER_CONFIG = [
    {
        tier: 'Silver Tier',
        slug: 'silver',
        minSpend: 0,
        maxSpend: 10000,
        rate: '1 pt per ₹100',
        perks: 'Birthday discount 5% & welcome gift voucher',
        color: '#64748b',
        bgColor: '#f1f5f9',
        borderColor: '#cbd5e1'
    },
    {
        tier: 'Gold Tier',
        slug: 'gold',
        minSpend: 10001,
        maxSpend: 30000,
        rate: '2 pts per ₹100',
        perks: 'Free home delivery + 10% seasonal discount',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a'
    },
    {
        tier: 'Platinum Tier',
        slug: 'platinum',
        minSpend: 30001,
        maxSpend: null,
        rate: '3.5 pts per ₹100',
        perks: 'Dedicated concierge + VIP exclusive pre-sale access',
        color: '#6366f1',
        bgColor: '#eef2ff',
        borderColor: '#c7d2fe'
    }
];

export const CustomerLoyaltyPage = () => {
    // ── Primary States ──
    const [customers, setCustomers] = useState([]);
    const [loyaltyReport, setLoyaltyReport] = useState(null);
    const [topCustomers, setTopCustomers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

    // ── Active View Tab ──
    // 'members' | 'analytics' | 'leaderboard'
    const [activeTab, setActiveTab] = useState('members');

    // ── Search & Filter ──
    const [searchQuery, setSearchQuery] = useState('');
    const [segmentFilter, setSegmentFilter] = useState('all');
    const [balanceFilter, setBalanceFilter] = useState('all');
    const [sortBy, setSortBy] = useState('points-desc');
    const [currentPage, setCurrentPage] = useState(1);

    // ── Modal States ──
    const [modalMode, setModalMode] = useState(null); // 'earn' | 'redeem' | 'adjust' | null
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formPoints, setFormPoints] = useState('');
    const [formReason, setFormReason] = useState('Purchase bonus reward');
    const [formInvoiceId, setFormInvoiceId] = useState('');

    // ── History Drawer / Modal ──
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState(null);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Toast notification auto-dismiss
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // ── Fetch All Loyalty Data ──
    const fetchAllData = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            setError(null);

            const [customersRes, reportRes, topRes, statsRes] = await Promise.allSettled([
                getCustomers(),
                getLoyaltyReport(),
                getTopCustomers(),
                getCustomerStats()
            ]);

            // Handle Customers
            if (customersRes.status === 'fulfilled') {
                const list = normalizeApiList(customersRes.value);
                setCustomers(list);
            }

            // Handle Loyalty Report
            if (reportRes.status === 'fulfilled') {
                setLoyaltyReport(reportRes.value);
            }

            // Handle Top Customers
            if (topRes.status === 'fulfilled') {
                const list = normalizeApiList(topRes.value);
                setTopCustomers(list);
            }

            // Handle Stats
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value);
            }

            if (isRefresh) {
                setNotification({ type: 'success', message: 'Loyalty data refreshed successfully!' });
            }
        } catch (err) {
            console.error('Error fetching loyalty data:', err);
            setError(getApiErrorMessage(err, 'Failed to load customer loyalty data. Please try again.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // ── Derived KPI Metrics ──
    const kpiMetrics = useMemo(() => {
        // Aggregate directly from live customers or backend loyalty report
        const totalCust = customers.length;
        const totalPointsCirculation = customers.reduce((sum, c) => sum + (Number(c.loyalty_points) || 0), 0);
        const membersWithPoints = customers.filter(c => (Number(c.loyalty_points) || 0) > 0).length;

        // If loyalty report provides aggregate fields
        let reportEarned = 0;
        let reportRedeemed = 0;
        let reportBalance = totalPointsCirculation;

        if (loyaltyReport) {
            if (Array.isArray(loyaltyReport)) {
                // If it's an array of report rows
                reportEarned = loyaltyReport.reduce((acc, r) => acc + (Number(r.points_earned) || 0), 0);
                reportRedeemed = loyaltyReport.reduce((acc, r) => acc + (Number(r.points_redeemed) || 0), 0);
                const sumBal = loyaltyReport.reduce((acc, r) => acc + (Number(r.balance_points) || 0), 0);
                if (sumBal > 0) reportBalance = sumBal;
            } else if (typeof loyaltyReport === 'object') {
                reportEarned = Number(loyaltyReport.total_points_earned) || 0;
                reportRedeemed = Number(loyaltyReport.total_points_redeemed) || 0;
                reportBalance = Number(loyaltyReport.total_points_balance) || totalPointsCirculation;
            }
        }

        const rupeeLiability = Math.round(reportBalance * POINTS_TO_INR_RATE);
        const rupeeSaved = Math.round(reportRedeemed * POINTS_TO_INR_RATE);

        return {
            totalCustomers: totalCust,
            activeMembers: stats?.active_customers ?? membersWithPoints ?? totalCust,
            totalPointsCirculation: reportBalance,
            rupeeLiability,
            totalEarned: reportEarned,
            totalRedeemed: reportRedeemed,
            rupeeSaved
        };
    }, [customers, loyaltyReport, stats]);

    // ── Filtered and Sorted Customer List ──
    const filteredCustomers = useMemo(() => {
        return customers.filter(cust => {
            // Search text
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const name = (cust.name || '').toLowerCase();
                const phone = (cust.phone || '').toLowerCase();
                const email = (cust.email || '').toLowerCase();
                const idStr = String(cust.id || '');
                if (!name.includes(q) && !phone.includes(q) && !email.includes(q) && !idStr.includes(q)) {
                    return false;
                }
            }

            // Segment filter
            if (segmentFilter !== 'all') {
                const seg = (cust.segment || 'regular').toLowerCase();
                if (seg !== segmentFilter.toLowerCase()) return false;
            }

            // Points balance filter
            if (balanceFilter === 'has_points') {
                if ((Number(cust.loyalty_points) || 0) <= 0) return false;
            } else if (balanceFilter === 'high_points') {
                if ((Number(cust.loyalty_points) || 0) < 100) return false;
            } else if (balanceFilter === 'zero_points') {
                if ((Number(cust.loyalty_points) || 0) !== 0) return false;
            }

            return true;
        }).sort((a, b) => {
            const ptsA = Number(a.loyalty_points) || 0;
            const ptsB = Number(b.loyalty_points) || 0;
            if (sortBy === 'points-desc') return ptsB - ptsA;
            if (sortBy === 'points-asc') return ptsA - ptsB;
            if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
            return (b.id || 0) - (a.id || 0);
        });
    }, [customers, searchQuery, segmentFilter, balanceFilter, sortBy]);

    // ── Pagination Calculation ──
    const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1;
    const paginatedCustomers = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredCustomers.slice(start, start + PAGE_SIZE);
    }, [filteredCustomers, currentPage]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, segmentFilter, balanceFilter, sortBy]);

    // ── Open History Drawer ──
    const handleOpenHistory = async (customer) => {
        setHistoryCustomer(customer);
        setHistoryOpen(true);
        setHistoryLoading(true);
        try {
            const res = await getLoyaltyHistory(customer.id);
            const list = normalizeApiList(res);
            setHistoryList(list);
        } catch (err) {
            console.error('Error fetching loyalty history:', err);
            setHistoryList([]);
            setNotification({
                type: 'error',
                message: getApiErrorMessage(err, 'Failed to fetch customer loyalty transaction history.')
            });
        } finally {
            setHistoryLoading(false);
        }
    };

    // ── Open Action Modals ──
    const handleOpenModal = (mode, customer = null) => {
        setModalMode(mode);
        setSelectedCustomer(customer || (customers.length > 0 ? customers[0] : null));
        setFormPoints('');
        setFormReason(mode === 'redeem' ? 'Store checkout redemption' : 'Purchase bonus reward');
        setFormInvoiceId('');
    };

    const handleCloseModal = () => {
        setModalMode(null);
        setSelectedCustomer(null);
        setFormPoints('');
        setFormInvoiceId('');
    };

    // ── Submit Earn / Redeem / Adjust ──
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) {
            setNotification({ type: 'error', message: 'Please select a customer.' });
            return;
        }

        const pts = parseInt(formPoints, 10);
        if (isNaN(pts) || pts <= 0) {
            setNotification({ type: 'error', message: 'Please enter a valid positive points amount.' });
            return;
        }

        if (modalMode === 'redeem') {
            const currentBal = Number(selectedCustomer.loyalty_points) || 0;
            if (pts > currentBal) {
                setNotification({
                    type: 'error',
                    message: `Cannot redeem ${pts} points. Customer only has ${currentBal} points available.`
                });
                return;
            }
        }

        try {
            setActionLoading(true);

            if (modalMode === 'earn') {
                await earnLoyalty({
                    customer_id: selectedCustomer.id,
                    points: pts,
                    reason: formReason.trim() || 'Loyalty Reward Points Earned',
                    ...(formInvoiceId ? { invoice_id: Number(formInvoiceId) } : {})
                });
                setNotification({
                    type: 'success',
                    message: `Successfully credited ${pts} loyalty points to ${selectedCustomer.name}!`
                });
            } else if (modalMode === 'redeem') {
                await redeemLoyalty({
                    customer_id: selectedCustomer.id,
                    points: pts
                });
                setNotification({
                    type: 'success',
                    message: `Successfully redeemed ${pts} points for ${selectedCustomer.name} (Value: ${fmt(pts * POINTS_TO_INR_RATE)})!`
                });
            } else if (modalMode === 'adjust') {
                await addLoyalty(selectedCustomer.id, pts);
                setNotification({
                    type: 'success',
                    message: `Successfully adjusted loyalty balance by ${pts} points for ${selectedCustomer.name}!`
                });
            }

            handleCloseModal();
            // Refresh updated data
            await fetchAllData(false);
        } catch (err) {
            console.error('Loyalty action error:', err);
            setNotification({
                type: 'error',
                message: getApiErrorMessage(err, `Failed to ${modalMode} points. Please verify details and try again.`)
            });
        } finally {
            setActionLoading(false);
        }
    };

    // ── Export Loyalty Data as CSV ──
    const handleExportCSV = () => {
        try {
            const headers = ['Customer ID', 'Name', 'Phone', 'Email', 'Segment', 'Loyalty Points', 'INR Value (₹)', 'Created At'];
            const rows = filteredCustomers.map(c => [
                c.id,
                `"${(c.name || '').replace(/"/g, '""')}"`,
                c.phone || '',
                c.email || '',
                c.segment || 'Regular',
                c.loyalty_points || 0,
                ((c.loyalty_points || 0) * POINTS_TO_INR_RATE).toFixed(2),
                c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''
            ]);

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `loyalty_directory_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setNotification({ type: 'success', message: 'Loyalty directory exported to CSV successfully.' });
        } catch (err) {
            console.error('Export CSV error:', err);
            setNotification({ type: 'error', message: 'Failed to export CSV.' });
        }
    };

    return (
        <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'inherit' }}>
            {/* ── Toast Notification Banner ── */}
            {notification && (
                <div
                    style={{
                        position: 'fixed',
                        top: 24,
                        right: 24,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 20px',
                        borderRadius: 10,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        background: notification.type === 'success' ? '#065f46' : '#991b1b',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 600,
                        maxWidth: '460px',
                        animation: 'fadeIn 0.2s ease-in-out'
                    }}
                >
                    {notification.type === 'success' ? (
                        <BsCheckCircleFill size={18} style={{ color: '#34d399', flexShrink: 0 }} />
                    ) : (
                        <BsExclamationTriangleFill size={18} style={{ color: '#f87171', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1 }}>{notification.message}</span>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <BsX size={20} />
                    </button>
                </div>
            )}

            {/* ── Header Bar ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 24,
                    paddingBottom: 20,
                    borderBottom: '1px solid #e5e7eb'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                        }}
                    >
                        <BsAwardFill />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                                Customer Loyalty & Rewards
                            </h1>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: 999,
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0'
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                Live API Connected
                            </span>
                        </div>
                        <p style={{ fontSize: 13.5, color: '#6b7280', margin: '4px 0 0 0' }}>
                            Earn & redeem points, manage VIP tiers (Silver, Gold, Platinum), and monitor customer rewards
                        </p>
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => fetchAllData(true)}
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 14px',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title="Reload live loyalty data"
                    >
                        <BsArrowRepeat size={14} className={loading ? 'spin-icon' : ''} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 14px',
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer'
                        }}
                    >
                        <BsDownload size={13} />
                        Export
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenModal('earn')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 16px',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                        }}
                    >
                        <BsPlusCircle size={14} />
                        Earn Points
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenModal('redeem')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 16px',
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                        }}
                    >
                        <BsGift size={14} />
                        Redeem Points
                    </button>
                </div>
            </div>

            {/* ── KPI Metric Cards ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                    marginBottom: 24
                }}
            >
                {/* Active Members */}
                <div
                    style={{
                        background: '#ffffff',
                        padding: '18px 20px',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Loyalty Members
                        </span>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BsPersonFill size={18} />
                        </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                            {kpiMetrics.totalCustomers.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <BsCheckCircleFill size={10} />
                            {kpiMetrics.activeMembers.toLocaleString('en-IN')} enrolled members
                        </div>
                    </div>
                </div>

                {/* Points In Circulation */}
                <div
                    style={{
                        background: '#ffffff',
                        padding: '18px 20px',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Points In Circulation
                        </span>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BsCoin size={18} />
                        </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                            {kpiMetrics.totalPointsCirculation.toLocaleString('en-IN')} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Pts</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, marginTop: 4 }}>
                            Liability: ~{fmt(kpiMetrics.rupeeLiability)} (at ₹0.10/pt)
                        </div>
                    </div>
                </div>

                {/* Points Redeemed */}
                <div
                    style={{
                        background: '#ffffff',
                        padding: '18px 20px',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Redeemed By Customers
                        </span>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BsGift size={18} />
                        </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                            {kpiMetrics.totalRedeemed.toLocaleString('en-IN')} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Pts</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                            {fmt(kpiMetrics.rupeeSaved)} savings unlocked
                        </div>
                    </div>
                </div>

                {/* Total Points Earned */}
                <div
                    style={{
                        background: '#ffffff',
                        padding: '18px 20px',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Points Issued
                        </span>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BsLightningChargeFill size={18} />
                        </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                            {kpiMetrics.totalEarned.toLocaleString('en-IN')} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Pts</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginTop: 4 }}>
                            {stats?.vip_customers || 0} VIP Tier Shoppers
                        </div>
                    </div>
                </div>
            </div>

            {/* ── VIP Membership Tiers Configuration Cards ── */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsAwardFill color="#f59e0b" /> VIP Membership Tiers & Earning Rules
                        </h3>
                        <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0 0' }}>
                            Customers automatically upgrade tiers as their cumulative spend increases
                        </p>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BsInfoCircleFill size={13} color="#6366f1" />
                        <span>Redemption Formula: <strong>10 Points = ₹1.00 Store Credit</strong></span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    {TIER_CONFIG.map((tier) => (
                        <div
                            key={tier.slug}
                            style={{
                                background: '#ffffff',
                                borderRadius: 12,
                                border: `1px solid ${tier.borderColor}`,
                                borderTop: `4px solid ${tier.color}`,
                                padding: '18px 20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {tier.tier}
                                </h4>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        background: tier.bgColor,
                                        color: tier.color,
                                        border: `1px solid ${tier.borderColor}`
                                    }}
                                >
                                    {tier.maxSpend ? `Spend ${fmt(tier.minSpend)} - ${fmt(tier.maxSpend)}` : `Spend ${fmt(tier.minSpend)}+`}
                                </span>
                            </div>

                            <div
                                style={{
                                    marginTop: 12,
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: '#f8fafc',
                                    fontSize: 13,
                                    color: '#334155'
                                }}
                            >
                                <strong style={{ color: '#0f172a' }}>Earn Rate:</strong> {tier.rate}
                            </div>

                            <p style={{ fontSize: 12.5, color: '#475569', margin: '10px 0 0 0', lineHeight: 1.4 }}>
                                <strong>Perks:</strong> {tier.perks}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid #e2e8f0',
                    marginBottom: 20
                }}
            >
                <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'members' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                        color: activeTab === 'members' ? '#4f46e5' : '#64748b',
                        fontWeight: activeTab === 'members' ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                    }}
                >
                    <BsPersonFill size={16} />
                    Member Loyalty Directory ({filteredCustomers.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'analytics' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                        color: activeTab === 'analytics' ? '#4f46e5' : '#64748b',
                        fontWeight: activeTab === 'analytics' ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                    }}
                >
                    <BsAwardFill size={16} />
                    Loyalty Analytics & Report
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('leaderboard')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'leaderboard' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                        color: activeTab === 'leaderboard' ? '#4f46e5' : '#64748b',
                        fontWeight: activeTab === 'leaderboard' ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                    }}
                >
                    <BsTrophyFill size={15} color={activeTab === 'leaderboard' ? '#4f46e5' : '#d97706'} />
                    Top Loyalty Champions ({topCustomers.length})
                </button>
            </div>

            {/* ── TAB 1: MEMBERS DIRECTORY ── */}
            {activeTab === 'members' && (
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    {/* Search & Filter Toolbar */}
                    <div
                        style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 12,
                            background: '#fafafa'
                        }}
                    >
                        {/* Search Input */}
                        <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 360 }}>
                            <BsSearch
                                size={14}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#94a3b8'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search by customer name, phone, or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 13,
                                    outline: 'none',
                                    background: '#ffffff'
                                }}
                            />
                        </div>

                        {/* Filters & Sorters */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {/* Segment Filter */}
                            <select
                                value={segmentFilter}
                                onChange={(e) => setSegmentFilter(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 13,
                                    background: '#ffffff',
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Segments</option>
                                <option value="vip">VIP Members</option>
                                <option value="regular">Regular Shoppers</option>
                                <option value="new">New Customers</option>
                            </select>

                            {/* Points Filter */}
                            <select
                                value={balanceFilter}
                                onChange={(e) => setBalanceFilter(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 13,
                                    background: '#ffffff',
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Point Balances</option>
                                <option value="has_points">Has Points (&gt; 0)</option>
                                <option value="high_points">High Balance (100+ Pts)</option>
                                <option value="zero_points">Zero Balance</option>
                            </select>

                            {/* Sorter */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 13,
                                    background: '#ffffff',
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="points-desc">Highest Points First</option>
                                <option value="points-asc">Lowest Points First</option>
                                <option value="name-asc">Name (A to Z)</option>
                                <option value="name-desc">Name (Z to A)</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <th style={{ padding: '14px 20px' }}>Customer</th>
                                    <th style={{ padding: '14px 16px' }}>Contact</th>
                                    <th style={{ padding: '14px 16px' }}>Membership Tier</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Loyalty Balance</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Equivalent Value</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                                            <BsArrowRepeat size={24} className="spin-icon" style={{ marginBottom: 8, display: 'inline-block' }} />
                                            <div>Loading customer loyalty members...</div>
                                        </td>
                                    </tr>
                                ) : paginatedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                                            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                                            <div style={{ fontWeight: 600, color: '#334155' }}>No customers match your search or filter</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Try clearing search keywords or selecting all segments</div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustomers.map((cust) => {
                                        const points = Number(cust.loyalty_points) || 0;
                                        const rupeeVal = points * POINTS_TO_INR_RATE;
                                        const segment = (cust.segment || 'regular').toLowerCase();
                                        const isVip = segment === 'vip';
                                        const isNew = segment === 'new';

                                        return (
                                            <tr
                                                key={cust.id}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    transition: 'background 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Customer */}
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div
                                                            style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                background: isVip ? '#fef3c7' : '#e0e7ff',
                                                                color: isVip ? '#d97706' : '#4f46e5',
                                                                fontWeight: 700,
                                                                fontSize: 14,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            {(cust.name || 'C').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                                                {cust.name || 'Unnamed Customer'}
                                                            </div>
                                                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                                                                ID: #{cust.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Contact */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                                                            <BsPhone size={12} color="#94a3b8" />
                                                            <span>{cust.phone || 'No phone'}</span>
                                                        </div>
                                                        {cust.email && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
                                                                <BsEnvelope size={11} color="#94a3b8" />
                                                                <span>{cust.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Membership Tier */}
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            padding: '4px 10px',
                                                            borderRadius: 999,
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            background: isVip ? '#fef3c7' : isNew ? '#f0fdf4' : '#eef2ff',
                                                            color: isVip ? '#b45309' : isNew ? '#15803d' : '#4338ca',
                                                            border: `1px solid ${isVip ? '#fde68a' : isNew ? '#bbf7d0' : '#c7d2fe'}`
                                                        }}
                                                    >
                                                        {isVip ? <BsStarFill size={11} color="#d97706" /> : <BsAwardFill size={11} />}
                                                        {isVip ? 'Platinum VIP' : isNew ? 'Silver Member' : 'Gold Member'}
                                                    </span>
                                                </td>

                                                {/* Loyalty Balance */}
                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15, color: points > 0 ? '#0f172a' : '#94a3b8' }}>
                                                        <BsCoin size={15} color={points > 0 ? '#d97706' : '#cbd5e1'} />
                                                        <span>{points.toLocaleString('en-IN')}</span>
                                                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>pts</span>
                                                    </div>
                                                </td>

                                                {/* Equivalent Value */}
                                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                    <span style={{ fontWeight: 700, color: rupeeVal > 0 ? '#059669' : '#94a3b8', fontSize: 13.5 }}>
                                                        {fmt(rupeeVal)}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenHistory(cust)}
                                                            style={{
                                                                padding: '6px 10px',
                                                                background: '#f1f5f9',
                                                                color: '#334155',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                            title="View points ledger and transaction timeline"
                                                        >
                                                            <BsClockHistory size={12} />
                                                            History
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenModal('earn', cust)}
                                                            style={{
                                                                padding: '6px 10px',
                                                                background: '#ecfdf5',
                                                                color: '#059669',
                                                                border: '1px solid #a7f3d0',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                            title="Credit points for shopping or bonus"
                                                        >
                                                            <BsPlusCircle size={12} />
                                                            Earn
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenModal('redeem', cust)}
                                                            disabled={points <= 0}
                                                            style={{
                                                                padding: '6px 10px',
                                                                background: points > 0 ? '#eef2ff' : '#f8fafc',
                                                                color: points > 0 ? '#4f46e5' : '#94a3b8',
                                                                border: `1px solid ${points > 0 ? '#c7d2fe' : '#e2e8f0'}`,
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: points > 0 ? 'pointer' : 'not-allowed',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                            title={points > 0 ? 'Redeem points for discounts' : 'No points available to redeem'}
                                                        >
                                                            <BsGift size={12} />
                                                            Redeem
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

                    {/* Pagination */}
                    <div
                        style={{
                            padding: '14px 20px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#fafafa',
                            fontSize: 13,
                            color: '#64748b'
                        }}
                    >
                        <div>
                            Showing <strong>{paginatedCustomers.length}</strong> of <strong>{filteredCustomers.length}</strong> members
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                <BsChevronLeft size={12} /> Previous
                            </button>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                Next <BsChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 2: LOYALTY ANALYTICS & REPORT ── */}
            {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Summary Banner */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                            color: '#ffffff',
                            borderRadius: 14,
                            padding: '24px 28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 20
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <BsAwardFill size={24} color="#fbbf24" />
                                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                                    Program Performance & Analytics Report
                                </h3>
                            </div>
                            <p style={{ fontSize: 13.5, color: '#c7d2fe', margin: '6px 0 0 0', maxWidth: '640px' }}>
                                Real-time aggregate view calculated from customer order accruals, promotional bonus distributions, and checkout discount redemptions.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 18px', borderRadius: 10, backdropFilter: 'blur(8px)' }}>
                                <div style={{ fontSize: 11.5, color: '#c7d2fe', textTransform: 'uppercase', fontWeight: 600 }}>Redemption Rate</div>
                                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                                    {kpiMetrics.totalEarned > 0
                                        ? `${((kpiMetrics.totalRedeemed / kpiMetrics.totalEarned) * 100).toFixed(1)}%`
                                        : '0%'}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 18px', borderRadius: 10, backdropFilter: 'blur(8px)' }}>
                                <div style={{ fontSize: 11.5, color: '#c7d2fe', textTransform: 'uppercase', fontWeight: 600 }}>Active Member Reach</div>
                                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                                    {kpiMetrics.activeMembers.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Backend Report Table */}
                    <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                    Customer Loyalty Ledger & Balance Breakdown
                                </h4>
                                <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0 0' }}>
                                    Data synced directly from <code>/api/v1/customers/customer-analytics/loyalty-report</code>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => fetchAllData(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                <BsArrowRepeat size={12} /> Refresh Report
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 20px' }}>Customer ID</th>
                                        <th style={{ padding: '12px 16px' }}>Customer Name</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Points Earned</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Points Redeemed</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Balance Points</th>
                                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Est. Rupee Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(loyaltyReport) && loyaltyReport.length > 0 ? (
                                        loyaltyReport.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 20px', fontWeight: 600, color: '#475569' }}>
                                                    #{row.customer_id || '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                                    {row.customer_name || 'Customer'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                                                    +{Number(row.points_earned || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                                                    -{Number(row.points_redeemed || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                                    {Number(row.balance_points || 0).toLocaleString('en-IN')} pts
                                                </td>
                                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                    {fmt((Number(row.balance_points) || 0) * POINTS_TO_INR_RATE)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        // Fallback rendering from active customer list if report endpoint returns single summary object or empty
                                        filteredCustomers.slice(0, 15).map((cust) => {
                                            const pts = Number(cust.loyalty_points) || 0;
                                            return (
                                                <tr key={cust.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#475569' }}>
                                                        #{cust.id}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                                        {cust.name}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                                                        +{pts.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                                                        0
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                                        {pts.toLocaleString('en-IN')} pts
                                                    </td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                        {fmt(pts * POINTS_TO_INR_RATE)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 3: TOP LOYALTY CHAMPIONS ── */}
            {activeTab === 'leaderboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <BsTrophyFill color="#d97706" /> Top Customer Spenders & Loyalty Champions
                                </h3>
                                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                                    Your most valuable retail shoppers ranked by revenue contribution, order frequency, and loyalty points
                                </p>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '6px 14px', borderRadius: 8 }}>
                                Synced via <code>/api/v1/customers/customer-analytics/top-customers</code>
                            </span>
                        </div>

                        {topCustomers.length === 0 ? (
                            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                                <div style={{ fontWeight: 600, color: '#334155' }}>No top customer data returned yet</div>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>As new POS invoices are paid, top customers will appear here automatically.</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                                {topCustomers.map((top, idx) => {
                                    const rank = idx + 1;
                                    const medalColor = rank === 1 ? '#eab308' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#6366f1';
                                    const custId = top.customer_id || top.id;
                                    const custName = top.customer_name || top.name || 'Valued Customer';
                                    const points = Number(top.loyalty_points) || 0;
                                    const spend = Number(top.total_spend) || 0;

                                    return (
                                        <div
                                            key={top.id || idx}
                                            style={{
                                                background: '#f8fafc',
                                                borderRadius: 12,
                                                border: '1px solid #e2e8f0',
                                                padding: 20,
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: '50%',
                                                                background: medalColor,
                                                                color: '#ffffff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 800,
                                                                fontSize: 14
                                                            }}
                                                        >
                                                            #{rank}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                                                                {custName}
                                                            </div>
                                                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                                                ID: #{custId} • {top.order_count ?? 1} Orders
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '3px 8px',
                                                            borderRadius: 6,
                                                            background: rank <= 3 ? '#fef3c7' : '#eef2ff',
                                                            color: rank <= 3 ? '#b45309' : '#4338ca',
                                                            border: `1px solid ${rank <= 3 ? '#fde68a' : '#c7d2fe'}`
                                                        }}
                                                    >
                                                        {rank <= 3 ? 'VIP Tier' : 'Top Spender'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#ffffff', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Spent</div>
                                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{fmt(spend)}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Loyalty Balance</div>
                                                        <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706', marginTop: 2 }}>{points.toLocaleString('en-IN')} pts</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const matched = customers.find(c => c.id === custId) || { id: custId, name: custName, loyalty_points: points };
                                                        handleOpenModal('earn', matched);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '7px 10px',
                                                        background: '#059669',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <BsPlusCircle size={12} /> Reward Extra Points
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const matched = customers.find(c => c.id === custId) || { id: custId, name: custName, loyalty_points: points };
                                                        handleOpenHistory(matched);
                                                    }}
                                                    style={{
                                                        padding: '7px 12px',
                                                        background: '#ffffff',
                                                        color: '#334155',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <BsClockHistory size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── ACTION MODAL: EARN / REDEEM / ADJUST ── */}
            {modalMode && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: '480px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                            animation: 'modalSlide 0.2s ease-out'
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '18px 24px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: modalMode === 'earn' ? '#ecfdf5' : modalMode === 'redeem' ? '#eef2ff' : '#f8fafc'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: modalMode === 'earn' ? '#059669' : modalMode === 'redeem' ? '#4f46e5' : '#475569',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 18
                                    }}
                                >
                                    {modalMode === 'earn' ? <BsPlusCircle /> : modalMode === 'redeem' ? <BsGift /> : <BsPencilSquare />}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {modalMode === 'earn' ? 'Earn Loyalty Points' : modalMode === 'redeem' ? 'Redeem Customer Points' : 'Adjust Loyalty Balance'}
                                    </h3>
                                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                                        {modalMode === 'earn'
                                            ? 'Credit points against shopping invoices or promotional bonuses'
                                            : modalMode === 'redeem'
                                            ? 'Convert points into instant invoice discounts'
                                            : 'Add or adjust customer point balance'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: 22,
                                    lineHeight: 1,
                                    padding: 4
                                }}
                            >
                                <BsX />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleFormSubmit} style={{ padding: '20px 24px' }}>
                            {/* Customer Selector */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                    Select Customer <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={selectedCustomer?.id || ''}
                                    onChange={(e) => {
                                        const cust = customers.find(c => c.id === Number(e.target.value));
                                        setSelectedCustomer(cust);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #cbd5e1',
                                        fontSize: 13,
                                        color: '#0f172a',
                                        background: '#ffffff'
                                    }}
                                    required
                                >
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.phone || `ID #${c.id}`}) — Balance: {c.loyalty_points || 0} pts
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Customer Balance Preview Box */}
                            {selectedCustomer && (
                                <div
                                    style={{
                                        background: '#f8fafc',
                                        padding: '12px 14px',
                                        borderRadius: 8,
                                        border: '1px solid #e2e8f0',
                                        marginBottom: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Available Balance:</span>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <BsCoin color="#d97706" />
                                            {(Number(selectedCustomer.loyalty_points) || 0).toLocaleString('en-IN')} points
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Worth in Rupee:</span>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>
                                            {fmt((Number(selectedCustomer.loyalty_points) || 0) * POINTS_TO_INR_RATE)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Points to Earn / Redeem */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                    {modalMode === 'earn' ? 'Points to Earn' : modalMode === 'redeem' ? 'Points to Redeem' : 'Points to Add'} <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max={modalMode === 'redeem' ? (selectedCustomer?.loyalty_points || 1) : 10000}
                                        placeholder="e.g. 50"
                                        value={formPoints}
                                        onChange={(e) => setFormPoints(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #cbd5e1',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>

                                {formPoints && !isNaN(parseInt(formPoints, 10)) && (
                                    <div style={{ fontSize: 12, color: modalMode === 'redeem' ? '#059669' : '#4f46e5', fontWeight: 600, marginTop: 4 }}>
                                        {modalMode === 'redeem'
                                            ? `Redeeming ${formPoints} pts will apply a ${fmt(parseInt(formPoints, 10) * POINTS_TO_INR_RATE)} bill discount.`
                                            : `Worth ${fmt(parseInt(formPoints, 10) * POINTS_TO_INR_RATE)} in customer rewards value.`}
                                    </div>
                                )}
                            </div>

                            {/* Optional Invoice ID */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                    Invoice ID <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>(Optional)</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="e.g. 1042"
                                    value={formInvoiceId}
                                    onChange={(e) => setFormInvoiceId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #cbd5e1',
                                        fontSize: 13,
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Reason (required for earn) */}
                            {modalMode === 'earn' && (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Reason / Remark <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Store purchase bonus reward"
                                        value={formReason}
                                        onChange={(e) => setFormReason(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #cbd5e1',
                                            fontSize: 13,
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>
                            )}

                            {/* Modal Footer Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={actionLoading}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: 8,
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: modalMode === 'earn' ? '#059669' : modalMode === 'redeem' ? '#4f46e5' : '#0f172a',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: 13.5,
                                        cursor: actionLoading ? 'wait' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {actionLoading && <BsArrowRepeat size={14} className="spin-icon" />}
                                    {modalMode === 'earn'
                                        ? 'Confirm Earn Points'
                                        : modalMode === 'redeem'
                                        ? 'Confirm Redemption'
                                        : 'Save Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── CUSTOMER LOYALTY HISTORY DRAWER / MODAL ── */}
            {historyOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: '680px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Drawer Header */}
                        <div
                            style={{
                                padding: '18px 24px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        background: '#e0e7ff',
                                        color: '#4f46e5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20
                                    }}
                                >
                                    <BsClockHistory />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        Loyalty History: {historyCustomer?.name}
                                    </h3>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                        Current Balance: <strong>{(Number(historyCustomer?.loyalty_points) || 0).toLocaleString('en-IN')} points</strong> ({fmt((Number(historyCustomer?.loyalty_points) || 0) * POINTS_TO_INR_RATE)})
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHistoryOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: 22,
                                    lineHeight: 1,
                                    padding: 4
                                }}
                            >
                                <BsX />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {historyLoading ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                                    <BsArrowRepeat size={24} className="spin-icon" style={{ display: 'inline-block', marginBottom: 8 }} />
                                    <div>Loading loyalty transaction history...</div>
                                </div>
                            ) : historyList.length === 0 ? (
                                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
                                    <div style={{ fontWeight: 600, color: '#334155' }}>No loyalty transaction logs found</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                        Points will record here automatically when earned from invoices or manual credits.
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {historyList.map((item, idx) => {
                                        const isEarned = (Number(item.points_earned) || 0) > 0 || (Number(item.points) || 0) > 0;
                                        const isRedeemed = (Number(item.points_redeemed) || 0) > 0;
                                        const pts = item.points_earned || item.points_redeemed || item.points || 0;
                                        const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : 'Recent';

                                        return (
                                            <div
                                                key={item.id || idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '14px 16px',
                                                    borderRadius: 10,
                                                    border: '1px solid #e2e8f0',
                                                    background: '#ffffff'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div
                                                        style={{
                                                            width: 34,
                                                            height: 34,
                                                            borderRadius: 8,
                                                            background: isRedeemed ? '#fee2e2' : '#ecfdf5',
                                                            color: isRedeemed ? '#dc2626' : '#059669',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 16,
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {isRedeemed ? <BsArrowDownLeft /> : <BsArrowUpRight />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                                                            {isRedeemed ? 'Points Redeemed' : 'Points Earned'}
                                                            {item.invoice_id && (
                                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', marginLeft: 6 }}>
                                                                    (Invoice #{item.invoice_id})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                                                            {dateStr}
                                                            {item.expiry_date && ` • Expires: ${item.expiry_date}`}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            fontSize: 15,
                                                            color: isRedeemed ? '#dc2626' : '#059669'
                                                        }}
                                                    >
                                                        {isRedeemed ? `-${pts}` : `+${pts}`} pts
                                                    </div>
                                                    {item.balance_points !== undefined && item.balance_points !== null && (
                                                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                                                            Balance: {item.balance_points} pts
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div
                            style={{
                                padding: '14px 24px',
                                borderTop: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end'
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setHistoryOpen(false)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerLoyaltyPage;
