import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const UserProfileScreen = ({ route }) => {
    const navigation = useNavigation();
    const { token } = useAuth();
    const { user, chatRoom, isFriend } = route.params;
    const [loading, setLoading] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState(isFriend);

    const getAvatarSource = () => {
        if (user?.avatarUrl && user.avatarUrl.trim() !== '' &&
            user.avatarUrl !== 'https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg') {
            return { uri: user.avatarUrl };
        }
        const name = user?.name || 'User';
        const encodedName = encodeURIComponent(name.trim());
        return { uri: `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png&rounded=true` };
    };

    const handleUnfriend = () => {
        Alert.alert(
            'Hủy kết bạn',
            `Bạn có chắc muốn hủy kết bạn với ${user.name}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    style: 'destructive',
                    onPress: performUnfriend
                }
            ]
        );
    };

    const performUnfriend = async () => {
        try {
            setLoading(true);

            const response = await axios.delete(`${API_URL}/user/unfriend`, {
                data: { friendId: user._id },
                headers: {
                    Authorization: token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                setFriendshipStatus(false);
                Alert.alert(
                    'Thành công',
                    `Đã hủy kết bạn với ${user.name}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Navigate back to ChatScreen with updated friendship status
                                navigation.navigate('ChatScreen', {
                                    chatRoom: chatRoom,
                                    friendshipUpdated: false
                                });
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error unfriending user:', error);
            Alert.alert(
                'Lỗi',
                'Không thể hủy kết bạn. Vui lòng thử lại sau.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSendFriendRequest = async () => {
        try {
            setLoading(true);

            const response = await axios.post(
                `${API_URL}/user/sendreqfriend`,
                { userId: user._id },
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );

            Alert.alert(
                'Thành công',
                'Đã gửi lời mời kết bạn',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.goBack();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error sending friend request:', error);
            if (error.response?.data?.msg) {
                Alert.alert('Thông báo', error.response.data.msg);
            } else {
                Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        console.log('Going back with friendship status:', friendshipStatus, 'Original status:', isFriend);
        // Luôn pass về friendship status hiện tại để đảm bảo sync
        navigation.navigate('ChatScreen', {
            chatRoom: chatRoom,
            friendshipUpdated: friendshipStatus
        });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tùy chọn</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.avatarSection}>
                <Image source={getAvatarSource()} style={styles.avatar} />
                <Text style={styles.name}>{user.name}</Text>

                {/* Show friendship status */}
                {friendshipStatus ? (
                    <Text style={styles.friendStatus}>✓ Bạn bè</Text>
                ) : (
                    <Text style={styles.strangerStatus}>Người lạ</Text>
                )}

                <View style={styles.iconRow}>
                    <TouchableOpacity style={styles.iconCircle}>
                        <Ionicons name="search" size={20} color="#333" />
                        <Text style={styles.iconText}>Tìm tin nhắn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconCircle}>
                        <Ionicons name="person" size={20} color="#333" />
                        <Text style={styles.iconText}>Trang cá nhân</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Action buttons based on friendship status */}
            {friendshipStatus ? (
                <TouchableOpacity
                    style={styles.optionRow}
                    onPress={handleUnfriend}
                    disabled={loading}
                >
                    <Ionicons name="person-remove" size={20} color="#f00" style={styles.optionIcon} />
                    {loading ? (
                        <ActivityIndicator size="small" color="#f00" style={{ marginRight: 8 }} />
                    ) : null}
                    <Text style={[styles.optionText, { color: '#f00' }]}>
                        {loading ? 'Đang hủy kết bạn...' : 'Hủy kết bạn'}
                    </Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={styles.optionRow}
                    onPress={handleSendFriendRequest}
                    disabled={loading}
                >
                    <Ionicons name="person-add" size={20} color="#0999fa" style={styles.optionIcon} />
                    {loading ? (
                        <ActivityIndicator size="small" color="#0999fa" style={{ marginRight: 8 }} />
                    ) : null}
                    <Text style={[styles.optionText, { color: '#0999fa' }]}>
                        {loading ? 'Đang gửi lời mời...' : 'Kết bạn'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Additional options */}
            <TouchableOpacity style={styles.optionRow}>
                <Ionicons name="ban" size={20} color="#666" style={styles.optionIcon} />
                <Text style={styles.optionText}>Chặn người này</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow}>
                <Ionicons name="flag" size={20} color="#666" style={styles.optionIcon} />
                <Text style={styles.optionText}>Báo cáo</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0999fa',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
        backgroundColor: '#e1e1e1',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    friendStatus: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
        marginBottom: 20,
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    strangerStatus: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        marginBottom: 20,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    iconRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 20,
    },
    iconCircle: {
        alignItems: 'center',
        padding: 12,
    },
    iconText: {
        marginTop: 8,
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    optionIcon: {
        marginRight: 12,
        width: 20,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
});

export default UserProfileScreen;