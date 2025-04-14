import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import influencerService from '../../api/influencerService';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { balance } = useWallet();
  const [earnings, setEarnings] = useState(0);
  const [profileLink, setProfileLink] = useState('');
  const [stats, setStats] = useState({
    visits: 0,
    callsAttended: 0,
    missedCalls: 0,
  });
  const [recentMissedCalls, setRecentMissedCalls] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Set profile link
      if (user) {
        setProfileLink(`https://influconnect.com/i/${user.username}`);
      }
      
      // Fetch stats from API
      const statsData = await influencerService.getInfluencerStats();
      setStats({
        visits: statsData.visits || 0,
        callsAttended: statsData.callsAttended || 0,
        missedCalls: statsData.missedCalls || 0,
      });
      
      // Set today's earnings (could be from the wallet balance or a separate API call)
      setEarnings(statsData.todayEarnings || 0);
      
      // Fetch missed calls
      const missedCallsData = await influencerService.getMissedCalls();
      setRecentMissedCalls(missedCallsData || []);
    } catch (error) {
      console.error('Error fetching influencer data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(profileLink);
      Alert.alert('Success', 'Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: `Check out my profile on InfluConnect: ${profileLink}`,
        url: profileLink,
        title: 'Share My InfluConnect Profile',
      });
    } catch (error) {
      console.error('Failed to share:', error);
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleCallback = (callerId) => {
    // Navigate to call screen with caller ID
    navigation.navigate('Calls', { callerId });
  };

  const onRefresh = () => {
    fetchData();
  };

  const openMenu = () => {
    // Handle menu button press
    navigation.openDrawer();
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.appTitle}>InfluConnect</Text>
        
        <View style={styles.earningsContainer}>
          <Text style={styles.earningsLabel}>Today</Text>
          <Text style={styles.earnings}>₹{earnings}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile link section */}
        <View style={styles.linkSection}>
          <View style={styles.linkBox}>
            <Text style={styles.link} numberOfLines={1}>{profileLink}</Text>
          </View>
          
          <View style={styles.linkButtons}>
            <TouchableOpacity style={styles.button} onPress={copyToClipboard}>
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Copy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={shareLink}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics section */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.visits}</Text>
            <Text style={styles.statLabel}>Link Visits</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.callsAttended}</Text>
            <Text style={styles.statLabel}>Calls Attended</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.missedCalls}</Text>
            <Text style={styles.statLabel}>Missed Calls</Text>
          </View>
        </View>

        {/* Recent missed calls */}
        <Text style={styles.sectionTitle}>Recent Missed Calls</Text>
        
        {recentMissedCalls.length > 0 ? (
          recentMissedCalls.map((call) => (
            <View key={call.id} style={styles.callCard}>
              <View style={styles.callInfo}>
                <View style={styles.callerInfo}>
                  <Image 
                    source={{ uri: call.userAvatar || 'https://via.placeholder.com/40' }} 
                    style={styles.callerAvatar} 
                  />
                  <View>
                    <Text style={styles.callerName}>{call.userName}</Text>
                    <Text style={styles.callTime}>{formatDateTime(call.timestamp)}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.callBackButton}
                  onPress={() => handleCallback(call.userId)}
                >
                  <Ionicons name="call-outline" size={20} color="#fff" />
                  <Text style={styles.callBackText}>Call Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noCallsContainer}>
            <Ionicons name="call-outline" size={50} color="#BDBDBD" />
            <Text style={styles.noCallsText}>No missed calls</Text>
          </View>
        )}
        
        {/* Earnings summary */}
        <Text style={styles.sectionTitle}>Earnings Summary</Text>
        <View style={styles.earningsSummary}>
          <View style={styles.earningsDetail}>
            <Text style={styles.earningsDetailLabel}>Today</Text>
            <Text style={styles.earningsDetailAmount}>₹{earnings}</Text>
          </View>
          <View style={styles.earningsDetail}>
            <Text style={styles.earningsDetailLabel}>This Week</Text>
            <Text style={styles.earningsDetailAmount}>₹{balance}</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewMoreButton}
            onPress={() => navigation.navigate('Profile', { screen: 'Earnings' })}
          >
            <Text style={styles.viewMoreButtonText}>View Full History</Text>
            <Ionicons name="chevron-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuButton: {
    padding: 5,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  earningsContainer: {
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
  },
  earnings: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  linkSection: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  linkBox: {
    flex: 0.65,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  link: {
    color: '#2196F3',
  },
  linkButtons: {
    flex: 0.35,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  callCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  callInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  callerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  callTime: {
    fontSize: 12,
    color: '#666',
  },
  callBackButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  callBackText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  noCallsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  noCallsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  earningsSummary: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  earningsDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  earningsDetailLabel: {
    fontSize: 16,
    color: '#333',
  },
  earningsDetailAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 5,
  },
  viewMoreButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginRight: 5,
  },
});

export default HomeScreen;