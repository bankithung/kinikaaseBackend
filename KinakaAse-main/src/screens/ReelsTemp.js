import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
  Pressable,
  StatusBar,
  BackHandler,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faComment,
  faRetweet,
  faHeart,
  faShare,
  faPlus,
  faImage,
  faVideo,
  faXmark,
  faPlay,
  faPause,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import { BottomSheet } from 'react-native-btr';
import moment from 'moment';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { ADDRESS } from '../core/api';
import { PERMISSIONS, RESULTS, request } from 'react-native-permissions';
import secure from '../core/secure';
import utils from '../core/utils';
import useGlobal from '../core/global';
import Thumbnail from '../common/Thumbnail';
import NetInfo from '@react-native-community/netinfo';
import { ScrollView } from 'react-native-gesture-handler';
import { debounce } from 'lodash';

// Constants
const MAX_MEDIA = 4;
const RECONNECT_DELAY = 1000;
const POST_CHAR_LIMIT = 280;
const DEBOUNCE_DELAY = 300;
const PALE_YELLOW = '#FFFDE7';

const UpdateScreen = () => {
  const [composeVisible, setComposeVisible] = useState(false);
  const [posts, setPosts] = useState([]);
  const [offlinePosts, setOfflinePosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Explicitly boolean
  const [isOnline, setIsOnline] = useState(true);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const user = useGlobal(state => state.user);
  const navigation = useNavigation();
  const [nextPageUrl, setNextPageUrl] = useState(`https://${ADDRESS}/chat/posts/`);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (isMounted) {
        const online = state.isConnected ?? true;
        setIsOnline(online);
        if (online && user && !ws.current) setupWebSocket();
      }
    });

    fetchPosts().catch(err => setError(err.message));
    if (user) setupWebSocket();

    return () => {
      isMounted = false;
      unsubscribeNet();
      cleanupWebSocket();
    };
  }, [user]);

  const cleanupWebSocket = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  const setupWebSocket = useCallback(async () => {
    if (!user || ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const tokens = await secure.get('tokens');
      if (!tokens?.access) return;

      ws.current = new WebSocket(`wss://${ADDRESS}/ws/feed/?token=${tokens.access}`);

      ws.current.onopen = () => {
        utils.log('WebSocket connected');
        setError(null);
      };

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          handleWebSocketMessage(data);
        } catch (err) {
          utils.log('WebSocket message parse error:', err);
          setError('Failed to process real-time update');
        }
      };

      ws.current.onerror = (e) => {
        utils.log('WebSocket error:', e.message);
        setError('WebSocket connection failed');
        handleReconnect();
      };

      ws.current.onclose = () => {
        utils.log('WebSocket disconnected');
        handleReconnect();
      };
    } catch (error) {
      setError('WebSocket setup failed');
      handleReconnect();
    }
  }, [user]);

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'new_post':
        setPosts(prev => {
          const exists = prev.some(post => post.id === data.post.id);
          if (exists) return prev;
          setOfflinePosts(prevOffline => [data.post, ...prevOffline].slice(0, 10));
          return [data.post, ...prev];
        });
        break;
      case 'new_comment':
        setPosts(prev =>
          prev.map(post =>
            post.id === data.comment.post
              ? {
                  ...post,
                  comments_count: (post.comments_count || 0) + 1,
                  comments: [...(post.comments || []), data.comment],
                }
              : post
          )
        );
        break;
      case 'post.interaction':
        setPosts(prev =>
          prev.map(post => (post.id === data.post.id ? data.post : post))
        );
        break;
      default:
        break;
    }
  }, []);

  const handleReconnect = useCallback(() => {
    cleanupWebSocket();
    if (isOnline && user) {
      reconnectTimeout.current = setTimeout(
        () => setupWebSocket(),
        Math.min(RECONNECT_DELAY * (posts.length ? 2 : 1), 30000)
      );
    }
  }, [isOnline, posts.length, user, cleanupWebSocket]);

  const fetchPosts = useCallback(async (isRefreshing = false) => {
    if (loading || (!isRefreshing && !hasMore)) return;

    setLoading(true);
    setRefreshing(!!isRefreshing); // Ensure boolean
    setError(null);

    try {
      const url = isRefreshing ? `https://${ADDRESS}/chat/posts/` : nextPageUrl;
      const headers = {};
      const tokens = await secure.get('tokens');
      if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;

      const response = await axios.get(url, { headers, timeout: 10000 });
      const results = response.data.results || [];
      const next = response.data.next;

      setPosts(prev => {
        const existingIds = new Set(prev.map(post => post.id));
        const newPosts = results.filter(post => !existingIds.has(post.id) && post.id);
        return isRefreshing ? newPosts : [...prev, ...newPosts];
      });
      setNextPageUrl(next);
      setHasMore(!!next);
    } catch (error) {
      console.error('Fetch posts error:', error);
      if (!isOnline) {
        setPosts(offlinePosts);
        setError('Showing offline posts');
      } else {
        setError(error.response?.data?.message || 'Failed to fetch posts');
      }
    } finally {
      setLoading(false);
      setRefreshing(false); // Always boolean
    }
  }, [loading, hasMore, isOnline, nextPageUrl, offlinePosts]);

  const handleInteraction = useCallback(async (url, postId, updateFn) => {
    try {
      const headers = {};
      const tokens = await secure.get('tokens');
      if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;

      await axios.post(url, {}, { headers });
      setPosts(prev => prev.map(post => (post.id === postId ? updateFn(post) : post)));
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Interaction failed');
    }
  }, []);

  const handleLike = useCallback(
    debounce(async (postId) => {
      if (!postId) return;
      await handleInteraction(
        `https://${ADDRESS}/chat/posts/${postId}/like/`,
        postId,
        (post) => ({
          ...post,
          likes_count: post.is_liked ? (post.likes_count || 0) - 1 : (post.likes_count || 0) + 1,
          is_liked: !post.is_liked,
        })
      ).catch(err => {
        setError(err.message);
        Alert.alert('Error', err.message);
      });
    }, DEBOUNCE_DELAY),
    [handleInteraction]
  );

  const handleRetweet = useCallback(
    debounce(async (postId) => {
      if (!postId) return;
      await handleInteraction(
        `https://${ADDRESS}/chat/posts/${postId}/retweet/`,
        postId,
        (post) => ({
          ...post,
          retweets_count: post.is_retweeted ? (post.retweets_count || 0) - 1 : (post.retweets_count || 0) + 1,
          is_retweeted: !post.is_retweeted,
        })
      ).catch(err => {
        setError(err.message);
        Alert.alert('Error', err.message);
      });
    }, DEBOUNCE_DELAY),
    [handleInteraction]
  );

  const handleAddComment = useCallback(async (postId, text) => {
    if (!postId || !text?.trim()) return;

    try {
      const headers = {};
      const tokens = await secure.get('tokens');
      if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;

      const response = await axios.post(
        `https://${ADDRESS}/chat/posts/${postId}/comments/`,
        { content: text },
        { headers, 'Content-Type': 'application/json' }
      );

      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                comments_count: (post.comments_count || 0) + 1,
                comments: [...(post.comments || []), response.data],
              }
            : post
        )
      );
    } catch (error) {
      setError(error.response?.data?.content?.[0] || 'Failed to post comment');
      Alert.alert('Error', error.response?.data?.content?.[0] || 'Failed to post comment');
    }
  }, []);

  const handlePost = useCallback(async (text, media) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to post');
      return;
    }
    if (!text?.trim() && !media?.length) {
      setError('Post content or media required');
      return;
    }

    try {
      const tokens = await secure.get('tokens');
      if (!tokens?.access) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('content', text || '');

      media?.forEach((file, index) => {
        formData.append('media', {
          uri: file.uri,
          name: `media_${Date.now()}_${index}.${file.type.split('/')[1]}`,
          type: file.type,
        });
      });

      const response = await axios.post(
        `https://${ADDRESS}/chat/posts/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${tokens.access}`,
          },
          timeout: 30000,
        }
      );

      const newPostData = {
        ...response.data,
        user: {
          username: user?.username || 'Unknown',
          thumbnail: user?.thumbnail || 'https://via.placeholder.com/48',
        },
        comments: [],
        comments_count: 0,
        likes_count: 0,
        retweets_count: 0,
        is_liked: false,
        is_retweeted: false,
      };

      setPosts(prev => [newPostData, ...prev]);
      setOfflinePosts(prev => [newPostData, ...prev].slice(0, 10));
      setComposeVisible(false);
      setNewPost('');
      setSelectedMedia([]);
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create post');
      Alert.alert('Error', error.response?.data?.message || 'Failed to create post');
    }
  }, [user]);

  const renderHeader = useMemo(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Daily Feeds</Text>
      {!isOnline && (
        <Text style={styles.offlineText}>Offline Mode - Cached Edition</Text>
      )}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  ), [isOnline, error]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={PALE_YELLOW} />
      <FlatList
        data={posts}
        keyExtractor={item => item?.id?.toString() || `${Math.random()}`}
        renderItem={({ item }) => (
          <Post
            post={item}
            onLike={handleLike}
            onRetweet={handleRetweet}
            onAddComment={handleAddComment}
          />
        )}
        onEndReached={fetchPosts}
        onEndReachedThreshold={0.5}
        refreshing={!!refreshing} // Ensure boolean
        onRefresh={() => fetchPosts(true)}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#333" /> : null}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyState onCompose={() => setComposeVisible(true)} />}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity
        style={styles.composeButton}
        onPress={() => user ? setComposeVisible(true) : Alert.alert('Error', 'Please log in to post')}
        disabled={loading}
      >
        <FontAwesomeIcon icon={faPlus} size={24} color={PALE_YELLOW} />
      </TouchableOpacity>
      <ComposeModal
        visible={composeVisible}
        onClose={() => {
          setComposeVisible(false);
          setNewPost('');
          setSelectedMedia([]);
          setError(null);
        }}
        onPost={handlePost}
        newPost={newPost}
        setNewPost={setNewPost}
        selectedMedia={selectedMedia}
        setSelectedMedia={setSelectedMedia}
      />
    </SafeAreaView>
  );
};

const Post = React.memo(({ post, onLike, onRetweet, onAddComment }) => {
  const [commentText, setCommentText] = useState('');
  const [videoPaused, setVideoPaused] = useState(true);
  const videoRef = useRef(null);
  const navigation = useNavigation();

  const handleCommentSubmit = useCallback(() => {
    if (commentText.trim()) {
      onAddComment(post.id, commentText);
      setCommentText('');
    }
  }, [commentText, post.id, onAddComment]);

  const mediaContent = useMemo(() => (
    post.media?.length > 0 && (
      <View style={styles.mediaContainer}>
        {post.media.map((media, index) => (
          <View key={`${media.id || 'media'}-${index}`}>
            {media.media_type === 'image' ? (
              <Image
                source={{ uri: media.file || 'https://via.placeholder.com/150' }}
                style={styles.mediaImage}
                resizeMode="cover"
                onError={e => utils.log('Image load error:', e.nativeEvent)}
              />
            ) : (
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: media.file || '' }}
                  style={styles.video}
                  paused={videoPaused}
                  resizeMode="cover"
                  repeat
                  onError={e => utils.log('Video error:', e)}
                />
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => setVideoPaused(prev => !prev)}
                >
                  <FontAwesomeIcon
                    icon={videoPaused ? faPlay : faPause}
                    size={24}
                    color={PALE_YELLOW}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    )
  ), [post.media, videoPaused]);

  return (
    <View style={styles.postContainer}>
      <Pressable onPress={() => navigation.navigate('PostDetail', { post })}>
        <View style={styles.postHeader}>
          <Image
            source={{ uri: post.user?.thumbnail || 'https://via.placeholder.com/48' }}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.userName}>{post.user?.username || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>{moment(post.created).format('MMM D, YYYY')}</Text>
          </View>
        </View>
        <Text style={styles.postHeadline}>{post.content || ''}</Text>
        {mediaContent}
      </Pressable>
      <View style={styles.postActions}>
        <ActionButton
          icon={faComment}
          count={post.comments_count || 0}
          onPress={() => navigation.navigate('PostDetail', { post })}
        />
        <ActionButton
          icon={faRetweet}
          count={post.retweets_count || 0}
          active={post.is_retweeted}
          color="#00BA7C"
          onPress={() => onRetweet(post.id)}
        />
        <ActionButton
          icon={faHeart}
          count={post.likes_count || 0}
          active={post.is_liked}
          color="#F91880"
          onPress={() => onLike(post.id)}
        />
        <ActionButton
          icon={faShare}
          onPress={() => Share.share({
            message: `${post.user?.username || 'User'}: ${post.content || ''}`,
          })}
        />
      </View>
      <View style={styles.commentContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add your comment..."
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={handleCommentSubmit}
        />
        <TouchableOpacity onPress={handleCommentSubmit} disabled={!commentText.trim()}>
          <Text style={[styles.commentButton, !commentText.trim() && styles.disabledButton]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ActionButton = ({ icon, count, active, color = '#666', onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <FontAwesomeIcon icon={icon} color={active ? color : '#666'} size={16} />
    {count !== undefined && <Text style={styles.actionCount}>{count}</Text>}
  </TouchableOpacity>
);

const EmptyState = ({ onCompose }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyHeadline}>No Feeds Today</Text>
    <Text style={styles.emptySubhead}>
      {onCompose ? 'Be the first to report what\'s happening!' : 'No posts available.'}
    </Text>
    {onCompose && (
      <TouchableOpacity style={styles.createPostButton} onPress={onCompose}>
        <Text style={styles.createPostButtonText}>Write Article</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ComposeModal = ({
  visible,
  onClose,
  onPost,
  newPost,
  setNewPost,
  selectedMedia,
  setSelectedMedia,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const user = useGlobal(state => state.user);
  const backHandlerSubscription = useRef(null); // Subscription ref for BackHandler

  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backAction = () => {
        onClose();
        return true; // Prevent default back behavior
      };

      // Add the listener and store the subscription
      backHandlerSubscription.current = BackHandler.addEventListener('hardwareBackPress', backAction);
    }

    // Cleanup function
    return () => {
      if (Platform.OS === 'android' && backHandlerSubscription.current) {
        backHandlerSubscription.current.remove(); // Use subscription's remove method
        backHandlerSubscription.current = null;
      }
    };
  }, [visible, onClose]);

  const requestMediaPermissions = async (type) => {
    if (Platform.OS !== 'android') return true;
    
    const permission = Platform.Version >= 33
      ? type === 'video'
        ? PERMISSIONS.ANDROID.READ_MEDIA_VIDEO
        : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

    const status = await request(permission);
    if (status !== RESULTS.GRANTED) {
      Alert.alert('Permission Required', 'Please grant media access in settings');
      return false;
    }
    return true;
  };

  const handleSelectMedia = async (type) => {
    try {
      if (!(await requestMediaPermissions(type))) return;
      
      const result = await launchImageLibrary({
        mediaType: type === 'photo' ? 'photo' : 'video',
        selectionLimit: MAX_MEDIA - selectedMedia.length,
        quality: 0.8,
      });

      if (result?.assets) {
        setSelectedMedia(prev => [
          ...prev,
          ...result.assets.map(asset => ({
            type: asset.type || 'image/jpeg',
            uri: asset.uri || '',
          })),
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select media');
      console.error('Media selection error:', error);
    }
  };

  const handlePostSubmit = async () => {
    if (!newPost?.trim() && !selectedMedia?.length) return;
    
    setIsLoading(true);
    try {
      await onPost(newPost, selectedMedia);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
    >
      <View style={styles.composeContainer}>
        <View style={styles.composeHeader}>
          <TouchableOpacity onPress={onClose}>
            <FontAwesomeIcon icon={faXmark} size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postButton}
            onPress={handlePostSubmit}
            disabled={isLoading || (!newPost?.trim() && !selectedMedia.length)}
          >
            {isLoading ? (
              <ActivityIndicator color={PALE_YELLOW} />
            ) : (
              <Text style={styles.postButtonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.composeContent}>
          <Thumbnail url={user?.thumbnail || 'https://via.placeholder.com/40'} size={40} />
          <TextInput
            style={styles.composeInput}
            placeholder="Write your article..."
            multiline
            value={newPost}
            onChangeText={setNewPost}
            maxLength={POST_CHAR_LIMIT}
            autoFocus
          />
        </View>
        <Text style={styles.charCount}>{POST_CHAR_LIMIT - (newPost?.length || 0)}</Text>
        {selectedMedia?.length > 0 && (
          <ScrollView horizontal style={styles.mediaPreview}>
            {selectedMedia.map((media, index) => (
              <View key={`media-${index}`} style={styles.mediaPreviewItem}>
                <Image
                  source={{ uri: media.uri }}
                  style={styles.mediaPreviewImage}
                />
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => setSelectedMedia(prev => prev.filter((_, i) => i !== index))}
                >
                  <FontAwesomeIcon icon={faXmark} size={16} color={PALE_YELLOW} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.composeFooter}>
          <TouchableOpacity
            onPress={() => handleSelectMedia('photo')}
            disabled={selectedMedia.length >= MAX_MEDIA}
          >
            <FontAwesomeIcon icon={faImage} size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSelectMedia('video')}
            disabled={selectedMedia.length >= MAX_MEDIA}
          >
            <FontAwesomeIcon icon={faVideo} size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALE_YELLOW,
  },
  listContent: {
    paddingBottom: 80,
  },
  header: {
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    fontFamily: 'Times New Roman',
  },
  offlineText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  errorText: {
    fontSize: 14,
    color: 'red', // Corrected from '#red'
    marginTop: 5,
  },
  postContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Times New Roman',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  postHeadline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    lineHeight: 28,
    marginBottom: 10,
    fontFamily: 'Times New Roman',
  },
  mediaContainer: {
    marginBottom: 15,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 5,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  commentButton: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#999',
  },
  composeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  composeContainer: {
    backgroundColor: PALE_YELLOW,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    minHeight: Dimensions.get('window').height * 0.5,
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
  },
  postButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  postButtonText: {
    color: PALE_YELLOW,
    fontSize: 16,
    fontWeight: '600',
  },
  composeContent: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  composeInput: {
    flex: 1,
    fontSize: 18,
    color: '#000',
    lineHeight: 24,
    minHeight: 100,
    marginLeft: 15,
    fontFamily: 'Times New Roman',
  },
  charCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 10,
  },
  mediaPreview: {
    marginBottom: 15,
  },
  mediaPreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  mediaPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    padding: 5,
  },
  composeFooter: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyHeadline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Times New Roman',
  },
  emptySubhead: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  createPostButtonText: {
    color: PALE_YELLOW,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UpdateScreen;