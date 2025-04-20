import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const CreateGroupScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState(null);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token, user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    // Get existing members if editing an existing group
    const existingChatRoom = route.params?.chatRoom;
    const existingMembers = existingChatRoom?.members || [];

    // Fetch user's friends
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/user/allfriend`, {
                    headers: { Authorization: token }
                });

                // Mark friends who are already in the group
                const friendsWithStatus = response.data.map(friend => {
                    const isAlreadyMember = existingMembers.some(
                        member => member._id === friend._id
                    );
                    return {
                        ...friend,
                        isAlreadyMember
                    };
                });

                setFriends(friendsWithStatus);
            } catch (error) {
                console.error('Error fetching friends:', error);
                Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
    }, [token, existingMembers]);

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
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setGroupImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại sau.');
        }
    };

    const toggleSelect = (userId) => {
        // Don't allow selecting users who are already members
        const friend = friends.find(f => f._id === userId);
        if (friend && friend.isAlreadyMember) {
            return;
        }

        setSelectedUsers((prev) => {
            if (prev.includes(userId)) {
                return prev.filter((id) => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleCreateGroup = async () => {
        if (selectedUsers.length < 2 && !existingChatRoom) {
            Alert.alert('Thông báo', 'Bạn cần chọn ít nhất 2 thành viên để tạo nhóm');
            return;
        }

        try {
            setLoading(true);

            if (existingChatRoom) {
                // Adding members to existing group
                const response = await axios.put(`${API_URL}/chatroom`, {
                    chatRoomId: existingChatRoom._id,
                    members: [...existingMembers.map(m => m._id), ...selectedUsers]
                }, {
                    headers: { Authorization: token }
                });

                // Navigate back to group options with updated data
                navigation.navigate('GroupOptionsScreen', { chatRoom: response.data });
            } else {
                // Creating new group
                const response = await axios.post(`${API_URL}/chatroom`, {
                    chatRoomName: groupName || 'Nhóm mới',
                    members: selectedUsers,
                    image: groupImage
                }, {
                    headers: { Authorization: token }
                });

                // Navigate to chat screen with new group data
                navigation.navigate('ChatScreen', { chatRoom: response.data });
            }
        } catch (error) {
            console.error('Error with group:', error);
            Alert.alert('Lỗi', existingChatRoom ?
                'Không thể thêm thành viên. Vui lòng thử lại sau.' :
                'Không thể tạo nhóm. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const filteredFriends = searchTerm
        ? friends.filter(friend =>
            friend.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : friends;

    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.includes(item._id);
        const isAlreadyMember = item.isAlreadyMember;

        return (
            <TouchableOpacity
                style={[styles.item, isAlreadyMember && styles.disabledItem]}
                onPress={() => toggleSelect(item._id)}
                disabled={isAlreadyMember}
            >
                <Image
                    source={{ uri: item.avatarUrl || 'https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg' }}
                    style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {isAlreadyMember && (
                        <Text style={styles.memberStatus}>Đã tham gia</Text>
                    )}
                </View>
                {!isAlreadyMember && (
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading && friends.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0999fa" />
                <Text style={styles.loadingText}>Đang tải danh sách bạn bè...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {existingChatRoom ? 'Thêm thành viên' : 'Nhóm mới'}
                </Text>
                <Text style={styles.selected}>Đã chọn: {selectedUsers.length}</Text>
            </View>

            {/* Group Image & Name - Only show when creating new group */}
            {!existingChatRoom && (
                <View style={styles.groupInfoContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                        {groupImage ? (
                            <Image source={{ uri: groupImage }} style={styles.groupImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="camera-outline" size={36} color="#999" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <TextInput
                        placeholder="Đặt tên nhóm"
                        style={styles.groupInput}
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                </View>
            )}

            {/* Search */}
            <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={16} color="#999" />
                <TextInput
                    placeholder="Tìm tên bạn bè"
                    style={styles.searchInput}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <Text style={[styles.tab, styles.activeTab]}>BẠN BÈ</Text>
            </View>

            {/* List */}
            <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                style={styles.friendsList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {friends.length === 0
                                ? "Bạn chưa có bạn bè nào"
                                : "Không tìm thấy bạn bè phù hợp"}
                        </Text>
                    </View>
                }
            />

            {/* Create/Add Button */}
            {((selectedUsers.length >= 2 && !existingChatRoom) ||
                (selectedUsers.length > 0 && existingChatRoom)) && (
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleCreateGroup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.createButtonText}>
                                {existingChatRoom ? 'Thêm thành viên' : 'Tạo nhóm'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingHorizontal: 16
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    selected: {
        fontSize: 14,
        color: '#666'
    },
    groupInfoContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    imageContainer: {
        marginBottom: 15
    },
    groupImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupInput: {
        width: '100%',
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingVertical: 8,
        textAlign: 'center',
        fontSize: 16
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 8,
        marginVertical: 16,
    },
    searchInput: {
        marginLeft: 6,
        flex: 1
    },
    tabRow: {
        flexDirection: 'row',
        marginBottom: 10
    },
    tab: {
        marginRight: 20,
        color: '#999',
        fontWeight: 'bold'
    },
    activeTab: {
        color: '#000',
        borderBottomWidth: 2,
        borderBottomColor: '#000'
    },
    friendsList: {
        flex: 1
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    disabledItem: {
        opacity: 0.7
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12
    },
    name: {
        fontSize: 16
    },
    memberStatus: {
        fontSize: 12,
        color: '#0999fa',
        marginTop: 2
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#2196F3',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
    },
    createButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 50
    },
    emptyText: {
        color: '#888',
        fontSize: 16
    }
});

export default CreateGroupScreen;