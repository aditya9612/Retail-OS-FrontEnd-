import axios from 'axios';

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

export const logoutUser = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_type');
};