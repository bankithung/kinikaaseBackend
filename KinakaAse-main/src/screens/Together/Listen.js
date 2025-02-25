import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { v4 as uuidv4 } from 'uuid';
import useAudio from './useAudio';
import InCallManager from 'react-native-incall-manager';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
  faVolumeUp,
  faVolumeOff,
  faPhoneSlash,
  faSearch,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

const MusicSyncScreen = ({ route, navigation }) => {
  const { roomId, host } = route.params;
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
  const [showParticipants, setShowParticipants] = useState(false);

  const playerRef = useRef(null);
  const lastSyncTime = useRef(Date.now());
  const hasInitialSync = useRef(false);

  const {
    localStream,
    remoteStreams,
    endCall,
    toggleMute,
    muteUnmute,
    callState,
    error,
    sendControlMessage,
    isInitiator,
    sendPlaylistUpdate,
  } = useAudio({
    roomId,
    onPlaylistUpdate: (updatedPlaylist) => setPlaylist(updatedPlaylist),
    onPlayPauseUpdate: (playpause) => setIsPlaying(playpause),
    onTrackChange: (index) => setCurrentTrackIndex(index),
  });

  // Initialize InCallManager for audio routing
  useEffect(() => {
    InCallManager.start({ media: 'audio', auto: true });
    InCallManager.setSpeakerphoneOn(isSpeakerOn);
    return () => {
      InCallManager.stop();
    };
  }, []);

  // Update speakerphone state
  useEffect(() => {
    InCallManager.setSpeakerphoneOn(isSpeakerOn);
  }, [isSpeakerOn]);

  // Initial sync for initiator
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

  // Handle track progression
  useEffect(() => {
    if (currentTime >= duration - 1 && duration > 0) {
      changeTrack(currentTrackIndex + 1);
    }
  }, [currentTime, duration]);

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

  const handleSeek = (time) => {
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

  const changeTrack = (index) => {
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      const searchResponse = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
      );
      const searchHtml = await searchResponse.text();
      const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const videoIds = [];
      let match;
      while ((match = videoIdRegex.exec(searchHtml))) {
        videoIds.push(match[1]);
      }
      const uniqueVideoIds = [...new Set(videoIds)];
      const results = [];
      for (const videoId of uniqueVideoIds.slice(0, 5)) {
        const detailsResponse = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
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

  const addToPlaylist = (track) => {
    const newTrack = {
      id: uuidv4(),
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
    };
    sendPlaylistUpdate(newTrack);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  const handleEndCall = () => {
    endCall();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowPlaylistModal(true)}>
          <FontAwesomeIcon icon="fa-solid fa-headphones" size={20} color="white" />
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
          <TouchableOpacity onPress={toggleSpeaker} style={styles.iconButton}>
            <FontAwesomeIcon
              icon={isSpeakerOn ? faVolumeUp : faVolumeOff}
              size={25}
              color="white"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowParticipants(true)} style={styles.iconButton}>
            <FontAwesomeIcon icon={faUsers} size={25} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEndCall} style={styles.iconButton}>
            <FontAwesomeIcon icon={faPhoneSlash} size={25} color="red" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Album Art */}
      {playlist[currentTrackIndex]?.thumbnail ? (
        <Image
          source={{ uri: playlist[currentTrackIndex].thumbnail }}
          style={styles.albumArt}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.albumArtPlaceholder}>
          <FontAwesomeIcon icon="music" size={60} color="#666" />
        </View>
      )}

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {playlist[currentTrackIndex]?.title || 'No track selected'}
        </Text>
        <Text style={styles.trackArtist}>
          {playlist[currentTrackIndex]?.artist || 'Search for tracks to add'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${(currentTime / duration) * 100}%` },
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
          disabled={currentTrackIndex === 0}
        >
          <Image
            source={require('../../assets/previous.png')}
            style={styles.controlIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          disabled={!playlist.length}
        >
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
          disabled={currentTrackIndex >= playlist.length - 1}
        >
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
              style={styles.closeButton}
            >
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
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <FontAwesomeIcon icon={faSearch} size={20} color="white" />
            </TouchableOpacity>
          </View>
          {isSearching ? (
            <ActivityIndicator size="large" color="#1DB954" />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => addToPlaylist(item)}
                >
                  <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.searchResultChannel}>{item.artist}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>
                  {searchQuery ? 'No results found' : 'Search for tracks to add'}
                </Text>
              }
            />
          )}
          <Text style={styles.playlistTitle}>Current Playlist</Text>
          <FlatList
            data={playlist}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.playlistItem,
                  index === currentTrackIndex && styles.currentTrack,
                ]}
                onPress={() => changeTrack(index)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
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

      {/* Participants Modal */}
      <Modal visible={showParticipants} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Participants</Text>
            <TouchableOpacity
              onPress={() => setShowParticipants(false)}
              style={styles.closeButton}
            >
              <Image
                source={require('../../assets/close.png')}
                style={styles.controlIcon}
              />
            </TouchableOpacity>
          </View>
          <FlatList
            data={Object.keys(remoteStreams)}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <View style={styles.participantItem}>
                <Text style={styles.participantText}>
                  User {item.slice(0, 8)} {/* Placeholder; replace with username if available */}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.noResultsText}>No other participants</Text>
            }
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
          onChangeState={(state) => {
            if (state === 'ended') changeTrack(currentTrackIndex + 1);
          }}
          onReady={() => setLoading(false)}
          onError={(error) => {
            Alert.alert('Playback Error', 'Failed to load this track');
            changeTrack(currentTrackIndex + 1);
          }}
          onProgress={(e) => setCurrentTime(e.currentTime)}
          onDuration={(d) => setDuration(d)}
        />
      )}
      <Text style={{ fontSize: 24, color: 'white' }}>{host}</Text>
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
  headerControls: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 8,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  playlistThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  playlistArtist: {
    color: '#888',
    fontSize: 12,
  },
  participantItem: {
    padding: 15,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 10,
  },
  participantText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default MusicSyncScreen;