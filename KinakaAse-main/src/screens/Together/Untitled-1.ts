// App.js (Main Component)
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, AppState } from 'react-native';
import Sound from 'react-native-sound';
import useAudio from './useAudio';
import InCallManager from 'react-native-incall-manager';

const MusicSyncScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [track, setTrack] = useState({
    title: 'Sample Track',
    artist: 'Sample Artist',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Test URL
  });
  const soundRef = useRef(null);
  const progressRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const {
    localStream,
    remoteStream,
    endCall,
    setMuteUnmute,
    muteUnmute,
    callState,
    error,
    sendControlMessage
  } = useAudio({ roomId });

  // Load audio from URL
  const loadAudio = () => {
    if (!track?.url) return;

    soundRef.current = new Sound(track.url, null, (error) => {
      if (error) {
        console.log('Failed to load sound', error);
        return;
      }
      setDuration(soundRef.current.getDuration());
    });
  };

  // Handle remote audio stream
  useEffect(() => {
    if (remoteStream) {
      InCallManager.start({ media: 'audio' });
      InCallManager.setRoute('speaker');
      InCallManager.setForceSpeakerphoneOn(true);
      
      // Add remote stream to audio manager
      const audioTrack = remoteStream.getAudioTracks()[0];
      if (audioTrack) {
        InCallManager.addStream(remoteStream);
      }
    }
  }, [remoteStream]);

  // Music control handlers
  const handlePlayPause = () => {
    if (!soundRef.current) return;
    
    if (isPlaying) {
      soundRef.current.pause();
      sendControlMessage({ type: 'PAUSE', time: currentTime });
    } else {
      soundRef.current.play();
      sendControlMessage({ type: 'PLAY', time: currentTime });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time) => {
    if (soundRef.current) {
      soundRef.current.setCurrentTime(time);
      sendControlMessage({ type: 'SEEK', time });
      setCurrentTime(time);
    }
  };

  // Handle incoming control messages
  useEffect(() => {
    if (remoteStream?.dataChannel) {
      remoteStream.dataChannel.onmessage = (e) => {
        const message = JSON.parse(e.data);
        switch (message.type) {
          case 'PLAY':
            soundRef.current?.play();
            soundRef.current?.setCurrentTime(message.time);
            setIsPlaying(true);
            break;
          case 'PAUSE':
            soundRef.current?.pause();
            setIsPlaying(false);
            break;
          case 'SEEK':
            soundRef.current?.setCurrentTime(message.time);
            setCurrentTime(message.time);
            break;
        }
      };
    }
  }, [remoteStream]);

  // Update progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (soundRef.current && isPlaying) {
        soundRef.current.getCurrentTime((secs) => {
          setCurrentTime(secs);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Load audio on mount and track change
  useEffect(() => {
    loadAudio();
    return () => soundRef.current?.release();
  }, [track]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        sendControlMessage({ type: 'PAUSE', time: currentTime });
      }
    });
    return () => subscription.remove();
  }, []);

  // Audio session management
  // useEffect(() => {
  //   InCallManager.start({ 
  //     media: 'audio',
  //     auto: true,
  //     ringback: '_BUNDLE_'
  //   });
  //   InCallManager.setForceSpeakerphoneOn(true);
  //   InCallManager.setSpeakerphoneOn(true);
  //   InCallManager.setSpeakerphoneVolume(1.0);
  //   InCallManager.setMicrophoneMute(false);

  //   return () => {
  //     InCallManager.stop();
  //     endCall();
  //   };
  // }, []);
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/album.jpg')} 
        style={styles.albumArt} 
      />

      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{track.title}</Text>
        <Text style={styles.trackArtist}>{track.artist}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View 
          style={[styles.progressBar, { width: `${(currentTime/duration)*100}%` }]} 
          ref={progressRef}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton}>
          <Image source={require('../../assets/previous.png')} style={styles.controlIcon} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.playButton} 
          onPress={handlePlayPause}
        >
          <Image 
            source={isPlaying ? require('../../assets/pause.png') : require('../../assets/play.png')} 
            style={styles.playIcon} 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Image source={require('../../assets/next.png')} style={styles.controlIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.callControls}>
        <TouchableOpacity 
          style={[styles.button, muteUnmute && styles.mutedButton]}
          onPress={() => setMuteUnmute(!muteUnmute)}
        >
          <Image 
            source={require('../../assets/speaker.png')} 
            style={[styles.icon, muteUnmute && styles.mutedIcon]} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.endButton]}
          onPress={() => {
            endCall();
            InCallManager.stop();
            navigation.goBack();
          }}
        >
          <Image source={require('../../assets/phone.png')} style={styles.endIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  trackArtist: {
    color: '#888',
    fontSize: 18,
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  controlButton: {
    padding: 20,
  },
  controlIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
  },
  playButton: {
    backgroundColor: '#1DB954',
    borderRadius: 50,
    padding: 24,
    marginHorizontal: 30,
  },
  playIcon: {
    width: 40,
    height: 40,
    tintColor: '#fff',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 30,
    backgroundColor: '#333',
    marginHorizontal: 10,
  },
  mutedButton: {
    backgroundColor: '#555',
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  mutedIcon: {
    tintColor: '#888',
  },
  endButton: {
    backgroundColor: '#ff3b30',
  },
  endIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
});

export default MusicSyncScreen;