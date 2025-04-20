import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Image,
    Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const friends = [
    { id: '1', name: 'Đặng Lê Hữu Tiến', avatar: require('../../../assets/cloud.png') },
    { id: '2', name: 'Đinh Văn Vỹ', avatar: require('../../../assets/cloud.png') },
    { id: '3', name: 'Đức Nhật', avatar: require('../../../assets/cloud.png') },
    { id: '4', name: 'Gia Thuận', avatar: require('../../../assets/cloud.png') },
];

const groups = [
    { id: '101', name: 'Nhóm bạn thân', avatar: require('../../../assets/cloud.png') },
    { id: '102', name: 'Lớp CNM', avatar: require('../../../assets/cloud.png') },
];

const ContactListScreen = () => {
    const navigation = useNavigation();
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('friends');

    const filteredData = (activeTab === 'friends' ? friends : groups).filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleAddFriend = () => {
        navigation.navigate('AddFriendScreen');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TextInput
                        placeholder="Tìm kiếm"
                        style={styles.searchInput}
                        placeholderTextColor="#aaa"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    <TouchableOpacity style={styles.headerPlus} onPress={handleAddFriend}>
                        <Ionicons name="person-add-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Bạn bè</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
                    onPress={() => setActiveTab('groups')}
                >
                    <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Nhóm</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Image source={item.avatar} style={styles.avatar} />
                        <Text style={styles.name}>{item.name}</Text>
                    </View>
                )}
            />

            {/* Bottom Nav */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('ChatRoomListScreen')}>
                    <Ionicons name="chatbubble-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Tin nhắn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} >
                    <Ionicons name="people" size={24} color="#0999fa" />
                    <Text style={[styles.tabText, styles.tabTextActive]}>Danh bạ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="compass-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Khám phá</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem}>
                    <Ionicons name="time-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Nhật ký</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('PersonalScreen')}>
                    <Ionicons name="person-outline" size={24} color="#8e8e93" />
                    <Text style={styles.tabText}>Cá nhân</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { backgroundColor: '#0999fa', paddingTop: 45, paddingHorizontal: 16, paddingBottom: 10 },
    headerTime: { color: '#fff', fontSize: 16, marginBottom: 5 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    searchInput: {
        flex: 1,
        height: 36,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    headerPlus: {
        marginLeft: 10,
        padding: 6,
        backgroundColor: '#0a84ff',
        borderRadius: 8,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    tab: { paddingVertical: 6 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#0999fa' },
    tabText: { fontSize: 14, color: '#888' },
    activeTabText: { color: '#0999fa', fontWeight: 'bold' },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    name: { fontSize: 16 },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5E5',
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        height: 60,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
    },
    tabTextActive: {
        color: '#0999fa',
    },
});

export default ContactListScreen;