import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    StatusBar,
    TextInput,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const ChatRoomListScreen = () => {
    const { token, logout, user } = useAuth();
    const navigation = useNavigation();
    const [chatRooms, setChatRooms] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_URL = require('../../../services/api');



    const fetchChatRooms = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/chatroom`, {
                headers: {
                    Authorization: token
                }
            });
            setChatRooms(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
            setError('Không thể tải danh sách phòng chat');

            if (error.response?.status === 401) {
                Alert.alert(
                    'Phiên đăng nhập hết hạn',
                    'Vui lòng đăng nhập lại.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                await logout();
                                navigation.replace('Auth');
                            }
                        }
                    ]
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChatRooms();
    }, []);

    const handleAddFriend = () => {
        setMenuVisible(false);
        navigation.navigate('AddFriendScreen');
    };

    const handleCreateNewChat = () => {
        setMenuVisible(false);
        navigation.navigate('CreateGroupScreen');
    };

    const handleChatRoomPress = (chatRoom) => {
        navigation.navigate('ChatScreen', { chatRoom });
    };

    const getChatRoomName = (chatRoom) => {
        // Nếu có tên nhóm thì hiển thị tên nhóm
        if (chatRoom.chatRoomName) return chatRoom.chatRoomName;

        // Nếu không phải nhóm chat (chat 1-1), hiển thị tên người còn lại
        if (!chatRoom.isGroupChat && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member._id !== user._id);
            return otherMember ? otherMember.name : 'Người dùng';
        }

        return 'Nhóm chat';
    };

    const getAvatarSource = (chatRoom) => {
        if (chatRoom.image) {
            return { uri: chatRoom.image };
        }

        if (!chatRoom.isGroupChat && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member._id !== user._id);
            if (otherMember && otherMember.avatarUrl) {
                return { uri: otherMember.avatarUrl };
            }
        }

        const chatName = getChatRoomName(chatRoom);
        return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=0999fa&color=fff` };
    };

    const getLastMessageText = (chatRoom) => {
        if (!chatRoom.latestMessage) {
            return 'Bắt đầu cuộc trò chuyện';
        }

        const { content, sendID } = chatRoom.latestMessage;
        const isOwnMessage = sendID?._id === user._id;
        const prefix = isOwnMessage ? 'Bạn: ' : '';

        if (content?.type === 'text') {
            return `${prefix}${content.text || 'Tin nhắn mới'}`;
        }

        const typeMap = {
            file: '[Tệp đính kèm]',
            media: '[Hình ảnh/Video]',
        };

        return `${prefix}${typeMap[content?.type] || 'Tin nhắn mới'}`;
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';

        const messageDate = new Date(timestamp);
        const today = new Date();

        // Nếu là tin nhắn của hôm nay, chỉ hiển thị giờ:phút
        if (messageDate.toDateString() === today.toDateString()) {
            return messageDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        // Nếu là tuần này, hiển thị tên thứ
        const diffDays = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            return weekdays[messageDate.getDay()];
        }

        // Nếu cũ hơn, hiển thị ngày/tháng
        return `${messageDate.getDate()}/${messageDate.getMonth() + 1}`;
    };

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    onPress: async () => {
                        await logout();
                        navigation.replace('Auth');
                    }
                }
            ]
        );
    };

    const renderChatRoomItem = ({ item }) => {
        const chatName = getChatRoomName(item);

        return (
            <TouchableOpacity style={styles.chatItem} onPress={() => handleChatRoomPress(item)}>
                <View style={styles.avatarContainer}>
                    {item.isGroupChat ? (
                        <View style={styles.groupAvatar}>
                            <Ionicons name="people" size={24} color="#FFF" />
                        </View>
                    ) : (
                        <Image
                            source={getAvatarSource(item)}
                            style={styles.avatar}
                        />
                    )}
                </View>

                <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{chatName}</Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {getLastMessageText(item)}
                    </Text>
                </View>

                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                        {formatMessageTime(item.latestMessage?.createdAt)}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#0068FF" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tin nhắn</Text>
                <View style={styles.headerRow}>
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={16} color="#8E8E93" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm"
                            placeholderTextColor="#8E8E93"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity style={styles.headerButton}>
                            <FontAwesome name="qrcode" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton} onPress={() => setMenuVisible(true)}>
                            <Feather name="plus" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Menu popup giống Zalo */}
            {menuVisible && (
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={styles.popupMenu}>
                        <TouchableOpacity style={styles.popupItem} onPress={handleAddFriend}>
                            <Ionicons name="person-add-outline" size={18} color="#333" />
                            <Text style={styles.popupText}>Thêm bạn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.popupItem} onPress={handleCreateNewChat}>
                            <Ionicons name="people-outline" size={18} color="#333" />
                            <Text style={styles.popupText}>Tạo nhóm</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}

            {/* Danh sách cuộc trò chuyện */}
            <FlatList
                data={chatRooms.filter((room) => {
                    if (!searchText) return true;
                    const name = getChatRoomName(room);
                    return name.toLowerCase().includes(searchText.toLowerCase());
                })}
                keyExtractor={(item) => item._id}
                renderItem={renderChatRoomItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="message-circle" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
                        <TouchableOpacity style={styles.newChatButton} onPress={handleCreateNewChat}>
                            <Text style={styles.newChatButtonText}>Tạo cuộc trò chuyện mới</Text>
                        </TouchableOpacity>
                    </View>
                }
                refreshing={loading}
                onRefresh={fetchChatRooms}
            />

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="chatbubble" size={24} color="#0999fa" />
                    <Text style={[styles.tabText, styles.tabTextActive]}>Tin nhắn</Text>
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

                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('PersonalScreen')}>
                    <Ionicons name="person-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Cá nhân</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Giữ nguyên styles hiện tại
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#0999fa',
        paddingTop: 40,
        paddingBottom: 10,
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    searchContainer: {
        backgroundColor: '#E6F0FA',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 34,
        width: '75%',
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        marginLeft: 16,
    },
    chatItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0068FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    timeText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    unreadBadge: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E93',
        marginTop: 10,
        marginBottom: 20,
    },
    newChatButton: {
        backgroundColor: '#0999fa',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    newChatButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
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
    modalOverlay: {
        position: 'absolute',
        top: 90,
        right: 10,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    popupMenu: {
        position: 'absolute',
        top: 0,
        right: 10,
        width: 200,
        backgroundColor: '#FFF',
        borderRadius: 8,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    popupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    popupText: {
        fontSize: 16,
        marginLeft: 10,
        color: '#333',
    },
});

export default ChatRoomListScreen;