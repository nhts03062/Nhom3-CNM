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

    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/user/allfriend`, {
                headers: {
                    Authorization: token
                }
            });
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
            const meResponse = await axios.get(`${API_URL}/user/${user._id}`, {
                headers: {
                    Authorization: token
                }
            });

            // Lấy danh sách ID người gửi lời mời kết bạn
            const requestIds = meResponse.data.friendRequestsReceived || [];

            if (requestIds.length === 0) {
                setFriendRequests([]);
                return;
            }

            // Lấy thông tin chi tiết của từng người dùng đã gửi lời mời
            const userDetailsPromises = requestIds.map(userId =>
                axios.get(`${API_URL}/user/${userId}`, {
                    headers: { Authorization: token }
                })
            );

            const userResponses = await Promise.all(userDetailsPromises);
            const requestUsers = userResponses.map(res => res.data);

            setFriendRequests(requestUsers);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách lời mời kết bạn');
        }
    }, [token, user]);

    // Refresh friend list and friend requests when screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchFriends();
            fetchFriendRequests();
        }, [fetchFriends, fetchFriendRequests])
    );

    const handleAddFriend = () => {
        navigation.navigate('AddFriendScreen');
    };

    const handleChatWithFriend = (friend) => {
        // Create or navigate to chat with friend
        navigation.navigate('ChatScreen', { userId: friend._id });
    };

    const handleAcceptFriendRequest = async (userId) => {
        try {
            setRequestLoading(true);
            await axios.post(
                `${API_URL}/user/resfriend/1`,
                { userId },
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');

            // Cập nhật danh sách bạn bè và lời mời kết bạn
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
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert('Thông báo', 'Đã từ chối lời mời kết bạn');

            // Cập nhật danh sách lời mời kết bạn
            await fetchFriendRequests();
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            Alert.alert('Lỗi', 'Không thể từ chối lời mời kết bạn');
        } finally {
            setRequestLoading(false);
        }
    };

    const filteredData = activeTab === 'friends'
        ? friends.filter(friend =>
            friend.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (friend.phone && friend.phone.includes(searchText))
        )
        : groups.filter(group =>
            group.name.toLowerCase().includes(searchText.toLowerCase())
        );

    const getAvatarSource = (user) => {
        if (user.avatarUrl) {
            return { uri: user.avatarUrl };
        } else {
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0999fa&color=fff` };
        }
    };

    const renderFriendItem = ({ item }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => handleChatWithFriend(item)}
        >
            <Image source={getAvatarSource(item)} style={styles.avatar} />
            <View style={styles.itemInfo}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone && <Text style={styles.info}>{item.phone}</Text>}
            </View>
            <TouchableOpacity style={styles.chatButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#0999fa" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

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
                    renderItem={renderFriendItem}
                    ListHeaderComponent={activeTab === 'friends' && friendRequests.length > 0 ?
                        <Text style={styles.listHeader}>Bạn bè ({friends.length})</Text> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'friends'
                                    ? "Chưa có bạn bè nào. Hãy thêm bạn bè để trò chuyện!"
                                    : "Chưa có nhóm nào"}
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
    // Friend requests section
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
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    itemInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: '500' },
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