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
    Modal
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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
    const scrollViewRef = useRef();
    const textInputRef = useRef(null);
    const route = useRoute();
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [isJoin, setIsJoin] = useState(false);

    const chatRoomParam = route.params?.chatRoom;
    const userIdParam = route.params?.userId;

    useFocusEffect(
        useCallback(() => {
            if (route.params?.updatedChatRoom) {
                setChatRoom(route.params.updatedChatRoom);
            }
            return () => { };
        }, [route.params?.updatedChatRoom])
    );

    // Mark chat room as read when exiting, but only for messages present when entering
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

    // Initialize socket connection
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

    useEffect(() => {
        if (!socket || !chatRoom) return;

        if (!isJoin) {
            socket.emit('join', user._id);
            setIsJoin(true);
        }

        socket.on('message-created', (data) => {
            console.log('newMessage', data);
            if (data.chatId === chatRoom._id) {
                setMessages(prev => [...prev, data]);
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }
            // Track new messages to keep them unread
            setNewMessages(prev => new Set(prev).add(data._id));
        });

        socket.on('message-deleted', (deletedMessage) => {
            if (deletedMessage.chatId === chatRoom._id) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg._id === deletedMessage._id ? deletedMessage : msg
                    )
                );
            }
        });

        socket.on('message-deleted-permanently', (messageId) => {
            if (messageId) {
                setMessages(prev => prev.filter(msg => msg._id !== messageId));
                setNewMessages(prev => {
                    const updated = new Set(prev);
                    updated.delete(messageId);
                    return updated;
                });
            }
        });

        return () => {
            socket.off('join');
            socket.off('message-created');
            socket.off('message-deleted');
            socket.off('message-deleted-permanently');
        };
    }, [socket, chatRoom, user._id]);

    useEffect(() => {
        const loadChatRoom = async () => {
            try {
                setLoading(true);

                if (chatRoomParam) {
                    setChatRoom(chatRoomParam);
                    await fetchMessages(chatRoomParam._id);
                } else if (userIdParam) {
                    const response = await axios.get(`${API_URL}/chatroom`, {
                        headers: { Authorization: token }
                    });

                    const existingChat = response.data.find(room =>
                        !room.isGroupChat &&
                        room.members.some(member => member._id === userIdParam)
                    );

                    if (existingChat) {
                        setChatRoom(existingChat);
                        await fetchMessages(existingChat._id);
                    } else {
                        const createResponse = await axios.post(`${API_URL}/chatroom`, {
                            members: [userIdParam],
                        }, {
                            headers: { Authorization: token }
                        });

                        setChatRoom(createResponse.data);
                    }
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
            setMessages(response.data);
            // Mark all fetched messages as not new (already viewed)
            setNewMessages(new Set());
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 100);
        } catch (error) {
            console.error('Error fetching messages:', error);
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
        if (message.trim().length > 0 && chatRoom) {
            try {
                const content = {
                    type: 'text',
                    text: message
                };

                let endpoint = `${API_URL}/message`;
                let postData = {
                    chatId: chatRoom._id,
                    content
                };

                if (replyingTo) {
                    endpoint = `${API_URL}/message/reply`;
                    postData = {
                        _id: replyingTo._id,
                        content
                    };
                }

                const tempMessage = {
                    _id: Date.now().toString(),
                    chatId: chatRoom._id,
                    sendID: {
                        _id: user._id,
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                    },
                    content: {
                        type: 'text',
                        text: message
                    },
                    replyToMessage: replyingTo ? {
                        _id: replyingTo._id,
                        content: replyingTo.content,
                        sendID: replyingTo.sendID
                    } : null,
                    createdAt: new Date().toISOString()
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
                Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại sau.');
            }
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
            Alert.alert('Lỗi', 'Không thể chọn tệp. Vui lòng thử lại sau.');
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
            Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại sau.');
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
                type: type,
                text: message.trim(),
            };

            formData.append('content', JSON.stringify(content));

            const fileToUpload = {
                uri: file.uri,
                type: file.mimeType || 'application/octet-stream',
                name: file.name || 'file' + Date.now()
            };

            formData.append(type, fileToUpload);

            setMessage('');

            const tempId = Date.now().toString();
            const tempMessage = {
                _id: tempId,
                chatId: chatRoom._id,
                sendID: {
                    _id: user._id,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                },
                content: {
                    type: type,
                    text: 'Đang tải lên...',
                },
                createdAt: new Date().toISOString()
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
            Alert.alert('Lỗi', 'Không thể tải lên tệp. Vui lòng thử lại sau.');
        }
    };

    const handleRecallMessage = async (code) => {
        try {
            if (!selectedMessage) return;

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
                    msg._id === selectedMessage._id ? response.data : msg
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
            Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn. Vui lòng thử lại sau.');
        }
    };

    const handleDeleteMessage = async () => {
        try {
            if (!selectedMessage) return;

            Alert.alert(
                "Xóa tin nhắn",
                "Bạn có chắc chắn muốn xóa tin nhắn này không? Hành động này không thể hoàn tác.",
                [
                    {
                        text: "Hủy",
                        style: "cancel"
                    },
                    {
                        text: "Xóa",
                        style: "destructive",
                        onPress: async () => {
                            const updatedMessages = messages.map(msg =>
                                msg._id === selectedMessage._id ? { ...msg, isDeleting: true } : msg
                            );
                            setMessages(updatedMessages);

                            try {
                                const response = await axios.delete(
                                    `${API_URL}/message/${selectedMessage._id}`,
                                    { headers: { Authorization: token } }
                                );

                                setMessages(prev => prev.filter(msg => msg._id !== selectedMessage._id));

                                if (socket) {
                                    socket.emit('message-deleted-permanently', {
                                        chatRoomId: chatRoom._id,
                                        messageId: selectedMessage._id
                                    });
                                }
                            } catch (error) {
                                console.error('Error deleting message:', error);
                                Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại sau.');

                                setMessages(prev =>
                                    prev.map(msg =>
                                        msg._id === selectedMessage._id ?
                                            { ...msg, isDeleting: false } : msg
                                    )
                                );
                            }

                            setSelectedMessage(null);
                            setShowMessageOptions(false);
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error initiating message deletion:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại sau.');
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
        if (member) {
            if (member.avatarUrl) {
                return { uri: member.avatarUrl };
            }
            return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0999fa&color=fff` };
        }
        return { uri: `https://ui-avatars.com/api/?name=User&background=0999fa&color=fff` };
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
        const senderId = typeof msg.sendID === 'object' ? msg.sendID._id : msg.sendID;
        const isOwnMessage = senderId === user._id;
        const showAvatar = !isOwnMessage && shouldShowAvatar(index);
        const sender = typeof msg.sendID === 'object' ? msg.sendID : { name: 'User', _id: senderId };

        if (msg.isDeleting) {
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
                    <View style={[styles.messageBubble, styles.deletingMessage]}>
                        <ActivityIndicator size="small" color={isOwnMessage ? "#fff" : "#999"} />
                        <Text style={styles.deletingMessageText}>
                            Đang xóa...
                        </Text>
                    </View>
                </View>
            );
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
                        <Text style={styles.recalledMessageText}>
                            Đang thu hồi...
                        </Text>
                    </View>
                </View>
            );
        }

        if (msg.recall === '1' && msg.sendID._id === user._id) {
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
                        <Ionicons name="eye-off-outline" size={16} color="#999" style={{ marginRight: 4 }} />
                        <Text style={styles.recalledMessageText}>
                            Bạn đã thu hồi tin nhắn này
                        </Text>
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
                        <Text style={styles.recalledMessageText}>
                            Tin nhắn đã bị thu hồi
                        </Text>
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
                        <Text
                            style={[
                                styles.messageText,
                                isOwnMessage && styles.ownMessageText
                            ]}
                        >
                            {msg.content.text}
                        </Text>
                    )}

                    {msg.content.type === 'file' && msg.content.files && msg.content.files.length > 0 && (
                        <View style={styles.fileContainer}>
                            <Ionicons name="document-outline" size={24} color={isOwnMessage ? "#fff" : "#333"} />
                            <Text
                                style={[
                                    styles.fileText,
                                    isOwnMessage && styles.ownMessageText
                                ]}
                            >
                                Tệp đính kèm
                            </Text>
                            {msg.content.text && (
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

                    {msg.content.type === 'media' && msg.content.media && msg.content.media.length > 0 && (
                        <View style={styles.mediaContainer}>
                            {msg.content.media.map((mediaUrl, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: mediaUrl }}
                                    style={styles.mediaImage}
                                    resizeMode="cover"
                                />
                            ))}
                            {msg.content.text && (
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

    const renderMessageOptionsModal = () => {
        if (!showMessageOptions) return null;

        const isOwnMessage = selectedMessage?.sendID?._id === user._id;

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
                        <TouchableOpacity
                            style={styles.optionButton}
                            onPress={() => handleReplyToMessage(selectedMessage)}
                        >
                            <Ionicons name="return-up-back" size={22} color="#333" />
                            <Text style={styles.optionText}>Trả lời</Text>
                        </TouchableOpacity>

                        {isOwnMessage && (
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

                                <View style={styles.optionSeparator} />

                                <TouchableOpacity
                                    style={styles.optionButton}
                                    onPress={() => handleDeleteMessage()}
                                >
                                    <Ionicons name="trash" size={22} color="#f44336" />
                                    <Text style={[styles.optionText, { color: '#f44336' }]}>Xóa tin nhắn</Text>
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0999fa" />
                <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
            </View>
        );
    }

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
                        onPress={() => navigation.navigate('ChatRoomListScreen')}
                    />
                    <Text style={styles.headerTitle}>{getChatName()}</Text>

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

            {renderMessageOptionsModal()}

            {renderReplyPreview()}

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
                        multiline={false}
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
    backButton: { justifyContent: 'center' },
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
        maxWidth: '80%',
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
        backgroundColor: '#f1f1f1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    recalledMessageText: {
        fontStyle: 'italic',
        color: '#999',
        fontSize: 13,
    },
    recallingMessage: {
        backgroundColor: '#f1f1f1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        opacity: 0.7,
    },
    deletingMessage: {
        backgroundColor: '#f1f1f1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        opacity: 0.7,
    },
    deletingMessageText: {
        fontStyle: 'italic',
        color: '#999',
        fontSize: 13,
        marginLeft: 8,
    },
    replyContainer: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    fileText: {
        fontSize: 14,
        marginLeft: 10,
        color: '#000',
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
    }
});

export default ChatScreen;