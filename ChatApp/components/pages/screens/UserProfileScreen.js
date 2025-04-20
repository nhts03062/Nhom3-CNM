import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const UserProfileScreen = ({ route }) => {
    const navigation = useNavigation();
    const { user } = route.params;

    const handleDeleteFriend = () => {
        Alert.alert(
            'Xác nhận xóa bạn',
            `Bạn có chắc muốn xóa ${user.name} khỏi danh sách bạn bè?`,
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', style: 'destructive', onPress: () => console.log('Deleted') },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tuỳ chọn</Text>
            </View>

            <View style={styles.avatarSection}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <Text style={styles.name}>{user.name}</Text>

                <View style={styles.iconRow}>
                    <TouchableOpacity style={styles.iconCircle}>
                        <Ionicons name="search" size={20} color="#333" />
                        <Text style={styles.iconText}>Tìm tin nhắn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconCircle}>
                        <Ionicons name="person" size={20} color="#333" />
                        <Text style={styles.iconText}>Trang cá nhân</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.optionRow} onPress={handleDeleteFriend}>
                <Ionicons name="person-remove" size={20} color="#f00" style={styles.optionIcon} />
                <Text style={[styles.optionText, { color: '#f00' }]}>Xóa bạn</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0999fa',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 10,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    iconRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    iconCircle: {
        alignItems: 'center',
        marginHorizontal: 16,
    },
    iconText: {
        marginTop: 6,
        fontSize: 12,
        color: '#333',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    optionIcon: {
        marginRight: 12,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default UserProfileScreen;