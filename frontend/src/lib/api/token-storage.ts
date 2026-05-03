import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'crm_access_token';
const REFRESH_TOKEN_KEY = 'crm_refresh_token';

const isBrowser = typeof window !== 'undefined';

export const tokenStorage = {
  getAccessToken: () => (isBrowser ? Cookies.get(ACCESS_TOKEN_KEY) || null : null),
  setAccessToken: (token: string) => isBrowser && Cookies.set(ACCESS_TOKEN_KEY, token, { expires: 1 }), // 1 day
  removeAccessToken: () => isBrowser && Cookies.remove(ACCESS_TOKEN_KEY),

  getRefreshToken: () => (isBrowser ? Cookies.get(REFRESH_TOKEN_KEY) || null : null),
  setRefreshToken: (token: string) => isBrowser && Cookies.set(REFRESH_TOKEN_KEY, token, { expires: 7 }), // 7 days
  removeRefreshToken: () => isBrowser && Cookies.remove(REFRESH_TOKEN_KEY),

  clearAll: () => {
    if (isBrowser) {
      Cookies.remove(ACCESS_TOKEN_KEY);
      Cookies.remove(REFRESH_TOKEN_KEY);
    }
  },
};
