import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const HomeProfileScreen = ({ route }) => {
    const navigation = useNavigation();
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const { user: currentUser } = useAuth();
    const { profileUser } = route.params || {};

    // Check if the profile being viewed is the current user's profile
    const isOwnProfile = profileUser?._id === currentUser?._id;

    // Encode name for avatar URL if needed
    const name = profileUser?.name || '';
    const encodedName = encodeURIComponent(name.trim());

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Cover Image and Back Button */}
            <View style={styles.coverContainer}>
                <Image
                    source={require('../../../assets/red_roses_cover.jpg')}
                    style={styles.coverImage}
                />
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={() => setShowAvatarModal(true)}>
                        <Image
                            source={profileUser?.avatarUrl
                                ? { uri: profileUser.avatarUrl }
                                : { uri: `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png` }}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                </View>
                {showAvatarModal && (
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowAvatarModal(false)}
                        >
                            <View style={styles.modalContent}>
                                <Image
                                    source={profileUser?.avatarUrl
                                        ? { uri: profileUser.avatarUrl }
                                        : { uri: `https://ui-avatars.com/api/?name=${encodedName}&background=0999fa&color=fff&size=128&format=png` }}
                                    style={styles.avatarLarge}
                                />
                                <TouchableOpacity
                                    style={styles.closeModalButton}
                                    onPress={() => setShowAvatarModal(false)}
                                >
                                    <Ionicons name="close" size={30} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.username}>{profileUser?.name || ''}</Text>

                {/* Only show "Edit Profile" button if viewing own profile */}
                {isOwnProfile && (
                    <TouchableOpacity style={styles.editProfileButton}>
                        <Ionicons name="pencil-outline" size={16} color="#0066CC" />
                        <Text style={styles.editProfileText}>Cập nhật giới thiệu bản thân</Text>
                    </TouchableOpacity>
                )}

                {/* Only show these sections if viewing own profile */}
                {isOwnProfile && (
                    <>
                        {/* Action Buttons */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionButtons}>
                            {/* <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="color-palette-outline" size={22} color="#0066CC" />
                                <Text style={styles.actionText}>Cài zStyle</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="images-outline" size={22} color="#0066CC" />
                                <Text style={styles.actionText}>Ảnh của tôi</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="folder-outline" size={22} color="#0066CC" />
                                <Text style={styles.actionText}>Kho khoảnh khắc</Text>
                            </TouchableOpacity> */}
                        </ScrollView>

                        {/* Empty Activity Section */}
                        <View style={styles.emptyActivity}>
                            <View style={styles.emptyIllustration}>
                                <Image
                                    source={require('../../../assets/emty_journey.png')}
                                    style={styles.emptyImage}
                                />
                            </View>

                            <Text style={styles.emptyTitle}>Hôm nay {profileUser.name} có gì vui?</Text>
                            <Text style={styles.emptySubtitle}>
                                Đây là Nhật ký của bạn - Hãy làm đầy Nhật ký với những dấu ấn cuộc đời và kỷ niệm đáng nhớ nhé!
                            </Text>

                            <TouchableOpacity style={styles.postButton}>
                                <Text style={styles.postButtonText}>Đăng lên Nhật ký</Text>
                            </TouchableOpacity>
                        </View>

                        {/* No Activities Message */}
                        <Text style={styles.noActivitiesText}>
                            Chưa có hoạt động nào. Hãy trò chuyện để hiểu nhau hơn!
                        </Text>
                    </>
                )}

                {/* If viewing someone else's profile, show a "Start Chat" button */}
                {!isOwnProfile && (
                    <View style={styles.otherUserActions}>
                        <TouchableOpacity
                            style={styles.startChatButton}
                            onPress={() => navigation.navigate('ChatScreen', { userId: profileUser._id })}
                        >
                            <Ionicons name="chatbubble-outline" size={18} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.startChatText}>Nhắn tin</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    coverContainer: {
        height: 200,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f66',  // Fallback color (matches the red in your image)
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 16,
        zIndex: 10,
    },
    headerIcons: {
        position: 'absolute',
        top: 40,
        right: 16,
        flexDirection: 'row',
        zIndex: 10,
    },
    headerButton: {
        marginLeft: 16,
    },
    profileInfo: {
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: -50,
    },
    avatarContainer: {
        alignItems: 'center',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#fff',
        backgroundColor: '#e1e1e1',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
        color: '#000',
        marginBottom: 8,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    editProfileText: {
        color: '#0066CC',
        marginLeft: 5,
        fontSize: 14,
    },
    actionButtons: {
        marginTop: 10,
        paddingBottom: 15,
        maxWidth: '100%',
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginRight: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minWidth: 120,
    },
    actionText: {
        marginTop: 6,
        fontSize: 14,
        color: '#333',
    },
    emptyActivity: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    emptyIllustration: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyImage: {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        resizeMode: 'contain',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
        color: '#000',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
        lineHeight: 20,
    },
    postButton: {
        backgroundColor: '#0080ff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    postButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    noActivitiesText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        marginVertical: 20,
    },
    otherUserActions: {
        flexDirection: 'row',
        marginTop: 20,
        marginBottom: 30,
    },
    startChatButton: {
        backgroundColor: '#0999fa',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    startChatText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    buttonIcon: {
        marginRight: 8,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    modalContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLarge: {
        width: 428,
        height: 428,
        borderWidth: 4,
        borderColor: '#fff',
        backgroundColor: '#e1e1e1',
        marginBottom: 20,
    },
    closeModalButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 6,
        zIndex: 10,
    },
});

export default HomeProfileScreen;