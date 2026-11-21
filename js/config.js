// ─────────────────────────────────────────────────────────────
// STEP 1 of the setup guide: paste your Firebase settings here.
// Firebase console → Project settings (gear icon) → General →
// "Your apps" → your web app → "SDK setup and configuration" → Config.
//
// These values are not secret. They only say WHICH project to talk to;
// the security rules (firestore.rules) decide who can do what.
// ─────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyC7yOl_xDZeoDDBAehUHkV7ubMyn3w7k9g",
  authDomain: "swap-shop-ef3e1.firebaseapp.com",
  projectId: "swap-shop-ef3e1",
  storageBucket: "swap-shop-ef3e1.firebasestorage.app",
  messagingSenderId: "865725065362",
  appId: "1:865725065362:web:6ccf49062a447a42eade4b"
};

// Only emails ending in this can use the app.
export const SCHOOL_DOMAIN = "lpcuwc.edu.hk";

// The categories students can pick. If you change these,
// change the same list in firestore.rules too.
export const CATEGORIES = ["Clothes", "Bedding", "Kitchen", "Books", "Electronics", "Other"];
