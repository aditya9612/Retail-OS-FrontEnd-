import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import '../../components/Categories/CategoryCards.css';
import { PageContainer, PageHeader, KpiGrid, KpiCard } from '../../components/Common/PageComponents';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell,
    LabelList,
} from 'recharts';
import {
    BsShop,
    BsCalendar3,
    BsChevronDown,
    BsChevronLeft,
    BsChevronRight,
    BsCheck2,
    BsEye,
    BsBarChartFill,
    BsCart3,
    BsPeopleFill,
    BsBoxSeam,
    BsArrowUp,
    BsReceiptCutoff,
    BsTrophyFill,
    BsArrowRepeat,
    BsExclamationCircleFill,
    BsBox,
    BsBell,
    BsCheckCircleFill,
    BsArrowRight,
    BsX,
    BsTagFill,
    BsGraphUpArrow,
    BsPercent,
    BsCashStack,
} from 'react-icons/bs';

import {
    getDashboardSummary,
    getDashboardOverview,
    getRevenueVsCost,
    getTopProducts,
    getRecentTransactions,
    getStores,
    getStoreSummary,
    getAnalyticsProducts,
    buildDateFilterParams,
} from '../../services/dashboard';
import { getOrders } from '../../services/orderService';
import { getInvoices } from '../../services/billingService';
import './dashboard.css';

const PERIOD_LABELS = {
    today: 'Today',
    this_week: 'This Week',
    this_year: 'This Year',
    this_month: 'This Month',
    last_month: 'Last Month',
    last_year: 'Last Year',
};

const parseMetric = (val) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
};

const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    const num = Number(val);
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatCompactCurrency = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    const num = Number(val);
    if (num === 0) return '₹0';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 10000000) {
        const cr = abs / 10000000;
        const crStr = Number(cr.toFixed(2)).toString();
        return `${sign}₹${crStr}Cr`;
    }
    if (abs >= 100000) {
        const l = abs / 100000;
        const lStr = Number(l.toFixed(2)).toString();
        return `${sign}₹${lStr}L`;
    }
    if (abs >= 1000) {
        const k = abs / 1000;
        const kStr = Number(k.toFixed(1)).toString();
        return `${sign}₹${kStr}k`;
    }
    return `${sign}₹${num.toLocaleString('en-IN')}`;
};

const getNiceAxisMax = (val, defaultMax = 1000) => {
    const num = Number(val);
    if (!num || isNaN(num) || num <= 0) return defaultMax;
    const target = num * 1.2;
    const power = Math.floor(Math.log10(target));
    const magnitude = Math.pow(10, power);
    const fraction = target / magnitude;

    let niceFactor = 10;
    if (fraction <= 1) niceFactor = 1;
    else if (fraction <= 1.2) niceFactor = 1.2;
    else if (fraction <= 1.5) niceFactor = 1.5;
    else if (fraction <= 2) niceFactor = 2;
    else if (fraction <= 2.5) niceFactor = 2.5;
    else if (fraction <= 3) niceFactor = 3;
    else if (fraction <= 4) niceFactor = 4;
    else if (fraction <= 5) niceFactor = 5;
    else if (fraction <= 6) niceFactor = 6;
    else if (fraction <= 8) niceFactor = 8;

    return Math.round(niceFactor * magnitude);
};

const formatInteger = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    return Number(val).toLocaleString('en-IN');
};

const formatSyncTime = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
};

const formatStatusLabel = (str) => {
    if (!str) return '—';
    return String(str)
        .trim()
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

const parseTransactionStatuses = (ord) => {
    if (!ord) return { order: 'Completed', payment: 'Paid' };

    const rawOrder = ord.order_status || '';
    const rawPayment = ord.payment_status || '';
    const rawCombined = String(ord.status || '').toLowerCase().trim();
    const rawOrderLower = String(rawOrder).toLowerCase().trim();

    // Explicit mapping from requirements specification
    const combinedMap = {
        draftpending: { order: 'Draft', payment: 'Pending' },
        confirmedpending: { order: 'Confirmed', payment: 'Pending' },
        partially_returnedpending: { order: 'Partially Returned', payment: 'Pending' },
        partiallyreturnedpending: { order: 'Partially Returned', payment: 'Pending' },
        confirmedpaid: { order: 'Confirmed', payment: 'Paid' },
        completedpaid: { order: 'Completed', payment: 'Paid' },
        draftpaid: { order: 'Draft', payment: 'Paid' },
        cancelledpaid: { order: 'Cancelled', payment: 'Paid' },
        cancelledpending: { order: 'Cancelled', payment: 'Pending' },
        pendingpending: { order: 'Pending', payment: 'Pending' },
        returnedpaid: { order: 'Returned', payment: 'Paid' },
        returnedpending: { order: 'Returned', payment: 'Pending' },
    };

    if (rawCombined && combinedMap[rawCombined]) {
        return combinedMap[rawCombined];
    }
    if (rawOrderLower && combinedMap[rawOrderLower]) {
        return combinedMap[rawOrderLower];
    }

    // If combined string ends with known payment keywords (e.g. "partially_returnedpending")
    const combinedCandidate = rawOrderLower || rawCombined;
    const paymentKeywords = ['pending', 'paid', 'failed', 'refunded', 'unpaid'];
    for (const pKey of paymentKeywords) {
        if (combinedCandidate.endsWith(pKey) && combinedCandidate.length > pKey.length) {
            const prefix = combinedCandidate.slice(0, -pKey.length);
            return {
                order: formatStatusLabel(prefix),
                payment: rawPayment ? formatStatusLabel(rawPayment) : formatStatusLabel(pKey),
            };
        }
    }

    // Independent fields or fallback
    const order = rawOrder || ord.status || 'Completed';
    const payment = rawPayment || 'Paid';

    return {
        order: formatStatusLabel(order),
        payment: formatStatusLabel(payment),
    };
};

const getStatusClass = (status) => {
    if (!status) return '';
    return String(status).toLowerCase().trim().replace(/[\s_]+/g, '-');
};


const CALENDAR_MONTHS = [
    { short: 'Jan', full: 'January', monthNum: 1 },
    { short: 'Feb', full: 'February', monthNum: 2 },
    { short: 'Mar', full: 'March', monthNum: 3 },
    { short: 'Apr', full: 'April', monthNum: 4 },
    { short: 'May', full: 'May', monthNum: 5 },
    { short: 'Jun', full: 'June', monthNum: 6 },
    { short: 'Jul', full: 'July', monthNum: 7 },
    { short: 'Aug', full: 'August', monthNum: 8 },
    { short: 'Sep', full: 'September', monthNum: 9 },
    { short: 'Oct', full: 'October', monthNum: 10 },
    { short: 'Nov', full: 'November', monthNum: 11 },
    { short: 'Dec', full: 'December', monthNum: 12 },
];

const MONTH_NAMES = CALENDAR_MONTHS.map((m) => m.short);

const getCalendarMonthIndex = (val) => {
    if (val === null || val === undefined) return -1;
    const str = String(val).trim().toLowerCase();
    if (!str) return -1;

    // 1. Direct match on short name (e.g. 'oct', 'jan')
    const shortIdx = CALENDAR_MONTHS.findIndex((m) => m.short.toLowerCase() === str);
    if (shortIdx !== -1) return shortIdx;

    // 2. Direct match on full name (e.g. 'october', 'january')
    const fullIdx = CALENDAR_MONTHS.findIndex((m) => m.full.toLowerCase() === str);
    if (fullIdx !== -1) return fullIdx;

    // 3. Month number (e.g. '10', 10, '01')
    if (/^(0?[1-9]|1[0-2])$/.test(str)) {
        return parseInt(str, 10) - 1;
    }

    // 4. ISO Date format (e.g. '2026-10-01' or '2026-10')
    if (/^\d{4}-(0?[1-9]|1[0-2])/.test(str)) {
        const parts = str.split('-');
        const m = parseInt(parts[1], 10);
        if (m >= 1 && m <= 12) return m - 1;
    }

    // 5. Date format containing month name (e.g. '01 Nov', '15-Oct', 'Nov 2026')
    const containsIdx = CALENDAR_MONTHS.findIndex((m) => {
        const s = m.short.toLowerCase();
        const f = m.full.toLowerCase();
        return str.includes(s) || str.includes(f);
    });
    if (containsIdx !== -1) return containsIdx;

    // 6. Fallback prefix match (e.g. 'sept')
    const prefixIdx = CALENDAR_MONTHS.findIndex((m) => str.startsWith(m.short.toLowerCase()));
    if (prefixIdx !== -1) return prefixIdx;

    return -1;
};

const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return isoStr;
    }
};

/**
 * Parse calendar day number (1-31) from various date/string formats
 */
const parseCalendarDay = (val) => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (!str) return null;

    // ISO format: '2026-11-05' or '2026-11-05T...'
    const isoMatch = str.match(/^\d{4}-\d{2}-(\d{1,2})/);
    if (isoMatch) return parseInt(isoMatch[1], 10);

    // Day with month separator or space: '05 Nov' or '5-Nov' or '5/11'
    const dayMonthMatch = str.match(/^(\d{1,2})[\s\-_/]/);
    if (dayMonthMatch) return parseInt(dayMonthMatch[1], 10);

    // Direct day number: '05' or 5
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 31) return num;

    return null;
};

/**
 * Metadata for a given period: year, monthIndex, short name, full name, daysInMonth, label
 */
const getMonthMeta = (periodType, yearVal = CURRENT_CALENDAR_YEAR) => {
    const now = new Date();
    if (periodType === 'last_month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = lastMonthDate.getFullYear();
        const mIdx = lastMonthDate.getMonth();
        const days = new Date(y, mIdx + 1, 0).getDate();
        return {
            year: y,
            monthIndex: mIdx,
            short: CALENDAR_MONTHS[mIdx].short,
            full: CALENDAR_MONTHS[mIdx].full,
            daysInMonth: days,
            label: `${CALENDAR_MONTHS[mIdx].full} ${y}`,
        };
    }

    // Default 'this_month'
    const y = yearVal || now.getFullYear();
    const mIdx = now.getMonth();
    const days = new Date(y, mIdx + 1, 0).getDate();
    return {
        year: y,
        monthIndex: mIdx,
        short: CALENDAR_MONTHS[mIdx].short,
        full: CALENDAR_MONTHS[mIdx].full,
        daysInMonth: days,
        label: `${CALENDAR_MONTHS[mIdx].full} ${y}`,
    };
};

/**
 * Clean milestone dates for X-axis ticks (1st, 5th, 10th, 15th, 20th, 25th, and last day of month)
 */
const getMilestoneTicks = (daysInMonth) => {
    const milestones = [1, 5, 10, 15, 20, 25];
    const ticks = milestones.filter((m) => m < daysInMonth).map((m) => String(m).padStart(2, '0'));
    ticks.push(String(daysInMonth).padStart(2, '0'));
    return ticks;
};


const CURRENT_CALENDAR_YEAR = new Date().getFullYear();

const Dashboard = () => {
    // ── Filters & Selectors ──
    const [stores, setStores] = useState([]);
    const [storesSummary, setStoresSummary] = useState([]);
    const [selectedStore, setSelectedStore] = useState(''); // '' means All Stores (omitted store_id)
    const [selectedStoreSummary, setSelectedStoreSummary] = useState(null);
    const [period, setPeriod] = useState('this_year'); // 'this_year' | 'this_month' | 'last_month'

    // Individual chart period overrides (default synchronized with main period)
    const [overviewChartPeriod, setOverviewChartPeriod] = useState('this_year');
    const [revCostChartPeriod, setRevCostChartPeriod] = useState('this_year');

    // ── Synchronized Year Selection State (Default current calendar year) ──
    const [selectedYear, setSelectedYear] = useState(CURRENT_CALENDAR_YEAR);
    const [isPeriodSubmenuOpen, setIsPeriodSubmenuOpen] = useState(false);

    // Dropdown open states
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);

    // ── Metric Drilldown Modal State ──
    const [activeMetricModal, setActiveMetricModal] = useState(null); // 'cost' | 'profit' | 'margin' | null

    // ── API State ──
    const [summary, setSummary] = useState(null);
    const [overviewData, setOverviewData] = useState([]);
    const [yearlyOverviewData, setYearlyOverviewData] = useState([]);
    const [rcOverviewData, setRcOverviewData] = useState(null);
    const [revenueVsCost, setRevenueVsCost] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [historicalRecords, setHistoricalRecords] = useState([]);

    // ── Table Pagination State ──
    const [storePage, setStorePage] = useState(1);
    const STORES_PER_PAGE = 5;
    const [txPage, setTxPage] = useState(1);
    const TX_PER_PAGE = 5;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);

    // Sequence reference and in-flight guard to prevent race conditions and duplicate requests
    const reqSeqRef = useRef(0);
    const isRefreshingRef = useRef(false);
    const storeDropdownRef = useRef(null);
    const periodDropdownRef = useRef(null);

    // ── Dynamically Retrieve Available Years Based on Application's Existing Data & Date Range ──
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const yearsSet = new Set();
        yearsSet.add(currentYear);

        if (selectedYear) {
            const sy = Number(selectedYear);
            if (!isNaN(sy) && sy >= 1970 && sy <= 3000) {
                yearsSet.add(sy);
            }
        }

        // Helper to extract year from various date/timestamp formats without arbitrary limits
        const extractYear = (val) => {
            if (!val) return null;
            if (typeof val === 'number') {
                if (val >= 1970 && val <= 3000) return val;
                const d = new Date(val > 1e11 ? val : val * 1000);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    if (y >= 1970 && y <= 3000) return y;
                }
                return null;
            }
            if (typeof val === 'string') {
                const str = val.trim();
                if (!str) return null;
                if (/^\d{4}$/.test(str)) {
                    const y = parseInt(str, 10);
                    if (y >= 1970 && y <= 3000) return y;
                }
                const isoMatch = str.match(/^(\d{4})[-\\/]/);
                if (isoMatch) {
                    const y = parseInt(isoMatch[1], 10);
                    if (y >= 1970 && y <= 3000) return y;
                }
                const d = new Date(str);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    if (y >= 1970 && y <= 3000) return y;
                }
            }
            return null;
        };

        const scanItem = (item) => {
            if (!item) return;
            if (typeof item === 'number' || typeof item === 'string') {
                const yr = extractYear(item);
                if (yr) yearsSet.add(yr);
                return;
            }
            if (typeof item === 'object') {
                const directYr = extractYear(item.year || item.sales_year || item.fiscal_year);
                if (directYr) yearsSet.add(directYr);

                const dateKeys = [
                    'created_at', 'createdAt',
                    'order_date', 'orderDate',
                    'invoice_date', 'invoiceDate',
                    'date', 'updated_at', 'updatedAt',
                    'timestamp', 'start_date', 'end_date',
                    'date_from', 'date_to',
                    'registration_date', 'founded_date'
                ];
                for (const k of dateKeys) {
                    if (item[k]) {
                        const yr = extractYear(item[k]);
                        if (yr) yearsSet.add(yr);
                    }
                }
            }
        };

        const scanArray = (arr) => {
            if (Array.isArray(arr)) {
                arr.forEach(scanItem);
            }
        };

        const getLocalRecords = () => {
            const list = [];
            try {
                const gst = localStorage.getItem('gst_invoices');
                if (gst) {
                    const parsed = JSON.parse(gst);
                    if (Array.isArray(parsed)) list.push(...parsed);
                }
            } catch (_) {}
            try {
                const po = localStorage.getItem('local_purchase_orders') || localStorage.getItem('purchases');
                if (po) {
                    const parsed = JSON.parse(po);
                    if (Array.isArray(parsed)) list.push(...parsed);
                }
            } catch (_) {}
            return list;
        };

        // Scan all application data sources dynamically
        scanArray(transactions);
        scanArray(summary?.recent_transactions);
        scanArray(summary?.available_years || summary?.years);
        scanItem(summary);
        scanArray(stores);
        scanArray(historicalRecords);
        scanArray(overviewData);
        scanArray(yearlyOverviewData);
        scanArray(getLocalRecords());

        // Compute dynamic date range from earliest historical data point to current year
        const minYear = Math.min(...Array.from(yearsSet));
        const maxYear = Math.max(currentYear, ...Array.from(yearsSet));

        const result = [];
        for (let y = maxYear; y >= minYear; y--) {
            result.push(y);
        }
        return result;
    }, [transactions, summary, stores, historicalRecords, overviewData, yearlyOverviewData, selectedYear]);

    // Synchronized year selection handler across both chart sections & main header
    const handleYearSelect = useCallback((yr) => {
        setSelectedYear(yr);
        setPeriod('this_year');
        setOverviewChartPeriod('this_year');
        setRevCostChartPeriod('this_year');
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
                setIsStoreOpen(false);
            }
            if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target)) {
                setIsPeriodOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close metric details modal on Escape key
    useEffect(() => {
        if (!activeMetricModal) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setActiveMetricModal(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeMetricModal]);

    // Smooth scroll to Revenue vs Cost chart from metric modal
    const scrollToRevCostChart = useCallback(() => {
        setActiveMetricModal(null);
        setTimeout(() => {
            const chartCard = document.getElementById('revenue-vs-cost-card');
            if (chartCard) {
                chartCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                chartCard.classList.add('highlight-pulse');
                setTimeout(() => chartCard.classList.remove('highlight-pulse'), 2200);
            }
        }, 120);
    }, []);

    // ── Load Authorized Stores ──
    useEffect(() => {
        let mounted = true;
        const fetchStoreList = async () => {
            try {
                const storeList = await getStores();
                if (mounted && Array.isArray(storeList)) {
                    setStores(storeList);
                }
            } catch (err) {
                console.warn('Could not load stores list:', err?.message || err);
            }
        };
        fetchStoreList();
        return () => { mounted = false; };
    }, []);

    // ── Load Historical Data Records to Disclose Actual Available Date Range ──
    useEffect(() => {
        let mounted = true;
        const fetchHistoricalData = async () => {
            try {
                const [ordersRes, invoicesRes] = await Promise.allSettled([
                    getOrders({ page: 1, page_size: 100 }),
                    getInvoices({ page: 1, limit: 100 }),
                ]);
                if (!mounted) return;
                const records = [];
                if (ordersRes.status === 'fulfilled' && ordersRes.value) {
                    const list = Array.isArray(ordersRes.value)
                        ? ordersRes.value
                        : (ordersRes.value?.items || ordersRes.value?.data || []);
                    records.push(...list);
                }
                if (invoicesRes.status === 'fulfilled' && invoicesRes.value) {
                    const list = Array.isArray(invoicesRes.value)
                        ? invoicesRes.value
                        : (invoicesRes.value?.items || invoicesRes.value?.data || []);
                    records.push(...list);
                }
                if (records.length > 0) {
                    setHistoricalRecords((prev) => {
                        const existingIds = new Set(prev.map(p => p.id || p.order_id || p.order_number || p.invoice_number));
                        const additions = records.filter(r => !existingIds.has(r.id || r.order_id || r.order_number || r.invoice_number));
                        return additions.length > 0 ? [...prev, ...additions] : prev;
                    });
                }
            } catch (err) {
                console.warn('Could not fetch historical data records:', err?.message || err);
            }
        };
        fetchHistoricalData();
        return () => { mounted = false; };
    }, []);

    // ── Fetch All Dashboard Data ──
    const fetchAllDashboardData = useCallback(async (storeIdVal, mainPeriodVal, ovPeriodVal, rcPeriodVal, isSilent = false, yearVal = CURRENT_CALENDAR_YEAR) => {
        // Prevent duplicate requests when fetch is already in-flight
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;

        const currentSeq = ++reqSeqRef.current;
        if (!isSilent) setLoading(true);
        setRefreshing(true);
        setError(null);

        const storeFilter = storeIdVal ? Number(storeIdVal) : null;

        try {
            const needsSeparateRcOverview = rcPeriodVal !== (ovPeriodVal || mainPeriodVal);
            const [
                summaryResult,
                overviewResult,
                revCostResult,
                topProductsResult,
                recentTxResult,
                ordersResult,
                analyticsProductsResult,
                separateRcOverviewResult,
                tenantSummaryResult,
                storeSummaryDetailResult,
            ] = await Promise.allSettled([
                getDashboardSummary(mainPeriodVal, storeFilter, yearVal),
                getDashboardOverview(ovPeriodVal || mainPeriodVal, storeFilter, yearVal),
                getRevenueVsCost(rcPeriodVal || mainPeriodVal, storeFilter, yearVal),
                getTopProducts(10, storeFilter, mainPeriodVal, yearVal),
                getRecentTransactions(20, storeFilter, mainPeriodVal, yearVal),
                getOrders({
                    store_id: storeFilter || undefined,
                    page: 1,
                    page_size: 50,
                    ...buildDateFilterParams(mainPeriodVal, yearVal),
                }),
                getAnalyticsProducts({
                    store_id: storeFilter || undefined,
                    ...buildDateFilterParams(mainPeriodVal, yearVal),
                }),
                needsSeparateRcOverview ? getDashboardOverview(rcPeriodVal, storeFilter, yearVal) : Promise.resolve(null),
                // When filtering by a single store, fetch tenant summary in parallel to guarantee store-wise sales summary is never null
                storeFilter ? getDashboardSummary(mainPeriodVal, null, yearVal) : Promise.resolve(null),
                // Fetch store-specific summary from /api/v1/stores/{store_id}/summary for deep metrics verification
                storeFilter ? getStoreSummary(storeFilter) : Promise.resolve(null),
            ]);

            // Prevent stale responses if a newer request was dispatched
            if (currentSeq !== reqSeqRef.current) return;

            let hadError = false;
            let errorMsg = '';

            // Extract fresh stores_summary: prefer direct summary, then tenant summary, then existing state
            let freshStoresSummary = null;
            if (summaryResult.status === 'fulfilled' && Array.isArray(summaryResult.value?.stores_summary) && summaryResult.value.stores_summary.length > 0) {
                freshStoresSummary = summaryResult.value.stores_summary;
            } else if (tenantSummaryResult && tenantSummaryResult.status === 'fulfilled' && Array.isArray(tenantSummaryResult.value?.stores_summary) && tenantSummaryResult.value.stores_summary.length > 0) {
                freshStoresSummary = tenantSummaryResult.value.stores_summary;
            }

            if (freshStoresSummary) {
                setStoresSummary(freshStoresSummary);
                // Populate/enrich stores list dynamically from real stores_summary
                setStores((prevStores) => {
                    const mergedMap = new Map();
                    (prevStores || []).forEach((s) => {
                        if (s?.id) mergedMap.set(String(s.id), s);
                    });
                    freshStoresSummary.forEach((s) => {
                        const existing = mergedMap.get(String(s.store_id));
                        mergedMap.set(String(s.store_id), {
                            id: s.store_id,
                            name: s.store_name || existing?.name || `Store #${s.store_id}`,
                            is_active: s.is_active !== false,
                            ...(existing || {}),
                        });
                    });
                    return Array.from(mergedMap.values());
                });
            }

            // 1. Dashboard Summary
            if (summaryResult.status === 'fulfilled' && summaryResult.value) {
                const val = summaryResult.value;
                setSummary((prevSummary) => {
                    const resolvedStoresSummary =
                        freshStoresSummary ||
                        (Array.isArray(prevSummary?.stores_summary) && prevSummary.stores_summary.length > 0
                            ? prevSummary.stores_summary
                            : (storesSummary.length > 0 ? storesSummary : []));

                    return {
                        mode: val.mode || 'all_stores',
                        store_id: val.store_id ?? null,
                        store_name: val.store_name ?? null,
                        today_sales: parseMetric(val.today_sales),
                        monthly_sales: parseMetric(val.monthly_sales),
                        total_customers: parseMetric(val.total_customers),
                        total_revenue: parseMetric(val.total_revenue),
                        low_stock_products: parseMetric(val.low_stock_products),
                        stores_summary: resolvedStoresSummary,
                        total_sales: parseMetric(val.total_sales),
                        sales_target: parseMetric(val.sales_target),
                        sales_achievement_percentage: parseMetric(val.sales_achievement_percentage),
                        total_cost: parseMetric(val.total_cost),
                        cost_target: parseMetric(val.cost_target),
                        cost_achievement_percentage: parseMetric(val.cost_achievement_percentage),
                        products_sold: parseMetric(val.products_sold),
                        products_target: parseMetric(val.products_target),
                        products_achievement_percentage: parseMetric(val.products_achievement_percentage),
                        gross_profit: parseMetric(val.gross_profit),
                        gross_margin_percentage: parseMetric(val.gross_margin_percentage),
                        recent_transactions: Array.isArray(val.recent_transactions) ? val.recent_transactions : [],
                    };
                });
            } else {
                hadError = true;
                errorMsg = summaryResult.reason?.message || 'Failed to load dashboard summary';
                setSummary(null);
            }

            // Store summary detail result from /api/v1/stores/{store_id}/summary
            if (storeSummaryDetailResult && storeSummaryDetailResult.status === 'fulfilled' && storeSummaryDetailResult.value) {
                setSelectedStoreSummary(storeSummaryDetailResult.value);
            } else if (!storeFilter) {
                setSelectedStoreSummary(null);
            }

            // 2. Sales Overview Chart
            if (overviewResult.status === 'fulfilled' && overviewResult.value) {
                const rawVal = overviewResult.value;
                const list = Array.isArray(rawVal)
                    ? rawVal
                    : Array.isArray(rawVal.overview)
                    ? rawVal.overview
                    : Array.isArray(rawVal.data)
                    ? rawVal.data
                    : Array.isArray(rawVal.items)
                    ? rawVal.items
                    : [];
                setOverviewData(list);
                if ((ovPeriodVal || mainPeriodVal) === 'this_year') {
                    setYearlyOverviewData(list);
                }
            } else {
                hadError = true;
                if (!errorMsg) errorMsg = overviewResult.reason?.message || 'Failed to load sales overview';
                setOverviewData(null);
            }

            if (separateRcOverviewResult && separateRcOverviewResult.status === 'fulfilled' && separateRcOverviewResult.value) {
                const rawVal = separateRcOverviewResult.value;
                const list = Array.isArray(rawVal)
                    ? rawVal
                    : Array.isArray(rawVal.overview)
                    ? rawVal.overview
                    : Array.isArray(rawVal.data)
                    ? rawVal.data
                    : Array.isArray(rawVal.items)
                    ? rawVal.items
                    : [];
                setRcOverviewData(list);
                if (rcPeriodVal === 'this_year') {
                    setYearlyOverviewData(list);
                }
            } else if (!needsSeparateRcOverview) {
                setRcOverviewData(null);
            }

            // 3. Revenue vs Cost Chart
            if (revCostResult.status === 'fulfilled' && revCostResult.value) {
                const val = revCostResult.value;
                const rev = parseMetric(val.revenue);
                const cst = parseMetric(val.cost);
                const gp = val.gross_profit !== undefined && val.gross_profit !== null
                    ? parseMetric(val.gross_profit)
                    : (rev !== null && cst !== null ? rev - cst : null);
                const gm = val.gross_margin_percentage !== undefined && val.gross_margin_percentage !== null
                    ? parseMetric(val.gross_margin_percentage)
                    : (rev !== null && rev > 0 && gp !== null ? (gp / rev) * 100 : (rev === 0 ? 0 : null));

                setRevenueVsCost({
                    revenue: rev,
                    cost: cst,
                    gross_profit: gp,
                    gross_margin_percentage: gm,
                    monthly: Array.isArray(val.monthly) ? val.monthly : undefined,
                });
            } else {
                hadError = true;
                if (!errorMsg) errorMsg = revCostResult.reason?.message || 'Failed to load revenue and cost metrics';
                setRevenueVsCost(null);
            }

            // 4. Top Selling Products
            if (topProductsResult.status === 'fulfilled' && topProductsResult.value) {
                const prods = Array.isArray(topProductsResult.value.top_products)
                    ? topProductsResult.value.top_products
                    : [];
                const sorted = [...prods].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
                setTopProducts(sorted);
            } else {
                hadError = true;
                setTopProducts([]);
            }

            // 5. Recent Transactions (Real Backend Integration)
            let txList = [];
            if (recentTxResult.status === 'fulfilled' && recentTxResult.value?.transactions && recentTxResult.value.transactions.length > 0) {
                txList = recentTxResult.value.transactions;
            } else if (summaryResult.status === 'fulfilled' && Array.isArray(summaryResult.value?.recent_transactions) && summaryResult.value.recent_transactions.length > 0) {
                txList = summaryResult.value.recent_transactions;
            } else if (ordersResult.status === 'fulfilled' && ordersResult.value) {
                const rawOrders = ordersResult.value;
                const ordList = Array.isArray(rawOrders)
                    ? rawOrders
                    : Array.isArray(rawOrders?.items)
                    ? rawOrders.items
                    : Array.isArray(rawOrders?.data)
                    ? rawOrders.data
                    : [];
                if (ordList.length > 0) {
                    txList = ordList;
                    setHistoricalRecords((prev) => {
                        const existingIds = new Set(prev.map(p => p.id || p.order_id || p.order_number));
                        const additions = ordList.filter(o => !existingIds.has(o.id || o.order_id || o.order_number));
                        return additions.length > 0 ? [...prev, ...additions] : prev;
                    });
                }
            }
            setTransactions(txList.slice(0, 20));

            if (hadError && errorMsg) {
                setError(errorMsg);
            } else {
                // Record the actual successful synchronization timestamp
                setLastSyncTime(new Date());
            }
        } catch (err) {
            if (currentSeq === reqSeqRef.current) {
                setError(err?.message || 'Unable to connect to dashboard API');
            }
        } finally {
            if (currentSeq === reqSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
                isRefreshingRef.current = false;
            }
        }
    }, []);

    // Trigger fetch on filter change
    useEffect(() => {
        fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod, false, selectedYear);
    }, [selectedStore, period, overviewChartPeriod, revCostChartPeriod, selectedYear, fetchAllDashboardData]);

    // Handle Main Period Change
    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        setOverviewChartPeriod(newPeriod);
        setRevCostChartPeriod(newPeriod);
        setIsPeriodOpen(false);
    };

    // Selected store name label
    const selectedStoreLabel = useMemo(() => {
        if (!selectedStore) return 'All Stores';
        const found = stores.find((s) => String(s.id) === String(selectedStore));
        if (found) return found.name;
        const fromSummary = storesSummary.find((s) => String(s.store_id) === String(selectedStore)) ||
                            summary?.stores_summary?.find((s) => String(s.store_id) === String(selectedStore));
        if (fromSummary) return fromSummary.store_name;
        return `Store #${selectedStore}`;
    }, [selectedStore, stores, storesSummary, summary?.stores_summary]);

    // Store list for Store-wise Sales Summary table
    const effectiveStoresSummary = useMemo(() => {
        if (Array.isArray(summary?.stores_summary) && summary.stores_summary.length > 0) {
            return summary.stores_summary;
        }
        if (Array.isArray(storesSummary) && storesSummary.length > 0) {
            return storesSummary;
        }
        return [];
    }, [summary?.stores_summary, storesSummary]);

    const totalStoreCount = effectiveStoresSummary.length;

    // Calculate today's orders count from selectedStoreSummary or stores_summary if available
    const todayOrdersCount = useMemo(() => {
        if (selectedStore && selectedStoreSummary?.today_orders_count !== undefined && selectedStoreSummary?.today_orders_count !== null) {
            return Number(selectedStoreSummary.today_orders_count);
        }
        if (!effectiveStoresSummary || effectiveStoresSummary.length === 0) {
            return null;
        }
        if (!selectedStore) {
            return effectiveStoresSummary.reduce((acc, curr) => acc + Number(curr.orders_count || 0), 0);
        }
        const current = effectiveStoresSummary.find((s) => String(s.store_id) === String(selectedStore));
        return current ? Number(current.orders_count || 0) : null;
    }, [selectedStore, effectiveStoresSummary, selectedStoreSummary]);

    // Reset pagination when data count changes
    useEffect(() => {
        setStorePage(1);
    }, [totalStoreCount]);

    useEffect(() => {
        setTxPage(1);
    }, [transactions, selectedStore]);

    const totalStorePages = Math.max(1, Math.ceil(totalStoreCount / STORES_PER_PAGE));
    const paginatedStores = useMemo(() => {
        const start = (storePage - 1) * STORES_PER_PAGE;
        return effectiveStoresSummary.slice(start, start + STORES_PER_PAGE);
    }, [effectiveStoresSummary, storePage]);

    const totalTxPages = Math.max(1, Math.ceil((transactions?.length || 0) / TX_PER_PAGE));
    const paginatedTransactions = useMemo(() => {
        const list = transactions || [];
        const start = (txPage - 1) * TX_PER_PAGE;
        return list.slice(start, start + TX_PER_PAGE);
    }, [transactions, txPage]);

    // ── Financial Performance Metrics ──
    // Formulas:
    // 1. Gross Profit = Net Sales Revenue − Cost of Goods Sold
    // 2. Gross Profit Margin (%) = (Gross Profit ÷ Net Sales Revenue) × 100
    // 3. Markup (%) = (Gross Profit ÷ Cost of Goods Sold) × 100
    const financialMetrics = useMemo(() => {
        let revenue = 0;
        if (revenueVsCost?.revenue !== null && revenueVsCost?.revenue !== undefined) {
            revenue = Number(revenueVsCost.revenue);
        } else if (summary?.total_sales !== null && summary?.total_sales !== undefined) {
            revenue = Number(summary.total_sales);
        } else if (summary?.total_revenue !== null && summary?.total_revenue !== undefined) {
            revenue = Number(summary.total_revenue);
        }

        let cost = 0;
        if (revenueVsCost?.cost !== null && revenueVsCost?.cost !== undefined) {
            cost = Number(revenueVsCost.cost);
        } else if (summary?.total_cost !== null && summary?.total_cost !== undefined) {
            cost = Number(summary.total_cost);
        }

        const grossProfit = revenueVsCost?.gross_profit !== undefined && revenueVsCost?.gross_profit !== null
            ? Number(revenueVsCost.gross_profit)
            : (summary?.gross_profit !== undefined && summary?.gross_profit !== null
                ? Number(summary.gross_profit)
                : Math.round((revenue - cost) * 100) / 100);

        const grossMargin = revenueVsCost?.gross_margin_percentage !== undefined && revenueVsCost?.gross_margin_percentage !== null
            ? Number(revenueVsCost.gross_margin_percentage)
            : (summary?.gross_margin_percentage !== undefined && summary?.gross_margin_percentage !== null
                ? Number(summary.gross_margin_percentage)
                : (revenue > 0 ? Math.round(((grossProfit / revenue) * 100) * 100) / 100 : 0));

        const markup = cost > 0 ? Math.round(((grossProfit / cost) * 100) * 100) / 100 : 0;

        return {
            revenue,
            cost,
            grossProfit,
            grossMargin,
            markup,
        };
    }, [revenueVsCost, summary]);

    // Period metadata for Monthly Sales Chart
    const overviewMeta = useMemo(() => {
        return getMonthMeta(overviewChartPeriod, selectedYear);
    }, [overviewChartPeriod, selectedYear]);

    // Period metadata for Revenue vs Cost Chart
    const revCostMeta = useMemo(() => {
        return getMonthMeta(revCostChartPeriod, selectedYear);
    }, [revCostChartPeriod, selectedYear]);

    // ── Monthly Sales Chart Data (12 Months for Yearly, or 1–28/29/30/31 Days for Monthly) ──
    const sortedOverviewData = useMemo(() => {
        // 1. When viewing "This Year" or specific year: All 12 calendar months (Jan – Dec)
        if (overviewChartPeriod === 'this_year' || (typeof overviewChartPeriod === 'string' && /^\d{4}$/.test(overviewChartPeriod.trim()))) {
            const yearlyData = CALENDAR_MONTHS.map((m) => ({
                month: m.short,
                shortMonth: m.short,
                fullMonth: m.full,
                monthName: m.full,
                name: m.short,
                sales: 0,
            }));

            if (Array.isArray(overviewData)) {
                overviewData.forEach((item) => {
                    if (!item) return;
                    const rawMonth = item.month ?? item.date ?? item.name;
                    const idx = getCalendarMonthIndex(rawMonth);
                    if (idx >= 0 && idx < 12) {
                        const rawSales = item.sales ?? item.revenue ?? item.total ?? item.amount;
                        const numSales = Number(rawSales);
                        if (!isNaN(numSales) && numSales >= 0) {
                            yearlyData[idx].sales = numSales;
                        }
                    }
                });
            }

            return yearlyData;
        }

        // 2. When viewing "This Month" or "Last Month": Complete calendar dates (1 to daysInMonth)
        const { year, monthIndex, short: monthShort, daysInMonth } = overviewMeta;
        const dailyData = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayPad = String(d).padStart(2, '0');
            dailyData.push({
                day: d,
                month: dayPad,
                shortMonth: dayPad,
                fullMonth: `${dayPad} ${monthShort} ${year}`,
                monthName: `${dayPad} ${monthShort}`,
                name: dayPad,
                date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${dayPad}`,
                sales: 0,
            });
        }

        // Populate sales from backend overviewData
        if (Array.isArray(overviewData) && overviewData.length > 0) {
            overviewData.forEach((item) => {
                if (!item) return;
                let dayNum = null;
                const rawDate = item.date ?? item.created_at;
                if (rawDate) {
                    try {
                        const dt = new Date(rawDate);
                        if (!isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === monthIndex) {
                            dayNum = dt.getDate();
                        }
                    } catch (_) {}
                }
                if (dayNum === null) {
                    dayNum = parseCalendarDay(item.month ?? item.day ?? item.name ?? item.date);
                }
                if (dayNum !== null && dayNum >= 1 && dayNum <= daysInMonth) {
                    const s = Number(item.sales ?? item.revenue ?? item.total ?? item.amount ?? 0);
                    if (!isNaN(s) && s > 0) {
                        dailyData[dayNum - 1].sales += s;
                    }
                }
            });
        }

        // Check transactions as additional real data source if present
        if (Array.isArray(transactions) && transactions.length > 0) {
            transactions.forEach((tx) => {
                if (!tx?.created_at) return;
                try {
                    const dt = new Date(tx.created_at);
                    if (!isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === monthIndex) {
                        const d = dt.getDate();
                        if (d >= 1 && d <= daysInMonth) {
                            const amt = Number(tx.amount ?? tx.total_amount ?? 0);
                            if (!isNaN(amt) && amt > 0 && dailyData[d - 1].sales === 0) {
                                dailyData[d - 1].sales += amt;
                            }
                        }
                    }
                } catch (_) {}
            });
        }

        // Fallback: If overviewData summed to 0 but summary.monthly_sales exists for this_month, map to today
        const totalDailySales = dailyData.reduce((acc, d) => acc + d.sales, 0);
        if (totalDailySales === 0 && overviewChartPeriod === 'this_month' && summary?.monthly_sales > 0) {
            const today = Math.min(new Date().getDate(), daysInMonth);
            dailyData[today - 1].sales = Number(summary.monthly_sales);
        }

        return dailyData;
    }, [overviewChartPeriod, overviewData, overviewMeta, selectedYear, transactions, summary]);

    // Select milestone dates for monthly overview daily chart to guarantee zero overlap on X-axis ticks
    const overviewXAxisTicks = useMemo(() => {
        if (overviewChartPeriod === 'this_year' || (typeof overviewChartPeriod === 'string' && /^\d{4}$/.test(overviewChartPeriod.trim()))) {
            return undefined; // All 12 months shown cleanly
        }
        return getMilestoneTicks(overviewMeta.daysInMonth);
    }, [overviewChartPeriod, overviewMeta]);

    // Annual/period sales total matching sum of chart data values
    const annualSalesTotal = useMemo(() => {
        return sortedOverviewData.reduce((acc, curr) => acc + (Number(curr.sales) || 0), 0);
    }, [sortedOverviewData]);

    // ── Monthly Revenue vs Cost Chart Data (12 Calendar Months or 1 to daysInMonth Grouped Bars) ──
    const monthlyRevVsCostData = useMemo(() => {
        const activeRcOverview = rcOverviewData !== null ? rcOverviewData : overviewData;

        // 1. When viewing "This Year" or specific year: All 12 Calendar Months (Jan – Dec)
        if (revCostChartPeriod === 'this_year' || (typeof revCostChartPeriod === 'string' && /^\d{4}$/.test(revCostChartPeriod.trim()))) {
            const monthlyData = CALENDAR_MONTHS.map((m) => ({
                month: m.short,
                shortMonth: m.short,
                fullMonth: m.full,
                monthName: m.full,
                name: m.short,
                revenue: 0,
                cost: 0,
                grossProfit: 0,
                grossMargin: 0,
            }));

            // Prioritize backend-provided monthly breakdown if available
            const rawMonthly = Array.isArray(revenueVsCost?.monthly)
                ? revenueVsCost.monthly
                : Array.isArray(revenueVsCost?.data)
                ? revenueVsCost.data
                : [];

            if (rawMonthly.length > 0) {
                rawMonthly.forEach((item) => {
                    if (!item) return;
                    const idx = getCalendarMonthIndex(item.month ?? item.date ?? item.name);
                    if (idx >= 0 && idx < 12) {
                        const c = Number(item.cost ?? item.cogs ?? 0);
                        if (!isNaN(c) && c >= 0) {
                            monthlyData[idx].cost = c;
                        }
                        const r = Number(item.revenue ?? item.sales ?? 0);
                        if (!isNaN(r) && r >= 0) {
                            monthlyData[idx].revenue = r;
                        }
                    }
                });
            } else {
                const candidates = [yearlyOverviewData, activeRcOverview, sortedOverviewData];
                let populated = false;

                for (const list of candidates) {
                    if (Array.isArray(list) && list.length > 0) {
                        list.forEach((item) => {
                            if (!item) return;
                            const idx = getCalendarMonthIndex(item.month ?? item.date ?? item.name);
                            if (idx >= 0 && idx < 12) {
                                const s = Number(item.sales ?? item.revenue ?? item.total ?? item.amount ?? 0);
                                if (!isNaN(s) && s > 0) {
                                    monthlyData[idx].revenue += s;
                                    populated = true;
                                }
                            }
                        });
                        if (populated) break;
                    }
                }

                let totalYearRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
                const totalYearCost = financialMetrics.cost;

                if (totalYearRevenue === 0 && financialMetrics.revenue > 0) {
                    const currentMonthIdx = Math.min(Math.max(0, new Date().getMonth()), 11);
                    monthlyData[currentMonthIdx].revenue = financialMetrics.revenue;
                    totalYearRevenue = financialMetrics.revenue;
                }

                if (totalYearRevenue > 0 && totalYearCost > 0) {
                    const hasExplicitCosts = monthlyData.some((d) => d.cost > 0);
                    if (!hasExplicitCosts) {
                        monthlyData.forEach((d) => {
                            if (d.revenue > 0) {
                                d.cost = Math.round(((d.revenue / totalYearRevenue) * totalYearCost) * 100) / 100;
                            } else {
                                d.cost = 0;
                            }
                        });

                        const sumCosts = monthlyData.reduce((sum, d) => sum + d.cost, 0);
                        const drift = Math.round((totalYearCost - sumCosts) * 100) / 100;
                        if (drift !== 0) {
                            const topRevMonth = monthlyData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), monthlyData[0]);
                            if (topRevMonth && topRevMonth.revenue > 0) {
                                topRevMonth.cost = Math.round((topRevMonth.cost + drift) * 100) / 100;
                            }
                        }
                    }
                } else if (totalYearRevenue === 0 && totalYearCost > 0) {
                    const currentMonthIdx = Math.min(Math.max(0, new Date().getMonth()), 11);
                    monthlyData[currentMonthIdx].cost = totalYearCost;
                }
            }

            monthlyData.forEach((d) => {
                d.grossProfit = Math.round((d.revenue - d.cost) * 100) / 100;
                d.grossMargin = d.revenue > 0 ? Math.round(((d.grossProfit / d.revenue) * 100) * 100) / 100 : 0;
            });

            return monthlyData;
        }

        // 2. When viewing "This Month" or "Last Month": Complete calendar dates (1 to daysInMonth)
        const { year, monthIndex, short: monthShort, daysInMonth } = revCostMeta;
        const dailyData = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayPad = String(d).padStart(2, '0');
            dailyData.push({
                day: d,
                month: dayPad,
                shortMonth: dayPad,
                fullMonth: `${dayPad} ${monthShort} ${year}`,
                monthName: `${dayPad} ${monthShort}`,
                name: dayPad,
                date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${dayPad}`,
                revenue: 0,
                cost: 0,
                grossProfit: 0,
                grossMargin: 0,
            });
        }

        // Check backend explicit daily breakdown if available
        const rawDaily = Array.isArray(revenueVsCost?.daily)
            ? revenueVsCost.daily
            : Array.isArray(revenueVsCost?.data)
            ? revenueVsCost.data
            : [];

        if (rawDaily.length > 0) {
            rawDaily.forEach((item) => {
                if (!item) return;
                const dayNum = parseCalendarDay(item.date ?? item.day ?? item.month ?? item.name);
                if (dayNum !== null && dayNum >= 1 && dayNum <= daysInMonth) {
                    const r = Number(item.revenue ?? item.sales ?? 0);
                    if (!isNaN(r) && r >= 0) dailyData[dayNum - 1].revenue = r;
                    const c = Number(item.cost ?? item.cogs ?? 0);
                    if (!isNaN(c) && c >= 0) dailyData[dayNum - 1].cost = c;
                }
            });
        } else {
            // Derive daily revenue from activeRcOverview or sortedOverviewData
            const candidateList = Array.isArray(activeRcOverview) && activeRcOverview.length > 0
                ? activeRcOverview
                : (revCostChartPeriod === overviewChartPeriod ? sortedOverviewData : []);

            if (Array.isArray(candidateList) && candidateList.length > 0) {
                candidateList.forEach((item) => {
                    if (!item) return;
                    let dayNum = null;
                    const rawDate = item.date ?? item.created_at;
                    if (rawDate) {
                        try {
                            const dt = new Date(rawDate);
                            if (!isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === monthIndex) {
                                dayNum = dt.getDate();
                            }
                        } catch (_) {}
                    }
                    if (dayNum === null) {
                        dayNum = parseCalendarDay(item.month ?? item.day ?? item.name ?? item.date);
                    }
                    if (dayNum !== null && dayNum >= 1 && dayNum <= daysInMonth) {
                        const s = Number(item.sales ?? item.revenue ?? item.total ?? item.amount ?? 0);
                        if (!isNaN(s) && s > 0) {
                            dailyData[dayNum - 1].revenue += s;
                        }
                    }
                });
            }

            let totalPeriodRev = dailyData.reduce((sum, d) => sum + d.revenue, 0);
            const periodCost = Number(revenueVsCost?.cost !== null && revenueVsCost?.cost !== undefined ? revenueVsCost.cost : financialMetrics.cost);

            if (totalPeriodRev === 0 && financialMetrics.revenue > 0) {
                const targetDay = revCostChartPeriod === 'this_month' ? Math.min(new Date().getDate(), daysInMonth) : daysInMonth;
                dailyData[targetDay - 1].revenue = financialMetrics.revenue;
                totalPeriodRev = financialMetrics.revenue;
            }

            if (totalPeriodRev > 0 && periodCost > 0) {
                const hasExplicitCosts = dailyData.some((d) => d.cost > 0);
                if (!hasExplicitCosts) {
                    dailyData.forEach((d) => {
                        if (d.revenue > 0) {
                            d.cost = Math.round(((d.revenue / totalPeriodRev) * periodCost) * 100) / 100;
                        } else {
                            d.cost = 0;
                        }
                    });

                    const sumCosts = dailyData.reduce((sum, d) => sum + d.cost, 0);
                    const drift = Math.round((periodCost - sumCosts) * 100) / 100;
                    if (drift !== 0) {
                        const topRevDay = dailyData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), dailyData[0]);
                        if (topRevDay && topRevDay.revenue > 0) {
                            topRevDay.cost = Math.round((topRevDay.cost + drift) * 100) / 100;
                        }
                    }
                }
            } else if (totalPeriodRev === 0 && periodCost > 0) {
                const targetDay = revCostChartPeriod === 'this_month' ? Math.min(new Date().getDate(), daysInMonth) : daysInMonth;
                dailyData[targetDay - 1].cost = periodCost;
            }
        }

        dailyData.forEach((d) => {
            d.grossProfit = Math.round((d.revenue - d.cost) * 100) / 100;
            d.grossMargin = d.revenue > 0 ? Math.round(((d.grossProfit / d.revenue) * 100) * 100) / 100 : 0;
        });

        return dailyData;
    }, [revCostChartPeriod, rcOverviewData, overviewData, sortedOverviewData, yearlyOverviewData, revenueVsCost, financialMetrics, revCostMeta, selectedYear, transactions, summary]);

    // Select milestone dates for Revenue vs Cost daily chart
    const revCostXAxisTicks = useMemo(() => {
        if (revCostChartPeriod === 'this_year' || (typeof revCostChartPeriod === 'string' && /^\d{4}$/.test(revCostChartPeriod.trim()))) {
            return undefined; // All 12 calendar months shown cleanly
        }
        return getMilestoneTicks(revCostMeta.daysInMonth);
    }, [revCostChartPeriod, revCostMeta]);

    // Complete period-accurate financial metrics for Revenue vs Cost section
    const effectiveRevCostMetrics = useMemo(() => {
        const sumRev = monthlyRevVsCostData.reduce((acc, d) => acc + (Number(d.revenue) || 0), 0);
        const sumCost = monthlyRevVsCostData.reduce((acc, d) => acc + (Number(d.cost) || 0), 0);

        let rev = sumRev;
        let cost = sumCost;

        if (rev === 0 && financialMetrics.revenue > 0) {
            rev = financialMetrics.revenue;
        }
        if (cost === 0 && financialMetrics.cost > 0) {
            cost = financialMetrics.cost;
        }

        const grossProfit = Math.round((rev - cost) * 100) / 100;
        const grossMargin = rev > 0 ? Math.round(((grossProfit / rev) * 100) * 100) / 100 : 0;
        const markup = cost > 0 ? Math.round(((grossProfit / cost) * 100) * 100) / 100 : 0;

        return {
            revenue: rev,
            cost: cost,
            grossProfit,
            grossMargin,
            markup,
        };
    }, [monthlyRevVsCostData, financialMetrics]);

    // ── Dynamic Y-Axis Upper Bounds with Headroom for Revenue vs Cost Chart ──
    const revAxisMax = useMemo(() => {
        const dataMax = Math.max(...monthlyRevVsCostData.map((d) => Number(d.revenue) || 0), 0);
        return getNiceAxisMax(dataMax > 0 ? dataMax : (effectiveRevCostMetrics.revenue || 1000), 1000);
    }, [monthlyRevVsCostData, effectiveRevCostMetrics.revenue]);

    const costAxisMax = useMemo(() => {
        const dataMax = Math.max(...monthlyRevVsCostData.map((d) => Number(d.cost) || 0), 0);
        return getNiceAxisMax(dataMax > 0 ? dataMax : (effectiveRevCostMetrics.cost || 500), 500);
    }, [monthlyRevVsCostData, effectiveRevCostMetrics.cost]);

    const isRevCostYearly = useMemo(() => {
        return revCostChartPeriod === 'this_year' || (typeof revCostChartPeriod === 'string' && /^\d{4}$/.test(revCostChartPeriod.trim()));
    }, [revCostChartPeriod]);

    // ── Dynamic Bar Width & Spacing Settings for Revenue vs Cost Chart ──
    const revCostChartLayout = useMemo(() => {
        const isYearly = isRevCostYearly;
        const count = monthlyRevVsCostData?.length || (isYearly ? 12 : 31);

        if (isYearly) {
            return {
                isYearly: true,
                barGap: 2,
                barCategoryGap: '16%',
                maxBarSize: 22,
                minPointSize: 2,
            };
        }

        // Daily mode (28, 29, 30, or 31 days):
        // Minimize gaps so Revenue and Cost bars remain clearly visible, well-spaced, and sufficiently wide
        return {
            isYearly: false,
            barGap: 1,
            barCategoryGap: count > 28 ? 2 : 4,
            maxBarSize: 14,
            minPointSize: 3,
        };
    }, [isRevCostYearly, monthlyRevVsCostData?.length]);

    // ── Collision-Free Label Renderers for Yearly Revenue vs Cost Bars (Disabled for Daily) ──
    const renderRevBarLabel = useCallback((props) => {
        if (!isRevCostYearly || !props) return null;
        const x = props.x ?? props.viewBox?.x ?? 0;
        const y = props.y ?? props.viewBox?.y ?? 0;
        const width = props.width ?? props.viewBox?.width ?? 0;
        const index = props.index;
        const value = props.value ?? (index !== undefined ? monthlyRevVsCostData[index]?.revenue : null);

        const num = Number(value);
        if (!num || num <= 0) return null;

        const d = index !== undefined ? monthlyRevVsCostData[index] : null;
        const costVal = Number(d?.cost || 0);

        // Stagger labels vertically when both Revenue and Cost bars end near each other
        const revRatio = revAxisMax > 0 ? num / revAxisMax : 0;
        const costRatio = costAxisMax > 0 ? costVal / costAxisMax : 0;
        const isHeightClose = costVal > 0 && Math.abs(revRatio - costRatio) < 0.22;

        const yPos = Math.max(14, y - (isHeightClose ? 14 : 6));

        return (
            <text
                x={x + width / 2}
                y={yPos}
                fill="#1d4ed8"
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
            >
                {formatCompactCurrency(num)}
            </text>
        );
    }, [isRevCostYearly, monthlyRevVsCostData, revAxisMax, costAxisMax]);

    const renderCostBarLabel = useCallback((props) => {
        if (!isRevCostYearly || !props) return null;
        const x = props.x ?? props.viewBox?.x ?? 0;
        const y = props.y ?? props.viewBox?.y ?? 0;
        const width = props.width ?? props.viewBox?.width ?? 0;
        const index = props.index;
        const value = props.value ?? (index !== undefined ? monthlyRevVsCostData[index]?.cost : null);

        const num = Number(value);
        if (!num || num <= 0) return null;

        const d = index !== undefined ? monthlyRevVsCostData[index] : null;
        const revVal = Number(d?.revenue || 0);

        const revRatio = revAxisMax > 0 ? revVal / revAxisMax : 0;
        const costRatio = costAxisMax > 0 ? num / costAxisMax : 0;
        const isHeightClose = revVal > 0 && Math.abs(revRatio - costRatio) < 0.22;

        const yPos = Math.max(14, y - (isHeightClose ? 2 : 6));

        return (
            <text
                x={x + width / 2}
                y={yPos}
                fill="#b91c1c"
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
            >
                {formatCompactCurrency(num)}
            </text>
        );
    }, [isRevCostYearly, monthlyRevVsCostData, revAxisMax, costAxisMax]);

    // ── Dedicated Tooltip Display for Revenue vs Cost Chart ──
    const renderRevCostTooltip = useCallback(({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const dataItem = payload[0]?.payload;
        const dateLabel = dataItem?.fullMonth || dataItem?.date || (dataItem?.month ? `${dataItem.month}` : label);
        const revVal = Number(dataItem?.revenue ?? 0);
        const costVal = Number(dataItem?.cost ?? 0);

        return (
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '10px 14px',
                    fontSize: 12,
                    lineHeight: 1.5,
                    minWidth: 170,
                }}
            >
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6, borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                    {dateLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: '#2563eb', marginBottom: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                        <span>Revenue:</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(revVal)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: '#ef4444' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                        <span>Cost:</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(costVal)}</span>
                </div>
            </div>
        );
    }, []);

    // ── Dynamic Subtitles & KPI Amounts Synchronized with Existing Chart Dropdowns ──
    const totalSalesSubtitle = useMemo(() => {
        if (overviewChartPeriod === 'this_month') return 'This Month';
        if (overviewChartPeriod === 'last_month') return 'Last Month';
        if (overviewChartPeriod === 'last_year') return 'Last Year';
        if (typeof overviewChartPeriod === 'string' && /^\d{4}$/.test(overviewChartPeriod.trim())) {
            return overviewChartPeriod.trim();
        }
        if (overviewChartPeriod === 'this_year') {
            if (selectedYear && selectedYear !== CURRENT_CALENDAR_YEAR) {
                return String(selectedYear);
            }
            return 'This Year';
        }
        return PERIOD_LABELS[overviewChartPeriod] || 'This Year';
    }, [overviewChartPeriod, selectedYear]);

    const totalRevenueSubtitle = useMemo(() => {
        if (revCostChartPeriod === 'this_month') return 'This Month';
        if (revCostChartPeriod === 'last_month') return 'Last Month';
        if (revCostChartPeriod === 'last_year') return 'Last Year';
        if (typeof revCostChartPeriod === 'string' && /^\d{4}$/.test(revCostChartPeriod.trim())) {
            return revCostChartPeriod.trim();
        }
        if (revCostChartPeriod === 'this_year') {
            if (selectedYear && selectedYear !== CURRENT_CALENDAR_YEAR) {
                return String(selectedYear);
            }
            return 'This Year';
        }
        return PERIOD_LABELS[revCostChartPeriod] || 'Period';
    }, [revCostChartPeriod, selectedYear]);

    // ── Dynamic Chart Headings (Reflecting Selected Period without hardcoded 'Monthly') ──
    const overviewChartHeading = useMemo(() => {
        if (overviewChartPeriod === 'this_month') return 'This Month Sales';
        if (overviewChartPeriod === 'last_month') return 'Last Month Sales';
        if (overviewChartPeriod === 'last_year') return 'Last Year Sales';
        if (typeof overviewChartPeriod === 'string' && /^\d{4}$/.test(overviewChartPeriod.trim())) {
            return `${overviewChartPeriod.trim()} Sales`;
        }
        if (overviewChartPeriod === 'this_year') {
            if (selectedYear && selectedYear !== CURRENT_CALENDAR_YEAR) {
                return `${selectedYear} Sales`;
            }
            return 'This Year Sales';
        }
        return 'This Year Sales';
    }, [overviewChartPeriod, selectedYear]);

    const revCostChartHeading = useMemo(() => {
        if (revCostChartPeriod === 'this_month') return 'This Month Revenue vs Cost';
        if (revCostChartPeriod === 'last_month') return 'Last Month Revenue vs Cost';
        if (revCostChartPeriod === 'last_year') return 'Last Year Revenue vs Cost';
        if (typeof revCostChartPeriod === 'string' && /^\d{4}$/.test(revCostChartPeriod.trim())) {
            return `${revCostChartPeriod.trim()} Revenue vs Cost`;
        }
        if (revCostChartPeriod === 'this_year') {
            if (selectedYear && selectedYear !== CURRENT_CALENDAR_YEAR) {
                return `${selectedYear} Revenue vs Cost`;
            }
            return 'This Year Revenue vs Cost';
        }
        return 'This Year Revenue vs Cost';
    }, [revCostChartPeriod, selectedYear]);

    const totalSalesKpiAmount = useMemo(() => {
        const overviewSum = sortedOverviewData.reduce((acc, curr) => acc + (Number(curr.sales) || 0), 0);
        if (overviewChartPeriod === 'this_year' || (typeof overviewChartPeriod === 'string' && /^\d{4}$/.test(overviewChartPeriod.trim()))) {
            if (overviewSum > 0) return overviewSum;
            if (selectedYear === CURRENT_CALENDAR_YEAR && summary?.total_sales !== null && summary?.total_sales !== undefined) {
                return Number(summary.total_sales);
            }
            return overviewSum;
        }
        if (overviewChartPeriod === 'this_month') {
            if (overviewSum > 0) return overviewSum;
            if (summary?.monthly_sales !== null && summary?.monthly_sales !== undefined) {
                return Number(summary.monthly_sales);
            }
            return overviewSum;
        }
        return overviewSum;
    }, [overviewChartPeriod, sortedOverviewData, selectedYear, summary]);

    const totalRevenueKpiAmount = useMemo(() => {
        return effectiveRevCostMetrics.revenue;
    }, [effectiveRevCostMetrics]);

    return (
        <PageContainer>
            {/* ── Top Header Area ── */}
            <PageHeader
                title="Dashboard"
                subtitle="Overview of your store performance and key metrics"
            />

            {/* Error Notification with Interactive Retry */}
            {error && (
                <div className="dashboard-error-banner">
                    <div className="dashboard-error-text">
                        <BsExclamationCircleFill size={16} />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        className="dashboard-retry-btn"
                        onClick={() => fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod, false, selectedYear)}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── Financial Performance Summary Cards (5 Cards - Dedicated Total Sales + Existing Cards) ── */}
            <KpiGrid columns={5} ariaLabel="Financial Performance Indicators">
                {/* 1. Dedicated Total Sales */}
                <KpiCard
                    variant="total-sales"
                    title="Total Sales"
                    value={formatCurrency(totalSalesKpiAmount)}
                    subtitle={totalSalesSubtitle}
                    subtitleIcon={<BsCalendar3 style={{ display: 'inline', fontSize: 10 }} />}
                    subtitleColor="#2563eb"
                    icon={<BsCashStack />}
                    loading={loading}
                    tooltip={`Total Sales (${totalSalesSubtitle})`}
                />

                {/* 2. Total Sales / Revenue (Period-based) */}
                <KpiCard
                    to="/reports"
                    variant="revenue"
                    title="Total Revenue"
                    value={formatCurrency(totalRevenueKpiAmount)}
                    subtitle={totalRevenueSubtitle}
                    subtitleIcon={<BsArrowUp style={{ display: 'inline' }} />}
                    subtitleColor="#10b981"
                    icon={<BsCashStack />}
                    loading={loading}
                    tooltip="View Sales Reports"
                />

                {/* 3. Total Cost (COGS) */}
                <KpiCard
                    variant="cost"
                    title="Total Cost (COGS)"
                    value={formatCurrency(financialMetrics.cost)}
                    subtitle="Cost of Goods Sold • Click for details"
                    subtitleColor="#64748b"
                    icon={<BsTagFill />}
                    loading={loading}
                    onClick={() => setActiveMetricModal('cost')}
                    tooltip="Click to view Cost of Goods Sold (COGS) breakdown and accounting formula"
                />

                {/* 4. Gross Profit */}
                <KpiCard
                    variant="profit"
                    title="Gross Profit"
                    value={formatCurrency(financialMetrics.grossProfit)}
                    valueColor={financialMetrics.grossProfit >= 0 ? '#059669' : '#dc2626'}
                    subtitle="Net Sales − COGS • Click for details"
                    subtitleColor="#64748b"
                    icon={<BsGraphUpArrow />}
                    loading={loading}
                    onClick={() => setActiveMetricModal('profit')}
                    tooltip="Click to view Gross Profit breakdown and accounting formula"
                />

                {/* 5. Gross Profit Margin (%) */}
                <KpiCard
                    variant="margin"
                    title="Gross Profit Margin"
                    value={`${financialMetrics.grossMargin.toFixed(2)}%`}
                    subtitle={`Markup: ${financialMetrics.markup.toFixed(2)}% • Click for details`}
                    subtitleColor="#64748b"
                    icon={<BsPercent />}
                    loading={loading}
                    onClick={() => setActiveMetricModal('margin')}
                    tooltip="Click to view Gross Profit Margin and Markup breakdown"
                />
            </KpiGrid>

            {/* ── Operational Quick Metrics Strip ── */}
            <section className="operational-strip" aria-label="Operational Metrics">
                <Link to="/invoices" className="op-card" title="View Invoices & Orders">
                    <div className="op-icon sales"><BsCart3 /></div>
                    <div className="op-info">
                        <span className="op-label">Today's Sales</span>
                        <span className="op-val">{formatCurrency(summary?.today_sales ?? 0)}</span>
                        <span className="op-sub">{todayOrdersCount !== null ? `${todayOrdersCount} orders today` : 'Today'}</span>
                    </div>
                </Link>

                <div className="op-card" title="Monthly Sales Total">
                    <div className="op-icon monthly"><BsCashStack /></div>
                    <div className="op-info">
                        <span className="op-label">Monthly Sales</span>
                        <span className="op-val">{formatCurrency(summary?.monthly_sales ?? 0)}</span>
                        <span className="op-sub">Current month sales</span>
                    </div>
                </div>

                <div className="op-card" title="Total Products Sold">
                    <div className="op-icon products"><BsBox /></div>
                    <div className="op-info">
                        <span className="op-label">Products Sold</span>
                        <span className="op-val">{formatInteger(summary?.products_sold ?? 0)}</span>
                        <span className="op-sub">
                            {summary?.products_target > 0
                                ? `Target: ${formatInteger(summary.products_target)} (${(summary.products_achievement_percentage || 0).toFixed(0)}%)`
                                : 'Units sold in period'}
                        </span>
                    </div>
                </div>

                <Link to="/customers" className="op-card" title="View Customers">
                    <div className="op-icon customers"><BsPeopleFill /></div>
                    <div className="op-info">
                        <span className="op-label">Total Customers</span>
                        <span className="op-val">{formatInteger(summary?.total_customers ?? 0)}</span>
                        <span className="op-sub">Registered customers</span>
                    </div>
                </Link>

                <Link to="/inventory" className="op-card" title="View Inventory">
                    <div className="op-icon lowstock"><BsBoxSeam /></div>
                    <div className="op-info">
                        <span className="op-label">Low Stock Products</span>
                        <span className="op-val">{formatInteger(summary?.low_stock_products ?? 0)}</span>
                        <span className="op-sub">Manage inventory &rarr;</span>
                    </div>
                </Link>
            </section>

            {/* ── Charts Row (2 Columns) ── */}
            <section className="charts-row">
                {/* 1. Monthly Sales Chart */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon blue">
                                <BsBarChartFill />
                            </div>
                            <div>
                                <h3 className="card-title">{overviewChartHeading}</h3>
                                <p className="card-subtitle">
                                    {(overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod))
                                        ? `Sales revenue for ${selectedYear && selectedYear !== CURRENT_CALENDAR_YEAR ? selectedYear : (overviewChartPeriod === 'this_year' ? 'this year' : selectedYear)} (January – December) • Total: ${formatCurrency(totalSalesKpiAmount)}`
                                        : `Daily sales revenue for ${overviewChartPeriod === 'this_month' ? 'this month' : 'last month'} (${overviewMeta.full} ${overviewMeta.year}) • Total: ${formatCurrency(totalSalesKpiAmount)}`}
                                </p>
                            </div>
                        </div>

                        <div className="card-period-select-wrap" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                className="card-period-select"
                                value={overviewChartPeriod}
                                onChange={(e) => setOverviewChartPeriod(e.target.value)}
                                aria-label="Overview chart period"
                                id="monthly-sales-period-select"
                            >
                                <option value="this_year">This Year</option>
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                            </select>
                            {(overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod)) && (
                                <select
                                    className="card-period-select card-year-select"
                                    value={selectedYear}
                                    onChange={(e) => handleYearSelect(Number(e.target.value))}
                                    aria-label="Select sales year"
                                    id="monthly-sales-year-select"
                                    title="Select year"
                                >
                                    {availableYears.map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="chart-content-wrap">
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
                        ) : sortedOverviewData.length === 0 ? (
                            <div className="empty-state-card">
                                <BsBarChartFill className="empty-state-icon" />
                                <p className="empty-state-title">No Sales Data</p>
                                <p className="empty-state-sub">No sales recorded for the selected period.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={sortedOverviewData}
                                    margin={{ top: 36, right: 16, left: 24, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        ticks={overviewXAxisTicks}
                                        interval={0}
                                        tickFormatter={(val) => {
                                            if (overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod)) return val;
                                            if (overviewXAxisTicks && overviewXAxisTicks.length > 0) {
                                                return overviewXAxisTicks.includes(val) ? val : '';
                                            }
                                            return val;
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={68}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        tickFormatter={formatCompactCurrency}
                                        domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 100)]}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullMonth || payload?.[0]?.payload?.monthName || label}
                                        formatter={(val) => [formatCurrency(val), 'Sales Revenue']}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar
                                        dataKey="sales"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={(overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod)) ? 32 : 14}
                                        minPointSize={2}
                                    >
                                        {sortedOverviewData.map((entry, index) => (
                                            <Cell
                                                key={`month-cell-${index}`}
                                                fill={entry.sales > 0 ? '#2563eb' : '#e2e8f0'}
                                                stroke={entry.sales > 0 ? '#1d4ed8' : '#cbd5e1'}
                                                strokeWidth={1}
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="sales"
                                            position="top"
                                            formatter={(val) => {
                                                const num = Number(val);
                                                return num > 0 ? formatCompactCurrency(num) : '';
                                            }}
                                            style={{
                                                fontSize: (overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod)) ? 10 : 8,
                                                fill: '#1e40af',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {/* Accessible screen-reader data table for all 12 calendar months */}
                        {(overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod)) && (
                            <div className="sr-only" aria-label="12-Month Yearly Sales Data Table">
                                <table>
                                    <caption>Yearly sales revenue by calendar month</caption>
                                    <thead>
                                        <tr>
                                            {CALENDAR_MONTHS.map((m) => (
                                                <th key={m.short} scope="col">{m.full}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {sortedOverviewData.map((d) => (
                                                <td key={d.month}>{formatCurrency(d.sales)}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#2563eb' }} />
                            <span>Sales Revenue</span>
                        </span>
                        <span className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }} />
                            <span>Zero Sales (₹0.00)</span>
                        </span>
                        <span className="legend-item legend-total">
                            <span>{(overviewChartPeriod === 'this_year' || /^\d{4}$/.test(overviewChartPeriod)) ? 'Annual Total: ' : `${overviewMeta.short} Total: `}<strong>{formatCurrency(totalSalesKpiAmount)}</strong></span>
                        </span>
                    </div>
                </div>

                {/* 2. Monthly Revenue vs Cost Grouped Bar Chart */}
                <div className="dashboard-card" id="revenue-vs-cost-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon blue">
                                <BsBarChartFill />
                            </div>
                            <div>
                                <h3 className="card-title">{revCostChartHeading}</h3>
                                <p className="card-subtitle">
                                    {(revCostChartPeriod === 'this_year' || /^\d{4}$/.test(revCostChartPeriod))
                                        ? `Monthly comparison for ${selectedYear && selectedYear !== CURRENT_CALENDAR_YEAR ? selectedYear : (revCostChartPeriod === 'this_year' ? 'this calendar year' : selectedYear)} (Jan – Dec) • Revenue: ${formatCurrency(effectiveRevCostMetrics.revenue)} | Cost: ${formatCurrency(effectiveRevCostMetrics.cost)}`
                                        : `Daily comparison for ${revCostChartPeriod === 'this_month' ? 'this month' : 'last month'} (${revCostMeta.full} ${revCostMeta.year}) • Revenue: ${formatCurrency(effectiveRevCostMetrics.revenue)} | Cost: ${formatCurrency(effectiveRevCostMetrics.cost)}`}
                                </p>
                            </div>
                        </div>

                        <div
                            className="card-period-select-wrap rev-cost-filters-wrap"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'nowrap',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            <select
                                className="card-period-select"
                                value={revCostChartPeriod}
                                onChange={(e) => setRevCostChartPeriod(e.target.value)}
                                aria-label="Revenue vs cost period"
                                id="rev-cost-period-select"
                            >
                                <option value="this_year">This Year</option>
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                            </select>
                            {(revCostChartPeriod === 'this_year' || /^\d{4}$/.test(revCostChartPeriod)) && (
                                <select
                                    className="card-period-select card-year-select"
                                    value={selectedYear}
                                    onChange={(e) => handleYearSelect(Number(e.target.value))}
                                    aria-label="Select revenue vs cost year"
                                    id="rev-cost-year-select"
                                    title="Select year"
                                >
                                    {availableYears.map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="chart-content-wrap">
                        {loading ? (
                            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
                        ) : !revenueVsCost && financialMetrics.revenue === 0 && financialMetrics.cost === 0 ? (
                            <div className="empty-state-card">
                                <BsBarChartFill className="empty-state-icon" />
                                <p className="empty-state-title">Revenue &amp; Cost Unavailable</p>
                                <p className="empty-state-sub">Unable to retrieve financial metrics for the selected period.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyRevVsCostData}
                                    margin={{ top: 32, right: 8, left: 0, bottom: 8 }}
                                    barGap={revCostChartLayout.barGap}
                                    barCategoryGap={revCostChartLayout.barCategoryGap}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        ticks={revCostXAxisTicks}
                                        interval={0}
                                        tickFormatter={(val) => {
                                            if (revCostChartPeriod === 'this_year' || /^\d{4}$/.test(revCostChartPeriod)) return val;
                                            if (revCostXAxisTicks && revCostXAxisTicks.length > 0) {
                                                return revCostXAxisTicks.includes(val) ? val : '';
                                            }
                                            return val;
                                        }}
                                    />
                                    {/* Left Y-Axis for Revenue */}
                                    <YAxis
                                        yAxisId="revAxis"
                                        orientation="left"
                                        axisLine={false}
                                        tickLine={false}
                                        width={50}
                                        tickCount={5}
                                        tick={{ fill: '#2563eb', fontSize: 11 }}
                                        tickFormatter={formatCompactCurrency}
                                        domain={[0, revAxisMax]}
                                    />
                                    {/* Right Y-Axis for Cost (COGS) so ₹1,100 is clearly scaled and visible against ₹83,718 */}
                                    <YAxis
                                        yAxisId="costAxis"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        width={48}
                                        tickCount={5}
                                        tick={{ fill: '#ef4444', fontSize: 11 }}
                                        tickFormatter={formatCompactCurrency}
                                        domain={[0, costAxisMax]}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                                        content={renderRevCostTooltip}
                                    />
                                    <Bar
                                        yAxisId="revAxis"
                                        dataKey="revenue"
                                        name="Revenue"
                                        fill="#2563eb"
                                        radius={[2, 2, 0, 0]}
                                        maxBarSize={revCostChartLayout.maxBarSize}
                                        minPointSize={revCostChartLayout.minPointSize}
                                    >
                                        {isRevCostYearly && (
                                            <LabelList
                                                dataKey="revenue"
                                                content={renderRevBarLabel}
                                            />
                                        )}
                                    </Bar>
                                    <Bar
                                        yAxisId="costAxis"
                                        dataKey="cost"
                                        name="Cost (COGS)"
                                        fill="#ef4444"
                                        radius={[2, 2, 0, 0]}
                                        maxBarSize={revCostChartLayout.maxBarSize}
                                        minPointSize={revCostChartLayout.minPointSize}
                                    >
                                        {isRevCostYearly && (
                                            <LabelList
                                                dataKey="cost"
                                                content={renderCostBarLabel}
                                            />
                                        )}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {/* Accessible screen-reader data table for all 12 calendar months */}
                        {(revCostChartPeriod === 'this_year' || /^\d{4}$/.test(revCostChartPeriod)) && (
                            <div className="sr-only" aria-label="12-Month Revenue vs Cost Data Table">
                                <table>
                                    <caption>Monthly Revenue and Cost of Goods Sold</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Month</th>
                                            <th scope="col">Revenue</th>
                                            <th scope="col">Cost (COGS)</th>
                                            <th scope="col">Gross Profit</th>
                                            <th scope="col">Margin (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyRevVsCostData.map((d) => (
                                            <tr key={d.month}>
                                                <td>{d.fullMonth}</td>
                                                <td>{formatCurrency(d.revenue)}</td>
                                                <td>{formatCurrency(d.cost)}</td>
                                                <td>{formatCurrency(d.grossProfit)}</td>
                                                <td>{`${d.grossMargin.toFixed(2)}%`}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="rev-cost-footer">
                        <div className="chart-legend">
                            <span className="legend-item">
                                <span className="legend-dot" style={{ backgroundColor: '#2563eb' }} />
                                <span>Revenue (Left Axis): {formatCurrency(effectiveRevCostMetrics.revenue)}</span>
                            </span>
                            <span className="legend-item">
                                <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
                                <span>Cost (Right Axis): {formatCurrency(effectiveRevCostMetrics.cost)}</span>
                            </span>
                        </div>

                        <div className="rev-cost-metrics-row">
                            <div className="rev-cost-metric">
                                <span className="rev-cost-metric-label">Gross Profit:</span>
                                <span
                                    className={`rev-cost-metric-value ${
                                        effectiveRevCostMetrics.grossProfit >= 0 ? 'profit-positive' : 'profit-negative'
                                    }`}
                                >
                                    {formatCurrency(effectiveRevCostMetrics.grossProfit)}
                                </span>
                            </div>
                            <div className="rev-cost-metric">
                                <span className="rev-cost-metric-label">Gross Margin:</span>
                                <span
                                    className={`rev-cost-metric-value ${
                                        effectiveRevCostMetrics.grossMargin >= 0 ? 'profit-positive' : 'profit-negative'
                                    }`}
                                >
                                    {`${effectiveRevCostMetrics.grossMargin.toFixed(2)}%`}
                                </span>
                            </div>
                            <div className="rev-cost-metric">
                                <span className="rev-cost-metric-label">Markup:</span>
                                <span
                                    className={`rev-cost-metric-value ${
                                        effectiveRevCostMetrics.markup >= 0 ? 'profit-positive' : 'profit-negative'
                                    }`}
                                >
                                    {`${effectiveRevCostMetrics.markup.toFixed(2)}%`}
                                </span>
                            </div>
                        </div>

                        <p className="cost-transparency-note">
                            Cost represents Cost of Goods Sold (COGS: quantity sold × unit cost price). Gross Profit = Net Sales Revenue − COGS ({formatCurrency(effectiveRevCostMetrics.revenue)} − {formatCurrency(effectiveRevCostMetrics.cost)} = {formatCurrency(effectiveRevCostMetrics.grossProfit)}). Gross Margin = (Gross Profit ÷ Net Sales Revenue) × 100 ({effectiveRevCostMetrics.grossMargin.toFixed(2)}%). Markup = (Gross Profit ÷ COGS) × 100 ({effectiveRevCostMetrics.markup.toFixed(2)}%).
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Store-wise Sales Summary ── */}
            {totalStoreCount > 0 && (
                <section className="dashboard-section store-summary-section" aria-label="Store Summary">
                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <div className="card-title-group">
                                <div className="card-header-icon green">
                                    <BsShop />
                                </div>
                                <div>
                                    <h3 className="card-title">Store-wise Sales Summary</h3>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-table-wrap">
                            <table className="dashboard-table store-summary-table">
                                <thead>
                                    <tr>
                                        <th className="col-store">Store</th>
                                        <th className="col-today-sales">Today's Sales</th>
                                        <th className="col-monthly-sales">Monthly Sales</th>
                                        <th className="col-orders">Orders</th>
                                        <th className="col-low-stock">Low Stock</th>
                                        <th className="col-status">Status</th>
                                        <th className="col-action">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStores.map((st) => {
                                        const storeName = st.store_name || stores.find(s => String(s.id) === String(st.store_id))?.name || (st.store_id ? `Store #${st.store_id}` : '—');
                                        const isSelected = String(selectedStore) === String(st.store_id);
                                        return (
                                            <tr key={st.store_id} style={isSelected ? { background: '#f8fafc' } : {}}>
                                                <td className="col-store" style={{ fontWeight: 600 }}>{storeName}</td>
                                                <td className="col-today-sales" style={{ fontWeight: 600 }}>{formatCurrency(st.today_sales)}</td>
                                                <td className="col-monthly-sales" style={{ fontWeight: 600 }}>{formatCurrency(st.monthly_sales)}</td>
                                                <td className="col-orders">{formatInteger(st.orders_count)}</td>
                                                <td className="col-low-stock">
                                                    {st.low_stock_count > 0 ? (
                                                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{st.low_stock_count}</span>
                                                    ) : (
                                                        <span style={{ color: '#10b981' }}>0</span>
                                                    )}
                                                </td>
                                                <td className="col-status">
                                                    <span className={`status-pill ${st.is_active !== false ? 'completed' : 'cancelled'}`}>
                                                        {st.is_active !== false ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="col-action" style={{ verticalAlign: 'middle' }}>
                                                    <button
                                                        type="button"
                                                        className="adm-btn-secondary"
                                                        style={{
                                                            padding: '6px 8px',
                                                            borderRadius: 6,
                                                            border: isSelected ? '1.5px solid #6366f1' : '1px solid #e5e7eb',
                                                            background: isSelected ? '#eef2ff' : '#ffffff',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onClick={() => setSelectedStore(prev => String(prev) === String(st.store_id) ? '' : String(st.store_id))}
                                                        title={isSelected ? `Currently viewing ${storeName} (click to clear filter)` : `View metrics for ${storeName}`}
                                                        aria-label={isSelected ? `Currently viewing ${storeName}. Click to reset to all stores.` : `View dashboard for ${storeName}`}
                                                        aria-pressed={isSelected}
                                                    >
                                                        <BsEye size={14} color={isSelected ? '#4f46e5' : '#6366f1'} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalStoreCount > 0 && (
                            <div className="dashboard-pagination">
                                <span className="dashboard-pagination-info">
                                    Showing {(storePage - 1) * STORES_PER_PAGE + 1}–{Math.min(storePage * STORES_PER_PAGE, totalStoreCount)} of {totalStoreCount}
                                    &nbsp;|&nbsp; Page {storePage} of {totalStorePages}
                                </span>
                                <div className="dashboard-pagination-controls">
                                    <button
                                        type="button"
                                        className="adm-btn-secondary dashboard-pagination-nav-btn"
                                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: storePage === 1 ? 'not-allowed' : 'pointer' }}
                                        disabled={storePage === 1}
                                        onClick={() => setStorePage((p) => p - 1)}
                                    >
                                        <BsChevronLeft size={12} />
                                    </button>
                                    {Array.from({ length: totalStorePages }, (_, i) => i + 1).map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            className={`dashboard-pagination-num-btn ${n === storePage ? 'active' : ''}`}
                                            onClick={() => setStorePage(n)}
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 6,
                                                border: `1.5px solid ${n === storePage ? '#6366f1' : '#e5e7eb'}`,
                                                background: n === storePage ? '#eef2ff' : '#fff',
                                                color: n === storePage ? '#6366f1' : '#6b7280',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        className="adm-btn-secondary dashboard-pagination-nav-btn"
                                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: storePage === totalStorePages ? 'not-allowed' : 'pointer' }}
                                        disabled={storePage === totalStorePages}
                                        onClick={() => setStorePage((p) => p + 1)}
                                    >
                                        <BsChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── Bottom Row: Tables (2 Columns) ── */}
            <section className="bottom-tables-row">
                {/* 1. Recent Transactions Table */}
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon blue">
                                <BsReceiptCutoff />
                            </div>
                            <div>
                                <h3 className="card-title">Recent Transactions</h3>
                            </div>
                        </div>

                        <Link to="/invoices" className="card-view-all">
                            View All
                        </Link>
                    </div>

                    <div className="dashboard-table-wrap">
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton-box" style={{ width: '100%', height: 36 }} />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="empty-state-card">
                                <BsReceiptCutoff className="empty-state-icon" />
                                <p className="empty-state-title">No transactions found</p>
                                <p className="empty-state-sub">New sales transactions will appear here.</p>
                            </div>
                        ) : (
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Invoice No.</th>
                                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Date &amp; Time</th>
                                        <th style={{ textAlign: 'left', padding: '12px 14px' }}>Customer</th>
                                        <th style={{ textAlign: 'right', padding: '12px 14px' }}>Amount</th>
                                        <th style={{ textAlign: 'center', padding: '12px 14px', minWidth: 125 }}>Order Status</th>
                                        <th style={{ textAlign: 'center', padding: '12px 14px', minWidth: 110 }}>Payment Status</th>
                                        <th style={{ textAlign: 'center', padding: '12px 14px', width: 70 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTransactions.map((ord, idx) => {
                                        const orderId = ord.order_id || ord.id || idx;
                                        const invoiceNo = ord.order_number || ord.invoice_number || `ORD-${orderId}`;
                                        const customerName = ord.customer_name || ord.customer?.name || (ord.customer_id ? `Customer #${ord.customer_id}` : 'Walk-in Customer');
                                        const amount = Number(ord.amount ?? ord.total_amount ?? 0);
                                        const { order: orderStatus, payment: paymentStatus } = parseTransactionStatuses(ord);

                                        return (
                                            <tr key={orderId}>
                                                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                                    <Link to="/invoices" className="table-id-link" title={`View ${invoiceNo}`}>
                                                        {invoiceNo}
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#64748b' }}>
                                                    {formatDate(ord.created_at)}
                                                </td>
                                                <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 500, color: '#1e293b' }}>
                                                    {customerName}
                                                </td>
                                                <td className="table-amount" style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>
                                                    {formatCurrency(amount)}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span className={`status-pill ${getStatusClass(orderStatus)}`}>
                                                        {orderStatus}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span className={`status-pill ${getStatusClass(paymentStatus)}`}>
                                                        {paymentStatus}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <Link
                                                        to="/invoices"
                                                        className="adm-btn-secondary"
                                                        style={{
                                                            padding: '6px 8px',
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            textDecoration: 'none',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title={`View details for ${invoiceNo}`}
                                                    >
                                                        <BsEye size={14} color="#6366f1" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {transactions.length > 0 && (
                        <div className="dashboard-pagination">
                            <span className="dashboard-pagination-info">
                                Showing {(txPage - 1) * TX_PER_PAGE + 1}–{Math.min(txPage * TX_PER_PAGE, transactions.length)} of {transactions.length}
                                &nbsp;|&nbsp; Page {txPage} of {totalTxPages}
                            </span>
                            <div className="dashboard-pagination-controls">
                                <button
                                    type="button"
                                    className="adm-btn-secondary dashboard-pagination-nav-btn"
                                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: txPage === 1 ? 'not-allowed' : 'pointer' }}
                                    disabled={txPage === 1}
                                    onClick={() => setTxPage((p) => p - 1)}
                                >
                                    <BsChevronLeft size={12} />
                                </button>
                                {Array.from({ length: totalTxPages }, (_, i) => i + 1).map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        className={`dashboard-pagination-num-btn ${n === txPage ? 'active' : ''}`}
                                        onClick={() => setTxPage(n)}
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 6,
                                            border: `1.5px solid ${n === txPage ? '#6366f1' : '#e5e7eb'}`,
                                            background: n === txPage ? '#eef2ff' : '#fff',
                                            color: n === txPage ? '#6366f1' : '#6b7280',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="adm-btn-secondary dashboard-pagination-nav-btn"
                                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: txPage === totalTxPages ? 'not-allowed' : 'pointer' }}
                                    disabled={txPage === totalTxPages}
                                    onClick={() => setTxPage((p) => p + 1)}
                                >
                                    <BsChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Top Selling Products Table */}
                <div className="dashboard-card top-products-card">
                    <div className="dashboard-card-header">
                        <div className="card-title-group">
                            <div className="card-header-icon yellow">
                                <BsTrophyFill />
                            </div>
                            <div>
                                <h3 className="card-title">Top Selling Products</h3>
                            </div>
                        </div>

                        <Link to="/products" className="card-view-all">
                            View All
                        </Link>
                    </div>

                    <div className="dashboard-table-wrap">
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton-box" style={{ width: '100%', height: 36 }} />
                                ))}
                            </div>
                        ) : topProducts.length === 0 ? (
                            <div className="empty-state-card">
                                <BsBox className="empty-state-icon" />
                                <p className="empty-state-title">No products sold yet</p>
                                <p className="empty-state-sub">Top products will appear once orders are made.</p>
                            </div>
                        ) : (
                            <table className="dashboard-table top-products-table">
                                <thead>
                                    <tr>
                                        <th className="col-rank">#</th>
                                        <th className="col-product">Product</th>
                                        <th className="col-qty">Quantity Sold</th>
                                        <th className="col-rev">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, idx) => (
                                        <tr key={idx}>
                                            <td className="col-rank" style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                                            <td className="col-product">
                                                <div className="top-product-row-info">
                                                    <div className="product-thumb">
                                                        <BsBox />
                                                    </div>
                                                    <div className="product-name-sku">
                                                        <span className="product-name" title={p.product_name}>
                                                            {p.product_name}
                                                        </span>
                                                        {p.sku && (
                                                            <span className="product-sku">SKU: {p.sku}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="col-qty" style={{ fontWeight: 600 }}>
                                                {formatInteger(p.quantity_sold)}
                                            </td>
                                            <td className="col-rev" style={{ fontWeight: 700, color: '#0f172a' }}>
                                                {formatCurrency(p.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Financial Metric Details Modal ── */}
            {activeMetricModal &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="financial-modal-backdrop"
                        onClick={() => setActiveMetricModal(null)}
                        role="presentation"
                    >
                        <div
                            className="financial-modal-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="financial-modal-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="financial-modal-header">
                                <div className="financial-modal-title-group">
                                    <div className={`financial-modal-icon-wrap ${activeMetricModal}`}>
                                        {activeMetricModal === 'cost' && <BsTagFill />}
                                        {activeMetricModal === 'profit' && <BsGraphUpArrow />}
                                        {activeMetricModal === 'margin' && <BsPercent />}
                                    </div>
                                    <div>
                                        <h3 id="financial-modal-title" className="financial-modal-title">
                                            {activeMetricModal === 'cost' && 'Total Cost of Goods Sold (COGS)'}
                                            {activeMetricModal === 'profit' && 'Gross Profit Performance'}
                                            {activeMetricModal === 'margin' && 'Gross Profit Margin & Markup'}
                                        </h3>
                                        <span className="financial-modal-badge">
                                            {totalRevenueSubtitle} &bull; {selectedStoreLabel}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="financial-modal-close-btn"
                                    onClick={() => setActiveMetricModal(null)}
                                    aria-label="Close metric details modal"
                                >
                                    <BsX size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="financial-modal-body">
                                {/* Large Metric Value Box */}
                                <div className="financial-modal-value-card">
                                    <span className="financial-modal-value-label">Current Metric Value</span>
                                    <div className="financial-modal-primary-value">
                                        {activeMetricModal === 'cost' && formatCurrency(financialMetrics.cost)}
                                        {activeMetricModal === 'profit' && (
                                            <span className={financialMetrics.grossProfit >= 0 ? 'profit-positive' : 'profit-negative'}>
                                                {formatCurrency(financialMetrics.grossProfit)}
                                            </span>
                                        )}
                                        {activeMetricModal === 'margin' && (
                                            <div className="financial-modal-dual-rates">
                                                <div>
                                                    <span className="rate-num">{financialMetrics.grossMargin.toFixed(2)}%</span>
                                                    <span className="rate-sub">Margin on Sales</span>
                                                </div>
                                                <div className="rate-divider" />
                                                <div>
                                                    <span className="rate-num">{financialMetrics.markup.toFixed(2)}%</span>
                                                    <span className="rate-sub">Markup on Cost</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Accounting Formula & Calculation Box */}
                                <div className="financial-modal-formula-box">
                                    <h4 className="financial-modal-section-title">Accounting Formula &amp; Rules</h4>
                                    {activeMetricModal === 'cost' && (
                                        <>
                                            <div className="financial-modal-formula-tag">
                                                <code>COGS = &Sigma; (Sold Quantity &times; Unit Cost Price)</code>
                                            </div>
                                            <p className="financial-modal-desc">
                                                COGS represents the direct procurement and manufacturing cost of inventory sold in completed customer orders. Calculated by querying order line items with variant-specific cost prices (falling back to product cost price).
                                            </p>
                                            <div className="financial-modal-calc-row">
                                                <span>Total Net Sales Revenue:</span>
                                                <strong>{formatCurrency(financialMetrics.revenue)}</strong>
                                            </div>
                                            <div className="financial-modal-calc-row">
                                                <span>Total Cost of Goods Sold (COGS):</span>
                                                <strong style={{ color: '#dc2626' }}>{formatCurrency(financialMetrics.cost)}</strong>
                                            </div>
                                            <div className="financial-modal-calc-row">
                                                <span>Cost Ratio (% of Sales):</span>
                                                <strong>
                                                    {financialMetrics.revenue > 0
                                                        ? `${((financialMetrics.cost / financialMetrics.revenue) * 100).toFixed(2)}%`
                                                        : '0.00%'}
                                                </strong>
                                            </div>
                                        </>
                                    )}

                                    {activeMetricModal === 'profit' && (
                                        <>
                                            <div className="financial-modal-formula-tag">
                                                <code>Gross Profit = Net Sales Revenue &minus; Cost of Goods Sold</code>
                                            </div>
                                            <p className="financial-modal-desc">
                                                Gross profit reflects revenue retained after paying the direct costs of goods sold, before operating expenses (OPEX), rent, utilities, employee payroll, and tax deductions.
                                            </p>
                                            <div className="financial-modal-calc-row">
                                                <span>Net Sales Revenue:</span>
                                                <strong>{formatCurrency(financialMetrics.revenue)}</strong>
                                            </div>
                                            <div className="financial-modal-calc-row">
                                                <span>&minus; Cost of Goods Sold (COGS):</span>
                                                <strong style={{ color: '#dc2626' }}>&minus; {formatCurrency(financialMetrics.cost)}</strong>
                                            </div>
                                            <div className="financial-modal-calc-row total-highlight">
                                                <span>= Calculated Gross Profit:</span>
                                                <strong className={financialMetrics.grossProfit >= 0 ? 'profit-positive' : 'profit-negative'}>
                                                    {formatCurrency(financialMetrics.grossProfit)}
                                                </strong>
                                            </div>
                                        </>
                                    )}

                                    {activeMetricModal === 'margin' && (
                                        <>
                                            <div className="financial-modal-formula-tag">
                                                <code>Gross Margin (%) = (Gross Profit &divide; Net Sales Revenue) &times; 100</code>
                                            </div>
                                            <p className="financial-modal-desc">
                                                Gross Margin indicates the share of sales rupees kept as profit. Markup indicates the percentage added above the cost price to achieve the selling price.
                                            </p>
                                            <div className="financial-modal-calc-row">
                                                <span>Gross Profit Denominator (Revenue):</span>
                                                <strong>{formatCurrency(financialMetrics.revenue)}</strong>
                                            </div>
                                            <div className="financial-modal-calc-row">
                                                <span>Gross Profit Numerator:</span>
                                                <strong>{formatCurrency(financialMetrics.grossProfit)}</strong>
                                            </div>
                                            <div className="financial-modal-calc-row total-highlight">
                                                <span>Gross Profit Margin:</span>
                                                <strong className="profit-positive">{financialMetrics.grossMargin.toFixed(2)}%</strong>
                                            </div>
                                            <div className="financial-modal-calc-row">
                                                <span>Markup Ratio ((Profit &divide; Cost) &times; 100):</span>
                                                <strong>{financialMetrics.markup.toFixed(2)}%</strong>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="financial-modal-footer">
                                <button
                                    type="button"
                                    className="financial-modal-btn secondary"
                                    onClick={scrollToRevCostChart}
                                >
                                    <BsBarChartFill style={{ marginRight: 6 }} />
                                    <span>View in Revenue vs Cost Chart</span>
                                </button>
                                {activeMetricModal === 'cost' ? (
                                    <Link
                                        to="/purchases"
                                        className="financial-modal-btn primary"
                                        onClick={() => setActiveMetricModal(null)}
                                    >
                                        <span>View Purchase Orders</span>
                                        <BsArrowRight style={{ marginLeft: 6 }} />
                                    </Link>
                                ) : (
                                    <Link
                                        to="/reports"
                                        className="financial-modal-btn primary"
                                        onClick={() => setActiveMetricModal(null)}
                                    >
                                        <span>View Financial Reports</span>
                                        <BsArrowRight style={{ marginLeft: 6 }} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </PageContainer>
    );
};

export default Dashboard;
