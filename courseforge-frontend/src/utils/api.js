const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://course-forge-tpxk.onrender.com').replace(/\/+$/, '');

export const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const buildBackendAssetUrl = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
