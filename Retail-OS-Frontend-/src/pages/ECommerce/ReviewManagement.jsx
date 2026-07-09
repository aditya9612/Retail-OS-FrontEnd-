import React, { useState } from 'react';
import {
    BsSearch, BsStarFill, BsStar, BsTrashFill, BsCheckCircleFill,
    BsXCircleFill, BsChevronLeft, BsChevronRight, BsChatLeftText,
    BsEye, BsShieldFill, BsFlag, BsArrowUpRight,
} from 'react-icons/bs';

/* ── Mock Data ─────────────────────────── */
const REVIEWS = [
    { id: 'REV-001', product: 'Wireless Earbuds Pro', productId: 'PRD-001', customer: 'Aarav Mehta', date: '24 Jun 2026', rating: 5, title: 'Absolutely love it!', comment: 'Crystal clear sound, great bass. Battery life is amazing – lasts all day. Would highly recommend!', status: 'Approved', images: 1, helpful: 42 },
    { id: 'REV-002', product: 'Organic Green Tea', productId: 'PRD-002', customer: 'Priya Sharma', date: '23 Jun 2026', rating: 4, title: 'Good quality tea', comment: 'Nice aroma and fresh flavor. The packaging could be better to preserve freshness longer.', status: 'Approved', images: 0, helpful: 18 },
    { id: 'REV-003', product: 'Leather Crossbody Bag', productId: 'PRD-003', customer: 'Rohan Das', date: '22 Jun 2026', rating: 1, title: 'Terrible quality', comment: 'The strap broke within a week of use. Very poor build quality. Not worth the price at all. Requesting refund.', status: 'Pending', images: 2, helpful: 5 },
    { id: 'REV-004', product: 'Smart Fitness Band X2', productId: 'PRD-004', customer: 'Nisha Patel', date: '21 Jun 2026', rating: 4, title: 'Great fitness tracker', comment: 'Heart rate monitoring is accurate. Steps counter works well. Sleep tracking could be improved.', status: 'Approved', images: 1, helpful: 31 },
    { id: 'REV-005', product: "Men's Cotton Kurta", productId: 'PRD-005', customer: 'Vikram Singh', date: '21 Jun 2026', rating: 5, title: 'Perfect for festivals', comment: 'Great fabric quality and the fit is perfect. Colors are vibrant as shown. Will order more.', status: 'Approved', images: 0, helpful: 22 },
    { id: 'REV-006', product: 'Matte Lipstick Set', productId: 'PRD-007', customer: 'Kavya Reddy', date: '20 Jun 2026', rating: 2, title: 'Not long-lasting', comment: 'Fades within 2 hours. Packaging is nice but quality is disappointing for the price.', status: 'Pending', images: 0, helpful: 8 },
    { id: 'REV-007', product: 'Running Shoes Pro', productId: 'PRD-009', customer: 'Arjun Kumar', date: '19 Jun 2026', rating: 5, title: 'Best running shoes I have owned', comment: 'Super comfortable and lightweight. Great grip on wet surfaces. Size runs true to size.', status: 'Approved', images: 3, helpful: 56 },
    { id: 'REV-008', product: 'Bluetooth Speaker Mini', productId: 'PRD-010', customer: 'Divya Iyer', date: '18 Jun 2026', rating: 3, title: 'Average performance', comment: 'Decent sound for the price. Bass is lacking at higher volumes. Build feels cheap but waterproofing works.', status: 'Pending', images: 0, helpful: 12 },
    { id: 'REV-009', product: 'Non-Stick Cookware Set', productId: 'PRD-008', customer: 'Suresh Rao', date: '17 Jun 2026', rating: 4, title: 'Good value for money', comment: 'Excellent non-stick coating. Heats evenly. Handles are sturdy. Looks great in the kitchen.', status: 'Approved', images: 2, helpful: 28 },
    { id: 'REV-010', product: 'Wireless Earbuds Pro', productId: 'PRD-001', customer: 'Tanvi Joshi', date: '16 Jun 2026', rating: 2, title: 'Connectivity issues', comment: 'Keeps disconnecting every 10 minutes. Very frustrating. Customer support was unhelpful.', status: 'Flagged', images: 0, helpful: 3 },
];

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
    const [reviews, setReviews] = useState(REVIEWS);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRating, setFilterRating] = useState('All');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const filtered = reviews.filter(r => {
        const matchSearch = r.product.toLowerCase().includes(search.toLowerCase()) ||
            r.customer.toLowerCase().includes(search.toLowerCase()) ||
            r.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'All' || r.status === filterStatus;
        const matchRating = filterRating === 'All' || r.rating === parseInt(filterRating);
        return matchSearch && matchStatus && matchRating;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleAction = (id, newStatus) => {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

    const kpis = [
        { label: 'Total Reviews', value: reviews.length, color: '#6366f1', bg: '#eef2ff', icon: '💬' },
        { label: 'Pending Review', value: reviews.filter(r => r.status === 'Pending').length, color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
        { label: 'Avg. Rating', value: avgRating, color: '#10b981', bg: '#ecfdf5', icon: '⭐' },
        { label: 'Flagged Reviews', value: reviews.filter(r => r.status === 'Flagged').length, color: '#ef4444', bg: '#fef2f2', icon: '🚩' },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">💬 Reviews & Ratings</h1>
                    <p className="adm-page-sub">Moderate customer product reviews and ratings</p>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpis.map((k, i) => (
                    <div key={i} className="adm-kpi-card" style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <BsSearch size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="ec-input" style={{ paddingLeft: 32 }} placeholder="Search by product, customer or title..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="ec-input" style={{ minWidth: 140 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    {['All', 'Approved', 'Pending', 'Flagged', 'Rejected'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="ec-input" style={{ minWidth: 140 }} value={filterRating}
                    onChange={e => { setFilterRating(e.target.value); setPage(1); }}>
                    <option value="All">All Ratings</option>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star</option>)}
                </select>
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paginated.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14, background: '#fff', borderRadius: 14, border: '1px solid #e8eaf0' }}>
                        No reviews found
                    </div>
                )}
                {paginated.map((r, i) => {
                    const sc = statusCfg[r.status];
                    const ratingColor = r.rating >= 4 ? '#10b981' : r.rating === 3 ? '#f59e0b' : '#ef4444';
                    return (
                        <div key={i} className="chart-card" style={{ padding: '16px 20px' }}>
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
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button className="adm-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}
                                        onClick={() => setSelected(r)}>
                                        <BsEye size={12} /> Review
                                    </button>
                                    {r.status === 'Pending' && (
                                        <>
                                            <button onClick={() => handleAction(r.id, 'Approved')}
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                                                <BsCheckCircleFill size={11} /> Approve
                                            </button>
                                            <button onClick={() => handleAction(r.id, 'Rejected')}
                                                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                                                <BsXCircleFill size={11} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                            <BsChevronLeft size={12} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)}
                                style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, background: p === page ? '#eef2ff' : '#fff', color: p === page ? '#6366f1' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                {p}
                            </button>
                        ))}
                        <button className="adm-btn-secondary" style={{ padding: '5px 10px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                            <BsChevronRight size={12} />
                        </button>
                    </div>
                </div>
            )}

            {selected && (
                <ReviewDetail review={selected} onClose={() => setSelected(null)} onAction={handleAction} />
            )}
        </div>
    );
};

export default ReviewManagement;
