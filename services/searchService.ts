import {
  apiGetClientById,
  apiGetBusinessById,
  apiGetSaleById,
  apiSearchByDocumentIdPrefix,
  apiSearchClientsByNamePrefix,
  apiSearchBusinessesByNamePrefix,
  apiSearchUsersByNamePrefix,
  apiGetSalesRecords,
  apiGetInvoices,
  apiGetQuotationsForClient,
  apiGetQuotationsForBusiness,
  apiGetRecentQuotations,
  apiGetLeads,
} from './api';
import { Client, Business, Employee, SaleRecord, Invoice, Quotation, Lead } from '../types';
import { Permission } from '../types';
import {
  CLIENT_ID_PREFIX,
  BUSINESS_ID_PREFIX,
  SALE_ID_PREFIX,
  INVOICE_ID_PREFIX,
  QUOTATION_ID_PREFIX,
  LEAD_ID_PREFIX,
} from '../constants';

export interface SearchResult {
  id: string;
  type: 'client' | 'business' | 'employee' | 'sale' | 'invoice' | 'quotation' | 'lead' | 'route';
  label: string;
  description: string;
  path: string;
  category: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

const RECENT_SALES_LIMIT = 60;
const RECENT_INVOICES_LIMIT = 40;
const RECENT_QUOTATIONS_LIMIT = 40;
const RECENT_LEADS_LIMIT = 40;
const ID_PREFIX_LIMIT = 8;

function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

function matchesSearch(text: string | undefined | null, searchTerm: string): boolean {
  if (!text) return false;
  return normalizeSearchTerm(text).includes(searchTerm);
}

function looksLikeRecordId(term: string): boolean {
  const t = term.trim().toUpperCase();
  return (
    t.startsWith(CLIENT_ID_PREFIX.toUpperCase()) ||
    t.startsWith(BUSINESS_ID_PREFIX.toUpperCase()) ||
    t.startsWith(SALE_ID_PREFIX.toUpperCase()) ||
    t.startsWith(INVOICE_ID_PREFIX.toUpperCase()) ||
    t.startsWith(QUOTATION_ID_PREFIX.toUpperCase()) ||
    t.startsWith(LEAD_ID_PREFIX.toUpperCase()) ||
    /^[A-Z]{2,4}[-_]?\d/.test(t)
  );
}

function searchClients(clients: Client[], searchTerm: string): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  return clients
    .filter((client) =>
      matchesSearch(client.id, normalized) ||
      matchesSearch(client.name, normalized) ||
      matchesSearch(client.email, normalized) ||
      matchesSearch(client.phone, normalized)
    )
    .slice(0, 5)
    .map((client) => ({
      id: `client-${client.id}`,
      type: 'client' as const,
      label: client.name,
      description: `${client.email || ''} ${client.phone || ''}`.trim() || 'Client',
      path: `/clients/${client.id}`,
      category: 'Clients',
      metadata: { clientId: client.id, balance: client.balance },
    }));
}

function searchBusinesses(businesses: Business[], searchTerm: string): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  return businesses
    .filter((business) =>
      matchesSearch(business.id, normalized) ||
      matchesSearch(business.name, normalized) ||
      matchesSearch(business.email, normalized) ||
      matchesSearch(business.phone, normalized)
    )
    .slice(0, 5)
    .map((business) => ({
      id: `business-${business.id}`,
      type: 'business' as const,
      label: business.name,
      description: `${business.email || ''} ${business.phone || ''}`.trim() || 'Business',
      path: `/businesses/${business.id}`,
      category: 'Businesses',
      metadata: { businessId: business.id, balance: business.balance },
    }));
}

function searchEmployees(employees: Employee[], searchTerm: string): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  return employees
    .filter((employee) =>
      matchesSearch(employee.id, normalized) ||
      matchesSearch(employee.name, normalized) ||
      matchesSearch(employee.email, normalized) ||
      matchesSearch(employee.role, normalized)
    )
    .slice(0, 5)
    .map((employee) => ({
      id: `employee-${employee.id}`,
      type: 'employee' as const,
      label: employee.name,
      description: `${employee.role || ''} ${employee.department ? `• ${employee.department}` : ''}`.trim(),
      path: `/hr/staff/${employee.id}`,
      category: 'Employees',
      metadata: { employeeId: employee.id, role: employee.role },
    }));
}

function searchSales(
  sales: SaleRecord[],
  searchTerm: string,
  clients: Client[],
  businesses: Business[]
): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));

  return sales
    .filter((sale) => {
      const client = sale.clientId ? clientMap.get(sale.clientId) : null;
      const business = sale.businessId ? businessMap.get(sale.businessId) : null;
      return (
        matchesSearch(sale.id, normalized) ||
        matchesSearch(client?.name, normalized) ||
        matchesSearch(business?.name, normalized) ||
        matchesSearch(sale.status, normalized)
      );
    })
    .slice(0, 5)
    .map((sale) => {
      const client = sale.clientId ? clientMap.get(sale.clientId) : null;
      const business = sale.businessId ? businessMap.get(sale.businessId) : null;
      const entityName = business?.name || client?.name || 'Unknown';
      return {
        id: `sale-${sale.id}`,
        type: 'sale' as const,
        label: `Sale ${sale.id}`,
        description: `${entityName} • ${sale.type || 'Service'} • ${sale.status}`,
        path: `/sales/${sale.id}`,
        category: 'Sales Records',
        metadata: { saleId: sale.id, clientId: sale.clientId, businessId: sale.businessId },
      };
    });
}

function searchInvoices(
  invoices: Invoice[],
  searchTerm: string,
  clients: Client[],
  businesses: Business[]
): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));

  return invoices
    .filter((invoice) => {
      const client = invoice.clientId ? clientMap.get(invoice.clientId) : null;
      const business = invoice.businessId ? businessMap.get(invoice.businessId) : null;
      return (
        matchesSearch(invoice.id, normalized) ||
        matchesSearch(invoice.invoiceNumber, normalized) ||
        matchesSearch(client?.name, normalized) ||
        matchesSearch(business?.name, normalized)
      );
    })
    .slice(0, 5)
    .map((invoice) => {
      const client = invoice.clientId ? clientMap.get(invoice.clientId) : null;
      const business = invoice.businessId ? businessMap.get(invoice.businessId) : null;
      const entityName = business?.name || client?.name || 'Unknown';
      return {
        id: `invoice-${invoice.id}`,
        type: 'invoice' as const,
        label: `Invoice ${invoice.invoiceNumber || invoice.id}`,
        description: `${entityName} • ${invoice.status} • ${invoice.grandTotal?.toLocaleString() || '0'} MMK`,
        path: `/sales/invoices/${invoice.id}`,
        category: 'Invoices',
        metadata: { invoiceId: invoice.id, clientId: invoice.clientId, businessId: invoice.businessId },
      };
    });
}

function searchQuotations(
  quotations: Quotation[],
  searchTerm: string,
  clients: Client[],
  businesses: Business[]
): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));

  return quotations
    .filter((quotation) => {
      const client = quotation.clientId ? clientMap.get(quotation.clientId) : null;
      const business = quotation.businessId ? businessMap.get(quotation.businessId) : null;
      return (
        matchesSearch(quotation.id, normalized) ||
        matchesSearch(quotation.quotationNumber, normalized) ||
        matchesSearch(client?.name, normalized) ||
        matchesSearch(business?.name, normalized)
      );
    })
    .slice(0, 5)
    .map((quotation) => {
      const client = quotation.clientId ? clientMap.get(quotation.clientId) : null;
      const business = quotation.businessId ? businessMap.get(quotation.businessId) : null;
      const entityName = business?.name || client?.name || 'Unknown';
      return {
        id: `quotation-${quotation.id}`,
        type: 'quotation' as const,
        label: `Quotation ${quotation.quotationNumber || quotation.id}`,
        description: `${entityName} • ${quotation.status} • ${quotation.grandTotal?.toLocaleString() || '0'} MMK`,
        path: `/sales/quotations/${quotation.id}`,
        category: 'Quotations',
        metadata: { quotationId: quotation.id, clientId: quotation.clientId, businessId: quotation.businessId },
      };
    });
}

function searchLeads(leads: Lead[], searchTerm: string): SearchResult[] {
  const normalized = normalizeSearchTerm(searchTerm);
  return leads
    .filter((lead) =>
      matchesSearch(lead.id, normalized) ||
      matchesSearch(lead.name, normalized) ||
      matchesSearch(lead.email, normalized) ||
      matchesSearch(lead.company, normalized)
    )
    .slice(0, 5)
    .map((lead) => ({
      id: `lead-${lead.id}`,
      type: 'lead' as const,
      label: lead.name || lead.company || 'Lead',
      description: `${lead.company || ''} ${lead.email || ''}`.trim() || 'Lead',
      path: `/leads/${lead.id}`,
      category: 'Leads',
      metadata: { leadId: lead.id, status: lead.status },
    }));
}

async function searchById(term: string): Promise<{
  clients: Client[];
  businesses: Business[];
  sales: SaleRecord[];
  invoices: Invoice[];
  quotations: Quotation[];
  leads: Lead[];
}> {
  const upper = term.trim().toUpperCase();
  const clients: Client[] = [];
  const businesses: Business[] = [];
  const sales: SaleRecord[] = [];
  const invoices: Invoice[] = [];
  const quotations: Quotation[] = [];
  const leads: Lead[] = [];

  const tasks: Promise<void>[] = [];

  if (upper.startsWith(CLIENT_ID_PREFIX.toUpperCase()) || upper.startsWith('CL')) {
    tasks.push(
      apiSearchByDocumentIdPrefix<Client>('clients', term.trim(), ID_PREFIX_LIMIT).then((r) => {
        clients.push(...r);
      })
    );
    if (term.trim().length >= 6) {
      tasks.push(
        apiGetClientById(term.trim()).then((c) => {
          if (c) clients.push(c);
        })
      );
    }
  }

  if (upper.startsWith(BUSINESS_ID_PREFIX.toUpperCase()) || upper.startsWith('B-')) {
    tasks.push(
      apiSearchByDocumentIdPrefix<Business>('businesses', term.trim(), ID_PREFIX_LIMIT).then((r) => {
        businesses.push(...r);
      })
    );
    if (term.trim().length >= 4) {
      tasks.push(
        apiGetBusinessById(term.trim()).then((b) => {
          if (b) businesses.push(b);
        })
      );
    }
  }

  if (upper.startsWith(SALE_ID_PREFIX.toUpperCase()) || upper.startsWith('SA')) {
    tasks.push(
      apiSearchByDocumentIdPrefix<SaleRecord>('sales', term.trim(), ID_PREFIX_LIMIT).then((r) => {
        sales.push(...r);
      })
    );
    if (term.trim().length >= 8) {
      tasks.push(
        apiGetSaleById(term.trim()).then((s) => {
          if (s) sales.push(s);
        })
      );
    }
  }

  if (upper.startsWith(INVOICE_ID_PREFIX.toUpperCase()) || upper.startsWith('INV')) {
    tasks.push(
      apiSearchByDocumentIdPrefix<Invoice>('invoices', term.trim(), ID_PREFIX_LIMIT).then((r) => {
        invoices.push(...r);
      })
    );
  }

  if (upper.startsWith(QUOTATION_ID_PREFIX.toUpperCase()) || upper.startsWith('QOT')) {
    tasks.push(
      apiSearchByDocumentIdPrefix<Quotation>('quotations', term.trim(), ID_PREFIX_LIMIT).then((r) => {
        quotations.push(...r);
      })
    );
  }

  if (upper.startsWith(LEAD_ID_PREFIX.toUpperCase()) || upper.startsWith('L_')) {
    tasks.push(
      apiSearchByDocumentIdPrefix<Lead>('leads', term.trim(), ID_PREFIX_LIMIT).then((r) => {
        leads.push(...r);
      })
    );
  }

  await Promise.all(tasks);

  const dedupe = <T extends { id: string }>(items: T[]) => {
    const map = new Map<string, T>();
    items.forEach((i) => map.set(i.id, i));
    return [...map.values()];
  };

  return {
    clients: dedupe(clients),
    businesses: dedupe(businesses),
    sales: dedupe(sales),
    invoices: dedupe(invoices),
    quotations: dedupe(quotations),
    leads: dedupe(leads),
  };
}

export async function performGlobalSearch(
  searchTerm: string,
  hasPermission: (permission: Permission) => boolean
): Promise<SearchResult[]> {
  const term = searchTerm.trim();
  if (!term) return [];

  const results: SearchResult[] = [];
  const normalized = normalizeSearchTerm(term);
  const idSearch = looksLikeRecordId(term);

  let clients: Client[] = [];
  let businesses: Business[] = [];
  let employees: Employee[] = [];
  let sales: SaleRecord[] = [];
  let invoices: Invoice[] = [];
  let quotations: Quotation[] = [];
  let leads: Lead[] = [];

  if (idSearch) {
    const byId = await searchById(term);
    clients = byId.clients;
    businesses = byId.businesses;
    sales = byId.sales;
    invoices = byId.invoices;
    quotations = byId.quotations;
    leads = byId.leads;
  }

  const nameTasks: Promise<void>[] = [];

  if (hasPermission(Permission.VIEW_CLIENTS_BUSINESSES)) {
    nameTasks.push(
      apiSearchClientsByNamePrefix(term, 5).then((r) => {
        clients = [...clients, ...r];
      }),
      apiSearchBusinessesByNamePrefix(term, 5).then((r) => {
        businesses = [...businesses, ...r];
      })
    );
  }

  if (hasPermission(Permission.VIEW_STAFF_LIST)) {
    nameTasks.push(
      apiSearchUsersByNamePrefix(term, 5).then((r) => {
        employees = r as Employee[];
      })
    );
  }

  await Promise.all(nameTasks);

  const dedupeById = <T extends { id: string }>(items: T[]) => {
    const map = new Map<string, T>();
    items.forEach((i) => map.set(i.id, i));
    return [...map.values()];
  };
  clients = dedupeById(clients);
  businesses = dedupeById(businesses);

  const recentTasks: Promise<void>[] = [];

  if (hasPermission(Permission.VIEW_SALES_RECORDS) && sales.length === 0) {
    recentTasks.push(
      apiGetSalesRecords(RECENT_SALES_LIMIT).then((r) => {
        sales = r;
      })
    );
  }
  if (hasPermission(Permission.MANAGE_INVOICES) && invoices.length === 0) {
    recentTasks.push(
      apiGetInvoices(RECENT_INVOICES_LIMIT).then((r) => {
        invoices = r;
      })
    );
  }
  if (hasPermission(Permission.MANAGE_QUOTATIONS) && quotations.length === 0) {
    recentTasks.push(
      apiGetRecentQuotations(RECENT_QUOTATIONS_LIMIT).then((r) => {
        quotations = r;
      })
    );
  }
  if (hasPermission(Permission.VIEW_LEADS) && leads.length === 0) {
    recentTasks.push(
      apiGetLeads(RECENT_LEADS_LIMIT).then((r) => {
        leads = r;
      })
    );
  }

  await Promise.all(recentTasks);

  if (hasPermission(Permission.VIEW_CLIENTS_BUSINESSES)) {
    results.push(...searchClients(clients, normalized));
    results.push(...searchBusinesses(businesses, normalized));
  }
  if (hasPermission(Permission.VIEW_STAFF_LIST)) {
    results.push(...searchEmployees(employees, normalized));
  }
  if (hasPermission(Permission.VIEW_SALES_RECORDS)) {
    results.push(...searchSales(sales, normalized, clients, businesses));
  }
  if (hasPermission(Permission.MANAGE_INVOICES)) {
    results.push(...searchInvoices(invoices, normalized, clients, businesses));
  }
  if (hasPermission(Permission.MANAGE_QUOTATIONS)) {
    results.push(...searchQuotations(quotations, normalized, clients, businesses));
  }
  if (hasPermission(Permission.VIEW_LEADS)) {
    results.push(...searchLeads(leads, normalized));
  }

  return results;
}

/** @deprecated Bulk cache removed — no-op for compatibility. */
export function clearSearchCache() {
  // no-op
}
