import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, PanResponder, Dimensions, BackHandler, Platform, AppState } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import useVideo from './useVideo';
import InCallManager from 'react-native-incall-manager';

const camera = "../assets/camera.png";
const mute = "../assets/mute.png";
const phone = "../assets/phone.png";
const speaker = "../assets/speaker.png";
const switchCameraIcon = "../assets/switch.png";

const { height, width } = Dimensions.get('window');

const VideoCallScreen = ({ route, navigation }) => {
  const { roomId, friend } = route.params;
  const [speakers, setSpeakers] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: width - 150, y: 50 });
  const [thumbnailPosition, setThumbnailPosition] = useState({ x: width - 120, y: 20 });
  const [isRemoteMain, setIsRemoteMain] = useState(true); // Tracks which stream is in the main view
  const appState = useRef(AppState.currentState);

  const {
    localStream,
    remoteStream,
    endCall,
    setMuteUnmute,
    muteUnmute,
    isCameraOn,
    setIsCameraOn,
    switchCamera,
    callState,
    error
  } = useVideo({ roomId });

  const thumbnailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        setThumbnailPosition({
          x: gesture.moveX - 50,
          y: gesture.moveY - 75
        });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx === 0 && gesture.dy === 0) {
          // Toggle streams on tap (without drag)
          setIsRemoteMain(!isRemoteMain);
        }
      },
    })
  ).current;

  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      setIsPiPMode(false);
    }
    appState.current = nextAppState;
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isPiPMode) {
        setIsPiPMode(true);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isPiPMode]);

  const handleEndCall = useCallback(() => {
    endCall();
    navigation.goBack();
  }, [endCall, navigation]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleEndCall}>
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isPiPMode) {
    return (
      <TouchableOpacity
        style={[styles.pipContainer, { left: pipPosition.x, top: pipPosition.y }]}
        {...pipPanResponder.panHandlers}
        onPress={() => setIsPiPMode(false)}
      >
        {remoteStream ? (
          <RTCView
            mirror={true}
            streamURL={remoteStream.toURL()}
            style={styles.pipStream}
          />
        ) : (
          <View style={styles.pipPlaceholder}>
            <Text style={styles.pipText}>{friend.username}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.pipCloseButton} onPress={handleEndCall}>
          <Image source={require(phone)} style={styles.pipCloseIcon} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.switchCamera}
        onPress={switchCamera}
      >
        <Image 
          source={require(switchCameraIcon)} 
          style={styles.switchIcon} 
        />
      </TouchableOpacity>

      {/* Main Stream */}
      
        {isRemoteMain ? (
          remoteStream ? (
            <RTCView
              mirror={true}
              streamURL={remoteStream.toURL()}
              style={styles.fullStream}
            />
          ) : (
            <View style={styles.remotePlaceholder}>
              <Text style={styles.placeholderText}>Connecting...</Text>
            </View>
          )
        ) : (
          localStream ? (
            <RTCView
              mirror={true}
              streamURL={localStream.toURL()}
              style={styles.fullStream}
            />
          ) : (
            <View style={styles.remotePlaceholder}>
              <Text style={styles.placeholderText}>Connecting...</Text>
            </View>
          )
        )}
     

      {/* Thumbnail Stream */}
      
      <View
        style={[styles.thumbnailContainer, {
          left: thumbnailPosition.x,
          top: thumbnailPosition.y
        }]}
        {...thumbnailPanResponder.panHandlers}
      >
        <TouchableOpacity
        style={styles.mainStream}
        onPress={() => setIsRemoteMain(!isRemoteMain)}
        activeOpacity={0.9}
      >
        {isRemoteMain ? (
          localStream && (
            <>
              <RTCView
                mirror={true}
                streamURL={localStream.toURL()}
                style={styles.fullStream}
              />
              {!isCameraOn && (
                <View style={styles.cameraOffOverlay}>
                  <Image source={require(camera)} style={styles.cameraOffIcon} />
                </View>
              )}
            </>
          )
        ) : (
          remoteStream && (
            <RTCView
              mirror={true}
              streamURL={remoteStream.toURL()}
              style={styles.fullStream}
            />
          )
        )}
          </TouchableOpacity>
      </View>
    

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isCameraOn && styles.activeButton]}
          onPress={() => setIsCameraOn(!isCameraOn)}
        >
          <Image 
            source={require(camera)} 
            style={[styles.icon, !isCameraOn && styles.disabledIcon]} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, muteUnmute && styles.activeButton]}
          onPress={() => setMuteUnmute(!muteUnmute)}
        >
          <Image 
            source={require(mute)} 
            style={[styles.icon, muteUnmute && styles.disabledIcon]} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, speakers && styles.activeButton]}
          onPress={() => {
            setSpeakers(!speakers);
            InCallManager.setSpeakerphoneOn(!speakers);
          }}
        >
          <Image 
            source={require(speaker)} 
            style={[styles.icon, speakers && styles.disabledIcon]} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Image source={require(phone)} style={styles.endCallIcon} />
        </TouchableOpacity>
      </View>

      {/* Call Status */}
      <View style={styles.callStatus}>
        <Text style={styles.statusText}>
          {callState === 'connected' 
            ? `Connected to ${friend.username}`
            : callState === 'connecting'
            ? 'Connecting...'
            : "Calling " + friend.username}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainStream: {
    flex: 1,
    zIndex: 1,
  },
  fullStream: {
    flex: 1,
    backgroundColor: '#000',
  },
  remotePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  thumbnailContainer: {
    position: 'absolute',
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
    elevation: 10,
  },
  cameraOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraOffIcon: {
    width: 30,
    height: 30,
    tintColor: 'white',
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 2,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  endCallButton: {
    backgroundColor: '#ff3b30',
  },
  endCallIcon: {
    width: 28,
    height: 28,
    tintColor: 'white',
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: 'white',
  },
  disabledIcon: {
    tintColor: 'rgba(255,255,255,0.5)',
  },
  switchCamera: {
    position: 'absolute',
    top: 30,
    left: 20,
    zIndex: 11,
    padding: 10,
    backgroundColor: 'grey',
    borderRadius: 40,
  },
  switchIcon: {
    width: 32,
    height: 32,
    tintColor: 'white',
  },
  pipContainer: {
    position: 'absolute',
    width: 150,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    zIndex: 999,
  },
  pipStream: {
    flex: 1,
  },
  pipPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  pipText: {
    color: 'white',
    fontSize: 14,
  },
  pipCloseButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
  },
  pipCloseIcon: {
    width: 20,
    height: 20,
    tintColor: 'white',
  },
  callStatus: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  errorButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
  },
});

export default VideoCallScreen;