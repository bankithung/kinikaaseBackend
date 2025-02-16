import React, { useEffect, useState } from 'react'
import {
	SafeAreaView, StatusBar, Text,
} from 'react-native'

import './src/core/fontawesome'

import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import SplashScreen from './src/screens/Splash'
import SignInScreen from './src/screens/SignIn'
import SignUpScreen from './src/screens/SignUp'
import HomeScreen from './src/screens/Home'
import SearchScreen from './src/screens/Search'
import MessagesScreen from './src/screens/Message'

import useGlobal from './src/core/global'
import VideoCall from './src/core/videocall/app'
import RequestsScreen from './src/screens/Requests'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ProfileScreen from './src/screens/Profile'
import OtherProfile from './src/screens/OtherProfile'
import VideoCallScreen from './src/screens/Index'
import ImageViewerComponent from './src/screens/ImageViewer/ImageViewer'
import MusicSyncScreen from './src/screens/Together/Listen'
import ViewAnyImage from './src/screens/ImageViewer/ViewAnyImage'


const LightTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: '#0f0607'
	}
}


const Stack = createNativeStackNavigator()


function App() {
	const initialized = useGlobal(state => state.initialized)
	const authenticated = useGlobal(state => state.authenticated)

	const init = useGlobal(state => state.init)

	useEffect(() => {
		init()
	}, [])

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
		<NavigationContainer theme={LightTheme}>
			<StatusBar barStyle='light-content' backgroundColor={"#0f0607"} />
			<Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#0f0607" }, headerTintColor: "white" }}>
			{!initialized ? (
					<>
						<Stack.Screen name="Splash" component={SplashScreen} />
					</>
				) : !authenticated ? (
					<>
						{/* <Stack.Screen name="videoCall" component={VideoCall} /> */}
						<Stack.Screen name="SignIn" component={SignInScreen} />
						<Stack.Screen name="SignUp" component={SignUpScreen} />
					</>
				) : (
					<>
						<Stack.Screen name="Home" component={HomeScreen} />
						<Stack.Screen name="Search" component={SearchScreen} />
						<Stack.Screen name="Request" component={RequestsScreen} />
						<Stack.Screen name="Messages" component={MessagesScreen}  />
						<Stack.Screen name="Profile" component={ProfileScreen}  />
						<Stack.Screen name="OtherProfile" component={OtherProfile}  />
						<Stack.Screen name="VideoCall" component={VideoCallScreen}  options={{headerShown:false}}/>
						<Stack.Screen name="viewImage" component={ImageViewerComponent}   options={{headerShown:false}}/>
						<Stack.Screen name="PlayMusic" component={MusicSyncScreen}   options={{headerShown:false}}/>
						<Stack.Screen name="ViewAnyImage" component={ViewAnyImage}   options={{headerShown:false}}/>

					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
		</GestureHandlerRootView>
	)
}


export default App
