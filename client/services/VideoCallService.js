import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import ChatService from './ChatService';

class VideoCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.onRemoteStreamCallback = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  async initializeCall(onRemoteStream) {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);
      this.onRemoteStreamCallback = onRemoteStream;

      this.peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          ChatService.socket.emit('ice-candidate', { candidate });
        }
      };

      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      };

      return true;
    } catch (error) {
      console.error('Error initializing call:', error);
      throw error;
    }
  }

  async startCall(targetUserId) {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      ChatService.socket.emit('call-user', {
        targetUserId,
        offer
      });
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async handleIncomingCall(offer, callerId) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      ChatService.socket.emit('call-accepted', {
        targetUserId: callerId,
        answer
      });
    } catch (error) {
      console.error('Error handling incoming call:', error);
      throw error;
    }
  }

  async handleCallAccepted(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling accepted call:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ice candidate:', error);
      throw error;
    }
  }

  async setLocalStream(stream) {
    this.localStream = stream;
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.onRemoteStreamCallback = null;
  }
}

export default new VideoCallService();