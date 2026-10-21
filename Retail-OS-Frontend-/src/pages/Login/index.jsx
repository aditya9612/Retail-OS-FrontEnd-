import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    BsEnvelope,
    BsLock,
    BsEye,
    BsEyeSlash,
    BsArrowRight,
    BsArrowLeft,
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
    BsChatDots,
    BsCheckCircle,
} from "react-icons/bs";
import { auth } from "../../services/auth.js";
import { getCurrentUser } from "../../services/user.js";

// Reusable 6-digit OTP Box Input Component
const OtpInput = ({ value, onChange, disabled }) => {
    const inputRefs = useRef([]);

    const handleDigitChange = (index, e) => {
        const raw = e.target.value.replace(/\D/g, "");
        const next = [...value];

        if (!raw) {
            next[index] = "";
            onChange(next);
            return;
        }

        next[index] = raw.slice(-1);
        onChange(next);

        if (index < 5 && raw) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;

        const next = [...value];
        for (let i = 0; i < 6; i++) {
            next[i] = pasted[i] || "";
        }
        onChange(next);

        const focusIndex = Math.min(pasted.length, 5);
        inputRefs.current[focusIndex]?.focus();
    };

    return (
        <div className="otp-inputs-row" onPaste={handlePaste}>
            {Array.from({ length: 6 }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleDigitChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={disabled}
                    className="otp-digit-box"
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
};

const Login = () => {
    const navigate = useNavigate();

    // Main views: 'LOGIN' | 'FORGOT_PASSWORD' | 'FORGOT_PIN' | 'SETUP_PIN'
    const [viewMode, setViewMode] = useState("LOGIN");

    // Login tabs: 'email' | 'mobile-pin' | 'mobile-otp'
    const [activeTab, setActiveTab] = useState("email");

    // Feedback states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // --- Tab 1: Email & Password State ---
    const [emailForm, setEmailForm] = useState({
        email: "",
        password: "",
        rememberMe: true,
    });
    const [showPassword, setShowPassword] = useState(false);

    // --- Tab 2: Mobile + PIN State ---
    const [pinPhone, setPinPhone] = useState("");
    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);

    // --- Tab 3: Mobile + OTP State ---
    const [otpPhone, setOtpPhone] = useState("");
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(45);

    // --- Sub-flow: Forgot Password State ---
    const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtpDigits, setForgotOtpDigits] = useState(["", "", "", "", "", ""]);
    const [forgotResetToken, setForgotResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [forgotTimer, setForgotTimer] = useState(45);

    // --- Sub-flow: Forgot PIN State ---
    const [pinResetStep, setPinResetStep] = useState(1); // 1: Phone, 2: OTP, 3: Reset PIN
    const [resetPinPhone, setResetPinPhone] = useState("");
    const [resetPinOtpDigits, setResetPinOtpDigits] = useState(["", "", "", "", "", ""]);
    const [pinResetToken, setPinResetToken] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmNewPin, setConfirmNewPin] = useState("");
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [pinTimer, setPinTimer] = useState(45);

    // --- Sub-flow: Setup PIN State ---
    const [setupPinVal, setSetupPinVal] = useState("");
    const [setupPinConfirm, setSetupPinConfirm] = useState("");
    const [showSetupPin, setShowSetupPin] = useState(false);

    // Countdown timer for Mobile OTP
    useEffect(() => {
        let interval = null;
        if (otpSent && otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [otpSent, otpTimer]);

    // Countdown timer for Forgot Password OTP
    useEffect(() => {
        let interval = null;
        if (viewMode === "FORGOT_PASSWORD" && forgotStep === 2 && forgotTimer > 0) {
            interval = setInterval(() => {
                setForgotTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [viewMode, forgotStep, forgotTimer]);

    // Countdown timer for Forgot PIN OTP
    useEffect(() => {
        let interval = null;
        if (viewMode === "FORGOT_PIN" && pinResetStep === 2 && pinTimer > 0) {
            interval = setInterval(() => {
                setPinTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [viewMode, pinResetStep, pinTimer]);

    // Helper: Extract backend error message cleanly
    const extractErrorMessage = (err, fallback = "An unexpected error occurred.") => {
        if (!err) return fallback;
        const data = err.response?.data;
        if (!data) return err.message || fallback;

        if (typeof data.message === "string" && data.message.trim()) {
            return data.message;
        }

        if (typeof data.detail === "string" && data.detail.trim()) {
            return data.detail;
        }

        if (data.detail && typeof data.detail === "object") {
            if (typeof data.detail.message === "string") {
                return data.detail.message;
            }
            if (Array.isArray(data.detail) && data.detail.length > 0) {
                return data.detail.map((d) => d.msg || d.message).join(", ");
            }
        }

        if (Array.isArray(data.errors) && data.errors.length > 0) {
            return data.errors.map((e) => e.message || e.msg).join(", ");
        }

        return fallback;
    };

    // Helper: Post-login success flow
    const handleLoginSuccess = async (loginData, identifier) => {
        try {
            const user = await getCurrentUser();
            localStorage.setItem("user", JSON.stringify(user));
        } catch (e) {
            localStorage.setItem(
                "user",
                JSON.stringify({
                    identifier,
                    role: "User",
                    logged_at: new Date().toISOString(),
                })
            );
        }
        navigate("/dashboard");
    };

    // Reset error and success on tab/view switch
    const switchTab = (tab) => {
        setActiveTab(tab);
        setError("");
        setSuccess("");
    };

    const returnToLogin = () => {
        setViewMode("LOGIN");
        setError("");
        setSuccess("");
        setForgotStep(1);
        setPinResetStep(1);
        setOtpSent(false);
        setOtpDigits(["", "", "", "", "", ""]);
        setForgotOtpDigits(["", "", "", "", "", ""]);
        setResetPinOtpDigits(["", "", "", "", "", ""]);
    };

    // ==========================================
    // 1. Email & Password Login Handler
    // ==========================================
    const handleEmailLoginSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const email = emailForm.email.trim();
        const password = emailForm.password;

        if (!email) {
            setError("Email address is required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Password is required.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.login({ email, password });
            await handleLoginSuccess(data, email);
        } catch (err) {
            setError(extractErrorMessage(err, "Invalid email or password."));
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 2. Mobile + Security PIN Login Handler
    // ==========================================
    const handleMobilePinLoginSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const phone = pinPhone.trim().replace(/\D/g, "");
        const pinVal = pin.trim();

        if (!phone) {
            setError("Mobile number is required.");
            return;
        }

        if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
            setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
            return;
        }

        if (!pinVal) {
            setError("Security PIN is required.");
            return;
        }

        if (pinVal.length !== 4) {
            setError("Security PIN must be exactly 4 digits.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.loginMobilePin(phone, pinVal);
            await handleLoginSuccess(data, phone);
        } catch (err) {
            setError(extractErrorMessage(err, "Authentication failed. Incorrect mobile number or PIN."));
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 3. Mobile OTP Login Handlers
    // ==========================================
    const handleRequestMobileOtp = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const phone = otpPhone.trim().replace(/\D/g, "");

        if (!phone) {
            setError("Mobile number is required.");
            return;
        }

        if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
            setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.requestMobileOtp(phone);
            setOtpSent(true);
            setOtpTimer(45);
            setSuccess(data?.message || "OTP has been sent to your mobile number.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to send OTP. Please check the mobile number and try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyMobileOtp = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const phone = otpPhone.trim().replace(/\D/g, "");
        const otpCode = otpDigits.join("");

        if (!otpCode || otpCode.length !== 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.verifyMobileOtp(phone, otpCode);
            await handleLoginSuccess(data, phone);
        } catch (err) {
            setError(extractErrorMessage(err, "Authentication failed. Invalid or expired OTP."));
        } finally {
            setLoading(false);
        }
    };

    const handleResendMobileOtp = async () => {
        if (loading || otpTimer > 0) return;
        setError("");
        setSuccess("");
        const phone = otpPhone.trim().replace(/\D/g, "");

        setLoading(true);
        try {
            const data = await auth.requestMobileOtp(phone);
            setOtpTimer(45);
            setSuccess(data?.message || "A fresh OTP has been sent to your mobile number.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to resend OTP. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 4. Forgot Password Sub-flow Handlers
    // ==========================================
    const handleForgotPasswordRequestOtp = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const email = forgotEmail.trim();
        if (!email) {
            setError("Email address is required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.forgotPassword(email);
            setForgotStep(2);
            setForgotTimer(45);
            setSuccess(data?.message || "OTP has been sent to your registered email address.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to send OTP. Please verify your email and try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyForgotPasswordOtp = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const email = forgotEmail.trim();
        const otpCode = forgotOtpDigits.join("");

        if (!otpCode || otpCode.length !== 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.verifyOtp(email, otpCode);
            const token =
                data?.token ||
                data?.reset_token ||
                data?.data?.token ||
                data?.data?.reset_token ||
                otpCode;

            setForgotResetToken(token);
            setForgotStep(3);
            setSuccess("OTP verified successfully. Please enter your new password.");
        } catch (err) {
            setError(extractErrorMessage(err, "Invalid or expired OTP. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!newPassword || newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!forgotResetToken) {
            setError("Reset authorization is missing. Please verify OTP again.");
            setForgotStep(2);
            return;
        }

        setLoading(true);
        try {
            const data = await auth.resetPassword(forgotResetToken, newPassword);
            setSuccess(data?.message || "Password has been reset successfully! You can now log in.");
            setTimeout(() => {
                returnToLogin();
                setEmailForm((prev) => ({ ...prev, email: forgotEmail, password: "" }));
            }, 1800);
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to reset password. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleResendForgotPasswordOtp = async () => {
        if (loading || forgotTimer > 0) return;
        setError("");
        setSuccess("");
        const email = forgotEmail.trim();

        setLoading(true);
        try {
            const data = await auth.forgotPassword(email);
            setForgotTimer(45);
            setSuccess(data?.message || "A new OTP has been sent to your email address.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to resend OTP. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 5. Forgot Security PIN Sub-flow Handlers
    // ==========================================
    const handleForgotPinRequestOtp = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const phone = resetPinPhone.trim().replace(/\D/g, "");
        if (!phone || phone.length !== 10 || !/^[6-9]/.test(phone)) {
            setError("Please enter a valid 10-digit Indian mobile number.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.requestPinResetOtp(phone);
            setPinResetStep(2);
            setPinTimer(45);
            setSuccess(data?.message || "If registered, an OTP has been sent to your mobile number.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to request PIN reset OTP."));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyForgotPinOtp = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const phone = resetPinPhone.trim().replace(/\D/g, "");
        const otpCode = resetPinOtpDigits.join("");

        if (!otpCode || otpCode.length !== 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.verifyPinResetOtp(phone, otpCode);
            const token =
                data?.token ||
                data?.reset_token ||
                data?.data?.token ||
                data?.data?.reset_token ||
                otpCode;

            setPinResetToken(token);
            setPinResetStep(3);
            setSuccess("OTP verified successfully. Create your new 4-digit security PIN.");
        } catch (err) {
            setError(extractErrorMessage(err, "Authentication failed. Invalid or expired OTP."));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPinSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const pinVal = newPin.trim().replace(/\D/g, "");
        const confirmVal = confirmNewPin.trim().replace(/\D/g, "");

        if (!pinVal || pinVal.length !== 4) {
            setError("New PIN must be exactly 4 digits.");
            return;
        }

        if (pinVal !== confirmVal) {
            setError("PINs do not match.");
            return;
        }

        if (!pinResetToken) {
            setError("Reset authorization is missing. Please verify OTP again.");
            setPinResetStep(2);
            return;
        }

        setLoading(true);
        try {
            const data = await auth.resetPin(pinResetToken, pinVal);
            setSuccess(data?.message || "Security PIN reset successfully! You can now log in.");
            setTimeout(() => {
                returnToLogin();
                setActiveTab("mobile-pin");
                setPinPhone(resetPinPhone);
                setPin("");
            }, 1800);
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to reset security PIN. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    const handleResendForgotPinOtp = async () => {
        if (loading || pinTimer > 0) return;
        setError("");
        setSuccess("");
        const phone = resetPinPhone.trim().replace(/\D/g, "");

        setLoading(true);
        try {
            const data = await auth.requestPinResetOtp(phone);
            setPinTimer(45);
            setSuccess(data?.message || "A new OTP has been sent to your mobile number.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to resend PIN reset OTP."));
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 6. Setup Initial PIN Sub-flow Handler
    // ==========================================
    const handleSetupPinSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const pinVal = setupPinVal.trim().replace(/\D/g, "");
        const confirmVal = setupPinConfirm.trim().replace(/\D/g, "");

        if (!pinVal || pinVal.length !== 4) {
            setError("PIN must be exactly 4 digits.");
            return;
        }

        if (pinVal !== confirmVal) {
            setError("PINs do not match.");
            return;
        }

        setLoading(true);
        try {
            const data = await auth.setupPin(pinVal);
            setSuccess(data?.message || "Security PIN setup completed successfully!");
            setTimeout(() => {
                returnToLogin();
                setActiveTab("mobile-pin");
            }, 1800);
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to setup PIN. Please ensure you are logged in."));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.open("https://accounts.google.com/", "_blank");
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


                /* Background Shapes */
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

                /* LEFT SECTION */
                .left-section-wrapper {
                    flex: 0 0 57%;
                    width: 57%;
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

                /* 3D Store Stage */
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
                    width: 90%;
                    height: 80%;
                    background: radial-gradient(ellipse at center, rgba(191, 219, 254, 0.45) 0%, rgba(224, 231, 255, 0.2) 50%, rgba(255, 255, 255, 0) 75%);
                    border-radius: 50%;
                    filter: blur(28px);
                    pointer-events: none;
                    z-index: 0;
                }

                .connectors-svg-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }

                .hero-store-img {
                    position: relative;
                    z-index: 2;
                    max-width: 90%;
                    max-height: 94%;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    filter: drop-shadow(0 20px 24px rgba(15, 23, 42, 0.16));
                    transition: transform 0.3s ease;
                }

                .hero-store-img:hover {
                    transform: scale(1.015);
                }

                /* Floating Feature Cards */
                .floating-feature-card {
                    position: absolute;
                    z-index: 3;
                    background: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                    padding: clamp(4px, 0.8vh, 7px) clamp(8px, 0.9vw, 13px);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06);
                    backdrop-filter: blur(8px);
                    white-space: nowrap;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .floating-feature-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.14);
                }

                .floating-icon-wrapper {
                    width: clamp(22px, 2.6vh, 28px);
                    height: clamp(22px, 2.6vh, 28px);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: clamp(11px, 1.3vh, 14px);
                    flex-shrink: 0;
                }

                .floating-card-title {
                    font-size: clamp(10px, 1.25vh, 12px);
                    font-weight: 700;
                    color: #0F172A;
                    line-height: 1.15;
                }

                .floating-card-desc {
                    font-size: clamp(8px, 1vh, 9.5px);
                    color: #64748B;
                    line-height: 1.1;
                }

                .pos-gst { top: 38%; left: 0%; }
                .pos-inventory { top: 6%; left: 16%; }
                .pos-customers { top: 5%; left: 45%; }
                .pos-billing { top: 7%; right: 14%; }
                .pos-multistore { top: 40%; right: 0%; }
                .pos-analytics { bottom: 6%; left: 10%; }
                .pos-secure { bottom: 6%; right: 12%; }

                /* Bottom Feature Bar */
                .bottom-feature-bar-container {
                    width: 100%;
                    background: #FFFFFF;
                    border: 1px solid #E2E8F0;
                    border-radius: 14px;
                    padding: clamp(6px, 1vh, 10px) clamp(8px, 1.2vw, 16px);
                    box-shadow: 0 4px 14px -3px rgba(15, 23, 42, 0.05);
                }

                .bottom-feature-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                }

                .feature-item-pill {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 2px;
                    padding: 2px 4px;
                }

                .feature-pill-icon {
                    width: clamp(22px, 2.8vh, 30px);
                    height: clamp(22px, 2.8vh, 30px);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: clamp(11px, 1.4vh, 14px);
                    margin-bottom: 2px;
                }

                .feature-pill-title {
                    font-size: clamp(9.5px, 1.15vh, 11px);
                    font-weight: 700;
                    color: #0F172A;
                    line-height: 1.1;
                }

                .feature-pill-desc {
                    font-size: clamp(8px, 0.95vh, 9px);
                    color: #64748B;
                    line-height: 1.1;
                }

                .left-footer-copyright {
                    font-size: clamp(10px, 1.1vh, 11.5px);
                    color: #94A3B8;
                    margin-top: 2px;
                    font-weight: 500;
                }

                /* RIGHT LOGIN CARD */
                .right-login-section {
                    flex: 0 0 35%;
                    width: 35%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .login-card {
                    width: 100%;
                    max-width: 480px;
                    background: #FFFFFF;
                    border-radius: 28px;
                    padding: clamp(24px, 3.4vh, 40px) clamp(22px, 2.2vw, 36px);
                    box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.09), 0 0 1px rgba(15, 23, 42, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.95);
                    position: relative;
                }

                .card-logo-box {
                    display: flex;
                    justify-content: center;
                    margin-bottom: clamp(8px, 1.3vh, 14px);
                }

                .card-logo-img {
                    height: clamp(48px, 5.8vh, 60px);
                    width: auto;
                    object-fit: contain;
                    background: transparent !important;
                }

                .login-card-header {
                    text-align: center;
                    margin-bottom: clamp(12px, 1.8vh, 18px);
                }

                .welcome-headline {
                    font-size: clamp(24px, 3.2vh, 30px);
                    font-weight: 800;
                    color: #0F172A;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.025em;
                }

                .welcome-subtext {
                    color: #64748B;
                    font-size: clamp(12px, 1.4vh, 13.5px);
                    margin: 0;
                    font-weight: 500;
                }

                /* 3 Authentication Tabs */
                .auth-tabs-container {
                    display: flex;
                    align-items: center;
                    background: #F8FAFC;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                    padding: 4px;
                    margin-bottom: clamp(14px, 2vh, 20px);
                    gap: 4px;
                }

                .auth-tab-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 8px 6px;
                    font-size: clamp(11px, 1.25vh, 12.5px);
                    font-weight: 600;
                    border-radius: 8px;
                    border: 1.5px solid transparent;
                    background: transparent;
                    color: #64748B;
                    cursor: pointer;
                    transition: all 0.18s ease;
                    white-space: nowrap;
                }

                .auth-tab-btn:hover {
                    color: #0F172A;
                }

                .auth-tab-btn.active {
                    background: #FFFFFF;
                    color: #2563EB;
                    border-color: #2563EB;
                    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
                }

                /* Alerts */
                .alert-message-box {
                    padding: 9px 13px;
                    border-radius: 10px;
                    font-size: 12.5px;
                    font-weight: 600;
                    line-height: 1.4;
                    margin-bottom: clamp(10px, 1.4vh, 15px);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .alert-error {
                    background: #FEF2F2;
                    border: 1px solid #FECACA;
                    color: #DC2626;
                }
                .alert-success {
                    background: #F0FDF4;
                    border: 1px solid #BBF7D0;
                    color: #16A34A;
                }

                /* Inputs & Forms */
                .form-field-group {
                    margin-bottom: clamp(10px, 1.5vh, 15px);
                }

                .form-field-label {
                    display: block;
                    margin-bottom: 5px;
                    font-size: clamp(11.5px, 1.25vh, 12.5px);
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
                    height: clamp(39px, 4.4vh, 45px);
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

                /* Phone Input with +91 Badge */
                .phone-input-wrapper {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    height: clamp(39px, 4.4vh, 45px);
                    border-radius: 10px;
                    border: 1.5px solid #E2E8F0;
                    background: #F8FAFC;
                    overflow: hidden;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .phone-input-wrapper:focus-within {
                    background: #FFFFFF;
                    border-color: #2563EB;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
                }

                .phone-prefix-badge {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0 10px 0 12px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #334155;
                    border-right: 1px solid #E2E8F0;
                    background: #F1F5F9;
                    height: 100%;
                    user-select: none;
                }

                .phone-control-input {
                    flex: 1;
                    height: 100%;
                    border: none;
                    outline: none;
                    background: transparent;
                    padding: 0 12px;
                    font-size: 13.5px;
                    color: #0F172A;
                }

                /* OTP 6-Digit Boxes */
                .otp-inputs-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 7px;
                    margin: 12px 0 14px 0;
                }

                .otp-digit-box {
                    width: clamp(38px, 4.2vw, 46px);
                    height: clamp(42px, 5vh, 48px);
                    text-align: center;
                    font-size: 19px;
                    font-weight: 800;
                    color: #0F172A;
                    background: #F8FAFC;
                    border: 1.5px solid #CBD5E1;
                    border-radius: 10px;
                    outline: none;
                    transition: all 0.18s ease;
                }

                .otp-digit-box:focus {
                    background: #FFFFFF;
                    border-color: #2563EB;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
                }

                .otp-resend-row {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 14px;
                    font-size: 12.5px;
                }

                .otp-timer-text {
                    color: #64748B;
                    font-weight: 600;
                }

                .otp-resend-btn {
                    border: none;
                    background: transparent;
                    color: #2563EB;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 0;
                    font-size: 12.5px;
                }

                .otp-resend-btn:hover {
                    text-decoration: underline;
                }

                /* Sub-flow header with back button */
                .sub-flow-header-box {
                    position: relative;
                    text-align: center;
                    margin-bottom: clamp(14px, 2vh, 20px);
                }

                .card-back-btn {
                    position: absolute;
                    top: -2px;
                    left: 0;
                    border: none;
                    background: #F1F5F9;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #475569;
                    transition: all 0.15s;
                }

                .card-back-btn:hover {
                    background: #E2E8F0;
                    color: #0F172A;
                }

                .sub-flow-title {
                    font-size: clamp(20px, 2.7vh, 24px);
                    font-weight: 800;
                    color: #0F172A;
                    margin: 0 0 4px 0;
                    letter-spacing: -0.02em;
                }

                .sub-flow-subtitle {
                    font-size: 12.5px;
                    color: #64748B;
                    margin: 0;
                    line-height: 1.45;
                    font-weight: 500;
                }

                /* Form rows & Buttons */
                .form-sub-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: clamp(10px, 1.5vh, 16px);
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

                .text-link-action {
                    border: none;
                    background: transparent;
                    color: #2563EB;
                    cursor: pointer;
                    font-size: 12.5px;
                    font-weight: 600;
                    padding: 0;
                }

                .text-link-action:hover {
                    text-decoration: underline;
                }

                .btn-submit-primary {
                    width: 100%;
                    height: clamp(39px, 4.4vh, 45px);
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
                    transition: background 0.2s, transform 0.15s, opacity 0.2s;
                    box-shadow: 0 5px 15px -3px rgba(37, 99, 235, 0.32);
                }

                .btn-submit-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%);
                }

                .btn-submit-primary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .or-divider-row {
                    display: flex;
                    align-items: center;
                    margin: clamp(9px, 1.3vh, 14px) 0;
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
                    margin-bottom: clamp(9px, 1.3vh, 14px);
                }

                .btn-social-auth {
                    width: 100%;
                    height: clamp(38px, 4.3vh, 44px);
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
                    margin-top: clamp(6px, 1vh, 10px);
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
                        padding: clamp(12px, 3vh, 24px) clamp(12px, 3vw, 20px);
                        height: 100vh;
                        min-height: 100dvh;
                        max-height: none;
                        overflow-y: auto;
                        overflow-x: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .split-screen-layout {
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        max-height: none;
                        width: 100%;
                        gap: 0;
                    }
                    .left-section-wrapper {
                        display: none !important;
                    }
                    .right-login-section {
                        width: 100%;
                        flex: 1 1 100%;
                        height: auto;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .login-card {
                        width: 100%;
                        max-width: 440px;
                        padding: 24px 20px;
                        border-radius: 20px;
                        margin: 0 auto;
                    }
                    .connectors-svg-overlay {
                        display: none;
                    }
                }

                @media (max-width: 480px) {
                    .login-page-container {
                        padding: 12px 10px;
                    }
                    .login-card {
                        padding: 20px 14px;
                        border-radius: 18px;
                    }
                    .auth-tab-btn {
                        font-size: 11px;
                        padding: 6px 4px;
                        gap: 4px;
                    }
                }
            `}</style>


            {/* Background Decorative Shapes */}
            <div className="bg-circle-left"></div>
            <div className="bg-circle-right"></div>
            <div className="bg-bottom-right-wave"></div>
            <div className="bg-dots-pattern"></div>

            <div className="split-screen-layout">
                {/* LEFT PROMOTIONAL SECTION */}
                <div className="left-section-wrapper">
                    {/* Brand Header Logo */}
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

                    {/* 3D Store Stage with 7 Floating Feature Cards */}
                    <div className="hero-stage-container">
                        <div className="stage-bg-glow"></div>

                        <svg className="connectors-svg-overlay" viewBox="0 0 800 500" preserveAspectRatio="none">
                            <defs>
                                <marker id="soft-blue-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#60A5FA" opacity="0.8" />
                                </marker>
                            </defs>
                            <path d="M 230 40 L 230 110 L 385 110" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            <path d="M 430 30 L 430 90 L 415 90" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            <path d="M 640 45 L 640 130 L 515 130" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            <path d="M 115 185 L 210 185" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            <path d="M 660 205 L 575 205" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            <path d="M 140 430 L 275 430 L 275 365" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                            <path d="M 600 440 L 530 440 L 530 385" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.75" markerEnd="url(#soft-blue-arrow)" />
                        </svg>

                        <img
                            src="/retail-store-3d.png"
                            alt="Retail Store 3D Illustration"
                            className="hero-store-img"
                        />

                        {/* Floating Cards */}
                        <div className="floating-feature-card pos-gst">
                            <div className="floating-icon-wrapper" style={{ background: "#FFEDD5", color: "#EA580C" }}>
                                <BsPercent />
                            </div>
                            <div>
                                <div className="floating-card-title">GST Compliance</div>
                                <div className="floating-card-desc">Simplify GST compliance</div>
                            </div>
                        </div>

                        <div className="floating-feature-card pos-inventory">
                            <div className="floating-icon-wrapper" style={{ background: "#F3E8FF", color: "#9333EA" }}>
                                <BsBoxSeam />
                            </div>
                            <div>
                                <div className="floating-card-title">Inventory Management</div>
                                <div className="floating-card-desc">Track stock in real-time</div>
                            </div>
                        </div>

                        <div className="floating-feature-card pos-customers">
                            <div className="floating-icon-wrapper" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                                <BsPeople />
                            </div>
                            <div>
                                <div className="floating-card-title">Customers Management</div>
                                <div className="floating-card-desc">Build stronger relationships</div>
                            </div>
                        </div>

                        <div className="floating-feature-card pos-billing">
                            <div className="floating-icon-wrapper" style={{ background: "#DBEAFE", color: "#2563EB" }}>
                                <BsReceipt />
                            </div>
                            <div>
                                <div className="floating-card-title">Billing & Invoicing</div>
                                <div className="floating-card-desc">Fast & accurate invoicing</div>
                            </div>
                        </div>

                        <div className="floating-feature-card pos-multistore">
                            <div className="floating-icon-wrapper" style={{ background: "#FEF3C7", color: "#D97706" }}>
                                <BsShop />
                            </div>
                            <div>
                                <div className="floating-card-title">Multi-Store Management</div>
                                <div className="floating-card-desc">Manage all stores in one place</div>
                            </div>
                        </div>

                        <div className="floating-feature-card pos-analytics">
                            <div className="floating-icon-wrapper" style={{ background: "#E0E7FF", color: "#4F46E5" }}>
                                <BsGraphUpArrow />
                            </div>
                            <div>
                                <div className="floating-card-title">Analytics & Reports</div>
                                <div className="floating-card-desc">Data-driven insights</div>
                            </div>
                        </div>

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

                    {/* Bottom Feature Bar */}
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
                                <div className="feature-pill-desc">Manage on the go</div>
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

                    <div className="left-footer-copyright">
                        © 2026 Retail OS. All rights reserved.
                    </div>
                </div>

                {/* RIGHT SECTION: DYNAMIC AUTHENTICATION CARD */}
                <div className="right-login-section">
                    <div className="login-card">
                        {/* ==================================================== */}
                        {/* VIEW: MAIN LOGIN WITH 3 TABS                         */}
                        {/* ==================================================== */}
                        {viewMode === "LOGIN" && (
                            <>
                                {/* Centered RetailOS Logo */}
                                <div className="card-logo-box">
                                    <img
                                        src="/retailos-logo-transparent.png"
                                        alt="Retail OS Logo"
                                        className="card-logo-img"
                                    />
                                </div>

                                {/* Welcome Header */}
                                <div className="login-card-header">
                                    <h2 className="welcome-headline">Welcome Back!</h2>
                                    <p className="welcome-subtext">
                                        Login to continue to{" "}
                                        <span style={{ color: "#0F172A", fontWeight: 700 }}>Retail</span>
                                        <span style={{ color: "#FF5500", fontWeight: 700 }}>OS</span>
                                    </p>
                                </div>

                                {/* 3 Authentication Tabs */}
                                <div className="auth-tabs-container">
                                    <button
                                        type="button"
                                        className={`auth-tab-btn ${activeTab === "email" ? "active" : ""}`}
                                        onClick={() => switchTab("email")}
                                    >
                                        <BsEnvelope size={14} /> Email & Password
                                    </button>
                                    <button
                                        type="button"
                                        className={`auth-tab-btn ${activeTab === "mobile-pin" ? "active" : ""}`}
                                        onClick={() => switchTab("mobile-pin")}
                                    >
                                        <BsPhone size={14} /> Mobile + PIN
                                    </button>
                                    <button
                                        type="button"
                                        className={`auth-tab-btn ${activeTab === "mobile-otp" ? "active" : ""}`}
                                        onClick={() => switchTab("mobile-otp")}
                                    >
                                        <BsChatDots size={14} /> Mobile + OTP
                                    </button>
                                </div>

                                {/* Error / Success Banners */}
                                {error && (
                                    <div className="alert-message-box alert-error">
                                        <span>{error}</span>
                                    </div>
                                )}
                                {success && (
                                    <div className="alert-message-box alert-success">
                                        <BsCheckCircle size={15} />
                                        <span>{success}</span>
                                    </div>
                                )}

                                {/* TAB 1: Email & Password Form */}
                                {activeTab === "email" && (
                                    <form onSubmit={handleEmailLoginSubmit}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">Email Address</label>
                                            <div className="input-field-relative">
                                                <BsEnvelope size={16} className="input-prefix-icon" />
                                                <input
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    value={emailForm.email}
                                                    onChange={(e) => {
                                                        setEmailForm((prev) => ({ ...prev, email: e.target.value }));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="form-control-input"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-field-group">
                                            <label className="form-field-label">Password</label>
                                            <div className="input-field-relative">
                                                <BsLock size={16} className="input-prefix-icon" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter your password"
                                                    value={emailForm.password}
                                                    onChange={(e) => {
                                                        setEmailForm((prev) => ({ ...prev, password: e.target.value }));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="form-control-input form-control-input-pwd"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                    className="password-toggle-button"
                                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-sub-row">
                                            <label className="checkbox-remember-label">
                                                <input
                                                    type="checkbox"
                                                    checked={emailForm.rememberMe}
                                                    onChange={(e) =>
                                                        setEmailForm((prev) => ({ ...prev, rememberMe: e.target.checked }))
                                                    }
                                                    style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer" }}
                                                />
                                                Remember Me
                                            </label>
                                            <button
                                                type="button"
                                                className="text-link-action"
                                                onClick={() => {
                                                    setViewMode("FORGOT_PASSWORD");
                                                    setForgotEmail(emailForm.email || "");
                                                    setError("");
                                                    setSuccess("");
                                                    setForgotStep(1);
                                                }}
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>

                                        <button type="submit" disabled={loading} className="btn-submit-primary">
                                            {loading ? "Logging in..." : <>Login <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* TAB 2: Mobile + PIN Form */}
                                {activeTab === "mobile-pin" && (
                                    <form onSubmit={handleMobilePinLoginSubmit}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">Mobile Number</label>
                                            <div className="phone-input-wrapper">
                                                <div className="phone-prefix-badge">
                                                    <BsPhone size={14} style={{ color: "#2563EB" }} /> +91
                                                </div>
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    placeholder="Enter 10-digit mobile number"
                                                    value={pinPhone}
                                                    onChange={(e) => {
                                                        setPinPhone(e.target.value.replace(/\D/g, ""));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="phone-control-input"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-field-group">
                                            <label className="form-field-label">Security PIN</label>
                                            <div className="input-field-relative">
                                                <BsLock size={16} className="input-prefix-icon" />
                                                <input
                                                    type={showPin ? "text" : "password"}
                                                    maxLength={4}
                                                    placeholder="Enter 4-digit PIN"
                                                    value={pin}
                                                    onChange={(e) => {
                                                        setPin(e.target.value.replace(/\D/g, ""));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="form-control-input form-control-input-pwd"
                                                    style={{ letterSpacing: showPin ? "2px" : "6px", fontWeight: 700 }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPin((prev) => !prev)}
                                                    className="password-toggle-button"
                                                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                                                >
                                                    {showPin ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-sub-row" style={{ justifyContent: "flex-end" }}>
                                            <button
                                                type="button"
                                                className="text-link-action"
                                                onClick={() => {
                                                    setViewMode("FORGOT_PIN");
                                                    setResetPinPhone(pinPhone || "");
                                                    setError("");
                                                    setSuccess("");
                                                    setPinResetStep(1);
                                                }}
                                            >
                                                Forgot PIN?
                                            </button>
                                        </div>

                                        <button type="submit" disabled={loading} className="btn-submit-primary">
                                            {loading ? "Logging in..." : <>Login <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* TAB 3: Mobile + OTP Form */}
                                {activeTab === "mobile-otp" && !otpSent && (
                                    <form onSubmit={handleRequestMobileOtp}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">Mobile Number</label>
                                            <div className="phone-input-wrapper">
                                                <div className="phone-prefix-badge">
                                                    <BsPhone size={14} style={{ color: "#2563EB" }} /> +91
                                                </div>
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    placeholder="Enter 10-digit mobile number"
                                                    value={otpPhone}
                                                    onChange={(e) => {
                                                        setOtpPhone(e.target.value.replace(/\D/g, ""));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="phone-control-input"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || otpPhone.length !== 10}
                                            className="btn-submit-primary"
                                            style={{ marginTop: 12 }}
                                        >
                                            {loading ? "Sending OTP..." : <>Send OTP <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {activeTab === "mobile-otp" && otpSent && (
                                    <form onSubmit={handleVerifyMobileOtp}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
                                                OTP sent to +91 {otpPhone}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOtpSent(false);
                                                    setOtpDigits(["", "", "", "", "", ""]);
                                                    setError("");
                                                    setSuccess("");
                                                }}
                                                className="text-link-action"
                                                style={{ fontSize: 12 }}
                                            >
                                                Change
                                            </button>
                                        </div>

                                        <label className="form-field-label" style={{ textAlign: "center", marginTop: 4 }}>
                                            Enter 6-Digit OTP
                                        </label>

                                        <OtpInput
                                            value={otpDigits}
                                            onChange={(next) => {
                                                setOtpDigits(next);
                                                if (error) setError("");
                                            }}
                                            disabled={loading}
                                        />

                                        <div className="otp-resend-row">
                                            {otpTimer > 0 ? (
                                                <span className="otp-timer-text">
                                                    Resend OTP in 00:{otpTimer < 10 ? `0${otpTimer}` : otpTimer}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResendMobileOtp}
                                                    disabled={loading}
                                                    className="otp-resend-btn"
                                                >
                                                    Resend OTP
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || otpDigits.join("").length !== 6}
                                            className="btn-submit-primary"
                                        >
                                            {loading ? "Verifying & Logging In..." : <>Verify & Login <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* Social Login Divider */}
                                <div className="or-divider-row">
                                    <div className="or-divider-line"></div>
                                    <span className="or-divider-label">or continue with</span>
                                    <div className="or-divider-line"></div>
                                </div>

                                {/* Continue with Google */}
                                <div className="social-auth-row">
                                    <button type="button" onClick={handleGoogleLogin} className="btn-social-auth">
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                        </svg>
                                        Continue with Google
                                    </button>
                                </div>

                                {/* Register Link */}
                                <div className="contact-admin-box">
                                    Don't have an account?{" "}
                                    <span className="contact-admin-action" onClick={() => navigate("/register")}>
                                        Register here
                                    </span>
                                </div>

                                {/* Shekru Credit */}
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
                            </>
                        )}

                        {/* ==================================================== */}
                        {/* VIEW: FORGOT PASSWORD FLOW (3 STEPS)                 */}
                        {/* ==================================================== */}
                        {viewMode === "FORGOT_PASSWORD" && (
                            <div>
                                <div className="sub-flow-header-box">
                                    <button
                                        type="button"
                                        className="card-back-btn"
                                        onClick={() => {
                                            if (forgotStep > 1) {
                                                setForgotStep((prev) => prev - 1);
                                                setError("");
                                                setSuccess("");
                                            } else {
                                                returnToLogin();
                                            }
                                        }}
                                        aria-label="Go back"
                                    >
                                        <BsArrowLeft size={16} />
                                    </button>

                                    <div className="card-logo-box" style={{ marginBottom: 6 }}>
                                        <img
                                            src="/retailos-logo-transparent.png"
                                            alt="Retail OS Logo"
                                            className="card-logo-img"
                                        />
                                    </div>

                                    <h3 className="sub-flow-title">
                                        {forgotStep === 1 && "Forgot Password"}
                                        {forgotStep === 2 && "Verify OTP"}
                                        {forgotStep === 3 && "Reset Password"}
                                    </h3>
                                    <p className="sub-flow-subtitle">
                                        {forgotStep === 1 && "Enter your registered email to receive an OTP for password reset."}
                                        {forgotStep === 2 && `Enter the 6-digit OTP sent to ${forgotEmail}.`}
                                        {forgotStep === 3 && "Set your new password."}
                                    </p>
                                </div>

                                {error && (
                                    <div className="alert-message-box alert-error">
                                        <span>{error}</span>
                                    </div>
                                )}
                                {success && (
                                    <div className="alert-message-box alert-success">
                                        <BsCheckCircle size={15} />
                                        <span>{success}</span>
                                    </div>
                                )}

                                {/* Step 1: Request Email OTP */}
                                {forgotStep === 1 && (
                                    <form onSubmit={handleForgotPasswordRequestOtp}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">Email Address</label>
                                            <div className="input-field-relative">
                                                <BsEnvelope size={16} className="input-prefix-icon" />
                                                <input
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    value={forgotEmail}
                                                    onChange={(e) => {
                                                        setForgotEmail(e.target.value);
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="form-control-input"
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" disabled={loading} className="btn-submit-primary" style={{ marginTop: 14 }}>
                                            {loading ? "Sending OTP..." : <>Send OTP <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* Step 2: Verify OTP */}
                                {forgotStep === 2 && (
                                    <form onSubmit={handleVerifyForgotPasswordOtp}>
                                        <label className="form-field-label" style={{ textAlign: "center" }}>
                                            6-Digit OTP Code
                                        </label>

                                        <OtpInput
                                            value={forgotOtpDigits}
                                            onChange={(next) => {
                                                setForgotOtpDigits(next);
                                                if (error) setError("");
                                            }}
                                            disabled={loading}
                                        />

                                        <div className="otp-resend-row">
                                            {forgotTimer > 0 ? (
                                                <span className="otp-timer-text">
                                                    Resend OTP in 00:{forgotTimer < 10 ? `0${forgotTimer}` : forgotTimer}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResendForgotPasswordOtp}
                                                    disabled={loading}
                                                    className="otp-resend-btn"
                                                >
                                                    Resend OTP
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || forgotOtpDigits.join("").length !== 6}
                                            className="btn-submit-primary"
                                        >
                                            {loading ? "Verifying OTP..." : <>Verify OTP <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* Step 3: Reset Password */}
                                {forgotStep === 3 && (
                                    <form onSubmit={handleResetPasswordSubmit}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">New Password</label>
                                            <div className="input-field-relative">
                                                <BsLock size={16} className="input-prefix-icon" />
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    placeholder="Enter new password (min 6 chars)"
                                                    value={newPassword}
                                                    onChange={(e) => {
                                                        setNewPassword(e.target.value);
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    minLength={6}
                                                    className="form-control-input form-control-input-pwd"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                                    className="password-toggle-button"
                                                >
                                                    {showNewPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-field-group">
                                            <label className="form-field-label">Confirm Password</label>
                                            <div className="input-field-relative">
                                                <BsLock size={16} className="input-prefix-icon" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm new password"
                                                    value={confirmNewPassword}
                                                    onChange={(e) => {
                                                        setConfirmNewPassword(e.target.value);
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    minLength={6}
                                                    className="form-control-input form-control-input-pwd"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                    className="password-toggle-button"
                                                >
                                                    {showConfirmPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={loading} className="btn-submit-primary" style={{ marginTop: 14 }}>
                                            {loading ? "Resetting Password..." : <>Reset Password <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                <div style={{ textAlign: "center", marginTop: 16 }}>
                                    <button type="button" onClick={returnToLogin} className="text-link-action">
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* VIEW: FORGOT SECURITY PIN FLOW (3 STEPS)             */}
                        {/* ==================================================== */}
                        {viewMode === "FORGOT_PIN" && (
                            <div>
                                <div className="sub-flow-header-box">
                                    <button
                                        type="button"
                                        className="card-back-btn"
                                        onClick={() => {
                                            if (pinResetStep > 1) {
                                                setPinResetStep((prev) => prev - 1);
                                                setError("");
                                                setSuccess("");
                                            } else {
                                                returnToLogin();
                                            }
                                        }}
                                        aria-label="Go back"
                                    >
                                        <BsArrowLeft size={16} />
                                    </button>

                                    <div className="card-logo-box" style={{ marginBottom: 6 }}>
                                        <img
                                            src="/retailos-logo-transparent.png"
                                            alt="Retail OS Logo"
                                            className="card-logo-img"
                                        />
                                    </div>

                                    <h3 className="sub-flow-title">
                                        {pinResetStep === 1 && "Forgot PIN"}
                                        {pinResetStep === 2 && "Verify OTP"}
                                        {pinResetStep === 3 && "Reset Security PIN"}
                                    </h3>
                                    <p className="sub-flow-subtitle">
                                        {pinResetStep === 1 && "Enter your mobile number to receive OTP for PIN reset."}
                                        {pinResetStep === 2 && `Enter the 6-digit OTP sent to +91 ${resetPinPhone}.`}
                                        {pinResetStep === 3 && "Create a new 4-digit security PIN."}
                                    </p>
                                </div>

                                {error && (
                                    <div className="alert-message-box alert-error">
                                        <span>{error}</span>
                                    </div>
                                )}
                                {success && (
                                    <div className="alert-message-box alert-success">
                                        <BsCheckCircle size={15} />
                                        <span>{success}</span>
                                    </div>
                                )}

                                {/* Step 1: Request Phone PIN Reset OTP */}
                                {pinResetStep === 1 && (
                                    <form onSubmit={handleForgotPinRequestOtp}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">Mobile Number</label>
                                            <div className="phone-input-wrapper">
                                                <div className="phone-prefix-badge">
                                                    <BsPhone size={14} style={{ color: "#2563EB" }} /> +91
                                                </div>
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    placeholder="Enter 10-digit number"
                                                    value={resetPinPhone}
                                                    onChange={(e) => {
                                                        setResetPinPhone(e.target.value.replace(/\D/g, ""));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="phone-control-input"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || resetPinPhone.length !== 10}
                                            className="btn-submit-primary"
                                            style={{ marginTop: 14 }}
                                        >
                                            {loading ? "Sending OTP..." : <>Send OTP <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* Step 2: Verify PIN Reset OTP */}
                                {pinResetStep === 2 && (
                                    <form onSubmit={handleVerifyForgotPinOtp}>
                                        <label className="form-field-label" style={{ textAlign: "center" }}>
                                            6-Digit OTP Code
                                        </label>

                                        <OtpInput
                                            value={resetPinOtpDigits}
                                            onChange={(next) => {
                                                setResetPinOtpDigits(next);
                                                if (error) setError("");
                                            }}
                                            disabled={loading}
                                        />

                                        <div className="otp-resend-row">
                                            {pinTimer > 0 ? (
                                                <span className="otp-timer-text">
                                                    Resend OTP in 00:{pinTimer < 10 ? `0${pinTimer}` : pinTimer}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResendForgotPinOtp}
                                                    disabled={loading}
                                                    className="otp-resend-btn"
                                                >
                                                    Resend OTP
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || resetPinOtpDigits.join("").length !== 6}
                                            className="btn-submit-primary"
                                        >
                                            {loading ? "Verifying OTP..." : <>Verify OTP <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                {/* Step 3: Set New Security PIN */}
                                {pinResetStep === 3 && (
                                    <form onSubmit={handleResetPinSubmit}>
                                        <div className="form-field-group">
                                            <label className="form-field-label">New PIN</label>
                                            <div className="input-field-relative">
                                                <BsLock size={16} className="input-prefix-icon" />
                                                <input
                                                    type={showNewPin ? "text" : "password"}
                                                    maxLength={4}
                                                    placeholder="Enter 4-digit PIN"
                                                    value={newPin}
                                                    onChange={(e) => {
                                                        setNewPin(e.target.value.replace(/\D/g, ""));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="form-control-input form-control-input-pwd"
                                                    style={{ letterSpacing: showNewPin ? "2px" : "6px", fontWeight: 700 }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPin((prev) => !prev)}
                                                    className="password-toggle-button"
                                                >
                                                    {showNewPin ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-field-group">
                                            <label className="form-field-label">Confirm PIN</label>
                                            <div className="input-field-relative">
                                                <BsLock size={16} className="input-prefix-icon" />
                                                <input
                                                    type={showConfirmPin ? "text" : "password"}
                                                    maxLength={4}
                                                    placeholder="Confirm 4-digit PIN"
                                                    value={confirmNewPin}
                                                    onChange={(e) => {
                                                        setConfirmNewPin(e.target.value.replace(/\D/g, ""));
                                                        if (error) setError("");
                                                    }}
                                                    disabled={loading}
                                                    required
                                                    className="form-control-input form-control-input-pwd"
                                                    style={{ letterSpacing: showConfirmPin ? "2px" : "6px", fontWeight: 700 }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPin((prev) => !prev)}
                                                    className="password-toggle-button"
                                                >
                                                    {showConfirmPin ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || newPin.length !== 4 || confirmNewPin.length !== 4}
                                            className="btn-submit-primary"
                                            style={{ marginTop: 14 }}
                                        >
                                            {loading ? "Resetting PIN..." : <>Reset PIN <BsArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )}

                                <div style={{ textAlign: "center", marginTop: 16 }}>
                                    <button type="button" onClick={returnToLogin} className="text-link-action">
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* VIEW: SETUP SECURITY PIN                             */}
                        {/* ==================================================== */}
                        {viewMode === "SETUP_PIN" && (
                            <div>
                                <div className="sub-flow-header-box">
                                    <button
                                        type="button"
                                        className="card-back-btn"
                                        onClick={returnToLogin}
                                        aria-label="Go back"
                                    >
                                        <BsArrowLeft size={16} />
                                    </button>

                                    <div className="card-logo-box" style={{ marginBottom: 6 }}>
                                        <img
                                            src="/retailos-logo-transparent.png"
                                            alt="Retail OS Logo"
                                            className="card-logo-img"
                                        />
                                    </div>

                                    <h3 className="sub-flow-title">Setup PIN</h3>
                                    <p className="sub-flow-subtitle">Create a 4-digit security PIN for quick login</p>
                                </div>

                                {error && (
                                    <div className="alert-message-box alert-error">
                                        <span>{error}</span>
                                    </div>
                                )}
                                {success && (
                                    <div className="alert-message-box alert-success">
                                        <BsCheckCircle size={15} />
                                        <span>{success}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSetupPinSubmit}>
                                    <div className="form-field-group">
                                        <label className="form-field-label">New PIN</label>
                                        <div className="input-field-relative">
                                            <BsLock size={16} className="input-prefix-icon" />
                                            <input
                                                type={showSetupPin ? "text" : "password"}
                                                maxLength={4}
                                                placeholder="Enter 4-digit PIN"
                                                value={setupPinVal}
                                                onChange={(e) => {
                                                    setSetupPinVal(e.target.value.replace(/\D/g, ""));
                                                    if (error) setError("");
                                                }}
                                                disabled={loading}
                                                required
                                                className="form-control-input form-control-input-pwd"
                                                style={{ letterSpacing: showSetupPin ? "2px" : "6px", fontWeight: 700 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSetupPin((prev) => !prev)}
                                                className="password-toggle-button"
                                            >
                                                {showSetupPin ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-field-group">
                                        <label className="form-field-label">Confirm PIN</label>
                                        <div className="input-field-relative">
                                            <BsLock size={16} className="input-prefix-icon" />
                                            <input
                                                type={showSetupPin ? "text" : "password"}
                                                maxLength={4}
                                                placeholder="Confirm 4-digit PIN"
                                                value={setupPinConfirm}
                                                onChange={(e) => {
                                                    setSetupPinConfirm(e.target.value.replace(/\D/g, ""));
                                                    if (error) setError("");
                                                }}
                                                disabled={loading}
                                                required
                                                className="form-control-input form-control-input-pwd"
                                                style={{ letterSpacing: showSetupPin ? "2px" : "6px", fontWeight: 700 }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || setupPinVal.length !== 4 || setupPinConfirm.length !== 4}
                                        className="btn-submit-primary"
                                        style={{ marginTop: 14 }}
                                    >
                                        {loading ? "Setting PIN..." : <>Set PIN <BsArrowRight size={16} /></>}
                                    </button>
                                </form>

                                <div style={{ textAlign: "center", marginTop: 16 }}>
                                    <button type="button" onClick={returnToLogin} className="text-link-action">
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
