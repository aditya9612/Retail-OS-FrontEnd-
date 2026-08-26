// Customer Directory Page - Updated for testing
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { State, City } from 'country-state-city';
import {
    BsSearch, BsDownload, BsPeopleFill, BsPhone, BsGeoAlt,
    BsCalendar, BsCurrencyRupee, BsCartCheck, BsStarFill,
    BsChevronLeft, BsChevronRight, BsCheckCircleFill, BsXCircleFill,
    BsWallet2, BsChatText, BsJournalText, BsShare,
    BsFunnel, BsGift, BsTrophy, BsGraphUp,
    BsPlus, BsEye, BsPencilSquare, BsTrash,
} from 'react-icons/bs';
import {
    getCustomers,
    createCustomer,
    getCustomerById,
    updateCustomer,
    updateCustomerStatus,
    // deleteCustomer,
    getCustomerStats,
    getBirthdayCustomers,
    getReferrals,
    getFeedback,
    getCommunications,
    getNotes,
    getTopCustomers,
    getRetentionReport,
    getLifetimeValue,
    getLoyaltyReport,
    getCustomerLoyalty,
    getCustomerWallet,
    getWalletTransactions,
    getLoyaltyHistory,
} from '../../services/customer';
import CustomerDetailPanel from '../../components/customers/CustomerDetailPanel';
import ExportDirectoryModal from '../../components/customers/ExportDirectoryModal';
import {
    fmt,
    normalizeApiList,
    formatCustomerRecord,
    getApiErrorMessage,
    formatAnalyticsVal,
} from '../../components/customers/customerHelpers';

const PAGE_SIZE = 8;

const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const fieldErrorStyle = {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
};

const validateCustomerName = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return 'Customer name is required';
    if (trimmed.length < 2) return 'Name must be at least 2 characters';
    if (!NAME_PATTERN.test(trimmed)) return 'Name can only contain letters and spaces';
    return '';
};

const validateCustomerEmail = (email) => {
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required';
    if (/[\s,]/.test(trimmed)) return 'Email cannot contain spaces or commas';
    if (!EMAIL_PATTERN.test(trimmed)) return 'Please enter a valid email address';
    return '';
};

const validateCustomerBirthday = (birthday) => {
    if (!birthday) return '';
    if (birthday > getTodayDateString()) return 'Birthday cannot be in the future';
    return '';
};

const validateCustomerForm = ({ name, email, birthday }) => {
    const errors = {};
    const nameError = validateCustomerName(name);
    const emailError = validateCustomerEmail(email);
    const birthdayError = validateCustomerBirthday(birthday);

    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;
    if (birthdayError) errors.birthday = birthdayError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5' },
    Inactive: { color: '#9ca3af', bg: '#f3f4f6' },
    Blocked: { color: '#ef4444', bg: '#fef2f2' },
};

const typeCfg = {
    Regular: { color: '#6366f1', bg: '#eef2ff' },
    Wholesale: { color: '#8b5cf6', bg: '#f5f3ff' },
    VIP: { color: '#8b5cf6', bg: '#f5f3ff' },
};

// Professional Active / Inactive Toggle Switch Component (Exactly per reference UI)
const CustomerStatusToggle = ({ isActive, onToggle }) => {
    const activeColor = '#10b981';
    const inactiveColor = '#ef4444';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label={isActive ? 'Active' : 'Inactive'}
            onClick={onToggle}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px 4px 4px',
                borderRadius: 999,
                border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                background: isActive ? '#ecfdf5' : '#fef2f2',
                cursor: 'pointer',
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

            {/* <span
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? activeColor : inactiveColor,
                    userSelect: 'none',
                }}
            >
                {isActive ? 'Active' : 'Inactive'}
            </span> */}
        </button>
    );
};

const KpiSkeleton = () => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', minHeight: 88 }}>
        <div style={{ width: '50%', height: 12, background: '#f3f4f6', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ width: '40%', height: 24, background: '#eef2ff', borderRadius: 6 }} />
    </div>
);

const TableRowSkeleton = () => (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
        {Array.from({ length: 9 }).map((_, i) => (
            <td key={i} style={{ padding: '14px 16px' }}>
                <div style={{ height: 16, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
            </td>
        ))}
    </tr>
);


const AddCustomerModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        stateCode: '',
        type: '',
        credit: '',
        birthday: '',
    });
    const [errors, setErrors] = useState({});

    const indianStates = State.getStatesOfCountry('IN');

    const availableCities = form.stateCode
        ? City.getCitiesOfState('IN', form.stateCode)
        : [];


    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'stateCode') {
            const selectedState = indianStates.find(
                state => state.isoCode === value
            );

            setForm(prev => ({
                ...prev,
                stateCode: value,
                state: selectedState?.name || '',
                city: '',
            }));

            return;
        }

        if (name === 'phone') {
            const onlyNumbers = value.replace(/\D/g, '').slice(0, 10);

            setForm(prev => ({
                ...prev,
                phone: onlyNumbers,
            }));

            return;
        }

        setForm(prev => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !form.name.trim() ||
            !form.email.trim() ||
            !form.phone.trim() ||
            !form.stateCode ||
            !form.state.trim() ||
            !form.city.trim() ||
            !form.type
        ) {
            alert('Please fill all required fields');
            return;
        }

        const validation = validateCustomerForm({
            name: form.name,
            email: form.email,
            birthday: form.birthday,
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setErrors({});


        const customerData = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            address: `${form.city.trim()}, ${form.state.trim()}`,
            birthday: form.birthday || null,
            whatsapp_opt_in: false,
            sms_opt_in: false,
            status: 'active',
            segment: form.type,
        };

        try {
            await createCustomer(customerData);

            alert('Customer created successfully!');

            if (onCreated) {
                await onCreated();
            }

            onClose();
        } catch (err) {
            console.error('Create customer failed:', err);
            alert(getApiErrorMessage(err, 'Unable to create customer. Backend server may not be available.'));
        }
    };

    const labelStyle = {
        display: 'block',
        fontSize: 12,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 6,
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div
                className="ec-modal"
                style={{ maxWidth: 560 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="ec-modal-header">
                    <div>
                        <h3
                            style={{
                                fontWeight: 700,
                                fontSize: 17,
                                color: '#111827',
                            }}
                        >
                            Add Customer
                        </h3>

                        <p
                            style={{
                                fontSize: 12,
                                color: '#9ca3af',
                                marginTop: 3,
                            }}
                        >
                            Enter the customer details below
                        </p>
                    </div>

                    <button
                        type="button"
                        className="ec-modal-close"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 14,
                        }}
                    >
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>
                                Customer Name *
                            </label>

                            <input
                                className="ec-input"
                                type="text"
                                name="name"
                                placeholder="Enter customer name"
                                value={form.name}
                                onChange={handleChange}
                            />
                            {errors.name && (
                                <p style={fieldErrorStyle}>{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>Email *</label>

                            <input
                                className="ec-input"
                                type="email"
                                name="email"
                                placeholder="Enter email"
                                value={form.email}
                                onChange={handleChange}
                                autoComplete="email"
                                required
                            />
                            {errors.email && (
                                <p style={fieldErrorStyle}>{errors.email}</p>
                            )}
                        </div>



                        <div>
                            <label style={labelStyle}>Phone *</label>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="ec-input"
                                    type="text"
                                    value="+91"
                                    disabled
                                    style={{
                                        width: 70,
                                        textAlign: 'center',
                                        background: '#f3f4f6',
                                    }}
                                />

                                <input
                                    className="ec-input"
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter 10 digit mobile number"
                                    value={form.phone}
                                    onChange={handleChange}
                                    maxLength={10}
                                    inputMode="numeric"
                                    pattern="[6-9][0-9]{9}"
                                    required
                                />
                            </div>
                        </div>



                        {/* State */}
                        <div>
                            <label style={labelStyle}>State *</label>

                            <select
                                className="ec-input"
                                name="stateCode"
                                value={form.stateCode}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select State</option>

                                {indianStates.map(state => (
                                    <option
                                        key={state.isoCode}
                                        value={state.isoCode}
                                    >
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* City */}
                        <div>
                            <label style={labelStyle}>City *</label>

                            <select
                                className="ec-input"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                disabled={!form.stateCode}
                                required
                            >
                                <option value="">
                                    {form.stateCode
                                        ? 'Select City'
                                        : 'Select State First'}
                                </option>

                                {availableCities.map(city => (
                                    <option
                                        key={`${city.name}-${city.latitude}-${city.longitude}`}
                                        value={city.name}
                                    >
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>
                                Customer Type *
                            </label>

                            <select
                                className="ec-input"
                                name="type"
                                value={form.type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Customer Type</option>
                                <option value="new">New</option>
                                <option value="regular">Regular</option>
                                <option value="vip">VIP</option>
                                <option value="wholesale">Wholesale</option>
                                <option value="new">New</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>
                                Credit Limit
                            </label>

                            <input
                                className="ec-input"
                                type="number"
                                min="0"
                                name="credit"
                                placeholder="Enter credit limit"
                                value={form.credit}
                                onChange={handleChange}
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>
                                Birthday
                            </label>

                            <input
                                className="ec-input"
                                type="date"
                                name="birthday"
                                value={form.birthday}
                                onChange={handleChange}
                                max={getTodayDateString()}
                            />
                            {errors.birthday && (
                                <p style={fieldErrorStyle}>{errors.birthday}</p>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            marginTop: 24,
                        }}
                    >
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="adm-btn-primary"
                        >
                            Add Customer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditCustomerModal = ({
    customer,
    setCustomer,
    updating,
    onClose,
    onSave,
    errors = {},
    onClearError,
}) => {
    const indianStates = State.getStatesOfCountry('IN');

    const availableCities = customer?.stateCode
        ? City.getCitiesOfState('IN', customer.stateCode)
        : [];

    const labelStyle = {
        display: 'block',
        fontSize: 12,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 6,
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'stateCode') {
            const selectedState = indianStates.find(
                state => state.isoCode === value
            );

            setCustomer(prev => ({
                ...prev,
                stateCode: value,
                state: selectedState?.name || '',
                city: '',
            }));

            return;
        }

        if (name === 'phone') {
            const onlyNumbers = value
                .replace(/\D/g, '')
                .slice(0, 10);

            setCustomer(prev => ({
                ...prev,
                phone: onlyNumbers,
            }));

            return;
        }

        setCustomer(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        if (onClearError && errors[name]) {
            onClearError(name);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div
                className="ec-modal"
                style={{ maxWidth: 560 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="ec-modal-header">
                    <div>
                        <h3
                            style={{
                                fontWeight: 700,
                                fontSize: 17,
                                color: '#111827',
                            }}
                        >
                            Edit Customer
                        </h3>

                        <p
                            style={{
                                fontSize: 12,
                                color: '#9ca3af',
                                marginTop: 3,
                            }}
                        >
                            Update the customer details below
                        </p>
                    </div>

                    <button
                        type="button"
                        className="ec-modal-close"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={onSave}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 14,
                        }}
                    >
                        {/* Customer Name */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>
                                Customer Name *
                            </label>

                            <input
                                className="ec-input"
                                type="text"
                                name="name"
                                placeholder="Enter customer name"
                                value={customer?.name || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.name && (
                                <p style={fieldErrorStyle}>{errors.name}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label style={labelStyle}>
                                Email *
                            </label>

                            <input
                                className="ec-input"
                                type="email"
                                name="email"
                                placeholder="Enter email"
                                value={customer?.email || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.email && (
                                <p style={fieldErrorStyle}>{errors.email}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label style={labelStyle}>
                                Phone *
                            </label>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                }}
                            >
                                <input
                                    className="ec-input"
                                    type="text"
                                    value="+91"
                                    disabled
                                    style={{
                                        width: 70,
                                        textAlign: 'center',
                                        background: '#f3f4f6',
                                    }}
                                />

                                <input
                                    className="ec-input"
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter 10 digit mobile number"
                                    value={customer?.phone || ''}
                                    onChange={handleChange}
                                    maxLength={10}
                                    inputMode="numeric"
                                    pattern="[6-9][0-9]{9}"
                                    required
                                />
                            </div>
                        </div>

                        {/* State */}
                        <div>
                            <label style={labelStyle}>
                                State *
                            </label>

                            <select
                                className="ec-input"
                                name="stateCode"
                                value={customer?.stateCode || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Select State
                                </option>

                                {indianStates.map(state => (
                                    <option
                                        key={state.isoCode}
                                        value={state.isoCode}
                                    >
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* City */}
                        <div>
                            <label style={labelStyle}>
                                City *
                            </label>

                            <select
                                className="ec-input"
                                name="city"
                                value={customer?.city || ''}
                                onChange={handleChange}
                                disabled={!customer?.stateCode}
                                required
                            >
                                <option value="">
                                    {customer?.stateCode
                                        ? 'Select City'
                                        : 'Select State First'}
                                </option>

                                {availableCities.map(city => (
                                    <option
                                        key={`${city.name}-${city.latitude}-${city.longitude}`}
                                        value={city.name}
                                    >
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Birthday */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>
                                Birthday
                            </label>

                            <input
                                className="ec-input"
                                type="date"
                                name="birthday"
                                value={customer?.birthday || ''}
                                onChange={handleChange}
                                max={getTodayDateString()}
                            />
                            {errors.birthday && (
                                <p style={fieldErrorStyle}>{errors.birthday}</p>
                            )}
                        </div>

                        {/* Opt-in options */}
                        <div
                            style={{
                                gridColumn: '1 / -1',
                                display: 'flex',
                                gap: 24,
                                marginTop: 2,
                            }}
                        >
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#374151',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    name="whatsappOptIn"
                                    checked={
                                        customer?.whatsappOptIn || false
                                    }
                                    onChange={handleChange}
                                />

                                WhatsApp Opt-in
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#374151',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    name="smsOptIn"
                                    checked={
                                        customer?.smsOptIn || false
                                    }
                                    onChange={handleChange}
                                />

                                SMS Opt-in
                            </label>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            marginTop: 24,
                        }}
                    >
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={onClose}
                            disabled={updating}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="adm-btn-primary"
                            disabled={updating}
                        >
                            {updating
                                ? 'Saving...'
                                : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Send Marketing Campaign Modal
const SendCampaignModal = ({ customers = [], onClose }) => {
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [communicationType, setCommunicationType] = useState('sms');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerList, setCustomerList] = useState(customers);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    useEffect(() => {
        if (!customers || customers.length === 0) {
            setLoadingCustomers(true);
            getCustomers()
                .then(res => {
                    const list = normalizeApiList(res);
                    setCustomerList(list.map(c => formatCustomerRecord(c)));
                })
                .catch(err => console.error('Error loading customers for campaign:', err))
                .finally(() => setLoadingCustomers(false));
        } else {
            setCustomerList(customers);
        }
    }, [customers]);

    const getCustomerId = (c) => {
        if (c.backendId !== undefined && c.backendId !== null) return Number(c.backendId);
        if (typeof c.id === 'number') return c.id;
        const parsed = parseInt(String(c.id).replace(/\D/g, ''), 10);
        return Number.isNaN(parsed) ? c.id : parsed;
    };

    const handleToggleCustomer = (id) => {
        setSelectedCustomerIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredList = useMemo(() => {
        if (!customerSearch.trim()) return customerList;
        const q = customerSearch.toLowerCase();
        return customerList.filter(c => (
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q))
        ));
    }, [customerList, customerSearch]);

    const allFilteredSelected = filteredList.length > 0 && filteredList.every(c => {
        const id = getCustomerId(c);
        return selectedCustomerIds.includes(id);
    });

    const handleToggleSelectAll = () => {
        if (allFilteredSelected) {
            const filteredIds = new Set(filteredList.map(c => getCustomerId(c)));
            setSelectedCustomerIds(prev => prev.filter(id => !filteredIds.has(id)));
        } else {
            const filteredIds = filteredList.map(c => getCustomerId(c));
            setSelectedCustomerIds(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedCustomerIds.length === 0) {
            alert('Please select at least one customer.');
            return;
        }
        if (!message.trim()) {
            alert('Please enter a campaign message.');
            return;
        }

        setSubmitting(true);
        try {
            await sendCampaign({
                customer_ids: selectedCustomerIds,
                communication_type: communicationType,
                message: message.trim(),
            });
            alert('Marketing campaign sent successfully!');
            onClose();
        } catch (err) {
            console.error('Send campaign error:', err);
            alert(getApiErrorMessage(err, 'Failed to send marketing campaign.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>Send Marketing Campaign</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>Blast promotional SMS, WhatsApp, or Email campaigns to selected customers</p>
                    </div>
                    <button type="button" className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Select Customers */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Select Customers *</label>
                                {selectedCustomerIds.length > 0 && (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
                                        {selectedCustomerIds.length} selected
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <input
                                    className="ec-input"
                                    type="text"
                                    placeholder="Search customers..."
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                />
                                <button
                                    type="button"
                                    className="adm-btn-secondary"
                                    onClick={handleToggleSelectAll}
                                    style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
                                >
                                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            <div style={{
                                maxHeight: 150,
                                overflowY: 'auto',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                padding: '6px 8px',
                                background: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                            }}>
                                {loadingCustomers ? (
                                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, padding: 8, textAlign: 'center' }}>Loading customers...</p>
                                ) : filteredList.length === 0 ? (
                                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, padding: 8, textAlign: 'center' }}>No customers found</p>
                                ) : (
                                    filteredList.map(c => {
                                        const id = getCustomerId(c);
                                        const isChecked = selectedCustomerIds.includes(id);
                                        return (
                                            <label
                                                key={id || c.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '5px 8px',
                                                    borderRadius: 6,
                                                    background: isChecked ? '#eef2ff' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s ease',
                                                    fontSize: 12
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleCustomer(id)}
                                                    style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                                />
                                                <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
                                                {c.email && <span style={{ color: '#6b7280', fontSize: 11 }}>({c.email})</span>}
                                                {c.phone && !c.email && <span style={{ color: '#6b7280', fontSize: 11 }}>({c.phone})</span>}
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Communication Channel */}
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Communication Channel *</label>
                            <select className="ec-input" value={communicationType} onChange={e => setCommunicationType(e.target.value)}>
                                <option value="sms">SMS</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                            </select>
                        </div>

                        {/* Campaign Message */}
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Campaign Message *</label>
                            <textarea className="ec-input" rows={4} placeholder="Enter your campaign announcement or offer code details..." value={message} onChange={e => setMessage(e.target.value)} required style={{ width: '100%', resize: 'vertical' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting || selectedCustomerIds.length === 0 || !message.trim()}>
                            {submitting ? 'Sending Campaign...' : '🚀 Send Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [customers, setCustomers] = useState(CUSTOMERS);
    // const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [customerStats, setCustomerStats] = useState(null);
    const [birthdayCustomers, setBirthdayCustomers] = useState([]);
    const [customerInsights, setCustomerInsights] = useState({});

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterCity, setFilterCity] = useState('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailExtras, setDetailExtras] = useState({});
    const [viewLoading, setViewLoading] = useState(false);

    // Initial Load: Loads CRM Overview APIs once on page mount
    const loadCrmDashboard = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError('');

        const [
            customersRes,
            statsRes,
            birthdaysRes,
            topCustRes,
            retentionRes,
            ltvRes,
            loyaltyRepRes,
            referralsRes,
            commsRes,
            notesRes,
        ] = await Promise.allSettled([
            getCustomers(),
            getCustomerStats(),
            getBirthdayCustomers(),
            getTopCustomers(),
            getRetentionReport(),
            getLifetimeValue(),
            getLoyaltyReport(),
            getReferrals(),
            getCommunications(),
            getNotes(),
        ]);

        if (customersRes.status === 'fulfilled') {
            const list = normalizeApiList(customersRes.value);
            setCustomers(list.map(c => formatCustomerRecord(c)));
        } else {
            setError('Unable to load customer directory.');
        }

        if (statsRes.status === 'fulfilled') setCustomerStats(statsRes.value);
        if (birthdaysRes.status === 'fulfilled') setBirthdayCustomers(normalizeApiList(birthdaysRes.value));

        setCustomerInsights({
            topCustomers: topCustRes.status === 'fulfilled' ? topCustRes.value : null,
            retention: retentionRes.status === 'fulfilled' ? retentionRes.value : null,
            lifetimeValue: ltvRes.status === 'fulfilled' ? ltvRes.value : null,
            loyaltyReport: loyaltyRepRes.status === 'fulfilled' ? loyaltyRepRes.value : null,
            referrals: referralsRes.status === 'fulfilled' ? referralsRes.value : null,
            communications: commsRes.status === 'fulfilled' ? commsRes.value : null,
            notes: notesRes.status === 'fulfilled' ? notesRes.value : null,
        });

        if (showLoader) setLoading(false);
    };

    useEffect(() => {
        loadCrmDashboard();
    }, []);

    // ON-DEMAND: Loaded ONLY when clicking Eye icon
    const handleViewCustomerProfile = async (backendId) => {
        const localCust = customers.find(c => c.backendId === backendId);
        if (localCust) setSelectedCustomer(localCust);

        setViewLoading(true);
        setDetailExtras({});

        try {
            const [
                custDetailsRes,
                walletRes,
                walletTxRes,
                loyaltyRes,
                loyaltyHistRes,
                notesRes,
                commsRes,
            ] = await Promise.allSettled([
                getCustomerById(backendId),
                getCustomerWallet(backendId),
                getWalletTransactions(backendId),
                getCustomerLoyalty(backendId),
                getLoyaltyHistory(backendId),
                getNotes({ customer_id: backendId }),
                getCommunications({ customer_id: backendId }),
            ]);

            let fullRecord = localCust;
            const walletData = walletRes.status === 'fulfilled' ? walletRes.value : null;
            const loyaltyData = loyaltyRes.status === 'fulfilled' ? loyaltyRes.value : null;

            if (custDetailsRes.status === 'fulfilled') {
                const raw = custDetailsRes.value;
                fullRecord = formatCustomerRecord({
                    ...raw,
                    wallet_balance: walletData?.balance ?? walletData?.wallet_balance ?? raw.wallet_balance,
                    loyalty_points: loyaltyData?.points ?? loyaltyData?.loyalty_points ?? raw.loyalty_points,
                });
                setSelectedCustomer(fullRecord);
            }

            setDetailExtras({
                wallet: walletData,
                walletTransactions: walletTxRes.status === 'fulfilled' ? walletTxRes.value : null,
                loyalty: loyaltyData,
                loyaltyHistory: loyaltyHistRes.status === 'fulfilled' ? loyaltyHistRes.value : null,
                notes: notesRes.status === 'fulfilled' ? notesRes.value : null,
                communications: commsRes.status === 'fulfilled' ? commsRes.value : null,
            });
        } catch (err) {
            console.error('Failed to load customers:', err);
            setError('Unable to load customers. Please try again.');
        } finally {
            setViewLoading(false);
        }
    };

    // // Handler for DELETE button (Preserves icon UI, updates frontend state for UI testing)
    // const handleDeleteCustomer = (customer) => {
    //     if (!window.confirm(`Are you sure you want to delete customer profile "${customer.name}"?`)) return;

    // TODO:
    // Uncomment and connect the Delete Customer API
    // once the backend endpoint is finalized.
    // await deleteCustomer(customer.backendId);

    //     console.log(`[UI DELETE] Customer removed from state for backendId: ${customer.backendId}`);
    //     setCustomers(prev => prev.filter(c => c.backendId !== customer.backendId));
    //     if (selectedCustomer?.backendId === customer.backendId) setSelectedCustomer(null);
    // };

    // Handler for ACTIVE / INACTIVE Toggle Switch (Calls PATCH /api/v1/customers/{customer_id}/status)
    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

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
            // Rollback UI on error
            setCustomers(prev => prev.map(c => (c.backendId === id || c.id === id) ? { ...c, status: currentStatus } : c));
            if (selectedCustomer?.backendId === id || selectedCustomer?.id === id) {
                setSelectedCustomer(prev => prev ? { ...prev, status: currentStatus } : prev);
            }
            alert(getApiErrorMessage(err, 'Failed to update customer status.'));
        }
    };

    const availableCities = useMemo(() => Array.from(new Set(customers.map(c => c.city).filter(Boolean))), [customers]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const query = search.trim().toLowerCase();
            const matchesSearch = !query ||
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone.includes(query) ||
                c.city.toLowerCase().includes(query) ||
                c.id.toLowerCase().includes(query);

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

    const totalCustomers = customerStats?.total ?? customers.length;
    const activeCustomers = customerStats?.active ?? customers.filter(c => c.status === 'Active').length;
    const inactiveCustomers = customers.filter(c => c.status === 'Inactive' || c.status === 'Blocked').length;
    const vipCustomers = customers.filter(c => c.type === 'VIP').length;

    const topSpenderObj = useMemo(() => {
        if (customers.length === 0) return { name: '—', amount: 0 };
        const top = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0];
        return { name: top.name, amount: top.totalSpent || 0 };
    }, [customers]);

    const referralsList = normalizeApiList(customerInsights.referrals);
    const commsList = normalizeApiList(customerInsights.communications);
    const notesList = normalizeApiList(customerInsights.notes);

    // Uniform analytics card styling (Fixed 190px height, no vertical expansion)
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
        <div className="dash-page" style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="adm-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, fontSize: 20 }}>
                            <BsPeopleFill />
                        </span>
                        Customer Directory
                    </h1>
                    <p className="adm-page-sub">Manage customer relationships, loyalty, wallets, engagement and profiles.</p>
                </div>

                <div className="adm-header-actions" style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => setShowExportModal(true)}
                    >
                        <BsDownload size={14} /> Export Directory
                    </button>

                    <button
                        type="button"
                        className="adm-btn-primary"
                        onClick={() => setShowAddModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsPlus size={18} /> Add Customer
                    </button>
                </div>
            </div>

            {/* 5 KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
                {loading ? (
                    <>
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                    </>
                ) : (
                    <>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total CRM Contacts</p>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 6, margin: 0 }}>{totalCustomers}</p>
                            <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Directory profiles</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Active Customers</p>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 6, margin: 0 }}>{activeCustomers}</p>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>High engagement</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Inactive / Blocked</p>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 6, margin: 0 }}>{inactiveCustomers}</p>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Requires outreach</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>VIP Segment</p>
                            <p style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 6, margin: 0 }}>{vipCustomers}</p>
                            <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Premium members</span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Top Spender</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', marginTop: 6, margin: 0 }}>{fmt(topSpenderObj.amount)}</p>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{topSpenderObj.name}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Birthday Reminders Banner */}
            {birthdayCustomers.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>🎂</span>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>Birthday Reminders</p>
                            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0 0' }}>
                                {birthdayCustomers.slice(0, 4).map(b => b.name || b.customer_name).join(', ')}
                                {birthdayCustomers.length > 4 ? ` +${birthdayCustomers.length - 4} more` : ''}
                            </p>
                        </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 16, border: '1px solid #fde68a' }}>
                        {birthdayCustomers.length} Birthdays
                    </span>
                </div>
            )}

            {/* Customer Intelligence & Analytics Grid (Strict 190px uniform height cards, NO raw object output) */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsStarFill style={{ color: '#6366f1' }} /> Customer Intelligence & Analytics
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {/* Card 1: Top Customers (Ranked List) */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🏆 Top Customers
                            </span>
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>By spend</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }} className="custom-scrollbar">
                            {(() => {
                                const list = normalizeApiList(customerInsights.topCustomers);
                                const top5 = list.length > 0
                                    ? list.slice(0, 5)
                                    : [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5);

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
                                        <span style={{ fontWeight: 700, color: '#10b981' }}>
                                            {fmt(c.total_spend || c.revenue || c.totalSpent || 0)}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Card 2: Retention Report (Structured KPIs) */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                📈 Retention Report
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 10 }}>
                                {(() => {
                                    const raw = customerInsights.retention;
                                    const tot = raw?.total_customers ?? customerStats?.total ?? customers.length;
                                    const act = raw?.active_customers ?? customerStats?.active ?? customers.filter(c => c.status === 'Active').length;
                                    return raw?.retention_rate || (tot > 0 ? `${Math.round((act / tot) * 100)}%` : '0%');
                                })()}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Active Buyers</span>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#10b981', margin: '2px 0 0 0' }}>
                                    {customerInsights.retention?.active_customers ?? customerStats?.active ?? customers.filter(c => c.status === 'Active').length}
                                </p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Inactive Base</span>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', margin: '2px 0 0 0' }}>
                                    {customerInsights.retention?.inactive_customers ?? customers.filter(c => c.status !== 'Active').length}
                                </p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tracked User Base</span>
                            <span style={{ fontWeight: 700, color: '#111827' }}>{totalCustomers} customers</span>
                        </div>
                    </div>

                    {/* Card 3: Lifetime Value (LTV Top 5 Compact List) */}
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
                                    ltvList = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
                                }
                                const top5Ltv = ltvList.slice(0, 5);

                                return top5Ltv.length === 0 ? (
                                    <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: 'auto' }}>No LTV Data</p>
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
                                                {fmt(c.total_spend || c.ltv || c.lifetime_value || c.totalSpent || 0)}
                                            </span>
                                        </div>
                                    ))
                                );
                            })()}
                        </div>
                    </div>

                    {/* Card 4: Loyalty Report (Summary Metrics) */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🎁 Loyalty Summary
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 10 }}>
                                Rewards
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Enrolled</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#d97706', margin: '2px 0 0 0' }}>
                                    {customerInsights.loyaltyReport?.total_members ?? customers.filter(c => (c.loyaltyPoints || 0) > 0).length} members
                                </p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Points Issued</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', margin: '2px 0 0 0' }}>
                                    {(customerInsights.loyaltyReport?.total_points ?? customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0)).toLocaleString('en-IN')} pts
                                </p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Redeemed Points</span>
                            <span style={{ fontWeight: 700, color: '#111827' }}>
                                {customerInsights.loyaltyReport?.points_redeemed ?? 0} pts
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Relationship Overview Hub */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsJournalText style={{ color: '#6366f1' }} /> CRM Relationship Hub
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Recent Notes</span>
                            <BsJournalText size={14} style={{ color: '#6366f1' }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginTop: 6, margin: 0 }}>{notesList.length} notes logged</p>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Communications</span>
                            <BsChatText size={14} style={{ color: '#0ea5e9' }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginTop: 6, margin: 0 }}>{commsList.length} touchpoints</p>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Referrals</span>
                            <BsShare size={14} style={{ color: '#10b981' }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginTop: 6, margin: 0 }}>{referralsList.length} referrals</p>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Wallet & Loyalty</span>
                            <BsGift size={14} style={{ color: '#8b5cf6' }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginTop: 6, margin: 0 }}>Active rewards</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                    <BsSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        className="ec-input"
                        style={{ paddingLeft: 36, width: '100%', height: 38, fontSize: 13 }}
                        placeholder="Search by customer name, email, phone or city..."
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
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Segment:</span>
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
                                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* CRM Customer Directory Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: '#fff' }}>
                <div className="table-scroll-container">
                    <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                {['Customer Profile', 'Email', 'Phone', 'City', 'Type', 'Wallet Balance', 'Loyalty Points', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && Array.from({ length: 6 }).map((_, idx) => <TableRowSkeleton key={idx} />)}

                            {!loading && error && (
                                <tr>
                                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
                                        {error}
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && paginatedCustomers.map((c) => {
                                const tc = typeCfg[c.type] || typeCfg.Regular;

                                return (
                                    <tr
                                        key={c.backendId}
                                        style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s ease' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Name & ID */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                                    {c.name ? c.name[0].toUpperCase() : 'C'}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{c.name}</p>
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

                                        {/* Type */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: tc.bg, color: tc.color }}>
                                                {c.type}
                                            </span>
                                        </td>

                                        {/* Wallet Balance */}
                                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                                            {c.credit > 0 ? fmt(c.credit) : '₹0'}
                                        </td>

                                        {/* Loyalty Points */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: 8, border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <BsGift size={12} /> {c.loyaltyPoints || 0} pts
                                            </span>
                                        </td>

                                        {/* Status Toggle Switch Component */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <CustomerStatusToggle
                                                isActive={c.status === 'Active'}
                                                onToggle={() => handleStatusToggle(c.backendId, c.status)}
                                            />
                                        </td>

                                        {/* Actions Column */}
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    title="View CRM Profile"
                                                    aria-label="View CRM Profile"
                                                    onClick={() => handleViewCustomerProfile(c.backendId)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, padding: 0, color: '#6366f1', borderColor: '#c7d2fe', background: '#fff' }}
                                                >
                                                    <BsEye size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    title="Edit Customer"
                                                    aria-label="Edit Customer"
                                                    onClick={() => setEditingCustomer(c)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, padding: 0, color: '#4b5563', borderColor: '#e5e7eb', background: '#fff' }}
                                                >
                                                    <BsPencilSquare size={14} />
                                                </button>

                                                {/* <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    title="Delete Customer"
                                                    aria-label="Delete Customer"
                                                    onClick={() => handleDeleteCustomer(c)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, padding: 0, color: '#ef4444', borderColor: '#fecaca', background: '#fff' }}
                                                >
                                                    <BsTrash size={14} />
                                                </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {!loading && !error && paginatedCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                                        No customers found in directory.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length} directory profiles
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

            {/* Modals & Profile Detail Panel */}
            <ExportDirectoryModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                customers={customers}
            />

            {showAddModal && (

                <AddCustomerModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={() => loadCrmDashboard(false)}
                />
            )}

            {editingCustomer && (
                <EditCustomerModal
                    customer={editingCustomer}
                    onClose={() => setEditingCustomer(null)}
                    onSaved={() => loadCrmDashboard(false)}
                />
            )}

            {selectedCustomer && (
                <CustomerDetailPanel
                    customer={selectedCustomer}
                    detailExtras={detailExtras}
                    loading={viewLoading}
                    showFeedback
                    onClose={() => {
                        setSelectedCustomer(null);
                        setDetailExtras({});
                    }}
                    onStatusChange={(id, s) => {
                        handleStatusToggle(id, s);
                    }}
                    onRefresh={() => handleViewCustomerProfile(selectedCustomer.backendId)}
                />
            )}
        </div>
    );
};

export default Customers;
