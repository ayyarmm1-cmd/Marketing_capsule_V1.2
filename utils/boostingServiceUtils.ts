/** S_001 Facebook Boosting, S_002 TikTok Boosting — budget (USD) × service rate (MMK). */
export const BOOSTING_SERVICE_IDS = ['S_001', 'S_002'] as const;

export const FACEBOOK_BOOSTING_SERVICE_ID = 'S_001';
export const TIKTOK_BOOSTING_SERVICE_ID = 'S_002';

export function isBoostingServiceName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return (
    normalized.includes('facebook boosting') ||
    normalized.includes('tiktok boosting') ||
    normalized.includes('tik tok boosting')
  );
}

export function isBoostingServiceId(serviceId?: string | null): boolean {
  return !!serviceId && (BOOSTING_SERVICE_IDS as readonly string[]).includes(serviceId);
}

export function isBoostingService(service?: { id?: string; name?: string } | null): boolean {
  if (!service) return false;
  return isBoostingServiceId(service.id) || isBoostingServiceName(service.name);
}

/** Budget-based sale/invoice line (Facebook Ads type or S_001/S_002). */
export function isBudgetBasedService(service?: { id?: string; name?: string; serviceRateMMK?: number } | null): boolean {
  if (!service) return false;
  if (isBoostingService(service)) return true;
  return typeof service.serviceRateMMK === 'number';
}

export function stripBudgetSuffixFromDescription(description?: string): string {
  if (!description) return '';
  return description
    .replace(/\s*\(\s*budget:\s*\$?\s*undefined\s*\)\s*/gi, '')
    .replace(/\s*\(\s*budget:\s*\$?\s*[\d,.]+\s*\)\s*/gi, '')
    .replace(/\s*\(\s*budget:\s*\$?\s*\)\s*/gi, '')
    .trim();
}

export function extractBudgetUsdFromDescription(description?: string): number | null {
  if (!description) return null;
  const match = description.match(/budget:\s*\$?\s*([\d,.]+)/i);
  if (!match?.[1]) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export interface BoostingLineDisplay {
  description: string;
  quantityUsd: number;
  unitPriceMMK: number;
  totalMMK: number;
  isBudget: boolean;
}

/** Normalize invoice/sale line items for boosting services (handles legacy bad data). */
export function normalizeBoostingLineItem(
  item: { description?: string; quantity?: number; unitPrice?: number; total?: number; serviceId?: string },
  options?: { serviceRateMMK?: number; grandTotalMMK?: number }
): BoostingLineDisplay {
  const rawDescription = item.description || '';
  const isBoosting =
    isBoostingServiceName(rawDescription) ||
    isBoostingServiceId(item.serviceId);

  if (!isBoosting) {
    return {
      description: rawDescription,
      quantityUsd: Number(item.quantity) || 0,
      unitPriceMMK: Number(item.unitPrice) || 0,
      totalMMK: Number(item.total) || 0,
      isBudget: false,
    };
  }

  const description = stripBudgetSuffixFromDescription(rawDescription);
  const totalMMK = Number(item.total) || Number(options?.grandTotalMMK) || 0;
  let unitPriceMMK = Number(item.unitPrice) || Number(options?.serviceRateMMK) || 0;
  let quantityUsd = Number(item.quantity) || 0;

  const budgetFromDesc = extractBudgetUsdFromDescription(rawDescription);
  if (budgetFromDesc) {
    quantityUsd = budgetFromDesc;
  }

  // Legacy invoice modal: qty=1, unitPrice=subtotal (total), budget only in description
  if (quantityUsd === 1 && budgetFromDesc && budgetFromDesc > 0) {
    quantityUsd = budgetFromDesc;
    if (totalMMK > 0 && unitPriceMMK >= totalMMK) {
      unitPriceMMK = totalMMK / budgetFromDesc;
    }
  }

  // Derive budget from total ÷ rate when quantity is missing or wrongly set to 1
  if ((!quantityUsd || quantityUsd <= 1) && unitPriceMMK > 0 && totalMMK > 0) {
    const derived = totalMMK / unitPriceMMK;
    if (derived > 0) {
      quantityUsd = Number.isInteger(derived) ? derived : Number(derived.toFixed(2));
    }
  }

  // Derive rate from total ÷ budget when rate is 0
  if (unitPriceMMK <= 0 && quantityUsd > 0 && totalMMK > 0) {
    unitPriceMMK = totalMMK / quantityUsd;
  }

  // Derive total when missing
  const resolvedTotal = totalMMK > 0 ? totalMMK : quantityUsd * unitPriceMMK;

  return {
    description,
    quantityUsd,
    unitPriceMMK,
    totalMMK: resolvedTotal,
    isBudget: true,
  };
}

export function buildBoostingLineFromSale(
  sale: {
    type: string;
    serviceId?: string;
    grandTotalMMK?: number;
    subtotalMMK?: number;
    budgetUSD?: number;
    actualSpendUSD?: number;
    serviceRateMMK?: number;
    quantity?: number;
    unitPriceMMK?: number;
  },
  service?: { id?: string; name?: string; serviceRateMMK?: number; unitPriceMMK?: number } | null,
  serviceName?: string
): BoostingLineDisplay {
  const name = serviceName || service?.name || 'Boosting Service';
  const grandTotal = sale.grandTotalMMK || sale.subtotalMMK || 0;

  if (sale.type === 'Facebook Ads') {
    const budgetUSD = Number(sale.actualSpendUSD ?? sale.budgetUSD ?? 0) || 0;
    const rate = Number(sale.serviceRateMMK ?? service?.serviceRateMMK ?? 0) || 0;
    return {
      description: name,
      quantityUsd: budgetUSD,
      unitPriceMMK: rate,
      totalMMK: grandTotal || budgetUSD * rate,
      isBudget: true,
    };
  }

  const rate = Number(sale.unitPriceMMK ?? service?.serviceRateMMK ?? service?.unitPriceMMK ?? 0) || 0;
  let budgetUSD = Number(sale.quantity ?? 0) || 0;
  if ((!budgetUSD || budgetUSD <= 1) && rate > 0 && grandTotal > 0) {
    const derived = grandTotal / rate;
    budgetUSD = Number.isInteger(derived) ? derived : Number(derived.toFixed(2));
  }

  return {
    description: name,
    quantityUsd: budgetUSD,
    unitPriceMMK: rate,
    totalMMK: grandTotal || budgetUSD * rate,
    isBudget: true,
  };
}

export function createBoostingInvoiceItem(params: {
  id: string;
  serviceId: string;
  serviceName: string;
  budgetUSD: number;
  serviceRateMMK: number;
  totalMMK?: number;
}): {
  id: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
} {
  const budgetUSD = Number(params.budgetUSD) || 0;
  const unitPrice = Number(params.serviceRateMMK) || 0;
  const total = params.totalMMK ?? budgetUSD * unitPrice;
  return {
    id: params.id,
    serviceId: params.serviceId,
    description: params.serviceName,
    quantity: budgetUSD,
    unitPrice,
    total,
  };
}

export interface InvoiceServiceSelection {
  id: string;
  serviceId: string;
  budgetUSD?: number | '';
  quantity?: number | '';
  startDate?: string;
  durationDays?: number | '';
  manualServiceRateMMK?: number | '';
}

type ServiceLookup = {
  id: string;
  name: string;
  serviceRateMMK?: number;
  unitPriceMMK?: number;
  isActive?: boolean;
};

type InvoiceLineShape = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  serviceId?: string;
};

/** Derive MMK-per-USD rate from a saved invoice line (handles missing unitPrice). */
export function resolveBoostingRateFromInvoiceItem(item: InvoiceLineShape): number {
  const qty = Number(item.quantity) || 0;
  const total = Number(item.total) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  if (unitPrice > 0) return unitPrice;
  if (qty > 0 && total > 0) return total / qty;
  return 0;
}

/** True when a saved line looks like S_001 / S_002 budget × rate (not a plain qty sale). */
export function isBoostingInvoiceLineItem(item: InvoiceLineShape, services: ServiceLookup[] = []): boolean {
  if (isBoostingServiceId(item.serviceId) || isBoostingServiceName(item.description)) {
    return true;
  }
  return !!inferBoostingServiceIdFromItem(item, services);
}

/** Guess S_001 / S_002 from description, saved serviceId, or budget×rate shape. */
export function inferBoostingServiceIdFromItem(
  item: InvoiceLineShape,
  services: ServiceLookup[] = []
): string | undefined {
  if (item.serviceId && isBoostingServiceId(item.serviceId)) {
    return item.serviceId;
  }

  const desc = (item.description || '').toLowerCase();
  if (desc.includes('tiktok') || desc.includes('tik tok')) {
    return TIKTOK_BOOSTING_SERVICE_ID;
  }
  if (isBoostingServiceName(item.description)) {
    return FACEBOOK_BOOSTING_SERVICE_ID;
  }

  const qty = Number(item.quantity) || 0;
  const total = Number(item.total) || 0;
  const rate = resolveBoostingRateFromInvoiceItem(item);
  if (qty <= 0 || total <= 0) {
    return item.serviceId || undefined;
  }

  const impliedBudget = rate > 0 ? total / rate : qty;
  const matchesBudgetMath =
    qty > 1 ||
    (rate >= 500 && Math.abs(impliedBudget - qty) < 0.1);

  if (!matchesBudgetMath) {
    return item.serviceId || undefined;
  }

  for (const id of BOOSTING_SERVICE_IDS) {
    const svc = services.find(s => s.id === id);
    if (!svc) continue;
    const svcRate = svc.serviceRateMMK ?? svc.unitPriceMMK ?? 0;
    if (svcRate > 0 && Math.abs(svcRate - rate) < 1) {
      return id;
    }
  }

  if (rate >= 500 && qty > 1) {
    return FACEBOOK_BOOSTING_SERVICE_ID;
  }

  return item.serviceId || undefined;
}

/** Match a saved invoice line to a service (by id, then description, then boosting inference). */
export function matchServiceForInvoiceItem(
  item: InvoiceLineShape,
  services: ServiceLookup[]
): ServiceLookup | undefined {
  if (item.serviceId) {
    const byId = services.find(s => s.id === item.serviceId);
    if (byId) return byId;
  }

  const inferredId = inferBoostingServiceIdFromItem(item, services);
  if (inferredId) {
    const inferred = services.find(s => s.id === inferredId);
    if (inferred) return inferred;
  }

  const desc = stripBudgetSuffixFromDescription(item.description || '').toLowerCase().trim();
  if (!desc) return undefined;

  const exact = services.find(s => s.name.toLowerCase().trim() === desc);
  if (exact) return exact;

  const partial = services.find(s => {
    const name = s.name.toLowerCase().trim();
    return desc.includes(name) || name.includes(desc) || desc.startsWith(name);
  });
  if (partial) return partial;

  // Campaign-style: "Facebook Boosting - Campaign Name (Objective)"
  return services.find(s => desc.startsWith(s.name.toLowerCase().trim()));
}

/** Convert a saved invoice item back into modal service-selection state. */
export function invoiceItemToServiceSelection(
  item: InvoiceLineShape & { id: string },
  services: ServiceLookup[]
): InvoiceServiceSelection {
  const inferredId = inferBoostingServiceIdFromItem(item, services);
  const matched = matchServiceForInvoiceItem(item, services);
  const serviceId = item.serviceId || matched?.id || inferredId || '';

  const buildBudgetSelection = (rateHint?: number): InvoiceServiceSelection => {
    const line = normalizeBoostingLineItem(
      { ...item, serviceId: serviceId || item.serviceId },
      {
        serviceRateMMK: rateHint ?? matched?.serviceRateMMK ?? matched?.unitPriceMMK ?? resolveBoostingRateFromInvoiceItem(item),
        grandTotalMMK: item.total,
      }
    );
    const systemRate = matched?.serviceRateMMK || matched?.unitPriceMMK || resolveBoostingRateFromInvoiceItem(item) || 0;
    const manualRate =
      line.unitPriceMMK > 0 &&
      systemRate > 0 &&
      Math.abs(line.unitPriceMMK - systemRate) > 0.01
        ? line.unitPriceMMK
        : line.unitPriceMMK > 0 && !systemRate
          ? line.unitPriceMMK
          : line.unitPriceMMK > 0
            ? line.unitPriceMMK
            : '';

    return {
      id: item.id,
      serviceId,
      budgetUSD: line.quantityUsd > 0 ? line.quantityUsd : (Number(item.quantity) > 0 ? Number(item.quantity) : ''),
      manualServiceRateMMK: manualRate,
    };
  };

  const isBoostingLine =
    isBoostingServiceId(serviceId) ||
    isBoostingInvoiceLineItem(item, services) ||
    (matched != null && isBudgetBasedService(matched));

  if (isBoostingLine) {
    return buildBudgetSelection();
  }

  return {
    id: item.id,
    serviceId,
    quantity: Number(item.quantity) || 1,
  };
}

/** Active services plus any inactive services referenced on saved invoice lines. */
export function resolveServicesForInvoiceEdit<T extends ServiceLookup>(
  activeServices: T[],
  allServices: T[],
  invoiceItems: Array<{ serviceId?: string }> = []
): T[] {
  const itemServiceIds = new Set(
    invoiceItems.map(i => i.serviceId).filter(Boolean) as string[]
  );
  const byId = new Map<string, T>();
  activeServices.forEach(s => byId.set(s.id, s));
  allServices.forEach(s => {
    if (s.isActive !== false || itemServiceIds.has(s.id)) {
      byId.set(s.id, s);
    }
  });
  itemServiceIds.forEach(id => {
    if (!byId.has(id)) {
      const found = allServices.find(s => s.id === id);
      if (found) byId.set(id, found);
    }
  });
  return Array.from(byId.values());
}

/** Attach serviceId to invoice items when missing (for edit modal hydration). */
export function hydrateInvoiceItemsWithServiceIds<T extends InvoiceLineShape & { id: string }>(
  items: T[],
  services: ServiceLookup[]
): Array<T & { serviceId?: string }> {
  return items.map(item => {
    const matched = matchServiceForInvoiceItem(item, services);
    const inferredId = inferBoostingServiceIdFromItem(item, services);
    const serviceId = item.serviceId || matched?.id || inferredId;
    return serviceId ? { ...item, serviceId } : item;
  });
}
