import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Sound from 'react-native-sound';
import LinearGradient from 'react-native-linear-gradient';
import PropTypes from 'prop-types';

// Enable playback in silence mode (iOS) and set category
Sound.setCategory('Playback');

const AudioPlayerT = ({ audioUrl, from }) => {
  // State Management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [soundInstance, setSoundInstance] = useState(null);
  const [boxColor, setBoxColor] = useState(from === 'me' ? '#84D55A' : 'white');
  const [chatColor] = useState(from === 'me' ? '#84D55A' : '#f8f8f8');

  // Animation Refs
  const progressAnim = useRef(new Animated.Value(0)).current; // Progress bar animation
  const rippleAnims = useRef(
    Array(3).fill(0).map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current; // 3 ripples for wave effect

  // Initialize Audio
  useEffect(() => {
    const sound = new Sound(audioUrl, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('Error loading audio:', error);
        return;
      }
      setDuration(sound.getDuration());
      setSoundInstance(sound);
    });

    return () => {
      if (sound) {
        sound.release();
      }
    };
  }, [audioUrl]);

  // Update current time during playback
  useEffect(() => {
    if (!soundInstance || !isPlaying) return;

    const interval = setInterval(() => {
      soundInstance.getCurrentTime((seconds) => {
        setCurrentTime(seconds);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [soundInstance, isPlaying]);

  // Ripple Animation Logic
  const startRippleAnimation = useCallback(() => {
    const animateRipple = (ripple, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ripple.scale, {
              toValue: 1,
              duration: 1000,
              delay: index * 200, // Stagger each ripple
              useNativeDriver: true,
            }),
            Animated.timing(ripple.opacity, {
              toValue: 0,
              duration: 1000,
              delay: index * 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ripple.scale, {
            toValue: 0,
            duration: 0, // Instant reset
            useNativeDriver: true,
          }),
          Animated.timing(ripple.opacity, {
            toValue: 1,
            duration: 0, // Instant reset
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    rippleAnims.forEach(animateRipple);
  }, [rippleAnims]);

  const stopRippleAnimation = useCallback(() => {
    rippleAnims.forEach((ripple) => {
      ripple.scale.stopAnimation();
      ripple.opacity.stopAnimation();
      Animated.parallel([
        Animated.timing(ripple.scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(ripple.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [rippleAnims]);

  // Play/Pause Audio with Animation
  const playPauseAudio = useCallback(() => {
    if (!soundInstance) return;

    if (isPlaying) {
      soundInstance.pause();
      setBoxColor(from === 'me' ? '#84D55A' : 'white');
      stopRippleAnimation();
    } else {
      soundInstance.play((success) => {
        if (success) {
          console.log('Audio finished playing');
          setBoxColor(from === 'me' ? '#84D55A' : 'white');
          setIsPlaying(false);
          progressAnim.setValue(0);
          stopRippleAnimation();
        } else {
          console.error('Playback failed');
        }
      });
      setBoxColor(from === 'me' ? '#69b343' : '#f8f8f8');

      // Progress Animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: false,
      }).start();

      // Start Ripple Animation
      startRippleAnimation();
    }
    setIsPlaying(!isPlaying);
  }, [
    soundInstance,
    isPlaying,
    duration,
    from,
    progressAnim,
    startRippleAnimation,
    stopRippleAnimation,
  ]);

  // Format Time Helper
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Animated Styles
  const progressStyle = {
    width: progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [from === 'me' ? '100%' : '0%', from === 'me' ? '0%' : '100%'],
    }),
  };

  const rippleStyles = rippleAnims.map((ripple) => ({
    transform: [
      {
        scale: ripple.scale.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 2], // Ripple grows from small to large
        }),
      },
    ],
    opacity: ripple.opacity,
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={playPauseAudio}>
        {/* Indicator Box */}
        <View
          style={[
            styles.box,
            {
              backgroundColor: boxColor,
              right: from === 'me' ? -102 : 8,
            },
          ]}
        />

        {/* Audio Player Button */}
        <View
          style={[
            styles.button,
            { backgroundColor: from === 'me' ? '#69b343' : 'white' },
          ]}
        >
          <Animated.View style={[styles.animatedView, progressStyle]}>
            <LinearGradient
              colors={[chatColor, chatColor]}
              start={{ x: from === 'me' ? 1 : 0, y: 0 }}
              end={{ x: from === 'me' ? 0 : 1, y: 0 }}
              style={styles.gradient}
            />
          </Animated.View>
          <Text
            style={[
              styles.time,
              { left: from === 'me' ? 25 : 47 },
            ]}
          >
            {formatTime(isPlaying ? currentTime : duration)}
          </Text>

          {/* Ripple Animation */}
          <View style={styles.rippleContainer}>
            {rippleAnims.map((_, index) => (
              <Animated.View
                key={index}
                style={[styles.ripple, rippleStyles[index]]}
              />
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// PropTypes for type safety
AudioPlayerT.propTypes = {
  audioUrl: PropTypes.string.isRequired,
  from: PropTypes.oneOf(['me', 'other']).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  box: {
    width: 15,
    height: 15,
    top: 25,
    transform: [{ rotate: '60deg' }],
    left:-4,
    
  },
  button: {
    width: 50,
    height: 50,
    overflow: 'hidden',
    borderRadius: 25,
    position: 'relative',
  },
  animatedView: {
    height: '100%',
  },
  gradient: {
    height: '100%',
    width: '100%',
  },
  time: {
    fontSize: 14,
    color: 'black',
    position: 'absolute',
    top: -35,
  },
  rippleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor:  '#333', // Black for 'me', darker gray for 'other'
    backgroundColor: 'grey',
  },
});

export default AudioPlayerT;