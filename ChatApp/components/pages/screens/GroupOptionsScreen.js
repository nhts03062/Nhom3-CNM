import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const GroupOptionsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const chatRoom = route.params?.chatRoom;

    if (!chatRoom) {
        return (
            <View style={styles.errorContainer}>
                <Text>Không tìm thấy thông tin nhóm</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tùy chọn</Text>
            </View>

            <View style={styles.groupInfo}>
                <Image
                    source={{ uri: chatRoom.image || 'https://static.vecteezy.com/system/resources/previews/026/019/617/original/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg' }}
                    style={styles.groupAvatar}
                />
                <Text style={styles.groupName}>{chatRoom.chatRoomName}</Text>
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
                onPress={() => navigation.navigate('GroupMembersScreen', { members: chatRoom.members })}
            >
                <Text style={styles.sectionText}>
                    Xem thành viên ({chatRoom.members ? chatRoom.members.length : 0})
                </Text>
            </TouchableOpacity>

        </ScrollView>
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
    groupName: {
        fontSize: 18,
        fontWeight: 'bold'
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
    }
});

export default GroupOptionsScreen;