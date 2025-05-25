import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const AddFriendScreen = () => {
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [userFriends, setUserFriends] = useState([]);
    const [userSentRequests, setUserSentRequests] = useState([]);

    // Fetch user's friend list on component mount
    const fetchFriends = useCallback(async () => {
        try {
            const response = await axios.get(
                `${API_URL}/user/allfriend`,
                {
                    headers: {
                        Authorization: token
                    }
                }
            );
            // Store just the friend IDs for easier lookup
            setUserFriends(response.data.map(friend => friend._id));
        } catch (error) {
            console.error('Error fetching friends:', error);
            setUserFriends([]); // Set empty array on error
        }
    }, [token]);

    // Fetch user's sent friend requests with better error handling
    const fetchSentRequests = useCallback(async () => {
        try {
            // Validate user object first
            if (!user || !user._id) {
                console.warn('User object or user._id is missing');
                setUserSentRequests([]);
                return;
            }

            console.log('Fetching sent requests for user:', user._id);

            const response = await axios.get(
                `${API_URL}/user/${user._id}`,
                {
                    headers: {
                        Authorization: token
                    }
                }
            );

            // Debug: Log the response to see the structure
            console.log('User data response:', response.data);
            console.log('Request friends:', response.data.requestfriends);

            // Handle both array of IDs and array of objects
            const requestFriends = response.data.requestfriends || [];
            let requestIds = [];

            if (requestFriends.length > 0) {
                // Check if it's array of objects or array of IDs
                if (typeof requestFriends[0] === 'object') {
                    requestIds = requestFriends.map(req => req._id || req.userId || req);
                } else {
                    requestIds = requestFriends;
                }
            }

            console.log('Processed request IDs:', requestIds);
            setUserSentRequests(requestIds);
        } catch (error) {
            console.error('Error fetching sent requests:', error);
            if (error.response) {
                console.error('Error response:', error.response.status, error.response.data);
            }
            // Set empty array on error to prevent app crash
            setUserSentRequests([]);
        }
    }, [token, user._id]);

    useEffect(() => {
        fetchFriends();
        // Only fetch sent requests if user is available
        if (user && user._id) {
            fetchSentRequests();
        }
    }, [fetchFriends, fetchSentRequests, user]);

    useFocusEffect(
        useCallback(() => {
            fetchFriends();
            if (user && user._id) {
                fetchSentRequests();
            }
            setSearchResults([]);
        }, [fetchFriends, fetchSentRequests, user])
    );

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hoặc email');
            return;
        }

        try {
            setLoading(true);

            // Tạo object searchData để truyền đúng thông tin tìm kiếm
            const searchData = { searchTerm: searchTerm.trim() };

            const response = await axios.post(
                `${API_URL}/search`,
                searchData,
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Enhance search results with friendship status
            const resultsWithStatus = response.data.map(foundUser => {
                // Check if this user is the current user
                const isCurrentUser = foundUser._id === user?._id;

                // Check if this user is already a friend
                const isFriend = userFriends.includes(foundUser._id);

                // Check if already sent friend request - more thorough check
                const hasSentRequest = userSentRequests.some(reqId => {
                    if (typeof reqId === 'object') {
                        return reqId._id === foundUser._id || reqId.userId === foundUser._id;
                    }
                    return reqId === foundUser._id;
                });

                console.log(`User ${foundUser.name}:`, {
                    isCurrentUser,
                    isFriend,
                    hasSentRequest,
                    userId: foundUser._id,
                    sentRequests: userSentRequests
                });

                return {
                    ...foundUser,
                    isCurrentUser: isCurrentUser,
                    isFriend: isFriend,
                    hasSentRequest: hasSentRequest
                };
            });

            setSearchResults(resultsWithStatus);

            if (response.data.length === 0) {
                Alert.alert('Thông báo', 'Không tìm thấy người dùng với thông tin này');
            }
        } catch (error) {
            console.error('Error searching user:', error);
            Alert.alert('Lỗi', 'Không thể tìm kiếm người dùng. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendFriendRequest = async (userId) => {
        try {
            setSending(true);
            const response = await axios.post(
                `${API_URL}/user/sendreqfriend`,
                { userId },
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');

            // Update the state to show the button as "sent request"
            setSearchResults(prev =>
                prev.map(user =>
                    user._id === userId ? { ...user, hasSentRequest: true } : user
                )
            );

            // Update local sent requests state - add the userId directly
            setUserSentRequests(prev => {
                if (!prev.includes(userId)) {
                    return [...prev, userId];
                }
                return prev;
            });

            // Refresh sent requests to get latest data
            setTimeout(() => {
                if (user && user._id) {
                    fetchSentRequests();
                }
            }, 500);

        } catch (error) {
            console.error('Error sending friend request:', error);
            if (error.response?.data?.msg) {
                Alert.alert('Thông báo', error.response.data.msg);
            } else {
                Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
            }
        } finally {
            setSending(false);
        }
    };

    const handleCancelFriendRequest = async (userId) => {
        try {
            setSending(true);
            const response = await axios.post(
                `${API_URL}/user/cancelreqfriend`,
                { userId },
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );
            Alert.alert('Thành công', 'Đã hủy lời mời kết bạn');

            // Update the state to show the button as "add friend" again
            setSearchResults(prev =>
                prev.map(user =>
                    user._id === userId ? { ...user, hasSentRequest: false } : user
                )
            );

            // Update local sent requests state - remove the userId
            setUserSentRequests(prev => prev.filter(reqId => {
                if (typeof reqId === 'object') {
                    return reqId._id !== userId && reqId.userId !== userId;
                }
                return reqId !== userId;
            }));

            // Refresh sent requests to get latest data
            setTimeout(() => {
                if (user && user._id) {
                    fetchSentRequests();
                }
            }, 500);

        } catch (error) {
            console.error('Error canceling friend request:', error);
            if (error.response?.data?.msg) {
                Alert.alert('Thông báo', error.response.data.msg);
            } else {
                Alert.alert('Lỗi', 'Không thể hủy lời mời kết bạn. Vui lòng thử lại sau.');
            }
        } finally {
            setSending(false);
        }
    };

    const handleStartChat = (userId) => {
        // Navigate to chat with this user
        navigation.navigate('ChatScreen', { userId });
    };

    const getAvatarSource = (user) => {
        if (user.avatarUrl) {
            return { uri: user.avatarUrl };
        } else {
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0999fa&color=fff` };
        }
    };

    const renderActionButton = (user) => {
        console.log(`Rendering button for ${user.name}:`, {
            isCurrentUser: user.isCurrentUser,
            isFriend: user.isFriend,
            hasSentRequest: user.hasSentRequest
        });

        // Don't show any button for current user
        if (user.isCurrentUser) {
            return (
                <View style={styles.currentUserContainer}>
                    <Text style={styles.currentUserText}>Bản thân</Text>
                </View>
            );
        }

        // If already friends
        if (user.isFriend) {
            return (
                <View style={styles.friendStatusContainer}>
                    <Text style={styles.friendStatus}>Bạn bè</Text>
                    <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleStartChat(user._id)}
                    >
                        <Text style={styles.buttonText}>Nhắn tin</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // If already sent friend request
        if (user.hasSentRequest) {
            return (
                <TouchableOpacity
                    style={[styles.cancelButton, sending && styles.disabledButton]}
                    onPress={() => handleCancelFriendRequest(user._id)}
                    disabled={sending}
                >
                    <Text style={styles.cancelButtonText}>
                        {sending ? 'Đang hủy...' : 'Hủy lời mời'}
                    </Text>
                </TouchableOpacity>
            );
        }

        // Default: show add friend button
        return (
            <TouchableOpacity
                style={[styles.addButton, sending && styles.disabledButton]}
                onPress={() => handleSendFriendRequest(user._id)}
                disabled={sending}
            >
                <Text style={styles.buttonText}>
                    {sending ? 'Đang gửi...' : 'Kết bạn'}
                </Text>
            </TouchableOpacity>
        );
    };

    // Add a temporary debug button to test the functionality
    const handleDebugTest = () => {
        console.log('Current user:', user);
        console.log('User sent requests:', userSentRequests);
        console.log('User friends:', userFriends);

        // Manually set a test request to see if UI updates
        const testUserId = '675f8b4d4a297e8c8c123456'; // Replace with actual user ID from search
        setUserSentRequests(prev => [...prev, testUserId]);

        Alert.alert('Debug', `Added test request for ${testUserId}. Check console for details.`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Thêm bạn</Text>
            </View>

            <View style={styles.searchContainer}>
                <Text style={styles.label}>Nhập số điện thoại hoặc email</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Số điện thoại hoặc email"
                        keyboardType="default"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleSearch}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="search" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.resultContainer}>
                {searchResults.map(user => (
                    <View key={user._id} style={styles.userCard}>
                        <Image
                            source={getAvatarSource(user)}
                            style={styles.avatar}
                        />
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
                        </View>
                        <View style={styles.actionButtons}>
                            {renderActionButton(user)}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0999fa',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
    },
    searchContainer: {
        padding: 16,
    },
    label: {
        fontSize: 16,
        marginBottom: 8
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    debugContainer: {
        backgroundColor: '#f0f0f0',
        padding: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 4,
    },
    debugText: {
        fontSize: 12,
        color: '#666',
    },
    debugUserText: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    resultContainer: {
        flex: 1,
        padding: 16,
    },
    userCard: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    userPhone: {
        fontSize: 12,
        color: '#666',
    },
    actionButtons: {
        marginLeft: 8,
    },
    friendStatusContainer: {
        alignItems: 'center',
    },
    friendStatus: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    currentUserContainer: {
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    currentUserText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    addButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    chatButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    cancelButton: {
        backgroundColor: '#ff6b6b',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    disabledButton: {
        backgroundColor: '#b9e0fb',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 12,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 12,
    },
});

export default AddFriendScreen;