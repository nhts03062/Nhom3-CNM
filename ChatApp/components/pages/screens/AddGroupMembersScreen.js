import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const AddGroupMembersScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { token, user } = useAuth();

    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selected, setSelected] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch friends list when component mounts
    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/user/allfriend`, {
                headers: { Authorization: token }
            });
            setFriends(response.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setGroupImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại sau.');
        }
    };

    const createGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
            return;
        }

        if (selected.length < 2) {
            Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 2 thành viên');
            return;
        }

        try {
            setLoading(true);

            // Create form data if we have an image to upload
            let requestData = {
                chatRoomName: groupName,
                members: selected,
            };

            if (groupImage) {
                // For simplicity, we'll handle image upload separately
                // In a real app, you'd likely use FormData to upload the image
                // This is a placeholder for the image URL
                requestData.image = groupImage;
            }

            // Create the group chat
            const response = await axios.post(`${API_URL}/chatroom`, requestData, {
                headers: { Authorization: token }
            });

            // Navigate to the chat screen with the newly created chat room
            navigation.navigate('ChatScreen', { chatRoom: response.data });
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Lỗi', 'Không thể tạo nhóm chat. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const filteredFriends = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => {
        const isSelected = selected.includes(item._id);

        return (
            <TouchableOpacity style={styles.item} onPress={() => toggleSelect(item._id)}>
                <Image
                    source={{ uri: item.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.name) }}
                    style={styles.avatar}
                />
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.checkbox, isSelected && styles.checked]}>
                    {isSelected && <View style={styles.innerDot} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo nhóm chat</Text>
            </View>

            <View style={styles.groupInfoContainer}>
                <TouchableOpacity style={styles.groupImageContainer} onPress={pickImage}>
                    {groupImage ? (
                        <Image source={{ uri: groupImage }} style={styles.groupImage} />
                    ) : (
                        <View style={styles.groupImagePlaceholder}>
                            <Ionicons name="camera" size={30} color="#666" />
                            <Text style={styles.groupImageText}>Thêm ảnh nhóm</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.groupNameContainer}>
                    <TextInput
                        style={styles.groupNameInput}
                        placeholder="Nhập tên nhóm"
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                </View>
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color="#999" />
                <TextInput
                    placeholder="Tìm kiếm bạn bè"
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0999fa" />
                    <Text>Đang tải...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredFriends}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có bạn bè'}
                            </Text>
                        </View>
                    }
                />
            )}

            {selected.length > 0 && (
                <TouchableOpacity style={styles.createButton} onPress={createGroup}>
                    <Text style={styles.createButtonText}>
                        Tạo nhóm với {selected.length} thành viên
                    </Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        backgroundColor: '#0999fa',
        paddingTop: 10,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
    },
    groupInfoContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    groupImageContainer: {
        marginBottom: 16,
    },
    groupImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    groupImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    groupImageText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    groupNameContainer: {
        width: '100%',
    },
    groupNameInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 8,
        margin: 16,
    },
    searchInput: {
        marginLeft: 6,
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12
    },
    name: {
        flex: 1,
        fontSize: 16
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checked: {
        borderColor: '#2196F3'
    },
    innerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
    },
    createButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        margin: 16,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
});

export default AddGroupMembersScreen;