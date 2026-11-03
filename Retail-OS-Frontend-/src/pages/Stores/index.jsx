import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import storeService from '../../services/storeService';
import storeTargetService from '../../services/storeTargetService';
import {
    BsBullseye,
    BsPlus,
    BsCalendarEvent,
    BsShop,
    BsCashStack,
    BsClockHistory,
    BsCheckCircleFill,
    BsX,
    BsFilter,
    BsArrowRepeat,
    BsGraphUpArrow,
    BsExclamationTriangle,
    BsHourglassSplit,
    BsPencilSquare,
    BsTrash,
    BsEye,
    BsPeopleFill,
    BsBoxes,
    BsTrophy,
    BsBuilding,
    BsGeoAlt,
    BsTelephone,
    BsEnvelope,
    BsStarFill,
    BsCheck2,
    BsToggleOn,
    BsToggleOff,
    BsSearch,
    BsShieldCheck
} from 'react-icons/bs';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const TARGET_TYPES = [
    { value: 'Sales Target', label: 'Sales Target (₹)' },
    { value: 'Revenue', label: 'Revenue Target (₹)' },
    { value: 'Profit', label: 'Gross Profit (₹)' },
    { value: 'Orders', label: 'Order Count' },
    { value: 'Units Sold', label: 'Units Sold' },
    { value: 'New Customers', label: 'New Customers' },
    { value: 'Customer Acquisition', label: 'Customer Acquisition' },
    { value: 'Customer Retention', label: 'Customer Retention' },
];

const PERIOD_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: '15_days', label: '15 Days' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
];

const Stores = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine initial active tab based on route
    const isTargetsRoute = location.pathname.includes('/targets');
    const [activeTab, setActiveTab] = useState(isTargetsRoute ? 'targets' : 'stores');

    useEffect(() => {
        if (location.pathname.includes('/targets')) {
            setActiveTab('targets');
        } else {
            setActiveTab('stores');
        }
    }, [location.pathname]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'targets') {
            navigate('/stores/targets');
        } else {
            navigate('/stores');
        }
    };

    // Shared Notifications
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4500);
    };

    const showError = (msg) => {
        const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
        setErrorMsg(text);
        setTimeout(() => setErrorMsg(''), 6000);
    };

    // ============================================================
    // 1. STORES MODULE STATE & APIS
    // ============================================================
    const [stores, setStores] = useState([]);
    const [storesLoading, setStoresLoading] = useState(false);
    const [storeSearch, setStoreSearch] = useState('');
    const [storeTypeFilter, setStoreTypeFilter] = useState('all'); // 'all' | 'retail' | 'warehouse'
    const [includeInactive, setIncludeInactive] = useState(true);

    // Fetch Stores: GET /api/v1/stores/
    const fetchStores = useCallback(async () => {
        setStoresLoading(true);
        try {
            const params = {
                include_inactive: includeInactive,
            };
            if (storeSearch.trim()) {
                params.search = storeSearch.trim();
            }
            if (storeTypeFilter === 'warehouse') {
                params.is_warehouse = true;
            } else if (storeTypeFilter === 'retail') {
                params.is_warehouse = false;
            }

            const data = await storeService.listStores(params);
            const list = Array.isArray(data) ? data : (data?.items || []);
            setStores(list);
        } catch (err) {
            console.error('Fetch Stores Error:', err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
            showError(`Failed to load stores: ${detail}`);
        } finally {
            setStoresLoading(false);
        }
    }, [includeInactive, storeSearch, storeTypeFilter]);

    useEffect(() => {
        if (activeTab === 'stores') {
            fetchStores();
        }
    }, [activeTab, fetchStores]);

    // Store Form Modals (Create / Edit)
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [storeFormSubmitting, setStoreFormSubmitting] = useState(false);
    const [storeFormErrors, setStoreFormErrors] = useState({});
    const [storeFormData, setStoreFormData] = useState({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: 'Maharashtra',
        pincode: '',
        gstin: '',
        is_warehouse: false,
        is_main: false,
    });

    const openCreateStore = () => {
        setEditingStore(null);
        setStoreFormData({
            name: '',
            code: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            state: 'Maharashtra',
            pincode: '',
            gstin: '',
            is_warehouse: false,
            is_main: stores.length === 0,
        });
        setStoreFormErrors({});
        setShowStoreModal(true);
    };

    const openEditStore = async (store) => {
        setStoreFormSubmitting(true);
        try {
            // Fetch fresh details: GET /api/v1/stores/{store_id}
            const fresh = await storeService.getStore(store.id, true);
            setEditingStore(fresh);
            setStoreFormData({
                name: fresh.name || '',
                code: fresh.code || '',
                phone: fresh.phone || '',
                email: fresh.email || '',
                address: fresh.address || '',
                city: fresh.city || '',
                state: fresh.state || 'Maharashtra',
                pincode: fresh.pincode || '',
                gstin: fresh.gstin || '',
                is_warehouse: Boolean(fresh.is_warehouse),
                is_main: Boolean(fresh.is_main),
            });
            setStoreFormErrors({});
            setShowStoreModal(true);
        } catch (err) {
            console.error('Get Store Error:', err);
            const detail = err.response?.data?.detail || err.message;
            showError(`Failed to fetch store details: ${detail}`);
        } finally {
            setStoreFormSubmitting(false);
        }
    };

    const validateStoreForm = () => {
        const errors = {};
        const trimmedName = storeFormData.name.trim();
        if (!trimmedName || trimmedName.length < 2) {
            errors.name = 'Store name must be at least 2 characters';
        } else if (trimmedName.length > 100) {
            errors.name = 'Store name must not exceed 100 characters';
        }

        if (storeFormData.phone && storeFormData.phone.trim()) {
            const cleanPhone = storeFormData.phone.trim();
            if (!/^\d{10}$/.test(cleanPhone)) {
                errors.phone = 'Phone number must be exactly 10 digits';
            } else if (!/^[6-9]/.test(cleanPhone)) {
                errors.phone = 'Phone number must start with 6, 7, 8, or 9';
            }
        }

        if (storeFormData.pincode && storeFormData.pincode.trim()) {
            const cleanPin = storeFormData.pincode.trim();
            if (!/^\d{6}$/.test(cleanPin)) {
                errors.pincode = 'Pincode must be exactly 6 numeric digits';
            } else if (cleanPin.startsWith('0')) {
                errors.pincode = 'Indian pincode cannot start with 0';
            }
        }

        if (storeFormData.email && storeFormData.email.trim()) {
            const cleanEmail = storeFormData.email.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                errors.email = 'Please enter a valid email address';
            }
        }

        if (storeFormData.gstin && storeFormData.gstin.trim()) {
            const cleanGstin = storeFormData.gstin.trim().toUpperCase();
            if (cleanGstin.length !== 15) {
                errors.gstin = 'GSTIN must be exactly 15 alphanumeric characters';
            }
        }

        setStoreFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveStore = async (e) => {
        e.preventDefault();
        if (!validateStoreForm()) return;

        setStoreFormSubmitting(true);
        setErrorMsg('');
        try {
            if (editingStore) {
                // PATCH /api/v1/stores/{store_id}
                const updatePayload = {
                    name: storeFormData.name.trim(),
                    address: storeFormData.address.trim() || null,
                    city: storeFormData.city.trim() || null,
                    state: storeFormData.state || null,
                    pincode: storeFormData.pincode.trim() || null,
                    phone: storeFormData.phone.trim() || null,
                    email: storeFormData.email.trim() || null,
                    gstin: storeFormData.gstin.trim().toUpperCase() || null,
                    is_warehouse: storeFormData.is_warehouse,
                };
                const updated = await storeService.updateStore(editingStore.id, updatePayload);
                showSuccess(`Store "${updated.name}" updated successfully!`);
            } else {
                // POST /api/v1/stores/
                const createPayload = {
                    name: storeFormData.name.trim(),
                    code: storeFormData.code.trim() || null,
                    address: storeFormData.address.trim() || null,
                    city: storeFormData.city.trim() || null,
                    state: storeFormData.state || null,
                    pincode: storeFormData.pincode.trim() || null,
                    phone: storeFormData.phone.trim() || null,
                    email: storeFormData.email.trim() || null,
                    gstin: storeFormData.gstin.trim().toUpperCase() || null,
                    is_warehouse: storeFormData.is_warehouse,
                    is_main: storeFormData.is_main,
                };
                const created = await storeService.createStore(createPayload);
                showSuccess(`Store "${created.name}" created successfully (ID: ${created.id})!`);
            }
            setShowStoreModal(false);
            fetchStores();
        } catch (err) {
            console.error('Save Store Error:', err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
            showError(`Failed to save store: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
        } finally {
            setStoreFormSubmitting(false);
        }
    };

    // Store Actions: Set Main Store (POST /api/v1/stores/{store_id}/set-main)
    const handleSetMainStore = async (store) => {
        if (store.is_main) return;
        try {
            await storeService.setMainStore(store.id);
            showSuccess(`Store "${store.name}" is now designated as the Primary Main Store!`);
            fetchStores();
        } catch (err) {
            console.error('Set Main Store Error:', err);
            const detail = err.response?.data?.detail || err.message;
            showError(`Failed to designate main store: ${detail}`);
        }
    };

    // Store Actions: Activate / Deactivate
    const handleToggleStoreActive = async (store) => {
        try {
            if (store.is_active) {
                // PATCH /api/v1/stores/{store_id}/deactivate
                await storeService.deactivateStore(store.id);
                showSuccess(`Store "${store.name}" has been deactivated.`);
            } else {
                // PATCH /api/v1/stores/{store_id}/activate
                await storeService.activateStore(store.id);
                showSuccess(`Store "${store.name}" activated successfully!`);
            }
            fetchStores();
        } catch (err) {
            console.error('Toggle Store Active Error:', err);
            const detail = err.response?.data?.detail || err.message;
            showError(`Action failed: ${detail}`);
        }
    };

    // Store Details Drawer / Modal (includes Summary, Staff, Inventory Summary)
    const [detailStore, setDetailStore] = useState(null);
    const [storeSummary, setStoreSummary] = useState(null);
    const [storeStaff, setStoreStaff] = useState([]);
    const [storeInventorySummary, setStoreInventorySummary] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const openStoreDetails = async (store) => {
        setDetailStore(store);
        setDetailsLoading(true);
        setStoreSummary(null);
        setStoreStaff([]);
        setStoreInventorySummary(null);

        try {
            // Parallel fetch of detailed endpoints
            const [detailsRes, summaryRes, staffRes, invRes] = await Promise.allSettled([
                storeService.getStore(store.id, true),
                storeService.getStoreSummary(store.id),
                storeService.getStoreStaff(store.id),
                storeService.getStoreInventorySummary(store.id)
            ]);

            if (detailsRes.status === 'fulfilled') {
                setDetailStore(detailsRes.value);
            }
            if (summaryRes.status === 'fulfilled') {
                setStoreSummary(summaryRes.value);
            }
            if (staffRes.status === 'fulfilled') {
                const staffList = staffRes.value?.staff || (Array.isArray(staffRes.value) ? staffRes.value : []);
                setStoreStaff(staffList);
            }
            if (invRes.status === 'fulfilled') {
                setStoreInventorySummary(invRes.value);
            }
        } catch (err) {
            console.error('Failed to load full store details:', err);
        } finally {
            setDetailsLoading(false);
        }
    };

    // Delete Store Confirmation
    const [storeToDelete, setStoreToDelete] = useState(null);
    const [deletingStore, setDeletingStore] = useState(false);

    const handleConfirmDeleteStore = async () => {
        if (!storeToDelete) return;
        setDeletingStore(true);
        try {
            // DELETE /api/v1/stores/{store_id}
            await storeService.deleteStore(storeToDelete.id);
            showSuccess(`Store "${storeToDelete.name}" deleted successfully.`);
            setStoreToDelete(null);
            fetchStores();
        } catch (err) {
            console.error('Delete Store Error:', err);
            const detail = err.response?.data?.detail || err.message;
            showError(`Failed to delete store: ${detail}`);
        } finally {
            setDeletingStore(false);
        }
    };

    // ============================================================
    // 2. STORE TARGETS MODULE STATE & APIS
    // ============================================================
    const [targets, setTargets] = useState([]);
    const [targetsLoading, setTargetsLoading] = useState(false);
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [targetsView, setTargetsView] = useState('list'); // 'list' | 'leaderboard'

    // Targets Summary from GET /api/v1/store-targets/summary
    const [targetsSummary, setTargetsSummary] = useState({
        total_targets: 0,
        total_target_value: 0,
        total_current_value: 0,
        overall_achievement_percentage: 0,
        total_stores_with_targets: 0,
        achieved_targets_count: 0,
        on_track_targets_count: 0,
        lagging_targets_count: 0,
    });

    // Leaderboard from GET /api/v1/store-targets/leaderboard
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    // Fetch Targets & Summary: GET /api/v1/store-targets & /summary
    const fetchTargets = useCallback(async () => {
        setTargetsLoading(true);
        try {
            const params = {};
            if (filterPeriod !== 'all') {
                params.period = filterPeriod;
            }

            // 1. Fetch Targets list
            const listData = await storeTargetService.getTargets(params);
            const items = Array.isArray(listData) ? listData : (listData?.items || []);
            setTargets(items);

            // 2. Fetch Summary Overview
            try {
                const summaryData = await storeTargetService.getTargetsSummary(params);
                if (summaryData) {
                    setTargetsSummary(summaryData);
                }
            } catch (sumErr) {
                console.warn('Targets summary endpoint notice:', sumErr);
            }
        } catch (err) {
            console.error('Fetch Targets Error:', err);
            const detail = err.response?.data?.detail || err.message;
            showError(`Failed to load store targets: ${detail}`);
        } finally {
            setTargetsLoading(false);
        }
    }, [filterPeriod]);

    // Fetch Leaderboard: GET /api/v1/store-targets/leaderboard
    const fetchLeaderboard = useCallback(async () => {
        setLeaderboardLoading(true);
        try {
            const params = {};
            if (filterPeriod !== 'all') {
                params.period = filterPeriod;
            }
            const res = await storeTargetService.getLeaderboard(params);
            const list = res?.leaderboard || (Array.isArray(res) ? res : []);
            setLeaderboard(list);
        } catch (err) {
            console.error('Leaderboard Fetch Error:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    }, [filterPeriod]);

    useEffect(() => {
        if (activeTab === 'targets') {
            fetchTargets();
            if (targetsView === 'leaderboard') {
                fetchLeaderboard();
            }
        }
    }, [activeTab, fetchTargets, targetsView, fetchLeaderboard]);

    // Create & Edit Target Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTarget, setEditingTarget] = useState(null);
    const [targetLoading, setTargetLoading] = useState(false);
    const [targetFormData, setTargetFormData] = useState({
        store_id: 2,
        target_type: 'Sales Target',
        target_value: 100000,
        period: 'monthly',
        start_date: '2026-10-01T00:00:00',
        end_date: '2026-10-31T23:59:59',
        status: 'active',
    });

    // Helper to format date inputs for datetime-local
    const toInputDatetime = (isoStr) => {
        if (!isoStr) return '';
        try {
            return isoStr.slice(0, 19);
        } catch {
            return isoStr;
        }
    };

    const formatToISO = (val, isEnd = false) => {
        if (!val) {
            const now = new Date();
            return isEnd
                ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19)
                : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString().slice(0, 19);
        }
        if (val.length === 10) {
            return isEnd ? `${val}T23:59:59` : `${val}T00:00:00`;
        }
        return val.length === 16 ? `${val}:00` : val;
    };

    const openCreateTarget = () => {
        setEditingTarget(null);
        const defaultStoreId = stores.length > 0 ? stores[0].id : 2;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString().slice(0, 19);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19);

        setTargetFormData({
            store_id: defaultStoreId,
            target_type: 'Sales Target',
            target_value: 100000,
            period: 'monthly',
            start_date: start,
            end_date: end,
            status: 'active',
        });
        setErrorMsg('');
        setShowCreateModal(true);
    };

    const openEditTarget = async (target) => {
        setTargetLoading(true);
        try {
            // GET /api/v1/store-targets/{target_id}
            const fresh = await storeTargetService.getTarget(target.id);
            setEditingTarget(fresh);
            setTargetFormData({
                store_id: fresh.store_id,
                target_type: fresh.target_type || 'Sales Target',
                target_value: Number(fresh.target_value || 0),
                period: fresh.period || 'monthly',
                start_date: fresh.start_date || '',
                end_date: fresh.end_date || '',
                status: fresh.status || 'active',
            });
            setErrorMsg('');
            setShowCreateModal(true);
        } catch (err) {
            console.error('Get Target Error:', err);
            showError(`Failed to load target details: ${err.message}`);
        } finally {
            setTargetLoading(false);
        }
    };

    const handleSaveTarget = async (e) => {
        e.preventDefault();
        setTargetLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        const startISO = formatToISO(targetFormData.start_date, false);
        const endISO = formatToISO(targetFormData.end_date, true);

        if (new Date(endISO) <= new Date(startISO)) {
            setErrorMsg('End date must be strictly after start date');
            setTargetLoading(false);
            return;
        }

        try {
            if (editingTarget) {
                // PUT /api/v1/store-targets/{target_id} or PATCH
                const updatePayload = {
                    target_type: targetFormData.target_type,
                    target_value: Number(targetFormData.target_value),
                    period: targetFormData.period,
                    start_date: startISO,
                    end_date: endISO,
                    status: targetFormData.status,
                };
                const updated = await storeTargetService.updateTarget(editingTarget.id, updatePayload);
                showSuccess(`Target #${updated.id} updated successfully!`);
            } else {
                // POST /api/v1/store-targets
                const createPayload = {
                    store_id: parseInt(targetFormData.store_id, 10),
                    target_type: targetFormData.target_type,
                    target_value: Number(targetFormData.target_value),
                    period: targetFormData.period,
                    start_date: startISO,
                    end_date: endISO,
                    status: targetFormData.status || 'active',
                };
                const created = await storeTargetService.createTarget(createPayload);
                showSuccess(`Target for Store #${created.store_id} created successfully! (ID: ${created.id})`);
            }
            setShowCreateModal(false);
            fetchTargets();
        } catch (err) {
            console.error('Save Target Error:', err);
            const errDetail = err.response?.data?.detail || err.response?.data?.message || err.message;
            setErrorMsg(`Failed to save target: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
        } finally {
            setTargetLoading(false);
        }
    };

    // Delete Target Confirmation: DELETE /api/v1/store-targets/{target_id}
    const [targetToDelete, setTargetToDelete] = useState(null);
    const [deletingTarget, setDeletingTarget] = useState(false);

    const handleConfirmDeleteTarget = async () => {
        if (!targetToDelete) return;
        setDeletingTarget(true);
        try {
            await storeTargetService.deleteTarget(targetToDelete.id);
            showSuccess(`Store Target #${targetToDelete.id} deleted successfully.`);
            setTargetToDelete(null);
            fetchTargets();
        } catch (err) {
            console.error('Delete Target Error:', err);
            const detail = err.response?.data?.detail || err.message;
            showError(`Failed to delete target: ${detail}`);
        } finally {
            setDeletingTarget(false);
        }
    };

    // Target Progress Modal: GET /api/v1/store-targets/{target_id}/progress
    const [progressTarget, setProgressTarget] = useState(null);
    const [targetProgressData, setTargetProgressData] = useState(null);
    const [progressLoading, setProgressLoading] = useState(false);

    const openTargetProgress = async (target) => {
        setProgressTarget(target);
        setProgressLoading(true);
        setTargetProgressData(null);
        try {
            const data = await storeTargetService.getTargetProgress(target.id);
            setTargetProgressData(data);
        } catch (err) {
            console.error('Target Progress Error:', err);
            showError(`Failed to fetch target progress: ${err.message}`);
        } finally {
            setProgressLoading(false);
        }
    };

    // Pre-populate stores list on load for target creation store dropdown
    useEffect(() => {
        if (stores.length === 0) {
            storeService.listStores({ include_inactive: true })
                .then(data => {
                    const list = Array.isArray(data) ? data : (data?.items || []);
                    if (list.length > 0) setStores(list);
                })
                .catch(() => {});
        }
    }, [stores.length]);

    // Computed / Fallback values for summary cards if summary API returns 0
    const filteredTargets = useMemo(() => {
        return targets.filter(t => {
            if (filterPeriod === 'all') return true;
            return t.period?.toLowerCase() === filterPeriod.toLowerCase();
        });
    }, [targets, filterPeriod]);

    const displayTotalRevenueTarget = useMemo(() => {
        if (targetsSummary?.total_target_value && Number(targetsSummary.total_target_value) > 0) {
            return Number(targetsSummary.total_target_value);
        }
        return targets
            .filter(t => (t.target_type || '').toLowerCase().includes('revenue') || (t.target_type || '').toLowerCase().includes('sales'))
            .reduce((sum, t) => sum + parseFloat(t.target_value || 0), 0);
    }, [targetsSummary, targets]);

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit' }}>
            {/* Top Navigation Tabs: Stores vs Store Targets */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 14,
                marginBottom: 20
            }}>
                <button
                    onClick={() => handleTabChange('stores')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 18px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        background: activeTab === 'stores' ? '#4f46e5' : '#f1f5f9',
                        color: activeTab === 'stores' ? '#fff' : '#475569',
                        boxShadow: activeTab === 'stores' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <BsShop size={15} />
                    <span>Stores Directory</span>
                    <span style={{
                        padding: '1px 7px',
                        borderRadius: 99,
                        fontSize: 11,
                        background: activeTab === 'stores' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: activeTab === 'stores' ? '#fff' : '#475569'
                    }}>
                        {stores.length}
                    </span>
                </button>

                <button
                    onClick={() => handleTabChange('targets')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 18px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        background: activeTab === 'targets' ? '#4f46e5' : '#f1f5f9',
                        color: activeTab === 'targets' ? '#fff' : '#475569',
                        boxShadow: activeTab === 'targets' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <BsBullseye size={15} />
                    <span>Store Targets & Milestones</span>
                    <span style={{
                        padding: '1px 7px',
                        borderRadius: 99,
                        fontSize: 11,
                        background: activeTab === 'targets' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: activeTab === 'targets' ? '#fff' : '#475569'
                    }}>
                        {targets.length}
                    </span>
                </button>
            </div>

            {/* Notification Alerts */}
            {successMsg && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 10,
                    background: '#ecfdf5', border: '1px solid #a7f3d0',
                    color: '#065f46', fontSize: 13, fontWeight: 600, marginBottom: 20
                }}>
                    <BsCheckCircleFill color="#10b981" size={16} />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 10,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    color: '#991b1b', fontSize: 13, fontWeight: 600, marginBottom: 20
                }}>
                    <BsExclamationTriangle color="#ef4444" size={16} />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* ======================================================= */}
            {/* VIEW 1: STORES DIRECTORY & BRANCH MANAGEMENT           */}
            {/* ======================================================= */}
            {activeTab === 'stores' && (
                <div>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                        marginBottom: 24,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                            }}>
                                <BsShop size={22} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                    Stores Directory
                                </h1>
                                <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
                                    Manage branch locations, warehouses, staff and store details (<code>/api/v1/stores</code>)
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                                onClick={fetchStores}
                                disabled={storesLoading}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: '#fff', border: '1px solid #e2e8f0',
                                    color: '#475569', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                            >
                                <BsArrowRepeat size={14} className={storesLoading ? 'spin-anim' : ''} />
                                <span>Refresh</span>
                            </button>

                            <button
                                onClick={openCreateStore}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '10px 18px', borderRadius: 10,
                                    background: '#4f46e5', border: 'none',
                                    color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <BsPlus size={18} />
                                <span>Add Store</span>
                            </button>
                        </div>
                    </div>

                    {/* Stores KPI Overview Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 16,
                        marginBottom: 24
                    }}>
                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Stores</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                                    <BsShop size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                                {stores.length}
                            </div>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Registered branches</span>
                        </div>

                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Branches</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                    <BsShieldCheck size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                                {stores.filter(s => s.is_active).length}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Operational outlets</span>
                        </div>

                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Warehouses</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                                    <BsBoxes size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                                {stores.filter(s => s.is_warehouse).length}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Fulfillment & storage depots</span>
                        </div>

                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Primary Main Store</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                                    <BsStarFill size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {stores.find(s => s.is_main)?.name || 'None Set'}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                {stores.find(s => s.is_main) ? `Store ID #${stores.find(s => s.is_main)?.id}` : 'Designate a main store'}
                            </span>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: '14px 18px',
                        border: '1px solid #e2e8f0', marginBottom: 20,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 12
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>


                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Type:</span>
                                {['all', 'retail', 'warehouse'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setStoreTypeFilter(type)}
                                        style={{
                                            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                            textTransform: 'capitalize', border: 'none', cursor: 'pointer',
                                            background: storeTypeFilter === type ? '#4f46e5' : '#f1f5f9',
                                            color: storeTypeFilter === type ? '#fff' : '#475569',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={includeInactive}
                                    onChange={e => setIncludeInactive(e.target.checked)}
                                />
                                <span>Show Inactive Stores</span>
                            </label>
                        </div>

                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            Showing {stores.length} store{stores.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    {/* Stores Table */}
                    <div style={{
                        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store Details</th>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type / Role</th>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</th>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                                                <BsShop size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>No Stores Found</div>
                                                <div style={{ fontSize: 12, marginTop: 4 }}>Click "Add Store" above to register a new store branch or warehouse.</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        stores.map((store) => (
                                            <tr key={store.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                                                    #{store.id}
                                                </td>

                                                <td style={{ padding: '14px 18px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1e293b' }}>
                                                        <span>{store.name}</span>
                                                        {store.is_main && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                                padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                                                background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a'
                                                            }}>
                                                                <BsStarFill size={9} /> MAIN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                        Code: {store.code || '—'} {store.gstin ? `| GSTIN: ${store.gstin}` : ''}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '14px 18px' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                        background: store.is_warehouse ? '#f5f3ff' : '#eef2ff',
                                                        color: store.is_warehouse ? '#7c3aed' : '#4338ca'
                                                    }}>
                                                        {store.is_warehouse ? <BsBoxes size={11} /> : <BsShop size={11} />}
                                                        {store.is_warehouse ? 'Warehouse' : 'Retail Outlet'}
                                                    </span>
                                                </td>

                                                <td style={{ padding: '14px 18px', fontSize: 12, color: '#475569' }}>
                                                    <div>{store.city || '—'}{store.state ? `, ${store.state}` : ''}</div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{store.pincode ? `PIN: ${store.pincode}` : store.address || ''}</div>
                                                </td>

                                                <td style={{ padding: '14px 18px', fontSize: 12, color: '#475569' }}>
                                                    <div>{store.phone || '—'}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{store.email || ''}</div>
                                                </td>

                                                <td style={{ padding: '14px 18px' }}>
                                                    <button
                                                        onClick={() => handleToggleStoreActive(store)}
                                                        title={store.is_active ? 'Click to deactivate' : 'Click to activate'}
                                                        style={{
                                                            border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                                                            display: 'inline-flex', alignItems: 'center', gap: 6
                                                        }}
                                                    >
                                                        <span style={{
                                                            padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                            background: store.is_active ? '#ecfdf5' : '#f1f5f9',
                                                            color: store.is_active ? '#059669' : '#64748b'
                                                        }}>
                                                            {store.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </button>
                                                </td>

                                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: 6 }}>
                                                        <button
                                                            onClick={() => openStoreDetails(store)}
                                                            title="View Store KPI & Performance Snapshot"
                                                            style={{
                                                                padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
                                                                background: '#fff', color: '#4f46e5', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <BsEye size={13} />
                                                        </button>

                                                        <button
                                                            onClick={() => openEditStore(store)}
                                                            title="Edit Store"
                                                            style={{
                                                                padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
                                                                background: '#fff', color: '#0ea5e9', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <BsPencilSquare size={13} />
                                                        </button>

                                                        {!store.is_main && (
                                                            <button
                                                                onClick={() => handleSetMainStore(store)}
                                                                title="Designate as Main Store"
                                                                style={{
                                                                    padding: '6px 8px', borderRadius: 6, border: '1px solid #fde68a',
                                                                    background: '#fffbeb', color: '#b45309', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <BsStarFill size={13} />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => setStoreToDelete(store)}
                                                            title="Delete Store"
                                                            style={{
                                                                padding: '6px 8px', borderRadius: 6, border: '1px solid #fecaca',
                                                                background: '#fef2f2', color: '#dc2626', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <BsTrash size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================= */}
            {/* VIEW 2: STORE TARGETS & MILESTONES                      */}
            {/* ======================================================= */}
            {activeTab === 'targets' && (
                <div>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                        marginBottom: 24,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                            }}>
                                <BsBullseye size={22} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                    Store Targets
                                </h1>
                                <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
                                    Manage revenue and performance targets for stores (<code>/api/v1/store-targets</code>)
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                                onClick={fetchTargets}
                                disabled={targetsLoading}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: '#fff', border: '1px solid #e2e8f0',
                                    color: '#475569', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                            >
                                <BsArrowRepeat size={14} className={targetsLoading ? 'spin-anim' : ''} />
                                <span>Refresh</span>
                            </button>

                            <button
                                id="create-target-btn"
                                onClick={openCreateTarget}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '10px 18px', borderRadius: 10,
                                    background: '#4f46e5', border: 'none',
                                    color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <BsPlus size={18} />
                                <span>Create Target</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 16,
                        marginBottom: 24
                    }}>
                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Targets</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                                    <BsBullseye size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                                {targets.filter(t => t.status === 'active').length}
                            </div>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                                {targetsSummary?.achieved_targets_count ? `${targetsSummary.achieved_targets_count} achieved` : 'Active store milestones'}
                            </span>
                        </div>

                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Target Value</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                    <BsCashStack size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                                ₹{displayTotalRevenueTarget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                {targetsSummary?.overall_achievement_percentage ? `${targetsSummary.overall_achievement_percentage}% overall reached` : 'Sum of store goals'}
                            </span>
                        </div>

                        <div style={{
                            background: '#fff', borderRadius: 14, padding: '18px 20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stores Monitored</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                                    <BsShop size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                                {targetsSummary?.total_stores_with_targets || new Set(targets.map(t => t.store_id)).size}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Configured branch stores</span>
                        </div>
                    </div>

                    {/* Filter Bar & View Toggle */}
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: '14px 18px',
                        border: '1px solid #e2e8f0', marginBottom: 20,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 12
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <BsFilter size={16} color="#64748b" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Period Filter:</span>
                            {['all', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setFilterPeriod(p)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                        textTransform: 'capitalize', border: 'none', cursor: 'pointer',
                                        background: filterPeriod === p ? '#4f46e5' : '#f1f5f9',
                                        color: filterPeriod === p ? '#fff' : '#475569',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                                <button
                                    onClick={() => setTargetsView('list')}
                                    style={{
                                        padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700,
                                        cursor: 'pointer',
                                        background: targetsView === 'list' ? '#fff' : 'transparent',
                                        color: targetsView === 'list' ? '#0f172a' : '#64748b',
                                        boxShadow: targetsView === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    Targets List
                                </button>
                                <button
                                    onClick={() => {
                                        setTargetsView('leaderboard');
                                        fetchLeaderboard();
                                    }}
                                    style={{
                                        padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700,
                                        cursor: 'pointer',
                                        background: targetsView === 'leaderboard' ? '#fff' : 'transparent',
                                        color: targetsView === 'leaderboard' ? '#0f172a' : '#64748b',
                                        boxShadow: targetsView === 'leaderboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    Leaderboard
                                </button>
                            </div>

                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                Showing {filteredTargets.length} target{filteredTargets.length === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>

                    {/* Targets Table / Leaderboard */}
                    {targetsView === 'leaderboard' ? (
                        <div style={{
                            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BsTrophy color="#f59e0b" size={18} />
                                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                                    Store Performance Leaderboard (<code>/api/v1/store-targets/leaderboard</code>)
                                </h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Rank</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Store</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Target Type</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Target Goal</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Achieved</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Progress</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                                    <BsTrophy size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
                                                    <div style={{ fontSize: 14, fontWeight: 600 }}>No Leaderboard Data Available</div>
                                                    <div style={{ fontSize: 12, marginTop: 4 }}>Rankings populate as sales transactions occur against configured store targets.</div>
                                                </td>
                                            </tr>
                                        ) : (
                                            leaderboard.map((item, idx) => (
                                                <tr key={item.target_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 18px', fontWeight: 800 }}>
                                                        <span style={{
                                                            width: 26, height: 26, borderRadius: '50%', display: 'inline-flex',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f1f5f9',
                                                            color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#64748b',
                                                            fontSize: 12
                                                        }}>
                                                            {item.rank || idx + 1}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                                                        <div>{item.store_name || `Store #${item.store_id}`}</div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Code: {item.store_code || '—'}</div>
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#eef2ff', color: '#4338ca' }}>
                                                            {item.target_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontWeight: 800 }}>
                                                        ₹{Number(item.target_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#059669' }}>
                                                        ₹{Number(item.current_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', minWidth: 140 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    width: `${Math.min(Number(item.achievement_percentage || 0), 100)}%`,
                                                                    height: '100%',
                                                                    background: Number(item.achievement_percentage || 0) >= 100 ? '#10b981' : '#4f46e5'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', minWidth: 38 }}>
                                                                {Number(item.achievement_percentage || 0).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                            background: item.is_achieved ? '#ecfdf5' : '#f1f5f9',
                                                            color: item.is_achieved ? '#059669' : '#64748b'
                                                        }}>
                                                            {item.is_achieved ? 'Achieved' : item.status || 'Active'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Type</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Value</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Range</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTargets.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                                                    <BsBullseye size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                                                    <div style={{ fontSize: 14, fontWeight: 600 }}>No Store Targets Found</div>
                                                    <div style={{ fontSize: 12, marginTop: 4 }}>Click "Create Target" above to configure your first target.</div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTargets.map((item) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                                                        #{item.id}
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1e293b' }}>
                                                            <BsShop color="#64748b" size={13} />
                                                            <span>{item.store_name || `Store #${item.store_id}`}</span>
                                                        </div>
                                                        {item.store_code && (
                                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Code: {item.store_code}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                            background: '#eef2ff', color: '#4338ca', textTransform: 'uppercase'
                                                        }}>
                                                            <BsGraphUpArrow size={10} /> {item.target_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                                                        ₹{Number(item.target_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', textTransform: 'capitalize', color: '#475569', fontWeight: 600 }}>
                                                        {item.period}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748b' }}>
                                                        <div>{new Date(item.start_date).toLocaleDateString('en-IN')}</div>
                                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>to {new Date(item.end_date).toLocaleDateString('en-IN')}</div>
                                                    </td>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                            background: item.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                                                            color: item.status === 'active' ? '#059669' : '#64748b',
                                                            textTransform: 'capitalize'
                                                        }}>
                                                            {item.status || 'active'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                                            <button
                                                                onClick={() => openTargetProgress(item)}
                                                                title="View Real-Time Progress"
                                                                style={{
                                                                    padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
                                                                    background: '#fff', color: '#4f46e5', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <BsGraphUpArrow size={13} />
                                                            </button>

                                                            <button
                                                                onClick={() => openEditTarget(item)}
                                                                title="Edit Target"
                                                                style={{
                                                                    padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
                                                                    background: '#fff', color: '#0ea5e9', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <BsPencilSquare size={13} />
                                                            </button>

                                                            <button
                                                                onClick={() => setTargetToDelete(item)}
                                                                title="Delete Target"
                                                                style={{
                                                                    padding: '6px 8px', borderRadius: 6, border: '1px solid #fecaca',
                                                                    background: '#fef2f2', color: '#dc2626', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <BsTrash size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================= */}
            {/* MODAL 1: CREATE / EDIT STORE (POST / PATCH /stores)     */}
            {/* ======================================================= */}
            {showStoreModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden', animation: 'fadeIn .2s ease-out', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 8,
                                    background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    <BsShop size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {editingStore ? `Edit Store #${editingStore.id}` : 'Add New Store'}
                                    </h3>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        {editingStore ? `PATCH /api/v1/stores/${editingStore.id}` : 'POST /api/v1/stores/'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowStoreModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStore} style={{ padding: '20px 24px', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* Store Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                        Store Name <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={storeFormData.name}
                                        onChange={e => {
                                            setStoreFormData({ ...storeFormData, name: e.target.value });
                                            if (storeFormErrors.name) setStoreFormErrors(prev => ({ ...prev, name: null }));
                                        }}
                                        placeholder="e.g. Phoenix Mall Branch"
                                        style={{
                                            width: '100%', padding: '9px 12px', borderRadius: 8,
                                            border: `1px solid ${storeFormErrors.name ? '#ef4444' : '#cbd5e1'}`,
                                            fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                    {storeFormErrors.name && (
                                        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{storeFormErrors.name}</div>
                                    )}
                                </div>

                                {/* Code & Contact Phone */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            Store Code
                                        </label>
                                        <input
                                            type="text"
                                            value={storeFormData.code}
                                            disabled={Boolean(editingStore)}
                                            onChange={e => setStoreFormData({ ...storeFormData, code: e.target.value })}
                                            placeholder="e.g. STR-MUM-01"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                                boxSizing: 'border-box', background: editingStore ? '#f8fafc' : '#fff'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            Contact Phone (10 digits)
                                        </label>
                                        <input
                                            type="tel"
                                            value={storeFormData.phone}
                                            onChange={e => {
                                                setStoreFormData({ ...storeFormData, phone: e.target.value });
                                                if (storeFormErrors.phone) setStoreFormErrors(prev => ({ ...prev, phone: null }));
                                            }}
                                            placeholder="e.g. 9876543210"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.phone ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                        {storeFormErrors.phone && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{storeFormErrors.phone}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Email & GSTIN */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            Store Email
                                        </label>
                                        <input
                                            type="email"
                                            value={storeFormData.email}
                                            onChange={e => {
                                                setStoreFormData({ ...storeFormData, email: e.target.value });
                                                if (storeFormErrors.email) setStoreFormErrors(prev => ({ ...prev, email: null }));
                                            }}
                                            placeholder="store@example.com"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.email ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                        {storeFormErrors.email && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{storeFormErrors.email}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            GSTIN
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={15}
                                            value={storeFormData.gstin}
                                            onChange={e => {
                                                setStoreFormData({ ...storeFormData, gstin: e.target.value.toUpperCase() });
                                                if (storeFormErrors.gstin) setStoreFormErrors(prev => ({ ...prev, gstin: null }));
                                            }}
                                            placeholder="27AAPFU0939F1ZV"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.gstin ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase'
                                            }}
                                        />
                                        {storeFormErrors.gstin && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{storeFormErrors.gstin}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                        Street Address
                                    </label>
                                    <input
                                        type="text"
                                        value={storeFormData.address}
                                        onChange={e => setStoreFormData({ ...storeFormData, address: e.target.value })}
                                        placeholder="Shop 12, Ground Floor, Central Mall"
                                        style={{
                                            width: '100%', padding: '9px 12px', borderRadius: 8,
                                            border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* City, State, Pincode */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            value={storeFormData.city}
                                            onChange={e => setStoreFormData({ ...storeFormData, city: e.target.value })}
                                            placeholder="Mumbai"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            State
                                        </label>
                                        <select
                                            value={storeFormData.state}
                                            onChange={e => setStoreFormData({ ...storeFormData, state: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 8px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 12, outline: 'none',
                                                background: '#fff', boxSizing: 'border-box'
                                            }}
                                        >
                                            {INDIAN_STATES.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                                            Pincode (6 digits)
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={storeFormData.pincode}
                                            onChange={e => {
                                                setStoreFormData({ ...storeFormData, pincode: e.target.value });
                                                if (storeFormErrors.pincode) setStoreFormErrors(prev => ({ ...prev, pincode: null }));
                                            }}
                                            placeholder="400001"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.pincode ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                        {storeFormErrors.pincode && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{storeFormErrors.pincode}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Checkboxes for Warehouse & Main */}
                                <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={storeFormData.is_warehouse}
                                            onChange={e => setStoreFormData({ ...storeFormData, is_warehouse: e.target.checked })}
                                        />
                                        <span>Warehouse Location</span>
                                    </label>

                                    {!editingStore && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={storeFormData.is_main}
                                                onChange={e => setStoreFormData({ ...storeFormData, is_main: e.target.checked })}
                                            />
                                            <span>Set as Primary Main Store</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0',
                                display: 'flex', justifyContent: 'flex-end', gap: 10
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowStoreModal(false)}
                                    style={{
                                        padding: '9px 16px', borderRadius: 8,
                                        border: '1px solid #cbd5e1', background: '#fff',
                                        fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={storeFormSubmitting}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '9px 20px', borderRadius: 8,
                                        border: 'none', background: '#4f46e5',
                                        fontSize: 13, fontWeight: 700, color: '#fff',
                                        cursor: storeFormSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: storeFormSubmitting ? 0.7 : 1,
                                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                                    }}
                                >
                                    {storeFormSubmitting ? (
                                        <>
                                            <BsHourglassSplit size={14} className="spin-anim" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <BsCheckCircleFill size={13} />
                                            <span>{editingStore ? 'Update Store' : 'Create Store'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================= */}
            {/* MODAL 2: STORE DETAILS / KPI / STAFF / INVENTORY DRAWER */}
            {/* ======================================================= */}
            {detailStore && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden', animation: 'fadeIn .2s ease-out', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    <BsShop size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {detailStore.name} {detailStore.is_main ? '⭐' : ''}
                                    </h3>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        Store #{detailStore.id} | Code: {detailStore.code || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailStore(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
                            {detailsLoading ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                    <BsArrowRepeat size={24} className="spin-anim" />
                                    <p style={{ marginTop: 8, fontSize: 13 }}>Loading store metrics, staff and stock summary...</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* 1. Basic Details Card */}
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                            Store Info & Location
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
                                            <div><strong style={{ color: '#64748b' }}>Address:</strong> {detailStore.address || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>City / State:</strong> {detailStore.city || '—'}, {detailStore.state || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>Pincode:</strong> {detailStore.pincode || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>Phone:</strong> {detailStore.phone || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>Email:</strong> {detailStore.email || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>GSTIN:</strong> {detailStore.gstin || '—'}</div>
                                        </div>
                                    </div>

                                    {/* 2. Real-time KPI & Summary (GET /stores/{id}/summary) */}
                                    {storeSummary && (
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                                Store KPI & Performance Snapshot (<code>GET /summary</code>)
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                                <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46' }}>Today's Sales</span>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46', marginTop: 4 }}>
                                                        ₹{Number(storeSummary.today_sales_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    <span style={{ fontSize: 10, color: '#047857' }}>{storeSummary.today_orders_count || 0} orders today</span>
                                                </div>

                                                <div style={{ background: '#eef2ff', padding: '12px 14px', borderRadius: 10, border: '1px solid #c7d2fe' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#3730a3' }}>Total Orders</span>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#3730a3', marginTop: 4 }}>
                                                        {storeSummary.total_orders_count || 0}
                                                    </div>
                                                    <span style={{ fontSize: 10, color: '#4338ca' }}>{storeSummary.active_pos_shifts_count || 0} active POS shifts</span>
                                                </div>

                                                <div style={{ background: '#fef2f2', padding: '12px 14px', borderRadius: 10, border: '1px solid #fecaca' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>Stock Alerts</span>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', marginTop: 4 }}>
                                                        {storeSummary.low_stock_items_count || 0} Low / {storeSummary.out_of_stock_items_count || 0} Out
                                                    </div>
                                                    <span style={{ fontSize: 10, color: '#b91c1c' }}>items requiring restock</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Stock & Valuation Summary (GET /stores/{id}/inventory-summary) */}
                                    {storeInventorySummary && (
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                                Stock & Valuation Summary (<code>GET /inventory-summary</code>)
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Total SKUs</span>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                                                        {storeInventorySummary.total_skus || 0}
                                                    </div>
                                                    <span style={{ fontSize: 10, color: '#10b981' }}>{storeInventorySummary.in_stock_skus || 0} in stock</span>
                                                </div>

                                                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Stock Quantity</span>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                                                        {Number(storeInventorySummary.total_stock_quantity || 0).toLocaleString('en-IN')} units
                                                    </div>
                                                </div>

                                                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Total Stock Valuation</span>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                                                        ₹{Number(storeInventorySummary.total_stock_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. Assigned Store Staff (GET /stores/{id}/staff) */}
                                    <div>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                            Assigned Staff ({storeStaff.length}) (<code>GET /staff</code>)
                                        </h4>
                                        {storeStaff.length === 0 ? (
                                            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                                                No employees directly assigned to this branch yet.
                                            </div>
                                        ) : (
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Name</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Role</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Email</th>
                                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Phone</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {storeStaff.map(member => (
                                                            <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{member.full_name}</td>
                                                                <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{member.role}</td>
                                                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{member.email}</td>
                                                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{member.phone || '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
                            <button
                                onClick={() => setDetailStore(null)}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1',
                                    background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================= */}
            {/* MODAL 3: DELETE CONFIRMATIONS                           */}
            {/* ======================================================= */}
            {storeToDelete && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
                        padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#dc2626', marginBottom: 12 }}>
                            <BsExclamationTriangle size={24} />
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Confirm Store Deletion</h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 20px' }}>
                            Are you sure you want to delete store <strong>"{storeToDelete.name}"</strong> (ID: #{storeToDelete.id})?
                            Soft-deletion requires that this store has no active open inventory movements.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                onClick={() => setStoreToDelete(null)}
                                style={{
                                    padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
                                    background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDeleteStore}
                                disabled={deletingStore}
                                style={{
                                    padding: '8px 18px', borderRadius: 8, border: 'none',
                                    background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: deletingStore ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {deletingStore ? 'Deleting...' : 'Delete Store'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {targetToDelete && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
                        padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#dc2626', marginBottom: 12 }}>
                            <BsTrash size={24} />
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Delete Store Target</h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 20px' }}>
                            Are you sure you want to delete Target #{targetToDelete.id} ({targetToDelete.target_type} - ₹{Number(targetToDelete.target_value).toLocaleString('en-IN')})?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                onClick={() => setTargetToDelete(null)}
                                style={{
                                    padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
                                    background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDeleteTarget}
                                disabled={deletingTarget}
                                style={{
                                    padding: '8px 18px', borderRadius: 8, border: 'none',
                                    background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: deletingTarget ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {deletingTarget ? 'Deleting...' : 'Delete Target'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================= */}
            {/* MODAL 4: CREATE / EDIT STORE TARGET                    */}
            {/* ======================================================= */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden', animation: 'fadeIn .2s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 8,
                                    background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    <BsBullseye size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                        {editingTarget ? `Edit Store Target #${editingTarget.id}` : 'Create Store Target'}
                                    </h3>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        {editingTarget ? `PUT /api/v1/store-targets/${editingTarget.id}` : 'POST /api/v1/store-targets'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveTarget} style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Store Selection */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Target Store <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    {stores.length > 0 ? (
                                        <select
                                            disabled={Boolean(editingTarget)}
                                            value={targetFormData.store_id}
                                            onChange={e => setTargetFormData({ ...targetFormData, store_id: Number(e.target.value) })}
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                                background: editingTarget ? '#f8fafc' : '#fff', boxSizing: 'border-box'
                                            }}
                                        >
                                            {stores.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    #{s.id} - {s.name} ({s.city || 'No city'}) {s.is_main ? '⭐' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            disabled={Boolean(editingTarget)}
                                            value={targetFormData.store_id}
                                            onChange={e => setTargetFormData({ ...targetFormData, store_id: e.target.value })}
                                            placeholder="e.g. 2"
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    )}
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>ID of store for this milestone goal</span>
                                </div>

                                {/* Target Type & Period (2 columns) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Target Type <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select
                                            value={targetFormData.target_type}
                                            onChange={e => setTargetFormData({ ...targetFormData, target_type: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                                background: '#fff', boxSizing: 'border-box'
                                            }}
                                        >
                                            {TARGET_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Period <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select
                                            value={targetFormData.period}
                                            onChange={e => setTargetFormData({ ...targetFormData, period: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                                background: '#fff', boxSizing: 'border-box'
                                            }}
                                        >
                                            {PERIOD_OPTIONS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Target Value */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Target Value (₹ / count) <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="0.01"
                                        value={targetFormData.target_value}
                                        onChange={e => setTargetFormData({ ...targetFormData, target_value: e.target.value })}
                                        placeholder="e.g. 100000"
                                        style={{
                                            width: '100%', padding: '9px 12px', borderRadius: 8,
                                            border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Target goal amount to achieve (e.g. 100000)</span>
                                </div>

                                {/* Date Range (Start Date & End Date) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Start Date & Time <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={toInputDatetime(targetFormData.start_date)}
                                            onChange={e => setTargetFormData({ ...targetFormData, start_date: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 10px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 12, outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            End Date & Time <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={toInputDatetime(targetFormData.end_date)}
                                            onChange={e => setTargetFormData({ ...targetFormData, end_date: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 10px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 12, outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Status if Editing */}
                                {editingTarget && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Status
                                        </label>
                                        <select
                                            value={targetFormData.status}
                                            onChange={e => setTargetFormData({ ...targetFormData, status: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                                background: '#fff', boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{
                                marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0',
                                display: 'flex', justifyContent: 'flex-end', gap: 10
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{
                                        padding: '9px 16px', borderRadius: 8,
                                        border: '1px solid #cbd5e1', background: '#fff',
                                        fontSize: 13, fontWeight: 600, color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={targetLoading}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '9px 20px', borderRadius: 8,
                                        border: 'none', background: '#4f46e5',
                                        fontSize: 13, fontWeight: 700, color: '#fff',
                                        cursor: targetLoading ? 'not-allowed' : 'pointer',
                                        opacity: targetLoading ? 0.7 : 1,
                                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                                    }}
                                >
                                    {targetLoading ? (
                                        <>
                                            <BsHourglassSplit size={14} className="spin-anim" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <BsCheckCircleFill size={13} />
                                            <span>{editingTarget ? 'Update Target' : 'Create Target'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================= */}
            {/* MODAL 5: TARGET PROGRESS MODAL (GET /progress)          */}
            {/* ======================================================= */}
            {progressTarget && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
                        padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8, background: '#eef2ff',
                                    color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <BsGraphUpArrow size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                                        Target Progress #{progressTarget.id}
                                    </h3>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        {progressTarget.target_type} ({progressTarget.period})
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setProgressTarget(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {progressLoading ? (
                            <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                                <BsArrowRepeat size={24} className="spin-anim" />
                                <p style={{ fontSize: 13, marginTop: 8 }}>Calculating real-time sales progress...</p>
                            </div>
                        ) : targetProgressData ? (
                            <div>
                                <div style={{
                                    background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0',
                                    marginBottom: 16
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Goal Value:</span>
                                        <strong style={{ fontSize: 13, color: '#0f172a' }}>
                                            ₹{Number(targetProgressData.target_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Achieved to Date:</span>
                                        <strong style={{ fontSize: 13, color: '#10b981' }}>
                                            ₹{Number(targetProgressData.current_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Remaining:</span>
                                        <strong style={{ fontSize: 13, color: '#64748b' }}>
                                            ₹{Number(targetProgressData.remaining_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Days Remaining:</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9' }}>
                                            {targetProgressData.days_remaining} day{targetProgressData.days_remaining === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                                        <span>Achievement Rate</span>
                                        <span style={{ color: Number(targetProgressData.achievement_percentage || 0) >= 100 ? '#10b981' : '#4f46e5' }}>
                                            {Number(targetProgressData.achievement_percentage || 0).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ height: 10, borderRadius: 5, background: '#e2e8f0', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(Number(targetProgressData.achievement_percentage || 0), 100)}%`,
                                            height: '100%',
                                            background: Number(targetProgressData.achievement_percentage || 0) >= 100 ? '#10b981' : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                                            transition: 'width 0.4s ease'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                                Progress data could not be computed for this target.
                            </div>
                        )}

                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setProgressTarget(null)}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1',
                                    background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer'
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

export default Stores;
