import {useEffect, useLayoutEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import { faClapperboard } from '@fortawesome/free-solid-svg-icons';

import RequestsScreen from './Requests';
import FriendsScreen from './Friends';
import ProfileScreen from './Profile';
import useGlobal from '../core/global';
import Thumbnail from '../common/Thumbnail';
import ReelScreen from './Reels';
import MyProfile from './myprofile';

const Tab = createBottomTabNavigator();

function HomeScreen({navigation}) {
  const socketConnect = useGlobal(state => state.socketConnect);
  const socketClose = useGlobal(state => state.socketClose);
  const user = useGlobal(state => state.user);

  // const [server,setServer]=useState(undefined)
  // const getServer=async()=>{

  // 		const url='https://api.jsonsilo.com/public/7bb0c65a-5d74-4ab4-9fa1-7459c0be916d'

  // 		const res=await fetch(url)
  // 		setServer(await res.json());

  // 		console.log("mhbmhb=>",server)
  // 	}

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  useEffect(() => {
    // getServer()

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
      o
      screenOptions={({route, navigation}) => ({
        tabBarHideOnKeyboard: true,

        // headerLeft: () => (
        // 	<View style={{ marginLeft: 16 }}>
        // 		<Text style={style.kinakaseText}>KinakaAse</Text>
        // 	</View>
        // ),
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
          </View>
        ),
        tabBarIcon: ({focused, color, size}) => {
          const icons = {
            Kari: 'car',
            Chats: 'message',
            Profile: 'user',
            Reels: faClapperboard,
          };
          const icon = icons[route.name];
          return <FontAwesomeIcon icon={icon} size={19} color="white" />;
        },
        tabBarStyle: {
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

      {/* <Tab.Screen
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
        name="Kari"
        component={RequestsScreen}
        options={{
          headerStyle: {
            backgroundColor: '#0f0607',
            height: 80,
            elevation: 1,
          },
        }}
      /> */}

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
