// Customer Directory Page - Updated for testing
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { State, City } from 'country-state-city';
import {
    BsSearch, BsDownload, BsPeopleFill, BsPhone, BsGeoAlt,
    BsCalendar, BsCurrencyRupee, BsStarFill, BsPlus, BsEye, BsPencilSquare,
    BsChevronLeft, BsChevronRight, BsCheckCircleFill, BsXCircleFill,
    BsChatText,
    BsFunnel, BsGift, BsTrophy, BsGraphUp,
    BsTrash,
} from 'react-icons/bs';
import {
    getCustomers,
    createCustomer,
    getCustomerById,
    updateCustomer,
    updateCustomerStatus,
    getCustomerStats,
    getBirthdayCustomers,
    getReferrals,
    getFeedback,
    getCommunications,
    getNotes,
    getTopCustomers,
    getLifetimeValue,
    getRetentionReport,
    getCustomerOrders,
    sendCampaign,
    sendCustomerWhatsapp,
} from '../../services/customer';
import CustomerDetailPanel from '../../components/customers/CustomerDetailPanel';
import ExportDirectoryModal from '../../components/customers/ExportDirectoryModal';
import {
    fmt,
    normalizeApiList,
    formatCustomerRecord,
    getApiErrorMessage,
    formatAnalyticsVal,
    setStoredCustomerStatus,
} from '../../components/customers/customerHelpers';

const PAGE_SIZE = 10;
const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const getTodayDateString = () => new Date().toISOString().split('T')[0];

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

// Professional Active / Inactive Toggle Switch Component
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
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', minHeight: 88 }}>
        <div style={{ width: '50%', height: 12, background: '#f3f4f6', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ width: '40%', height: 24, background: '#eef2ff', borderRadius: 6 }} />
    </div>
);

const TableRowSkeleton = () => (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
        {Array.from({ length: 10 }).map((_, i) => (
            <td key={i} style={{ padding: '9px 14px' }}>
                <div style={{ height: 16, background: '#f3f4f6', borderRadius: 4, width: '80%' }} />
            </td>
        ))}
    </tr>
);

const validateCustomerForm = ({ name, email, birthday }) => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) errors.name = 'Customer name is required';
    else if (trimmedName.length < 2) errors.name = 'Name must be at least 2 characters';
    else if (!NAME_PATTERN.test(trimmedName)) errors.name = 'Letters and spaces only';

    if (!trimmedEmail) errors.email = 'Email is required';
    else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Invalid email address';

    if (birthday && birthday > getTodayDateString()) {
        errors.birthday = 'Birthday cannot be in the future';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
};

// Add Customer Modal
const AddCustomerModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        stateCode: '',
        type: 'regular',
        birthday: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const indianStates = State.getStatesOfCountry('IN');
    const availableCities = form.stateCode ? City.getCitiesOfState('IN', form.stateCode) : [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'stateCode') {
            const selectedState = indianStates.find(st => st.isoCode === value);
            setForm(prev => ({ ...prev, stateCode: value, state: selectedState?.name || '', city: '' }));
            return;
        }
        if (name === 'phone') {
            setForm(prev => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 10) }));
            return;
        }
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => { const copy = { ...prev }; delete copy[name]; return copy; });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.state.trim() || !form.city.trim()) {
            setErrors(prev => ({ ...prev, form: 'Please fill all required fields (*)' }));
            return;
        }

        const validation = validateCustomerForm({ name: form.name, email: form.email, birthday: form.birthday });
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setSubmitting(true);
        try {
            await createCustomer({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                address: `${form.city.trim()}, ${form.state.trim()}`,
                birthday: form.birthday || null,
                whatsapp_opt_in: true,
                sms_opt_in: true,
                status: 'active',
                segment: form.type,
            });

            if (onCreated) await onCreated();
            onClose();
        } catch (err) {
            console.error('Create customer error:', err);
            setErrors(prev => ({ ...prev, form: getApiErrorMessage(err, 'Failed to create customer.') }));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>Add New Customer</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>Register a new customer profile into CRM</p>
                    </div>
                    <button type="button" className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {errors.form && (
                            <div style={{ gridColumn: '1 / -1', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                {errors.form}
                            </div>
                        )}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Customer Name *</label>
                            <input className="ec-input" type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
                            {errors.name && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.name}</p>}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Email Address *</label>
                            <input className="ec-input" type="email" name="email" placeholder="email@example.com" value={form.email} onChange={handleChange} required />
                            {errors.email && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.email}</p>}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Phone Number *</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input className="ec-input" type="text" value="+91" disabled style={{ width: 56, textAlign: 'center', background: '#f3f4f6' }} />
                                <input className="ec-input" type="tel" name="phone" placeholder="10-digit mobile" value={form.phone} onChange={handleChange} maxLength={10} required />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>State *</label>
                            <select className="ec-input" name="stateCode" value={form.stateCode} onChange={handleChange} required>
                                <option value="">Select State</option>
                                {indianStates.map(st => <option key={st.isoCode} value={st.isoCode}>{st.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>City *</label>
                            <select className="ec-input" name="city" value={form.city} onChange={handleChange} disabled={!form.stateCode} required>
                                <option value="">{form.stateCode ? 'Select City' : 'Select State First'}</option>
                                {availableCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Customer Segment *</label>
                            <select className="ec-input" name="type" value={form.type} onChange={handleChange}>
                                <option value="regular">Regular</option>
                                <option value="wholesale">Wholesale</option>
                                <option value="new">New</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Birthday</label>
                            <input className="ec-input" type="date" name="birthday" value={form.birthday} onChange={handleChange} max={getTodayDateString()} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Add Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Edit Customer Modal
export const EditCustomerModal = ({ customer, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        city: customer.city || '',
        status: customer.status || 'Active',
        type: customer.type || 'Regular',
        birthday: customer.birthday || '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError('');
        try {
            const targetId = customer.backendId ?? customer.id ?? (typeof customer.id === 'string' ? parseInt(customer.id.replace(/\D/g, ''), 10) : null);
            const normalizedStatus = form.status ? (form.status.charAt(0).toUpperCase() + form.status.slice(1).toLowerCase()) : 'Active';

            // 1. Update customer profile details
            await updateCustomer(targetId, {
                name: form.name,
                email: form.email,
                phone: form.phone,
                address: form.city,
                status: normalizedStatus.toLowerCase(),
                segment: form.type.toLowerCase(),
                birthday: form.birthday || null,
            });

            // 2. Also call dedicated status update endpoint to guarantee backend status persistence
            try {
                if (targetId) {
                    await updateCustomerStatus(targetId, normalizedStatus.toLowerCase());
                }
            } catch (statusErr) {
                console.warn('Status patch update endpoint notice:', statusErr);
            }

            // 3. Save to client storage override for persistence
            if (targetId) {
                setStoredCustomerStatus(targetId, normalizedStatus);
                if (customer.id && customer.id !== targetId) {
                    setStoredCustomerStatus(customer.id, normalizedStatus);
                }
            }

            const updatedCustomerData = {
                ...customer,
                name: form.name,
                email: form.email,
                phone: form.phone,
                city: form.city,
                location: form.city,
                status: normalizedStatus,
                type: form.type,
                birthday: form.birthday || null,
            };

            if (onSaved) await onSaved(updatedCustomerData);
            onClose();
        } catch (err) {
            console.error('Update failed:', err);
            setModalError(getApiErrorMessage(err, 'Failed to update customer.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Edit Customer: {customer.name}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Update contact details & relationship status</p>
                    </div>
                    <button type="button" className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {modalError && (
                            <div style={{ gridColumn: '1 / -1', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                {modalError}
                            </div>
                        )}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Name</label>
                            <input className="ec-input" name="name" value={form.name} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Email</label>
                            <input className="ec-input" type="email" name="email" value={form.email} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Phone</label>
                            <input className="ec-input" name="phone" value={form.phone} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>City</label>
                            <input className="ec-input" name="city" value={form.city} onChange={handleChange} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Status</label>
                            <select className="ec-input" name="status" value={form.status} onChange={handleChange}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Send Marketing Campaign Modal
const SendCampaignModal = ({ customers = [], preSelectedIds = [], onClose, onCampaignSent }) => {
    const [selectedCustomerIds, setSelectedCustomerIds] = useState(preSelectedIds || []);
    const [communicationType, setCommunicationType] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
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
        setSelectedCustomerIds(prev => {
            const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            if (errors.customers && next.length > 0) {
                setErrors(errs => ({ ...errs, customers: '' }));
            }
            return next;
        });
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
            setSelectedCustomerIds(prev => {
                const next = Array.from(new Set([...prev, ...filteredIds]));
                if (errors.customers && next.length > 0) {
                    setErrors(errs => ({ ...errs, customers: '' }));
                }
                return next;
            });
        }
    };

    const handleChannelChange = (e) => {
        const val = e.target.value;
        setCommunicationType(val);
        if (errors.communicationType && val.trim()) {
            setErrors(errs => ({ ...errs, communicationType: '' }));
        }
    };

    const handleMessageChange = (e) => {
        const val = e.target.value;
        setMessage(val);
        if (errors.message && val.trim()) {
            setErrors(errs => ({ ...errs, message: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!selectedCustomerIds || selectedCustomerIds.length === 0) {
            newErrors.customers = 'Please select at least one customer.';
        }
        if (!communicationType || !communicationType.trim()) {
            newErrors.communicationType = 'Please select a communication channel.';
        }
        if (!message || !message.trim()) {
            newErrors.message = 'Please enter a campaign message.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            const res = await sendCampaign({
                customer_ids: selectedCustomerIds,
                communication_type: communicationType,
                message: message.trim(),
            });
            if (onCampaignSent) {
                onCampaignSent(res, {
                    selectedCustomerIds,
                    communicationType,
                    message: message.trim(),
                });
            }
            onClose();
        } catch (err) {
            console.error('Send campaign error:', err);
            setErrors(prev => ({ ...prev, submit: getApiErrorMessage(err, 'Failed to send marketing campaign.') }));
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

                <form onSubmit={handleSubmit} noValidate style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {errors.submit && (
                            <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                {errors.submit}
                            </div>
                        )}
                        {/* Select Customers */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                    Select Customers <span style={{ color: '#ef4444' }}>*</span>
                                </label>
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
                                    onChange={e => setCustomerSearch(e.target.value.replace(/^\s+/, ''))}
                                    style={{ fontSize: 12, padding: '6px 10px', flex: 1 }}
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
                                border: `1px solid ${errors.customers ? '#ef4444' : '#d1d5db'}`,
                                borderRadius: 8,
                                padding: '6px 8px',
                                background: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                ...(errors.customers ? { boxShadow: '0 0 0 1px #ef4444' } : {})
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
                            {errors.customers && (
                                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, marginBottom: 0 }}>{errors.customers}</p>
                            )}
                        </div>

                        {/* Communication Channel */}
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                Communication Channel <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                className="ec-input"
                                value={communicationType}
                                onChange={handleChannelChange}
                                style={{
                                    borderColor: errors.communicationType ? '#ef4444' : undefined,
                                    ...(errors.communicationType ? { boxShadow: '0 0 0 1px #ef4444' } : {})
                                }}
                            >
                                <option value="">Select Communication Channel</option>
                                <option value="sms">SMS</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                            </select>
                            {errors.communicationType && (
                                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, marginBottom: 0 }}>{errors.communicationType}</p>
                            )}
                        </div>

                        {/* Campaign Message */}
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                Campaign Message <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                className="ec-input"
                                rows={4}
                                placeholder="Enter your campaign announcement or offer code details..."
                                value={message}
                                onChange={handleMessageChange}
                                style={{
                                    width: '100%',
                                    resize: 'vertical',
                                    borderColor: errors.message ? '#ef4444' : undefined,
                                    ...(errors.message ? { boxShadow: '0 0 0 1px #ef4444' } : {})
                                }}
                            />
                            {errors.message && (
                                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, marginBottom: 0 }}>{errors.message}</p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                        <button type="button" className="adm-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="adm-btn-primary" disabled={submitting}>
                            {submitting ? 'Sending Campaign...' : '🚀 Send Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Customer Directory Component
const Customers = () => {
    // Initial Page Load States
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [customerStats, setCustomerStats] = useState(null);
    const [birthdayCustomers, setBirthdayCustomers] = useState([]);
    const [customerInsights, setCustomerInsights] = useState({});

    // Filter & Search States
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterCity, setFilterCity] = useState('All');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modals & Detail States
    const [selectedIds, setSelectedIds] = useState([]);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailExtras, setDetailExtras] = useState({});
    const [viewLoading, setViewLoading] = useState(false);
    const [birthdayGifting, setBirthdayGifting] = useState(false);
    const [notification, setNotification] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(prev => (prev?.message === message ? null : prev));
        }, 4000);
    };

    // ── Birthday Automation (WhatsApp wishes) ──
    const handleGiftAllBirthdays = async () => {
        if (!birthdayCustomers || birthdayCustomers.length === 0) return;
        setBirthdayGifting(true);
        let successCount = 0;
        try {
            for (const b of birthdayCustomers) {
                const bId = b.id || b.backendId || b.customer_id;
                try {
                    if (b.phone) {
                        await sendCustomerWhatsapp({
                            customer_id: bId,
                            channel: 'whatsapp',
                            communication_type: 'WHATSAPP',
                            message: `🎉 Happy Birthday from Shekru Retail, ${b.name || 'valued customer'}! 🎂 Wishing you a wonderful birthday filled with joy and happiness! Have a fantastic day! 🎁`
                        }).catch(() => { });
                    }
                    successCount++;
                } catch (err) {
                    console.warn(`Birthday greeting failed for customer ${bId}:`, err);
                }
            }
            showNotification(`🎉 Successfully sent birthday greetings to ${successCount} shopper${successCount === 1 ? '' : 's'}!`, 'success');
            await loadCrmDashboard(false);
        } finally {
            setBirthdayGifting(false);
        }
    };

    // Initial Load: Loads directory APIs, stats, and customer analytics
    const loadCrmDashboard = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError('');

        try {
            const [customersRes, statsRes, insightsRes] = await Promise.allSettled([
                getCustomers(),
                getCustomerStats(),
                Promise.allSettled([
                    getTopCustomers(),
                    getLifetimeValue(),
                    getRetentionReport(),
                    getBirthdayCustomers(),
                ])
            ]);

            if (customersRes.status === 'fulfilled') {
                const list = normalizeApiList(customersRes.value);
                setCustomers(list.map(c => {
                    try {
                        return formatCustomerRecord(c);
                    } catch (err) {
                        console.warn('Error formatting customer record:', c, err);
                        return {
                            id: `CUS-${String(c?.id || 1).padStart(3, '0')}`,
                            backendId: c?.id,
                            name: c?.name || 'Customer',
                            email: c?.email || '',
                            phone: String(c?.phone || ''),
                            city: c?.city || c?.address || '—',
                            location: c?.city || c?.address || '—',
                            orders: c?.orders || c?.orders_count || 0,
                            totalSpent: c?.total_spend || c?.totalSpent || 0,
                            status: 'Active',
                            type: 'Regular',
                            credit: c?.wallet_balance || c?.credit || 0,
                            loyaltyPoints: c?.loyalty_points || 0,
                        };
                    }
                }));
            } else {
                setError('Unable to load customer directory.');
            }

            if (statsRes.status === 'fulfilled') {
                setCustomerStats(statsRes.value);
            }

            if (insightsRes.status === 'fulfilled') {
                const [topRes, ltvRes, retRes, bdayRes] = insightsRes.value;
                setCustomerInsights({
                    topCustomers: topRes.status === 'fulfilled' ? topRes.value : null,
                    lifetimeValue: ltvRes.status === 'fulfilled' ? ltvRes.value : null,
                    retention: retRes.status === 'fulfilled' ? retRes.value : null,
                    birthdays: bdayRes.status === 'fulfilled' ? bdayRes.value : null,
                });
                if (bdayRes.status === 'fulfilled') {
                    setBirthdayCustomers(normalizeApiList(bdayRes.value));
                }
            }
        } catch (err) {
            console.error('Error loading CRM dashboard data:', err);
            setError(getApiErrorMessage(err, 'Failed to fetch customer data.'));
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Customers | RetailOS';
        loadCrmDashboard();
    }, []);

    // ON-DEMAND: Loaded ONLY when clicking Eye icon (Calls ONLY GET /api/v1/customers/{customer_id})
    const handleViewCustomerProfile = async (backendId) => {
        const localCust = customers.find(c => c.backendId === backendId);
        if (localCust) setSelectedCustomer(localCust);

        setViewLoading(true);

        try {
            const rawDetails = await getCustomerById(backendId);
            const fullRecord = formatCustomerRecord(rawDetails);
            setSelectedCustomer(fullRecord);
        } catch (err) {
            console.error('Error fetching customer profile on demand:', err);
        } finally {
            setViewLoading(false);
        }
    };

    // Handler for ACTIVE / INACTIVE Status updates
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
            // Rollback UI on error
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

    const availableCities = useMemo(() => Array.from(new Set(customers.map(c => c.city).filter(Boolean))), [customers]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const query = search.trim().toLowerCase();
            const matchesSearch = !query ||
                String(c.name || '').toLowerCase().includes(query) ||
                String(c.email || '').toLowerCase().includes(query) ||
                String(c.phone || '').includes(query) ||
                String(c.city || c.location || '').toLowerCase().includes(query) ||
                String(c.id || '').toLowerCase().includes(query);

            const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
            const matchesType = filterType === 'All' || c.type === filterType;
            const matchesCity = filterCity === 'All' || c.city === filterCity;

            return matchesSearch && matchesStatus && matchesType && matchesCity;
        });
    }, [customers, search, filterStatus, filterType, filterCity]);

    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
    const paginatedCustomers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredCustomers.slice(start, start + pageSize);
    }, [filteredCustomers, page, pageSize]);

    const hasActiveFilters = Boolean(search.trim() || filterStatus !== 'All' || filterType !== 'All' || filterCity !== 'All');

    const handleClearFilters = () => {
        setSearch('');
        setFilterStatus('All');
        setFilterType('All');
        setFilterCity('All');
        setPage(1);
    };

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

    const selectedCustomersList = useMemo(() => {
        return customers.filter(c => selectedIds.includes(c.backendId || c.id));
    }, [customers, selectedIds]);

    const totalCustomers = customerStats?.total ?? customers.length;
    const activeCustomers = customerStats?.active ?? customers.filter(c => c.status === 'Active').length;
    const inactiveCustomers = customers.filter(c => c.status === 'Inactive').length;

    // Uniform analytics card styling (Compact height, optimized padding)
    const analyticsCardStyle = {
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '8px 12px',
        height: 130,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        overflow: 'hidden',
    };

    return (
        <div className="dash-page" style={{ paddingBottom: 24 }}>
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
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <span>{notification.message}</span>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="adm-page-header" style={{ marginBottom: 12 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '6px 10px', borderRadius: 8, fontSize: 18 }}>
                            <BsPeopleFill />
                        </span>
                        Customers
                    </h1>
                    <p className="adm-page-sub" style={{ marginTop: 2 }}>Manage customer relationships, directory profiles, and engagement.</p>
                </div>

                <div className="adm-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => setShowCampaignModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12 }}
                    >
                        <BsChatText size={14} /> Send Campaign
                    </button>

                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => setShowExportModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12 }}
                    >
                        <BsDownload size={14} /> Export Directory
                    </button>

                    <button
                        type="button"
                        className="adm-btn-primary"
                        onClick={() => setShowAddModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12 }}
                    >
                        <BsPlus size={18} /> Add Customer
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
                {loading ? (
                    <>
                        <KpiSkeleton />
                        <KpiSkeleton />
                        <KpiSkeleton />
                    </>
                ) : (
                    <>
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Total Customers</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '2px 0 0 0' }}>{totalCustomers}</p>
                            <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}></span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Active Customers</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981', margin: '2px 0 0 0' }}>{activeCustomers}</p>
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}></span>
                        </div>

                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>Inactive Customers</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', margin: '2px 0 0 0' }}>{inactiveCustomers}</p>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}></span>
                        </div>
                    </>
                )}
            </div>

            {/* Birthday Reminders Banner */}
            {birthdayCustomers.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🎂</span>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: 0 }}>Birthday Reminders & Greetings</p>
                            <p style={{ fontSize: 11, color: '#b45309', margin: '1px 0 0 0' }}>
                                {birthdayCustomers.slice(0, 4).map(b => b.name || b.customer_name).join(', ')}
                                {birthdayCustomers.length > 4 ? ` +${birthdayCustomers.length - 4} more` : ''}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: 12, border: '1px solid #fde68a' }}>
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
                                borderRadius: 6,
                                padding: '5px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: birthdayGifting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.2)'
                            }}
                        >
                            {birthdayGifting ? 'Sending Wishes…' : '🎉 Send Birthday Wishes to All'}
                        </button>
                    </div>
                </div>
            )}

            {/* Customer Intelligence & Analytics Grid */}
            <div style={{ marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BsStarFill style={{ color: '#6366f1' }} /> Customer Intelligence & Analytics
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                    {/* Card 1: Top Customers */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🏆 Top Customers
                            </span>
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>By Spend</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }} className="custom-scrollbar">
                            {(() => {
                                const list = normalizeApiList(customerInsights.topCustomers);
                                const candidateList = list.length > 0 ? list : customers;
                                const top5 = candidateList
                                    .map(c => ({
                                        id: c.customer_id || c.backendId || c.id,
                                        name: c.customer_name || c.name || 'Customer',
                                        spend: Number(c.total_spend ?? c.totalSpent ?? c.revenue ?? 0),
                                    }))
                                    .filter(c => c.spend > 0)
                                    .sort((a, b) => b.spend - a.spend)
                                    .slice(0, 5);

                                if (top5.length === 0) {
                                    return (
                                        <div style={{ padding: '10px 8px', textAlign: 'center', color: '#9ca3af', margin: 'auto' }}>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', margin: 0 }}>No Purchases Yet</p>
                                            <p style={{ fontSize: 10, margin: '2px 0 0', color: '#9ca3af' }}>Top spenders appear once customer orders are logged.</p>
                                        </div>
                                    );
                                }

                                return top5.map((c, idx) => (
                                    <div key={c.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '3px 6px', background: '#f9fafb', borderRadius: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                            <span style={{ fontSize: 9, fontWeight: 800, color: idx === 0 ? '#d97706' : '#6b7280', background: idx === 0 ? '#fffbeb' : '#e5e7eb', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {idx + 1}
                                            </span>
                                            <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>
                                                {c.name}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: '#10b981', flexShrink: 0, marginLeft: 6 }}>
                                            {fmt(c.spend)}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Card 2: Lifetime Value (LTV) */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                💎 Lifetime Value (LTV)
                            </span>
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Top 5 LTV</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }} className="custom-scrollbar">
                            {(() => {
                                const rawLtv = customerInsights.lifetimeValue;
                                const ltvItems = normalizeApiList(rawLtv);
                                let candidates = [];

                                if (ltvItems.length > 0) {
                                    // Use genuine LTV API data from /customer-analytics/lifetime-value
                                    candidates = ltvItems
                                        .map(c => {
                                            const val = c.lifetime_value !== null && c.lifetime_value !== undefined && c.lifetime_value !== ''
                                                ? Number(c.lifetime_value)
                                                : Number(c.ltv ?? c.total_spend ?? 0);
                                            return {
                                                id: c.customer_id || c.id,
                                                name: c.customer_name || c.name || 'Customer',
                                                ltv: val,
                                            };
                                        })
                                        .filter(c => !isNaN(c.ltv) && c.ltv > 0);
                                } else {
                                    // Only include if customers have an explicit ltv / lifetime_value property; avoid mirroring top spenders
                                    candidates = customers
                                        .filter(c => c.ltv !== undefined || c.lifetime_value !== undefined)
                                        .map(c => ({
                                            id: c.backendId || c.id,
                                            name: c.name || 'Customer',
                                            ltv: Number(c.lifetime_value ?? c.ltv ?? 0),
                                        }))
                                        .filter(c => !isNaN(c.ltv) && c.ltv > 0);
                                }

                                const top5Ltv = candidates
                                    .sort((a, b) => b.ltv - a.ltv)
                                    .slice(0, 5);

                                if (top5Ltv.length === 0) {
                                    return (
                                        <div style={{ padding: '10px 8px', textAlign: 'center', color: '#9ca3af', margin: 'auto' }}>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', margin: 0 }}>No LTV Data Available</p>
                                            <p style={{ fontSize: 10, margin: '2px 0 0', color: '#9ca3af' }}>LTV metrics will appear once calculated by the analytics engine.</p>
                                        </div>
                                    );
                                }

                                return top5Ltv.map((c, idx) => (
                                    <div key={c.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '3px 6px', background: '#f9fafb', borderRadius: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                #{idx + 1}
                                            </span>
                                            <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>
                                                {c.name}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: '#8b5cf6', flexShrink: 0, marginLeft: 6 }}>
                                            {fmt(c.ltv)}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Card 3: Customer Segments */}
                    <div style={analyticsCardStyle}>
                        {(() => {
                            const total = customers.length;
                            const newCount = customers.filter(c => (c.type || c.segment || '').toLowerCase() === 'new').length;
                            const wholesaleCount = customers.filter(c => (c.type || c.segment || '').toLowerCase() === 'wholesale').length;
                            // Reconcile Regular so sum of counts exactly equals total:
                            const regularCount = Math.max(0, total - newCount - wholesaleCount);

                            // Reconcile Percentages so sum of percentages exactly equals 100% when total > 0:
                            let newPct = 0;
                            let wholesalePct = 0;
                            let regularPct = 0;
                            if (total > 0) {
                                newPct = Math.round((newCount / total) * 100);
                                wholesalePct = Math.round((wholesaleCount / total) * 100);
                                regularPct = Math.max(0, 100 - newPct - wholesalePct);
                            }

                            const segments = [
                                { label: 'New', count: newCount, pct: newPct, color: '#0ea5e9' },
                                { label: 'Regular', count: regularCount, pct: regularPct, color: '#6366f1' },
                                { label: 'Wholesale', count: wholesaleCount, pct: wholesalePct, color: '#8b5cf6' },
                            ];

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            👥 Customer Segments
                                        </span>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#0ea5e9', background: '#f0f9ff', padding: '2px 6px', borderRadius: 10 }}>
                                            Total: {total}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, margin: '2px 0' }}>
                                        {segments.map(s => (
                                            <div key={s.label} style={{ background: '#f9fafb', padding: '4px 6px', borderRadius: 6, border: '1px solid #f3f4f6', textAlign: 'center' }}>
                                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, display: 'block' }}>{s.label}</span>
                                                <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: '1px 0 0 0' }}>
                                                    {s.count}
                                                </p>
                                                <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 700 }}>
                                                    {s.pct}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#6b7280', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: 3, marginTop: 2 }}>
                                        <span>Reconciled</span>
                                        <span style={{ fontWeight: 700, color: '#10b981' }}>{newCount + regularCount + wholesaleCount} / {total} (100%)</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Card 4: Retention Report */}
                    <div style={analyticsCardStyle}>
                        {(() => {
                            const raw = customerInsights.retention;
                            const tot = typeof raw?.total_customers === 'number' ? raw.total_customers : totalCustomers;
                            const active = typeof raw?.active_customers === 'number' ? raw.active_customers : activeCustomers;
                            const inactive = typeof raw?.inactive_customers === 'number' ? raw.inactive_customers : inactiveCustomers;
                            const retained = typeof raw?.retained_customers === 'number'
                                ? raw.retained_customers
                                : customers.filter(c => Number(c.orders || 0) > 1).length;

                            let ratePct = 0;
                            if (typeof raw?.retention_rate === 'number') {
                                const r = raw.retention_rate;
                                ratePct = r <= 1 && r > 0 ? Math.round(r * 100) : Math.round(r);
                            } else if (tot > 0) {
                                ratePct = Math.round((retained / tot) * 100);
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            📈 Retention Report
                                        </span>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '2px 6px', borderRadius: 10 }}>
                                            {ratePct}% Rate
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, margin: '2px 0' }}>
                                        <div style={{ background: '#f9fafb', padding: '4px 6px', borderRadius: 6, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Retained</span>
                                            <p style={{ fontSize: 14, fontWeight: 800, color: '#10b981', margin: '1px 0 0 0' }}>
                                                {retained}
                                            </p>
                                        </div>
                                        <div style={{ background: '#f9fafb', padding: '4px 6px', borderRadius: 6, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Active</span>
                                            <p style={{ fontSize: 14, fontWeight: 800, color: '#6366f1', margin: '1px 0 0 0' }}>
                                                {active}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: '#6b7280', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: 3, marginTop: 2 }}>
                                        <span>Inactive: <strong style={{ color: '#ef4444' }}>{inactive}</strong></span>
                                        <span>Cohort: <strong style={{ color: '#111827' }}>{tot} users</strong></span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Main Customer Table Card */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Search & Filter Bar */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                            <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                            <input
                                type="text"
                                className="ec-input"
                                placeholder="Search by customer name, email, phone or city..."
                                value={search}
                                onChange={e => { setSearch(e.target.value.replace(/^\s+/, '')); setPage(1); }}
                                style={{ paddingLeft: 34, paddingRight: search ? 30 : 12, width: '100%', height: 35 }}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); setPage(1); }}
                                    style={{
                                        position: 'absolute',
                                        right: 10,
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

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: '#000000', fontWeight: 700 }}>Status:</span>
                                <select
                                    className="ec-input"
                                    value={filterStatus}
                                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                    style={{ height: 35, fontSize: 12, padding: '0 10px' }}
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: '#000000', fontWeight: 700 }}>Segment:</span>
                                <select
                                    className="ec-input"
                                    value={filterType}
                                    onChange={e => { setFilterType(e.target.value); setPage(1); }}
                                    style={{ height: 35, fontSize: 12, padding: '0 10px' }}
                                >
                                    <option value="All">All Types</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Wholesale">Wholesale</option>
                                    <option value="New">New</option>
                                </select>
                            </div>

                            {availableCities.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#000000', fontWeight: 700 }}>City:</span>
                                    <select
                                        className="ec-input"
                                        value={filterCity}
                                        onChange={e => { setFilterCity(e.target.value); setPage(1); }}
                                        style={{ height: 35, fontSize: 12, padding: '0 10px' }}
                                    >
                                        <option value="All">All Cities</option>
                                        {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Chips & Reset Button */}
                    {hasActiveFilters && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, pt: 6 }}>
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

                {/* Directory Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '9px 10px', width: 36, textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isAllPageSelected}
                                        onChange={handleToggleSelectAllPage}
                                        title="Select all on this page"
                                        style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                    />
                                </th>
                                <th style={{ padding: '9px 8px', width: 55, textAlign: 'center' }}>Sr. No.</th>
                                <th style={{ padding: '9px 14px' }}>Customer Name</th>
                                <th style={{ padding: '9px 14px' }}>Segment</th>
                                <th style={{ padding: '9px 14px' }}>Phone</th>
                                <th style={{ padding: '9px 14px' }}>Address</th>
                                <th style={{ padding: '9px 14px', textAlign: 'center' }}>Orders</th>
                                <th style={{ padding: '9px 14px' }}>Total Spent</th>
                                <th style={{ padding: '9px 14px' }}>Status</th>
                                <th style={{ padding: '9px 14px', textAlign: 'center' }}>Actions</th>
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
                                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af' }}>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>No Customers Found</p>
                                        <p style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search filter or add a new customer.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCustomers.map((cust, idx) => {
                                    const custId = cust.backendId || cust.id;
                                    const isRowSelected = selectedIds.includes(custId);
                                    const serialNumber = (page - 1) * pageSize + idx + 1;
                                    return (
                                        <tr key={cust.id} style={{ borderBottom: '1px solid #f3f4f6', background: isRowSelected ? '#f5f3ff' : 'transparent', transition: 'background 0.15s ease' }} className="table-row-hover">
                                            <td style={{ padding: '9px 10px', width: 36, textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isRowSelected}
                                                    onChange={() => handleToggleSelectRow(custId)}
                                                    style={{ cursor: 'pointer', accentColor: '#6366f1' }}
                                                />
                                            </td>

                                            <td style={{ padding: '9px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12, width: 55 }}>
                                                {serialNumber}
                                            </td>

                                            <td style={{ padding: '9px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {cust.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 13 }}>{cust.name}</p>
                                                        <p style={{ fontSize: 11, color: '#6b7280', margin: '1px 0 0 0' }}>{cust.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td style={{ padding: '9px 14px' }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: typeCfg[cust.type]?.bg || '#eef2ff', color: typeCfg[cust.type]?.color || '#6366f1', display: 'inline-block' }}>
                                                    {cust.type}
                                                </span>
                                            </td>

                                            <td style={{ padding: '9px 14px', color: '#374151', fontWeight: 500 }}>
                                                {cust.phone || '—'}
                                            </td>

                                            <td style={{ padding: '9px 14px', color: '#374151' }}>
                                                {cust.location || cust.city || '—'}
                                            </td>

                                            <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: '#111827' }}>
                                                {cust.orders ?? 0}
                                            </td>

                                            <td style={{ padding: '9px 14px', fontWeight: 800, color: '#10b981' }}>
                                                {fmt(cust.totalSpent)}
                                            </td>

                                            <td style={{ padding: '9px 14px' }}>
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

                                            <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                                    <CustomerStatusToggle
                                                        isActive={cust.status === 'Active'}
                                                        loading={updatingStatusId === custId}
                                                        onToggle={() => handleStatusToggle(custId, cust.status)}
                                                    />

                                                    <button
                                                        type="button"
                                                        title="View Profile Details"
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
                                                    >
                                                        <BsEye size={14} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Edit Customer"
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
                                                    >
                                                        <BsPencilSquare size={13} />
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
                        Showing <strong>{filteredCustomers.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, filteredCustomers.length)}</strong> of <strong>{filteredCustomers.length}</strong> customers
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
                                disabled={page === 1}
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
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
                                disabled={page >= totalPages}
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
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

            {/* Floating Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    background: '#1e293b',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: 14,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    fontSize: 13,
                    fontWeight: 600,
                }}>
                    <span style={{ color: '#e2e8f0' }}>{selectedIds.length} {selectedIds.length === 1 ? 'customer' : 'customers'} selected</span>
                    <div style={{ height: 16, width: 1, background: '#475569' }} />
                    <button
                        type="button"
                        onClick={() => setShowCampaignModal(true)}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        🚀 Bulk Campaign
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowExportModal(true)}
                        style={{ background: '#334155', color: '#f8fafc', border: '1px solid #475569', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        📥 Export Selected
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        style={{ background: 'transparent', color: '#94a3b8', border: 'none', padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                    >
                        Clear ✕
                    </button>
                </div>
            )}

            {/* Modals & Slide-over Detail Panel */}
            {showAddModal && (
                <AddCustomerModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={async () => {
                        setShowAddModal(false);
                        showNotification('Customer created successfully!', 'success');
                        await loadCrmDashboard(false);
                    }}
                />
            )}

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
                        await loadCrmDashboard(false);
                    }}
                />
            )}

            {showCampaignModal && (
                <SendCampaignModal
                    customers={customers}
                    preSelectedIds={selectedIds}
                    onClose={() => setShowCampaignModal(false)}
                    onCampaignSent={() => {
                        setShowCampaignModal(false);
                        showNotification('Marketing campaign sent successfully!', 'success');
                    }}
                />
            )}

            {showExportModal && (
                <ExportDirectoryModal
                    isOpen={showExportModal}
                    customers={filteredCustomers}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {selectedCustomer && (
                <CustomerDetailPanel
                    customer={selectedCustomer}
                    detailExtras={detailExtras}
                    loading={viewLoading}
                    onClose={() => setSelectedCustomer(null)}
                    onStatusChange={handleStatusToggle}
                    onRefresh={handleViewCustomerProfile}
                    showFeedback={true}
                    allowedTabs={['Overview', 'Orders', 'Ledger', 'Notes', 'Messages', 'Actions']}
                    hideLoyalty={true}
                    hideWallet={true}
                />
            )}
        </div>
    );
};

export default Customers;
