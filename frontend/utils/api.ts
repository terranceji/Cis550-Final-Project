import axios from 'axios';
import { getSession, signIn, signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// List of endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/users/login',
  '/users/register',
  '/users/oauth'
];

api.interceptors.request.use(
  async (config) => {
    try {
      // Skip token check for public endpoints
      if (PUBLIC_ENDPOINTS.some(endpoint => config.url?.includes(endpoint))) {
        return config;
      }

      const session = await getSession();
      console.log("Current session for API request:", session);
      
      if (session?.backendToken) {
        console.log("Using backend token from session");
        config.headers.Authorization = `Bearer ${session.backendToken}`;
      } else {
        console.log("No session token available");
        throw new Error('No authentication token available');
      }
      
      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Regular login
export const login = async (email: string, password: string) => {
  try {
    console.log('1. Starting backend login process...');
    const response = await api.post('/users/login', { email, password });
    console.log('2. Backend response:', response.data);
    
    if (response.data.token) {
      console.log('3. Backend token received');
      
      const result = await signIn('credentials', {
        redirect: false,
        email: email,
        backendToken: response.data.token,
      });

      console.log('4. NextAuth sign in result:', result);

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        return response.data;
      }
    }
    throw new Error('Login failed');
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

// Add a logout function
export const logout = async () => {
  try {
    await signOut({ redirect: true, callbackUrl: '/login' });
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const register = async (username: string, email: string, password: string) => {
  try {
    console.log('1. Starting registration process...');
    const response = await api.post('/users/register', { 
      username, 
      email, 
      password 
    });
    console.log('2. Registration response:', response.data);

    if (response.data.token) {
      console.log('3. Registration successful, signing in...');
      const result = await signIn('credentials', {
        redirect: false,
        email: email,
        backendToken: response.data.token,
      });

      console.log('4. Sign in result after registration:', result);

      if (result?.error) {
        throw new Error(result.error);
      }

      return response.data;
    }
    throw new Error('Registration successful but no token received');
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const getSavedCompanies = async () => {
  const response = await api.get('/users/companies');
  console.log('Saved companies response:', response.data);
  return response.data;
};

export const addCompany = async (ciks: string[]) => {
  try {
    const response = await api.post('/users/companies', { ciks });
    return response.data;
  } catch (error) {
    console.error('Error adding company:', error);
    throw error;
  }
};

export const removeCompany = async (companyId: string) => {
  try {
    const response = await api.delete('/users/companies', {
      data: { cik: companyId }
    });
    return response.data;
  } catch (error) {
    console.error('Error removing company:', error);
    throw error;
  }
};

export const getAvailableCompanies = async () => {
  try {
    const response = await api.get('/api/stocks');
    console.log('Available companies:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching available companies:', error);
    throw error;
  }
};

export default api;

