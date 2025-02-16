import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text } from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';

const VideoCall = ({ roomName }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isCallStarted, setIsCallStarted] = useState(false);
    const peerConnection = useRef(new RTCPeerConnection());
    const socket = useRef(io('wss://9d3e-103-55-63-46.ngrok-free.app/ws/video-call/' + roomName + '/'));

    useEffect(() => {
        // Get user media (camera & microphone)
        mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setLocalStream(stream);
            // Add tracks from the local stream to the peer connection
            stream.getTracks().forEach(track => {
                peerConnection.current.addTrack(track, stream);
            });
        });

        // Handle incoming WebSocket messages
        socket.current.on('message', async (message) => {
            if (message.type === 'offer') {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                socket.current.emit('message', { type: 'answer', sdp: answer });
            } else if (message.type === 'answer') {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message));
            } else if (message.type === 'candidate') {
                const candidate = new RTCIceCandidate(message);
                await peerConnection.current.addIceCandidate(candidate);
            }
        });

        // Send ICE candidates to the other peer
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.current.emit('message', { type: 'candidate', candidate: event.candidate });
            }
        };

        // Handle remote stream
        peerConnection.current.ontrack = (event) => {
            const [stream] = event.streams;
            setRemoteStream(stream);
        };

        return () => {
            socket.current.disconnect();
            peerConnection.current.close();
        };
    }, []);

    const createOffer = async () => {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.current.emit('message', { type: 'offer', sdp: offer });
        setIsCallStarted(true);
    };

    const joinCall = async () => {
        setIsCallStarted(true);
    };

    return (
        <View style={{ flex: 1 }}>
            {!isCallStarted ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Welcome to the Video Call Room: {roomName}</Text>
                    <Button title="Start Call" onPress={createOffer} />
                    <Button title="Join Call" onPress={joinCall} />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {localStream && <RTCView streamURL={localStream.toURL()} style={{ flex: 1 }} />}
                    {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={{ flex: 1 }} />}
                </View>
            )}
        </View>
    );
};

export default VideoCall;
