import React, { useState, useMemo } from 'react';
import { ScrollView } from 'react-native';
import ProfileHeader from '../ProfileHeader';
import ProfileStats from '../ProfileStats';
import Tabs from '../Tabs';
import VideoGrid from '../videogrid';

const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('KinakaAse');
  
  const videos = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`,
      videoUrl: `dQw4w9WgXcQ`, // Example YouTube video ID
    }))
  , []);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <ProfileHeader />
      <ProfileStats />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <VideoGrid videos={videos} />
    </ScrollView>
  );
};

export default ProfileScreen;