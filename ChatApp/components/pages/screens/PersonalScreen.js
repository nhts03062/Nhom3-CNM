import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';

const API_URL = require('../../../services/api');

const personalOptions = [
    { icon: 'cloud-outline', label: 'zCloud', desc: 'Không gian lưu trữ dữ liệu trên đám mây' },
    { icon: 'sparkles-outline', label: 'zStyle – Nổi bật trên Zalo', desc: 'Hình nền và nhạc cho cuộc gọi Zalo' },
    { icon: 'cloud-circle-outline', label: 'Cloud của tôi', desc: 'Lưu trữ các tin nhắn quan trọng' },
    { icon: 'time-outline', label: 'Dữ liệu trên máy', desc: 'Quản lý dữ liệu Zalo của bạn' },
    { icon: 'qr-code-outline', label: 'Ví QR', desc: 'Lưu trữ và xuất trình các mã QR quan trọng' },
    { icon: 'shield-outline', label: 'Tài khoản và bảo mật' },
    { icon: 'lock-closed-outline', label: 'Quyền riêng tư' },
];

const PersonalScreen = () => {
    const { user, token, logout, updateUserContext } = useAuth();
    const navigation = useNavigation();
    const [socket, setSocket] = useState(null);
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        avatarUrl: null,
        _id: null
    });
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        if (token && user) {
            try {
                const newSocket = io(API_URL.replace('/api', ''), {
                    auth: { token }
                });

                newSocket.on('connect', () => {
                    console.log('Socket connected in PersonalScreen');
                });

                newSocket.on('connect_error', (error) => {
                    console.error('Socket connection error:', error);
                });

                setSocket(newSocket);

                return () => {
                    if (newSocket && newSocket.connected) {
                        console.log('Disconnecting socket on cleanup');
                        newSocket.disconnect();
                    }
                };
            } catch (error) {
                console.error('Error setting up socket connection:', error);
            }
        }
    }, [token, user]);

    const handleLogout = async () => {
        if (loggingOut) return;

        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoggingOut(true);
                            if (socket) {
                                console.log('Disconnecting socket before logout');
                                socket.disconnect();
                                setSocket(null);
                            }
                            const logoutSuccess = await logout();
                            if (logoutSuccess) {
                                console.log('Logout successful, navigating to Auth screen');
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Auth' }],
                                });
                            } else {
                                throw new Error('Logout function returned false');
                            }
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert(
                                'Lỗi đăng xuất',
                                'Không thể đăng xuất. Vui lòng thử lại sau.',
                                [
                                    {
                                        text: 'Thử lại',
                                        onPress: () => setLoggingOut(false)
                                    },
                                    {
                                        text: 'Buộc đăng xuất',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                await AsyncStorage.removeItem('token');
                                                await AsyncStorage.removeItem('user');
                                                delete axios.defaults.headers.common['Authorization'];
                                                navigation.reset({
                                                    index: 0,
                                                    routes: [{ name: 'Auth' }],
                                                });
                                            } catch (forceLogoutError) {
                                                console.error('Force logout error:', forceLogoutError);
                                                Alert.alert('Lỗi nghiêm trọng', 'Không thể đăng xuất. Vui lòng khởi động lại ứng dụng.');
                                            }
                                        }
                                    }
                                ]
                            );
                        } finally {
                            setLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            if (!user) {
                console.log('No user data available');
                return;
            }

            let finalUserData = {
                name: user.name || 'User',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                avatarUrl: user.avatarUrl || null,
                _id: user._id
            };

            const userDataString = await AsyncStorage.getItem('user');
            if (userDataString) {
                try {
                    const parsedUserData = JSON.parse(userDataString);
                    console.log("PersonalScreen - Retrieved user data from AsyncStorage:", parsedUserData);

                    finalUserData = {
                        name: parsedUserData.name || finalUserData.name,
                        email: parsedUserData.email || finalUserData.email,
                        phone: parsedUserData.phone || finalUserData.phone,
                        address: parsedUserData.address || finalUserData.address,
                        avatarUrl: parsedUserData.avatarUrl || finalUserData.avatarUrl,
                        _id: finalUserData._id
                    };
                } catch (parseError) {
                    console.error('Error parsing user data from AsyncStorage:', parseError);
                }
            }

            setUserData(finalUserData);

            // Cập nhật AuthContext với dữ liệu mới nhất
            if (updateUserContext && (
                user.name !== finalUserData.name ||
                user.avatarUrl !== finalUserData.avatarUrl ||
                user.phone !== finalUserData.phone ||
                user.address !== finalUserData.address
            )) {
                console.log('PersonalScreen - Updating user context with latest data:', finalUserData);
                updateUserContext(finalUserData);
            }

            console.log('PersonalScreen - Final user data set:', finalUserData);
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, [user, updateUserContext]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useFocusEffect(
        useCallback(() => {
            console.log('PersonalScreen focused, refreshing user data');
            fetchUserData();
            return () => { };
        }, [fetchUserData])
    );

    const handleSettingsPress = () => {
        navigation.navigate('AccountSettingsScreen', {
            userData: userData,
            onUpdateProfile: updateUserProfile
        });
    };

    const updateUserProfile = async (updatedData) => {
        try {
            console.log("PersonalScreen - Sending update data:", updatedData);

            const response = await axios.put(
                `${API_URL}/user/updateuser`,
                updatedData,
                {
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200) {
                const updatedUserData = {
                    ...userData,
                    ...updatedData
                };

                // Lưu vào AsyncStorage
                await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
                console.log('PersonalScreen - Saved updated data to AsyncStorage:', updatedUserData);

                // Cập nhật state local
                setUserData(updatedUserData);

                // Cập nhật AuthContext
                if (updateUserContext) {
                    console.log('PersonalScreen - Updating AuthContext with new user data:', updatedUserData);
                    updateUserContext(updatedUserData);
                }

                Alert.alert('Thành công', 'Cập nhật hồ sơ thành công');

                // Refresh data để đảm bảo consistency
                fetchUserData();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.response) {
                console.error('Server error response:', error.response.data);
                Alert.alert('Cập nhật thất bại', `Lỗi máy chủ: ${error.response.status}`);
            } else if (error.request) {
                Alert.alert('Cập nhật thất bại', 'Không nhận được phản hồi từ máy chủ. Kiểm tra kết nối của bạn.');
            } else {
                Alert.alert('Cập nhật thất bại', error.message);
            }
        }
    };

    const getAvatarSource = () => {
        console.log('PersonalScreen - Getting avatar source - userData:', {
            name: userData.name,
            avatarUrl: userData.avatarUrl
        });

        // Nếu có avatarUrl và không phải URL mặc định từ backend
        if (userData.avatarUrl &&
            userData.avatarUrl.trim() !== "" &&
            userData.avatarUrl !== "https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg") {
            console.log('PersonalScreen - Using user avatar URL:', userData.avatarUrl);
            return { uri: userData.avatarUrl };
        }

        // Tạo avatar từ tên người dùng với encoding UTF-8 phù hợp
        const userName = userData.name || user?.name || 'User';
        const encodedName = encodeURIComponent(userName.trim());
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png&rounded=true`;

        console.log('PersonalScreen - Using fallback avatar for user:', userName, '- URL:', fallbackUrl);
        return { uri: fallbackUrl };
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#0999fa" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsIcon}>
                        <Ionicons name="settings-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileRow}>
                    <Image
                        source={getAvatarSource()}
                        style={styles.avatar}
                        onError={(e) => {
                            console.log('PersonalScreen - Error loading avatar:', e.nativeEvent.error);
                        }}
                        onLoad={() => console.log('PersonalScreen - Avatar loaded successfully')}
                        onLoadStart={() => console.log('PersonalScreen - Avatar loading started')}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{userData.name || 'Loading...'}</Text>
                        <Text style={styles.emailText}>{userData.email}</Text>
                        <Text style={styles.subText}>Xem trang cá nhân</Text>
                    </View>
                    <Ionicons name="person-add-outline" size={20} color="#0999fa" />
                </View>

                {personalOptions.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.optionRow}>
                        <Ionicons name={item.icon} size={20} color="#0999fa" style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionLabel}>{item.label}</Text>
                            {item.desc && <Text style={styles.optionDesc}>{item.desc}</Text>}
                        </View>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    style={[styles.logoutButton, loggingOut && styles.disabledButton]}
                    onPress={handleLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? (
                        <ActivityIndicator size="small" color="#ff3b30" style={{ marginRight: 12 }} />
                    ) : (
                        <Ionicons name="log-out-outline" size={20} color="#ff3b30" style={{ marginRight: 12 }} />
                    )}
                    <Text style={[styles.optionLabel, { color: '#ff3b30' }]}>
                        {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ChatRoomListScreen')}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Tin nhắn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ContactListScreen')}>
                    <Ionicons name="people-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Danh bạ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="compass-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Khám phá</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="time-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Nhật ký</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="person" size={24} color="#0999fa" />
                    <Text style={[styles.tabText, styles.tabTextActive]}>Cá nhân</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#0999fa',
    },
    scrollContainer: {
        paddingHorizontal: 16
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#0999fa',
        height: 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    settingsIcon: {
        backgroundColor: '#0999fa',
        padding: 8,
        borderRadius: 8
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#e1e1e1',
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    emailText: {
        color: '#444',
        fontSize: 12,
        marginTop: 2
    },
    subText: {
        color: '#666',
        fontSize: 13,
        marginTop: 2
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '500'
    },
    optionDesc: {
        fontSize: 13,
        color: '#888',
        marginTop: 2
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 10,
        marginBottom: 20,
    },
    disabledButton: {
        opacity: 0.6,
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

export default PersonalScreen;