import React, { useState } from 'react';
import {
    BsShopWindow, BsPalette, BsGlobe, BsPhone, BsEnvelope,
    BsImage, BsCheckCircleFill, BsInfoCircle, BsPencilFill,
    BsSearch, BsFileText, BsToggleOn, BsToggleOff, BsSave,
} from 'react-icons/bs';

const tabs = ['Branding', 'SEO & Domain', 'Store Pages', 'Contact & Social', 'Advanced'];

const StoreManagement = () => {
    const [activeTab, setActiveTab] = useState('Branding');
    const [storeActive, setStoreActive] = useState(true);
    const [saved, setSaved] = useState(false);

    const [branding, setBranding] = useState({
        storeName: 'RetailOS Shop',
        tagline: 'Your trusted neighborhood store — now online',
        primaryColor: '#6366f1',
        accentColor: '#10b981',
        theme: 'modern-light',
        logo: '',
        banner: '',
        favicon: '',
    });

    const [seo, setSeo] = useState({
        domain: 'retailos-shop.mystore.in',
        customDomain: '',
        metaTitle: 'RetailOS Shop | Quality Products Online',
        metaDescription: 'Shop the best products from RetailOS. Fast delivery, easy returns, and amazing deals every day.',
        keywords: 'retail, online store, groceries, electronics, fashion',
        urlSlug: 'retailos-shop',
        googleAnalytics: '',
        sitemapEnabled: true,
    });

    const [pages, setPages] = useState({
        homeEnabled: true,
        aboutUs: "We are a trusted retail store committed to serving our community with quality products at fair prices.",
        contactUs: "Reach us at our store or drop us a message. We're always happy to help!",
        privacyPolicy: "Your privacy is important to us. We do not sell or share your personal data with third parties.",
        termsConditions: "By using our store, you agree to our terms of service and return policy.",
        returnPolicy: "Returns accepted within 7 days of delivery for damaged or incorrect items.",
    });

    const [contact, setContact] = useState({
        email: 'support@retailos-shop.in',
        phone: '+91 98765 43210',
        whatsapp: '+91 98765 43210',
        address: '123 MG Road, Bangalore, KA 560001',
        instagram: '@retailos_shop',
        facebook: 'facebook.com/retailos',
        twitter: '@retailos',
    });

    const [advancedSettings, setAdvancedSettings] = useState({
        reviews: true,
        showOos: true,
        guestCheckout: false,
        wishlist: true,
        autoSync: true,
        coupons: true,
        gstInvoice: true,
    });

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const themes = [
        { id: 'modern-light', label: 'Modern Light', colors: ['#6366f1', '#fff', '#f5f6fa'] },
        { id: 'dark-bold', label: 'Dark Bold', colors: ['#111827', '#1f2937', '#6366f1'] },
        { id: 'fresh-green', label: 'Fresh Green', colors: ['#10b981', '#fff', '#ecfdf5'] },
        { id: 'warm-orange', label: 'Warm Orange', colors: ['#f97316', '#fff', '#fff7ed'] },
        { id: 'royal-purple', label: 'Royal Purple', colors: ['#8b5cf6', '#fff', '#f5f3ff'] },
    ];

    return (
        <div className="dash-page">
            {/* Header */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title">🏪 Store Management</h1>
                    <p className="adm-page-sub">Configure branding, SEO, pages, and store settings</p>
                </div>
                <div className="adm-header-actions">
                    <div className="ec-toggle-wrap" onClick={() => setStoreActive(!storeActive)}>
                        {storeActive ? <BsToggleOn size={26} color="#10b981" /> : <BsToggleOff size={26} color="#d1d5db" />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: storeActive ? '#10b981' : '#9ca3af' }}>
                            Store {storeActive ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <button className="adm-btn-primary" onClick={handleSave}>
                        <BsSave size={14} />
                        {saved ? '✓ Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="ec-tabs">
                {tabs.map(tab => (
                    <button key={tab} className={`ec-tab-btn ${activeTab === tab ? 'ec-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab(tab)}>
                        {tab === 'Branding' && <BsPalette size={13} />}
                        {tab === 'SEO & Domain' && <BsSearch size={13} />}
                        {tab === 'Store Pages' && <BsFileText size={13} />}
                        {tab === 'Contact & Social' && <BsEnvelope size={13} />}
                        {tab === 'Advanced' && <BsGlobe size={13} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="ec-form-grid">
                {/* === BRANDING === */}
                {activeTab === 'Branding' && (
                    <>
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header">
                                <BsShopWindow size={16} color="#6366f1" />
                                <h3>Store Identity</h3>
                            </div>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Store Name</label>
                                    <input className="ec-input" value={branding.storeName}
                                        onChange={e => setBranding({ ...branding, storeName: e.target.value })} />
                                </div>
                                <div className="ec-field">
                                    <label>Tagline</label>
                                    <input className="ec-input" value={branding.tagline}
                                        onChange={e => setBranding({ ...branding, tagline: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="ec-form-card">
                            <div className="ec-form-card-header">
                                <BsImage size={16} color="#6366f1" />
                                <h3>Media Assets</h3>
                            </div>
                            {[
                                { label: 'Store Logo', hint: 'PNG/SVG, 200×60px recommended', key: 'logo' },
                                { label: 'Store Banner', hint: 'JPEG/PNG, 1440×480px recommended', key: 'banner' },
                                { label: 'Favicon', hint: 'ICO/PNG, 32×32px', key: 'favicon' },
                            ].map(f => (
                                <div key={f.key} className="ec-upload-row">
                                    <div className="ec-upload-preview">
                                        <BsImage size={22} color="#d1d5db" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{f.label}</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{f.hint}</p>
                                    </div>
                                    <button className="adm-btn-secondary">
                                        <BsPencilFill size={12} /> Upload
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="ec-form-card">
                            <div className="ec-form-card-header">
                                <BsPalette size={16} color="#6366f1" />
                                <h3>Theme & Colors</h3>
                            </div>
                            <div className="ec-form-row" style={{ marginBottom: 16 }}>
                                <div className="ec-field">
                                    <label>Primary Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="color" value={branding.primaryColor}
                                            onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', padding: 2 }} />
                                        <input className="ec-input" value={branding.primaryColor}
                                            onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                                            style={{ flex: 1 }} />
                                    </div>
                                </div>
                                <div className="ec-field">
                                    <label>Accent Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="color" value={branding.accentColor}
                                            onChange={e => setBranding({ ...branding, accentColor: e.target.value })}
                                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', padding: 2 }} />
                                        <input className="ec-input" value={branding.accentColor}
                                            onChange={e => setBranding({ ...branding, accentColor: e.target.value })}
                                            style={{ flex: 1 }} />
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Select Theme</p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {themes.map(t => (
                                    <button key={t.id} onClick={() => setBranding({ ...branding, theme: t.id })}
                                        className={`ec-theme-swatch ${branding.theme === t.id ? 'ec-theme-swatch--active' : ''}`}>
                                        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                                            {t.colors.map((c, ci) => (
                                                <div key={ci} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid #e5e7eb' }} />
                                            ))}
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{t.label}</span>
                                        {branding.theme === t.id && <BsCheckCircleFill size={12} color="#6366f1" style={{ marginLeft: 4 }} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* === SEO === */}
                {activeTab === 'SEO & Domain' && (
                    <>
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header"><BsGlobe size={16} color="#6366f1" /><h3>Domain Settings</h3></div>
                            <div className="ec-field" style={{ marginBottom: 14 }}>
                                <label>Default Store URL</label>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', gap: 8 }}>
                                    <BsGlobe size={14} color="#9ca3af" />
                                    <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{seo.domain}</span>
                                    <span className="ec-badge ec-badge--green" style={{ marginLeft: 'auto' }}>Active</span>
                                </div>
                            </div>
                            <div className="ec-field">
                                <label>Custom Domain (Optional)</label>
                                <input className="ec-input" placeholder="shop.yourdomain.com" value={seo.customDomain}
                                    onChange={e => setSeo({ ...seo, customDomain: e.target.value })} />
                                <p className="ec-field-hint">Add a CNAME record pointing to retailos.in to activate your custom domain.</p>
                            </div>
                        </div>

                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header"><BsSearch size={16} color="#6366f1" /><h3>SEO Metadata</h3></div>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Meta Title</label>
                                    <input className="ec-input" value={seo.metaTitle} onChange={e => setSeo({ ...seo, metaTitle: e.target.value })} />
                                    <p className="ec-field-hint">{seo.metaTitle.length}/60 chars</p>
                                </div>
                                <div className="ec-field">
                                    <label>URL Slug</label>
                                    <input className="ec-input" value={seo.urlSlug} onChange={e => setSeo({ ...seo, urlSlug: e.target.value })} />
                                </div>
                            </div>
                            <div className="ec-field">
                                <label>Meta Description</label>
                                <textarea className="ec-textarea" rows={3} value={seo.metaDescription}
                                    onChange={e => setSeo({ ...seo, metaDescription: e.target.value })} />
                                <p className="ec-field-hint">{seo.metaDescription.length}/160 chars</p>
                            </div>
                            <div className="ec-field">
                                <label>Keywords</label>
                                <input className="ec-input" value={seo.keywords} onChange={e => setSeo({ ...seo, keywords: e.target.value })} />
                            </div>
                            <div className="ec-field">
                                <label>Google Analytics ID</label>
                                <input className="ec-input" placeholder="G-XXXXXXXXXX" value={seo.googleAnalytics}
                                    onChange={e => setSeo({ ...seo, googleAnalytics: e.target.value })} />
                            </div>
                        </div>
                    </>
                )}

                {/* === STORE PAGES === */}
                {activeTab === 'Store Pages' && (
                    <>
                        {[
                            { label: 'About Us', key: 'aboutUs', icon: '📋' },
                            { label: 'Contact Us', key: 'contactUs', icon: '📞' },
                            { label: 'Privacy Policy', key: 'privacyPolicy', icon: '🔒' },
                            { label: 'Terms & Conditions', key: 'termsConditions', icon: '📄' },
                            { label: 'Return Policy', key: 'returnPolicy', icon: '🔄' },
                        ].map(p => (
                            <div key={p.key} className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                                <div className="ec-form-card-header">
                                    <span style={{ fontSize: 16 }}>{p.icon}</span>
                                    <h3>{p.label}</h3>
                                </div>
                                <textarea className="ec-textarea" rows={4} value={pages[p.key]}
                                    onChange={e => setPages({ ...pages, [p.key]: e.target.value })} />
                            </div>
                        ))}
                    </>
                )}

                {/* === CONTACT & SOCIAL === */}
                {activeTab === 'Contact & Social' && (
                    <>
                        <div className="ec-form-card">
                            <div className="ec-form-card-header"><BsPhone size={16} color="#6366f1" /><h3>Contact Information</h3></div>
                            {[
                                { label: 'Email', key: 'email', placeholder: 'support@yourstore.in', icon: '📧' },
                                { label: 'Phone Number', key: 'phone', placeholder: '+91 XXXXX XXXXX', icon: '📱' },
                                { label: 'WhatsApp', key: 'whatsapp', placeholder: '+91 XXXXX XXXXX', icon: '💬' },
                                { label: 'Store Address', key: 'address', placeholder: 'Street, City, State, PIN', icon: '📍' },
                            ].map(f => (
                                <div key={f.key} className="ec-field">
                                    <label>{f.label}</label>
                                    <input className="ec-input" placeholder={f.placeholder} value={contact[f.key]}
                                        onChange={e => setContact({ ...contact, [f.key]: e.target.value })} />
                                </div>
                            ))}
                        </div>

                        <div className="ec-form-card">
                            <div className="ec-form-card-header"><BsGlobe size={16} color="#6366f1" /><h3>Social Media Links</h3></div>
                            {[
                                { label: 'Instagram', key: 'instagram', placeholder: '@yourstore', icon: '📸' },
                                { label: 'Facebook', key: 'facebook', placeholder: 'facebook.com/yourstore', icon: '👥' },
                                { label: 'Twitter / X', key: 'twitter', placeholder: '@yourstore', icon: '🐦' },
                            ].map(f => (
                                <div key={f.key} className="ec-field">
                                    <label>{f.label}</label>
                                    <input className="ec-input" placeholder={f.placeholder} value={contact[f.key]}
                                        onChange={e => setContact({ ...contact, [f.key]: e.target.value })} />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* === ADVANCED === */}
                {activeTab === 'Advanced' && (
                    <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="ec-form-card-header"><BsInfoCircle size={16} color="#6366f1" /><h3>Advanced Settings</h3></div>
                        {[
                            { label: 'Enable Product Reviews', desc: 'Allow customers to leave ratings and reviews on products', key: 'reviews', default: true },
                            { label: 'Show Out of Stock Products', desc: 'Display products with zero stock with an "Out of Stock" label', key: 'showOos', default: true },
                            { label: 'Guest Checkout', desc: 'Allow customers to place orders without creating an account', key: 'guestCheckout', default: false },
                            { label: 'Wishlist Feature', desc: 'Enable customers to save products for later purchase', key: 'wishlist', default: true },
                            { label: 'Auto-sync Inventory', desc: 'Automatically update online stock when POS sales are made', key: 'autoSync', default: true },
                            { label: 'Enable Coupons', desc: 'Allow discount coupons and promo codes at checkout', key: 'coupons', default: true },
                            { label: 'GST Invoice on Orders', desc: 'Automatically generate GST invoice for each online order', key: 'gstInvoice', default: true },
                        ].map((s) => (
                            <div key={s.key} className="ec-toggle-row">
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.label}</p>
                                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.desc}</p>
                                </div>
                                <div onClick={() => setAdvancedSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))} style={{ cursor: 'pointer' }}>
                                    {advancedSettings[s.key] ? <BsToggleOn size={28} color="#6366f1" /> : <BsToggleOff size={28} color="#d1d5db" />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoreManagement;

