import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Modal, TextInput, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/AuthContext';

const GroupOptionsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { token, user } = useAuth();
    const [chatRoom, setChatRoom] = useState(route.params?.chatRoom);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState(chatRoom?.chatRoomName || '');
    const [newGroupImage, setNewGroupImage] = useState(chatRoom?.image || '');
    const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
    const [loading, setLoading] = useState(false);
    const API_URL = require('../../../services/api');

    // Check if current user is admin
    const isCurrentUserAdmin = chatRoom?.admin?._id === user._id || chatRoom?.admin === user._id;

    // Get other members (excluding current user) for admin selection
    const otherMembers = chatRoom?.members?.filter(member => member._id !== user._id) || [];

    useFocusEffect(
        React.useCallback(() => {
            if (route.params?.updatedChatRoom) {
                setChatRoom(route.params.updatedChatRoom);
                setNewGroupName(route.params.updatedChatRoom.chatRoomName || '');
                setNewGroupImage(route.params.updatedChatRoom.image || '');
            }
            return () => { };
        }, [route.params?.updatedChatRoom])
    );

    const handleGoBack = () => {
        navigation.navigate({
            name: 'ChatScreen',
            params: { updatedChatRoom: chatRoom },
            merge: true
        });
    };

    const handleEditGroup = async () => {
        // Log the token to verify its presence
        console.log('Token in GroupOptionsScreen:', token);

        // Check if token is missing or undefined
        if (!token) {
            Alert.alert('Lỗi', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            return;
        }

        try {
            const response = await axios.put(`${API_URL}/chatroom`, {
                chatRoomId: chatRoom._id,
                chatRoomName: newGroupName,
                image: newGroupImage,
                members: chatRoom.members.map(member => member._id),
            });

            const updatedChatRoom = response.data;
            setChatRoom(updatedChatRoom);
            setShowEditModal(false);
            Alert.alert('Thành công', 'Thông tin nhóm đã được cập nhật');

            // Update ChatScreen with the new chat room data
            navigation.navigate({
                name: 'ChatScreen',
                params: { updatedChatRoom },
                merge: true
            });

            // Update ChatRoomListScreen by navigating back with updated data
            navigation.navigate({
                name: 'ChatRoomListScreen',
                params: { updatedChatRoom },
                merge: true
            });

        } catch (error) {
            console.error('Error updating group:', error);
            let errorMessage = 'Không thể cập nhật thông tin nhóm';
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
                    // Optionally redirect to login screen
                    navigation.navigate('Auth');
                } else {
                    errorMessage = error.response.data?.msg || 'Lỗi không xác định';
                }
            }
            Alert.alert('Lỗi', errorMessage);
        }
    };

    const handleImagePicker = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setNewGroupImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại sau.');
        }
    };

    const handleLeaveGroup = () => {
        if (isCurrentUserAdmin) {
            if (otherMembers.length === 0) {
                Alert.alert(
                    'Không thể rời nhóm',
                    'Bạn là thành viên duy nhất trong nhóm. Hãy xóa nhóm thay vì rời nhóm.',
                    [{ text: 'OK' }]
                );
                return;
            }
            // Show modal to select new admin
            setShowLeaveModal(true);
        } else {
            // Regular member can leave directly
            Alert.alert(
                'Rời nhóm',
                'Bạn có chắc muốn rời khỏi nhóm này?',
                [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Rời nhóm', style: 'destructive', onPress: performLeaveGroup }
                ]
            );
        }
    };

    const performLeaveGroup = async (newAdminId = null) => {
        try {
            setLoading(true);

            if (isCurrentUserAdmin && newAdminId) {
                // First, transfer admin rights
                const updatedMembers = chatRoom.members
                    .filter(member => member._id !== user._id)
                    .map(member => member._id);

                await axios.put(`${API_URL}/chatroom`, {
                    chatRoomId: chatRoom._id,
                    chatRoomName: chatRoom.chatRoomName,
                    members: updatedMembers,
                    image: chatRoom.image,
                    newAdminId: newAdminId
                }, {
                    headers: { Authorization: token }
                });
            } else {
                // Regular member leaving
                await axios.delete(`${API_URL}/chatroom/leave/${chatRoom._id}`, {
                    headers: { Authorization: token }
                });
            }

            Alert.alert(
                'Thành công',
                'Bạn đã rời khỏi nhóm.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Navigate back to chat list and refresh
                            navigation.navigate('ChatRoomListScreen');
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Error leaving group:', error);
            let errorMessage = 'Không thể rời khỏi nhóm';
            if (error.response) {
                errorMessage = error.response.data?.msg || 'Lỗi không xác định';
            }
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setLoading(false);
            setShowLeaveModal(false);
            setSelectedNewAdmin(null);
        }
    };

    const confirmLeaveWithNewAdmin = () => {
        if (!selectedNewAdmin) {
            Alert.alert('Thông báo', 'Vui lòng chọn trưởng nhóm mới trước khi rời nhóm.');
            return;
        }

        const selectedMember = otherMembers.find(member => member._id === selectedNewAdmin);

        Alert.alert(
            'Xác nhận rời nhóm',
            `Bạn sẽ bổ nhiệm ${selectedMember?.name} làm trưởng nhóm mới và rời khỏi nhóm. Bạn có chắc chắn?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    style: 'destructive',
                    onPress: () => performLeaveGroup(selectedNewAdmin)
                }
            ]
        );
    };

    const renderMemberItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.memberSelectItem,
                selectedNewAdmin === item._id && styles.selectedMemberItem
            ]}
            onPress={() => setSelectedNewAdmin(item._id)}
        >
            <Image
                source={{
                    uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0999fa&color=fff`
                }}
                style={styles.memberAvatar}
            />
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                {item.email && <Text style={styles.memberEmail}>{item.email}</Text>}
            </View>
            <View style={styles.radioButton}>
                {selectedNewAdmin === item._id && (
                    <View style={styles.radioButtonSelected} />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderLeaveGroupModal = () => (
        <Modal
            transparent={true}
            visible={showLeaveModal}
            animationType="slide"
            onRequestClose={() => setShowLeaveModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.leaveModalContainer}>
                    <Text style={styles.leaveModalTitle}>
                        Bổ nhiệm trưởng nhóm mới
                    </Text>
                    <Text style={styles.leaveModalSubtitle}>
                        Vì bạn là trưởng nhóm, hãy chọn thành viên khác để làm trưởng nhóm mới trước khi rời nhóm.
                    </Text>

                    <FlatList
                        data={otherMembers}
                        keyExtractor={(item) => item._id}
                        renderItem={renderMemberItem}
                        style={styles.membersList}
                        ListEmptyComponent={
                            <Text style={styles.emptyMembersText}>
                                Không có thành viên khác trong nhóm
                            </Text>
                        }
                    />

                    <View style={styles.leaveModalButtons}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowLeaveModal(false);
                                setSelectedNewAdmin(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.confirmLeaveButton,
                                !selectedNewAdmin && styles.disabledButton
                            ]}
                            onPress={confirmLeaveWithNewAdmin}
                            disabled={!selectedNewAdmin || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmLeaveButtonText}>
                                    Bổ nhiệm và rời nhóm
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (!chatRoom) {
        return (
            <View style={styles.errorContainer}>
                <Text>Không tìm thấy thông tin nhóm</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tùy chọn</Text>
                </View>

                <View style={styles.groupInfo}>
                    <Image
                        source={{ uri: chatRoom.image || 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg' }}
                        style={styles.groupAvatar}
                    />
                    <View style={styles.groupNameContainer}>
                        <Text style={styles.groupName}>{chatRoom.chatRoomName}</Text>
                        <TouchableOpacity onPress={() => setShowEditModal(true)}>
                            <Ionicons name="pencil" size={20} color="#333" style={styles.editIcon} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="search-outline" size={20} />
                        <Text style={styles.actionText}>Tìm tin nhắn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('AddGroupMembersScreen', { chatRoom })}
                    >
                        <Ionicons name="person-add-outline" size={20} />
                        <Text style={styles.actionText}>Thêm thành viên</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="image-outline" size={20} />
                        <Text style={styles.actionText}>Đổi hình nền</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="notifications-outline" size={20} />
                        <Text style={styles.actionText}>Tắt thông báo</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.section}
                    onPress={() =>
                        navigation.navigate('GroupMembersScreen', {
                            members: chatRoom.members,
                            chatRoom: chatRoom
                        })
                    }
                >
                    <Text style={styles.sectionText}>
                        Xem thành viên ({chatRoom.members ? chatRoom.members.length : 0})
                    </Text>
                </TouchableOpacity>

                {/* Leave Group Section */}
                <TouchableOpacity
                    style={styles.leaveSection}
                    onPress={handleLeaveGroup}
                >
                    <Ionicons name="exit-outline" size={20} color="#f44336" style={styles.leaveSectionIcon} />
                    <Text style={styles.leaveSectionText}>Rời nhóm</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Edit Modal */}
            <Modal visible={showEditModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.modalTitle}>Chỉnh sửa thông tin nhóm</Text>
                        <TouchableOpacity onPress={handleImagePicker}>
                            <Image
                                source={{ uri: newGroupImage || 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg' }}
                                style={styles.modalImage}
                            />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.modalInput}
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            placeholder="Tên nhóm"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleEditGroup}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Lưu</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Leave Group Modal */}
            {renderLeaveGroupModal()}
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
        paddingBottom: 20,
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
    groupInfo: {
        alignItems: 'center',
        marginVertical: 20
    },
    groupAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginBottom: 10
    },
    groupNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8
    },
    editIcon: {
        marginLeft: 5
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    actionButton: {
        alignItems: 'center'
    },
    actionText: {
        marginTop: 6
    },
    section: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionText: {
        fontSize: 16
    },
    leaveSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    leaveSectionIcon: {
        marginRight: 12,
    },
    leaveSectionText: {
        fontSize: 16,
        color: '#f44336',
        fontWeight: '500'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    backButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#0999fa',
        borderRadius: 5
    },
    backButtonText: {
        color: 'white',
        fontWeight: 'bold'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editModal: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        width: '100%',
        marginBottom: 20,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    saveButton: {
        backgroundColor: '#0999fa',
    },
    modalButtonText: {
        fontSize: 16,
        color: '#333',
    },
    // Leave Group Modal Styles
    leaveModalContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    leaveModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333'
    },
    leaveModalSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
        lineHeight: 20
    },
    membersList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    memberSelectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f8f8f8',
    },
    selectedMemberItem: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#0999fa',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333'
    },
    memberEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#0999fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#0999fa',
    },
    emptyMembersText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
        paddingVertical: 20
    },
    leaveModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500'
    },
    confirmLeaveButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#f44336',
        alignItems: 'center',
    },
    confirmLeaveButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500'
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
});

export default GroupOptionsScreen;