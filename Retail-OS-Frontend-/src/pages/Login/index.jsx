import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsEnvelope, BsLock, BsEye, BsEyeSlash, BsArrowRight, } from "react-icons/bs";
import { auth } from "../../services/auth";
import { getCurrentUser } from "../../services/user";

// RetailOS Official Brand Logo Component matching exact brand guidelines
const RetailOSBrandLogo = ({ size = 44, showText = true, layout = "row" }) => {
    return (
        <div style={{
            display: "inline-flex",
            flexDirection: layout === "column" ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: layout === "column" ? 14 : 12
        }}>
            <svg width={size} height={size * 0.88} viewBox="0 0 220 195" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="logoOrangeHalf" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF3D00" />
                        <stop offset="100%" stopColor="#FF8500" />
                    </linearGradient>
                    <linearGradient id="logoBlueHalf" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0837B8" />
                        <stop offset="55%" stopColor="#1E65F3" />
                        <stop offset="100%" stopColor="#00A3FF" />
                    </linearGradient>
                    <linearGradient id="logoHandle" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF5500" />
                        <stop offset="100%" stopColor="#FF8800" />
                    </linearGradient>
                </defs>

                {/* Bag Handle */}
                <path
                    d="M86 58 C86 26, 134 26, 134 58"
                    stroke="url(#logoHandle)"
                    strokeWidth="15"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Top Orange Bag Section */}
                <path
                    d="M 68 55 H 152 C 158 55 162 60 160 66 L 151 77 L 55 117 L 57 66 C 58 60 62 55 68 55 Z"
                    fill="url(#logoOrangeHalf)"
                />

                {/* Bottom Blue Bag Section */}
                <path
                    d="M 53 124 L 149 84 L 158 136 C 160 148 151 160 138 160 H 82 C 69 160 58 148 56 136 L 53 124 Z"
                    fill="url(#logoBlueHalf)"
                />

                {/* Pixel Dispersion Burst (Right Side) */}
                {/* Orange pixels */}
                <rect x="185" y="48" width="14" height="14" rx="2.5" fill="#FF9100" />
                <rect x="163" y="58" width="14" height="14" rx="2.5" fill="#FF6600" />
                <rect x="188" y="72" width="14" height="14" rx="2.5" fill="#FF7700" />
                <rect x="166" y="82" width="14" height="14" rx="2.5" fill="#FF5500" />

                {/* Blue / Cyan pixels */}
                <rect x="190" y="96" width="14" height="14" rx="2.5" fill="#00C3FF" />
                <rect x="168" y="106" width="14" height="14" rx="2.5" fill="#0094FF" />
                <rect x="172" y="128" width="15" height="15" rx="2.5" fill="#1E65F3" />
                <rect x="150" y="136" width="14" height="14" rx="2.5" fill="#0088FF" />
            </svg>

            {showText && (
                <span style={{
                    fontSize: layout === "column" ? size * 0.52 : size * 0.58,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    lineHeight: 1
                }}>
                    <span style={{ color: "#061338" }}>Retail</span>
                    <span style={{ color: "#FF5500" }}>OS</span>
                </span>
            )}
        </div>
    );
};

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

    return (
        <div className="login-page-container">
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseSlow {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 0.9; }
                }
                .login-page-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #F3F7FE 0%, #EAEFFC 50%, #F5F8FF 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 24px;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                .bg-glow-1 {
                    position: absolute;
                    top: -120px;
                    left: -120px;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
                    border-radius: 50%;
                    pointer-events: none;
                }
                .bg-glow-2 {
                    position: absolute;
                    bottom: -150px;
                    right: -100px;
                    width: 550px;
                    height: 550px;
                    background: radial-gradient(circle, rgba(255, 87, 34, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
                    border-radius: 50%;
                    pointer-events: none;
                }
                .split-layout {
                    display: flex;
                    width: 100%;
                    max-width: 1280px;
                    align-items: center;
                    gap: 56px;
                    z-index: 1;
                }
                .left-section {
                    flex: 1.25;
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                    min-width: 0;
                }
                .right-section {
                    flex: 0.95;
                    display: flex;
                    justify-content: center;
                    min-width: 0;
                }
                .dot-grid {
                    display: grid;
                    grid-template-columns: repeat(12, 4px);
                    gap: 6px;
                    margin-bottom: -12px;
                    opacity: 0.35;
                }
                .dot-grid div {
                    width: 4px;
                    height: 4px;
                    background-color: #64748B;
                    border-radius: 50%;
                }
                .dashboard-card-mock {
                    background: #FFFFFF;
                    border-radius: 20px;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.07);
                    padding: 20px;
                    overflow: hidden;
                }
                .feature-card {
                    flex: 1;
                    background: #FFFFFF;
                    border-radius: 16px;
                    padding: 16px 10px;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .feature-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.07);
                    border-color: #CBD5E1;
                }
                .login-card {
                    width: 100%;
                    max-width: 460px;
                    background: #FFFFFF;
                    border-radius: 24px;
                    padding: 40px 36px;
                    box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.1), 0 0 1px rgba(15, 23, 42, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    animation: fadeIn 0.4s ease-out;
                    box-sizing: border-box;
                }
                .input-container {
                    position: relative;
                }
                .input-field {
                    width: 100%;
                    padding: 14px 16px 14px 44px;
                    border-radius: 14px;
                    border: 1.5px solid #E2E8F0;
                    background: #F8FAFC;
                    outline: none;
                    font-size: 14px;
                    color: #0F172A;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }
                .input-field:focus {
                    background: #FFFFFF;
                    border-color: #2563EB;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
                }
                .input-field-pwd {
                    padding-right: 48px;
                }
                .btn-submit {
                    width: 100%;
                    padding: 14px;
                    border-radius: 14px;
                    font-size: 16px;
                    font-weight: 700;
                    color: #FFFFFF;
                    background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                    box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.35);
                }
                .btn-submit:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px -4px rgba(37, 99, 235, 0.45);
                    background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%);
                }
                .btn-submit:active {
                    transform: translateY(0);
                }
                .social-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid #E2E8F0;
                    background: #FFFFFF;
                    color: #334155;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .social-btn:hover {
                    background: #F8FAFC;
                    border-color: #CBD5E1;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
                }
                @media (max-width: 1080px) {
                    .split-layout {
                        gap: 32px;
                    }
                    .left-section {
                        flex: 1;
                    }
                    .right-section {
                        flex: 1;
                    }
                }
                @media (max-width: 900px) {
                    .left-section {
                        display: none !important;
                    }
                    .split-layout {
                        justify-content: center;
                    }
                    .right-section {
                        flex: 1;
                        width: 100%;
                    }
                    .login-card {
                        max-width: 440px;
                    }
                }
            `}</style>

            <div className="bg-glow-1"></div>
            <div className="bg-glow-2"></div>

            <div className="split-layout">
                {/* LEFT SECTION */}
                <div className="left-section">
                    {/* Header Brand Logo */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <RetailOSBrandLogo size={46} showText={true} />
                    </div>

                    {/* Dot grid decoration */}
                    <div style={{ position: "relative", marginTop: 8 }}>
                        <div className="dot-grid">
                            {[...Array(36)].map((_, i) => (
                                <div key={i} />
                            ))}
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", lineHeight: 1.25, margin: 0 }}>
                            Manage your retail business{" "}
                            <span style={{ color: "#2563EB" }}>smarter</span>,{" "}
                            <span style={{ color: "#FF5722" }}>faster</span>,{" "}
                            <span style={{ color: "#0F172A" }}>better</span>
                        </h1>
                    </div>

                    <p style={{ fontSize: 16, color: "#64748B", margin: 0, fontWeight: 400, lineHeight: 1.5 }}>
                        All-in-one solution for Inventory, Customers, Billing, GST and Analytics.
                    </p>

                    {/* Professional Dashboard Graphic Preview */}
                    <div className="dashboard-card-mock">
                        <div style={{ display: "flex", gap: 16 }}>
                            {/* Mini Sidebar */}
                            <div style={{ width: 140, borderRight: "1px solid #F1F5F9", paddingRight: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", marginBottom: 8 }}>
                                    <RetailOSBrandLogo size={20} showText={false} />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>Retail OS</span>
                                </div>
                                <div style={{ background: "#2563EB", color: "#FFFFFF", padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                    <span>📊</span> Dashboard
                                </div>
                                {["Inventory", "Customers", "Billing", "GST Management", "Reports", "Analytics", "Settings"].map((item, idx) => (
                                    <div key={idx} style={{ color: "#64748B", padding: "5px 10px", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 10 }}>•</span> {item}
                                    </div>
                                ))}
                            </div>

                            {/* Main Content Area */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Topbar inside dashboard */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Dashboard Overview</span>
                                    <span style={{ fontSize: 10, background: "#F1F5F9", color: "#475569", padding: "4px 8px", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                        Aug 06, 2026 📅
                                    </span>
                                </div>

                                {/* 4 KPI Cards */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                    {[
                                        { title: "Total Sales", val: "₹ 2,45,680", change: "↑ 12.5%", bg: "#EFF6FF", icon: "💳", iconBg: "#DBEAFE" },
                                        { title: "Orders", val: "1,320", change: "↑ 8.2%", bg: "#EFF6FF", icon: "📑", iconBg: "#DBEAFE" },
                                        { title: "Customers", val: "860", change: "↑ 11.3%", bg: "#ECFDF5", icon: "👤", iconBg: "#D1FAE5" },
                                        { title: "Products", val: "2,350", change: "↑ 6.7%", bg: "#FFF7ED", icon: "📦", iconBg: "#FFEDD5" },
                                    ].map((kpi, i) => (
                                        <div key={i} style={{ background: kpi.bg, borderRadius: 10, padding: 8 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                                                <span style={{ fontSize: 10, background: kpi.iconBg, padding: 3, borderRadius: 4 }}>{kpi.icon}</span>
                                                <span style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>{kpi.title}</span>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{kpi.val}</div>
                                            <div style={{ fontSize: 9, color: "#16A34A", fontWeight: 700, marginTop: 2 }}>{kpi.change}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Charts Row */}
                                <div style={{ display: "flex", gap: 12 }}>
                                    {/* Line Chart Card */}
                                    <div style={{ flex: 1.5, background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 12, padding: 10 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: "#0F172A" }}>Sales Overview</span>
                                            <span style={{ fontSize: 8, background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "2px 6px", borderRadius: 4, color: "#475569" }}>₹ 2,45,680</span>
                                        </div>
                                        <svg width="100%" height="70" viewBox="0 0 240 70" fill="none">
                                            <defs>
                                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M 0 55 Q 30 40, 60 48 T 120 30 T 180 40 T 240 10 L 240 70 L 0 70 Z" fill="url(#areaGrad)" />
                                            <path d="M 0 55 Q 30 40, 60 48 T 120 30 T 180 40 T 240 10" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                                            <circle cx="240" cy="10" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                                        </svg>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#94A3B8", marginTop: 4 }}>
                                            <span>May 6</span>
                                            <span>May 7</span>
                                            <span>May 8</span>
                                            <span>May 9</span>
                                            <span>May 10</span>
                                            <span>May 11</span>
                                            <span>May 12</span>
                                        </div>
                                    </div>

                                    {/* Donut Chart Card */}
                                    <div style={{ flex: 1, background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#0F172A" }}>Top Categories</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <svg width="50" height="50" viewBox="0 0 42 42">
                                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
                                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#2563EB" strokeWidth="6" strokeDasharray="45 55" strokeDashoffset="25" />
                                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#38BDF8" strokeWidth="6" strokeDasharray="30 70" strokeDashoffset="80" />
                                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#FF5722" strokeWidth="6" strokeDasharray="15 85" strokeDashoffset="50" />
                                                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#FBBF24" strokeWidth="6" strokeDasharray="10 90" strokeDashoffset="35" />
                                            </svg>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB" }}></span> Electronics 45%</div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38BDF8" }}></span> Clothing 30%</div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF5722" }}></span> Footwear 15%</div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FBBF24" }}></span> Others 10%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5 Feature Cards */}
                    <div style={{ display: "flex", gap: 12 }}>
                        {[
                            { title: "Inventory", sub: "Track stock in real-time", bg: "#EFF6FF", color: "#2563EB", icon: "📦" },
                            { title: "Customers", sub: "Build stronger relationships", bg: "#EEF2FF", color: "#4F46E5", icon: "👥" },
                            { title: "Billing", sub: "Fast & accurate invoicing", bg: "#ECFDF5", color: "#059669", icon: "📄" },
                            { title: "GST", sub: "Simplify GST compliance", bg: "#FFF7ED", color: "#EA580C", icon: "%" },
                            { title: "Analytics", sub: "Data-driven insights", bg: "#F3E8FF", color: "#9333EA", icon: "📊" },
                        ].map((item, index) => (
                            <div key={index} className="feature-card">
                                <div style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: item.bg,
                                    color: item.color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                    fontWeight: 800,
                                    marginBottom: 8
                                }}>
                                    {item.icon}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>
                                    {item.title}
                                </div>
                                <div style={{ fontSize: 10, color: "#64748B", lineHeight: 1.3 }}>
                                    {item.sub}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT SECTION */}
                <div className="right-section">
                    <div className="login-card">
                        {/* Centered Large Official Logo */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                            <RetailOSBrandLogo size={70} showText={false} layout="column" />
                        </div>

                        {/* Title & Subtitle */}
                        <div style={{ textAlign: "center", marginBottom: 28 }}>
                            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: "0 0 6px 0" }}>
                                Welcome Back!
                            </h2>
                            <p style={{ color: "#64748B", fontSize: 14, margin: 0, fontWeight: 500 }}>
                                Login to continue to <span style={{ color: "#061338", fontWeight: 700 }}>Retail</span> <span style={{ color: "#FF5500", fontWeight: 700 }}>OS</span>
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#334155" }}>
                                    Email Address
                                </label>
                                <div className="input-container">
                                    <BsEnvelope
                                        size={18}
                                        style={{
                                            position: "absolute",
                                            top: "50%",
                                            left: 16,
                                            transform: "translateY(-50%)",
                                            color: "#94A3B8",
                                            pointerEvents: "none"
                                        }}
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#334155" }}>
                                    Password
                                </label>
                                <div className="input-container">
                                    <BsLock
                                        size={18}
                                        style={{
                                            position: "absolute",
                                            top: "50%",
                                            left: 16,
                                            transform: "translateY(-50%)",
                                            color: "#94A3B8",
                                            pointerEvents: "none"
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
                                        className="input-field input-field-pwd"
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
                                            color: "#94A3B8",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 4
                                        }}
                                    >
                                        {showPassword ? <BsEyeSlash size={18} /> : <BsEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember me & Forgot password */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#334155", fontWeight: 500, userSelect: "none" }}>
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        style={{ width: 16, height: 16, accentColor: "#2563EB", cursor: "pointer", borderRadius: 4 }}
                                    />
                                    Remember Me
                                </label>
                                <button
                                    type="button"
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "#2563EB",
                                        cursor: "pointer",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        padding: 0
                                    }}
                                >
                                    Forgot Password?
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" className="btn-submit">
                                Login <BsArrowRight size={18} />
                            </button>
                        </form>

                        {/* Divider */}
                        <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: 12 }}>
                            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }}></div>
                            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>or continue with</span>
                            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }}></div>
                        </div>

                        {/* Social Login Buttons */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                            <button type="button" className="social-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                Google
                            </button>
                            <button type="button" className="social-btn">
                                <svg width="18" height="18" viewBox="0 0 23 23">
                                    <path fill="#f35325" d="M1 1h10v10H1z" />
                                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                                </svg>
                                Microsoft
                            </button>
                        </div>

                        {/* Footer Contact Admin */}
                        <div style={{ textAlign: "center", fontSize: 14, color: "#64748B" }}>
                            Don't have an account?{" "}
                            <span style={{ color: "#2563EB", fontWeight: 600, cursor: "pointer" }}>
                                Contact Admin
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

