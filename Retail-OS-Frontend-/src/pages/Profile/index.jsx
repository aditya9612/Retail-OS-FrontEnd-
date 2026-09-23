import React, { useState, useMemo } from 'react';
import {
    BsPerson,
    BsEnvelope,
    BsPhone,
    BsGeoAlt,
    BsKeyFill,
    BsCheckCircleFill,
    BsPersonBadge,
    BsShieldLock,
    BsLock,
    BsEye,
    BsEyeSlash,
} from 'react-icons/bs';
import { getInitials } from '../../utils/userHelpers';
import { auth } from '../../services/auth';

const Profile = () => {
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};

    const [userForm, setUserForm] = useState({
        name: storedUser?.full_name || storedUser?.name || 'Akshay Chavan',
        email: storedUser?.email || 'akshay.chavan@shekruweb.com',
        phone: storedUser?.phone || '+91 98345 78460',
        address: storedUser?.address || 'Pune Main Branch, Maharashtra',
        role: storedUser?.role?.name || storedUser?.role || 'System Administrator',
    });

    const [showPinModal, setShowPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const userInitials = useMemo(() => getInitials(userForm.name), [userForm.name]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = (e) => {
        e.preventDefault();
        const updated = { ...storedUser, full_name: userForm.name, email: userForm.email, phone: userForm.phone, address: userForm.address };
        localStorage.setItem('user', JSON.stringify(updated));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleChangePin = (e) => {
        e.preventDefault();
        if (newPin.length < 4) {
            alert('PIN must be at least 4 digits');
            return;
        }
        setShowPinModal(false);
        setNewPin('');
        alert('Security PIN updated successfully!');
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        const { currentPassword, newPassword, confirmPassword } = passwordForm;

        if (!currentPassword.trim()) {
            setPasswordError('Current password is required.');
            return;
        }
        if (!newPassword.trim()) {
            setPasswordError('New password is required.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New password and confirm password do not match.');
            return;
        }

        setPasswordLoading(true);

        try {
            await auth.changePassword(currentPassword, newPassword, confirmPassword);
            setPasswordSuccess('Password changed successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess('');
            }, 1800);
        } catch (error) {
            const errorMsg =
                error.response?.data?.detail?.message ||
                error.response?.data?.message ||
                error.response?.data?.detail ||
                'Failed to change password. Please verify current password.';

            setPasswordError(
                typeof errorMsg === 'string'
                    ? errorMsg
                    : 'Failed to change password.'
            );
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="dash-page" style={{ paddingBottom: 40, maxWidth: 900, margin: '0 auto' }}>
            {/* Page Header */}
            <div className="adm-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#eef2ff', color: '#6366f1', padding: '8px 12px', borderRadius: 10, fontSize: 20 }}>
                            <BsPersonBadge />
                        </span>
                        Admin Profile
                    </h1>
                    <p className="adm-page-sub">Manage your administrator account details and security credentials.</p>
                </div>
            </div>

            {/* Main Profile & Details Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 20 }}>
                {/* Header Banner Section */}
                <div style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', borderBottom: '1px solid #e5e7eb', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Avatar Initials Badge */}
                    <div
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                            flexShrink: 0,
                        }}
                    >
                        {userInitials}
                    </div>

                    {/* Admin Header Title */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                                {userForm.name}
                            </h2>
                            <span style={{ background: '#eef2ff', color: '#6366f1', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #c7d2fe' }}>
                                {userForm.role}
                            </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BsEnvelope style={{ color: '#6366f1' }} /> {userForm.email}
                        </p>
                    </div>
                </div>

                {/* Profile Information Form */}
                <div style={{ padding: '24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsPerson style={{ color: '#6366f1' }} /> Account Details
                        </h3>

                        {saveSuccess && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, border: '1px solid #a7f3d0' }}>
                                <BsCheckCircleFill size={13} /> Saved successfully!
                            </span>
                        )}
                    </div>

                    <form onSubmit={handleSaveProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                            {/* Full Name */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    className="ec-input"
                                    value={userForm.name}
                                    onChange={handleInputChange}
                                    required
                                    style={{ width: '100%', height: 38 }}
                                />
                            </div>

                            {/* Email Address */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    className="ec-input"
                                    value={userForm.email}
                                    onChange={handleInputChange}
                                    required
                                    style={{ width: '100%', height: 38 }}
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    className="ec-input"
                                    value={userForm.phone}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', height: 38 }}
                                />
                            </div>

                            {/* Address / Location */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                                    Store Location / Address
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    className="ec-input"
                                    value={userForm.address}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', height: 38 }}
                                />
                            </div>
                        </div>

                        {/* Form Action */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                            <button type="submit" className="adm-btn-primary">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Security Cards Grid (PIN & Password) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Change Password Card */}
                <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            <BsLock />
                        </div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                                Change Account Password
                            </p>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>
                                Update your account password for secure login access.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="adm-btn-primary"
                        onClick={() => { setShowPasswordModal(true); setPasswordError(''); setPasswordSuccess(''); }}
                        style={{ fontSize: 12, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                    >
                        <BsLock size={14} /> Change Password
                    </button>
                </div>

                {/* Security PIN Card */}
                <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            <BsKeyFill />
                        </div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                                Security & Terminal PIN
                            </p>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>
                                Update your security PIN for register lock.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => setShowPinModal(true)}
                        style={{ fontSize: 12, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                    >
                        <BsShieldLock size={14} /> Update PIN
                    </button>
                </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="ec-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="ec-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Change Account Password</h3>
                            <button className="ec-modal-close" onClick={() => setShowPasswordModal(false)}>✕</button>
                        </div>

                        {passwordError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginTop: 12 }}>
                                {passwordError}
                            </div>
                        )}

                        {passwordSuccess && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginTop: 12 }}>
                                {passwordSuccess}
                            </div>
                        )}

                        <form onSubmit={handleChangePasswordSubmit} style={{ marginTop: 16 }}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    Current Password *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        placeholder="Enter current password"
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                                        className="ec-input"
                                        style={{ width: '100%', height: 38, paddingRight: 36 }}
                                        required
                                        disabled={passwordLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => !prev)}
                                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}
                                    >
                                        {showPasswords ? <BsEyeSlash size={14} /> : <BsEye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    New Password *
                                </label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    placeholder="Enter new password (min 6 chars)"
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                                    className="ec-input"
                                    style={{ width: '100%', height: 38 }}
                                    required
                                    minLength={6}
                                    disabled={passwordLoading}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    Confirm New Password *
                                </label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    className="ec-input"
                                    style={{ width: '100%', height: 38 }}
                                    required
                                    minLength={6}
                                    disabled={passwordLoading}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                                <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowPasswordModal(false)} disabled={passwordLoading}>
                                    Cancel
                                </button>
                                <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={passwordLoading}>
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change PIN Modal */}
            {showPinModal && (
                <div className="ec-modal-overlay" onClick={() => setShowPinModal(false)}>
                    <div className="ec-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="ec-modal-header">
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Update Security PIN</h3>
                            <button className="ec-modal-close" onClick={() => setShowPinModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleChangePin} style={{ marginTop: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                                Enter New Security PIN (Min 4 digits)
                            </label>
                            <input
                                type="password"
                                maxLength={6}
                                placeholder="****"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                                className="ec-input"
                                style={{ width: '100%', padding: '10px 14px', fontSize: 16, textAlign: 'center', letterSpacing: '4px', height: 40 }}
                                required
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                                <button type="button" className="adm-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowPinModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="adm-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                    Update PIN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
