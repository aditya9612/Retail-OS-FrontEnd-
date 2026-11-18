import React, { useState, useEffect } from 'react';
import {
    BsShopWindow, BsPalette, BsGlobe, BsPhone, BsEnvelope,
    BsImage, BsCheckCircleFill, BsInfoCircle,
    BsSearch, BsFileText, BsToggleOn, BsToggleOff, BsSave,
    BsCodeSlash, BsExclamationTriangleFill, BsShieldLock,
    BsUpload, BsTrash, BsEye, BsArrowRepeat
} from 'react-icons/bs';
import apiClient from '../../services/api';

const tabs = ['Branding', 'SEO & Domain', 'Store Pages', 'Contact & Social', 'Advanced', 'Public Storefront'];

const getAssetPreviewUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }
    return `https://api-testing.myretailos.com${url.startsWith('/') ? '' : '/'}${url}`;
};

// Dedicated API service for GET /api/v1/ecommerce/storefront/settings (Get All Store Management Settings)
export const getStorefrontSettings = async ({ store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.get('/ecommerce/storefront/settings', hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.get('/api/v1/ecommerce/storefront/settings', hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.get('/ecommerce/storefront/public', hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.get('/api/v1/ecommerce/storefront/public', hasParams ? { params } : undefined);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for GET /api/v1/ecommerce/storefront/public (Get public storefront profile - Customer-facing, no authentication)
export const getPublicStorefrontProfile = async ({ subdomain, store_id } = {}) => {
    const params = {};
    if (subdomain && typeof subdomain === 'string' && subdomain.trim()) {
        params.subdomain = subdomain.trim();
    }
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.get('/ecommerce/storefront/public', hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.get('/api/v1/ecommerce/storefront/public', hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.get('/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.get('/api/v1/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for GET /api/v1/ecommerce/storefront/seo-domain (Get SEO & Domain Settings Tab data)
export const getStorefrontSeoDomain = async ({ store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.get('/ecommerce/storefront/seo-domain', hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.get('/api/v1/ecommerce/storefront/seo-domain', hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.get('/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.get('/api/v1/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for PUT /api/v1/ecommerce/storefront/seo-domain (Save SEO & Domain Settings Tab data)
export const updateStorefrontSeoDomain = async (payload, { store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.put('/ecommerce/storefront/seo-domain', payload, hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.put('/api/v1/ecommerce/storefront/seo-domain', payload, hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.put('/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.put('/ecommerce/storefront/settings', payload);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for GET /api/v1/ecommerce/storefront/pages (Get Store Pages Tab data)
export const getStorefrontPages = async ({ store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.get('/ecommerce/storefront/pages', hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.get('/api/v1/ecommerce/storefront/pages', hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.get('/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.get('/api/v1/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for PUT /api/v1/ecommerce/storefront/pages (Save Store Pages Tab data)
export const updateStorefrontPages = async (payload, { store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.put('/ecommerce/storefront/pages', payload, hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.put('/api/v1/ecommerce/storefront/pages', payload, hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.put('/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.put('/ecommerce/storefront/settings', payload);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for GET /api/v1/ecommerce/storefront/contact-social (Get Contact & Social Media Links Tab data)
export const getStorefrontContactSocial = async ({ store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.get('/ecommerce/storefront/contact-social', hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.get('/api/v1/ecommerce/storefront/contact-social', hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.get('/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.get('/api/v1/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for PUT /api/v1/ecommerce/storefront/contact-social (Save Contact & Social Media Links Tab data)
export const updateStorefrontContactSocial = async (payload, { store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.put('/ecommerce/storefront/contact-social', payload, hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.put('/api/v1/ecommerce/storefront/contact-social', payload, hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.put('/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.put('/ecommerce/storefront/settings', payload);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for GET /api/v1/ecommerce/storefront/advanced (Get Advanced Feature Switches Tab data - 7 Toggles)
export const getStorefrontAdvanced = async ({ store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.get('/ecommerce/storefront/advanced', hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.get('/api/v1/ecommerce/storefront/advanced', hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.get('/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.get('/api/v1/ecommerce/storefront/settings', hasParams ? { params } : undefined);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for PUT /api/v1/ecommerce/storefront/advanced (Save Advanced Feature Switches Tab data)
export const updateStorefrontAdvanced = async (payload, { store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.put('/ecommerce/storefront/advanced', payload, hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.put('/api/v1/ecommerce/storefront/advanced', payload, hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.put('/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
            } catch (e3) {
                res = await apiClient.put('/ecommerce/storefront/settings', payload);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for PUT /api/v1/ecommerce/storefront/settings (Save Store Management Settings changes)
export const updateStorefrontSettings = async (payload, { store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    let res;
    try {
        res = await apiClient.put('/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.put('/api/v1/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.put('/ecommerce/storefront/settings', payload);
            } catch (e3) {
                try {
                    res = await apiClient.post('/ecommerce/storefront/settings', payload, hasParams ? { params } : undefined);
                } catch (e4) {
                    res = await apiClient.post('/api/v1/ecommerce/storefront/settings', payload);
                }
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for PATCH /api/v1/ecommerce/storefront/toggle-status (Toggle Store Online Switch)
export const toggleStorefrontStatus = async (is_online, { store_id } = {}) => {
    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;
    const payload = { is_online: Boolean(is_online) };
    let res;
    try {
        res = await apiClient.patch('/ecommerce/storefront/toggle-status', payload, hasParams ? { params } : undefined);
    } catch (e1) {
        try {
            res = await apiClient.patch('/api/v1/ecommerce/storefront/toggle-status', payload, hasParams ? { params } : undefined);
        } catch (e2) {
            try {
                res = await apiClient.put('/ecommerce/storefront/toggle-status', payload, hasParams ? { params } : undefined);
            } catch (e3) {
                try {
                    res = await apiClient.post('/ecommerce/storefront/toggle-status', payload, hasParams ? { params } : undefined);
                } catch (e4) {
                    res = await apiClient.patch('/ecommerce/storefront/toggle-status', payload);
                }
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

// Dedicated API service for POST /api/v1/ecommerce/storefront/upload-asset (Upload media assets: logo, banner, favicon, og_image)
export const uploadStorefrontAsset = async ({ asset_type, file, store_id } = {}) => {
    const formData = new FormData();
    formData.append('asset_type', asset_type);
    formData.append('file', file);

    const params = {};
    const parsedStoreId = parseInt(store_id, 10);
    if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
        params.store_id = parsedStoreId;
    }
    const hasParams = Object.keys(params).length > 0;

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        ...(hasParams ? { params } : {})
    };

    let res;
    try {
        res = await apiClient.post('/ecommerce/storefront/upload-asset', formData, config);
    } catch (e1) {
        try {
            res = await apiClient.post('/api/v1/ecommerce/storefront/upload-asset', formData, config);
        } catch (e2) {
            try {
                res = await apiClient.post('/ecommerce/storefront/upload-asset', formData);
            } catch (e3) {
                res = await apiClient.post('/api/v1/ecommerce/storefront/upload-asset', formData);
            }
        }
    }
    return res?.data?.data ?? res?.data;
};

const StoreManagement = () => {
    const [activeTab, setActiveTab] = useState('Branding');
    const [storeActive, setStoreActive] = useState(true);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [toggleStatusMsg, setToggleStatusMsg] = useState(null);
    const [toggleStatusError, setToggleStatusError] = useState(null);
    const [uploadingAsset, setUploadingAsset] = useState({});
    const [uploadFeedback, setUploadFeedback] = useState(null);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
    const [saveErrorMsg, setSaveErrorMsg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [apiSynced, setApiSynced] = useState(false);
    const [apiError, setApiError] = useState(null);

    // Dedicated SEO & Domain API states (GET & PUT /api/v1/ecommerce/storefront/seo-domain)
    const [seoLoading, setSeoLoading] = useState(false);
    const [seoApiSynced, setSeoApiSynced] = useState(false);
    const [seoApiError, setSeoApiError] = useState(null);
    const [savingSeo, setSavingSeo] = useState(false);
    const [seoSaveSuccessMsg, setSeoSaveSuccessMsg] = useState(null);
    const [seoSaveErrorMsg, setSeoSaveErrorMsg] = useState(null);

    // Dedicated Store Pages API states (GET & PUT /api/v1/ecommerce/storefront/pages)
    const [pagesLoading, setPagesLoading] = useState(false);
    const [pagesApiSynced, setPagesApiSynced] = useState(false);
    const [pagesApiError, setPagesApiError] = useState(null);
    const [savingPages, setSavingPages] = useState(false);
    const [pagesSaveSuccessMsg, setPagesSaveSuccessMsg] = useState(null);
    const [pagesSaveErrorMsg, setPagesSaveErrorMsg] = useState(null);

    // Dedicated Contact & Social API states (GET & PUT /api/v1/ecommerce/storefront/contact-social)
    const [contactLoading, setContactLoading] = useState(false);
    const [contactApiSynced, setContactApiSynced] = useState(false);
    const [contactApiError, setContactApiError] = useState(null);
    const [savingContact, setSavingContact] = useState(false);
    const [contactSaveSuccessMsg, setContactSaveSuccessMsg] = useState(null);
    const [contactSaveErrorMsg, setContactSaveErrorMsg] = useState(null);

    // Dedicated Advanced Feature Switches API states (GET & PUT /api/v1/ecommerce/storefront/advanced)
    const [advancedLoading, setAdvancedLoading] = useState(false);
    const [advancedApiSynced, setAdvancedApiSynced] = useState(false);
    const [advancedApiError, setAdvancedApiError] = useState(null);
    const [savingAdvanced, setSavingAdvanced] = useState(false);
    const [advancedSaveSuccessMsg, setAdvancedSaveSuccessMsg] = useState(null);
    const [advancedSaveErrorMsg, setAdvancedSaveErrorMsg] = useState(null);

    // Dedicated Public Storefront Profile API states (GET /api/v1/ecommerce/storefront/public)
    const [publicProfile, setPublicProfile] = useState(null);
    const [publicLoading, setPublicLoading] = useState(false);
    const [publicApiSynced, setPublicApiSynced] = useState(false);
    const [publicApiError, setPublicApiError] = useState(null);
    const [subdomainQuery, setSubdomainQuery] = useState('maharashtra-super-mart');
    const [storeIdQuery, setStoreIdQuery] = useState('1');

    const [branding, setBranding] = useState({
        storeName: 'Maharashtra Super Mart',
        tagline: 'Your trusted neighborhood supermarket — now online!',
        primaryColor: '#1E3A8A',
        accentColor: '#10B981',
        theme: 'modern-light',
        logo: '/uploads/storefront/logo_sample.png',
        banner: '/uploads/storefront/banner_sample.png',
        favicon: '/uploads/storefront/favicon_sample.ico',
    });

    const [seo, setSeo] = useState({
        domain: 'maharashtra-super-mart.mystore.in',
        customDomain: 'shop.myretailstore.com',
        metaTitle: 'Maharashtra Super Mart | Best Quality Groceries & Essentials',
        metaDescription: 'Shop fresh groceries, daily household staples, and packed foods online with same-day doorstep delivery.',
        keywords: 'online grocery, supermarket, fresh vegetables, daily essentials, retail os shop',
        urlSlug: 'maharashtra-super-mart',
        googleAnalytics: 'G-9X7Y8Z1234',
        facebookPixel: '123456789012345',
        ogImage: '',
        sitemapEnabled: true,
    });

    const [pages, setPages] = useState({
        homeEnabled: true,
        aboutUs: 'Welcome to Maharashtra Super Mart! Established in 2020, we are dedicated to providing premium quality grocery and daily household items at fair wholesale prices.',
        contactUs: 'Visit our store at Shop 12, Laxmi Road, Pune or call our customer care at +91 98765 43210. Store Timing: 8:00 AM to 10:00 PM.',
        privacyPolicy: 'Your privacy is paramount. We collect your contact details solely for order processing and delivery. We never sell or share your personal data with third parties.',
        termsConditions: 'By ordering through our storefront, you agree to our pricing, delivery schedule, and billing policies. All prices are inclusive of applicable GST.',
        shippingPolicy: 'Orders placed before 4:00 PM are delivered same-day. Free delivery on orders above Rs. 500.',
        returnPolicy: 'Returns and exchanges are accepted within 48 hours of delivery for damaged, defective, or expired products.',
        refundPolicy: 'Refunds are processed back to your original payment method or store wallet within 3 business days.',
    });

    const [contact, setContact] = useState({
        email: 'care@maharashtramart.in',
        phone: '+91 98765 43210',
        whatsapp: '+91 98765 43210',
        address: 'Shop No. 12 & 13, Ground Floor, Laxmi Road, Pune, Maharashtra 411030',
        instagram: 'https://instagram.com/maharashtramart',
        facebook: 'https://facebook.com/maharashtramart',
        twitter: 'https://x.com/maharashtramart',
        youtube: 'https://youtube.com/@maharashtramart',
    });

    const [advancedSettings, setAdvancedSettings] = useState({
        reviews: true,
        showOos: true,
        guestCheckout: false,
        wishlist: true,
        autoSync: true,
        coupons: true,
        gstInvoice: true,
        customCss: '/* Custom storefront styling */',
        customJs: '// Custom analytics tracking code',
    });

    useEffect(() => {
        document.title = 'Storefront Settings - Retail-OS';
    }, []);

    // Dedicated fetch for GET /api/v1/ecommerce/storefront/seo-domain (Get SEO & Domain Settings Tab data)
    const fetchSeoDomainData = async () => {
        setSeoLoading(true);
        setSeoApiError(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const data = await getStorefrontSeoDomain({ store_id: storeId });
            if (data && typeof data === 'object') {
                setSeo(prev => ({
                    ...prev,
                    domain: data.default_store_url ?? prev.domain,
                    customDomain: data.custom_domain ?? prev.customDomain,
                    metaTitle: data.meta_title ?? prev.metaTitle,
                    metaDescription: data.meta_description ?? prev.metaDescription,
                    keywords: data.keywords || data.meta_keywords || prev.keywords,
                    urlSlug: data.url_slug ?? prev.urlSlug,
                    googleAnalytics: data.google_analytics_id ?? prev.googleAnalytics,
                    facebookPixel: data.facebook_pixel_id ?? prev.facebookPixel,
                    ogImage: data.og_image_url ?? prev.ogImage,
                }));
                setSeoApiSynced(true);
            }
        } catch (err) {
            console.warn('SEO & Domain settings fetch error:', err?.message);
            setSeoApiError(err?.message || 'Using local SEO defaults');
        } finally {
            setSeoLoading(false);
        }
    };

    // Dedicated fetch for GET /api/v1/ecommerce/storefront/pages (Get Store Pages Tab data)
    const fetchPagesData = async () => {
        setPagesLoading(true);
        setPagesApiError(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const data = await getStorefrontPages({ store_id: storeId });
            if (data && typeof data === 'object') {
                setPages(prev => ({
                    ...prev,
                    aboutUs: data.about_us ?? prev.aboutUs,
                    contactUs: data.contact_us ?? prev.contactUs,
                    privacyPolicy: data.privacy_policy ?? prev.privacyPolicy,
                    termsConditions: data.terms_and_conditions || data.terms_conditions || prev.termsConditions,
                    returnPolicy: data.return_policy ?? prev.returnPolicy,
                    refundPolicy: data.refund_policy ?? prev.refundPolicy,
                    shippingPolicy: data.shipping_policy ?? prev.shippingPolicy,
                }));
                setPagesApiSynced(true);
            }
        } catch (err) {
            console.warn('Store pages fetch error:', err?.message);
            setPagesApiError(err?.message || 'Using local pages defaults');
        } finally {
            setPagesLoading(false);
        }
    };

    // Dedicated save for PUT /api/v1/ecommerce/storefront/seo-domain (Save SEO & Domain Settings Tab data)
    const handleSaveSeoDomain = async () => {
        setSavingSeo(true);
        setSeoSaveSuccessMsg(null);
        setSeoSaveErrorMsg(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const payload = {
                custom_domain: seo.customDomain || null,
                url_slug: seo.urlSlug || '',
                meta_title: seo.metaTitle || '',
                meta_description: seo.metaDescription || '',
                keywords: seo.keywords || '',
                google_analytics_id: seo.googleAnalytics || null,
            };

            const resData = await updateStorefrontSeoDomain(payload, { store_id: storeId });

            if (resData && typeof resData === 'object') {
                setSeo(prev => ({
                    ...prev,
                    domain: resData.default_store_url ?? prev.domain,
                    customDomain: resData.custom_domain ?? prev.customDomain,
                    urlSlug: resData.url_slug ?? prev.urlSlug,
                    metaTitle: resData.meta_title ?? prev.metaTitle,
                    metaDescription: resData.meta_description ?? prev.metaDescription,
                    keywords: resData.keywords ?? prev.keywords,
                    googleAnalytics: resData.google_analytics_id ?? prev.googleAnalytics,
                }));
            }

            setSeoSaveSuccessMsg('✓ SEO & Domain settings saved successfully via PUT /api/v1/ecommerce/storefront/seo-domain');
            setTimeout(() => setSeoSaveSuccessMsg(null), 3500);
        } catch (err) {
            console.error('Failed to save SEO & domain settings:', err);
            const errText = err?.response?.data?.message || err?.message || 'Failed to save SEO & Domain settings via PUT';
            setSeoSaveErrorMsg(errText);
            setTimeout(() => setSeoSaveErrorMsg(null), 5000);
        } finally {
            setSavingSeo(false);
        }
    };

    // Dedicated save for PUT /api/v1/ecommerce/storefront/pages (Save Store Pages Tab data)
    const handleSavePages = async () => {
        setSavingPages(true);
        setPagesSaveSuccessMsg(null);
        setPagesSaveErrorMsg(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const payload = {
                about_us: pages.aboutUs || '',
                contact_us: pages.contactUs || '',
                privacy_policy: pages.privacyPolicy || '',
                terms_conditions: pages.termsConditions || '',
                terms_and_conditions: pages.termsConditions || '',
                return_policy: pages.returnPolicy || '',
                refund_policy: pages.refundPolicy || pages.returnPolicy || '',
            };

            const resData = await updateStorefrontPages(payload, { store_id: storeId });

            if (resData && typeof resData === 'object') {
                setPages(prev => ({
                    ...prev,
                    aboutUs: resData.about_us ?? prev.aboutUs,
                    contactUs: resData.contact_us ?? prev.contactUs,
                    privacyPolicy: resData.privacy_policy ?? prev.privacyPolicy,
                    termsConditions: resData.terms_and_conditions || resData.terms_conditions || prev.termsConditions,
                    returnPolicy: resData.return_policy ?? prev.returnPolicy,
                    refundPolicy: resData.refund_policy ?? prev.refundPolicy,
                }));
            }

            setPagesSaveSuccessMsg('✓ Store Pages saved successfully via PUT /api/v1/ecommerce/storefront/pages');
            setTimeout(() => setPagesSaveSuccessMsg(null), 3500);
        } catch (err) {
            console.error('Failed to save Store Pages:', err);
            const errText = err?.response?.data?.message || err?.message || 'Failed to save Store Pages via PUT';
            setPagesSaveErrorMsg(errText);
            setTimeout(() => setPagesSaveErrorMsg(null), 5000);
        } finally {
            setSavingPages(false);
        }
    };

    // Dedicated fetch for GET /api/v1/ecommerce/storefront/contact-social (Get Contact & Social Media Links Tab data)
    const fetchContactSocialData = async () => {
        setContactLoading(true);
        setContactApiError(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const data = await getStorefrontContactSocial({ store_id: storeId });
            if (data && typeof data === 'object') {
                setContact(prev => ({
                    ...prev,
                    email: data.contact_email ?? data.email ?? prev.email,
                    phone: data.contact_phone ?? data.phone ?? prev.phone,
                    whatsapp: data.whatsapp_number ?? data.whatsapp ?? prev.whatsapp,
                    address: data.address ?? prev.address,
                    instagram: data.instagram_url ?? data.instagram ?? prev.instagram,
                    facebook: data.facebook_url ?? data.facebook ?? prev.facebook,
                    twitter: data.twitter_url ?? data.twitter ?? prev.twitter,
                    youtube: data.youtube_url ?? data.youtube ?? prev.youtube,
                }));
                setContactApiSynced(true);
            }
        } catch (err) {
            console.warn('Contact & Social settings fetch error:', err?.message);
            setContactApiError(err?.message || 'Using local contact defaults');
        } finally {
            setContactLoading(false);
        }
    };

    // Dedicated save for PUT /api/v1/ecommerce/storefront/contact-social (Save Contact & Social Media Links Tab data)
    const handleSaveContactSocial = async () => {
        setSavingContact(true);
        setContactSaveSuccessMsg(null);
        setContactSaveErrorMsg(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const payload = {
                contact_email: contact.email || '',
                contact_phone: contact.phone || '',
                whatsapp_number: contact.whatsapp || '',
                address: contact.address || '',
                instagram_url: contact.instagram || '',
                facebook_url: contact.facebook || '',
                twitter_url: contact.twitter || '',
            };
            if (contact.youtube) {
                payload.youtube_url = contact.youtube;
            }

            const resData = await updateStorefrontContactSocial(payload, { store_id: storeId });

            if (resData && typeof resData === 'object') {
                setContact(prev => ({
                    ...prev,
                    email: resData.contact_email ?? prev.email,
                    phone: resData.contact_phone ?? prev.phone,
                    whatsapp: resData.whatsapp_number ?? prev.whatsapp,
                    address: resData.address ?? prev.address,
                    instagram: resData.instagram_url ?? prev.instagram,
                    facebook: resData.facebook_url ?? prev.facebook,
                    twitter: resData.twitter_url ?? prev.twitter,
                    youtube: resData.youtube_url ?? prev.youtube,
                }));
            }

            setContactSaveSuccessMsg('✓ Contact & Social Media Links saved successfully via PUT /api/v1/ecommerce/storefront/contact-social');
            setTimeout(() => setContactSaveSuccessMsg(null), 3500);
        } catch (err) {
            console.error('Failed to save Contact & Social:', err);
            const errText = err?.response?.data?.message || err?.message || 'Failed to save Contact & Social settings via PUT /api/v1/ecommerce/storefront/contact-social';
            setContactSaveErrorMsg(errText);
            setTimeout(() => setContactSaveErrorMsg(null), 5000);
        } finally {
            setSavingContact(false);
        }
    };

    // Dedicated fetch for GET /api/v1/ecommerce/storefront/advanced (Get Advanced Feature Switches Tab data - 7 Toggles)
    const fetchAdvancedData = async () => {
        setAdvancedLoading(true);
        setAdvancedApiError(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const data = await getStorefrontAdvanced({ store_id: storeId });
            if (data && typeof data === 'object') {
                setAdvancedSettings(prev => ({
                    ...prev,
                    reviews: data.enable_product_reviews !== undefined ? Boolean(data.enable_product_reviews) : prev.reviews,
                    showOos: data.show_out_of_stock !== undefined ? Boolean(data.show_out_of_stock) : prev.showOos,
                    guestCheckout: data.guest_checkout !== undefined ? Boolean(data.guest_checkout) : prev.guestCheckout,
                    wishlist: data.wishlist_enabled !== undefined ? Boolean(data.wishlist_enabled) : prev.wishlist,
                    autoSync: data.auto_sync_inventory !== undefined ? Boolean(data.auto_sync_inventory) : prev.autoSync,
                    coupons: data.enable_coupons !== undefined ? Boolean(data.enable_coupons) : prev.coupons,
                    gstInvoice: data.gst_invoice_enabled !== undefined ? Boolean(data.gst_invoice_enabled) : prev.gstInvoice,
                    customCss: data.custom_css ?? prev.customCss,
                    customJs: data.custom_js ?? prev.customJs,
                }));
                if (data.is_maintenance_mode !== undefined || data.maintenance_mode !== undefined) {
                    setMaintenanceMode(Boolean(data.is_maintenance_mode ?? data.maintenance_mode));
                }
                setAdvancedApiSynced(true);
            }
        } catch (err) {
            console.warn('Advanced settings fetch error:', err?.message);
            setAdvancedApiError(err?.message || 'Using local advanced defaults');
        } finally {
            setAdvancedLoading(false);
        }
    };

    // Dedicated save for PUT /api/v1/ecommerce/storefront/advanced (Save Advanced Feature Switches Tab data)
    const handleSaveAdvanced = async () => {
        setSavingAdvanced(true);
        setAdvancedSaveSuccessMsg(null);
        setAdvancedSaveErrorMsg(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const payload = {
                enable_product_reviews: Boolean(advancedSettings.reviews),
                show_out_of_stock: Boolean(advancedSettings.showOos),
                guest_checkout: Boolean(advancedSettings.guestCheckout),
                wishlist_enabled: Boolean(advancedSettings.wishlist),
                auto_sync_inventory: Boolean(advancedSettings.autoSync),
                enable_coupons: Boolean(advancedSettings.coupons),
                gst_invoice_enabled: Boolean(advancedSettings.gstInvoice),
                is_maintenance_mode: Boolean(maintenanceMode),
                maintenance_mode: Boolean(maintenanceMode),
            };

            const resData = await updateStorefrontAdvanced(payload, { store_id: storeId });

            if (resData && typeof resData === 'object') {
                setAdvancedSettings(prev => ({
                    ...prev,
                    reviews: resData.enable_product_reviews !== undefined ? Boolean(resData.enable_product_reviews) : prev.reviews,
                    showOos: resData.show_out_of_stock !== undefined ? Boolean(resData.show_out_of_stock) : prev.showOos,
                    guestCheckout: resData.guest_checkout !== undefined ? Boolean(resData.guest_checkout) : prev.guestCheckout,
                    wishlist: resData.wishlist_enabled !== undefined ? Boolean(resData.wishlist_enabled) : prev.wishlist,
                    autoSync: resData.auto_sync_inventory !== undefined ? Boolean(resData.auto_sync_inventory) : prev.autoSync,
                    coupons: resData.enable_coupons !== undefined ? Boolean(resData.enable_coupons) : prev.coupons,
                    gstInvoice: resData.gst_invoice_enabled !== undefined ? Boolean(resData.gst_invoice_enabled) : prev.gstInvoice,
                }));
                if (resData.is_maintenance_mode !== undefined || resData.maintenance_mode !== undefined) {
                    setMaintenanceMode(Boolean(resData.is_maintenance_mode ?? resData.maintenance_mode));
                }
            }

            setAdvancedSaveSuccessMsg('✓ Advanced Feature Switches saved successfully via PUT /api/v1/ecommerce/storefront/advanced');
            setTimeout(() => setAdvancedSaveSuccessMsg(null), 3500);
        } catch (err) {
            console.error('Failed to save Advanced settings:', err);
            const errText = err?.response?.data?.message || err?.message || 'Failed to save Advanced settings via PUT /api/v1/ecommerce/storefront/advanced';
            setAdvancedSaveErrorMsg(errText);
            setTimeout(() => setAdvancedSaveErrorMsg(null), 5000);
        } finally {
            setSavingAdvanced(false);
        }
    };

    // Dedicated fetch for GET /api/v1/ecommerce/storefront/public (Get public storefront profile - Customer-facing, no authentication)
    const fetchPublicProfile = async (customParams = {}) => {
        setPublicLoading(true);
        setPublicApiError(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = customParams.store_id !== undefined
                ? customParams.store_id
                : (storeIdQuery || savedUser?.store_id || savedUser?.storeId || 1);
            const subdomain = customParams.subdomain !== undefined
                ? customParams.subdomain
                : (subdomainQuery || seo.urlSlug || 'maharashtra-super-mart');

            const data = await getPublicStorefrontProfile({ subdomain, store_id: storeId });
            if (data && typeof data === 'object') {
                setPublicProfile(data);
                setPublicApiSynced(true);
            }
        } catch (err) {
            console.warn('Public storefront profile fetch error:', err?.message);
            setPublicApiError(err?.message || 'Using local storefront defaults');
        } finally {
            setPublicLoading(false);
        }
    };

    // Fetch All Store Management Settings (Branding, SEO, Pages, Contact, Advanced) from GET /api/v1/ecommerce/storefront/settings
    useEffect(() => {
        let active = true;
        const fetchSettings = async () => {
            setLoading(true);
            setApiError(null);
            try {
                let savedUser = {};
                try {
                    savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
                } catch (_) {}
                const storeId = savedUser?.store_id || savedUser?.storeId || 1;

                const data = await getStorefrontSettings({ store_id: storeId });
                if (active && data && typeof data === 'object') {
                    if (data.is_online !== undefined) {
                        setStoreActive(Boolean(data.is_online));
                    }
                    if (data.is_maintenance_mode !== undefined || data.maintenance_mode !== undefined) {
                        setMaintenanceMode(Boolean(data.is_maintenance_mode ?? data.maintenance_mode));
                    }

                    setBranding(prev => ({
                        ...prev,
                        storeName: data.store_name ?? prev.storeName,
                        tagline: data.tagline ?? prev.tagline,
                        primaryColor: data.primary_color ?? prev.primaryColor,
                        accentColor: data.accent_color ?? prev.accentColor,
                        theme: data.theme_name ? data.theme_name.replace('_', '-') : prev.theme,
                        logo: data.logo_url ?? prev.logo,
                        banner: data.banner_url ?? prev.banner,
                        favicon: data.favicon_url ?? prev.favicon,
                    }));

                    setSeo(prev => ({
                        ...prev,
                        domain: data.default_store_url ?? prev.domain,
                        customDomain: data.custom_domain ?? prev.customDomain,
                        metaTitle: data.meta_title ?? prev.metaTitle,
                        metaDescription: data.meta_description ?? prev.metaDescription,
                        keywords: data.meta_keywords || data.keywords || prev.keywords,
                        urlSlug: data.url_slug ?? prev.urlSlug,
                        googleAnalytics: data.google_analytics_id ?? prev.googleAnalytics,
                        facebookPixel: data.facebook_pixel_id ?? prev.facebookPixel,
                        ogImage: data.og_image_url ?? prev.ogImage,
                    }));

                    setPages(prev => ({
                        ...prev,
                        aboutUs: data.about_us ?? prev.aboutUs,
                        contactUs: data.contact_us ?? prev.contactUs,
                        privacyPolicy: data.privacy_policy ?? prev.privacyPolicy,
                        termsConditions: data.terms_and_conditions || data.terms_conditions || prev.termsConditions,
                        shippingPolicy: data.shipping_policy ?? prev.shippingPolicy,
                        returnPolicy: data.return_policy ?? prev.returnPolicy,
                        refundPolicy: data.refund_policy || data.return_policy || prev.refundPolicy,
                    }));

                    setContact(prev => ({
                        ...prev,
                        email: data.contact_email ?? prev.email,
                        phone: data.contact_phone ?? prev.phone,
                        whatsapp: data.whatsapp_number ?? prev.whatsapp,
                        address: data.address ?? prev.address,
                        instagram: data.instagram_url ?? prev.instagram,
                        facebook: data.facebook_url ?? prev.facebook,
                        twitter: data.twitter_url ?? prev.twitter,
                        youtube: data.youtube_url ?? prev.youtube,
                    }));

                    setAdvancedSettings(prev => ({
                        ...prev,
                        reviews: data.enable_product_reviews !== undefined ? Boolean(data.enable_product_reviews) : prev.reviews,
                        showOos: data.show_out_of_stock !== undefined ? Boolean(data.show_out_of_stock) : prev.showOos,
                        guestCheckout: data.guest_checkout !== undefined ? Boolean(data.guest_checkout) : prev.guestCheckout,
                        wishlist: data.wishlist_enabled !== undefined ? Boolean(data.wishlist_enabled) : prev.wishlist,
                        autoSync: data.auto_sync_inventory !== undefined ? Boolean(data.auto_sync_inventory) : prev.autoSync,
                        coupons: data.enable_coupons !== undefined ? Boolean(data.enable_coupons) : prev.coupons,
                        gstInvoice: data.gst_invoice_enabled !== undefined ? Boolean(data.gst_invoice_enabled) : prev.gstInvoice,
                        customCss: data.custom_css ?? prev.customCss,
                        customJs: data.custom_js ?? prev.customJs,
                    }));

                    setApiSynced(true);
                }
            } catch (err) {
                console.warn('Storefront settings fetch error:', err?.message);
                if (active) {
                    setApiError(err?.message || 'Notice: Using local defaults');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchSettings();
        fetchSeoDomainData();
        fetchPagesData();
        fetchContactSocialData();
        fetchAdvancedData();
        fetchPublicProfile();
        return () => { active = false; };
    }, []);

    // Re-fetch tab data when switching tabs
    useEffect(() => {
        if (activeTab === 'SEO & Domain') {
            fetchSeoDomainData();
        } else if (activeTab === 'Store Pages') {
            fetchPagesData();
        } else if (activeTab === 'Contact & Social') {
            fetchContactSocialData();
        } else if (activeTab === 'Advanced') {
            fetchAdvancedData();
        } else if (activeTab === 'Public Storefront') {
            fetchPublicProfile();
        }
    }, [activeTab]);

    // Upload Media Asset via POST /api/v1/ecommerce/storefront/upload-asset
    const handleFileUpload = async (assetType, file) => {
        if (!file) return;
        setUploadingAsset(prev => ({ ...prev, [assetType]: true }));
        setUploadFeedback(null);

        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const resData = await uploadStorefrontAsset({
                asset_type: assetType,
                file,
                store_id: storeId
            });

            const newUrl = resData?.url || resData?.logo_url || resData?.banner_url || resData?.favicon_url || resData?.og_image_url;
            if (newUrl) {
                if (assetType === 'logo') {
                    setBranding(prev => ({ ...prev, logo: newUrl }));
                } else if (assetType === 'banner') {
                    setBranding(prev => ({ ...prev, banner: newUrl }));
                } else if (assetType === 'favicon') {
                    setBranding(prev => ({ ...prev, favicon: newUrl }));
                } else if (assetType === 'og_image') {
                    setSeo(prev => ({ ...prev, ogImage: newUrl }));
                }
            }

            const successMsg = resData?.message || `✓ ${assetType.charAt(0).toUpperCase() + assetType.slice(1)} uploaded and updated successfully via POST /api/v1/ecommerce/storefront/upload-asset`;
            setUploadFeedback({ type: 'success', message: successMsg });
            setTimeout(() => setUploadFeedback(null), 4000);
        } catch (err) {
            console.error(`Failed to upload ${assetType}:`, err);
            const errMsg = err?.response?.data?.message || err?.message || `Failed to upload ${assetType} via POST /api/v1/ecommerce/storefront/upload-asset`;
            setUploadFeedback({ type: 'error', message: errMsg });
            setTimeout(() => setUploadFeedback(null), 5000);
        } finally {
            setUploadingAsset(prev => ({ ...prev, [assetType]: false }));
        }
    };

    // Toggle Store Online Switch via PATCH /api/v1/ecommerce/storefront/toggle-status
    const handleToggleStoreStatus = async () => {
        if (togglingStatus) return;
        const nextStatus = !storeActive;
        setTogglingStatus(true);
        setToggleStatusMsg(null);
        setToggleStatusError(null);
        // Optimistic UI update
        setStoreActive(nextStatus);

        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const resData = await toggleStorefrontStatus(nextStatus, { store_id: storeId });

            if (resData && typeof resData === 'object') {
                if (resData.is_online !== undefined) {
                    setStoreActive(Boolean(resData.is_online));
                }
                if (resData.store_name) {
                    setBranding(prev => ({ ...prev, storeName: resData.store_name }));
                }
            }

            const successText = nextStatus
                ? '✓ Storefront is now ONLINE via PATCH /api/v1/ecommerce/storefront/toggle-status'
                : '✓ Storefront is now OFFLINE via PATCH /api/v1/ecommerce/storefront/toggle-status';
            setToggleStatusMsg(successText);
            setTimeout(() => setToggleStatusMsg(null), 3500);
        } catch (err) {
            console.error('Failed to toggle store online switch:', err);
            // Revert state on error
            setStoreActive(!nextStatus);
            const errText = err?.response?.data?.message || err?.message || 'Failed to toggle store status via PATCH';
            setToggleStatusError(errText);
            setTimeout(() => setToggleStatusError(null), 4500);
        } finally {
            setTogglingStatus(false);
        }
    };

    // Save Store Management Settings changes via PUT /api/v1/ecommerce/storefront/settings & sub-routes
    const handleSave = async () => {
        setSaving(true);
        setSaveSuccessMsg(null);
        setSaveErrorMsg(null);
        try {
            let savedUser = {};
            try {
                savedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
            } catch (_) {}
            const storeId = savedUser?.store_id || savedUser?.storeId || 1;

            const payload = {
                is_online: Boolean(storeActive),

                store_name: branding.storeName || '',
                tagline: branding.tagline || '',
                logo_url: branding.logo || '',
                banner_url: branding.banner || '',
                favicon_url: branding.favicon || '',
                primary_color: branding.primaryColor || '#1E3A8A',
                accent_color: branding.accentColor || '#10B981',
                theme_name: branding.theme ? branding.theme.replace('-', '_') : 'modern_light',

                default_store_url: seo.domain || '',
                custom_domain: seo.customDomain || '',
                url_slug: seo.urlSlug || '',
                meta_title: seo.metaTitle || '',
                meta_description: seo.metaDescription || '',
                keywords: seo.keywords || '',
                meta_keywords: seo.keywords || '',
                google_analytics_id: seo.googleAnalytics || '',
                facebook_pixel_id: seo.facebookPixel || '',
                og_image_url: seo.ogImage || '',

                about_us: pages.aboutUs || '',
                contact_us: pages.contactUs || '',
                privacy_policy: pages.privacyPolicy || '',
                terms_conditions: pages.termsConditions || '',
                terms_and_conditions: pages.termsConditions || '',
                shipping_policy: pages.shippingPolicy || '',
                return_policy: pages.returnPolicy || '',
                refund_policy: pages.refundPolicy || pages.returnPolicy || '',

                contact_email: contact.email || '',
                contact_phone: contact.phone || '',
                whatsapp_number: contact.whatsapp || '',
                address: contact.address || '',
                instagram_url: contact.instagram || '',
                facebook_url: contact.facebook || '',
                twitter_url: contact.twitter || '',
                youtube_url: contact.youtube || '',

                enable_product_reviews: Boolean(advancedSettings.reviews),
                show_out_of_stock: Boolean(advancedSettings.showOos),
                guest_checkout: Boolean(advancedSettings.guestCheckout),
                wishlist_enabled: Boolean(advancedSettings.wishlist),
                auto_sync_inventory: Boolean(advancedSettings.autoSync),
                enable_coupons: Boolean(advancedSettings.coupons),
                gst_invoice_enabled: Boolean(advancedSettings.gstInvoice),
                is_maintenance_mode: Boolean(maintenanceMode),
                maintenance_mode: Boolean(maintenanceMode),

                custom_css: advancedSettings.customCss || '',
                custom_js: advancedSettings.customJs || '',
            };

            // If user is currently managing SEO & Domain, also invoke updateStorefrontSeoDomain
            if (activeTab === 'SEO & Domain') {
                try {
                    await updateStorefrontSeoDomain({
                        custom_domain: seo.customDomain || null,
                        url_slug: seo.urlSlug || '',
                        meta_title: seo.metaTitle || '',
                        meta_description: seo.metaDescription || '',
                        keywords: seo.keywords || '',
                        google_analytics_id: seo.googleAnalytics || null,
                    }, { store_id: storeId });
                } catch (eSeo) {
                    console.warn('SEO Domain PUT sync handled:', eSeo?.message);
                }
            } else if (activeTab === 'Store Pages') {
                try {
                    await updateStorefrontPages({
                        about_us: pages.aboutUs || '',
                        contact_us: pages.contactUs || '',
                        privacy_policy: pages.privacyPolicy || '',
                        terms_conditions: pages.termsConditions || '',
                        terms_and_conditions: pages.termsConditions || '',
                        return_policy: pages.returnPolicy || '',
                        refund_policy: pages.refundPolicy || pages.returnPolicy || '',
                    }, { store_id: storeId });
                } catch (ePages) {
                    console.warn('Store Pages PUT sync handled:', ePages?.message);
                }
            } else if (activeTab === 'Contact & Social') {
                try {
                    await updateStorefrontContactSocial({
                        contact_email: contact.email || '',
                        contact_phone: contact.phone || '',
                        whatsapp_number: contact.whatsapp || '',
                        address: contact.address || '',
                        instagram_url: contact.instagram || '',
                        facebook_url: contact.facebook || '',
                        twitter_url: contact.twitter || '',
                        youtube_url: contact.youtube || '',
                    }, { store_id: storeId });
                } catch (eContact) {
                    console.warn('Contact Social PUT sync handled:', eContact?.message);
                }
            } else if (activeTab === 'Advanced') {
                try {
                    await updateStorefrontAdvanced({
                        enable_product_reviews: Boolean(advancedSettings.reviews),
                        show_out_of_stock: Boolean(advancedSettings.showOos),
                        guest_checkout: Boolean(advancedSettings.guestCheckout),
                        wishlist_enabled: Boolean(advancedSettings.wishlist),
                        auto_sync_inventory: Boolean(advancedSettings.autoSync),
                        enable_coupons: Boolean(advancedSettings.coupons),
                        gst_invoice_enabled: Boolean(advancedSettings.gstInvoice),
                        is_maintenance_mode: Boolean(maintenanceMode),
                        maintenance_mode: Boolean(maintenanceMode),
                    }, { store_id: storeId });
                } catch (eAdv) {
                    console.warn('Advanced PUT sync handled:', eAdv?.message);
                }
            }

            const resData = await updateStorefrontSettings(payload, { store_id: storeId });

            if (resData && typeof resData === 'object') {
                if (resData.is_online !== undefined) setStoreActive(Boolean(resData.is_online));
                if (resData.is_maintenance_mode !== undefined || resData.maintenance_mode !== undefined) {
                    setMaintenanceMode(Boolean(resData.is_maintenance_mode ?? resData.maintenance_mode));
                }
                if (resData.store_name) setBranding(prev => ({ ...prev, storeName: resData.store_name }));
                if (resData.tagline) setBranding(prev => ({ ...prev, tagline: resData.tagline }));
                if (resData.logo_url) setBranding(prev => ({ ...prev, logo: resData.logo_url }));
                if (resData.banner_url) setBranding(prev => ({ ...prev, banner: resData.banner_url }));
                if (resData.favicon_url) setBranding(prev => ({ ...prev, favicon: resData.favicon_url }));
                if (resData.primary_color) setBranding(prev => ({ ...prev, primaryColor: resData.primary_color }));
                if (resData.accent_color) setBranding(prev => ({ ...prev, accentColor: resData.accent_color }));
                if (resData.theme_name) setBranding(prev => ({ ...prev, theme: resData.theme_name.replace('_', '-') }));
            }

            setSaved(true);
            setSaveSuccessMsg('✓ Settings saved successfully to PUT /api/v1/ecommerce/storefront/settings');
            setTimeout(() => {
                setSaved(false);
                setSaveSuccessMsg(null);
            }, 3500);
        } catch (err) {
            console.error('Storefront save error:', err);
            const errText = err?.response?.data?.message || err?.message || 'Error saving storefront settings via PUT';
            setSaveErrorMsg(errText);
            setTimeout(() => setSaveErrorMsg(null), 5000);
        } finally {
            setSaving(false);
        }
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h1 className="adm-page-title" style={{ margin: 0 }}>🏪 Storefront Settings</h1>
                        <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: 12,
                            background: apiSynced ? '#ecfdf5' : (apiError ? '#fffbeb' : '#f0f9ff'),
                            color: apiSynced ? '#059669' : (apiError ? '#b45309' : '#0284c7'),
                            border: `1px solid ${apiSynced ? '#a7f3d0' : (apiError ? '#fde68a' : '#bae6fd')}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: apiSynced ? '#10b981' : (apiError ? '#f59e0b' : '#0ea5e9')
                            }} />
                            {loading
                                ? 'Fetching GET /api/v1/ecommerce/storefront/settings...'
                                : (apiSynced
                                    ? 'API Synced (/api/v1/ecommerce/storefront/settings)'
                                    : 'Default Store Settings')}
                        </span>
                    </div>
                    <p className="adm-page-sub" style={{ margin: '4px 0 0 0' }}>
                        Configure branding, SEO, pages, contact info, and advanced store settings
                    </p>
                </div>
                <div className="adm-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {/* Toggle Store Online Switch (Store Online) -> PATCH /api/v1/ecommerce/storefront/toggle-status */}
                    <div
                        className="ec-toggle-wrap"
                        onClick={handleToggleStoreStatus}
                        title="Toggle Store Online Switch (PATCH /api/v1/ecommerce/storefront/toggle-status)"
                        style={{
                            cursor: togglingStatus ? 'wait' : 'pointer',
                            opacity: togglingStatus ? 0.7 : 1,
                            userSelect: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {storeActive ? <BsToggleOn size={26} color="#10b981" /> : <BsToggleOff size={26} color="#d1d5db" />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: storeActive ? '#10b981' : '#9ca3af' }}>
                            {togglingStatus ? 'Updating (PATCH)...' : `Store ${storeActive ? 'Online' : 'Offline'}`}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="adm-btn-secondary"
                        onClick={() => {
                            setActiveTab('Public Storefront');
                            fetchPublicProfile();
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
                        title="View Public Storefront Profile (GET /api/v1/ecommerce/storefront/public)"
                    >
                        <BsEye size={14} />
                        Public Profile
                    </button>
                    <button className="adm-btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <BsSave size={14} />
                        {saving ? 'Saving (PUT)...' : (saved ? '✓ Saved!' : 'Save Changes')}
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {uploadFeedback && (
                <div style={{
                    background: uploadFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: uploadFeedback.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${uploadFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600
                }}>
                    {uploadFeedback.type === 'success' ? (
                        <BsCheckCircleFill size={16} color="#10b981" />
                    ) : (
                        <BsExclamationTriangleFill size={16} color="#ef4444" />
                    )}
                    <span>{uploadFeedback.message}</span>
                </div>
            )}
            {toggleStatusMsg && (
                <div style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600
                }}>
                    <BsCheckCircleFill size={16} color="#10b981" />
                    <span>{toggleStatusMsg}</span>
                </div>
            )}
            {toggleStatusError && (
                <div style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600
                }}>
                    <BsExclamationTriangleFill size={16} color="#ef4444" />
                    <span>{toggleStatusError}</span>
                </div>
            )}
            {saveSuccessMsg && (
                <div style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600
                }}>
                    <BsCheckCircleFill size={16} color="#10b981" />
                    <span>{saveSuccessMsg}</span>
                </div>
            )}
            {saveErrorMsg && (
                <div style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600
                }}>
                    <BsExclamationTriangleFill size={16} color="#ef4444" />
                    <span>{saveErrorMsg}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="ec-tabs">
                {tabs.map(tab => (
                    <button key={tab} className={`ec-tab-btn ${activeTab === tab ? 'ec-tab-btn--active' : ''}`}
                        onClick={() => {
                            setActiveTab(tab);
                            if (tab === 'SEO & Domain') {
                                fetchSeoDomainData();
                            } else if (tab === 'Store Pages') {
                                fetchPagesData();
                            }
                        }}>
                        {tab === 'Branding' && <BsPalette size={13} />}
                        {tab === 'SEO & Domain' && <BsSearch size={13} />}
                        {tab === 'Store Pages' && <BsFileText size={13} />}
                        {tab === 'Contact & Social' && <BsEnvelope size={13} />}
                        {tab === 'Advanced' && <BsGlobe size={13} />}
                        {tab === 'Public Storefront' && <BsEye size={13} />}
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

                        {/* Media Assets (Store Logo, Store Banner, Favicon) -> POST /api/v1/ecommerce/storefront/upload-asset */}
                        <div className="ec-form-card">
                            <div className="ec-form-card-header">
                                <BsImage size={16} color="#6366f1" />
                                <div>
                                    <h3 style={{ margin: 0 }}>Media Assets</h3>
                                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                                        POST /api/v1/ecommerce/storefront/upload-asset
                                    </span>
                                </div>
                            </div>
                            {[
                                {
                                    label: 'Store Logo',
                                    hint: 'PNG, JPG, SVG, WEBP (200×60px recommended)',
                                    key: 'logo',
                                    assetType: 'logo',
                                    placeholder: '/uploads/storefront/logo_sample.png',
                                    accept: 'image/png,image/jpeg,image/svg+xml,image/webp'
                                },
                                {
                                    label: 'Store Banner',
                                    hint: 'JPEG, PNG, WEBP (1440×480px recommended)',
                                    key: 'banner',
                                    assetType: 'banner',
                                    placeholder: '/uploads/storefront/banner_sample.png',
                                    accept: 'image/jpeg,image/png,image/webp'
                                },
                                {
                                    label: 'Favicon',
                                    hint: 'ICO, PNG, SVG (32×32px)',
                                    key: 'favicon',
                                    assetType: 'favicon',
                                    placeholder: '/uploads/storefront/favicon_sample.ico',
                                    accept: '.ico,image/x-icon,image/png,image/svg+xml'
                                },
                            ].map(f => (
                                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, background: '#f9fafb', padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                                    <div className="ec-upload-row" style={{ alignItems: 'center', margin: 0 }}>
                                        <div className="ec-upload-preview" style={{ width: 48, height: 48, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #d1d5db', position: 'relative' }}>
                                            {branding[f.key] ? (
                                                <img
                                                    src={getAssetPreviewUrl(branding[f.key])}
                                                    alt={f.label}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        if (e.currentTarget.src !== branding[f.key]) {
                                                            e.currentTarget.src = branding[f.key];
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <BsImage size={22} color="#9ca3af" />
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 150 }}>
                                            <p style={{ fontWeight: 600, fontSize: 13, color: '#374151', margin: 0 }}>{f.label}</p>
                                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, margin: 0 }}>{f.hint}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <label className="adm-btn-secondary" style={{
                                                cursor: uploadingAsset[f.assetType] ? 'wait' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '6px 12px',
                                                fontSize: 12,
                                                opacity: uploadingAsset[f.assetType] ? 0.7 : 1
                                            }}>
                                                <BsUpload size={12} />
                                                {uploadingAsset[f.assetType] ? 'Uploading...' : 'Upload File'}
                                                <input
                                                    type="file"
                                                    accept={f.accept}
                                                    disabled={uploadingAsset[f.assetType]}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleFileUpload(f.assetType, file);
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                            {branding[f.key] && (
                                                <button
                                                    type="button"
                                                    className="adm-btn-secondary"
                                                    title={`Clear ${f.label}`}
                                                    onClick={() => setBranding({ ...branding, [f.key]: '' })}
                                                    style={{ padding: '6px 10px', color: '#ef4444' }}
                                                >
                                                    <BsTrash size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ec-field" style={{ margin: 0 }}>
                                        <input
                                            className="ec-input"
                                            placeholder={f.placeholder}
                                            value={branding[f.key]}
                                            onChange={e => setBranding({ ...branding, [f.key]: e.target.value })}
                                            style={{ fontSize: 12, background: '#fff' }}
                                        />
                                    </div>
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

                {/* === SEO & DOMAIN (GET & PUT /api/v1/ecommerce/storefront/seo-domain) === */}
                {activeTab === 'SEO & Domain' && (
                    <>
                        {/* SEO Domain Feedback Alerts */}
                        {seoSaveSuccessMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsCheckCircleFill size={16} color="#10b981" />
                                <span>{seoSaveSuccessMsg}</span>
                            </div>
                        )}
                        {seoSaveErrorMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#fef2f2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsExclamationTriangleFill size={16} color="#ef4444" />
                                <span>{seoSaveErrorMsg}</span>
                            </div>
                        )}

                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsGlobe size={16} color="#6366f1" />
                                    <h3 style={{ margin: 0 }}>Domain Settings</h3>
                                </div>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: 12,
                                    background: seoApiSynced ? '#ecfdf5' : (seoApiError ? '#fffbeb' : '#f0f9ff'),
                                    color: seoApiSynced ? '#059669' : (seoApiError ? '#b45309' : '#0284c7'),
                                    border: `1px solid ${seoApiSynced ? '#a7f3d0' : (seoApiError ? '#fde68a' : '#bae6fd')}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <span style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: seoApiSynced ? '#10b981' : (seoApiError ? '#f59e0b' : '#0ea5e9')
                                    }} />
                                    {seoLoading
                                        ? 'Fetching GET /api/v1/ecommerce/storefront/seo-domain...'
                                        : (seoApiSynced
                                            ? 'API Synced (/api/v1/ecommerce/storefront/seo-domain)'
                                            : 'Default Domain Settings')}
                                </span>
                            </div>
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
                                <input className="ec-input" placeholder="shop.myretailstore.com" value={seo.customDomain}
                                    onChange={e => setSeo({ ...seo, customDomain: e.target.value })} />
                                <p className="ec-field-hint">Add a CNAME record pointing to retailos.in to activate your custom domain.</p>
                            </div>
                        </div>

                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsSearch size={16} color="#6366f1" />
                                    <h3 style={{ margin: 0 }}>SEO Metadata & Analytics Tracking</h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                                        PUT /api/v1/ecommerce/storefront/seo-domain
                                    </span>
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        onClick={handleSaveSeoDomain}
                                        disabled={savingSeo}
                                        style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <BsSave size={12} />
                                        {savingSeo ? 'Saving (PUT)...' : 'Save SEO & Domain'}
                                    </button>
                                </div>
                            </div>
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
                                <label>Keywords / Meta Keywords</label>
                                <input className="ec-input" value={seo.keywords} onChange={e => setSeo({ ...seo, keywords: e.target.value })} />
                            </div>
                            <div className="ec-form-row">
                                <div className="ec-field">
                                    <label>Google Analytics ID</label>
                                    <input className="ec-input" placeholder="G-9X7Y8Z1234" value={seo.googleAnalytics}
                                        onChange={e => setSeo({ ...seo, googleAnalytics: e.target.value })} />
                                </div>
                                <div className="ec-field">
                                    <label>Facebook Pixel ID</label>
                                    <input className="ec-input" placeholder="123456789012345" value={seo.facebookPixel}
                                        onChange={e => setSeo({ ...seo, facebookPixel: e.target.value })} />
                                </div>
                            </div>

                            {/* OpenGraph Image Upload */}
                            <div style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                                <div className="ec-upload-row" style={{ alignItems: 'center', margin: 0 }}>
                                    <div className="ec-upload-preview" style={{ width: 48, height: 48, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                                        {seo.ogImage ? (
                                            <img
                                                src={getAssetPreviewUrl(seo.ogImage)}
                                                alt="Social Share"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                onError={(e) => {
                                                    if (e.currentTarget.src !== seo.ogImage) {
                                                        e.currentTarget.src = seo.ogImage;
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <BsGlobe size={22} color="#9ca3af" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 150 }}>
                                        <p style={{ fontWeight: 600, fontSize: 13, color: '#374151', margin: 0 }}>Social Share Image (OG Image)</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, margin: 0 }}>JPEG/PNG, 1200×630px recommended for Facebook/Twitter share cards</p>
                                    </div>
                                    <label className="adm-btn-secondary" style={{
                                        cursor: uploadingAsset.og_image ? 'wait' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 12px',
                                        fontSize: 12,
                                        opacity: uploadingAsset.og_image ? 0.7 : 1
                                    }}>
                                        <BsUpload size={12} />
                                        {uploadingAsset.og_image ? 'Uploading...' : 'Upload File'}
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            disabled={uploadingAsset.og_image}
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleFileUpload('og_image', file);
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className="ec-field" style={{ margin: '8px 0 0 0' }}>
                                    <input
                                        className="ec-input"
                                        placeholder="/uploads/storefront/og_image_sample.png"
                                        value={seo.ogImage}
                                        onChange={e => setSeo({ ...seo, ogImage: e.target.value })}
                                        style={{ fontSize: 12, background: '#fff' }}
                                    />
                                </div>
                            </div>

                            {/* Direct Save Button inside SEO Card */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button
                                    type="button"
                                    className="adm-btn-primary"
                                    onClick={handleSaveSeoDomain}
                                    disabled={savingSeo}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                                >
                                    <BsSave size={14} />
                                    {savingSeo ? 'Saving (PUT /seo-domain)...' : 'Save SEO & Domain Settings'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* === STORE PAGES (GET & PUT /api/v1/ecommerce/storefront/pages) === */}
                {activeTab === 'Store Pages' && (
                    <>
                        {/* Store Pages Feedback Alerts */}
                        {pagesSaveSuccessMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsCheckCircleFill size={16} color="#10b981" />
                                <span>{pagesSaveSuccessMsg}</span>
                            </div>
                        )}
                        {pagesSaveErrorMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#fef2f2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsExclamationTriangleFill size={16} color="#ef4444" />
                                <span>{pagesSaveErrorMsg}</span>
                            </div>
                        )}

                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsFileText size={16} color="#6366f1" />
                                    <div>
                                        <h3 style={{ margin: 0 }}>Store Pages Content</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                            About Us, Contact Us, Privacy Policy, Terms, Return & Refund Policies
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 9px',
                                        borderRadius: 12,
                                        background: pagesApiSynced ? '#ecfdf5' : (pagesApiError ? '#fffbeb' : '#f0f9ff'),
                                        color: pagesApiSynced ? '#059669' : (pagesApiError ? '#b45309' : '#0284c7'),
                                        border: `1px solid ${pagesApiSynced ? '#a7f3d0' : (pagesApiError ? '#fde68a' : '#bae6fd')}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: pagesApiSynced ? '#10b981' : (pagesApiError ? '#f59e0b' : '#0ea5e9')
                                        }} />
                                        {pagesLoading
                                            ? 'Fetching GET /api/v1/ecommerce/storefront/pages...'
                                            : (pagesApiSynced
                                                ? 'API Synced (/api/v1/ecommerce/storefront/pages)'
                                                : 'Default Store Pages')}
                                    </span>
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        onClick={handleSavePages}
                                        disabled={savingPages}
                                        style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <BsSave size={12} />
                                        {savingPages ? 'Saving (PUT)...' : 'Save Pages'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {[
                            { label: 'About Us', key: 'aboutUs', icon: '📋' },
                            { label: 'Contact Us', key: 'contactUs', icon: '📞' },
                            { label: 'Privacy Policy', key: 'privacyPolicy', icon: '🔒' },
                            { label: 'Terms & Conditions (terms_conditions / terms_and_conditions)', key: 'termsConditions', icon: '📄' },
                            { label: 'Return Policy (return_policy)', key: 'returnPolicy', icon: '🔄' },
                            { label: 'Refund Policy (refund_policy)', key: 'refundPolicy', icon: '💳' },
                            { label: 'Shipping Policy', key: 'shippingPolicy', icon: '🚚' },
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

                        {/* Direct Save Button inside Pages Card */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button
                                type="button"
                                className="adm-btn-primary"
                                onClick={handleSavePages}
                                disabled={savingPages}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                            >
                                <BsSave size={14} />
                                {savingPages ? 'Saving (PUT /pages)...' : 'Save Store Pages Tab Data'}
                            </button>
                        </div>
                    </>
                )}

                {/* === CONTACT & SOCIAL (GET & PUT /api/v1/ecommerce/storefront/contact-social) === */}
                {activeTab === 'Contact & Social' && (
                    <>
                        {/* Feedback Alerts */}
                        {contactSaveSuccessMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsCheckCircleFill size={16} color="#10b981" />
                                <span>{contactSaveSuccessMsg}</span>
                            </div>
                        )}
                        {contactSaveErrorMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#fef2f2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsExclamationTriangleFill size={16} color="#ef4444" />
                                <span>{contactSaveErrorMsg}</span>
                            </div>
                        )}

                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsPhone size={16} color="#6366f1" />
                                    <div>
                                        <h3 style={{ margin: 0 }}>Contact & Social Media Links</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                            Configure customer support channels, phone, WhatsApp, and social profiles
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 9px',
                                        borderRadius: 12,
                                        background: contactApiSynced ? '#ecfdf5' : (contactApiError ? '#fffbeb' : '#f0f9ff'),
                                        color: contactApiSynced ? '#059669' : (contactApiError ? '#b45309' : '#0284c7'),
                                        border: `1px solid ${contactApiSynced ? '#a7f3d0' : (contactApiError ? '#fde68a' : '#bae6fd')}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: contactApiSynced ? '#10b981' : (contactApiError ? '#f59e0b' : '#0ea5e9')
                                        }} />
                                        {contactLoading
                                            ? 'Fetching GET /api/v1/ecommerce/storefront/contact-social...'
                                            : (contactApiSynced
                                                ? 'API Synced (/api/v1/ecommerce/storefront/contact-social)'
                                                : 'Default Contact & Social')}
                                    </span>
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        onClick={handleSaveContactSocial}
                                        disabled={savingContact}
                                        style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <BsSave size={12} />
                                        {savingContact ? 'Saving (PUT)...' : 'Save Contact & Social'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="ec-form-card">
                            <div className="ec-form-card-header"><BsPhone size={16} color="#6366f1" /><h3>Contact Information</h3></div>
                            {[
                                { label: 'Contact Email (contact_email)', key: 'email', placeholder: 'support@retailos-shop.in' },
                                { label: 'Phone Number (contact_phone)', key: 'phone', placeholder: '+91 98765 43210' },
                                { label: 'WhatsApp Number (whatsapp_number)', key: 'whatsapp', placeholder: '+91 98765 43210' },
                                { label: 'Store Address (address)', key: 'address', placeholder: '123 MG Road, Bangalore, KA 560001' },
                            ].map(f => (
                                <div key={f.key} className="ec-field">
                                    <label>{f.label}</label>
                                    <input className="ec-input" placeholder={f.placeholder} value={contact[f.key] || ''}
                                        onChange={e => setContact({ ...contact, [f.key]: e.target.value })} />
                                </div>
                            ))}
                        </div>

                        <div className="ec-form-card">
                            <div className="ec-form-card-header"><BsGlobe size={16} color="#6366f1" /><h3>Social Media Links</h3></div>
                            {[
                                { label: 'Instagram Handle/URL (instagram_url)', key: 'instagram', placeholder: '@retailos_shop' },
                                { label: 'Facebook Page/URL (facebook_url)', key: 'facebook', placeholder: 'facebook.com/retailos' },
                                { label: 'Twitter / X Handle (twitter_url)', key: 'twitter', placeholder: '@retailos' },
                                { label: 'YouTube Channel/URL (youtube_url)', key: 'youtube', placeholder: 'https://youtube.com/@yourstore' },
                            ].map(f => (
                                <div key={f.key} className="ec-field">
                                    <label>{f.label}</label>
                                    <input className="ec-input" placeholder={f.placeholder} value={contact[f.key] || ''}
                                        onChange={e => setContact({ ...contact, [f.key]: e.target.value })} />
                                </div>
                            ))}
                        </div>

                        {/* Direct Save Button inside Contact tab */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button
                                type="button"
                                className="adm-btn-primary"
                                onClick={handleSaveContactSocial}
                                disabled={savingContact}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                            >
                                <BsSave size={14} />
                                {savingContact ? 'Saving (PUT /contact-social)...' : 'Save Contact & Social Tab Data'}
                            </button>
                        </div>
                    </>
                )}

                {/* === ADVANCED (GET & PUT /api/v1/ecommerce/storefront/advanced - 7 Toggles) === */}
                {activeTab === 'Advanced' && (
                    <>
                        {/* Feedback Alerts */}
                        {advancedSaveSuccessMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsCheckCircleFill size={16} color="#10b981" />
                                <span>{advancedSaveSuccessMsg}</span>
                            </div>
                        )}
                        {advancedSaveErrorMsg && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#fef2f2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsExclamationTriangleFill size={16} color="#ef4444" />
                                <span>{advancedSaveErrorMsg}</span>
                            </div>
                        )}

                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsInfoCircle size={16} color="#6366f1" />
                                    <div>
                                        <h3 style={{ margin: 0 }}>Advanced Feature Switches (7 Toggles)</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                            Store operational controls, inventory auto-sync, reviews, and checkout options
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '3px 9px',
                                        borderRadius: 12,
                                        background: advancedApiSynced ? '#ecfdf5' : (advancedApiError ? '#fffbeb' : '#f0f9ff'),
                                        color: advancedApiSynced ? '#059669' : (advancedApiError ? '#b45309' : '#0284c7'),
                                        border: `1px solid ${advancedApiSynced ? '#a7f3d0' : (advancedApiError ? '#fde68a' : '#bae6fd')}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: advancedApiSynced ? '#10b981' : (advancedApiError ? '#f59e0b' : '#0ea5e9')
                                        }} />
                                        {advancedLoading
                                            ? 'Fetching GET /api/v1/ecommerce/storefront/advanced...'
                                            : (advancedApiSynced
                                                ? 'API Synced (/api/v1/ecommerce/storefront/advanced)'
                                                : 'Default Feature Switches')}
                                    </span>
                                    <button
                                        type="button"
                                        className="adm-btn-primary"
                                        onClick={handleSaveAdvanced}
                                        disabled={savingAdvanced}
                                        style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <BsSave size={12} />
                                        {savingAdvanced ? 'Saving (PUT)...' : 'Save Switches'}
                                    </button>
                                </div>
                            </div>

                            {/* Maintenance mode toggle */}
                            <div className="ec-toggle-row" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 14 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <BsShieldLock size={15} color={maintenanceMode ? '#f59e0b' : '#6b7280'} />
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Maintenance Mode (is_maintenance_mode)</p>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, margin: 0 }}>
                                        Temporarily show a maintenance screen to customers while you update your store catalog or configurations.
                                    </p>
                                </div>
                                <div onClick={() => setMaintenanceMode(!maintenanceMode)} style={{ cursor: 'pointer' }}>
                                    {maintenanceMode ? <BsToggleOn size={28} color="#f59e0b" /> : <BsToggleOff size={28} color="#d1d5db" />}
                                </div>
                            </div>

                            {[
                                { label: 'Enable Product Reviews (enable_product_reviews)', desc: 'Allow customers to leave ratings and reviews on products', key: 'reviews' },
                                { label: 'Show Out of Stock Products (show_out_of_stock)', desc: 'Display products with zero stock with an "Out of Stock" label', key: 'showOos' },
                                { label: 'Guest Checkout (guest_checkout)', desc: 'Allow customers to place orders without creating an account', key: 'guestCheckout' },
                                { label: 'Wishlist Feature (wishlist_enabled)', desc: 'Enable customers to save products for later purchase', key: 'wishlist' },
                                { label: 'Auto-sync Inventory (auto_sync_inventory)', desc: 'Automatically update online stock when POS sales are made', key: 'autoSync' },
                                { label: 'Enable Coupons (enable_coupons)', desc: 'Allow discount coupons and promo codes at checkout', key: 'coupons' },
                                { label: 'GST Invoice on Orders (gst_invoice_enabled)', desc: 'Automatically generate GST invoice for each online order', key: 'gstInvoice' },
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

                        {/* Custom CSS and JS */}
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header">
                                <BsCodeSlash size={16} color="#6366f1" />
                                <h3>Custom Scripts & Styles</h3>
                            </div>
                            <div className="ec-field" style={{ marginBottom: 14 }}>
                                <label>Custom CSS</label>
                                <textarea
                                    className="ec-textarea"
                                    rows={4}
                                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                                    placeholder="/* Custom storefront styling */"
                                    value={advancedSettings.customCss}
                                    onChange={e => setAdvancedSettings({ ...advancedSettings, customCss: e.target.value })}
                                />
                                <p className="ec-field-hint">Custom CSS injected into the storefront head tag.</p>
                            </div>
                            <div className="ec-field">
                                <label>Custom JavaScript</label>
                                <textarea
                                    className="ec-textarea"
                                    rows={4}
                                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                                    placeholder="// Custom analytics tracking code"
                                    value={advancedSettings.customJs}
                                    onChange={e => setAdvancedSettings({ ...advancedSettings, customJs: e.target.value })}
                                />
                                <p className="ec-field-hint">Custom JavaScript executed on the storefront for third-party trackers or tools.</p>
                            </div>
                        </div>

                        {/* Direct Save Button inside Advanced tab */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button
                                type="button"
                                className="adm-btn-primary"
                                onClick={handleSaveAdvanced}
                                disabled={savingAdvanced}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                            >
                                <BsSave size={14} />
                                {savingAdvanced ? 'Saving (PUT /advanced)...' : 'Save Advanced Feature Switches'}
                            </button>
                        </div>
                    </>
                )}

                {/* === PUBLIC STOREFRONT PROFILE (GET /api/v1/ecommerce/storefront/public) === */}
                {activeTab === 'Public Storefront' && (
                    <>
                        {/* Status Alert Banner if Error */}
                        {publicApiError && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '10px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                <BsExclamationTriangleFill size={16} color="#f59e0b" />
                                <span>Notice: {publicApiError}</span>
                            </div>
                        )}

                        {/* Query Controls Card */}
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsEye size={16} color="#6366f1" />
                                    <div>
                                        <h3 style={{ margin: 0 }}>Public Storefront Profile (Customer-Facing, No Auth)</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                                            GET /api/v1/ecommerce/storefront/public — Query customer-facing profile by store subdomain or store ID
                                        </p>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: 12,
                                    background: publicApiSynced ? '#ecfdf5' : (publicApiError ? '#fffbeb' : '#f0f9ff'),
                                    color: publicApiSynced ? '#059669' : (publicApiError ? '#b45309' : '#0284c7'),
                                    border: `1px solid ${publicApiSynced ? '#a7f3d0' : (publicApiError ? '#fde68a' : '#bae6fd')}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <span style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: publicApiSynced ? '#10b981' : (publicApiError ? '#f59e0b' : '#0ea5e9')
                                    }} />
                                    {publicLoading
                                        ? 'Fetching GET /api/v1/ecommerce/storefront/public...'
                                        : (publicApiSynced
                                            ? 'API Synced (/api/v1/ecommerce/storefront/public)'
                                            : 'Public Profile Defaults')}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                                <div className="ec-field" style={{ flex: '1 1 200px', margin: 0 }}>
                                    <label>Subdomain / Slug (query)</label>
                                    <input
                                        className="ec-input"
                                        placeholder="maharashtra-super-mart"
                                        value={subdomainQuery}
                                        onChange={(e) => setSubdomainQuery(e.target.value)}
                                    />
                                </div>
                                <div className="ec-field" style={{ flex: '1 1 120px', margin: 0 }}>
                                    <label>Store ID (query)</label>
                                    <input
                                        className="ec-input"
                                        type="number"
                                        placeholder="1"
                                        value={storeIdQuery}
                                        onChange={(e) => setStoreIdQuery(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="adm-btn-primary"
                                    disabled={publicLoading}
                                    onClick={() => fetchPublicProfile({ subdomain: subdomainQuery, store_id: storeIdQuery })}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px' }}
                                >
                                    <BsArrowRepeat size={14} />
                                    {publicLoading ? 'Fetching (GET)...' : 'Fetch Public Profile'}
                                </button>
                            </div>
                        </div>

                        {/* Customer-Facing Live Storefront Banner & Identity Preview */}
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div style={{
                                position: 'relative',
                                borderRadius: 10,
                                overflow: 'hidden',
                                border: '1px solid #e5e7eb',
                                background: publicProfile?.banner_url
                                    ? `url(${getAssetPreviewUrl(publicProfile.banner_url)}) center/cover no-repeat`
                                    : `linear-gradient(135deg, ${publicProfile?.primary_color || '#1E3A8A'} 0%, ${publicProfile?.accent_color || '#10B981'} 100%)`,
                                minHeight: 140,
                                padding: 20,
                                display: 'flex',
                                alignItems: 'flex-end',
                                color: '#fff'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: 12,
                                    padding: '12px 18px',
                                    backdropFilter: 'blur(8px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                    width: '100%',
                                    flexWrap: 'wrap'
                                }}>
                                    {publicProfile?.logo_url ? (
                                        <img
                                            src={getAssetPreviewUrl(publicProfile.logo_url)}
                                            alt="Store Logo"
                                            style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 8,
                                            background: '#f3f4f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#6366f1',
                                            fontWeight: 700,
                                            fontSize: 22
                                        }}>
                                            🏪
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                                {publicProfile?.store_name || branding.storeName}
                                            </h2>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                                background: publicProfile?.is_online ? '#ecfdf5' : '#fef2f2',
                                                color: publicProfile?.is_online ? '#065f46' : '#991b1b',
                                                border: `1px solid ${publicProfile?.is_online ? '#a7f3d0' : '#fecaca'}`
                                            }}>
                                                {publicProfile?.is_online ? '● Online' : '○ Offline'}
                                            </span>
                                            {publicProfile?.is_maintenance_mode && (
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 10,
                                                    background: '#fffbeb',
                                                    color: '#92400e',
                                                    border: '1px solid #fde68a'
                                                }}>
                                                    ⚠️ Maintenance Mode
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#4b5563' }}>
                                            {publicProfile?.tagline || branding.tagline}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#f3f4f6', color: '#374151', fontWeight: 500 }}>
                                            🌐 {publicProfile?.default_store_url || seo.domain}
                                        </span>
                                        {publicProfile?.custom_domain && (
                                            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#e0e7ff', color: '#4338ca', fontWeight: 500 }}>
                                                🔗 {publicProfile.custom_domain}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Support & Social Channels */}
                        <div className="ec-form-card">
                            <div className="ec-form-card-header">
                                <BsPhone size={16} color="#6366f1" />
                                <h3>Customer Contact Channels</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Support Email</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.contact_email || contact.email || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Support Phone</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.contact_phone || contact.phone || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>WhatsApp Channel</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.whatsapp_number || contact.whatsapp || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Physical Store Address</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.address || contact.address || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Social Links & SEO Meta */}
                        <div className="ec-form-card">
                            <div className="ec-form-card-header">
                                <BsGlobe size={16} color="#6366f1" />
                                <h3>Social Handles & SEO Metadata</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Instagram</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.instagram_url || contact.instagram || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Facebook</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.facebook_url || contact.facebook || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Twitter / X</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.twitter_url || contact.twitter || '—'}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Meta Title & Analytics</span>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                        {publicProfile?.meta_title || seo.metaTitle || '—'}
                                        {publicProfile?.google_analytics_id ? ` (${publicProfile.google_analytics_id})` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Store Pages Content Preview */}
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header">
                                <BsFileText size={16} color="#6366f1" />
                                <h3>Public Pages & Policy Information</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                                <div style={{ background: '#f9fafb', padding: 14, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#374151' }}>About Us</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                                        {publicProfile?.about_us || pages.aboutUs || '—'}
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: 14, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#374151' }}>Privacy Policy</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                                        {publicProfile?.privacy_policy || pages.privacyPolicy || '—'}
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: 14, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#374151' }}>Return & Refund Policy</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                                        {publicProfile?.return_policy || publicProfile?.refund_policy || pages.returnPolicy || '—'}
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: 14, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#374151' }}>Terms & Conditions</h4>
                                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                                        {publicProfile?.terms_conditions || publicProfile?.terms_and_conditions || pages.termsConditions || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Customer-Facing Feature Switches Status */}
                        <div className="ec-form-card" style={{ gridColumn: '1 / -1' }}>
                            <div className="ec-form-card-header">
                                <BsGlobe size={16} color="#6366f1" />
                                <h3>Customer-Facing Feature Switches Status</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                {[
                                    { label: 'Product Reviews', val: publicProfile?.enable_product_reviews ?? advancedSettings.reviews },
                                    { label: 'Out of Stock Items', val: publicProfile?.show_out_of_stock ?? advancedSettings.showOos },
                                    { label: 'Guest Checkout', val: publicProfile?.guest_checkout ?? advancedSettings.guestCheckout },
                                    { label: 'Wishlist Feature', val: publicProfile?.wishlist_enabled ?? advancedSettings.wishlist },
                                    { label: 'Inventory Auto-Sync', val: publicProfile?.auto_sync_inventory ?? advancedSettings.autoSync },
                                    { label: 'Coupons & Promo Codes', val: publicProfile?.enable_coupons ?? advancedSettings.coupons },
                                    { label: 'GST Invoice Generation', val: publicProfile?.gst_invoice_enabled ?? advancedSettings.gstInvoice },
                                ].map((sw, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: sw.val ? '#ecfdf5' : '#f9fafb',
                                        border: `1px solid ${sw.val ? '#a7f3d0' : '#e5e7eb'}`,
                                        borderRadius: 6
                                    }}>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{sw.label}</span>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: sw.val ? '#059669' : '#9ca3af'
                                        }}>
                                            {sw.val ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Save Bar */}
            <div style={{
                marginTop: 24,
                padding: '14px 20px',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsShopWindow size={16} color="#6366f1" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        {activeTab === 'SEO & Domain'
                            ? 'SEO & Domain Settings — Ready to sync'
                            : (activeTab === 'Store Pages'
                                ? 'Store Pages Content — Ready to sync'
                                : 'Storefront Settings — Ready to sync')}
                    </span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {activeTab === 'SEO & Domain'
                            ? '(PUT /api/v1/ecommerce/storefront/seo-domain)'
                            : (activeTab === 'Store Pages'
                                ? '(PUT /api/v1/ecommerce/storefront/pages)'
                                : '(PUT /api/v1/ecommerce/storefront/settings)')}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Secondary toggle switch in bottom bar */}
                    <div
                        className="ec-toggle-wrap"
                        onClick={handleToggleStoreStatus}
                        title="Toggle Store Online Switch (PATCH /api/v1/ecommerce/storefront/toggle-status)"
                        style={{
                            cursor: togglingStatus ? 'wait' : 'pointer',
                            opacity: togglingStatus ? 0.7 : 1,
                            userSelect: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {storeActive ? <BsToggleOn size={26} color="#10b981" /> : <BsToggleOff size={26} color="#d1d5db" />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: storeActive ? '#10b981' : '#9ca3af' }}>
                            {togglingStatus ? 'Updating (PATCH)...' : `Store ${storeActive ? 'Online' : 'Offline'}`}
                        </span>
                    </div>

                    {activeTab === 'SEO & Domain' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={handleSaveSeoDomain}
                            disabled={savingSeo}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                        >
                            <BsSave size={13} />
                            {savingSeo ? 'Saving SEO...' : 'Save SEO Tab'}
                        </button>
                    )}

                    {activeTab === 'Store Pages' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={handleSavePages}
                            disabled={savingPages}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                        >
                            <BsSave size={13} />
                            {savingPages ? 'Saving Pages...' : 'Save Pages Tab'}
                        </button>
                    )}

                    {activeTab === 'Contact & Social' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={handleSaveContactSocial}
                            disabled={savingContact}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                        >
                            <BsSave size={13} />
                            {savingContact ? 'Saving Contact...' : 'Save Contact Tab'}
                        </button>
                    )}

                    {activeTab === 'Advanced' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={handleSaveAdvanced}
                            disabled={savingAdvanced}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                        >
                            <BsSave size={13} />
                            {savingAdvanced ? 'Saving Switches...' : 'Save Switches Tab'}
                        </button>
                    )}

                    {activeTab === 'Public Storefront' && (
                        <button
                            type="button"
                            className="adm-btn-secondary"
                            onClick={() => fetchPublicProfile()}
                            disabled={publicLoading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                        >
                            <BsArrowRepeat size={13} className={publicLoading ? 'ec-spin' : ''} />
                            {publicLoading ? 'Fetching Public...' : 'Refresh Public Profile'}
                        </button>
                    )}

                    <button className="adm-btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <BsSave size={14} />
                        {saving ? 'Saving (PUT)...' : (saved ? '✓ Saved!' : 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoreManagement;
