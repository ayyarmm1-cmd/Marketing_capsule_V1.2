const admin = require('firebase-admin');

const {
  OWNER_UID = 'AOYNuvYpAJM6KlVrWtY9sk6aRB32',
  OWNER_EMAIL = 'owner@marketingcapsule.com',
  OWNER_PASSWORD = 'MarketingCapsule@123',
  OWNER_NAME = 'Owner',
  OWNER_USERNAME = 'owner',
  OWNER_DEPARTMENT = 'Management',
  OWNER_JOB_TITLE = 'Owner',
  OWNER_PAYMENT_TYPE = 'Monthly',
  OWNER_EMPLOYEE_STATUS = 'Active',
  GCLOUD_PROJECT = 'marketing-capsule',
} = process.env;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: GCLOUD_PROJECT,
});

const auth = admin.auth();
const firestore = admin.firestore();

async function ensureOwnerAccount() {
  const userPayload = {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    displayName: OWNER_NAME,
    emailVerified: true,
    disabled: false,
  };

  try {
    await auth.updateUser(OWNER_UID, userPayload);
    console.log(`Updated existing auth user ${OWNER_UID}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      await auth.createUser({
        uid: OWNER_UID,
        ...userPayload,
      });
      console.log(`Created new auth user ${OWNER_UID}`);
    } else {
      throw error;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await firestore.doc(`users/${OWNER_UID}`).set(
    {
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      username: OWNER_USERNAME,
      role: 'Owner',
      jobTitle: OWNER_JOB_TITLE,
      department: OWNER_DEPARTMENT,
      employeeStatus: OWNER_EMPLOYEE_STATUS,
      paymentType: OWNER_PAYMENT_TYPE,
      basicPay: 0,
      hasLoginAccess: true,
      requiresPasswordChange: false,
      isDemoUser: false,
      demoOwnerId: null,
      updatedAt: now,
    },
    { merge: true },
  );

  console.log('Firestore owner profile updated successfully.');
  console.log(`Owner can now sign in with email ${OWNER_EMAIL} and the configured password.`);
}

ensureOwnerAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to ensure owner account:', error);
    process.exit(1);
  });

