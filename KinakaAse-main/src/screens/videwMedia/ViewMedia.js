import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Text,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Video from 'react-native-video'; // Added for video playback
import Toast from 'react-native-simple-toast';
import axios from 'axios';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { WebView } from 'react-native-webview';
import { ADDRESS } from '../../core/api';
import utils from '../../core/utils';
import useGlobal from '../../core/global';
import secure from '../../core/secure';

const API_BASE_URL = ADDRESS;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const endpointMap = {
  image: 'upload',
  video: 'video',
  document: 'document',
  audio: 'audio',
};

const ViewMedia = ({ route, navigation }) => {
  const { media, connectionId, mediaType, incognito, disappearing } = route.params;
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT / 2 });
  const [mediaUri, setMediaUri] = useState(media.uri);
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastOffset = useRef({ x: 0, y: 0 });
  const messageSend = useGlobal(state => state.messageSend);

  useEffect(() => {
    const checkFile = async () => {
      let uri = media.uri;
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        const destPath = `${RNFS.TemporaryDirectoryPath}${media.fileName || `temp.${mediaType === 'document' ? 'pdf' : 'jpg'}`}`;
        await RNFS.copyFile(uri, destPath);
        uri = `file://${destPath}`;
      } else if (!uri.startsWith('file://')) {
        uri = `file://${uri}`;
      }
      const exists = await RNFS.exists(uri);
      if (!exists) {
        Toast.show(`${mediaType} file not found`, Toast.SHORT);
        setContentLoading(false);
        return;
      }
      setMediaUri(uri);
    };
    checkFile();
  }, [media.uri, media.fileName, mediaType]);

  const onImageLoad = useCallback((event) => {
    if (mediaType === 'image') {
      const { width, height } = event.nativeEvent.source;
      setImageDimensions({ width, height });
      setContentLoading(false);
    }
  }, [mediaType]);

  const onContentError = useCallback((error) => {
    Toast.show(`Failed to load ${mediaType}`, Toast.SHORT);
    setContentLoading(false);
  }, [mediaType]);

  const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale } }], { useNativeDriver: true });
  const onPinchStateChange = useCallback((event) => {
    if (mediaType !== 'image') return;
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current = event.nativeEvent.scale * lastScale.current;
      scale.setValue(1);
      const maxScale = 3;
      if (lastScale.current > maxScale) lastScale.current = maxScale;
      if (lastScale.current < 1) {
        lastScale.current = 1;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start(() => {
          translateX.setValue(0);
          translateY.setValue(0);
          lastOffset.current = { x: 0, y: 0 };
        });
      }
    }
  }, [mediaType, scale, translateX, translateY]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => mediaType === 'image' && lastScale.current > 1,
    onPanResponderMove: (_, gestureState) => {
      if (mediaType === 'image' && lastScale.current > 1) {
        translateX.setValue(lastOffset.current.x + gestureState.dx);
        translateY.setValue(lastOffset.current.y + gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (mediaType !== 'image') return;
      lastOffset.current = {
        x: lastOffset.current.x + gestureState.dx,
        y: lastOffset.current.y + gestureState.dy,
      };
      const scaledWidth = imageDimensions.width * lastScale.current;
      const scaledHeight = imageDimensions.height * lastScale.current;
      const maxX = (scaledWidth - SCREEN_WIDTH) / 2;
      const maxY = (scaledHeight - SCREEN_HEIGHT) / 2;
      if (Math.abs(lastOffset.current.x) > maxX) {
        lastOffset.current.x = lastOffset.current.x > 0 ? maxX : -maxX;
        Animated.spring(translateX, { toValue: lastOffset.current.x, useNativeDriver: true }).start();
      }
      if (Math.abs(lastOffset.current.y) > maxY) {
        lastOffset.current.y = lastOffset.current.y > 0 ? maxY : -maxY;
        Animated.spring(translateY, { toValue: lastOffset.current.y, useNativeDriver: true }).start();
      }
    },
  })).current;

  const handleSend = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show('No internet connection. Media queued.', Toast.LONG);
      return;
    }
    setLoading(true);
    try {
      const token = (await secure.get('tokens'))?.access;
      const endpoint = endpointMap[mediaType] || mediaType;
      const url = `https://${API_BASE_URL}/chat/${endpoint}/`;
      const formData = new FormData();
      const mimeType = media.type || (mediaType === 'image' ? 'image/jpeg' : mediaType === 'video' ? 'video/mp4' : 'application/octet-stream');
      const fileName = media.fileName || `${mediaType}_${Date.now()}.${mimeType.split('/')[1]}`;
      formData.append(mediaType, { uri: mediaUri, type: mimeType, name: fileName });
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      const mediaUrl = response.data[mediaType];
      messageSend(connectionId, mediaUrl, mediaType, null, false, incognito, disappearing);
      Toast.show(`${mediaType} sent`, Toast.SHORT);
      navigation.goBack();
    } catch (error) {
      Toast.show(`Failed to send ${mediaType}`, Toast.SHORT);
    } finally {
      setLoading(false);
    }
  }, [mediaUri, media.type, mediaType, connectionId, messageSend, navigation, incognito, disappearing]);

  const getImageStyle = () => {
    if (mediaType !== 'image') return { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 60 };
    const aspectRatio = imageDimensions.width / imageDimensions.height || 1;
    const screenAspectRatio = SCREEN_WIDTH / (SCREEN_HEIGHT - 60);
    return aspectRatio > screenAspectRatio ? { width: SCREEN_WIDTH, height: SCREEN_WIDTH / aspectRatio } : { width: (SCREEN_HEIGHT - 60) * aspectRatio, height: SCREEN_HEIGHT - 60 };
  };

  const renderContent = () => {
    switch (mediaType) {
      case 'image':
        return (
          <>
            <Image source={{ uri: mediaUri }} style={[styles.image, getImageStyle()]} resizeMode="contain" onLoad={onImageLoad} onError={onContentError} />
            {contentLoading && <ActivityIndicator size="large" color="#fff" style={styles.loadingOverlay} />}
          </>
        );
      case 'video':
        return (
          <>
            <Video source={{ uri: mediaUri }} style={styles.video} controls resizeMode="contain" onLoad={() => setContentLoading(false)} onError={onContentError} />
            {contentLoading && <ActivityIndicator size="large" color="#fff" style={styles.loadingOverlay} />}
          </>
        );
      case 'document':
        return (
          <>
            <WebView source={{ uri: mediaUri }} style={styles.documentViewer} onLoad={() => setContentLoading(false)} onError={onContentError} />
            {contentLoading && <ActivityIndicator size="large" color="#fff" style={styles.loadingOverlay} />}
          </>
        );
      default:
        return <Text style={styles.unsupportedText}>Unsupported media type</Text>;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>Cancel</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Preview</Text>
        <TouchableOpacity onPress={handleSend} disabled={loading} style={styles.sendButton}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
      <View style={styles.contentContainer}>
        {mediaType === 'image' ? (
          <PinchGestureHandler onGestureEvent={onPinchGestureEvent} onHandlerStateChange={onPinchStateChange}>
            <Animated.View style={[styles.imageContainer, { transform: [{ scale: Animated.multiply(scale, lastScale.current) }, { translateX }, { translateY }] }]} {...panResponder.panHandlers}>
              {renderContent()}
            </Animated.View>
          </PinchGestureHandler>
        ) : (
          renderContent()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#075E54' },
  backButton: { padding: 10 },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  sendButton: { padding: 10 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: undefined },
  video: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 60 },
  documentViewer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 60 },
  unsupportedText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  loadingOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
});

export default ViewMedia;