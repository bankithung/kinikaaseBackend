import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  memo,
} from 'react';
import {
  Alert,
  Easing,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Linking,
  Pressable,
  Keyboard,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import Toast from 'react-native-simple-toast';
import {Menu, Divider} from 'react-native-paper';
import Geolocation from '@react-native-community/geolocation';
import {WebView} from 'react-native-webview';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {PanGestureHandler, State} from 'react-native-gesture-handler';
import Video from 'react-native-video';
import useGlobal, {saveStoredMessages} from '../core/global';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import utils from '../core/utils';
import Clipboard from '@react-native-clipboard/clipboard';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import secure from '../core/secure';
import Map from './map';
import ImageResizer from 'react-native-image-resizer';
import {ADDRESS} from '../core/api';
import Thumbnail from '../common/Thumbnail';
import EmojiPicker from 'rn-emoji-keyboard';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import AudioPlayerT from './AudioPlayer';
import DocumentPicker from 'react-native-document-picker';

const API_BASE_URL = ADDRESS;

const ASSETS = {
  sendIcon: require('../assets/icons/sendM.png'),
  image: require('../assets/image.png'),
  camera: require('../assets/icons/camera.png'),
  gallery: require('../assets/icons/gallery.png'),
  location: require('../assets/icons/more/location.png'),
  videocall: require('../assets/icons/more/videocall.png'),
  voicecall: require('../assets/phone.png'),
  play: require('../assets/play.png'),
  pause: require('../assets/pause.png'),
  down: require('../assets/down.png'),
  del: require('../assets/del.png'),
  reply: require('../assets/replyM.png'),
  copy: require('../assets/copy.png'),
  close: require('../assets/close.png'),
  sendMessageIcon: require('../assets/send.png'),
  seen: require('../assets/seenM.png'),
  unseen: require('../assets/unseenM.png'),
  plus: require('../assets/plus.png'),
  pin: require('../assets/plus.png'),
  mute: require('../assets/mute.png'),
  block: require('../assets/mute.png'),
  report: require('../assets/mute.png'),
  documentIcon: require('../assets/document.png'),
  download: require('../assets/downloads.png'),
  video: require('../assets/video.png'),
  edit: require('../assets/edit.png'),
  react: require('../assets/react.png'),
};

const audioRecorderPlayer = new AudioRecorderPlayer();
audioRecorderPlayer.setSubscriptionDuration(0.1);

interface Message {
  id: string;
  text: string;
  type: string;
  created: string;
  is_me: boolean;
  seen: boolean;
  is_deleted: boolean;
  replied_to?: string | null;
  replied_to_message?: Message;
  reactions?: {emoji: string; user: string}[];
  mentions?: string[];
  pinned: boolean;
  disappearing?: number;
  incognito: boolean;
}

interface Friend {
  name: string;
  username: string;
  thumbnail?: string;
  online: boolean;
}

interface User {
  username: string;
  thumbnail?: string;
}

const extractFileName = url => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1] || 'Document';
};

const formatFileSize = bytes => {
  if (!bytes) return '0 KB';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const MessageHeader = memo(
  ({
    friend,
    navigation,
    connectionId,
    user,
    isGroup,
    groupAdmins,
    onMuteToggle,
    onBlockUser,
    onUnblockUser,
    onReportUser,
    isUserBlockedByMe,
  }) => {
    const messageSend = useGlobal(state => state.messageSend);
    const [visible, setVisible] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const socket = useGlobal(state => state.socket);


    useEffect(() => {
      Animated.timing(scaleAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, [visible]);

    if (!friend) return null;

    const handleProfile = useCallback(
      () => navigation.navigate('OtherProfile', {friend}),
      [navigation, friend],
    );

    const generateID = useCallback(() => {
      const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      return Array.from({length: 6}, () =>
        characters.charAt(Math.floor(Math.random() * characters.length)),
      ).join('');
    }, []);

    // const openVideoCall = useCallback(() => {
    //   const id = generateID();
    //   messageSend({
    //     source: 'call.request',
    //     data: { connectionId, roomId: id }
    //   });
    //   navigation.navigate('CallingScreen', { roomId: id, friend, connectionId });
    // }, [connectionId, friend, navigation, messageSend]);

    const openVideoCall = useCallback(() => {
      if (!connectionId) {
        Toast.show('Cannot initiate call: No connection ID', Toast.SHORT);
        return;
      }
      const id = generateID(); // Generate a unique room ID
      if (socket) {
        socket.send(JSON.stringify({
          source: 'call.request',
          data: { connectionId, roomId: id }
        }));
        navigation.navigate('CallingScreen', { roomId: id, friend, connectionId });
      } else {
        console.error('WebSocket not connected');
        Toast.show('Unable to initiate call: No connection', Toast.SHORT);
      }
    }, [connectionId, friend, navigation, socket]);


    const openVoiceCall = useCallback(() => {
      if (!connectionId) {
        Toast.show('Cannot initiate voice call: No connection ID', Toast.SHORT);
        return;
      }
      const id = generateID();
      if (socket) {
        socket.send(JSON.stringify({ source: 'voicecall.request', data: { connectionId, roomId: id } }));
        navigation.navigate('VoiceCallingScreen', { roomId: id, friend, connectionId });
      } else {
        Toast.show('Unable to initiate voice call: No connection', Toast.SHORT);
      }
    }, [connectionId, friend, navigation, socket]);
    
    const openPlayer = useCallback(
      ({roomType}) => {
        const id = generateID();
        const val = roomType === 'PlayMusic' ? 'listen' : 'watch';
        messageSend(connectionId, id, val, null, isGroup);
        navigation.navigate(roomType, {
          roomId: id,
          navigation,
          host: user.username,
          isGroup,
        });
      },
      [connectionId, navigation, user.username, messageSend, isGroup],
    );

    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleProfile}>
          <Thumbnail url={friend.thumbnail} size={40} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{friend.username}</Text>
            <Text style={styles.onlineStatus}>
              {friend.online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={openVideoCall}>
            <FontAwesomeIcon
              icon="video"
              size={20}
              color="black"
              style={styles.headerIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={openVoiceCall}>
            <FontAwesomeIcon
              icon="phone"
              size={20}
              color="black"
              style={styles.headerIcon}
            />
          </TouchableOpacity>
          <Menu
            visible={visible}
            onDismiss={() => setVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setVisible(true)}>
                <FontAwesomeIcon icon="ellipsis-v" size={20} color="black" />
              </TouchableOpacity>
            }
            contentStyle={[
              styles.menuContent,
              {transform: [{scale: scaleAnim}]},
            ]}>
            <Menu.Item
              onPress={() => {
                setVisible(false);
                openPlayer({roomType: 'PlayMusic'});
              }}
              title="Listen Together"
              titleStyle={styles.menuItemText}
            />
            <Divider style={styles.menuDivider} />
            <Menu.Item
              onPress={() => {
                setVisible(false);
                openPlayer({roomType: 'PlayVideo'});
              }}
              title="Watch Together"
              titleStyle={styles.menuItemText}
            />
            <Divider style={styles.menuDivider} />
            <Menu.Item
              onPress={() => {
                setVisible(false);
                onMuteToggle();
              }}
              title="Mute Notifications"
              titleStyle={styles.menuItemText}
            />
            {!isGroup && (
              <>
                <Divider style={styles.menuDivider} />
                {isUserBlockedByMe ? (
                  <Menu.Item
                    onPress={() => {
                      setVisible(false);
                      onUnblockUser();
                    }}
                    title="Unblock User"
                    titleStyle={styles.menuItemText}
                  />
                ) : (
                  <Menu.Item
                    onPress={() => {
                      setVisible(false);
                      onBlockUser();
                    }}
                    title="Block User"
                    titleStyle={styles.menuItemText}
                  />
                )}
                <Divider style={styles.menuDivider} />
                <Menu.Item
                  onPress={() => {
                    setVisible(false);
                    onReportUser();
                  }}
                  title="Report User"
                  titleStyle={styles.menuItemText}
                />
              </>
            )}
            {isGroup && groupAdmins.includes(user.username) && (
              <>
                <Divider style={styles.menuDivider} />
                <Menu.Item
                  onPress={() =>
                    navigation.navigate('GroupSettings', {connectionId})
                  }
                  title="Group Settings"
                  titleStyle={styles.menuItemText}
                />
              </>
            )}
          </Menu>
        </View>
      </View>
    );
  },
);

const MessageBubbleMe = memo(
  ({
    text,
    navigation,
    previousMessage,
    connectionId,
    replyingTo,
    setReplyingTo,
    friend,
    displayedDays,
    onReplyPress,
    highlightedMessageId,
    onPinMessage,
    onEditMessage,
    selectedMessageId,
    setSelectedMessageId,
    startEditing,
  }) => {
    const user = useGlobal(state => state.user);
    const [token, setToken] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const fetchToken = async () => {
        const tokens = await secure.get('tokens');
        setToken(tokens?.access || '');
      };
      fetchToken();
    }, []);

    const currentMessageDay = utils.formatTimeDays(text.created);
    const previousMessageDay = previousMessage
      ? utils.formatTimeDays(previousMessage.created)
      : null;
    const shouldShowDay =
      !displayedDays.has(currentMessageDay) &&
      currentMessageDay !== previousMessageDay;
    if (shouldShowDay) displayedDays.add(currentMessageDay);

    const copyToClipboard = useCallback(async () => {
      await Clipboard.setString(text.text);
      Toast.show('Copied to clipboard', Toast.SHORT);
      setSelectedMessageId(null);
    }, [text.text, setSelectedMessageId]);

    const deleteMessage = useCallback(async () => {
      try {
        await axios.post(
          `https://${API_BASE_URL}/chat/messages/delete/${text.id}/`,
          {},
          {headers: {Authorization: `Bearer ${token}`}},
        );
        Toast.show('Message deleted', Toast.SHORT);
        setSelectedMessageId(null);
      } catch (error) {
        Toast.show('Failed to delete', Toast.SHORT);
      }
    }, [text.id, token, setSelectedMessageId]);

    const handleReaction = useCallback(
      async emojiObj => {
        const emoji = typeof emojiObj === 'object' ? emojiObj.emoji : emojiObj;
        if (!emoji || emoji.length > 255) {
          Toast.show('Invalid emoji', Toast.SHORT);
          return;
        }
        try {
          const response = await axios.post(
            `https://${API_BASE_URL}/chat/messages/react/${text.id}/`,
            {emoji},
            {headers: {Authorization: `Bearer ${token}`}},
          );
          if (response.status === 201) {
            const serverReactionId = response.data.id;
            const newReaction = {
              id: serverReactionId || `temp_${Date.now()}`,
              emoji,
              user: user.username,
              created: new Date().toISOString(),
            };
            useGlobal.setState(state => {
              const updatedMessages = state.messagesList.map(m => {
                if (m.id === text.id) {
                  const existingReactions = m.reactions || [];
                  const reactionExists = existingReactions.some(
                    r => r.emoji === emoji && r.user === user.username,
                  );
                  if (!reactionExists) {
                    return {
                      ...m,
                      reactions: [...existingReactions, newReaction],
                    };
                  }
                }
                return m;
              });
              saveStoredMessages(
                state.connectionId || connectionId,
                updatedMessages,
              );
              return {messagesList: updatedMessages};
            });
            Toast.show('Reaction added', Toast.SHORT);
            setShowEmojiPicker(false);
            setSelectedMessageId(null);
          }
        } catch (error) {
          Toast.show('Failed to react', Toast.SHORT);
          console.error('Reaction error:', error);
        }
      },
      [text.id, token, user.username, connectionId, setSelectedMessageId],
    );

    const onGestureEvent = Animated.event(
      [{nativeEvent: {translationX: translateX}}],
      {useNativeDriver: true},
    );
    const onHandlerStateChange = event => {
      if (event.nativeEvent.state === State.END) {
        if (event.nativeEvent.translationX < -50) {
          console.log(text.is_deleted);
          let temp = text.is_deleted ? 'Deleted message' : text;
          setReplyingTo(temp);
          setSelectedMessageId(null);
          Animated.timing(translateX, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start(() =>
            Animated.timing(translateX, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(),
          );
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    const [lt, lo] = text.type === 'location' ? text.text.split(' ') : ['', ''];
    const map = Map({lt, lo});

    const openGoogleMaps = useCallback(
      () =>
        Linking.openURL(
          Platform.select({
            ios: `https://maps.apple.com/?ll=${lt},${lo}`,
            android: `google.navigation:q=${lt},${lo}`,
          }),
        ),
      [lt, lo],
    );
    const openCameras = useCallback(
      () =>
        navigation.navigate('VideoCallScreen', {
          roomId: text.text,
          navigation,
          friend,
        }),
      [navigation, text.text, friend],
    );
    const openVoiceCall = useCallback(
      () =>
        navigation.navigate('VoiceCallScreen', {
          roomId: text.text,
          navigation,
          friend,
        }),
      [navigation, text.text, friend],
    );
    const openPlayer = useCallback(
      () =>
        navigation.navigate(text.type === 'watch' ? 'PlayVideo' : 'PlayMusic', {
          roomId: text.text,
          navigation,
          host: user.username,
        }),
      [navigation, text.type, text.text, user.username],
    );

    const isHighlighted = highlightedMessageId === text.id;
    const showOptions = selectedMessageId === text.id;

    return (
      <View style={styles.bubbleRowMe}>
        {shouldShowDay && (
          <View style={styles.dayContainer}>
            <Text style={styles.dayText}>{currentMessageDay}</Text>
          </View>
        )}
        <View style={styles.bubbleMeContainer}>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}>
            <Animated.View style={{transform: [{translateX}]}}>
              <View
                style={[
                  styles.bubbleMe,
                  text.type !== 'text' && styles.bubbleMedia,
                  isHighlighted && styles.highlightedBubble,
                  text.pinned && styles.pinnedBubble,
                ]}>
                {text.is_deleted ? (
                  <Text style={styles.deletedText}>Message deleted</Text>
                ) : (
                  <View style={styles.bubbleContent}>
                    {text.replied_to && text.replied_to_message && (
                      <TouchableOpacity
                        onPress={() => onReplyPress(text.replied_to)}>
                        <View style={styles.replyContainerMe}>
                          <Text style={styles.replyAuthorMe}>
                            {text.replied_to_message.is_me
                              ? 'You'
                              : text.replied_to_message.user || friend.name}
                          </Text>
                          {text.replied_to_message.type === 'text' ? (
                            <Text style={styles.replyTextMe}>
                              {text.replied_to_message.text}
                            </Text>
                          ) : (
                            <View style={styles.replyImageContainerMe}>
                              <Image
                                source={{
                                  uri: `https://${API_BASE_URL}${text.replied_to_message.text}`,
                                }}
                                style={styles.replyImage}
                              />
                              <Text style={styles.replyTextMe}>
                                {text.replied_to_message.type}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    <>
                      {text.type === 'image' || text.type === 'video' ? (
                        <TouchableOpacity
                          disabled={text.type === 'image' ? false : true}
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }
                          onPress={() =>
                            navigation.navigate('ViewAnyImage', {
                              type: `https://${API_BASE_URL}${text.text}`,
                              mediaType: text.type,
                            })
                          }>
                          {text.type === 'image' ? (
                            <Image
                              source={{
                                uri: `https://${API_BASE_URL}${text.text}`,
                              }}
                              style={styles.mediaImage}
                            />
                          ) : (
                            <Video
                              source={{
                                uri: `https://${API_BASE_URL}${text.text}`,
                              }}
                              style={styles.mediaImage}
                              controls
                              paused
                            />
                          )}
                        </TouchableOpacity>
                      ) : text.type === 'audio' ? (
                        <Pressable
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }>
                          <AudioPlayerT
                            audioUrl={`https://${API_BASE_URL}${text.text}`}
                            from="me"
                          />
                        </Pressable>
                      ) : text.type === 'document' ? (
                        <TouchableOpacity
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }
                          onPress={() =>
                            Linking.openURL(
                              `https://${API_BASE_URL}${text.text}`,
                            )
                          }
                          style={styles.documentContainer}>
                          <Image
                            source={ASSETS.documentIcon}
                            style={styles.documentIcon}
                          />
                          <View style={styles.documentDetails}>
                            <Text
                              style={styles.documentFileName}
                              numberOfLines={1}>
                              {text.fileName ||
                                extractFileName(text.text) ||
                                'Document'}
                            </Text>
                            <Text style={styles.documentMeta}>
                              {text.fileSize
                                ? formatFileSize(text.fileSize)
                                : 'Unknown size'}{' '}
                              • PDF
                            </Text>
                          </View>
                          <Image
                            source={ASSETS.download}
                            style={styles.downloadIcon}
                          />
                        </TouchableOpacity>
                      ) : text.type === 'text' ? (
                        <Pressable
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }>
                          <Text style={styles.bubbleTextMe}>
                            {text.text.split(' ').map((word, index) =>
                              word.startsWith('@') ? (
                                <Text key={index} style={styles.mention}>
                                  {word}{' '}
                                </Text>
                              ) : (
                                `${word} `
                              ),
                            )}
                          </Text>
                        </Pressable>
                      ) : text.type === 'location' ? (
                        <TouchableOpacity onPress={openGoogleMaps}>
                          <WebView
                            originWhitelist={['*']}
                            source={{html: map}}
                            style={styles.locationMap}
                          />
                        </TouchableOpacity>
                      ) : text.type === 'videocall' ? (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={openCameras}>
                          <Text style={styles.actionText}>Join</Text>
                        </TouchableOpacity>
                      ) : text.type === 'voicecall' ? (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={openVoiceCall}>
                          <Text style={styles.actionText}>Join</Text>
                        </TouchableOpacity>
                      ) : text.type === 'listen' || text.type === 'watch' ? (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={openPlayer}>
                          <Text style={styles.actionText}>
                            {text.type === 'listen' ? 'Listen' : 'Watch'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <View style={styles.messageFooter}>
                        <Text style={styles.timestampMe}>
                          {utils.formatTimeChat(text.created)}
                        </Text>
                        {text.seen ? (
                          <Image
                            source={ASSETS.seen}
                            style={styles.seenIconMe}
                          />
                        ) : (
                          <Image
                            source={ASSETS.unseen}
                            style={styles.unseenIconMe}
                          />
                        )}
                      </View>
                    </>
                  </View>
                )}
              </View>
              {text.reactions?.length > 0 && (
                <View style={styles.reactionsContainer}>
                  {text.reactions.map(r => (
                    <Text key={r.id} style={styles.reactionEmoji}>
                      {r.emoji}
                    </Text>
                  ))}
                </View>
              )}
            </Animated.View>
          </PanGestureHandler>
          {showOptions && (
            <View style={styles.optionsContainerMe}>
              <TouchableOpacity onPress={deleteMessage}>
                <Image source={ASSETS.del} style={styles.optionIconMe} />
              </TouchableOpacity>
              <TouchableOpacity onPress={copyToClipboard}>
                <Image source={ASSETS.copy} style={styles.optionIconMe} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo(text);
                  setSelectedMessageId(null);
                }}>
                <Image source={ASSETS.reply} style={styles.optionIconMe} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => startEditing(text)}>
                <Image source={ASSETS.edit} style={styles.optionIconMe} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                <Image source={ASSETS.react} style={styles.optionIconMe} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <EmojiPicker
          open={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onEmojiSelected={handleReaction}
        />
      </View>
    );
  },
);
const MessageBubbleFriend = memo(
  ({
    text,
    friend,
    typing = false,
    connectionId,
    navigation,
    previousMessage,
    replyingTo,
    setReplyingTo,
    displayedDays,
    onReplyPress,
    highlightedMessageId,
    onPinMessage,
    selectedMessageId,
    setSelectedMessageId,
  }) => {
    const user = useGlobal(state => state.user);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [token, setToken] = useState('');
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const fetchToken = async () => {
        const tokens = await secure.get('tokens');
        setToken(tokens?.access || '');
      };
      fetchToken();
    }, []);

    const currentMessageDay = typing
      ? null
      : utils.formatTimeDays(text.created);
    const previousMessageDay = previousMessage
      ? utils.formatTimeDays(previousMessage.created)
      : null;
    const shouldShowDay =
      !typing &&
      currentMessageDay &&
      !displayedDays.has(currentMessageDay) &&
      currentMessageDay !== previousMessageDay;
    if (shouldShowDay) displayedDays.add(currentMessageDay);

    const copyToClipboard = useCallback(async () => {
      if (!text?.text) return;
      await Clipboard.setString(text.text);
      Toast.show('Copied to clipboard', Toast.SHORT);
      setSelectedMessageId(null);
    }, [text?.text, setSelectedMessageId]);

    const handleReaction = useCallback(
      async emojiObj => {
        const emoji = typeof emojiObj === 'object' ? emojiObj.emoji : emojiObj;
        if (!emoji || emoji.length > 255) {
          Toast.show('Invalid emoji', Toast.SHORT);
          return;
        }
        try {
          const response = await axios.post(
            `https://${API_BASE_URL}/chat/messages/react/${text.id}/`,
            {emoji},
            {headers: {Authorization: `Bearer ${token}`}},
          );
          if (response.status === 201) {
            const serverReactionId = response.data.id;
            const newReaction = {
              id: serverReactionId || `temp_${Date.now()}`,
              emoji,
              user: user.username,
              created: new Date().toISOString(),
            };
            useGlobal.setState(state => {
              const updatedMessages = state.messagesList.map(m => {
                if (m.id === text.id) {
                  const existingReactions = m.reactions || [];
                  const reactionExists = existingReactions.some(
                    r => r.emoji === emoji && r.user === user.username,
                  );
                  if (!reactionExists) {
                    return {
                      ...m,
                      reactions: [...existingReactions, newReaction],
                    };
                  }
                }
                return m;
              });
              saveStoredMessages(
                state.connectionId || connectionId,
                updatedMessages,
              );
              return {messagesList: updatedMessages};
            });
            Toast.show('Reaction added', Toast.SHORT);
            setShowEmojiPicker(false);
            setSelectedMessageId(null);
          }
        } catch (error) {
          Toast.show('Failed to react', Toast.SHORT);
          console.error('Reaction error:', error);
        }
      },
      [text.id, token, user.username, connectionId, setSelectedMessageId],
    );

    const onGestureEvent = Animated.event(
      [{nativeEvent: {translationX: translateX}}],
      {useNativeDriver: true},
    );
    const onHandlerStateChange = event => {
      if (event.nativeEvent.state === State.END) {
        if (event.nativeEvent.translationX > 50) {
          setReplyingTo(text);
          setSelectedMessageId(null);
          Animated.timing(translateX, {
            toValue: 100,
            duration: 200,
            useNativeDriver: true,
          }).start(() =>
            Animated.timing(translateX, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(),
          );
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    const [lt, lo] = typing ? ['', ''] : text?.text.split(' ') || ['', ''];
    const map = Map({lt, lo});

    const openGoogleMaps = useCallback(
      () =>
        Linking.openURL(
          Platform.select({
            ios: `https://maps.apple.com/?ll=${lt},${lo}`,
            android: `google.navigation:q=${lt},${lo}`,
          }),
        ),
      [lt, lo],
    );
    const openCameras = useCallback(
      () =>
        navigation.navigate('VideoCallScreen', {
          roomId: text.text,
          navigation,
          friend,
        }),
      [navigation, text?.text, friend],
    );
    const openVoiceCall = useCallback(() => {
      navigation.navigate('VoiceCallScreen', {
        roomId: text.text,
        friend,
        isIncoming: true,
      });
    }, [navigation, text?.text, friend]);

    const openPlayer = useCallback(
      () =>
        navigation.navigate(text.type === 'watch' ? 'PlayVideo' : 'PlayMusic', {
          roomId: text.text,
          navigation,
          host: user.username,
        }),
      [navigation, text?.type, text?.text, user.username],
    );

    const isHighlighted = highlightedMessageId === text?.id;
    const showOptions = selectedMessageId === text.id;

    const TypingIndicator = () => {
      const dot1Anim = new Animated.Value(0);
      const dot2Anim = new Animated.Value(0);
      const dot3Anim = new Animated.Value(0);

      useEffect(() => {
        const animate = () => {
          const timing = anim =>
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]);

          Animated.loop(
            Animated.stagger(200, [
              timing(dot1Anim),
              timing(dot2Anim),
              timing(dot3Anim),
            ]),
          ).start();
        };

        animate();
      }, [dot1Anim, dot2Anim, dot3Anim]);

      const interpolate = anim =>
        anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 5],
        });

      return (
        <View style={styles.typingContainer}>
          <Animated.View
            style={[
              styles.typingDot,
              {transform: [{translateY: interpolate(dot1Anim)}]},
            ]}
          />
          <Animated.View
            style={[
              styles.typingDot,
              {transform: [{translateY: interpolate(dot2Anim)}]},
            ]}
          />
          <Animated.View
            style={[
              styles.typingDot,
              {transform: [{translateY: interpolate(dot3Anim)}]},
            ]}
          />
        </View>
      );
    };

    return (
      <View style={styles.bubbleRowFriend}>
        {shouldShowDay && (
          <View style={styles.dayContainer}>
            <Text style={styles.dayText}>{currentMessageDay}</Text>
          </View>
        )}
        <View style={styles.bubbleFriendContainer}>
          <View style={styles.avatarContainer}>
            <Thumbnail url={friend.thumbnail} size={35} />
          </View>
          <View style={styles.bubbleFriendWrapper}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}>
              <Animated.View style={{transform: [{translateX}]}}>
                <View
                  style={[
                    styles.bubbleFriend,
                    typing || text.type !== 'text' ? styles.bubbleMedia : null,
                    isHighlighted && styles.highlightedBubble,
                    text.pinned && styles.pinnedBubble,
                  ]}>
                  {typing ? (
                    <TypingIndicator />
                  ) : text.is_deleted ? (
                    <Text style={styles.deletedText}>Message deleted</Text>
                  ) : (
                    <View style={styles.bubbleContent}>
                      {text.replied_to && text.replied_to_message && (
                        <TouchableOpacity
                          onPress={() => onReplyPress(text.replied_to)}>
                          <View style={styles.replyContainerFriend}>
                            <Text style={styles.replyAuthorFriend}>
                              {text.replied_to_message.is_me
                                ? 'You'
                                : text.replied_to_message.user || friend.name}
                            </Text>
                            {text.replied_to_message.type === 'text' ? (
                              <Text style={styles.replyTextFriend}>
                                {text.replied_to_message.text}
                              </Text>
                            ) : (
                              <View style={styles.replyImageContainerFriend}>
                                <Image
                                  source={{
                                    uri: `https://${API_BASE_URL}${text.replied_to_message.text}`,
                                  }}
                                  style={styles.replyImage}
                                />
                                <Text style={styles.replyTextFriend}>
                                  {text.replied_to_message.type}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                      {text.type === 'text' ? (
                        <Pressable
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }>
                          <Text style={styles.bubbleTextFriend}>
                            {text.text.split(' ').map((word, index) =>
                              word.startsWith('@') ? (
                                <Text key={index} style={styles.mention}>
                                  {word}{' '}
                                </Text>
                              ) : (
                                `${word} `
                              ),
                            )}
                          </Text>
                        </Pressable>
                      ) : text.type === 'image' || text.type === 'video' ? (
                        <TouchableOpacity
                          disabled={text.type === 'image' ? false : true}
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }
                          onPress={() =>
                            navigation.navigate('ViewAnyImage', {
                              type: `https://${API_BASE_URL}${text.text}`,
                              mediaType: text.type,
                            })
                          }>
                          {text.type === 'image' ? (
                            <Image
                              source={{
                                uri: `https://${API_BASE_URL}${text.text}`,
                              }}
                              style={styles.mediaImageFriend}
                            />
                          ) : (
                            <Video
                              source={{
                                uri: `https://${API_BASE_URL}${text.text}`,
                              }}
                              style={styles.mediaImageFriend}
                              controls
                              paused
                            />
                          )}
                        </TouchableOpacity>
                      ) : text.type === 'audio' ? (
                        <Pressable
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }>
                          <AudioPlayerT
                            audioUrl={`https://${API_BASE_URL}${text.text}`}
                            from="friend"
                          />
                        </Pressable>
                      ) : text.type === 'document' ? (
                        <TouchableOpacity
                          onLongPress={() =>
                            setSelectedMessageId(showOptions ? null : text.id)
                          }
                          onPress={() =>
                            Linking.openURL(
                              `https://${API_BASE_URL}${text.text}`,
                            )
                          }
                          style={styles.documentContainerFriend}>
                          <Image
                            source={ASSETS.documentIcon}
                            style={styles.documentIcon}
                          />
                          <View style={styles.documentDetails}>
                            <Text
                              style={styles.documentFileName}
                              numberOfLines={1}>
                              {text.fileName ||
                                extractFileName(text.text) ||
                                'Document'}
                            </Text>
                            <Text style={styles.documentMeta}>
                              {text.fileSize
                                ? formatFileSize(text.fileSize)
                                : 'Unknown size'}{' '}
                              • PDF
                            </Text>
                          </View>
                          <Image
                            source={ASSETS.download}
                            style={styles.downloadIcon}
                          />
                        </TouchableOpacity>
                      ) : text.type === 'location' ? (
                        <TouchableOpacity onPress={openGoogleMaps}>
                          <WebView
                            originWhitelist={['*']}
                            source={{html: map}}
                            style={styles.locationMap}
                          />
                        </TouchableOpacity>
                      ) : text.type === 'videocall' ? (
                        <View style={styles.callContainer}>
                          <Text style={styles.callText}>
                            Incoming Video Call
                          </Text>
                          <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={openCameras}>
                            <Text style={styles.actionText}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      ) : text.type === 'voicecall' ? (
                        <View style={styles.callContainer}>
                          <Text style={styles.callText}>
                            Incoming Voice Call
                          </Text>
                          <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={openVoiceCall}>
                            <Text style={styles.actionText}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      ) : text.type === 'listen' || text.type === 'watch' ? (
                        <TouchableOpacity
                          style={styles.actionButtonFriend}
                          onPress={openPlayer}>
                          <Text style={styles.actionText}>
                            {text.type === 'listen' ? 'Listen' : 'Watch'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <Text style={styles.timestampFriend}>
                        {utils.formatTimeChat(text.created)}
                      </Text>
                    </View>
                  )}
                </View>
                {text.reactions?.length > 0 && (
                  <View style={styles.reactionsContainer}>
                    {text.reactions.map(r => (
                      <Text key={r.id} style={styles.reactionEmoji}>
                        {r.emoji}
                      </Text>
                    ))}
                  </View>
                )}
              </Animated.View>
            </PanGestureHandler>
            {showOptions && !typing && (
              <View style={styles.optionsContainerFriend}>
                <TouchableOpacity onPress={copyToClipboard}>
                  <Image source={ASSETS.copy} style={styles.optionIconFriend} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(text);
                    setSelectedMessageId(null);
                  }}>
                  <Image
                    source={ASSETS.reply}
                    style={styles.optionIconFriend}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                  <Image source={ASSETS.react} style={styles.optionIconFriend} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <EmojiPicker
          open={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onEmojiSelected={handleReaction}
        />
      </View>
    );
  },
);

const MessageBubble = memo(
  ({
    index,
    message,
    friend,
    navigation,
    connectionId,
    previousMessage,
    setReplyingTo,
    replyingTo,
    displayedDays,
    onReplyPress,
    highlightedMessageId,
    onPinMessage,
    onEditMessage,
    selectedMessageId,
    setSelectedMessageId,
    startEditing,
  }) => {
    const [showTyping, setShowTyping] = useState(false);
    const messagesTyping = useGlobal(state => state.messagesTyping);

    useEffect(() => {
      if (index !== 0) return;
      if (!messagesTyping) {
        setShowTyping(false);
        return;
      }
      setShowTyping(true);
      const interval = setInterval(() => {
        const now = Date.now();
        if (now - messagesTyping > 10000) setShowTyping(false);
      }, 1000);
      return () => clearInterval(interval);
    }, [messagesTyping, index]);

    if (index === 0) {
      if (showTyping) {
        const dummyMessage = {
          id: 'typing-placeholder',
          text: '',
          type: 'text',
          created: new Date().toISOString(),
          is_me: false,
          seen: false,
          is_deleted: false,
          pinned: false,
          incognito: false,
        };
        return (
          <MessageBubbleFriend
            friend={friend}
            text={dummyMessage}
            typing={true}
            connectionId={connectionId}
            displayedDays={displayedDays}
            onReplyPress={onReplyPress}
            highlightedMessageId={highlightedMessageId}
            onPinMessage={onPinMessage}
            selectedMessageId={selectedMessageId}
            setSelectedMessageId={setSelectedMessageId}
          />
        );
      }
      return null;
    }

    return message.is_me ? (
      <MessageBubbleMe
        text={message}
        navigation={navigation}
        previousMessage={previousMessage}
        setReplyingTo={setReplyingTo}
        replyingTo={replyingTo}
        friend={friend}
        displayedDays={displayedDays}
        onReplyPress={onReplyPress}
        highlightedMessageId={highlightedMessageId}
        onPinMessage={onPinMessage}
        onEditMessage={onEditMessage}
        connectionId={connectionId}
        selectedMessageId={selectedMessageId}
        setSelectedMessageId={setSelectedMessageId}
        startEditing={startEditing}
      />
    ) : (
      <MessageBubbleFriend
        text={message}
        friend={friend}
        navigation={navigation}
        previousMessage={previousMessage}
        setReplyingTo={setReplyingTo}
        replyingTo={replyingTo}
        displayedDays={displayedDays}
        onReplyPress={onReplyPress}
        highlightedMessageId={highlightedMessageId}
        onPinMessage={onPinMessage}
        connectionId={connectionId}
        selectedMessageId={selectedMessageId}
        setSelectedMessageId={setSelectedMessageId}
      />
    );
  },
);

const MessageInput = memo(
  ({
    message,
    setMessage,
    onSend,
    connectionId,
    navigation,
    user,
    friend,
    isGroup,
    setIncognito,
    incognito,
    setDisappearing,
    disappearing,
    editingMessage,
    setEditingMessage,
    onSaveEdit,
  }) => {
    const [height, setHeight] = useState(48);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordedUri, setRecordedUri] = useState(null);
    const [openPlayer, setOpenPlayer] = useState(false);
    const [openMap, setOpenMap] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lt, setLt] = useState('');
    const [lo, setLo] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [showDisappearingOptions, setShowDisappearingOptions] =
      useState(false);
    const [waveAnimation] = useState(new Animated.Value(0));
    const optionsAnim = useRef(new Animated.Value(0)).current;
    const messageSend = useGlobal(state => state.messageSend);
    const textInputRef = useRef(null);

    const requestStoragePermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'This app needs access to your storage to select media.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Storage access is required.');
          return false;
        }
      }
      return true;
    };

    const requestMicrophonePermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Microphone access is required.');
          return false;
        }
      }
      return true;
    };

    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      if (isRecording) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      } else {
        pulseAnim.setValue(1);
      }
    }, [isRecording]);

    useEffect(() => {
      Animated.timing(optionsAnim, {
        toValue: showOptions ? 1 : 0,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }, [showOptions]);

    useEffect(() => {
      if (isPlaying) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnimation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      } else {
        waveAnimation.setValue(0);
      }
    }, [isPlaying, waveAnimation]);

    const startRecording = useCallback(async () => {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Toast.show('No internet connection. Recording queued.', Toast.LONG);
        return;
      }

      try {
        setRecordedUri(null);
        setOpenPlayer(false);
        setIsPlaying(false);
        await audioRecorderPlayer.startRecorder();
        setIsRecording(true);
        Toast.show('Recording started', Toast.SHORT);
      } catch (error) {
        console.error('Start recording error:', error);
        Toast.show('Failed to start recording', Toast.SHORT);
        setIsRecording(false);
      }
    }, []);

    const stopRecording = useCallback(async () => {
      if (!isRecording) return;

      try {
        const uri = await audioRecorderPlayer.stopRecorder();
        audioRecorderPlayer.removeRecordBackListener();
        setRecordedUri(uri);
        setIsRecording(false);
        setOpenPlayer(true);
        Toast.show('Recording stopped', Toast.SHORT);
      } catch (error) {
        console.error('Stop recording error:', error);
        Toast.show('Failed to stop recording', Toast.SHORT);
        setIsRecording(false);
      }
    }, [isRecording]);

    const uploadAudio = useCallback(async () => {
      if (!recordedUri) {
        Toast.show('No recording to send', Toast.SHORT);
        return;
      }

      setLoading(true);
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Toast.show('No internet connection. Audio queued.', Toast.LONG);
        setLoading(false);
        setOpenPlayer(false);
        return;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri: recordedUri,
        type: 'audio/mp4',
        name: `recording_${Date.now()}.mp4`,
      });

      try {
        const token = (await secure.get('tokens'))?.access;
        const response = await axios.post(
          `https://${API_BASE_URL}/chat/audio/`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
          },
        );

        messageSend(
          connectionId,
          response.data.audio,
          'audio',
          null,
          isGroup,
          incognito,
          disappearing,
        );
        Toast.show('Audio sent', Toast.SHORT);
        setOpenPlayer(false);
        setRecordedUri(null);
      } catch (error) {
        console.error('Upload audio error:', error);
        Toast.show('Failed to send audio', Toast.SHORT);
      } finally {
        setLoading(false);
      }
    }, [
      recordedUri,
      connectionId,
      messageSend,
      isGroup,
      incognito,
      disappearing,
    ]);

    const startPlaying = useCallback(async () => {
      if (!recordedUri || isPlaying) return;

      try {
        setIsPlaying(true);
        await audioRecorderPlayer.startPlayer(recordedUri);
        audioRecorderPlayer.addPlayBackListener(e => {
          if (e.currentPosition >= e.duration) {
            audioRecorderPlayer.stopPlayer();
            setIsPlaying(false);
            audioRecorderPlayer.removePlayBackListener();
          }
        });
      } catch (error) {
        console.error('Playback error:', error);
        Toast.show('Failed to play audio', Toast.SHORT);
        setIsPlaying(false);
      }
    }, [recordedUri, isPlaying]);

    const stopPlaying = useCallback(async () => {
      if (!isPlaying) return;

      try {
        await audioRecorderPlayer.stopPlayer();
        audioRecorderPlayer.removePlayBackListener();
        setIsPlaying(false);
      } catch (error) {
        console.error('Stop playback error:', error);
        Toast.show('Failed to stop playback', Toast.SHORT);
      }
    }, [isPlaying]);

    const cancelRecording = useCallback(() => {
      if (isPlaying) stopPlaying();
      setRecordedUri(null);
      setOpenPlayer(false);
      Toast.show('Recording canceled', Toast.SHORT);
    }, [isPlaying, stopPlaying]);

    const requestCameraPermission = useCallback(async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED)
          handleLaunchCamera();
        else Alert.alert('Permission denied', 'Camera access is required.');
      } else handleLaunchCamera();
    }, []);

    const handleLaunchCamera = useCallback(() => {
      launchCamera({mediaType: 'photo', saveToPhotos: true}, async response => {
        if (response.didCancel || response.errorCode) return;
        const file = response.assets?.[0];
        if (!file || file.fileSize > 10 * 1024 * 1024) {
          Toast.show('Image exceeds 10MB limit', Toast.LONG);
          return;
        }
        setLoading(true);
        try {
          const compressedImage = await ImageResizer.createResizedImage(
            file.uri,
            1024,
            1024,
            'JPEG',
            70,
          );
          const compressedFile = {
            uri: compressedImage.uri,
            type: 'image/jpeg',
            name: file.fileName || `image_${Date.now()}.jpg`,
          };
          navigation.navigate('ViewMedia', {
            media: compressedFile,
            connectionId,
            mediaType: 'image',
            incognito,
            disappearing,
          });
        } catch (error) {
          Toast.show('Failed to process image', Toast.SHORT);
        } finally {
          setLoading(false);
        }
      });
    }, [navigation, connectionId, incognito, disappearing]);

    const selectMedia = useCallback(
      async mediaType => {
        setShowOptions(!showOptions);
        const maxSizes = {
          image: 100 * 1024 * 1024,
          video: 1000 * 1024 * 1024,
          document: 5000 * 1024 * 1024,
          audio: 100 * 1024 * 1024,
        };
        const allowedTypes = {
          image: ['image/jpeg', 'image/png', 'image/gif'],
          video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
          document: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ],
        };

        if (mediaType === 'document') {
          const hasPermission = await requestStoragePermission();
          if (!hasPermission) return;

          try {
            const result = await DocumentPicker.pick({
              type: [DocumentPicker.types.allFiles],
              copyTo: 'cachesDirectory',
            });
            const file = result[0];
            if (!file) {
              Toast.show('No document selected', Toast.SHORT);
              return;
            }

            if (file.size > maxSizes[mediaType]) {
              Toast.show(
                `File size exceeds ${
                  maxSizes[mediaType] / (1024 * 1024)
                }MB limit`,
                Toast.LONG,
              );
              return;
            }

            if (!allowedTypes[mediaType].includes(file.type)) {
              Toast.show(`Unsupported file type: ${file.type}`, Toast.LONG);
              return;
            }

            setLoading(true);
            const mediaFile = {
              uri: file.uri,
              type: file.type || 'application/octet-stream',
              name: file.name || `document_${Date.now()}.pdf`,
              fileName: file.name,
            };
            navigation.navigate('ViewMedia', {
              media: mediaFile,
              connectionId,
              mediaType,
              incognito,
              disappearing,
            });
          } catch (error) {
            if (DocumentPicker.isCancel(error)) {
              Toast.show('Document selection canceled', Toast.SHORT);
            } else {
              Toast.show('Failed to select document', Toast.SHORT);
            }
          } finally {
            setLoading(false);
          }
        } else {
          launchImageLibrary(
            {mediaType, includeBase64: false},
            async response => {
              if (response.didCancel || response.errorCode) {
                Toast.show('Media selection canceled', Toast.SHORT);
                return;
              }
              const file = response.assets?.[0];
              if (!file) {
                Toast.show('No file selected', Toast.SHORT);
                return;
              }

              if (file.fileSize > maxSizes[mediaType]) {
                Toast.show(
                  `File size exceeds ${
                    maxSizes[mediaType] / (1024 * 1024)
                  }MB limit`,
                  Toast.LONG,
                );
                return;
              }

              if (!allowedTypes[mediaType]?.includes(file.type)) {
                Toast.show(`Unsupported file type: ${file.type}`, Toast.LONG);
                return;
              }

              setLoading(true);
              try {
                let compressedFile = file;
                if (mediaType === 'image') {
                  const compressedImage = await ImageResizer.createResizedImage(
                    file.uri,
                    1024,
                    1024,
                    'JPEG',
                    70,
                  );
                  compressedFile = {
                    uri: compressedImage.uri,
                    type: file.type || 'image/jpeg',
                    name: file.fileName || `image_${Date.now()}.jpg`,
                  };
                }
                navigation.navigate('ViewMedia', {
                  media: compressedFile,
                  connectionId,
                  mediaType,
                  incognito,
                  disappearing,
                });
              } catch (error) {
                Toast.show('Failed to process media', Toast.SHORT);
              } finally {
                setLoading(false);
              }
            },
          );
        }
      },
      [navigation, connectionId, incognito, disappearing],
    );

    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Location access is required.');
          return false;
        }
      }
      return true;
    };

    const getLocation = useCallback(async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;
      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          setLt(latitude.toString());
          setLo(longitude.toString());
          setOpenMap(true);
          setMessage(`${latitude} ${longitude}`);
        },
        () => Toast.show('Unable to fetch location', Toast.SHORT),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    }, []);

    const onSendLocation = useCallback(() => {
      const cleaned = message.trim();
      if (!cleaned) return;
      messageSend(
        connectionId,
        cleaned,
        'location',
        null,
        isGroup,
        incognito,
        disappearing,
      );
      setMessage('');
      setOpenMap(false);
      Toast.show('Location sent', Toast.SHORT);
    }, [message, connectionId, messageSend, isGroup, incognito, disappearing]);

    const generateID = useCallback(() => {
      return Array.from({length: 6}, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
          Math.floor(Math.random() * 62),
        ),
      ).join('');
    }, []);

    const openVideoCall = useCallback(() => {
      const id = generateID();
      messageSend(
        connectionId,
        id,
        'videocall',
        null,
        isGroup,
        incognito,
        disappearing,
      );
      navigation.navigate('VideoCallScreen', {
        roomId: id,
        friend,
        navigation,
        isGroup,
      });
    }, [
      connectionId,
      friend,
      navigation,
      messageSend,
      isGroup,
      incognito,
      disappearing,
    ]);

    const openVoiceCall = useCallback(() => {
      const id = generateID();
      messageSend(
        connectionId,
        id,
        'voicecall',
        null,
        isGroup,
        incognito,
        disappearing,
      );
      navigation.navigate('VoiceCall', {
        roomId: id,
        friend,
        navigation,
        isGroup,
      });
    }, [
      connectionId,
      friend,
      navigation,
      messageSend,
      isGroup,
      incognito,
      disappearing,
    ]);

    const map = Map({lt, lo});

    if (editingMessage) {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.editingLabel}>Editing message</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={textInputRef}
              multiline
              value={message}
              onChangeText={setMessage}
              style={[styles.input, {height: Math.max(48, height)}]}
              onContentSizeChange={e =>
                setHeight(Math.min(e.nativeEvent.contentSize.height, 120))
              }
              autoFocus
            />
          </View>
          <View style={styles.editButtons}>
            <TouchableOpacity
              onPress={() => {
                setEditingMessage(null);
                setMessage('');
              }}
              disabled={loading}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSaveEdit(message)}
              disabled={loading}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        {openMap && (
          <View style={styles.mapModal}>
            <WebView
              originWhitelist={['*']}
              source={{html: map}}
              style={styles.fullMap}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={onSendLocation}>
              <Text style={styles.sendButtonText}>Share Location</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          {openPlayer ? (
            <View style={styles.audioPlayerContainer}>
              <TouchableOpacity
                onPress={isPlaying ? stopPlaying : startPlaying}
                disabled={loading}>
                {isPlaying ? (
                  <Image source={ASSETS.pause} style={styles.audioIcon} />
                ) : (
                  <Image source={ASSETS.play} style={styles.audioIcon} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelRecording} disabled={loading}>
                <Image source={ASSETS.close} style={styles.cancelIcon} />
              </TouchableOpacity>
              <View style={styles.waveformContainer}>
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      transform: [
                        {
                          scaleY: waveAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1.5],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      transform: [
                        {
                          scaleY: waveAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.75, 1.25],
                          }),
                        },
                      ],
                      marginHorizontal: 4,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      transform: [
                        {
                          scaleY: waveAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
              <TouchableOpacity onPress={uploadAudio} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#075E54" />
                ) : (
                  <Image
                    source={ASSETS.sendMessageIcon}
                    style={styles.sendMessageIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {!message && (
                <TouchableOpacity
                  style={styles.plusButton}
                  onPress={() => setShowOptions(!showOptions)}>
                  <Image source={ASSETS.plus} style={styles.plusIcon} />
                </TouchableOpacity>
              )}
              <TextInput
                ref={textInputRef}
                multiline
                placeholder="Type a message"
                value={message}
                onChangeText={setMessage}
                placeholderTextColor={'grey'}
                onContentSizeChange={e =>
                  setHeight(Math.min(e.nativeEvent.contentSize.height, 120))
                }
                style={[styles.input, {height: Math.max(48, height)}]}
              />
              {!message ? (
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={loading}>
                  <Animated.View
                    style={{transform: [{scale: isRecording ? pulseAnim : 1}]}}>
                    <FontAwesomeIcon
                      icon={isRecording ? 'stop' : 'microphone'}
                      size={24}
                      color="#075E54"
                    />
                  </Animated.View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onSend} style={styles.sendButton}>
                  <Image
                    source={ASSETS.sendMessageIcon}
                    style={styles.sendMessageIcon}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        <Animated.View
          style={[
            styles.optionsMenu,
            {
              opacity: optionsAnim,
              transform: [
                {
                  translateY: optionsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={requestCameraPermission}>
            <Image source={ASSETS.camera} style={styles.optionIcon} />
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectMedia('image')}>
            <Image source={ASSETS.gallery} style={styles.optionIcon} />
            <Text style={styles.optionText}>Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectMedia('document')}>
            <Image source={ASSETS.documentIcon} style={styles.optionIcon} />
            <Text style={styles.optionText}>Document</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectMedia('video')}>
            <Image source={ASSETS.video} style={styles.optionIcon} />
            <Text style={styles.optionText}>Video</Text>
          </TouchableOpacity>
        </Animated.View>
        {showDisappearingOptions && (
          <View style={styles.disappearingOptions}>
            <TouchableOpacity
              onPress={() => {
                setDisappearing(0);
                setShowDisappearingOptions(false);
              }}>
              <Text style={styles.optionText}>Off</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setDisappearing(3600);
                setShowDisappearingOptions(false);
              }}>
              <Text style={styles.optionText}>1 Hour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setDisappearing(86400);
                setShowDisappearingOptions(false);
              }}>
              <Text style={styles.optionText}>1 Day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setDisappearing(604800);
                setShowDisappearingOptions(false);
              }}>
              <Text style={styles.optionText}>1 Week</Text>
            </TouchableOpacity>
          </View>
        )}
        {loading && !openPlayer && (
          <ActivityIndicator
            size="small"
            color="#075E54"
            style={styles.loadingIndicator}
          />
        )}
      </View>
    );
  },
);

const ReplyingToPreview = memo(({replyingTo, friend, setReplyingTo}) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[styles.replyPreview, {transform: [{translateX: slideAnim}]}]}>
      <View style={styles.replyContent}>
        <Text style={styles.replyAuthor}>
          {replyingTo.is_me ? 'You' : friend.name}
        </Text>
        {replyingTo.type === 'text' ? (
          <Text style={styles.replyText}>{replyingTo.text}</Text>
        ) : (
          <View style={styles.imagePreview}>
            <Image
              source={{uri: `https://${API_BASE_URL}${replyingTo.text}`}}
              style={styles.previewImage}
            />
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={() => setReplyingTo(null)}
        style={styles.closeButton}>
        <Image source={ASSETS.close} style={styles.closeIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const MessagesScreen = ({navigation, route}) => {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [displayedDays] = useState(new Set());
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [incognito, setIncognito] = useState(false);
  const [disappearing, setDisappearing] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [isBlocked, setIsBlocked] = useState(route.params.isBlocked || false);
  const [iBlockedFriend, setIBlockedFriend] = useState(
    route.params.iBlockedFriend || false,
  );
  const flashListRef = useRef(null);
  const messagesList = useGlobal(state => state.messagesList);
  const messagesNext = useGlobal(state => state.messagesNext);
  const messageList = useGlobal(state => state.messageList);
  const messageSend = useGlobal(state => state.messageSend);
  const messageType = useGlobal(state => state.messageType);
  const user = useGlobal(state => state.user);
  const socket = useGlobal(state => state.socket);
  const [hasMarkedSeen, setHasMarkedSeen] = useState(false);
  const [mutedChats, setMutedChats] = useState([]);
  const connectionId = route.params.id;
  const friend = route.params.friend;
  const isGroup = route.params.isGroup || false;
  const groupAdmins = route.params.groupAdmins || [];

  useEffect(() => {
    const unsubscribe = useGlobal.subscribe(
      (state) => [state.messagesList, state.messagesUsername],
      ([messages, username]) => {
        if (username === friend.username) {
          flashListRef.current?.prepareForLayoutAnimationRender();
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    );
    return unsubscribe;
  }, [friend.username]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === 'block.status') {
          const {blocked_by, blocked} = data.data;
          if (blocked_by === friend.username) {
            setIsBlocked(blocked);
            Toast.show(
              blocked ? 'You have been blocked' : 'You have been unblocked',
              Toast.SHORT,
            );
          }
        } else if (data.source === 'message.list') {
          setIsBlocked(data.data.is_blocked);
          setIBlockedFriend(data.data.i_blocked_friend);
        } else if (data.source === 'message.update') {
          const updatedMessage = data.data.message;
          useGlobal.setState(state => {
            const updatedMessages = state.messagesList.map(m => {
              if (m.id === updatedMessage.id) {
                return {...m, text: updatedMessage.text};
              }
              return m;
            });
            saveStoredMessages(connectionId, updatedMessages);
            return {messagesList: updatedMessages};
          });
        } else if (data.source === 'message.delete') {
          const {messageId, connectionId: receivedConnectionId} = data.data;
          if (String(receivedConnectionId) === String(connectionId)) {
            useGlobal.setState(state => {
              const updatedMessages = state.messagesList.map(m => {
                if (m.id === messageId) {
                  return {...m, is_deleted: true};
                }
                return m;
              });
              saveStoredMessages(connectionId, updatedMessages);
              return {messagesList: updatedMessages};
            });
            Toast.show('Message deleted', Toast.SHORT);
          }
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, friend.username, connectionId]);

  const markMessagesSeen = useCallback(async () => {
    if (hasMarkedSeen) return;
    try {
      const token = (await secure.get('tokens'))?.access;
      const response = await axios.post(
        `https://${API_BASE_URL}/chat/messages/mark-seen/${connectionId}/`,
        {},
        {
          headers: {Authorization: `Bearer ${token}`},
        },
      );
      if (response.status === 200) {
        setHasMarkedSeen(true);
        useGlobal.setState(state => ({
          unreadCounts: {...state.unreadCounts, [connectionId]: 0},
        }));
      }
    } catch (error) {
      console.error('Error marking messages seen:', error);
    }
  }, [connectionId, hasMarkedSeen]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      messageList(connectionId);
      markMessagesSeen();
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      useGlobal.setState({messagesUsername: null});
      setHasMarkedSeen(false);
    });
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, connectionId, messageList, markMessagesSeen]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <MessageHeader
          friend={friend}
          navigation={navigation}
          connectionId={connectionId}
          user={user}
          isGroup={isGroup}
          groupAdmins={groupAdmins}
          onMuteToggle={() => {
            const updatedMuted = mutedChats.includes(connectionId)
              ? mutedChats.filter(id => id !== connectionId)
              : [...mutedChats, connectionId];
            setMutedChats(updatedMuted);
            Toast.show(
              updatedMuted.includes(connectionId)
                ? 'Chat muted'
                : 'Chat unmuted',
              Toast.SHORT,
            );
          }}
          onBlockUser={async () => {
            const token = (await secure.get('tokens'))?.access;
            try {
              await axios.post(
                `https://${API_BASE_URL}/chat/block/${friend.username}/`,
                {},
                {
                  headers: {Authorization: `Bearer ${token}`},
                },
              );
              setIBlockedFriend(true);
              Toast.show('User blocked', Toast.SHORT);
            } catch (error) {
              Toast.show('Failed to block user', Toast.SHORT);
            }
          }}
          onUnblockUser={async () => {
            const token = (await secure.get('tokens'))?.access;
            try {
              await axios.delete(
                `https://${API_BASE_URL}/chat/unblock/${friend.username}/`,
                {
                  headers: {Authorization: `Bearer ${token}`},
                },
              );
              setIBlockedFriend(false);
              Toast.show('User unblocked', Toast.SHORT);
            } catch (error) {
              Toast.show('Failed to unblock user', Toast.SHORT);
            }
          }}
          onReportUser={async () => {
            const token = (await secure.get('tokens'))?.access;
            try {
              await axios.post(
                `https://${API_BASE_URL}/chat/report/${friend.username}/`,
                {},
                {
                  headers: {Authorization: `Bearer ${token}`},
                },
              );
              Toast.show('User reported', Toast.SHORT);
            } catch (error) {
              Toast.show('Failed to report user', Toast.SHORT);
            }
          }}
          isUserBlockedByMe={iBlockedFriend}
        />
      ),
    });
  }, [
    friend,
    navigation,
    connectionId,
    user,
    isGroup,
    groupAdmins,
    mutedChats,
    iBlockedFriend,
  ]);

  const scrollToRepliedMessage = useCallback(
    replied_to => {
      const index = messagesList.findIndex(m => m.id === replied_to) + 1;
      if (index > 0 && flashListRef.current) {
        flashListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedMessageId(replied_to);
        setTimeout(() => setHighlightedMessageId(null), 2000);
      } else {
        Toast.show('Message not found', Toast.SHORT);
      }
    },
    [messagesList],
  );

  const handleSend = useCallback(async () => {
    if (isBlocked) {
      Toast.show('You are blocked by this user', Toast.SHORT);
      return;
    }
    if (iBlockedFriend) {
      Toast.show('You have blocked this user', Toast.SHORT);
      return;
    }
    const cleaned = message.trim();
    if (!cleaned) return;

    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;


    const repliedToMessage = replyingTo ? messagesList.find(m => m.id === replyingTo.id) : null;
    const tempMessage = {
      id: tempId,
      text: cleaned,
      type: 'text',
      created: new Date().toISOString(),
      is_me: true,
      user: user.username,
      seen: false,
      is_deleted: false,
      replied_to: replyingTo?.id || null,
      replied_to_message: repliedToMessage ? {
        id: repliedToMessage.id,
        text: repliedToMessage.text,
        type: repliedToMessage.type,
        is_me: repliedToMessage.is_me,
        user: repliedToMessage.user || (repliedToMessage.is_me ? user.username : friend.username),
        created: repliedToMessage.created,
      } : null,
      pinned: false,
      incognito: incognito,
      disappearing: disappearing,
      reactions: [],
      mentions: cleaned.match(/@(\w+)/g) || [],
    };

    useGlobal.setState(state => {
      const updatedMessages = [tempMessage, ...state.messagesList];
      saveStoredMessages(connectionId, updatedMessages);
      return {
        messagesList: updatedMessages,
      };
    });

    scrollToBottom();

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show('No internet connection. Message queued.', Toast.LONG);
      messageSend(
        connectionId,
        cleaned,
        'text',
        replyingTo?.id,
        isGroup,
        incognito,
        disappearing,
      );
      setMessage('');
      setReplyingTo(null);
      return;
    }

    messageSend(
      connectionId,
      cleaned,
      'text',
      replyingTo?.id,
      isGroup,
      incognito,
      disappearing,
    );

    setMessage('');
    setReplyingTo(null);
    Toast.show('Message sent', Toast.SHORT);
  }, [
    message,
    connectionId,
    replyingTo,
    messageSend,
    isGroup,
    incognito,
    disappearing,
    isBlocked,
    iBlockedFriend,
  ]);

  const handleType = useCallback(
    value => {
      if (!isBlocked && !iBlockedFriend) {
        setMessage(value);
        messageType(friend.username);
      }
    },
    [friend.username, messageType, isBlocked, iBlockedFriend],
  );

  const scrollToBottom = useCallback(() => {
    flashListRef.current?.scrollToOffset({offset: 0, animated: true});
    setShowScrollToBottom(false);
  }, []);

  const handlePinMessage = useCallback(async messageId => {
    const token = (await secure.get('tokens'))?.access;
    try {
      await axios.post(
        `https://${API_BASE_URL}/chat/messages/pin/${messageId}/`,
        {},
        {
          headers: {Authorization: `Bearer ${token}`},
        },
      );
      Toast.show('Message pinned', Toast.SHORT);
    } catch (error) {
      Toast.show('Failed to pin message', Toast.SHORT);
    }
  }, []);

  const handleEditMessage = useCallback(
    (messageId, newText) => {
      useGlobal.setState(state => {
        const updatedMessages = state.messagesList.map(m => {
          if (m.id === messageId) {
            return {...m, text: newText};
          }
          return m;
        });
        saveStoredMessages(connectionId, updatedMessages);
        return {messagesList: updatedMessages};
      });
    },
    [connectionId],
  );

  const startEditing = useCallback(
    message => {
      setEditingMessage(message);
      setMessage(message.text);
    },
    [setEditingMessage, setMessage],
  );

  const onSaveEdit = useCallback(
    async newText => {
      if (!editingMessage) return;
      const messageId = editingMessage.id;
      const messageTime = new Date(editingMessage.created).getTime();
      const now = Date.now();
      if (now - messageTime > 5 * 60 * 1000) {
        Toast.show('Edit window (5 minutes) has expired', Toast.SHORT);
        setEditingMessage(null);
        setMessage('');
        return;
      }
      try {
        const token = (await secure.get('tokens'))?.access;
        await axios.patch(
          `https://${API_BASE_URL}/chat/messages/edit/${messageId}/`,
          {text: newText},
          {
            headers: {Authorization: `Bearer ${token}`},
          },
        );
        handleEditMessage(messageId, newText);
        setEditingMessage(null);
        setMessage('');
        Toast.show('Message edited', Toast.SHORT);
      } catch (error) {
        Toast.show('Failed to edit', Toast.SHORT);
      }
    },
    [editingMessage, handleEditMessage, setEditingMessage, setMessage],
  );

  const renderItem = useCallback(
    ({item, index}) => (
      <MessageBubble
        index={index}
        message={item}
        friend={friend}
        navigation={navigation}
        connectionId={connectionId}
        previousMessage={messagesList[index + 1]}
        setReplyingTo={setReplyingTo}
        replyingTo={replyingTo}
        displayedDays={displayedDays}
        onReplyPress={scrollToRepliedMessage}
        highlightedMessageId={highlightedMessageId}
        onPinMessage={handlePinMessage}
        onEditMessage={handleEditMessage}
        selectedMessageId={selectedMessageId}
        setSelectedMessageId={setSelectedMessageId}
        startEditing={startEditing}
      />
    ),
    [
      messagesList,
      replyingTo,
      friend,
      connectionId,
      navigation,
      displayedDays,
      scrollToRepliedMessage,
      highlightedMessageId,
      handlePinMessage,
      handleEditMessage,
      selectedMessageId,
      setSelectedMessageId,
      startEditing,
    ],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.listContainer}>
        <FlashList
          ref={flashListRef}
          data={[{id: 'header-placeholder'}, ...messagesList]}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          inverted
          estimatedItemSize={100}
          onScroll={event =>
            setShowScrollToBottom(event.nativeEvent.contentOffset.y > 50)
          }
          scrollEventThrottle={16}
          onEndReached={() =>
            messagesNext && messageList(connectionId, messagesNext)
          }
          ListFooterComponent={
            messagesNext ? (
              <ActivityIndicator size="small" color="#075E54" />
            ) : null
          }
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.listContent}
        />
        {replyingTo && (
          <ReplyingToPreview
            replyingTo={replyingTo}
            friend={friend}
            setReplyingTo={setReplyingTo}
          />
        )}
        {!replyingTo && showScrollToBottom && (
          <TouchableOpacity
            style={styles.scrollButton}
            onPress={scrollToBottom}>
            <Image source={ASSETS.down} style={styles.scrollButtonImage} />
          </TouchableOpacity>
        )}
      </View>
      {iBlockedFriend ? (
        <View style={styles.blockedMessage}>
          <Text style={styles.blockedText}>
            You have blocked this user. Unblock to send messages.
          </Text>
        </View>
      ) : isBlocked ? (
        <View style={styles.blockedMessage}>
          <Text style={styles.blockedText}>
            You are blocked by this user and cannot send messages.
          </Text>
        </View>
      ) : (
        <MessageInput
          message={message}
          setMessage={handleType}
          onSend={handleSend}
          connectionId={connectionId}
          navigation={navigation}
          user={user}
          friend={friend}
          isGroup={isGroup}
          setIncognito={setIncognito}
          incognito={incognito}
          setDisappearing={setDisappearing}
          disappearing={disappearing}
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
          onSaveEdit={onSaveEdit}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 253, 231, 1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    right: 40,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerName: {
    color: 'black',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineStatus: {
    color: 'green',
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    left: 13,
  },
  headerIcon: {
    marginHorizontal: 12,
  },
  menuContent: {
    backgroundColor: 'grey',
    borderRadius: 8,
    elevation: 4,
    top: 30,
  },
  menuItemText: {
    color: 'white',
    fontSize: 16,
  },
  menuDivider: {
    backgroundColor: '#ddd',
  },
  dayContainer: {
    alignSelf: 'center',
    marginVertical: 10,
    backgroundColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 12,
    color: '#666',
  },
  bubbleRowMe: {
    width: '100%',
    marginVertical: 4,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  bubbleMeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  bubbleMe: {
    backgroundColor: '#DCF8C6',
    borderRadius: 12,
    padding: 10,
    elevation: 0,
  },
  bubbleMedia: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  highlightedBubble: {
    backgroundColor: '#FFF9C4',
  },
  pinnedBubble: {
    borderWidth: 2,
    borderColor: '#075E54',
  },
  bubbleContent: {
    flexDirection: 'column',
  },
  bubbleTextMe: {
    color: '#333',
    fontSize: 16,
    lineHeight: 20,
  },
  replyContainerMe: {
    backgroundColor: '#C8E6C9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderColor: '#075E54',
  },
  replyAuthorMe: {
    color: '#075E54',
    fontWeight: '600',
    fontSize: 14,
  },
  replyTextMe: {
    color: '#555',
    fontSize: 14,
  },
  replyImageContainerMe: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  replyImage: {
    height: 40,
    width: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  mediaImage: {
    height: 200,
    width: 150,
    borderRadius: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0F0C0',
    borderRadius: 10,
    marginVertical: 2,
    maxWidth: '95%',
    height: 150,
    width: 220,
    borderWidth: 0.3,
    borderColor: 'green',
  },
  documentIcon: {
    width: 58,
    height: 48,
    tintColor: '#075E54',
    marginRight: 10,
  },
  documentDetails: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'rgba(233, 255, 231, 0.9)',
    padding: 10,
    borderRadius: 10,
  },
  documentFileName: {
    color: '#333',
    fontSize: 14.5,
    fontWeight: '500',
    maxWidth: '90%',
  },
  documentMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  downloadIcon: {
    width: 16,
    height: 16,
    tintColor: '#075E54',
    marginLeft: 10,
  },
  locationMap: {
    height: 120,
    width: 150,
    borderRadius: 8,
  },
  actionButton: {
    backgroundColor: '#075E54',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestampMe: {
    color: '#666',
    fontSize: 12,
    marginRight: 4,
  },
  seenIconMe: {
    height: 12,
    width: 12,
    tintColor: '#34B7F1',
  },
  unseenIconMe: {
    height: 12,
    width: 12,
    tintColor: '#999',
  },
  optionsContainerMe: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'grey',
    borderRadius: 8,
    padding: 6,
    elevation: 0,
    marginTop: 4,
  },
  optionIconMe: {
    height: 20,
    width: 20,
    marginHorizontal: 6,
    tintColor: 'white',
  },
  reactionsContainer: {
    flexDirection: 'row',
    bottom: 10,
  },
  reactionEmoji: {
    fontSize: 16,
    marginHorizontal: 4,
  },
  mention: {
    color: '#075E54',
    fontWeight: 'bold',
  },
  bubbleRowFriend: {
    width: '100%',
    marginVertical: 4,
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  bubbleFriendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  bubbleFriendWrapper: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  bubbleFriend: {
    backgroundColor: 'rgba(255, 253, 231, 1)',
    borderRadius: 12,
    padding: 10,
    elevation: 0,
  },
  bubbleTextFriend: {
    color: '#333',
    fontSize: 16,
    lineHeight: 20,
  },
  replyContainerFriend: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderColor: '#666',
  },
  replyAuthorFriend: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  replyTextFriend: {
    color: '#555',
    fontSize: 14,
  },
  replyImageContainerFriend: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  mediaImageFriend: {
    height: 200,
    width: 150,
    borderRadius: 8,
  },
  callContainer: {
    padding: 8,
  },
  callText: {
    color: '#333',
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: '#075E54',
    padding: 8,
    borderRadius: 20,
    marginTop: 6,
    alignItems: 'center',
  },
  actionButtonFriend: {
    backgroundColor: '#FF5722',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  timestampFriend: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  optionsContainerFriend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'grey',
    borderRadius: 8,
    padding: 6,
    elevation: 0,
    marginTop: 4,
  },
  optionIconFriend: {
    height: 20,
    width: 20,
    marginHorizontal: 6,
    tintColor: 'white',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    top: 15,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#888',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 253, 231, 1)',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 231, 1)',
    borderRadius: 24,
    paddingHorizontal: 10,
    borderWidth: 0.1,
    borderColor: 'black',
  },
  plusButton: {
    padding: 10,
  },
  plusIcon: {
    height: 24,
    width: 24,
    tintColor: '#075E54',
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    borderRadius: 24,
  },
  sendButton: {
    padding: 10,
  },
  sendMessageIcon: {
    height: 24,
    width: 24,
    tintColor: '#075E54',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingVertical: 8,
  },
  audioIcon: {
    height: 24,
    width: 24,
    marginHorizontal: 10,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveBar: {
    width: 4,
    height: 20,
    backgroundColor: '#075E54',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  optionsMenu: {
    position: 'absolute',
    bottom: 70,
    left: 10,
    backgroundColor: 'grey',
    borderRadius: 8,
    padding: 10,
    elevation: 4,
    flexDirection: 'row',
  },
  optionItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  optionIcon: {
    height: 24,
    width: 30,
    tintColor: 'white',
  },
  optionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  mapModal: {
    height: '90%',
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  fullMap: {
    flex: 1,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 10,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 80,
    right: 15,
    backgroundColor: '#075E54',
    borderRadius: 20,
    padding: 10,
    elevation: 0,
  },
  scrollButtonImage: {
    height: 20,
    width: 20,
    tintColor: '#fff',
  },
  blockedMessage: {
    padding: 10,
    backgroundColor: '#FFCDD2',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  blockedText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontWeight: 'bold',
    color: '#075E54',
  },
  replyText: {
    color: '#333',
    fontSize: 14,
  },
  imagePreview: {
    marginTop: 5,
  },
  previewImage: {
    height: 50,
    width: 50,
    borderRadius: 4,
  },
  closeButton: {
    padding: 5,
  },
  closeIcon: {
    height: 20,
    width: 20,
    tintColor: '#FF5722',
  },
  documentContainerFriend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0F0C0',
    borderRadius: 10,
    marginVertical: 2,
    maxWidth: '95%',
    height: 150,
    width: 220,
    borderWidth: 0.3,
    borderColor: 'green',
  },
  cancelIcon: {
    height: 24,
    width: 24,
    tintColor: '#FF5722',
    marginHorizontal: 10,
  },
  loadingIndicator: {
    padding: 10,
  },
  deletedText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  editingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  cancelButton: {
    color: '#FF5722',
    fontSize: 16,
    marginRight: 10,
  },
  saveButton: {
    color: '#075E54',
    fontSize: 16,
  },
});

export default MessagesScreen;

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import Toast from 'react-native-simple-toast';
import useGlobal from '../../core/global';
import Thumbnail from '../../common/Thumbnail';

const CallingScreen = ({ route, navigation }) => {
  const { roomId, friend, connectionId } = route.params;
  const socket = useGlobal(state => state.socket);
  console.log("Friend: ", friend);

  // Animation setup
  const pulseAnim = useRef(new Animated.Value(1)).current; // Pulsing effect for thumbnail
  const ringAnim = useRef(new Animated.Value(0)).current;  // Ringing effect

  // Cancel call function
  const cancelCall = () => {
    socket.send(JSON.stringify({
      source: 'call.cancel',
      data: { connectionId }
    }));
    navigation.goBack();
    Toast.show('Call canceled', Toast.SHORT);
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === 'call.accept' && data.data.roomId === roomId) {
          navigation.replace('VideoCallScreen', { roomId, friend });
        } else if (data.source === 'call.reject') {
          Toast.show('Call rejected', Toast.SHORT);
          navigation.goBack();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    socket.addEventListener('message', handleMessage);

    // Start pulse animation for thumbnail
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start ringing animation
    Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, roomId, friend, navigation]);

  // Interpolate ring animation for scaling and opacity
  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.thumbnailContainer}>
        {/* Ringing effect */}
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
        {/* Pulsing thumbnail */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Thumbnail url={friend.thumbnail} size={200} />
        </Animated.View>
      </View>
      <Text style={styles.text}>calling {friend.username}...</Text>
      <TouchableOpacity style={styles.cancelButton} onPress={cancelCall}>
        <FontAwesomeIcon icon={faPhoneSlash} size={24} color="#fff" />
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
  },
  thumbnailContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: '#fff',
    opacity: 0.7,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
});

export default CallingScreen;
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faTimes } from '@fortawesome/free-solid-svg-icons'; // Import FontAwesome icons
import Toast from 'react-native-simple-toast';
import useGlobal from '../../core/global';

const IncomingCallScreen = ({ route, navigation }) => {
  const { caller, roomId, connectionId } = route.params;
  const socket = useGlobal(state => state.socket);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const acceptCall = () => {
    socket.send(JSON.stringify({
      source: 'call.accept',
      data: { connectionId, roomId }
    }));
    navigation.replace('VideoCallScreen', { roomId, friend: { username: caller } });
  };

  const rejectCall = () => {
    socket.send(JSON.stringify({
      source: 'call.reject',
      data: { connectionId }
    }));
    navigation.goBack();
    Toast.show('Call rejected', Toast.SHORT);
  };

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  // Handle socket messages for call cancellation
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === 'call.cancel' && data.data.connectionId === connectionId) {
          Toast.show('Call canceled by caller', Toast.SHORT);
          navigation.goBack();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, connectionId, navigation]);

  // Handle vibration and animation
  useEffect(() => {
    Vibration.vibrate([0, 400, 200], true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
    return () => {
      Vibration.cancel();
    };
  }, [scaleAnim]);

  return (
    <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.container}>
      <Animated.View style={[styles.avatar, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.avatarText}>{getInitials(caller)}</Text>
      </Animated.View>
      <Text style={styles.text}>Incoming call from {caller}...</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
          <FontAwesomeIcon icon={faPhone} size={30} color="#fff" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
          <FontAwesomeIcon icon={faTimes} size={30} color="#fff" />
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 40,
    color: '#000',
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 30,
  },
  acceptButton: {
    backgroundColor: '#075E54',
    padding: 20,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
  },
  rejectButton: {
    backgroundColor: '#ff3b30',
    padding: 20,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
});

export default IncomingCallScreen;
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhone, faTimes } from '@fortawesome/free-solid-svg-icons'; // Import FontAwesome icons
import Toast from 'react-native-simple-toast';
import useGlobal from '../../core/global';

const IncomingVoiceCallScreen = ({ route, navigation }) => {
  const { caller, roomId, connectionId } = route.params;
  const socket = useGlobal(state => state.socket);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const acceptCall = () => {
    socket.send(JSON.stringify({ source: 'voicecall.accept', data: { connectionId, roomId } }));
    navigation.replace('VoiceCallScreen', { roomId, friend: { username: caller } });
  };

  const rejectCall = () => {
    socket.send(JSON.stringify({ source: 'voicecall.reject', data: { connectionId } }));
    navigation.goBack();
    Toast.show('Voice call rejected', Toast.SHORT);
  };

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  // Handle socket messages for voice call cancellation
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === 'voicecall.cancel' && data.data.connectionId === connectionId) {
          Toast.show('Voice call canceled by caller', Toast.SHORT);
          navigation.goBack();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, connectionId, navigation]);

  // Handle vibration and animation
  useEffect(() => {
    Vibration.vibrate([0, 400, 200], true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
    return () => {
      Vibration.cancel();
    };
  }, [scaleAnim]);

  return (
    <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.container}>
      <Animated.View style={[styles.avatar, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.avatarText}>{getInitials(caller)}</Text>
      </Animated.View>
      <Text style={styles.text}>Incoming voice call from {caller}...</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
          <FontAwesomeIcon icon={faPhone} size={30} color="#fff" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
          <FontAwesomeIcon icon={faTimes} size={30} color="#fff" />
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 40,
    color: '#000',
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 30,
  },
  acceptButton: {
    backgroundColor: '#075E54',
    padding: 20,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
  },
  rejectButton: {
    backgroundColor: '#ff3b30',
    padding: 20,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
});

export default IncomingVoiceCallScreen;
import { useEffect, useLayoutEffect, useRef, useState, memo } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faClapperboard, 
  faBell, 
  faMagnifyingGlass, 
  faEllipsisV, 
  faMessage, 
  faUser, 
  faCar, 
  faUserDoctor, 
  faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
// import RequestsScreen from './Requests';
import FriendsScreen from './Friends';
import ProfileScreen from './Profile';
import useGlobal from '../core/global';
import KariScreen from './kariScreen/KariScreen';
import DoctoAi from './Docto/Docto';
import UpdateScreen from './ReelsTemp';
import NetInfo from '@react-native-community/netinfo';
import { Divider, Menu } from 'react-native-paper';

const ANIMATION_CONFIG = {
  duration: Platform.OS === 'android' ? 150 : 200,
  springDamping: 0.8,
  initialScale: 0.95,
};

const Tab = createBottomTabNavigator();

const HeaderRight = memo(({ onRequest, onSearch, requestList, menuVisible, toggleMenu }) => (
  <View style={styles.headerRight}>
    <TouchableOpacity 
      onPress={onRequest} 
      style={styles.headerIcon}
      activeOpacity={0.7}
    >
      <FontAwesomeIcon icon={faBell} size={22} color="black" />
      {requestList?.length > 0 && (
        <Animated.View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.min(requestList.length, 99)}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
    
    <TouchableOpacity 
      onPress={onSearch} 
      style={styles.headerIcon}
      activeOpacity={0.7}
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} size={22} color="black" />
    </TouchableOpacity>
    
    <Menu
      visible={menuVisible}
      onDismiss={toggleMenu}
      anchor={
        <TouchableOpacity 
          onPress={toggleMenu} 
          style={styles.headerIcon}
          activeOpacity={0.7}
        >
          <FontAwesomeIcon icon={faEllipsisV} size={22} color="black" />
        </TouchableOpacity>
      }
      contentStyle={styles.menuContent}
      style={{ marginTop: 40 }}
    >
      <Menu.Item
        onPress={toggleMenu}
        title="Option One"
        titleStyle={styles.menuItemText}
        style={{ backgroundColor: 'grey' }}
      />
      <Divider style={styles.menuDivider} />
      {['Option Two', 'Option Three', 'Option Four', 'Option Five'].map((item) => (
        <View key={item}>
          <Menu.Item
            onPress={toggleMenu}
            title={item}
            titleStyle={styles.menuItemText}
            style={styles.menuItem}
          />
          <Divider style={styles.menuDivider} />
        </View>
      ))}
    </Menu>
  </View>
));

function HomeScreen({ navigation }) {
  const { 
    socketConnect, 
    socketClose, 
    user, 
    requestList, 
    authenticated, 
    socket 
  } = useGlobal();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(ANIMATION_CONFIG.initialScale)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const tabBarAnim = useRef(new Animated.Value(1)).current;

  // useEffect(() => {
  //   if (!socket) return;
  
  //   const handleMessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     if (data.source === 'voicecall.request') {
  //       const { caller, roomId, connectionId } = data.data;
  //       navigation.navigate('IncomingVoiceCallScreen', { caller, roomId, connectionId });
  //     }
  //   };
  
  //   socket.addEventListener('message', handleMessage);
  //   return () => socket.removeEventListener('message', handleMessage);
  // }, [socket, navigation]);

  useEffect(() => {
    if (!socket) return;
  
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === 'call.request') {
          const { caller, roomId, connectionId: incomingConnectionId } = data.data;
          // Navigate to IncomingCallScreen for any incoming call
          navigation.navigate('IncomingCallScreen', { caller, roomId, connectionId: incomingConnectionId });
        }
        if (data.source === 'voicecall.request') {
          const { caller, roomId, connectionId: incomingConnectionId } = data.data;
          navigation.navigate('IncomingVoiceCallScreen', { caller, roomId, connectionId :incomingConnectionId});
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
  
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, navigation]);
  
  useEffect(() => {
    if (!authenticated) return;
    
    let mounted = true;
    const unsubscribe = NetInfo.addEventListener(({ isConnected }) => {
      if (!mounted) return;
      if (isConnected && !socket) socketConnect();
      else if (!isConnected && socket) socketClose();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authenticated, socket]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: menuVisible ? 1 : ANIMATION_CONFIG.initialScale,
        damping: ANIMATION_CONFIG.springDamping,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: menuVisible ? 1 : 0,
        duration: ANIMATION_CONFIG.duration,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuVisible]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSearch = () => navigation.navigate('Search');
  const handleRequest = () => navigation.navigate('Request');
  const toggleMenu = () => setMenuVisible(prev => !prev);

  return (
    <SafeAreaView style={styles.container}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarHideOnKeyboard: true,
          headerRight: () => (
            <HeaderRight
              onRequest={handleRequest}
              onSearch={handleSearch}
              requestList={requestList}
              menuVisible={menuVisible}
              toggleMenu={toggleMenu}
            />
          ),
          tabBarIcon: ({ focused }) => {
            const icons = {
              Kari: faCar,
              Chats: faMessage,
              Profile: faUser,
              updates: faClapperboard,
              DocotAi: faUserDoctor,
            };
            return (
              <Animated.View style={[styles.tabIcon, {
                transform: [{ scale: focused ? 1.1 : 1 }],
              }]}>
                <FontAwesomeIcon 
                  icon={icons[route.name]} 
                  size={19} 
                  color="black"
                />
              </Animated.View>
            );
          },
          tabBarStyle: [
            route.name === 'DocotAi' 
              ? { display: 'none' }
              : styles.tabBar,
            { transform: [{ scaleY: tabBarAnim }] },
          ],
          tabBarActiveBackgroundColor: 'rgba(255, 253, 231, 1)',
          tabBarInactiveBackgroundColor: 'rgba(255, 253, 231, 1)',
          tabBarActiveTintColor: 'red',
          tabBarInactiveTintColor: 'black',
          tabBarLabelStyle: styles.tabLabel,
        })}
        sceneContainerStyle={styles.sceneContainer}
      >
        <Tab.Screen
          name="Chats"
          component={FriendsScreen}
          options={{
            headerTitle: 'KinakaAse',
            headerTitleStyle: styles.headerTitle,
            headerStyle: styles.header,
          }}
        />
        {/* <Tab.Screen
          name="updates"
          component={UpdateScreen}
          options={{ headerShown: false }}
        /> */}
        {/* <Tab.Screen
          name="DocotAi"
          component={DoctoAi}
          options={{
            headerShown: false,
            headerTitle: 'Docto AI',
            headerTitleStyle: styles.doctorHeaderTitle,
            headerStyle: styles.doctorHeader,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chats')}
                style={styles.headerLeft}
                activeOpacity={0.7}
              >
                <FontAwesomeIcon icon={faArrowLeft} size={22} color="white" />
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen
          name="Kari"
          component={KariScreen}
          options={{ headerShown: false }}
        /> */}
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 253, 231, 1)',
  },
  sceneContainer: {
    backgroundColor: 'rgba(255, 253, 231, 1)',
  },
  header: {
    backgroundColor: 'rgba(255, 253, 231, 1)',
    height: 55,
    elevation: 1,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: 25,
    color: 'black',
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    justifyContent: 'space-evenly',
  },
  headerIcon: {
    padding: 10,
    marginRight: 6,
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuContent: {
    backgroundColor: 'grey',
    borderRadius: 8,
    transform: [{ scale: ANIMATION_CONFIG.initialScale }],
    marginTop: -10,
  },
  menuItem: {
    backgroundColor: 'grey',
    minWidth: 150,
  },
  menuItemText: {
    color: 'white',
    fontSize: 14,
  },
  menuDivider: {
    backgroundColor: '#413033',
  },
  tabBar: {
    height: 65,
    backgroundColor: '#0f0607',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    marginTop: 10,
    paddingBottom: 5,
  },
  tabIcon: {
    padding: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  doctorHeader: {
    backgroundColor: '#0f0607',
    elevation: 0,
    shadowOpacity: 0,
  },
  doctorHeaderTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
  },
  headerLeft: {
    padding: 10,
    marginLeft: 6,
  },
});

export default memo(HomeScreen);
import base64
import json
import re
import os
import logging
from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Q, Exists, OuterRef
from django.db.models.functions import Coalesce
from django.utils import timezone
from asgiref.sync import async_to_sync, sync_to_async
from channels.generic.websocket import WebsocketConsumer, AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from .models import User, Connection, Message, Group, Reaction, BlockedUser
from .serializers import (
    UserSerializer, SearchSerializer, RequestSerializer, FriendSerializer,
    MessageSerializer, GroupSerializer
)
from datetime import datetime
from .views import send_fcm_notification
import redis

# Helper function to convert datetime objects to strings
def serialize_datetime(obj):
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        return serialize_datetime(obj.__dict__)
    return obj

# Set up logging
logger = logging.getLogger(__name__)

class SignalingVoiceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            type_ = data.get('type')
            logger.info(f"Received message type: {type_}")
            if type_ == 'JOIN':
                self.group_name = data.get('payload')
                await self.channel_layer.group_add(self.group_name, self.channel_name)
                await self.add_user_to_group(self.group_name, self.channel_name)
                other_user = await self.get_other_user(self.group_name)
                if other_user:
                    await self.send(json.dumps({"type": "OTHER_USER", "payload": other_user}))
                    await self.channel_layer.send(other_user, {"type": "user_joined", "payload": self.channel_name})
            elif type_ == 'OFFER':
                await self.channel_layer.send(data['target'], {"type": "offer", "sdp": data['sdp']})
            elif type_ == 'ANSWER':
                await self.channel_layer.send(data['target'], {"type": "answer", "sdp": data['sdp']})
            elif type_ == 'ICE_CANDIDATE':
                await self.channel_layer.send(data['target'], {"type": "ice_candidate", "candidate": data['candidate']})
        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message as JSON")
        except Exception as e:
            logger.error(f"Error in SignalingConsumer: {e}")

    async def user_joined(self, event):
        await self.send(json.dumps({"type": "USER_JOINED", "payload": event['payload']}))

    async def offer(self, event):
        await self.send(json.dumps({"type": "OFFER", "sdp": event['sdp']}))

    async def answer(self, event):
        await self.send(json.dumps({"type": "ANSWER", "sdp": event['sdp']}))

    async def ice_candidate(self, event):
        await self.send(json.dumps({"type": "ICE_CANDIDATE", "candidate": event['candidate']}))

    @database_sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        group_users = cache.get(group_name, [])
        if channel_name not in group_users:
            group_users.append(channel_name)
            cache.set(group_name, group_users, timeout=86400)
        logger.info(f"Added {channel_name} to group {group_name}")

    @database_sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        group_users = cache.get(group_name, [])
        if channel_name in group_users:
            group_users.remove(channel_name)
            cache.set(group_name, group_users, timeout=86400)
        logger.info(f"Removed {channel_name} from group {group_name}")

    @database_sync_to_async
    def get_other_user(self, group_name):
        users = cache.get(group_name, [])
        return next((user for user in users if user != self.channel_name), None)
    

class SignalingMusicConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        self.user = self.scope['user']  # May be AnonymousUser if not authenticated
        self.channel_name = self.channel_name
        await self.accept()

    async def handle_join(self, data):
        self.group_name = data.get('payload')
        logger.info(f"User {'Anonymous' if not self.user.is_authenticated else self.user.username} joining group: {self.group_name}")
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.add_user_to_group(self.group_name, self.channel_name)
        other_users = await self.get_other_users(self.group_name)
        for user in other_users:
            await self.send(json.dumps({"type": "OTHER_USER", "payload": user}))
            await self.channel_layer.send(user, {"type": "user.joined", "payload": self.channel_name})
        await self.broadcast_participants()

    @sync_to_async
    def get_username_from_channel(self, channel):
        return self.user.username if self.user.is_authenticated and channel == self.channel_name else "Anonymous"

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)
            await self.notify_user_left()
            await self.broadcast_participants()

    async def notify_user_left(self):
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "user.left", "payload": self.channel_name}
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            logger.info(f"Received message type: {message_type}")
            if message_type == 'JOIN':
                await self.handle_join(data)
            elif message_type in ['OFFER', 'ANSWER', 'ICE_CANDIDATE']:
                await self.handle_webrtc_signal(data)
            elif message_type in ['PLAY', 'PAUSE', 'SEEK', 'TRACK_CHANGE', 'PLAYLIST_ADD', 'PLAYLIST_SYNC']:
                await self.handle_media_control(data)
        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message as JSON")
        except Exception as e:
            logger.error(f"Error in SignalingMusicConsumer: {e}")

    async def handle_webrtc_signal(self, data):
        message_type = data['type'].lower()
        target = data.get('target')
        if target:
            await self.channel_layer.send(target, {
                "type": message_type,
                "sdp": data.get('sdp'),
                "candidate": data.get('candidate')
            })

    async def handle_media_control(self, data):
        await self.channel_layer.group_send(self.group_name, {"type": "media.control", "payload": data})

    async def broadcast_participants(self):
        users = await self.get_all_users(self.group_name)
        participants = [
            {
                "channel": user,
                "username": await self.get_username_from_channel(user),
                "isSpeaking": False  # Simplified; could track audio activity if needed
            } for user in users
        ]
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "media.control",
                "payload": {"type": "PARTICIPANTS_UPDATE", "participants": participants}
            }
        )

    async def user_joined(self, event):
        await self.send(json.dumps({"type": "USER_JOINED", "payload": event['payload']}))
        await self.broadcast_participants()

    async def user_left(self, event):
        await self.send(json.dumps({"type": "USER_LEFT", "payload": event['payload']}))
        await self.broadcast_participants()

    async def media_control(self, event):
        await self.send(json.dumps(event['payload']))

    @sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        if channel_name not in users:
            users.append(channel_name)
            cache.set(cache_key, users, timeout=86400)
        logger.info(f"Users in group {group_name}: {users}")

    @sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        if channel_name in users:
            users.remove(channel_name)
            cache.set(cache_key, users, timeout=86400)
        logger.info(f"Users in group {group_name}: {users}")

    @sync_to_async
    def get_all_users(self, group_name):
        cache_key = f"group_{group_name}"
        return cache.get(cache_key, [])

    @sync_to_async
    def get_other_users(self, group_name):
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        return [user for user in users if user != self.channel_name]

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            type_ = data.get('type')
            logger.info(f"Received message type: {type_}")
            if type_ == 'JOIN':
                self.group_name = data.get('payload')
                await self.channel_layer.group_add(self.group_name, self.channel_name)
                await self.add_user_to_group(self.group_name, self.channel_name)
                other_user = await self.get_other_user(self.group_name)
                if other_user:
                    await self.send(json.dumps({"type": "OTHER_USER", "payload": other_user}))
                    await self.channel_layer.send(other_user, {"type": "user_joined", "payload": self.channel_name})
            elif type_ == 'OFFER':
                await self.channel_layer.send(data['target'], {"type": "offer", "sdp": data['sdp']})
            elif type_ == 'ANSWER':
                await self.channel_layer.send(data['target'], {"type": "answer", "sdp": data['sdp']})
            elif type_ == 'ICE_CANDIDATE':
                await self.channel_layer.send(data['target'], {"type": "ice_candidate", "candidate": data['candidate']})
            elif type_ in ['PLAY', 'PAUSE', 'SEEK', 'TRACK_CHANGE', 'PLAYLIST_ADD', 'PLAYLIST_SYNC']:
                await self.channel_layer.group_send(self.group_name, {"type": "signal_message", "message": data})
        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message as JSON")
        except Exception as e:
            logger.error(f"Error in SignalingConsumer: {e}")

    async def user_joined(self, event):
        await self.send(json.dumps({"type": "USER_JOINED", "payload": event['payload']}))

    async def offer(self, event):
        await self.send(json.dumps({"type": "OFFER", "sdp": event['sdp']}))

    async def answer(self, event):
        await self.send(json.dumps({"type": "ANSWER", "sdp": event['sdp']}))

    async def ice_candidate(self, event):
        await self.send(json.dumps({"type": "ICE_CANDIDATE", "candidate": event['candidate']}))

    async def signal_message(self, event):
        await self.send(json.dumps(event['message']))

    @database_sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        group_users = cache.get(group_name, [])
        if channel_name not in group_users:
            group_users.append(channel_name)
            cache.set(group_name, group_users, timeout=86400)
        logger.info(f"Added {channel_name} to group {group_name}")

    @database_sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        group_users = cache.get(group_name, [])
        if channel_name in group_users:
            group_users.remove(channel_name)
            cache.set(group_name, group_users, timeout=86400)
        logger.info(f"Removed {channel_name} from group {group_name}")

    @database_sync_to_async
    def get_other_user(self, group_name):
        users = cache.get(group_name, [])
        return next((user for user in users if user != self.channel_name), None)

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        user = self.scope['user']
        if not user.is_authenticated:
            self.close()
            return

        self.username = user.username
        async_to_sync(self.channel_layer.group_add)(self.username, self.channel_name)
        user.last_online = timezone.now()
        user.is_online = True
        user.save()
        self.broadcast_online_status(user.username, True)
        self.send_initial_friend_status(user)
        self.accept()
    
    def receive_voicecall_request(self, data):
        inner_data = data.get("data", {})
        connection_id = inner_data.get("connectionId")
        room_id = inner_data.get("roomId")

        if not connection_id:
            logger.error("No connection ID provided in receive_voicecall_request")
            self.send_error("Connection ID is required")
            return

        if not room_id:
            logger.error("No room ID provided in receive_voicecall_request")
            self.send_error("Room ID is required")
            return

        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist")
            self.send_error("Connection not found")
            return

        user = self.scope["user"]
        recipient = connection.sender if connection.sender != user else connection.receiver
        self.send_group(
            recipient.username,
            "voicecall.request",
            {
                "caller": user.username,
                "roomId": room_id,
                "connectionId": connection_id,
            },
        )
        print(f"Voice call request from {user.username} to {recipient.username} for room {room_id}")

    def receive_voicecall_accept(self, data):
        inner_data = data.get("data", {})
        connection_id = inner_data.get("connectionId")
        room_id = inner_data.get("roomId")

        if not connection_id:
            logger.error("No connection ID provided in receive_voicecall_accept")
            self.send_error("Connection ID is required")
            return

        if not room_id:
            logger.error("No room ID provided in receive_voicecall_accept")
            self.send_error("Room ID is required")
            return

        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist in receive_voicecall_accept")
            self.send_error("Connection not found")
            return

        user = self.scope["user"]
        caller = connection.sender if connection.receiver == user else connection.receiver
        self.send_group(
            caller.username,
            "voicecall.accept",
            {"roomId": room_id, "connectionId": connection_id},
        )
        logger.info(f"Voice call accepted by {user.username} from {caller.username} for room {room_id}")

    def receive_voicecall_reject(self, data):
        inner_data = data.get("data", {})
        connection_id = inner_data.get("connectionId")

        if not connection_id:
            logger.error("No connection ID provided in receive_voicecall_reject")
            self.send_error("Connection ID is required")
            return

        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist in receive_voicecall_reject")
            self.send_error("Connection not found")
            return

        user = self.scope["user"]
        caller = connection.sender if connection.receiver == user else connection.receiver
        self.send_group(
            caller.username,
            "voicecall.reject",
            {"connectionId": connection_id},
        )
        logger.info(f"Voice call rejected by {user.username} from {caller.username}")

    def receive_voicecall_cancel(self, data):
        inner_data = data.get("data", {})
        connection_id = inner_data.get("connectionId")

        if not connection_id:
            logger.error("No connection ID provided in receive_voicecall_cancel")
            self.send_error("Connection ID is required")
            return

        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist in receive_voicecall_cancel")
            self.send_error("Connection not found")
            return

        user = self.scope["user"]
        recipient = connection.sender if connection.sender != user else connection.receiver
        self.send_group(
            recipient.username,
            "voicecall.cancel",
            {"connectionId": connection_id},
        )
        logger.info(f"Voice call canceled by {user.username} to {recipient.username}")
        
    def receive_call_request(self, data):
    # Access the nested 'data' dictionary, default to {} if missing
        inner_data = data.get('data', {})
        connection_id = inner_data.get('connectionId')
        room_id = inner_data.get('roomId')
        
        # Validate that connection_id is provided
        if connection_id is None:
            logger.error("No connection ID provided in receive_call_request")
            self.send_error('Connection ID is required')
            return
        
        # Validate that room_id is provided
        if not room_id:
            logger.error("No room ID provided in receive_call_request")
            self.send_error('Room ID is required')
            return
        
        # Proceed with the logic (example implementation)
        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist")
            self.send_error('Connection not found')
            return
        
        user = self.scope['user']
        recipient = connection.sender if connection.sender != user else connection.receiver
        self.send_group(recipient.username, 'call.request', {
            'caller': user.username,
            'roomId': room_id,
            'connectionId': connection_id
        })
        logger.info(f"Call request from {user.username} to {recipient.username} for room {room_id}")
        
    def receive_call_accept(self, data):
        inner_data = data.get('data', {})
        connection_id = inner_data.get('connectionId')
        room_id = inner_data.get('roomId')
        
        if not connection_id:
            logger.error("No connection ID provided in receive_call_accept")
            self.send_error('Connection ID is required')
            return
        
        if not room_id:
            logger.error("No room ID provided in receive_call_accept")
            self.send_error('Room ID is required')
            return
        
        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist in receive_call_accept")
            self.send_error('Connection not found')
            return
        
        user = self.scope['user']
        caller = connection.sender if connection.receiver == user else connection.receiver
        
        # Notify caller that call is accepted
        self.send_group(caller.username, 'call.accept', {
            'roomId': room_id,
            'connectionId': connection_id
        })
        logger.info(f"Call accepted by {user.username} from {caller.username} for room {room_id}")
    
    def receive_call_reject(self, data):
        inner_data = data.get('data', {})
        connection_id = inner_data.get('connectionId')
        
        if not connection_id:
            logger.error("No connection ID provided in receive_call_reject")
            self.send_error('Connection ID is required')
            return
        
        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist in receive_call_reject")
            self.send_error('Connection not found')
            return
        
        user = self.scope['user']
        caller = connection.sender if connection.receiver == user else connection.receiver
        
        # Notify caller that call is rejected
        self.send_group(caller.username, 'call.reject', {
            'connectionId': connection_id
        })
        logger.info(f"Call rejected by {user.username} from {caller.username}")
    def receive_call_cancel(self, data):
        inner_data = data.get('data', {})
        connection_id = inner_data.get('connectionId')
        
        if not connection_id:
            logger.error("No connection ID provided in receive_call_cancel")
            self.send_error('Connection ID is required')
            return
        
        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            logger.error(f"Connection with ID {connection_id} does not exist in receive_call_cancel")
            self.send_error('Connection not found')
            return
        
        user = self.scope['user']
        recipient = connection.sender if connection.sender != user else connection.receiver
        
        # Notify recipient that call is canceled
        self.send_group(recipient.username, 'call.cancel', {
            'connectionId': connection_id
        })
        logger.info(f"Call canceled by {user.username} to {recipient.username}")
    
    def get_preview_text(self, message):
        if message.is_deleted:
            return "Message deleted"
        elif message.type == 'text':
            return message.text
        else:
            return f"{message.type.capitalize()} message"

    def disconnect(self, close_code):
        if hasattr(self, 'username'):
            async_to_sync(self.channel_layer.group_discard)(self.username, self.channel_name)
            user = User.objects.get(username=self.username)
            user.last_online = timezone.now()
            user.is_online = False
            user.save()
            self.broadcast_online_status(self.username, False)

    def send_initial_friend_status(self, user):
        friends = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user), accepted=True
        )
        friend_usernames = [
            friend.receiver.username if friend.sender == user else friend.sender.username
            for friend in friends
        ]
        online_users = User.objects.filter(username__in=friend_usernames)
        for friend in online_users:
            is_online = friend.is_online and (timezone.now() - friend.last_online).total_seconds() < 300
            self.send_group(user.username, 'online.status', {
                'username': friend.username,
                'online': is_online
            })

    def broadcast_online_status(self, username, online):
        user = User.objects.get(username=username)
        friends = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user), accepted=True
        )
        for friend in friends:
            recipient = friend.receiver if friend.sender == user else friend.sender
            async_to_sync(self.channel_layer.group_send)(
                recipient.username,
                {
                    'type': 'broadcast_group',
                    'message': {'source': 'online.status', 'data': {'username': username, 'online': online}}
                }
            )
    def receive_message_delete(self, data):
        user = self.scope['user']
        message_id = data.get('messageId')
        message = Message.objects.get(id=message_id, user=user)
        message.is_deleted = True
        message.save()

        if message.connection:
            recipient = message.connection.sender if message.connection.sender != user else message.connection.receiver
            recipients = [user, recipient]
            connection_id = str(message.connection.id)
            latest_message = Message.objects.filter(connection=message.connection, is_deleted=False).order_by('-created').first()
            new_preview = self.get_preview_text(latest_message) if latest_message else 'No messages'
            new_updated = latest_message.created.isoformat() if latest_message else message.connection.updated.isoformat()
        elif message.group:
            recipients = message.group.members.all()
            connection_id = f'group_{message.group.id}'
            latest_message = Message.objects.filter(group=message.group, is_deleted=False).order_by('-created').first()
            new_preview = self.get_preview_text(latest_message) if latest_message else 'No messages'
            new_updated = latest_message.created.isoformat() if latest_message else message.group.created.isoformat()
        else:
            recipients = []
            connection_id = None

        # Update friend preview and broadcast deletion
        for recipient in recipients:
            self.send_group(recipient.username, 'friend.preview.update', {
                'connectionId': connection_id,
                'preview': new_preview,
                'updated': new_updated
            })
            self.send_group(recipient.username, 'message.delete', {
                'messageId': message.id,
                'connectionId': connection_id
            })

    def receive(self, text_data):
        try:
            data = json.loads(text_data)
            data_source = data.get('source')
            logger.info('receive: %s', json.dumps(data, indent=2))

            handlers = {
                'friend.list': self.receive_friend_list,
                'message.list': self.receive_message_list,
                'message.send': self.receive_message_send,
                'message.type': self.receive_message_type,
                'request.accept': self.receive_request_accept,
                'request.connect': self.receive_request_connect,
                'request.list': self.receive_request_list,
                'search': self.receive_search,
                'thumbnail': self.receive_thumbnail,
                'image': self.receive_image,
                'online.status': self.receive_online_status,
                'groups.create': self.receive_group_create,
                'call.reject': self.receive_call_reject,
                'message.edit': self.receive_message_edit,
                'message.delete': self.receive_message_delete,
                'call.request': self.receive_call_request,
                'call.accept': self.receive_call_accept,
                'call.reject': self.receive_call_reject,
                'call.cancel': self.receive_call_cancel,
                'voicecall.request': self.receive_voicecall_request,
                'voicecall.accept': self.receive_voicecall_accept,
                'voicecall.reject': self.receive_voicecall_reject,
                'voicecall.cancel': self.receive_voicecall_cancel,
            }

            handler = handlers.get(data_source)
            if handler:
                handler(data)
            else:
                logger.warning(f"Unknown source: {data_source}")
                self.send_error("Unknown source")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            self.send_error("Server error")
            


    # Update the receive_message_edit method in ChatConsumer
    def receive_message_edit(self, data):
        user = self.scope['user']
        message_id = data.get('messageId')
        new_text = data.get('newText')
        message = Message.objects.get(id=message_id, user=user)
        message.text = new_text
        message.save()
        serialized_message = MessageSerializer(message, context={'user': user}).data

        connection_id = None
        recipients = []
        new_preview = None
        new_updated = None

        if message.connection:
            connection = message.connection
            connection_id = str(connection.id)
            recipient = connection.sender if connection.sender != user else connection.receiver
            recipients = [user, recipient]
            latest_message = Message.objects.filter(connection=connection, is_deleted=False).order_by('-created').first()
        elif message.group:
            group = message.group
            connection_id = f'group_{group.id}'
            recipients = group.members.all()
            latest_message = Message.objects.filter(group=group, is_deleted=False).order_by('-created').first()
        else:
            return

        # Update preview if edited message is the latest
        if latest_message and latest_message.id == message.id:
            new_preview = self.get_preview_text(message)
            new_updated = message.created.isoformat()
            
            # Send friend.preview.update to all participants
            for recipient in recipients:
                self.send_group(recipient.username, 'friend.preview.update', {
                    'connectionId': connection_id,
                    'preview': new_preview,
                    'updated': new_updated,
                    'messageId': message.id  # Include message ID for validation
                })

        # Always send message.update
        for recipient in recipients:
            self.send_group(recipient.username, 'message.update', {
                'message': serialized_message
            })
                    

    # def receive_message_edit(self, data):
    #     user = self.scope['user']
    #     message_id = data.get('messageId')
    #     new_text = data.get('newText')
    #     message = Message.objects.get(id=message_id, user=user)
    #     message.text = new_text
    #     message.save()
    #     serialized_message = MessageSerializer(message, context={'user': user}).data

    #     if message.connection:
    #         recipient = message.connection.sender if message.connection.sender != user else message.connection.receiver
    #         recipients = [user, recipient]
    #         connection_id = str(message.connection.id)
    #         latest_message = Message.objects.filter(connection=message.connection, is_deleted=False).order_by('-created').first()
    #     elif message.group:
    #         recipients = message.group.members.all()
    #         connection_id = f'group_{message.group.id}'
    #         latest_message = Message.objects.filter(group=message.group, is_deleted=False).order_by('-created').first()
    #     else:
    #         recipients = []
    #         connection_id = None

    #     # Send friend.preview.update if the edited message is the latest
    #     if latest_message and latest_message.id == message.id:
    #         print(f"Sending friend.preview.update: connectionId={connection_id}, preview={new_preview}, updated={new_updated}")

    #         new_preview = self.get_preview_text(message)
    #         new_updated = message.created.isoformat()
    #         logger.info(f"Sending friend.preview.update - connectionId: {connection_id}, preview: {new_preview}, messageId: {message.id}")
    #         for recipient in recipients:
    #             self.send_group(recipient.username, 'friend.preview.update', {
    #                 'connectionId': connection_id,
    #                 'preview': new_preview,
    #                 'updated': new_updated,
    #             })

    #     # Always send message.update
    #     for recipient in recipients:
    #         self.send_group(recipient.username, 'message.update', {'message': serialized_message})
            
    # def receive_call_reject(self, data):
    #     recipient_username = data.get('recipient')
    #     roomId = data.get('roomId')
    #     self.send_group(recipient_username, 'call.rejected', {'roomId': roomId})
    #     logger.info(f"Call rejection sent to {recipient_username} for room {roomId}")

    def send_group(self, group, source, data):
        serialized_data = serialize_datetime(data)
        response = {'source': source, 'data': serialized_data}
        try:
            async_to_sync(self.channel_layer.group_send)(
                group, {'type': 'broadcast_group', 'message': response}
            )
        except Exception as e:
            logger.error(f"Error sending group message: {e}")

    def send_error(self, message):
        self.send(text_data=json.dumps({'source': 'error', 'data': {'message': message}}))

    def broadcast_group(self, event):
        message = event['message']
        serialized_message = serialize_datetime(message)
        self.send(text_data=json.dumps(serialized_message))


    def receive_message_send(self, data):
        user = self.scope['user']
        connection_id = data.get('connectionId')
        message_text = data.get('message')
        type_ = data.get('type', 'text')
        replied_to_id = data.get('replied_to')
        is_group = data.get('isGroup', False)
        incognito = data.get('incognito', False)
        disappearing = data.get('disappearing', None)

        # Determine recipients and create message
        if is_group:
            group = Group.objects.get(id=connection_id.replace('group_', ''))
            message = Message.objects.create(
                group=group, user=user, text=message_text, type=type_,
                replied_to=Message.objects.get(id=replied_to_id) if replied_to_id else None,
                incognito=incognito, disappearing=disappearing
            )
            recipients = group.members.exclude(username=user.username)
            friend_data = {'username': group.name}
            group_name = group.name
        else:
            try:
                connection = Connection.objects.get(id=connection_id)
            except Connection.DoesNotExist:
                logger.error(f"Connection with ID {connection_id} does not exist in receive_message_send")
                self.send_error('Connection not found')
                return
            recipient = connection.sender if connection.sender != user else connection.receiver
            BlockedUser.objects.filter(user=user, blocked_user=recipient).exists()
            message = Message.objects.create(
                connection=connection, user=user, text=message_text, type=type_,
                replied_to=Message.objects.get(id=replied_to_id) if replied_to_id else None,
                incognito=incognito, disappearing=disappearing
            )
            recipients = [recipient]
            friend_data = UserSerializer(recipient).data
            group_name = None

        # Prepare notification details
        sender_name = user.username
        notification_title = f"{sender_name} sent a {type_.capitalize()}"
        if is_group:
            notification_title = f"{sender_name} sent a {type_.capitalize()} in {group_name}"
        
        timestamp = timezone.now().strftime('%I:%M %p')
        notification_body = self.get_notification_body(type_, message_text, timestamp)
        
        thumbnail_url = f"https://{settings.SITE_DOMAIN}{settings.MEDIA_URL}{user.thumbnail}" if user.thumbnail else ""
        custom_payload = {
            "message": {
                "token": None,  # Will be set per recipient
                "notification": {
                    "title": notification_title,
                    "body": notification_body
                },
                "data": {
                    "connectionId": str(connection_id),
                    "messageId": str(message.id),
                    "sender": sender_name,
                    "senderThumbnail": thumbnail_url,
                    "content": message_text,
                    "type": type_,
                    "timestamp": timestamp,
                    "isGroup": str(is_group),
                    "groupName": group_name if is_group else "",
                    "click_action": "OPEN_CHAT"
                },
                "android": {"priority": "high"},
                "apns": {"headers": {"apns-priority": "10"}}
            }
        }

        # Notify recipients
        for recipient in recipients:
            serialized_message = MessageSerializer(message, context={'user': recipient}).data
            self.send_group(recipient.username, 'message.send', {
                'message': serialized_message,
                'friend': UserSerializer(user).data,
                'connectionId': connection_id
            })
            
            # Check if recipient has an FCM token and is not blocked
            if recipient.fcm_token and not BlockedUser.objects.filter(user=user, blocked_user=recipient).exists():
                custom_payload["message"]["token"] = recipient.fcm_token
                result = send_fcm_notification(
                    fcm_token=recipient.fcm_token,
                    title=notification_title,
                    body=notification_body,
                    custom_payload=custom_payload
                )
                if result:
                    logger.info(f"Notification sent to {recipient.username}")
                else:
                    logger.error(f"Failed to send notification to {recipient.username}")

        # Notify sender
        serialized_message = MessageSerializer(message, context={'user': user}).data
        self.send_group(user.username, 'message.send', {
            'message': serialized_message,
            'friend': friend_data,
            'connectionId': connection_id
        })

    def get_notification_body(self, type_, message_text, timestamp):
        """Generate notification body based on message type."""
        if type_ == 'text':
            return f"{message_text} | {timestamp}"
        elif type_ in ['image', 'video', 'audio', 'document']:
            return f"[{type_.capitalize()}] | {timestamp}"
        elif type_ == 'location':
            return f"Location shared | {timestamp}"
        elif type_ in ['videocall', 'voicecall']:
            return f"Tap to join | {timestamp}"
        elif type_ in ['listen', 'watch']:
            return f"Join to {type_} together | {timestamp}"
        return f"{message_text} | {timestamp}"

    def send_group(self, group, source, data):
        async_to_sync(self.channel_layer.group_send)(
            group, {'type': 'broadcast_group', 'message': {'source': source, 'data': data}}
        )

    def broadcast_group(self, event):
        self.send(text_data=json.dumps(event['message']))
        
    def receive_friend_list(self, data):
        user = self.scope['user']
        latest_message = Message.objects.filter(connection=OuterRef('id'), is_deleted=False).order_by('-created')[:1]
        connections = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user), accepted=True
        ).annotate(
            latest_text=latest_message.values('text'),
            latest_type=latest_message.values('type'),
            latest_created=latest_message.values('created')
        ).order_by(Coalesce('latest_created', 'updated').desc())
        groups = Group.objects.filter(members=user)
        group_connections = [
            {
                'id': f'group_{group.id}',
                'friend': {'username': group.name, 'name': group.name, 'thumbnail': None, 'online': True},
                'preview': self.get_group_preview(group),
                'updated': group.created.isoformat(),  # Fixed here
                'unread_count': group.messages.filter(seen=False).exclude(user=user).count()
            } for group in groups
        ]
        serialized = FriendSerializer(connections, context={'user': user}, many=True)
        friend_list = serialized.data + group_connections
        self.send_group(user.username, 'friend.list', friend_list)
        
        
    def get_group_preview(self, group):
        latest_message = group.messages.filter(is_deleted=False).order_by('-created').first()
        if latest_message:
            return self.get_preview_text(latest_message)
        return 'Group created'

    def receive_message_list(self, data):
        user = self.scope['user']
        connectionId = data.get('connectionId')
        page = data.get('page', 0)
        page_size = 15
        connectionId_str = str(connectionId)

        if connectionId_str.startswith('group_'):
            group_id = connectionId_str.replace('group_', '')
            try:
                group = Group.objects.get(id=group_id)
                messages = Message.objects.filter(group=group).order_by('-created')[page * page_size:(page + 1) * page_size]
                recipient = {'username': group.name, 'thumbnail': None}
                messages_count = Message.objects.filter(group=group).count()
                is_blocked = False
                i_blocked_friend = False
            except Group.DoesNotExist:
                self.send_error('Group not found')
                return
        else:
            try:
                connection = Connection.objects.get(id=int(connectionId))
                messages = Message.objects.filter(connection=connection).order_by('-created')[page * page_size:(page + 1) * page_size]
                recipient = connection.sender if connection.sender != user else connection.receiver
                messages_count = Message.objects.filter(connection=connection).count()
                is_blocked = BlockedUser.objects.filter(user=recipient, blocked_user=user).exists()
                i_blocked_friend = BlockedUser.objects.filter(user=user, blocked_user=recipient).exists()
            except Connection.DoesNotExist:
                self.send_error('Connection not found')
                return

        serialized_messages = MessageSerializer(messages, context={'user': user}, many=True)
        serialized_friend = UserSerializer(recipient) if not connectionId_str.startswith('group_') else {'username': recipient['username']}
        next_page = page + 1 if messages_count > (page + 1) * page_size else None
        data_response = {
            'messages': serialized_messages.data,
            'next': next_page,
            'friend': serialized_friend.data,
            'is_blocked': is_blocked,
            'i_blocked_friend': i_blocked_friend,
        }
        self.send_group(user.username, 'message.list', data_response)

    def receive_message_type(self, data):
        user = self.scope['user']
        recipient_username = data.get('username')
        data_response = {'username': user.username}
        self.send_group(recipient_username, 'message.type', data_response)

    def receive_request_accept(self, data):
        username = data.get('username')
        try:
            connection = Connection.objects.get(sender__username=username, receiver=self.scope['user'])
        except Connection.DoesNotExist:
            self.send_error('Connection not found')
            return

        connection.accepted = True
        connection.save()

        serialized = RequestSerializer(connection)
        self.send_group(connection.sender.username, 'request.accept', serialized.data)
        self.send_group(connection.receiver.username, 'request.accept', serialized.data)

        serialized_friend_sender = FriendSerializer(connection, context={'user': connection.sender}).data
        self.send_group(connection.sender.username, 'friend.new', serialized_friend_sender)

        serialized_friend_receiver = FriendSerializer(connection, context={'user': connection.receiver}).data
        self.send_group(connection.receiver.username, 'friend.new', serialized_friend_receiver)

    def receive_request_connect(self, data):
        username = data.get('username')
        try:
            receiver = User.objects.get(username=username)
        except User.DoesNotExist:
            self.send_error('User not found')
            return

        connection, _ = Connection.objects.get_or_create(sender=self.scope['user'], receiver=receiver)
        serialized = RequestSerializer(connection)
        self.send_group(connection.sender.username, 'request.connect', serialized.data)
        self.send_group(connection.receiver.username, 'request.connect', serialized.data)

    def receive_request_list(self, data):
        user = self.scope['user']
        connections = Connection.objects.filter(receiver=user, accepted=False)
        serialized = RequestSerializer(connections, many=True)
        self.send_group(user.username, 'request.list', serialized.data)

    def receive_search(self, data):
        query = data.get('query')
        users = User.objects.filter(
            Q(username__istartswith=query) | Q(first_name__istartswith=query) | Q(last_name__istartswith=query)
        ).exclude(username=self.username).annotate(
            pending_them=Exists(Connection.objects.filter(sender=self.scope['user'], receiver=OuterRef('id'), accepted=False)),
            pending_me=Exists(Connection.objects.filter(sender=OuterRef('id'), receiver=self.scope['user'], accepted=False)),
            connected=Exists(Connection.objects.filter(
                Q(sender=self.scope['user'], receiver=OuterRef('id')) | Q(receiver=self.scope['user'], sender=OuterRef('id')),
                accepted=True
            ))
        )
        serialized = SearchSerializer(users, many=True)
        self.send_group(self.username, 'search', serialized.data)

    def receive_thumbnail(self, data):
        user = self.scope['user']
        image_str = data.get('base64')
        try:
            image = ContentFile(base64.b64decode(image_str))
        except Exception as e:
            logger.error(f"Error decoding thumbnail: {e}")
            self.send_error("Invalid thumbnail image")
            return

        filename = data.get('filename')
        user.thumbnail.save(filename, image, save=True)
        serialized = UserSerializer(user)
        self.send_group(self.username, 'thumbnail', serialized.data)

    def receive_image(self, data):
        user = self.scope['user']
        image_str = data.get('base64')
        try:
            image = ContentFile(base64.b64decode(image_str))
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            self.send_error("Invalid image file")
            return

        filename = data.get('filename', f"{user.username}_uploaded_image.jpg")
        file_path = os.path.join(settings.MEDIA_ROOT, 'uploads', filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'wb') as f:
            f.write(image.read())
        response_data = {'message': 'Image uploaded successfully', 'file_path': file_path}
        self.send_group(self.username, 'image', response_data)

    def receive_online_status(self, data):
        user = self.scope['user']
        online_users = User.objects.filter(last_online__gte=timezone.now() - timezone.timedelta(minutes=5))
        for online_user in online_users:
            is_online = online_user.is_online and (timezone.now() - online_user.last_online).total_seconds() < 300
            self.send_group(user.username, 'online.status', {
                'username': online_user.username,
                'online': is_online
            })

    def receive_group_create(self, data):
        user = self.scope['user']
        name = data.get('name')
        if not name:
            self.send_error("Group name is required")
            return
        group = Group.objects.create(name=name, creator=user)
        group.admins.add(user)
        group.members.add(user)
        serialized = GroupSerializer(group)
        self.send_group(user.username, 'group.created', serialized.data)

class FeedConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        await self.channel_layer.group_add("feed_updates", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("feed_updates", self.channel_name)

    async def new_post(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_post',
            'post': event['post']
        }))

    async def new_comment(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_comment',
            'comment': event['comment']
        }))

        over here everything is working but now i want to add a new function that even if the other user is not uisng the app if user a call user b then user b incoming screen will pop up like whatsapp
