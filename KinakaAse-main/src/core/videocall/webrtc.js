import { RTCPeerConnection, RTCSessionDescription } from "react-native-webrtc";

const peerConnection = new RTCPeerConnection({
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
    ],
});

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        sendSignalingData({
            type: "candidate",
            candidate: event.candidate,
        });
    }
};

peerConnection.ontrack = (event) => {
    // Handle remote stream
    remoteVideo.srcObject = event.streams[0];
};

function createOffer() {
    peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(new RTCSessionDescription(offer));
        sendSignalingData({
            type: "offer",
            offer: offer,
        });
    });
}

function handleSignalingData(data) {
    if (data.type === "offer") {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        peerConnection.createAnswer().then((answer) => {
            peerConnection.setLocalDescription(new RTCSessionDescription(answer));
            sendSignalingData({
                type: "answer",
                answer: answer,
            });
        });
    } else if (data.type === "answer") {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === "candidate") {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}
