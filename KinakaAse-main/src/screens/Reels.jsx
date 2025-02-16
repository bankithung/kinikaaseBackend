import React, {useState, useRef, useEffect, useCallback, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  TextInput,
  Animated,
  TouchableWithoutFeedback,
  FlatList,
  Share,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import Video from 'react-native-video';
import {
  faHeart,
  faComments,
  faShare,
  faTimes,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const TAB_BAR_HEIGHT = 110;
const STATUS_BAR_HEIGHT = 100;
const VIDEO_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;
const COMMENTS_HEIGHT = SCREEN_HEIGHT * 0.6;

const statusData = [
  {
    id: 1,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    user: '@adventurer',
    profilePic: 'https://randomuser.me/api/portraits/men/1.jpg',
    isViewed: false,
  },
  {
    id: 2,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: '@naturelover',
    profilePic: 'https://randomuser.me/api/portraits/women/1.jpg',
    isViewed: true,
  },
  {
    id: 3,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: '@traveler',
    profilePic: 'https://randomuser.me/api/portraits/men/2.jpg',
    isViewed: false,
  },
  {
    id: 4,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: '@traveler',
    profilePic: 'https://randomuser.me/api/portraits/men/2.jpg',
    isViewed: false,
  },
  {
    id: 5,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: '@traveler',
    profilePic: 'https://randomuser.me/api/portraits/men/2.jpg',
    isViewed: false,
  },
  {
    id: 6,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: '@traveler',
    profilePic: 'https://randomuser.me/api/portraits/men/2.jpg',
    isViewed: false,
  },
  {
    id: 7,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: '@traveler',
    profilePic: 'https://randomuser.me/api/portraits/men/2.jpg',
    isViewed: false,
  },
];

const reelData = [
  {
    id: 1,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    user: '@adventurer',
    profilePic: 'https://randomuser.me/api/portraits/men/1.jpg',
    likes: 388,
    comments: 120,
    caption: 'Living life on the edge! 🚵♂️',
    isFollowing: false,
    isLiked: false,
  },
  {
    id: 2,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: '@naturelover',
    profilePic: 'https://randomuser.me/api/portraits/women/1.jpg',
    likes: 512,
    comments: 89,
    caption: 'Sunset vibes 🌅',
    isFollowing: true,
    isLiked: false,
  },
  {
    id: 3,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    user: '@gamer',
    profilePic: 'https://randomuser.me/api/portraits/men/3.jpg',
    likes: 892,
    comments: 156,
    caption: 'Friday night fun! 🎮',
    isFollowing: false,
    isLiked: false,
  },
  {
    id: 4,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    user: '@dancer',
    profilePic: 'https://randomuser.me/api/portraits/women/2.jpg',
    likes: 1203,
    comments: 289,
    caption: "Dance like nobody's watching 💃",
    isFollowing: false,
    isLiked: false,
  },
  {
    id: 5,
    video:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    user: '@explorer',
    profilePic: 'https://randomuser.me/api/portraits/men/4.jpg',
    likes: 675,
    comments: 98,
    caption: 'Exploring new horizons 🌄',
    isFollowing: false,
    isLiked: false,
  },
];

const ReelItem = memo(({item, isActive, onLike, onShare, onFollow}) => {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const commentsTranslateY = useRef(
    new Animated.Value(COMMENTS_HEIGHT),
  ).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const handleLike = useCallback(() => {
    onLike(item.id, !item.isLiked);
  }, [item.id, item.isLiked, onLike]);

  const toggleComments = useCallback(() => {
    setShowComments(prev => {
      Animated.parallel([
        Animated.spring(commentsTranslateY, {
          toValue: prev ? COMMENTS_HEIGHT : 0,
          useNativeDriver: true,
          bounciness: 0,
        }),
        Animated.timing(backdropOpacity, {
          toValue: prev ? 0 : 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      return !prev;
    });
  }, []);
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this awesome reel by ${item.user}: ${item.video}`,
      });
      onShare(item.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [item, onShare]);

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        source={{uri: item.video}}
        style={styles.video}
        resizeMode="cover"
        repeat
        paused={!isActive}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="obey"
        onBuffer={() => setIsBuffering(true)}
        onReadyForDisplay={() => setIsBuffering(false)}
        onError={e => console.log('Video error:', e.error)}
      />

      {isBuffering && (
        <View style={styles.bufferingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.topSection}></View>

        <View style={styles.rightBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <FontAwesomeIcon
              icon={faHeart}
              size={25}
              color={item.isLiked ? '#ff3040' : 'white'}
            />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={toggleComments}>
            <FontAwesomeIcon icon={faComments} size={25} color="white" />
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <FontAwesomeIcon icon={faShare} size={25} color="white" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.userContainer}>
            <View style={styles.userInfo}>
              <Image
                source={{uri: item.profilePic}}
                style={styles.profilePic}
              />
              <Text style={styles.username}>{item.user}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.followButton,
                item.isFollowing && styles.followingButton,
              ]}
              onPress={() => onFollow(item.id)}>
              <Text style={styles.followButtonText}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.caption}>{item.caption}</Text>
        </View>

        {showComments && (
          <>
            <TouchableWithoutFeedback onPress={toggleComments}>
              <Animated.View
                style={[styles.backdrop, {opacity: backdropOpacity}]}
              />
            </TouchableWithoutFeedback>

            <Animated.View
              style={[
                styles.commentsContainer,
                {transform: [{translateY: commentsTranslateY}]},
              ]}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsHeaderText}>Comments</Text>
                <TouchableOpacity onPress={toggleComments}>
                  <FontAwesomeIcon icon={faTimes} size={24} color="white" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[]}
                renderItem={() => null}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.commentsList}
              />
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={comment}
                  onChangeText={setComment}
                />
                <TouchableOpacity style={styles.commentPostButton}>
                  <Text style={styles.commentPostText}>Post</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
});

const StatusView = ({statuses, initialIndex, onClose}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef(null);
  const videoRefs = useRef(new Map());

  useEffect(() => {
    flatListRef.current?.scrollToIndex({index: initialIndex, animated: false});
  }, [initialIndex]);

  const onViewableItemsChanged = useRef(({viewableItems}) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);
      videoRefs.current.forEach((ref, i) => {
        if (ref && i !== index) ref.seek(0);
      });
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 90,
    minimumViewTime: 300,
  }).current;

  const renderItem = ({item, index}) => (
    <View style={styles.fullScreenVideo}>
      <Video
        ref={ref => videoRefs.current.set(index, ref)}
        source={{uri: item.video}}
        style={styles.statusVideo}
        resizeMode="contain"
        repeat
        paused={index !== currentIndex}
        onError={e => console.log('Status video error:', e.error)}
      />
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <FontAwesomeIcon icon={faTimes} size={30} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal transparent={true} visible={true} animationType="slide">
      <SafeAreaView style={styles.statusModalContainer}>
        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          data={statuses}
          initialScrollIndex={initialIndex}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </SafeAreaView>
    </Modal>
  );
};
const ReelScreen = () => {
  const [reels, setReels] = useState(reelData);
  const [statuses, setStatuses] = useState(statusData);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const currentIndex = useRef(0);
  const flatListRef = useRef(null);

  const handleLike = useCallback((reelId, isLiked) => {
    setReels(prev =>
      prev.map(reel =>
        reel.id === reelId
          ? {...reel, likes: isLiked ? reel.likes + 1 : reel.likes - 1, isLiked}
          : reel,
      ),
    );
  }, []);

  const handleFollow = useCallback(reelId => {
    setReels(prev =>
      prev.map(reel =>
        reel.id === reelId ? {...reel, isFollowing: !reel.isFollowing} : reel,
      ),
    );
  }, []);

  const handleShare = useCallback(reelId => {
    setReels(prev =>
      prev.map(reel =>
        reel.id === reelId ? {...reel, shares: (reel.shares || 0) + 1} : reel,
      ),
    );
  }, []);

  const handleStatusPress = useCallback(index => {
    setStatuses(prev =>
      prev.map((status, i) =>
        i === index ? {...status, isViewed: true} : status,
      ),
    );
    setSelectedStatus(index);
  }, []);

  const onViewableItemsChanged = useRef(({viewableItems}) => {
    if (viewableItems.length > 0) {
      currentIndex.current = viewableItems[0].index;
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBarContainer}>
        <FlatList
          horizontal
          data={statuses}
          contentContainerStyle={styles.statusList}
          showsHorizontalScrollIndicator={false}
          renderItem={({item, index}) => (
            <TouchableOpacity
              style={styles.statusItem}
              onPress={() => handleStatusPress(index)}>
              <View
                style={[
                  styles.statusRing,
                  !item.isViewed && styles.unviewedStatus,
                ]}>
                <Image
                  source={{uri: item.profilePic}}
                  style={styles.statusImage}
                />
              </View>
              <Text style={styles.statusUsername}>{item.user}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      <View style={{backgroundColor: 'black', flex: 1}}>
        <FlatList
          ref={flatListRef}
          data={reels}
          keyExtractor={item => item.id.toString()}
          renderItem={({item, index}) => (
            <ReelItem
              item={item}
              isActive={index === currentIndex.current}
              onLike={handleLike}
              onShare={handleShare}
              onFollow={handleFollow}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 90,
            minimumViewTime: 300,
          }}
          snapToInterval={VIDEO_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          getItemLayout={(data, index) => ({
            length: VIDEO_HEIGHT-(TAB_BAR_HEIGHT-45),
            offset: VIDEO_HEIGHT-(TAB_BAR_HEIGHT-45) ,
            index,
          })}
        />
      </View>
      {selectedStatus !== null && (
        <StatusView
          statuses={statuses}
          initialIndex={selectedStatus}
          onClose={() => setSelectedStatus(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
  },
  video: {
    height:VIDEO_HEIGHT-(TAB_BAR_HEIGHT-45),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
  },
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rightBar: {
    position: 'absolute',
    right: 16,
    bottom: 150,
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSection: {
    marginBottom: 62,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  caption: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: 8,
  },
  statusBarContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 30 : 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingVertical: 6,
    backgroundColor: 'black',
  },
  statusList: {
    paddingHorizontal: 12,
    gap: 16,
  },
  statusItem: {
    alignItems: 'center',
    marginRight: 1,
  },
  statusRing: {
    borderRadius: 30,
    padding: 2,
    borderWidth: 2,
    borderColor: '#888',
  },
  unviewedStatus: {
    borderColor: '#ff3040',
  },
  statusImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  statusUsername: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  flatListContent: {
    paddingTop: STATUS_BAR_HEIGHT,
  },
  statusModalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  statusVideo: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: COMMENTS_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsHeaderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
  },
  commentPostButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentPostText: {
    color: '#3897f0',
    fontWeight: '600',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  statusVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
});

export default ReelScreen;
