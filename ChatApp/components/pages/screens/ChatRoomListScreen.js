import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    ActivityIndicator
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
    const [socket, setSocket] = useState(null);
    const [isJoin, setIsJoin] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [searchUserResult, setSearchUserResult] = useState(null);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    const [userFriends, setUserFriends] = useState([]);
    const [userSentRequests, setUserSentRequests] = useState([]);

    const API_URL = require('../../../services/api');
    // Lưu trạng thái unread của từng phòng, không mất khi fetch lại
    const unreadStatusRef = useRef({});

    useEffect(() => {
        if (!searchText.trim()) {
            setSearchUserResult(null);
            return;
        }
        // Tìm trong chatRooms
        const hasChatRoom = chatRooms.some((room) => {
            const name = getChatRoomName(room);
            return name.toLowerCase().includes(searchText.toLowerCase());
        });
        if (!hasChatRoom) {
            // Gọi API tìm user (giống AddFriendScreen)
            handleUserSearch(searchText);
        } else {
            setSearchUserResult(null);
        }
    }, [searchText, chatRooms]);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const res = await axios.get(`${API_URL}/user/allfriend`, {
                    headers: { Authorization: token }
                });
                setUserFriends(res.data.map(friend => friend._id));
            } catch {
                setUserFriends([]);
            }
        };
        const fetchSentRequests = async () => {
            try {
                const res = await axios.get(`${API_URL}/user/${user._id}`, {
                    headers: { Authorization: token }
                });
                let req = res.data.requestfriends || [];
                if (req.length > 0 && typeof req[0] === 'object') {
                    req = req.map(r => r._id || r.userId || r);
                }
                setUserSentRequests(req);
            } catch {
                setUserSentRequests([]);
            }
        };
        fetchFriends();
        fetchSentRequests();
    }, [token, user._id]);

    const handleUserSearch = async (searchTerm) => {
        setUserSearchLoading(true);
        try {
            let term = searchTerm.trim();
            const response = await axios.post(
                `${API_URL}/search`,
                { searchTerm: term },
                {
                    headers: { Authorization: token, 'Content-Type': 'application/json' }
                }
            );
            if (response.data && response.data.length > 0) {
                if (response.data[0]._id === user._id) {
                    setSearchUserResult(null);
                } else {
                    setSearchUserResult(response.data[0]);
                }
            } else {
                setSearchUserResult(null);
            }
        } catch (err) {
            setSearchUserResult(null);
        } finally {
            setUserSearchLoading(false);
        }
    };

    const sortChatRooms = (rooms) => {
        return rooms.sort((a, b) => {
            const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
            const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
            return timeB - timeA; // Sort in descending order (newest first)
        });
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('onlined', (userId) => {
            setOnlineUsers(prev => ({
                ...prev,
                [userId]: Date.now()
            }));
        });

        socket.on('offlined', (userId) => {
            setOnlineUsers(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
            });
        });

        if (user && user._id) {
            socket.emit('join', user._id);
        }

        return () => {
            socket.off('onlined');
            socket.off('offlined');
        };
    }, [socket, user]);

    useEffect(() => {
        const interval = setInterval(() => {
            setOnlineUsers(prev => {
                const now = Date.now();
                const updated = {};
                Object.entries(prev).forEach(([id, lastOnline]) => {
                    if (now - lastOnline <= 5 * 60 * 1000) {
                        updated[id] = lastOnline;
                    }
                });
                return updated;
            });
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const isUserOnline = (memberId) => !!onlineUsers[memberId];


    // Thêm vào useEffect trong ChatRoomListScreen
    useFocusEffect(
        React.useCallback(() => {
            if (route.params?.chatRoomId && route.params?.forwardedData) {
                setChatRooms(prevRooms => {
                    const updatedRooms = prevRooms.map(room =>
                        room._id === route.params.chatRoomId
                            ? { ...room, latestMessage: route.params.forwardedData }
                            : room
                    );
                    return sortChatRooms(updatedRooms);
                });
                fetchChatRooms();
                navigation.setParams({
                    forwardedMessage: undefined,
                    forwardedData: undefined,
                    chatRoomId: undefined,
                    timestamp: undefined,
                });
            } else if (route.params?.chatRoomRead) {
                const roomId = route.params.chatRoomRead.chatRoomId;
                resetUnreadForRoom(roomId);
                fetchChatRooms();
                navigation.setParams({ chatRoomRead: undefined });
            } else if (route.params?.forwardedMessage) {
                fetchChatRooms();
                navigation.setParams({
                    forwardedMessage: undefined,
                    timestamp: undefined,
                });
            } else {
                fetchChatRooms();
            }
        }, [
            route.params?.chatRoomRead,
            route.params?.forwardedMessage,
            route.params?.forwardedData,
            route.params?.chatRoomId
        ])
    );



    // 1. Kết nối socket
    useEffect(() => {
        const newSocket = io(API_URL.replace('/api', ''), {
            auth: { token }
        });
        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [token]);

    // 2. Xử lý sự kiện socket, cập nhật unreadStatusRef
    useEffect(() => {
        if (!socket || !user) return;

        if (!isJoin) {
            socket.emit('join', user._id);
            setIsJoin(true);
        }

        socket.on('message-created', (data) => {
            const chatId = typeof data.chatId === 'object' ? data.chatId._id : data.chatId;
            setChatRooms(prev => {
                const updatedRooms = prev.map(room => {
                    if (room._id === chatId) {
                        const isFromOther = data.sendID._id !== user._id;

                        const newLatestMessage = {
                            ...data,
                            content: {
                                ...data.content,
                                forwarded: data.content.forwarded || false,
                                forwardedFrom: data.content.forwardedFrom || ''
                            }
                        };

                        if (isFromOther) {
                            unreadStatusRef.current[room._id] = {
                                unread: true,
                                unreadCount: (unreadStatusRef.current[room._id]?.unreadCount || 0) + 1
                            };
                            return {
                                ...room,
                                latestMessage: newLatestMessage,
                                unread: true,
                                unreadCount: unreadStatusRef.current[room._id].unreadCount
                            };
                        }
                        return {
                            ...room,
                            latestMessage: newLatestMessage
                        };
                    }
                    return room;
                });
                return sortChatRooms(updatedRooms);
            });
        });

        socket.on('message-deleted', (deletedMessage) => {
            setChatRooms(prev => {
                const updatedRooms = prev.map(room => {
                    if (room._id === deletedMessage.chatId && room.latestMessage?._id === deletedMessage._id) {
                        return {
                            ...room,
                            latestMessage: deletedMessage,
                            unread: false
                        };
                    }
                    return room;
                });
                return sortChatRooms(updatedRooms);
            });
        });

        socket.on('message-deleted-permanently', (messageId) => {
            setChatRooms(prev => {
                const updatedRooms = prev.map(room => {
                    if (room.latestMessage?._id === messageId) {
                        return {
                            ...room,
                            latestMessage: null,
                            unread: false
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

    const [sending, setSending] = useState(false);
    const handleSendFriendRequest = async (userId) => {
        try {
            setSending(true);
            await axios.post(`${API_URL}/user/sendreqfriend`, { userId }, {
                headers: { Authorization: token, 'Content-Type': 'application/json' }
            });
            Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
            setUserSentRequests(prev => prev.includes(userId) ? prev : [...prev, userId]);
        } catch (error) {
            if (error.response?.data?.msg) {
                Alert.alert('Thông báo', error.response.data.msg);
            } else {
                Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
            }
        } finally {
            setSending(false);
        }
    };

    const handleCancelFriendRequest = async (userId) => {
        try {
            setSending(true);
            await axios.post(`${API_URL}/user/cancelreqfriend`, { userId }, {
                headers: { Authorization: token, 'Content-Type': 'application/json' }
            });
            Alert.alert('Thành công', 'Đã hủy lời mời kết bạn');
            setUserSentRequests(prev => prev.filter(id => id !== userId));
        } catch (error) {
            if (error.response?.data?.msg) {
                Alert.alert('Thông báo', error.response.data.msg);
            } else {
                Alert.alert('Lỗi', 'Không thể hủy lời mời kết bạn. Vui lòng thử lại sau.');
            }
        } finally {
            setSending(false);
        }
    };

    const handleChatRoomPressByUser = async (friendUser) => {
        // Kiểm tra đã có chatRoom chưa
        let existRoom = chatRooms.find(
            room => !room.isGroupChat && room.members.some(m => m._id === friendUser._id)
        );
        if (existRoom) {
            navigation.navigate('ChatScreen', { chatRoom: existRoom });
        } else {
            // Tạo chatRoom mới 1-1
            try {
                const res = await axios.post(
                    `${API_URL}/chatroom`,
                    { members: [friendUser._id] },
                    { headers: { Authorization: token } }
                );
                navigation.navigate('ChatScreen', { chatRoom: res.data });
            } catch (e) {
                Alert.alert('Lỗi', 'Không thể tạo phòng chat mới');
            }
        }
    };

    const renderActionButton = (userX) => {
        const isCurrentUser = userX._id === user._id;
        const isFriend = userFriends.includes(userX._id);
        const hasSentRequest = userSentRequests.includes(userX._id);

        if (isCurrentUser) return <Text style={styles.currentUserText}>Bản thân</Text>;
        if (isFriend) return (
            <TouchableOpacity style={styles.chatButton}
                onPress={() => handleChatRoomPressByUser(userX)}>
                <Text style={styles.buttonText}>Nhắn tin</Text>
            </TouchableOpacity>
        );
        if (hasSentRequest) return (
            <TouchableOpacity style={styles.cancelButton}
                onPress={() => handleCancelFriendRequest(userX._id)} disabled={sending}>
                <Text style={styles.buttonText}>{sending ? 'Đang hủy...' : 'Hủy lời mời'}</Text>
            </TouchableOpacity>
        );
        return (
            <TouchableOpacity style={styles.addButton}
                onPress={() => handleSendFriendRequest(userX._id)} disabled={sending}>
                <Text style={styles.buttonText}>{sending ? 'Đang gửi...' : 'Kết bạn'}</Text>
            </TouchableOpacity>
        );
    };

    // 3. Khi fetch danh sách phòng, chỉ lấy trạng thái unread/unreadCount từ ref
    const fetchChatRooms = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/chatroom`, {
                headers: { Authorization: token }
            });
            const apiRooms = response.data;

            const sortedRooms = sortChatRooms(apiRooms.map(room => {
                const status = unreadStatusRef.current[room._id] || { unread: false, unreadCount: 0 };
                return {
                    ...room,
                    unread: status.unread,
                    unreadCount: status.unreadCount
                };
            }));

            setChatRooms(sortedRooms);
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    // 4. Khi đọc phòng thì reset trạng thái phòng đó trong ref
    const resetUnreadForRoom = (roomId) => {
        unreadStatusRef.current[roomId] = { unread: false, unreadCount: 0 };
    };

    // 5. Khi xóa phòng thì remove ref phòng đó
    const deleteChatRoom = async (chatRoomId) => {
        if (!chatRoomId) {
            Alert.alert('Lỗi', 'ID phòng chat không hợp lệ');
            return;
        }
        try {
            const response = await axios.delete(`${API_URL}/chatroom/${chatRoomId}`, {
                headers: { Authorization: token }
            });
            if (response.status === 200) {
                const updatedRooms = chatRooms.filter(room => room._id !== chatRoomId);
                delete unreadStatusRef.current[chatRoomId];
                setChatRooms(sortChatRooms(updatedRooms));
                Alert.alert('Thành công', 'Phòng chat đã được xóa');
            }
        } catch (error) {
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

    // 6. Khi quay lại từ ChatScreen, chỉ reset unreadCount phòng vừa đọc
    useFocusEffect(
        React.useCallback(() => {
            if (route.params?.chatRoomRead) {
                const roomId = route.params.chatRoomRead.chatRoomId;
                resetUnreadForRoom(roomId);
                fetchChatRooms();
                navigation.setParams({ chatRoomRead: undefined });
            } else if (route.params?.forwardedMessage) {
                // Refresh danh sách khi có tin nhắn được chuyển tiếp
                fetchChatRooms();
                navigation.setParams({ forwardedMessage: undefined, timestamp: undefined });
            } else {
                fetchChatRooms();
            }
        }, [route.params?.chatRoomRead, route.params?.forwardedMessage])
    );

    // 7. Khi chỉnh sửa tên phòng, cập nhật lại 1 phòng duy nhất
    useFocusEffect(
        React.useCallback(() => {
            if (route.params?.updatedChatRoom) {
                setChatRooms(prev => {
                    const updatedRooms = prev.map(room =>
                        room._id === route.params.updatedChatRoom._id
                            ? {
                                ...route.params.updatedChatRoom,
                                unread: unreadStatusRef.current[room._id]?.unread || false,
                                unreadCount: unreadStatusRef.current[room._id]?.unreadCount || 0
                            }
                            : room
                    );
                    return sortChatRooms(updatedRooms);
                });
                navigation.setParams({ updatedChatRoom: undefined });
            }
        }, [route.params?.updatedChatRoom])
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

    const getAvatarSource = (chatRoom) => {
        if (chatRoom.isGroupChat && chatRoom.image) {
            return { uri: chatRoom.image };
        }
        if (!chatRoom.isGroupChat && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member._id !== user._id);
            if (otherMember && otherMember.avatarUrl &&
                otherMember.avatarUrl !== "https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg") {
                return { uri: otherMember.avatarUrl };
            }
        }
        const chatName = getChatRoomName(chatRoom);
        const encodedName = encodeURIComponent(chatName);
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png`;
        return { uri: fallbackUrl };
    };

    const getLastMessageText = (chatRoom) => {
        if (!chatRoom.latestMessage) return 'Bắt đầu cuộc trò chuyện';

        const { content, sendID } = chatRoom.latestMessage;
        const isOwnMessage =
            (typeof sendID === 'object' && sendID._id === user._id) ||
            (typeof sendID === 'string' && sendID === user._id);

        // Xử lý tin nhắn bị thu hồi
        if (chatRoom.latestMessage.recall === '1' && isOwnMessage) {
            return 'Bạn đã thu hồi tin nhắn này';
        }
        if (chatRoom.latestMessage.recall === '2') {
            return 'Tin nhắn đã bị thu hồi';
        }

        const prefix = isOwnMessage ? 'Bạn: ' : '';

        const isForwarded = content.forwarded || chatRoom.latestMessage.content?.forwarded;
        const forwardPrefix = isForwarded ? '↩️ ' : '';

        // Xử lý các loại tin nhắn
        let messageText = '';
        if (content.type === 'text') {
            messageText = content.text || 'Tin nhắn văn bản';
        } else if (content.type === 'file') {
            messageText = '📎 ' + (content.fileName || 'Tệp đính kèm');
        } else if (content.type === 'media') {
            messageText = '🖼️ Hình ảnh/Video';
        } else {
            messageText = 'Tin nhắn';
        }

        return `${prefix}${forwardPrefix}${messageText}`;
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const messageDate = new Date(timestamp);
        const diffMs = now - messageDate;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);

        if (diffSeconds < 60) return `${diffSeconds > 0 ? diffSeconds : 1} giây`;
        else if (diffMinutes < 60) return `${diffMinutes} phút`;
        else if (diffHours < 24) return `${diffHours} giờ`;
        else {
            const day = messageDate.getDate().toString().padStart(2, '0');
            const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
            const year = messageDate.getFullYear();
            return `${day}/${month}/${year}`;
        }
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

    const renderRightActions = (chatRoomId) => (
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

    const renderChatRoomItem = ({ item }) => {
        const chatName = getChatRoomName(item);
        return (
            <Swipeable renderRightActions={() => renderRightActions(item._id)}>
                <TouchableOpacity style={styles.chatItem} onPress={() => handleChatRoomPress(item)}>
                    <View style={styles.avatarContainer}>
                        <Image source={getAvatarSource(item)} style={styles.avatar} />
                        {/* 1-1 chat: Hiển thị chấm online nếu thành viên còn lại online */}
                        {!item.isGroupChat && item.members && item.members.length === 2 && (() => {
                            const other = item.members.find(m => m._id !== user._id);
                            if (other && isUserOnline(other._id)) {
                                return (
                                    <View style={styles.onlineDot} />
                                );
                            }
                            return null;
                        })()}
                        {/* Group chat: Nếu có ít nhất 1 thành viên (khác mình) đang online thì hiển thị chấm nhỏ */}
                        {item.isGroupChat && item.members && item.members.some(m => m._id !== user._id && isUserOnline(m._id)) && (
                            <View style={styles.onlineDotGroup} />
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
                data={
                    userSearchLoading
                        ? []
                        : searchUserResult
                            ? [{ ...searchUserResult, isUserSearch: true }]
                            : chatRooms.filter((room) => {
                                if (!searchText) return true;
                                const name = getChatRoomName(room);
                                return name.toLowerCase().includes(searchText.toLowerCase());
                            })
                }
                keyExtractor={(item) => item.isUserSearch ? 'searchUserResult' : item._id}
                renderItem={
                    ({ item }) => {
                        if (item.isUserSearch) {
                            return (
                                <View style={styles.userCard}>
                                    <Image source={getAvatarSource(item)} style={styles.avatar} />
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{item.name}</Text>
                                        <Text style={styles.userEmail}>{item.email}</Text>
                                        {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
                                    </View>
                                    <View style={styles.actionButtons}>
                                        {renderActionButton(item)}
                                    </View>
                                </View>
                            )
                        }
                        // Chat room item
                        return renderChatRoomItem({ item });
                    }
                }
                ListEmptyComponent={
                    userSearchLoading ? (
                        <ActivityIndicator size="large" color="#0999fa" style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Feather name="message-circle" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
                            <TouchableOpacity style={styles.newChatButton} onPress={handleCreateNewChat}>
                                <Text style={styles.newChatButtonText}>Tạo cuộc trò chuyện mới</Text>
                            </TouchableOpacity>
                        </View>
                    )
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
    container: { flex: 1, backgroundColor: '#FFFFFF' },
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
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 14, color: '#000' },
    headerButtons: { flexDirection: 'row', alignItems: 'center' },
    headerButton: { marginLeft: 16 },
    chatItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
        alignItems: 'center',
    },
    avatarContainer: { marginRight: 12 },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e1e1e1',
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0068FF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    chatInfo: { flex: 1, justifyContent: 'center' },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    lastMessage: { fontSize: 14, color: '#666' },
    unreadMessage: { fontWeight: 'bold', color: '#000' },
    timeContainer: { alignItems: 'flex-end' },
    timeText: { fontSize: 12, color: '#999', marginBottom: 4 },
    unreadBadge: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    unreadText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 10, marginBottom: 20 },
    newChatButton: {
        backgroundColor: '#0999fa',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    newChatButtonText: { color: '#FFFFFF', fontWeight: '600' },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5E5',
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        height: 60,
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
    tabText: { fontSize: 10, marginTop: 4, color: '#8E8E93' },
    tabTextActive: { color: '#0999fa' },
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
    popupText: { fontSize: 16, marginLeft: 10, color: '#333' },
    deleteButton: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        flexDirection: 'row',
    },
    deleteButtonText: { color: '#FFF', fontSize: 16, marginLeft: 5 },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff',
    },
    onlineDotGroup: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userCard: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    userPhone: {
        fontSize: 12,
        color: '#666',
    },
    actionButtons: {
        marginLeft: 8,
    },
    chatButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    addButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    cancelButton: {
        backgroundColor: '#ff6b6b',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 12,
    },
    currentUserText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
});

export default ChatRoomListScreen;