import io from "socket.io-client";

const signalingServer = "ws://55a8-103-55-63-46.ngrok-free.app/ws/video-call/";
const socket = io(signalingServer + "room_name");

socket.on("connect", () => {
    console.log("Connected to signaling server");
});

socket.on("message", (data) => {
    handleSignalingData(data);
});

function sendSignalingData(data) {
    socket.emit("message", data);
}
