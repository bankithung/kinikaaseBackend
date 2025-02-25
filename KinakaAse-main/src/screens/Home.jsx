import { useEffect, useLayoutEffect, useRef, useState, memo } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faClapperboard, 
  faBell, 
  faMagnifyingGlass, 
  faEllipsisV, 
  faMessage, 
  faUser, 
  faCar, 
  faUserDoctor, 
  faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
// import RequestsScreen from './Requests';
import FriendsScreen from './Friends';
import ProfileScreen from './Profile';
import useGlobal from '../core/global';
import KariScreen from './kariScreen/KariScreen';
import DoctoAi from './Docto/Docto';
import UpdateScreen from './ReelsTemp';
import NetInfo from '@react-native-community/netinfo';
import { Divider, Menu } from 'react-native-paper';

const ANIMATION_CONFIG = {
  duration: Platform.OS === 'android' ? 150 : 200,
  springDamping: 0.8,
  initialScale: 0.95,
};

const Tab = createBottomTabNavigator();

const HeaderRight = memo(({ onRequest, onSearch, requestList, menuVisible, toggleMenu }) => (
  <View style={styles.headerRight}>
    <TouchableOpacity 
      onPress={onRequest} 
      style={styles.headerIcon}
      activeOpacity={0.7}
    >
      <FontAwesomeIcon icon={faBell} size={22} color="black" />
      {requestList?.length > 0 && (
        <Animated.View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.min(requestList.length, 99)}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
    
    <TouchableOpacity 
      onPress={onSearch} 
      style={styles.headerIcon}
      activeOpacity={0.7}
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} size={22} color="black" />
    </TouchableOpacity>
    
    <Menu
      visible={menuVisible}
      onDismiss={toggleMenu}
      anchor={
        <TouchableOpacity 
          onPress={toggleMenu} 
          style={styles.headerIcon}
          activeOpacity={0.7}
        >
          <FontAwesomeIcon icon={faEllipsisV} size={22} color="black" />
        </TouchableOpacity>
      }
      contentStyle={styles.menuContent}
      style={{ marginTop: 40 }}
    >
      <Menu.Item
        onPress={toggleMenu}
        title="Option One"
        titleStyle={styles.menuItemText}
        style={{ backgroundColor: 'grey' }}
      />
      <Divider style={styles.menuDivider} />
      {['Option Two', 'Option Three', 'Option Four', 'Option Five'].map((item) => (
        <View key={item}>
          <Menu.Item
            onPress={toggleMenu}
            title={item}
            titleStyle={styles.menuItemText}
            style={styles.menuItem}
          />
          <Divider style={styles.menuDivider} />
        </View>
      ))}
    </Menu>
  </View>
));

function HomeScreen({ navigation }) {
  const { 
    socketConnect, 
    socketClose, 
    user, 
    requestList, 
    authenticated, 
    socket 
  } = useGlobal();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(ANIMATION_CONFIG.initialScale)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const tabBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!authenticated) return;
    
    let mounted = true;
    const unsubscribe = NetInfo.addEventListener(({ isConnected }) => {
      if (!mounted) return;
      if (isConnected && !socket) socketConnect();
      else if (!isConnected && socket) socketClose();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authenticated, socket]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: menuVisible ? 1 : ANIMATION_CONFIG.initialScale,
        damping: ANIMATION_CONFIG.springDamping,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: menuVisible ? 1 : 0,
        duration: ANIMATION_CONFIG.duration,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuVisible]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSearch = () => navigation.navigate('Search');
  const handleRequest = () => navigation.navigate('Request');
  const toggleMenu = () => setMenuVisible(prev => !prev);

  return (
    <SafeAreaView style={styles.container}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarHideOnKeyboard: true,
          headerRight: () => (
            <HeaderRight
              onRequest={handleRequest}
              onSearch={handleSearch}
              requestList={requestList}
              menuVisible={menuVisible}
              toggleMenu={toggleMenu}
            />
          ),
          tabBarIcon: ({ focused }) => {
            const icons = {
              Kari: faCar,
              Chats: faMessage,
              Profile: faUser,
              updates: faClapperboard,
              DocotAi: faUserDoctor,
            };
            return (
              <Animated.View style={[styles.tabIcon, {
                transform: [{ scale: focused ? 1.1 : 1 }],
              }]}>
                <FontAwesomeIcon 
                  icon={icons[route.name]} 
                  size={19} 
                  color="black"
                />
              </Animated.View>
            );
          },
          tabBarStyle: [
            route.name === 'DocotAi' 
              ? { display: 'none' }
              : styles.tabBar,
            { transform: [{ scaleY: tabBarAnim }] },
          ],
          tabBarActiveBackgroundColor: 'rgba(255, 253, 231, 1)',
          tabBarInactiveBackgroundColor: 'rgba(255, 253, 231, 1)',
          tabBarActiveTintColor: 'red',
          tabBarInactiveTintColor: 'black',
          tabBarLabelStyle: styles.tabLabel,
        })}
        sceneContainerStyle={styles.sceneContainer}
      >
        <Tab.Screen
          name="Chats"
          component={FriendsScreen}
          options={{
            headerTitle: 'KinakaAse',
            headerTitleStyle: styles.headerTitle,
            headerStyle: styles.header,
          }}
        />
        {/* <Tab.Screen
          name="updates"
          component={UpdateScreen}
          options={{ headerShown: false }}
        /> */}
        <Tab.Screen
          name="DocotAi"
          component={DoctoAi}
          options={{
            headerShown: false,
            headerTitle: 'Docto AI',
            headerTitleStyle: styles.doctorHeaderTitle,
            headerStyle: styles.doctorHeader,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chats')}
                style={styles.headerLeft}
                activeOpacity={0.7}
              >
                <FontAwesomeIcon icon={faArrowLeft} size={22} color="white" />
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen
          name="Kari"
          component={KariScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 253, 231, 1)',
  },
  sceneContainer: {
    backgroundColor: 'rgba(255, 253, 231, 1)',
  },
  header: {
    backgroundColor: 'rgba(255, 253, 231, 1)',
    height: 55,
    elevation: 1,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: 25,
    color: 'black',
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    justifyContent: 'space-evenly',
  },
  headerIcon: {
    padding: 10,
    marginRight: 6,
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuContent: {
    backgroundColor: 'grey',
    borderRadius: 8,
    transform: [{ scale: ANIMATION_CONFIG.initialScale }],
    marginTop: -10,
  },
  menuItem: {
    backgroundColor: 'grey',
    minWidth: 150,
  },
  menuItemText: {
    color: 'white',
    fontSize: 14,
  },
  menuDivider: {
    backgroundColor: '#413033',
  },
  tabBar: {
    height: 65,
    backgroundColor: '#0f0607',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    marginTop: 10,
    paddingBottom: 5,
  },
  tabIcon: {
    padding: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  doctorHeader: {
    backgroundColor: '#0f0607',
    elevation: 0,
    shadowOpacity: 0,
  },
  doctorHeaderTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
  },
  headerLeft: {
    padding: 10,
    marginLeft: 6,
  },
});

export default memo(HomeScreen);