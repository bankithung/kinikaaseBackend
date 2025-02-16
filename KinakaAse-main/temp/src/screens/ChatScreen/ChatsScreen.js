// ChatsScreen.js
import React from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import ChatListItem from '../../components/ChatListItem';
import styles from './styles';
// Import local images (optimized for production - properly sized and compressed)
const profile1 = "https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg";
const profile2 = "https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg";

const ChatsScreen = () => {
  const chats = [
    { 
      id: '1', 
      name: 'John Doe', 
      lastMessage: 'Hey, how are you?', 
      time: '11:29 AM', 
      unread: 2,
      profilePic: profile1
    },
    { 
      id: '2', 
      name: 'Alice Smith', 
      lastMessage: 'See you tomorrow!', 
      time: '9:50 AM', 
      unread: 10,
      profilePic: profile2
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>KinakaAse</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Ask Meta AI or Search"
          placeholderTextColor="#666"
        />
      </View>
      <FlatList
        data={chats}
        renderItem={({ item }) => <ChatListItem chat={item} />}
        keyExtractor={item => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={7}
      />
    </View>
  );
};


export default ChatsScreen;