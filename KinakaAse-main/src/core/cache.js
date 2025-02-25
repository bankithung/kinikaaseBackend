// core/cache.js
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export const Cache = {
  // User Data
  setUser: (user) => storage.set('user', JSON.stringify(user)),
  getUser: () => JSON.parse(storage.getString('user')),

  // Messages
  setMessages: (username, messages) => 
    storage.set(`messages-${username}`, JSON.stringify(messages)),
  getMessages: (username) => 
    JSON.parse(storage.getString(`messages-${username}`)) || [],

  // Friend List
  setFriends: (friends) => storage.set('friends', JSON.stringify(friends)),
  getFriends: () => JSON.parse(storage.getString('friends')) || [],

  // Requests
  setRequests: (requests) => storage.set('requests', JSON.stringify(requests)),
  getRequests: () => JSON.parse(storage.getString('requests')) || [],

  // Search
  setSearch: (query, results) => 
    storage.set(`search-${query}`, JSON.stringify(results)),
  getSearch: (query) => JSON.parse(storage.getString(`search-${query}`)),

  // Clear all data
  clear: () => storage.clearAll(),
};