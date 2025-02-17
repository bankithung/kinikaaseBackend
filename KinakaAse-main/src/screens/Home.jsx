import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faClapperboard} from '@fortawesome/free-solid-svg-icons';

import RequestsScreen from './Requests';
import FriendsScreen from './Friends';
import ProfileScreen from './Profile';
import useGlobal from '../core/global';
import Thumbnail from '../common/Thumbnail';
import ReelScreen from './Reels';
import MyProfile from './myprofile';
import KariScreen from './kari';
import DoctoAi from './Docto/Docto';
import {Divider, Menu} from 'react-native-paper';

const Tab = createBottomTabNavigator();

function HomeScreen({navigation}) {
  const socketConnect = useGlobal(state => state.socketConnect);
  const socketClose = useGlobal(state => state.socketClose);
  const user = useGlobal(state => state.user);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  useEffect(() => {
    socketConnect();
    return () => {
      socketClose();
    };
  }, []);

  function onSearch() {
    navigation.navigate('Search');
  }
  function onRequest() {
    navigation.navigate('Request');
  }

  return (
    <Tab.Navigator
      screenOptions={({route, navigation}) => ({
        tabBarHideOnKeyboard: true,
        headerRight: () => (
          <View style={{justifyContent: 'space-evenly', flexDirection: 'row'}}>
            <TouchableOpacity onPress={onRequest}>
              <FontAwesomeIcon
                style={{marginRight: 16}}
                icon="bell"
                size={22}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onSearch}>
              <FontAwesomeIcon
                style={{marginRight: 16}}
                icon="magnifying-glass"
                size={22}
                color="white"
              />
            </TouchableOpacity>

            <Menu
              visible={visible}
              onDismiss={closeMenu}
              anchor={
                <TouchableOpacity
                  onPress={openMenu}
                  style={{paddingVertical: 0}}>
                  <FontAwesomeIcon icon="ellipsis-v" size={22} color="white" />
                </TouchableOpacity>
              }
              contentStyle={[
                {
                  transform: [{scale: scaleAnim}],
                  opacity: opacityAnim,
                  marginTop: -10,
                  backgroundColor: '#2a1a1c',
                  borderRadius: 8,
                },
              ]}
              style={{marginTop: 40}}>
              <Animated.View>
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    // openPlayer({roomType: 'PlayMusic'});
                  }}
                  title="Option One"
                  titleStyle={{color: 'white'}}
                  style={{backgroundColor: '#2a1a1c'}}
                />
                <Divider style={{backgroundColor: '#413033'}} />
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    // openPlayer({roomType: 'PlayVideo'});
                  }}
                  title="Option Two"
                  titleStyle={{color: 'white'}}
                  style={{backgroundColor: '#2a1a1c'}}
                />
                <Divider style={{backgroundColor: '#413033'}} />
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    // openPlayer({roomType: 'PlayVideo'});
                  }}
                  title="Option Three"
                  titleStyle={{color: 'white'}}
                  style={{backgroundColor: '#2a1a1c'}}
                />
<Divider style={{backgroundColor: '#413033'}} />
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    // openPlayer({roomType: 'PlayVideo'});
                  }}
                  title="Option Four"
                  titleStyle={{color: 'white'}}
                  style={{backgroundColor: '#2a1a1c'}}
                />
<Divider style={{backgroundColor: '#413033'}} />
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    // openPlayer({roomType: 'PlayVideo'});
                  }}
                  title="Option Five"
                  titleStyle={{color: 'white'}}
                  style={{backgroundColor: '#2a1a1c'}}
                />
              </Animated.View>
            </Menu>
          </View>
        ),
        tabBarIcon: ({focused, color, size}) => {
          const icons = {
            Kari: 'car',
            Chats: 'message',
            Profile: 'user',
            Reels: faClapperboard,
            DocotAi: 'user-doctor',
          };
          const icon = icons[route.name];
          return <FontAwesomeIcon icon={icon} size={19} color="white" />;
        },
        tabBarStyle:
          route.name === 'DocotAi'
            ? {display: 'none'}
            : {
                height: 65,
                backgroundColor: '#0f0607',
                borderTopWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
                marginTop: 10,
              },
        tabBarActiveBackgroundColor: '#0f0607',
        tabBarInactiveBackgroundColor: '#0f0607',
        tabBarActiveTintColor: 'red',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontWeight: 'bold',
          fontSize: 14,
          marginBottom: 15,
          marginTop: 0,
        },
      })}>
      <Tab.Screen
        name="Chats"
        component={FriendsScreen}
        options={{
          headerTitle: 'KinakaAse',
          headerTitleStyle: style.kinakaseText,
          headerStyle: {
            backgroundColor: '#0f0607',
            height: 55,
            elevation: 1,
          },
        }}
      />

      <Tab.Screen
        name="Reels"
        component={ReelScreen}
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#0f0607',
            height: 80,
            elevation: 1,
          },
        }}
      />

      <Tab.Screen
        name="DocotAi"
        component={DoctoAi}
        options={({navigation}) => ({
          headerShown: false,
          headerTitle: 'Docto AI',
          headerTitleStyle: {
            color: 'white',
            fontSize: 20,
          },
          headerStyle: {
            backgroundColor: '#0f0607',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Chats')}
              style={{marginLeft: 16}}>
              <FontAwesomeIcon icon="arrow-left" size={22} color="white" />
            </TouchableOpacity>
          ),
        })}
      />

      <Tab.Screen
        name="Kari"
        component={KariScreen}
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#0f0607',
            height: 80,
            elevation: 1,
          },
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#0f0607',
            height: 80,
            elevation: 1,
          },
        }}
      />
    </Tab.Navigator>
  );
}

const style = StyleSheet.create({
  kinakaseText: {
    fontSize: 25,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
