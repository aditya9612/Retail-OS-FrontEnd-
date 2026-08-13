import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BsEnvelope,
    BsLock,
    BsEye,
    BsEyeSlash,
    BsArrowRight,
    BsShieldCheck,
    BsLightningCharge,
    BsCloudCheck,
    BsPhone,
    BsHeadset,
    BsGraphUpArrow,
    BsBoxSeam,
    BsPeople,
    BsReceipt,
    BsPercent,
    BsShop,
    BsPieChart,
} from "react-icons/bs";
import { auth } from "../../services/auth";
import { getCurrentUser } from "../../services/user";

const Login = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);

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
            alert("Email is required");
            return;
        }

        if (!form.password.trim()) {
            alert("Password is required");
            return;
        }

        try {
            const data = await auth.login(form);
            console.log("Login response:", data);

            const user = await getCurrentUser();
            console.log("Current user response:", user);

            localStorage.setItem("user", JSON.stringify(user));

            navigate("/dashboard");
        } catch (error) {
            console.log("Login failed:", error);

            alert(
                error.response?.data?.detail?.message ||
                "Invalid login"
            );
        }
    };

    const handleGoogleLogin = () => {
        window.open("https://accounts.google.com/", "_blank");
    };

    const handleMicrosoftLogin = () => {
        window.open("https://login.live.com/", "_blank");
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

                /* Viewport-adaptive container ensuring NO vertical scrollbar at 90% and 100% zoom */
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

                /* Light & Professional Background Shapes without expensive blur filters */
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

                /* Bottom-right soft decorative wave shape matching ORIGINAL REFERENCE */
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

                /* Subtle Faded Dots Pattern */
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

                /* LEFT SECTION (~57% Width for Store Illustration & 7 Cards) */
                .left-section-wrapper {
                    flex: 0 0 57%;
                    width: 57%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    gap: clamp(4px, 1vh, 10px);
                }

                /* Transparent RetailOS Brand Logo - NO white box background */
                .brand-header-box {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .brand-header-logo-img {
                    height: clamp(30px, 3.6vh, 40px);
                    width: auto;
                    object-fit: contain;
                    background: transparent !important;
                }
                .brand-header-text {
                    font-size: clamp(20px, 2.6vh, 26px);
                    font-weight: 800;
                    letter-spacing: -0.03em;
                    line-height: 1;
                }
                .brand-dark { color: #0F172A; }
                .brand-orange { color: #FF5500; }

                /* Main Title & Subtitle */
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

                /* 3D Store Illustration Stage - Prominent & Large Store Graphic */
                .hero-stage-container {
                    position: relative;
                    width: 100%;
                    flex: 1;
                    min-height: clamp(230px, 38vh, 390px);
                    max-height: clamp(260px, 44vh, 410px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 2px 0;
                }

                .stage-bg-glow {
                    position: absolute;
                    width: 420px;
                    height: 420px;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
                    border-radius: 50%;
                    pointer-events: none;
                }

                /* Soft & Crisp SVG Overlay for Blue Dashed Connector Lines with Arrowheads */
                .connectors-svg-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }

                /* Larger, Crisp & Prominent 3D Store Illustration */
                .hero-store-img {
                    max-width: 94%;
                    max-height: clamp(230px, 40vh, 390px);
                    object-fit: contain;
                    filter: drop-shadow(0 16px 32px rgba(15, 23, 42, 0.09));
                    z-index: 2;
                    position: relative;
                }

                /* Compact Horizontal Rounded-Rectangle Feature Cards (slightly wider than tall) */
                .floating-feature-card {
                    position: absolute;
                    background: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                    padding: clamp(5px, 0.8vh, 8px) clamp(8px, 1vw, 13px);
                    box-shadow: 0 6px 18px -2px rgba(15, 23, 42, 0.06);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 3;
                    min-width: 145px;
                    max-width: 195px;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .floating-feature-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 24px -4px rgba(15, 23, 42, 0.1);
                    border-color: #CBD5E1;
                }

                .floating-icon-wrapper {
                    width: clamp(26px, 3.2vh, 32px);
                    height: clamp(26px, 3.2vh, 32px);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: clamp(13px, 1.6vh, 15px);
                    flex-shrink: 0;
                }

                .floating-card-title {
                    font-size: clamp(10.5px, 1.2vh, 12px);
                    font-weight: 700;
                    color: #0F172A;
                    line-height: 1.2;
                    white-space: nowrap;
                }
                .floating-card-desc {
                    font-size: clamp(9px, 1vh, 10px);
                    color: #64748B;
                    line-height: 1.2;
                    margin-top: 1px;
                    white-space: nowrap;
                }

                /* Exact Compact Rounded-Rectangle Positions around Store Graphic matching ORIGINAL REFERENCE */
                .pos-gst { top: 32%; left: -2%; }
                .pos-inventory { top: 0%; left: 16%; }
                .pos-customers { top: -4%; right: 28%; }
                .pos-billing { top: 2%; right: -1%; }
                .pos-multistore { top: 36%; right: -3%; }
                .pos-analytics { bottom: 4%; left: 1%; }
                .pos-secure { bottom: 1%; right: 8%; }

                /* Bottom Feature Bar (6 Columns in Single Wide Container) */
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

                /* RIGHT SECTION (~41% Width for Larger Balanced Login Card) */
                .right-login-section {
                    flex: 0 0 41%;
                    width: 41%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .login-card {
                    width: 100%;
                    max-width: 475px;
                    background: #FFFFFF;
                    border-radius: 28px;
                    padding: clamp(26px, 3.8vh, 44px) clamp(24px, 2.4vw, 38px);
                    box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.09), 0 0 1px rgba(15, 23, 42, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.95);
                }

                .card-logo-box {
                    display: flex;
                    justify-content: center;
                    margin-bottom: clamp(10px, 1.5vh, 16px);
                }

                .card-logo-img {
                    height: clamp(50px, 6.2vh, 64px);
                    width: auto;
                    object-fit: contain;
                    background: transparent !important;
                }

                .login-card-header {
                    text-align: center;
                    margin-bottom: clamp(14px, 2vh, 20px);
                }

                .welcome-headline {
                    font-size: clamp(26px, 3.5vh, 32px);
                    font-weight: 800;
                    color: #0F172A;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.025em;
                }

                .welcome-subtext {
                    color: #64748B;
                    font-size: clamp(12.5px, 1.5vh, 14px);
                    margin: 0;
                    font-weight: 500;
                }

                .form-field-group {
                    margin-bottom: clamp(10px, 1.6vh, 16px);
                }

                .form-field-label {
                    display: block;
                    margin-bottom: 5px;
                    font-size: clamp(12px, 1.3vh, 13px);
                    font-weight: 600;
                    color: #334155;
                }

                .input-field-relative {
                    position: relative;
                }

                .input-prefix-icon {
                    position: absolute;
                    top: 50%;
                    left: 13px;
                    transform: translateY(-50%);
                    color: #94A3B8;
                    pointer-events: none;
                }

                .form-control-input {
                    width: 100%;
                    height: clamp(40px, 4.5vh, 46px);
                    padding: 0 13px 0 38px;
                    border-radius: 10px;
                    border: 1.5px solid #E2E8F0;
                    background: #F8FAFC;
                    outline: none;
                    font-size: 13.5px;
                    color: #0F172A;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .form-control-input:focus {
                    background: #FFFFFF;
                    border-color: #2563EB;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
                }

                .form-control-input-pwd {
                    padding-right: 38px;
                }

                .password-toggle-button {
                    position: absolute;
                    top: 50%;
                    right: 11px;
                    transform: translateY(-50%);
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    color: #94A3B8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3px;
                    border-radius: 5px;
                }

                .password-toggle-button:hover {
                    color: #475569;
                }

                .form-sub-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: clamp(12px, 1.8vh, 18px);
                }

                .checkbox-remember-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    font-size: 12.5px;
                    color: #334155;
                    font-weight: 500;
                    user-select: none;
                }

                .forgot-password-link {
                    border: none;
                    background: transparent;
                    color: #2563EB;
                    cursor: pointer;
                    font-size: 12.5px;
                    font-weight: 600;
                    padding: 0;
                }

                .forgot-password-link:hover {
                    text-decoration: underline;
                }

                .btn-submit-primary {
                    width: 100%;
                    height: clamp(40px, 4.6vh, 46px);
                    border-radius: 10px;
                    font-size: 14.5px;
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
                }

                .btn-submit-primary:hover {
                    transform: translateY(-1px);
                    background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%);
                }

                .btn-submit-primary:active {
                    transform: translateY(0);
                }

                .or-divider-row {
                    display: flex;
                    align-items: center;
                    margin: clamp(10px, 1.5vh, 16px) 0;
                    gap: 10px;
                }

                .or-divider-line {
                    flex: 1;
                    height: 1px;
                    background: #E2E8F0;
                }

                .or-divider-label {
                    font-size: 11.5px;
                    color: #94A3B8;
                    font-weight: 500;
                }

                .social-auth-row {
                    display: flex;
                    justify-content: center;
                    margin-bottom: clamp(10px, 1.5vh, 16px);
                }

                .btn-social-auth {
                    width: 100%;
                    height: clamp(40px, 4.5vh, 46px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    border-radius: 10px;
                    border: 1.5px solid #E2E8F0;
                    background: #FFFFFF;
                    color: #334155;
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s, border-color 0.2s;
                }

                .btn-social-auth:hover {
                    background: #F8FAFC;
                    border-color: #CBD5E1;
                }

                .contact-admin-box {
                    text-align: center;
                    font-size: 12.5px;
                    color: #64748B;
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
                    margin-top: clamp(6px, 1vh, 12px);
                    text-align: center;
                    font-size: 12px;
                    color: #64748B;
                    font-weight: 500;
                }

                .shekru-link {
                    color: #2563EB;
                    font-weight: 700;
                    text-decoration: none;
                }
                .shekru-link:hover {
                    text-decoration: underline;
                }

                /* Responsive Design */
                @media (max-width: 1150px) {
                    .left-section-wrapper {
                        flex: 0 0 54%;
                        width: 54%;
                    }
                    .right-login-section {
                        flex: 0 0 44%;
                        width: 44%;
                    }
                    .left-main-heading {
                        font-size: 32px;
                    }
                    .hero-stage-container {
                        min-height: 250px;
                    }
                    .floating-feature-card {
                        min-width: 140px;
                        padding: 5px 8px;
                    }
                }

                @media (max-width: 920px) {
                    .login-page-container {
                        padding: 20px 16px;
                        height: auto;
                        min-height: 100vh;
                        max-height: none;
                        overflow-y: auto;
                    }
                    .split-screen-layout {
                        flex-direction: column;
                        align-items: center;
                        max-height: none;
                        gap: 20px;
                    }
                    .left-section-wrapper {
                        width: 100%;
                        flex: 1 1 auto;
                        height: auto;
                    }
                    .right-login-section {
                        width: 100%;
                        flex: 1 1 auto;
                        height: auto;
                        margin-top: 10px;
                    }
                    .login-card {
                        max-width: 460px;
                    }
                    .bottom-feature-row {
                        grid-template-columns: repeat(3, 1fr);
                    }
                    .connectors-svg-overlay {
                        display: none;
                    }
                }

                @media (max-width: 576px) {
                    .bottom-feature-row {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .floating-feature-card {
                        display: none;
                    }
                    .login-card {
                        padding: 20px 16px;
                        border-radius: 20px;
                    }
                }
            `}</style>

            {/* Background Decorative Shapes & Pattern */}
            <div className="bg-circle-left"></div>
            <div className="bg-circle-right"></div>
            <div className="bg-bottom-right-wave"></div>
            <div className="bg-dots-pattern"></div>

            <div className="split-screen-layout">
                {/* LEFT SECTION (~64% Width for Larger Store Illustration & 7 Cards) */}
                <div className="left-section-wrapper">
                    {/* Brand Header Logo - Transparent PNG with NO white box background */}
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

                    {/* Main Headline */}
                    <div>
                        <h1 className="left-main-heading">
                            Manage your retail<br />
                            business<br />
                            <span className="highlight-blue">smarter</span>,{" "}
                            <span className="highlight-orange">faster</span>,{" "}
                            <span className="highlight-darkblue">better</span>
                        </h1>
                        <p className="left-subtitle-text">
                            All-in-one platform for Inventory, Customers,<br />
                            Billing, GST and Analytics.
                        </p>
                    </div>

                    {/* 3D Store Illustration Stage with Prominent Store Building & Soft Blue SVG Connector Lines */}
                    <div className="hero-stage-container">
                        <div className="stage-bg-glow"></div>

                        {/* Soft & Crisp Blue Dashed SVG Connector Network with Arrowhead Markers */}
                        <svg className="connectors-svg-overlay" viewBox="0 0 800 500" preserveAspectRatio="none">
                            <defs>
                                <marker id="soft-blue-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#60A5FA" opacity="0.8" />
                                </marker>
                            </defs>
                            {/* Card 1: Inventory Management -> Cloud Icon */}
                            <path d="M 230 40 L 230 110 L 385 110" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            {/* Card 2: Customers Management -> Cloud Icon */}
                            <path d="M 430 30 L 430 90 L 415 90" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            {/* Card 3: Billing & Invoicing -> Store Roof */}
                            <path d="M 640 45 L 640 130 L 515 130" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            {/* Card 4: GST Compliance -> Store Counter */}
                            <path d="M 115 185 L 210 185" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            {/* Card 5: Multi-Store Management -> Store Wall */}
                            <path d="M 660 205 L 575 205" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            {/* Card 6: Analytics & Reports -> Store Base */}
                            <path d="M 140 430 L 275 430 L 275 365" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            {/* Card 7: Secure & Reliable -> Store Delivery Truck */}
                            <path d="M 600 440 L 530 440 L 530 385" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                        </svg>

                        {/* Larger High-Res Isolated 3D Retail Store Graphic (House, Truck, Cloud, Counter) */}
                        <img
                            src="/retail-store-3d.png"
                            alt="Retail Store 3D Illustration"
                            className="hero-store-img"
                        />

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 1: GST Compliance */}
                        <div className="floating-feature-card pos-gst">
                            <div className="floating-icon-wrapper" style={{ background: "#FFEDD5", color: "#EA580C" }}>
                                <BsPercent />
                            </div>
                            <div>
                                <div className="floating-card-title">GST Compliance</div>
                                <div className="floating-card-desc">Simplify GST compliance</div>
                            </div>
                        </div>

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 2: Inventory Management */}
                        <div className="floating-feature-card pos-inventory">
                            <div className="floating-icon-wrapper" style={{ background: "#F3E8FF", color: "#9333EA" }}>
                                <BsBoxSeam />
                            </div>
                            <div>
                                <div className="floating-card-title">Inventory Management</div>
                                <div className="floating-card-desc">Track stock in real-time</div>
                            </div>
                        </div>

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 3: Customers Management */}
                        <div className="floating-feature-card pos-customers">
                            <div className="floating-icon-wrapper" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                                <BsPeople />
                            </div>
                            <div>
                                <div className="floating-card-title">Customers Management</div>
                                <div className="floating-card-desc">Build stronger relationships</div>
                            </div>
                        </div>

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 4: Billing & Invoicing */}
                        <div className="floating-feature-card pos-billing">
                            <div className="floating-icon-wrapper" style={{ background: "#DBEAFE", color: "#2563EB" }}>
                                <BsReceipt />
                            </div>
                            <div>
                                <div className="floating-card-title">Billing & Invoicing</div>
                                <div className="floating-card-desc">Fast & accurate invoicing</div>
                            </div>
                        </div>

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 5: Multi-Store Management */}
                        <div className="floating-feature-card pos-multistore">
                            <div className="floating-icon-wrapper" style={{ background: "#FEF3C7", color: "#D97706" }}>
                                <BsShop />
                            </div>
                            <div>
                                <div className="floating-card-title">Multi-Store Management</div>
                                <div className="floating-card-desc">Manage all stores in one place</div>
                            </div>
                        </div>

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 6: Analytics & Reports */}
                        <div className="floating-feature-card pos-analytics">
                            <div className="floating-icon-wrapper" style={{ background: "#E0E7FF", color: "#4F46E5" }}>
                                <BsGraphUpArrow />
                            </div>
                            <div>
                                <div className="floating-card-title">Analytics & Reports</div>
                                <div className="floating-card-desc">Data-driven insights</div>
                            </div>
                        </div>

                        {/* Floating Compact Horizontal Rounded-Rectangle Feature Card 7: Secure & Reliable */}
                        <div className="floating-feature-card pos-secure">
                            <div className="floating-icon-wrapper" style={{ background: "#D1FAE5", color: "#059669" }}>
                                <BsShieldCheck />
                            </div>
                            <div>
                                <div className="floating-card-title">Secure & Reliable</div>
                                <div className="floating-card-desc">Your data is safe with us</div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Feature Bar (6 Columns in Single Rounded Container) */}
                    <div className="bottom-feature-bar-container">
                        <div className="bottom-feature-row">
                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                                    <BsShieldCheck />
                                </div>
                                <div className="feature-pill-title">Secure Data</div>
                                <div className="feature-pill-desc">Enterprise-grade security</div>
                            </div>

                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                                    <BsLightningCharge />
                                </div>
                                <div className="feature-pill-title">Lightning Fast</div>
                                <div className="feature-pill-desc">Optimized for speed</div>
                            </div>

                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#E0F2FE", color: "#0284C7" }}>
                                    <BsCloudCheck />
                                </div>
                                <div className="feature-pill-title">Cloud Based</div>
                                <div className="feature-pill-desc">Access anywhere, anytime</div>
                            </div>

                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#FFEDD5", color: "#EA580C" }}>
                                    <BsPhone />
                                </div>
                                <div className="feature-pill-title">Mobile Friendly</div>
                                <div className="feature-pill-desc">Manage on the go from any device</div>
                            </div>

                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#F3E8FF", color: "#9333EA" }}>
                                    <BsHeadset />
                                </div>
                                <div className="feature-pill-title">24/7 Support</div>
                                <div className="feature-pill-desc">We're here to help you</div>
                            </div>

                            <div className="feature-item-pill">
                                <div className="feature-pill-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
                                    <BsPieChart />
                                </div>
                                <div className="feature-pill-title">Smart Insights</div>
                                <div className="feature-pill-desc">Grow with intelligent decisions</div>
                            </div>
                        </div>
                    </div>

                    {/* Left Footer Copyright */}
                    <div className="left-footer-copyright">
                        © 2026 Retail OS. All rights reserved.
                    </div>
                </div>

                {/* RIGHT SECTION (~34% Width for a Sleek Vertically Slender Card) */}
                <div className="right-login-section">
                    <div className="login-card">
                        {/* Centered Transparent Retail OS Logo */}
                        <div className="card-logo-box">
                            <img
                                src="/retailos-logo-transparent.png"
                                alt="Retail OS Logo"
                                className="card-logo-img"
                            />
                        </div>

                        {/* Welcome Back Header */}
                        <div className="login-card-header">
                            <h2 className="welcome-headline">Welcome Back!</h2>
                            <p className="welcome-subtext">
                                Login to continue to{" "}
                                <span style={{ color: "#0F172A", fontWeight: 700 }}>Retail</span>
                                <span style={{ color: "#FF5500", fontWeight: 700 }}>OS</span>
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit}>
                            {/* Email Address Field */}
                            <div className="form-field-group">
                                <label className="form-field-label">Email Address</label>
                                <div className="input-field-relative">
                                    <BsEnvelope size={16} className="input-prefix-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        className="form-control-input"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="form-field-group">
                                <label className="form-field-label">Password</label>
                                <div className="input-field-relative">
                                    <BsLock size={16} className="input-prefix-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Enter your password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        minLength={6}
                                        className="form-control-input form-control-input-pwd"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="password-toggle-button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Options Row */}
                            <div className="form-sub-row">
                                <label className="checkbox-remember-label">
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer" }}
                                    />
                                    Remember Me
                                </label>
                                <button type="button" className="forgot-password-link">
                                    Forgot Password?
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" className="btn-submit-primary">
                                Login <BsArrowRight size={16} />
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="or-divider-row">
                            <div className="or-divider-line"></div>
                            <span className="or-divider-label">or continue with</span>
                            <div className="or-divider-line"></div>
                        </div>

                        {/* Social Login Button */}
                        <div className="social-auth-row">
                            <button type="button" onClick={handleGoogleLogin} className="btn-social-auth">
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                Google
                            </button>
                        </div>

                        {/* Contact Admin */}
                        <div className="contact-admin-box">
                            Don't have an account?{" "}
                            <span className="contact-admin-action">Contact Admin</span>
                        </div>

                        {/* Powered By Shekru Labs Link Under Contact Admin */}
                        <div className="shekru-credit-box">
                            Powered By{" "}
                            <a
                                href="https://www.shekruweb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shekru-link"
                            >
                                Shekru Labs India Pvt Ltd
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
