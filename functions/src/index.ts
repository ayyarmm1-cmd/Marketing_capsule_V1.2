import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

// Activity log retention: delete logs older than 60 days (matches ACTIVITY_LOG_HISTORY_DAYS in api.ts)
const ACTIVITY_LOG_RETENTION_DAYS = 60;
const ACTIVITY_LOG_COLLECTION = "activityLogs";

interface SmsMessage {
  to: string;
  message: string;
  from: string;
  clientReference?: string;
}

interface SmsRequest {
  messages: SmsMessage[];
  apiKey: string;
  apiSecret: string;
  apiUrl: string;
  senderId: string;
}

interface SmsResult {
  success: boolean;
  message_id?: string;
  status?: string;
  error?: string;
  message?: string;
  clientReference?: string;
}

export const sendSmsBatch = functions.region("asia-east1").https.onCall(
  async (data: SmsRequest, context: functions.https.CallableContext) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to send SMS"
      );
    }

    const { messages, apiKey, apiSecret, apiUrl, senderId } = data;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Messages array is required and must not be empty"
      );
    }

    if (!apiKey || !apiSecret || !apiUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "API credentials are required"
      );
    }

    // Prepare SMSPoh API authentication token (Base64 encode apiKey:apiSecret)
    const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const results: SmsResult[] = [];

    // Send each message to SMSPoh API
    for (const msg of messages) {
      try {
        const smspohPayload = {
          to: msg.to,
          message: msg.message,
          from: senderId || msg.from,
        };

        // Call SMSPoh API
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(smspohPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`,
          }));
          throw new Error(
            errorData.error || errorData.message || `HTTP ${response.status}`
          );
        }

        const responseData = await response.json();

        // Log the full response for debugging
        console.log('SMSPoh API Response:', JSON.stringify(responseData));

        // SMSPoh V3 API response format
        // If we get a 200 OK response, it's generally successful
        // Check for message_id or id field (indicates message was accepted)
        const hasMessageId = !!(responseData.message_id || responseData.id);
        const hasExplicitError = !!(responseData.error || (responseData.status && typeof responseData.status === 'string' && responseData.status.toLowerCase().includes('error')));
        
        // Success if: we have a message_id OR status indicates success OR no explicit error
        // A 200 OK response from SMSPoh generally means success
        const isSuccess = hasMessageId || 
                         responseData.status === 'Accepted' ||
                         responseData.status === 'sent' ||
                         responseData.status === 'Sent' ||
                         responseData.status === 'Delivered' ||
                         (!hasExplicitError && response.ok);

        results.push({
          success: isSuccess,
          message_id: responseData.message_id || responseData.id || undefined,
          status: responseData.status || (isSuccess ? 'Accepted' : null),
          error: isSuccess ? undefined : (responseData.error || 'Unknown error'),
          message: responseData.message,
          clientReference: msg.clientReference,
        });
      } catch (error: any) {
        // Individual message failed
        results.push({
          success: false,
          error: error.message || "Failed to send message",
          clientReference: msg.clientReference,
        });
      }
    }

    return { results };
  }
);

const DEFAULT_DEMO_EMAIL = process.env.DEMO_ACCOUNT_EMAIL?.toLowerCase() || "test@upwardmm.com";
const DEFAULT_DEMO_NAME = process.env.DEMO_ACCOUNT_NAME || "Demo Owner";
const DEFAULT_DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || "123456";

interface EnsureDemoAccountRequest {
  email?: string;
  password?: string;
  name?: string;
}

export const ensureDemoOwner = functions.region("asia-east1").https.onCall(
  async (data: EnsureDemoAccountRequest, context: functions.https.CallableContext) => {
    const requestedEmail = (data.email || DEFAULT_DEMO_EMAIL).toLowerCase();
    const isDefaultDemoEmail = requestedEmail === DEFAULT_DEMO_EMAIL;

    if (!context.auth && !isDefaultDemoEmail) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required to manage non-default accounts."
      );
    }

    if (context.auth) {
      const callerRef = admin.firestore().doc(`users/${context.auth.uid}`);
      const callerSnap = await callerRef.get();
      if (!callerSnap.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Caller profile not found."
        );
      }

      const callerRole = callerSnap.get("role");
      if (callerRole !== "Owner" && callerRole !== "Admin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only Owners and Admins can manage the demo account."
        );
      }
    }

    const email = requestedEmail;
    const password = data.password || DEFAULT_DEMO_PASSWORD;
    const demoName = data.name || DEFAULT_DEMO_NAME;

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: demoName,
          emailVerified: true,
        });
      } else {
        throw new functions.https.HttpsError(
          "internal",
          `Failed to look up demo user: ${error.message}`
        );
      }
    }

    await admin.auth().updateUser(userRecord.uid, {
      password,
      displayName: demoName,
      disabled: false,
    });

    // Ensure there is at least one department to assign
    const departmentsRef = admin.firestore().collection("departments");
    let departmentId = "";
    let departmentName = "Management";
    const deptSnapshot = await departmentsRef.limit(1).get();
    if (deptSnapshot.empty) {
      const deptDoc = departmentsRef.doc();
      await deptDoc.set({
        name: departmentName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      departmentId = deptDoc.id;
    } else {
      const deptDoc = deptSnapshot.docs[0];
      departmentId = deptDoc.id;
      departmentName = deptDoc.get("name") || departmentName;
    }

    const userDocRef = admin.firestore().doc(`users/${userRecord.uid}`);
    const userDocSnap = await userDocRef.get();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const baseData = {
      name: demoName,
      email,
      role: "Demo Owner",
      hasLoginAccess: true,
      requiresPasswordChange: false,
      department: departmentName,
      departmentId,
      jobTitle: "Demo Owner",
      joiningDate: new Date().toISOString().split("T")[0],
      employeeStatus: "Active",
      basicPay: 0,
      paymentType: "Monthly",
      isDemoUser: false,
      demoOwnerId: null,
      updatedAt: now,
    };

    if (userDocSnap.exists) {
      await userDocRef.set(baseData, { merge: true });
    } else {
      await userDocRef.set({
        ...baseData,
        employeeId: "EMP_DEMO_OWNER",
        createdAt: now,
      });
    }

    return { success: true, uid: userRecord.uid };
  }
);

// Cloud Function to update requiresPasswordChange flag after password change
// This bypasses Firestore security rules by using admin SDK
export const updatePasswordChangeFlag = functions.region("asia-east1").https.onCall(
  async (data: { userId: string }, context: functions.https.CallableContext) => {
    // Verify authentication - user must be updating their own flag
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = data.userId || context.auth.uid;
    
    // Ensure user can only update their own flag
    if (userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Users can only update their own password change flag"
      );
    }

    try {
      // Use admin SDK to update the flag (bypasses security rules)
      const userRef = admin.firestore().doc(`users/${userId}`);
      await userRef.update({
        requiresPasswordChange: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Failed to update password change flag:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to update password change flag: ${error.message}`
      );
    }
  }
);

/**
 * Scheduled function: permanently delete activity logs older than 60 days.
 * Runs daily at 2:00 AM Asia/Yangon (UTC+6:30).
 */
export const cleanupActivityLogs = functions
  .region("asia-east1")
  .pubsub.schedule("0 2 * * *")
  .timeZone("Asia/Yangon")
  .onRun(async () => {
    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVITY_LOG_RETENTION_DAYS);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

    let totalDeleted = 0;
    const BATCH_SIZE = 400; // Firestore batch limit is 500

    let snapshot = await db
      .collection(ACTIVITY_LOG_COLLECTION)
      .where("timestamp", "<", cutoffTimestamp)
      .limit(BATCH_SIZE)
      .get();

    while (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      totalDeleted += snapshot.docs.length;
      if (snapshot.docs.length < BATCH_SIZE) break;
      snapshot = await db
        .collection(ACTIVITY_LOG_COLLECTION)
        .where("timestamp", "<", cutoffTimestamp)
        .limit(BATCH_SIZE)
        .get();
    }

    if (totalDeleted > 0) {
      console.log(`cleanupActivityLogs: deleted ${totalDeleted} activity log(s) older than ${ACTIVITY_LOG_RETENTION_DAYS} days`);
    }
  });

