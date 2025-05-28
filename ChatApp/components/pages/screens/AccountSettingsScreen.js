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
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const AccountSettingsScreen = () => {
    const navigation = useNavigation();
    const { updateUserContext } = useAuth();
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
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [token, setToken] = useState('');
    const [selectedImageUri, setSelectedImageUri] = useState(null); // Track selected image

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

    const uploadImageToS3 = async (imageUri) => {
        try {
            setIsUploadingImage(true);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'avatar.jpg',
            });

            const uploadResponse = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    // Don't set Content-Type for FormData, let fetch handle it
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Upload response error:', errorText);
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            let uploadedImageUrl = await uploadResponse.text();
            console.log('Raw upload response:', uploadedImageUrl);

            // Clean up the URL - remove quotes if present
            uploadedImageUrl = uploadedImageUrl.replace(/^"(.*)"$/, '$1').trim();

            // Validate the URL
            if (!uploadedImageUrl || !uploadedImageUrl.startsWith('http')) {
                throw new Error('Invalid URL returned from server');
            }

            console.log('Cleaned image URL:', uploadedImageUrl);
            return uploadedImageUrl;

        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image to server');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "You need to grant permission to access your photos");
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images",
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0];
                setSelectedImageUri(selectedImage.uri);

                // Update userData to show the selected image immediately
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
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        if (!phone) return true;
        // Vietnamese phone number validation (basic)
        const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    };

    const checkEmailExists = async (email) => {
        try {
            const response = await fetch(`${API_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ searchTerm: email })
            });

            if (response.ok) {
                const users = await response.json();
                // Filter out current user from results
                return users.some(user => user.email === email && user._id !== initialUserData._id);
            }
            return false;
        } catch (error) {
            console.error('Error checking email:', error);
            return false;
        }
    };

    const checkPhoneExists = async (phone) => {
        try {
            const response = await fetch(`${API_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ searchTerm: phone })
            });

            if (response.ok) {
                const users = await response.json();
                // Filter out current user from results
                return users.some(user => user.phone === phone && user._id !== initialUserData._id);
            }
            return false;
        } catch (error) {
            console.error('Error checking phone:', error);
            return false;
        }
    };

    const handleSave = async () => {
        try {
            // Check if password fields match
            if (password && password !== confirmPassword) {
                Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
                return;
            }

            // Validate email format if changed
            if (userData.email !== initialUserData.email && userData.email) {
                if (!validateEmail(userData.email)) {
                    Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email hợp lệ');
                    return;
                }
            }

            // Validate phone format if changed
            if (userData.phone !== initialUserData.phone && userData.phone) {
                if (!validatePhone(userData.phone)) {
                    Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ (VD: 0987654321)');
                    return;
                }
            }

            setIsSaving(true);

            // Check if email already exists (only if email changed)
            if (userData.email !== initialUserData.email && userData.email) {
                const emailExists = await checkEmailExists(userData.email);
                if (emailExists) {
                    Alert.alert('Lỗi', 'Email này đã được sử dụng bởi người dùng khác');
                    setIsSaving(false);
                    return;
                }
            }

            // Check if phone already exists (only if phone changed)
            if (userData.phone !== initialUserData.phone && userData.phone) {
                const phoneExists = await checkPhoneExists(userData.phone);
                if (phoneExists) {
                    Alert.alert('Lỗi', 'Số điện thoại này đã được sử dụng bởi người dùng khác');
                    setIsSaving(false);
                    return;
                }
            }

            // Create data object with fields that have changed
            const updateData = {};

            if (userData.name !== initialUserData.name) updateData.name = userData.name;
            if (userData.email !== initialUserData.email) updateData.email = userData.email;
            if (userData.phone !== initialUserData.phone) updateData.phone = userData.phone;
            if (userData.address !== initialUserData.address) updateData.address = userData.address;
            if (password) updateData.password = password;

            // Handle image upload if a new image was selected
            if (selectedImageUri && selectedImageUri !== initialUserData.avatarUrl) {
                try {
                    const uploadedImageUrl = await uploadImageToS3(selectedImageUri);
                    updateData.avatarUrl = uploadedImageUrl;
                } catch (uploadError) {
                    Alert.alert('Lỗi', 'Không thể tải lên hình ảnh. Vui lòng thử lại.');
                    setIsSaving(false);
                    return;
                }
            }

            // If nothing has changed, show a message
            if (Object.keys(updateData).length === 0) {
                Alert.alert('Thông báo', 'Không có thay đổi nào để lưu');
                setIsSaving(false);
                return;
            }

            console.log('Sending update data:', updateData);

            // Make API call to update user data
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
                    if (data.msg) {
                        if (data.msg.includes('email') || data.msg.includes('Email')) {
                            throw new Error('Email này đã được sử dụng. Vui lòng sử dụng email khác.');
                        } else if (data.msg.includes('phone') || data.msg.includes('Phone')) {
                            throw new Error('Số điện thoại này đã được sử dụng. Vui lòng sử dụng số khác.');
                        }
                        throw new Error(data.msg);
                    }
                    throw new Error('Cập nhật thất bại');
                } catch (parseError) {
                    if (response.status === 400) {
                        throw new Error('Dữ liệu không hợp lệ hoặc đã tồn tại');
                    }
                    throw new Error(`Lỗi máy chủ: ${response.status}`);
                }
            }

            const responseData = await response.json();
            console.log('Update successful:', responseData);

            // Update local storage with the new data
            const currentUserData = JSON.parse(await AsyncStorage.getItem('user'));
            const updatedUserData = { ...currentUserData, ...updateData };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));

            // Update AuthContext
            if (updateUserContext) {
                await updateUserContext(updatedUserData);
            }

            Alert.alert('Thành công', 'Cập nhật hồ sơ thành công', [
                {
                    text: 'OK',
                    onPress: () => {
                        // Navigate back to PersonalScreen
                        navigation.goBack();
                    }
                }
            ]);

        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Lỗi', error.message || 'Cập nhật thất bại');
        } finally {
            setIsSaving(false);
        }
    };

    // Use either the selected image, avatarUrl, or a default avatar
    const getAvatarSource = () => {
        // Priority 1: Selected image (local URI)
        if (selectedImageUri && selectedImageUri.startsWith('file://')) {
            console.log('Using selected image URI:', selectedImageUri);
            return { uri: selectedImageUri };
        }

        // Priority 2: Valid avatarUrl from server
        if (userData.avatarUrl &&
            userData.avatarUrl.trim() !== "" &&
            userData.avatarUrl.startsWith('http') &&
            userData.avatarUrl !== "https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg") {
            console.log('Using server avatar URL:', userData.avatarUrl);
            return { uri: userData.avatarUrl };
        }

        // Priority 3: Fallback to generated avatar
        const userName = userData.name || 'User';
        const encodedName = encodeURIComponent(userName.trim());
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png&rounded=true`;
        console.log('Using fallback avatar for:', userName);
        return { uri: fallbackUrl };
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
                    onError={(e) => {
                        console.log('Error loading avatar:', e.nativeEvent.error);
                        // Reset to fallback if there's an error
                        if (selectedImageUri) {
                            setSelectedImageUri(null);
                            setUserData({
                                ...userData,
                                avatarUrl: initialUserData.avatarUrl
                            });
                        }
                    }}
                    onLoad={() => console.log('Avatar loaded successfully')}
                />
                <TouchableOpacity onPress={pickImage} disabled={isUploadingImage}>
                    {isUploadingImage ? (
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color="#0999fa" />
                            <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                    ) : (
                        <Text style={styles.changeAvatar}>Thay đổi ảnh đại diện</Text>
                    )}
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
                    style={[styles.input, userData.email !== initialUserData.email && userData.email && !validateEmail(userData.email) && styles.inputError]}
                    value={userData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    placeholder="Nhập email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {userData.email !== initialUserData.email && userData.email && (
                    <Text style={styles.noteText}>Lưu ý: Thay đổi email có thể yêu cầu xác thực lại</Text>
                )}
                {userData.email && !validateEmail(userData.email) && (
                    <Text style={styles.errorText}>Email không hợp lệ</Text>
                )}

                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                    style={[styles.input, userData.phone !== initialUserData.phone && userData.phone && !validatePhone(userData.phone) && styles.inputError]}
                    value={userData.phone}
                    onChangeText={(text) => handleChange('phone', text)}
                    placeholder="Nhập số điện thoại (VD: 0987654321)"
                    keyboardType="phone-pad"
                />
                {userData.phone && !validatePhone(userData.phone) && (
                    <Text style={styles.errorText}>Số điện thoại không hợp lệ</Text>
                )}

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
                style={[styles.saveButton, (isSaving || isUploadingImage) && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaving || isUploadingImage}
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
        backgroundColor: '#e1e1e1',
    },
    changeAvatar: {
        color: '#0999fa',
        fontWeight: '500',
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadingText: {
        color: '#0999fa',
        fontWeight: '500',
        marginLeft: 8,
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
    errorText: {
        fontSize: 12,
        color: '#ff3b30',
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
    },
    inputError: {
        borderColor: '#ff3b30',
        borderWidth: 1.5,
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