const admin = require('firebase-admin');

const db = admin.firestore();

const SETTINGS_COLLECTION = 'auth_settings';
const GLOBAL_SETTINGS_DOC = 'global';
const USER_SETTINGS_COLLECTION = 'user_settings';
const LOGIN_ATTEMPTS_COLLECTION = 'login_attempts';

async function getGlobalSettings() {
  const doc = await db.collection(SETTINGS_COLLECTION).doc(GLOBAL_SETTINGS_DOC).get();
  
  if (!doc.exists) {
    const defaultSettings = {
      session_duration_minutes: 30,
      default_max_login_attempts: 3,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(SETTINGS_COLLECTION).doc(GLOBAL_SETTINGS_DOC).set(defaultSettings);
    return defaultSettings;
  }
  
  return doc.data();
}

async function updateSessionDuration(minutes) {
  await db.collection(SETTINGS_COLLECTION).doc(GLOBAL_SETTINGS_DOC).update({
    session_duration_minutes: minutes,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  return getGlobalSettings();
}

async function updateDefaultMaxAttempts(attempts) {
  await db.collection(SETTINGS_COLLECTION).doc(GLOBAL_SETTINGS_DOC).update({
    default_max_login_attempts: attempts,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  return getGlobalSettings();
}

async function getUserSettings(uid) {
  const doc = await db.collection(USER_SETTINGS_COLLECTION).doc(uid).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data();
}

async function setUserMaxAttempts(uid, maxAttempts) {
  await db.collection(USER_SETTINGS_COLLECTION).doc(uid).set({
    max_login_attempts: maxAttempts,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  return getUserSettings(uid);
}

async function getMaxAttemptsForUser(uid) {
  const userSettings = await getUserSettings(uid);
  
  if (userSettings && userSettings.max_login_attempts !== null && userSettings.max_login_attempts !== undefined) {
    return userSettings.max_login_attempts;
  }
  
  const globalSettings = await getGlobalSettings();
  return globalSettings.default_max_login_attempts;
}

async function getLoginAttempts(uid) {
  const doc = await db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(uid).get();
  
  if (!doc.exists) {
    return {
      failed_attempts: 0,
      is_blocked: false,
      last_attempt_at: null,
      blocked_at: null
    };
  }
  
  return doc.data();
}

async function recordFailedAttempt(uid, email) {
  const docRef = db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(uid);
  const doc = await docRef.get();
  
  const maxAttempts = await getMaxAttemptsForUser(uid);
  
  if (!doc.exists) {
    await docRef.set({
      email: email,
      failed_attempts: 1,
      is_blocked: false,
      last_attempt_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { failed_attempts: 1, is_blocked: false, attemptsLeft: maxAttempts - 1 };
  }
  
  const data = doc.data();
  const newFailedAttempts = data.failed_attempts + 1;
  const isBlocked = newFailedAttempts >= maxAttempts;
  
  await docRef.update({
    failed_attempts: newFailedAttempts,
    is_blocked: isBlocked,
    last_attempt_at: admin.firestore.FieldValue.serverTimestamp(),
    ...(isBlocked && { blocked_at: admin.firestore.FieldValue.serverTimestamp() })
  });
  
  return {
    failed_attempts: newFailedAttempts,
    is_blocked: isBlocked,
    attemptsLeft: Math.max(0, maxAttempts - newFailedAttempts)
  };
}

async function resetLoginAttempts(uid) {
  const docRef = db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(uid);
  
  await docRef.set({
    failed_attempts: 0,
    is_blocked: false,
    last_attempt_at: admin.firestore.FieldValue.serverTimestamp(),
    blocked_at: null
  }, { merge: true });
}

async function unblockUser(uid) {
  const docRef = db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(uid);
  
  await docRef.update({
    failed_attempts: 0,
    is_blocked: false,
    blocked_at: null,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return getLoginAttempts(uid);
}

async function getBlockedUsers() {
  const snapshot = await db.collection(LOGIN_ATTEMPTS_COLLECTION)
    .where('is_blocked', '==', true)
    .get();
  
  const blockedUsers = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    try {
      const userRecord = await admin.auth().getUser(doc.id);
      blockedUsers.push({
        uid: doc.id,
        email: userRecord.email,
        failed_attempts: data.failed_attempts,
        blocked_at: data.blocked_at ? data.blocked_at.toDate() : null
      });
    } catch (error) {
      console.error(`Utilisateur ${doc.id} non trouvé`);
    }
  }
  
  return blockedUsers;
}

async function getAllFirebaseUsersWithSettings() {
  const listUsersResult = await admin.auth().listUsers();
  const users = [];
  
  for (const userRecord of listUsersResult.users) {
    const userSettings = await getUserSettings(userRecord.uid);
    const loginAttempts = await getLoginAttempts(userRecord.uid);
    
    users.push({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: userRecord.metadata.creationTime,
      lastSignIn: userRecord.metadata.lastSignInTime,
      customMaxAttempts: userSettings?.max_login_attempts || null,
      failedAttempts: loginAttempts.failed_attempts,
      isBlocked: loginAttempts.is_blocked
    });
  }
  
  return users;
}

module.exports = {
  getGlobalSettings,
  updateSessionDuration,
  updateDefaultMaxAttempts,
  getUserSettings,
  setUserMaxAttempts,
  getMaxAttemptsForUser,
  getLoginAttempts,
  recordFailedAttempt,
  resetLoginAttempts,
  unblockUser,
  getBlockedUsers,
  getAllFirebaseUsersWithSettings
};