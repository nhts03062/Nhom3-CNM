import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';
import io from 'socket.io-client';

const API_BASE_URL = require('../services/api');

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [state, setState] = useState({
        isLoading: true,
        token: null,
        user: null,
        isAuthenticated: false,
    });
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (state.token) {
            const newSocket = io(API_BASE_URL.replace('/api', ''), {
                auth: { token: state.token }
            });
            setSocket(newSocket);

            return () => {
                if (newSocket) newSocket.disconnect();
            };
        }
    }, [state.token]);

    useEffect(() => {
        const loadAuthData = async () => {
            try {
                const [token, userString] = await Promise.all([
                    AsyncStorage.getItem('token'),
                    AsyncStorage.getItem('user')
                ]);

                if (token && userString) {
                    const user = JSON.parse(userString);
                    setState({
                        isLoading: false,
                        token,
                        user,
                        isAuthenticated: true,
                    });

                    axios.defaults.headers.common['Authorization'] = token;
                } else {
                    setState({
                        isLoading: false,
                        token: null,
                        user: null,
                        isAuthenticated: false,
                    });
                }
            } catch (error) {
                console.error('Failed to load auth data:', error);
                setState({
                    isLoading: false,
                    token: null,
                    user: null,
                    isAuthenticated: false,
                });
            }
        };

        loadAuthData();
    }, []);

    // Login function
    const login = async (email, password, rememberMe) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                email,
                password,
            });

            if (!response.data.token || !response.data.userDaLoc) {
                throw new Error('Invalid response: Token or user data missing');
            }

            const token = response.data.token;
            const user = response.data.userDaLoc;

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            if (rememberMe) {
                await AsyncStorage.setItem('rememberMe', 'true');
                await AsyncStorage.setItem('savedEmail', email);
            } else {
                await AsyncStorage.removeItem('rememberMe');
                await AsyncStorage.removeItem('savedEmail');
            }

            axios.defaults.headers.common['Authorization'] = token;

            setState({
                isLoading: false,
                token,
                user,
                isAuthenticated: true,
            });

            if (socket) {
                socket.emit('join', user._id);
            }

            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (socket && socket.connected) {
                socket.disconnect();
                setSocket(null);
            }

            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');

            delete axios.defaults.headers.common['Authorization'];

            setState({
                isLoading: false,
                token: null,
                user: null,
                isAuthenticated: false,
            });

            return true;
        } catch (error) {
            console.error('Logout error:', error);

            try {
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                delete axios.defaults.headers.common['Authorization'];

                setState({
                    isLoading: false,
                    token: null,
                    user: null,
                    isAuthenticated: false,
                });

                return true;
            } catch (forceError) {
                console.error('Force logout error:', forceError);
                return false;
            }
        }
    };

    const updateUser = async (userData) => {
        try {
            const updatedUser = { ...state.user, ...userData };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            setState(prev => ({
                ...prev,
                user: updatedUser
            }));

            return true;
        } catch (error) {
            console.error('Error updating user data:', error);
            return false;
        }
    };

    const updateUserContext = updateUser;

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                updateUser,
                updateUserContext
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}