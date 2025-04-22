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
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const AddGroupMembersScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { token, user } = useAuth();
    const chatRoom = route.params?.chatRoom;

    const [friends, setFriends] = useState([]);
    const [selected, setSelected] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch friends list and mark existing members
    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/user/allfriend`, {
                headers: { Authorization: token }
            });

            // Mark friends who are already in the group
            if (chatRoom && chatRoom.members) {
                const friendsWithStatus = response.data.map(friend => {
                    // Check if friend is already in the group
                    const isAlreadyMember = chatRoom.members.some(
                        member => typeof member === 'object'
                            ? member._id === friend._id
                            : member === friend._id
                    );

                    return {
                        ...friend,
                        isAlreadyMember
                    };
                });
                setFriends(friendsWithStatus);
            } else {
                setFriends(response.data);
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (userId) => {
        // Don't allow selecting users who are already members
        const friend = friends.find(f => f._id === userId);
        if (friend && friend.isAlreadyMember) {
            return;
        }

        setSelected(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleAddMembers = async () => {
        if (selected.length === 0) {
            Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 thành viên để thêm vào nhóm');
            return;
        }

        try {
            setLoading(true);

            // Get current members IDs
            const currentMemberIds = chatRoom.members.map(member =>
                typeof member === 'object' ? member._id : member
            );

            // Combine current members with newly selected members
            const allMembers = [...new Set([...currentMemberIds, ...selected])];

            // Update the chat room with new members
            const response = await axios.put(`${API_URL}/chatroom`, {
                chatRoomId: chatRoom._id,
                members: allMembers
            }, {
                headers: { Authorization: token }
            });

            if (response.data) {
                Alert.alert(
                    'Thành công',
                    'Đã thêm thành viên vào nhóm',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Cập nhật thông tin về GroupOptionsScreen
                                navigation.navigate({
                                    name: 'GroupOptionsScreen',
                                    params: {
                                        updatedChatRoom: response.data
                                    },
                                    merge: true
                                });
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error adding members:', error);
            Alert.alert('Lỗi', 'Không thể thêm thành viên vào nhóm. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const filteredFriends = searchQuery
        ? friends.filter(friend =>
            friend.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : friends;

    const renderItem = ({ item }) => {
        const isSelected = selected.includes(item._id);
        const isAlreadyMember = item.isAlreadyMember;

        return (
            <TouchableOpacity
                style={[styles.item, isAlreadyMember && styles.disabledItem]}
                onPress={() => toggleSelect(item._id)}
                disabled={isAlreadyMember}
            >
                <Image
                    source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0999fa&color=fff` }}
                    style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {isAlreadyMember && (
                        <Text style={styles.memberStatus}>Đã tham gia</Text>
                    )}
                </View>
                {!isAlreadyMember && (
                    <View style={[styles.checkbox, isSelected && styles.checked]}>
                        {isSelected && <View style={styles.innerDot} />}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thêm thành viên</Text>
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
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddMembers}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.addButtonText}>
                            Thêm {selected.length} thành viên vào nhóm
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
        backgroundColor: '#fff'
    },
    header: {
        backgroundColor: '#0999fa',
        paddingTop: 50,
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
    disabledItem: {
        opacity: 0.7,
        backgroundColor: '#f9f9f9'
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        borderColor: '#2196F3',
    },
    innerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
    },
    addButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        margin: 16,
    },
    addButtonText: {
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