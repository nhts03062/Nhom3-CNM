import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const GroupOptionsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const group = route.params?.group;

    const [members, setMembers] = useState(group?.members || []);

    useEffect(() => {
        if (route.params?.newMembers) {
            setMembers((prev) => {
                const newList = [...prev];
                route.params.newMembers.forEach((member) => {
                    if (!newList.find((m) => m.id === member.id)) {
                        newList.push(member);
                    }
                });
                return newList;
            });
        }
    }, [route.params?.newMembers]);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tùy chọn</Text>
            </View>

            <View style={styles.groupInfo}>
                <Image source={require('../../../assets/cloud.png')} style={styles.groupAvatar} />
                <Text style={styles.groupName}>{group?.name}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="search-outline" size={20} />
                    <Text style={styles.actionText}>Tìm tin nhắn</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('AddGroupMembersScreen', { members })}
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
                onPress={() => navigation.navigate('GroupMembersScreen', { members })}
            >
                <Text style={styles.sectionText}>Xem thành viên ({members.length})</Text>
            </TouchableOpacity>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#0999fa',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 16 },
    groupInfo: { alignItems: 'center', marginVertical: 20 },
    groupAvatar: { width: 70, height: 70, borderRadius: 35, marginBottom: 10 },
    groupName: { fontSize: 18, fontWeight: 'bold' },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    actionButton: { alignItems: 'center' },
    actionText: { marginTop: 6 },
    section: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionText: { fontSize: 16 },
});

export default GroupOptionsScreen;
