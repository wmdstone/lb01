import type { Category, MasterGoal, Student, Group } from './types';

export const getLocalToken = () => {
  try {
    return localStorage.getItem('admin_token');
  } catch (e) {
    console.warn("localStorage is disabled or not accessible:", e);
    return window.__inMemoryToken || null;
  }
};

export const setLocalToken = (token: string) => {
  try {
    localStorage.setItem('admin_token', token);
    document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=None; Secure`;
  } catch (e) {
    console.warn("localStorage is disabled, storing token in memory:", e);
    window.__inMemoryToken = token;
  }
};

export const removeLocalToken = () => {
  try {
    localStorage.removeItem('admin_token');
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
  } catch (e) {
    window.__inMemoryToken = null;
  }
};

declare global {
  interface Window {
    __inMemoryToken?: string | null;
  }
}

