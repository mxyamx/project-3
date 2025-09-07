// Import the functions you need from the SDKs you need
import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: 'AIzaSyC2R72DjUSJ0-sKnFRkJyDLpDzZhHz5q8Y',
    authDomain: 'log3900-85dd3.firebaseapp.com',
    projectId: 'log3900-85dd3',
    storageBucket: 'log3900-85dd3.firebasestorage.app',
    messagingSenderId: '264462972122',
    appId: '1:264462972122:web:de8850d228a01b2ff0a1e3',
    measurementId: 'G-TJBQY1JT0H',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
