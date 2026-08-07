import React, { useState } from 'react';
import {
    creditWallet,
    debitWallet,
    addLoyalty,
    createNote,
    sendCustomerSms,
    sendCustomerWhatsapp,
    createFeedback,
    createReferral,
} from '../../services/customer';
import { fmt, normalizeApiList, getApiErrorMessage } from './customerHelpers';
import { BsGift, BsWallet2, BsChatText, BsJournalText, BsEnvelope, BsCheckCircleFill, BsXCircleFill, BsPerson, BsPlus } from 'react-icons/bs';

const statusCfg = {
    Active: { color: '#10b981', bg: '#ecfdf5' },
    Inactive: { color: '#6b7280', bg: '#f3f4f6' },
    Blocked: { color: '#ef4444', bg: '#fef2f2' },
};

const typeCfg = {
    Regular: { color: '#6366f1', bg: '#eef2ff' },
    Wholesale: { color: '#8b5cf6', bg: '#f5f3ff' },
    VIP: { color: '#d97706', bg: '#fffbeb' },
    New: { color: '#0ea5e9', bg: '#f0f9ff' },
};

const TABS = ['Overview', 'Orders', 'Wallet', 'Loyalty', 'Notes', 'Messages', 'Actions'];

const tabBtnStyle = (active) => ({
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: `1.5px solid ${active ? '#6366f1' : '#e5e7eb'}`,
    background: active ? '#eef2ff' : '#fff',
    color: active ? '#6366f1' : '#6b7280',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
});

const EmptyBlock = ({ icon: Icon, title, description, actionText, onAction }) => (
    <div style={{ background: '#f9fafb', border: '1px border #e5e7eb', borderRadius: 12, padding: '24px 20px', textAlign: 'center', margin: '10px 0' }}>
        {Icon && <Icon size={24} style={{ color: '#9ca3af', marginBottom: 8 }} />}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>{description}</p>
        {actionText && onAction && (
            <button
                type="button"
                className="adm-btn-primary"
                onClick={onAction}
                style={{ marginTop: 12, fontSize: 12, padding: '6px 14px' }}
            >
                {actionText}
            </button>
        )}
    </div>
);

const ListBlock = ({ title, items, renderItem, emptyTitle, emptyDesc, actionText, onAction }) => {
    const list = normalizeApiList(items);
    return (
        <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{title}</p>
            {list.length === 0 ? (
                <EmptyBlock title={emptyTitle || 'No Records'} description={emptyDesc || 'No entries available at the moment.'} actionText={actionText} onAction={onAction} />
            ) : (
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {list.map((item, i) => (
                        <div key={item.id ?? i} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#374151' }}>
                            {renderItem(item)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CustomerDetailPanel = ({
    customer,
    detailExtras = {},
    loading = false,
    onClose,
    onStatusChange,
    onRefresh,
    showFeedback = false,
}) => {
    const [activeTab, setActiveTab] = useState('Overview');
    const [status, setStatus] = useState(customer.status);
    const [actionLoading, setActionLoading] = useState(false);
    const [walletAmount, setWalletAmount] = useState('');
    const [walletNote, setWalletNote] = useState('');
    const [loyaltyPoints, setLoyaltyPoints] = useState('');
    const [loyaltyReason, setLoyaltyReason] = useState('');
    const [noteText, setNoteText] = useState('');
    const [smsMessage, setSmsMessage] = useState('');
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackRating, setFeedbackRating] = useState('5');
    const [referralCode, setReferralCode] = useState('');
    const [referralEmail, setReferralEmail] = useState('');

    const walletBalance =
        detailExtras.wallet?.balance ??
        detailExtras.wallet?.wallet_balance ??
        customer.credit ??
        0;
    const points =
        detailExtras.loyalty?.points ??
        detailExtras.loyalty?.loyalty_points ??
        customer.loyaltyPoints ??
        0;
    const orders = normalizeApiList(detailExtras.orders);
    const hasLoyaltyRecord = Boolean(detailExtras.loyalty && !detailExtras.loyalty.error);

    const runAction = async (action, successMessage, onSuccess) => {
        try {
            setActionLoading(true);
            await action();
            alert(successMessage);
            if (onSuccess) onSuccess();
            if (onRefresh) await onRefresh(customer.backendId);
        } catch (error) {
            alert(getApiErrorMessage(error, 'Action failed. Please try again.'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleEnrollLoyalty = () => {
        runAction(
            () => addLoyalty(customer.backendId, { points: 100, reason: 'Initial Loyalty Enrollment' }),
            'Customer successfully enrolled in loyalty program!'
        );
    };

    return (
        <div className="ec-modal-overlay" onClick={onClose}>
            <div
                className="ec-modal custom-scrollbar"
                style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="ec-modal-header" style={{ paddingBottom: 14, borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 17, color: '#111827', margin: 0 }}>{customer.name}</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3, margin: 0 }}>
                            {customer.id} • Registered {customer.registered}
                        </p>
                    </div>
                    <button type="button" className="ec-modal-close" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6366f1' }}>
                        <span style={{ fontSize: 24 }}>🔄</span>
                        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Loading customer profile...</p>
                    </div>
                ) : (
                    <div style={{ paddingTop: 14 }}>
                        {/* Summary Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '14px 16px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
                                {customer.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: 15, color: '#111827', margin: 0 }}>{customer.name}</p>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>{customer.email} • {customer.phone}</p>
                            </div>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: typeCfg[customer.type]?.bg || '#eef2ff', color: typeCfg[customer.type]?.color || '#6366f1' }}>
                                {customer.type}
                            </span>
                        </div>

                        {/* Navigation Tabs */}
                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
                            {TABS.map(tab => (
                                <button key={tab} type="button" style={tabBtnStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* TAB 1: OVERVIEW */}
                        {activeTab === 'Overview' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                    {[
                                        { label: 'Phone', value: customer.phone || 'Not available' },
                                        { label: 'City', value: customer.city || 'Not specified' },
                                        { label: 'Total Orders', value: `${customer.orders} orders` },
                                        { label: 'Total Spent', value: fmt(customer.totalSpent) },
                                        { label: 'Wallet Balance', value: walletBalance > 0 ? fmt(walletBalance) : '₹0' },
                                        { label: 'Loyalty Points', value: `${points} pts` },
                                        { label: 'Last Purchase', value: customer.lastOrder },
                                        { label: 'Birthday', value: customer.birthday || 'Not set' },
                                    ].map((f, i) => (
                                        <div key={i} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 10, padding: '10px 12px' }}>
                                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{f.label}</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2, margin: 0 }}>{f.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Account Status</p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {Object.keys(statusCfg).map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => { setStatus(s); onStatusChange(customer.id, s); }}
                                                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${status === s ? statusCfg[s].color : '#e5e7eb'}`, background: status === s ? statusCfg[s].bg : '#fff', color: status === s ? statusCfg[s].color : '#6b7280' }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 2: ORDERS */}
                        {activeTab === 'Orders' && (
                            <ListBlock
                                title={`Order History (${orders.length})`}
                                items={detailExtras.orders}
                                emptyTitle="No Orders Found"
                                emptyDesc="This customer has not placed any online store orders yet."
                                renderItem={(order) => (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <strong>Order #{order.order_number || order.id || '—'}</strong>
                                            <span style={{ color: '#6b7280', display: 'block', fontSize: 11, marginTop: 2 }}>
                                                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB') : 'Recent'}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: 800, color: '#10b981' }}>{fmt(order.total_amount || order.total || order.amount || 0)}</span>
                                            <span style={{ fontSize: 10, display: 'block', color: '#6b7280', textTransform: 'capitalize' }}>{order.status || 'Completed'}</span>
                                        </div>
                                    </div>
                                )}
                            />
                        )}

                        {/* TAB 3: WALLET */}
                        {activeTab === 'Wallet' && (
                            <>
                                <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Wallet Balance</p>
                                        <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 2, margin: 0 }}>{fmt(walletBalance)}</p>
                                    </div>
                                    <BsWallet2 size={24} style={{ color: '#6366f1' }} />
                                </div>

                                <ListBlock
                                    title="Recent Wallet Transactions"
                                    items={detailExtras.walletTransactions}
                                    emptyTitle="No Wallet Transactions"
                                    emptyDesc="No credit or debit transactions recorded for this wallet."
                                    renderItem={(tx) => (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{ textTransform: 'capitalize' }}>{tx.type || tx.transaction_type || 'Adjustment'}</strong>
                                                {tx.description && <span style={{ color: '#6b7280', display: 'block', fontSize: 11 }}>{tx.description}</span>}
                                            </div>
                                            <span style={{ fontWeight: 700, color: tx.type === 'debit' ? '#ef4444' : '#10b981' }}>
                                                {tx.type === 'debit' ? '-' : '+'}{fmt(tx.amount || 0)}
                                            </span>
                                        </div>
                                    )}
                                />

                                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginTop: 10 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Credit / Debit Wallet</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                        <input className="ec-input" type="number" min="1" placeholder="Amount (₹)" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} />
                                        <input className="ec-input" placeholder="Transaction Note" value={walletNote} onChange={e => setWalletNote(e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            type="button"
                                            className="adm-btn-primary"
                                            disabled={actionLoading || !walletAmount}
                                            onClick={() => runAction(
                                                () => creditWallet({ customer_id: customer.backendId, amount: Number(walletAmount), description: walletNote || undefined }),
                                                'Wallet credited successfully.',
                                                () => { setWalletAmount(''); setWalletNote(''); }
                                            )}
                                        >
                                            Credit Wallet
                                        </button>
                                        <button
                                            type="button"
                                            className="adm-btn-secondary"
                                            disabled={actionLoading || !walletAmount}
                                            onClick={() => runAction(
                                                () => debitWallet({ customer_id: customer.backendId, amount: Number(walletAmount), description: walletNote || undefined }),
                                                'Wallet debited successfully.',
                                                () => { setWalletAmount(''); setWalletNote(''); }
                                            )}
                                        >
                                            Debit Wallet
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 4: LOYALTY */}
                        {activeTab === 'Loyalty' && (
                            <>
                                {!hasLoyaltyRecord && points === 0 ? (
                                    <EmptyBlock
                                        icon={BsGift}
                                        title="No Loyalty Program"
                                        description="This customer has not joined the loyalty program."
                                        actionText="Enroll Customer"
                                        onAction={handleEnrollLoyalty}
                                    />
                                ) : (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ fontSize: 11, color: '#d97706', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Loyalty Points Balance</p>
                                            <p style={{ fontSize: 24, fontWeight: 800, color: '#92400e', marginTop: 2, margin: 0 }}>🎁 {points} Points</p>
                                        </div>
                                        <BsGift size={28} style={{ color: '#d97706' }} />
                                    </div>
                                )}

                                <ListBlock
                                    title="Loyalty Points History"
                                    items={detailExtras.loyaltyHistory}
                                    emptyTitle="No Loyalty History"
                                    emptyDesc="No loyalty point earn or redeem transactions recorded."
                                    renderItem={(entry) => (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong>{entry.type || entry.action || 'Points Adjustment'}</strong>
                                                {entry.reason && <span style={{ color: '#6b7280', display: 'block', fontSize: 11 }}>{entry.reason}</span>}
                                            </div>
                                            <span style={{ fontWeight: 700, color: '#d97706' }}>
                                                +{entry.points ?? entry.amount ?? 0} pts
                                            </span>
                                        </div>
                                    )}
                                />

                                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginTop: 10 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Add Loyalty Points</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
                                        <input className="ec-input" type="number" min="1" placeholder="Points" value={loyaltyPoints} onChange={e => setLoyaltyPoints(e.target.value)} />
                                        <input className="ec-input" placeholder="Reason for points" value={loyaltyReason} onChange={e => setLoyaltyReason(e.target.value)} />
                                    </div>
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        disabled={actionLoading || !loyaltyPoints}
                                        onClick={() => runAction(
                                            () => addLoyalty(customer.backendId, { points: Number(loyaltyPoints), reason: loyaltyReason || undefined }),
                                            'Loyalty points added.',
                                            () => { setLoyaltyPoints(''); setLoyaltyReason(''); }
                                        )}
                                    >
                                        Add Loyalty Points
                                    </button>
                                </div>
                            </>
                        )}

                        {/* TAB 5: NOTES */}
                        {activeTab === 'Notes' && (
                            <>
                                <ListBlock
                                    title="Customer CRM Notes"
                                    items={detailExtras.notes}
                                    emptyTitle="No Notes Yet"
                                    emptyDesc="Add important reminders, follow-ups or customer notes below."
                                    renderItem={(note) => (
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 500 }}>{note.content || note.note || note.text || '—'}</p>
                                            {note.created_at && (
                                                <span style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginTop: 4 }}>
                                                    {new Date(note.created_at).toLocaleString('en-GB')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                />

                                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Create New Note</p>
                                    <textarea
                                        className="ec-input"
                                        rows={3}
                                        placeholder="Enter customer interaction note..."
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                        style={{ width: '100%', resize: 'vertical' }}
                                    />
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        style={{ marginTop: 8 }}
                                        disabled={actionLoading || !noteText.trim()}
                                        onClick={() => runAction(
                                            () => createNote({ customer_id: customer.backendId, content: noteText.trim() }),
                                            'Customer note saved successfully.',
                                            () => setNoteText('')
                                        )}
                                    >
                                        Save Note
                                    </button>
                                </div>
                            </>
                        )}

                        {/* TAB 6: MESSAGES */}
                        {activeTab === 'Messages' && (
                            <>
                                <ListBlock
                                    title="Communication Log"
                                    items={detailExtras.communications}
                                    emptyTitle="No Communication Logged"
                                    emptyDesc="SMS and WhatsApp messages sent to customer will appear here."
                                    renderItem={(msg) => (
                                        <div>
                                            <strong style={{ textTransform: 'uppercase', color: '#6366f1' }}>{msg.channel || msg.type || 'Message'}</strong>
                                            <p style={{ margin: '2px 0 0 0' }}>{msg.message || msg.content || msg.body || '—'}</p>
                                            {msg.sent_at && <span style={{ color: '#9ca3af', fontSize: 10, display: 'block', marginTop: 2 }}>{new Date(msg.sent_at).toLocaleString('en-GB')}</span>}
                                        </div>
                                    )}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Send SMS Notification</p>
                                        <textarea className="ec-input" rows={2} placeholder="SMS body..." value={smsMessage} onChange={e => setSmsMessage(e.target.value)} style={{ width: '100%' }} />
                                        <button
                                            type="button"
                                            className="adm-btn-secondary"
                                            style={{ marginTop: 8, width: '100%' }}
                                            disabled={actionLoading || !smsMessage.trim()}
                                            onClick={() => runAction(
                                                () => sendCustomerSms({ customer_id: customer.backendId, message: smsMessage.trim() }),
                                                'SMS notification sent successfully.',
                                                () => setSmsMessage('')
                                            )}
                                        >
                                            Send SMS
                                        </button>
                                    </div>

                                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Send WhatsApp</p>
                                        <textarea className="ec-input" rows={2} placeholder="WhatsApp message..." value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} style={{ width: '100%' }} />
                                        <button
                                            type="button"
                                            className="adm-btn-secondary"
                                            style={{ marginTop: 8, width: '100%' }}
                                            disabled={actionLoading || !whatsappMessage.trim()}
                                            onClick={() => runAction(
                                                () => sendCustomerWhatsapp({ customer_id: customer.backendId, message: whatsappMessage.trim() }),
                                                'WhatsApp message sent successfully.',
                                                () => setWhatsappMessage('')
                                            )}
                                        >
                                            Send WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 7: ACTIONS & REFERRALS */}
                        {activeTab === 'Actions' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {showFeedback && (
                                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Record Customer Feedback</p>
                                        <select className="ec-input" value={feedbackRating} onChange={e => setFeedbackRating(e.target.value)} style={{ marginBottom: 8, width: '100%' }}>
                                            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                        </select>
                                        <textarea className="ec-input" rows={2} placeholder="Enter feedback details..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} style={{ width: '100%' }} />
                                        <button
                                            type="button"
                                            className="adm-btn-primary"
                                            style={{ marginTop: 8 }}
                                            disabled={actionLoading || !feedbackText.trim()}
                                            onClick={() => runAction(
                                                () => createFeedback({ customer_id: customer.backendId, rating: Number(feedbackRating), comment: feedbackText.trim() }),
                                                'Feedback recorded.',
                                                () => setFeedbackText('')
                                            )}
                                        >
                                            Submit Feedback
                                        </button>
                                    </div>
                                )}

                                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Create Referral</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                        <input className="ec-input" placeholder="Referral Email" value={referralEmail} onChange={e => setReferralEmail(e.target.value)} />
                                        <input className="ec-input" placeholder="Referral Code (Optional)" value={referralCode} onChange={e => setReferralCode(e.target.value)} />
                                    </div>
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        disabled={actionLoading || !referralEmail.trim()}
                                        onClick={() => runAction(
                                            () => createReferral({ customer_id: customer.backendId, email: referralEmail.trim(), code: referralCode.trim() || undefined }),
                                            'Referral code created successfully.',
                                            () => { setReferralEmail(''); setReferralCode(''); }
                                        )}
                                    >
                                        Create Referral
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDetailPanel;
