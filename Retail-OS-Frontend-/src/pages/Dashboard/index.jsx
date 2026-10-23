import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
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
    getStores,
    getAnalyticsProducts,
} from '../../services/dashboard';
import { getOrders } from '../../services/orderService';
import './dashboard.css';

const PERIOD_LABELS = {
    this_year: 'This Year',
    this_month: 'This Month',
    last_month: 'Last Month',
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
        return `${sign}₹${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`;
    }
    if (abs >= 100000) {
        const l = abs / 100000;
        return `${sign}₹${l % 1 === 0 ? l : l.toFixed(1)}L`;
    }
    if (abs >= 1000) {
        const k = abs / 1000;
        return `${sign}₹${k % 1 === 0 ? k : k.toFixed(1)}k`;
    }
    return `${sign}₹${num}`;
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

    // 5. Fallback prefix match (e.g. 'sept')
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

const Dashboard = () => {
    // ── Filters & Selectors ──
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(''); // '' means All Stores (omitted store_id)
    const [period, setPeriod] = useState('this_year'); // 'this_year' | 'this_month' | 'last_month'

    // Individual chart period overrides (default synchronized with main period)
    const [overviewChartPeriod, setOverviewChartPeriod] = useState('this_year');
    const [revCostChartPeriod, setRevCostChartPeriod] = useState('this_year');

    // Dropdown open states
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);

    // ── Metric Drilldown Modal State ──
    const [activeMetricModal, setActiveMetricModal] = useState(null); // 'cost' | 'profit' | 'margin' | null

    // ── Notification Bell & Dropdown State ──
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [bellPosition, setBellPosition] = useState(null);
    const notificationDropdownRef = useRef(null);
    const bellButtonRef = useRef(null);

    // ── API State ──
    const [summary, setSummary] = useState(null);
    const [overviewData, setOverviewData] = useState([]);
    const [revenueVsCost, setRevenueVsCost] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);

    // Sequence reference and in-flight guard to prevent race conditions and duplicate requests
    const reqSeqRef = useRef(0);
    const isRefreshingRef = useRef(false);
    const storeDropdownRef = useRef(null);
    const periodDropdownRef = useRef(null);

    // Notification items derived from actual Dashboard data
    const notificationItems = useMemo(() => {
        const items = [];

        // Low stock products alert from Dashboard summary
        if (summary && summary.low_stock_products > 0) {
            items.push({
                id: 'low-stock-alert',
                type: 'warning',
                title: 'Low Stock Alert',
                message: `${summary.low_stock_products} ${summary.low_stock_products === 1 ? 'product is' : 'products are'} running low on inventory and need attention.`,
                time: 'Requires Action',
                link: '/inventory',
                linkText: 'View Inventory',
            });
        }

        // Active connection or dashboard error
        if (error) {
            items.push({
                id: 'dashboard-error-alert',
                type: 'error',
                title: 'System Notice',
                message: error,
                time: 'Warning',
                link: null,
            });
        }

        return items;
    }, [summary, error]);

    // ── Bind Header Notification Bell Icon Button ──
    useEffect(() => {
        const getBellElement = () => (
            document.querySelector('.header-icon-btn--bell') ||
            document.querySelector('button[title="Notifications"]')
        );

        let bellBtn = getBellElement();
        if (!bellBtn) return;
        bellButtonRef.current = bellBtn;

        bellBtn.setAttribute('aria-haspopup', 'dialog');
        bellBtn.setAttribute('aria-controls', 'dashboard-notification-panel');

        const updatePosition = () => {
            const rect = bellBtn.getBoundingClientRect();
            setBellPosition({
                top: Math.round(rect.bottom + 8),
                right: Math.max(16, Math.round(window.innerWidth - rect.right)),
            });
        };

        const handleBellClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            updatePosition();
            setIsNotificationOpen((prev) => !prev);
        };

        const handleBellKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                updatePosition();
                setIsNotificationOpen((prev) => !prev);
            }
        };

        bellBtn.addEventListener('click', handleBellClick);
        bellBtn.addEventListener('keydown', handleBellKeyDown);

        return () => {
            bellBtn.removeEventListener('click', handleBellClick);
            bellBtn.removeEventListener('keydown', handleBellKeyDown);
            bellBtn.removeAttribute('aria-haspopup');
            bellBtn.removeAttribute('aria-expanded');
            bellBtn.removeAttribute('aria-controls');
            bellBtn.classList.remove('active');
        };
    }, []);

    // Synchronize bell button accessibility and active state
    useEffect(() => {
        if (bellButtonRef.current) {
            bellButtonRef.current.setAttribute('aria-expanded', isNotificationOpen ? 'true' : 'false');
            bellButtonRef.current.classList.toggle('active', isNotificationOpen);
        }
    }, [isNotificationOpen]);

    // Close notification panel on outside click, Escape key, or reposition on resize/scroll
    useEffect(() => {
        if (!isNotificationOpen) return;

        const handleClickOutside = (e) => {
            if (
                notificationDropdownRef.current &&
                !notificationDropdownRef.current.contains(e.target) &&
                bellButtonRef.current &&
                !bellButtonRef.current.contains(e.target)
            ) {
                setIsNotificationOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsNotificationOpen(false);
                if (bellButtonRef.current) {
                    bellButtonRef.current.focus();
                }
            }
        };

        const handleReposition = () => {
            if (bellButtonRef.current) {
                const rect = bellButtonRef.current.getBoundingClientRect();
                setBellPosition({
                    top: Math.round(rect.bottom + 8),
                    right: Math.max(16, Math.round(window.innerWidth - rect.right)),
                });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [isNotificationOpen]);

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

    // ── Fetch All Dashboard Data ──
    const fetchAllDashboardData = useCallback(async (storeIdVal, mainPeriodVal, ovPeriodVal, rcPeriodVal, isSilent = false) => {
        // Prevent duplicate requests when fetch is already in-flight
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;

        const currentSeq = ++reqSeqRef.current;
        if (!isSilent) setLoading(true);
        setRefreshing(true);
        setError(null);

        const storeFilter = storeIdVal ? Number(storeIdVal) : null;

        try {
            const [
                summaryResult,
                overviewResult,
                revCostResult,
                topProductsResult,
                ordersResult,
                analyticsProductsResult,
            ] = await Promise.allSettled([
                getDashboardSummary(storeFilter),
                getDashboardOverview(ovPeriodVal || mainPeriodVal, storeFilter),
                getRevenueVsCost(rcPeriodVal || mainPeriodVal, storeFilter),
                getTopProducts(10, storeFilter),
                getOrders({
                    store_id: storeFilter || undefined,
                    page: 1,
                    page_size: 5,
                }),
                getAnalyticsProducts({
                    store_id: storeFilter || undefined,
                }),
            ]);

            // Prevent stale responses if a newer request was dispatched
            if (currentSeq !== reqSeqRef.current) return;

            let hadError = false;
            let errorMsg = '';

            // 1. Dashboard Summary
            if (summaryResult.status === 'fulfilled' && summaryResult.value) {
                const val = summaryResult.value;
                setSummary({
                    today_sales: parseMetric(val.today_sales),
                    monthly_sales: parseMetric(val.monthly_sales),
                    total_customers: parseMetric(val.total_customers),
                    total_revenue: parseMetric(val.total_revenue),
                    low_stock_products: parseMetric(val.low_stock_products),
                    mode: val.mode || 'all_stores',
                    stores_summary: Array.isArray(val.stores_summary) ? val.stores_summary : [],
                });
            } else {
                hadError = true;
                errorMsg = summaryResult.reason?.message || 'Failed to load dashboard summary';
                setSummary(null);
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
            } else {
                hadError = true;
                if (!errorMsg) errorMsg = overviewResult.reason?.message || 'Failed to load sales overview';
                setOverviewData(null);
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
                setTopProducts(prods);
            } else {
                hadError = true;
                setTopProducts([]);
            }

            // 5. Recent Transactions (Orders)
            if (ordersResult.status === 'fulfilled' && ordersResult.value) {
                const rawOrders = ordersResult.value;
                const ordList = Array.isArray(rawOrders)
                    ? rawOrders
                    : Array.isArray(rawOrders?.items)
                    ? rawOrders.items
                    : Array.isArray(rawOrders?.data)
                    ? rawOrders.data
                    : [];
                setTransactions(ordList.slice(0, 5));
            } else {
                setTransactions([]);
            }

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
        fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod);
    }, [selectedStore, period, overviewChartPeriod, revCostChartPeriod, fetchAllDashboardData]);

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
        return found ? found.name : `Store #${selectedStore}`;
    }, [selectedStore, stores]);

    // Calculate today's orders count from stores_summary if available
    const todayOrdersCount = useMemo(() => {
        if (!summary || !Array.isArray(summary.stores_summary) || summary.stores_summary.length === 0) {
            return null;
        }
        if (!selectedStore) {
            return summary.stores_summary.reduce((acc, curr) => acc + Number(curr.orders_count || 0), 0);
        }
        const current = summary.stores_summary.find((s) => String(s.store_id) === String(selectedStore));
        return current ? Number(current.orders_count || 0) : null;
    }, [selectedStore, summary]);

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

    // Chronologically sorted overview data (all 12 calendar months for yearly, or days 1 - 31 for daily)
    const sortedOverviewData = useMemo(() => {
        // When viewing yearly revenue, always construct and display all 12 calendar months in chronological order
        if (overviewChartPeriod === 'this_year') {
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

        // Daily overview (this_month, last_month)
        if (!Array.isArray(overviewData) || overviewData.length === 0) return [];

        return [...overviewData].sort((a, b) => {
            const dayA = parseInt(a.month ?? a.day ?? a.date, 10);
            const dayB = parseInt(b.month ?? b.day ?? b.date, 10);
            if (!isNaN(dayA) && !isNaN(dayB)) return dayA - dayB;
            return String(a.month).localeCompare(String(b.month));
        });
    }, [overviewChartPeriod, overviewData]);

    // Annual sales total matching sum of monthly sales values
    const annualSalesTotal = useMemo(() => {
        return sortedOverviewData.reduce((acc, curr) => acc + (Number(curr.sales) || 0), 0);
    }, [sortedOverviewData]);

    // ── Current-Year Monthly Revenue vs Cost Chart Data (12 Calendar Months Grouped Bars) ──
    const monthlyRevVsCostData = useMemo(() => {
        if (revCostChartPeriod === 'this_year') {
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
                // Synchronize revenue with monthly sales revenue from overviewData
                if (Array.isArray(sortedOverviewData) && sortedOverviewData.length === 12) {
                    sortedOverviewData.forEach((item, idx) => {
                        if (idx < 12) {
                            monthlyData[idx].revenue = Number(item.sales || 0);
                        }
                    });
                }

                // If monthly cost breakdown is not available, attribute cost proportionally to actual sales
                const totalYearRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
                const totalYearCost = financialMetrics.cost;

                monthlyData.forEach((d) => {
                    if (totalYearRevenue > 0 && d.revenue > 0) {
                        d.cost = Math.round(((d.revenue / totalYearRevenue) * totalYearCost) * 100) / 100;
                    } else {
                        d.cost = 0;
                    }
                });

                // Guarantee exact total cost reconciliation with zero rounding drift
                const sumCosts = monthlyData.reduce((sum, d) => sum + d.cost, 0);
                const drift = Math.round((totalYearCost - sumCosts) * 100) / 100;
                if (drift !== 0) {
                    const topRevMonth = monthlyData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), monthlyData[0]);
                    if (topRevMonth && topRevMonth.revenue > 0) {
                        topRevMonth.cost = Math.round((topRevMonth.cost + drift) * 100) / 100;
                    }
                }
            }

            // Compute monthly gross profit and margin safely
            monthlyData.forEach((d) => {
                d.grossProfit = Math.round((d.revenue - d.cost) * 100) / 100;
                d.grossMargin = d.revenue > 0 ? Math.round(((d.grossProfit / d.revenue) * 100) * 100) / 100 : 0;
            });

            return monthlyData;
        }

        // For this_month or last_month daily breakdown / single period
        return [
            {
                month: PERIOD_LABELS[revCostChartPeriod] || 'Period',
                shortMonth: PERIOD_LABELS[revCostChartPeriod] || 'Period',
                fullMonth: PERIOD_LABELS[revCostChartPeriod] || 'Period',
                revenue: financialMetrics.revenue,
                cost: financialMetrics.cost,
                grossProfit: financialMetrics.grossProfit,
                grossMargin: financialMetrics.grossMargin,
            },
        ];
    }, [revCostChartPeriod, sortedOverviewData, revenueVsCost, financialMetrics]);

    return (
        <div className="dashboard-container">
            {/* ── Top Header Area ── */}
            <header className="dashboard-header">
                <div className="dashboard-title-wrap">
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">
                        Overview of your store performance and key metrics
                    </p>
                </div>

                <div className="dashboard-controls">
                    {/* Store Selector Dropdown */}
                    <div className="control-group" ref={storeDropdownRef}>
                        <span className="control-label">Store</span>
                        <button
                            type="button"
                            className={`dropdown-trigger ${isStoreOpen ? 'open' : ''}`}
                            onClick={() => setIsStoreOpen((prev) => !prev)}
                            title="Select store filter"
                        >
                            <span className="dropdown-trigger-content">
                                <BsShop className="dropdown-icon" />
                                <span>{selectedStoreLabel}</span>
                            </span>
                            <BsChevronDown className={`dropdown-chevron ${isStoreOpen ? 'open' : ''}`} />
                        </button>

                        {isStoreOpen && (
                            <div className="dropdown-menu">
                                <button
                                    type="button"
                                    className={`dropdown-item ${!selectedStore ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedStore('');
                                        setIsStoreOpen(false);
                                    }}
                                >
                                    <BsShop />
                                    <span>All Stores</span>
                                </button>
                                {stores.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`dropdown-item ${String(selectedStore) === String(s.id) ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedStore(String(s.id));
                                            setIsStoreOpen(false);
                                        }}
                                    >
                                        <BsShop />
                                        <span>{s.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Period Selector Dropdown */}
                    <div className="control-group" ref={periodDropdownRef}>
                        <span className="control-label">Period</span>
                        <button
                            type="button"
                            className={`dropdown-trigger ${isPeriodOpen ? 'open' : ''}`}
                            onClick={() => setIsPeriodOpen((prev) => !prev)}
                            title="Select reporting period"
                        >
                            <span className="dropdown-trigger-content">
                                <BsCalendar3 className="dropdown-icon" />
                                <span>{PERIOD_LABELS[period]}</span>
                            </span>
                            <BsChevronDown className={`dropdown-chevron ${isPeriodOpen ? 'open' : ''}`} />
                        </button>

                        {isPeriodOpen && (
                            <div className="dropdown-menu">
                                <button
                                    type="button"
                                    className={`dropdown-item ${period === 'this_year' ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange('this_year')}
                                >
                                    <span>This Year</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dropdown-item ${period === 'this_month' ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange('this_month')}
                                >
                                    <span>This Month</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dropdown-item ${period === 'last_month' ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange('last_month')}
                                >
                                    <span>Last Month</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Live Data Badge with Refresh Trigger & Real Sync Timestamp */}
                    <div className="live-data-badge-wrap">
                        <div className="live-data-badge">
                            <span className="live-dot" />
                            <span>Live data</span>
                            <button
                                type="button"
                                className={`live-refresh-btn ${refreshing ? 'spinning' : ''}`}
                                onClick={() => {
                                    if (refreshing || loading) return;
                                    fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod, true);
                                }}
                                disabled={refreshing || loading}
                                title={refreshing ? 'Refreshing dashboard metrics...' : 'Refresh dashboard metrics'}
                                aria-label="Refresh dashboard metrics"
                            >
                                <BsArrowRepeat size={14} />
                            </button>
                        </div>
                        {lastSyncTime && (
                            <span
                                className="last-sync-timestamp"
                                title={`Last synchronized: ${formatDate(lastSyncTime.toISOString())}`}
                            >
                                Synced at {formatSyncTime(lastSyncTime)}
                            </span>
                        )}
                    </div>
                </div>
            </header>

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
                        onClick={() => fetchAllDashboardData(selectedStore, period, overviewChartPeriod, revCostChartPeriod)}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── Financial Performance Summary Cards (4 Cards) ── */}
            <section className="kpi-grid" aria-label="Financial Performance Indicators">
                {/* 1. Total Sales / Revenue */}
                <Link to="/reports" className="kpi-card" title="View Sales Reports">
                    <div className="kpi-icon-wrap revenue">
                        <BsCashStack />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Sales / Revenue</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 110, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">
                                {formatCurrency(financialMetrics.revenue)}
                            </h2>
                        )}
                        <span className="kpi-subtitle trend-up">
                            <BsArrowUp style={{ display: 'inline', marginRight: 3 }} />
                            {PERIOD_LABELS[period]}
                        </span>
                    </div>
                </Link>

                {/* 2. Total Cost (COGS) */}
                <button
                    type="button"
                    className="kpi-card"
                    title="Click to view Cost of Goods Sold (COGS) breakdown and accounting formula"
                    onClick={() => setActiveMetricModal('cost')}
                    aria-haspopup="dialog"
                    aria-label={`Total Cost (COGS): ${formatCurrency(financialMetrics.cost)}. Click to view calculation and breakdown.`}
                >
                    <div className="kpi-icon-wrap cost">
                        <BsTagFill />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Cost (COGS)</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 90, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">
                                {formatCurrency(financialMetrics.cost)}
                            </h2>
                        )}
                        <span className="kpi-subtitle">
                            Cost of Goods Sold &bull; Click for details
                        </span>
                    </div>
                </button>

                {/* 3. Gross Profit */}
                <button
                    type="button"
                    className="kpi-card"
                    title="Click to view Gross Profit breakdown and accounting formula"
                    onClick={() => setActiveMetricModal('profit')}
                    aria-haspopup="dialog"
                    aria-label={`Gross Profit: ${formatCurrency(financialMetrics.grossProfit)}. Click to view formula and breakdown.`}
                >
                    <div className="kpi-icon-wrap profit">
                        <BsGraphUpArrow />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Gross Profit</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 90, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className={`kpi-value ${financialMetrics.grossProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                {formatCurrency(financialMetrics.grossProfit)}
                            </h2>
                        )}
                        <span className="kpi-subtitle">
                            Net Sales &minus; COGS &bull; Click for details
                        </span>
                    </div>
                </button>

                {/* 4. Gross Profit Margin (%) */}
                <button
                    type="button"
                    className="kpi-card"
                    title="Click to view Gross Profit Margin and Markup breakdown"
                    onClick={() => setActiveMetricModal('margin')}
                    aria-haspopup="dialog"
                    aria-label={`Gross Profit Margin: ${financialMetrics.grossMargin.toFixed(2)}%. Click to view formula and breakdown.`}
                >
                    <div className="kpi-icon-wrap margin">
                        <BsPercent />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Gross Profit Margin</span>
                        {loading ? (
                            <div className="skeleton-box" style={{ width: 80, height: 26, margin: '4px 0' }} />
                        ) : (
                            <h2 className="kpi-value">
                                {`${financialMetrics.grossMargin.toFixed(2)}%`}
                            </h2>
                        )}
                        <span className="kpi-subtitle">
                            Markup: {`${financialMetrics.markup.toFixed(2)}%`} &bull; Click for details
                        </span>
                    </div>
                </button>
            </section>

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
                                <h3 className="card-title">Monthly Sales</h3>
                                <p className="card-subtitle">
                                    {overviewChartPeriod === 'this_year'
                                        ? `Sales revenue for this year (January – December) • Total: ${formatCurrency(annualSalesTotal)}`
                                        : `Sales revenue for ${PERIOD_LABELS[overviewChartPeriod].toLowerCase()}`}
                                </p>
                            </div>
                        </div>

                        <select
                            className="card-period-select"
                            value={overviewChartPeriod}
                            onChange={(e) => setOverviewChartPeriod(e.target.value)}
                            aria-label="Overview chart period"
                        >
                            <option value="this_year">This Year</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                        </select>
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
                                        interval={0}
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
                                        maxBarSize={32}
                                        minPointSize={4}
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
                                                fontSize: 10,
                                                fill: '#1e40af',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {/* Accessible screen-reader data table for all 12 calendar months */}
                        {overviewChartPeriod === 'this_year' && (
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
                            <span>Annual Total: <strong>{formatCurrency(annualSalesTotal)}</strong></span>
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
                                <h3 className="card-title">Monthly Revenue vs Cost</h3>
                                <p className="card-subtitle">
                                    {revCostChartPeriod === 'this_year'
                                        ? `Monthly comparison for this calendar year (Jan – Dec) • Revenue: ${formatCurrency(financialMetrics.revenue)} | Cost: ${formatCurrency(financialMetrics.cost)}`
                                        : `Revenue and cost comparison for ${PERIOD_LABELS[revCostChartPeriod].toLowerCase()}`}
                                </p>
                            </div>
                        </div>

                        <select
                            className="card-period-select"
                            value={revCostChartPeriod}
                            onChange={(e) => setRevCostChartPeriod(e.target.value)}
                            aria-label="Revenue vs cost period"
                        >
                            <option value="this_year">This Year</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                        </select>
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
                                    margin={{ top: 36, right: 32, left: 20, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        interval={0}
                                    />
                                    {/* Left Y-Axis for Revenue */}
                                    <YAxis
                                        yAxisId="revAxis"
                                        orientation="left"
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                        tick={{ fill: '#2563eb', fontSize: 11 }}
                                        tickFormatter={formatCompactCurrency}
                                        domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 100)]}
                                    />
                                    {/* Right Y-Axis for Cost (COGS) so ₹1,100 is clearly scaled and visible against ₹83,718 */}
                                    <YAxis
                                        yAxisId="costAxis"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                        tick={{ fill: '#ef4444', fontSize: 11 }}
                                        tickFormatter={formatCompactCurrency}
                                        domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 50)]}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullMonth || payload?.[0]?.payload?.monthName || label}
                                        formatter={(val, name) => [formatCurrency(val), name]}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar
                                        yAxisId="revAxis"
                                        dataKey="revenue"
                                        name="Revenue"
                                        fill="#2563eb"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={18}
                                        minPointSize={5}
                                    >
                                        <LabelList
                                            dataKey="revenue"
                                            position="top"
                                            formatter={(val) => {
                                                const num = Number(val);
                                                return num > 0 ? formatCompactCurrency(num) : '';
                                            }}
                                            style={{
                                                fontSize: 9,
                                                fill: '#1d4ed8',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </Bar>
                                    <Bar
                                        yAxisId="costAxis"
                                        dataKey="cost"
                                        name="Cost (COGS)"
                                        fill="#ef4444"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={18}
                                        minPointSize={5}
                                    >
                                        <LabelList
                                            dataKey="cost"
                                            position="top"
                                            formatter={(val) => {
                                                const num = Number(val);
                                                return num > 0 ? formatCompactCurrency(num) : '';
                                            }}
                                            style={{
                                                fontSize: 9,
                                                fill: '#b91c1c',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {/* Accessible screen-reader data table for all 12 calendar months */}
                        {revCostChartPeriod === 'this_year' && (
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
                                <span>Revenue (Left Axis): {formatCurrency(financialMetrics.revenue)}</span>
                            </span>
                            <span className="legend-item">
                                <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
                                <span>Cost (Right Axis): {formatCurrency(financialMetrics.cost)}</span>
                            </span>
                        </div>

                        <div className="rev-cost-metrics-row">
                            <div className="rev-cost-metric">
                                <span className="rev-cost-metric-label">Gross Profit:</span>
                                <span
                                    className={`rev-cost-metric-value ${
                                        financialMetrics.grossProfit >= 0 ? 'profit-positive' : 'profit-negative'
                                    }`}
                                >
                                    {formatCurrency(financialMetrics.grossProfit)}
                                </span>
                            </div>
                            <div className="rev-cost-metric">
                                <span className="rev-cost-metric-label">Gross Margin:</span>
                                <span
                                    className={`rev-cost-metric-value ${
                                        financialMetrics.grossMargin >= 0 ? 'profit-positive' : 'profit-negative'
                                    }`}
                                >
                                    {`${financialMetrics.grossMargin.toFixed(2)}%`}
                                </span>
                            </div>
                            <div className="rev-cost-metric">
                                <span className="rev-cost-metric-label">Markup:</span>
                                <span
                                    className={`rev-cost-metric-value ${
                                        financialMetrics.markup >= 0 ? 'profit-positive' : 'profit-negative'
                                    }`}
                                >
                                    {`${financialMetrics.markup.toFixed(2)}%`}
                                </span>
                            </div>
                        </div>

                        <p className="cost-transparency-note">
                            Cost represents Cost of Goods Sold (COGS: quantity sold × unit cost price). Gross Profit = Net Sales Revenue − COGS (₹{financialMetrics.revenue.toFixed(2)} − ₹{financialMetrics.cost.toFixed(2)} = ₹{financialMetrics.grossProfit.toFixed(2)}). Gross Margin = (Gross Profit ÷ Net Sales Revenue) × 100 ({financialMetrics.grossMargin.toFixed(2)}%). Markup = (Gross Profit ÷ COGS) × 100 ({financialMetrics.markup.toFixed(2)}%).
                        </p>
                    </div>
                </div>
            </section>

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

                        <Link to="/orders" className="card-view-all">
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
                                        <th>Invoice No.</th>
                                        <th>Date &amp; Time</th>
                                        <th>Customer</th>
                                        <th>Items (Qty)</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((ord) => {
                                        const invoiceNo = ord.order_number || ord.invoice_number || `ORD-${ord.id}`;
                                        const customerName = ord.customer_name || ord.customer?.name || 'Walk-in Customer';
                                        const distinctCount = Array.isArray(ord.items) && ord.items.length > 0
                                            ? ord.items.length
                                            : 1;
                                        const totalUnits = Array.isArray(ord.items) && ord.items.length > 0
                                            ? ord.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
                                            : (ord.quantity || 1);
                                        const statusStr = (ord.status || ord.payment_status || 'completed').toLowerCase();

                                        return (
                                            <tr key={ord.id}>
                                                <td>
                                                    <Link to={`/orders/${ord.id}`} className="table-id-link">
                                                        {invoiceNo}
                                                    </Link>
                                                </td>
                                                <td>{formatDate(ord.created_at)}</td>
                                                <td>{customerName}</td>
                                                <td>
                                                    {totalUnits > distinctCount
                                                        ? `${totalUnits} units (${distinctCount} item${distinctCount > 1 ? 's' : ''})`
                                                        : `${totalUnits} unit${totalUnits > 1 ? 's' : ''}`}
                                                </td>
                                                <td className="table-amount">{formatCurrency(ord.total_amount)}</td>
                                                <td>
                                                    <span className={`status-pill ${statusStr}`}>
                                                        {ord.status || 'Completed'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* 2. Top Selling Products Table */}
                <div className="dashboard-card">
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
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 32 }}>#</th>
                                        <th>Product</th>
                                        <th style={{ textAlign: 'center' }}>Quantity Sold</th>
                                        <th style={{ textAlign: 'right' }}>Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                                            <td>
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
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                                {formatInteger(p.quantity_sold)}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
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

            {/* ── Notification Dropdown Panel (Dashboard Module Scope) ── */}
            {isNotificationOpen &&
                createPortal(
                    <div
                        id="dashboard-notification-panel"
                        ref={notificationDropdownRef}
                        className="dashboard-notification-panel"
                        style={{
                            top: bellPosition ? `${bellPosition.top}px` : '64px',
                            right: bellPosition ? `${bellPosition.right}px` : '20px',
                        }}
                        role="dialog"
                        aria-label="Notifications"
                        aria-modal="false"
                    >
                        {/* Header Banner */}
                        <div className="dashboard-notification-header">
                            <div className="dashboard-notification-title-wrap">
                                <BsBell className="dashboard-notification-header-icon" />
                                <h3 className="dashboard-notification-title">Notifications</h3>
                                <span className="dashboard-notification-badge">
                                    {notificationItems.length > 0 ? `${notificationItems.length} New` : '0 New'}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="dashboard-notification-close-btn"
                                onClick={() => {
                                    setIsNotificationOpen(false);
                                    if (bellButtonRef.current) bellButtonRef.current.focus();
                                }}
                                title="Close notifications"
                                aria-label="Close notifications"
                            >
                                <BsX size={18} />
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="dashboard-notification-list">
                            {notificationItems.length === 0 ? (
                                <div className="dashboard-notification-empty">
                                    <div className="dashboard-notification-empty-icon-wrap">
                                        <BsCheckCircleFill size={22} color="#10b981" />
                                    </div>
                                    <p className="dashboard-notification-empty-title">All caught up!</p>
                                    <p className="dashboard-notification-empty-desc">
                                        No active inventory alerts or urgent notifications.
                                    </p>
                                </div>
                            ) : (
                                notificationItems.map((item) => (
                                    <div key={item.id} className={`dashboard-notification-card ${item.type}`}>
                                        <div className="dashboard-notification-card-icon">
                                            {item.type === 'error' ? (
                                                <BsExclamationCircleFill size={16} />
                                            ) : (
                                                <BsBoxSeam size={16} />
                                            )}
                                        </div>
                                        <div className="dashboard-notification-card-body">
                                            <div className="dashboard-notification-card-header">
                                                <span className="dashboard-notification-card-title">{item.title}</span>
                                                <span className="dashboard-notification-card-time">{item.time}</span>
                                            </div>
                                            <p className="dashboard-notification-card-msg">{item.message}</p>
                                            {item.link && (
                                                <Link
                                                    to={item.link}
                                                    className="dashboard-notification-card-link"
                                                    onClick={() => setIsNotificationOpen(false)}
                                                >
                                                    <span>{item.linkText}</span>
                                                    <BsArrowRight size={12} />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notificationItems.length > 0 && (
                            <div className="dashboard-notification-footer">
                                <Link
                                    to="/inventory"
                                    className="dashboard-notification-footer-link"
                                    onClick={() => setIsNotificationOpen(false)}
                                >
                                    View inventory items &amp; alerts
                                </Link>
                            </div>
                        )}
                    </div>,
                    document.body
                )}

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
                                            {PERIOD_LABELS[period]} &bull; {selectedStoreLabel}
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
        </div>
    );
};

export default Dashboard;
