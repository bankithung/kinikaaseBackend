import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { requestAllPermissions } from './src/utils/permissions';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const App = () => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const granted = await requestAllPermissions();
      setPermissionsGranted(granted);
    };
    checkPermissions();
  }, []);

  if (!permissionsGranted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Requesting permissions...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;