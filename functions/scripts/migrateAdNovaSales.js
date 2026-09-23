/**
 * One-time migration: rewrite legacy sales with type "AdNova Digital Signage" to "Other Services"
 * so the app (which no longer models AdNova) can read them as SaleRecord.
 *
 * Prerequisites:
 *   - gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS to a service account JSON)
 *   - npm install in functions/ if firebase-admin is not available from here
 *
 * Usage (from repo root):
 *   GCLOUD_PROJECT=your-project-id node functions/scripts/migrateAdNovaSales.js
 *
 * Optional env:
 *   DRY_RUN=true          — log actions only, no writes
 *   CLEANUP_COLLECTIONS=true — delete all docs in adnova_free_campaigns and settings_adnova_locations
 *   DEACTIVATE_S_ADN=true    — set services/S_ADN isActive: false if the doc exists
 *
 * Pricing note: unitPriceMMK is set to grandTotalMMK (same as quantity 1 line total).
 */

const admin = require('firebase-admin');

const { GCLOUD_PROJECT = 'marketing-capsule', DRY_RUN, CLEANUP_COLLECTIONS, DEACTIVATE_S_ADN } = process.env;

if (!GCLOUD_PROJECT) {
  console.error('Set GCLOUD_PROJECT to your Firebase project id.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: GCLOUD_PROJECT,
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function isoNow() {
  return new Date().toISOString();
}

function summarizeAdNovaItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((i) => {
      const loc = i.locationName || i.locationId || '?';
      const pkg = i.packageName || '?';
      return `${loc} / ${pkg}`;
    })
    .join('; ');
}

async function migrateSales() {
  const snap = await db.collection('sales').where('type', '==', 'AdNova Digital Signage').get();

  if (snap.empty) {
    console.log('No AdNova Digital Signage sales found.');
    return 0;
  }

  console.log(`Found ${snap.size} sale(s) to migrate.`);

  let count = 0;
  let batch = db.batch();
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const doc of snap.docs) {
    const data = doc.data();
    const grand = typeof data.grandTotalMMK === 'number' ? data.grandTotalMMK : 0;
    const sub = typeof data.subtotalMMK === 'number' ? data.subtotalMMK : 0;
    const unitPrice = grand || sub;

    const itemSummary = summarizeAdNovaItems(data.items);
    const stamp = `[Migrated from AdNova Digital Signage ${isoNow()}]`;
    const extra = itemSummary ? ` Former line items: ${itemSummary}` : '';
    const prevNotes = typeof data.notes === 'string' && data.notes.trim() ? `${data.notes.trim()}\n\n` : '';
    const newNotes = `${prevNotes}${stamp}${extra}`;

    const ref = doc.ref;
    const payload = {
      type: 'Other Services',
      quantity: 1,
      unitPriceMMK: unitPrice,
      notes: newNotes,
      updatedAt: isoNow(),
      items: FieldValue.delete(),
      salesRecordDate: FieldValue.delete(),
      campaignStartDate: FieldValue.delete(),
      campaignDurationDays: FieldValue.delete(),
      startDate: FieldValue.delete(),
      endDate: FieldValue.delete(),
    };

    if (DRY_RUN === 'true') {
      console.log(`[DRY_RUN] ${ref.id}: -> Other Services, unitPriceMMK=${unitPrice}`);
    } else {
      batch.update(ref, payload);
      ops += 1;
      if (ops >= 450) {
        await flush();
      }
    }
    count += 1;
  }

  if (DRY_RUN !== 'true') {
    await flush();
  }
  return count;
}

async function deleteCollectionInBatches(collectionPath) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db.collection(collectionPath).limit(500).get();
    if (snap.empty) {
      console.log(`Collection ${collectionPath}: empty.`);
      return;
    }
    if (DRY_RUN === 'true') {
      console.log(`[DRY_RUN] would delete ${snap.size} doc(s) from ${collectionPath}`);
      return;
    }
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Deleted ${snap.size} doc(s) from ${collectionPath}`);
  }
}

async function cleanupCollections() {
  await deleteCollectionInBatches('adnova_free_campaigns');
  await deleteCollectionInBatches('settings_adnova_locations');
}

async function deactivateServiceSAdn() {
  const ref = db.collection('services').doc('S_ADN');
  const doc = await ref.get();
  if (!doc.exists) {
    console.log('services/S_ADN: not found, skip.');
    return;
  }
  if (DRY_RUN === 'true') {
    console.log('[DRY_RUN] would set services/S_ADN isActive: false');
    return;
  }
  await ref.update({ isActive: false, updatedAt: isoNow() });
  console.log('Set services/S_ADN isActive: false');
}

async function main() {
  const migrated = await migrateSales();
  console.log(`Migrated ${migrated} sale document(s).`);

  if (CLEANUP_COLLECTIONS === 'true') {
    await cleanupCollections();
  }
  if (DEACTIVATE_S_ADN === 'true') {
    await deactivateServiceSAdn();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
