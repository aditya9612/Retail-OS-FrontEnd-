import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsEnvelope, BsLock, BsEye, BsEyeSlash } from 'react-icons/bs';
import { loginUser } from '../../services/auth';
import { setTokens } from '../../utils/tokenStorage';

const Login = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.email.trim()) {
            alert('Email is required');
            return;
        }

        if (!form.password.trim()) {
            alert('Password is required');
            return;
        }

        setLoading(true);

        try {
            const data = await loginUser({
                email: form.email.trim(),
                password: form.password,
            });

            setTokens({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                token_type: data.token_type,
            });

            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Login failed:', err);

            const message =
                err.response?.data?.detail ||
                'Invalid email or password';

            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: '#ffffff',
                    borderRadius: 24,
                    padding: 32,
                    boxShadow: '0 25px 50px rgba(15, 23, 42, 0.12)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>
                        Login to continue Retail OS
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 700, color: '#334155' }}>
                            Email Address
                        </label>

                        <div style={{ position: 'relative' }}>
                            <BsEnvelope size={16} style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                value={form.email}
                                onChange={handleChange}
                                required 
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 44px',
                                    borderRadius: 14,
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    outline: 'none',
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 700, color: '#334155' }}>
                            Password
                        </label>

                        <div style={{ position: 'relative' }}>
                            <BsLock size={16} style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                style={{
                                    width: '100%',
                                    padding: '14px 46px 14px 44px',
                                    borderRadius: 14,
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    outline: 'none',
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: 14,
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                }}
                            >
                                {showPassword ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                        <button
                            type="button"
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#6366f1',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="adm-btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '14px 0',
                            borderRadius: 14,
                            fontSize: 15,
                            fontWeight: 800,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;