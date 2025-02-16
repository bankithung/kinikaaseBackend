import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import 'react-native-get-random-values';
import utils from './utils';

let mmkvInstance = null;
let initializationPromise = null;

// Generate secure random bytes using built-in crypto API
function generateRandomKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function initialize() {
  if (mmkvInstance) return;

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const serviceName = 'com.yourapp.mmkv_encryption_key';
      const credentials = await Keychain.getGenericPassword({ service: serviceName });
      let encryptionKey;

      if (credentials) {
        encryptionKey = credentials.password;
      } else {
        encryptionKey = generateRandomKey();
        await Keychain.setGenericPassword(
          'mmkvEncryptionKey',
          encryptionKey,
          { service: serviceName }
        );
      }

      mmkvInstance = new MMKV({
        id: 'encryptedStorage',
        encryptionKey: encryptionKey
      });
    })();
  }

  await initializationPromise;
}

// Rest of the code remains the same
async function set(key, object) {
  // utils.log(key)
  // utils.log(object)
  try {
    await initialize();
    mmkvInstance.set(key, JSON.stringify(object));
  } catch (error) {
    console.log('secure.set:', error);
  }
}

async function get(key) {
  try {
    await initialize();
    const data = mmkvInstance.getString(key);
    return data !== undefined ? JSON.parse(data) : undefined;
  } catch (error) {
    console.log('secure.get:', error);
  }
}

async function remove(key) {
  try {
    await initialize();
    mmkvInstance.delete(key);
  } catch (error) {
    console.log('secure.remove:', error);
  }
}

async function wipe() {
  try {
    await initialize();
    mmkvInstance.clearAll();
  } catch (error) {
    console.log('secure.wipe:', error);
  }
}

export default { set, get, remove, wipe };