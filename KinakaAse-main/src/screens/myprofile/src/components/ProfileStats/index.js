import React, {memo, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  TextInput,
  Image,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import styles from './styles';
import useGlobal from '../../../../../core/global';
const verifiedIcon = '../../assets/verified.png';
const messageIcon= '../../assets/chat.png';

const ProfileStats = memo(() => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('followers');
  const [searchQuery, setSearchQuery] = useState('');
  const [toggle, setToggleFollowUnfollow] = useState(true);
  const user = useGlobal(state => state.user)

  const [followersData, setFollowersData] = useState([
    {
      id: '1',
      name: 'Follower One',
      profilePic:
        'https://static1.cbrimages.com/wordpress/wp-content/uploads/2022/04/Roronoa-Zoro-from-One-Piece-(1).jpg',
      isFollowing: false,
    },
    {
      id: '2',
      name: 'Follower Two',
      profilePic:
        'https://staticg.sportskeeda.com/editor/2023/03/474e0-16794903651247-1920.jpg',
      isFollowing: true,
    },
  ]);

  const [followingData, setFollowingData] = useState([
    {
      id: '1',
      name: 'Following One',
      profilePic: 'https://images.alphacoders.com/136/thumb-1920-1360725.png',
      isFollowing: true,
    },
    {
      id: '2',
      name: 'Following Two',
      profilePic:
        'https://qph.cf2.quoracdn.net/main-qimg-7177e9fbb00699d13df62d497339f113-lq',
      isFollowing: true,
    },
  ]);

  const toggleFollow = useCallback((id, isFollowersTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isFollowersTab) {
      setFollowersData(prevData =>
        prevData.map(user =>
          user.id === id ? {...user, isFollowing: !user.isFollowing} : user,
        ),
      );
    } else {
      setFollowingData(prevData =>
        prevData.map(user =>
          user.id === id ? {...user, isFollowing: !user.isFollowing} : user,
        ),
      );
    }
  }, []);

  const renderItem = useCallback(
    ({item, isFollowersTab}) => (
      <View style={styles.listItem}>
        <FastImage
          source={{uri: item.profilePic}}
          style={styles.profilePic}
          resizeMode={FastImage.resizeMode.cover}
        />
        <Text style={styles.name}>{item.name}</Text>
        <TouchableOpacity
          style={[
            styles.followButton,
            item.isFollowing && styles.unfollowButton,
          ]}
          onPress={() => toggleFollow(item.id, isFollowersTab)}>
          <Text style={styles.followButtonText}>
            {item.isFollowing ? 'Unfollow' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [toggleFollow],
  );

  const filteredData =
    selectedTab === 'followers'
      ? followersData.filter(user =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : followingData.filter(user =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  const bio =
    "Monkey D. Luffy is the main protagonist of One Piece. He's a carefree, optimistic, and incredibly determined young pirate with the dream of finding the legendary treasure, One Piece, and becoming the Pirate King. Luffy has the ability to stretch his body like rubber, thanks to eating the";
  const maxLength = 81; // Set max character length
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.statsContainer}>
      <View>
        <View style={{flexDirection: 'row'}}>
          <Text style={styles.fullName}>{'\n\n\n'}{  user.name}</Text>
          <Image source={require(verifiedIcon)} style={styles.verifiedIcon} />
        </View>

        <Text style={styles.username}>@{  user.username}</Text>

        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text
            style={styles.bio}
            numberOfLines={expanded ? undefined : 2}
            ellipsizeMode="tail">
            {expanded ? bio : bio.substring(0, maxLength) + ' . . .'}
          </Text>
        </TouchableOpacity>
        <View style={styles.stats}>
          <TouchableOpacity
            onPress={() => {
              setModalVisible(true);
              setSelectedTab('followers');
            }}
            style={styles.stats}>
            <Text style={styles.values}> 2.3M </Text>
            <Text style={styles.followers}>Followers </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setModalVisible(true);
              setSelectedTab('following');
            }}
            style={styles.stats}>
            <Text style={styles.values}> 1 </Text>
            <Text style={styles.followers}>Following </Text>
          </TouchableOpacity>
          <View style={styles.stats}>
            <Text style={styles.values}> 10k </Text>
            <Text style={styles.followers}>Likes</Text>
          </View>
        </View>
        {/* <View style={{right: 19, top: 10,flexDirection:'row',justifyContent:'space-evenly'}}>
          <TouchableOpacity
            onPress={() => setToggleFollowUnfollow(!toggle)}
            activeOpacity={0.98}
            style={{
              height: 40,
              width: 250,
              backgroundColor: toggle ? '#1877f2' : 'grey',
              paddingVertical: 7,
              paddingHorizontal: 7,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              bottom: 6,
              left: 10,
            }}>
            <Text style={{fontWeight: 'bold', color: 'white'}}>
              {toggle ? 'Follow' : 'Unfollow'}
            </Text>
            
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setToggleFollowUnfollow(!toggle)}
            activeOpacity={0.98}
            style={{
              height: 40,
              width: 50,
              backgroundColor: toggle ? '#1877f2' : 'grey',
              paddingVertical: 7,
              paddingHorizontal: 7,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              bottom: 6,
              left: 15,
            }}>
            <Image source={require(messageIcon)} style={styles.message} />
            
          </TouchableOpacity>
        </View> */}
      </View>

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalView}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'followers' && styles.selectedTab,
              ]}
              onPress={() => setSelectedTab('followers')}>
              <Text style={styles.tabText}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === 'following' && styles.selectedTab,
              ]}
              onPress={() => setSelectedTab('following')}>
              <Text style={styles.tabText}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TextInput
            style={styles.searchBar}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <FlatList
            data={filteredData}
            renderItem={({item}) =>
              renderItem({item, isFollowersTab: selectedTab === 'followers'})
            }
            keyExtractor={item => item.id}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
});

export default ProfileStats;
