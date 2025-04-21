import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const GroupMembersScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [members, setMembers] = useState(route.params?.members || []);

    useEffect(() => {
        // Update members if new ones are added
        if (route.params?.members) {
            setMembers(route.params.members);
        }
    }, [route.params?.members]);

    const renderMember = ({ item }) => (
        <View style={styles.memberItem}>
            <Image
                source={{ uri: item.avatarUrl || 'https://bookvexe.vn/wp-content/uploads/2023/04/chon-loc-25-avatar-facebook-mac-dinh-chat-nhat_2.jpg' }}
                style={styles.avatar}
            />
            <View style={{ marginLeft: 10 }}>
                <Text style={styles.name}>{item.name}</Text>
                {/* If you have info about who added the member, show it here */}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thành viên ({members.length})</Text>
            </View>

            <FlatList
                data={members}
                keyExtractor={(item) => item._id}
                renderItem={renderMember}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Không có thành viên nào</Text>
                    </View>
                }
            />
        </View>
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
        paddingBottom: 16,
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
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20
    },
    name: {
        fontSize: 16,
        fontWeight: '500'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 50
    },
    emptyText: {
        color: '#888',
        fontSize: 16
    }
});

export default GroupMembersScreen;