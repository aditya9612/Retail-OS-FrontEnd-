import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BsSearch, BsStarFill, BsStar, BsTrashFill, BsCheckCircleFill,
    BsXCircleFill, BsChevronLeft, BsChevronRight, BsChatLeftText,
    BsEye, BsShieldFill, BsFlag, BsArrowUpRight, BsPlus,
    BsArrowClockwise, BsCheckLg, BsExclamationTriangle, BsPencilSquare,
} from 'react-icons/bs';
import apiClient from '../../services/api';
import { getAccessToken } from '../../utils/tokenStorage';

/* ── Helper to format review item ── */
const formatReviewItem = (item) => {
    const rawId = item.id;
    const prodId = item.product_id;
    const custId = item.customer_id;
    const dateFormatted = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : (item.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

    return {
        id: item.code || (rawId ? `REV-${String(rawId).padStart(3, '0')}` : `REV-${Date.now()}`),
        rawId: rawId,
        product_id: prodId,
        customer_id: custId,
        product: item.product || item.product_name || (prodId ? `Product #${prodId}` : 'General Product'),
        customer: item.customer || item.customer_name || (custId ? `Customer #${custId}` : 'Customer'),
        title: item.title || (item.comment ? (item.comment.length > 40 ? item.comment.slice(0, 40) + '...' : item.comment) : `Review #${rawId || ''}`),
        comment: item.comment || '',
        rating: Number(item.rating) || 5,
        status: item.status || 'Approved',
        date: dateFormatted,
        helpful: Number(item.helpful || 0),
        images: Number(item.images || 0),
        tenant_id: item.tenant_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
    };
};

/* ── Helper to load real or stored reviews ── */
const loadStoredReviews = () => {
    try {
        const stored = localStorage.getItem('product_reviews');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed.map(formatReviewItem);
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

/* ── Interactive Star Rating Picker ──── */
const InteractiveStarPicker = ({ value, onChange }) => {
    const [hover, setHover] = useState(0);
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        type="button"
                        key={star}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.15s',
                            transform: (hover || value) >= star ? 'scale(1.18)' : 'scale(1)'
                        }}
                    >
                        {(hover || value) >= star ? (
                            <BsStarFill size={22} color="#f59e0b" />
                        ) : (
                            <BsStar size={22} color="#d1d5db" />
                        )}
                    </button>
                ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                {labels[hover || value] || ''} ({hover || value} / 5 Stars)
            </span>
        </div>
    );
};

/* ── Review Detail Modal (GET /api/v1/reviews/{review_id}) ─────── */
const ReviewDetail = ({ review, onClose, onAction, onRefetch, isRefetching, onEdit, onDelete }) => {
    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div className="ec-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Review Details</h3>
                            <span style={{ fontSize: 11, background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 12, fontWeight: 700, border: '1px solid #a7f3d0' }}>
                                GET /api/v1/reviews/{review.rawId || review.id}
                            </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                            {review.id} · {review.product}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {onRefetch && (
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => onRefetch(review.rawId || review.id)}
                                disabled={isRefetching}
                                style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                title="Re-fetch from server (GET /api/v1/reviews/{id})"
                            >
                                <BsArrowClockwise className={isRefetching ? 'spin' : ''} size={11} />
                                <span>Sync</span>
                            </button>
                        )}
                        {onEdit && (
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => {
                                    onClose();
                                    onEdit(review);
                                }}
                                style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                title="Edit / Update review (PATCH /api/v1/reviews/{id})"
                            >
                                <BsPencilSquare size={11} />
                                <span>Edit</span>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => {
                                    onDelete(review.rawId || review.id);
                                }}
                                style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626' }}
                                title="Delete review (DELETE /api/v1/reviews/{id})"
                            >
                                <BsTrashFill size={11} />
                                <span>Delete</span>
                            </button>
                        )}
                        <button className="ec-modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Customer & Product */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{review.customer}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Reviewed on {review.date}</p>
                        </div>
                        <StarRating rating={review.rating} size={14} />
                    </div>
                </div>

                {/* Review content */}
                <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>"{review.title}"</p>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        {review.comment}
                    </p>
                </div>

                {/* Key API Attributes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 14 }}>
                    <div style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Review ID</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>#{review.rawId || review.id}</p>
                    </div>
                    <div style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Product ID</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>#{review.product_id || '-'}</p>
                    </div>
                    <div style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Customer ID</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>#{review.customer_id || '-'}</p>
                    </div>
                    <div style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Tenant ID</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>#{review.tenant_id ?? '-'}</p>
                    </div>
                    <div style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Rating</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: '2px 0 0 0' }}>{review.rating} / 5 ★</p>
                    </div>
                </div>

                {review.images > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {Array.from({ length: review.images }).map((_, i) => (
                            <div key={i} style={{ width: 64, height: 64, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db', fontSize: 11, color: '#9ca3af' }}>
                                IMG {i + 1}
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>👍 {review.helpful} found this helpful</span>
                    {review.created_at && (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>· Created: {new Date(review.created_at).toLocaleString()}</span>
                    )}
                </div>

                {/* Moderation Actions */}
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

/* ── Create Review Modal (POST /api/v1/reviews) ──── */
const CreateReviewModal = ({ isOpen, onClose, onSubmit, isSubmitting, products = [], customers = [] }) => {
    const [productId, setProductId] = useState('8');
    const [customerId, setCustomerId] = useState('1');
    const [rating, setRating] = useState(4);
    const [comment, setComment] = useState('Good product quality and fast delivery');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setProductId('8');
            setCustomerId('1');
            setRating(4);
            setComment('Good product quality and fast delivery');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const pId = parseInt(productId, 10);
        const cId = parseInt(customerId, 10);
        const r = parseInt(rating, 10);

        if (isNaN(pId) || pId <= 0) {
            setError('Please enter a valid Product ID.');
            return;
        }
        if (isNaN(cId) || cId <= 0) {
            setError('Please enter a valid Customer ID.');
            return;
        }
        if (isNaN(r) || r < 1 || r > 5) {
            setError('Please select a star rating between 1 and 5.');
            return;
        }
        if (!comment.trim()) {
            setError('Please enter a review comment.');
            return;
        }

        onSubmit({
            product_id: pId,
            customer_id: cId,
            rating: r,
            comment: comment.trim(),
        }, setError);
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="ec-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>⭐</span> Create Review
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                            <code>POST /api/v1/reviews</code>
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose} disabled={isSubmitting}>✕</button>
                </div>

                {error && (
                    <div style={{
                        margin: '12px 0',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        lineHeight: 1.4
                    }}>
                        <BsExclamationTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '14px 0' }}>
                        {/* Product ID */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                Product ID <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            {products.length > 0 ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="number"
                                        className="ec-input"
                                        style={{ width: 110 }}
                                        value={productId}
                                        onChange={e => setProductId(e.target.value)}
                                        placeholder="e.g. 8"
                                        required
                                        min="1"
                                    />
                                    <select
                                        className="ec-input"
                                        style={{ flex: 1 }}
                                        value={productId}
                                        onChange={e => setProductId(e.target.value)}
                                    >
                                        <option value="">Select or type ID above...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                #{p.id} - {p.name || p.title || `Product #${p.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    className="ec-input"
                                    value={productId}
                                    onChange={e => setProductId(e.target.value)}
                                    placeholder="Enter Product ID (e.g. 8)"
                                    required
                                    min="1"
                                />
                            )}
                            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, display: 'block' }}>
                                Target product ID for this review (e.g. 8)
                            </span>
                        </div>

                        {/* Customer ID */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                Customer ID <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            {customers.length > 0 ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="number"
                                        className="ec-input"
                                        style={{ width: 110 }}
                                        value={customerId}
                                        onChange={e => setCustomerId(e.target.value)}
                                        placeholder="e.g. 1"
                                        required
                                        min="1"
                                    />
                                    <select
                                        className="ec-input"
                                        style={{ flex: 1 }}
                                        value={customerId}
                                        onChange={e => setCustomerId(e.target.value)}
                                    >
                                        <option value="">Select or type ID above...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>
                                                #{c.id} - {c.full_name || c.name || `Customer #${c.id}`} {c.phone ? `(${c.phone})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    className="ec-input"
                                    value={customerId}
                                    onChange={e => setCustomerId(e.target.value)}
                                    placeholder="Enter Customer ID (e.g. 1)"
                                    required
                                    min="1"
                                />
                            )}
                            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, display: 'block' }}>
                                Verified customer ID who purchased the product (e.g. 1)
                            </span>
                        </div>

                        {/* Rating */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                                Rating <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <InteractiveStarPicker value={rating} onChange={setRating} />
                        </div>

                        {/* Comment */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                Comment <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                className="ec-input"
                                rows={3}
                                style={{ resize: 'vertical' }}
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Good product quality and fast delivery"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="adm-btn-primary"
                            disabled={isSubmitting}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <BsArrowClockwise className="spin" size={14} /> Submitting...
                                </>
                            ) : (
                                <>
                                    <BsCheckLg size={14} /> Create Review
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Update Review Modal (PATCH /api/v1/reviews/{review_id} & DELETE) ──── */
const UpdateReviewModal = ({ isOpen, onClose, review, onSubmit, onDelete, isSubmitting, isDeleting }) => {
    const [reviewId, setReviewId] = useState('3');
    const [rating, setRating] = useState(4);
    const [comment, setComment] = useState('Good product quality and fast delivery');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (review) {
                const rNum = String(review.rawId || review.id || '3').replace(/\D/g, '');
                setReviewId(rNum || '3');
                setRating(Number(review.rating) || 4);
                setComment(review.comment || 'Good product quality and fast delivery');
            } else {
                setReviewId('3');
                setRating(4);
                setComment('Good product quality and fast delivery');
            }
            setError('');
        }
    }, [isOpen, review]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const rId = parseInt(reviewId, 10);
        const r = parseInt(rating, 10);

        if (isNaN(rId) || rId <= 0) {
            setError('Please enter a valid Review ID.');
            return;
        }
        if (isNaN(r) || r < 1 || r > 5) {
            setError('Please select a star rating between 1 and 5.');
            return;
        }
        if (!comment.trim()) {
            setError('Please enter a review comment.');
            return;
        }

        onSubmit({
            review_id: rId,
            rating: r,
            comment: comment.trim(),
        }, setError);
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="ec-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div className="ec-modal-header">
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>✏️</span> Update Review
                        </h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                            <code>PATCH /api/v1/reviews/{reviewId || '{review_id}'}</code>
                        </p>
                    </div>
                    <button className="ec-modal-close" onClick={onClose} disabled={isSubmitting}>✕</button>
                </div>

                {error && (
                    <div style={{
                        margin: '12px 0',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        lineHeight: 1.4
                    }}>
                        <BsExclamationTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '14px 0' }}>
                        {/* Review ID */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                Review ID <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="number"
                                className="ec-input"
                                style={{ width: 120 }}
                                value={reviewId}
                                onChange={e => setReviewId(e.target.value)}
                                placeholder="e.g. 3"
                                required
                                min="1"
                            />
                            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, display: 'block' }}>
                                Target Review ID to update via PATCH (e.g. 3)
                            </span>
                        </div>

                        {/* Rating */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                                Rating <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <InteractiveStarPicker value={rating} onChange={setRating} />
                        </div>

                        {/* Comment */}
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                                Comment <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                className="ec-input"
                                rows={3}
                                style={{ resize: 'vertical' }}
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Good product quality and fast delivery"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                        {onDelete ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onDelete(reviewId);
                                }}
                                disabled={isSubmitting || isDeleting}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: 8,
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                                title={`DELETE /api/v1/reviews/${reviewId}`}
                            >
                                <BsTrashFill size={12} /> {isDeleting ? 'Deleting...' : 'Delete Review'}
                            </button>
                        ) : <div />}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={onClose}
                                disabled={isSubmitting || isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="adm-btn-primary"
                                disabled={isSubmitting || isDeleting}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <BsArrowClockwise className="spin" size={14} /> Updating...
                                    </>
                                ) : (
                                    <>
                                        <BsCheckLg size={14} /> Update Review
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
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
    const [filterProduct, setFilterProduct] = useState('All');
    const [productIdInput, setProductIdInput] = useState('8');
    const [reviewIdInput, setReviewIdInput] = useState('3');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);

    // Modal and API state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingSingle, setIsFetchingSingle] = useState(false);
    const [apiSuccess, setApiSuccess] = useState('');
    const [apiError, setApiError] = useState('');
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Helper to extract list from API response
    const extractReviewList = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.reviews)) return data.reviews;
        if (typeof data === 'object' && (data.id || data.product_id || data.rating)) {
            return [data];
        }
        return [];
    };

    // Helper to extract a single review object from API response
    const extractSingleReview = (data) => {
        if (!data) return null;
        if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
            return data.data;
        }
        if (data.review && typeof data.review === 'object') {
            return data.review;
        }
        if (Array.isArray(data)) {
            return data[0] || null;
        }
        if (Array.isArray(data?.data)) {
            return data.data[0] || null;
        }
        if (typeof data === 'object' && (data.id !== undefined || data.comment !== undefined || data.rating !== undefined)) {
            return data;
        }
        return null;
    };

    // Helper to fetch reviews for a specific product ID (GET /api/v1/reviews/product/{product_id})
    const fetchReviewsForProductId = async (pId, headers) => {
        let data = null;
        let lastError = null;

        // 1. Direct call to local backend http://127.0.0.1:8000/api/v1/reviews/product/{pId}
        try {
            const res1 = await axios.get(`http://127.0.0.1:8000/api/v1/reviews/product/${pId}`, {
                headers,
                timeout: 5000,
            });
            if (res1?.data) {
                data = res1.data;
                return { data, error: null };
            }
        } catch (e1) {
            lastError = e1;
        }

        // 2. apiClient.get('/reviews/product/' + pId) (baseURL is configured with /api/v1)
        try {
            const res2 = await apiClient.get(`/reviews/product/${pId}`);
            if (res2?.data && !(res2.data.success === false && res2.data.message)) {
                data = res2.data;
                return { data, error: null };
            }
        } catch (e2) {
            lastError = e2;
        }

        // 3. apiClient.get('/api/v1/reviews/product/' + pId)
        try {
            const res3 = await apiClient.get(`/api/v1/reviews/product/${pId}`);
            if (res3?.data && !(res3.data.success === false && res3.data.message)) {
                data = res3.data;
                return { data, error: null };
            }
        } catch (e3) {
            lastError = e3;
        }

        // 4. Local backend without /api/v1 prefix http://127.0.0.1:8000/reviews/product/{pId}
        try {
            const res4 = await axios.get(`http://127.0.0.1:8000/reviews/product/${pId}`, {
                headers,
                timeout: 5000,
            });
            if (res4?.data) {
                data = res4.data;
                return { data, error: null };
            }
        } catch (e4) {
            lastError = e4;
        }

        return { data, error: lastError };
    };

    // Helper to fetch a single review by review_id (GET /api/v1/reviews/{review_id} or /review/{review_id})
    const fetchReviewByIdApi = async (rId, headers) => {
        let data = null;
        let lastError = null;

        // 1. Direct call to local backend http://127.0.0.1:8000/api/v1/reviews/{rId}
        try {
            const res1 = await axios.get(`http://127.0.0.1:8000/api/v1/reviews/${rId}`, {
                headers,
                timeout: 5000,
            });
            if (res1?.data && !res1.data.detail?.includes?.('Not Found')) {
                return { data: res1.data, error: null };
            }
        } catch (e1) {
            lastError = e1;
        }

        // 2. Direct call to local backend with singular /review/ http://127.0.0.1:8000/api/v1/review/{rId}
        try {
            const res1b = await axios.get(`http://127.0.0.1:8000/api/v1/review/${rId}`, {
                headers,
                timeout: 5000,
            });
            if (res1b?.data && !res1b.data.detail?.includes?.('Not Found')) {
                return { data: res1b.data, error: null };
            }
        } catch (e1b) {
            lastError = e1b;
        }

        // 3. apiClient.get('/reviews/' + rId) (baseURL https://api-testing.myretailos.com/api/v1)
        try {
            const res2 = await apiClient.get(`/reviews/${rId}`);
            if (res2?.data && !(res2.data.success === false && res2.data.message)) {
                return { data: res2.data, error: null };
            }
        } catch (e2) {
            lastError = e2;
        }

        // 4. apiClient.get('/review/' + rId)
        try {
            const res3 = await apiClient.get(`/review/${rId}`);
            if (res3?.data && !(res3.data.success === false && res3.data.message)) {
                return { data: res3.data, error: null };
            }
        } catch (e3) {
            lastError = e3;
        }

        // 5. apiClient.get('/api/v1/reviews/' + rId)
        try {
            const res4 = await apiClient.get(`/api/v1/reviews/${rId}`);
            if (res4?.data && !(res4.data.success === false && res4.data.message)) {
                return { data: res4.data, error: null };
            }
        } catch (e4) {
            lastError = e4;
        }

        // 6. Local backend http://127.0.0.1:8000/reviews/{rId}
        try {
            const res5 = await axios.get(`http://127.0.0.1:8000/reviews/${rId}`, {
                headers,
                timeout: 5000,
            });
            if (res5?.data) {
                return { data: res5.data, error: null };
            }
        } catch (e5) {
            lastError = e5;
        }

        return { data, error: lastError };
    };

    // Handler to get a single review by review_id (GET /api/v1/reviews/{review_id})
    const handleGetReviewById = async (targetReviewId) => {
        const rawIdNum = parseInt(String(targetReviewId).replace(/\D/g, ''), 10);
        const rId = rawIdNum || String(targetReviewId).trim();
        if (!rId) {
            setApiError('Please enter a valid Review ID.');
            return;
        }

        setIsFetchingSingle(true);
        setApiError('');

        const token = getAccessToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const { data, error } = await fetchReviewByIdApi(rId, headers);
        const single = extractSingleReview(data);

        if (single) {
            const formatted = formatReviewItem(single);
            if (products.length > 0 && formatted.product_id) {
                const matched = products.find(p => String(p.id) === String(formatted.product_id));
                if (matched) formatted.product = matched.name || matched.title || formatted.product;
            }
            if (customers.length > 0 && formatted.customer_id) {
                const matched = customers.find(c => String(c.id) === String(formatted.customer_id));
                if (matched) formatted.customer = matched.full_name || matched.name || formatted.customer;
            }

            // Update reviews state to include or update this review
            setReviews(prev => {
                const filtered = prev.filter(r => String(r.rawId || r.id) !== String(formatted.rawId || formatted.id));
                const next = [formatted, ...filtered];
                try { localStorage.setItem('product_reviews', JSON.stringify(next)); } catch (_) {}
                return next;
            });

            // Open ReviewDetail modal showing the fetched review
            setSelected(formatted);
            setApiSuccess(`Successfully fetched Review #${formatted.rawId || rId} (GET /api/v1/reviews/${rId})`);
            setTimeout(() => setApiSuccess(''), 5000);
        } else {
            const errDetail = error?.response?.data?.detail ||
                              error?.response?.data?.message ||
                              error?.message ||
                              'Review not found on server';
            const errString = typeof errDetail === 'object' ? JSON.stringify(errDetail) : String(errDetail);
            setApiError(`Could not fetch review #${rId} (GET /api/v1/reviews/${rId}): ${errString}`);
        }

        setIsFetchingSingle(false);
    };

    // Fetch product reviews from API (GET /api/v1/reviews/product/{product_id})
    const fetchReviews = useCallback(async (targetProductId) => {
        setIsLoading(true);
        setApiError('');
        const token = getAccessToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const pId = String(targetProductId !== undefined ? targetProductId : (productIdInput || '8')).trim() || '8';
        const { data, error } = await fetchReviewsForProductId(pId, headers);

        if (data) {
            const list = extractReviewList(data);
            if (list.length > 0) {
                const mapped = list.map(item => {
                    const enriched = {
                        ...item,
                        product_id: item.product_id || Number(pId),
                    };
                    return formatReviewItem(enriched);
                });

                setReviews(prev => {
                    const incomingIds = new Set(mapped.map(m => String(m.rawId || m.id)));
                    // Replace existing reviews for this product with freshly fetched reviews, keep other products
                    const remaining = prev.filter(r => {
                        if (String(r.product_id) === String(pId)) {
                            return incomingIds.has(String(r.rawId || r.id));
                        }
                        return !incomingIds.has(String(r.rawId || r.id));
                    });
                    const combined = [...mapped, ...remaining];
                    try { localStorage.setItem('product_reviews', JSON.stringify(combined)); } catch (_) {}
                    return combined;
                });

                setApiSuccess(`Successfully fetched ${list.length} review(s) for Product #${pId} (GET /api/v1/reviews/product/${pId})`);
                setTimeout(() => setApiSuccess(''), 5000);
            } else {
                setApiSuccess(`API connected for Product #${pId}, but no reviews found.`);
                setTimeout(() => setApiSuccess(''), 4000);
            }
        } else {
            const errDetail = error?.response?.data?.detail ||
                              error?.response?.data?.message ||
                              error?.message ||
                              'Failed to connect to backend';
            const errString = typeof errDetail === 'object' ? JSON.stringify(errDetail) : String(errDetail);
            setApiError(`Could not fetch reviews for Product #${pId} (GET /api/v1/reviews/product/${pId}): ${errString}`);
        }
        setIsLoading(false);
    }, [productIdInput]);

    // Fetch products and customers for dropdown options
    const fetchProductsAndCustomers = useCallback(async () => {
        try {
            const prodRes = await apiClient.get('/products')
                .catch(() => apiClient.get('/api/v1/products'))
                .catch(() => axios.get('http://127.0.0.1:8000/api/v1/products'))
                .catch(() => null);
            if (prodRes?.data) {
                const pList = Array.isArray(prodRes.data)
                    ? prodRes.data
                    : prodRes.data?.data || prodRes.data?.items || [];
                if (Array.isArray(pList) && pList.length > 0) setProducts(pList);
            }
        } catch (_) {}

        try {
            const custRes = await apiClient.get('/customers')
                .catch(() => apiClient.get('/api/v1/customers'))
                .catch(() => axios.get('http://127.0.0.1:8000/api/v1/customers'))
                .catch(() => null);
            if (custRes?.data) {
                const cList = Array.isArray(custRes.data)
                    ? custRes.data
                    : custRes.data?.data || custRes.data?.items || [];
                if (Array.isArray(cList) && cList.length > 0) setCustomers(cList);
            }
        } catch (_) {}
    }, []);

    // Initial load: Fetch product reviews for product 8
    useEffect(() => {
        fetchReviews('8');
        fetchProductsAndCustomers();
    }, []);

    // Enrich review labels when products or customers are loaded
    useEffect(() => {
        if (products.length > 0 || customers.length > 0) {
            setReviews(prev => prev.map(r => {
                let updated = { ...r };
                if (r.product_id && (r.product.startsWith('Product #') || !r.product)) {
                    const match = products.find(p => String(p.id) === String(r.product_id));
                    if (match) updated.product = match.name || match.title || r.product;
                }
                if (r.customer_id && (r.customer.startsWith('Customer #') || !r.customer)) {
                    const match = customers.find(c => String(c.id) === String(r.customer_id));
                    if (match) updated.customer = match.full_name || match.name || r.customer;
                }
                return updated;
            }));
        }
    }, [products, customers]);

    // Handle Create Review Submission (POST /api/v1/reviews)
    const handleCreateReview = async (formData, setModalError) => {
        setIsSubmitting(true);
        setApiError('');
        setApiSuccess('');

        const payload = {
            product_id: Number(formData.product_id),
            customer_id: Number(formData.customer_id),
            rating: Number(formData.rating),
            comment: String(formData.comment),
        };

        const token = getAccessToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let createdData = null;
        let lastError = null;

        // 1. First attempt: local backend http://127.0.0.1:8000/api/v1/reviews
        try {
            const res1 = await axios.post('http://127.0.0.1:8000/api/v1/reviews', payload, {
                headers,
                timeout: 8000,
            });
            createdData = res1.data;
        } catch (err1) {
            lastError = err1;
            // 2. Second attempt: standard configured apiClient with '/reviews'
            try {
                const res2 = await apiClient.post('/reviews', payload);
                createdData = res2.data;
            } catch (err2) {
                lastError = err2;
                // 3. Third attempt: apiClient with '/api/v1/reviews'
                try {
                    const res3 = await apiClient.post('/api/v1/reviews', payload);
                    createdData = res3.data;
                } catch (err3) {
                    lastError = err3;
                    // 4. Fourth attempt: local backend http://127.0.0.1:8000/reviews
                    try {
                        const res4 = await axios.post('http://127.0.0.1:8000/reviews', payload, {
                            headers,
                            timeout: 8000,
                        });
                        createdData = res4.data;
                    } catch (err4) {
                        lastError = err4;
                    }
                }
            }
        }

        if (createdData) {
            // Find matched product & customer if loaded
            const matchedProd = products.find(p => String(p.id) === String(payload.product_id));
            const matchedCust = customers.find(c => String(c.id) === String(payload.customer_id));

            const newReviewObj = formatReviewItem({
                ...createdData,
                product: matchedProd?.name || matchedProd?.title || `Product #${payload.product_id}`,
                customer: matchedCust?.full_name || matchedCust?.name || `Customer #${payload.customer_id}`,
                rating: createdData.rating || payload.rating,
                comment: createdData.comment || payload.comment,
                status: createdData.status || 'Approved',
            });

            setReviews(prev => {
                const filtered = prev.filter(r => r.rawId !== newReviewObj.rawId && r.id !== newReviewObj.id);
                const next = [newReviewObj, ...filtered];
                try { localStorage.setItem('product_reviews', JSON.stringify(next)); } catch (_) {}
                return next;
            });

            setApiSuccess(`Review #${newReviewObj.id} created successfully for Product #${payload.product_id}!`);
            setShowCreateModal(false);
            setTimeout(() => setApiSuccess(''), 5000);
            setIsSubmitting(false);

            // Re-fetch product reviews for this product from API to keep fully synchronized
            fetchReviews(payload.product_id);
        } else {
            setIsSubmitting(false);
            const errDetail = lastError?.response?.data?.detail ||
                              lastError?.response?.data?.message ||
                              lastError?.message ||
                              'Failed to create review. Please check server connection.';
            const errString = typeof errDetail === 'object' ? JSON.stringify(errDetail) : String(errDetail);
            if (setModalError) {
                setModalError(`API Error: ${errString}`);
            } else {
                setApiError(`Failed to create review: ${errString}`);
            }
        }
    };

    // Helper to send PATCH /api/v1/reviews/{review_id}
    const updateReviewApi = async (rId, payload, headers) => {
        let data = null;
        let lastError = null;

        // 1. Direct call to local backend http://127.0.0.1:8000/api/v1/reviews/{rId}
        try {
            const res1 = await axios.patch(`http://127.0.0.1:8000/api/v1/reviews/${rId}`, payload, {
                headers,
                timeout: 8000,
            });
            if (res1?.data) return { data: res1.data, error: null };
        } catch (e1) {
            lastError = e1;
        }

        // 2. Direct call to local backend singular /review/{rId}
        try {
            const res1b = await axios.patch(`http://127.0.0.1:8000/api/v1/review/${rId}`, payload, {
                headers,
                timeout: 8000,
            });
            if (res1b?.data) return { data: res1b.data, error: null };
        } catch (e1b) {
            lastError = e1b;
        }

        // 3. apiClient.patch('/reviews/' + rId) (baseURL https://api-testing.myretailos.com/api/v1)
        try {
            const res2 = await apiClient.patch(`/reviews/${rId}`, payload);
            if (res2?.data && !(res2.data.success === false && res2.data.message)) {
                return { data: res2.data, error: null };
            }
        } catch (e2) {
            lastError = e2;
        }

        // 4. apiClient.patch('/review/' + rId)
        try {
            const res3 = await apiClient.patch(`/review/${rId}`, payload);
            if (res3?.data && !(res3.data.success === false && res3.data.message)) {
                return { data: res3.data, error: null };
            }
        } catch (e3) {
            lastError = e3;
        }

        // 5. apiClient.patch('/api/v1/reviews/' + rId)
        try {
            const res4 = await apiClient.patch(`/api/v1/reviews/${rId}`, payload);
            if (res4?.data && !(res4.data.success === false && res4.data.message)) {
                return { data: res4.data, error: null };
            }
        } catch (e4) {
            lastError = e4;
        }

        // 6. Local backend http://127.0.0.1:8000/reviews/{rId}
        try {
            const res5 = await axios.patch(`http://127.0.0.1:8000/reviews/${rId}`, payload, {
                headers,
                timeout: 8000,
            });
            if (res5?.data) return { data: res5.data, error: null };
        } catch (e5) {
            lastError = e5;
        }

        return { data, error: lastError };
    };

    // Open Update Modal
    const handleOpenUpdateModal = (reviewToEdit) => {
        setEditingReview(reviewToEdit || selected || (reviews.length > 0 ? reviews[0] : null));
        setShowUpdateModal(true);
    };

    // Handler to execute review update (PATCH /api/v1/reviews/{review_id})
    const handleUpdateReview = async (formData, setModalError) => {
        setIsUpdating(true);
        setApiError('');
        setApiSuccess('');

        const rawId = formData.review_id;
        const payload = {
            rating: Number(formData.rating),
            comment: String(formData.comment).trim(),
        };

        const token = getAccessToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const { data, error } = await updateReviewApi(rawId, payload, headers);
        const updated = extractSingleReview(data);

        if (updated || data) {
            const updatedItem = updated || data;
            const formatted = formatReviewItem({
                ...updatedItem,
                rating: updatedItem.rating || payload.rating,
                comment: updatedItem.comment || payload.comment,
            });

            // Match product & customer names
            if (products.length > 0 && formatted.product_id) {
                const matched = products.find(p => String(p.id) === String(formatted.product_id));
                if (matched) formatted.product = matched.name || matched.title || formatted.product;
            }
            if (customers.length > 0 && formatted.customer_id) {
                const matched = customers.find(c => String(c.id) === String(formatted.customer_id));
                if (matched) formatted.customer = matched.full_name || matched.name || formatted.customer;
            }

            setReviews(prev => {
                const next = prev.map(r => {
                    if (String(r.rawId || r.id) === String(formatted.rawId || formatted.id) || String(r.rawId || r.id) === String(rawId)) {
                        return { ...r, ...formatted };
                    }
                    return r;
                });
                try { localStorage.setItem('product_reviews', JSON.stringify(next)); } catch (_) {}
                return next;
            });

            // Update selected review if currently viewing it in modal
            if (selected && (String(selected.rawId || selected.id) === String(formatted.rawId || formatted.id) || String(selected.rawId || selected.id) === String(rawId))) {
                setSelected(prev => ({ ...prev, ...formatted }));
            }

            setApiSuccess(`Review #${formatted.rawId || rawId} updated successfully (PATCH /api/v1/reviews/${rawId})!`);
            setShowUpdateModal(false);
            setTimeout(() => setApiSuccess(''), 5000);
            setIsUpdating(false);
            return true;
        } else {
            setIsUpdating(false);
            const errDetail = error?.response?.data?.detail ||
                              error?.response?.data?.message ||
                              error?.message ||
                              'Failed to update review. Please check server connection.';
            const errString = typeof errDetail === 'object' ? JSON.stringify(errDetail) : String(errDetail);
            if (setModalError) {
                setModalError(`API Error: ${errString}`);
            } else {
                setApiError(`Failed to update review #${rawId} (PATCH /api/v1/reviews/${rawId}): ${errString}`);
            }
            return false;
        }
    };

    // Extract unique product IDs for product dropdown
    const uniqueProductIds = Array.from(new Set(reviews.map(r => r.product_id).filter(Boolean)));

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
        const matchProduct = filterProduct === 'All' || String(r.product_id) === String(filterProduct);
        return matchSearch && matchStatus && matchRating && matchProduct;
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

    // Helper to send DELETE /api/v1/reviews/{review_id}
    const deleteReviewApi = async (rId, headers) => {
        let lastError = null;

        // 1. Direct call to local backend http://127.0.0.1:8000/api/v1/reviews/{rId}
        try {
            const res1 = await axios.delete(`http://127.0.0.1:8000/api/v1/reviews/${rId}`, {
                headers,
                timeout: 8000,
            });
            if (res1.status >= 200 && res1.status < 300) {
                return { success: true, data: res1.data };
            }
        } catch (e1) {
            lastError = e1;
        }

        // 2. Direct call to local backend singular /review/{rId}
        try {
            const res1b = await axios.delete(`http://127.0.0.1:8000/api/v1/review/${rId}`, {
                headers,
                timeout: 8000,
            });
            if (res1b.status >= 200 && res1b.status < 300) {
                return { success: true, data: res1b.data };
            }
        } catch (e1b) {
            lastError = e1b;
        }

        // 3. apiClient.delete('/reviews/' + rId) (baseURL https://api-testing.myretailos.com/api/v1)
        try {
            const res2 = await apiClient.delete(`/reviews/${rId}`);
            if (res2.status >= 200 && res2.status < 300 && !(res2.data?.success === false && res2.data?.message === 'Not authenticated')) {
                return { success: true, data: res2.data };
            }
        } catch (e2) {
            lastError = e2;
        }

        // 4. apiClient.delete('/review/' + rId)
        try {
            const res3 = await apiClient.delete(`/review/${rId}`);
            if (res3.status >= 200 && res3.status < 300 && !(res3.data?.success === false && res3.data?.message === 'Not authenticated')) {
                return { success: true, data: res3.data };
            }
        } catch (e3) {
            lastError = e3;
        }

        // 5. apiClient.delete('/api/v1/reviews/' + rId)
        try {
            const res4 = await apiClient.delete(`/api/v1/reviews/${rId}`);
            if (res4.status >= 200 && res4.status < 300 && !(res4.data?.success === false && res4.data?.message === 'Not authenticated')) {
                return { success: true, data: res4.data };
            }
        } catch (e4) {
            lastError = e4;
        }

        // 6. Local backend http://127.0.0.1:8000/reviews/{rId}
        try {
            const res5 = await axios.delete(`http://127.0.0.1:8000/reviews/${rId}`, {
                headers,
                timeout: 8000,
            });
            if (res5.status >= 200 && res5.status < 300) {
                return { success: true, data: res5.data };
            }
        } catch (e5) {
            lastError = e5;
        }

        return { success: false, error: lastError };
    };

    const handleDelete = async (targetId) => {
        const rawIdNum = parseInt(String(targetId).replace(/\D/g, ''), 10);
        const rId = rawIdNum || String(targetId).trim();
        if (!rId) return;

        if (!window.confirm(`Are you sure you want to delete Review #${rId}?`)) {
            return;
        }

        setIsDeleting(true);
        setApiError('');
        setApiSuccess('');

        const token = getAccessToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const { success, error } = await deleteReviewApi(rId, headers);

        setReviews(prev => {
            const next = prev.filter(r => String(r.rawId || r.id) !== String(rId) && String(r.id) !== String(targetId));
            try { localStorage.setItem('product_reviews', JSON.stringify(next)); } catch (_) {}
            return next;
        });

        if (selected && (String(selected.rawId || selected.id) === String(rId) || String(selected.id) === String(targetId))) {
            setSelected(null);
        }
        if (showUpdateModal) {
            setShowUpdateModal(false);
        }

        if (success) {
            setApiSuccess(`Review #${rId} deleted successfully (DELETE /api/v1/reviews/${rId})!`);
        } else {
            const errDetail = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Server did not respond';
            const errString = typeof errDetail === 'object' ? JSON.stringify(errDetail) : String(errDetail);
            setApiSuccess(`Review #${rId} removed. Server notice: ${errString}`);
        }
        setTimeout(() => setApiSuccess(''), 5000);
        setIsDeleting(false);
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
        setFilterProduct('All');
        setPage(1);
    };

    const isFiltered = search !== '' || filterStatus !== 'All' || filterRating !== 'All' || filterProduct !== 'All';

    return (
        <div className="dash-page">
            <style>{`
                @keyframes spinAnimation { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spinAnimation 1s linear infinite; }
            `}</style>

            {/* Header */}
            <div className="adm-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div>
                    <h1 className="adm-page-title">💬 Reviews & Ratings</h1>
                    <p className="adm-page-sub">
                        Moderate customer product reviews and ratings — Endpoints: <code>GET /api/v1/reviews/product/{productIdInput || '{product_id}'}</code> & <code>GET /api/v1/reviews/{reviewIdInput || '{review_id}'}</code>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Fetch Product Reviews Box (GET /api/v1/reviews/product/{product_id}) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#fff',
                        border: '1.5px solid #6366f1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(99,102,241,0.1)'
                    }}>
                        <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#4338ca',
                            padding: '6px 10px',
                            background: '#eef2ff',
                            borderRight: '1px solid #c7d2fe',
                            whiteSpace: 'nowrap'
                        }}>
                            Product ID
                        </span>
                        <input
                            type="number"
                            min="1"
                            value={productIdInput}
                            onChange={e => setProductIdInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') fetchReviews(productIdInput); }}
                            placeholder="8"
                            style={{
                                width: 55,
                                border: 'none',
                                outline: 'none',
                                padding: '6px 8px',
                                fontSize: 13,
                                fontWeight: 700,
                                textAlign: 'center',
                                color: '#111827'
                            }}
                            title="Enter Product ID (e.g. 8)"
                        />
                        <button
                            type="button"
                            onClick={() => fetchReviews(productIdInput)}
                            disabled={isLoading || !productIdInput}
                            style={{
                                background: '#6366f1',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 13px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                transition: 'background 0.15s'
                            }}
                            title={`Fetch reviews for product via GET /api/v1/reviews/product/${productIdInput || '8'}`}
                        >
                            <BsArrowClockwise className={isLoading ? 'spin' : ''} size={13} />
                            <span>Fetch Reviews</span>
                        </button>
                    </div>

                    {/* Get Single Review Box (GET /api/v1/reviews/{review_id}) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#fff',
                        border: '1.5px solid #059669',
                        borderRadius: 8,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(5,150,105,0.1)'
                    }}>
                        <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#065f46',
                            padding: '6px 10px',
                            background: '#ecfdf5',
                            borderRight: '1px solid #a7f3d0',
                            whiteSpace: 'nowrap'
                        }}>
                            Review ID
                        </span>
                        <input
                            type="number"
                            min="1"
                            value={reviewIdInput}
                            onChange={e => setReviewIdInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleGetReviewById(reviewIdInput); }}
                            placeholder="3"
                            style={{
                                width: 50,
                                border: 'none',
                                outline: 'none',
                                padding: '6px 8px',
                                fontSize: 13,
                                fontWeight: 700,
                                textAlign: 'center',
                                color: '#111827'
                            }}
                            title="Enter Review ID (e.g. 3)"
                        />
                        <button
                            type="button"
                            onClick={() => handleGetReviewById(reviewIdInput)}
                            disabled={isFetchingSingle || !reviewIdInput}
                            style={{
                                background: '#059669',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 13px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                transition: 'background 0.15s'
                            }}
                            title={`Get Review via GET /api/v1/reviews/${reviewIdInput || '3'}`}
                        >
                            <BsArrowClockwise className={isFetchingSingle ? 'spin' : ''} size={13} />
                            <span>Get Review</span>
                        </button>
                    </div>

                    <button
                        className="adm-btn-secondary"
                        onClick={() => fetchReviews(productIdInput || '8')}
                        disabled={isLoading}
                        title="Refresh Reviews from API"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', height: 36 }}
                    >
                        <BsArrowClockwise className={isLoading ? 'spin' : ''} size={14} /> Refresh
                    </button>
                    <button
                        className="adm-btn-secondary"
                        onClick={() => handleOpenUpdateModal(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', height: 36 }}
                        title="Update Review via PATCH /api/v1/reviews/{review_id}"
                    >
                        <BsPencilSquare size={13} /> Update Review
                    </button>
                    <button
                        className="adm-btn-primary"
                        onClick={() => setShowCreateModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', height: 36 }}
                    >
                        <BsPlus size={18} /> Create Review
                    </button>
                </div>
            </div>

            {/* Alert Notifications */}
            {apiSuccess && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsCheckCircleFill size={16} color="#10b981" />
                        <span>{apiSuccess}</span>
                    </div>
                    <button onClick={() => setApiSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontSize: 14 }}>✕</button>
                </div>
            )}

            {apiError && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsExclamationTriangle size={16} color="#ef4444" />
                        <span>{apiError}</span>
                    </div>
                    <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 14 }}>✕</button>
                </div>
            )}

            {/* KPI Metric Overview Cards */}
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
                {uniqueProductIds.length > 0 && (
                    <select className="ec-input" style={{ minWidth: 150 }} value={filterProduct}
                        onChange={e => { setFilterProduct(e.target.value); setPage(1); }}>
                        <option value="All">All Products ({counts.all})</option>
                        {uniqueProductIds.map(pid => (
                            <option key={pid} value={pid}>Product #{pid}</option>
                        ))}
                    </select>
                )}
                <select className="ec-input" style={{ minWidth: 150 }} value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    <option value="All">All Statuses ({counts.all})</option>
                    <option value="Approved">Approved ({counts.approved})</option>
                    <option value="Pending">Pending ({counts.pending})</option>
                    <option value="Flagged">Flagged ({counts.flagged})</option>
                    <option value="Rejected">Rejected ({counts.rejected})</option>
                </select>
                <select className="ec-input" style={{ minWidth: 150 }} value={filterRating}
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
                        {isFiltered ? (
                            <button className="adm-btn-secondary" onClick={resetFilters} style={{ margin: '0 auto' }}>
                                Reset All Filters
                            </button>
                        ) : (
                            <button className="adm-btn-primary" onClick={() => setShowCreateModal(true)} style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BsPlus size={18} /> Create First Review
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
                                        onClick={() => {
                                            setSelected(r);
                                            const targetId = r.rawId || r.id;
                                            if (targetId) handleGetReviewById(targetId);
                                        }}>
                                        <BsEye size={12} /> Review
                                    </button>
                                    <button className="adm-btn-secondary" style={{ padding: '5px 9px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                                        onClick={() => handleOpenUpdateModal(r)}
                                        title="Update Review (PATCH /api/v1/reviews/{id})">
                                        <BsPencilSquare size={11} /> Edit
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
                                    <button onClick={() => handleDelete(r.rawId || r.id)}
                                        title="Delete Review (DELETE /api/v1/reviews/{id})"
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

            {/* Modals */}
            {selected && (
                <ReviewDetail
                    review={selected}
                    onClose={() => setSelected(null)}
                    onAction={handleAction}
                    onRefetch={handleGetReviewById}
                    isRefetching={isFetchingSingle}
                    onEdit={handleOpenUpdateModal}
                    onDelete={handleDelete}
                />
            )}

            <CreateReviewModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateReview}
                isSubmitting={isSubmitting}
                products={products}
                customers={customers}
            />

            <UpdateReviewModal
                isOpen={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                review={editingReview}
                onSubmit={handleUpdateReview}
                onDelete={handleDelete}
                isSubmitting={isUpdating}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default ReviewManagement;
