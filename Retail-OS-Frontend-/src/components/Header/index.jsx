import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsSearch, BsBell, BsBoxArrowRight, BsPerson, BsChevronDown } from 'react-icons/bs';
import { logoutUser } from '../../services/auth';
import LogoutConfirmModal from '../LogoutConfirmModal';
import { getInitials } from '../../utils/userHelpers';

const Header = () => {
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const userName = user?.full_name || user?.name || 'Akshay Chavan';
    const userEmail = user?.email || 'akshay.chavan@shekruweb.com';
    const userRole = user?.role?.name || user?.role || 'Employee';

    const userInitials = useMemo(() => getInitials(userName), [userName]);

    const handleLogoutConfirm = async () => {
        setLogoutLoading(true);
        try {
            await logoutUser();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLogoutLoading(false);
            setShowLogoutModal(false);
            navigate('/login', { replace: true });
        }
    };

    return (
        <header className="pos-header">
            {/* Search Bar */}
            <div className="header-search-wrap">
                <BsSearch className="header-search-icon" size={14} />
                <input
                    className="header-search"
                    type="text"
                    placeholder="Search here..."
                />
            </div>

            {/* Right side controls */}
            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* [Notifications] Bell Icon Button with Count Badge */}
                <button
                    type="button"
                    className="header-icon-btn header-icon-btn--bell"
                    title="Notifications"
                    style={{
                        position: 'relative',
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                >
                    <BsBell size={17} color="#6366f1" />
                    <span
                        style={{
                            position: 'absolute',
                            top: -3,
                            right: -3,
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 800,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #ffffff',
                        }}
                    >
                        1
                    </span>
                </button>

                {/* Profile Trigger Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setShowProfileMenu(prev => !prev)}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 14,
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        {userInitials}

                        {/* Online Status Green Indicator */}
                        <span
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#10b981',
                                border: '2px solid #ffffff',
                            }}
                        />
                    </button>

                    {/* Profile Dropdown Menu Card (RetailOS Theme) */}
                    {showProfileMenu && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                onClick={() => setShowProfileMenu(false)}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 10px)',
                                    width: 270,
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 14,
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                    overflow: 'hidden',
                                    zIndex: 100,
                                    animation: 'fadeIn 0.15s ease-out',
                                }}
                            >
                                {/* Top Banner Header */}
                                <div
                                    style={{
                                        background: '#eef2ff',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        borderBottom: '1px solid #c7d2fe',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 46,
                                            height: 46,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                            color: '#ffffff',
                                            fontWeight: 800,
                                            fontSize: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
                                        }}
                                    >
                                        {userInitials}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {userName}
                                        </p>
                                        <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 5px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {userEmail}
                                        </p>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                background: '#6366f1',
                                                color: '#ffffff',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '2px 9px',
                                                borderRadius: 12,
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {userRole}
                                        </span>
                                    </div>
                                </div>

                                {/* Menu Action Buttons */}
                                <div style={{ padding: '6px 8px' }}>
                                    {/* Profile Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate('/profile');
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '9px 12px',
                                            border: 'none',
                                            borderRadius: 8,
                                            background: 'transparent',
                                            color: '#374151',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 8,
                                                background: '#eef2ff',
                                                color: '#6366f1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <BsPerson size={16} />
                                        </span>
                                        <span>Admin Profile </span>
                                    </button>

                                    {/* Logout Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            setShowLogoutModal(true);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '9px 12px',
                                            border: 'none',
                                            borderRadius: 8,
                                            background: 'transparent',
                                            color: '#ef4444',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            marginTop: 2,
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 8,
                                                background: '#fef2f2',
                                                color: '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <BsBoxArrowRight size={16} />
                                        </span>
                                        <span>Logout Account</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <LogoutConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogoutConfirm}
                loading={logoutLoading}
            />
        </header>
    );
};

export default Header;


