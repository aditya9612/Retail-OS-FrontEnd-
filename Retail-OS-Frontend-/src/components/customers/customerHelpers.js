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
    const backendMsg =
        error.response?.data?.detail?.[0]?.msg ||
        error.response?.data?.detail?.message ||
        error.response?.data?.detail ||
        error.response?.data?.message;

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

export const formatCustomerRecord = (customer, ordersInfo = {}) => ({
    id: `CUS-${String(customer.id || 1).padStart(3, '0')}`,
    backendId: customer.id,
    name: customer.name || 'Unknown Customer',
    email: customer.email || '',
    phone: customer.phone || '',
    city: customer.address || customer.city || 'Not available',
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
    status:
        customer.status === 'inactive'
            ? 'Inactive'
            : customer.status === 'blocked'
              ? 'Blocked'
              : 'Active',
    type:
        customer.segment === 'vip' || customer.type === 'VIP'
            ? 'VIP'
            : customer.segment === 'new' || customer.type === 'New'
              ? 'New'
              : customer.segment === 'wholesale' || customer.type === 'Wholesale'
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
});
