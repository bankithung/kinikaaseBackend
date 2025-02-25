// core/secure.js
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const secure = {
  set: (key, value) => {
    try {
      storage.set(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error setting secure value:', error);
      return false;
    }
  },

  get: (key) => {
    try {
      const value = storage.getString(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting secure value:', error);
      return null;
    }
  },

  remove: (key) => {
    try {
      storage.delete(key);
      return true;
    } catch (error) {
      console.error('Error removing secure value:', error);
      return false;
    }
  },

  clear: () => {
    try {
      storage.clearAll();
      return true;
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      return false;
    }
  }
};

export default secure;