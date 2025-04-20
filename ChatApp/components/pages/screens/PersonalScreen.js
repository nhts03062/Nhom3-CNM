import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const navigation = useNavigation();
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        avatarUrl: null,
    });
    const [loading, setLoading] = useState(true);

    // Function to fetch user data from AsyncStorage
    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const userDataString = await AsyncStorage.getItem('user');
            if (userDataString) {
                const parsedUserData = JSON.parse(userDataString);
                console.log("Retrieved user data:", parsedUserData); // Debug log
                setUserData({
                    name: parsedUserData.name || 'User',
                    email: parsedUserData.email || '',
                    phone: parsedUserData.phone || '',
                    address: parsedUserData.address || '',
                    avatarUrl: parsedUserData.avatarUrl || null,
                });
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
        navigation.navigate('AccountSettingsScreen');
    };

    // Use either the avatarUrl or generate a name-based avatar
    const getAvatarSource = () => {
        if (userData.avatarUrl) {
            return { uri: userData.avatarUrl };
        } else {
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0999fa&color=fff` };
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
                        <View>
                            <Text style={styles.optionLabel}>{item.label}</Text>
                            {item.desc && <Text style={styles.optionDesc}>{item.desc}</Text>}
                        </View>
                    </TouchableOpacity>
                ))}
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
    optionDesc: { fontSize: 13, color: '#888', marginTop: 2, maxWidth: '90%' },
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