import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = require('../../../services/api');

const ForgotPasswordScreen = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSendEmail = async () => {
        // Reset error
        setEmailError('');

        // Validate email
        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setEmailError('Enter a valid email');
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
                email: email.trim()
            });

            Alert.alert(
                'Email Sent Successfully',
                'A password reset link has been sent to your email. Please check your email inbox and click the link to reset your password.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );

        } catch (error) {
            console.error('Forgot password error:', error);
            const errorMessage = error.response?.data?.msg || 'Failed to send email. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <View style={styles.formContainer}>
                    <View style={styles.contentContainer}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Forgot Password</Text>
                            <View style={styles.titleUnderline} />
                        </View>

                        <View style={styles.illustrationContainer}>
                            <Image
                                source={require('../../../assets/frontImg.avif')}
                                style={styles.illustration}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputRow}>
                                <Feather
                                    name="mail"
                                    size={20}
                                    color="#79B3E2"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#999"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setEmailError('');
                                    }}
                                />
                            </View>
                            {emailError ? (
                                <Text style={styles.errorText}>{emailError}</Text>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                            onPress={handleSendEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.sendButtonText}>Send Email</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>
                                Remember your password?{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={styles.footerLink}>Back to Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#79B3E2',
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    formContainer: {
        width: width * 0.9,
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    contentContainer: {
        alignItems: 'center',
    },
    titleContainer: {
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    titleUnderline: {
        width: 40,
        height: 3,
        backgroundColor: '#79B3E2',
        borderRadius: 2,
    },
    illustrationContainer: {
        width: '100%',
        height: 150,
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: '70%',
        height: '100%',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(0, 0, 0, 0.2)',
        paddingVertical: 10,
        marginBottom: 5,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        paddingVertical: 8,
    },
    errorText: {
        color: '#ee2a2a',
        fontSize: 12,
        marginLeft: 5,
        marginTop: 5,
    },
    sendButton: {
        backgroundColor: '#79B3E2',
        paddingVertical: 14,
        borderRadius: 6,
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    },
    sendButtonDisabled: {
        backgroundColor: '#b3d4f0',
        opacity: 0.7,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 14,
        color: '#666',
    },
    footerLink: {
        fontSize: 14,
        color: '#79B3E2',
        fontWeight: 'bold',
    },
});

export default ForgotPasswordScreen;