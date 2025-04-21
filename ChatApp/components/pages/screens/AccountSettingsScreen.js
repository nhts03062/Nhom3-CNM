import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = require('../../../services/api');

const AccountSettingsScreen = () => {
    const navigation = useNavigation();
    const [initialUserData, setInitialUserData] = useState({});
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        avatarUrl: '',
    });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [token, setToken] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userToken = await AsyncStorage.getItem('token');
                setToken(userToken);

                const userDataString = await AsyncStorage.getItem('user');
                if (userDataString) {
                    const parsedUserData = JSON.parse(userDataString);
                    const userInfo = {
                        name: parsedUserData.name || '',
                        email: parsedUserData.email || '',
                        phone: parsedUserData.phone || '',
                        address: parsedUserData.address || '',
                        avatarUrl: parsedUserData.avatarUrl || null,
                    };
                    setUserData(userInfo);
                    setInitialUserData(userInfo);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                Alert.alert('Error', 'Failed to load user data');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleChange = (field, value) => {
        setUserData({
            ...userData,
            [field]: value
        });
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "You need to grant permission to access your photos");
                return;
            }

            // Using string instead of deprecated MediaTypeOptions
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images",
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0];
                setUserData({
                    ...userData,
                    avatarUrl: selectedImage.uri
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const validateEmail = (email) => {
        if (!email) return true; // Skip validation if email is not provided
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSave = async () => {
        try {
            // Check if password fields match
            if (password && password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }

            // Validate email format if changed
            if (userData.email !== initialUserData.email && userData.email) {
                if (!validateEmail(userData.email)) {
                    Alert.alert('Error', 'Please enter a valid email address');
                    return;
                }
            }

            setIsSaving(true);

            // Create data object with fields that have changed
            const updateData = {};

            if (userData.name !== initialUserData.name) updateData.name = userData.name;
            if (userData.email !== initialUserData.email) updateData.email = userData.email;
            if (userData.phone !== initialUserData.phone) updateData.phone = userData.phone;
            if (userData.address !== initialUserData.address) updateData.address = userData.address;
            if (userData.avatarUrl !== initialUserData.avatarUrl) updateData.avatarUrl = userData.avatarUrl;
            if (password) updateData.password = password;

            // If nothing has changed, show a message
            if (Object.keys(updateData).length === 0) {
                Alert.alert('Info', 'No changes to save');
                setIsSaving(false);
                return;
            }

            console.log('Sending update data:', updateData);

            // Make API call to update user data
            // Fix: Using the correct API endpoint without duplicate '/api'
            const response = await fetch(`${API_URL}/user/updateuser`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const responseText = await response.text();
                console.error('Server response:', responseText);

                try {
                    const data = JSON.parse(responseText);
                    if (data.msg && data.msg.includes('Email')) {
                        throw new Error('This email is already in use. Please use a different email.');
                    }
                    throw new Error(data.msg || 'Failed to update profile');
                } catch (parseError) {
                    throw new Error(`Server error: ${response.status}`);
                }
            }

            const data = await response.json();

            // Update local storage with the new data
            const currentUserData = JSON.parse(await AsyncStorage.getItem('user'));
            const updatedUserData = { ...currentUserData, ...updateData };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));

            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    // Use either the avatarUrl or a default avatar
    const getAvatarSource = () => {
        if (userData.avatarUrl) {
            return { uri: userData.avatarUrl };
        } else {
            return require('../../../assets/cloud.png');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0999fa" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerWrapper}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cài đặt tài khoản</Text>
                    <View style={{ width: 24 }} />
                </View>
            </View>

            <View style={styles.avatarContainer}>
                <Image
                    source={getAvatarSource()}
                    style={styles.avatar}
                    onError={(e) => console.log('Error loading avatar:', e.nativeEvent.error)}
                />
                <TouchableOpacity onPress={pickImage}>
                    <Text style={styles.changeAvatar}>Thay đổi ảnh đại diện</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên hiển thị</Text>
                <TextInput
                    style={styles.input}
                    value={userData.name}
                    onChangeText={(text) => handleChange('name', text)}
                    placeholder="Nhập tên hiển thị"
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={userData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    placeholder="Nhập email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {userData.email !== initialUserData.email && userData.email && (
                    <Text style={styles.noteText}>Lưu ý: Thay đổi email có thể yêu cầu xác thực lại</Text>
                )}

                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                    style={styles.input}
                    value={userData.phone}
                    onChangeText={(text) => handleChange('phone', text)}
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Địa chỉ</Text>
                <TextInput
                    style={[styles.input, styles.addressInput]}
                    value={userData.address}
                    onChangeText={(text) => handleChange('address', text)}
                    placeholder="Nhập địa chỉ"
                    multiline
                />

                <Text style={styles.label}>Mật khẩu mới</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Nhập mật khẩu mới (để trống nếu không đổi)"
                    secureTextEntry
                />

                <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Xác nhận mật khẩu mới"
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaving}
            >
                {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        flexGrow: 1,
        width: '100%',
        paddingBottom: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        color: '#0999fa',
    },
    headerWrapper: {
        width: '100%',
        backgroundColor: '#0999fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 8,
        backgroundColor: '#e1e1e1', // Placeholder color while loading
    },
    changeAvatar: {
        color: '#0999fa',
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: '#444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    addressInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    noteText: {
        fontSize: 12,
        color: '#f57c00',
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
    },
    saveButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 16,
        height: 50,
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#7fc4fd',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AccountSettingsScreen;