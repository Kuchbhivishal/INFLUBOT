import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

// Mock data for call history - this would come from an API
const CALL_HISTORY = [
  {
    id: '1',
    name: 'Sarah Williams',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    timestamp: '2023-04-08T14:30:00Z',
    duration: '8:45',
    callType: 'video',
    status: 'completed',
    amount: 550,
  },
  {
    id: '2',
    name: 'John Doe',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    timestamp: '2023-04-07T10:15:00Z',
    duration: '12:20',
    callType: 'audio',
    status: 'completed',
    amount: 350,
  },
  {
    id: '3',
    name: 'Alice Smith',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    timestamp: '2023-04-06T18:45:00Z',
    duration: '0:00',
    callType: 'video',
    status: 'missed',
    amount: 0,
  },
  // Additional history items...
];

const CallsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { socket, isConnected, sendMessage } = useSocket();
  const [callHistory, setCallHistory] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // References for WebRTC
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  
  // References for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // Fetch call history
    fetchCallHistory();
    
    // Set up call event listeners if socket is connected
    if (socket && isConnected) {
      // Listen for incoming calls
      socket.addEventListener('message', handleSocketMessage);
    }
    
    return () => {
      // Clean up event listeners
      if (socket) {
        socket.removeEventListener('message', handleSocketMessage);
      }
      
      // End any active call when component unmounts
      if (isCallActive) {
        endCall();
      }
    };
  }, [socket, isConnected]);

  const handleSocketMessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'call-request':
          handleIncomingCall(message.data);
          break;
        case 'call-accept':
          handleCallAccepted(message.data);
          break;
        case 'call-reject':
          handleCallRejected(message.data);
          break;
        case 'call-busy':
          handleCallBusy(message.data);
          break;
        case 'call-cancel':
          handleCallCancelled(message.data);
          break;
        case 'call-end':
          handleCallEnded();
          break;
        case 'call-ice-candidate':
          handleIceCandidate(message.data);
          break;
        case 'call-audio-toggle':
          handleRemoteAudioToggle(message.data);
          break;
        case 'call-video-toggle':
          handleRemoteVideoToggle(message.data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling socket message:', error);
    }
  };

  const fetchCallHistory = async () => {
    setRefreshing(true);
    try {
      // In a real app, fetch from API
      // const response = await callService.getCallHistory();
      // setCallHistory(response.data);
      
      // Using mock data for now
      setCallHistory(CALL_HISTORY);
    } catch (error) {
      console.error('Error fetching call history:', error);
      Alert.alert('Error', 'Failed to load call history');
    } finally {
      setRefreshing(false);
    }
  };

  // Function to handle incoming call request
  const handleIncomingCall = (data) => {
    if (isBusy || isCallActive) {
      // Send busy status if already in a call
      sendMessage('call-busy', {
        recipientId: data.callerId,
      });
      return;
    }
    
    // Set incoming call data
    setActiveCall({
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType,
    });
    
    // Show incoming call modal/alert
    Alert.alert(
      'Incoming Call',
      `${data.callerName} is calling you (${data.callType})`,
      [
        {
          text: 'Decline',
          onPress: () => rejectCall(data.callerId),
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () => acceptCall(data),
        },
      ],
      { cancelable: false }
    );
  };

  // Function to accept incoming call
  const acceptCall = async (callData) => {
    try {
      setIsBusy(true);
      
      // Initialize WebRTC connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;
      
      // Set up event handlers for the peer connection
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage('call-ice-candidate', {
            recipientId: callData.callerId,
            candidate: event.candidate,
          });
        }
      };
      
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
      // Get user media
      const mediaConstraints = {
        audio: true,
        video: callData.callType === 'video',
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localStreamRef.current = stream;
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Display local video if video call
      if (callData.callType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Send call accepted message
      sendMessage('call-accept', {
        recipientId: callData.callerId,
      });
      
      // Update UI state
      setIsCallActive(true);
      setIsBusy(false);
      
      // Start call timer
      const startTime = Date.now();
      callTimerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(elapsedSeconds);
      }, 1000);
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Call Failed', 'Could not establish connection');
      rejectCall(callData.callerId);
    }
  };

  // Function to reject incoming call
  const rejectCall = (callerId) => {
    sendMessage('call-reject', {
      recipientId: callerId,
    });
    setActiveCall(null);
  };

  // Function to handle when remote user accepts our call
  const handleCallAccepted = (data) => {
    // Implementation would depend on WebRTC setup
    console.log('Call accepted:', data);
  };

  // Function to handle when remote user rejects our call
  const handleCallRejected = (data) => {
    Alert.alert('Call Rejected', 'The other user declined your call');
    setActiveCall(null);
    setIsBusy(false);
  };

  // Function to handle when remote user is busy
  const handleCallBusy = (data) => {
    Alert.alert('User Busy', 'The other user is currently in another call');
    setActiveCall(null);
    setIsBusy(false);
  };

  // Function to handle when remote user cancels the call
  const handleCallCancelled = (data) => {
    setActiveCall(null);
    setIsBusy(false);
  };

  // Function to handle call ended by remote user
  const handleCallEnded = () => {
    endCall();
    Alert.alert('Call Ended', 'The call has ended');
  };

  // Function to handle ICE candidates from remote peer
  const handleIceCandidate = (data) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  // Function to handle remote audio toggle
  const handleRemoteAudioToggle = (data) => {
    // Update UI to show remote audio status
    console.log('Remote audio toggled:', data.isMuted);
  };

  // Function to handle remote video toggle
  const handleRemoteVideoToggle = (data) => {
    // Update UI to show remote video status
    console.log('Remote video toggled:', data.isVideoOff);
  };

  // Function to end the current call
  const endCall = () => {
    if (activeCall) {
      sendMessage('call-end', {
        recipientId: activeCall.callerId,
      });
    }
    
    // Stop media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Reset state
    setActiveCall(null);
    setIsCallActive(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Toggle mute/unmute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      
      // Notify remote peer
      if (activeCall) {
        sendMessage('call-audio-toggle', {
          recipientId: activeCall.callerId,
          isMuted: !isMuted,
        });
      }
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (localStreamRef.current && activeCall?.callType === 'video') {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
      
      // Notify remote peer
      if (activeCall) {
        sendMessage('call-video-toggle', {
          recipientId: activeCall.callerId,
          isVideoOff: !isVideoOff,
        });
      }
    }
  };

  // Format time from seconds to MM:SS
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format date to readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format call status with appropriate icon
  const renderCallStatus = (item) => {
    let icon;
    let color;
    let label;
    
    switch (item.status) {
      case 'completed':
        icon = item.callType === 'video' ? 'videocam' : 'call';
        color = '#4CAF50';
        label = 'Completed';
        break;
      case 'missed':
        icon = 'call-outline';
        color = '#F44336';
        label = 'Missed';
        break;
      case 'outgoing':
        icon = 'arrow-up-circle';
        color = '#2196F3';
        label = 'Outgoing';
        break;
      default:
        icon = 'call';
        color = '#757575';
        label = 'Unknown';
    }
    
    return (
      <View style={styles.callStatusContainer}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.callStatusText, { color }]}>{label}</Text>
      </View>
    );
  };

  // Render item for call history list
  const renderCallHistoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.callItem}
      onPress={() => Alert.alert('Call Details', `Call with ${item.name} on ${formatDate(item.timestamp)}`)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      
      <View style={styles.callDetails}>
        <Text style={styles.callerName}>{item.name}</Text>
        <Text style={styles.callTime}>
          {formatDate(item.timestamp)} • {item.duration}
        </Text>
        {renderCallStatus(item)}
      </View>
      
      <View style={styles.callActions}>
        {item.amount > 0 && (
          <Text style={styles.callAmount}>₹{item.amount}</Text>
        )}
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => Alert.alert('Call Back', `Will call back ${item.name}`)}
        >
          <Ionicons 
            name={item.callType === 'video' ? 'videocam' : 'call'} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="filter" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Call History */}
      <FlatList
        data={callHistory}
        renderItem={renderCallHistoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.callList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchCallHistory} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyText}>No call history yet</Text>
          </View>
        )}
      />
      
      {/* Active Call Modal */}
      <Modal
        visible={isCallActive}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.callScreen}>
          {/* Video Area */}
          {activeCall?.callType === 'video' && (
            <View style={styles.videoContainer}>
              {/* Remote Video (Full Screen) */}
              <View style={styles.remoteVideo} />
              
              {/* Local Video (Picture-in-Picture) */}
              <View style={styles.localVideo} />
            </View>
          )}
          
          {/* Call Info */}
          <View style={styles.callInfoContainer}>
            {activeCall?.callType !== 'video' && (
              <Image 
                source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                style={styles.callerImage}
              />
            )}
            <Text style={styles.callerNameLarge}>{activeCall?.callerName}</Text>
            <Text style={styles.callDuration}>{formatTime(callDuration)}</Text>
          </View>
          
          {/* Call Controls */}
          <View style={styles.callControls}>
            <TouchableOpacity 
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? 'mic-off' : 'mic'} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            
            {activeCall?.callType === 'video' && (
              <TouchableOpacity 
                style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
                onPress={toggleVideo}
              >
                <Ionicons 
                  name={isVideoOff ? 'videocam-off' : 'videocam'} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.controlLabel}>{isVideoOff ? 'Video On' : 'Video Off'}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.endCallButton]}
              onPress={endCall}
            >
              <Ionicons name="call" size={24} color="#fff" />
              <Text style={styles.controlLabel}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButton: {
    padding: 5,
  },
  callList: {
    paddingVertical: 10,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    padding: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  callDetails: {
    flex: 1,
  },
  callerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  callTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  callStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callStatusText: {
    fontSize: 12,
    marginLeft: 5,
  },
  callActions: {
    alignItems: 'flex-end',
  },
  callAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  callButton: {
    backgroundColor: '#2196F3',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Active Call Modal Styles
  callScreen: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'space-between',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  localVideo: {
    position: 'absolute',
    right: 20,
    top: 40,
    width: '30%',
    height: '20%',
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  callInfoContainer: {
    alignItems: 'center',
    padding: 20,
  },
  callerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  callerNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  callDuration: {
    fontSize: 18,
    color: '#e0e0e0',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonActive: {
    backgroundColor: '#2196F3',
  },
  endCallButton: {
    backgroundColor: '#F44336',
  },
  controlLabel: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
});

export default CallsScreen;