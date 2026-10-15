import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import axios from 'axios';
import { getAccessToken } from '../../utils/tokenStorage';
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
} from 'react-icons/bs';

const TARGET_TYPES = [
    { value: 'revenue', label: 'Revenue Target (₹)' },
    { value: 'sales', label: 'Sales Volume' },
    { value: 'orders', label: 'Order Count' },
    { value: 'profit', label: 'Gross Profit (₹)' },
];

const PERIOD_OPTIONS = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'daily', label: 'Daily' },
];

const Stores = () => {
    // Initial sample targets populated with backend response pattern
    const [targets, setTargets] = useState([
        {
            id: 1,
            store_id: 2,
            target_type: 'revenue',
            target_value: '100000.00',
            period: 'monthly',
            start_date: '2026-09-01T00:00:00',
            end_date: '2026-09-30T23:59:59',
            status: 'active',
            created_at: '2026-09-07T11:59:06',
            updated_at: '2026-09-07T11:59:06',
        }
    ]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('all');

    // Form state for Create Target
    const [formData, setFormData] = useState({
        store_id: 2,
        target_type: 'revenue',
        target_value: 100000,
        period: 'monthly',
        start_date: '2026-09-01T00:00:00',
        end_date: '2026-09-30T23:59:59',
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

    // Helper to ensure ISO string with T00:00:00 / T23:59:59 format
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

    // Fetch existing targets on load
    const fetchTargets = async () => {
        setFetchLoading(true);
        try {
            // Attempt with configured apiClient
            const res = await apiClient.get('/store-targets');
            if (res.data) {
                const data = Array.isArray(res.data) ? res.data : (res.data.items || [res.data]);
                if (data.length > 0) {
                    setTargets(data);
                }
            }
        } catch (err) {
            // Fallback check to local server http://127.0.0.1:8000/api/v1/store-targets if available
            try {
                const token = getAccessToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const localRes = await axios.get('http://127.0.0.1:8000/api/v1/store-targets', { headers, timeout: 2500 });
                if (localRes.data) {
                    const localData = Array.isArray(localRes.data) ? localRes.data : (localRes.data.items || [localRes.data]);
                    if (localData.length > 0) setTargets(localData);
                }
            } catch (_) {
                // If backend list endpoint isn't ready, maintain active target state
            }
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        fetchTargets();
    }, []);

    // Create Target API call
    const handleCreateTarget = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        // Prepare exact request payload
        const payload = {
            store_id: parseInt(formData.store_id, 10),
            target_type: formData.target_type,
            target_value: Number(formData.target_value),
            period: formData.period,
            start_date: formatToISO(formData.start_date, false),
            end_date: formatToISO(formData.end_date, true),
        };

        try {
            let createdTarget = null;

            // 1. First attempt: call standard configured apiClient (/api/v1/store-targets)
            try {
                const res = await apiClient.post('/store-targets', payload);
                createdTarget = res.data;
            } catch (apiErr) {
                // 2. Second attempt: directly call local backend http://127.0.0.1:8000/api/v1/store-targets
                const token = getAccessToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const localRes = await axios.post('http://127.0.0.1:8000/api/v1/store-targets', payload, {
                    headers,
                    timeout: 5000,
                });
                createdTarget = localRes.data;
            }

            if (createdTarget) {
                setSuccessMsg(`Target for Store #${createdTarget.store_id} created successfully! (ID: ${createdTarget.id})`);
                setTargets(prev => {
                    const filtered = prev.filter(t => t.id !== createdTarget.id);
                    return [createdTarget, ...filtered];
                });
                setShowCreateModal(false);
                setTimeout(() => setSuccessMsg(''), 4000);
            }
        } catch (err) {
            console.error('Create Target Error:', err);
            const errDetail = err.response?.data?.detail || err.response?.data?.message || err.message;
            setErrorMsg(`Failed to create target: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredTargets = targets.filter(t => {
        if (filterPeriod === 'all') return true;
        return t.period?.toLowerCase() === filterPeriod.toLowerCase();
    });

    const totalRevenueTarget = targets
        .filter(t => t.target_type === 'revenue')
        .reduce((sum, t) => sum + parseFloat(t.target_value || 0), 0);

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 24,
            }}>
                <div>
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
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        onClick={fetchTargets}
                        disabled={fetchLoading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 14px', borderRadius: 10,
                            background: '#fff', border: '1px solid #e2e8f0',
                            color: '#475569', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                    >
                        <BsArrowRepeat size={14} className={fetchLoading ? 'spin-anim' : ''} />
                        <span>Refresh</span>
                    </button>

                    <button
                        id="create-target-btn"
                        onClick={() => {
                            setErrorMsg('');
                            setShowCreateModal(true);
                        }}
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
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Active store milestones</span>
                </div>

                <div style={{
                    background: '#fff', borderRadius: 14, padding: '18px 20px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Revenue Target</span>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <BsCashStack size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                        ₹{totalRevenueTarget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Sum of all store revenue goals</span>
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
                        {new Set(targets.map(t => t.store_id)).size}
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Configured branch stores</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{
                background: '#fff', borderRadius: 14, padding: '14px 18px',
                border: '1px solid #e2e8f0', marginBottom: 20,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsFilter size={16} color="#64748b" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Period Filter:</span>
                    {['all', 'monthly', 'quarterly', 'yearly'].map(p => (
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

                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    Showing {filteredTargets.length} target{filteredTargets.length === 1 ? '' : 's'}
                </div>
            </div>

            {/* Targets Table */}
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
                                <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created At</th>
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
                                                <span>Store #{item.store_id}</span>
                                            </div>
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
                                        <td style={{ padding: '14px 18px', fontSize: 11, color: '#94a3b8' }}>
                                            {item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── CREATE TARGET MODAL ── */}
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
                                        Create Store Target
                                    </h3>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        POST /api/v1/store-targets
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
                        <form onSubmit={handleCreateTarget} style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Store ID */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                        Store ID <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.store_id}
                                        onChange={e => setFormData({ ...formData, store_id: e.target.value })}
                                        placeholder="e.g. 2"
                                        style={{
                                            width: '100%', padding: '9px 12px', borderRadius: 8,
                                            border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>ID of store for this milestone (e.g. 2)</span>
                                </div>

                                {/* Target Type & Period (2 columns) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                            Target Type <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select
                                            value={formData.target_type}
                                            onChange={e => setFormData({ ...formData, target_type: e.target.value })}
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
                                            value={formData.period}
                                            onChange={e => setFormData({ ...formData, period: e.target.value })}
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
                                        min="0"
                                        step="any"
                                        value={formData.target_value}
                                        onChange={e => setFormData({ ...formData, target_value: e.target.value })}
                                        placeholder="e.g. 100000"
                                        style={{
                                            width: '100%', padding: '9px 12px', borderRadius: 8,
                                            border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Target amount to achieve (e.g. 100000)</span>
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
                                            value={toInputDatetime(formData.start_date)}
                                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
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
                                            value={toInputDatetime(formData.end_date)}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                            style={{
                                                width: '100%', padding: '9px 10px', borderRadius: 8,
                                                border: '1px solid #cbd5e1', fontSize: 12, outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
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
                                    disabled={loading}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '9px 20px', borderRadius: 8,
                                        border: 'none', background: '#4f46e5',
                                        fontSize: 13, fontWeight: 700, color: '#fff',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <BsHourglassSplit size={14} className="spin-anim" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <BsCheckCircleFill size={13} />
                                            <span>Create Target</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stores;
