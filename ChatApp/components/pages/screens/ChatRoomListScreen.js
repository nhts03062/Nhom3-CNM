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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { Swipeable } from 'react-native-gesture-handler';
import io from 'socket.io-client';

const ChatRoomListScreen = () => {
    const { token, logout, user } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();
    const [chatRooms, setChatRooms] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null);
    const [isJoin, setIsJoin] = useState(false);

    const API_URL = require('../../../services/api');

    const sortChatRooms = (rooms) => {
        return rooms.sort((a, b) => {
            const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
            const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
            return timeB - timeA; // Sort in descending order (newest first)
        });
    };

    // Initialize Socket.IO connection
    useEffect(() => {
        const newSocket = io(API_URL.replace('/api', ''), {
            auth: {
                token: token
            }
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [token]);

    // Handle Socket.IO events
    useEffect(() => {
        if (!socket || !user) return;

        // Join the user's personal room
        if (!isJoin) {
            console.log('Joining personal room for user:', user._id);
            socket.emit('join', user._id);
            setIsJoin(true);
        }

        // Listen for new messages
        socket.on('message-created', (data) => {
            console.log('New message received:', data);
            const chatId = typeof data.chatId === 'object' ? data.chatId._id : data.chatId;

            setChatRooms(prev => {
                const updatedRooms = prev.map(room => {
                    if (room._id === chatId) {
                        // Kiểm tra xem tin nhắn có phải từ người khác không
                        const isFromOther = data.sendID._id !== user._id;
                        if (isFromOther) {
                            console.log(`Marking chat room ${room._id} as unread`);
                            return {
                                ...room,
                                latestMessage: data,
                                unread: true,
                                unreadCount: (room.unreadCount || 0) + 1
                            };
                        }
                        return {
                            ...room,
                            latestMessage: data
                        };
                    }
                    return room;
                });
                const sortedRooms = sortChatRooms(updatedRooms);
                console.log('Updated rooms:', sortedRooms.map(room => ({
                    id: room._id,
                    unread: room.unread,
                    unreadCount: room.unreadCount
                })));
                return sortedRooms;
            });
        });

        // Listen for message deletions
        socket.on('message-deleted', (deletedMessage) => {
            console.log('Message deleted:', deletedMessage);
            setChatRooms(prev => {
                const updatedRooms = prev.map(room => {
                    if (room._id === deletedMessage.chatId && room.latestMessage?._id === deletedMessage._id) {
                        return {
                            ...room,
                            latestMessage: deletedMessage,
                            unread: false // Reset unread status if the latest message is recalled
                        };
                    }
                    return room;
                });
                return sortChatRooms(updatedRooms);
            });
        });

        socket.on('message-deleted-permanently', (messageId) => {
            console.log('Message deleted permanently:', messageId);
            setChatRooms(prev => {
                const updatedRooms = prev.map(room => {
                    if (room.latestMessage?._id === messageId) {
                        return {
                            ...room,
                            latestMessage: null,
                            unread: false // Reset unread status if the latest message is deleted
                        };
                    }
                    return room;
                });
                return sortChatRooms(updatedRooms);
            });
        });

        return () => {
            socket.off('join');
            socket.off('message-created');
            socket.off('message-deleted');
            socket.off('message-deleted-permanently');
        };
    }, [socket, user]);

    const fetchChatRooms = async () => {
        console.log('Token in ChatRoomListScreen:', token);

        if (!token) {
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
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/chatroom`);

            const sortedRooms = sortChatRooms(response.data.map(room => {
                const existingRoom = chatRooms.find(r => r._id === room._id);
                if (existingRoom) {
                    // Giữ nguyên trạng thái unread và unreadCount nếu phòng chat đã tồn tại
                    return {
                        ...room,
                        unread: existingRoom.unread,
                        unreadCount: existingRoom.unreadCount
                    };
                }
                // Khởi tạo mới với unread và unreadCount = 0
                return {
                    ...room,
                    unread: false,
                    unreadCount: 0
                };
            }));

            setChatRooms(sortedRooms);
            console.log('Fetched chat rooms:', sortedRooms.map(room => ({
                id: room._id,
                unread: room.unread,
                unreadCount: room.unreadCount
            })));
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

    const deleteChatRoom = async (chatRoomId) => {
        if (!chatRoomId) {
            Alert.alert('Lỗi', 'ID phòng chat không hợp lệ');
            return;
        }

        try {
            const response = await axios.delete(`${API_URL}/chatroom/${chatRoomId}`);

            if (response.status === 200) {
                const updatedRooms = chatRooms.filter(room => room._id !== chatRoomId);
                setChatRooms(sortChatRooms(updatedRooms));
                Alert.alert('Thành công', 'Phòng chat đã được xóa');
            }
        } catch (error) {
            console.error('Error deleting chat room:', error);
            let errorMessage = 'Không thể xóa phòng chat';
            if (error.response) {
                if (error.response.status === 500) {
                    errorMessage = 'Lỗi máy chủ, vui lòng thử lại sau';
                } else if (error.response.status === 403) {
                    errorMessage = error.response.data?.msg || 'Bạn không có quyền xóa phòng chat này';
                } else if (error.response.status === 404) {
                    errorMessage = 'Phòng chat không tồn tại';
                } else if (error.response.status === 401) {
                    errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
                    navigation.replace('Auth');
                } else {
                    errorMessage = error.response.data?.msg || 'Lỗi không xác định';
                }
            }
            Alert.alert('Lỗi', errorMessage);
            await fetchChatRooms();
        }
    };

    useEffect(() => {
        fetchChatRooms();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            // Handle updated chat room (e.g., name changes)
            if (route.params?.updatedChatRoom) {
                setChatRooms(prev => {
                    const updatedRooms = prev.map(room =>
                        room._id === route.params.updatedChatRoom._id
                            ? {
                                ...route.params.updatedChatRoom,
                                unread: false,
                                unreadCount: 0 // Reset về 0 khi đã đọc
                            }
                            : room
                    );
                    return sortChatRooms(updatedRooms);
                });
            }

            // Handle read status when returning from ChatScreen
            if (route.params?.chatRoomRead) {
                const { chatRoomId } = route.params.chatRoomRead;
                console.log('Marking chat room as read:', chatRoomId);

                // Cập nhật state local trước
                setChatRooms(prev => {
                    const updatedRooms = prev.map(room =>
                        room._id === chatRoomId
                            ? {
                                ...room,
                                unread: false,
                                unreadCount: 0
                            }
                            : room
                    );

                    // Lưu trạng thái đã đọc vào local storage hoặc context
                    const roomToUpdate = updatedRooms.find(room => room._id === chatRoomId);
                    if (roomToUpdate) {
                        // Cập nhật trạng thái đã đọc ngay lập tức
                        roomToUpdate.unread = false;
                        roomToUpdate.unreadCount = 0;
                    }

                    return sortChatRooms(updatedRooms);
                });

                // Cập nhật lại danh sách phòng chat để giữ nguyên trạng thái đã đọc
                fetchChatRooms();
            }

            // Cleanup function nếu cần
            return () => {
                // Thực hiện cleanup nếu cần
            };
        }, [route.params?.updatedChatRoom, route.params?.chatRoomRead])
    );

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
        if (chatRoom.chatRoomName) return chatRoom.chatRoomName;

        if (!chatRoom.isGroupChat && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member._id !== user._id);
            return otherMember ? otherMember.name : 'Người dùng';
        }

        return 'Nhóm chat';
    };

    // Fixed avatar source function for chat rooms
    const getAvatarSource = (chatRoom) => {
        console.log('Chat room avatar data:', {
            isGroupChat: chatRoom.isGroupChat,
            image: chatRoom.image,
            members: chatRoom.members?.length
        });

        // Nếu là group chat và có ảnh
        if (chatRoom.isGroupChat && chatRoom.image) {
            return { uri: chatRoom.image };
        }

        // Nếu không phải group chat (chat 1-1)
        if (!chatRoom.isGroupChat && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member._id !== user._id);
            console.log('Other member:', otherMember);

            if (otherMember && otherMember.avatarUrl &&
                otherMember.avatarUrl !== "https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg") {
                return { uri: otherMember.avatarUrl };
            }
        }

        // Tạo avatar mặc định từ tên
        const chatName = getChatRoomName(chatRoom);
        const encodedName = encodeURIComponent(chatName);
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png`;

        console.log('Using fallback avatar for chat:', fallbackUrl);
        return { uri: fallbackUrl };
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

        if (messageDate.toDateString() === today.toDateString()) {
            return messageDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        const diffDays = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            return weekdays[messageDate.getDay()];
        }

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

    const renderRightActions = (chatRoomId) => {
        return (
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                    Alert.alert(
                        'Xóa phòng chat',
                        'Bạn có chắc muốn xóa phòng chat này?',
                        [
                            { text: 'Hủy', style: 'cancel' },
                            {
                                text: 'Xóa',
                                style: 'destructive',
                                onPress: () => deleteChatRoom(chatRoomId)
                            }
                        ]
                    );
                }}
            >
                <Ionicons name="trash-outline" size={24} color="#FFF" />
                <Text style={styles.deleteButtonText}>Xóa</Text>
            </TouchableOpacity>
        );
    };

    const renderChatRoomItem = ({ item }) => {
        const chatName = getChatRoomName(item);
        console.log(`Rendering chat room ${item._id}: unread=${item.unread}, unreadCount=${item.unreadCount}`);

        return (
            <Swipeable renderRightActions={() => renderRightActions(item._id)}>
                <TouchableOpacity style={styles.chatItem} onPress={() => handleChatRoomPress(item)}>
                    <View style={styles.avatarContainer}>
                        {item.isGroupChat ? (
                            <View style={styles.groupAvatar}>
                                <Image
                                    source={getAvatarSource(item)}
                                    style={styles.avatar}
                                    onError={(e) => {
                                        console.log('Error loading chat avatar:', e.nativeEvent.error);
                                    }}
                                    onLoad={() => console.log('Chat avatar loaded successfully')}
                                />
                            </View>
                        ) : (
                            <Image
                                source={getAvatarSource(item)}
                                style={styles.avatar}
                                onError={(e) => {
                                    console.log('Error loading member avatar:', e.nativeEvent.error);
                                }}
                                onLoad={() => console.log('Member avatar loaded successfully')}
                            />
                        )}
                    </View>

                    <View style={styles.chatInfo}>
                        <Text style={styles.chatName}>{chatName}</Text>
                        <Text
                            style={[
                                styles.lastMessage,
                                item.unread && styles.unreadMessage
                            ]}
                            numberOfLines={1}
                        >
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
            </Swipeable>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#0068FF" barStyle="light-content" />

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
        backgroundColor: '#e1e1e1', // Placeholder background color
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0068FF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // Ensure image fits within the circular container
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
    unreadMessage: {
        fontWeight: 'bold', // Bold style for unread messages
        color: '#000', // Optional: Make the text darker for better visibility
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
    deleteButton: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        flexDirection: 'row',
    },
    deleteButtonText: {
        color: '#FFF',
        fontSize: 16,
        marginLeft: 5,
    },
});

export default ChatRoomListScreen;