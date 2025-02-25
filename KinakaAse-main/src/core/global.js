import {create} from 'zustand';
import secure from './secure';
import api, {ADDRESS} from './api';
import utils from './utils';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import messaging from '@react-native-firebase/messaging';
import {Vibration, Platform} from 'react-native';
import PushNotification from 'react-native-push-notification';

// Utility Functions
async function getStoredMessages(connectionId) {
  const key = `messages_${connectionId}`;
  try {
    const stored = await secure.get(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    utils.log('Error retrieving stored messages:', error);
    return [];
  }
}

export async function saveStoredMessages(connectionId, messages) {
  const key = `messages_${connectionId}`;
  try {
    await secure.set(key, JSON.stringify(messages));
  } catch (error) {
    utils.log('Error saving stored messages:', error);
  }
}

async function getStoredFriendList() {
  try {
    const stored = await secure.get('friendList');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    utils.log('Error retrieving stored friend list:', error);
    return null;
  }
}

async function saveStoredFriendList(friendList) {
  try {
    await secure.set('friendList', JSON.stringify(friendList));
  } catch (error) {
    utils.log('Error saving stored friend list:', error);
  }
}

function mergeMessages(existing, newMessages) {
  try {
    const existingMap = new Map(existing.map(m => [m.id, m]));
    newMessages.forEach(newMsg => {
      const existingMsg = existingMap.get(newMsg.id);
      if (existingMsg) {
        // Merge reactions, preserving local ones if newer
        existingMap.set(newMsg.id, {
          ...newMsg,
          reactions: [
            ...(existingMsg.reactions || []),
            ...(newMsg.reactions || []).filter(
              r => !existingMsg.reactions?.some(er => er.id === r.id),
            ),
          ],
        });
      } else {
        existingMap.set(newMsg.id, newMsg);
      }
    });
    return Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.created) - new Date(a.created),
    );
  } catch (error) {
    utils.log('Error merging messages:', error);
    return existing;
  }
}

function getConnectionId(get, username) {
  const friendList = get().friendList;
  const friend = friendList?.find(f => f.friend.username === username);
  return friend ? String(friend.id) : null;
}

// Response Handlers
function responseFriendList(set, get, friendList) {
  const currentUsername = get().messagesUsername;
  const unreadCounts = friendList.reduce((acc, friend) => {
    if (friend.friend.username !== currentUsername) {
      acc[friend.id] = friend.unread_count || 0;
    }
    return acc;
  }, {});
  set(state => ({
    friendList: friendList.map(friend => ({
      ...friend,
      isBlocked: friend.is_blocked, // Assuming API returns is_blocked
      iBlockedFriend: friend.i_blocked_friend, // Assuming API returns i_blocked_friend
    })),
    unreadCounts: {...state.unreadCounts, ...unreadCounts},
  }));
  saveStoredFriendList(friendList);
  utils.log('responseFriendList:', friendList);
}

function responseFriendNew(set, get, friend) {
  const friendList = [friend, ...get().friendList];
  set({friendList});
  saveStoredFriendList(friendList);
}

async function responseMessageList(set, get, data) {
  const username = data.friend.username;
  const connectionId = getConnectionId(get, username);
  if (!connectionId) return;

  const newMessages = data.messages;
  const storedMessages = await getStoredMessages(connectionId);
  const mergedMessages = mergeMessages(storedMessages, newMessages);
  await saveStoredMessages(connectionId, mergedMessages);

  set(state => ({
    messagesList:
      state.messagesUsername === username ? mergedMessages : state.messagesList,
    messagesNext:
      state.messagesUsername === username ? data.next : state.messagesNext,
    messagesUsername:
      state.messagesUsername === username ? username : state.messagesUsername,
  }));
  utils.log('responseMessageList:', mergedMessages);
}

async function responseMessageSend(set, get, data) {
  const username = data.friend.username;
  const connectionId = getConnectionId(get, username);
  if (!connectionId) return;

  const newMessage = data.message;

  set(state => {
    // Update messagesList immediately for both sender and receiver
    const updatedMessages = [newMessage, ...state.messagesList];
    
    // Update friend list preview
    const friendList = state.friendList.map(item => {
      if (item.id === connectionId) {
        return {
          ...item,
          preview: newMessage.text,
          updated: newMessage.created,
          type: newMessage.type,
          replied_to: newMessage.replied_to
        };
      }
      return item;
    });

    // Move updated conversation to top
    const updatedFriendList = [
      friendList.find(item => item.id === connectionId),
      ...friendList.filter(item => item.id !== connectionId)
    ].filter(Boolean);

    return {
      messagesList: updatedMessages,
      friendList: updatedFriendList,
      messagesTyping: null
    };
  });



  const storedMessages = await getStoredMessages(connectionId);
  
  // const updatedMessages = mergeMessages(storedMessages, [newMessage]);
  const tempMessageIndex = storedMessages.findIndex(m => m.id.startsWith('temp_') && m.text === newMessage.text && m.is_me);
    let updatedMessages;
    if (tempMessageIndex !== -1) {
      // Replace the temporary message with the server-confirmed one
      updatedMessages = [...storedMessages];
      updatedMessages[tempMessageIndex] = newMessage;
    } else {
      updatedMessages = mergeMessages(storedMessages, [newMessage]);
    }

  await saveStoredMessages(connectionId, updatedMessages);

  const user = get().user;
  
  const isSender = newMessage.is_me;


  console.log("New message: ", isSender);

  const messageId = newMessage.id;
  const processedMessages = get().processedMessages || new Set();

  if (!processedMessages.has(messageId)) {
    set(state => {
      const friendList = state.friendList.map(item => {
        if (item.id === connectionId) {
          return {
            ...item,
            preview: newMessage.text,
            updated: newMessage.created,
            type: newMessage.type,
            replied_to: newMessage.replied_to,
          };
        }
        return item;
      });
      const updatedFriendList = friendList.filter(
        item => item.friend.username !== username,
      );
      updatedFriendList.unshift(
        friendList.find(item => item.friend.username === username),
      );

      return {
        friendList: updatedFriendList,
        messagesList:
          state.messagesUsername === username
            ? updatedMessages
            : state.messagesList,
        messagesTyping:
          state.messagesUsername === username ? null : state.messagesTyping,
        unreadCounts: {
          ...state.unreadCounts,
          [connectionId]: isSender
            ? state.unreadCounts[connectionId] || 0
            : (state.unreadCounts[connectionId] || 0) + 1,
        },
        processedMessages: new Set([...processedMessages, messageId]),
      };
    });
    saveStoredFriendList(get().friendList);
    utils.log(
      'responseMessageSend:',
      updatedMessages,
      'unreadCounts:',
      get().unreadCounts,
    );
  } else {
    utils.log('Duplicate message ignored:', messageId);
  }
}

function responseMessageType(set, get, data) {
  if (data.username !== get().messagesUsername) return;
  set({messagesTyping: new Date()});
}

function responseRequestAccept(set, get, connection) {
  const user = get().user;
  if (user.username === connection.receiver.username) {
    const requestList = get().requestList.filter(
      req => req.id !== connection.id,
    );
    set({requestList});
  }
  const sl = get().searchList;
  if (sl) {
    const searchList = sl.map(userItem =>
      userItem.username ===
      (user.username === connection.receiver.username
        ? connection.sender.username
        : connection.receiver.username)
        ? {...userItem, status: 'connected'}
        : userItem,
    );
    set({searchList});
  }
}

function responseRequestConnect(set, get, connection) {
  const user = get().user;
  if (user.username === connection.sender.username) {
    const searchList = get().searchList?.map(req =>
      req.username === connection.receiver.username
        ? {...req, status: 'pending-them'}
        : req,
    );
    set({searchList});
  } else {
    const requestList = get().requestList || [];
    if (
      !requestList.some(
        req => req.sender.username === connection.sender.username,
      )
    ) {
      set({requestList: [connection, ...requestList]});
    }
  }
}

function responseRequestList(set, get, requestList) {
  set({requestList});
}

function responseSearch(set, get, data) {
  set({searchList: data});
}

function responseThumbnail(set, get, data) {
  set({user: data});
}

function responseOnlineStatus(set, get, data) {
  utils.log('Received online status update:', data);
  const friendList = get().friendList.map(friend => {
    if (friend.friend.username === data.username) {
      return {
        ...friend,
        friend: {
          ...friend.friend,
          online: data.online,
        },
      };
    }
    return friend;
  });
  set({friendList});
  saveStoredFriendList(friendList);
  utils.log('Updated friendList with online status:', friendList);
}

function responseGroupCreated(set, get, group) {
  const friendList = get().friendList || [];
  const newGroup = {
    id: `group_${group.id}`,
    friend: {
      username: group.name,
      name: group.name,
      thumbnail: null,
      online: true,
    },
    preview: 'Group created',
    updated: group.created,
    type: 'text',
    unread_count: 0,
  };
  set(state => ({
    friendList: [newGroup, ...friendList],
    unreadCounts: {
      ...state.unreadCounts,
      [`group_${group.id}`]: 0,
    },
  }));
  saveStoredFriendList([newGroup, ...friendList]);
  utils.log('responseGroupCreated:', newGroup);
}

function responseMessageSeen(set, get, data) {
  set(state => ({
    unreadCounts: {
      ...state.unreadCounts,
      [data.connection_id]: Math.max(
        0,
        (state.unreadCounts[data.connection_id] || 0) - data.count,
      ),
    },
  }));
}

// Configure PushNotification for Android channels
if (Platform.OS === 'android') {
  PushNotification.createChannel(
    {
      channelId: 'default-channel',
      channelName: 'Default Channel',
      channelDescription: 'Default notification channel',
      importance: 4, // IMPORTANCE_HIGH
      vibrate: true,
      soundName: 'default',
    },
    created => utils.log(`Channel created: ${created}`),
  );
}

// Zustand Store
const useGlobal = create((set, get) => ({
  initialized: false,
  user: null,
  authenticated: false,
  socket: null,
  friendList: null,
  messagesList: [],
  messagesNext: null,
  messagesTyping: null,
  messagesUsername: null,
  requestList: [],
  searchList: null,
  unreadCounts: {},
  processedMessages: new Set(),
  messageQueue: [],
  notifications: [],
  posts: [],
  comments: {},
  blockStatus: {},

  init: async () => {
    const credentials = await secure.get('credentials');
    const storedUser = await secure.get('user');
    const storedTokens = await secure.get('tokens');
    const storedFriendList = await getStoredFriendList();

    if (credentials && storedUser && storedTokens) {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await get().signIn(); // This will handle FCM update
      } else {
        set({
          authenticated: true,
          user: storedUser,
          friendList: storedFriendList || [],
        });
        utils.log('Offline mode - FCM update postponed');
      }
    } else {
      set({authenticated: false});
    }
    set({initialized: true});

    // Handle token refresh with authentication
    messaging().onTokenRefresh(async newToken => {
      const tokens = await secure.get('tokens');
      if (tokens?.access) {
        try {
          await api({
            method: 'POST',
            url: '/chat/update-fcm-token/',
            data: {fcm_token: newToken},
            headers: {Authorization: `Bearer ${tokens.access}`},
          });
          utils.log('Token refreshed:', newToken);
        } catch (error) {
          utils.log(
            'FCM Token refresh failed:',
            error.response?.data || error.message,
          );
        }
      } else {
        utils.log('No tokens available for FCM refresh');
      }
    });

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      handleNotification(remoteMessage);
    });
    
    messaging().onMessage(async remoteMessage => {
      handleNotification(remoteMessage);
    });
    
    const handleNotification = (remoteMessage) => {
      const data = remoteMessage.data || {};
      
      if (data.type === 'message') {
        Vibration.vibrate(500);
        PushNotification.localNotification({
          channelId: 'default-channel',
          title: remoteMessage.notification.title,
          message: remoteMessage.notification.body,
          playSound: true,
          soundName: 'default',
          data: data
        });
      }
    };

    NetInfo.addEventListener(state => {
      if (state.isConnected && !get().socket) {
        utils.log('Network connected, attempting WebSocket connection');
        get().socketConnect();
      } else if (!state.isConnected && get().socket) {
        utils.log('Network disconnected, closing WebSocket');
        get().socketClose();
      }
    });

    // Fetch initial posts
    try {
      const response = await api({
        method: 'GET',
        url: '/chat/posts/',
      });
      set({posts: response.data});
    } catch (error) {
      utils.log('Error fetching initial posts:', error);
    }
  },

  signIn: async () => {
    const credentials = await secure.get('credentials');
    if (!credentials) {
      set({authenticated: false});
      get().addNotification('No stored credentials found');
      return;
    }
    try {
      const response = await api({
        method: 'POST',
        url: '/chat/signin/',
        data: {
          username: credentials.username,
          password: credentials.password,
        },
      });
      if (response.status !== 200) throw new Error('Authentication failed');
      const user = response.data.user;
      const tokens = response.data.tokens;
      await secure.set('tokens', tokens);
      await secure.set('user', user);
      set({authenticated: true, user});
      get().socketConnect();

      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        utils.log(
          'Attempting FCM token update with token:',
          tokens.access.substring(0, 10) + '...',
        );
        await api({
          method: 'POST',
          url: '/chat/update-fcm-token/',
          data: {fcm_token: fcmToken},
          headers: {Authorization: `Bearer ${tokens.access}`},
        });
        utils.log('FCM Token updated after sign-in:', fcmToken);
      }
    } catch (error) {
      utils.log('Sign-in error:', error.response?.data || error.message);
      set({authenticated: false});
      get().addNotification('Sign-in failed: Invalid credentials');
    }
  },

  login: async (credentials, user, tokens) => {
    try {
      await secure.set('credentials', credentials);
      await secure.set('tokens', tokens);
      await secure.set('user', user);
      set({authenticated: true, user});
      get().socketConnect();

      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        utils.log(
          'Attempting FCM token update with token:',
          tokens.access.substring(0, 10) + '...',
        );
        await api({
          method: 'POST',
          url: '/chat/update-fcm-token/',
          data: {fcm_token: fcmToken},
          headers: {Authorization: `Bearer ${tokens.access}`},
        });
        utils.log('FCM Token updated after login:', fcmToken);
      }
    } catch (error) {
      utils.log('Login error:', error.response?.data || error.message);
      get().addNotification('Failed to complete login');
    }
  },

  logout: async () => {
    try {
      await secure.wipe();
      set({
        authenticated: false,
        user: null,
        socket: null,
        friendList: null,
        messagesList: [],
        messagesUsername: null,
        requestList: [],
        searchList: null,
        unreadCounts: {},
        processedMessages: new Set(),
        messageQueue: [],
        notifications: [],
        posts: [],
        comments: {},
      });
      utils.log('User logged out successfully');
    } catch (error) {
      utils.log('Logout error:', error);
      get().addNotification('Failed to logout');
    }
  },

  refreshToken: async () => {
    const tokens = await secure.get('tokens');
    const credentials = await secure.get('credentials');

    if (!tokens?.refresh && !credentials) {
      get().addNotification('No refresh token or credentials available');
      get().logout();
      return false;
    }

    if (tokens?.refresh) {
      try {
        const response = await api({
          method: 'POST',
          url: '/chat/token/refresh/',
          data: {refresh: tokens.refresh},
        });
        const newTokens = response.data;
        await secure.set('tokens', newTokens);
        get().socketConnect();
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          await api({
            method: 'POST',
            url: '/chat/update-fcm-token/',
            data: {fcm_token: fcmToken},
            headers: {Authorization: `Bearer ${newTokens.access}`},
          });
          utils.log('FCM Token updated after token refresh:', fcmToken);
        }
        return true;
      } catch (error) {
        utils.log('Refresh token failed:', error);
      }
    }

    if (credentials) {
      try {
        const response = await api({
          method: 'POST',
          url: '/chat/signin/',
          data: {
            username: credentials.username,
            password: credentials.password,
          },
        });
        if (response.status !== 200) throw new Error('Authentication failed');
        const user = response.data.user;
        const newTokens = response.data.tokens;
        await secure.set('tokens', newTokens);
        await secure.set('user', user);
        set({user});
        get().socketConnect();
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          await api({
            method: 'POST',
            url: '/chat/update-fcm-token/',
            data: {fcm_token: fcmToken},
            headers: {Authorization: `Bearer ${newTokens.access}`},
          });
          utils.log('FCM Token updated after credentials refresh:', fcmToken);
        }
        return true;
      } catch (error) {
        utils.log('Credentials refresh failed:', error);
        get().addNotification('Failed to refresh authentication');
        get().logout();
        return false;
      }
    }
    return false;
  },

  socketConnect: async () => {
    let tokens = await secure.get('tokens');
    if (!tokens?.access) {
      const refreshed = await get().refreshToken();
      if (!refreshed) {
        get().addNotification(
          'Unable to establish WebSocket: Authentication failed',
        );
        return;
      }
      tokens = await secure.get('tokens');
    }

    const connect = (attempt = 1, maxAttempts = 5) => {
      if (attempt > maxAttempts) {
        get().addNotification('Failed to reconnect after multiple attempts');
        return;
      }
      const url = `wss://${ADDRESS}/chat/?token=${tokens.access}`;
      const socket = new WebSocket(url);

      socket.onopen = () => {
        utils.log('socket.onopen');
        socket.send(JSON.stringify({source: 'request.list'}));
        socket.send(JSON.stringify({source: 'friend.list'}));
        socket.send(JSON.stringify({source: 'online.status'}));
        const interval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({source: 'online.status'}));
          } else {
            clearInterval(interval);
          }
        }, 5000);
        const currentUsername = get().messagesUsername;
        if (currentUsername) {
          const connectionId = getConnectionId(get, currentUsername);
          if (connectionId)
            socket.send(
              JSON.stringify({
                source: 'message.list',
                connectionId,
                page: 0,
              }),
            );
        }
        get().flushQueue();
      };

      socket.onmessage = async event => {
        try {
          const parsed = JSON.parse(event.data);
          utils.log('onmessage:', parsed);
          if (parsed.source === 'error') {
            if (parsed.data.message === 'Invalid token') {
              const refreshed = await get().refreshToken();
              if (refreshed) {
                get().socketClose();
                get().socketConnect();
              }
            }
            get().addNotification('WebSocket error: ' + parsed.data.message);
            return;
          }

          // Handle block.status messages
          if (parsed.source === 'block.status') {
            const {connectionId, blocked} = parsed.data;
            set(state => ({
              blockStatus: {
                ...state.blockStatus,
                [connectionId]: blocked,
              },
            }));
            return;
          }


          if (parsed.source === 'friend.preview.update') {
            const { connectionId, preview, updated, messageId } = parsed.data;
            console.log('Received friend.preview.update:', { connectionId, preview, updated, messageId });
            set(state => {
                const connectionMessages = state.messagesList.filter(
                    m => String(m.connection) === String(connectionId) || String(m.group) === String(connectionId.replace('group_', ''))
                );
                const latestMessage = connectionMessages.length > 0
                    ? connectionMessages.reduce((latest, current) =>
                        new Date(current.created) > new Date(latest.created) ? current : latest
                    )
                    : null;
        
                if (latestMessage && latestMessage.id === messageId) {
                    let updatedFriendList = [...state.friendList];
                    const friendIndex = updatedFriendList.findIndex(f => String(f.id) === String(connectionId));
                    if (friendIndex !== -1) {
                        updatedFriendList[friendIndex] = {
                            ...updatedFriendList[friendIndex],
                            preview,
                            updated
                        };
                        console.log(`Updated preview for ${updatedFriendList[friendIndex].friend.username} to: ${preview}`);
                        saveStoredFriendList(updatedFriendList);
                        return { friendList: updatedFriendList };
                    } else {
                        console.log(`Friend with connectionId ${connectionId} not found in friendList`);
                    }
                } else {
                    console.log(`Edited message ${messageId} is not the latest in connection ${connectionId}`);
                }
                return state;
            });
        }

        if (parsed.source === 'message.update') {
          const updatedMessage = parsed.data.message;
          set(state => {
              let updatedMessages = state.messagesList;
              let friendList = [...state.friendList];
              if (state.messagesUsername) {
                  const connectionId = getConnectionId(get, state.messagesUsername);
                  const messageConnectionId = updatedMessage.connection || `group_${updatedMessage.group}`;
                  if (String(connectionId) === String(messageConnectionId)) {
                      updatedMessages = state.messagesList.map(m => {
                          if (m.id === updatedMessage.id) {
                              return { ...m, text: updatedMessage.text };
                          }
                          return m;
                      });
                      saveStoredMessages(connectionId, updatedMessages);
                      const latestMessage = updatedMessages
                          .filter(m => !m.is_deleted)
                          .reduce((latest, current) =>
                              new Date(current.created) > new Date(latest.created) ? current : latest,
                              updatedMessages[0]
                          );
                      if (latestMessage && latestMessage.id === updatedMessage.id) {
                          const friendIndex = friendList.findIndex(f => String(f.id) === String(connectionId));
                          if (friendIndex !== -1) {
                              friendList[friendIndex] = {
                                  ...friendList[friendIndex],
                                  preview: updatedMessage.text,
                                  updated: updatedMessage.created
                              };
                              console.log(`Fallback updated preview for ${friendList[friendIndex].friend.username} to: ${updatedMessage.text}`);
                          }
                          saveStoredFriendList(friendList);
                      }
                  }
              }
              return { messagesList: updatedMessages, friendList };
          });
      }
      
          else if (parsed.source === 'message.delete') {
            const { messageId, connectionId } = parsed.data;
            if (!connectionId) {
              console.error('connectionId missing in message.delete event');
              return;
            }
            set(state => {
              let updatedMessages = state.messagesList;
              if (state.messagesUsername) {
                const currentConnectionId = getConnectionId(get, state.messagesUsername);
                if (String(currentConnectionId) === String(connectionId)) {
                  updatedMessages = state.messagesList.map(m => {
                    if (m.id === messageId) {
                      return { ...m, is_deleted: true };
                    }
                    return m;
                  });
                }
              }
              (async () => {
                const storedMessages = await getStoredMessages(connectionId);
                const updatedStoredMessages = storedMessages.map(m => {
                  if (m.id === messageId) {
                    return { ...m, is_deleted: true };
                  }
                  return m;
                });
                await saveStoredMessages(connectionId, updatedStoredMessages);
              })();
              return { messagesList: updatedMessages };
            });
          }

          function responseFriendPreviewUpdate(set, get, data) {
            console.log('Received friend.preview.update:', data);
            const { connectionId, preview, updated } = data;
            set(state => {
              const friendList = state.friendList.map(friend => {
                if (String(friend.id) === String(connectionId)) {
                  console.log(`Updating preview for ${friend.friend.username} to: ${preview}`);
                  return { ...friend, preview, updated };
                }
                return friend;
              });
              saveStoredFriendList(friendList);
              return { friendList };
            });
            utils.log('responseFriendPreviewUpdate applied:', data);
          }

          function responseReactionAdd(set, get, data) {
            const { message_id, reaction } = data;
            const currentUser = get().user.username;
            set(state => {
              const updatedMessages = state.messagesList.map(m => {
                if (m.id === message_id) {
                  const existingReactions = m.reactions || [];
                  const reactionIndex = existingReactions.findIndex(
                    r => r.emoji === reaction.emoji && r.user === reaction.user
                  );
                  if (reactionIndex !== -1) {
                    // Update existing reaction with server data
                    const updatedReactions = [...existingReactions];
                    updatedReactions[reactionIndex] = reaction;
                    return { ...m, reactions: updatedReactions };
                  } else {
                    // Add new reaction
                    return { ...m, reactions: [...existingReactions, reaction] };
                  }
                }
                return m;
              });
              const connectionId = state.messagesUsername
                ? getConnectionId(get, state.messagesUsername)
                : null;
              if (connectionId) {
                saveStoredMessages(connectionId, updatedMessages);
              }
              return { messagesList: updatedMessages };
            });
            utils.log('Reaction added/updated via WebSocket:', data);
          }

          // function responseFriendPreviewUpdate(set, get, data) {
          //   console.log('Received friend.preview.update:', data); // Debug log
          //   const { connectionId, preview, updated } = data;
          //   set(state => {
          //     const friendList = state.friendList.map(friend => {
          //       if (String(friend.id) === String(connectionId)) {
          //         console.log(`Updating preview for ${friend.friend.username}: ${preview}`); // Debug log
          //         return { ...friend, preview, updated };
          //       }
          //       return friend;
          //     });
          //     saveStoredFriendList(friendList);
          //     return { friendList };
          //   });
          //   utils.log('responseFriendPreviewUpdate applied:', data);
          // }

          const responses = {
            'friend.list': responseFriendList,
            'friend.new': responseFriendNew,
            'message.list': responseMessageList,
            'message.send': responseMessageSend,
            'message.type': responseMessageType,
            'request.accept': responseRequestAccept,
            'request.connect': responseRequestConnect,
            'request.list': responseRequestList,
            search: responseSearch,
            thumbnail: responseThumbnail,
            'group.created': responseGroupCreated,
            'online.status': responseOnlineStatus,
            'message.seen': responseMessageSeen,
            'reaction.add': responseReactionAdd,
            'friend.preview.update': responseFriendPreviewUpdate,
          };
          const resp = responses[parsed.source];
          if (!resp) {
            utils.log('Unknown source:', parsed.source);
            return;
          }
          resp(set, get, parsed.data);
        } catch (error) {
          utils.log('Error processing WebSocket message:', error);
        }
      };

      socket.onerror = e => utils.log('socket.onerror', e.message);

      socket.onclose = () => {
        utils.log('socket.onclose');
        set({socket: null});
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        utils.log(`Reconnecting in ${delay}ms (attempt ${attempt})`);
        setTimeout(() => connect(attempt + 1, maxAttempts), delay);
      };

      set({socket});
    };

    connect();
  },

  socketClose: () => {
    const socket = get().socket;
    if (socket) {
      socket.close();
      set({socket: null});
      utils.log('WebSocket closed');
    }
  },

  searchUsers: query => {
    if (!query) {
      set({searchList: null});
      return;
    }
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({source: 'search', query}));
    } else {
      get().addNotification('Cannot search users: No WebSocket connection');
    }
  },

  messageList: async (connectionId, page = 0) => {
    const storedMessages = await getStoredMessages(connectionId);
    const friend = get().friendList?.find(f => f.id === connectionId);
    if (!friend) {
      get().addNotification('Conversation not found');
      return;
    }
    const username = friend.friend.username;

    set({
      messagesList: page === 0 ? storedMessages : get().messagesList,
      messagesNext: null,
      messagesUsername: username,
      messagesTyping: null,
    });
    utils.log('messageList loaded:', storedMessages);

    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({source: 'message.list', connectionId, page}));
    } else {
      get().addNotification(
        'Messages loaded from storage only: No WebSocket connection',
      );
    }
  },

  messageSend: (
    connectionId,
    message,
    type,
    replied_to,
    isGroup,
    incognito,
    disappearing,
    file,
  ) => {
    const blockStatus = get().blockStatus[connectionId];
    if (blockStatus) {
      get().addNotification(
        'You are blocked by this user and cannot send messages',
      );
      return;
    }
    const socket = get().socket;
    const payload = {
      source: 'message.send',
      connectionId,
      message,
      type,
      replied_to,
      isGroup,
      incognito,
      disappearing,
    };
    if (file) payload.file = file;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      set(state => ({messageQueue: [...state.messageQueue, payload]}));
      get().addNotification('Message queued due to no connection');
    }
  },

  flushQueue: () => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      const queue = get().messageQueue;
      queue.forEach(payload => socket.send(JSON.stringify(payload)));
      set({messageQueue: []});
      get().addNotification('Queued messages sent', 'success');
    } else {
      utils.log('Cannot flush queue: WebSocket not connected');
    }
  },

  messageType: username => {
    clearTimeout(get().typingTimeout);
    set({
      typingTimeout: setTimeout(() => {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({source: 'message.type', username}));
        }
      }, 500),
    });
  },

  requestAccept: username => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({source: 'request.accept', username}));
    } else {
      get().addNotification('Cannot accept request: No WebSocket connection');
    }
  },

  requestConnect: username => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({source: 'request.connect', username}));
    } else {
      get().addNotification('Cannot send request: No WebSocket connection');
    }
  },

  createGroup: name => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({source: 'groups.create', name}));
    } else {
      get().addNotification('Cannot create group: No WebSocket connection');
    }
  },

  uploadFile: async (file, endpoint) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      get().addNotification('File upload queued due to no connection');
      return null;
    }
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.fileName,
      type: file.type,
    });
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'POST',
        url: `/chat/${endpoint}/`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      utils.log('File upload successful:', response.data);
      return response.data.fileUrl || response.data[endpoint];
    } catch (error) {
      utils.log(`Failed to upload ${endpoint}:`, error);
      get().addNotification(`Failed to upload ${endpoint}: ${error.message}`);
      throw error;
    }
  },

  uploadThumbnail: async file => {
    try {
      const fileUrl = await get().uploadFile(file, 'upload');
      if (fileUrl) {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({source: 'thumbnail', fileUrl}));
          utils.log('Thumbnail update sent:', fileUrl);
        } else {
          get().addNotification(
            'Cannot send thumbnail update: No WebSocket connection',
          );
        }
      }
      return fileUrl;
    } catch (error) {
      utils.log('Thumbnail upload failed:', error);
      return null;
    }
  },

  sendImage: async file => {
    try {
      const fileUrl = await get().uploadFile(file, 'upload');
      if (fileUrl) {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({source: 'image', fileUrl}));
          utils.log('Image sent:', fileUrl);
        } else {
          get().addNotification('Cannot send image: No WebSocket connection');
        }
      }
      return fileUrl;
    } catch (error) {
      utils.log('Image send failed:', error);
      return null;
    }
  },

  uploadBgImage: async file => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      get().addNotification(
        'Background image upload queued due to no connection',
      );
      return;
    }
    const formData = new FormData();
    formData.append('user_Bg_thumbnail', {
      uri: file.uri,
      name: file.fileName,
      type: file.type,
    });
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'POST',
        url: '/chat/upload-bg-thumbnail/',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      utils.log('Background image upload successful:', response.data);
      get().addNotification(
        'Background image uploaded successfully',
        'success',
      );
    } catch (error) {
      utils.log('Background image upload failed:', error);
      get().addNotification('Failed to upload background image');
    }
  },

  createPost: async (content, mediaFiles = []) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      get().addNotification('Post creation queued due to no connection');
      return;
    }
    const formData = new FormData();
    formData.append('content', content);
    mediaFiles.forEach((file, index) => {
      formData.append(`media_${index}`, {
        uri: file.uri,
        name: file.fileName,
        type: file.type,
      });
    });
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'POST',
        url: '/chat/posts/',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      set(state => ({posts: [response.data, ...state.posts]}));
      utils.log('Post created successfully:', response.data);
      get().addNotification('Post created successfully', 'success');
    } catch (error) {
      utils.log('Post creation failed:', error);
      get().addNotification('Failed to create post');
    }
  },

  interactWithPost: async (postId, action) => {
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'POST',
        url: `/chat/posts/${postId}/${action}/`,
        headers: {
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId
            ? {...post, [action + 's']: response.data[action + 's']}
            : post,
        ),
      }));
      utils.log(`Post ${postId} ${action} successful`);
    } catch (error) {
      utils.log(`Failed to ${action} post ${postId}:`, error);
      get().addNotification(`Failed to ${action} post`);
    }
  },

  createComment: async (postId, content) => {
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'POST',
        url: `/chat/posts/${postId}/comments/`,
        data: {content},
        headers: {
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      set(state => ({
        comments: {
          ...state.comments,
          [postId]: state.comments[postId]
            ? [response.data, ...state.comments[postId]]
            : [response.data],
        },
      }));
      utils.log(`Comment created on post ${postId}:`, response.data);
      get().addNotification('Comment added successfully', 'success');
    } catch (error) {
      utils.log('Comment creation failed:', error);
      get().addNotification('Failed to add comment');
    }
  },

  markMessagesSeen: async connectionId => {
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'POST',
        url: `/chat/mark-seen/${connectionId}/`,
        headers: {
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [connectionId]: 0,
        },
      }));
      utils.log(
        `Messages marked seen for connection ${connectionId}:`,
        response.data,
      );
    } catch (error) {
      utils.log('Failed to mark messages seen:', error);
      get().addNotification('Failed to mark messages seen');
    }
  },

  updateProfile: async (data, files = {}) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      get().addNotification('Profile update queued due to no connection');
      return;
    }
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    Object.entries(files).forEach(([key, file]) => {
      formData.append(key, {
        uri: file.uri,
        name: file.fileName,
        type: file.type,
      });
    });
    const tokens = await secure.get('tokens');
    try {
      const response = await api({
        method: 'PATCH',
        url: '/chat/profile/update/',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      set({user: response.data});
      utils.log('Profile updated successfully:', response.data);
      get().addNotification('Profile updated successfully', 'success');
    } catch (error) {
      utils.log('Profile update failed:', error);
      get().addNotification('Failed to update profile');
    }
  },

  blockUser: async username => {
    const tokens = await secure.get('tokens');
    try {
      await api({
        method: 'POST',
        url: `/chat/block/${username}/`,
        headers: {
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      utils.log(`User ${username} blocked successfully`);
      get().addNotification(`User ${username} blocked`, 'success');
    } catch (error) {
      utils.log('Failed to block user:', error);
      get().addNotification('Failed to block user');
    }
  },

  reportUser: async username => {
    const tokens = await secure.get('tokens');
    try {
      await api({
        method: 'POST',
        url: `/chat/report/${username}/`,
        headers: {
          ...(tokens?.access && {
            Authorization: `Bearer ${tokens.access}`,
          }),
        },
      });
      utils.log(`User ${username} reported successfully`);
      get().addNotification(`User ${username} reported`, 'success');
    } catch (error) {
      utils.log('Failed to report user:', error);
      get().addNotification('Failed to report user');
    }
  },

  addNotification: (message, type = 'error') => {
    set(state => ({
      notifications: [...state.notifications, {message, type, id: Date.now()}],
    }));
  },

  clearNotification: id => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },

  typingTimeout: null,
}));

export default useGlobal;