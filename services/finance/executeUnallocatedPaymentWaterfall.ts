/**
 * Client-wide (unallocated business) payment waterfall allocator.
 *
 * Architecture (three balance layers):
 *   Pair Outstanding = openingBalance - openingBalancePaid + balance
 *   Client Total     = Σ Pair Outstanding for clientId
 *   Business Total   = Σ Pair Outstanding for businessId
 *
 * When a payment has clientId but no businessId, funds flow through a strict FIFO waterfall:
 *   Phase 1 — Opening balances (legacy debt), pairs sorted by businessId
 *   Phase 2 — Approved sales / invoices, oldest createdAt first (global, cross-business)
 *   Phase 3 — Remaining funds become floating credit on the primary (first) pair (negative balance)
 */

import firebase from 'firebase/compat/app';
import { ClientBusinessBalance, Payment, SaleRecord, SaleStatus, PaymentStatus } from '../../types';
import { isMoneyZero, minMoney, roundMoney } from './moneyUtils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Per-line audit of where each dollar was applied during the waterfall. */
export interface PaymentAllocation {
    businessId: string;
    amount: number;
    appliedTo: 'OPENING' | 'BALANCE';
    /** Set when applied to a specific sales invoice / sale record. */
    invoiceId?: string;
    /** ERP sale document id (parallel to invoiceId for traceability). */
    saleRecordId?: string;
}

/** Aggregated plan produced by the pure planner (no I/O). */
export interface UnallocatedWaterfallPlan {
    allocations: PaymentAllocation[];
    businessAllocations: Array<{
        businessId: string;
        amountMMK: number;
        openingBalanceApplied: number;
    }>;
    saleAllocations: Array<{ saleRecordId: string; amountMMK: number }>;
    /** Per pair key `${clientId}_${businessId}` */
    pairUpdates: Map<string, { openingBalancePaidDelta: number; balanceDelta: number }>;
    clientBalanceDelta: number;
    businessBalanceDeltas: Map<string, number>;
    saleAmountPaidDeltas: Map<string, number>;
    primaryBusinessId: string;
}

/**
 * Firestore transaction context. Pass as the third argument to
 * `executeUnallocatedPaymentWaterfall` (typed as `any` in the template for portability).
 */
export interface WaterfallTransactionContext {
    transaction: firebase.firestore.Transaction;
    db: firebase.firestore.Firestore;
    /** When set, the payment document is updated with allocation breakdown. */
    paymentRef?: firebase.firestore.DocumentReference;
    /** Exclude this payment when computing existing sale paid amounts (re-approval). */
    excludePaymentId?: string;
    updatedAt?: string;
}

export interface PlanUnallocatedPaymentWaterfallInput {
    clientId: string;
    paymentAmount: number;
    pairs: ClientBusinessBalance[];
    sales: SaleRecord[];
    /**
     * Optional override of paid amounts per sale (from approved payment allocations).
     * When omitted, uses each sale's `amountPaid` field.
     */
    salePaidBySaleId?: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Pure waterfall planner (testable, no database)
// ---------------------------------------------------------------------------

const pairKey = (clientId: string, businessId: string): string =>
    `${clientId}_${businessId}`;

const getPairOutstanding = (pair: ClientBusinessBalance): number => {
    const opening = pair.openingBalance ?? 0;
    const openingPaid = pair.openingBalancePaid ?? 0;
    const balance = pair.balance ?? 0;
    return roundMoney(opening - openingPaid + balance);
};

const getOpeningRemaining = (pair: ClientBusinessBalance): number =>
    roundMoney(Math.max((pair.openingBalance ?? 0) - (pair.openingBalancePaid ?? 0), 0));

const isSaleEligible = (sale: SaleRecord): boolean =>
    sale.status !== SaleStatus.DRAFT && !!sale.businessId;

const getSaleRemaining = (
    sale: SaleRecord,
    salePaidBySaleId: Map<string, number>
): number => {
    if (!sale.id) return 0;
    const paid = Math.max(sale.amountPaid ?? 0, salePaidBySaleId.get(sale.id) ?? 0);
    return roundMoney(Math.max((sale.grandTotalMMK ?? 0) - paid, 0));
};

/**
 * Computes the FIFO waterfall allocation plan without touching the database.
 * All monetary values are rounded to 2 decimal places.
 */
export function planUnallocatedPaymentWaterfall(
    input: PlanUnallocatedPaymentWaterfallInput
): UnallocatedWaterfallPlan {
    const { clientId, paymentAmount, pairs, sales } = input;
    const amount = roundMoney(paymentAmount);

    if (amount <= 0) {
        const primaryBusinessId = [...pairs].sort((a, b) => a.businessId.localeCompare(b.businessId))[0]?.businessId ?? '';
        return {
            allocations: [],
            businessAllocations: [],
            saleAllocations: [],
            pairUpdates: new Map(),
            clientBalanceDelta: 0,
            businessBalanceDeltas: new Map(),
            saleAmountPaidDeltas: new Map(),
            primaryBusinessId,
        };
    }

    if (pairs.length === 0) {
        throw new Error(`No client-business pair records found for client ${clientId}.`);
    }

    const salePaidBySaleId = new Map(input.salePaidBySaleId ?? []);
    const pairByBusinessId = new Map(pairs.map(p => [p.businessId, p]));

    // Primary pair = first by businessId (deterministic credit target for Phase 3)
    const sortedPairs = [...pairs].sort((a, b) => a.businessId.localeCompare(b.businessId));
    const primaryBusinessId = sortedPairs[0].businessId;

    let remaining = amount;
    const allocations: PaymentAllocation[] = [];
    const pairUpdates = new Map<string, { openingBalancePaidDelta: number; balanceDelta: number }>();
    const saleAmountPaidDeltas = new Map<string, number>();

    const addPairDelta = (
        businessId: string,
        openingDelta: number,
        balanceDelta: number
    ) => {
        const key = pairKey(clientId, businessId);
        const existing = pairUpdates.get(key) ?? { openingBalancePaidDelta: 0, balanceDelta: 0 };
        existing.openingBalancePaidDelta = roundMoney(existing.openingBalancePaidDelta + openingDelta);
        existing.balanceDelta = roundMoney(existing.balanceDelta + balanceDelta);
        pairUpdates.set(key, existing);
    };

    // -----------------------------------------------------------------------
    // PHASE 1 — Opening balances first (legacy debt), sorted by businessId
    // -----------------------------------------------------------------------
    const pairsWithOpening = sortedPairs.filter(p => getOpeningRemaining(p) > 0);

    for (const pair of pairsWithOpening) {
        if (isMoneyZero(remaining)) break;

        const openingRemaining = getOpeningRemaining(pair);
        const applied = minMoney(remaining, openingRemaining);
        if (applied <= 0) continue;

        // Opening payment: track openingBalancePaid AND reduce pair balance by same amount
        addPairDelta(pair.businessId, applied, -applied);
        allocations.push({
            businessId: pair.businessId,
            amount: applied,
            appliedTo: 'OPENING',
        });
        remaining = roundMoney(remaining - applied);
    }

    // -----------------------------------------------------------------------
    // PHASE 2 — Oldest approved sales / invoices first (global FIFO)
    // -----------------------------------------------------------------------
    if (!isMoneyZero(remaining)) {
        const businessIds = new Set(pairs.map(p => p.businessId));
        const unpaidSales = sales
            .filter(s => s.businessId && businessIds.has(s.businessId))
            .filter(isSaleEligible)
            .filter(s => getSaleRemaining(s, salePaidBySaleId) > 0)
            .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

        for (const sale of unpaidSales) {
            if (isMoneyZero(remaining) || !sale.id || !sale.businessId) break;
            if (!pairByBusinessId.has(sale.businessId)) continue;

            const saleRemaining = getSaleRemaining(sale, salePaidBySaleId);
            if (saleRemaining <= 0) continue;

            const applied = minMoney(remaining, saleRemaining);
            addPairDelta(sale.businessId, 0, -applied);
            saleAmountPaidDeltas.set(
                sale.id,
                roundMoney((saleAmountPaidDeltas.get(sale.id) ?? 0) + applied)
            );
            // Reflect in-memory paid state for subsequent iterations in same payment
            salePaidBySaleId.set(sale.id, roundMoney((salePaidBySaleId.get(sale.id) ?? 0) + applied));

            allocations.push({
                businessId: sale.businessId,
                amount: applied,
                appliedTo: 'BALANCE',
                invoiceId: sale.invoiceId ?? sale.id,
                saleRecordId: sale.id,
            });
            remaining = roundMoney(remaining - applied);
        }
    }

    // -----------------------------------------------------------------------
    // PHASE 3 — Overpayment → floating credit on primary pair (negative balance)
    // -----------------------------------------------------------------------
    if (!isMoneyZero(remaining)) {
        addPairDelta(primaryBusinessId, 0, -remaining);
        allocations.push({
            businessId: primaryBusinessId,
            amount: remaining,
            appliedTo: 'BALANCE',
        });
        remaining = 0;
    }

    // Build businessAllocations summary (for payment document)
    const businessTotals = new Map<string, { amountMMK: number; openingBalanceApplied: number }>();
    for (const alloc of allocations) {
        const entry = businessTotals.get(alloc.businessId) ?? { amountMMK: 0, openingBalanceApplied: 0 };
        entry.amountMMK = roundMoney(entry.amountMMK + alloc.amount);
        if (alloc.appliedTo === 'OPENING') {
            entry.openingBalanceApplied = roundMoney(entry.openingBalanceApplied + alloc.amount);
        }
        businessTotals.set(alloc.businessId, entry);
    }

    const businessAllocations = Array.from(businessTotals.entries()).map(([businessId, v]) => ({
        businessId,
        amountMMK: v.amountMMK,
        openingBalanceApplied: v.openingBalanceApplied,
    }));

    const saleAllocations = Array.from(saleAmountPaidDeltas.entries()).map(([saleRecordId, amountMMK]) => ({
        saleRecordId,
        amountMMK,
    }));

    const businessBalanceDeltas = new Map<string, number>();
    for (const [key, delta] of pairUpdates) {
        const pair = pairs.find(p => pairKey(clientId, p.businessId) === key);
        if (!pair) continue;
        businessBalanceDeltas.set(
            pair.businessId,
            roundMoney((businessBalanceDeltas.get(pair.businessId) ?? 0) + delta.balanceDelta)
        );
    }

    return {
        allocations,
        businessAllocations,
        saleAllocations,
        pairUpdates,
        clientBalanceDelta: roundMoney(-amount),
        businessBalanceDeltas,
        saleAmountPaidDeltas,
        primaryBusinessId,
    };
}

// ---------------------------------------------------------------------------
// Build sale paid map from approved payments (for accurate Phase 2 remaining)
// ---------------------------------------------------------------------------

export const buildSalePaidMapFromPayments = (
    payments: Payment[],
    excludePaymentId?: string
): Map<string, number> => {
    const map = new Map<string, number>();
    payments
        .filter(p => p.status === PaymentStatus.APPROVED && !p.refundId && p.id !== excludePaymentId)
        .forEach(p => {
            if (p.saleAllocations?.length) {
                p.saleAllocations.forEach(a => {
                    if (!a.saleRecordId || !a.amountMMK) return;
                    map.set(a.saleRecordId, roundMoney((map.get(a.saleRecordId) ?? 0) + a.amountMMK));
                });
                return;
            }
            if (p.saleRecordId) {
                map.set(p.saleRecordId, roundMoney((map.get(p.saleRecordId) ?? 0) + (p.amountMMK ?? 0)));
            }
        });
    return map;
};

// ---------------------------------------------------------------------------
// Firestore transaction executor
// ---------------------------------------------------------------------------

const nowIso = (): string => new Date().toISOString();

/**
 * Executes the unallocated (client-wide) payment waterfall inside a database transaction.
 *
 * STEP 1 — Reads all pair balances, sales, and approved payments for the client.
 * STEP 2–4 — Runs `planUnallocatedPaymentWaterfall`.
 * STEP 5 — Atomically writes pair, sale, client, business, and payment documents.
 *
 * @param clientId       Client receiving the payment
 * @param paymentAmount  Total payment amount (MMK)
 * @param dbTransaction  Transaction context (`WaterfallTransactionContext`; `any` for template compatibility)
 */
export async function executeUnallocatedPaymentWaterfall(
    clientId: string,
    paymentAmount: number,
    dbTransaction: WaterfallTransactionContext | Record<string, unknown>
): Promise<void> {
    const ctx = dbTransaction as WaterfallTransactionContext;
    const { transaction, db, paymentRef, excludePaymentId } = ctx;
    const updatedAt = ctx.updatedAt ?? nowIso();

    if (!transaction || !db) {
        throw new Error('executeUnallocatedPaymentWaterfall requires { transaction, db } on dbTransaction.');
    }

    const roundedAmount = roundMoney(paymentAmount);
    if (roundedAmount <= 0) return;

    // --- STEP 1: All reads must complete before any writes (Firestore rule) ---
    const pairsQuery = db.collection('client_business_balances').where('clientId', '==', clientId);
    const salesQuery = db.collection('sales').where('clientId', '==', clientId);
    const paymentsQuery = db.collection('payments')
        .where('clientId', '==', clientId)
        .where('status', '==', PaymentStatus.APPROVED);

    const [pairsSnap, salesSnap, paymentsSnap, clientDoc] = await Promise.all([
        transaction.get(pairsQuery),
        transaction.get(salesQuery),
        transaction.get(paymentsQuery),
        transaction.get(db.collection('clients').doc(clientId)),
    ]);

    const pairs: ClientBusinessBalance[] = pairsSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ClientBusinessBalance, 'id'>),
    }));

    if (pairs.length === 0) {
        throw new Error(`No client-business pair records found for client ${clientId}.`);
    }

    const sales: SaleRecord[] = salesSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<SaleRecord, 'id'>),
    }));

    const payments: Payment[] = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Payment, 'id'>),
    }));

    const salePaidBySaleId = buildSalePaidMapFromPayments(payments, excludePaymentId);

    // --- STEP 2–4: Pure waterfall plan ---
    const plan = planUnallocatedPaymentWaterfall({
        clientId,
        paymentAmount: roundedAmount,
        pairs,
        sales,
        salePaidBySaleId,
    });

    // Pre-read pair, sale, and business docs that will be written
    const pairRefs = new Map<string, firebase.firestore.DocumentReference>();
    const pairDocs = new Map<string, firebase.firestore.DocumentSnapshot>();

    for (const [key] of plan.pairUpdates) {
        const ref = db.collection('client_business_balances').doc(key);
        pairRefs.set(key, ref);
        pairDocs.set(key, await transaction.get(ref));
    }

    const saleRefs = new Map<string, firebase.firestore.DocumentReference>();
    const saleDocs = new Map<string, firebase.firestore.DocumentSnapshot>();

    for (const [saleId] of plan.saleAmountPaidDeltas) {
        const ref = db.collection('sales').doc(saleId);
        saleRefs.set(saleId, ref);
        saleDocs.set(saleId, await transaction.get(ref));
    }

    const businessRefs = new Map<string, firebase.firestore.DocumentReference>();
    const businessDocs = new Map<string, firebase.firestore.DocumentSnapshot>();

    for (const businessId of plan.businessBalanceDeltas.keys()) {
        const ref = db.collection('businesses').doc(businessId);
        businessRefs.set(businessId, ref);
        businessDocs.set(businessId, await transaction.get(ref));
    }

    // --- STEP 5: Atomic writes ---

    // 5a. Client-business pair documents
    for (const [key, delta] of plan.pairUpdates) {
        const ref = pairRefs.get(key)!;
        const doc = pairDocs.get(key)!;
        const pair = pairs.find(p => pairKey(clientId, p.businessId) === key);

        const updatePayload: Record<string, unknown> = {
            updatedAt,
            balance: firebase.firestore.FieldValue.increment(delta.balanceDelta),
        };
        if (delta.openingBalancePaidDelta !== 0) {
            updatePayload.openingBalancePaid = firebase.firestore.FieldValue.increment(delta.openingBalancePaidDelta);
        }

        if (doc.exists) {
            transaction.update(ref, updatePayload);
        } else if (pair) {
            transaction.set(ref, {
                clientId,
                businessId: pair.businessId,
                openingBalance: pair.openingBalance ?? 0,
                openingBalancePaid: delta.openingBalancePaidDelta,
                balance: delta.balanceDelta,
                createdAt: updatedAt,
                updatedAt,
            });
        }
    }

    // 5b. Sale amountPaid caps
    for (const [saleId, paidDelta] of plan.saleAmountPaidDeltas) {
        const ref = saleRefs.get(saleId)!;
        const doc = saleDocs.get(saleId)!;
        if (!doc.exists) continue;

        const sale = doc.data() as SaleRecord;
        const currentPaid = sale.amountPaid ?? 0;
        const newPaid = roundMoney(Math.min(currentPaid + paidDelta, sale.grandTotalMMK ?? 0));

        transaction.update(ref, {
            amountPaid: newPaid,
            updatedAt,
        });
    }

    // 5c. Client aggregate balance
    if (clientDoc.exists) {
        transaction.update(db.collection('clients').doc(clientId), {
            balance: firebase.firestore.FieldValue.increment(plan.clientBalanceDelta),
            updatedAt,
        });
    }

    // 5d. Business aggregate balances
    for (const [businessId, delta] of plan.businessBalanceDeltas) {
        const ref = businessRefs.get(businessId)!;
        const doc = businessDocs.get(businessId)!;
        if (!doc.exists) continue;
        transaction.update(ref, {
            balance: firebase.firestore.FieldValue.increment(delta),
            updatedAt,
        });
    }

    // 5e. Payment document audit trail
    if (paymentRef) {
        transaction.update(paymentRef, {
            clientWide: true,
            businessAllocations: plan.businessAllocations.map(b => ({
                businessId: b.businessId,
                amountMMK: b.amountMMK,
                ...(b.openingBalanceApplied > 0 ? { openingBalanceApplied: b.openingBalanceApplied } : {}),
            })),
            saleAllocations: plan.saleAllocations.map(s => ({
                saleRecordId: s.saleRecordId,
                amountMMK: s.amountMMK,
            })),
            updatedAt,
        });
    }
}

/** Re-export pair outstanding helper for UI / reports. */
export { getPairOutstanding, getOpeningRemaining };
