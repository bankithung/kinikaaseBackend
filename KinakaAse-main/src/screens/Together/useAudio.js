import {useState, useRef, useEffect} from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import {Platform, Alert} from 'react-native';
import {ADDRESS} from '../../core/api';

const useAudio = ({roomId, onPlaylistUpdate, onPlayPauseUpdate,onTrackChange}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muteUnmute, setMuteUnmute] = useState(true);
  const [callState, setCallState] = useState('connecting');
  const [error, setError] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);

  const peerRef = useRef();
  const socketRef = useRef();
  const dataChannelRef = useRef();
  const otherUser = useRef();
  const pendingCandidates = useRef([]);

  useEffect(() => {
    initializeConnection();
    return () => endCall();
  }, []);
  //console.log(`wss://${ADDRESS}/music/`)



  const initializeConnection = async () => {
    try {
      socketRef.current = new WebSocket(`wss://${ADDRESS}/music/`);
      const stream = await mediaDevices.getUserMedia({audio: true});
      setLocalStream(stream);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected, sending JOIN message');
        socketRef.current.send(JSON.stringify({type: 'JOIN', payload: roomId}));
      };

      socketRef.current.onmessage = message => {
        console.log('WebSocket message received:', message.data);
        handleWebSocketMessage(message);
      };

      socketRef.current.onerror = error => {
        console.error('WebSocket error:', error);
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } catch (err) {
      console.error('Failed to initialize connection:', err);
      setError('Failed to initialize connection');
    }
  };

  const handleWebSocketMessage = message => {
    const data = JSON.parse(message.data);
    switch (data.type) {
      case 'PLAYLIST_ADD':
        onPlaylistUpdate(prev => [...prev, data.track]);
        break;
      case 'PLAYLIST_SYNC':
        if (data.initiator !== socketRef.current?.url) {
          onPlaylistUpdate(data.playlist);
        }
        break;
      case 'PLAY':
        console.log('this isd from use AUDIO', data.type);
        const temp = data.type === 'PLAY' ? true : false;
        onPlayPauseUpdate(temp);
        break;
      case 'PAUSE':
          console.log('this isd from use AUDIO', data.type);
          const temps = data.type === 'PAUSE' ? false : true;
          onPlayPauseUpdate(temps);
          break;
      case 'TRACK_CHANGE':
            console.log('this isd from use AUDIO', data.trackIndex);
            
            onTrackChange(data.trackIndex);
            break;
  

      case 'OTHER_USER':
        otherUser.current = data.payload;
        handleOtherUser(data.payload);
        break;
      case 'OFFER':
        handleOffer(data);
        break;
      case 'ANSWER':
        handleAnswer(data);
        break;
      case 'ICE_CANDIDATE':
        handleNewICECandidateMsg(data.candidate);
        break;
      case 'USER_JOINED':
        otherUser.current = data.payload;
        break;
    }
  };
  const sendPlaylistUpdate = track => {
    socketRef.current.send(
      JSON.stringify({
        type: 'PLAYLIST_ADD',
        track: track,
        roomId: roomId,
      }),
    );
  };

  const createPeerConnection = userID => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {urls: 'stun:64.227.183.239:3478'},
        {
          urls: 'turn:64.227.183.239:3478',
          credential: 'bujulo',
          username: 'bujulo',
        },
      ],
    });

    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

    if (isInitiator) {
      const dc = peer.createDataChannel('controlChannel');
      setupDataChannel(dc);
    } else {
      peer.ondatachannel = ({channel}) => {
        setupDataChannel(channel);
      };
    }

    peer.onicecandidate = handleICECandidate;
    peer.ontrack = handleTrackEvent;

    return peer;
  };

  const setupDataChannel = dc => {
    dataChannelRef.current = dc;
    dc.onopen = () => {
      console.log('Data channel opened');
      if (isInitiator) {
        sendControlMessage({
          type: 'PLAYLIST_SYNC',
          playlist,
          currentTrackIndex,
          currentTime,
          isPlaying,
        });
      }
    };
    dc.onmessage = handleDataChannelMessage;
  };

  const sendControlMessage = message => {
    console.log('SENDING CONTROL MESSAGE', message);

    socketRef.current.send(JSON.stringify(message));
  };

  // const sendPlaylistUpdate = (track) => {
  //   socketRef.current.send(JSON.stringify({
  //     type: 'PLAYLIST_ADD',
  //     track: track,
  //     roomId: roomId
  //   }));
  // };

  const handleOtherUser = userID => {
    setIsInitiator(true);
    peerRef.current = createPeerConnection(userID);
    createAndSendOffer(userID);
  };

  const createAndSendOffer = async userID => {
    try {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      socketRef.current.send(
        JSON.stringify({
          type: 'OFFER',
          target: userID,
          sdp: offer,
        }),
      );
    } catch (err) {
      setError('Failed to create offer');
    }
  };

  const handleOffer = async data => {
    peerRef.current = createPeerConnection(data.target);
    await peerRef.current.setRemoteDescription(
      new RTCSessionDescription(data.sdp),
    );
    pendingCandidates.current.forEach(candidate => {
      peerRef.current.addIceCandidate(candidate);
    });
    pendingCandidates.current = [];
    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);
    socketRef.current.send(
      JSON.stringify({
        type: 'ANSWER',
        target: otherUser.current,
        sdp: answer,
      }),
    );
  };

  const handleAnswer = async data => {
    await peerRef.current.setRemoteDescription(
      new RTCSessionDescription(data.sdp),
    );
  };

  const handleICECandidate = event => {
    if (event.candidate) {
      socketRef.current.send(
        JSON.stringify({
          type: 'ICE_CANDIDATE',
          target: otherUser.current,
          candidate: event.candidate,
        }),
      );
    }
  };

  const handleNewICECandidateMsg = candidate => {
    const iceCandidate = new RTCIceCandidate(candidate);
    if (peerRef.current) {
      peerRef.current.addIceCandidate(iceCandidate);
    } else {
      pendingCandidates.current.push(iceCandidate);
    }
  };

  const handleTrackEvent = event => {
    setRemoteStream(event.streams[0]);
  };

  const endCall = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (peerRef.current) peerRef.current.close();
    if (socketRef.current) socketRef.current.close();
  };

  return {
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
  };
};

export default useAudio;
