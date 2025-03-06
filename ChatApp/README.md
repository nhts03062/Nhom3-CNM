# 📨 ChatApp (React Native + Expo)

This is a **ChatApp** built using **React Native** and **Expo**.

## 🚀 How to Run the Project

### 1️⃣ Install Expo Go
Download and install the **Expo Go** app on your phone from the **App Store** (iOS) or **Google Play** (Android).

### 2️⃣ Install Dependencies
Navigate to your project folder and run:
```sh
npm install
```
This will install all the required dependencies.

### 3️⃣ Start the Backend Server
Move into the `backend` folder and start the server using **nodemon**:
```sh
cd backend
nodemon server.js
```

### 4️⃣ Start the Expo Project
Go back to the root folder of the project and start Expo:
```sh
npm start
```
This will open the **Expo Developer Tools** in your browser. You can scan the QR code with **Expo Go** to run the app on your phone.

### ⚠ Important Note
Make sure to update the **IP address** in the following files to match your machine's IP:
- `server.js` (inside the `backend` folder)
- `auth.js` (inside the `routes` folder)
- `auth.js` (inside `components/pages/auth` folder)

To find your local IP, run:
```sh
ipconfig (on Windows)
ifconfig (on macOS/Linux)
```

Once updated, restart the backend server and the Expo app.

Happy coding! 🚀

