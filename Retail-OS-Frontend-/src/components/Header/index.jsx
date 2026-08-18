import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsSearch, BsBell, BsBoxArrowRight, BsChevronDown, BsList } from 'react-icons/bs';
import { logoutUser } from '../../services/auth';
import LogoutConfirmModal from '../LogoutConfirmModal';

const Header = ({ sidebarCollapsed, onToggleSidebar }) => {
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const userName = user?.full_name || 'Super User';
    const userRole = user?.role?.name || 'Admin';

    const userInitials = useMemo(() => {
        if (!userName) return 'SU';
        const parts = userName.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return userName.slice(0, 2).toUpperCase();
    }, [userName]);

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
            {/* Sidebar toggle button — always visible in header */}
            <button
                type="button"
                id="header-sidebar-toggle"
                onClick={onToggleSidebar}
                title={sidebarCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    border: 'none',
                    borderRadius: 8,
                    background: sidebarCollapsed ? '#eef2ff' : 'transparent',
                    color: sidebarCollapsed ? '#6366f1' : '#6b7280',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = '#eef2ff';
                    e.currentTarget.style.color = '#6366f1';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = sidebarCollapsed ? '#eef2ff' : 'transparent';
                    e.currentTarget.style.color = sidebarCollapsed ? '#6366f1' : '#6b7280';
                }}
            >
                <BsList size={20} />
            </button>

            {/* Search Bar */}
            <div className="header-search-wrap" style={{ flex: 1 }}>
                <BsSearch className="header-search-icon" size={14} />
                <input
                    className="header-search"
                    type="text"
                    placeholder="Search here..."
                />
            </div>

            {/* Right side controls */}
            <div className="header-right">
                {/* [Notifications] Bell */}

                <button
                    type="button"
                    className="header-icon-btn header-icon-btn--bell"
                    title="Notifications"
                >
                    <BsBell size={17} />
                    <span className="header-badge" />
                </button>

                {/* [SU Profile ▾] Dropdown Trigger */}
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setShowProfileMenu(prev => !prev)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 10px 4px 6px',
                            background: '#ffffff',
                            border: '1px solid var(--color-border)',
                            borderRadius: 20,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff&size=80`}
                            alt={`${userName} Avatar`}
                            className="header-avatar"
                            style={{ width: 28, height: 28, borderRadius: '50%' }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{userInitials} Profile</span>
                        <BsChevronDown size={11} style={{ color: '#6b7280', transition: 'transform 0.2s ease', transform: showProfileMenu ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {/* Profile Dropdown Menu */}
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
                                    top: 'calc(100% + 8px)',
                                    width: 200,
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 12,
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                                    padding: '6px 0',
                                    zIndex: 100,
                                }}
                            >
                                <div style={{ padding: '8px 14px', borderBottom: '1px solid #f3f4f6' }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                                    <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0 0', textTransform: 'capitalize' }}>{userRole}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => { setShowProfileMenu(false); setShowLogoutModal(true); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 14px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <BsBoxArrowRight size={15} />
                                    <span>Logout</span>
                                </button>
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
