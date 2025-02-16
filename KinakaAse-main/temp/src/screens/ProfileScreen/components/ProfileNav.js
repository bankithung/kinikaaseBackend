// import React, { useState } from 'react';
// import { View, TouchableOpacity, Text } from 'react-native';
// import { styles } from './ProfileStyles';

// const ProfileNav = () => {
//   const [activeTab, setActiveTab] = useState('Posts');

//   const handleTabPress = (tabName) => {
//     setActiveTab(tabName);
//   };

//   const renderContent = () => {
//     switch(activeTab) {
//       case 'Posts':
//         return <View style={styles.contentContainer}><Text>Posts Content</Text></View>;
//       case 'Reels':
//         return <View style={styles.contentContainer}><Text>Reels Content</Text></View>;
//       case 'Tagged':
//         return <View style={styles.contentContainer}><Text>Tagged Content</Text></View>;
//       default:
//         return null;
//     }
//   };

//   return (
//     <View style={styles.navContainer}>
//       <View style={styles.navButtonsContainer}>
//         <TouchableOpacity 
//           style={styles.navButton}
//           onPress={() => handleTabPress('Posts')}
//         >
//           <Text style={activeTab === 'Posts' ? styles.navTextActive : styles.navText}>
//             Posts
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity 
//           style={styles.navButton}
//           onPress={() => handleTabPress('Reels')}
//         >
//           <Text style={activeTab === 'Reels' ? styles.navTextActive : styles.navText}>
//             Reels
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity 
//           style={styles.navButton}
//           onPress={() => handleTabPress('Tagged')}
//         >
//           <Text style={activeTab === 'Tagged' ? styles.navTextActive : styles.navText}>
//             Tagged
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {renderContent()}
//     </View>
//   );
// };

// export default ProfileNav;

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import Video from 'react-native-video';
import { styles } from './ProfileStyles';

const ProfileNav = () => {
  const [activeTab, setActiveTab] = useState('Posts');

  const handleTabPress = (tabName) => {
    setActiveTab(tabName);
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'Posts':
        return (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://www.dexerto.com/cdn-image/wp-content/uploads/2023/08/16/one-piece-gear-5-luffy.jpeg' }}
              style={styles.mediaItem}
            /> 
          </View>
        );
      case 'Reels':
        return (
          <View style={styles.mediaContainer}>
            <Video
              source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' }}
              style={styles.mediaItem}
              paused={true}
              resizeMode="cover"
            />
            <Video
              source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }}
              style={styles.mediaItem}
              paused={true}
              resizeMode="cover"
            />
            <Video
              source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' }}
              style={styles.mediaItem}
              paused={true}
              resizeMode="cover"
            />
          </View>
        );
      case 'Tagged':
        return (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: 'https://placekitten.com/303/303' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://placekitten.com/304/304' }}
              style={styles.mediaItem}
            />
            <Image
              source={{ uri: 'https://placekitten.com/305/305' }}
              style={styles.mediaItem}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.navContainer}>
      <View style={styles.navButtonsContainer}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => handleTabPress('Posts')}
        >
          <Text style={activeTab === 'Posts' ? styles.navTextActive : styles.navText}>
            Posts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => handleTabPress('Reels')}
        >
          <Text style={activeTab === 'Reels' ? styles.navTextActive : styles.navText}>
            Reels
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => handleTabPress('Tagged')}
        >
          <Text style={activeTab === 'Tagged' ? styles.navTextActive : styles.navText}>
            Tagged
          </Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </View>
  );
};

export default ProfileNav;