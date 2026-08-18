import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsEnvelope, BsLock, BsEye, BsEyeSlash } from "react-icons/bs";
import { auth } from "../../services/auth";
import { getCurrentUser } from "../../services/user";

const Login = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email.trim()) { alert('Email is required'); return; }
        if (!form.password.trim()) { alert('Password is required'); return; }

        setLoading(true);
        setError('');

        try {
            const data = await auth.login(form);
            console.log("Login response:", data);

            const user = await getCurrentUser();
            console.log("Current user response:", user);

            localStorage.setItem("user", JSON.stringify(user));

            navigate("/dashboard");
        } catch (err) {
            console.error("Login failed:", err);
            let errMsg = "Invalid login";
            if (err.response?.data) {
                const detail = err.response.data.detail;
                if (typeof detail === 'string') {
                    errMsg = detail;
                } else if (Array.isArray(detail)) {
                    errMsg = detail[0]?.msg || JSON.stringify(detail);
                } else if (detail?.message) {
                    errMsg = detail.message;
                } else if (err.response.data.message) {
                    errMsg = err.response.data.message;
                }
            } else if (err.message) {
                errMsg = err.message;
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "#ffffff",
                    borderRadius: 24,
                    padding: 32,
                    boxShadow: "0 25px 50px rgba(15,23,42,0.12)",
                }}
            >
                <div
                    style={{
                        textAlign: "center",
                        marginBottom: 32,
                    }}
                >
                    <h1
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            color: "#1e293b",
                            marginBottom: 8,
                        }}
                    >
                        Welcome Back
                    </h1>
                    <p
                        style={{
                            color: "#64748b",
                            fontSize: 14,
                            fontWeight: 500,
                        }}
                    >
                        Login to continue Retail OS
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 18 }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#334155",
                            }}
                        >
                            Email Address
                        </label>
                        <div style={{ position: "relative" }}>
                            <BsEnvelope
                                size={16}
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: 16,
                                    transform: "translateY(-50%)",
                                    color: "#94a3b8",
                                }}
                            />
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                style={{
                                    width: "100%",
                                    padding: "14px 16px 14px 44px",
                                    borderRadius: 14,
                                    border: "1px solid #e2e8f0",
                                    background: "#f8fafc",
                                    outline: "none",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#334155",
                            }}
                        >
                            Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <BsLock
                                size={16}
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: 16,
                                    transform: "translateY(-50%)",
                                    color: "#94a3b8",
                                }}
                            />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                style={{
                                    width: "100%",
                                    padding: "14px 46px 14px 44px",
                                    borderRadius: 14,
                                    border: "1px solid #e2e8f0",
                                    background: "#f8fafc",
                                    outline: "none",
                                    fontSize: 14,
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    right: 14,
                                    transform: "translateY(-50%)",
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    color: "#64748b",
                                }}
                            >
                                {showPassword ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: 10,
                            padding: '10px 14px',
                            marginBottom: 16,
                            fontSize: 13,
                            color: '#dc2626',
                            fontWeight: 600,
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginBottom: error ? 12 : 24,
                        }}
                    >
                        <button
                            type="button"
                            style={{
                                border: "none",
                                background: "transparent",
                                color: "#6366f1",
                                cursor: "pointer",
                            }}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="adm-btn-primary"
                        style={{
                            width: "100%",
                            justifyContent: "center",
                            padding: "14px 0",
                            borderRadius: 14,
                            fontSize: 15,
                            fontWeight: 800,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Logging in…' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;