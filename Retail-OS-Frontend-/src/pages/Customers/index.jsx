import React, { useEffect, useState } from 'react';
import { State, City } from 'country-state-city';
import {
    BsSearch, BsDownload, BsPeopleFill, BsPhone, BsGeoAlt,
    BsCalendar, BsCurrencyRupee, BsCartCheck, BsStarFill,
    BsChevronLeft, BsChevronRight, BsCheckCircleFill, BsXCircleFill,
    BsEnvelope, BsFilter, BsPlus, BsEye, BsPencilSquare,
} from 'react-icons/bs';
import {
    getCustomers,
    createCustomer,
    getCustomerById,
    updateCustomer,
    getCustomerStats,
    // deleteCustomer, // TODO: Replace with Active/Inactive API when backend is available.
} from '../../services/customer';

const CUSTOMERS = [
    { id: 'CUS-001', name: 'Aarav Mehta', email: 'aarav@email.com', phone: '+91 98765 11111', city: 'Bangalore', state: 'Karnataka', orders: 24, totalSpent: 68400, lastOrder: '26 Jun 2026', registered: '12 Jan 2026', status: 'Active', type: 'Regular', credit: 0 },
    { id: 'CUS-002', name: 'Priya Sharma', email: 'priya@email.com', phone: '+91 98765 22222', city: 'Mumbai', state: 'Maharashtra', orders: 11, totalSpent: 28250, lastOrder: '26 Jun 2026', registered: '05 Feb 2026', status: 'Active', type: 'Regular', credit: 0 },
    { id: 'CUS-003', name: 'Rohan Das', email: 'rohan@email.com', phone: '+91 98765 33333', city: 'Delhi', state: 'Delhi', orders: 37, totalSpent: 124400, lastOrder: '25 Jun 2026', registered: '20 Nov 2025', status: 'Active', type: 'Wholesale', credit: 15000 },
    { id: 'CUS-004', name: 'Nisha Patel', email: 'nisha@email.com', phone: '+91 98765 44444', city: 'Pune', state: 'Maharashtra', orders: 4, totalSpent: 6950, lastOrder: '20 Jun 2026', registered: '10 Mar 2026', status: 'Inactive', type: 'Regular', credit: 0 },
    { id: 'CUS-005', name: 'Vikram Singh', email: 'vikram@email.com', phone: '+91 98765 55555', city: 'Chennai', state: 'Tamil Nadu', orders: 48, totalSpent: 218800, lastOrder: '24 Jun 2026', registered: '02 Sep 2025', status: 'Active', type: 'Wholesale', credit: 30000 },
    { id: 'CUS-006', name: 'Kavya Reddy', email: 'kavya@email.com', phone: '+91 98765 66666', city: 'Hyderabad', state: 'Telangana', orders: 7, totalSpent: 18300, lastOrder: '22 Jun 2026', registered: '18 Apr 2026', status: 'Active', type: 'Regular', credit: 0 },
    { id: 'CUS-007', name: 'Arjun Kumar', email: 'arjun@email.com', phone: '+91 98765 77777', city: 'Kolkata', state: 'West Bengal', orders: 15, totalSpent: 37500, lastOrder: '23 Jun 2026', registered: '28 Feb 2026', status: 'Active', type: 'Regular', credit: 0 },
    { id: 'CUS-008', name: 'Divya Iyer', email: 'divya@email.com', phone: '+91 98765 88888', city: 'Bangalore', state: 'Karnataka', orders: 29, totalSpent: 89400, lastOrder: '23 Jun 2026', registered: '14 Dec 2025', status: 'Active', type: 'Regular', credit: 5000 },
    { id: 'CUS-009', name: 'Suresh Rao', email: 'suresh@email.com', phone: '+91 98765 99999', city: 'Ahmedabad', state: 'Gujarat', orders: 9, totalSpent: 24800, lastOrder: '21 Jun 2026', registered: '01 May 2026', status: 'Active', type: 'Regular', credit: 0 },
    { id: 'CUS-010', name: 'Tanvi Joshi', email: 'tanvi@email.com', phone: '+91 98765 10000', city: 'Jaipur', state: 'Rajasthan', orders: 21, totalSpent: 64300, lastOrder: '22 Jun 2026', registered: '07 Oct 2025', status: 'Blocked', type: 'Regular', credit: 0 },
];

const PAGE_SIZE = 10;
const fmt = (n) => '₹' + n.toLocaleString('en-IN');

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

const getApiErrorMessage = (error, fallback) =>
    error.response?.data?.detail?.[0]?.msg ||
    error.response?.data?.detail?.message ||
    error.response?.data?.detail ||
    error.response?.data?.message ||
    fallback;

const statusCfg = {
    Active: { color: '#22C55E', bg: '#f0fdf4' },
    Inactive: { color: '#EF4444', bg: '#fef2f2' },
    Blocked: { color: '#ef4444', bg: '#fef2f2' },
};

const typeCfg = {
    Regular: { color: '#6366f1', bg: '#eef2ff' },
    Wholesale: { color: '#8b5cf6', bg: '#f5f3ff' },
    VIP: { color: '#8b5cf6', bg: '#f5f3ff' },
};

const CustomerStatusToggle = ({ isActive, onToggle }) => {
    const activeColor = '#22C55E';
    const inactiveColor = '#EF4444';

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
                padding: '5px 10px 5px 5px',
                borderRadius: 999,
                border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`,
                background: isActive ? '#f0fdf4' : '#fef2f2',
                cursor: 'pointer',
                transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            }}
        >
            <span
                style={{
                    position: 'relative',
                    width: 36,
                    height: 20,
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
                        left: isActive ? 18 : 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        transition: 'left 0.25s ease, transform 0.25s ease',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.18)',
                    }}
                />
            </span>

            <span
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? activeColor : inactiveColor,
                    transition: 'color 0.25s ease',
                    minWidth: 52,
                    textAlign: 'left',
                    userSelect: 'none',
                }}
            >
                {isActive ? 'Active' : 'Inactive'}
            </span>
        </button>
    );
};

const CustomerDetailModal = ({ customer, onClose, onChange }) => {
    const [status, setStatus] = useState(customer.status);

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{customer.name}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{customer.id} · Member since {customer.registered}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: '#f9fafb', borderRadius: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>
                        {customer.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{customer.name}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{customer.email}</p>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: typeCfg[customer.type]?.bg, color: typeCfg[customer.type]?.color }}>
                        {customer.type}
                    </span>
                </div>

                {/* Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Phone', value: customer.phone },
                        { label: 'City', value: `${customer.city}, ${customer.state}` },
                        { label: 'Total Orders', value: customer.orders },
                        { label: 'Total Spent', value: fmt(customer.totalSpent) },
                        { label: 'Credit Limit', value: customer.credit > 0 ? fmt(customer.credit) : 'None' },
                        { label: 'Last Purchase', value: customer.lastOrder },
                    ].map((f, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>{f.value}</p>
                        </div>
                    ))}
                </div>

                {/* Status */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Account Status</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {Object.keys(statusCfg).map(s => (
                            <button key={s} onClick={() => { setStatus(s); onChange(customer.id, s); }}
                                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${status === s ? statusCfg[s].color : '#e5e7eb'}`, background: status === s ? statusCfg[s].bg : '#fff', color: status === s ? statusCfg[s].color : '#6b7280' }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


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

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [customers, setCustomers] = useState(CUSTOMERS);
    // const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editErrors, setEditErrors] = useState({});
    const [updating, setUpdating] = useState(false);
    
    const loadCustomers = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
    
            setError('');
    
            const data = await getCustomers();
    
            const customerList = Array.isArray(data)
                ? data
                : data.customers || data.data || [];
    
            const formattedCustomers = customerList.map(customer => ({
                id: `CUS-${String(customer.id).padStart(3, '0')}`,
                backendId: customer.id,
    
                name: customer.name || 'Unknown Customer',
                email: customer.email || '',
                phone: customer.phone || '',
    
                city: customer.address || 'Not available',
                state: '',
    
                orders: 0,
                totalSpent: customer.total_spend || 0,
                lastOrder: 'No orders yet',
    
                registered: customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : 'Not available',
    
                status:
                    customer.status === 'inactive'
                        ? 'Inactive'
                        : customer.status === 'blocked'
                          ? 'Blocked'
                          : 'Active',
    
                type:
                    customer.segment === 'vip'
                        ? 'VIP'
                        : customer.segment === 'new'
                          ? 'New'
                          : 'Regular',

                      
    
                credit: 0,
                loyaltyPoints: customer.loyalty_points || 0,
                birthday: customer.birthday || '',
                whatsappOptIn: customer.whatsapp_opt_in || false,
                smsOptIn: customer.sms_opt_in || false,
            }));
    
            setCustomers(formattedCustomers);

        // } catch (err) {
        //     console.error('Customer API is currently unavailable:', err);
        //     // setCustomers(CUSTOMERS);
        //     // setError('');
        // } finally {
        } catch (err) {
            console.error('Failed to load customers:', err);
            setError('Unable to load customers. Please try again.');
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    };
    useEffect(() => {
        loadCustomers();
    }, []);



    const handleViewCustomer = async (customerId) => {
        try {
            const customerData = await getCustomerById(customerId);
    
            const formattedCustomer = {
                id: `CUS-${String(customerData.id).padStart(3, '0')}`,
                backendId: customerData.id,
    
                name: customerData.name || 'Unknown Customer',
                email: customerData.email || '',
                phone: customerData.phone || '',
    
                city: customerData.address || 'Not available',
                state: '',
    
                orders: 0,
                totalSpent: customerData.total_spend || 0,
                lastOrder: 'No orders yet',
    
                registered: customerData.created_at
                    ? new Date(customerData.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : 'Not available',
    
                status:
                    customerData.status === 'active'
                        ? 'Active'
                        : customerData.status === 'inactive'
                          ? 'Inactive'
                          : 'Blocked',
    
                type:
                    customerData.segment === 'vip'
                        ? 'VIP'
                        : customerData.segment === 'new'
                          ? 'New'
                          : 'Regular',
    
                credit: 0,
                loyaltyPoints: customerData.loyalty_points || 0,
                birthday: customerData.birthday || '',
                whatsappOptIn: customerData.whatsapp_opt_in || false,
                smsOptIn: customerData.sms_opt_in || false,
            };
    
            setSelected(formattedCustomer);
        } catch (error) {
            console.error('Unable to fetch customer details:', error);
            alert('Unable to load customer details.');
        }
    };

    const handleEditCustomer = async (customerId) => {
    try {
        const customerData =
            await getCustomerById(customerId);

        const addressParts = customerData.address
            ? customerData.address
                  .split(',')
                  .map(item => item.trim())
            : [];

        const customerCity = addressParts[0] || '';
        const customerState = addressParts[1] || '';

        const indianStates =
            State.getStatesOfCountry('IN');

        const matchedState = indianStates.find(
            state =>
                state.name.toLowerCase() ===
                customerState.toLowerCase()
        );

        setEditingCustomer({
            backendId: customerData.id,
            name: customerData.name || '',
            email: customerData.email || '',
            phone: customerData.phone || '',

            city: customerCity,
            state: customerState,
            stateCode: matchedState?.isoCode || '',

            birthday: customerData.birthday || '',
            whatsappOptIn:
                customerData.whatsapp_opt_in || false,
            smsOptIn:
                customerData.sms_opt_in || false,
        });

        setEditErrors({});
        setShowEditModal(true);
    } catch (error) {
        console.error(
            'Unable to load customer for editing:',
            error
        );

        alert('Unable to load customer details.');
    }
};

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
    
        if (!editingCustomer) return;

        const validation = validateCustomerForm({
            name: editingCustomer.name,
            email: editingCustomer.email,
            birthday: editingCustomer.birthday,
        });

        if (!validation.isValid) {
            setEditErrors(validation.errors);
            return;
        }

        setEditErrors({});
    
        try {
            setUpdating(true);
    
            const payload = {
                name: editingCustomer.name.trim(),
                email: editingCustomer.email
                    .trim()
                    .toLowerCase(),
            
                phone: editingCustomer.phone.trim(),
            
                address: `${editingCustomer.city.trim()}, ${editingCustomer.state.trim()}`,
            
                birthday:
                    editingCustomer.birthday || null,
            
                whatsapp_opt_in:
                    editingCustomer.whatsappOptIn,
            
                sms_opt_in:
                    editingCustomer.smsOptIn,
            };
    
            await updateCustomer(editingCustomer.backendId, payload);
    
            alert('Customer updated successfully.');
    
            setShowEditModal(false);
            setEditingCustomer(null);
    
            await loadCustomers(false);
        } catch (error) {
            console.error('Failed to update customer:', error);
    
            alert(getApiErrorMessage(error, 'Unable to update customer.'));
        } finally {
            setUpdating(false);
        }
    };

    const clearEditError = (field) => {
        setEditErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    // TODO: Replace with Active/Inactive API when backend is available.
    // const handleDeleteCustomer = async (customerId) => {
    //     try {
    //         await deleteCustomer(customerId);
    //
    //         await loadCustomers(false);
    //     } catch (error) {
    //         console.error('Failed to delete customer:', error);
    //
    //         const message =
    //             error.response?.data?.detail?.message ||
    //             error.response?.data?.detail ||
    //             error.response?.data?.message ||
    //             'Unable to delete customer.';
    //
    //         console.error(
    //             typeof message === 'string'
    //                 ? message
    //                 : 'Unable to delete customer.'
    //         );
    //     }
    // };

    const handleStatusToggle = async (customerId) => {
        const customer = customers.find(c => c.backendId === customerId);
        if (!customer) return;
        const apiStatus = customer.status === 'Active' ? 'inactive' : 'active';
        
        try {
            setCustomers(prev =>
                prev.map(c =>
                    c.backendId === customerId
                        ? {
                              ...c,
                              status: c.status === 'Active' ? 'Inactive' : 'Active',
                          }
                        : c
                )
            );
            await updateCustomer(customerId, { status: apiStatus });
        } catch (error) {
            console.error('Failed to toggle status:', error);
            // Revert state
            setCustomers(prev =>
                prev.map(c =>
                    c.backendId === customerId
                        ? {
                              ...c,
                              status: c.status === 'Active' ? 'Inactive' : 'Active',
                          }
                        : c
                )
            );
            alert(getApiErrorMessage(error, 'Unable to update status.'));
        }
    };

    const filtered = customers.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.includes(search) || c.city.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        const matchType = filterType === 'All' || c.type === filterType;
        return matchSearch && matchStatus && matchType;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleStatusChange = async (id, s) => {
        const customer = customers.find(c => c.id === id);
        if (!customer) return;

        try {
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: s } : c));
            await updateCustomer(customer.backendId, { status: s.toLowerCase() });
        } catch (error) {
            console.error('Failed to change status:', error);
            // Revert state
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: customer.status } : c));
            alert(getApiErrorMessage(error, 'Unable to update status.'));
        }
    };
    const kpis = [
        {
            label: 'Total Customers',
            value: customers.length,
            color: '#6366f1',
            bg: '#eef2ff',
            icon: <BsPeopleFill size={22} style={{ color: '#5B5FEF', flexShrink: 0 }} />,
        },
        {
            label: 'Active',
            value: customers.filter(c => c.status === 'Active').length,
            color: '#10b981',
            bg: '#ecfdf5',
            icon: '✅',
        },

        {
            label: 'Inactive',
            value: customers.filter(
                c => c.status === 'Inactive'
            ).length,
            color: '#f59e0b',
            bg: '#fffbeb',
            icon: '👤',
        },

        {
            label: 'VIP',
            value: customers.filter(c => c.type === 'VIP').length,
            color: '#8b5cf6',
            bg: '#f5f3ff',
            icon: '⭐',
        },
        {
            label: 'Top Spender',
            value: fmt(
                customers.length > 0
                    ? Math.max(...customers.map(c => c.totalSpent))
                    : 0
            ),
            color: '#f59e0b',
            bg: '#fffbeb',
            icon: '🏆',
        },
    ];

    return (
        <div className="dash-page">
            <div className="adm-page-header">
                <div>
                    <div 
                        style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <BsPeopleFill 
                        size={22} 
                        style={{ 
                            color: '#5B5FEF', 
                            flexShrink: 0 
                        }} 
                    />
                    <h1 
                        className="adm-page-title" 
                        style={{ 
                            margin: 0 
                        }}
                    >
                        Customer Directory
                    </h1>
                </div>
                <p 
                    className="adm-page-sub" 
                    style={{ 
                        marginTop: 4, 
                        marginLeft: 30 
                    }}
                >
                    Manage customer accounts, credit limits and purchase history
                </p>
                </div>
            
                
                <div className="adm-header-actions">
                    <button className="adm-btn-secondary">
                        <BsDownload size={14} />
                        Export
                    </button>

                    <button
                        type="button"
                        className="adm-btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <BsPlus size={16} />
                        Add Customer
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns:'repeat(5, minmax(0, 1fr))', gap: 12 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 16px', minWidth: 0, }}>
                        <span style={{ fontSize: 22 }}>{k.icon}</span>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8 }}>{k.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>


            {/* Filters */}
            <div
                style={{
                    background: '#fff',
                    border: '1px solid #e8eaf0',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'grid',
                    gridTemplateColumns:
                        'minmax(320px, 1.6fr) minmax(160px, 0.7fr) minmax(160px, 0.7fr)',
                    gap: 12,
                    alignItems: 'end',
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        minWidth: 0,
                    }}
                >
                    <BsSearch
                        size={13}
                        style={{
                            position: 'absolute',
                            left: 11,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                        }}
                    />

                    <input
                        className="ec-input"
                        style={{
                            paddingLeft: 32,
                            height: 42,
                        }}
                        placeholder="Search by name, email, phone or city..."
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#9ca3af',
                            marginBottom: 4,
                        }}
                    >
                        Status
                    </label>

                    <select
                        className="ec-input"
                        style={{
                            width: '100%',
                            height: 42,
                        }}
                        value={filterStatus}
                        onChange={e => {
                            setFilterStatus(e.target.value);
                            setPage(1);
                        }}
                    >
                        {[
                            'All',
                            'Active',
                            'Inactive',
                            'Blocked',
                        ].map(status => (
                            <option key={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#9ca3af',
                            marginBottom: 4,
                        }}
                    >
                        Customer Type
                    </label>

                    <select
                        className="ec-input"
                        style={{
                            width: '100%',
                            height: 42,
                        }}
                        value={filterType}
                        onChange={e => {
                            setFilterType(e.target.value);
                            setPage(1);
                        }}
                    >
                        {[
                            'All',
                            'New',
                            'Regular',
                            'VIP',
                        ].map(type => (
                            <option key={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="chart-card-content custom-scrollbar" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
                <table style={{ minWidth: '1300px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaf0' }}>
                            {['Customer', 'Contact', 'City', 'Type', 'Orders', 'Total Spent', 'Last Purchase', 'Status', 'Action'].map(h => (
                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        style={{
                                            padding: 40,
                                            textAlign: 'center',
                                            color: '#6366f1',
                                            fontSize: 14,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Loading customers...
                                    </td>
                                </tr>
                            )}
                            
                            
                            {!loading && error && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        style={{
                                            padding: 40,
                                            textAlign: 'center',
                                            color: '#ef4444',
                                            fontSize: 14,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {error}
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && paginated.map((c, i) => {
                            const sc = statusCfg[c.status];
                            const tc = typeCfg[c.type] || typeCfg.Regular;
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                                {c.name[0]}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</p>
                                                <p style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{c.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <p style={{ fontSize: 12, color: '#374151' }}>{c.email}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{c.phone}</p>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{c.city}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ fontSize: 11, background: tc.bg, color: tc.color, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>{c.type}</span>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{c.orders}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmt(c.totalSpent)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{c.lastOrder}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {c.status}
                                        </span>
                                    </td>
                        
                                    <td style={{ padding: '12px 14px' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-start',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="adm-btn-secondary"
                                                title="View customer"
                                                aria-label="View customer"
                                                onClick={() => handleViewCustomer(c.backendId)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 34,
                                                    height: 34,
                                                    padding: 0,
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <BsEye size={15} />
                                            </button>

                                            <button
                                                type="button"
                                                title="Edit customer"
                                                aria-label="Edit customer"
                                                onClick={() => handleEditCustomer(c.backendId)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 34,
                                                    height: 34,
                                                    padding: 0,
                                                    color: '#4F46E5',
                                                    background: '#EEF2FF',
                                                    border: '1px solid #C7D2FE',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <BsPencilSquare size={15} />
                                            </button>

                                            <CustomerStatusToggle
                                                isActive={c.status === 'Active'}
                                                onToggle={() => handleStatusToggle(c.backendId)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                            



                            
                        })}
                        {!loading && !error && paginated.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No customers found</td></tr>
                        )}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><BsChevronLeft size={12} /></button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{p}</button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><BsChevronRight size={12} /></button>
                        </div>
                    </div>
                )}
            </div>
            
          
            {showAddModal && (
                
                <AddCustomerModal
                onClose={() => setShowAddModal(false)}
                onCreated={loadCustomers}
                />
            )}

            {showEditModal && editingCustomer && (
                <EditCustomerModal
                customer={editingCustomer}
                setCustomer={setEditingCustomer}
                updating={updating}
                onSave={handleUpdateCustomer}
                errors={editErrors}
                onClearError={clearEditError}
                onClose={() => {
                setShowEditModal(false);
                setEditingCustomer(null);
                setEditErrors({});
                    }}
                />
            )}

            {selected && (
                <CustomerDetailModal customer={selected} onClose={() => setSelected(null)}
                    onChange={(id, s) => { handleStatusChange(id, s); setSelected(prev => ({ ...prev, status: s })); }} />
            )}
        </div>
    );
};

export default Customers;