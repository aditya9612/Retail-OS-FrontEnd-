const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_TYPE_KEY = 'token_type';

const ACCESS_MAX_AGE = 60 * 60 * 24;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

const setCookie = (name, value, maxAgeSeconds) => {
    if (typeof document !== 'undefined') {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
    }
};

const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        c = c.trim();
        if (c.startsWith(`${name}=`)) {
            return decodeURIComponent(c.substring(name.length + 1));
        }
    }
    return null;
};

const deleteCookie = (name) => {
    if (typeof document !== 'undefined') {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    }
};

const safeBase64Decode = (str) => {
    try {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return atob(base64);
    } catch {
        return null;
    }
};

export const decodeToken = (token) => {
    if (!token || typeof token !== 'string') {
        return null;
    }

    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }
};

export const getStoredTokenPayload = () => {
    const token = getAccessToken();
    return token ? decodeToken(token) : null;
};

const isTokenValid = (token) => {
    if (!token) {
        return false;
    }

    try {
        const payload = decodeToken(token);
        if (!payload) return false;

        if (!payload.exp) {
            return true;
        }

        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

export const setTokens = ({ access_token, refresh_token, token_type = 'bearer' }) => {
    if (access_token) {
        setCookie(ACCESS_TOKEN_KEY, access_token, ACCESS_MAX_AGE);
        if (typeof localStorage !== 'undefined') {
            try { localStorage.setItem(ACCESS_TOKEN_KEY, access_token); } catch (_) {}
        }
        if (typeof sessionStorage !== 'undefined') {
            try { sessionStorage.setItem(ACCESS_TOKEN_KEY, access_token); } catch (_) {}
        }
    }

    if (refresh_token) {
        setCookie(REFRESH_TOKEN_KEY, refresh_token, REFRESH_MAX_AGE);
        if (typeof localStorage !== 'undefined') {
            try { localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token); } catch (_) {}
        }
        if (typeof sessionStorage !== 'undefined') {
            try { sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh_token); } catch (_) {}
        }
    }

    if (token_type) {
        setCookie(TOKEN_TYPE_KEY, token_type, REFRESH_MAX_AGE);
        if (typeof localStorage !== 'undefined') {
            try { localStorage.setItem(TOKEN_TYPE_KEY, token_type); } catch (_) {}
        }
    }
};

export const getAccessToken = () => {
    const cookieToken = getCookie(ACCESS_TOKEN_KEY);
    if (cookieToken) return cookieToken;

    if (typeof localStorage !== 'undefined') {
        const localToken =
            localStorage.getItem(ACCESS_TOKEN_KEY) ||
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken');
        if (localToken) return localToken;
    }

    if (typeof sessionStorage !== 'undefined') {
        const sessionToken =
            sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('accessToken');
        if (sessionToken) return sessionToken;
    }

    return null;
};

export const getRefreshToken = () => {
    const cookieToken = getCookie(REFRESH_TOKEN_KEY);
    if (cookieToken) return cookieToken;

    if (typeof localStorage !== 'undefined') {
        const localToken =
            localStorage.getItem(REFRESH_TOKEN_KEY) ||
            localStorage.getItem('refreshToken');
        if (localToken) return localToken;
    }

    if (typeof sessionStorage !== 'undefined') {
        const sessionToken =
            sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
            sessionStorage.getItem('refreshToken');
        if (sessionToken) return sessionToken;
    }

    return null;
};

export const getTokenType = () => getCookie(TOKEN_TYPE_KEY) || 'bearer';

export const clearTokens = () => {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    deleteCookie(TOKEN_TYPE_KEY);

    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(TOKEN_TYPE_KEY);
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
        } catch (_) {}
    }

    if (typeof sessionStorage !== 'undefined') {
        try {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            sessionStorage.removeItem(REFRESH_TOKEN_KEY);
            sessionStorage.removeItem(TOKEN_TYPE_KEY);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('accessToken');
        } catch (_) {}
    }
};

export const isAuthenticated = () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    // If access token is valid, user is authenticated
    if (isTokenValid(accessToken)) {
        return true;
    }

    // If access token is expired or missing, but a valid refresh token exists,
    // consider authenticated so Axios interceptor can seamlessly refresh the access token
    if (refreshToken && isTokenValid(refreshToken)) {
        return true;
    }

    // Both tokens are invalid, expired, or missing: clear stale data
    if (accessToken || refreshToken) {
        clearTokens();
    }

    return false;
};
