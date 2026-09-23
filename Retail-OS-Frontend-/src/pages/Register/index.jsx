import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BsEnvelope,
    BsLock,
    BsEye,
    BsEyeSlash,
    BsArrowRight,
    BsPerson,
    BsShop,
    BsPhone,
    BsShieldCheck,
    BsLightningCharge,
    BsCloudCheck,
    BsHeadset,
    BsGraphUpArrow,
    BsBoxSeam,
    BsPeople,
    BsReceipt,
    BsPercent,
    BsPieChart,
} from "react-icons/bs";
import { auth } from "../../services/auth";

const Register = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        tenant_name: "",
        slug: "",
        email: "",
        admin_name: "",
        password: "",
        phone: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "tenant_name" && !prev.slugModified) {
                next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            }
            if (name === "slug") {
                next.slugModified = true;
            }
            return next;
        });
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.tenant_name.trim()) {
            setError("Store / Business name is required.");
            return;
        }

        if (!form.slug.trim()) {
            setError("Tenant slug is required.");
            return;
        }

        if (!form.email.trim()) {
            setError("Admin email address is required.");
            return;
        }

        if (!form.admin_name.trim()) {
            setError("Admin full name is required.");
            return;
        }

        if (!form.password.trim() || form.password.length < 6) {
            setError("Password is required (minimum 6 characters).");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                tenant_name: form.tenant_name.trim(),
                slug: form.slug.trim(),
                email: form.email.trim(),
                admin_name: form.admin_name.trim(),
                password: form.password,
                phone: form.phone.trim() || undefined,
            };

            const response = await auth.register(payload);
            const msg = response?.message || "Account registered successfully! Redirecting to login...";
            setSuccess(msg);

            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            const rawDetail = err.response?.data?.detail;
            let errorMsg = "";

            if (typeof rawDetail === "string") {
                errorMsg = rawDetail;
            } else if (Array.isArray(rawDetail)) {
                errorMsg = rawDetail.map((d) => d.msg || JSON.stringify(d)).join(", ");
            } else if (rawDetail?.message) {
                errorMsg = rawDetail.message;
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else {
                errorMsg = "Registration failed. Please verify details and try again.";
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <style>{`
                * {
                    box-sizing: border-box;
                }

                html, body {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow-x: hidden;
                }

                .login-page-container {
                    height: 100vh;
                    max-height: 100vh;
                    width: 100%;
                    background: linear-gradient(135deg, #F0F4FE 0%, #E6EEFA 55%, #F4F7FF 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: clamp(10px, 1.6vh, 22px) clamp(16px, 2vw, 36px);
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    position: relative;
                    overflow: hidden;
                }

                .bg-circle-left {
                    position: absolute;
                    top: -140px;
                    left: -140px;
                    width: 650px;
                    height: 650px;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
                    border-radius: 50%;
                    pointer-events: none;
                }

                .bg-circle-right {
                    position: absolute;
                    bottom: -140px;
                    right: -140px;
                    width: 650px;
                    height: 650px;
                    background: radial-gradient(circle, rgba(255, 87, 34, 0.06) 0%, rgba(255, 255, 255, 0) 70%);
                    border-radius: 50%;
                    pointer-events: none;
                }

                .bg-bottom-right-wave {
                    position: absolute;
                    bottom: -30px;
                    right: -30px;
                    width: 420px;
                    height: 300px;
                    background: radial-gradient(ellipse at bottom right, rgba(147, 197, 253, 0.3) 0%, rgba(199, 210, 254, 0.18) 45%, rgba(255, 255, 255, 0) 75%);
                    border-radius: 60% 0 0 0;
                    pointer-events: none;
                    z-index: 0;
                }

                .bg-dots-pattern {
                    position: absolute;
                    top: 20px;
                    right: 42%;
                    width: 240px;
                    height: 160px;
                    background-image: radial-gradient(#94A3B8 1.2px, transparent 1.2px);
                    background-size: 16px 16px;
                    opacity: 0.3;
                    pointer-events: none;
                }

                .split-screen-layout {
                    display: flex;
                    width: 100%;
                    max-width: 1640px;
                    height: 100%;
                    max-height: 100%;
                    align-items: center;
                    justify-content: space-between;
                    gap: clamp(16px, 2.5vw, 40px);
                    z-index: 1;
                }

                .left-section-wrapper {
                    flex: 0 0 54%;
                    width: 54%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    gap: clamp(4px, 1vh, 10px);
                }

                .brand-header-box {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: transparent !important;
                }

                .brand-header-logo-img {
                    height: clamp(30px, 3.6vh, 40px);
                    width: auto;
                    object-fit: contain;
                }

                .brand-header-text {
                    font-size: clamp(20px, 2.6vh, 26px);
                    font-weight: 800;
                    letter-spacing: -0.03em;
                    line-height: 1;
                }
                .brand-dark { color: #0F172A; }
                .brand-orange { color: #FF5500; }

                .left-main-heading {
                    font-size: clamp(26px, 3.4vh, 40px);
                    font-weight: 800;
                    color: #0F172A;
                    line-height: 1.15;
                    margin: 0;
                    letter-spacing: -0.03em;
                }
                .highlight-blue { color: #2563EB; }
                .highlight-orange { color: #FF5500; }
                .highlight-darkblue { color: #0F172A; }

                .left-subtitle-text {
                    font-size: clamp(12px, 1.4vh, 14.5px);
                    color: #475569;
                    margin: 2px 0 0 0;
                    font-weight: 450;
                    line-height: 1.4;
                }

                .hero-stage-container {
                    position: relative;
                    width: 100%;
                    flex: 1;
                    min-height: clamp(220px, 36vh, 380px);
                    max-height: clamp(250px, 42vh, 400px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 2px 0;
                }

                .hero-store-img {
                    max-width: 90%;
                    max-height: clamp(220px, 38vh, 380px);
                    object-fit: contain;
                    filter: drop-shadow(0 16px 32px rgba(15, 23, 42, 0.09));
                    z-index: 2;
                }

                .bottom-feature-bar-container {
                    background: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 16px;
                    padding: clamp(6px, 1vh, 10px) clamp(8px, 1vw, 14px);
                    box-shadow: 0 5px 16px -3px rgba(15, 23, 42, 0.04);
                }

                .bottom-feature-row {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: clamp(4px, 0.7vw, 10px);
                }

                .feature-item-pill {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 2px;
                }

                .feature-pill-icon {
                    width: clamp(22px, 2.6vh, 28px);
                    height: clamp(22px, 2.6vh, 28px);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: clamp(11px, 1.3vh, 14px);
                    margin-bottom: 3px;
                }

                .feature-pill-title {
                    font-size: clamp(9.5px, 1.1vh, 11px);
                    font-weight: 700;
                    color: #0F172A;
                    line-height: 1.2;
                }

                .feature-pill-desc {
                    font-size: clamp(8px, 0.9vh, 9px);
                    color: #64748B;
                    margin-top: 1px;
                    line-height: 1.2;
                }

                .left-footer-copyright {
                    text-align: center;
                    font-size: clamp(9.5px, 1.1vh, 11px);
                    color: #94A3B8;
                    font-weight: 500;
                    margin-top: 1px;
                }

                .right-login-section {
                    flex: 0 0 44%;
                    width: 44%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow-y: auto;
                }

                .register-card {
                    width: 100%;
                    max-width: 500px;
                    background: #FFFFFF;
                    border-radius: 28px;
                    padding: clamp(20px, 3vh, 32px) clamp(20px, 2.2vw, 32px);
                    box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.09), 0 0 1px rgba(15, 23, 42, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.95);
                    max-height: 96vh;
                    overflow-y: auto;
                }

                .card-logo-box {
                    display: flex;
                    justify-content: center;
                    margin-bottom: clamp(6px, 1vh, 10px);
                }

                .card-logo-img {
                    height: clamp(40px, 5vh, 48px);
                    width: auto;
                    object-fit: contain;
                }

                .login-card-header {
                    text-align: center;
                    margin-bottom: clamp(10px, 1.5vh, 16px);
                }

                .welcome-headline {
                    font-size: clamp(22px, 3vh, 26px);
                    font-weight: 800;
                    color: #0F172A;
                    margin: 0 0 2px 0;
                    letter-spacing: -0.025em;
                }

                .welcome-subtext {
                    color: #64748B;
                    font-size: clamp(11.5px, 1.3vh, 13px);
                    margin: 0;
                    font-weight: 500;
                }

                .form-grid-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }

                .form-field-group {
                    margin-bottom: clamp(8px, 1.2vh, 12px);
                }

                .form-field-label {
                    display: block;
                    margin-bottom: 4px;
                    font-size: clamp(11.5px, 1.2vh, 12.5px);
                    font-weight: 600;
                    color: #334155;
                }

                .input-field-relative {
                    position: relative;
                }

                .input-prefix-icon {
                    position: absolute;
                    top: 50%;
                    left: 12px;
                    transform: translateY(-50%);
                    color: #94A3B8;
                    pointer-events: none;
                }

                .form-control-input {
                    width: 100%;
                    height: clamp(38px, 4.2vh, 42px);
                    padding: 0 12px 0 36px;
                    border-radius: 10px;
                    border: 1.5px solid #E2E8F0;
                    background: #F8FAFC;
                    outline: none;
                    font-size: 13px;
                    color: #0F172A;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .form-control-input:focus {
                    background: #FFFFFF;
                    border-color: #2563EB;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
                }

                .form-control-input-pwd {
                    padding-right: 36px;
                }

                .password-toggle-button {
                    position: absolute;
                    top: 50%;
                    right: 10px;
                    transform: translateY(-50%);
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    color: #94A3B8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                }

                .btn-submit-primary {
                    width: 100%;
                    height: clamp(38px, 4.4vh, 44px);
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #FFFFFF;
                    background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: background 0.2s, transform 0.15s;
                    box-shadow: 0 5px 15px -3px rgba(37, 99, 235, 0.32);
                    margin-top: 10px;
                }

                .btn-submit-primary:hover {
                    transform: translateY(-1px);
                    background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%);
                }

                .contact-admin-box {
                    text-align: center;
                    font-size: 12.5px;
                    color: #64748B;
                    margin-top: 14px;
                }

                .contact-admin-action {
                    color: #2563EB;
                    font-weight: 600;
                    cursor: pointer;
                }

                .contact-admin-action:hover {
                    text-decoration: underline;
                }

                .shekru-credit-box {
                    margin-top: 8px;
                    text-align: center;
                    font-size: 11.5px;
                    color: #64748B;
                    font-weight: 500;
                }

                .shekru-link {
                    color: #2563EB;
                    font-weight: 700;
                    text-decoration: none;
                }

                @media (max-width: 920px) {
                    .login-page-container {
                        padding: 16px 12px;
                        height: 100vh;
                        min-height: 100dvh;
                        overflow-y: auto;
                    }
                    .split-screen-layout {
                        flex-direction: column;
                    }
                    .left-section-wrapper {
                        display: none !important;
                    }
                    .right-login-section {
                        width: 100%;
                        flex: 1 1 100%;
                    }
                    .register-card {
                        max-width: 440px;
                        padding: 24px 18px;
                    }
                    .form-grid-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="bg-circle-left"></div>
            <div className="bg-circle-right"></div>
            <div className="bg-bottom-right-wave"></div>
            <div className="bg-dots-pattern"></div>

            <div className="split-screen-layout">
                {/* Left Promotional Section */}
                <div className="left-section-wrapper">
                    <div className="brand-header-box">
                        <img
                            src="/retailos-logo-transparent.png"
                            alt="Retail OS Logo"
                            className="brand-header-logo-img"
                        />
                        <span className="brand-header-text">
                            <span className="brand-dark">Retail</span>
                            <span className="brand-orange">OS</span>
                        </span>
                    </div>

                    <div>
                        <h1 className="left-main-heading">
                            Register your retail<br />
                            store on<br />
                            <span className="highlight-blue">Retail</span>
                            <span className="highlight-orange">OS</span>
                        </h1>
                        <p className="left-subtitle-text">
                            Get started in minutes with powerful Inventory, Customers,<br />
                            Billing, and Multi-Store Management.
                        </p>
                    </div>

                    <div className="hero-stage-container">
                        <img
                            src="/retail-store-3d.png"
                            alt="Retail Store 3D Illustration"
                            className="hero-store-img"
                        />
                    </div>

                    <div className="bottom-feature-bar-container">
                        <div className="bottom-feature-row">
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                                    <BsShieldCheck />
                                </div>
                                <div className="feature-pill-title">Secure Data</div>
                                <div className="feature-pill-desc">Enterprise security</div>
                            </div>
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                                    <BsLightningCharge />
                                </div>
                                <div className="feature-pill-title">Lightning Fast</div>
                                <div className="feature-pill-desc">Optimized speed</div>
                            </div>
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#E0F2FE", color: "#0284C7" }}>
                                    <BsCloudCheck />
                                </div>
                                <div className="feature-pill-title">Cloud Based</div>
                                <div className="feature-pill-desc">Access anywhere</div>
                            </div>
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#FFEDD5", color: "#EA580C" }}>
                                    <BsPhone />
                                </div>
                                <div className="feature-pill-title">Mobile Ready</div>
                                <div className="feature-pill-desc">Manage on the go</div>
                            </div>
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#F3E8FF", color: "#9333EA" }}>
                                    <BsHeadset />
                                </div>
                                <div className="feature-pill-title">24/7 Support</div>
                                <div className="feature-pill-desc">Always here</div>
                            </div>
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
                                    <BsPieChart />
                                </div>
                                <div className="feature-pill-title">Smart Insights</div>
                                <div className="feature-pill-desc">Grow faster</div>
                            </div>
                        </div>
                    </div>

                    <div className="left-footer-copyright">
                        © 2026 Retail OS. All rights reserved.
                    </div>
                </div>

                {/* Right Register Card */}
                <div className="right-login-section">
                    <div className="register-card">
                        <div className="card-logo-box">
                            <img
                                src="/retailos-logo-transparent.png"
                                alt="Retail OS Logo"
                                className="card-logo-img"
                            />
                        </div>

                        <div className="login-card-header">
                            <h2 className="welcome-headline">Create Account</h2>
                            <p className="welcome-subtext">
                                Register your store to continue to{" "}
                                <span style={{ color: "#0F172A", fontWeight: 700 }}>Retail</span>
                                <span style={{ color: "#FF5500", fontWeight: 700 }}>OS</span>
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                background: "#FEF2F2",
                                border: "1px solid #FECACA",
                                color: "#DC2626",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                marginBottom: 12,
                            }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div style={{
                                background: "#F0FDF4",
                                border: "1px solid #BBF7D0",
                                color: "#16A34A",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                marginBottom: 12,
                            }}>
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-grid-row">
                                <div className="form-field-group">
                                    <label className="form-field-label">Store / Business Name *</label>
                                    <div className="input-field-relative">
                                        <BsShop size={15} className="input-prefix-icon" />
                                        <input
                                            type="text"
                                            name="tenant_name"
                                            placeholder="My Retail Store"
                                            value={form.tenant_name}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            className="form-control-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-field-group">
                                    <label className="form-field-label">Store Slug *</label>
                                    <div className="input-field-relative">
                                        <BsShop size={15} className="input-prefix-icon" />
                                        <input
                                            type="text"
                                            name="slug"
                                            placeholder="my-retail-store"
                                            value={form.slug}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            className="form-control-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-grid-row">
                                <div className="form-field-group">
                                    <label className="form-field-label">Admin Full Name *</label>
                                    <div className="input-field-relative">
                                        <BsPerson size={15} className="input-prefix-icon" />
                                        <input
                                            type="text"
                                            name="admin_name"
                                            placeholder="John Doe"
                                            value={form.admin_name}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            className="form-control-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-field-group">
                                    <label className="form-field-label">Admin Email *</label>
                                    <div className="input-field-relative">
                                        <BsEnvelope size={15} className="input-prefix-icon" />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="admin@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            className="form-control-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-grid-row">
                                <div className="form-field-group">
                                    <label className="form-field-label">Password *</label>
                                    <div className="input-field-relative">
                                        <BsLock size={15} className="input-prefix-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Min 6 characters"
                                            value={form.password}
                                            onChange={handleChange}
                                            required
                                            minLength={6}
                                            disabled={loading}
                                            className="form-control-input form-control-input-pwd"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="password-toggle-button"
                                        >
                                            {showPassword ? <BsEyeSlash size={15} /> : <BsEye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-field-group">
                                    <label className="form-field-label">Phone Number</label>
                                    <div className="input-field-relative">
                                        <BsPhone size={15} className="input-prefix-icon" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="+91 98765 43210"
                                            value={form.phone}
                                            onChange={handleChange}
                                            disabled={loading}
                                            className="form-control-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-submit-primary"
                            >
                                {loading ? "Registering..." : <>Register Store <BsArrowRight size={16} /></>}
                            </button>
                        </form>

                        <div className="contact-admin-box">
                            Already have an account?{" "}
                            <span
                                className="contact-admin-action"
                                onClick={() => navigate("/login")}
                            >
                                Login here
                            </span>
                        </div>

                        <div className="shekru-credit-box">
                            Powered By{" "}
                            <a
                                href="https://www.shekruweb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shekru-link"
                            >
                                Shekru Labs India Pvt. Ltd.
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
