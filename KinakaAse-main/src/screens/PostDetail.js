import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faComment,
  faRetweet,
  faHeart,
  faShare,
  faPlay,
  faPause,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import Video from 'react-native-video';
import moment from 'moment';
import axios from 'axios';
import {ADDRESS} from '../core/api';
import secure from '../core/secure';

const PostDetail = () => {
  const route = useRoute();
  const {post: initialPost} = route.params;
  const navigation = useNavigation();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(initialPost.comments || []);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);
  const [isCommenting, setIsCommenting] = useState(false);
  const videoRef = useRef(null);

  console.log(post);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}>
          <FontAwesomeIcon icon={faTimes} size={24} color="#1DA1F2" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchComments = useCallback(async () => {
    try {
      const tokens = await secure.get('tokens');
      const response = await axios.get(
        `https://${ADDRESS}/chat/posts/${post.id}/comments/`,
        {headers: {Authorization: `Bearer ${tokens.access}`}},
      );
      setComments(response.data);
    } catch (error) {
      // Alert.alert('Error', 'Failed to fetch comments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [post.id]);

  const fetchPostDetails = useCallback(async () => {
    try {
      const tokens = await secure.get('tokens');
      const response = await axios.get(
        `https://${ADDRESS}/chat/posts/${post.id}/`,
        {headers: {Authorization: `Bearer ${tokens.access}`}},
      );
      setPost(response.data);
    } catch (error) {
      // Alert.alert('Error', 'Failed to fetch post details');
    }
  }, [post.id]);

  useEffect(() => {
    if (!initialPost.comments) {
      setLoading(true);
      fetchComments();
    }
  }, [fetchComments, initialPost.comments]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComments();
    fetchPostDetails();
  }, [fetchComments, fetchPostDetails]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setIsCommenting(true);

    try {
      const tokens = await secure.get('tokens');
      const response = await axios.post(
        `https://${ADDRESS}/chat/posts/${post.id}/comments/`,
        {content: commentText},
        {
          headers: {
            Authorization: `Bearer ${tokens.access}`,
            'Content-Type': 'application/json',
          },
        },
      );

      setComments(prev => [response.data, ...prev]);
      setCommentText('');
      await fetchPostDetails();
    } catch (error) {
      // Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleLike = async () => {
    const originalPost = {...post};
    try {
      setPost(prev => ({
        ...prev,
        is_liked: !prev.is_liked,
        likes_count: prev.likes_count + (prev.is_liked ? -1 : 1),
      }));

      const tokens = await secure.get('tokens');
      await axios.post(
        `https://${ADDRESS}/chat/posts/${post.id}/like/`,
        {},
        {headers: {Authorization: `Bearer ${tokens.access}`}},
      );
    } catch (error) {
      setPost(originalPost);
      // Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleRetweet = async () => {
    const originalPost = {...post};
    try {
      setPost(prev => ({
        ...prev,
        is_retweeted: !prev.is_retweeted,
        retweets_count: prev.retweets_count + (prev.is_retweeted ? -1 : 1),
      }));

      const tokens = await secure.get('tokens');
      await axios.post(
        `https://${ADDRESS}/chat/posts/${post.id}/retweet/`,
        {},
        {headers: {Authorization: `Bearer ${tokens.access}`}},
      );
    } catch (error) {
      setPost(originalPost);
      // Alert.alert('Error', 'Failed to update retweet status');
    }
  };

  const handleShare = () => {
    Share.share({
      message: `${post.user.username}: ${post.content}`,
      url: post.media?.[0]?.file,
    }).catch(error => console.log('Error sharing:', error));
  };

  const renderMedia = (media, index) => {
    if (media.media_type === 'image') {
      return (
        <Image
          key={index}
          source={{uri: media.file}}
          style={styles.mediaImage}
          resizeMode="contain"
        />
      );
    }
    return (
      <View key={index} style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{uri: media.file}}
          style={styles.video}
          paused={videoPaused}
          resizeMode="contain"
          repeat
          controls={false}
        />
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => setVideoPaused(!videoPaused)}
          accessibilityLabel={videoPaused ? 'Play video' : 'Pause video'}>
          <FontAwesomeIcon
            icon={videoPaused ? faPlay : faPause}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderComment = ({item}) => (
    <View style={styles.commentItem}>
      <Image
        source={{uri: item.user.thumbnail || 'https://via.placeholder.com/32'}}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{item.user.username}</Text>
          <Text style={styles.commentTimestamp}>
            {moment(item.created).fromNow()}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <FlatList
          data={comments}
          keyExtractor={item => item.id.toString()}
          renderItem={renderComment}
          ListHeaderComponent={
            <View style={styles.postContainer}>
              <View style={styles.postHeader}>
                <Image
                  source={{uri: post.user.thumbnail}}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{post.user.username}</Text>
                  <Text style={styles.timestamp}>
                    {moment(post.created).fromNow()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => navigation.goBack()}>
                  <FontAwesomeIcon icon={faTimes} size={24} color="#1DA1F2" />
                </TouchableOpacity>
              </View>

              <Text style={styles.postText}>{post.content}</Text>

              {post.media?.length > 0 && (
                <View style={styles.mediaContainer}>
                  {post.media.map(renderMedia)}
                </View>
              )}

              <View style={styles.postStats}>
                <Text style={styles.statText}>
                  {post.retweets_count} Retweets
                </Text>
                <Text style={styles.statText}>{post.likes_count} Likes</Text>
              </View>

              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Comment">
                  <FontAwesomeIcon icon={faComment} color="#657786" size={20} />
                  <Text style={styles.actionCount}>{post.comments.length}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRetweet}
                  accessibilityRole="button"
                  accessibilityLabel={
                    post.is_retweeted ? 'Undo retweet' : 'Retweet'
                  }>
                  <FontAwesomeIcon
                    icon={faRetweet}
                    color={post.is_retweeted ? '#00BA7C' : '#657786'}
                    size={20}
                  />
                  <Text style={styles.actionCount}>{post.retweets_count}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleLike}
                  accessibilityRole="button"
                  accessibilityLabel={
                    post.is_liked ? 'Unlike post' : 'Like post'
                  }>
                  <FontAwesomeIcon
                    icon={faHeart}
                    color={post.is_liked ? '#E2264D' : '#657786'}
                    size={20}
                  />
                  <Text style={styles.actionCount}>{post.likes_count}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share post">
                  <FontAwesomeIcon icon={faShare} color="#657786" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1DA1F2"
            />
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No comments yet</Text>
              </View>
            )
          }
          ListFooterComponent={
            loading && <ActivityIndicator size="large" color="#1DA1F2" />
          }
        />

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#657786"
            value={commentText}
            onChangeText={setCommentText}
            editable={!isCommenting}
            multiline
          />
          <TouchableOpacity
            style={styles.commentButton}
            onPress={handleAddComment}
            disabled={!commentText.trim() || isCommenting}>
            {isCommenting ? (
              <ActivityIndicator color="#1DA1F2" />
            ) : (
              <Text style={styles.commentButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15202B',
  },
  flex: {
    flex: 1,
  },
  postContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38444D',
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timestamp: {
    color: '#657786',
    fontSize: 14,
  },
  postText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  mediaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mediaImage: {
    width: '100%',
    height: 300,
  },
  videoContainer: {
    height: 300,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 50,
  },
  postStats: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 16,
  },
  statText: {
    color: '#657786',
    fontSize: 14,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  actionCount: {
    color: '#657786',
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38444D',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentTimestamp: {
    color: '#657786',
    fontSize: 12,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#38444D',
    backgroundColor: '#15202B',
  },
  commentInput: {
    flex: 1,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#38444D',
    borderRadius: 24,
    padding: 12,
    fontSize: 16,
    maxHeight: 120,
  },
  commentButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentButtonText: {
    color: '#1DA1F2',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#657786',
    fontSize: 16,
  },
  closeButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
});

export default PostDetail;
