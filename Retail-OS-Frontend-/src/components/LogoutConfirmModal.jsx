import React from 'react';
import { BsBoxArrowRight, BsX } from 'react-icons/bs';

const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1200,
    background: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
};

const modalBoxStyle = {
    background: '#ffffff',
    width: '100%',
    maxWidth: '400px',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25), 0 0 1px rgba(15, 23, 42, 0.15)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    textAlign: 'center',
};

const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, loading = false }) => {
    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Close modal"
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        border: 'none',
                        background: '#f1f5f9',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        color: '#64748b',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <BsX size={20} />
                </button>

                {/* Icon Circle */}
                <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#fef2f2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    border: '1px solid #fee2e2',
                }}>
                    <BsBoxArrowRight size={24} style={{ marginLeft: 2 }} />
                </div>

                {/* Title & Description */}
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                    Log Out of Retail OS?
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5, fontWeight: 500 }}>
                    Are you sure you want to log out? You will need to sign in again to access your store dashboard.
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            height: '42px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            height: '42px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            opacity: loading ? 0.8 : 1,
                        }}
                    >
                        {loading ? 'Logging out...' : 'Yes, Log Out'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmModal;
