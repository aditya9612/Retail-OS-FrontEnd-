import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import storeService from '../../services/storeService';
import storeTargetService from '../../services/storeTargetService';
import notificationService from '../../utils/notificationService';
import { PageContainer, PageHeader, KpiGrid, KpiCard } from '../../components/Common/PageComponents';
import '../../components/Categories/CategoryCards.css';
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
    BsShieldCheck,
    BsShieldX
} from 'react-icons/bs';
import { INDIAN_STATES, getCitiesForState, isKnownCity, findCanonicalCityName, getDistrictsForState, getGstStateCodes } from '../../utils/indiaLocationData';
import SearchableSelect from '../../components/Common/SearchableSelect';

// Backend TargetType enum options (Requirements 27 & 28)
const TARGET_TYPES = [
    { value: 'Sales', label: 'Sales' },
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Profit', label: 'Profit' },
    { value: 'Orders', label: 'Orders' },
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

// Helper to format ISO datetime to YYYY-MM-DD for date-only inputs (Requirement 26)
const toDateOnly = (val) => {
    if (!val) return '';
    try {
        return String(val).slice(0, 10);
    } catch {
        return '';
    }
};

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

    // Shared Notifications (Requirement 14)
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const showSuccess = (msg) => {
        notificationService.success(msg);
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 4500);
    };

    const showError = (msg) => {
        const text = typeof msg === 'string' ? msg : (msg?.message || msg?.detail || JSON.stringify(msg));
        notificationService.error(text);
        setErrorMsg(text);
        setTimeout(() => setErrorMsg(''), 6000);
    };

    // ============================================================
    // 1. STORES MODULE STATE & APIS
    // ============================================================
    const [stores, setStores] = useState([]);
    const [storesLoading, setStoresLoading] = useState(false);
    const [storeSearch, setStoreSearch] = useState('');
    const [storeKpiFilter, setStoreKpiFilter] = useState('all'); // 'all' | 'active' | 'warehouse' | 'main'
    const [storeTypeFilter, setStoreTypeFilter] = useState('all'); // 'all' | 'retail' | 'warehouse'
    const [storeStatusFilter, setStoreStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const [storeCityFilter, setStoreCityFilter] = useState('all');
    const [includeInactive, setIncludeInactive] = useState(true);
    const [togglingStoreId, setTogglingStoreId] = useState(null);

    // Fetch Stores: GET /api/v1/stores/ (Always maintains full store dataset for KPI metrics)
    const fetchStores = useCallback(async () => {
        setStoresLoading(true);
        try {
            const params = {
                include_inactive: includeInactive,
            };

            const data = await storeService.listStores(params);
            const list = Array.isArray(data) ? data : (data?.items || []);
            // Requirement 8: Latest created store first in the listing
            list.sort((a, b) => {
                if (b.created_at && a.created_at) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return (Number(b.id) || 0) - (Number(a.id) || 0);
            });
            setStores(list);
        } catch (err) {
            console.error('Fetch Stores Error:', err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
            showError(`Failed to load stores: ${detail}`);
        } finally {
            setStoresLoading(false);
        }
    }, [includeInactive]);

    // Unique cities for Store Location Filter (Requirement 10)
    const storeCities = useMemo(() => {
        const set = new Set();
        stores.forEach(s => {
            if (s.city && s.city.trim()) set.add(s.city.trim());
        });
        return Array.from(set).sort();
    }, [stores]);

    // Current primary main store if any
    const currentMainStore = useMemo(() => stores.find(s => s.is_main), [stores]);

    // Filtered Stores (Requirement 10 & Clickable KPI Cards: name, code, location, type, status, kpi)
    const filteredStores = useMemo(() => {
        return stores.filter(store => {
            // Interactive KPI Card Filter
            if (storeKpiFilter === 'active' && !store.is_active) return false;
            if (storeKpiFilter === 'warehouse' && !store.is_warehouse) return false;
            if (storeKpiFilter === 'main' && !store.is_main) return false;

            // Search filter
            if (storeSearch.trim()) {
                const q = storeSearch.trim().toLowerCase();
                const matchName = (store.name || '').toLowerCase().includes(q);
                const matchCode = (store.code || '').toLowerCase().includes(q);
                const matchCity = (store.city || '').toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchCity) return false;
            }

            // Type filter
            if (storeTypeFilter === 'warehouse' && !store.is_warehouse) return false;
            if (storeTypeFilter === 'retail' && store.is_warehouse) return false;

            // Status filter
            if (storeStatusFilter === 'active' && !store.is_active) return false;
            if (storeStatusFilter === 'inactive' && store.is_active) return false;

            // City filter
            if (storeCityFilter !== 'all' && (store.city || '').toLowerCase() !== storeCityFilter.toLowerCase()) return false;

            return true;
        });
    }, [stores, storeKpiFilter, storeSearch, storeTypeFilter, storeStatusFilter, storeCityFilter]);

    const resetStoreFilters = () => {
        setStoreKpiFilter('all');
        setStoreSearch('');
        setStoreTypeFilter('all');
        setStoreStatusFilter('all');
        setStoreCityFilter('all');
    };

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
    const [isCustomCity, setIsCustomCity] = useState(false);
    const [customCityName, setCustomCityName] = useState('');
    const [storeFormData, setStoreFormData] = useState({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
        district: '',
        city: '',
        state: 'Maharashtra',
        pincode: '',
        gstin: '',
        is_warehouse: false,
        is_main: false,
    });

    // Dynamic verified cities list for the currently selected state
    const availableCities = useMemo(() => {
        if (!storeFormData.state) return [];
        return getCitiesForState(storeFormData.state);
    }, [storeFormData.state]);

    // Dynamic verified districts list for the currently selected state
    const availableDistricts = useMemo(() => {
        if (!storeFormData.state) return [];
        const baseList = getDistrictsForState(storeFormData.state);
        // Requirement 3: Do not overwrite existing district values if they are not present in the new dataset
        if (storeFormData.district && !baseList.includes(storeFormData.district)) {
            return [storeFormData.district, ...baseList];
        }
        return baseList;
    }, [storeFormData.state, storeFormData.district]);

    const openCreateStore = () => {
        setEditingStore(null);
        setIsCustomCity(false);
        setCustomCityName('');
        setStoreFormData({
            name: '',
            code: '',
            phone: '',
            email: '',
            address: '',
            district: '',
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

            const stateVal = fresh.state || 'Maharashtra';
            const rawCity = (fresh.city || '').trim();

            let isCustom = false;
            let selectedCity = rawCity;
            let customCity = '';

            if (rawCity) {
                const canonical = findCanonicalCityName(stateVal, rawCity);
                if (canonical) {
                    selectedCity = canonical;
                    isCustom = false;
                    customCity = '';
                } else {
                    selectedCity = 'Other';
                    isCustom = true;
                    customCity = rawCity;
                }
            } else {
                selectedCity = '';
                isCustom = false;
                customCity = '';
            }

            setIsCustomCity(isCustom);
            setCustomCityName(customCity);

            setStoreFormData({
                name: fresh.name || '',
                code: fresh.code || '',
                phone: fresh.phone || '',
                email: fresh.email || '',
                address: fresh.address || '',
                district: fresh.district || '',
                city: selectedCity,
                state: stateVal,
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

        // 1. Store Name Validation
        const rawName = storeFormData.name || '';
        const trimmedName = rawName.trim();
        if (!trimmedName) {
            errors.name = 'Store name is required';
        } else if (trimmedName.length < 2) {
            errors.name = 'Store name must be at least 2 characters';
        } else if (trimmedName.length > 100) {
            errors.name = 'Store name must not exceed 100 characters';
        } else if (/^\d+$/.test(trimmedName)) {
            errors.name = 'Store name cannot contain only numbers';
        } else if (!/[a-zA-Z]/.test(trimmedName)) {
            errors.name = 'Store name must contain at least one letter';
        } else if (!/^[a-zA-Z0-9\s&'()./,-]+$/.test(trimmedName)) {
            errors.name = 'Store name contains invalid special characters';
        } else {
            // Disallowed generic/placeholder names
            const disallowedPlaceholders = [
                'test', 'store', 'shop', 'retail', 'sample', 'dummy', 'placeholder',
                'null', 'undefined', 'unknown', 'n/a', 'na', 'string'
            ];
            if (disallowedPlaceholders.includes(trimmedName.toLowerCase())) {
                errors.name = 'Please enter a valid, specific store name';
            } else {
                // Check repetitive meaningless strings (e.g. AAAAAA)
                const letters = trimmedName.toLowerCase().replace(/[^a-z]/g, '');
                if (letters.length >= 4 && new Set(letters).size < 2) {
                    errors.name = 'Store name contains invalid repetitive characters';
                } else {
                    // Check duplicate store names against loaded stores
                    const isDuplicate = stores.some(s =>
                        s.name && s.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
                        s.id !== editingStore?.id
                    );
                    if (isDuplicate) {
                        errors.name = 'Store name already exists. Please choose a different name';
                    }
                }
            }
        }

        // 2. Store Code Validation (Optional, but if provided must follow rules)
        const trimmedCode = (storeFormData.code || '').trim().toUpperCase();
        if (trimmedCode) {
            if (trimmedCode.length < 2) {
                errors.code = 'Store code must be at least 2 characters';
            } else if (trimmedCode.length > 20) {
                errors.code = 'Store code must not exceed 20 characters';
            } else if (!/^[A-Z]/.test(trimmedCode)) {
                errors.code = 'Store code must start with a letter';
            } else if (!/^[A-Z][A-Z0-9_-]*$/.test(trimmedCode)) {
                errors.code = 'Store code can only contain letters, numbers, hyphens, and underscores';
            } else {
                // Prevent duplicate store codes
                const isDuplicate = stores.some(s =>
                    s.code && s.code.trim().toUpperCase() === trimmedCode &&
                    s.id !== editingStore?.id
                );
                if (isDuplicate) {
                    errors.code = 'Store code already exists. Please choose a unique code';
                }
            }
        }

        // 3. Contact Phone Validation (Optional, exactly 10 digits, starts with 6-9)
        if (storeFormData.phone && storeFormData.phone.trim()) {
            const cleanPhone = storeFormData.phone.trim();
            if (!/^\d+$/.test(cleanPhone)) {
                errors.phone = 'Phone number must contain only numeric digits';
            } else if (cleanPhone.length !== 10) {
                errors.phone = 'Phone number must be exactly 10 digits';
            } else if (!/^[6-9]/.test(cleanPhone)) {
                errors.phone = 'Phone number must start with 6, 7, 8, or 9';
            } else if (/^(\d)\1{9}$/.test(cleanPhone)) {
                errors.phone = 'Phone number cannot contain all identical digits';
            }
        }

        // 4. Store Email – Strict Validation (Optional, standard RFC & domain checks)
        if (storeFormData.email !== undefined && storeFormData.email !== null) {
            const rawEmailStr = String(storeFormData.email);
            if (rawEmailStr.length > 0) {
                // Reject leading/trailing spaces and internal whitespace
                if (/\s/.test(rawEmailStr)) {
                    errors.email = 'Email address cannot contain spaces.';
                } else {
                    const cleanEmail = rawEmailStr.trim();
                    if (!cleanEmail) {
                        errors.email = 'Email address cannot contain spaces.';
                    } else if (cleanEmail.length > 254) {
                        errors.email = 'Email address is too long.';
                    } else {
                        // Check single @ symbol
                        const atMatches = cleanEmail.match(/@/g);
                        if (!atMatches || atMatches.length !== 1) {
                            errors.email = 'Please enter a valid email address.';
                        } else if (cleanEmail.includes('..')) {
                            // Prevent invalid consecutive dots anywhere
                            errors.email = 'Please enter a valid email address.';
                        } else {
                            const [localPart, domainPart] = cleanEmail.split('@');
                            // Local-part checks
                            if (!localPart || localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.')) {
                                errors.email = 'Please enter a valid email address.';
                            } else if (localPart.startsWith('-') || localPart.endsWith('-')) {
                                errors.email = 'Please enter a valid email address.';
                            } else if (!domainPart || domainPart.length > 253 || domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.startsWith('-') || domainPart.endsWith('-')) {
                                errors.email = 'Please enter a valid email address.';
                            } else {
                                // Domain structure: must have valid extension (TLD >= 2 letters)
                                const domainParts = domainPart.split('.');
                                if (domainParts.length < 2) {
                                    errors.email = 'Please enter a valid email address.';
                                } else {
                                    const tld = domainParts[domainParts.length - 1];
                                    if (!/^[a-zA-Z]{2,}$/.test(tld)) {
                                        errors.email = 'Please enter a valid email address.';
                                    } else {
                                        // Validate each domain label
                                        const validDomainLabels = domainParts.every(label =>
                                            /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)
                                        );
                                        // Validate local-part characters
                                        const validLocal = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(localPart);

                                        if (!validLocal || !validDomainLabels) {
                                            errors.email = 'Please enter a valid email address.';
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. GSTIN Validation (Optional, 15 chars, pattern + state code matching)
        if (storeFormData.gstin && storeFormData.gstin.trim()) {
            const cleanGstin = storeFormData.gstin.trim().toUpperCase();
            if (cleanGstin.length !== 15) {
                errors.gstin = 'GSTIN must be exactly 15 characters';
            } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
                errors.gstin = 'Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)';
            } else {
                const gstinPrefix = cleanGstin.slice(0, 2);
                const prefixNum = parseInt(gstinPrefix, 10);
                if (isNaN(prefixNum) || !((prefixNum >= 1 && prefixNum <= 38) || prefixNum === 97 || prefixNum === 99)) {
                    errors.gstin = `Invalid GST state code "${gstinPrefix}" in GSTIN`;
                } else if (storeFormData.state) {
                    const validStateCodes = getGstStateCodes(storeFormData.state);
                    if (validStateCodes.length > 0 && !validStateCodes.includes(gstinPrefix)) {
                        errors.gstin = `GSTIN state code (${gstinPrefix}) does not match selected state (${storeFormData.state})`;
                    }
                }
            }
        }

        // 6. Street Address – Strict Validation (Optional, meaningful physical address)
        if (storeFormData.address !== undefined && storeFormData.address !== null) {
            const rawAddressStr = String(storeFormData.address);
            if (rawAddressStr.length > 0) {
                const cleanAddress = rawAddressStr.trim();
                if (!cleanAddress) {
                    errors.address = 'Please enter a valid street address.';
                } else if (cleanAddress.length > 250) {
                    errors.address = 'Address cannot exceed the maximum allowed length.';
                } else if (cleanAddress.length < 5) {
                    errors.address = 'Address must contain at least 5 characters.';
                } else if (!/[a-zA-Z]/.test(cleanAddress)) {
                    // Prevent addresses containing only numbers or special characters
                    errors.address = 'Address cannot contain only numbers or special characters.';
                } else if (!/^[a-zA-Z0-9\s,./#()\-&']+$/.test(cleanAddress)) {
                    // Reject unsupported special characters
                    errors.address = 'Please enter a valid street address.';
                } else if (/[,#/\-]{2,}|\.{3,}/.test(cleanAddress)) {
                    // Reject excessive repeated punctuation
                    errors.address = 'Please enter a valid street address.';
                } else {
                    // Check meaningful characters count (excluding spaces & punctuation)
                    const meaningfulChars = cleanAddress.replace(/[^a-zA-Z0-9]/g, '');
                    if (meaningfulChars.length < 5) {
                        errors.address = 'Address must contain at least 5 characters.';
                    }
                }
            }
        }

        // 7. State Validation (Required, must be in INDIAN_STATES)
        const cleanState = (storeFormData.state || '').trim();
        if (!cleanState) {
            errors.state = 'State is required';
        } else if (!INDIAN_STATES.includes(cleanState)) {
            errors.state = 'Please select a valid Indian State / UT from the list';
        }

        // 8. District Validation (Optional, but if selected must correspond to selected state)
        if (storeFormData.district && storeFormData.district.trim()) {
            const cleanDistrict = storeFormData.district.trim();
            if (availableDistricts.length > 0 && !availableDistricts.includes(cleanDistrict)) {
                errors.district = 'Selected district does not belong to the chosen state';
            }
        }

        // 9. City Validation (Dynamic per state/district or custom city validation)
        if (isCustomCity) {
            const trimmedCustom = (customCityName || '').trim();
            if (!trimmedCustom) {
                errors.city = 'City name is required';
            } else if (trimmedCustom.length < 2) {
                errors.city = 'City name must be at least 2 characters';
            } else if (trimmedCustom.length > 50) {
                errors.city = 'City name must not exceed 50 characters';
            } else if (!/^[a-zA-Z\s\-']+$/.test(trimmedCustom)) {
                errors.city = 'City can only contain letters, spaces, hyphens and apostrophes';
            } else if (INDIAN_STATES.some(s => s.toLowerCase() === trimmedCustom.toLowerCase())) {
                errors.city = 'City name cannot be a state or union territory name';
            }
        } else if (storeFormData.city && storeFormData.city.trim()) {
            if (storeFormData.city === 'Other') {
                errors.city = 'City name is required';
            } else {
                const cleanCity = storeFormData.city.trim();
                if (cleanCity.length < 2) {
                    errors.city = 'City must be at least 2 characters';
                } else if (cleanCity.length > 50) {
                    errors.city = 'City must not exceed 50 characters';
                } else if (!/^[a-zA-Z\s\-']+$/.test(cleanCity)) {
                    errors.city = 'City can only contain letters, spaces, hyphens and apostrophes';
                }
            }
        }

        // 10. Pincode Validation (Optional, exactly 6 digits, non-zero start, non-sequential)
        if (storeFormData.pincode && storeFormData.pincode.trim()) {
            const cleanPin = storeFormData.pincode.trim();
            if (!/^\d+$/.test(cleanPin)) {
                errors.pincode = 'Pincode must contain only numeric digits';
            } else if (cleanPin.length !== 6) {
                errors.pincode = 'Pincode must be exactly 6 numeric digits';
            } else if (cleanPin.startsWith('0')) {
                errors.pincode = 'Indian pincode cannot start with 0';
            } else if (/^(\d)\1{5}$/.test(cleanPin)) {
                errors.pincode = 'Pincode cannot contain all identical digits';
            } else if (cleanPin === '123456' || cleanPin === '654321') {
                errors.pincode = 'Sequential pincodes are not valid';
            }
        }

        setStoreFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveStore = async (e) => {
        e.preventDefault();
        if (storeFormSubmitting) return;
        if (!validateStoreForm()) {
            showError('Please correct the highlighted validation errors before submitting.');
            return;
        }

        setStoreFormSubmitting(true);
        setErrorMsg('');
        try {
            const effectiveCity = isCustomCity
                ? (customCityName?.trim() || null)
                : (storeFormData.city && storeFormData.city !== 'Other' ? storeFormData.city.trim() : null);

            const trimmedPayload = {
                name: storeFormData.name.trim(),
                code: storeFormData.code?.trim()?.toUpperCase() || null,
                address: storeFormData.address?.trim() || null,
                district: storeFormData.district?.trim() || null,
                city: effectiveCity,
                state: storeFormData.state || null,
                pincode: storeFormData.pincode?.trim() || null,
                phone: storeFormData.phone?.trim() || null,
                email: storeFormData.email?.trim() ? storeFormData.email.trim().toLowerCase() : null,
                gstin: storeFormData.gstin?.trim()?.toUpperCase() || null,
                is_warehouse: Boolean(storeFormData.is_warehouse),
            };

            if (editingStore) {
                // PATCH /api/v1/stores/{store_id}
                const updated = await storeService.updateStore(editingStore.id, trimmedPayload);
                showSuccess(`Store "${updated.name}" updated successfully!`);
            } else {
                // POST /api/v1/stores/
                const createPayload = {
                    ...trimmedPayload,
                    is_main: Boolean(storeFormData.is_main),
                };
                const created = await storeService.createStore(createPayload);
                showSuccess(`Store "${created.name}" created successfully!`);
            }
            setShowStoreModal(false);
            fetchStores();
        } catch (err) {
            console.error('Save Store Error:', err);
            const backendErrors = {};
            const status = err.response?.status;
            const resData = err.response?.data;
            const rawDetail = resData?.detail || resData?.message;

            // 1. FastAPI 422 validation errors with field location
            if (status === 422 && Array.isArray(rawDetail)) {
                rawDetail.forEach(d => {
                    const field = d.loc?.[d.loc.length - 1];
                    if (field) {
                        backendErrors[field] = (d.msg || '').replace(/^Value error,\s*/i, '');
                    }
                });
            } else if (status === 409) {
                // 2. Conflict errors (duplicate name, duplicate code)
                const detailStr = typeof rawDetail === 'string' ? rawDetail : JSON.stringify(rawDetail);
                if (/name.*already exists/i.test(detailStr)) {
                    backendErrors.name = 'Store name already exists. Please choose a different name';
                } else if (/code.*already exists/i.test(detailStr)) {
                    backendErrors.code = 'Store code already exists. Please choose a unique code';
                } else {
                    showError(detailStr);
                }
            } else if (typeof rawDetail === 'string') {
                // 3. String error messages matching specific fields
                if (/name/i.test(rawDetail)) {
                    backendErrors.name = rawDetail;
                } else if (/code/i.test(rawDetail)) {
                    backendErrors.code = rawDetail;
                } else if (/gstin/i.test(rawDetail)) {
                    backendErrors.gstin = rawDetail;
                } else if (/phone/i.test(rawDetail)) {
                    backendErrors.phone = rawDetail;
                } else if (/email/i.test(rawDetail)) {
                    backendErrors.email = rawDetail;
                } else if (/pincode/i.test(rawDetail)) {
                    backendErrors.pincode = rawDetail;
                } else if (/address/i.test(rawDetail)) {
                    backendErrors.address = rawDetail;
                } else if (/city/i.test(rawDetail)) {
                    backendErrors.city = rawDetail;
                } else if (/state/i.test(rawDetail)) {
                    backendErrors.state = rawDetail;
                } else {
                    showError(rawDetail);
                }
            } else {
                const detail = err.response?.data?.message || err.message;
                showError(`Failed to save store: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
            }

            if (Object.keys(backendErrors).length > 0) {
                setStoreFormErrors(backendErrors);
                showError('Please correct the highlighted validation errors.');
            }
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

    // Store Actions: Activate / Deactivate (Requirement 11)
    const handleToggleStoreActive = async (store) => {
        if (togglingStoreId === store.id) return;
        const action = store.is_active ? 'deactivate' : 'activate';
        const confirmed = window.confirm(`Are you sure you want to ${action} store "${store.name}"?`);
        if (!confirmed) return;

        setTogglingStoreId(store.id);
        try {
            if (store.is_active) {
                // PATCH /api/v1/stores/{store_id}/deactivate
                await storeService.deactivateStore(store.id);
                showSuccess(`Store "${store.name}" deactivated successfully.`);
            } else {
                // PATCH /api/v1/stores/{store_id}/activate
                await storeService.activateStore(store.id);
                showSuccess(`Store "${store.name}" activated successfully!`);
            }
            // Update local state immediately for instant feedback
            setStores(prev => prev.map(s => s.id === store.id ? { ...s, is_active: !store.is_active } : s));
            fetchStores();
        } catch (err) {
            console.error('Toggle Store Active Error:', err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
            showError(`Failed to ${action} store: ${detail}`);
        } finally {
            setTogglingStoreId(null);
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
    const [targetKpiFilter, setTargetKpiFilter] = useState('all'); // 'all' | 'active' | 'revenue' | 'completed'
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [targetStatusFilter, setTargetStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'completed' | 'cancelled'
    const [targetTypeFilter, setTargetTypeFilter] = useState('all');
    const [targetSearch, setTargetSearch] = useState('');
    const [targetsView, setTargetsView] = useState('list'); // 'list' | 'leaderboard'

    // Pagination for Store Targets (Requirement 22)
    const [targetPage, setTargetPage] = useState(1);
    const [targetPageSize, setTargetPageSize] = useState(20);

    // Leaderboard filters (Requirement 17)
    const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
    const [leaderboardTargetType, setLeaderboardTargetType] = useState('all');

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
            const params = {
                page_size: 100 // ensure backend returns all configured targets without 12-item truncation (Requirement 22)
            };
            if (filterPeriod !== 'all') {
                params.period = filterPeriod;
            }
            if (targetStatusFilter !== 'all') {
                params.status = targetStatusFilter;
            }
            if (targetTypeFilter !== 'all') {
                params.target_type = targetTypeFilter;
            }

            // 1. Fetch Targets list
            const listData = await storeTargetService.getTargets(params);
            const items = Array.isArray(listData) ? listData : (listData?.data || listData?.items || []);
            setTargets(items);

            // 2. Fetch Summary Overview
            try {
                const summaryParams = filterPeriod !== 'all' ? { period: filterPeriod } : {};
                const summaryData = await storeTargetService.getTargetsSummary(summaryParams);
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
    }, [filterPeriod, targetStatusFilter, targetTypeFilter]);

    // Fetch Leaderboard: GET /api/v1/store-targets/leaderboard (Requirement 17)
    const fetchLeaderboard = useCallback(async () => {
        setLeaderboardLoading(true);
        try {
            const params = {};
            if (leaderboardPeriod !== 'all') {
                params.period = leaderboardPeriod;
            }
            if (leaderboardTargetType !== 'all') {
                params.target_type = leaderboardTargetType;
            }
            const res = await storeTargetService.getLeaderboard(params);
            const list = res?.leaderboard || (Array.isArray(res) ? res : []);
            setLeaderboard(list);
        } catch (err) {
            console.error('Leaderboard Fetch Error:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    }, [leaderboardPeriod, leaderboardTargetType]);

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
        store_id: '',
        target_type: 'Sales',
        target_value: 100000,
        period: 'monthly',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
        status: 'active',
    });

    const openCreateTarget = () => {
        setEditingTarget(null);
        const defaultStoreId = stores.length > 0 ? stores[0].id : '';
        const todayStr = new Date().toISOString().slice(0, 10);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

        setTargetFormData({
            store_id: defaultStoreId,
            target_type: 'Sales',
            target_value: 100000,
            period: 'monthly',
            start_date: todayStr,
            end_date: endOfMonth,
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
                target_type: fresh.target_type || 'Sales',
                target_value: Number(fresh.target_value || 0),
                period: fresh.period || 'monthly',
                start_date: toDateOnly(fresh.start_date),
                end_date: toDateOnly(fresh.end_date),
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

        const startDateOnly = toDateOnly(targetFormData.start_date);
        const endDateOnly = toDateOnly(targetFormData.end_date);

        if (!startDateOnly || !endDateOnly) {
            setErrorMsg('Start Date and End Date are mandatory.');
            setTargetLoading(false);
            return;
        }

        if (endDateOnly < startDateOnly) {
            setErrorMsg('End Date cannot be earlier than Start Date.');
            setTargetLoading(false);
            return;
        }

        const startISO = `${startDateOnly}T00:00:00`;
        const endISO = `${endDateOnly}T23:59:59`;

        try {
            if (editingTarget) {
                // Requirement 19 & 25: PATCH /api/v1/store-targets/{target_id} (Partial update)
                const patchPayload = {
                    target_type: targetFormData.target_type,
                    target_value: Number(targetFormData.target_value),
                    period: targetFormData.period,
                    start_date: startISO,
                    end_date: endISO,
                    status: targetFormData.status,
                };
                const updated = await storeTargetService.patchTarget(editingTarget.id, patchPayload);
                showSuccess(`Store Target for "${updated.target_type || targetFormData.target_type}" updated successfully!`);
            } else {
                // POST /api/v1/store-targets (Requirement 23 & 24)
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
                showSuccess(`Store Target for "${created.target_type || targetFormData.target_type}" created successfully!`);
            }
            setShowCreateModal(false);
            fetchTargets();
        } catch (err) {
            console.error('Save Target Error:', err);
            const errDetail = err.response?.data?.detail || err.response?.data?.message || err.message;
            showError(`Failed to save target: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
        } finally {
            setTargetLoading(false);
        }
    };

    // Delete Target Confirmation: DELETE /api/v1/store-targets/{target_id} (Requirement 21)
    const [targetToDelete, setTargetToDelete] = useState(null);
    const [deletingTarget, setDeletingTarget] = useState(false);

    const handleConfirmDeleteTarget = async () => {
        if (!targetToDelete) return;
        setDeletingTarget(true);
        try {
            await storeTargetService.deleteTarget(targetToDelete.id);
            showSuccess(`Store Target for "${targetToDelete.target_type || 'Store'}" deleted successfully.`);
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

    // Target Progress Modal: GET /api/v1/store-targets/{target_id}/progress (Requirement 20)
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
                .catch(() => { });
        }
    }, [stores.length]);

    // Filtered store targets (Requirements 15, 18, 22 & Clickable KPI Cards)
    const filteredTargets = useMemo(() => {
        return targets.filter(t => {
            // Interactive KPI Card Filter
            if (targetKpiFilter === 'active') {
                const st = (t.status || 'active').toLowerCase();
                if (st !== 'active' && st !== 'in_progress') return false;
            } else if (targetKpiFilter === 'completed') {
                const st = (t.status || '').toLowerCase();
                const prog = parseFloat(t.progress_percentage || t.progress || 0);
                if (st !== 'completed' && prog < 100) return false;
            } else if (targetKpiFilter === 'revenue') {
                const tt = (t.target_type || '').toLowerCase();
                if (!tt.includes('revenue') && !tt.includes('sales')) return false;
            }

            if (filterPeriod !== 'all' && t.period?.toLowerCase() !== filterPeriod.toLowerCase()) return false;
            if (targetStatusFilter !== 'all' && (t.status || 'active').toLowerCase() !== targetStatusFilter.toLowerCase()) return false;
            if (targetTypeFilter !== 'all' && (t.target_type || '').toLowerCase() !== targetTypeFilter.toLowerCase()) return false;
            if (targetSearch.trim()) {
                const q = targetSearch.trim().toLowerCase();
                const storeMatch = (t.store_name || '').toLowerCase().includes(q) || String(t.store_id || '').includes(q) || (t.store_code || '').toLowerCase().includes(q);
                const typeMatch = (t.target_type || '').toLowerCase().includes(q);
                const periodMatch = (t.period || '').toLowerCase().includes(q);
                if (!storeMatch && !typeMatch && !periodMatch) return false;
            }
            return true;
        });
    }, [targets, targetKpiFilter, filterPeriod, targetStatusFilter, targetTypeFilter, targetSearch]);

    // Paginated targets (Requirement 22: Display all returned records)
    const paginatedTargets = useMemo(() => {
        const start = (targetPage - 1) * targetPageSize;
        return filteredTargets.slice(start, start + targetPageSize);
    }, [filteredTargets, targetPage, targetPageSize]);

    const totalTargetPages = Math.max(1, Math.ceil(filteredTargets.length / targetPageSize));

    const displayTotalRevenueTarget = useMemo(() => {
        if (targetsSummary?.total_target_value && Number(targetsSummary.total_target_value) > 0) {
            return Number(targetsSummary.total_target_value);
        }
        return targets
            .filter(t => (t.target_type || '').toLowerCase().includes('revenue') || (t.target_type || '').toLowerCase().includes('sales'))
            .reduce((sum, t) => sum + parseFloat(t.target_value || 0), 0);
    }, [targetsSummary, targets]);

    // ============================================================
    // STORES DIRECTORY: SINGLE BOTTOM HORIZONTAL SCROLLBAR SYNCHRONIZATION
    // ============================================================
    const storesTableContainerRef = useRef(null);
    const storesBottomScrollbarRef = useRef(null);
    const isSyncingStoresScroll = useRef(false);

    const [storesScrollContentWidth, setStoresScrollContentWidth] = useState(0);
    const [isStoresScrollable, setIsStoresScrollable] = useState(false);

    const updateStoresScrollMetrics = useCallback(() => {
        const tableEl = storesTableContainerRef.current;
        const bottomEl = storesBottomScrollbarRef.current;

        const tableScrollWidth = tableEl ? tableEl.scrollWidth : 0;
        const clientWidth = bottomEl?.clientWidth || tableEl?.clientWidth || 0;

        setStoresScrollContentWidth(tableScrollWidth);
        setIsStoresScrollable(tableScrollWidth > (clientWidth + 2));
    }, []);

    useEffect(() => {
        if (activeTab !== 'stores') return;

        updateStoresScrollMetrics();

        const observers = [];
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                updateStoresScrollMetrics();
            });
            if (storesTableContainerRef.current) ro.observe(storesTableContainerRef.current);
            if (storesBottomScrollbarRef.current) ro.observe(storesBottomScrollbarRef.current);
            observers.push(ro);
        }

        const handleWindowResize = () => {
            updateStoresScrollMetrics();
        };

        window.addEventListener('resize', handleWindowResize);
        const rafId = requestAnimationFrame(updateStoresScrollMetrics);

        return () => {
            observers.forEach(obs => obs.disconnect());
            window.removeEventListener('resize', handleWindowResize);
            cancelAnimationFrame(rafId);
        };
    }, [activeTab, filteredStores.length, storesLoading, updateStoresScrollMetrics]);

    // Handle horizontal wheel scrolling on the bottom scrollbar
    useEffect(() => {
        if (activeTab !== 'stores') return;
        const bottomEl = storesBottomScrollbarRef.current;
        if (!bottomEl) return;

        const handleBottomWheel = (e) => {
            if (e.deltaY !== 0 && e.deltaX === 0) {
                e.preventDefault();
                bottomEl.scrollLeft += e.deltaY;
            }
        };

        bottomEl.addEventListener('wheel', handleBottomWheel, { passive: false });
        return () => {
            bottomEl.removeEventListener('wheel', handleBottomWheel);
        };
    }, [isStoresScrollable, activeTab]);

    // Synchronize bottom scrollbar dragging with table
    const onStoresBottomScroll = (e) => {
        if (isSyncingStoresScroll.current) return;
        isSyncingStoresScroll.current = true;
        const scrollLeft = e.target.scrollLeft;

        if (storesTableContainerRef.current) {
            storesTableContainerRef.current.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => {
            isSyncingStoresScroll.current = false;
        });
    };

    // Synchronize table scrolling with bottom scrollbar
    const onStoresTableScroll = (e) => {
        if (isSyncingStoresScroll.current) return;
        isSyncingStoresScroll.current = true;
        const scrollLeft = e.target.scrollLeft;

        if (storesBottomScrollbarRef.current) {
            storesBottomScrollbarRef.current.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => {
            isSyncingStoresScroll.current = false;
        });
    };

    // ============================================================
    // STORE TARGETS: SINGLE BOTTOM HORIZONTAL SCROLLBAR SYNCHRONIZATION
    // ============================================================
    const targetsTableContainerRef = useRef(null);
    const filterRowRef = useRef(null);
    const bottomScrollbarRef = useRef(null);
    const isSyncingScroll = useRef(false);

    const [scrollContentWidth, setScrollContentWidth] = useState(0);
    const [isScrollable, setIsScrollable] = useState(false);

    const updateScrollMetrics = useCallback(() => {
        const tableEl = targetsTableContainerRef.current;
        const filterEl = filterRowRef.current;
        const bottomEl = bottomScrollbarRef.current;

        const tableScrollWidth = tableEl ? tableEl.scrollWidth : 0;
        const filterScrollWidth = filterEl ? filterEl.scrollWidth : 0;
        const maxWidth = Math.max(tableScrollWidth, filterScrollWidth);

        const clientWidth = bottomEl?.clientWidth || tableEl?.clientWidth || filterEl?.clientWidth || 0;

        setScrollContentWidth(maxWidth);
        setIsScrollable(maxWidth > (clientWidth + 2));
    }, []);

    useEffect(() => {
        if (activeTab !== 'targets') return;

        updateScrollMetrics();

        const observers = [];
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                updateScrollMetrics();
            });
            if (targetsTableContainerRef.current) ro.observe(targetsTableContainerRef.current);
            if (filterRowRef.current) ro.observe(filterRowRef.current);
            if (bottomScrollbarRef.current) ro.observe(bottomScrollbarRef.current);
            observers.push(ro);
        }

        const handleWindowResize = () => {
            updateScrollMetrics();
        };

        window.addEventListener('resize', handleWindowResize);
        const rafId = requestAnimationFrame(updateScrollMetrics);

        return () => {
            observers.forEach(obs => obs.disconnect());
            window.removeEventListener('resize', handleWindowResize);
            cancelAnimationFrame(rafId);
        };
    }, [activeTab, targetsView, filteredTargets.length, targetPage, targetsLoading, updateScrollMetrics]);

    // Handle horizontal wheel scrolling on the bottom scrollbar
    useEffect(() => {
        const bottomEl = bottomScrollbarRef.current;
        if (!bottomEl) return;

        const handleBottomWheel = (e) => {
            if (e.deltaY !== 0 && e.deltaX === 0) {
                e.preventDefault();
                bottomEl.scrollLeft += e.deltaY;
            }
        };

        bottomEl.addEventListener('wheel', handleBottomWheel, { passive: false });
        return () => {
            bottomEl.removeEventListener('wheel', handleBottomWheel);
        };
    }, [isScrollable, targetsView, activeTab]);

    // Synchronize bottom scrollbar dragging with table and filters
    const onBottomScroll = (e) => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        const scrollLeft = e.target.scrollLeft;

        if (targetsTableContainerRef.current) {
            targetsTableContainerRef.current.scrollLeft = scrollLeft;
        }
        if (filterRowRef.current && filterRowRef.current.scrollWidth > filterRowRef.current.clientWidth) {
            filterRowRef.current.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => {
            isSyncingScroll.current = false;
        });
    };

    // Synchronize table scrolling (via mouse-wheel/trackpad) with bottom scrollbar
    const onTableScroll = (e) => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        const scrollLeft = e.target.scrollLeft;

        if (bottomScrollbarRef.current) {
            bottomScrollbarRef.current.scrollLeft = scrollLeft;
        }
        if (filterRowRef.current && filterRowRef.current.scrollWidth > filterRowRef.current.clientWidth) {
            filterRowRef.current.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => {
            isSyncingScroll.current = false;
        });
    };

    // Synchronize filter row scrolling (if dragged or swiped)
    const onFilterScroll = (e) => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        const scrollLeft = e.target.scrollLeft;

        if (bottomScrollbarRef.current) {
            bottomScrollbarRef.current.scrollLeft = scrollLeft;
        }
        if (targetsTableContainerRef.current) {
            targetsTableContainerRef.current.scrollLeft = scrollLeft;
        }

        requestAnimationFrame(() => {
            isSyncingScroll.current = false;
        });
    };

    return (
        <PageContainer>
            <style>{`
                .store-targets-filter-row {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    flex-wrap: nowrap !important;
                    overflow-x: auto !important;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                .store-targets-filter-row::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .store-targets-table-scroll {
                    overflow-x: auto !important;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                .store-targets-table-scroll::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .store-targets-bottom-scrollbar {
                    scrollbar-width: thin !important;
                    scrollbar-color: #94a3b8 #f1f5f9 !important;
                }
                .store-targets-bottom-scrollbar::-webkit-scrollbar {
                    height: 9px !important;
                }
                .store-targets-bottom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9 !important;
                    border-radius: 8px !important;
                }
                .store-targets-bottom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1 !important;
                    border-radius: 8px !important;
                    border: 2px solid #f1f5f9 !important;
                }
                .store-targets-bottom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8 !important;
                }
                .stores-directory-table-scroll {
                    overflow-x: auto !important;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                .stores-directory-table-scroll::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .stores-directory-bottom-scrollbar {
                    scrollbar-width: thin !important;
                    scrollbar-color: #94a3b8 #f1f5f9 !important;
                }
                .stores-directory-bottom-scrollbar::-webkit-scrollbar {
                    height: 9px !important;
                }
                .stores-directory-bottom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9 !important;
                    border-radius: 8px !important;
                }
                .stores-directory-bottom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1 !important;
                    border-radius: 8px !important;
                    border: 2px solid #f1f5f9 !important;
                }
                .stores-directory-bottom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8 !important;
                }
            `}</style>
            {/* ======================================================= */}
            {/* VIEW 1: STORES DIRECTORY & BRANCH MANAGEMENT           */}
            {/* ======================================================= */}
            {activeTab === 'stores' && (
                <div>
                    {/* Header */}
                    <PageHeader
                        title="Stores Directory"
                        subtitle={
                            <span>
                                Manage branch locations, warehouses, staff and store details (<code>/api/v1/stores</code>)
                            </span>
                        }
                        icon={<BsShop />}
                        actions={
                            <>
                                <button
                                    onClick={fetchStores}
                                    disabled={storesLoading}
                                    className="adm-btn-secondary"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '10px 14px', borderRadius: 8,
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
                                    className="adm-btn-primary"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '10px 18px', borderRadius: 8,
                                        background: '#2563eb', border: 'none',
                                        color: '#fff', fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <BsPlus size={18} />
                                    <span>Add Store</span>
                                </button>
                            </>
                        }
                    />

                    {/* Notification Alerts for Stores Directory */}
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

                    {/* Stores KPI Overview Cards - Interactive Clickable Cards */}
                    <KpiGrid columns={4}>
                        <KpiCard
                            variant="revenue"
                            icon={<BsShop />}
                            title="Total Stores"
                            value={stores.length}
                            subtitle={storeKpiFilter === 'all' ? '● All registered stores' : 'Click to show all'}
                            tooltip={storeKpiFilter === 'all' ? "Showing all stores" : "Click to view all stores"}
                            active={storeKpiFilter === 'all'}
                            onClick={() => setStoreKpiFilter('all')}
                        />
                        <KpiCard
                            variant="profit"
                            icon={<BsCheckCircleFill />}
                            title="Active Branches"
                            value={stores.filter(s => s.is_active).length}
                            subtitle={storeKpiFilter === 'active' ? '● Filtering active outlets' : 'Operational outlets'}
                            tooltip={storeKpiFilter === 'active' ? "Click to remove filter" : "Click to filter active branches"}
                            active={storeKpiFilter === 'active'}
                            onClick={() => setStoreKpiFilter(prev => prev === 'active' ? 'all' : 'active')}
                        />
                        <KpiCard
                            variant="margin"
                            icon={<BsBuilding />}
                            title="Warehouses"
                            value={stores.filter(s => s.is_warehouse).length}
                            subtitle={storeKpiFilter === 'warehouse' ? '● Filtering warehouses' : 'Fulfillment & storage depots'}
                            tooltip={storeKpiFilter === 'warehouse' ? "Click to remove filter" : "Click to filter warehouses"}
                            active={storeKpiFilter === 'warehouse'}
                            onClick={() => setStoreKpiFilter(prev => prev === 'warehouse' ? 'all' : 'warehouse')}
                        />
                        <KpiCard
                            variant="customers"
                            icon={<BsStarFill />}
                            title="Primary Main Store"
                            value={stores.find(s => s.is_main)?.name || 'None Set'}
                            subtitle={storeKpiFilter === 'main' ? '● Filtering main store' : (stores.find(s => s.is_main) ? `Code: ${stores.find(s => s.is_main)?.code || 'MAIN'}` : 'Designate a main store')}
                            tooltip={storeKpiFilter === 'main' ? "Click to remove filter" : "Click to filter primary main store"}
                            active={storeKpiFilter === 'main'}
                            onClick={() => setStoreKpiFilter(prev => prev === 'main' ? 'all' : 'main')}
                        />
                    </KpiGrid>

                    {/* Filter and Search Bar (Requirement 10) */}
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: '14px 18px',
                        border: '1px solid #e2e8f0', marginBottom: 20,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 12
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                            {/* Search Store Name / Code */}
                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', height: 36, minWidth: 260, flex: '1 1 280px' }}>
                                <BsSearch size={14} color="#94a3b8" style={{ marginRight: 8, flexShrink: 0 }} />
                                <input
                                    type="text"
                                    value={storeSearch}
                                    onChange={e => setStoreSearch(e.target.value)}
                                    placeholder="Search by store name, code, city..."
                                    style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%' }}
                                />
                                {storeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setStoreSearch('')}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, padding: 0 }}
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Store Type Filter Dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Type:</span>
                                <select
                                    value={storeTypeFilter}
                                    onChange={e => setStoreTypeFilter(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        border: '1px solid #cbd5e1',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        outline: 'none',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        color: '#1e293b'
                                    }}
                                >
                                    <option value="all">All</option>
                                    <option value="retail">Retail</option>
                                    <option value="warehouse">Warehouse</option>
                                </select>
                            </div>

                            {/* Store Status Filter Dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Status:</span>
                                <select
                                    value={storeStatusFilter}
                                    onChange={e => setStoreStatusFilter(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        border: '1px solid #cbd5e1',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        outline: 'none',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        color: '#1e293b'
                                    }}
                                >
                                    <option value="all">All</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Active Card Filter Badge */}
                            {storeKpiFilter !== 'all' && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                                    <span>Card Filter: {storeKpiFilter === 'active' ? 'Active Branches' : storeKpiFilter === 'warehouse' ? 'Warehouses' : 'Primary Main Store'}</span>
                                    <button
                                        type="button"
                                        onClick={() => setStoreKpiFilter('all')}
                                        style={{ background: 'none', border: 'none', color: '#3730a3', cursor: 'pointer', padding: 0, fontWeight: 800, fontSize: 12 }}
                                        title="Clear card filter"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Reset Filters */}
                            {(storeSearch || storeTypeFilter !== 'all' || storeStatusFilter !== 'all' || storeCityFilter !== 'all' || storeKpiFilter !== 'all') && (
                                <button
                                    onClick={resetStoreFilters}
                                    style={{
                                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                        border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer'
                                    }}
                                    title="Reset all store filters"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>

                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            Showing {filteredStores.length} of {stores.length} store{stores.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    {/* Stores Table (Requirements 1 & 9: OD/ID column removed) */}
                    <div style={{
                        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                        <div
                            ref={storesTableContainerRef}
                            onScroll={onStoresTableScroll}
                            className="stores-directory-table-scroll"
                            style={{ overflowX: 'auto' }}
                        >
                            <table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ width: '32%', minWidth: 220, padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store Details</th>
                                        <th style={{ width: '18%', minWidth: 140, padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type / Role</th>
                                        <th style={{ width: '24%', minWidth: 180, padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</th>
                                        <th style={{ width: '12%', minWidth: 110, padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ width: '14%', minWidth: 160, padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStores.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                                                <BsShop size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>No Stores Found</div>
                                                <div style={{ fontSize: 12, marginTop: 4 }}>
                                                    {stores.length === 0
                                                        ? 'Click "Add Store" above to register a new store branch or warehouse.'
                                                        : 'No stores match the active filter criteria. Click "Reset Filters" to view all.'}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStores.map((store) => (
                                            <tr key={store.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                                                    <div>{store.phone || '—'}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{store.email || ''}</div>
                                                </td>

                                                <td style={{ padding: '14px 18px' }}>
                                                    <button
                                                        onClick={() => handleToggleStoreActive(store)}
                                                        disabled={togglingStoreId === store.id}
                                                        title={store.is_active ? 'Click to deactivate' : 'Click to activate'}
                                                        style={{
                                                            border: 'none', background: 'none', cursor: togglingStoreId === store.id ? 'wait' : 'pointer', padding: 0,
                                                            display: 'inline-flex', alignItems: 'center', gap: 6
                                                        }}
                                                    >
                                                        <span style={{
                                                            padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                            background: store.is_active ? '#ecfdf5' : '#f1f5f9',
                                                            color: store.is_active ? '#059669' : '#64748b'
                                                        }}>
                                                            {togglingStoreId === store.id ? 'Updating...' : store.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </button>
                                                </td>

                                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                    {/* Consistent Action Buttons (Requirement 2 & 11) */}
                                                    <div style={{ display: 'inline-flex', gap: 6 }}>
                                                        <button
                                                            onClick={() => openStoreDetails(store)}
                                                            title="View Store Details"
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

                                                        <button
                                                            onClick={() => handleToggleStoreActive(store)}
                                                            disabled={togglingStoreId === store.id}
                                                            title={store.is_active ? 'Deactivate Store' : 'Activate Store'}
                                                            style={{
                                                                padding: '6px 8px', borderRadius: 6,
                                                                border: store.is_active ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                                                                background: store.is_active ? '#fff7ed' : '#f0fdf4',
                                                                color: store.is_active ? '#ea580c' : '#16a34a',
                                                                cursor: togglingStoreId === store.id ? 'wait' : 'pointer'
                                                            }}
                                                        >
                                                            {store.is_active ? <BsToggleOn size={13} /> : <BsToggleOff size={13} />}
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

                    {/* Single Bottom Synchronized Horizontal Scrollbar for Stores Directory */}
                    <div
                        ref={storesBottomScrollbarRef}
                        onScroll={onStoresBottomScroll}
                        className="stores-directory-bottom-scrollbar"
                        style={{
                            width: '100%',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            marginTop: 12,
                            display: isStoresScrollable ? 'block' : 'none',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            padding: '3px 0',
                            boxSizing: 'border-box'
                        }}
                        title="Scroll horizontally to view all columns"
                    >
                        <div
                            style={{
                                width: storesScrollContentWidth,
                                height: 6,
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ======================================================= */}
            {/* VIEW 2: STORE TARGETS                                   */}
            {/* ======================================================= */}
            {activeTab === 'targets' && (
                <div>
                    {/* Header */}
                    <PageHeader
                        title="Store Targets"
                        subtitle="Manage revenue, orders and performance milestones across all stores"
                        icon={<BsBullseye />}
                        actions={
                            <>
                                <button
                                    onClick={fetchTargets}
                                    disabled={targetsLoading}
                                    className="adm-btn-secondary"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '10px 14px', borderRadius: 8,
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
                                    className="adm-btn-primary"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '10px 18px', borderRadius: 8,
                                        background: '#2563eb', border: 'none',
                                        color: '#fff', fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <BsPlus size={18} />
                                    <span>Create Target</span>
                                </button>
                            </>
                        }
                    />

                    {/* Notification Alerts for Store Targets */}
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

                    {/* Stats Overview - Interactive Clickable KPI Cards (Requirement 18) */}
                    <KpiGrid columns={4}>
                        <KpiCard
                            variant="revenue"
                            icon={<BsBullseye />}
                            title="Total Targets"
                            value={targets.length}
                            subtitle={targetKpiFilter === 'all' ? '● All configured targets' : 'Click to show all'}
                            tooltip={targetKpiFilter === 'all' ? "Showing all targets" : "Click to view all targets"}
                            active={targetKpiFilter === 'all'}
                            onClick={() => { setTargetKpiFilter('all'); setTargetsView('list'); setTargetPage(1); }}
                        />
                        <KpiCard
                            variant="profit"
                            icon={<BsClockHistory />}
                            title="Active Targets"
                            value={targets.filter(t => (t.status || 'active').toLowerCase() === 'active').length}
                            subtitle={targetKpiFilter === 'active' ? '● Filtering active targets' : 'Active milestones'}
                            tooltip={targetKpiFilter === 'active' ? "Click to remove filter" : "Click to filter active targets"}
                            active={targetKpiFilter === 'active'}
                            onClick={() => { setTargetKpiFilter(prev => prev === 'active' ? 'all' : 'active'); setTargetsView('list'); setTargetPage(1); }}
                        />
                        <KpiCard
                            variant="margin"
                            icon={<BsCashStack />}
                            title="Total Target Value"
                            value={`₹${displayTotalRevenueTarget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            subtitle={targetKpiFilter === 'revenue' ? '● Filtering revenue targets' : (targetsSummary?.overall_achievement_percentage ? `${targetsSummary.overall_achievement_percentage}% overall reached` : 'Sum of store goals')}
                            tooltip={targetKpiFilter === 'revenue' ? "Click to remove filter" : "Click to view revenue & sales targets"}
                            active={targetKpiFilter === 'revenue'}
                            onClick={() => { setTargetKpiFilter(prev => prev === 'revenue' ? 'all' : 'revenue'); setTargetsView('list'); setTargetPage(1); }}
                        />
                        <KpiCard
                            variant="customers"
                            icon={<BsTrophy />}
                            title="Completed Targets"
                            value={targets.filter(t => (t.status || '').toLowerCase() === 'completed').length}
                            subtitle={targetKpiFilter === 'completed' ? '● Filtering completed targets' : 'Fully reached milestones'}
                            tooltip={targetKpiFilter === 'completed' ? "Click to remove filter" : "Click to filter completed targets"}
                            active={targetKpiFilter === 'completed'}
                            onClick={() => { setTargetKpiFilter(prev => prev === 'completed' ? 'all' : 'completed'); setTargetsView('list'); setTargetPage(1); }}
                        />
                    </KpiGrid>

                    {/* Filter Bar & View Toggle - Single Horizontal Row (Requirement) */}
                    <div
                        ref={filterRowRef}
                        onScroll={onFilterScroll}
                        className="store-targets-filter-row"
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            padding: '14px 18px',
                            border: '1px solid #e2e8f0',
                            marginBottom: 20,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* 1. Search by store or type */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 8,
                            padding: '0 10px',
                            height: 38,
                            minWidth: 180,
                            maxWidth: 240,
                            flex: '1 1 200px',
                            boxSizing: 'border-box'
                        }}>
                            <BsSearch size={14} color="#94a3b8" style={{ marginRight: 8, flexShrink: 0 }} />
                            <input
                                value={targetSearch}
                                onChange={e => { setTargetSearch(e.target.value); setTargetPage(1); }}
                                placeholder="Search by store or type..."
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    outline: 'none',
                                    fontSize: 13,
                                    color: '#1e293b',
                                    width: '100%'
                                }}
                            />
                            {targetSearch && (
                                <button
                                    type="button"
                                    onClick={() => { setTargetSearch(''); setTargetPage(1); }}
                                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: 13 }}
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* 2. Period dropdown */}
                        <select
                            value={filterPeriod}
                            onChange={e => { setFilterPeriod(e.target.value); setTargetPage(1); }}
                            style={{
                                height: 38,
                                padding: '0 10px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#1e293b',
                                background: '#fff',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: 120,
                                flexShrink: 0,
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="all">All Periods</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="15_days">15 Days</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>

                        {/* 3. Status dropdown */}
                        <select
                            value={targetStatusFilter}
                            onChange={e => { setTargetStatusFilter(e.target.value); setTargetPage(1); }}
                            style={{
                                height: 38,
                                padding: '0 10px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#1e293b',
                                background: '#fff',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: 125,
                                flexShrink: 0,
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        {/* 4. Type dropdown */}
                        <select
                            value={targetTypeFilter}
                            onChange={e => { setTargetTypeFilter(e.target.value); setTargetPage(1); }}
                            style={{
                                height: 38,
                                padding: '0 10px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#1e293b',
                                background: '#fff',
                                outline: 'none',
                                cursor: 'pointer',
                                minWidth: 130,
                                flexShrink: 0,
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="all">All Types</option>
                            {TARGET_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        {/* Active Target Card Filter Badge */}
                        {targetKpiFilter !== 'all' && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#e0e7ff',
                                color: '#3730a3',
                                padding: '0 10px',
                                height: 38,
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                                boxSizing: 'border-box'
                            }}>
                                <span>Card: {targetKpiFilter === 'active' ? 'Active' : targetKpiFilter === 'revenue' ? 'Revenue' : 'Completed'}</span>
                                <button
                                    type="button"
                                    onClick={() => { setTargetKpiFilter('all'); setTargetPage(1); }}
                                    style={{ background: 'none', border: 'none', color: '#3730a3', cursor: 'pointer', padding: 0, fontWeight: 800, fontSize: 12 }}
                                    title="Clear card filter"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* Reset Filters */}
                        {(filterPeriod !== 'all' || targetStatusFilter !== 'all' || targetTypeFilter !== 'all' || targetSearch || targetKpiFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setTargetKpiFilter('all');
                                    setFilterPeriod('all');
                                    setTargetStatusFilter('all');
                                    setTargetTypeFilter('all');
                                    setTargetSearch('');
                                    setTargetPage(1);
                                }}
                                style={{
                                    height: 38,
                                    padding: '0 10px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#475569',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    boxSizing: 'border-box'
                                }}
                                title="Reset all filters"
                            >
                                Reset Filters
                            </button>
                        )}

                        {/* 5. Targets List / Leaderboard toggle */}
                        <div style={{
                            display: 'inline-flex',
                            background: '#f1f5f9',
                            padding: 3,
                            borderRadius: 8,
                            height: 38,
                            boxSizing: 'border-box',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <button
                                onClick={() => setTargetsView('list')}
                                style={{
                                    height: 32,
                                    padding: '0 12px',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: targetsView === 'list' ? '#fff' : 'transparent',
                                    color: targetsView === 'list' ? '#0f172a' : '#64748b',
                                    boxShadow: targetsView === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
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
                                    height: 32,
                                    padding: '0 12px',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: targetsView === 'leaderboard' ? '#fff' : 'transparent',
                                    color: targetsView === 'leaderboard' ? '#0f172a' : '#64748b',
                                    boxShadow: targetsView === 'leaderboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Leaderboard
                            </button>
                        </div>

                        {/* 6. Showing 13 targets count */}
                        <div style={{
                            fontSize: 13,
                            color: '#64748b',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            marginLeft: 'auto',
                            flexShrink: 0
                        }}>
                            Showing {filteredTargets.length} target{filteredTargets.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    {/* Targets Table / Leaderboard */}
                    {targetsView === 'leaderboard' ? (
                        <div style={{
                            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                            {/* Leaderboard Header without raw API URL (Requirement 16) */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsTrophy color="#f59e0b" size={18} />
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                                        Store Performance Leaderboard
                                    </h3>
                                </div>

                                {/* Leaderboard Filters (Requirement 17) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Period:</span>
                                        <select
                                            value={leaderboardPeriod}
                                            onChange={e => setLeaderboardPeriod(e.target.value)}
                                            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', background: '#fff' }}
                                        >
                                            <option value="all">All Periods</option>
                                            {PERIOD_OPTIONS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Target Type:</span>
                                        <select
                                            value={leaderboardTargetType}
                                            onChange={e => setLeaderboardTargetType(e.target.value)}
                                            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', background: '#fff' }}
                                        >
                                            <option value="all">All Types</option>
                                            {TARGET_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {(leaderboardPeriod !== 'all' || leaderboardTargetType !== 'all') && (
                                        <button
                                            onClick={() => {
                                                setLeaderboardPeriod('all');
                                                setLeaderboardTargetType('all');
                                            }}
                                            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div
                                ref={targetsTableContainerRef}
                                onScroll={onTableScroll}
                                className="store-targets-table-scroll"
                                style={{ overflowX: 'auto' }}
                            >
                                <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
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
                            <div
                                ref={targetsTableContainerRef}
                                onScroll={onTableScroll}
                                className="store-targets-table-scroll"
                                style={{ overflowX: 'auto' }}
                            >
                                <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
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
                                        {paginatedTargets.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                                                    <BsBullseye size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                                                    <div style={{ fontSize: 14, fontWeight: 600 }}>No Store Targets Found</div>
                                                    <div style={{ fontSize: 12, marginTop: 4 }}>
                                                        {targets.length === 0
                                                            ? 'Click "Create Target" above to configure your first target.'
                                                            : 'No targets match the active filter criteria. Click "Reset Filters" to view all.'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedTargets.map((item) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                                                    {/* Requirement 26: Date-only range display */}
                                                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748b' }}>
                                                        <div>{item.start_date ? item.start_date.slice(0, 10) : '—'}</div>
                                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>to {item.end_date ? item.end_date.slice(0, 10) : '—'}</div>
                                                    </td>
                                                    {/* Requirement 15: Status Mapping */}
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <span style={{
                                                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                            background:
                                                                (item.status || 'active').toLowerCase() === 'active' ? '#ecfdf5' :
                                                                    (item.status || '').toLowerCase() === 'completed' ? '#e0e7ff' :
                                                                        (item.status || '').toLowerCase() === 'cancelled' ? '#fef2f2' :
                                                                            '#f1f5f9',
                                                            color:
                                                                (item.status || 'active').toLowerCase() === 'active' ? '#059669' :
                                                                    (item.status || '').toLowerCase() === 'completed' ? '#4338ca' :
                                                                        (item.status || '').toLowerCase() === 'cancelled' ? '#dc2626' :
                                                                            '#64748b',
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

                            {/* Pagination Controls (Requirement 22: Display all records) */}
                            {filteredTargets.length > 0 && (
                                <div style={{
                                    padding: '12px 18px', borderTop: '1px solid #f1f5f9',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#f8fafc', fontSize: 12, color: '#64748b', flexWrap: 'wrap', gap: 10
                                }}>
                                    <div>
                                        Showing {filteredTargets.length === 0 ? 0 : (targetPage - 1) * targetPageSize + 1} to {Math.min(targetPage * targetPageSize, filteredTargets.length)} of {filteredTargets.length} targets
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <button
                                            disabled={targetPage <= 1}
                                            onClick={() => setTargetPage(prev => Math.max(1, prev - 1))}
                                            style={{
                                                padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                                                background: '#fff', cursor: targetPage <= 1 ? 'not-allowed' : 'pointer',
                                                opacity: targetPage <= 1 ? 0.5 : 1
                                            }}
                                        >
                                            Prev
                                        </button>
                                        <span style={{ fontWeight: 600, color: '#334155' }}>
                                            Page {targetPage} of {totalTargetPages}
                                        </span>
                                        <button
                                            disabled={targetPage >= totalTargetPages}
                                            onClick={() => setTargetPage(prev => Math.min(totalTargetPages, prev + 1))}
                                            style={{
                                                padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                                                background: '#fff', cursor: targetPage >= totalTargetPages ? 'not-allowed' : 'pointer',
                                                opacity: targetPage >= totalTargetPages ? 0.5 : 1
                                            }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Single Bottom Synchronized Horizontal Scrollbar */}
                    <div
                        ref={bottomScrollbarRef}
                        onScroll={onBottomScroll}
                        className="store-targets-bottom-scrollbar"
                        style={{
                            width: '100%',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            marginTop: 12,
                            display: isScrollable ? 'block' : 'none',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            padding: '3px 0',
                            boxSizing: 'border-box'
                        }}
                        title="Scroll horizontally to view all columns"
                    >
                        <div
                            style={{
                                width: scrollContentWidth,
                                height: 6,
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
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
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden', animation: 'fadeIn .2s ease-out', maxHeight: '92vh',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc', flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)', flexShrink: 0
                                }}>
                                    <BsShop size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                                        {editingStore ? 'Edit Store' : 'Add New Store'}
                                    </h3>
                                    <span style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'block' }}>
                                        {editingStore ? 'Update details and location for this branch' : 'Register a new store branch or warehouse location'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStoreModal(false)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#94a3b8', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', padding: 6, borderRadius: 8,
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}
                                title="Close modal"
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStore} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{
                                padding: '20px 24px',
                                overflowY: 'auto',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16
                            }}>
                                {/* Store Name (Full Width) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Store Name <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={storeFormData.name}
                                        onChange={e => {
                                            setStoreFormData({ ...storeFormData, name: e.target.value });
                                            if (storeFormErrors.name) setStoreFormErrors(prev => ({ ...prev, name: null }));
                                        }}
                                        placeholder="e.g. Phoenix Mall Branch"
                                        style={{
                                            width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                            border: `1px solid ${storeFormErrors.name ? '#ef4444' : '#cbd5e1'}`,
                                            fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                            background: '#fff', transition: 'border-color .15s ease'
                                        }}
                                    />
                                    {storeFormErrors.name && (
                                        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.name}</div>
                                    )}
                                </div>

                                {/* Store Code & Contact Phone (Equal 2 Columns) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Store Code
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={20}
                                            value={storeFormData.code}
                                            disabled={Boolean(editingStore)}
                                            onChange={e => {
                                                const codeVal = e.target.value.toUpperCase().slice(0, 20);
                                                setStoreFormData({ ...storeFormData, code: codeVal });
                                                if (storeFormErrors.code) setStoreFormErrors(prev => ({ ...prev, code: null }));
                                            }}
                                            placeholder="e.g. STR-MUM-01"
                                            style={{
                                                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.code ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                background: editingStore ? '#f8fafc' : '#fff',
                                                cursor: editingStore ? 'not-allowed' : 'text',
                                                transition: 'border-color .15s ease'
                                            }}
                                        />
                                        {storeFormErrors.code && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.code}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Contact Phone (10 digits)
                                        </label>
                                        <input
                                            type="tel"
                                            maxLength={10}
                                            value={storeFormData.phone}
                                            onChange={e => {
                                                const phoneVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setStoreFormData({ ...storeFormData, phone: phoneVal });
                                                if (storeFormErrors.phone) setStoreFormErrors(prev => ({ ...prev, phone: null }));
                                            }}
                                            placeholder="e.g. 9876543210"
                                            style={{
                                                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.phone ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                background: '#fff', transition: 'border-color .15s ease'
                                            }}
                                        />
                                        {storeFormErrors.phone && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.phone}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Store Email & GSTIN (Equal 2 Columns) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Store Email
                                        </label>
                                        <input
                                            type="email"
                                            maxLength={254}
                                            value={storeFormData.email}
                                            onChange={e => {
                                                setStoreFormData({ ...storeFormData, email: e.target.value });
                                                if (storeFormErrors.email) setStoreFormErrors(prev => ({ ...prev, email: null }));
                                            }}
                                            placeholder="store@example.com"
                                            style={{
                                                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.email ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                background: '#fff', transition: 'border-color .15s ease'
                                            }}
                                        />
                                        {storeFormErrors.email && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.email}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            GSTIN
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={15}
                                            value={storeFormData.gstin}
                                            onChange={e => {
                                                const gstinVal = e.target.value.toUpperCase().slice(0, 15);
                                                setStoreFormData({ ...storeFormData, gstin: gstinVal });
                                                if (storeFormErrors.gstin) setStoreFormErrors(prev => ({ ...prev, gstin: null }));
                                            }}
                                            placeholder="27AAPFU0939F1ZV"
                                            style={{
                                                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.gstin ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                textTransform: 'uppercase', background: '#fff', transition: 'border-color .15s ease'
                                            }}
                                        />
                                        {storeFormErrors.gstin && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.gstin}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Street Address (Full Width) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Street Address
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={250}
                                        value={storeFormData.address}
                                        onChange={e => {
                                            setStoreFormData({ ...storeFormData, address: e.target.value });
                                            if (storeFormErrors.address) setStoreFormErrors(prev => ({ ...prev, address: null }));
                                        }}
                                        placeholder="Shop 12, Ground Floor, Central Mall"
                                        style={{
                                            width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                            border: `1px solid ${storeFormErrors.address ? '#ef4444' : '#cbd5e1'}`,
                                            fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                            background: '#fff', transition: 'border-color .15s ease'
                                        }}
                                    />
                                    {storeFormErrors.address && (
                                        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.address}</div>
                                    )}
                                </div>

                                {/* State & District (Equal 2 Columns) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            State <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
                                        </label>
                                        <SearchableSelect
                                            value={storeFormData.state}
                                            onChange={(newState) => {
                                                setStoreFormData(prev => ({
                                                    ...prev,
                                                    state: newState,
                                                    district: '',
                                                    city: ''
                                                }));
                                                setIsCustomCity(false);
                                                setCustomCityName('');
                                                if (storeFormErrors.state) setStoreFormErrors(prev => ({ ...prev, state: null }));
                                                if (storeFormErrors.district) setStoreFormErrors(prev => ({ ...prev, district: null }));
                                                if (storeFormErrors.city) setStoreFormErrors(prev => ({ ...prev, city: null }));
                                                if (storeFormErrors.gstin) setStoreFormErrors(prev => ({ ...prev, gstin: null }));
                                            }}
                                            options={INDIAN_STATES}
                                            placeholder="-- Select State --"
                                            searchPlaceholder="Search Indian state..."
                                            hasError={Boolean(storeFormErrors.state)}
                                        />
                                        {storeFormErrors.state && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.state}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            District
                                        </label>
                                        <SearchableSelect
                                            value={storeFormData.district || ''}
                                            onChange={(newDistrict) => {
                                                setStoreFormData(prev => ({ ...prev, district: newDistrict }));
                                                if (storeFormErrors.district) setStoreFormErrors(prev => ({ ...prev, district: null }));
                                            }}
                                            options={availableDistricts}
                                            placeholder={storeFormData.state ? '-- Select District --' : '-- Select State First --'}
                                            searchPlaceholder="Search district..."
                                            disabled={!storeFormData.state}
                                            hasError={Boolean(storeFormErrors.district)}
                                            emptyMessage={storeFormData.state ? 'No districts found' : 'Please select state first'}
                                        />
                                        {storeFormErrors.district && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.district}</div>
                                        )}
                                    </div>
                                </div>

                                {/* City & Pincode (Equal 2 Columns) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            City
                                        </label>
                                        <SearchableSelect
                                            value={isCustomCity ? 'Other' : (storeFormData.city || '')}
                                            onChange={(val) => {
                                                if (val === 'Other') {
                                                    setIsCustomCity(true);
                                                    setStoreFormData(prev => ({ ...prev, city: 'Other' }));
                                                } else {
                                                    setIsCustomCity(false);
                                                    setCustomCityName('');
                                                    setStoreFormData(prev => ({ ...prev, city: val }));
                                                }
                                                if (storeFormErrors.city) setStoreFormErrors(prev => ({ ...prev, city: null }));
                                            }}
                                            options={availableCities}
                                            placeholder={storeFormData.state ? '-- Select City --' : '-- Select State First --'}
                                            searchPlaceholder="Search city / town..."
                                            allowOther={true}
                                            otherValue="Other"
                                            otherLabel="Other (Enter custom city)"
                                            disabled={!storeFormData.state}
                                            hasError={Boolean(storeFormErrors.city && !isCustomCity)}
                                            emptyMessage={storeFormData.state ? 'No predefined city found' : 'Please select state first'}
                                        />
                                        {!isCustomCity && storeFormErrors.city && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.city}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Pincode (6 digits)
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={storeFormData.pincode}
                                            onChange={e => {
                                                const pinVal = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setStoreFormData({ ...storeFormData, pincode: pinVal });
                                                if (storeFormErrors.pincode) setStoreFormErrors(prev => ({ ...prev, pincode: null }));
                                            }}
                                            placeholder="400001"
                                            style={{
                                                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.pincode ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                background: '#fff', transition: 'border-color .15s ease'
                                            }}
                                        />
                                        {storeFormErrors.pincode && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.pincode}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom City Input when 'Other' is selected (Full Width) */}
                                {isCustomCity && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Enter City Name <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={50}
                                            value={customCityName}
                                            onChange={e => {
                                                setCustomCityName(e.target.value);
                                                if (storeFormErrors.city) setStoreFormErrors(prev => ({ ...prev, city: null }));
                                            }}
                                            placeholder="Enter custom city name"
                                            style={{
                                                width: '100%', height: 40, padding: '0 12px', borderRadius: 8,
                                                border: `1px solid ${storeFormErrors.city ? '#ef4444' : '#cbd5e1'}`,
                                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                background: '#fff', transition: 'border-color .15s ease'
                                            }}
                                        />
                                        {storeFormErrors.city && (
                                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{storeFormErrors.city}</div>
                                        )}
                                    </div>
                                )}

                                {/* Checkboxes for Warehouse & Main */}
                                <div style={{ display: 'flex', gap: 24, marginTop: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                    <label style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={storeFormData.is_warehouse}
                                            onChange={e => setStoreFormData({ ...storeFormData, is_warehouse: e.target.checked })}
                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4f46e5' }}
                                        />
                                        <span>Warehouse Location</span>
                                    </label>

                                    {!editingStore && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                                fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={storeFormData.is_main}
                                                    onChange={e => setStoreFormData({ ...storeFormData, is_main: e.target.checked })}
                                                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4f46e5' }}
                                                />
                                                <span>Set as Primary Main Store</span>
                                            </label>
                                            {currentMainStore && storeFormData.is_main && (
                                                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 24 }}>
                                                    Note: Setting this as primary will replace &ldquo;{currentMainStore.name}&rdquo;.
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pinned Modal Footer */}
                            <div style={{
                                padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexShrink: 0
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowStoreModal(false)}
                                    style={{
                                        height: 40, padding: '0 20px', borderRadius: 8,
                                        border: '1px solid #cbd5e1', background: '#fff',
                                        fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={storeFormSubmitting}
                                    style={{
                                        height: 40, padding: '0 24px', borderRadius: 8,
                                        border: 'none', background: '#4f46e5',
                                        fontSize: 13, fontWeight: 700, color: '#fff',
                                        cursor: storeFormSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: storeFormSubmitting ? 0.7 : 1,
                                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={e => { if (!storeFormSubmitting) e.currentTarget.style.background = '#4338ca'; }}
                                    onMouseLeave={e => { if (!storeFormSubmitting) e.currentTarget.style.background = '#4f46e5'; }}
                                >
                                    {storeFormSubmitting ? (
                                        <>
                                            <BsHourglassSplit size={14} className="spin-anim" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <BsCheckCircleFill size={14} />
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
                                        Code: {detailStore.code || 'N/A'}
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
                                            <div><strong style={{ color: '#64748b' }}>City / State:</strong> {[detailStore.city, detailStore.district, detailStore.state].filter(Boolean).join(', ') || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>Pincode:</strong> {detailStore.pincode || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>Phone:</strong> {detailStore.phone || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>Email:</strong> {detailStore.email || '—'}</div>
                                            <div><strong style={{ color: '#64748b' }}>GSTIN:</strong> {detailStore.gstin || '—'}</div>
                                        </div>
                                    </div>

                                    {/* 2. Real-time KPI & Summary */}
                                    {storeSummary && (
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                                Store KPI & Performance Snapshot
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

                                    {/* 3. Stock & Valuation Summary */}
                                    {storeInventorySummary && (
                                        <div>
                                            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                                Stock & Valuation Summary
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

                                    {/* 4. Assigned Store Staff */}
                                    <div>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px', textTransform: 'uppercase' }}>
                                            Assigned Staff ({storeStaff.length})
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
                                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {storeStaff.map(member => (
                                                            <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{member.full_name}</td>
                                                                <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{member.role}</td>
                                                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{member.email}</td>
                                                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{member.phone || '—'}</td>
                                                                <td style={{ padding: '8px 12px' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
                                                                        background: member.is_active ? '#ecfdf5' : '#f1f5f9',
                                                                        color: member.is_active ? '#059669' : '#64748b'
                                                                    }}>
                                                                        {member.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </td>
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
                            Are you sure you want to delete this store target ({targetToDelete.target_type} target for {targetToDelete.store_name || 'Store'})?
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
                                        {editingTarget ? 'Edit Store Target' : 'Create Store Target'}
                                    </h3>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        {editingTarget ? 'Update performance goals for this store' : 'Set milestone and performance goals for a store'}
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
                                {/* Store Selection (Requirement 24) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Target Store <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
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
                                        <option value="">Select a Store</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.city || 'No city'}) {s.is_main ? '⭐' : ''}
                                            </option>
                                        ))}
                                    </select>
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

                                {/* Date Range (Start Date & End Date) (Requirement 26) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Start Date <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={toDateOnly(targetFormData.start_date)}
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
                                            End Date <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            min={targetFormData.start_date ? toDateOnly(targetFormData.start_date) : undefined}
                                            value={toDateOnly(targetFormData.end_date)}
                                            onChange={e => setTargetFormData({ ...targetFormData, end_date: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 10px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 12, outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Status for both Create and Edit (Requirement 23) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Status
                                    </label>
                                    <select
                                        value={targetFormData.status || 'active'}
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
        </PageContainer>
    );
};

export default Stores;
