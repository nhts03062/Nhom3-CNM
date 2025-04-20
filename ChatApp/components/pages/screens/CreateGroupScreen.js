import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const recentContacts = [
    { id: '1', name: 'Sơn', avatar: require('../../../assets/cloud.png') },
    { id: '2', name: 'Anh', avatar: require('../../../assets/cloud.png') },
    { id: '3', name: 'Tấn Lộc', avatar: require('../../../assets/cloud.png') },
    { id: '4', name: 'Mỹ Thuận', avatar: require('../../../assets/cloud.png') },
];

const CreateGroupScreen = () => {
    const navigation = useNavigation();
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');

    const toggleSelect = (userId) => {
        setSelectedUsers((prev) => {
            if (prev.includes(userId)) {
                return prev.filter((id) => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleCreateGroup = () => {
        const groupInfo = {
            name: groupName || 'Nhóm mới',
            members: recentContacts.filter(c => selectedUsers.includes(c.id)),
        };

        navigation.navigate('ChatScreen', { group: groupInfo });
    };


    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.includes(item.id);
        return (
            <TouchableOpacity style={styles.item} onPress={() => toggleSelect(item.id)}>
                <Image source={item.avatar} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.time}>Hoạt động gần đây</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Nhóm mới</Text>
                <Text style={styles.selected}>Đã chọn: {selectedUsers.length}</Text>
            </View>

            {/* Group Name */}
            <View style={styles.inputRow}>
                <Ionicons name="camera-outline" size={24} />
                <TextInput
                    placeholder="Đặt tên nhóm"
                    style={styles.groupInput}
                    value={groupName}
                    onChangeText={setGroupName}
                />
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={16} color="#999" />
                <TextInput placeholder="Tìm tên hoặc số điện thoại" style={styles.searchInput} />
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <Text style={[styles.tab, styles.activeTab]}>GẦN ĐÂY</Text>
                <Text style={styles.tab}>DANH BẠ</Text>
            </View>

            {/* List */}
            <FlatList
                data={recentContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
            />

            {/* Create Group Button */}
            {selectedUsers.length >= 2 && (
                <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                    <Text style={styles.createButtonText}>Tạo nhóm</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 50, paddingHorizontal: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 18, fontWeight: 'bold' },
    selected: { fontSize: 14, color: '#666' },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
    groupInput: { marginLeft: 10, borderBottomWidth: 1, flex: 1 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 8,
        marginVertical: 16,
    },
    searchInput: { marginLeft: 6, flex: 1 },
    tabRow: { flexDirection: 'row', marginBottom: 10 },
    tab: { marginRight: 20, color: '#999', fontWeight: 'bold' },
    activeTab: { color: '#000', borderBottomWidth: 2, borderBottomColor: '#000' },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    name: { fontSize: 16 },
    time: { fontSize: 12, color: '#888' },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#2196F3',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
    },
    createButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateGroupScreen;
