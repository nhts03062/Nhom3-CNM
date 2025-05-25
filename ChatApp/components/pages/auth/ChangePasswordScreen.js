import React, { useState, useEffect } from 'react';
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
    Image,
    Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = require('../../../services/api');

const ChangePasswordScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState('');
    const [tokenValid, setTokenValid] = useState(false);
    const [verifyingToken, setVerifyingToken] = useState(true);
    const [showTokenInput, setShowTokenInput] = useState(false);
    const [manualToken, setManualToken] = useState('');

    useEffect(() => {
        const extractTokenFromUrl = () => {
            // Thử lấy token từ route params trước
            const tokenFromParams = route.params?.token;

            if (tokenFromParams) {
                console.log('Token from params:', tokenFromParams);
                setToken(tokenFromParams);
                verifyToken(tokenFromParams);
                return;
            }

            // Thử lấy từ deep link URL
            const getTokenFromURL = async () => {
                try {
                    // Kiểm tra initial URL (khi app được mở từ link)
                    const initialUrl = await Linking.getInitialURL();

                    if (initialUrl) {
                        console.log('Initial URL:', initialUrl);
                        const tokenFromUrl = extractTokenFromUrlString(initialUrl);

                        if (tokenFromUrl) {
                            console.log('Token from URL:', tokenFromUrl);
                            setToken(tokenFromUrl);
                            verifyToken(tokenFromUrl);
                            return;
                        }
                    }

                    // Nếu không có token, hiển thị input manual
                    setVerifyingToken(false);
                    setShowTokenInput(true);

                } catch (error) {
                    console.error('Error getting initial URL:', error);
                    setVerifyingToken(false);
                    setShowTokenInput(true);
                }
            };

            getTokenFromURL();
        };

        // Listener cho deep links khi app đang chạy
        const handleDeepLink = (event) => {
            console.log('Deep link received in ChangePasswordScreen:', event.url);

            const tokenFromUrl = extractTokenFromUrlString(event.url);
            if (tokenFromUrl) {
                setToken(tokenFromUrl);
                verifyToken(tokenFromUrl);
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Extract token từ URL hoặc params
        extractTokenFromUrl();

        return () => {
            subscription?.remove();
        };
    }, [route.params]);

    // Hàm extract token từ URL string
    const extractTokenFromUrlString = (urlString) => {
        try {
            // Thử parse như URL chuẩn
            const url = new URL(urlString);
            let token = url.searchParams.get('token');

            if (token) {
                return token;
            }

            // Nếu không parse được, thử tìm token bằng regex
            const tokenMatch = urlString.match(/token=([^&]+)/);
            if (tokenMatch) {
                return decodeURIComponent(tokenMatch[1]);
            }

            // Thử tìm token trong fragment (sau dấu #)
            const fragmentMatch = urlString.match(/#.*token=([^&]+)/);
            if (fragmentMatch) {
                return decodeURIComponent(fragmentMatch[1]);
            }

            return null;
        } catch (error) {
            console.error('Error extracting token from URL:', error);

            // Fallback: tìm token bằng string manipulation
            const tokenMatch = urlString.match(/token=([^&\s]+)/);
            if (tokenMatch) {
                return decodeURIComponent(tokenMatch[1]);
            }

            return null;
        }
    };

    const verifyToken = async (resetToken) => {
        try {
            setVerifyingToken(true);
            setShowTokenInput(false);

            console.log('Verifying token:', resetToken.substring(0, 20) + '...');

            const response = await axios.post(`${API_BASE_URL}/auth/verify-token`, {
                token: resetToken
            });

            if (response.data.userId) {
                setUserId(response.data.userId);
                setTokenValid(true);
                console.log('Token verified successfully for user:', response.data.userId);
            } else {
                throw new Error('Invalid token response');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            Alert.alert(
                'Invalid Token',
                'The reset token is invalid or has expired. You can enter the token manually or request a new password reset.',
                [
                    {
                        text: 'Enter Token Manually',
                        onPress: () => {
                            setShowTokenInput(true);
                            setTokenValid(false);
                        }
                    },
                    {
                        text: 'Request New Reset',
                        onPress: () => navigation.navigate('ForgotPasswordScreen')
                    },
                    {
                        text: 'Back to Login',
                        onPress: () => navigation.navigate('Auth')
                    }
                ]
            );
        } finally {
            setVerifyingToken(false);
        }
    };

    const handleManualTokenSubmit = () => {
        if (!manualToken.trim()) {
            Alert.alert('Error', 'Please enter a valid token');
            return;
        }

        const cleanToken = manualToken.trim();
        setToken(cleanToken);
        verifyToken(cleanToken);
    };

    const validatePassword = () => {
        let isValid = true;

        setPasswordError('');
        setConfirmPasswordError('');

        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            isValid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Confirm password is required');
            isValid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords must be the same');
            isValid = false;
        }

        return isValid;
    };

    const handleChangePassword = async () => {
        if (!validatePassword()) {
            return;
        }

        if (!userId) {
            Alert.alert('Error', 'User ID not found. Please try again.');
            return;
        }

        try {
            setLoading(true);

            await axios.post(`${API_BASE_URL}/auth/reset-password`, {
                userId: userId,
                newPassword: password
            });

            Alert.alert(
                'Success',
                'Your password has been changed successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Auth')
                    }
                ]
            );

        } catch (error) {
            console.error('Change password error:', error);
            const errorMessage = error.response?.data?.msg || 'Failed to change password. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Loading state khi đang verify token
    if (verifyingToken) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Verifying reset token...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Manual Token Input Screen
    if (showTokenInput) {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.formContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.navigate('Auth')}
                            >
                                <Feather name="arrow-left" size={24} color="#79B3E2" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.contentContainer}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Enter Reset Token</Text>
                                <View style={styles.titleUnderline} />
                            </View>

                            <Text style={styles.instructionText}>
                                Please check your email and copy the reset token, then paste it below:
                            </Text>

                            <View style={styles.inputContainer}>
                                <View style={[styles.inputRow, { minHeight: 80 }]}>
                                    <Feather
                                        name="key"
                                        size={20}
                                        color="#79B3E2"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                                        placeholder="Paste reset token from email here..."
                                        placeholderTextColor="#999"
                                        value={manualToken}
                                        onChangeText={setManualToken}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleManualTokenSubmit}
                            >
                                <Text style={styles.submitButtonText}>Verify Token</Text>
                            </TouchableOpacity>

                            <View style={styles.footerContainer}>
                                <Text style={styles.footerText}>
                                    Don't have a token?{' '}
                                </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
                                    <Text style={styles.footerLink}>Request new reset</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Error state - token không hợp lệ
    if (!tokenValid) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Unable to verify reset token</Text>
                    <TouchableOpacity
                        style={styles.backToLoginButton}
                        onPress={() => setShowTokenInput(true)}
                    >
                        <Text style={styles.backToLoginText}>Try Another Token</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.backToLoginButton, { marginTop: 10 }]}
                        onPress={() => navigation.navigate('ForgotPasswordScreen')}
                    >
                        <Text style={styles.backToLoginText}>Request New Reset</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Main Change Password Screen
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <View style={styles.formContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.navigate('Auth')}
                        >
                            <Feather name="arrow-left" size={24} color="#79B3E2" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contentContainer}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Change Password</Text>
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
                                    name="lock"
                                    size={20}
                                    color="#79B3E2"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your new password"
                                    placeholderTextColor="#999"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setPasswordError('');
                                    }}
                                />
                            </View>
                            {passwordError ? (
                                <Text style={styles.errorText}>{passwordError}</Text>
                            ) : null}

                            <View style={styles.inputRow}>
                                <Feather
                                    name="check-square"
                                    size={20}
                                    color="#79B3E2"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm password"
                                    placeholderTextColor="#999"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        setConfirmPasswordError('');
                                    }}
                                />
                            </View>
                            {confirmPasswordError ? (
                                <Text style={styles.errorText}>{confirmPasswordError}</Text>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>
                                Remember your password?{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    backToLoginButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backToLoginText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
    instructionText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
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
        marginTop: 15,
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
    submitButton: {
        backgroundColor: '#79B3E2',
        paddingVertical: 14,
        borderRadius: 6,
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#b3d4f0',
        opacity: 0.7,
    },
    submitButtonText: {
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

export default ChangePasswordScreen;