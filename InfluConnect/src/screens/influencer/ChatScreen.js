import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

// Mock data for chat conversations - in a real app, this would come from an API
const CONVERSATIONS = [
  {
    id: '1',
    userId: '101',
    name: 'Sarah Williams',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    lastMessage: 'Hi, I would like to book a call with you!',
    timestamp: '2023-04-08T14:30:00Z',
    unread: 2,
  },
  {
    id: '2',
    userId: '102',
    name: 'John Doe',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastMessage: 'Thank you for the advice!',
    timestamp: '2023-04-07T10:15:00Z',
    unread: 0,
  },
  {
    id: '3',
    userId: '103',
    name: 'Alice Smith',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastMessage: 'When are you available for a call?',
    timestamp: '2023-04-06T18:45:00Z',
    unread: 1,
  },
  // Additional conversations...
];

// Mock data for messages in a conversation
const MESSAGES = {
  '1': [
    {
      id: '101',
      text: 'Hi, I would like to book a call with you!',
      senderId: '101', // User
      timestamp: '2023-04-08T14:30:00Z',
    },
    {
      id: '102',
      text: 'Hello Sarah! Sure, I would be happy to schedule a call. What topics would you like to discuss?',
      senderId: 'self', // Influencer
      timestamp: '2023-04-08T14:35:00Z',
    },
    {
      id: '103',
      text: 'I need advice on my career in tech. I saw your recent videos and really connected with your perspective.',
      senderId: '101',
      timestamp: '2023-04-08T14:40:00Z',
    },
    {
      id: '104',
      text: 'That sounds great! I can definitely help with tech career advice. Would you prefer a video call or audio call?',
      senderId: 'self',
      timestamp: '2023-04-08T14:45:00Z',
    },
    {
      id: '105',
      text: 'A video call would be perfect!',
      senderId: '101',
      timestamp: '2023-04-08T14:50:00Z',
    },
  ],
  // Other conversation messages...
};

const ChatScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { socket, isConnected, sendMessage } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const flatListRef = useRef(null);

  // Check if we were navigated to a specific conversation
  useEffect(() => {
    if (route.params?.conversationId) {
      const conversation = conversations.find(c => c.id === route.params.conversationId);
      if (conversation) {
        openConversation(conversation);
      }
    }
  }, [route.params, conversations]);

  // Load conversations when the component mounts
  useEffect(() => {
    fetchConversations();
    
    // Set up message listener for incoming messages
    if (socket && isConnected) {
      socket.addEventListener('message', handleSocketMessage);
    }
    
    return () => {
      if (socket) {
        socket.removeEventListener('message', handleSocketMessage);
      }
    };
  }, [socket, isConnected]);

  const handleSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chat') {
        handleIncomingMessage(data.data);
      }
    } catch (error) {
      console.error('Error handling socket message:', error);
    }
  };

  const handleIncomingMessage = (messageData) => {
    const { senderId, text, conversationId } = messageData;
    
    // Update conversations list with new message
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: text,
            timestamp: new Date().toISOString(),
            unread: activeConversation?.id === conversationId ? 0 : (conv.unread + 1),
          };
        }
        return conv;
      });
    });
    
    // If this conversation is currently open, add message to the messages list
    if (activeConversation?.id === conversationId) {
      const newMsg = {
        id: Date.now().toString(),
        text,
        senderId,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [...prevMessages, newMsg]);
      
      // Scroll to the new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const fetchConversations = async () => {
    setRefreshing(true);
    try {
      // In a real app, fetch from API
      // const response = await chatService.getConversations();
      // setConversations(response.data);
      
      // Using mock data for now
      setConversations(CONVERSATIONS);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    setIsLoading(true);
    try {
      // In a real app, fetch from API
      // const response = await chatService.getMessages(conversationId);
      // setMessages(response.data);
      
      // Using mock data for now
      setMessages(MESSAGES[conversationId] || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
      
      // Scroll to the bottom of the messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const openConversation = (conversation) => {
    setActiveConversation(conversation);
    fetchMessages(conversation.id);
    
    // Mark conversation as read
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.id === conversation.id) {
          return { ...conv, unread: 0 };
        }
        return conv;
      });
    });
  };

  const closeConversation = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const sendChatMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Create new message object
    const newMsg = {
      id: Date.now().toString(),
      text: messageText,
      senderId: 'self',
      timestamp: new Date().toISOString(),
    };
    
    // Add to messages list (optimistic update)
    setMessages(prevMessages => [...prevMessages, newMsg]);
    
    // Scroll to the new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Update conversation with new last message
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.id === activeConversation.id) {
          return {
            ...conv,
            lastMessage: messageText,
            timestamp: new Date().toISOString(),
          };
        }
        return conv;
      });
    });
    
    // Send via WebSocket
    if (socket && isConnected) {
      sendMessage('chat', {
        conversationId: activeConversation.id,
        recipientId: activeConversation.userId,
        text: messageText,
      });
    } else {
      Alert.alert('Error', 'Not connected to chat server');
    }
  };

  // Format relative time for timestamps
  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return `${diffHour}h ago`;
    } else if (diffMin > 0) {
      return `${diffMin}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Format absolute time for message timestamps
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render a single conversation item
  const renderConversationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => openConversation(item)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationDetails}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationTime}>{formatRelativeTime(item.timestamp)}</Text>
        </View>
        <Text 
          style={[styles.conversationLastMessage, item.unread > 0 && styles.unreadMessage]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Determine if a message is from the influencer or the user
  const isOwnMessage = (message) => message.senderId === 'self';

  // Render a single message
  const renderMessage = ({ item, index }) => {
    const isOwn = isOwnMessage(item);
    const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== item.senderId);
    
    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessageContainer : styles.otherMessageContainer]}>
        {!isOwn && showAvatar && (
          <Image 
            source={{ uri: activeConversation?.avatar }}
            style={styles.messageAvatar}
          />
        )}
        
        {!isOwn && !showAvatar && <View style={styles.avatarPlaceholder} />}
        
        <View style={[styles.messageBubble, isOwn ? styles.ownMessageBubble : styles.otherMessageBubble]}>
          <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // Main conversations list view
  const renderConversationsList = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="search" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchConversations} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        )}
      />
    </View>
  );

  // Active conversation view
  const renderActiveConversation = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={closeConversation}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => Alert.alert('Profile', `View ${activeConversation.name}'s profile`)}
        >
          <Image source={{ uri: activeConversation.avatar }} style={styles.chatAvatar} />
          <View>
            <Text style={styles.chatName}>{activeConversation.name}</Text>
            <Text style={styles.chatStatus}>Online</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.chatActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Call', `Call ${activeConversation.name}`)}
          >
            <Ionicons name="call" size={22} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Video Call', `Video call ${activeConversation.name}`)}
          >
            <Ionicons name="videocam" size={22} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyMessagesContainer}>
                <Ionicons name="chatbubble-outline" size={64} color="#BDBDBD" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.startChatPrompt}>
                  Start the conversation with {activeConversation.name}
                </Text>
              </View>
            )}
          />
          
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add-circle" size={24} color="#2196F3" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            
            <TouchableOpacity 
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendChatMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons 
                name="send" 
                size={24} 
                color={newMessage.trim() ? "#2196F3" : "#BDBDBD"} 
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );

  return activeConversation ? renderActiveConversation() : renderConversationsList();
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
  conversationsList: {
    paddingVertical: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#F44336',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationDetails: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  conversationTime: {
    fontSize: 12,
    color: '#666',
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Chat Header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chatStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  chatActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  // Messages List
  messagesList: {
    flexGrow: 1,
    padding: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 30,
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  ownMessageBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  startChatPrompt: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  attachButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatScreen;