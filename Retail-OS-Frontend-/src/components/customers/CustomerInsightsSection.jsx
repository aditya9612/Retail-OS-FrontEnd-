import React, { useState } from 'react';
import { normalizeApiList } from './customerHelpers';

const CustomerInsightsSection = ({ birthdayCustomers = [], customerInsights = {} }) => {
    const [expanded, setExpanded] = useState(false);

    const birthdays = normalizeApiList(birthdayCustomers);
    const referrals = normalizeApiList(customerInsights.referrals);
    const feedback = normalizeApiList(customerInsights.feedback);
    const topCustomers = normalizeApiList(customerInsights.topCustomers);
    const retention = customerInsights.retention;
    const lifetimeValue = customerInsights.lifetimeValue;
    const loyaltyReport = customerInsights.loyaltyReport;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {birthdays.length === 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#64748b' }}>
                    🎂 No upcoming birthdays from the API right now.
                </div>
            )}

            {birthdays.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>🎂 Birthdays Coming Up</p>
                        <p style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
                            {birthdays.slice(0, 5).map(c => c.name || c.customer_name).join(', ')}
                            {birthdays.length > 5 ? ` +${birthdays.length - 5} more` : ''}
                        </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: 20 }}>
                        {birthdays.length} customer{birthdays.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12, overflow: 'hidden' }}>
                <button
                    type="button"
                    onClick={() => setExpanded(prev => !prev)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: 'none', background: '#f9fafb', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151' }}
                >
                    <span>📊 Customer Analytics & Insights</span>
                    <span>{expanded ? '▲' : '▼'}</span>
                </button>

                {expanded && (
                    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        {topCustomers.length > 0 && (
                            <InsightCard title="Top Customers" content={topCustomers.slice(0, 3).map(c => `${c.name || c.customer_name}: ₹${(c.total_spend || c.revenue || 0).toLocaleString('en-IN')}`).join(' · ')} />
                        )}
                        {retention && (
                            <InsightCard title="Retention" content={formatInsightObject(retention)} />
                        )}
                        {lifetimeValue && (
                            <InsightCard title="Lifetime Value" content={formatInsightObject(lifetimeValue)} />
                        )}
                        {loyaltyReport && (
                            <InsightCard title="Loyalty Report" content={formatInsightObject(loyaltyReport)} />
                        )}
                        {referrals.length > 0 && (
                            <InsightCard title="Referrals" content={`${referrals.length} referral record${referrals.length !== 1 ? 's' : ''}`} />
                        )}
                        {feedback.length > 0 && (
                            <InsightCard title="Feedback" content={`${feedback.length} feedback item${feedback.length !== 1 ? 's' : ''}`} />
                        )}
                        {!topCustomers.length && !retention && !lifetimeValue && !loyaltyReport && !referrals.length && !feedback.length && (
                            <p style={{ fontSize: 13, color: '#9ca3af', gridColumn: '1 / -1' }}>Analytics data will appear here when available from the API.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const InsightCard = ({ title, content }) => (
    <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>{content}</p>
    </div>
);

const formatInsightObject = (obj) => {
    if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
    if (!obj || typeof obj !== 'object') return '—';
    const entries = Object.entries(obj).slice(0, 4);
    return entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ') || '—';
};

export default CustomerInsightsSection;
