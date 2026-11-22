export const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const normalizeApiList = (data) => {
    if (Array.isArray(data)) return data;
    return data?.data || data?.customers || data?.items || data?.results || [];
};

export const formatOrderDate = (dateStr) => {
    if (!dateStr) return 'No orders yet';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 'No orders yet';
    return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export const extractOrdersInfo = (ordersData) => {
    const orders = normalizeApiList(ordersData);
    if (orders.length === 0) {
        return { count: 0, lastOrder: 'No orders yet', orders: [] };
    }

    const sorted = [...orders].sort((a, b) => {
        const dateA = new Date(a.created_at || a.order_date || 0);
        const dateB = new Date(b.created_at || b.order_date || 0);
        return dateB - dateA;
    });

    return {
        count: orders.length,
        lastOrder: formatOrderDate(sorted[0].created_at || sorted[0].order_date),
        orders: sorted,
    };
};

export const getApiErrorMessage = (error, fallback) => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;

    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
        const messages = detail.map(err => {
            const loc = Array.isArray(err.loc) ? err.loc.filter(l => l !== 'body').join('.') : '';
            return loc ? `${loc}: ${err.msg}` : err.msg;
        });
        return messages.join('; ');
    }

    const backendMsg =
        detail?.message ||
        (typeof detail === 'string' ? detail : null) ||
        error.response?.data?.message ||
        error.message;

    if (typeof backendMsg === 'string') return backendMsg;
    return fallback;
};

// Safe formatter to prevent ANY [object Object] output when displaying analytics & raw values
export const formatAnalyticsVal = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') return val.toLocaleString('en-IN');
    if (typeof val === 'string') return val;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';

    if (Array.isArray(val)) {
        if (val.length === 0) return 'None recorded';
        return val.map(item => formatAnalyticsVal(item)).join(' • ');
    }

    if (typeof val === 'object') {
        const entries = Object.entries(val).filter(([_, v]) => v !== null && v !== undefined);
        if (entries.length === 0) return '—';
        return entries
            .slice(0, 4)
            .map(([k, v]) => {
                const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const formattedVal = typeof v === 'number' ? (k.includes('revenue') || k.includes('spend') || k.includes('val') ? fmt(v) : v.toLocaleString('en-IN')) : String(v);
                return `${label}: ${formattedVal}`;
            })
            .join(' • ');
    }

    return String(val);
};

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

const COUNTRY_NAMES = new Set([
    'india', 'in', 'bharat', 'ind', 'usa', 'us', 'uk', 'uae'
]);

/**
 * Standardize customer location to display strictly "City, State".
 * Removes country names, PIN codes, and duplicate location names.
 */
export const formatLocation = (address = '', city = '', state = '') => {
    const rawAddr = (typeof address === 'string' ? address : (address?.address || address?.street || address?.city || '')).toString().trim();
    const rawCity = (typeof city === 'string' ? city : (city?.name || city?.city || '')).toString().trim();
    const rawState = (typeof state === 'string' ? state : (state?.name || state?.state || '')).toString().trim();

    // 1. If only city and state are provided without address
    if (!rawAddr && (rawCity || rawState)) {
        if (rawCity && rawState && rawCity.toLowerCase() !== rawState.toLowerCase()) {
            return `${rawCity}, ${rawState}`;
        }
        return rawCity || rawState || 'Not available';
    }

    if (!rawAddr) {
        return 'Not available';
    }

    // 2. Remove PIN codes, postal codes, and zip codes (e.g. 411038, PIN: 400001)
    const cleanedAddr = rawAddr
        .replace(/(?:pin|zip|postal)?\s*(?:code)?\s*[-:]?\s*\b\d{5,6}\b/gi, '')
        .replace(/\b\d{5,6}\b/g, '');

    // 3. Split by commas, semicolons, pipes, or newlines
    const rawParts = cleanedAddr.split(/[,;\n/|]/);

    const tokens = [];
    for (const part of rawParts) {
        let clean = part.replace(/^[-_\s,]+|[-_\s,]+$/g, '').trim();
        if (!clean) continue;
        if (COUNTRY_NAMES.has(clean.toLowerCase()) || /^\d+$/.test(clean)) continue;

        // Strip address noise if part starts with street/road/shop/flat
        clean = clean.replace(/^(?:flat|shop|plot|street|road|near|opp|lane|h\.?no\.?|bldg|sector)\s+.*?\s+/i, '').trim();

        // Deduplicate internal word repetition (e.g. "Pune Pune" -> "Pune")
        const words = clean.split(/\s+/);
        if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
            clean = words[0];
        }

        if (clean && !COUNTRY_NAMES.has(clean.toLowerCase()) && !/^\d+$/.test(clean)) {
            tokens.push(clean);
        }
    }

    // 4. Deduplicate tokens (case-insensitive)
    const dedupTokens = [];
    for (const t of tokens) {
        if (!dedupTokens.some(d => d.toLowerCase() === t.toLowerCase())) {
            dedupTokens.push(t);
        }
    }

    // 5. Look for an Indian state match among the tokens
    let matchedState = null;
    let stateIdx = -1;
    for (let i = 0; i < dedupTokens.length; i++) {
        const token = dedupTokens[i];
        for (const st of INDIAN_STATES) {
            if (token.toLowerCase() === st.toLowerCase() || (st.toLowerCase().includes(token.toLowerCase()) && token.length >= 4)) {
                matchedState = st;
                stateIdx = i;
                break;
            }
        }
        if (matchedState) break;
    }

    if (matchedState) {
        // City is typically the token immediately preceding or following the state
        if (stateIdx > 0) {
            const matchedCity = dedupTokens[stateIdx - 1];
            if (matchedCity.toLowerCase() !== matchedState.toLowerCase()) {
                return `${matchedCity}, ${matchedState}`;
            }
            return matchedState;
        } else if (stateIdx + 1 < dedupTokens.length) {
            const matchedCity = dedupTokens[stateIdx + 1];
            if (matchedCity.toLowerCase() !== matchedState.toLowerCase()) {
                return `${matchedCity}, ${matchedState}`;
            }
            return matchedState;
        }
        return matchedState;
    }

    // 6. If no state was matched, take the last 2 distinct tokens (City, State)
    if (dedupTokens.length >= 2) {
        const c1 = dedupTokens[dedupTokens.length - 2];
        const c2 = dedupTokens[dedupTokens.length - 1];
        if (c1.toLowerCase() === c2.toLowerCase()) {
            return c1;
        }
        return `${c1}, ${c2}`;
    }

    if (dedupTokens.length === 1) {
        return dedupTokens[0];
    }

    if (rawCity && rawState && rawCity.toLowerCase() !== rawState.toLowerCase()) {
        return `${rawCity}, ${rawState}`;
    }
    return rawCity || rawState || 'Not available';
};

export const getStoredCustomerStatus = (id) => {
    if (!id) return null;
    try {
        const stored = JSON.parse(localStorage.getItem('retail_customer_status_overrides') || '{}');
        return stored[String(id)] || null;
    } catch {
        return null;
    }
};

export const setStoredCustomerStatus = (id, status) => {
    if (!id || !status) return;
    try {
        const stored = JSON.parse(localStorage.getItem('retail_customer_status_overrides') || '{}');
        stored[String(id)] = status;
        localStorage.setItem('retail_customer_status_overrides', JSON.stringify(stored));
    } catch (e) {
        console.warn('Failed to save status override in localStorage', e);
    }
};

export const formatCustomerRecord = (customer, ordersInfo = {}) => {
    if (!customer) return {};

    const standardizedLocation = formatLocation(
        customer.address || customer.city || '',
        customer.city || '',
        customer.state || ''
    );

    const custId = customer.id;
    const storedStatus = custId ? getStoredCustomerStatus(custId) : null;
    const rawStatus = String(
        storedStatus ||
        customer.status ||
        (customer.is_active === false ? 'inactive' : '') ||
        (customer.is_active === true ? 'active' : '') ||
        ''
    ).toLowerCase().trim();

    const normalizedStatus = (rawStatus === 'inactive' || rawStatus === 'blocked' || rawStatus === 'false' || rawStatus === '0') ? 'Inactive' : 'Active';

    const safePhone = customer.phone != null ? String(customer.phone) : '';
    const safeName = customer.name || 'Unknown Customer';
    const safeEmail = customer.email || '';
    const safeId = `CUS-${String(customer.id || 1).padStart(3, '0')}`;

    return {
        id: safeId,
        backendId: customer.id,
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        city: standardizedLocation,
        location: standardizedLocation,
        state: customer.state || '',
        orders: ordersInfo.count ?? customer.orders_count ?? customer.orders ?? 0,
        totalSpent: customer.total_spend ?? customer.totalSpent ?? 0,
        lastOrder: ordersInfo.lastOrder || (customer.last_order_date ? formatOrderDate(customer.last_order_date) : 'No orders yet'),
        registered: customer.created_at
            ? new Date(customer.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
              })
            : 'Not available',
        status: normalizedStatus,
        type:
            String(customer.segment || customer.type || '').toLowerCase() === 'vip'
                ? 'VIP'
                : String(customer.segment || customer.type || '').toLowerCase() === 'new'
                  ? 'New'
                  : String(customer.segment || customer.type || '').toLowerCase() === 'wholesale'
                    ? 'Wholesale'
                    : 'Regular',
        credit: customer.wallet_balance ?? customer.credit_limit ?? customer.credit ?? 0,
        loyaltyPoints: customer.loyalty_points ?? customer.loyaltyPoints ?? 0,
        birthday: customer.birthday || '',
        whatsappOptIn: customer.whatsapp_opt_in || false,
        smsOptIn: customer.sms_opt_in || false,
        rating: customer.rating || 5.0,
        avgOrder:
            customer.orders_count > 0
                ? Math.round((customer.total_spend || 0) / customer.orders_count)
                : customer.orders > 0
                  ? Math.round((customer.totalSpent || 0) / customer.orders)
                  : 0,
        addresses: customer.addresses_count || 1,
    };
};
