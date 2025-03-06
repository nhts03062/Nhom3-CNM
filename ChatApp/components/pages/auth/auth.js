import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from "@expo/vector-icons";
import axios from 'axios';

const { width, height } = Dimensions.get("window");
const API_BASE_URL = 'http://192.168.88.89:5000/api';

const AuthScreen = ({ navigation, route }) => {
  const pageFlip = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Error states
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nameError, setNameError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Check for verification query params
    const verified = route.params?.verified;
    const message = route.params?.message;

    if (verified !== undefined) {
      Alert.alert(
        verified === "true" ? "Xác Thực Thành Công" : "Xác Thực Thất Bại",
        message || "Có lỗi xảy ra!",
        [{ text: "OK" }]
      );
    }
  }, [route.params]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            const response = await axios.get(`${API_BASE_URL}/auth/verify-token`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            if (response.status === 200) {
              navigation.replace('Dashboard');
            }
          } catch (error) {
            console.log('Token invalid or expired:', error);
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };
    checkAuth();
  }, [navigation]);

  const frontPageStyle = {
    transform: [
      { perspective: 1000 },
      {
        rotateY: pageFlip.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "-90deg"],
        }),
      },
      {
        translateX: pageFlip.interpolate({
          inputRange: [0, 1],
          outputRange: [0, width * 0.5],
        }),
      },
    ],
    zIndex: pageFlip.interpolate({
      inputRange: [0, 0.5, 0.51, 1],
      outputRange: [2, 2, 1, 1],
    }),
    opacity: pageFlip.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0, 0],
    }),
  };

  const backPageStyle = {
    transform: [
      { perspective: 1000 },
      {
        rotateY: pageFlip.interpolate({
          inputRange: [0, 1],
          outputRange: ["90deg", "0deg"],
        }),
      },
      {
        translateX: pageFlip.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.5, 0],
        }),
      },
    ],
    zIndex: pageFlip.interpolate({
      inputRange: [0, 0.5, 0.51, 1],
      outputRange: [1, 1, 2, 2],
    }),
    opacity: pageFlip.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    }),
  };

  // Page flip shadow effect
  const pageShadowStyle = {
    opacity: pageFlip.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.3, 0],
    }),
    transform: [
      {
        translateX: pageFlip.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [width * 0.5, 0, -width * 0.5],
        }),
      },
    ],
  };

  // Function to handle page flip animation
  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1;

    // Reset error states
    setEmailError("");
    setPasswordError("");
    setNameError("");

    Animated.timing(pageFlip, {
      toValue,
      duration: 800,
      easing: Easing.bezier(0.455, 0.03, 0.515, 0.955),
      useNativeDriver: true,
    }).start();

    setIsFlipped(!isFlipped);
  };

  // Validate login form
  const validateLogin = () => {
    let isValid = true;

    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  // Validate signup form
  const validateSignup = () => {
    let isValid = true;
    if (!name) {
      setNameError('Name is required');
      isValid = false;
    }
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email');
      isValid = false;
    }
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }
    return isValid;
  };

  const handleLoginSubmit = async () => {
    if (validateLogin()) {
      try {
        setIsLoading(true);
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password
        });

        if (response.data.token) {
          await AsyncStorage.setItem('token', response.data.token);
          if (response.data.user) {
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          }
          if (rememberMe) {
            await AsyncStorage.setItem('rememberMe', 'true');
            await AsyncStorage.setItem('savedEmail', email);
          } else {
            await AsyncStorage.removeItem('rememberMe');
            await AsyncStorage.removeItem('savedEmail');
          }
          Alert.alert("Success", "✅ Login successful!");
          navigation.replace('Dashboard');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.msg || "Login failed. Please try again.";
        Alert.alert("Login Error", `❌ ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSignupSubmit = async () => {
    if (validateSignup()) {
      try {
        setIsLoading(true);
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
          name,
          email,
          password
        });

        Alert.alert(
          "Registration Successful",
          `✅ ${response.data.msg || "Your account has been created! Please check your email to verify your account."}`,
          [
            {
              text: "OK",
              onPress: () => handleFlip()
            }
          ]
        );
      } catch (error) {
        const errorMessage = error.response?.data?.msg || "Registration failed. Please try again.";
        Alert.alert("Registration Error", `❌ ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setEmailError('Email is required to reset password');
      return;
    }

    Alert.alert(
      "Reset Password",
      "Would you like to receive a password reset link to your email?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Yes, send link",
          onPress: async () => {
            try {
              setIsLoading(true);
              await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
              Alert.alert(
                "Password Reset",
                "A password reset link has been sent to your email."
              );
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to send reset link. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.bookContainer}>
          {/* Page shadow effect */}
          <Animated.View style={[styles.pageShadow, pageShadowStyle]} />

          {/* Login Page (Front) */}
          <Animated.View
            style={[styles.page, frontPageStyle, styles.frontPage]}
          >
            <View style={styles.pageContent}>
              <View style={styles.contentColumn}>
                <View style={styles.loginHeader}>
                  <Text style={styles.headerText}>Login</Text>
                  <View style={styles.headerUnderline} />
                </View>

                <View style={styles.illustrationContainer}>
                  <Image
                    source={require("../../../assets/frontImg.avif")}
                    style={styles.illustration}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputRow}>
                    <Feather
                      name="mail"
                      size={20}
                      color="#7AB3DF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setEmailError("");
                      }}
                    />
                  </View>
                  {emailError ? (
                    <Text style={styles.errorText}>{emailError}</Text>
                  ) : null}

                  <View style={styles.inputRow}>
                    <Feather
                      name="lock"
                      size={20}
                      color="#7AB3DF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#999"
                      secureTextEntry
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setPasswordError("");
                      }}
                    />
                  </View>
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}

                  <View style={styles.loginOptions}>
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={styles.forgotPasswordText}>
                        Forgot password?
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.rememberMeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          rememberMe && styles.checkboxChecked,
                        ]}
                        onPress={() => setRememberMe(!rememberMe)}
                      >
                        {rememberMe && (
                          <Feather name="check" size={14} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.rememberMeText}>Remember me</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleLoginSubmit}
                    disabled={isLoading}
                  >
                    <Text style={styles.submitButtonText}>
                      {isLoading ? "Loading..." : "Submit"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                      Don't have an account?{" "}
                    </Text>
                    <TouchableOpacity onPress={handleFlip}>
                      <Text style={styles.footerLink}>Signup now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.pageEdge} />
          </Animated.View>

          {/* Signup Page (Back) */}
          <Animated.View style={[styles.page, backPageStyle, styles.backPage]}>
            <View style={styles.pageEdgeShadow} />
            <View style={styles.pageContent}>
              <View style={styles.contentColumn}>
                <View style={styles.signupHeader}>
                  <Text style={styles.headerText}>Signup</Text>
                  <View style={styles.headerUnderline} />
                </View>

                <View style={styles.illustrationContainer}>
                  <Image
                    source={require("../../../assets/frontImg.jpg")}
                    style={styles.illustration}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.formContainer}>
                  <TextInput
                    style={styles.signupInput}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setNameError("");
                    }}
                  />
                  {nameError ? (
                    <Text style={styles.errorText}>{nameError}</Text>
                  ) : null}

                  <TextInput
                    style={styles.signupInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError("");
                    }}
                  />
                  {emailError ? (
                    <Text style={styles.errorText}>{emailError}</Text>
                  ) : null}

                  <TextInput
                    style={styles.signupInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError("");
                    }}
                  />
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSignupSubmit}
                    disabled={isLoading}
                  >
                    <Text style={styles.submitButtonText}>
                      {isLoading ? "Registering..." : "Submit"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                      Already have an account?{" "}
                    </Text>
                    <TouchableOpacity onPress={handleFlip}>
                      <Text style={styles.footerLink}>Login now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#79B3E2",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bookContainer: {
    width: width * 0.9,
    height: height * 0.8,
    maxWidth: 500,
    maxHeight: 700,
    position: "relative",
    perspective: 2500,
  },
  page: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: "white",
    backfaceVisibility: "hidden",
    transformOrigin: "left center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pageContent: {
    flex: 1,
    padding: 24,
  },
  contentColumn: {
    flex: 1,
    alignItems: "center",
  },
  frontPage: {
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
  backPage: {
    borderLeftWidth: 1,
    borderLeftColor: "#ddd",
  },
  pageEdge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 3,
    height: "100%",
    backgroundColor: "#ddd",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  pageEdgeShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 5,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
    zIndex: 2,
  },
  pageShadow: {
    position: "absolute",
    top: 0,
    left: "25%",
    width: "50%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 3,
    borderRadius: 5,
    pointerEvents: "none",
  },
  loginHeader: {
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  signupHeader: {
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerUnderline: {
    width: 40,
    height: 3,
    backgroundColor: "#79B3E2",
    borderRadius: 2,
  },
  illustrationContainer: {
    width: "100%",
    height: "30%",
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: "80%",
    height: "100%",
  },
  formContainer: {
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 5,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  signupInput: {
    fontSize: 16,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 5,
    paddingVertical: 15,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginBottom: 10,
  },
  loginOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
  },
  forgotPasswordText: {
    color: "#7AB3DF",
    fontSize: 14,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 3,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#79B3E2",
    borderColor: "#79B3E2",
  },
  rememberMeText: {
    fontSize: 14,
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#79B3E2",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#b3d4f0",
    opacity: 0.7,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  footerLink: {
    fontSize: 14,
    color: "#5b13b9",
    fontWeight: "bold",
  },
});

export default AuthScreen;