import React, {memo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import FastImage from 'react-native-fast-image';
import styles from './styles';

const ChatListItem = memo(({chat}) => (
  <TouchableOpacity style={styles.container} activeOpacity={0.7}>
    <View style={styles.content}>
      <Image
        source={{uri: chat.profilePic}}
        style={styles.profileImage}
        resizeMode="cover"
      />
      {/* <FastImage
        source={{
          uri: chat.profileUrl,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        }}
        style={styles.profileImage}
      /> */}

      <View style={styles.textContainer}>
        <Text style={styles.name}>{chat.name}</Text>
        <Text style={styles.message} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <Text style={styles.time}>{chat.time}</Text>
        {chat.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{chat.unread}</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
));



export default ChatListItem;
