import React from 'react';
import { FlatList, Image, TouchableOpacity, View } from 'react-native';
import { styles } from './ProfileStyles';

const PhotoGrid = () => {
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.gridItem}>
      <Image
        source={{ uri: item }}
        style={styles.gridImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={Array(9).fill('https://example.com/photo.jpg')}
      renderItem={renderItem}
      keyExtractor={(_, index) => index.toString()}
      numColumns={3}
      contentContainerStyle={styles.gridContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PhotoGrid;