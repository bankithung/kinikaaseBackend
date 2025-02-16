import { useState, useRef, useEffect, useCallback } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { Platform, Alert, AppState } from 'react-native';
import { ADDRESS } from '../core/api';

// Configuration constants
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { 
    urls: 'turn:your.turn.server:3478',
    username: 'YOUR_TURN_USERNAME',
    credential: 'YOUR_TURN_CREDENTIAL'
  }
];
const WS_RECONNECT_TIMEOUT = 3000;
const MEDIA_CONSTRAINTS = {
  audio: true,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
    facingMode: 'user'
  },
};

const useVideo = ({ roomId }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraType, setCameraType] = useState('user');

  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const messageQueueRef = useRef([]);
  const isMounted = useRef(false);
  const appState = useRef(AppState.currentState);

  // WebSocket Management
  const initWebSocket = useCallback(() => {
    const setupWebSocket = () => {
      if (socketRef.current) socketRef.current.close();
      
      const wsUrl = `wss://${ADDRESS}/video?roomId=${roomId}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected');
        flushMessageQueue();
      };

      socketRef.current.onmessage = handleWebSocketMessage;
      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        scheduleReconnection();
      };
      socketRef.current.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        if (isMounted.current) scheduleReconnection();
      };
    };

    const handleWebSocketMessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        switch (data.type) {
          case 'OFFER':
            handleOffer(data.payload);
            break;
          case 'ANSWER':
            handleAnswer(data.payload);
            break;
          case 'ICE_CANDIDATE':
            handleIceCandidate(data.candidate);
            break;
          case 'PEER_DISCONNECTED':
            handlePeerDisconnected();
            break;
          default:
            console.warn('Unhandled message type:', data.type);
        }
      } catch (error) {
        console.error('Message handling error:', error);
      }
    };

    const scheduleReconnection = () => {
      if (!reconnectTimeoutRef.current && isMounted.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting WebSocket reconnection...');
          setupWebSocket();
          reconnectTimeoutRef.current = null;
        }, WS_RECONNECT_TIMEOUT);
      }
    };

    const flushMessageQueue = () => {
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        socketRef.current.send(JSON.stringify(message));
      }
    };

    setupWebSocket();
  }, [roomId]);

  // WebRTC Management
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'relay',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendSignal({ type: 'ICE_CANDIDATE', candidate });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setConnectionState(state);
      if (state === 'disconnected' || state === 'failed') {
        cleanupResources();
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'OFFER', payload: pc.localDescription });
      } catch (error) {
        console.error('Negotiation error:', error);
      }
    };

    return pc;
  }, []);

  // Media Management
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Media error:', error);
      Alert.alert('Error', 'Camera/Microphone access required');
      return null;
    }
  }, []);

  // Message Handling
  const sendSignal = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
    }
  }, []);

  const handleOffer = useCallback(async (offer) => {
    if (!peerRef.current) {
      const stream = await initializeMedia();
      if (!stream) return;

      peerRef.current = createPeerConnection();
      stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));
    }

    try {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      sendSignal({ type: 'ANSWER', payload: peerRef.current.localDescription });
    } catch (error) {
      console.error('Offer handling error:', error);
    }
  }, [initializeMedia, createPeerConnection]);

  const handleAnswer = useCallback(async (answer) => {
    try {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Answer handling error:', error);
    }
  }, []);

  const handleIceCandidate = useCallback((candidate) => {
    if (peerRef.current) {
      peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(error => console.error('ICE candidate error:', error));
    }
  }, []);

  // Cleanup Management
  const cleanupResources = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
    setConnectionState('disconnected');
  }, [localStream]);

  const handlePeerDisconnected = useCallback(() => {
    Alert.alert('Peer disconnected');
    cleanupResources();
  }, [cleanupResources]);

  // App State Management
  const handleAppStateChange = useCallback((nextState) => {
    if (appState.current.match(/inactive|background/) && nextState === 'active') {
      initializeMedia();
    }
    appState.current = nextState;
  }, [initializeMedia]);

  // Effects
  useEffect(() => {
    isMounted.current = true;
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    initWebSocket();
    initializeMedia();

    return () => {
      isMounted.current = false;
      appStateSubscription.remove();
      cleanupResources();
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [initWebSocket, initializeMedia, handleAppStateChange, cleanupResources]);

  // Media Controls
  const switchCamera = useCallback(async () => {
    const newType = cameraType === 'user' ? 'environment' : 'user';
    setCameraType(newType);

    try {
      const newStream = await mediaDevices.getUserMedia({
        ...MEDIA_CONSTRAINTS,
        video: { ...MEDIA_CONSTRAINTS.video, facingMode: newType }
      });

      setLocalStream(prev => {
        prev?.getTracks().forEach(track => track.stop());
        return newStream;
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const sender = peerRef.current?.getSenders()
        .find(s => s.track?.kind === 'video');
      
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    } catch (error) {
      console.error('Camera switch error:', error);
    }
  }, [cameraType]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  }, [localStream, isCameraOn]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isCameraOn,
    switchCamera,
    toggleMute,
    toggleCamera,
    endCall: cleanupResources,
  };
};

export default useVideo;