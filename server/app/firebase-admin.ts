import admin = require('firebase-admin');
import { applicationDefault, initializeApp } from 'firebase-admin/app';

initializeApp({
    credential: applicationDefault(),
});

export const authAdmin = admin.auth();
