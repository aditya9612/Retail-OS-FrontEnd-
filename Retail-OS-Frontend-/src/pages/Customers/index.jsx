// Customer Directory Page - Updated for testing
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { State, City } from 'country-state-city';
import {
    BsSearch, BsDownload, BsPeopleFill, BsPhone, BsGeoAlt,
    BsCalendar, BsCurrencyRupee, BsStarFill, BsPlus, BsEye, BsPencilSquare,
    BsChevronLeft, BsChevronRight, BsCheckCircleFill, BsXCircleFill,
    BsWallet2, BsChatText, BsJournalText, BsShare,
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
    getRetentionReport,
    getLifetimeValue,
    getLoyaltyReport,
    getCustomerLoyalty,
    getCustomerWallet,
    getWalletTransactions,
    getLoyaltyHistory,
    getCustomerOrders,
    sendCampaign,
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

const PAGE_SIZE = 10;
const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const getTodayDateString = () => new Date().toISOString().split('T')[0];

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} /> },
    Inactive: { color: '#6b7280', bg: '#f3f4f6', icon: null },
    Blocked: { color: '#ef4444', bg: '#fef2f2', icon: <BsXCircleFill size={10} /> },
};

const typeCfg = {
    Regular: { color: '#6366f1', bg: '#eef2ff' },
    Wholesale: { color: '#8b5cf6', bg: '#f5f3ff' },
    VIP: { color: '#d97706', bg: '#fffbeb' },
    New: { color: '#0ea5e9', bg: '#f0f9ff' },
};

// Professional Active / Inactive Toggle Switch Component
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
        credit: '',
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
            alert('Please fill all required fields (*)');
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

            alert('Customer created successfully!');
            if (onCreated) await onCreated();
            onClose();
        } catch (err) {
            console.error('Create customer error:', err);
            alert(getApiErrorMessage(err, 'Failed to create customer.'));
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
                                <option value="vip">VIP</option>
                                {/* <option value="wholesale">Wholesale</option> */}
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
const EditCustomerModal = ({ customer, onClose, onSaved }) => {
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

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateCustomer(customer.backendId, {
                name: form.name,
                email: form.email,
                phone: form.phone,
                address: form.city,
                status: form.status.toLowerCase(),
                segment: form.type.toLowerCase(),
                birthday: form.birthday || null,
            });
            alert('Customer updated successfully!');
            if (onSaved) await onSaved();
            onClose();
        } catch (err) {
            console.error('Update failed:', err);
            alert(getApiErrorMessage(err, 'Failed to update customer.'));
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
                                <option value="Blocked">Blocked</option>
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

    // Modals & Detail States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailExtras, setDetailExtras] = useState({});
    const [viewLoading, setViewLoading] = useState(false);

    const hasLoadedRef = useRef(false);

    // Initial Load: Loads ONLY directory APIs (customers & stats) once on page mount
    const loadCrmDashboard = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError('');

        const [customersRes, statsRes] = await Promise.allSettled([
            getCustomers(),
            getCustomerStats(),
        ]);

        if (customersRes.status === 'fulfilled') {
            const list = normalizeApiList(customersRes.value);
            setCustomers(list.map(c => formatCustomerRecord(c)));
        } else {
            setError('Unable to load customer directory.');
        }

        if (statsRes.status === 'fulfilled') {
            setCustomerStats(statsRes.value);
        }

        if (showLoader) setLoading(false);
    };

    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
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
                        onClick={() => setShowCampaignModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <BsChatText size={14} /> Send Campaign
                    </button>

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

            {/* Customer Intelligence & Analytics Grid */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsStarFill style={{ color: '#6366f1' }} /> Customer Intelligence & Analytics
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {/* Card 1: Top Customers */}
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

                    {/* Card 2: Retention Report */}
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
                                                {fmt(c.ltv || c.lifetime_value || c.total_spend || c.totalSpent || 0)}
                                            </span>
                                        </div>
                                    ))
                                );
                            })()}
                        </div>
                    </div>

                    {/* Card 4: Loyalty Summary */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                🎁 Loyalty Summary
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 10 }}>
                                Rewards
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Enrolled</span>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#d97706', margin: '2px 0 0 0' }}>
                                    {customerInsights.loyaltyReport?.enrolled_members ?? customerInsights.loyaltyReport?.total_enrolled ?? customers.filter(c => c.loyaltyPoints > 0).length} members
                                </p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Points Issued</span>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#d97706', margin: '2px 0 0 0' }}>
                                    {customerInsights.loyaltyReport?.total_points_issued ? `${customerInsights.loyaltyReport.total_points_issued.toLocaleString('en-IN')} pts` : `${customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0).toLocaleString('en-IN')} pts`}
                                </p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Redeemed Points</span>
                            <span style={{ fontWeight: 700, color: '#111827' }}>
                                {customerInsights.loyaltyReport?.total_points_redeemed ? `${customerInsights.loyaltyReport.total_points_redeemed.toLocaleString('en-IN')} pts` : '0 pts'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CRM Relationship Hub (Fixed 190px uniform height cards, NO raw object output) */}
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsJournalText style={{ color: '#6366f1' }} /> CRM Relationship Hub
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {/* CRM Card 1: Recent Notes */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Recent Notes
                            </span>
                            <BsJournalText size={16} style={{ color: '#3b82f6' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }} className="custom-scrollbar">
                            {notesList.length === 0 ? (
                                <div style={{ margin: 'auto', textAlign: 'center' }}>
                                    <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>0 notes logged</p>
                                </div>
                            ) : (
                                notesList.slice(0, 4).map((n, i) => (
                                    <div key={n.id || i} style={{ fontSize: 11, padding: '4px 8px', background: '#f9fafb', borderRadius: 6, border: '1px solid #f3f4f6' }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {n.content || n.note || n.text || 'Interaction note'}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CRM Card 2: Communications */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Communications
                            </span>
                            <BsChatText size={16} style={{ color: '#06b6d4' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }} className="custom-scrollbar">
                            {commsList.length === 0 ? (
                                <div style={{ margin: 'auto', textAlign: 'center' }}>
                                    <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>0 touchpoints</p>
                                </div>
                            ) : (
                                commsList.slice(0, 4).map((m, i) => (
                                    <div key={m.id || i} style={{ fontSize: 11, padding: '4px 8px', background: '#f9fafb', borderRadius: 6, border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase' }}>{m.channel || m.type || 'SMS'}</span>
                                        <span style={{ color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message || m.content || 'Sent'}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CRM Card 3: Referrals */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Referrals
                            </span>
                            <BsShare size={16} style={{ color: '#10b981' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }} className="custom-scrollbar">
                            {referralsList.length === 0 ? (
                                <div style={{ margin: 'auto', textAlign: 'center' }}>
                                    <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>0 referrals</p>
                                </div>
                            ) : (
                                referralsList.slice(0, 4).map((r, i) => (
                                    <div key={r.id || i} style={{ fontSize: 11, padding: '4px 8px', background: '#f9fafb', borderRadius: 6, border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 600, color: '#111827' }}>{r.email || r.code || 'Referral'}</span>
                                        <span style={{ fontWeight: 700, color: '#10b981' }}>{r.status || 'Active'}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CRM Card 4: Wallet & Loyalty Quick Stats */}
                    <div style={analyticsCardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Wallet & Loyalty
                            </span>
                            <BsWallet2 size={16} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Total Wallet</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', margin: '2px 0 0 0' }}>
                                    {fmt(customers.reduce((acc, c) => acc + (c.credit || 0), 0))}
                                </p>
                            </div>
                            <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Loyalty Pool</span>
                                <p style={{ fontSize: 15, fontWeight: 800, color: '#d97706', margin: '2px 0 0 0' }}>
                                    {customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0)} pts
                                </p>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Active rewards</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Customer Table Card */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Search & Filter Bar */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <BsSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
                            <input
                                type="text"
                                className="ec-input"
                                placeholder="Search by customer name, email, phone or city..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                style={{ paddingLeft: 34, width: '100%', height: 38 }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#000000', fontWeight: 700 }}>Status:</span>
                            <select
                                className="ec-input"
                                value={filterStatus}
                                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                            >
                                <option value="All">AllStatus</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Blocked">Blocked</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#000000', fontWeight: 700 }}>Segment:</span>
                            <select
                                className="ec-input"
                                value={filterType}
                                onChange={e => { setFilterType(e.target.value); setPage(1); }}
                                style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                            >
                                <option value="All">All Types</option>
                                <option value="Regular">Regular</option>
                                <option value="VIP">VIP</option>
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
                                    style={{ height: 38, fontSize: 12, padding: '0 10px' }}
                                >
                                    <option value="All">All Cities</option>
                                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                </div>

                {/* Directory Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '12px 16px' }}>Customer Name</th>
                                <th style={{ padding: '12px 16px' }}>ID & Segment</th>
                                <th style={{ padding: '12px 16px' }}>Phone</th>
                                <th style={{ padding: '12px 16px' }}>Location</th>
                                <th style={{ padding: '12px 16px' }}>Orders</th>
                                <th style={{ padding: '12px 16px' }}>Total Spent</th>
                                <th style={{ padding: '12px 16px' }}>Wallet / Points</th>
                                <th style={{ padding: '12px 16px' }}>Status </th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
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
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: 0 }}>No Customers Found</p>
                                        <p style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search filter or add a new customer.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCustomers.map((cust) => (
                                    <tr key={cust.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s ease' }} className="table-row-hover">
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {cust.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 13 }}>{cust.name}</p>
                                                    <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0 0' }}>{cust.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{cust.id}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: typeCfg[cust.type]?.bg || '#eef2ff', color: typeCfg[cust.type]?.color || '#6366f1' }}>
                                                    {cust.type}
                                                </span>
                                            </div>
                                        </td>

                                        <td style={{ padding: '14px 16px', color: '#374151', fontWeight: 500 }}>
                                            {cust.phone || '—'}
                                        </td>

                                        <td style={{ padding: '14px 16px', color: '#374151' }}>
                                            {cust.city || '—'}
                                        </td>

                                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                                            {cust.orders} orders
                                        </td>

                                        <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981' }}>
                                            {fmt(cust.totalSpent)}
                                        </td>

                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontSize: 11 }}>
                                                <span style={{ color: '#6366f1', fontWeight: 700, display: 'block' }}>Wallet: {fmt(cust.credit || 0)}</span>
                                                <span style={{ color: '#d97706', fontWeight: 600 }}>Points: {cust.loyaltyPoints || 0} pts</span>
                                            </div>
                                        </td>

                                        <td style={{ padding: '14px 16px' }}>
                                            <CustomerStatusToggle
                                                isActive={cust.status === 'Active'}
                                                onToggle={() => handleStatusToggle(cust.backendId || cust.id, cust.status)}
                                            />
                                        </td>

                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    title="View Profile Details"
                                                    onClick={() => handleViewCustomerProfile(cust.backendId || cust.id)}
                                                    style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6366f1', cursor: 'pointer' }}
                                                >
                                                    <BsEye size={14} />
                                                </button>

                                                <button
                                                    type="button"
                                                    title="Edit Customer"
                                                    onClick={() => setEditingCustomer(cust)}
                                                    style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
                                                >
                                                    <BsPencilSquare size={14} />
                                                </button>


                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                        Showing <strong>{filteredCustomers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}</strong> to <strong>{Math.min(page * PAGE_SIZE, filteredCustomers.length)}</strong> of <strong>{filteredCustomers.length}</strong> customers
                    </p>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            disabled={page === 1}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            style={{ padding: '5px 10px', fontSize: 12 }}
                        >
                            <BsChevronLeft size={12} /> Prev
                        </button>

                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                            Page {page} of {totalPages}
                        </span>

                        <button
                            type="button"
                            className="adm-btn-secondary"
                            disabled={page >= totalPages}
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            style={{ padding: '5px 10px', fontSize: 12 }}
                        >
                            Next <BsChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals & Slide-over Detail Panel */}
            {showAddModal && (
                <AddCustomerModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={loadCrmDashboard}
                />
            )}

            {editingCustomer && (
                <EditCustomerModal
                    customer={editingCustomer}
                    onClose={() => setEditingCustomer(null)}
                    onSaved={loadCrmDashboard}
                />
            )}

            {showCampaignModal && (
                <SendCampaignModal
                    customers={customers}
                    onClose={() => setShowCampaignModal(false)}
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
                />
            )}
        </div>
    );
};

export default Customers;
