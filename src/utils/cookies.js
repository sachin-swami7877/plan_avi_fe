import Cookies from 'js-cookie';

const TOKEN_KEY = 'token';
const NINETY_DAYS = 90;

export const getToken = () => Cookies.get(TOKEN_KEY);

export const setToken = (token) => {
  Cookies.set(TOKEN_KEY, token, { expires: NINETY_DAYS, sameSite: 'Lax' });
};

export const removeToken = () => {
  Cookies.remove(TOKEN_KEY);
};
