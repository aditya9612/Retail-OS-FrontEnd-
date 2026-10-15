import React, { useState } from 'react';
import {
    BsSearch, BsStarFill, BsStar, BsTrashFill, BsCheckCircleFill,
    BsXCircleFill, BsChevronLeft, BsChevronRight, BsChatLeftText,
    BsEye, BsShieldFill, BsFlag, BsArrowUpRight,
} from 'react-icons/bs';

/* ── Helper to load real or stored reviews ── */
const loadStoredReviews = () => {
    try {
        const stored = localStorage.getItem('product_reviews');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (_) {}
    return [];
};

const PAGE_SIZE = 6;

const statusCfg = {
    Approved: { color: '#10b981', bg: '#ecfdf5', icon: <BsCheckCircleFill size={10} /> },
    Pending: { color: '#f59e0b', bg: '#fffbeb', icon: null },
    Flagged: { color: '#ef4444', bg: '#fef2f2', icon: <BsFlag size={10} /> },
    Rejected: { color: '#6b7280', bg: '#f3f4f6', icon: <BsXCircleFill size={10} /> },
};

/* ── Star Rating Display ─────────────── */
const StarRating = ({ rating, size = 12 }) => (
    <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
            i <= rating
                ? <BsStarFill key={i} size={size} color="#f59e0b" />
                : <BsStar key={i} size={size} color="#d1d5db" />
        ))}
    </div>
);

/* ── Review Detail Modal ─────────────── */
const ReviewDetail = ({ review, onClose, onAction }) => {
    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{review.title}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{review.id} · {review.product}</p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Customer & Product */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{review.customer}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Reviewed on {review.date}</p>
                        </div>
                        <StarRating rating={review.rating} size={14} />
                    </div>
                </div>

                {/* Review content */}
                <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>"{review.title}"</p>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>{review.comment}</p>
                </div>

                {review.images > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {Array.from({ length: review.images }).map((_, i) => (
                            <div key={i} style={{ width: 64, height: 64, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db', fontSize: 11, color: '#9ca3af' }}>
                                IMG {i + 1}
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>👍 {review.helpful} found this helpful</span>
                </div>

                {/* Actions */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Moderation Action</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.keys(statusCfg).map(s => (
                            <button key={s} onClick={() => { onAction(review.id, s); onClose(); }}
                                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${review.status === s ? statusCfg[s].color : '#e5e7eb'}`, background: review.status === s ? statusCfg[s].bg : '#fff', color: review.status === s ? statusCfg[s].color : '#6b7280' }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ──────────────────── */
const ReviewManagement = () => {
    const [reviews, setReviews] = useState(loadStoredReviews);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRating, setFilterRating] = useState('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    // Exact count breakdown across all reviews
    const counts = {
        all: reviews.length,
        approved: reviews.filter(r => r.status === 'Approved').length,
        pending: reviews.filter(r => r.status === 'Pending').length,
        flagged: reviews.filter(r => r.status === 'Flagged').length,
        rejected: reviews.filter(r => r.status === 'Rejected').length,
        rating5: reviews.filter(r => Number(r.rating) === 5).length,
        rating4: reviews.filter(r => Number(r.rating) === 4).length,
        rating3: reviews.filter(r => Number(r.rating) === 3).length,
        rating2: reviews.filter(r => Number(r.rating) === 2).length,
        rating1: reviews.filter(r => Number(r.rating) === 1).length,
    };

    const filtered = reviews.filter(r => {
        const matchSearch = String(r.product || '').toLowerCase().includes(search.toLowerCase()) ||
            String(r.customer || '').toLowerCase().includes(search.toLowerCase()) ||
            String(r.title || '').toLowerCase().includes(search.toLowerCase()) ||
            String(r.comment || '').toLowerCase().includes(search.toLowerCase()) ||
            String(r.id || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || r.status === filterStatus;
        const matchRating = filterRating === 'All' || r.rating === parseInt(filterRating, 10);
        return matchSearch && matchStatus && matchRating;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleAction = (id, newStatus) => {
        setReviews(prev => {
            const next = prev.map(r => r.id === id ? { ...r, status: newStatus } : r);
            try { localStorage.setItem('product_reviews', JSON.stringify(next)); } catch (_) {}
            return next;
        });
        if (selected && selected.id === id) {
            setSelected(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    const handleDelete = (id) => {
        setReviews(prev => {
            const next = prev.filter(r => r.id !== id);
            try { localStorage.setItem('product_reviews', JSON.stringify(next)); } catch (_) {}
            return next;
        });
        if (selected && selected.id === id) {
            setSelected(null);
        }
    };

    const avgRating = reviews.length === 0
        ? '0.0'
        : (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1);

    const kpis = [
        { label: 'Total Reviews', value: counts.all, color: '#6366f1', bg: '#eef2ff', icon: '💬', badge: 'Total' },
        { label: 'Approved Reviews', value: counts.approved, color: '#10b981', bg: '#ecfdf5', icon: '✅', badge: 'Approved' },
        { label: 'Pending Review', value: counts.pending, color: '#f59e0b', bg: '#fffbeb', icon: '⏳', badge: 'Pending' },
        { label: 'Flagged Reviews', value: counts.flagged, color: '#ef4444', bg: '#fef2f2', icon: '🚩', badge: 'Flagged' },
        { label: 'Rejected Reviews', value: counts.rejected, color: '#6b7280', bg: '#f3f4f6', icon: '❌', badge: 'Rejected' },
        { label: 'Avg. Rating', value: `${avgRating} ★`, color: '#f59e0b', bg: '#fffbeb', icon: '⭐', badge: 'Score' },
    ];

    const resetFilters = () => {
        setSearch('');
        setFilterStatus('All');
        setFilterRating('All');
        setPage(1);
    };

    const isFiltered = search !== '' || filterStatus !== 'All' || filterRating !== 'All';

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">💬 Reviews & Ratings</h1>
                    <p className="adm-page-sub">
                        Moderate customer product reviews and ratings — {counts.all} total reviews ({counts.approved} approved, {counts.pending} pending, {counts.flagged} flagged{counts.rejected > 0 ? `, ${counts.rejected} rejected` : ''})
                    </p>
                </div>
            </div>

            {/* KPI Metric Overview Cards (Informational) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div
                        key={i}
                        className="adm-kpi-card"
                        style={{
                            padding: '14px 18px',
                            border: '1.5px solid transparent',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, color: k.color, background: k.bg,
                                padding: '2px 8px', borderRadius: 20
                            }}>
                                {k.badge}
                            </span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: 24, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Status Quick-Tabs */}
            <div style={{ display: 'flex', gap: 0, background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, overflow: 'hidden' }}>
                {[
                    { key: 'All', label: 'All Reviews', count: counts.all, color: '#6366f1', bg: '#eef2ff' },
                    { key: 'Approved', label: 'Approved', count: counts.approved, color: '#10b981', bg: '#ecfdf5' },
                    { key: 'Pending', label: 'Pending', count: counts.pending, color: '#f59e0b', bg: '#fffbeb' },
                    { key: 'Flagged', label: 'Flagged', count: counts.flagged, color: '#ef4444', bg: '#fef2f2' },
                    { key: 'Rejected', label: 'Rejected', count: counts.rejected, color: '#6b7280', bg: '#f3f4f6' },
                ].map(t => {
                    const isActive = filterStatus === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => { setFilterStatus(t.key); setPage(1); }}
                            style={{
                                flex: 1, padding: '12px 14px', border: 'none', cursor: 'pointer',
                                background: isActive ? t.bg : 'transparent',
                                borderBottom: isActive ? `3px solid ${t.color}` : '3px solid transparent',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: 13,
                                color: isActive ? t.color : '#6b7280',
                                transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                        >
                            <span>{t.label}</span>
                            <span style={{
                                padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                background: isActive ? t.color : '#f3f4f6',
                                color: isActive ? '#fff' : '#6b7280'
                            }}>
                                {t.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by product, customer, title, comment, or ID..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 160 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    <option value="All">All Statuses ({counts.all})</option>
                    <option value="Approved">Approved ({counts.approved})</option>
                    <option value="Pending">Pending ({counts.pending})</option>
                    <option value="Flagged">Flagged ({counts.flagged})</option>
                    <option value="Rejected">Rejected ({counts.rejected})</option>
                </select>
                <select className="ec-input" style={{ minWidth: 160 }} value={filterRating}
                    onChange={e => { setFilterRating(e.target.value); setPage(1); }}>
                    <option value="All">All Ratings ({counts.all})</option>
                    <option value="5">5 Star ({counts.rating5})</option>
                    <option value="4">4 Star ({counts.rating4})</option>
                    <option value="3">3 Star ({counts.rating3})</option>
                    <option value="2">2 Star ({counts.rating2})</option>
                    <option value="1">1 Star ({counts.rating1})</option>
                </select>
                {isFiltered && (
                    <button
                        className="adm-btn-secondary"
                        onClick={resetFilters}
                        style={{ padding: '7px 12px', fontSize: 12, color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}
                    >
                        ✕ Clear Filters
                    </button>
                )}
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paginated.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14, background: '#fff', borderRadius: 14, border: '1px solid #e8eaf0' }}>
                        <p style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>No reviews found matching current filter</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>0 of {counts.all} total reviews match your search or filter criteria.</p>
                        {isFiltered && (
                            <button className="adm-btn-secondary" onClick={resetFilters} style={{ margin: '0 auto' }}>
                                Reset All Filters
                            </button>
                        )}
                    </div>
                )}
                {paginated.map((r, i) => {
                    const sc = statusCfg[r.status] || { color: '#6b7280', bg: '#f3f4f6', icon: null };
                    const ratingColor = r.rating >= 4 ? '#10b981' : r.rating === 3 ? '#f59e0b' : '#ef4444';
                    return (
                        <div key={r.id || i} className="chart-card" style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                {/* Rating badge */}
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: ratingColor + '15', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 16, fontWeight: 800, color: ratingColor }}>{r.rating}</span>
                                    <BsStarFill size={9} color={ratingColor} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{r.title}</p>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {sc.icon} {r.status}
                                        </span>
                                        {r.images > 0 && (
                                            <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 7px', borderRadius: 20 }}>📷 {r.images} photo{r.images > 1 ? 's' : ''}</span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {r.comment}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>📦 {r.product}</span>
                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>by {r.customer}</span>
                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>· {r.date}</span>
                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>· 👍 {r.helpful} helpful</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                                    <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}
                                        onClick={() => setSelected(r)}>
                                        <BsEye size={12} /> Review
                                    </button>
                                    {(r.status === 'Pending' || r.status === 'Flagged') && (
                                        <>
                                            <button onClick={() => handleAction(r.id, 'Approved')}
                                                title="Approve Review"
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                                                <BsCheckCircleFill size={11} /> Approve
                                            </button>
                                            <button onClick={() => handleAction(r.id, 'Rejected')}
                                                title="Reject Review"
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                                                <BsXCircleFill size={11} /> Reject
                                            </button>
                                        </>
                                    )}
                                    {r.status === 'Approved' && (
                                        <button onClick={() => handleAction(r.id, 'Rejected')}
                                            title="Reject Review"
                                            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                            <BsXCircleFill size={11} />
                                        </button>
                                    )}
                                    {r.status === 'Rejected' && (
                                        <button onClick={() => handleAction(r.id, 'Approved')}
                                            title="Re-approve Review"
                                            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                            <BsCheckCircleFill size={11} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(r.id)}
                                        title="Delete Review"
                                        style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 12 }}>
                                        <BsTrashFill size={11} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Counter Bar and Pagination */}
            {filtered.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} reviews{filtered.length !== counts.all ? ` (filtered from ${counts.all} total)` : ''}
                    </span>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                                <BsChevronLeft size={12} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === currentPage ? '#6366f1' : '#e5e7eb'}`, background: p === currentPage ? '#eef2ff' : '#fff', color: p === currentPage ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                    {p}
                                </button>
                            ))}
                            <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                                <BsChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {selected && (
                <ReviewDetail review={selected} onClose={() => setSelected(null)} onAction={handleAction} />
            )}
        </div>
    );
};

export default ReviewManagement;
