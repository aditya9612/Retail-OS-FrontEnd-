// API Service
export const api = {
    get: (url) => fetch(url).then(res => res.json()),
    post: (url, data) => fetch(url, { method: 'POST', body: JSON.stringify(data) }).then(res => res.json()),
};
