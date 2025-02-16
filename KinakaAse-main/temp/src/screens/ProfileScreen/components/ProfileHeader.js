import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from './ProfileStyles';

const ProfileHeader = () => (
  <View style={styles.headerContainer}>
    <Text style={styles.headerName}>Monkey D Luffy</Text>
    <View style={styles.profileInfo}>
      <Image
        source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
        style={styles.avatar}
      />
      <View style={styles.statsContainer}>
        <StatItem value="3560" label="Posts" />
        <StatItem value="720.8M" label="Followers" />
        <StatItem value="824" label="Following" />
      </View>
    </View>
    
    <Text style={styles.name}>Luffy Kikon</Text>
    <Text style={styles.bio}>Iam gonna become the king of the pirate</Text>
    
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>
      {/* <TouchableOpacity style={styles.contactButton}>
        <Text style={styles.buttonText}>Contact</Text>
      </TouchableOpacity> */}
    </View>
  </View>
);

const StatItem = ({ value, label }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default ProfileHeader;