import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Image,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = require('../../../services/api');

const ContactListScreen = () => {
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('friends');
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requestLoading, setRequestLoading] = useState(false);
    const [socket, setSocket] = useState(null);
    const [isJoin, setIsJoin] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    // Initialize Socket.IO connection
    useEffect(() => {
        const newSocket = io(API_URL.replace('/api', ''), {
            auth: {
                token: token
            }
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [token]);

    // Handle Socket.IO events
    useEffect(() => {
        if (!socket || !user) return;

        // Join the user's personal room
        if (!isJoin) {
            console.log('Joining personal room for user:', user._id);
            socket.emit('join', user._id);
            setIsJoin(true);
            // Add current user to online users immediately
            setOnlineUsers(new Set([user._id]));
        }

        // Listen for users coming online
        socket.on('onlined', (userId) => {
            console.log('User came online:', userId);
            setOnlineUsers(prev => new Set([...prev, userId]));
        });

        // Listen for users going offline
        socket.on('offlined', (userId) => {
            console.log('User went offline:', userId);
            setOnlineUsers(prev => {
                const newSet = new Set([...prev]);
                newSet.delete(userId);
                return newSet;
            });
        });

        return () => {
            socket.off('join');
            socket.off('onlined');
            socket.off('offlined');
        };
    }, [socket, user]);

    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/user/allfriend`);
            setFriends(response.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchFriendRequests = useCallback(async () => {
        try {
            const meResponse = await axios.get(`${API_URL}/user/${user._id}`);

            const requestIds = meResponse.data.friendRequestsReceived || [];

            if (requestIds.length === 0) {
                setFriendRequests([]);
                return;
            }

            const userDetailsPromises = requestIds.map(userId =>
                axios.get(`${API_URL}/user/${userId}`)
            );

            const userResponses = await Promise.all(userDetailsPromises);
            const requestUsers = userResponses.map(res => res.data);

            setFriendRequests(requestUsers);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách lời mời kết bạn');
        }
    }, [token, user]);

    const fetchGroups = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/chatroom`);
            // Filter for group chats only
            const groupChats = response.data.filter(chat => chat.isGroupChat);
            setGroups(groupChats);
        } catch (error) {
            console.error('Error fetching groups:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách nhóm');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useFocusEffect(
        useCallback(() => {
            fetchFriends();
            fetchFriendRequests();
            fetchGroups();
        }, [fetchFriends, fetchFriendRequests, fetchGroups])
    );

    const handleAddFriend = () => {
        navigation.navigate('AddFriendScreen');
    };

    const handleChatWithFriend = (friend) => {
        navigation.navigate('ChatScreen', { userId: friend._id });
    };

    const handleChatWithGroup = (group) => {
        navigation.navigate('ChatScreen', { chatRoom: group });
    };

    const handleAcceptFriendRequest = async (userId) => {
        try {
            setRequestLoading(true);
            await axios.post(
                `${API_URL}/user/resfriend/1`,
                { userId },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');
            await fetchFriendRequests();
            await fetchFriends();
        } catch (error) {
            console.error('Error accepting friend request:', error);
            Alert.alert('Lỗi', 'Không thể chấp nhận lời mời kết bạn');
        } finally {
            setRequestLoading(false);
        }
    };

    const handleRejectFriendRequest = async (userId) => {
        try {
            setRequestLoading(true);
            await axios.post(
                `${API_URL}/user/resfriend/0`,
                { userId },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert('Thông báo', 'Đã từ chối lời mời kết bạn');
            await fetchFriendRequests();
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            Alert.alert('Lỗi', 'Không thể từ chối lời mời kết bạn');
        } finally {
            setRequestLoading(false);
        }
    };

    // Check if a user is online
    const isUserOnline = (userId) => {
        return onlineUsers.has(userId);
    };

    const filteredData = activeTab === 'friends'
        ? friends.filter(friend =>
            friend.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (friend.phone && friend.phone.includes(searchText))
        )
        : groups.filter(group =>
            group.chatRoomName.toLowerCase().includes(searchText.toLowerCase())
        );

    const getAvatarSource = (item) => {
        if (activeTab === 'friends') {
            if (item.avatarUrl) {
                return { uri: item.avatarUrl };
            }
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0999fa&color=fff` };
        } else {
            if (item.image) {
                return { uri: item.image };
            }
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.chatRoomName)}&background=0999fa&color=fff` };
        }
    };

    const renderItem = ({ item }) => {
        if (activeTab === 'friends') {
            const isOnline = isUserOnline(item._id);

            return (
                <TouchableOpacity
                    style={styles.item}
                    onPress={() => handleChatWithFriend(item)}
                >
                    <View style={styles.avatarContainer}>
                        <Image source={getAvatarSource(item)} style={styles.avatar} />
                        {isOnline && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.itemInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>{item.name}</Text>
                            {isOnline && <Text style={styles.onlineText}>Đang hoạt động</Text>}
                        </View>
                        {item.phone && <Text style={styles.info}>{item.phone}</Text>}
                    </View>
                    <TouchableOpacity style={styles.chatButton}>
                        <Ionicons name="chatbubble-outline" size={20} color="#0999fa" />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        } else {
            return (
                <TouchableOpacity
                    style={styles.item}
                    onPress={() => handleChatWithGroup(item)}
                >
                    <Image source={getAvatarSource(item)} style={styles.avatar} />
                    <View style={styles.itemInfo}>
                        <Text style={styles.name}>{item.chatRoomName}</Text>
                        <Text style={styles.info}>Thành viên: {item.members.length}</Text>
                    </View>
                    <TouchableOpacity style={styles.chatButton}>
                        <Ionicons name="chatbubble-outline" size={20} color="#0999fa" />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        }
    };

    const renderFriendRequestItem = ({ item }) => (
        <View style={styles.requestItem}>
            <Image source={getAvatarSource(item)} style={styles.avatar} />
            <View style={styles.itemInfo}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone && <Text style={styles.info}>{item.phone}</Text>}
            </View>
            <View style={styles.requestButtons}>
                <TouchableOpacity
                    style={[styles.acceptButton, requestLoading && styles.disabledButton]}
                    onPress={() => handleAcceptFriendRequest(item._id)}
                    disabled={requestLoading}
                >
                    <Text style={styles.buttonText}>Đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.rejectButton, requestLoading && styles.disabledButton]}
                    onPress={() => handleRejectFriendRequest(item._id)}
                    disabled={requestLoading}
                >
                    <Text style={styles.rejectButtonText}>Từ chối</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TextInput
                        placeholder="Tìm kiếm"
                        style={styles.searchInput}
                        placeholderTextColor="#aaa"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    <TouchableOpacity style={styles.headerPlus} onPress={handleAddFriend}>
                        <Ionicons name="person-add-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Bạn bè</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
                    onPress={() => setActiveTab('groups')}
                >
                    <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Nhóm</Text>
                </TouchableOpacity>
            </View>

            {/* Friend Requests Section */}
            {activeTab === 'friends' && friendRequests.length > 0 && (
                <View style={styles.requestsSection}>
                    <Text style={styles.requestsTitle}>Lời mời kết bạn ({friendRequests.length})</Text>
                    <FlatList
                        data={friendRequests}
                        keyExtractor={(item) => item._id}
                        renderItem={renderFriendRequestItem}
                        scrollEnabled={false}
                    />
                </View>
            )}

            {/* List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0999fa" />
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={activeTab === 'friends' && friendRequests.length > 0 ?
                        <Text style={styles.listHeader}>Bạn bè ({friends.length})</Text> :
                        activeTab === 'groups' ?
                            <Text style={styles.listHeader}>Nhóm ({groups.length})</Text> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'friends'
                                    ? "Chưa có bạn bè nào. Hãy thêm bạn bè để trò chuyện!"
                                    : "Chưa có nhóm nào. Hãy tham gia hoặc tạo một nhóm!"}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Bottom Nav */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ChatRoomListScreen')}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Tin nhắn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} >
                    <Ionicons name="people" size={24} color="#0999fa" />
                    <Text style={[styles.tabText, styles.tabTextActive]}>Danh bạ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="compass-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Khám phá</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="time-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Nhật ký</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('PersonalScreen')}>
                    <Ionicons name="person-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Cá nhân</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { backgroundColor: '#0999fa', paddingTop: 45, paddingHorizontal: 16, paddingBottom: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    searchInput: {
        flex: 1,
        height: 36,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    headerPlus: {
        marginLeft: 10,
        padding: 6,
        backgroundColor: '#0a84ff',
        borderRadius: 8,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    tab: { paddingVertical: 6 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#0999fa' },
    tabText: { fontSize: 14, color: '#888' },
    activeTabText: { color: '#0999fa', fontWeight: 'bold' },
    requestsSection: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    requestsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 16,
        marginBottom: 8,
        color: '#333',
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    requestButtons: {
        flexDirection: 'row',
    },
    acceptButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
    },
    rejectButton: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 12,
    },
    rejectButtonText: {
        color: '#666',
        fontWeight: '500',
        fontSize: 12,
    },
    disabledButton: {
        opacity: 0.5,
    },
    listHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 16,
        marginTop: 16,
        marginBottom: 8,
        color: '#333',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4CAF50', // Green color for online status
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    itemInfo: { flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '500'
    },
    onlineText: {
        fontSize: 12,
        color: '#4CAF50',
        marginLeft: 8,
        fontStyle: 'italic',
    },
    info: { fontSize: 12, color: '#666', marginTop: 2 },
    chatButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5E5',
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        height: 60,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
    },
    tabText: {
        fontSize: 10,
        marginTop: 4,
        color: '#8E8E93',
    },
    tabTextActive: {
        color: '#0999fa',
    },
});

export default ContactListScreen;