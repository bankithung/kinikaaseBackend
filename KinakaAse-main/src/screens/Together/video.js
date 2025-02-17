
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  NativeModules,
  Dimensions,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {v4 as uuidv4} from 'uuid';
import useAudio from './useAudio';
import InCallManager from 'react-native-incall-manager';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
  faVolumeUp,
  faVolumeOff,
  faPhoneSlash,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
const {PipModule} = NativeModules;

const MusicSyncScreen = ({route, navigation}) => {
  const {roomId, host} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const playerRef = useRef(null);
  const lastSyncTime = useRef(Date.now());
  const hasInitialSync = useRef(false);
  const {
    localStream,
    remoteStream,
    endCall,
    setMuteUnmute,
    muteUnmute,
    callState,
    error,
    sendControlMessage,
    isInitiator,
    sendPlaylistUpdate,
  } = useAudio({
    roomId,
    onPlaylistUpdate: updatedPlaylist => setPlaylist(updatedPlaylist),
    onPlayPauseUpdate: playpause => setIsPlaying(playpause),
    onTrackChange: index => setCurrentTrackIndex(index),
  });

  const peerRef = useRef();
  const socketRef = useRef();
  const dataChannelRef = useRef();
  const otherUser = useRef();
  const pendingCandidates = useRef([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const screenDimensions = useRef(Dimensions.get('window'));

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    if (!isFullScreen) {
      PipModule.enterPipMode();
    }
  };

  console.log('USER FROM AUDIO', host);

  useEffect(() => {
    if (callState === 'connected' && isInitiator && !hasInitialSync.current) {
      sendControlMessage({
        type: 'PLAYLIST_SYNC',
        playlist: playlist,
        currentTrackIndex,
        currentTime,
        isPlaying,
      });
      hasInitialSync.current = true;
    }
  }, [callState, isInitiator, playlist]);

  useEffect(() => {
    if (remoteStream?.dataChannel) {
      remoteStream.dataChannel.onmessage = e => {
        const message = JSON.parse(e.data);
        const latency = Date.now() - message.timestamp;

        switch (message.type) {
          case 'PLAY':
            handleRemotePlay(message, latency);
            break;
          case 'PAUSE':
            handleRemotePause(message, latency);
            break;
          case 'SEEK':
            handleRemoteSeek(message, latency);
            break;
          case 'TRACK_CHANGE':
            handleTrackChange(message);
            break;
          case 'PLAYLIST_ADD':
            handlePlaylistAdd(message);
            break;
          case 'PLAYLIST_SYNC':
            handlePlaylistSync(message);
            break;
          case 'BUFFERING':
            setLoading(message.state);
            break;
          case 'ERROR':
            Alert.alert('Sync Error', message.message);
            break;
        }
      };
    }
  }, [remoteStream, currentTrackIndex]);

  const handleRemotePlay = message => {
    const latency = Date.now() - message.timestamp;
    const syncTime = message.time + latency / 2000;

    if (message.trackIndex !== currentTrackIndex) {
      setCurrentTrackIndex(message.trackIndex);
      playerRef.current?.seekTo(syncTime, true);
    }
    setCurrentTime(syncTime);
    setIsPlaying(true);
  };

  const handleRemotePause = (message, latency) => {
    setCurrentTime(message.time + latency / 2000);
    setIsPlaying(false);
  };

  const handleRemoteSeek = message => {
    const latency = Date.now() - message.timestamp;
    const syncTime = message.time + latency / 2000;
    setCurrentTime(syncTime);
    playerRef.current?.seekTo(syncTime, true);
  };

  const handleTrackChange = message => {
    setCurrentTrackIndex(message.trackIndex);
    setCurrentTime(0);
    setIsPlaying(message.shouldPlay);
  };

  const handlePlaylistAdd = message => {
    setPlaylist(prev => [...prev, message.track]);
  };

  const handlePlaylistSync = message => {
    if (!hasInitialSync.current) {
      setPlaylist(message.playlist);
      setCurrentTrackIndex(message.currentTrackIndex);
      setCurrentTime(message.currentTime);
      setIsPlaying(message.isPlaying);
      hasInitialSync.current = true;
    }
  };

  // Improved search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      // First fetch YouTube search results
      const searchResponse = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
          searchQuery,
        )}`,
      );
      const searchHtml = await searchResponse.text();

      // Extract video IDs from search results
      const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const videoIds = [];
      let match;
      while ((match = videoIdRegex.exec(searchHtml))) {
        videoIds.push(match[1]);
      }

      // Remove duplicates
      const uniqueVideoIds = [...new Set(videoIds)];

      // Get details for first 5 videos
      const results = [];
      for (const videoId of uniqueVideoIds.slice(0, 5)) {
        const detailsResponse = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        );
        const details = await detailsResponse.json();

        if (!details.error) {
          results.push({
            id: videoId,
            videoId: videoId,
            title: details.title,
            artist: details.author_name,
            thumbnail: details.thumbnail_url,
          });
        }
      }

      setSearchResults(results);
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search YouTube videos');
    } finally {
      setIsSearching(false);
    }
  };

  // Add to playlist from search results
  // Search and add track to playlist
  const addToPlaylist = track => {
    const newTrack = {
      id: uuidv4(),
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
    };
    sendPlaylistUpdate(newTrack);
  };

  const handleEndCall = () => {
    endCall();
    navigation.goBack();
  };

  const toggleSpeaker = () => {
    InCallManager.setForceSpeakerphoneOn(!isSpeakerOn);
    InCallManager.setSpeakerphoneOn(!isSpeakerOn);
    //InCallManager.setSpeakerphoneVolume(1.0);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleMute = () => {
    setMuteUnmute(!muteUnmute);
  };

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.onmessage = e => {
        const message = JSON.parse(e.data);
        switch (message.type) {
          case 'PLAY':
            handleRemotePlay(message);
            break;
          case 'PAUSE':
            handleRemotePause(message);
            break;
          case 'SEEK':
            handleRemoteSeek(message);
            break;
          case 'TRACK_CHANGE':
            handleTrackChange(message);
            break;
        }
      };
    }
  }, [currentTrackIndex]);

  // Handle track progression
  useEffect(() => {
    if (currentTime >= duration - 1 && duration > 0) {
      changeTrack(currentTrackIndex + 1);
    }
  }, [currentTime, duration]);

  // Play/pause handler
  const handlePlayPause = () => {
    const now = Date.now();
    const syncData = {
      type: isPlaying ? 'PAUSE' : 'PLAY',
      time: currentTime,
      timestamp: now,
      trackIndex: currentTrackIndex,
    };

    sendControlMessage(syncData);
    setIsPlaying(!isPlaying);
  };

  // Seek handler
  const handleSeek = time => {
    const syncData = {
      type: 'SEEK',
      time: Math.max(0, Math.min(time, duration)),
      timestamp: Date.now(),
      trackIndex: currentTrackIndex,
    };

    sendControlMessage(syncData);
    playerRef.current?.seekTo(syncData.time, true);
    setCurrentTime(syncData.time);
  };

  // Track change handler
  const changeTrack = index => {
    if (index < 0 || index >= playlist.length) return;

    const syncData = {
      type: 'TRACK_CHANGE',
      trackIndex: index,
      shouldPlay: isPlaying,
      timestamp: Date.now(),
    };

    sendControlMessage(syncData);
    setCurrentTrackIndex(index);
    setCurrentTime(0);
  };

  // const togglePipMode = () => {
  //   PipModule.enterPipMode();
  // };

  return (
    <View style={styles.container}>
      {/* Header <FontAwesomeIcon icon="fa-solid fa-film" />*/}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowPlaylistModal(true)}>
          <FontAwesomeIcon icon="fa-solid fa-film" size={20} color="white" />
        </TouchableOpacity>

        <Text style={styles.roomId}>Room: {roomId}</Text>

        <View style={styles.headerControls}>
          <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
            <FontAwesomeIcon
              icon={muteUnmute ? faMicrophoneSlash : faMicrophone}
              size={25}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleSpeaker()}
            style={styles.iconButton}>
            <FontAwesomeIcon
              icon={isSpeakerOn ? faVolumeUp : faVolumeOff}
              size={25}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleEndCall} style={styles.iconButton}>
            <FontAwesomeIcon icon={faPhoneSlash} size={25} color="red" />
          </TouchableOpacity>

          {/* <TouchableOpacity onPress={togglePipMode} style={styles.pipButton}>
            <FontAwesomeIcon icon="window-restore" size={20} color="white" />
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            onPress={toggleFullScreen}
            style={styles.iconButton}>
            <FontAwesomeIcon
              icon={isFullScreen ? 'compress' : 'expand'}
              size={25}
              color="white"
            />
          </TouchableOpacity> */}
        </View>
      </View>
        <View style={styles.video}>
           {/* Album Art */}
      {playlist[currentTrackIndex]?.videoId ? (
        <YoutubePlayer
          ref={playerRef}
          height={isFullScreen ? screenDimensions.current.height - 100 : 300}
          width={isFullScreen ? screenDimensions.current.width : 300}
          play={isPlaying}
          volume={100}
          videoId={playlist[currentTrackIndex].videoId}
          initialPlayerParams={{
            controls: 1, // Show native controls
            preventFullScreen: false, // Allow YouTube's fullscreen
            modestbranding: 1,
            iv_load_policy: 3,
          }}
          webViewProps={{
            allowsFullscreenVideo: true, // Enable iOS fullscreen
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
          style={[
            styles.videoPlayer,
            isFullScreen && styles.fullScreenPlayer,
          ]}
        />
      ) : (
        <View style={styles.albumArtPlaceholder}>
          <FontAwesomeIcon icon="fa-solid fa-play" size={60} color="#666" />
        </View>
      )}
        </View>
     



      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {playlist[currentTrackIndex]?.title || 'No Video selected'}
        </Text>
        <Text style={styles.trackArtist}>
          {playlist[currentTrackIndex]?.artist || 'Search for Video to add'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {width: `${(currentTime / duration) * 100}%`},
          ]}
        />
        {loading && (
          <ActivityIndicator style={styles.loadingIndicator} color="#1DB954" />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => changeTrack(currentTrackIndex - 1)}
          disabled={currentTrackIndex === 0}>
          <Image
            source={require('../../assets/previous.png')}
            style={styles.controlIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          disabled={!playlist.length}>
          <Image
            source={
              isPlaying
                ? require('../../assets/pause.png')
                : require('../../assets/play.png')
            }
            style={styles.playIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => changeTrack(currentTrackIndex + 1)}
          disabled={currentTrackIndex >= playlist.length - 1}>
          <Image
            source={require('../../assets/next.png')}
            style={styles.playIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Playlist/Search Modal */}
      <Modal visible={showPlaylistModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search and Add Tracks</Text>
            <TouchableOpacity
              onPress={() => setShowPlaylistModal(false)}
              style={styles.closeButton}>
              <Image
                source={require('../../assets/close.png')}
                style={styles.controlIcon}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search YouTube tracks..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleSearch}
              style={styles.searchButton}>
              <FontAwesomeIcon icon={faSearch} size={20} color="white" />
            </TouchableOpacity>
          </View>

          {isSearching ? (
            <ActivityIndicator size="large" color="#1DB954" />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => addToPlaylist(item)}>
                  <Image
                    source={{uri: item.thumbnail}}
                    style={styles.thumbnail}
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.searchResultChannel}>
                      {item.artist}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>
                  {searchQuery
                    ? 'No results found'
                    : 'Search for tracks to add'}
                </Text>
              }
            />
          )}

          <Text style={styles.playlistTitle}>Current Playlist</Text>
          <FlatList
            data={playlist}
            keyExtractor={item => item.id}
            renderItem={({item, index}) => (
              <TouchableOpacity
                style={[
                  styles.playlistItem,
                  index === currentTrackIndex && styles.currentTrack,
                ]}
                onPress={() => changeTrack(index)}>
                <Image
                  source={{uri: item.thumbnail}}
                  style={styles.playlistThumbnail}
                />
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistText} numberOfLines={1}>
                    {index + 1}. {item.title}
                  </Text>
                  <Text style={styles.playlistArtist}>{item.artist}</Text>
                </View>
                {index === currentTrackIndex && (
                  <Image
                    source={require('../../assets/equilizer.png')}
                    style={styles.controlIcon}
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Hidden YouTube Player */}
      {playlist[currentTrackIndex]?.videoId && (
        <YoutubePlayer
          ref={playerRef}
          height={0}
          width={0}
          play={isPlaying}
          volume={100}
          videoId={playlist[currentTrackIndex].videoId}
          initialPlayerParams={{
            controls: false,
            modestbranding: true,
            preventFullScreen: true,
            iv_load_policy: 3,
          }}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
          onChangeState={state => {
            if (state === 'ended') changeTrack(currentTrackIndex + 1);
          }}
          onReady={() => setLoading(false)}
          onError={error => {
            Alert.alert('Playback Error', 'Failed to load this track');
            changeTrack(currentTrackIndex + 1);
          }}
          onProgress={e => setCurrentTime(e.currentTime)}
          onDuration={d => setDuration(d)}
        />
      )}
      <Text style={{fontSize: 20, color: 'white'}}>Host :  {host}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  roomId: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '600',
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
  },
  albumArtPlaceholder: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    maxWidth: '90%',
  },
  trackArtist: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 30,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  loadingIndicator: {
    position: 'absolute',
    right: -20,
    top: -8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  playButton: {
    backgroundColor: '#1DB954',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
    elevation: 5,
  },
  controlButton: {
    padding: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#1DB954',
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  currentTrack: {
    borderColor: '#1DB954',
    borderWidth: 1,
  },
  playlistText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  controlIcon: {
    height: 20,
    width: 20,
    tintColor: 'white',
  },
  playIcon: {
    height: 20,
    width: 20,
    tintColor: 'white',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#1DB954',
    padding: 15,
    borderRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 15,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#fff',
    fontSize: 16,
  },
  searchResultChannel: {
    color: '#888',
    fontSize: 14,
  },
  noResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  playlistThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistArtist: {
    color: '#888',
    fontSize: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  roomId: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '600',
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
  },
  albumArtPlaceholder: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    maxWidth: '90%',
  },
  trackArtist: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 30,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  loadingIndicator: {
    position: 'absolute',
    right: -20,
    top: -8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  playButton: {
    backgroundColor: '#1DB954',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
    elevation: 5,
  },
  controlButton: {
    padding: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#1DB954',
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  currentTrack: {
    borderColor: '#1DB954',
    borderWidth: 1,
  },
  playlistText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  controlIcon: {
    height: 20,
    width: 20,
    tintColor: 'white',
  },
  playIcon: {
    height: 20,
    width: 20,
    tintColor: 'white',
  },
  closeButton: {
    bottom: 10,
    backgroundColor: 'grey',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  headerControls: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 8,
  },
  pipButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 15,
    borderRadius: 30,
    backgroundColor: '#1DB954',
  },
  videoPlayer: {
    alignSelf: 'center',
    alignItems:'center',
    borderRadius: 10,
    overflow: 'hidden', // For rounded corners
    justifyContent:'center'
  },

  // Update albumArtPlaceholder if needed
  albumArtPlaceholder: {
    width: 300,
    height: 300,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 30,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video:{
    alignItems:'center',
    justifyContent:'center',

    flex:1
  }
});

export default MusicSyncScreen;
