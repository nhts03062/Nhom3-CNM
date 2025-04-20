import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    Image,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const allContacts = [
    { id: '5', name: 'Tân', avatar: require('../../../assets/cloud.png') },
    { id: '6', name: 'Triết', avatar: require('../../../assets/cloud.png') },
    { id: '7', name: 'Hùng Lê', avatar: require('../../../assets/cloud.png') },
];

const AddGroupMembersScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const currentMembers = route.params?.members || [];

    const [selected, setSelected] = useState([]);

    const toggleSelect = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleAddMembers = () => {
        const selectedMembers = allContacts.filter(c => selected.includes(c.id));
        navigation.navigate('GroupOptionsScreen', {
            newMembers: selectedMembers,
        });
    };

    const renderItem = ({ item }) => {
        const isSelected = selected.includes(item.id);
        const isAlreadyInGroup = currentMembers.some((m) => m.id === item.id);

        if (isAlreadyInGroup) return null;

        return (
            <TouchableOpacity style={styles.item} onPress={() => toggleSelect(item.id)}>
                <Image source={item.avatar} style={styles.avatar} />
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.checkbox, isSelected && styles.checked]}>
                    {isSelected && <View style={styles.innerDot} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thêm thành viên</Text>
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color="#999" />
                <TextInput placeholder="Tìm tên hoặc số điện thoại" style={styles.searchInput} />
            </View>

            <FlatList
                data={allContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
            />

            {selected.length > 0 && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddMembers}>
                    <Text style={styles.addButtonText}>Thêm {selected.length} thành viên</Text>
                </TouchableOpacity>
            )}
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
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 8,
        margin: 16,
    },
    searchInput: {
        marginLeft: 6,
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    name: { flex: 1, fontSize: 16 },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checked: { borderColor: '#2196F3' },
    innerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
    },
    addButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        margin: 16,
    },
    addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default AddGroupMembersScreen;
