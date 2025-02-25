import axios from 'axios';
import { ADDRESS } from '../../../core/api';

const api = axios.create({
  baseURL: `https://${ADDRESS}/api/`,
  timeout: 10000,
});

const MAX_RETRIES = 3;
api.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error;
    if (!config || !config.retry) config.retry = 0;
    if (config.retry < MAX_RETRIES) {
      config.retry += 1;
      await new Promise(resolve => setTimeout(resolve, 1000 * config.retry));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export default api;