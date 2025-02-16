import React from 'react';
import { View, ScrollView } from 'react-native';
import ProfileHeader from './components/ProfileHeader';
import ProfileNav from './components/ProfileNav';
import PhotoGrid from './components/PhotoGrid';
import { styles } from './components/ProfileStyles';

const ProfileScreen = () => (
  <View style={styles.container}>
    <ScrollView>
      <ProfileHeader />
      <ProfileNav />
      <PhotoGrid />
    </ScrollView>
  </View>
);

export default ProfileScreen;