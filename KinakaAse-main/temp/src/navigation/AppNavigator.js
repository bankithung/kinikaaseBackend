import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import {createStackNavigator} from '@react-navigation/stack';
import styles from './styles';

// Screens
import ChatsScreen from '../screens/ChatScreen/ChatsScreen';
import TravelScreen from '../screens/TravelScreen/TravelScreen';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import DoctoAi from '../screens/DoctoAiScreen/DoctoAi';
import Reels from '../screens/Reels/reels';

// Assets
const chatIcon = require('../assets/chats.png');
const travelIcon = require('../assets/motorbike.png');
const doctoIcon = require('../assets/DoctoAi.png');
const profileIcon = require('../assets/profile.png');
const ReelsIcon = require('../assets/reels.png');


import {PanGestureHandler} from 'react-native-gesture-handler';

const {width} = Dimensions.get('window');
const Stack = createStackNavigator();
const SCREENS = ['Chats', 'Reels', 'Docto', 'Travel', 'Profile'];


const ChatStack = React.memo(() => (
  <Stack.Navigator>
    <Stack.Screen
      name="Chats"
      component={ChatsScreen}
      options={{headerShown: false}}
    />
  </Stack.Navigator>
));

const AppNavigator = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const screens = React.useMemo(
    () => [ChatStack, Reels, DoctoAi, TravelScreen, ProfileScreen],
    [],
  );

  const iconSources = React.useMemo(
    () => ({
      Chats: chatIcon,
      Travel: travelIcon,
      Docto: doctoIcon,
      Profile: profileIcon,
      Reels: ReelsIcon,
    }),
    [],
  );

  const handleTabPress = useCallback((index: number) => {
    translateX.value = withTiming(-index * width, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    });
    setActiveIndex(index);
  }, []);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      const newTranslateX = ctx.startX + event.translationX;
      translateX.value = Math.max(
        Math.min(newTranslateX, 0),
        -(SCREENS.length - 1) * width,
      );
    },
    onEnd: (event, ctx) => {
      const currentIndex = Math.round(-translateX.value / width);
      const offset = -currentIndex * width;
      const velocity = event.velocityX;
      
      let targetIndex = currentIndex;
      if (Math.abs(velocity) > 500) {
        targetIndex = velocity > 0 ? currentIndex - 1 : currentIndex + 1;
      } else {
        const diff = offset - translateX.value;
        targetIndex = diff > width / 4 ? currentIndex + 1 : 
                      diff < -width / 4 ? currentIndex - 1 : 
                      currentIndex;
      }

      targetIndex = Math.max(0, Math.min(targetIndex, SCREENS.length - 1));
      translateX.value = withTiming(-targetIndex * width, {
        velocity: velocity,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });
      
      if (targetIndex !== activeIndex) {
        runOnJS(setActiveIndex)(targetIndex);
      }
    },
  });

  const TabItem = React.useCallback(
    ({route, index}: {route: string; index: number}) => {
      const isActive = activeIndex === index;

      return (
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress(index)}>
          <Image
            source={iconSources[route]}
            style={[
              styles.icon,
              {
                tintColor: isActive ? '#008069' : 'gray',
                transform: [{scale: isActive ? 1.1 : 1}],
              },
            ]}
          />
        </TouchableOpacity>
      );
    },
    [activeIndex],
  );

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-10, 10]}>
        <Animated.View style={styles.screenContainer}>
          {screens.map((Component, index) => {
            const screenStyle = useAnimatedStyle(() => ({
              transform: [{translateX: translateX.value + index * width}],
              opacity: withTiming(activeIndex === index ? 1 : 0, {
                duration: 150,
              }),
            }));

            return (
              <Animated.View
                key={SCREENS[index]}
                style={[styles.page, screenStyle]}>
                <Component />
              </Animated.View>
            );
          })}
        </Animated.View>
      </PanGestureHandler>

      <View style={styles.tabBar}>
        <Animated.View
          style={[
            styles.tabIndicator,
            useAnimatedStyle(() => ({
              transform: [
                {
                  translateX: withTiming(
                    (-translateX.value / width) * (width / SCREENS.length),
                  ),
                },
              ],
            })),
          ]}
        />
        {SCREENS.map((route, index) => (
          <TabItem key={route} route={route} index={index} />
        ))}
      </View>
    </View>
  );
};


export default React.memo(AppNavigator);
