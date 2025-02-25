import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Cell from '../common/Cell';
import Empty from '../common/Empty';
import useGlobal from '../core/global';
import Thumbnail from '../common/Thumbnail';
import utils from '../core/utils';
import secure from '../core/secure';
import axios from 'axios';
import {ADDRESS} from '../core/api';

// Define color constants for the Telegram paper theme
const BACKGROUND_COLOR = '#FFFDE7'; // rgba(255, 253, 231, 1)
const PRIMARY_TEXT_COLOR = '#3F2F1F'; // Dark brown for main text
const SECONDARY_TEXT_COLOR = '#7A6A5A'; // Lighter brown-gray for secondary text
const ACCENT_COLOR = '#468284'; // Muted teal for buttons and highlights
const SEARCH_BG_COLOR = '#F5EBD9'; // Slightly darker cream for search bar
const ONLINE_COLOR = '#228B22'; // Forest green for online status
const OFFLINE_COLOR = '#8B0000'; // Dark red for offline status
const MODAL_BG_COLOR = '#FDF5E6'; // Slightly darker off-white for modal

function FriendRow({navigation, item, index, onFriendPress}) {
  const unreadCount = useGlobal(state => state.unreadCounts[item.id] || 0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    console.log(
      `Preview for ${item.friend.username} updated to: ${item.preview}`,
    );
  }, [item.preview]);

  const handlePress = async () => {
    await onFriendPress(item.id);
    navigation.navigate('Messages', {
      id: item.id,
      friend: item.friend,
      isGroup: item.is_group || false,
      groupAdmins: item.group_admins || [],
      unreadCount,
      isBlocked: item.isBlocked,
      iBlockedFriend: item.iBlockedFriend,
    });
  };

  return (
    <Animated.View
      style={[
        styles.button,
        {opacity: fadeAnim, transform: [{scale: scaleAnim}]},
      ]}>
      <Pressable
        onPress={handlePress}
        style={({pressed}) => [pressed && styles.buttonPressed]}>
        <Cell>
          <Thumbnail url={item.friend.thumbnail} size={50} />
          <View style={{flex: 1, paddingHorizontal: 0}}>
            <View style={{flexDirection: 'row', left: 10}}>
              <Text
                style={{
                  fontWeight: 'bold',
                  color: PRIMARY_TEXT_COLOR,
                  marginBottom: 4,
                }}>
                {item.friend.name}
              </Text>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  left: 6,
                }}>
                <Text
                  style={{
                    color:
                      unreadCount > 0 ? ACCENT_COLOR : SECONDARY_TEXT_COLOR,
                  }}>
                  {utils.formatTimeDays(item.updated)}
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={{color: SECONDARY_TEXT_COLOR, left: 15}}>
              {item.preview.length >= 30
                ? `${item.preview.slice(0, 20)}...`
                : item.preview}
            </Text>
            <Text
              style={{
                color: item.friend.online ? ONLINE_COLOR : OFFLINE_COLOR,
                left: 15,
                fontSize: 12,
              }}>
              {item.friend.online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </Cell>
      </Pressable>
    </Animated.View>
  );
}

function FriendsScreen({navigation}) {
  const friendList = useGlobal(state => state.friendList);
  const messageList = useGlobal(state => state.messageList);
  const createGroup = useGlobal(state => state.createGroup);
  const socket = useGlobal(state => state.socket);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Animate search bar on mount
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animate modal visibility
  useEffect(() => {
    Animated.spring(modalAnim, {
      toValue: modalVisible ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [modalVisible]);

  // Fetch friend list with block statuses
  // const fetchFriendListWithBlockStatus = async () => {
  //   setIsLoading(true);
  //   try {
  //     const token = (await secure.get('tokens'))?.access;
  //     const response = await axios.get(
  //       `https://${ADDRESS}/chat/friend-list-with-block-status/`,
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );
  //     const friendListWithBlockStatus = response.data;
  //     useGlobal.setState({ friendList: friendListWithBlockStatus });
  //     await saveStoredFriendList(friendListWithBlockStatus);
  //   } catch (error) {
  //     utils.log('Error fetching friend list with block status:', error);
  //     useGlobal.get().addNotification('Failed to fetch friend list');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Sync friend list and online status
  useEffect(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({source: 'friend.list'}));
      socket.send(JSON.stringify({source: 'online.status'}));
      // fetchFriendListWithBlockStatus();
    }
  }, [socket]);

  const filteredList = useMemo(() => {
    return (
      friendList?.filter(item =>
        item.friend.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ) || []
    );
  }, [friendList, searchQuery]);

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      utils.toast('Group name is required');
      return;
    }
    createGroup(groupName);
    setGroupName('');
    setModalVisible(false);
    utils.toast('Group created successfully');
  };

  const handleFriendPress = async connectionId => {
    await messageList(connectionId); // Fetch messages for this conversation
    utils.log(`Messages requested for connectionId: ${connectionId}`);
  };

  if (isLoading) {
    return <ActivityIndicator style={{flex: 1}} color={ACCENT_COLOR} />;
  }

  useEffect(() => {
    console.log(
      'FriendsScreen friendList updated:',
      friendList?.map(f => ({
        id: f.id,
        username: f.friend.username,
        preview: f.preview,
        updated: f.updated,
      })) || 'No friendList',
    );
  }, [friendList]);

  return (
    <View style={{flex: 1, backgroundColor: BACKGROUND_COLOR}}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
          },
        ]}>
        <TextInput
          placeholder="Search Contacts..."
          placeholderTextColor={SECONDARY_TEXT_COLOR}
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.createGroupButton}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.createGroupText}>+ New Group</Text>
        </TouchableOpacity>
      </Animated.View>

      {filteredList.length === 0 ? (
        <Empty
          icon="message"
          message={searchQuery ? 'No matches found' : 'No friends yet'}
        />
      ) : (
        <FlatList
          data={filteredList}
          renderItem={({item, index}) => (
            <FriendRow
              navigation={navigation}
              item={item}
              index={index}
              onFriendPress={handleFriendPress}
            />
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{paddingBottom: 20}}
        />
      )}

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}>
            <Text style={styles.modalTitle}>Create New Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter group name"
              placeholderTextColor={SECONDARY_TEXT_COLOR}
              value={groupName}
              onChangeText={setGroupName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, {backgroundColor: ACCENT_COLOR}]}
                onPress={handleCreateGroup}>
                <Text
                  style={[styles.modalButtonText, {color: BACKGROUND_COLOR}]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 46,
    width: '70%',
    backgroundColor: SEARCH_BG_COLOR,
    borderRadius: 25,
    paddingLeft: 40,
    color: PRIMARY_TEXT_COLOR,
  },
  searchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: BACKGROUND_COLOR,
  },
  button: {
    backgroundColor: 'transparent',
    marginVertical: 4,
    marginHorizontal: 10,
  },
  buttonPressed: {
    backgroundColor: '#E8E1C9', // Slightly darker cream for pressed state
  },
  badge: {
    position: 'absolute',
    top: 25,
    right: 4,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: BACKGROUND_COLOR,
    fontSize: 12,
    fontWeight: 'bold',
  },
  createGroupButton: {
    padding: 10,
  },
  createGroupText: {
    color: ACCENT_COLOR,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: MODAL_BG_COLOR,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_TEXT_COLOR,
    marginBottom: 10,
  },
  modalInput: {
    width: '100%',
    height: 40,
    borderColor: SECONDARY_TEXT_COLOR,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: PRIMARY_TEXT_COLOR,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
    backgroundColor: '#E8E1C9', // Default button color for Cancel
  },
  modalButtonText: {
    fontSize: 16,
    color: PRIMARY_TEXT_COLOR,
  },
});

export default FriendsScreen;
