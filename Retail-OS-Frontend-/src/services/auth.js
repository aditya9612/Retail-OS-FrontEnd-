import axios from 'axios';
import {
    setTokens,
    getRefreshToken,
    clearTokens,
} from '../utils/tokenStorage';

const LOGIN_API_URL =
    'https://api-testing.myretailos.com/api/v1/auth/login';

export const loginUser = async (credentials) => {
    const response = await axios.post(
        LOGIN_API_URL,
        credentials,
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    return response.data;
};

export const refreshAccessToken = async () => {
    const refreshToken = getRefreshToken();

    const response = await axios.post(
        'https://api-testing.myretailos.com/api/v1/auth/refresh',
        {
            refresh_token: refreshToken,
        },
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    setTokens({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        token_type: response.data.token_type,
    });

    return response.data;
};

export const registerUser = async (registerData) => {
    const response = await axios.post(
        'https://api-testing.myretailos.com/api/v1/auth/register',
        null,
        {
            params: {
                tenant_name: registerData.tenant_name,
                slug: registerData.slug,
                email: registerData.email,
                admin_name: registerData.admin_name,
                password: registerData.password,
                phone: registerData.phone || undefined,
            },
        }
    );

    return response.data;
};

export const logoutUser = () => {
    clearTokens();
};
