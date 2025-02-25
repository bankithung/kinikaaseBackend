import React, { useEffect, useState, Suspense, lazy } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Vibration,
} from 'react-native';
import './src/core/fontawesome'; // Ensure FontAwesome is configured
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as ReduxProvider } from 'react-redux';
import store from './src/screens/kariScreen/src/store'; // Ensure store is correctly set up
import useGlobal from './src/core/global';
import api from './src/core/api';
import utils from './src/core/utils';
import Input from './src/common/Input';
import Button from './src/common/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

// Lazy-loaded components
const SplashScreen = lazy(() => import('./src/screens/Splash'));
const HomeScreen = lazy(() => import('./src/screens/Home'));
const SearchScreen = lazy(() => import('./src/screens/Search'));
const MessagesScreen = lazy(() => import('./src/screens/Message'));
const RequestsScreen = lazy(() => import('./src/screens/Requests'));
const ProfileScreen = lazy(() => import('./src/screens/Profile'));
const OtherProfile = lazy(() => import('./src/screens/OtherProfile'));
const VideoCallScreen = lazy(() => import('./src/screens/Index'));
const ImageViewerComponent = lazy(() => import('./src/screens/ImageViewer/ImageViewer'));
const MusicSyncScreen = lazy(() => import('./src/screens/Together/Listen'));
const ViewAnyImage = lazy(() => import('./src/screens/ImageViewer/ViewAnyImage'));
const VideoSyncScreen = lazy(() => import('./src/screens/Together/video'));
const PostDetail = lazy(() => import('./src/screens/PostDetail'));
const ViewMedia = lazy(() => import('./src/screens/videwMedia/ViewMedia'));

// Theme configuration
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFDE7', // Creamy background for a warm feel
    card: '#FFFDE7',
    text: '#333333',
  },
};

const PaperLightTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: '#075E54', // Teal green for primary actions
    accent: '#FF6F61', // Coral for secondary actions
    background: '#FFFDE7',
    surface: '#FFFDE7',
    text: '#333333',
  },
};

const Stack = createNativeStackNavigator();

// Configure PushNotification
PushNotification.configure({
  onNotification: (notification) => {
    utils.log('Notification:', notification);
    Vibration.vibrate(200); // Short vibration for feedback
  },
  requestPermissions: Platform.OS === 'ios',
  popInitialNotification: true,
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
});

// AuthScreen Component
const AuthScreen = React.memo(({ navigation, route }) => {
  const isSignUp = route.name === 'SignUp';
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    passwordConfirm: '',
  });
  const [errors, setErrors] = useState({});
  const [secureText, setSecureText] = useState({
    password: true,
    passwordConfirm: true,
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const { login } = useGlobal();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [navigation, fadeAnim, slideAnim]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value.trim() }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleSecureText = (field) => {
    setSecureText((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username is required';
    else if (isSignUp && formData.username.length < 5) newErrors.username = 'Username must be at least 5 characters';

    if (isSignUp) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
    }

    if (!formData.password) newErrors.password = 'Password is required';
    else if (isSignUp && formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (isSignUp && formData.password !== formData.passwordConfirm) newErrors.passwordConfirm = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const endpoint = isSignUp ? '/chat/signup/' : '/chat/signin/';
    const payload = isSignUp
      ? {
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password,
        }
      : {
          username: formData.username,
          password: formData.password,
        };

    try {
      const response = await api({
        method: 'POST',
        url: endpoint,
        data: payload,
      });

      const credentials = { username: formData.username, password: formData.password };
      await login(credentials, response.data.user, response.data.tokens);
      navigation.replace('Home');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'An error occurred. Please try again.';
      setErrors({ username: errorMessage });
      utils.log('Auth Error:', error);
    }
  };

  const toggleAuthMode = () => navigation.navigate(isSignUp ? 'SignIn' : 'SignUp');

  const inputs = [
    { title: 'Username', field: 'username', secure: false },
    ...(isSignUp ? [
      { title: 'First Name', field: 'firstName', secure: false },
      { title: 'Last Name', field: 'lastName', secure: false },
    ] : []),
    { title: 'Password', field: 'password', secure: true },
    ...(isSignUp ? [{ title: 'Confirm Password', field: 'passwordConfirm', secure: true }] : []),
  ];

  return (
    <SafeAreaView style={styles.authContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={[styles.authContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.authTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            {inputs.map(({ title, field, secure }) => (
              <View key={field} style={styles.inputContainer}>
                <Input
                  title={title}
                  value={formData[field]}
                  error={errors[field]}
                  setValue={(value) => updateField(field, value)}
                  setError={(error) => setErrors((prev) => ({ ...prev, [field]: error }))}
                  secureTextEntry={secure ? secureText[field] : false}
                  style={styles.authInput}
                />
                {secure && (
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => toggleSecureText(field)}>
                    <FontAwesomeIcon icon={secureText[field] ? faEyeSlash : faEye} size={20} color="#075E54" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <Button title={isSignUp ? 'Sign Up' : 'Sign In'} onPress={handleSubmit} style={styles.authButton} />
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={styles.authToggleText}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

// Main App Component
const App = () => {
  const { initialized, authenticated, init, addNotification } = useGlobal();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (enabled) {
          utils.log('FCM permissions granted');
          // Delay FCM token update until after init completes authentication
        }
        await init(); // This will handle authentication and FCM update if needed

        // Set up foreground message handler after init
        messaging().onMessage(async (remoteMessage) => {
          addNotification(`New message: ${remoteMessage.notification?.body}`, 'success');
          Vibration.vibrate([200, 100, 200]);
          PushNotification.localNotification({
            channelId: 'default-channel',
            title: remoteMessage.notification?.title || 'New Message',
            message: remoteMessage.notification?.body || 'Check your app!',
            vibrate: true,
            vibration: 300,
            playSound: true,
          });
        });
      } catch (error) {
        utils.log('Initialization error:', error);
        addNotification('Failed to initialize app', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    return () => messaging().onMessage(() => {});
  }, [init, addNotification]);

  useEffect(() => {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      PushNotification.localNotification({
        channelId: 'default-channel',
        title: remoteMessage.notification?.title || 'New Message',
        message: remoteMessage.notification?.body || 'Check your app!',
        vibrate: true,
        vibration: 300,
        playSound: true,
      });
    });
  }, []);

  const FallbackComponent = () => (
    <View style={styles.fallback}>
      <ActivityIndicator size="large" color="#075E54" />
      <Text style={styles.fallbackText}>Loading...</Text>
    </View>
  );

  const defaultScreenOptions = {
    headerStyle: { backgroundColor: '#FFFDE7', elevation: 4, shadowOpacity: 0.2 },
    headerTintColor: '#333333',
    headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
    animation: Platform.OS === 'android' ? 'fade' : 'default',
  };

  const renderScreens = () => {
    if (!initialized) return <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />;
    if (!authenticated) return (
      <>
        <Stack.Screen name="SignIn" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={AuthScreen} options={{ headerShown: false }} />
      </>
    );

    return (
      <>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
        <Stack.Screen name="Request" component={RequestsScreen} options={{ title: 'Requests' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="OtherProfile" component={OtherProfile} options={{ title: 'Profile' }} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ViewAnyImage" component={ViewAnyImage} options={{ headerShown: false }} />
        <Stack.Screen name="PlayMusic" component={MusicSyncScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ViewMedia" component={ViewMedia} options={{ headerShown: false }} />
        <Stack.Screen name="PlayVideo" component={VideoSyncScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PostDetail" component={PostDetail} options={{ headerShown: false }} />
      </>
    );
  };

  if (isLoading) return <FallbackComponent />;

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={PaperLightTheme}>
        <GestureHandlerRootView style={styles.root}>
          <NavigationContainer theme={LightTheme}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFDE7" animated />
            <Suspense fallback={<FallbackComponent />}>
              <SafeAreaView style={styles.container}>
                <Stack.Navigator screenOptions={defaultScreenOptions}>
                  {renderScreens()}
                </Stack.Navigator>
              </SafeAreaView>
            </Suspense>
          </NavigationContainer>
        </GestureHandlerRootView>
      </PaperProvider>
    </ReduxProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FFFDE7' },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDE7' },
  fallbackText: { marginTop: 10, fontSize: 16, color: '#333333', fontFamily: 'Times New Roman' },
  authContainer: { flex: 1, backgroundColor: '#FFFDE7' },
  keyboardView: { flex: 1 },
  authContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 30, backgroundColor: '#FFFDE7' },
  authTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#075E54',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Times New Roman',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  inputContainer: { position: 'relative', marginBottom: 20 },
  authInput: {
    backgroundColor: '#F5F5DC',
    borderWidth: 1,
    borderColor: '#B0B0B0',
    borderRadius: 8,
    padding: 14,
    paddingRight: 40,
    fontSize: 16,
    color: '#333333',
    fontFamily: 'Times New Roman',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eyeIcon: { position: 'absolute', right: 12, top: '70%', transform: [{ translateY: -10 }] },
  authButton: {
    backgroundColor: '#075E54',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  authToggleText: {
    textAlign: 'center',
    color: '#075E54',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    textDecorationLine: 'underline',
  },
});

export default App;