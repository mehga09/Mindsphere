import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.accessToken) {
      config.headers.Authorization = `Bearer ${user.accessToken}`;
    }
  }
  return config;
});

let refreshTokenPromise: Promise<any> | null = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/refresh')) {
      originalRequest._retry = true;

      if (!refreshTokenPromise) {
        refreshTokenPromise = client.post('/api/auth/refresh').finally(() => {
          refreshTokenPromise = null;
        });
      }

      try {
        const res = await refreshTokenPromise;
        const newAccessToken = res.data.accessToken;
        
        // Persist new token
        const userStr = localStorage.getItem('user');
        if (userStr && newAccessToken) {
          const user = JSON.parse(userStr);
          user.accessToken = newAccessToken;
          localStorage.setItem('user', JSON.stringify(user));
        }

        return client(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
