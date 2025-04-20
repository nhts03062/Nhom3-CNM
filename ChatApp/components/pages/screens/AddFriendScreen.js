import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const AddFriendScreen = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Thêm bạn</Text>
                <View style={{ width: 24 }} />
            </View>

            <Text style={styles.label}>Nhập số điện thoại hoặc email</Text>
            <TextInput style={styles.input} placeholder="Số điện thoại hoặc email" keyboardType="default" />

            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Tìm</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 50, paddingHorizontal: 16 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    label: { fontSize: 16, marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    button: {
        marginTop: 20,
        backgroundColor: '#0999fa',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default AddFriendScreen;
