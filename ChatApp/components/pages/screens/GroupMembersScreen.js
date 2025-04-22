import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = require('../../../services/api');

const GroupMembersScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [members, setMembers] = useState(route.params?.members || []);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [loading, setLoading] = useState(false);
    const chatRoom = route.params?.chatRoom;

    // Check if the current user is the group leader
    const isGroupLeader = chatRoom.admin && chatRoom.admin.toString() === user._id.toString();

    useEffect(() => {
        if (route.params?.members) {
            setMembers(route.params.members);
        }
    }, [route.params?.members]);

    const handleLongPress = (member) => {
        // Prevent any action if the user is not the group leader
        if (!isGroupLeader) {
            return;
        }

        // Don't allow removing yourself
        if (member._id === user._id) {
            Alert.alert('Thông báo', 'Bạn không thể xóa chính mình khỏi nhóm');
            return;
        }

        setSelectedMember(member);
        setShowOptions(true);
    };

    const handleRemoveMember = async () => {
        if (!selectedMember || !chatRoom) return;

        try {
            setLoading(true);
            setShowOptions(false);

            const updatedMemberIds = members
                .filter(member => member._id !== selectedMember._id)
                .map(member => member._id);

            const response = await axios.put(`${API_URL}/chatroom`, {
                chatRoomId: chatRoom._id,
                members: updatedMemberIds
            });

            if (response.data) {
                const updatedMembers = members.filter(
                    member => member._id !== selectedMember._id
                );
                setMembers(updatedMembers);

                const updatedChatRoom = response.data;

                navigation.navigate({
                    name: 'GroupOptionsScreen',
                    params: {
                        updatedChatRoom: updatedChatRoom
                    },
                    merge: true
                });

                Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            Alert.alert('Lỗi', 'Không thể xóa thành viên. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
            setSelectedMember(null);
        }
    };

    const renderMember = ({ item }) => {
        const isGroupCreator = chatRoom.admin && chatRoom.admin.toString() === item._id.toString();

        return (
            <TouchableOpacity
                style={styles.memberItem}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0999fa&color=fff` }}
                        style={styles.avatar}
                    />
                    {isGroupCreator && (
                        <Ionicons
                            name="key"
                            size={16}
                            color="#FFD700"
                            style={styles.keyIcon}
                        />
                    )}
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.name}>
                        {item.name} {item._id === user._id ? '(Bạn)' : ''}
                    </Text>
                    {isGroupCreator && (
                        <Text style={styles.groupCreatorLabel}>Trưởng nhóm</Text>
                    )}
                    {item.email && <Text style={styles.email}>{item.email}</Text>}
                </View>
                {/* Only show the "more" button for the group leader and for members other than the current user */}
                {isGroupLeader && item._id !== user._id && (
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleLongPress(item)}
                    >
                        <Ionicons name="ellipsis-vertical" size={18} color="#666" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderOptionsModal = () => (
        <Modal
            transparent={true}
            visible={showOptions}
            animationType="fade"
            onRequestClose={() => setShowOptions(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowOptions(false)}
            >
                <View style={styles.optionsContainer}>
                    <Text style={styles.optionsTitle}>
                        {selectedMember?.name}
                    </Text>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={handleRemoveMember}
                    >
                        <Ionicons name="person-remove" size={22} color="#f44336" />
                        <Text style={styles.removeText}>Xóa khỏi nhóm</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowOptions(false)}
                    >
                        <Text style={styles.cancelText}>Hủy</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thành viên ({members.length})</Text>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#0999fa" />
                </View>
            )}

            <FlatList
                data={members}
                keyExtractor={(item) => item._id}
                renderItem={renderMember}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Không có thành viên nào</Text>
                    </View>
                }
            />

            {renderOptionsModal()}
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
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20
    },
    keyIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '500'
    },
    groupCreatorLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        fontWeight: 'bold'
    },
    email: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 50
    },
    emptyText: {
        color: '#888',
        fontSize: 16
    },
    moreButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        width: '80%',
        maxWidth: 300,
    },
    optionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        textAlign: 'center'
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    removeText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#f44336',
    },
    cancelButton: {
        padding: 14,
        backgroundColor: '#f8f8f8',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'center'
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666'
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 2
    }
});

export default GroupMembersScreen;