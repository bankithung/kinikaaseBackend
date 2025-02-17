import React, {useCallback} from 'react';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  Alert,
  Easing,
  Pressable,
  PermissionsAndroid,
  ScrollView,
  StatusBar,
  useColorScheme,
  FlatList,
  InputAccessoryView,
  Keyboard,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  Button,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Linking,
  ImageBackground,
} from 'react-native';
import Thumbnail from '../common/Thumbnail';
import useGlobal from '../core/global';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import utils from '../core/utils';
import Clipboard from '@react-native-clipboard/clipboard';
import {FlashList} from '@shopify/flash-list';
import Toast from 'react-native-simple-toast';
import {Menu, Divider} from 'react-native-paper';

import Geolocation from '@react-native-community/geolocation';
import {WebView} from 'react-native-webview';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';

const sendIcon = '../assets/icons/sendM.png';
const image = '../assets/image.png';
const camera = '../assets/icons/more/camera.png';
const gallery = '../assets/icons/more/gallery.png';
const location = '../assets/icons/more/location.png';
const videocall = '../assets/icons/more/videocall.png';
const play = '../assets/play.png';
const pause = '../assets/pause.png';
const down = '../assets/down.png';
const del = '../assets/del.png';
const reply = '../assets/replyM.png';
const copy = '../assets/copy.png';
const close = '../assets/close.png';
const sendMessageIcon = '../assets/send.png';

const plusIcon = '../assets/plus.png';
const editIcon = '../assets/edit.png';
const closeView = '../assets/closeView.png';
const uploadNew = '../assets/newProfile.png';

import ImagePicker, {openCamera} from 'react-native-image-crop-picker';
import AudioPlayerT from './AudioPlayer';
import axios from 'axios';

// import { showNotification } from "./NotificationService";

import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AVModeIOSOption,
  AudioEncoderAndroidType,
  AudioSet,
  AudioSourceAndroidType,
} from 'react-native-audio-recorder-player';
import secure from '../core/secure';
import Map from './map';
import {ADDRESS} from '../core/api';
import ImageViewerComponent from './ImageViewer/ImageViewer';
import ImageResizer from 'react-native-image-resizer';

const audioRecorderPlayer = new AudioRecorderPlayer();
audioRecorderPlayer.setSubscriptionDuration(0.1);

function MessageHeader({friend, navigation, connectionId, user}) {
  const messageSend = useGlobal(state => state.messageSend);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => scaleAnim.setValue(0));
    }
  }, [visible]);

  if (!friend) return null;

  const handleProfile = () => {
    navigation.navigate('OtherProfile', { friend });
  };

  const generateID = () => {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const openCameras = () => {
    const id = generateID();
    messageSend(connectionId, id, 'videocall');
    navigation.navigate('VideoCall', { roomId: id, friend, navigation });
  };

  const openPlayer = ({ roomType }) => {
    const id = generateID();
    const val=roomType==="PlayMusic"?'listen':"watch";
    console.log(val)
    messageSend(connectionId, id, val);
    const tuser = user.username;
    navigation.navigate(roomType, { roomId: id, navigation, host: tuser });
  };

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        paddingVertical: 10,
        marginLeft: -32,
      }}>
      {/* Container for Thumbnail and Name */}
      <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
        <Thumbnail url={friend?.thumbnail} size={35} />
        <TouchableOpacity onPress={handleProfile}>
          <Text
            style={{
              color: 'white',
              marginLeft: 10,
              fontSize: 18,
              fontWeight: '400',
              paddingVertical: 5,
              textAlign: 'left',
            }}>
            {friend.name}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Icons for Video, Phone, and Dropdown Menu */}
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'row',
          left:10
          
        }}>
        <TouchableOpacity onPress={openCameras}>
          <FontAwesomeIcon
            style={{ marginRight: 30 }}
            icon="video"
            size={17}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity>
          <FontAwesomeIcon
            style={{ marginRight: 15 }}
            icon="phone"
            size={17}
            color="white"
          />
        </TouchableOpacity>

        <Menu
          visible={visible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity
              onPress={openMenu}
              style={{  paddingVertical: 5 }}>
              <FontAwesomeIcon icon="ellipsis-v" size={22} color="white" />
            </TouchableOpacity>
          }
          contentStyle={[
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              marginTop: 10,
              backgroundColor: '#2a1a1c',
              borderRadius: 8,
            },
          ]}
          style={{ marginTop: 30 }}>
          <Animated.View>
            <Menu.Item
              onPress={() => {
                closeMenu();
                openPlayer({ roomType: 'PlayMusic' });
              }}
              title="Listen Together"
              titleStyle={{ color: 'white' }}
              style={{ backgroundColor: '#2a1a1c' }}
            />
            <Divider style={{ backgroundColor: '#413033' }} />
            <Menu.Item
              onPress={() => {
                closeMenu();
                openPlayer({ roomType: 'PlayVideo' });
              }}
              title="Watch Together"
              titleStyle={{ color: 'white' }}
              style={{ backgroundColor: '#2a1a1c' }}
            />
          </Animated.View>
        </Menu>
      </View>
    </View>
  );
}


function MessageBubbleMe({
  text,
  navigation,
  previousMessage,
  replyingTo,
  setReplyingTo,
  friend,
}) {
  const user = useGlobal(state => state.user);
  const currentMessageDay = utils.formatTimeDays(text.created);
  const previousMessageDay = previousMessage
    ? utils.formatTimeDays(previousMessage.created)
    : null;
  const shouldShowDay = currentMessageDay !== previousMessageDay;
  const [showOptions, setShowOption] = useState(false);

  const [token, settoken] = useState('');

  const [lt, lo] = text.text.split(' ');

  const map = Map({lt, lo});
  const mapUrl = `https://www.google.com/maps?q=${lt},${lo}&z=15`;
  const copyToClipboard = async () => {
    await Clipboard.setString(text.text);
    Toast.show('Copied to Clipboard', Toast.SHORT);
  };

  const getToken = async () => {
    const tokens = await secure.get('tokens');
    //utils.log("TOKENDDSSSS=====================: ", tokens)
    await settoken(tokens.access);
    //console.log("SET TOEKN, ",token)
  };

  getToken();

  const deleteMessage = async () => {
    try {
      const response = await axios.post(
        `https://${ADDRESS}/chat/messages/delete/${text.id}/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`, // Replace with your auth token logic
          },
        },
      );
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error(
        'Error deleting message:',
        error.response?.data || error.message,
      );
      throw error;
    }
  };

  const openGoogleMaps = () => {
    const url = Platform.select({
      ios: `https://maps.apple.com/?ll=${lt},${lo}`, // iOS will open Apple Maps
      android: `google.navigation:q=${lt},${lo}`, // Android will open Google Maps
    });

    Linking.openURL(url).catch(err =>
      console.error('Error opening maps: ', err),
    );
  };
  function openCameras() {
    navigation.navigate('VideoCall', {roomId: text.text, navigation, friend});
  }

  function openPlayer() {
    const type=text.type==="watch"?"PlayVideo":'PlayMusic'
    navigation.navigate(type, {
      roomId: text.text,
      navigation,
      host: user.username,
    });
  }

  return (
    <View>
      <View>
        {shouldShowDay && (
          <View>
            <View style={{top: 25}} />
            <View style={{alignItems: 'center', marginVertical: 8}}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  borderRadius: 10,
                  padding: 5,
                  color: 'white',
                  width: shouldShowDay.length,
                  height: 30,
                  backgroundColor: 'rgba(2, 2, 2, 0.58)',
                }}>
                {currentMessageDay}
              </Text>
            </View>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            padding: 3,
            paddingRight: 12,
            marginBottom: text.type === 'text' ? 10 : 1,
            marginTop: text.type === 'text' ? 10 : 1,
          }}>
          <View style={{flex: 1}} />
          {/* <View style={{justifyContent:'center',alignItems:'center'}}>
            <Text
              style={{ 
                textAlign: 'center',
                textAlignVertical: 'center',
                top:
                  text.type === 'audio' || text.type === 'videocall' ? 45 : 10,
                fontSize: 10,
                right:
                  text.type === 'text' || text.type === 'videocall' ? 12 : 0,
                marginBottom: text.type === 'text' ? 30 : 70,
                color: 'white',
              }}>
              {utils.formatTimeChat(text.created)}
            </Text>
          </View> */}

          <View
            style={{
              backgroundColor:
                text.type === 'image' ||
                text.type === 'audio' ||
                text.type === 'location'
                  ? 'transparent'
                  : '#35191b',
              borderRadius: 20,
              maxWidth: '60%',
              paddingHorizontal: text.type === 'text' ? 14 : 7,
              paddingVertical: 12,

              justifyContent: 'center',
              marginRight: 1,
              minHeight: 40,
            }}>
            {text.is_deleted === true ? (
              <View>
                <Text>Message Was Deleted</Text>
              </View>
            ) : (
              <View>
                {text.replied_to === null ? null : (
                  // <View style={{ backgroundColor: "white" }}>
                  // 	<Text>{text.replied_to_message.text}</Text>
                  // </View>
                  <View>
                    {text.replied_to_message.type === 'text' ? (
                      <View
                        style={{
                          backgroundColor: '#50292c',
                          padding: 10,
                          borderRadius: 15,
                          minWidth: 100,
                          maxWidth: 300,
                          marginTop: -9,
                          marginBottom: 5,
                          margin: -5,
                          borderLeftWidth: 5,
                          borderColor: '#24d824',
                          marginLeft: -10,
                        }}>
                        <Text
                          style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: 14,
                          }}>
                          {text.replied_to_message.user === user.username ? (
                            <Text>You</Text>
                          ) : (
                            text.replied_to_message.user
                          )}{' '}
                        </Text>
                        <Text style={{fontSize: 14, color: 'white'}}>
                          {' '}
                          {text.replied_to_message.text}
                        </Text>
                      </View>
                    ) : text.replied_to_message.type === 'audio' ? (
                      <View>
                        <Text>audio</Text>
                      </View>
                    ) : text.replied_to_message.type === 'image' ? (
                      <View>
                        <View
                          style={{
                            backgroundColor: '#50292c',
                            padding: 1,
                            borderRadius: 20,
                            width: 130,
                            marginTop: -9,
                            marginBottom: 5,
                            margin: -5,
                            borderLeftWidth: 5,
                            borderColor: '#24d824',
                            marginLeft: -10,
                          }}>
                          <View style={{top: 45, marginTop: -45, left: 7}}>
                            <Text
                              style={{
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: 14,
                                top: 5,
                                left: 1,
                              }}>
                              {text.replied_to_message.user ===
                              user.username ? (
                                <Text>You</Text>
                              ) : (
                                text.replied_to_message.user
                              )}{' '}
                            </Text>
                            <View style={{flexDirection: 'row', left: 5}}>
                              <Image
                                source={require(image)}
                                style={{
                                  height: 20,
                                  width: 20,
                                  margin: 5,
                                  left: -10,
                                  bottom: -1,
                                  tintColor: 'white',
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: 'white',
                                  bottom: -5,
                                  left: -15,
                                }}>
                                {' '}
                                image
                              </Text>
                            </View>
                          </View>
                          <View style={{alignItems: 'flex-end'}}>
                            <Image
                              source={{
                                uri:
                                  `https://${ADDRESS}` +
                                  text.replied_to_message.text,
                              }}
                              style={{height: 50, width: 50, borderRadius: 10}}
                            />
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}
                {text.type === 'image' ? (
                  <TouchableOpacity
                    onLongPress={() => {
                      setShowOption(true);
                    }}
                    onPress={() =>
                      navigation.navigate('View', {
                        type: `https://${ADDRESS}${text.text}`,
                      })
                    }>
                    <Image
                      source={{uri: `https://${ADDRESS}${text.text}`}}
                      style={{
                        height: 300,
                        width: 200,
                        borderRadius: 5,
                        bottom: 5,
                      }}
                    />
                  </TouchableOpacity>
                ) : text.type === 'audio' ? (
                  <Pressable
                    onLongPress={() => {
                      setShowOption(true);
                    }}>
                    <View
                      style={{
                        maxHeight: 50,
                        justifyContent: 'center',
                        backgroundColor: 'blue',
                        bottom: 3,
                      }}>
                      <AudioPlayerT
                        audioUrl={`https://${ADDRESS}${text.text}`}
                        from={'me'}
                      />
                    </View>
                  </Pressable>
                ) : text.type === 'text' ? (
                  <Pressable
                    onLongPress={() => {
                      setShowOption(true);
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 16,
                        lineHeight: 18,
                        marginBottom: -3,
                      }}>
                      {text.text}
                    </Text>
                  </Pressable>
                ) : text.type === 'location' ? (
                  <TouchableOpacity onPress={openGoogleMaps}>
                    <View
                      style={{
                        height: 150,
                        width: 200,
                        marginVertical: 1,
                        bottom: 7,
                      }}>
                      <WebView
                        originWhitelist={['*']}
                        source={{html: map}}
                        style={{width: 200, height: 70}}
                      />
                    </View>
                  </TouchableOpacity>
                ) : text.type === 'videocall' ? (
                  <View>
                    {/* <Text>Outgoing Video Call</Text> listenTogether*/}
                    <View
                      style={{flexDirection: 'row', justifyContent: 'center'}}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: 'rgba(53, 182, 64, 0.58)',
                          padding: 10,
                          borderRadius: 5,
                          marginRight: 5,
                          width: '70%',
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          openCameras();
                        }}>
                        <Text>Join</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : text.type === 'listen' || text.type==="watch" ? (
                  <View>
                    {/* <Text>Outgoing Video Call</Text> listenTogether*/}
                    <View
                      style={{flexDirection: 'row', justifyContent: 'center'}}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: 'rgba(53, 182, 64, 0.58)',
                          padding: 10,
                          borderRadius: 5,
                          marginRight: 5,
                          width: '70%',
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          openPlayer();
                        }}>
                        <Text>{ text.type === 'listen'?"Listen":"Watch"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            <Text
              style={{
                color: '#878787',
                fontSize: 12,
                textAlign: 'right',
                paddingTop: 3,
                left: 1,
              }}>
              {utils.formatTimeChat(text.created)}
            </Text>
          </View>

          <View style={{justifyContent: 'center', flexDirection: 'row'}}>
            {!(
              text.type === 'image' ||
              text.type === 'audio' ||
              text.type === 'location'
            ) && <View style={styles.box}></View>}
            {/* <View style={{ top: text.type === "audio" ? 40 : 7 }}>
							<Thumbnail
								url={user.thumbnail}
								size={42}
							/>
						</View> */}
          </View>
        </View>
      </View>
      {showOptions ? (
        <View
          style={{
            justifyContent: 'center',
            flexDirection: 'row',
            bottom: 20,
            left: 75,
          }}>
          <TouchableOpacity
            onPress={() => {
              deleteMessage();
            }}>
            <Image
              source={require(del)}
              style={{
                height: 20,
                width: 20,
                margin: 5,
                left: 5,
                top: 5,
                tintColor: 'white',
              }}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => copyToClipboard()}>
            <Image
              source={require(copy)}
              style={{
                height: 20,
                width: 20,
                margin: 5,
                left: 5,
                top: 5,
                tintColor: 'white',
              }}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setReplyingTo(text)}>
            <Image
              source={require(reply)}
              style={{
                height: 20,
                width: 20,
                margin: 5,
                left: 5,
                top: 5,
                tintColor: 'white',
              }}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function MessageTypingAnimation({offset}) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const total = 1000;
    const bump = 200;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(bump * offset),
        Animated.timing(y, {
          toValue: 1,
          duration: bump,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: bump,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(total - bump * 2 - bump * offset),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, []);

  const translateY = y.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        marginHorizontal: 1.5,
        borderRadius: 4,
        backgroundColor: '#606060',
        transform: [{translateY}],
      }}
    />
  );
}

function MessageBubbleFriend({
  text,
  friend,
  typing = false,
  navigation,
  previousMessage,
  replyingTo,
  setReplyingTo,
}) {
  const user = useGlobal(state => state.user);
  const currentMessageDay = typing ? null : utils.formatTimeDays(text.created);
  const previousMessageDay = previousMessage
    ? utils.formatTimeDays(previousMessage.created)
    : null;
  const shouldShowDay = currentMessageDay !== previousMessageDay;
  const [showOptions, setShowOption] = useState(false);
  const [lt, lo] = typing ? [null, null] : text.text.split(' ');
  const map = Map({lt, lo});
  const copyToClipboard = async () => {
    await Clipboard.setString(text.text);
    Toast.show('Copied to Clipboard', Toast.SHORT);
  };
  const openGoogleMaps = () => {
    const url = Platform.select({
      ios: `https://maps.apple.com/?ll=${lt},${lo}`, // iOS will open Apple Maps
      android: `google.navigation:q=${lt},${lo}`, // Android will open Google Maps
    });

    Linking.openURL(url).catch(err =>
      console.error('Error opening maps: ', err),
    );
  };
  function openCameras() {
    navigation.navigate('VideoCall', {roomId: text.text, navigation, friend});
  }

  function openPlayer() {
    const type=text.type==="watch"?"PlayVideo":'PlayMusic'
    navigation.navigate(type, {
      roomId: text.text,
      navigation,
      host: user.username,
    });
  }

  return (
    <View>
      {shouldShowDay && (
        <View>
          <View style={{top: 25}} />
          <View style={{alignItems: 'center', marginVertical: 8}}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                borderRadius: 10,
                padding: 5,
                color: 'white',
                width: shouldShowDay.length,
                height: 30,
                backgroundColor: 'rgba(2, 2, 2, 0.58)',
              }}>
              {currentMessageDay}
            </Text>
          </View>
        </View>
      )}
      <View
        style={{
          flexDirection: 'row',
          padding: 10,
          paddingLeft: 16,
        }}>
        <View style={{justifyContent: 'center', flexDirection: 'row'}}>
          <View style={{top: 7}}>
            <Thumbnail url={friend.thumbnail} size={42} />
          </View>
          {typing ? (
            <View style={styles.boxF}></View>
          ) : text.type === 'image' ||
            text.type === 'audio' ||
            text.type === 'location' ? null : (
            <View style={styles.boxF}></View>
          )}
        </View>
        <View
          style={{
            backgroundColor: typing
              ? 'white'
              : text.type === 'image' ||
                text.type === 'audio' ||
                text.type === 'location'
              ? 'transparent'
              : '#545454',

            borderRadius: 25,
            maxWidth: '62%',
            paddingHorizontal: 16,
            paddingVertical: 12,
            justifyContent: 'center',
            marginLeft: 1,
            minHeight: 40,
          }}>
          {typing ? null : text.replied_to === null ? null : (
            // <View style={{ backgroundColor: "white" }}>
            // 	<Text>{text.replied_to_message.text}</Text>

            // </View>
            <View>
              {text.replied_to_message.type === 'text' ? (
                <View
                  style={{
                    backgroundColor: '#c0bebe',
                    padding: 10,
                    borderRadius: 15,
                    minWidth: 100,
                    maxWidth: 300,
                    marginTop: -9,
                    marginBottom: 5,
                    margin: -5,
                    borderLeftWidth: 5,
                    borderColor: '#0f0607',
                    marginLeft: -10,
                  }}>
                  <Text
                    style={{
                      color: 'Black',
                      fontWeight: 'bold',
                      fontSize: 14,
                    }}>
                    {text.replied_to_message.user === user.username ? (
                      <Text>You</Text>
                    ) : (
                      text.replied_to_message.user
                    )}{' '}
                  </Text>
                  <Text style={{fontSize: 14, color: 'black'}}>
                    {' '}
                    {text.replied_to_message.text}
                  </Text>
                </View>
              ) : text.replied_to_message.type === 'audio' ? (
                <View>
                  <Text>audio</Text>
                </View>
              ) : text.replied_to_message.type === 'image' ? (
                <View>
                  <View
                    style={{
                      backgroundColor: '#c0bebe',
                      padding: 1,
                      borderRadius: 15,
                      width: 130,
                      marginTop: -9,
                      marginBottom: 5,
                      margin: -5,
                      borderLeftWidth: 5,
                      borderColor: '#0f0607',
                      marginLeft: -10,
                    }}>
                    <View style={{top: 45, marginTop: -45, left: 7}}>
                      <Text
                        style={{
                          color: '#474947',
                          fontWeight: 'bold',
                          fontSize: 14,
                          top: 5,
                          left: 1,
                        }}>
                        {text.replied_to_message.user === user.username ? (
                          <Text>You</Text>
                        ) : (
                          text.replied_to_message.user
                        )}{' '}
                      </Text>
                      <View style={{flexDirection: 'row', left: 5}}>
                        <Image
                          source={require(image)}
                          style={{
                            height: 20,
                            width: 20,
                            margin: 5,
                            left: -10,
                            bottom: -1,
                            tintColor: 'black',
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            color: '#484948',
                            bottom: -5,
                            left: -15,
                          }}>
                          {' '}
                          image
                        </Text>
                      </View>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      <Image
                        source={{
                          uri:
                            `https://${ADDRESS}` + text.replied_to_message.text,
                        }}
                        style={{height: 50, width: 50, borderRadius: 10}}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {typing ? (
            <View style={{flexDirection: 'row'}}>
              <MessageTypingAnimation offset={0} />
              <MessageTypingAnimation offset={1} />
              <MessageTypingAnimation offset={2} />
            </View>
          ) : text.type === 'text' ? (
            <Pressable
              onLongPress={() => {
                setShowOption(true);
              }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  lineHeight: 18,
                  marginBottom: -3,
                }}>
                {text.text}
              </Text>
            </Pressable>
          ) : text.type === 'image' ? (
            <TouchableOpacity
              onLongPress={() => {
                setShowOption(true);
              }}
              onPress={() =>
                navigation.navigate('View', {
                  type: `https://${ADDRESS}${text.text}`,
                })
              }>
              <Image
                source={{uri: `https://${ADDRESS}${text.text}`}}
                style={{
                  height: 300,
                  width: 200,
                  borderRadius: 5,
                  right: 15,
                  bottom: 5,
                }}
              />
            </TouchableOpacity>
          ) : text.type === 'audio' ? (
            <View style={{height: 10, bottom: 10}}>
              <Pressable
                onLongPress={() => {
                  setShowOption(true);
                }}>
                <AudioPlayerT
                  audioUrl={`https://${ADDRESS}${text.text}`}
                  from={'friend'}
                />
              </Pressable>
            </View>
          ) : text.type === 'location' ? (
            <TouchableOpacity onPress={openGoogleMaps}>
              <View
                style={{
                  height: 150,
                  width: 200,
                  marginVertical: 1,
                  bottom: 7,
                  right: 15,
                }}>
                <WebView
                  originWhitelist={['*']}
                  source={{html: map}}
                  style={{width: 200, height: 70}}
                />
              </View>
            </TouchableOpacity>
          ) : text.type === 'videocall' ? (
            <View>
              <Text>Incoming Video Call</Text>
              <View style={{flexDirection: 'row'}}>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(53, 182, 64, 0.58)',
                    padding: 5,
                    borderRadius: 5,
                    marginRight: 5,
                  }}
                  onPress={() => {
                    openCameras();
                  }}>
                  <Text>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(182, 53, 53, 0.58)',
                    padding: 5,
                    borderRadius: 5,
                  }}>
                  <Text>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : text.type === 'listen'|| text.type === 'watch' ? (
            <View>
              {/* <Text>Outgoing Video Call</Text> listenTogether*/}
              <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(182, 79, 53, 0.58)',
                    padding: 10,
                    borderRadius: 5,
                    marginRight: 5,
                    width: '70%',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    openPlayer();
                  }}>
                  <Text>{text.type === 'listen'?"Listen":"Watch"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {typing ? null : (
            <Text
              style={{
                paddingTop: 3,

                // marginBottom: text.type === 'text' ? 10 : 0,

                color: '#878787',
                fontSize: 12,
                textAlign: 'left',
                left: 1,
              }}>
              {utils.formatTimeChat(text.created)}
            </Text>
          )}
        </View>

        {showOptions ? (
          <View
            style={{
              justifyContent: 'center',
              flexDirection: 'row',
              top: 40,
              right: 130,
            }}>
            {/* <Image
              source={require(del)}
              style={{
                height: 20,
                width: 20,
                margin: 5,
                left: 5,
                top: 5,
                tintColor: 'black',
              }}
            /> */}
            <TouchableOpacity onPress={() => copyToClipboard()}>
              <Image
                source={require(copy)}
                style={{
                  height: 20,
                  width: 20,
                  margin: 5,
                  left: 5,
                  top: 5,
                  tintColor: 'black',
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReplyingTo(text)}>
              <Image
                source={require(reply)}
                style={{
                  height: 20,
                  width: 20,
                  margin: 5,
                  left: 5,
                  top: 5,
                  tintColor: 'black',
                }}
              />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={{flex: 1}} />
      </View>
    </View>
  );
}

function MessageBubble({
  index,
  message,
  friend,
  navigation,
  connectionId,
  previousMessage,
  setReplyingTo,
  replyingTo,
}) {
  const [showTyping, setShowTyping] = useState(false);

  const messagesTyping = useGlobal(state => state.messagesTyping);

  useEffect(() => {
    if (index !== 0) return;
    if (messagesTyping === null) {
      setShowTyping(false);
      return;
    }
    setShowTyping(true);
    const check = setInterval(() => {
      const now = new Date();
      const ms = now - messagesTyping;
      if (ms > 10000) {
        setShowTyping(false);
      }
    }, 1000);
    return () => clearInterval(check);
  }, [messagesTyping]);

  if (index === 0) {
    if (showTyping) {
      return <MessageBubbleFriend friend={friend} typing={true} />;
    }
    return;
  }

  return message.is_me ? (
    <View>
      <MessageBubbleMe
        text={message}
        navigation={navigation}
        connectionId={connectionId}
        previousMessage={previousMessage}
        setReplyingTo={setReplyingTo}
        replyingTo={replyingTo}
        friend={friend}
      />
    </View>
  ) : (
    <MessageBubbleFriend
      text={message}
      friend={friend}
      navigation={navigation}
      connectionId={connectionId}
      previousMessage={previousMessage}
      setReplyingTo={setReplyingTo}
      replyingTo={replyingTo}
    />
  );
}
const colorE = '#606060';

const RenderSend = () => {
  return (
    <View
      style={{
        backgroundColor: colorE,
        height: 42,
        width: 42,
        borderRadius: 25,
      }}>
      <View
        style={{
          marginLeft: 1,
          alignContent: colorE,
          backgroundColor: 'white',
          height: 40,
          width: 40,
          borderRadius: 20,
          marginTop: 1,
        }}>
        <View
          style={{
            marginLeft: 1,
            alignContent: colorE,
            height: 40,
            width: 40,
            borderRadius: 20,
            marginTop: 7,
            marginLeft: -12,
          }}>
          <Image source={require(sendIcon)} style={{height: 30, width: 60}} />
        </View>
      </View>
    </View>
  );
};

const RenderAdd = () => {
  return (
    <View
      style={{
        backgroundColor: colorE,
        height: 42,
        width: 42,
        borderRadius: 25,
      }}>
      <View
        style={{
          marginLeft: 1,
          alignContent: colorE,
          backgroundColor: 'white',
          height: 40,
          width: 40,
          borderRadius: 20,
          marginTop: 1,
        }}>
        <View
          style={{
            backgroundColor: colorE,
            height: 2,
            width: 30,
            borderRadius: 5,
            marginTop: 18,
            marginLeft: 6,
          }}></View>
        <View
          style={{
            backgroundColor: colorE,
            height: 30,
            width: 2,
            borderRadius: 5,
            marginTop: -15,
            marginLeft: 20,
          }}></View>
      </View>
    </View>
  );
};

const RenderVC = () => {
  return (
    <View
      style={{
        backgroundColor: colorE,
        height: 42,
        width: 42,
        borderRadius: 25,
      }}>
      <View
        style={{
          marginLeft: 1,
          alignContent: colorE,
          backgroundColor: 'white',
          height: 40,
          width: 40,
          borderRadius: 20,
          marginTop: 1,
        }}>
        <View style={{flexDirection: 'row'}}>
          <View
            style={{
              backgroundColor: colorE,
              height: 6,
              width: 4,
              borderRadius: 5,
              marginTop: 16,
              marginLeft: 5,
            }}></View>
          <View
            style={{
              backgroundColor: colorE,
              height: 20,
              width: 4,
              borderRadius: 5,
              marginTop: 10,
              marginLeft: 1,
            }}></View>
          <View
            style={{
              backgroundColor: colorE,
              height: 30,
              width: 4,
              borderRadius: 5,
              marginTop: 5,
              marginLeft: 1,
            }}></View>

          <View
            style={{
              backgroundColor: colorE,
              height: 25,
              width: 4,
              borderRadius: 5,
              marginTop: 7,
              marginLeft: 1,
            }}></View>
          <View
            style={{
              backgroundColor: colorE,
              height: 15,
              width: 4,
              borderRadius: 5,
              marginTop: 12,
              marginLeft: 1,
            }}></View>
          <View
            style={{
              backgroundColor: colorE,
              height: 5,
              width: 4,
              borderRadius: 5,
              marginTop: 17,
              marginLeft: 1,
            }}></View>

          <View
            style={{
              backgroundColor: colorE,
              height: 5,
              width: 4,
              borderRadius: 5,
              marginTop: 17,
              marginLeft: 1,
            }}></View>
        </View>
      </View>
    </View>
  );
};

function MessageInput({
  message,
  setMessage,
  onSend,
  connectionId,
  navigation,
  user,
  friend,
}) {
  const [height, setHeight] = useState(50);
  const [showMore, setShowMore] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);

  const uploadThumbnail = useGlobal(state => state.sendImage);
  const [openEditor, setOpenEdior] = useState(false);

  const [cropped, setcropped] = useState(false);
  const messageSend = useGlobal(state => state.messageSend);
  const [isFocused, setIsFocused] = useState(false);
  const [imageLink, setImageLink] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRecorderPlayer = new AudioRecorderPlayer();

  const [recorded, setRecorded] = useState('');
  const [audioLink, setAudioLink] = useState('');
  const [openPlayer, setopenPlayer] = useState('');

  const [showWave, setShowWave] = useState(false);
  const [count, setCount] = useState(0); // State to hold the count value
  const [openMap, setopenMap] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    await audioRecorderPlayer.startRecorder();
    audioRecorderPlayer.addRecordBackListener(e => {
      console.log('Recording...', e);
    });
  };

  const stopRecording = async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    console.log('Recording stopped', result);
    setRecorded(result);
    setopenPlayer(true);
    console.log('AUDIO: ', recorded);
  };

  const uploadAudio = async () => {
    if (!recorded) {
      console.log('AUDIO: ', recorded);
      alert('Please select an audio first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', {
      uri: recorded,
      type: 'audio/mp4',
      name: 'rec.mp4',
    });

    try {
      const response = await axios.post(
        `https://${ADDRESS}/chat/audio/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      console.log('audio uploaded successfully:', response.data);
      setAudioLink(response.data.audio);
      console.log('message:::   ', audioLink);
      return response.data.audio;
    } catch (error) {
      console.error('Error uploading audio:', error);
    }
  };

  const onSendV = async () => {
    const cleaned = await uploadAudio();
    console.log('from<: ', cleaned);
    if (cleaned.length === 0) return;
    messageSend(connectionId, cleaned, 'audio');
    setAudioLink('');
  };

  const startPlaying = async () => {
    setIsPlaying(true);
    await audioRecorderPlayer.startPlayer();
    audioRecorderPlayer.addPlayBackListener(e => {
      console.log('Playing...', e.current_position);
      if (e.current_position === e.duration) {
        setIsPlaying(false);
        audioRecorderPlayer.stopPlayer();
      }
    });
  };

  const stopPlaying = async () => {
    await audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
    setIsPlaying(false);
  };

  const selectImage = async () => {
    launchImageLibrary({includeBase64: false}, async response => {
      if (response.didCancel || response.errorCode) return;

      try {
        const file = response.assets[0];

        // Compress the image
        const compressedImage = await ImageResizer.createResizedImage(
          file.uri, // image URI
          1024, // max width
          1024, // max height
          'JPEG', // compress format
          70, // quality (0-100)
          0, // rotation
          null, // output path (null for default)
          false, // keep metadata
        );

        // Create a new object with the compressed image and original metadata
        const compressedFile = {
          uri: compressedImage.uri,
          type: file.type || 'image/jpeg', // Fallback to 'image/jpeg' if type is missing
          fileName: file.fileName || `image_${Date.now()}.jpg`, // Fallback filename
        };

        setSelectedImage(compressedFile);

        navigation.navigate('viewImage', {
          image: compressedFile,
          connectionId: connectionId, // Pass connectionId directly
        });
      } catch (error) {
        console.log('Image compression failed:', error);
        // Fallback to original image if compression fails
        setSelectedImage(file);
        navigation.navigate('viewImage', {
          image: file,
          connectionId: connectionId,
        });
      }
    });
  };

  // const onSendI = async () => {
  //   // const cleaned = imageLink
  //   const cleaned = await uploadImage();
  //   console.log('from<: ', cleaned);
  //   if (cleaned.length === 0) return;
  //   messageSend(connectionId, cleaned, 'image');
  //   setImageLink('');
  // };

  // const uploadImage = async () => {
  //   if (!selectedImage) {
  //     alert('Please select an image first');
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append('image', {
  //     uri: selectedImage.uri,
  //     type: selectedImage.type,
  //     name: selectedImage.fileName,
  //   });

  //   try {
  //     const response = await axios.post(
  //       `https://${ADDRESS}/chat/upload/`,
  //       formData,
  //       {
  //         headers: {
  //           'Content-Type': 'multipart/form-data',
  //         },
  //       },
  //     );
  //     console.log('Image uploaded successfully:', response.data);
  //     setImageLink(response.data.image);
  //     console.log('message:::   ', imageLink);
  //     return response.data.image;
  //   } catch (error) {
  //     console.error('Error uploading image:', error);
  //   }
  // };

  const [selected, setSelected] = useState(-1);

  const cropImage = () => {
    if (selectedImage) {
      ImagePicker.openCropper({
        path: selectedImage.uri,
        width: 300,
        height: 400,
      })
        .then(image => {
          //utils.log("Cropped image: ", image);
          setSelectedImage(image);
          // Replace this with your upload function
        })
        .catch(error => {
          utils.error('Cropping error: ', error);
        });
    }
    // ImageEditor.Edit({
    // 	path: selectedImage.uri
    // });
  };

  const animateWaveform = () => {
    if (isRecording) {
      animationValues.forEach(anim => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 100,
            duration: 300,
            useNativeDriver: false,
            easing: Easing.linear,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
            easing: Easing.linear,
          }),
        ]).start(() => {
          if (isRecording) {
            animateWaveform(); // Continue animating while recording
          }
        });
      });
    }
  };

  const audioSet: AudioSet = {
    AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
    AudioSourceAndroid: AudioSourceAndroidType.MIC,
    AVModeIOS: AVModeIOSOption.measurement,
    AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
    AVNumberOfChannelsKeyIOS: 2,
    AVFormatIDKeyIOS: AVEncodingOption.aac,
  };

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#333' : '#fff',
  };

  const [temp, setTemp] = useState([0]);
  const tempRef = useRef({temp: [0], isPlaying: false});
  const [width] = useState(new Animated.Value(10)); // Replace shared value with Animated.Value

  const animateWidth = () => {
    Animated.timing(width, {
      toValue: width._value + 15,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: false, // Animating layout properties, so useNativeDriver must be false
    }).start();
  };

  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      console.log('TEST');
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take pictures.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Camera permission granted');
          handleLaunchCamera();
          setHasCameraPermission(true);
        } else {
          console.log('Camera permission denied');
          Alert.alert('Permission denied', 'Camera access is required.');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      setHasCameraPermission(true); // iOS handles permissions automatically
      handleLaunchCamera();
    }
  };

  const handleLaunchCamera = () => {
    if (!hasCameraPermission) {
      Alert.alert('Permission Error', 'Please grant camera permissions first.');
      return;
    }

    const options = {
      mediaType: 'photo',
      saveToPhotos: true,
      cameraType: 'back',
      quality: 1,
    };

    launchCamera(options, response => {
      if (response.didCancel) {
        console.log('User cancelled camera picker');
      } else if (response.errorCode) {
        console.error('Error with camera:', response.errorMessage);
      } else {
        console.log('Captured file path:', response.assets[0]);
        //Alert.alert('Success', `File saved at ${response.assets[0]?.uri}`);

        setSelectedImage(response.assets[0]);
        setOpenEdior(true);
      }
    });
  };

  const [lt, setLt] = useState('');
  const [lo, setLo] = useState('');
  const mapUrl = `https://www.google.com/maps?q=${lt},${lo}&z=15`;

  function onSendL() {
    console.log('IMAGE FETCHED AND STORED', mapImageUrl);
    console.log('FROM LOCAITON FUNCTION:', message);
    const cleaned = message.replace(/\s+/g, ' ').trim();
    console.log('from<: ', cleaned);
    if (cleaned.length === 0) return;
    messageSend(connectionId, cleaned, 'location');
    fetchStaticMap();
    setMessage('');
  }

  const getLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;

        // Call a function to send the location via your chat API
        //onSendLocation(latitude, longitude);
        console.log(
          'Location',
          `Latitude: ${latitude}, Longitude: ${longitude}`,
        );
        setLt(latitude);
        setLo(longitude);
        setopenMap(true);

        setMessage(`${latitude} ${longitude}`);
        //Alert.alert('Location', `Latitude: ${latitude}, Longitude: ${longitude}`);
      },
      error => {
        //Alert.alert('Error', 'Unable to fetch location');
        console.error(error);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const fetchStaticMap = async () => {
    const API_KEY = 'c9f95f399844c8543faf779bdb81d76c'; // Replace with your API key

    const zoom = 10; // Zoom level
    const width = 600; // Image width in pixels
    const height = 400; // Image height in pixels

    const url = `https://apis.mappls.com/advancedmaps/v1/${API_KEY}/still_image?center=${'25.90637689'},${'93.74083896'}`;

    try {
      const response = await axios.get(url);
      const base64 = `data:image/png;base64,${Buffer.from(
        response.data,
        'utf-8',
      ).toString('base64')}`;
      //console.log("testttttttttttttttttttttttttttttt: ", base64)

      setMapImageUrl(base64);
    } catch (error) {
      console.error('Error fetching static map:', error);
    }
  };
  const generateID = () => {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  function openCameras() {
    const id = generateID();
    messageSend(connectionId, id, 'videocall');
    navigation.navigate('videoCall', {roomId: id, friend, navigation});
  }

  const map = Map({lt, lo});
  return (
    <View
      style={{
        flexDirection: 'column',
        backgroundColor: 'rgba(27, 2, 2, 0.58)',
      }}>
      <View>
        {openMap ? (
          <View
            style={{
              height: 680,
              width: '100%',
              marginVertical: 1,
            }}>
            {/* <WebView
									source={{ uri: mapUrl }}
									style={{ flex: 1 }}
									javaScriptEnabled={true}
									domStorageEnabled={true}
								/> */}
            <WebView
              originWhitelist={['*']}
              source={{html: map}}
              style={{width: '100%', height: '100%', flex: 1}}
            />
            <Button
              title="SHARE LOCATION"
              onPress={() => {
                setopenMap(false);
                onSendL();
              }}
            />
          </View>
        ) : null}
      </View>
      <View
        style={{
          paddingHorizontal: 1,
          paddingBottom: 1,

          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 1,

          borderRadius: 70,

          left: 2,
        }}>
        {/* <Image source={{ uri: mapImageUrl }} style={{ height: 200, width: 200, }} /> */}
        {/* <TouchableOpacity
          onPressIn={() => {
            setShowWave(true);
          }}
          onLongPress={startRecording}
          onPressOut={() => {
            stopRecording();
            setShowWave(false);
          }}>
          <View style={{marginRight: 10}}>
            <RenderVC />
          </View>
        </TouchableOpacity> */}

        {
          /* {showWave ? (
          <View style={{flex: 1}}>
            <Text>Recording...</Text>
          </View>
        ) : */
          openPlayer ? (
            <View
              style={{
                flexDirection: 'row',
                flex: 1,
                borderRadius: 5,
                right: 10,
              }}>
              <TouchableOpacity
                onPress={isPlaying ? stopPlaying : startPlaying}
                style={{left: 10}}>
                {isPlaying ? (
                  <Image
                    source={require(pause)}
                    style={{height: 20, width: 20, margin: 5}}
                  />
                ) : (
                  <Image
                    source={require(pause)}
                    style={{height: 20, width: 20, margin: 5}}
                  />
                )}
              </TouchableOpacity>

              {/* <Button title="send" onPress={() => { onSendV(); setopenPlayer(false) }} /> */}
            </View>
          ) : (
            <View style={{flexDirection: 'row', flex: 1}}>
              <TextInput
                multiline={true}
                placeholder={isFocused ? '' : 'Message'}
                placeholderTextColor="'rgba(214, 211, 211, 0.58)'"
                value={message}
                onChangeText={setMessage}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onContentSizeChange={event => {
                  const newHeight = event.nativeEvent.contentSize.height;
                  const maxHeight = 5 * 22; // 5 lines * line height (22 is an example)
                  setHeight(Math.min(newHeight, maxHeight));
                }}
                style={{
                  flex: 1,
                  paddingHorizontal: 18,
                  borderWidth: 1,
                  borderRadius: 40,
                  borderColor: 'rgba(46, 46, 46, 0.58)',
                  backgroundColor: 'rgba(46, 46, 46, 0.58)',
                  minHeight: 50,
                  textAlign: 'left',
                  fontSize: 15,
                  height: Math.max(50, height),
                  color: 'white',
                  left: 10,
                }}
              />
              {isFocused ? null : (
                <TouchableOpacity
                  onPress={() => {
                    selectImage();
                  }}
                  style={{position: 'absolute', right: 70, top: 10}}>
                  <Image
                    source={require(image)}
                    style={{
                      height: 25,
                      width: 25,
                      margin: 5,
                      tintColor: 'white',
                    }}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={
                  openPlayer
                    ? () => {
                        onSendV();
                        setopenPlayer(false);
                      }
                    : () => {
                        onSend();
                      }
                }>
                <View
                  style={{
                    marginLeft: 25,
                    backgroundColor: '#24d824',
                    flex: 1,
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    alignItems: 'center',
                    justifyContent: 'center',
                    right: 10,
                  }}>
                  <Image
                    source={require(sendMessageIcon)}
                    style={{
                      height: 30,
                      width: 30,
                      margin: 5,
                      tintColor: 'black',
                      alignItems: 'center',
                      justifyContent: 'center',
                      left: 3,
                    }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )
        }

        {/* 
        <TouchableOpacity onPress={() => setShowMore(!showMore)}>
          <View style={{marginLeft: 10}}>
            <RenderAdd />
          </View>
        </TouchableOpacity> */}
      </View>

      <View style={{backgroundColor: '#f4f4f6', borderTopWidth: 0.2}}>
        {showMore ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-evenly',
              marginTop: 10,
              marginBottom: 200,
            }}>
            <TouchableOpacity
              onPress={() => {
                selectImage();
              }}>
              <Image
                source={require(gallery)}
                style={{height: 80, width: 80, margin: 5}}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                requestCameraPermission();
              }}>
              <Image
                source={require(camera)}
                style={{height: 80, width: 80, margin: 5}}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                getLocation();
              }}>
              <Image
                source={require(location)}
                style={{height: 80, width: 80, margin: 5}}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                openCameras();
              }}>
              <Image
                source={require(videocall)}
                style={{height: 80, width: 80, margin: 5}}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {/* 
      {viewerVisible && (
        <ImageViewerComponent
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
          selectedImage={selectedImage}
          loading={loading}
          //onUpload={handleImageUpload}
          closeIcon={require(close)}
          uploadIcon={require(uploadNew)}
        />
      )} */}

      {/* <Modal
        animationType="slide"
        transparent={false}
        visible={openEditor}
        onRequestClose={() => setOpenEdior(false)}
        style={{backgroundColor: 'black'}}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <View style={{marginTop: -40}}>
            {selectedImage && (
              <Image
                source={{uri: cropped ? selectedImage.path : selectedImage.uri}}
                style={{width: 345, height: 650}}
              />
            )}
          </View>

          <View>
            <View
              style={{
                top: 25,
                backgroundColor: 'black',
                height: 70,
                width: 340,
                borderRadius: 50,
                flexDirection: 'row',
                justifyContent: 'space-evenly',
              }}>
              <View style={{flexDirection: 'row', left: 10}}>
                <TouchableOpacity
                  onPress={() => {
                    setSelected(0);
                    cropImage();
                    setcropped(true);
                  }}>
                  <View
                    style={{
                      top: -1,
                      backgroundColor: '#2D2C33',
                      height: 60,
                      width: 60,
                      alignItems: 'center',
                      right: 20,
                      bottom: 17,
                      borderRadius: 35,
                      marginLeft: 10,
                      borderWidth: selected === 0 ? 2 : 0,
                      borderColor: selected === 0 ? 'white' : null,
                    }}>
                    <View style={{left: 1, top: 10}}>
                      <Text style={{fontSize: 30, color: 'white'}}>X</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelected(1);
                    uploadImage();
                  }}>
                  <View
                    style={{
                      top: -1,
                      backgroundColor: '#2D2C33',
                      height: 60,
                      width: 60,
                      alignItems: 'center',
                      right: 20,
                      bottom: 17,
                      borderRadius: 35,
                      marginLeft: 10,
                      borderWidth: selected === 1 ? 2 : 0,
                      borderColor: selected === 1 ? 'white' : null,
                    }}>
                    <View style={{left: 1, top: 10}}>
                      <Text style={{fontSize: 30, color: 'white'}}>X</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSelected(2)}>
                  <View
                    style={{
                      top: -1,
                      backgroundColor: '#2D2C33',
                      height: 60,
                      width: 60,
                      alignItems: 'center',
                      right: 20,
                      bottom: 17,
                      borderRadius: 35,
                      marginLeft: 10,
                      borderWidth: selected === 2 ? 2 : 0,
                      borderColor: selected === 2 ? 'white' : null,
                    }}>
                    <View style={{left: 1, top: 10}}>
                      <Text style={{fontSize: 30, color: 'white'}}>X</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSelected(3)}>
                  <View
                    style={{
                      top: -1,
                      backgroundColor: '#2D2C33',
                      height: 60,
                      width: 60,
                      alignItems: 'center',
                      right: 20,
                      bottom: 17,
                      borderRadius: 35,
                      marginLeft: 10,
                      borderWidth: selected === 3 ? 2 : 0,
                      borderColor: selected === 3 ? 'white' : null,
                    }}>
                    <View style={{left: 1, top: 10}}>
                      <Text style={{fontSize: 30, color: 'white'}}>X</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSelected(4)}>
                  <View
                    style={{
                      top: -1,
                      backgroundColor: '#2D2C33',
                      height: 60,
                      width: 60,
                      alignItems: 'center',
                      right: 20,
                      bottom: 17,
                      borderRadius: 35,
                      marginLeft: 10,
                      borderWidth: selected === 4 ? 2 : 0,
                      borderColor: selected === 4 ? 'white' : null,
                    }}>
                    <View style={{left: 1, top: 10}}>
                      <Text style={{fontSize: 30, color: 'white'}}>X</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={{flexDirection: 'row', top: -4}}>
          <View style={{left: 35}}>
            <TouchableOpacity onPress={() => setOpenEdior(false)}>
              <View
                style={{
                  top: -1,
                  backgroundColor: '#2D2C33',
                  height: 40,
                  width: 40,
                  alignItems: 'center',
                  right: 20,
                  bottom: 17,
                  borderRadius: 35,
                }}>
                <View style={{left: 1, top: 10}}>
                  <Text style={{fontSize: 10, color: 'white'}}>X</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{left: 270}}>
            <TouchableOpacity
              onPress={() => {
                utils.log('Sendingfile: ');
                setOpenEdior(false);
                onSendI();
              }}>
              <View
                style={{
                  top: -1,
                  backgroundColor: '#2D2C33',
                  height: 40,
                  width: 40,
                  alignItems: 'center',
                  right: 20,
                  bottom: 17,
                  borderRadius: 35,
                }}>
                <View style={{left: 1, top: 10}}>
                  <Text style={{fontSize: 10, color: 'white'}}>S</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> */}
    </View>
  );
}

function MessagesScreen({navigation, route}) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [message, setMessage] = useState('');
  const flashListRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // Global state management
  const messagesList = useGlobal(state => state.messagesList);
  const messagesNext = useGlobal(state => state.messagesNext);
  const messageList = useGlobal(state => state.messageList);
  const messageSend = useGlobal(state => state.messageSend);
  const messageType = useGlobal(state => state.messageType);
  const user = useGlobal(state => state.user);

  // Route params
  const connectionId = route.params.id;
  const friend = route.params.friend;

  // Header configuration
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <MessageHeader
          friend={friend}
          navigation={navigation}
          connectionId={connectionId}
          user={user}
        />
      ),
    });
  }, [friend, navigation]); // Add dependencies here

  // Initial message load
  useEffect(() => {
    messageList(connectionId);
  }, [connectionId, messageList]);

  // Message handling
  const handleSend = useCallback(() => {
    const cleaned = message.replace(/\s+/g, ' ').trim();
    if (!cleaned.length) return;
    messageSend(connectionId, cleaned, 'text', replyingTo?.id);
    setMessage('');
    setReplyingTo(null);
  }, [message, connectionId, replyingTo, messageSend]);

  const handleType = useCallback(
    value => {
      setMessage(value);
      messageType(friend.username);
    },
    [friend.username, messageType],
  );

  // Scroll handling
  const handleScroll = useCallback(event => {
    const offset = event.nativeEvent.contentOffset.y;
    setShowScrollToBottom(offset > 20);
  }, []);

  const scrollToBottom = useCallback(() => {
    flashListRef.current?.scrollToOffset({offset: 0, animated: true});
    setShowScrollToBottom(false);
  }, []);

  // List rendering optimizations
  const renderItem = useCallback(
    ({item, index}) => (
      <MessageBubble
        index={index}
        message={item}
        friend={friend}
        navigation={navigation}
        connectionId={connectionId}
        previousMessage={messagesList[index + 0]}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        user={user}
      />
    ),
    [messagesList, replyingTo, friend, connectionId, user, navigation],
  );

  const keyExtractor = useCallback(item => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.listContainer}>
        <FlashList
          ref={flashListRef}
          data={[{id: 'header-placeholder'}, ...messagesList]}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          estimatedItemSize={85}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReachedThreshold={0.5}
          onEndReached={() =>
            messagesNext && messageList(connectionId, messagesNext)
          }
          ListFooterComponent={
            messagesNext && <ActivityIndicator size="small" color="#ebebeb" />
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
            <Image source={require(down)} style={styles.scrollButtonImage} />
          </TouchableOpacity>
        )}
      </View>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView>
          <MessageInput
            message={message}
            setMessage={handleType}
            onSend={handleSend}
          />
        </InputAccessoryView>
      ) : (
        <MessageInput
          message={message}
          setMessage={handleType}
          onSend={handleSend}
          navigation={navigation}
          connectionId={connectionId}
        />
      )}
    </SafeAreaView>
  );
}

const ReplyingToPreview = React.memo(({replyingTo, friend, setReplyingTo}) => (
  <View style={styles.replyPreview}>
    <View style={styles.replyContent}>
      <Text style={styles.replyAuthor}>
        {replyingTo.is_me ? 'You' : friend.username}
      </Text>
      {replyingTo.type === 'text' ? (
        <Text style={styles.replyText}>{replyingTo.text}</Text>
      ) : (
        <View style={styles.imagePreview}>
          <Image
            source={{uri: `https://${ADDRESS}${replyingTo.text}`}}
            style={styles.previewImage}
          />
        </View>
      )}
    </View>
    <TouchableOpacity
      onPress={() => setReplyingTo(null)}
      style={styles.closeButton}>
      <Image source={require(close)} style={styles.closeIcon} />
    </TouchableOpacity>
  </View>
));
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  box: {
    width: 15,
    height: 15,
    right: 12,
    top: 15,
    backgroundColor: '#35191b',
    transform: [{rotate: '45deg'}], // Rotate by 45 degrees
    borderBottomLeftRadius: 20,
  },
  boxF: {
    width: 15,
    height: 15,
    left: 12,
    top: 15,
    backgroundColor: '#545454',
    transform: [{rotate: '45deg'}], // Rotate by 45 degrees
  },
  sectionContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  sectionContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  scrollButton: {
    position: 'absolute',
    bottom: 10,
    right: 20,
    backgroundColor: '#2D2C33',
    width: 40,
    borderRadius: 20,
    height: 40,
    elevation: 3, // Shadow for Android
  },
  scrollButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  triggerIcon: {
    height: 40,
    width: 40,
    tintColor: 'black',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  icon: {
    height: 20,
    width: 20,
    marginRight: 10,
    tintColor: 'black',
  },
  text: {
    fontSize: 16,
    color: 'black',
  },
  map: {
    height: 400,
    width: 300,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(27, 2, 2, 0.58)',
  },
  listContainer: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 60 : 0,
  },
  listContent: {
    paddingTop: 30,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    padding: 10,
  },
  scrollButtonImage: {
    height: 20,
    width: 20,
    tintColor: 'white',
  },
  replyPreview: {
    backgroundColor: '#f5f5f7',
    padding: 10,
    borderLeftWidth: 7,
    borderColor: '#24d824',
    borderRadius: 8,
    margin: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  replyText: {
    fontSize: 13,
    color: '#666',
  },
  imagePreview: {
    marginTop: 5,
    alignItems: 'flex-end',
  },
  previewImage: {
    height: 50,
    width: 50,
    borderRadius: 8,
  },
  closeButton: {
    marginLeft: 10,
    alignSelf: 'center',
  },
  closeIcon: {
    height: 22,
    width: 22,
    tintColor: '#444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
});
export default MessagesScreen;
