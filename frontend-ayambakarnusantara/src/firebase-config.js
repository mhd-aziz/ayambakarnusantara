import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const getFCMToken = async () => {
  const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

  if (!VAPID_KEY) {
    console.error("VAPID key tidak ditemukan di environment variables.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        return currentToken;
      } else {
        console.log(
          "Gagal mendapatkan FCM Token. Izin mungkin perlu diberikan ulang."
        );
        return null;
      }
    } else {
      console.log("Izin notifikasi tidak diberikan oleh pengguna.");
      return null;
    }
  } catch (err) {
    console.error("Terjadi kesalahan saat mengambil FCM token.", err);
    return null;
  }
};
