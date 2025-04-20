import React, { useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const GroupMembersScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const members = route.params?.members || [];

    useEffect(() => {
        if (route.params?.newMembers) {
            group.members = [...group.members, ...route.params.newMembers];
        }
    }, [route.params?.newMembers]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thành viên</Text>
            </View>

            <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.memberItem}>
                        <Image source={item.avatar} style={styles.avatar} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.subtitle}>Thêm bởi Sơn</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        backgroundColor: '#0999fa',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 16 },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    name: { fontSize: 16, fontWeight: '500' },
    subtitle: { fontSize: 12, color: '#888' },
});

export default GroupMembersScreen;
