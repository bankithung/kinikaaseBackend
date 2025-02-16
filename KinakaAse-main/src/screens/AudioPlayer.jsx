import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView, Alert, Animated } from 'react-native';
import Sound from 'react-native-sound';
import LinearGradient from 'react-native-linear-gradient';


const AudioPlayerT = ({ audioUrl ,from}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audio, setAudio] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [boxColor,setBoxColor]=useState("#84D55A")
  Sound.setCategory('Playback');

  const [s,Ss]=useState(from==="me"?'100%':'0%')
  const [e,Se]=useState(from==="me"?'0%':'100%')
  const [boxColorF,setBoxColorF]=useState("white")


  const [chatColor,setChatColor]=useState(from==='me'?"#84D55A":"#f8f8f8")
  // Load the sound file 'whoosh.mp3' from the app bundle
  // See notes below about preloading sounds within initialization code below.



  const play = () => {
   


    var whoosh = new Sound(audioUrl, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
      // loaded successfully
      console.log('duration in seconds: ' + whoosh.getDuration() + 'number of channels: ' + whoosh.getNumberOfChannels());
      handlePress()
      setBoxColor("#69b343")
      setBoxColorF('#f8f8f8')

      // Play the sound with an onEnd callback
      whoosh.play((success) => {
        if (success) {
          setBoxColor("#84D55A")
          setBoxColorF("white")

          console.log('successfully finished playing');
        } else {
          console.log('playback failed due to audio decoding errors');
        }
      });
    });

    // Reduce the volume by half
    whoosh.setVolume(0.5);

    // Position the sound to the full right in a stereo field
    whoosh.setPan(1);

    // Loop indefinitely until stop() is called
    whoosh.setNumberOfLoops(-1);

    // Get properties of the player instance
    console.log('volume: ' + whoosh.getVolume());
    console.log('pan: ' + whoosh.getPan());
    console.log('loops: ' + whoosh.getNumberOfLoops());

    // Seek to a specific point in seconds
    whoosh.setCurrentTime(2.5);

    // Get the current playback point in seconds
    whoosh.getCurrentTime((seconds) => console.log('at ' + seconds));

    // Pause the sound
    whoosh.pause();

    // Stop the sound and rewind to the beginning
    whoosh.stop(() => {
      // Note: If you want to play a sound after stopping and rewinding it,
      // it is important to call play() in a callback.
      whoosh.play();
    });

    // Release the audio player resource
    whoosh.release();

  }


  useEffect(() => {
    const sound = new Sound(audioUrl, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Error loading audio', error);
      } else {
        setDuration(sound.getDuration());
      }
    });

    // sound.setVolume(10);
    // setAudio(sound);

    // // Update the current time every 1000ms (1 second) while the audio is playing
    // const interval = setInterval(() => {
    //   if (isPlaying) {
    //     sound.getCurrentTime((seconds) => {
    //       setCurrentTime(seconds);
    //     });
    //   }
    // }, 1000);

    // // Simulating buffering state: Set a timeout to show buffering for 3 seconds, just as an example
    // const bufferTimeout = setTimeout(() => setIsBuffering(true), 3000);
    // sound.play((success) => {
    //   if (!success) {
    //     console.log('Playback failed');
    //   } else {
    //     setIsBuffering(false); // Reset buffering once audio starts playing
    //   }
    // });

    // return () => {
    //   clearInterval(interval);
    //   clearTimeout(bufferTimeout);
    //   if (sound) {
    //     sound.release();
    //   }
    // };
  }, [audioUrl, isPlaying]);

  // const playPauseAudio = () => {
  //   if (isPlaying) {
  //     audio.pause();
  //   } else {
  //     audio.play((success) => {
  //       if (!success) {
  //         console.log('Playback failed');
  //       }
  //     });
  //   }

  //   setIsPlaying(!isPlaying);
  // };

  // const onSliderValueChange = (value) => {
  //   if (audio) {
  //     audio.setCurrentTime(value);
  //     setCurrentTime(value);
  //   }
  // };
  console.log(duration)


  const animation = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    Animated.timing(animation, {
      toValue: 1,
      duration: duration * 1050,
      useNativeDriver: false,
    }).start(() => {
      animation.setValue(0); // Reset animation after completion
    });
  };

  const animatedStyle = {
    width: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [s, e],
    }),
  };


  return (
    <View>
     

      <View style={styles.container}>
        <TouchableOpacity onPress={() => { play(); }} >
        {
          from==="me"?<View style={[styles.box,{backgroundColor:boxColor}]}/>:<View style={[styles.box,{backgroundColor:boxColorF,right:8}]}/>
        }
       
          <View style={[styles.button,{backgroundColor:from==='me'?"#69b343":"white"}]}>
            

            <Animated.View style={[styles.animatedView, animatedStyle]}>
              <LinearGradient
                colors={[chatColor, chatColor]}
                start={{ x: (from==="me"?1:0), y: 0 }}
                end={{ x: (from==="me"?0:1), y: 0 }}
                style={styles.gradient}

              >


              </LinearGradient>
            </Animated.View>
            <Text style={[styles.time,{left:from==='me'?25:47}]}>{formatTime(duration)}</Text>

          </View>

          {
            from==='me'?
            ( <Image
              source={require('../assets/waveMe.png')}
              style={styles.playPauseIcon}
            />
          )
            :
            ( <Image
              source={require('../assets/wave.png')}
              style={[styles.playPauseIcon,{left:10}]}
            />
          )
          }
         

        </TouchableOpacity>
        
      </View>

    </View>
  );

  // Helper function to format the time (in seconds) to HH:MM:SS format
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours > 0 ? hours + ':' : ''}${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
};

const styles = StyleSheet.create({
  box: {
		width: 15,
		height: 15,
		right: -102,
		top: 32,
		backgroundColor: '#84D55A',
		transform: [{ rotate: '45deg' }], // Rotate by 45 degrees
	},
  container: {
    bottom: 19,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 22
  },
  button: {
    width: 110,
    height: 50,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: '#69b343',
  },

  animatedView: {
    height: '100%',
  },
  gradient: {
    height: '100%',
    width: '100%',
  },
  player: {
    width: '100%',
    height: "100%",
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84D55A',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row'
  },
  playPauseButton: {
    padding: 15,
    backgroundColor: 'black',
    borderRadius: 50,

  },
  playPauseIcon: {
    width: 26,
    height: 26,
    tintColor: 'black',
    left: 76,
    bottom: 37
  },
  timeContainer: {
    flexDirection: 'row',

  },
  time: {
    fontSize: 14,
    color: 'black',
    top: -35,
    left: 25,

  },
  slider: {
    width: '60%',
    marginVertical: 20,
    top: 6,
  },
  bufferingText: {
    color: '#ff9800',
    fontSize: 14,
    marginTop: 10,
  },
});

export default AudioPlayerT;

// import React from 'react';
// import LottieView from 'lottie-react-native';
// import { View, StyleSheet, Button } from 'react-native';

// const RecordingAnimation = () => {
//   let animation;

//   const startRecording = () => {
//     animation.play();
//   };

//   const stopRecording = () => {
//     animation.stop();
//   };

//   return (
//     <View style={styles.container}>
//       <LottieView
//         ref={animation => { animation = animation; }}
//         source={require('./assets/recording.json')} // Replace with your animation file
//         autoPlay={false}
//         loop
//         style={styles.animation}
//       />
//       <Button title="Start Recording" onPress={startRecording} />
//       <Button title="Stop Recording" onPress={stopRecording} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   animation: {
//     width: 200,
//     height: 200,
//   },
// });

// export default RecordingAnimation;
