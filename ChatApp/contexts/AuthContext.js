// ChatApp/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';
import io from 'socket.io-client';

const API_BASE_URL = require('../services/api');

// Create the context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
    const [state, setState] = useState({
        isLoading: true,
        token: null,
        user: null,
        isAuthenticated: false,
    });
    const [socket, setSocket] = useState(null);

    // Initialize socket connection
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

    // Load stored auth data when app starts
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

                    // Set axios default header
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

            // Save to AsyncStorage
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            if (rememberMe) {
                await AsyncStorage.setItem('rememberMe', 'true');
                await AsyncStorage.setItem('savedEmail', email);
            } else {
                await AsyncStorage.removeItem('rememberMe');
                await AsyncStorage.removeItem('savedEmail');
            }

            // Set axios default header
            axios.defaults.headers.common['Authorization'] = token;

            // Update state
            setState({
                isLoading: false,
                token,
                user,
                isAuthenticated: true,
            });

            // Emit socket event to notify online status after login
            if (socket) {
                socket.emit('join', user._id);
            }

            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Logout function
    const logout = async () => {
        try {
            // Notify server user is going offline before clearing token
            if (socket && state.user) {
                socket.emit('disconnect');
                socket.disconnect();
            }

            // Clear AsyncStorage
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');

            // Remove axios header
            delete axios.defaults.headers.common['Authorization'];

            // Update state
            setState({
                isLoading: false,
                token: null,
                user: null,
                isAuthenticated: false,
            });

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    };

    // Update user function
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

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                updateUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use the auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}