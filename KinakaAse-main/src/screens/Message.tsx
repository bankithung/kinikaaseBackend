
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

    const openVideoCall = useCallback(() => {
      const id = generateID();
      messageSend(connectionId, id, 'videocall', null, isGroup);
      navigation.navigate('VideoCall', {
        roomId: id,
        friend,
        navigation,
        isGroup,
      });
    }, [connectionId, friend, navigation, messageSend, isGroup]);

    const openVoiceCall = useCallback(() => {
      const id = generateID();
      messageSend(connectionId, id, 'voicecall', null, isGroup);
      navigation.navigate('VoiceCall', {
        roomId: id,
        friend,
        navigation,
        isGroup,
      });
    }, [connectionId, friend, navigation, messageSend, isGroup]);

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
        navigation.navigate('VideoCall', {
          roomId: text.text,
          navigation,
          friend,
        }),
      [navigation, text.text, friend],
    );
    const openVoiceCall = useCallback(
      () =>
        navigation.navigate('VoiceCall', {
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
        navigation.navigate('VideoCall', {
          roomId: text.text,
          navigation,
          friend,
        }),
      [navigation, text?.text, friend],
    );
    const openVoiceCall = useCallback(
      () =>
        navigation.navigate('VoiceCall', {
          roomId: text.text,
          navigation,
          friend,
        }),
      [navigation, text?.text, friend],
    );
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
      navigation.navigate('VideoCall', {
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




