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
        }
    }, [token]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    useFocusEffect(
        useCallback(() => {
            fetchFriends();
            setSearchResults([]);
        }, [fetchFriends])
    );

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hoặc email');
            return;
        }

        try {
            setLoading(true);
            // Mỗi lần tìm kiếm đều gọi API mới để lấy dữ liệu mới nhất
            const response = await axios.post(
                `${API_URL}/search`,
                { searchTerm: searchTerm.trim() },
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Enhance search results with friendship status
            const resultsWithStatus = response.data.map(foundUser => {
                // Check if this user is already a friend
                const isFriend = userFriends.includes(foundUser._id);
                return {
                    ...foundUser,
                    isFriend: isFriend
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

            // Update the state to show the button as disabled
            setSearchResults(prev =>
                prev.map(user =>
                    user._id === userId ? { ...user, requestSent: true } : user
                )
            );

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Thêm bạn</Text>
                <View style={{ width: 24 }} />
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
                            {user.isFriend ? (
                                <View style={styles.friendStatusContainer}>
                                    <Text style={styles.friendStatus}>Bạn bè</Text>
                                    <TouchableOpacity
                                        style={styles.chatButton}
                                        onPress={() => handleStartChat(user._id)}
                                    >
                                        <Text style={styles.buttonText}>Nhắn tin</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.addButton,
                                        (user.requestSent || sending) && styles.disabledButton
                                    ]}
                                    onPress={() => handleSendFriendRequest(user._id)}
                                    disabled={user.requestSent || sending}
                                >
                                    <Text style={styles.buttonText}>
                                        {user.requestSent ? 'Đã gửi' : 'Kết bạn'}
                                    </Text>
                                </TouchableOpacity>
                            )}
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
        color: '#fff'
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
    addButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    chatButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal:
            16,
        borderRadius: 20,
    },
    disabledButton: {
        backgroundColor: '#b9e0fb',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '500',
    },
});

export default AddFriendScreen;