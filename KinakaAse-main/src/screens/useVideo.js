import { useState, useRef, useEffect } from "react";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
} from "react-native-webrtc";
import { Platform, Alert } from "react-native";
import { ADDRESS } from "../core/api";

const useVideo = ({ roomId }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [muteUnmute, setMuteUnmute] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraType, setCameraType] = useState("user"); // "user" for front, "environment" for back
  console.log("mute:",muteUnmute )
  const peerRef = useRef();
  const socketRef = useRef();
  const otherUser = useRef();
  const pendingCandidates = useRef([]);

  const deviceName = `${Platform.OS} ${Platform.Version}`;

  useEffect(() => {
    socketRef.current = new WebSocket(`wss://${ADDRESS}/video/`);
    startLocalStream();

    socketRef.current.onopen = () => {
      console.log(`${deviceName}: Video WebSocket opened`);
      socketRef.current.send(JSON.stringify({ type: "JOIN", payload: roomId }));
    };

    socketRef.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      switch (data.type) {
        case "OTHER_USER":
          callUser(data.payload);
          otherUser.current = data.payload;
          break;
        case "USER_JOINED":
          otherUser.current = data.payload;
          break;
        case "OFFER":
          handleOffer(data);
          break;
        case "ANSWER":
          handleAnswer(data);
          break;
        case "ICE_CANDIDATE":
          handleNewICECandidateMsg(data.candidate);
          break;
      }
    };

    return () => {
      endCall();
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = muteUnmute;
      }
    }
  }, [muteUnmute]);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOn;
      }
    }
  }, [isCameraOn]);

  const startLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: cameraType,
          width: 640,
          height: 480,
          frameRate: 30,
        },
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.log("Error accessing media devices:", err);
      Alert.alert("Error", "Please check your camera and microphone permissions.");
    }
  };

  const switchCamera = async () => {
    if (!localStream) return;

    // Stop the current video track
    localStream.getVideoTracks().forEach((track) => track.stop());

    // Toggle camera type
    setCameraType((prevType) => (prevType === "user" ? "environment" : "user"));

    // Restart the stream with the updated camera type
    const newStream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: cameraType === "user" ? "environment" : "user",
        width: 640,
        height: 480,
        frameRate: 30,
      },
    });

    setLocalStream(newStream);

    // Update the peer connection with the new video track
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = peerRef.current
      ?.getSenders()
      .find((s) => s.track.kind === "video");

    if (sender) {
      sender.replaceTrack(videoTrack);
    }
  };

  const Peer = (userID) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:64.227.183.239:3478" },
        {
          urls: "turn:64.227.183.239:3478",
          credential: "bujulo",
          username: "bujulo",
        },
      ],
    });

    peer.addEventListener("track", handleTrackEvent);
    peer.addEventListener("icecandidate", handleICECandidateEvent);
    peer.addEventListener("negotiationneeded", (event) => {
      handleNegotiationNeededEvent(userID);
    });

    return peer;
  };

  const callUser = async (userID) => {
    console.log(`${deviceName} : Initiated a call to ${userID}`);
    const stream = await startLocalStream();
    if (!stream) return;

    setIsCalling(true);
    peerRef.current = Peer(userID);
    stream.getTracks().forEach((track) =>
      peerRef.current.addTrack(track, stream)
    );
  };

  const handleNegotiationNeededEvent = async (userID) => {
    try {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socketRef.current.send(
        JSON.stringify({
          type: "OFFER",
          target: userID,
          sdp: peerRef.current.localDescription,
        })
      );
    } catch (err) {
      console.log("Error creating offer:", err);
    }
  };

  const handleOffer = async (incoming) => {
    const stream = await startLocalStream();
    if (!stream) return;

    peerRef.current = Peer(incoming.target);
    stream.getTracks().forEach((track) =>
      peerRef.current.addTrack(track, stream)
    );

    try {
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(incoming.sdp)
      );

      pendingCandidates.current.forEach((candidate) =>
        peerRef.current.addIceCandidate(candidate)
      );
      pendingCandidates.current = [];

      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);

      socketRef.current.send(
        JSON.stringify({
          type: "ANSWER",
          target: otherUser.current,
          sdp: peerRef.current.localDescription,
        })
      );
    } catch (err) {
      console.log("Error handling offer:", err);
    }
  };

  const handleAnswer = async (message) => {
    try {
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(message.sdp)
      );
    } catch (err) {
      console.log("Error handling answer:", err);
    }
  };

  const handleICECandidateEvent = (e) => {
    if (e.candidate) {
      socketRef.current.send(
        JSON.stringify({
          type: "ICE_CANDIDATE",
          target: otherUser.current,
          candidate: e.candidate,
        })
      );
    }
  };

  const handleNewICECandidateMsg = (candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    if (peerRef.current?.remoteDescription?.type) {
      peerRef.current
        .addIceCandidate(iceCandidate)
        .catch((e) => console.log("Error adding ICE candidate:", e));
    } else {
      pendingCandidates.current.push(iceCandidate);
    }
  };

  const handleTrackEvent = (event) => {
    setRemoteStream(event.streams[0]);
  };

  const endCall = () => {
    console.log("SOCKET CLOSED");
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    setIsCalling(false);
  };

  return {
    localStream,
    remoteStream,
    isCalling,
    callUser,
    endCall,
    setMuteUnmute,
    muteUnmute,
    isCameraOn,
    setIsCameraOn,
    switchCamera, // Expose the switchCamera function
  };
};

export default useVideo;