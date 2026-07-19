const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_TYPE_KEY = 'token_type';

const ACCESS_MAX_AGE = 60 * 60 * 24;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

const setCookie = (name, value, maxAgeSeconds) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};

const getCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
};

const deleteCookie = (name) => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

const clearLegacyStorage = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_TYPE_KEY);
};

const isTokenValid = (token) => {
    if (!token) {
        return false;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (!payload.exp) {
            return true;
        }

        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

clearLegacyStorage();

export const setTokens = ({ access_token, refresh_token, token_type = 'bearer' }) => {
    if (access_token) {
        setCookie(ACCESS_TOKEN_KEY, access_token, ACCESS_MAX_AGE);
    }

    if (refresh_token) {
        setCookie(REFRESH_TOKEN_KEY, refresh_token, REFRESH_MAX_AGE);
    }

    if (token_type) {
        setCookie(TOKEN_TYPE_KEY, token_type, REFRESH_MAX_AGE);
    }

    clearLegacyStorage();
};

export const getAccessToken = () => getCookie(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => getCookie(REFRESH_TOKEN_KEY);

export const getTokenType = () => getCookie(TOKEN_TYPE_KEY) || 'bearer';

export const clearTokens = () => {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    deleteCookie(TOKEN_TYPE_KEY);
    clearLegacyStorage();
};

export const isAuthenticated = () => {
    const token = getAccessToken();

    if (!isTokenValid(token)) {
        if (token) {
            clearTokens();
        }

        return false;
    }

    return true;
};
