import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Keyboard,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Linking,
    FlatList
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
import { useAuth } from '../../../contexts/AuthContext';
import io from 'socket.io-client';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = require('../../../services/api');

const ChatScreen = () => {
    const [message, setMessage] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chatRoom, setChatRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showMessageOptions, setShowMessageOptions] = useState(false);
    const [newMessages, setNewMessages] = useState(new Set());
    const [downloadingFile, setDownloadingFile] = useState(null);
    const scrollViewRef = useRef();
    const textInputRef = useRef(null);
    const route = useRoute();
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [isJoin, setIsJoin] = useState(false);
    const [isFriend, setIsFriend] = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardMessage, setForwardMessage] = useState(null);
    const [forwardChatRooms, setForwardChatRooms] = useState([]);
    const [selectedForwardChatRooms, setSelectedForwardChatRooms] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [forwardLoading, setForwardLoading] = useState(false);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [previewImageUri, setPreviewImageUri] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState(route.params?.searchKeyword || null);
    const [searchResults, setSearchResults] = useState([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
    const HEADER_HEIGHT = 90;

    const chatRoomParam = route.params?.chatRoom;
    const userIdParam = route.params?.userId;

    const getOtherUserInPersonalChat = (chatRoom, user) => {
        if (!chatRoom || chatRoom.isGroupChat || !chatRoom.members) return null;
        return chatRoom.members.find(member => member._id !== user._id);
    };

    useFocusEffect(
        useCallback(() => {
            if (route.params?.searchKeyword) {
                setSearchKeyword(route.params.searchKeyword);
                handleSearchMessages(route.params.searchKeyword);
            }
        }, [route.params?.searchKeyword, messages])
    );

    const handleSearchMessages = (keyword) => {
        if (!keyword || !messages.length) {
            setSearchResults([]);
            return;
        }
        const lowerKeyword = keyword.toLowerCase();
        const resultIds = messages
            .filter(msg =>
                msg.content.type === 'text' &&
                msg.content.text.toLowerCase().includes(lowerKeyword)
            )
            .map(msg => msg._id);

        setSearchResults(resultIds);

        // Auto scroll đến tin nhắn đầu tiên khớp
        if (resultIds.length) {
            const idx = messages.findIndex(m => m._id === resultIds[0]);
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 60 * idx, animated: true });
            }, 300);
        }
    };

    const scrollToSearchResult = (resultIdx) => {
        if (searchResults[resultIdx] !== undefined && scrollViewRef.current) {
            // Tìm index của tin nhắn trong mảng messages
            const messageId = searchResults[resultIdx];
            const idx = messages.findIndex(m => m._id === messageId);

            if (idx >= 0) {
                const offset = idx * 70 - HEADER_HEIGHT;
                scrollViewRef.current.scrollTo({ y: offset > 0 ? offset : 0, animated: true });
            }
        }
    };

    useEffect(() => {
        setCurrentSearchIndex(0);
        if (searchResults.length > 0) {
            scrollToSearchResult(0);
        }
    }, [searchKeyword, searchResults]);


    useFocusEffect(
        useCallback(() => {
            if (!route.params?.searchKeyword) {
                setSearchKeyword(null);
                setSearchResults([]);
            }
        }, [route.params?.searchKeyword])
    );


    // Kiểm tra bạn bè
    const checkIsFriend = async (otherUser) => {
        try {
            const response = await axios.get(`${API_URL}/user/allfriend`, {
                headers: { Authorization: token }
            });
            const friends = response.data;
            const friendStatus = friends.some(friend => friend._id === otherUser._id);
            setIsFriend(friendStatus);
            return friendStatus;
        } catch {
            setIsFriend(false);
            return false;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    useFocusEffect(
        useCallback(() => {
            if (route.params?.updatedChatRoom) {
                setChatRoom(route.params.updatedChatRoom);
                fetchMessages(route.params.updatedChatRoom._id);
            } else if (chatRoom && chatRoom._id) {
                fetchMessages(chatRoom._id);
            }

            // Add this to update friendship status
            if (route.params?.friendshipUpdated !== undefined) {
                setIsFriend(route.params.friendshipUpdated);
            }
        }, [route.params?.updatedChatRoom, chatRoom?._id, route.params?.friendshipUpdated])
    );

    const handleSendFriendRequest = async () => {
        try {
            const otherUser = getOtherUserInPersonalChat(chatRoom, user);
            if (!otherUser) return;

            const response = await axios.post(
                `${API_URL}/user/sendreqfriend`,
                { userId: otherUser._id },
                {
                    headers: {
                        Authorization: token,
                        'Content-Type': 'application/json'
                    }
                }
            );

            Alert.alert(
                'Thành công',
                'Đã gửi lời mời kết bạn',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error sending friend request:', error);
            if (error.response?.data?.msg) {
                Alert.alert('Thông báo', error.response.data.msg);
            } else {
                Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
            }
        }
    };

    useEffect(() => {
        if (chatRoom) {
            return () => {
                console.log('Exiting ChatScreen, marking chat room as read:', chatRoom._id);
                navigation.navigate('ChatRoomListScreen', {
                    chatRoomRead: { chatRoomId: chatRoom._id }
                });
            };
        }
    }, [chatRoom, navigation]);

    useEffect(() => {
        const newSocket = io(API_URL.replace('/api', ''), {
            auth: { token }
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [token]);

    useEffect(() => {
        if (!socket || !chatRoom) return;

        if (!isJoin) {
            socket.emit('join', chatRoom._id);
            setIsJoin(true);
        }

        socket.on('message-created', (data) => {
            console.log('New message received:', data);
            const chatId = typeof data.chatId === 'object' ? data.chatId._id : data.chatId;

            if (chatId === chatRoom._id) {
                setMessages(prev => {
                    const messageExists = prev.some(msg => msg._id === data._id);
                    if (!messageExists) {
                        const newMessages = [...prev, data];
                        setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                        return newMessages;
                    }
                    return prev;
                });

                setNewMessages(prev => new Set([...prev, data._id]));
            }
        });

        socket.on('message-deleted', (deletedMessage) => {
            console.log('Message recalled:', deletedMessage);
            if (deletedMessage.chatId === chatRoom._id) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg._id === deletedMessage._id ? { ...deletedMessage } : msg
                    )
                );
            }
        });

        // Trong phần useEffect xử lý sự kiện socket
        socket.on('user-left', (chatRoomId, userData) => {
            console.log('Received user-left event:', chatRoomId, userData); // Thêm log để xem dữ liệu nhận được

            if (chatRoomId === chatRoom._id) {
                // Xử lý tên người dùng - đảm bảo luôn có giá trị
                let displayName = "Người dùng";
                if (userData) {
                    // Kiểm tra nếu userData là object hay string
                    if (typeof userData === 'object') {
                        displayName = userData.userName || userData.name || "Người dùng";
                    } else if (typeof userData === 'string') {
                        // Nếu backend gửi về ID người dùng thay vì object
                        // Có thể tìm kiếm tên từ danh sách thành viên
                        const member = chatRoom.members?.find(m => m._id === userData);
                        displayName = member?.name || "Người dùng";
                    }
                }

                // Tạo system message
                const leaveMessage = {
                    _id: `leave_${typeof userData === 'object' ? userData.userId : userData}_${Date.now()}`,
                    chatId: chatRoom._id,
                    system: true,
                    systemType: 'userLeft',
                    content: {
                        type: 'system',
                        text: `${displayName} rời khỏi nhóm.`
                    },
                    createdAt: (typeof userData === 'object' && userData.timestamp) || new Date().toISOString()
                };

                // Thêm tin nhắn vào danh sách
                setMessages(prev => [...prev, leaveMessage]);

                // Lưu vào AsyncStorage để tin nhắn vẫn còn khi quay lại
                saveSystemMessage(chatRoom._id, leaveMessage);
            }
        });

        return () => {
            socket.off('join');
            socket.off('message-created');
            socket.off('message-deleted');
            socket.off('user-left');
        };
    }, [socket, chatRoom, user._id, selectedMessage]);

    const saveSystemMessage = async (chatRoomId, message) => {
        try {
            // Get existing system messages for this chat room
            const existingMessagesJson = await AsyncStorage.getItem(`system_messages_${chatRoomId}`);
            let existingMessages = existingMessagesJson ? JSON.parse(existingMessagesJson) : [];

            // Add new message
            existingMessages.push(message);

            // Save updated messages
            await AsyncStorage.setItem(`system_messages_${chatRoomId}`, JSON.stringify(existingMessages));
        } catch (error) {
            console.error('Error saving system message:', error);
        }
    };

    useEffect(() => {
        const loadChatRoom = async () => {
            try {
                setLoading(true);

                if (chatRoomParam) {
                    setChatRoom(chatRoomParam);
                    await fetchMessages(chatRoomParam._id);

                    // Check friendship status if it's a personal chat
                    if (!chatRoomParam.isGroupChat) {
                        const otherUser = getOtherUserInPersonalChat(chatRoomParam, user);
                        if (otherUser) {
                            await checkIsFriend(otherUser);
                        }
                    }
                } else if (userIdParam) {
                    // Rest of existing code...
                }
            } catch (error) {
                console.error('Error loading chat:', error);
                Alert.alert('Lỗi', 'Không thể tải tin nhắn. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        loadChatRoom();
    }, [chatRoomParam, userIdParam, token]);

    const fetchMessages = async (chatId) => {
        try {
            const response = await axios.get(`${API_URL}/message/${chatId}`, {
                headers: { Authorization: token }
            });

            // Get system messages from AsyncStorage
            let systemMessages = [];
            try {
                const systemMessagesJson = await AsyncStorage.getItem(`system_messages_${chatId}`);
                if (systemMessagesJson) {
                    systemMessages = JSON.parse(systemMessagesJson);
                }
            } catch (error) {
                console.error('Error loading system messages:', error);
            }

            // Combine API messages with system messages and sort by date
            const allMessages = [...response.data, ...systemMessages].sort((a, b) =>
                new Date(a.createdAt) - new Date(b.createdAt)
            );

            setMessages(allMessages);
            setNewMessages(new Set());
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 100);
        } catch (error) {
            console.error('Error fetching messages:', error);
            Alert.alert('Lỗi', 'Không thể tải tin nhắn. Vui lòng thử lại.');
        }
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            setShowEmojiPicker(false);
            scrollViewRef.current?.scrollToEnd({ animated: true });
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const handleEmojiSelect = (emoji) => {
        setMessage(prev => prev + emoji);
    };

    const toggleEmojiPicker = () => {
        if (keyboardVisible) {
            Keyboard.dismiss();
            setTimeout(() => {
                setShowEmojiPicker(prev => !prev);
            }, 100);
        } else {
            setShowEmojiPicker(prev => !prev);
        }
    };

    const handleSendMessage = async () => {
        if (message.trim().length === 0 || !chatRoom) return;

        try {
            const content = { type: 'text', text: message };
            let endpoint = `${API_URL}/message`;
            let postData = { chatId: chatRoom._id, content };

            if (replyingTo) {
                endpoint = `${API_URL}/message/reply`;
                postData = { _id: replyingTo._id, content };
            }

            const tempMessage = {
                _id: Date.now().toString(),
                chatId: chatRoom._id,
                sendID: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
                content,
                replyToMessage: replyingTo ? {
                    _id: replyingTo._id,
                    content: replyingTo.content,
                    sendID: replyingTo.sendID
                } : null,
                createdAt: new Date().toISOString(),
                recall: '0'
            };

            setMessages(prev => [...prev, tempMessage]);
            setMessage('');
            setReplyingTo(null);
            scrollViewRef.current?.scrollToEnd({ animated: true });

            const response = await axios.post(endpoint, postData, {
                headers: { Authorization: token }
            });

            setMessages(prev =>
                prev.map(msg =>
                    msg._id === tempMessage._id ? response.data : msg
                )
            );

            if (socket) {
                socket.emit('create-message', {
                    chatRoomId: chatRoom._id,
                    data: response.data
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
        }
    };

    const handleSendFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['*/*'],
                copyToCacheDirectory: true,
                multiple: false
            });

            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                await uploadFile(file, 'file');
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Lỗi', 'Không thể chọn tệp. Vui lòng thử lại.');
        }
    };

    const handleImagePicker = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 1,
                allowsMultipleSelection: true
            });

            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const files = result.assets;
                for (const file of files) {
                    await uploadFile(file, 'media');
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
        }
    };

    const uploadFile = async (file, type) => {
        if (!chatRoom) {
            Alert.alert('Lỗi', 'Không thể tải lên khi không có cuộc trò chuyện.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('chatId', chatRoom._id);

            const content = {
                type,
                text: message.trim(),
                fileName: file.name || `file_${Date.now()}`,
                fileSize: file.size || 0
            };

            formData.append('content', JSON.stringify(content));

            const fileToUpload = {
                uri: file.uri,
                type: file.mimeType || 'application/octet-stream',
                name: file.name || `file_${Date.now()}`
            };

            formData.append(type, fileToUpload);

            setMessage('');

            const tempId = Date.now().toString();
            const tempMessage = {
                _id: tempId,
                chatId: chatRoom._id,
                sendID: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
                content: {
                    type,
                    text: '',
                    fileName: file.name || `file_${Date.now()}`,
                    fileSize: file.size || 0,
                    files: []
                },
                createdAt: new Date().toISOString(),
                recall: '0'
            };

            setMessages(prev => [...prev, tempMessage]);
            scrollViewRef.current?.scrollToEnd({ animated: true });

            const response = await axios.post(`${API_URL}/message`, formData, {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'multipart/form-data',
                }
            });

            setMessages(prev => prev.filter(msg => msg._id !== tempId).concat(response.data));

            if (socket) {
                socket.emit('create-message', {
                    chatRoomId: chatRoom._id,
                    data: response.data
                });
            }

            scrollViewRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error uploading file:', error);
            Alert.alert('Lỗi', 'Không thể tải lên tệp. Vui lòng thử lại.');
        }
    };

    const handleRecallMessage = async (code) => {
        if (!selectedMessage) {
            setShowMessageOptions(false);
            return;
        }

        // KIỂM TRA HẠN THU HỒI VỚI MỌI NGƯỜI
        if (code === '2') {
            if (selectedMessage.createdAt) {
                const createdAtTime = new Date(selectedMessage.createdAt).getTime();
                const now = Date.now();

                // NẾU KHÔNG HỢP LỆ -> KHÔNG THU HỒI, THÔNG BÁO VÀ RETURN
                if (isNaN(createdAtTime) || (now - createdAtTime > 24 * 60 * 60 * 1000)) {
                    Alert.alert('Không thể thu hồi', 'Bạn chỉ có thể thu hồi tin nhắn trong 1 ngày sau khi gửi.');
                    setShowMessageOptions(false);
                    return;
                }
            } else {
                // Trường hợp không có createdAt (phòng lỗi)
                Alert.alert('Không thể thu hồi', 'Không xác định được thời gian gửi tin nhắn.');
                setShowMessageOptions(false);
                return;
            }
        }

        // PHẦN DƯỚI GIỮ NGUYÊN, KHÔNG ĐỔI
        try {
            if (selectedMessage.recall === '1' || selectedMessage.recall === '2') {
                Alert.alert('Lỗi', 'Tin nhắn đã được thu hồi trước đó.');
                setShowMessageOptions(false);
                return;
            }

            const updatedMessages = messages.map(msg =>
                msg._id === selectedMessage._id ? { ...msg, isRecalling: true } : msg
            );
            setMessages(updatedMessages);

            const response = await axios.post(
                `${API_URL}/message/recall/${code}`,
                { _id: selectedMessage._id },
                { headers: { Authorization: token } }
            );

            setMessages(prev =>
                prev.map(msg =>
                    msg._id === selectedMessage._id ? { ...response.data, isRecalling: false } : msg
                )
            );

            if (socket && code === '2') {
                socket.emit('delete-message', {
                    chatRoomId: chatRoom._id,
                    data: response.data
                });
            }

            setSelectedMessage(null);
            setShowMessageOptions(false);
        } catch (error) {
            console.error('Error recalling message:', error);
            setMessages(prev =>
                prev.map(msg =>
                    msg._id === selectedMessage._id ? { ...msg, isRecalling: false } : msg
                )
            );
            const errorMessage = error.response?.data?.msg || 'Không thể thu hồi tin nhắn. Vui lòng thử lại.';
            Alert.alert('Lỗi', errorMessage);
            setShowMessageOptions(false);
        }
    };

    const handleReplyToMessage = (msg) => {
        setReplyingTo(msg);
        setSelectedMessage(null);
        setShowMessageOptions(false);

        Keyboard.dismiss();
        setTimeout(() => {
            textInputRef?.current?.focus();
        }, 100);
    };

    const handleOpenFile = async (fileUrl) => {
        try {
            setDownloadingFile(fileUrl);

            const canOpen = await Linking.canOpenURL(fileUrl);

            if (canOpen) {
                await Linking.openURL(fileUrl);
            } else {
                Alert.alert('Thông báo', 'Không thể mở file này trên thiết bị của bạn');
            }

            setDownloadingFile(null);
        } catch (error) {
            console.error('Error opening file:', error);
            Alert.alert('Lỗi', 'Không thể mở tệp. Vui lòng thử lại.');
            setDownloadingFile(null);
        }
    };

    const getChatName = () => {
        if (!chatRoom) return 'Loading...';
        if (chatRoom.chatRoomName) return chatRoom.chatRoomName;

        if (!chatRoom.isGroupChat && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member._id !== user._id);
            return otherMember ? otherMember.name : 'Chat';
        }

        return 'Chat';
    };

    const getAvatarSource = (member) => {
        if (member?.avatarUrl && member.avatarUrl.trim() !== '' && member.avatarUrl !== 'https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg') {
            return { uri: member.avatarUrl };
        }
        const name = member?.name || 'User';
        const encodedName = encodeURIComponent(name.trim());
        return { uri: `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png&rounded=true` };
    };

    const shouldShowAvatar = (index) => {
        if (index === 0) return true;

        const currentMessage = messages[index];
        const previousMessage = messages[index - 1];

        return (
            typeof currentMessage.sendID === 'object' &&
            typeof previousMessage.sendID === 'object' &&
            currentMessage.sendID._id !== previousMessage.sendID._id
        );
    };

    const renderMessage = (msg, index) => {
        if (msg.system) {
            let systemText = msg.content.text;
            let name = '';
            let afterName = '';

            if (systemText && systemText.endsWith('rời khỏi nhóm.')) {
                const index = systemText.lastIndexOf(' rời khỏi nhóm.');
                if (index > 0) {
                    name = systemText.substring(0, index);
                    afterName = systemText.substring(index);
                } else {
                    name = systemText;
                }
            } else {
                name = '';
                afterName = systemText;
            }

            return (
                <View key={msg._id} style={styles.systemMessageContainer}>
                    <Text style={styles.systemMessageDate}>
                        <Text style={styles.systemMessageTime}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                        {' '}
                        {new Date(msg.createdAt).toLocaleDateString()}
                    </Text>
                    <View style={styles.systemMessageContent}>
                        <Text style={styles.systemMessageText}>
                            {name !== '' ? (
                                <>
                                    <Text style={{ fontWeight: 'bold' }}>{name}</Text>
                                    {afterName}
                                </>
                            ) : (
                                afterName
                            )}
                        </Text>
                    </View>
                </View>
            );
        }

        const senderId = typeof msg.sendID === 'object' ? msg.sendID._id : msg.sendID;
        const isOwnMessage = senderId === user._id;
        const showAvatar = !isOwnMessage && shouldShowAvatar(index);
        const sender = typeof msg.sendID === 'object' ? msg.sendID : { name: 'User', _id: senderId, avatarUrl: null };

        {
            msg.isForwarded && (
                <View style={styles.forwardedContainer}>
                    <Ionicons
                        name="arrow-redo-outline"
                        size={12}
                        color={isOwnMessage ? "#fff" : "#666"}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={[
                        styles.forwardedText,
                        isOwnMessage && styles.ownForwardedText
                    ]}>
                        Tin nhắn được chuyển tiếp
                    </Text>
                </View>
            )
        }

        if (msg.isRecalling) {
            return (
                <View
                    key={msg._id}
                    style={[
                        styles.messageWrapper,
                        isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper
                    ]}
                >
                    {showAvatar ? (
                        <Image
                            source={getAvatarSource(sender)}
                            style={styles.messageAvatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder} />
                    )}
                    <View style={[styles.messageBubble, styles.recallingMessage]}>
                        <ActivityIndicator size="small" color={isOwnMessage ? "#fff" : "#999"} />
                        <Text style={styles.recalledMessageText}>Đang thu hồi...</Text>
                    </View>
                </View>
            );
        }

        if (msg.recall === '1' && isOwnMessage) {
            return (
                <View
                    key={msg._id}
                    style={[
                        styles.messageWrapper,
                        styles.ownMessageWrapper
                    ]}
                >
                    <View style={[styles.messageBubble, styles.recalledMessage]}>
                        <Ionicons name="eye-off-outline" size={16} color="#999" style={{ marginRight: 4 }} />
                        <Text style={styles.recalledMessageText}>Bạn đã thu hồi tin nhắn này</Text>
                    </View>
                </View>
            );
        }

        if (msg.recall === '2') {
            return (
                <View
                    key={msg._id}
                    style={[
                        styles.messageWrapper,
                        isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper
                    ]}
                >
                    {showAvatar ? (
                        <Image
                            source={getAvatarSource(sender)}
                            style={styles.messageAvatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder} />
                    )}
                    <View style={[styles.messageBubble, styles.recalledMessage]}>
                        <Ionicons name="refresh-outline" size={16} color="#999" style={{ marginRight: 4 }} />
                        <Text style={styles.recalledMessageText}>Tin nhắn đã bị thu hồi</Text>
                    </View>
                </View>
            );
        }

        return (
            <TouchableOpacity
                key={msg._id}
                style={[
                    styles.messageWrapper,
                    isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper
                ]}
                onLongPress={() => handleLongPressMessage(msg)}
                activeOpacity={0.7}
            >
                {showAvatar ? (
                    <Image
                        source={getAvatarSource(sender)}
                        style={styles.messageAvatar}
                    />
                ) : !isOwnMessage ? (
                    <View style={styles.avatarPlaceholder} />
                ) : null}

                <View
                    style={[
                        styles.messageBubble,
                        isOwnMessage ? styles.ownMessage : styles.otherMessage
                    ]}
                >
                    {!isOwnMessage && showAvatar && (
                        <Text style={styles.senderName}>{sender.name}</Text>
                    )}

                    {msg.content.forwarded && (
                        <View style={styles.forwardedContainer}>
                            <Ionicons
                                name="arrow-redo-outline"
                                size={12}
                                color={isOwnMessage ? "#fff" : "#666"}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={[
                                styles.forwardedText,
                                isOwnMessage && styles.ownForwardedText
                            ]}>
                                Được chuyển tiếp từ {msg.content.forwardedFrom}
                            </Text>
                        </View>
                    )}

                    {msg.replyToMessage && (
                        <View style={[
                            styles.replyContainer,
                            isOwnMessage ? styles.ownReplyContainer : styles.otherReplyContainer
                        ]}>
                            <View style={styles.replyIndicator} />
                            <View style={styles.replyContent}>
                                <Text style={[
                                    styles.replyAuthorInMessage,
                                    isOwnMessage && styles.ownReplyAuthor
                                ]}>
                                    {msg.replyToMessage.sendID._id === user._id
                                        ? 'Bạn'
                                        : msg.replyToMessage.sendID.name}
                                </Text>
                                <Text style={[
                                    styles.replyTextInMessage,
                                    isOwnMessage && styles.ownReplyText
                                ]} numberOfLines={1}>
                                    {msg.replyToMessage.content.type === 'text'
                                        ? msg.replyToMessage.content.text
                                        : msg.replyToMessage.content.type === 'file'
                                            ? 'Tệp đính kèm'
                                            : 'Hình ảnh'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {msg.content.type === 'text' && (
                        <View style={searchResults[currentSearchIndex] === msg._id ? styles.highlightMessage : null}>
                            <Text
                                style={[
                                    styles.messageText,
                                    isOwnMessage && styles.ownMessageText
                                ]}
                            >
                                {msg.content.text}
                            </Text>
                        </View>
                    )}

                    {msg.content.type === 'file' && msg.content.files && msg.content.files.length > 0 && (
                        <View style={styles.fileContainer}>
                            {msg.content.files.map((fileUrl, fileIndex) => {
                                const fileName = msg.content.fileName || 'Unknown File';
                                const fileSize = msg.content.fileSize ? formatFileSize(msg.content.fileSize) : 'Unknown Size';
                                const isDownloading = downloadingFile === fileUrl;

                                return (
                                    <View
                                        key={fileIndex}
                                        style={[
                                            styles.fileItem,
                                            isOwnMessage ? styles.fileItemOwn : styles.fileItemOther
                                        ]}
                                    >
                                        <View style={styles.fileInfoContainer}>
                                            <View style={styles.fileIconContainer}>
                                                <Ionicons
                                                    name="document-text"
                                                    size={24}
                                                    color={isOwnMessage ? "#fff" : "#0999fa"}
                                                />
                                            </View>
                                            <View style={styles.fileTextContainer}>
                                                <Text
                                                    style={[
                                                        styles.fileName,
                                                        isOwnMessage && styles.ownMessageText
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {fileName}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.fileSize,
                                                        isOwnMessage && styles.ownFileSize
                                                    ]}
                                                >
                                                    {fileSize}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.downloadButton}
                                            onPress={() => handleOpenFile(fileUrl)}
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? (
                                                <ActivityIndicator size="small" color={isOwnMessage ? "#fff" : "#0999fa"} />
                                            ) : (
                                                <Ionicons
                                                    name="download-outline"
                                                    size={24}
                                                    color={isOwnMessage ? "#fff" : "#0999fa"} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                            {msg.content.text && msg.content.text.trim() !== '' && (
                                <Text
                                    style={[
                                        styles.messageText,
                                        isOwnMessage && styles.ownMessageText,
                                        { marginTop: 8 }
                                    ]}
                                >
                                    {msg.content.text}
                                </Text>
                            )}
                        </View>
                    )}

                    {msg.content.type === 'media' && msg.content.media && msg.content.media.length > 0 && (
                        <View style={styles.mediaContainer}>
                            {msg.content.media.map((mediaUrl, index) => (
                                <TouchableOpacity key={index} onPress={() => handlePreviewImage(mediaUrl)} activeOpacity={0.9}>
                                    <Image
                                        source={{ uri: mediaUrl }}
                                        style={styles.mediaImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))}
                            {msg.content.text && msg.content.text.trim() !== '' && (
                                <Text
                                    style={[
                                        styles.messageText,
                                        isOwnMessage && styles.ownMessageText
                                    ]}
                                >
                                    {msg.content.text}
                                </Text>
                            )}
                        </View>
                    )}

                    <Text style={[
                        styles.messageTime,
                        isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
                    ]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Thay đổi hàm renderMessageOptionsModal để thêm tùy chọn chuyển tiếp
    const renderMessageOptionsModal = () => {
        if (!showMessageOptions || !selectedMessage) return null;

        const isOwnMessage = selectedMessage?.sendID?._id === user._id;
        const isRecalled = selectedMessage.recall === '1' || selectedMessage.recall === '2';

        // Không cho chuyển tiếp tin nhắn đã bị thu hồi
        const canForward = !isRecalled;

        return (
            <Modal
                transparent={true}
                visible={showMessageOptions}
                animationType="fade"
                onRequestClose={() => setShowMessageOptions(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMessageOptions(false)}
                >
                    <View style={styles.messageOptionsContainer}>
                        {canForward && (
                            <>
                                <TouchableOpacity
                                    style={styles.optionButton}
                                    onPress={() => handleForwardMessage(selectedMessage)}
                                >
                                    <Ionicons name="arrow-redo-outline" size={22} color="#333" />
                                    <Text style={styles.optionText}>Chuyển tiếp</Text>
                                </TouchableOpacity>
                                <View style={styles.optionSeparator} />
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.optionButton}
                            onPress={() => handleReplyToMessage(selectedMessage)}
                        >
                            <Ionicons name="return-up-back" size={22} color="#333" />
                            <Text style={styles.optionText}>Trả lời</Text>
                        </TouchableOpacity>

                        {isOwnMessage && !isRecalled && (
                            <>
                                <View style={styles.optionSeparator} />

                                <TouchableOpacity
                                    style={styles.optionButton}
                                    onPress={() => handleRecallMessage('1')}
                                >
                                    <Ionicons name="eye-off" size={22} color="#333" />
                                    <Text style={styles.optionText}>Thu hồi cho tôi</Text>
                                </TouchableOpacity>

                                <View style={styles.optionSeparator} />

                                <TouchableOpacity
                                    style={styles.optionButton}
                                    onPress={() => handleRecallMessage('2')}
                                >
                                    <Ionicons name="refresh" size={22} color="#0999fa" />
                                    <Text style={[styles.optionText, { color: '#0999fa' }]}>Thu hồi với mọi người</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderReplyPreview = () => {
        if (!replyingTo) return null;

        return (
            <View style={styles.replyPreviewContainer}>
                <View style={styles.replyPreviewContent}>
                    <View style={styles.replyIndicator} />
                    <View style={styles.replyInfo}>
                        <Text style={styles.replyAuthor}>
                            {replyingTo.sendID._id === user._id ? 'Bạn' : replyingTo.sendID.name}
                        </Text>
                        <Text style={styles.replyText} numberOfLines={1}>
                            {replyingTo.content.type === 'text'
                                ? replyingTo.content.text
                                : replyingTo.content.type === 'file'
                                    ? 'Tệp đính kèm'
                                    : 'Hình ảnh'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cancelReplyButton}
                        onPress={() => setReplyingTo(null)}
                    >
                        <Ionicons name="close" size={20} color="#999" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const handleLongPressMessage = (message) => {
        setSelectedMessage(message);
        setShowMessageOptions(true);
    };

    const handleGotoProfile = () => {
        navigation.navigate('UserProfileScreen', { user: chatRoom.members.find(member => member._id !== user._id) });
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0999fa" />
                <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
            </View>
        );
    }

    const handleHeaderNamePress = async () => {
        if (!chatRoom || chatRoom.isGroupChat) return;
        const otherUser = getOtherUserInPersonalChat(chatRoom, user);
        if (!otherUser) return;

        // If isFriend state is null, check the API
        if (isFriend === null) {
            await checkIsFriend(otherUser);
        }

        navigation.navigate('UserProfileScreen', {
            user: otherUser,
            chatRoom: chatRoom,
            isFriend: isFriend
        });
    };

    const handleForwardMessage = (message) => {
        if (!message || message.recall === '1' || message.recall === '2') return;

        setForwardMessage(message);
        setSelectedForwardChatRooms([]);
        setShowMessageOptions(false);

        // Fetch danh sách cuộc trò chuyện để chuyển tiếp
        setForwardLoading(true);
        axios.get(`${API_URL}/chatroom`, {
            headers: { Authorization: token }
        })
            .then(response => {
                // Loại bỏ cuộc trò chuyện hiện tại
                const filteredRooms = response.data.filter(room => room._id !== chatRoom._id);
                setForwardChatRooms(filteredRooms);
                setShowForwardModal(true);
            })
            .catch(error => {
                console.error('Error fetching chat rooms for forwarding:', error);
                Alert.alert('Lỗi', 'Không thể lấy danh sách cuộc trò chuyện. Vui lòng thử lại.');
            })
            .finally(() => {
                setForwardLoading(false);
            });
    };

    const toggleChatRoomSelection = (chatRoomId) => {
        setSelectedForwardChatRooms(prev => {
            if (prev.includes(chatRoomId)) {
                return prev.filter(id => id !== chatRoomId);
            } else {
                return [...prev, chatRoomId];
            }
        });
    };

    // Thay đổi hàm sendForwardMessage trong ChatScreen.js
    const sendForwardMessage = async () => {
        if (selectedForwardChatRooms.length === 0) {
            Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 cuộc trò chuyện để chuyển tiếp');
            return;
        }

        setForwardLoading(true);

        try {
            const messageId = forwardMessage._id;

            const forwardPromises = selectedForwardChatRooms.map(async (chatRoomId) => {
                try {
                    const response = await axios.post(
                        `${API_URL}/message/forward`,
                        {
                            messageId: messageId,
                            chatId: chatRoomId
                        },
                        { headers: { Authorization: token } }
                    );

                    const forwardedMessage = {
                        ...response.data,
                        content: {
                            ...response.data.content,
                            forwarded: true,
                            forwardedFrom: typeof forwardMessage.sendID === 'object'
                                ? forwardMessage.sendID.name
                                : 'Người dùng'
                        }
                    };

                    if (socket) {
                        socket.emit('create-message', {
                            chatRoomId: chatRoomId,
                            data: forwardedMessage
                        });
                    }

                    return { success: true, chatRoomId, data: forwardedMessage };
                } catch (error) {
                    return { success: false, chatRoomId, error };
                }
            });

            const results = await Promise.all(forwardPromises);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            // Lấy forwarded message của phòng chat hiện tại (nếu chuyển tiếp cho chính phòng này)
            const myForwarded = results.find(r => r.success && r.chatRoomId === chatRoom._id);

            if (successCount > 0) {
                Alert.alert(
                    'Thành công',
                    `Đã chuyển tiếp tin nhắn đến ${successCount} cuộc trò chuyện` +
                    (failCount > 0 ? `. ${failCount} cuộc trò chuyện thất bại.` : '')
                );

                setShowForwardModal(false);
                setForwardMessage(null);
                setSelectedForwardChatRooms([]);

                navigation.navigate('ChatRoomListScreen', {
                    forwardedMessage: true,
                    forwardedData: myForwarded ? myForwarded.data : null,
                    chatRoomId: myForwarded ? myForwarded.chatRoomId : null,
                    timestamp: Date.now()
                });
            } else {
                Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn đến bất kỳ cuộc trò chuyện nào. Vui lòng thử lại.');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi chuyển tiếp tin nhắn. Vui lòng thử lại.');
        } finally {
            setForwardLoading(false);
        }
    };

    // Hàm render modal chọn người nhận tin nhắn chuyển tiếp
    const renderForwardModal = () => {
        if (!showForwardModal) return null;

        // Lấy nội dung tin nhắn cần hiển thị
        const getMessagePreview = (message) => {
            if (!message || !message.content) return '';

            const { content } = message;
            switch (content.type) {
                case 'text':
                    return content.text || '';
                case 'file':
                    return `📎 ${content.fileName || 'Tệp đính kèm'}`;
                case 'media':
                    return '🖼️ Hình ảnh/Video';
                default:
                    return 'Tin nhắn';
            }
        };

        // Lọc cuộc trò chuyện theo tìm kiếm
        const filteredChatRooms = forwardChatRooms.filter(room => {
            if (!searchText) return true;

            // Lấy tên cuộc trò chuyện
            let chatName = room.chatRoomName || '';
            if (!room.isGroupChat && room.members) {
                const otherMember = room.members.find(member => member._id !== user._id);
                if (otherMember) chatName = otherMember.name;
            }

            return chatName.toLowerCase().includes(searchText.toLowerCase());
        });

        // Hàm lấy tên cuộc trò chuyện
        const getChatRoomName = (chatRoom) => {
            if (chatRoom.chatRoomName) return chatRoom.chatRoomName;
            if (!chatRoom.isGroupChat && chatRoom.members) {
                const otherMember = chatRoom.members.find(member => member._id !== user._id);
                return otherMember ? otherMember.name : 'Người dùng';
            }
            return 'Nhóm chat';
        };

        // Hàm lấy avatar của cuộc trò chuyện
        const getAvatarSourceForList = (chatRoom) => {
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

        return (
            <Modal
                transparent={true}
                visible={showForwardModal}
                animationType="slide"
                onRequestClose={() => setShowForwardModal(false)}
            >
                <View style={styles.forwardModalContainer}>
                    <View style={styles.forwardModalHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowForwardModal(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.forwardModalTitle}>Chuyển tiếp tin nhắn</Text>
                        <TouchableOpacity
                            style={[
                                styles.sendForwardButton,
                                selectedForwardChatRooms.length === 0 && styles.disabledButton
                            ]}
                            onPress={sendForwardMessage}
                            disabled={selectedForwardChatRooms.length === 0 || forwardLoading}
                        >
                            {forwardLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.sendForwardButtonText}>Gửi</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.forwardMessagePreview}>
                        <Text style={styles.forwardMessagePreviewLabel}>Tin nhắn chuyển tiếp:</Text>
                        <Text style={styles.forwardMessagePreviewText} numberOfLines={3}>
                            {getMessagePreview(forwardMessage)}
                        </Text>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={18} color="#666" />
                        <TextInput
                            style={styles.forwardSearchInput}
                            placeholder="Tìm kiếm cuộc trò chuyện..."
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>

                    <FlatList
                        data={filteredChatRooms}
                        keyExtractor={(item) => item._id}
                        style={styles.forwardChatRoomList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.forwardChatRoomItem,
                                    selectedForwardChatRooms.includes(item._id) && styles.selectedChatRoom
                                ]}
                                onPress={() => toggleChatRoomSelection(item._id)}
                            >
                                <Image
                                    source={getAvatarSourceForList(item)}
                                    style={styles.forwardChatRoomAvatar}
                                />
                                <Text style={styles.forwardChatRoomName}>
                                    {getChatRoomName(item)}
                                </Text>
                                {selectedForwardChatRooms.includes(item._id) && (
                                    <Ionicons name="checkmark-circle" size={24} color="#0999fa" />
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyForwardList}>
                                <Text style={styles.emptyForwardText}>
                                    Không tìm thấy cuộc trò chuyện nào
                                </Text>
                            </View>
                        }
                    />
                </View>
            </Modal>
        );
    };

    const handlePreviewImage = (uri) => {
        setPreviewImageUri(uri);
        setImagePreviewVisible(true);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : null}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0999fa" />

            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color="white"
                        style={{ marginRight: 12 }}
                        onPress={handleGoBack}
                    />
                    <View style={styles.headerInfo}>
                        <TouchableOpacity
                            style={styles.headerTextContainer}
                            onPress={handleHeaderNamePress}
                            disabled={!chatRoom || chatRoom.isGroupChat}
                            activeOpacity={chatRoom && !chatRoom.isGroupChat ? 0.7 : 1}
                        >
                            <Text style={styles.headerTitle}>{getChatName()}</Text>
                            {chatRoom && !chatRoom.isGroupChat && (
                                <View style={styles.headerStatusContainer}>
                                    <Text style={styles.headerSubtitle}>
                                        {isFriend ? 'Bấm để xem thông tin' : 'Người lạ'}
                                    </Text>
                                    {!isFriend && (
                                        <TouchableOpacity
                                            style={styles.addFriendButton}
                                            onPress={handleSendFriendRequest}
                                        >
                                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.headerIcon}>
                            <Ionicons name="call" size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerIcon}>
                            <Ionicons name="videocam" size={22} color="white" />
                        </TouchableOpacity>
                        {chatRoom?.isGroupChat && (
                            <TouchableOpacity
                                style={styles.headerIcon}
                                onPress={() => navigation.navigate('GroupOptionsScreen', { chatRoom })}
                            >
                                <MaterialIcons name="more-vert" size={22} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg, index) => renderMessage(msg, index))}
            </ScrollView>
            {searchKeyword && searchResults.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#fffbe6' }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#FFD600',
                            borderRadius: 4,
                            paddingHorizontal: 16,
                            paddingVertical: 6,
                            marginHorizontal: 8,
                            opacity: currentSearchIndex === 0 ? 0.5 : 1
                        }}
                        disabled={currentSearchIndex === 0}
                        onPress={() => {
                            const prevIndex = Math.max(0, currentSearchIndex - 1);
                            setCurrentSearchIndex(prevIndex);
                            scrollToSearchResult(prevIndex);
                        }}
                    >
                        <Text style={{ fontWeight: 'bold' }}>Trước</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, color: '#222' }}>
                        {currentSearchIndex + 1}/{searchResults.length}
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#FFD600',
                            borderRadius: 4,
                            paddingHorizontal: 16,
                            paddingVertical: 6,
                            marginHorizontal: 8,
                            opacity: currentSearchIndex === searchResults.length - 1 ? 0.5 : 1
                        }}
                        disabled={currentSearchIndex === searchResults.length - 1}
                        onPress={() => {
                            const nextIndex = Math.min(searchResults.length - 1, currentSearchIndex + 1);
                            setCurrentSearchIndex(nextIndex);
                            scrollToSearchResult(nextIndex);
                        }}
                    >
                        <Text style={{ fontWeight: 'bold' }}>Sau</Text>
                    </TouchableOpacity>
                </View>
            )}


            {renderMessageOptionsModal()}
            {renderForwardModal()}

            {renderReplyPreview()}

            {
                imagePreviewVisible && (
                    <Modal
                        visible={imagePreviewVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setImagePreviewVisible(false)}
                    >
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    top: 50,
                                    right: 30,
                                    zIndex: 10,
                                }}
                                onPress={() => setImagePreviewVisible(false)}
                            >
                                <Ionicons name="close" size={36} color="#fff" />
                            </TouchableOpacity>
                            <Image
                                source={{ uri: previewImageUri }}
                                style={{ width: '90%', height: '70%', borderRadius: 10 }}
                                resizeMode="contain"
                            />
                        </View>
                    </Modal>
                )
            }

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.inputButton} onPress={toggleEmojiPicker}>
                    <Ionicons
                        name={showEmojiPicker ? "close-outline" : "happy-outline"}
                        size={24}
                        color="#666"
                    />
                </TouchableOpacity>
                <View style={styles.inputContainer}>
                    <TextInput
                        ref={textInputRef}
                        style={styles.textInput}
                        placeholder="Tin nhắn"
                        value={message}
                        onChangeText={setMessage}
                        multiline={true}
                    />
                </View>
                {message.trim().length > 0 ? (
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                        <MaterialIcons name="send" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity style={styles.inputButton} onPress={handleSendFile}>
                            <Ionicons name="document-outline" size={24} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.inputButton} onPress={handleImagePicker}>
                            <Ionicons name="image-outline" size={24} color="#666" />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {showEmojiPicker && (
                <View style={styles.emojiContainer}>
                    <EmojiSelector
                        category={Categories.emotion}
                        onEmojiSelected={handleEmojiSelect}
                        showSearchBar={false}
                        showTabs={true}
                        showHistory={true}
                        columns={8}
                        placeholder="Search emoji..."
                    />
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F0F0' },
    header: {
        backgroundColor: '#0999fa',
        paddingTop: Platform.OS === 'ios' ? 45 : 10,
        paddingBottom: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 50,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        flex: 1,
    },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginLeft: 20, justifyContent: 'center' },
    chatContainer: { flex: 1 },
    chatContent: { padding: 10 },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: '#FAFAFA',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    },
    inputButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        backgroundColor: '#2196F3',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginHorizontal: 8,
        minHeight: 40,
        justifyContent: 'center',
    },
    textInput: { fontSize: 16, paddingVertical: 8 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    messageWrapper: {
        flexDirection: 'row',
        marginVertical: 2,
        paddingHorizontal: 10,
        alignItems: 'flex-end',
    },
    ownMessageWrapper: {
        justifyContent: 'flex-end',
        marginBottom: 2,
    },
    otherMessageWrapper: {
        justifyContent: 'flex-start',
        marginBottom: 2,
    },
    messageBubble: {
        maxWidth: '90%',
        borderRadius: 12,
        padding: 10,
        paddingBottom: 6,
        elevation: 1,
    },
    ownMessage: {
        backgroundColor: '#0999fa',
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    otherMessage: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
        marginBottom: 4,
    },
    ownMessageText: {
        color: '#fff',
    },
    messageTime: {
        fontSize: 10,
        color: '#ccc',
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    ownMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    otherMessageTime: {
        color: '#888',
    },
    senderName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    messageAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    avatarPlaceholder: {
        width: 30,
        height: 0,
        marginRight: 8,
    },
    recalledMessage: {
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    recalledMessageText: {
        backgroundColor: '#ffffff',
        fontStyle: 'italic',
        color: '#999',
        fontSize: 15,
    },
    recallingMessage: {
        backgroundColor: '#f1f1f1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        opacity: 0.7,
    },
    replyContainer: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        width: '100%',
        minWidth: 250,
    },
    replyIndicator: {
        width: 2,
        backgroundColor: '#0999fa',
        marginRight: 6,
        borderRadius: 1,
    },
    ownReplyContainer: {
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    replyContent: {
        flex: 1,
        paddingRight: 10,
    },
    replyAuthorInMessage: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0999fa',
        marginBottom: 2,
    },
    ownReplyAuthor: {
        color: 'rgba(255,255,255,0.9)',
    },
    replyTextInMessage: {
        fontSize: 12,
        color: '#555',
    },
    ownReplyText: {
        color: 'rgba(255,255,255,0.8)',
    },
    fileContainer: {
        width: '100%',
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 4,
    },
    fileItemOwn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    fileItemOther: {
        backgroundColor: 'rgba(9,156,250,0.1)',
    },
    fileInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileIconContainer: {
        marginRight: 10,
    },
    fileTextContainer: {
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    fileSize: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    ownFileSize: {
        color: 'rgba(255,255,255,0.8)',
    },
    downloadButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContainer: {
        marginVertical: 5,
    },
    mediaImage: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginVertical: 5,
    },
    replyPreviewContainer: {
        backgroundColor: '#F8F8F8',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        padding: 10,
    },
    replyPreviewContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    replyIndicator: {
        width: 2,
        height: '100%',
        backgroundColor: '#0999fa',
        marginRight: 8,
        borderRadius: 1,
    },
    replyInfo: {
        flex: 1,
    },
    replyAuthor: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#0999fa',
        marginBottom: 2,
    },
    replyText: {
        fontSize: 14,
        color: '#666',
    },
    cancelReplyButton: {
        padding: 4,
    },
    emojiContainer: {
        height: 250,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageOptionsContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        width: '80%',
        maxWidth: 300,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    optionText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
    },
    optionSeparator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 16,
    },
    headerHint: {
        color: '#e2e2e2',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: -2,
        marginLeft: 2,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTextContainer: {
        alignItems: 'flex-start',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
    },
    headerSubtitle: {
        color: '#e2e2e2',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: -2,
        marginLeft: 2,
    },
    headerStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addFriendButton: {
        marginLeft: 8,
        backgroundColor: '#0080dc',
        borderRadius: 12,
        padding: 4,
    },
    forwardedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    forwardedText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: '#666',
    },
    ownForwardedText: {
        color: 'rgba(255,255,255,0.8)',
    },

    // Styles cho modal forward
    forwardModalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 20,
    },
    forwardModalHeader: {
        height: 60,
        backgroundColor: '#f8f8f8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeButton: {
        padding: 8,
    },
    forwardModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    sendForwardButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        minWidth: 60,
        alignItems: 'center',
    },
    sendForwardButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    forwardMessagePreview: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    forwardMessagePreviewLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#666',
    },
    forwardMessagePreviewText: {
        fontSize: 14,
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        margin: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    forwardSearchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    forwardChatRoomList: {
        flex: 1,
    },
    forwardChatRoomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedChatRoom: {
        backgroundColor: '#E6F0FA',
    },
    forwardChatRoomAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    forwardChatRoomName: {
        fontSize: 16,
        flex: 1,
    },
    emptyForwardList: {
        padding: 20,
        alignItems: 'center',
    },
    emptyForwardText: {
        fontSize: 16,
        color: '#999',
    },
    highlightMessage: {
        backgroundColor: '#FFF7B2', // Màu vàng nhẹ
        borderRadius: 6,
        padding: 2,
    },
    systemMessageContainer: {
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 16,
    },
    systemMessageDate: {
        fontSize: 12,
        color: '#ffffff',
        backgroundColor: '#ccc',
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 17,
        marginBottom: 6,
        overflow: 'hidden',
    },
    systemMessageContent: {
        backgroundColor: '#fff',
        borderRadius: 17,
        paddingVertical: 5,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    systemMessageText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    systemMessageTime: {
        color: '#fff',
        marginTop: 4,
    },
});

export default ChatScreen;