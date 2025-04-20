import React, { useState, useRef, useEffect } from 'react';
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
    KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';


const ChatScreen = () => {
    const [message, setMessage] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef();
    const route = useRoute();
    const navigation = useNavigation();
    const group = route.params?.group;


    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
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

    const handleSendMessage = () => {
        if (message.trim().length > 0) {
            console.log("Sending message:", message);
            setMessage('');
        }
    };

    const handleImagePicker = () => {
        console.log("Open image picker");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : null}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor="#2196F3" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{group?.name || 'Name'}</Text>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.headerIcon}>
                            <Ionicons name="call" size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerIcon}>
                            <Ionicons name="videocam" size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerIcon}
                            onPress={() => navigation.navigate('GroupOptionsScreen', { group })}
                        >
                            <MaterialIcons name="more-vert" size={22} color="white" />
                        </TouchableOpacity>

                    </View>
                </View>
            </View>

            {/* Chat Area (hiện trống) */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {/* Chỗ này để render tin nhắn sau */}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.inputButton}>
                    <Ionicons name="happy-outline" size={24} color="#666" />
                </TouchableOpacity>
                <View style={styles.inputContainer}>
                    <TextInput
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
                        <TouchableOpacity style={styles.inputButton}>
                            <Ionicons name="mic-outline" size={24} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.inputButton} onPress={handleImagePicker}>
                            <Ionicons name="image-outline" size={24} color="#666" />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F0F0',
    },
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
    backButton: {
        marginRight: 15,
        justifyContent: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginLeft: 20,
        justifyContent: 'center',
    },
    chatContainer: {
        flex: 1,
    },
    chatContent: {
        padding: 10,
    },
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
    textInput: {
        fontSize: 16,
        paddingVertical: 8,
    },
});

export default ChatScreen;
