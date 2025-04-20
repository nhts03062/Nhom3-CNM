import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';

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
    const { user, token, logout } = useAuth();
    const navigation = useNavigation();
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        avatarUrl: null,
    });
    const [loading, setLoading] = useState(true);

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    onPress: async () => {
                        try {
                            await logout();
                            navigation.replace('Auth');
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại sau.');
                        }
                    }
                }
            ]
        );
    };

    // Function to fetch user data from AsyncStorage
    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const userDataString = await AsyncStorage.getItem('user');
            if (userDataString) {
                try {
                    const parsedUserData = JSON.parse(userDataString);
                    console.log("Retrieved user data:", parsedUserData); // Debug log
                    setUserData({
                        name: parsedUserData.name || 'User',
                        email: parsedUserData.email || '',
                        phone: parsedUserData.phone || '',
                        address: parsedUserData.address || '',
                        avatarUrl: parsedUserData.avatarUrl || null,
                    });
                } catch (parseError) {
                    console.error('Error parsing user data:', parseError);
                    // If data is corrupted, remove it and use default values
                    await AsyncStorage.removeItem('user');
                    setUserData({
                        name: 'User',
                        email: '',
                        phone: '',
                        address: '',
                        avatarUrl: null,
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load user data when component mounts
    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // Refresh user data whenever the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchUserData();
            return () => { }; // cleanup function
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
            console.log("Sending update data:", updatedData);
            const API_URL = require('../../../services/api');

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
                // Update local user data
                const updatedUserData = {
                    ...userData,
                    ...updatedData
                };

                // Save to AsyncStorage
                await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));

                // Update state
                setUserData(updatedUserData);
                Alert.alert('Success', 'Profile updated successfully');

                // Refresh data
                fetchUserData();
            }
        } catch (error) {
            console.error('Error updating profile:', error);

            // Better error handling
            if (error.response) {
                console.error('Server error response:', error.response.data);
                Alert.alert('Update Failed', `Server error: ${error.response.status}`);
            } else if (error.request) {
                Alert.alert('Update Failed', 'No response from server. Check your connection.');
            } else {
                Alert.alert('Update Failed', error.message);
            }
        }
    };

    // Use either the avatarUrl or generate a name-based avatar
    const getAvatarSource = () => {
        if (userData.avatarUrl) {
            return { uri: userData.avatarUrl };
        } else {
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=0999fa&color=fff` };
        }
    };

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
                        onError={(e) => console.log('Error loading avatar:', e.nativeEvent.error)}
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

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#ff3b30" style={{ marginRight: 12 }} />
                    <Text style={[styles.optionLabel, { color: '#ff3b30' }]}>Đăng xuất</Text>
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
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContainer: { paddingHorizontal: 16 },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#0999fa',
        height: 80,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    settingsIcon: { backgroundColor: '#0999fa', padding: 8, borderRadius: 8 },
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
        backgroundColor: '#e1e1e1', // Placeholder color while loading
    },
    name: { fontSize: 16, fontWeight: 'bold' },
    emailText: { color: '#444', fontSize: 12, marginTop: 2 },
    subText: { color: '#666', fontSize: 13, marginTop: 2 },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    optionLabel: { fontSize: 15, fontWeight: '500' },
    optionDesc: { fontSize: 13, color: '#888', marginTop: 2 },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 10,
        marginBottom: 20,
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