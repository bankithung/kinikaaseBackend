// import React, { memo } from 'react';
// import { FlatList } from 'react-native';
// import VideoThumbnail from '../VideoThumbnail';

// const VideoGrid = memo(({ videos }) => (
//   <FlatList
//     data={videos}
//     keyExtractor={(item) => item.id}
//     numColumns={3}
//     renderItem={({ item }) => <VideoThumbnail videoUrl={item.videoUrl} />}
//     maxToRenderPerBatch={8}
//     initialNumToRender={12}
//     windowSize={11}
//     removeClippedSubviews
//   />
// ));

// export default VideoGrid;
// screens/ProfileScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import VideoThumbnail from '../VideoThumbnail';
import VideoViewer from '../VideoViewer';
import { DEMO_VIDEOS } from './video';

const VideoGrid = () => {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <View style={styles.container}>
      <FlatList
        data={DEMO_VIDEOS}
        numColumns={3}
        keyExtractor={(item) => item}
        renderItem={({ item, index }) => (
          <VideoThumbnail
            videoUrl={item}
            index={index}
            onPress={(idx) => {
              setSelectedIndex(idx);
              setViewerVisible(true);
            }}
          />
        )}
      />

      <VideoViewer
        visible={viewerVisible}
        videos={DEMO_VIDEOS}
        initialIndex={selectedIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
});

export default VideoGrid;