import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
    BsSearch, BsDownload, BsPeopleFill, BsPhone, BsGeoAlt,
    BsCalendar, BsCurrencyRupee, BsStarFill, BsPlus, BsEye, BsPencilSquare,
    BsChevronLeft, BsChevronRight, BsCheckCircleFill, BsXCircleFill,
    BsWallet2, BsChatText, BsJournalText, BsShare,
    BsFunnel, BsGift, BsTrophy, BsGraphUp,
    BsAwardFill, BsClockHistory, BsPlusCircle, BsArrowRepeat,
    BsCoin, BsLightningChargeFill, BsInfoCircleFill,
    BsArrowUpRight, BsArrowDownLeft, BsX, BsGridFill
} from 'react-icons/bs';
import {
    getCustomers,
    getCustomerById,
    updateCustomerStatus,
    getCustomerStats,
    getBirthdayCustomers,
    getTopCustomers,
    getRetentionReport,
    getLifetimeValue,
    getLoyaltyReport,
    getCustomerLoyalty,
    addLoyalty,
    earnLoyalty,
    redeemLoyalty,
    getLoyaltyHistory,
    sendCustomerWhatsapp,
} from '../../services/customer';
import CustomerDetailPanel from '../../components/customers/CustomerDetailPanel';
import { EditCustomerModal } from '../Customers';
import {
    fmt,
    normalizeApiList,
    formatCustomerRecord,
    getApiErrorMessage,
    setStoredCustomerStatus,
} from '../../components/customers/customerHelpers';

const PAGE_SIZE = 10;
const POINTS_TO_INR_RATE = 0.10; // 10 Points = ₹1.00 Store Credit

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} /> },
    Inactive: { color: '#6b7280', bg: '#f3f4f6', icon: null },
};

const typeCfg = {
    Regular: { color: '#6366f1', bg: '#eef2ff' },
    Wholesale: { color: '#8b5cf6', bg: '#f5f3ff' },
    VIP: { color: '#d97706', bg: '#fffbeb' },
    New: { color: '#0ea5e9', bg: '#f0f9ff' },
};

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
        borderColor: '#cbd5e1',
        icon: '🥈'
    },
    {
        tier: 'Gold Tier',
        slug: 'gold',
        minSpend: 10001,
        maxSpend: 30000,
        rate: '2 pts per ₹100',
        perks: 'Free express delivery + 10% seasonal discount',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        icon: '🥇'
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
        borderColor: '#c7d2fe',
        icon: '💎'
    }
];

// Resolves a customer's dynamic loyalty tier based on spend & segment
export const resolveCustomerTier = (cust) => {
    const spend = Number(cust.totalSpent) || 0;
    const type = (cust.type || '').toUpperCase();
    if (spend >= 30000 || type === 'VIP') {
        return {
            name: 'Platinum VIP',
            badge: 'Platinum',
            icon: '💎',
            color: '#6366f1',
            bg: '#eef2ff',
            border: '#c7d2fe'
        };
    }
    if (spend >= 10000) {
        return {
            name: 'Gold Member',
            badge: 'Gold',
            icon: '🥇',
            color: '#d97706',
            bg: '#fffbeb',
            border: '#fde68a'
        };
    }
    return {
        name: 'Silver Member',
        badge: 'Silver',
        icon: '🥈',
        color: '#64748b',
        bg: '#f1f5f9',
        border: '#cbd5e1'
    };
};

// Active / Inactive Toggle Switch Component (Matching Customer Directory exactly)
const CustomerStatusToggle = ({ isActive, onToggle, loading = false }) => {
    const activeColor = '#10b981';
    const inactiveColor = '#ef4444';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label={isActive ? 'Active' : 'Inactive'}
            disabled={loading}
            onClick={onToggle}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: 999,
                border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                background: isActive ? '#ecfdf5' : '#fef2f2',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.65 : 1,
                transition: 'all 0.25s ease',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
            }}
        >
            <span
                style={{
                    position: 'relative',
                    width: 32,
                    height: 18,
                    borderRadius: 999,
                    background: isActive ? activeColor : inactiveColor,
                    transition: 'background 0.25s ease',
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        top: 2,
                        left: isActive ? 16 : 2,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#ffffff',
                        transition: 'left 0.25s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                />
            </span>
        </button>
    );
};

const KpiSkeleton = () => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', minHeight: 104, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ width: '50%', height: 12, background: '#f3f4f6', borderRadius: 4 }} />
        <div style={{ width: '40%', height: 26, background: '#eef2ff', borderRadius: 6, margin: '6px 0' }} />
        <div style={{ width: '60%', height: 11, background: '#f3f4f6', borderRadius: 4 }} />
    </div>
);

const TableRowSkeleton = () => (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
        {Array.from({ length: 12 }).map((_, i) => (
            <td key={i} style={{ padding: '12px 14px' }}>
                <div style={{ height: 16, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
            </td>
        ))}
    </tr>
);

export const CustomerLoyaltyPage = () => {
    // ── Primary States (Matches Customer Directory 1:1) ──
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [customerStats, setCustomerStats] = useState(null);
    const [birthdayCustomers, setBirthdayCustomers] = useState([]);
    const [customerInsights, setCustomerInsights] = useState({});

    // ── Middle Section View Mode Switcher ('tiers' | 'analytics' | 'all') ──
    const [middleView, setMiddleView] = useState('tiers');

    // ── Filters & Search ──
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterPoints, setFilterPoints] = useState('All');
    const [filterTier, setFilterTier] = useState('All');
    const [filterCity, setFilterCity] = useState('All');
    const [sortBy, setSortBy] = useState('points-desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ── Selection & Modals ──
    const [selectedIds, setSelectedIds] = useState([]);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Loyalty Action Modals ('earn' | 'redeem' | 'adjust' | null)
    const [modalMode, setModalMode] = useState(null);
    const [modalTargetCustomer, setModalTargetCustomer] = useState(null);
    const [formPoints, setFormPoints] = useState('');
    const [formReason, setFormReason] = useState('Purchase bonus reward');
    const [formInvoiceId, setFormInvoiceId] = useState('');
    const [formSendWhatsapp, setFormSendWhatsapp] = useState(true);
    const [birthdayGifting, setBirthdayGifting] = useState(false);

    // Loyalty History Drawer
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState(null);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Notification Banner
    const [notification, setNotification] = useState(null);
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4500);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const hasLoadedRef = useRef(false);

    // ── Load CRM & Loyalty Dashboard (Exact same API data source as Customer Directory) ──
    const loadLoyaltyDashboard = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError('');

        try {
            const [customersRes, statsRes, insightsRes] = await Promise.allSettled([
                getCustomers(),
                getCustomerStats(),
                Promise.allSettled([
                    getTopCustomers(),
                    getRetentionReport(),
                    getLifetimeValue(),
                    getLoyaltyReport(),
                    getBirthdayCustomers(),
                ])
            ]);

            if (customersRes.status === 'fulfilled') {
                const list = normalizeApiList(customersRes.value);
                // Standardize with exact same formatCustomerRecord used in Directory
                setCustomers(list.map(c => formatCustomerRecord(c)));
            } else {
                setError('Unable to load customer directory.');
            }

            if (statsRes.status === 'fulfilled') {
                setCustomerStats(statsRes.value);
            }

            if (insightsRes.status === 'fulfilled') {
                const [topRes, retRes, ltvRes, loyRes, bdayRes] = insightsRes.value;
                setCustomerInsights({
                    topCustomers: topRes.status === 'fulfilled' ? topRes.value : null,
                    retention: retRes.status === 'fulfilled' ? retRes.value : null,
                    lifetimeValue: ltvRes.status === 'fulfilled' ? ltvRes.value : null,
                    loyaltyReport: loyRes.status === 'fulfilled' ? loyRes.value : null,
                    birthdays: bdayRes.status === 'fulfilled' ? bdayRes.value : null,
                });
                if (bdayRes.status === 'fulfilled') {
                    setBirthdayCustomers(normalizeApiList(bdayRes.value));
                }
            }
        } catch (err) {
            console.error('Error loading loyalty dashboard data:', err);
            setError(getApiErrorMessage(err, 'Failed to fetch customer data.'));
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        loadLoyaltyDashboard();
    }, [loadLoyaltyDashboard]);

    // ── Status Toggle (Synchronized with Customer Directory) ──
    const handleStatusToggle = async (id, statusArg, isExplicitTarget = false) => {
        let newStatus;
        if (isExplicitTarget) {
            newStatus = statusArg === 'Inactive' ? 'Inactive' : 'Active';
        } else {
            newStatus = statusArg === 'Active' ? 'Inactive' : 'Active';
        }

        setUpdatingStatusId(id);
        if (id) {
            setStoredCustomerStatus(id, newStatus);
        }

        // Optimistic UI update
        setCustomers(prev => prev.map(c => (c.backendId === id || c.id === id) ? { ...c, status: newStatus } : c));
        if (selectedCustomer?.backendId === id || selectedCustomer?.id === id) {
            setSelectedCustomer(prev => prev ? { ...prev, status: newStatus } : prev);
        }

        try {
            if (id) {
                await updateCustomerStatus(id, newStatus.toLowerCase());
            }
        } catch (err) {
            console.error('Failed to update customer status via API:', err);
            // Rollback on error
            const rollbackStatus = isExplicitTarget ? (statusArg || 'Active') : statusArg;
            if (id) {
                setStoredCustomerStatus(id, rollbackStatus);
            }
            setCustomers(prev => prev.map(c => (c.backendId === id || c.id === id) ? { ...c, status: rollbackStatus } : c));
            if (selectedCustomer?.backendId === id || selectedCustomer?.id === id) {
                setSelectedCustomer(prev => prev ? { ...prev, status: rollbackStatus } : prev);
            }
            showNotification(getApiErrorMessage(err, 'Failed to update customer status.'), 'error');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // ── View Profile Drawer (Opens CustomerDetailPanel) ──
    const handleViewCustomerProfile = async (backendId) => {
        const localCust = customers.find(c => c.backendId === backendId);
        if (localCust) setSelectedCustomer(localCust);

        try {
            const rawDetails = await getCustomerById(backendId);
            const fullRecord = formatCustomerRecord(rawDetails);
            setSelectedCustomer(fullRecord);
        } catch (err) {
            console.error('Error fetching customer profile on demand:', err);
        }
    };

    // ── Open History Drawer ──
    const handleOpenHistory = async (customer) => {
        setHistoryCustomer(customer);
        setHistoryOpen(true);
        setHistoryLoading(true);
        try {
            const backendId = customer.backendId || customer.id;
            const res = await getLoyaltyHistory(backendId);
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
        setModalTargetCustomer(customer || (customers.length > 0 ? customers[0] : null));
        setFormPoints('');
        setFormReason(mode === 'redeem' ? 'Store checkout redemption' : 'Purchase bonus reward');
        setFormInvoiceId('');
    };

    const handleCloseModal = () => {
        setModalMode(null);
        setModalTargetCustomer(null);
        setFormPoints('');
        setFormInvoiceId('');
        setFormSendWhatsapp(true);
    };

    // ── Submit Earn / Redeem / Adjust ──
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!modalTargetCustomer) {
            showNotification('Please select a customer.', 'error');
            return;
        }

        const pts = parseInt(formPoints, 10);
        if (isNaN(pts) || pts <= 0) {
            showNotification('Please enter a valid positive points amount.', 'error');
            return;
        }

        const targetBackendId = modalTargetCustomer.backendId || modalTargetCustomer.id;

        if (modalMode === 'redeem') {
            const currentBal = Number(modalTargetCustomer.loyaltyPoints) || 0;
            if (pts > currentBal) {
                showNotification(`Cannot redeem ${pts} points. Customer only has ${currentBal} points available.`, 'error');
                return;
            }
        }

        try {
            setActionLoading(true);

            if (modalMode === 'earn') {
                await earnLoyalty({
                    customer_id: targetBackendId,
                    points: pts,
                    reason: formReason.trim() || 'Loyalty Reward Points Earned',
                    ...(formInvoiceId ? { invoice_id: Number(formInvoiceId) } : {})
                });
                setNotification({
                    type: 'success',
                    message: `Successfully credited ${pts} points to ${modalTargetCustomer.name}!`
                });
            } else if (modalMode === 'redeem') {
                await redeemLoyalty({
                    customer_id: targetBackendId,
                    points: pts
                });
                setNotification({
                    type: 'success',
                    message: `Successfully redeemed ${pts} points for ${modalTargetCustomer.name} (Value: ${fmt(pts * POINTS_TO_INR_RATE)})!`
                });
            } else if (modalMode === 'adjust') {
                await addLoyalty(targetBackendId, pts);
                setNotification({
                    type: 'success',
                    message: `Successfully adjusted loyalty balance by ${pts} points for ${modalTargetCustomer.name}!`
                });
            }

            // WhatsApp instant alert notification
            if (formSendWhatsapp && modalTargetCustomer?.phone) {
                try {
                    const actionTxt = modalMode === 'earn'
                        ? `credited with ${pts} bonus loyalty points`
                        : modalMode === 'redeem'
                            ? `redeemed ${pts} loyalty points (-${fmt(pts * POINTS_TO_INR_RATE)})`
                            : `adjusted by ${pts} points`;

                    const oldBal = Number(modalTargetCustomer.loyaltyPoints) || 0;
                    const newBal = modalMode === 'earn'
                        ? oldBal + pts
                        : modalMode === 'redeem'
                            ? Math.max(0, oldBal - pts)
                            : oldBal + pts;

                    await sendCustomerWhatsapp({
                        customer_id: targetBackendId,
                        channel: 'whatsapp',
                        communication_type: 'WHATSAPP',
                        message: `Hello ${modalTargetCustomer.name}, your loyalty account at Shekru Retail was just ${actionTxt}. Your new balance is ${newBal} pts (Worth ${fmt(newBal * POINTS_TO_INR_RATE)} store credit). Thank you! 🙏`
                    });
                } catch (waErr) {
                    console.warn('WhatsApp alert dispatch failed:', waErr);
                }
            }

            handleCloseModal();
            await loadLoyaltyDashboard(false);
        } catch (err) {
            console.error('Loyalty action error:', err);
            showNotification(getApiErrorMessage(err, `Failed to ${modalMode} points. Please verify details and try again.`), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Birthday Bonus Automation (1-Click Gift 100 Points + WhatsApp wishes) ──
    const handleGiftAllBirthdays = async () => {
        if (!birthdayCustomers || birthdayCustomers.length === 0) return;
        setBirthdayGifting(true);
        let successCount = 0;
        try {
            for (const b of birthdayCustomers) {
                const bId = b.id || b.backendId || b.customer_id;
                try {
                    await earnLoyalty({
                        customer_id: bId,
                        points: 100,
                        reason: 'Happy Birthday Celebration Gift 🎂'
                    });
                    if (b.phone) {
                        await sendCustomerWhatsapp({
                            customer_id: bId,
                            channel: 'whatsapp',
                            communication_type: 'WHATSAPP',
                            message: `🎉 Happy Birthday from Shekru Retail, ${b.name || 'valued customer'}! 🎂 As a special birthday gift, 100 bonus loyalty points (Worth ₹10.00 store credit) have been added to your account. Enjoy your special day! 🎁`
                        }).catch(() => { });
                    }
                    successCount++;
                } catch (err) {
                    console.warn(`Birthday gift failed for customer ${bId}:`, err);
                }
            }
            setNotification({
                type: 'success',
                message: `🎉 Gifted 100 Birthday Bonus Points to ${successCount} shopper${successCount === 1 ? '' : 's'} and sent WhatsApp greetings!`
            });
            await loadLoyaltyDashboard(false);
        } finally {
            setBirthdayGifting(false);
        }
    };

    // ── Export CSV ──
    const handleExportCSV = () => {
        try {
            const headers = ['Customer ID', 'Name', 'Phone', 'Email', 'Segment', 'VIP Tier', 'Loyalty Points', 'INR Value (₹)', 'Total Spent (₹)', 'Status'];
            const rows = filteredCustomers.map(c => {
                const tierInfo = resolveCustomerTier(c);
                return [
                    c.id,
                    `"${(c.name || '').replace(/"/g, '""')}"`,
                    c.phone || '',
                    c.email || '',
                    c.type || 'Regular',
                    tierInfo.name,
                    c.loyaltyPoints || 0,
                    ((c.loyaltyPoints || 0) * POINTS_TO_INR_RATE).toFixed(2),
                    c.totalSpent || 0,
                    c.status || 'Active'
                ];
            });

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `customer_loyalty_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export CSV error:', err);
            showNotification('Failed to export CSV.', 'error');
        }
    };

    // ── Available Cities (Dynamically extracted from real customer data) ──
    const availableCities = useMemo(() => {
        const set = new Set();
        customers.forEach(c => {
            const loc = c.city || c.location;
            if (loc && loc.trim() && loc !== '—') set.add(loc.trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [customers]);

    // ── Filtered & Sorted Customers ──
    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const query = search.trim().toLowerCase();
            const nameStr = (c.name || '').toLowerCase();
            const emailStr = (c.email || '').toLowerCase();
            const phoneStr = String(c.phone || '');
            const cityStr = (c.city || c.location || '').toLowerCase();
            const customerIdStr = String(c.id || '').toLowerCase();
            const backendIdStr = String(c.backendId || '').toLowerCase();

            // 1. Search filter: Name, Email, Phone, City, ID
            const matchesSearch = !query ||
                nameStr.includes(query) ||
                emailStr.includes(query) ||
                phoneStr.includes(query) ||
                cityStr.includes(query) ||
                customerIdStr.includes(query) ||
                backendIdStr.includes(query);

            // 2. Status filter: All, Active, Inactive
            const matchesStatus = filterStatus === 'All' || c.status === filterStatus;

            // 3. Segment filter: All, New, Regular, VIP, Wholesale
            const matchesType = filterType === 'All' || (c.type || '').toLowerCase() === filterType.toLowerCase();

            // 4. City filter: dynamically matched against city or location
            const matchesCity = filterCity === 'All' || (c.city === filterCity) || (c.location === filterCity);

            // 5. Points filter: All, With Points (> 0), Zero Points (0 pts)
            let matchesPoints = true;
            if (filterPoints === 'with_points' || filterPoints === 'has_points') {
                matchesPoints = (Number(c.loyaltyPoints) || 0) > 0;
            } else if (filterPoints === 'zero_points') {
                matchesPoints = (Number(c.loyaltyPoints) || 0) === 0;
            } else if (filterPoints === 'high_points') {
                matchesPoints = (Number(c.loyaltyPoints) || 0) >= 100;
            }

            // 6. VIP Tier filter: All, Silver, Gold, Platinum
            let matchesTier = true;
            if (filterTier !== 'All') {
                const tier = resolveCustomerTier(c).badge;
                matchesTier = tier.toLowerCase() === filterTier.toLowerCase();
            }

            return matchesSearch && matchesStatus && matchesType && matchesCity && matchesPoints && matchesTier;
        }).sort((a, b) => {
            const ptsA = Number(a.loyaltyPoints) || 0;
            const ptsB = Number(b.loyaltyPoints) || 0;
            const spendA = Number(a.totalSpent) || 0;
            const spendB = Number(b.totalSpent) || 0;

            if (sortBy === 'points-desc') return ptsB - ptsA;
            if (sortBy === 'points-asc') return ptsA - ptsB;
            if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
            if (sortBy === 'spend-desc') return spendB - spendA;
            if (sortBy === 'newest') {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : (a.backendId || 0);
                const dateB = b.created_at ? new Date(b.created_at).getTime() : (b.backendId || 0);
                return dateB - dateA;
            }
            return (b.backendId || 0) - (a.backendId || 0);
        });
    }, [customers, search, filterStatus, filterType, filterCity, filterPoints, filterTier, sortBy]);

    // Reset pagination to first page whenever search or any filter changes
    useEffect(() => {
        setPage(1);
    }, [search, filterStatus, filterType, filterCity, filterPoints, filterTier, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
    const paginatedCustomers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredCustomers.slice(start, start + pageSize);
    }, [filteredCustomers, page, pageSize]);

    const hasActiveFilters = Boolean(
        search.trim() ||
        filterStatus !== 'All' ||
        filterType !== 'All' ||
        filterCity !== 'All' ||
        filterPoints !== 'All' ||
        filterTier !== 'All'
    );

    const handleClearFilters = () => {
        setSearch('');
        setFilterStatus('All');
        setFilterType('All');
        setFilterPoints('All');
        setFilterTier('All');
        setFilterCity('All');
        setSortBy('points-desc');
        setPage(1);
    };

    // Selection Handlers
    const isAllPageSelected = useMemo(() => {
        if (paginatedCustomers.length === 0) return false;
        return paginatedCustomers.every(c => selectedIds.includes(c.backendId || c.id));
    }, [paginatedCustomers, selectedIds]);

    const handleToggleSelectAllPage = () => {
        const pageIds = paginatedCustomers.map(c => c.backendId || c.id);
        if (isAllPageSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const handleToggleSelectRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // ── Identical KPI Values to Customer Directory ──
    const totalCustomers = customerStats?.total ?? customers.length;
    const activeCustomers = customerStats?.active ?? customers.filter(c => c.status === 'Active').length;
    const inactiveCustomers = customers.filter(c => c.status === 'Inactive').length;
    const vipCustomers = customers.filter(c => c.type === 'VIP').length;
    const totalPointsPool = customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0);

    // Active Buyers: Only customers who are Active AND have actually placed orders or spent money (> 0)
    const activeBuyersCount = useMemo(() => {
        const raw = customerInsights?.retention;
        if (raw && typeof raw.active_buyers === 'number') return raw.active_buyers;
        return customers.filter(c => c.status === 'Active' && (Number(c.orders || 0) > 0 || Number(c.totalSpent || 0) > 0)).length;
    }, [customerInsights?.retention, customers]);

    // Customers who have zero orders and zero spend
    const zeroSpendCount = useMemo(() => {
        return customers.filter(c => Number(c.orders || 0) === 0 && Number(c.totalSpent || 0) === 0).length;
    }, [customers]);

    // Top Spender: Strictly customers with spend > 0 (prevents 0-spend customers from being labeled Top Spender)
    const topSpenderObj = useMemo(() => {
        // 1. Check API topCustomers first if available
        const apiTopList = normalizeApiList(customerInsights?.topCustomers);
        const validApiTop = apiTopList.find(c => Number(c.total_spend || c.totalSpent || c.revenue || 0) > 0);
        if (validApiTop) {
            return {
                name: validApiTop.name || validApiTop.customer_name || 'Customer',
                amount: Number(validApiTop.total_spend || validApiTop.totalSpent || validApiTop.revenue || 0),
                hasSpender: true,
            };
        }

        // 2. Check local customers with spend > 0
        const customersWithSpend = customers.filter(c => Number(c.totalSpent || c.total_spend || 0) > 0);
        if (customersWithSpend.length === 0) {
            return { name: 'No purchases yet', amount: 0, hasSpender: false };
        }

        const top = [...customersWithSpend].sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0))[0];
        return {
            name: top.name || 'Customer',
            amount: Number(top.totalSpent || 0),
            hasSpender: true,
        };
    }, [customers, customerInsights?.topCustomers]);

    // Uniform analytics card styling (matching Customer Directory exactly: 190px height)
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
        <div className="dash-page dash-page--full" style={{ paddingBottom: 40 }}>
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
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                        background: notification.type === 'success' ? '#065f46' : '#991b1b',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 600,
                        maxWidth: '460px',
                    }}
                >
                    {notification.type === 'success' ? (
                        <BsCheckCircleFill size={18} style={{ color: '#34d399', flexShrink: 0 }} />
                    ) : (
                        <BsXCircleFill size={18} style={{ color: '#f87171', flexShrink: 0 }} />
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

            {/* ── Page Header (Matching Customer Directory Exactly) ── */}
            <div className="adm-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, fontSize: 20 }}>
                            <BsAwardFill />
                        </span>
                        Customer Loyalty & Rewards
                    </h1>
                    <p className="adm-page-sub">
                        Manage customer reward points, VIP membership tiers (Silver, Gold, Platinum), and live redemptions.
                    </p>
                </div>

                <div className="adm-header-actions" style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => loadLoyaltyDashboard(true)}
                        title="Reload live loyalty data"
                    >
                        <BsArrowRepeat size={14} className={loading ? 'spin-icon' : ''} /> Refresh
                    </button>

                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={handleExportCSV}
                    >
                        <BsDownload size={14} /> Export Directory
                    </button>

                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => handleOpenModal('earn')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsPlusCircle size={14} /> Earn Points
                    </button>

                    <button
                        type="button"
                        className="adm-btn-primary"
                        onClick={() => handleOpenModal('redeem')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsGift size={16} /> Redeem Points
                    </button>
                </div>
            </div>

            {/* ── 4 Equal Width & Consistent Height KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5" style={{ width: '100%' }}>
                {loading ? (
                    <>
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                    </>
                ) : (
                    <>
                        {/* Card 1: Total Customers */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 104, height: '100%' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Total Customers</p>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '6px 0 0 0' }}>{totalCustomers}</p>
                            <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>All registered shoppers</span>
                        </div>

                        {/* Card 2: Active Customers */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 104, height: '100%' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Active Customers</p>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#10b981', margin: '6px 0 0 0' }}>{activeCustomers}</p>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 }}>Enrolled in rewards</span>
                        </div>

                        {/* Card 3: Points In Circulation */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 104, height: '100%' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Points In Circulation</p>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#d97706', margin: '6px 0 0 0' }}>
                                {totalPointsPool.toLocaleString('en-IN')}
                            </p>
                            <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 4 }}>
                                Liability: ~{fmt(totalPointsPool * POINTS_TO_INR_RATE)}
                            </span>
                        </div>

                        {/* Card 4: VIP Segment */}
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 104, height: '100%' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>VIP Segment</p>
                            <p style={{ fontSize: 26, fontWeight: 800, color: '#8b5cf6', margin: '6px 0 0 0' }}>{vipCustomers}</p>
                            <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600, marginTop: 4 }}>Platinum tier shoppers</span>
                        </div>
                    </>
                )}
            </div>

            {/* ── Birthday Reminders Banner (Matching Customer Directory) ── */}
            {birthdayCustomers.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>🎂</span>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>Birthday Reminders & Bonus Rewards</p>
                            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0 0' }}>
                                {birthdayCustomers.slice(0, 4).map(b => b.name || b.customer_name).join(', ')}
                                {birthdayCustomers.length > 4 ? ` +${birthdayCustomers.length - 4} more` : ''}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 16, border: '1px solid #fde68a' }}>
                            {birthdayCustomers.length} Birthdays
                        </span>
                        <button
                            type="button"
                            onClick={handleGiftAllBirthdays}
                            disabled={birthdayGifting}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#d97706',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 14px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: birthdayGifting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                            }}
                        >
                            {birthdayGifting ? 'Gifting Points…' : '🎁 Gift 100 Birthday Points to All'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── MIDDLE SECTION VIEW SWITCHER (Refinement 3: Eliminates excessive vertical scrolling) ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <button
                        type="button"
                        onClick={() => setMiddleView('tiers')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: middleView === 'tiers' ? '#ffffff' : 'transparent',
                            color: middleView === 'tiers' ? '#111827' : '#64748b',
                            fontWeight: middleView === 'tiers' ? 700 : 500,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: middleView === 'tiers' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <BsAwardFill color="#f59e0b" size={13} />
                        VIP Tiers & Earning Rules
                    </button>

                    <button
                        type="button"
                        onClick={() => setMiddleView('analytics')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: middleView === 'analytics' ? '#ffffff' : 'transparent',
                            color: middleView === 'analytics' ? '#111827' : '#64748b',
                            fontWeight: middleView === 'analytics' ? 700 : 500,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: middleView === 'analytics' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <BsStarFill color="#6366f1" size={13} />
                        Intelligence & Top Champions
                    </button>

                    <button
                        type="button"
                        onClick={() => setMiddleView('all')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: middleView === 'all' ? '#ffffff' : 'transparent',
                            color: middleView === 'all' ? '#111827' : '#64748b',
                            fontWeight: middleView === 'all' ? 700 : 500,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: middleView === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <BsGridFill size={12} color="#475569" />
                        View All
                    </button>
                </div>

                <div style={{ fontSize: 12, color: '#475569', background: '#fff', padding: '5px 12px', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BsInfoCircleFill size={13} color="#6366f1" />
                    <span>Redemption Formula: <strong>10 Points = ₹1.00 Store Credit</strong> at checkout</span>
                </div>
            </div>

            {/* ── VIEW A: VIP Membership Tiers Configuration Cards ── */}
            {(middleView === 'tiers' || middleView === 'all') && (
                <div style={{ marginBottom: 20 }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ width: '100%' }}>
                        {TIER_CONFIG.map((tier) => (
                            <div
                                key={tier.slug}
                                style={{
                                    background: '#ffffff',
                                    borderRadius: 14,
                                    border: '1px solid #e5e7eb',
                                    borderTop: `4px solid ${tier.color}`,
                                    padding: '20px 22px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: 195,
                                    height: '100%'
                                }}
                            >
                                <div>
                                    {/* Header: Icon + Tier Name + Spending Threshold Badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 22, lineHeight: 1 }}>{tier.icon}</span>
                                            <div>
                                                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
                                                    {tier.tier}
                                                </h4>
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '4px 10px',
                                                borderRadius: 20,
                                                background: tier.bgColor,
                                                color: tier.color,
                                                border: `1px solid ${tier.borderColor}`,
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Required spending threshold for this membership tier"
                                        >
                                            {tier.maxSpend ? `Spend ${fmt(tier.minSpend)} – ${fmt(tier.maxSpend)}` : `Spend ${fmt(tier.minSpend)}+`}
                                        </span>
                                    </div>

                                    {/* Highlighted Earning Rate Box */}
                                    <div
                                        style={{
                                            marginBottom: 12,
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            background: '#f8fafc',
                                            border: '1px solid #f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Earning Rate
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                                            ⚡ {tier.rate}
                                        </span>
                                    </div>

                                    {/* Perks & Benefits */}
                                    <div style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.5 }}>
                                        <span style={{ fontWeight: 700, color: '#1f2937' }}>Perks: </span>
                                        <span>{tier.perks}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── VIEW B: Customer Intelligence & Loyalty Analytics Grid ── */}
            {(middleView === 'analytics' || middleView === 'all') && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                        {/* Card 1: Top Customers / Champions */}
                        <div style={analyticsCardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    🏆 Top Champions
                                </span>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>By points & spend</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }} className="custom-scrollbar">
                                {(() => {
                                    const list = normalizeApiList(customerInsights.topCustomers);
                                    const candidateList = list.length > 0 ? list : customers;
                                    const top5 = candidateList
                                        .filter(c => (c.loyalty_points ?? c.loyaltyPoints ?? 0) > 0 || Number(c.total_spend || c.totalSpent || 0) > 0)
                                        .sort((a, b) => (b.loyalty_points ?? b.loyaltyPoints ?? 0) - (a.loyalty_points ?? a.loyaltyPoints ?? 0))
                                        .slice(0, 5);

                                    if (top5.length === 0) {
                                        return (
                                            <div style={{ padding: '28px 12px', textAlign: 'center', color: '#9ca3af', margin: 'auto' }}>
                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', margin: 0 }}>No Champions Yet</p>
                                                <p style={{ fontSize: 10, margin: '4px 0 0', color: '#9ca3af' }}>Points and spend appear once customer orders are placed.</p>
                                            </div>
                                        );
                                    }

                                    return top5.map((c, idx) => (
                                        <div key={c.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: '#f9fafb', borderRadius: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 10, fontWeight: 800, color: idx === 0 ? '#d97706' : '#6b7280', background: idx === 0 ? '#fffbeb' : '#e5e7eb', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontWeight: 600, color: '#111827', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.name || c.customer_name || 'Customer'}
                                                </span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: '#d97706' }}>
                                                {(c.loyalty_points ?? c.loyaltyPoints ?? 0)} pts
                                            </span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Card 2: Retention & Active Ratio */}
                        <div style={analyticsCardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    📈 Retention Report
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>
                                    {(() => {
                                        const raw = customerInsights.retention;
                                        const tot = raw?.total_customers ?? totalCustomers;
                                        return raw?.retention_rate || (tot > 0 ? `${Math.round((activeBuyersCount / tot) * 100)}%` : '0%');
                                    })()}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                                <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Active Buyers</span>
                                    <p style={{ fontSize: 16, fontWeight: 800, color: activeBuyersCount > 0 ? '#10b981' : '#9ca3af', margin: '2px 0 0 0' }}>
                                        {activeBuyersCount}
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Zero Spend</span>
                                    <p style={{ fontSize: 16, fontWeight: 800, color: '#6b7280', margin: '2px 0 0 0' }}>
                                        {zeroSpendCount}
                                    </p>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Tracked User Base</span>
                                <span style={{ fontWeight: 700, color: '#111827' }}>{totalCustomers} customers</span>
                            </div>
                        </div>

                        {/* Card 3: Lifetime Value (LTV) */}
                        <div style={analyticsCardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    💎 Lifetime Value (LTV)
                                </span>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Top 5 LTV</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }} className="custom-scrollbar">
                                {(() => {
                                    const rawLtv = customerInsights.lifetimeValue;
                                    let ltvList = [];
                                    if (Array.isArray(rawLtv)) ltvList = rawLtv;
                                    else if (rawLtv?.items || rawLtv?.customers || rawLtv?.top_customers) {
                                        ltvList = rawLtv.items || rawLtv.customers || rawLtv.top_customers;
                                    } else {
                                        ltvList = customers;
                                    }
                                    const top5Ltv = ltvList
                                        .filter(c => Number(c.total_spend || c.totalSpent || c.revenue || c.ltv || 0) > 0)
                                        .sort((a, b) => Number(b.total_spend || b.totalSpent || b.revenue || b.ltv || 0) - Number(a.total_spend || a.totalSpent || a.revenue || a.ltv || 0))
                                        .slice(0, 5);

                                    return top5Ltv.length === 0 ? (
                                        <div style={{ padding: '28px 12px', textAlign: 'center', color: '#9ca3af', margin: 'auto' }}>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', margin: 0 }}>No LTV Data Yet</p>
                                            <p style={{ fontSize: 10, margin: '4px 0 0', color: '#9ca3af' }}>Calculated after customer orders are logged.</p>
                                        </div>
                                    ) : (
                                        top5Ltv.map((c, idx) => (
                                            <div key={c.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: '#f9fafb', borderRadius: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6' }}>#{idx + 1}</span>
                                                    <span style={{ fontWeight: 600, color: '#111827', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {c.name || c.customer_name || 'Customer'}
                                                    </span>
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#8b5cf6' }}>
                                                    {fmt(c.ltv || c.lifetime_value || c.total_spend || c.totalSpent || 0)}
                                                </span>
                                            </div>
                                        ))
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Card 4: Loyalty Program Summary */}
                        <div style={analyticsCardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    🎁 Loyalty Summary
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 10 }}>
                                    Rewards Pool
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                                <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Enrolled</span>
                                    <p style={{ fontSize: 16, fontWeight: 800, color: '#d97706', margin: '2px 0 0 0' }}>
                                        {customerInsights.loyaltyReport?.enrolled_members ?? customers.filter(c => (c.loyaltyPoints || 0) > 0).length} members
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Points Balance</span>
                                    <p style={{ fontSize: 16, fontWeight: 800, color: '#d97706', margin: '2px 0 0 0' }}>
                                        {totalPointsPool.toLocaleString('en-IN')} pts
                                    </p>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Store Value Liability</span>
                                <span style={{ fontWeight: 700, color: '#111827' }}>
                                    {fmt(totalPointsPool * POINTS_TO_INR_RATE)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Customer Loyalty Table Card (Identical Design & Font to Customer Directory) ── */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Search & Filter Bar */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', background: '#ffffff' }}>
                    {/* Row 1: Search input + Sorter */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: 460, flex: '1 1 320px' }}>
                            <BsSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                            <input
                                type="text"
                                className="ec-input"
                                placeholder="Search by customer name, email, phone, city or ID..."
                                value={search}
                                onChange={e => { setSearch(e.target.value.replace(/^\s+/, '')); setPage(1); }}
                                style={{ paddingLeft: 38, paddingRight: search ? 34 : 14, width: '100%', height: 40, fontSize: 13, borderRadius: 8 }}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); setPage(1); }}
                                    style={{
                                        position: 'absolute',
                                        right: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#9ca3af',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        lineHeight: 1
                                    }}
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Sorter on Row 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 700, whiteSpace: 'nowrap' }}>Sort By:</span>
                            <select
                                className="ec-input"
                                value={sortBy}
                                onChange={e => { setSortBy(e.target.value); setPage(1); }}
                                style={{ height: 40, fontSize: 12.5, padding: '0 12px', minWidth: 185, borderRadius: 8 }}
                            >
                                <option value="points-desc">Highest Points First</option>
                                <option value="points-asc">Lowest Points First</option>
                                <option value="name-asc">Name A–Z</option>
                                <option value="name-desc">Name Z–A</option>
                                <option value="spend-desc">Highest Spending</option>
                                <option value="newest">Newest Customers</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Filter Dropdowns */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                        {/* Status Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>Status:</span>
                            <select
                                className="ec-input"
                                value={filterStatus}
                                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                style={{ height: 36, fontSize: 12, padding: '0 10px', borderRadius: 7 }}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Segment Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>Segment:</span>
                            <select
                                className="ec-input"
                                value={filterType}
                                onChange={e => { setFilterType(e.target.value); setPage(1); }}
                                style={{ height: 36, fontSize: 12, padding: '0 10px', borderRadius: 7 }}
                            >
                                <option value="All">All Segments</option>
                                <option value="New">New</option>
                                <option value="Regular">Regular</option>
                                <option value="VIP">VIP</option>
                                <option value="Wholesale">Wholesale</option>
                            </select>
                        </div>

                        {/* VIP Tier Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>VIP Tier:</span>
                            <select
                                className="ec-input"
                                value={filterTier}
                                onChange={e => { setFilterTier(e.target.value); setPage(1); }}
                                style={{ height: 36, fontSize: 12, padding: '0 10px', borderRadius: 7 }}
                            >
                                <option value="All">All Tiers</option>
                                <option value="Silver">🥈 Silver</option>
                                <option value="Gold">🥇 Gold</option>
                                <option value="Platinum">💎 Platinum</option>
                            </select>
                        </div>

                        {/* Points Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>Points:</span>
                            <select
                                className="ec-input"
                                value={filterPoints}
                                onChange={e => { setFilterPoints(e.target.value); setPage(1); }}
                                style={{ height: 36, fontSize: 12, padding: '0 10px', borderRadius: 7 }}
                            >
                                <option value="All">All Points</option>
                                <option value="with_points">With Points (&gt; 0)</option>
                                <option value="zero_points">Zero Points (0 pts)</option>
                            </select>
                        </div>

                        {/* City Filter (populated dynamically from actual customer data) */}
                        {availableCities.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>City:</span>
                                <select
                                    className="ec-input"
                                    value={filterCity}
                                    onChange={e => { setFilterCity(e.target.value); setPage(1); }}
                                    style={{ height: 36, fontSize: 12, padding: '0 10px', borderRadius: 7 }}
                                >
                                    <option value="All">All Cities</option>
                                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 6, transition: 'all 0.15s ease', marginLeft: 'auto' }}
                                title="Reset all search, sorting and category filters"
                            >
                                Reset Filters ✕
                            </button>
                        )}
                    </div>

                    {/* Active Filter Chips */}
                    {hasActiveFilters && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc' }}>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>Active Filters:</span>
                            {search && (
                                <span style={{ fontSize: 11, background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    Search: "{search}"
                                    <button type="button" onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                </span>
                            )}
                            {filterStatus !== 'All' && (
                                <span style={{ fontSize: 11, background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    Status: {filterStatus}
                                    <button type="button" onClick={() => setFilterStatus('All')} style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                </span>
                            )}
                            {filterType !== 'All' && (
                                <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    Segment: {filterType}
                                    <button type="button" onClick={() => setFilterType('All')} style={{ border: 'none', background: 'transparent', color: '#d97706', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                </span>
                            )}
                            {filterTier !== 'All' && (
                                <span style={{ fontSize: 11, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    Tier: {filterTier}
                                    <button type="button" onClick={() => setFilterTier('All')} style={{ border: 'none', background: 'transparent', color: '#7c3aed', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                </span>
                            )}
                            {filterPoints !== 'All' && (
                                <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    Points: {filterPoints === 'with_points' ? 'With Points' : filterPoints === 'zero_points' ? 'Zero Points' : filterPoints}
                                    <button type="button" onClick={() => setFilterPoints('All')} style={{ border: 'none', background: 'transparent', color: '#d97706', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                </span>
                            )}
                            {filterCity !== 'All' && (
                                <span style={{ fontSize: 11, background: '#f0f9ff', color: '#0ea5e9', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                    City: {filterCity}
                                    <button type="button" onClick={() => setFilterCity('All')} style={{ border: 'none', background: 'transparent', color: '#0ea5e9', cursor: 'pointer', padding: 0, fontWeight: 800 }}>✕</button>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }}
                            >
                                Clear All ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* Directory Table with Smooth Horizontal Scrolling and Sticky Headers */}
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 270px)', minHeight: 400, position: 'relative', scrollBehavior: 'smooth' }} className="custom-scrollbar">
                    <table style={{ width: '100%', minWidth: 1360, borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 10px', width: 36, minWidth: 36, textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isAllPageSelected}
                                        onChange={handleToggleSelectAllPage}
                                        title="Select all customers on this page"
                                        style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                </th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 8px', width: 55, minWidth: 55, textAlign: 'center' }}>Sr. No.</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 250, width: 270 }}>Customer Name</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 175, whiteSpace: 'nowrap' }}>Segment & Tier</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 135, whiteSpace: 'nowrap' }}>Phone</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 170, width: 180 }}>Address</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 12px', width: 80, minWidth: 80, textAlign: 'center', whiteSpace: 'nowrap' }}>Orders</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 125, textAlign: 'right', whiteSpace: 'nowrap' }}>Total Spent</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 165, textAlign: 'left', whiteSpace: 'nowrap' }}>Loyalty Balance</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', minWidth: 140, textAlign: 'left', whiteSpace: 'nowrap' }}>Wallet Balance</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', width: 110, minWidth: 110, textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                                <th style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 0 #e5e7eb', padding: '9px 14px', width: 220, minWidth: 220, textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <>
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                </>
                            ) : paginatedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={12} style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 }}>No Customers Found</p>
                                        <p style={{ fontSize: 12.5, marginTop: 4 }}>Try adjusting your search filter or add a new customer.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCustomers.map((cust, idx) => {
                                    const custId = cust.backendId || cust.id;
                                    const isRowSelected = selectedIds.includes(custId);
                                    const serialNumber = (page - 1) * pageSize + idx + 1;
                                    const points = Number(cust.loyaltyPoints) || 0;
                                    const rupeeVal = points * POINTS_TO_INR_RATE;
                                    const tierInfo = resolveCustomerTier(cust);
                                    const locationText = cust.location || cust.city || '—';

                                    return (
                                        <tr
                                            key={cust.id}
                                            style={{
                                                borderBottom: '1px solid #f3f4f6',
                                                background: isRowSelected ? '#f5f3ff' : '#ffffff',
                                                transition: 'background 0.15s ease'
                                            }}
                                            className="table-row-hover"
                                        >
                                            <td style={{ padding: '9px 10px', width: 36, textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isRowSelected}
                                                    onChange={() => handleToggleSelectRow(custId)}
                                                    style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                                />
                                            </td>

                                            <td style={{ padding: '9px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12, width: 55, borderBottom: '1px solid #f3f4f6' }}>
                                                {serialNumber}
                                            </td>

                                            <td style={{ padding: '9px 14px', borderBottom: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {cust.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <p
                                                            style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 13, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}
                                                            title={cust.name}
                                                        >
                                                            {cust.name}
                                                        </p>
                                                        <p
                                                            style={{ fontSize: 11.5, color: '#6b7280', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}
                                                            title={cust.email || 'No email registered'}
                                                        >
                                                            {cust.email || 'No email'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Segment & Tier */}
                                            <td style={{ padding: '9px 14px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: typeCfg[cust.type]?.bg || '#eef2ff', color: typeCfg[cust.type]?.color || '#6366f1', textTransform: 'capitalize' }}>
                                                        {cust.type}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 12,
                                                            background: tierInfo.bg,
                                                            color: tierInfo.color,
                                                            border: `1px solid ${tierInfo.border}`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                        title={`Loyalty Tier: ${tierInfo.name}`}
                                                    >
                                                        <span>{tierInfo.icon}</span> {tierInfo.badge}
                                                    </span>
                                                </div>
                                            </td>

                                            <td style={{ padding: '9px 14px', color: '#374151', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>
                                                {cust.phone || '—'}
                                            </td>

                                            <td style={{ padding: '9px 14px', color: '#374151', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
                                                <span
                                                    style={{ display: 'inline-block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: locationText !== '—' ? 'help' : 'default' }}
                                                    title={`Full Location: ${locationText}`}
                                                >
                                                    {locationText}
                                                </span>
                                            </td>

                                            <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#111827', fontSize: 13, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>
                                                {cust.orders ?? 0}
                                            </td>

                                            <td style={{ padding: '9px 14px', fontWeight: 800, color: '#10b981', fontSize: 13, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>
                                                {fmt(cust.totalSpent)}
                                            </td>

                                            {/* Loyalty Points Balance */}
                                            <td style={{ padding: '9px 14px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontSize: 12.5 }}>
                                                    {points === 0 ? (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 6, background: '#f3f4f6', color: '#9ca3af', fontWeight: 600, fontSize: 11.5 }}>
                                                            <BsCoin size={12} color="#cbd5e1" />
                                                            <span>0 pts</span>
                                                        </div>
                                                    ) : points >= 100 ? (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 6, background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 800, fontSize: 11.5 }}>
                                                            <BsCoin size={13} color="#d97706" />
                                                            <span>{points.toLocaleString('en-IN')} pts</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 6, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: 700, fontSize: 11.5 }}>
                                                            <BsCoin size={13} color="#10b981" />
                                                            <span>{points.toLocaleString('en-IN')} pts</span>
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: 11, color: points > 0 ? '#059669' : '#9ca3af', fontWeight: 600, marginTop: 2 }}>
                                                        {points > 0 ? `Worth ${fmt(rupeeVal)}` : 'No points yet'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Wallet Balance Column */}
                                            <td style={{ padding: '9px 14px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <BsWallet2 size={13} style={{ color: '#6366f1' }} />
                                                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>
                                                        {fmt(cust.credit || cust.wallet_balance || 0)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '9px 14px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                {(() => {
                                                    const isAct = cust.status === 'Active';
                                                    const bg = isAct ? '#ecfdf5' : '#f3f4f6';
                                                    const color = isAct ? '#059669' : '#4b5563';
                                                    const border = isAct ? '#a7f3d0' : '#e5e7eb';
                                                    const dotBg = isAct ? '#10b981' : '#9ca3af';
                                                    const label = isAct ? 'Active' : 'Inactive';

                                                    return (
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                padding: '2px 8px',
                                                                borderRadius: 12,
                                                                background: bg,
                                                                color: color,
                                                                border: `1px solid ${border}`,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: 5,
                                                                    height: 5,
                                                                    borderRadius: '50%',
                                                                    background: dotBg,
                                                                }}
                                                            />
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>

                                            {/* Actions Column */}
                                            <td style={{ padding: '9px 14px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                                    {/* Status Toggle */}
                                                    <span title={cust.status === 'Active' ? 'Deactivate customer account' : 'Activate customer account'}>
                                                        <CustomerStatusToggle
                                                            isActive={cust.status === 'Active'}
                                                            loading={updatingStatusId === custId}
                                                            onToggle={() => handleStatusToggle(custId, cust.status)}
                                                        />
                                                    </span>

                                                    {/* View Profile Details */}
                                                    <button
                                                        type="button"
                                                        title="View customer profile and loyalty details"
                                                        onClick={() => handleViewCustomerProfile(custId)}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#6366f1',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsEye size={14} />
                                                    </button>

                                                    {/* Edit Customer */}
                                                    <button
                                                        type="button"
                                                        title="Edit customer information"
                                                        onClick={() => setEditingCustomer(cust)}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#374151',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsPencilSquare size={13} />
                                                    </button>

                                                    {/* Earn Loyalty Points */}
                                                    <button
                                                        type="button"
                                                        title="Credit / Add loyalty points to customer"
                                                        onClick={() => handleOpenModal('earn', cust)}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#059669',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.borderColor = '#10b981'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsPlusCircle size={14} />
                                                    </button>

                                                    {/* Redeem Loyalty Points */}
                                                    <button
                                                        type="button"
                                                        title={points > 0 ? `Redeem ${points.toLocaleString('en-IN')} loyalty points` : 'No loyalty points available to redeem'}
                                                        onClick={() => handleOpenModal('redeem', cust)}
                                                        disabled={points <= 0}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: points > 0 ? '#ffffff' : '#f9fafb',
                                                            color: points > 0 ? '#4f46e5' : '#cbd5e1',
                                                            cursor: points > 0 ? 'pointer' : 'not-allowed',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={e => { if (points > 0) { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; } }}
                                                        onMouseLeave={e => { if (points > 0) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; } }}
                                                    >
                                                        <BsGift size={13} />
                                                    </button>

                                                    {/* Points Transaction Ledger */}
                                                    <button
                                                        type="button"
                                                        title="View loyalty points transaction history"
                                                        onClick={() => handleOpenHistory(cust)}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#475569',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsClockHistory size={13} />
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

                {/* Pagination Controls */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', flexWrap: 'wrap', gap: 10 }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                        Showing <strong>{filteredCustomers.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, filteredCustomers.length)}</strong> of <strong>{filteredCustomers.length}</strong> records
                    </p>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        {/* Entries per Page Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Entries per page:</span>
                            <select
                                className="ec-input"
                                value={pageSize}
                                onChange={e => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                style={{
                                    height: 32,
                                    fontSize: 12,
                                    padding: '0 8px',
                                    borderRadius: 6,
                                    background: '#ffffff',
                                    border: '1px solid #d1d5db',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    color: '#374151',
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        {/* Navigation Controls: Arrows only */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                title="Previous Page"
                                aria-label="Previous Page"
                                style={{
                                    width: 32,
                                    height: 32,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                }}
                            >
                                <BsChevronLeft size={14} />
                            </button>

                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', padding: '0 6px' }}>
                                Page {page} of {totalPages}
                            </span>

                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                title="Next Page"
                                aria-label="Next Page"
                                style={{
                                    width: 32,
                                    height: 32,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                }}
                            >
                                <BsChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── EARN / REDEEM MODAL (Exact Matching ec-modal CSS) ── */}
            {modalMode && (
                <div className="ec-modal-overlay" onClick={handleCloseModal}>
                    <div className="ec-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>
                                    {modalMode === 'earn' ? 'Earn Loyalty Points' : modalMode === 'redeem' ? 'Redeem Customer Points' : 'Adjust Loyalty Balance'}
                                </h3>
                                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
                                    {modalMode === 'earn'
                                        ? 'Credit points against shopping invoices or promotional bonuses'
                                        : modalMode === 'redeem'
                                            ? 'Convert points into instant invoice discounts'
                                            : 'Update customer point ledger'}
                                </p>
                            </div>
                            <button type="button" className="ec-modal-close" onClick={handleCloseModal}>✕</button>
                        </div>

                        <form onSubmit={handleFormSubmit} style={{ marginTop: 14 }}>
                            {/* Customer Select */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    Customer *
                                </label>
                                <select
                                    className="ec-input"
                                    value={modalTargetCustomer?.backendId || modalTargetCustomer?.id || ''}
                                    onChange={(e) => {
                                        const cust = customers.find(c => (c.backendId || c.id) === Number(e.target.value));
                                        setModalTargetCustomer(cust);
                                    }}
                                    required
                                >
                                    {customers.map((c) => {
                                        const t = resolveCustomerTier(c);
                                        return (
                                            <option key={c.backendId || c.id} value={c.backendId || c.id}>
                                                {c.name} ({c.phone || c.id}) • {t.name} — Balance: {c.loyaltyPoints || 0} pts
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Customer Balance & Tier Preview Box */}
                            {modalTargetCustomer && (() => {
                                const t = resolveCustomerTier(modalTargetCustomer);
                                return (
                                    <div style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Balance:</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
                                                    {t.icon} {t.badge}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <BsCoin /> {(modalTargetCustomer.loyaltyPoints || 0).toLocaleString('en-IN')} pts
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Rupee Value:</span>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>
                                                {fmt((modalTargetCustomer.loyaltyPoints || 0) * POINTS_TO_INR_RATE)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Points Input */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    {modalMode === 'earn' ? 'Points to Earn *' : modalMode === 'redeem' ? 'Points to Redeem *' : 'Points to Add *'}
                                </label>
                                <input
                                    className="ec-input"
                                    type="number"
                                    min="1"
                                    max={modalMode === 'redeem' ? (modalTargetCustomer?.loyaltyPoints || 1) : 10000}
                                    placeholder="Enter points (e.g. 50)"
                                    value={formPoints}
                                    onChange={(e) => setFormPoints(e.target.value)}
                                    required
                                />
                                {formPoints && !isNaN(parseInt(formPoints, 10)) && (
                                    <p style={{ fontSize: 11, color: modalMode === 'redeem' ? '#10b981' : '#6366f1', fontWeight: 600, marginTop: 4 }}>
                                        {modalMode === 'redeem'
                                            ? `Redeeming ${formPoints} pts will apply a ${fmt(parseInt(formPoints, 10) * POINTS_TO_INR_RATE)} bill discount.`
                                            : `Worth ${fmt(parseInt(formPoints, 10) * POINTS_TO_INR_RATE)} in customer rewards value.`}
                                    </p>
                                )}
                            </div>

                            {/* Invoice ID */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    Invoice ID <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
                                </label>
                                <input
                                    className="ec-input"
                                    type="number"
                                    placeholder="e.g. 1024"
                                    value={formInvoiceId}
                                    onChange={(e) => setFormInvoiceId(e.target.value)}
                                />
                            </div>

                            {/* Reason for Earn */}
                            {modalMode === 'earn' && (
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                        Reason / Remark *
                                    </label>
                                    <input
                                        className="ec-input"
                                        type="text"
                                        placeholder="e.g. Purchase bonus reward"
                                        value={formReason}
                                        onChange={(e) => setFormReason(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {/* WhatsApp Notification Option */}
                            {modalTargetCustomer?.phone && (
                                <div
                                    style={{
                                        marginBottom: 16,
                                        padding: '10px 14px',
                                        background: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setFormSendWhatsapp(!formSendWhatsapp)}
                                >
                                    <input
                                        type="checkbox"
                                        id="formSendWhatsappCheck"
                                        checked={formSendWhatsapp}
                                        onChange={(e) => setFormSendWhatsapp(e.target.checked)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#16a34a' }}
                                    />
                                    <label
                                        htmlFor="formSendWhatsappCheck"
                                        style={{ fontSize: 12, color: '#166534', fontWeight: 600, cursor: 'pointer', margin: 0, userSelect: 'none' }}
                                    >
                                        📲 Send instant WhatsApp points confirmation to {modalTargetCustomer.phone}
                                    </label>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                <button type="button" className="adm-btn-secondary" onClick={handleCloseModal} disabled={actionLoading}>
                                    Cancel
                                </button>
                                <button type="submit" className="adm-btn-primary" disabled={actionLoading}>
                                    {actionLoading ? 'Processing...' : modalMode === 'earn' ? 'Credit Points' : modalMode === 'redeem' ? 'Confirm Redemption' : 'Save Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── CUSTOMER LOYALTY HISTORY MODAL (Matching ec-modal CSS) ── */}
            {historyOpen && (
                <div className="ec-modal-overlay" onClick={() => setHistoryOpen(false)}>
                    <div className="ec-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>
                                    Points History: {historyCustomer?.name}
                                </h3>
                                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
                                    Balance: <strong>{(historyCustomer?.loyaltyPoints || 0).toLocaleString('en-IN')} pts</strong> ({fmt((historyCustomer?.loyaltyPoints || 0) * POINTS_TO_INR_RATE)})
                                </p>
                            </div>
                            <button type="button" className="ec-modal-close" onClick={() => setHistoryOpen(false)}>✕</button>
                        </div>

                        <div style={{ maxHeight: 380, overflowY: 'auto', marginTop: 14 }}>
                            {historyLoading ? (
                                <p style={{ padding: '30px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                                    Loading points transaction ledger...
                                </p>
                            ) : historyList.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: 28, marginBottom: 6 }}>📜</div>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>No Loyalty Transactions</p>
                                    <p style={{ fontSize: 12, marginTop: 4 }}>Earn or redeem transactions for this customer will be logged here.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {historyList.map((item, idx) => {
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
                                                    padding: '10px 14px',
                                                    borderRadius: 8,
                                                    border: '1px solid #e5e7eb',
                                                    background: '#ffffff'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div
                                                        style={{
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: 6,
                                                            background: isRedeemed ? '#fee2e2' : '#ecfdf5',
                                                            color: isRedeemed ? '#dc2626' : '#059669',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 14
                                                        }}
                                                    >
                                                        {isRedeemed ? <BsArrowDownLeft /> : <BsArrowUpRight />}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', margin: 0 }}>
                                                            {isRedeemed ? 'Points Redeemed' : 'Points Earned'}
                                                            {item.invoice_id && (
                                                                <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 6 }}>
                                                                    (Invoice #{item.invoice_id})
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0 0' }}>
                                                            {dateStr} {item.expiry_date ? `• Expires: ${item.expiry_date}` : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontWeight: 800, fontSize: 14, color: isRedeemed ? '#dc2626' : '#059669' }}>
                                                        {isRedeemed ? `-${pts}` : `+${pts}`} pts
                                                    </span>
                                                    {item.balance_points !== undefined && item.balance_points !== null && (
                                                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0 0' }}>
                                                            Bal: {item.balance_points} pts
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                            <button type="button" className="adm-btn-secondary" onClick={() => setHistoryOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT CUSTOMER MODAL (Exact same EditCustomerModal as Customer Directory) ── */}
            {editingCustomer && (
                <EditCustomerModal
                    customer={editingCustomer}
                    onClose={() => setEditingCustomer(null)}
                    onSaved={async (updatedData) => {
                        if (updatedData) {
                            setCustomers(prev => prev.map(c =>
                                (c.backendId === updatedData.backendId || c.id === updatedData.id)
                                    ? { ...c, ...updatedData }
                                    : c
                            ));
                            if (selectedCustomer && (selectedCustomer.backendId === updatedData.backendId || selectedCustomer.id === updatedData.id)) {
                                setSelectedCustomer(prev => prev ? { ...prev, ...updatedData } : prev);
                            }
                            showNotification('Customer updated successfully!', 'success');
                        }
                        await loadLoyaltyDashboard(true);
                    }}
                />
            )}

            {/* ── CUSTOMER PROFILE DETAIL DRAWER (Loyalty & Rewards Focus) ── */}
            {selectedCustomer && (
                <CustomerDetailPanel
                    customer={selectedCustomer}
                    detailExtras={customerInsights}
                    onClose={() => setSelectedCustomer(null)}
                    onStatusChange={handleStatusToggle}
                    onRefresh={handleViewCustomerProfile}
                    onCustomerUpdated={loadLoyaltyDashboard}
                    showFeedback={true}
                    allowedTabs={['Overview', 'Loyalty', 'Wallet', 'Orders', 'Actions']}
                    hideLoyalty={false}
                    hideWallet={false}
                />
            )}
        </div>
    );
};

export default CustomerLoyaltyPage;
