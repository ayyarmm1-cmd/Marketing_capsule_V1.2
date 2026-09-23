import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Client } from '../../types';
import { apiGetClients } from '../../services/api';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

interface OutstandingClient {
  clientId: string;
  clientName: string;
  phone?: string;
  email?: string;
  balance: number;
}

const ClientsToPayPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedClients = await apiGetClients();
      setClients(fetchedClients);
    } catch (error) {
      console.error("Failed to fetch client data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const outstandingClients = useMemo((): OutstandingClient[] => {
    return clients
      .filter(client => (client.balance ?? 0) > 0)
      .map(client => ({
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        email: client.email,
        balance: client.balance ?? 0,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [clients]);

  const filteredItems = useMemo(() => {
    return outstandingClients.filter(item => {
        const term = searchTerm.toLowerCase();
        return !term ||
            item.clientName.toLowerCase().includes(term) ||
            item.clientId.toLowerCase().includes(term) ||
            (item.phone && item.phone.includes(term)) ||
            (item.email && item.email.toLowerCase().includes(term));
    });
  }, [outstandingClients, searchTerm]);
  
  const totalOutstanding = useMemo(() => {
    return outstandingClients.reduce((sum, client) => sum + client.balance, 0);
  }, [outstandingClients]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Clients with Pending Payments</h1>
      <p className="text-text-secondary mb-6">A list of all clients with an outstanding balance.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Outstanding Amount</p>
          <p className="text-3xl font-bold text-status-danger">{totalOutstanding.toLocaleString()} MMK</p>
        </div>
         <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Clients with Balance</p>
          <p className="text-3xl font-bold text-primary-action">{outstandingClients.length}</p>
        </div>
      </div>
      
      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1">
          <Input
            label="Search Client by Name, ID, Phone, or Email"
            placeholder="Type to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="mb-0"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : filteredItems.length > 0 ? (
        <div className="bg-container-bg shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Outstanding Balance (MMK)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg divide-y divide-gray-200">
              {filteredItems.map(item => (
                <tr key={item.clientId}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary">
                      <Link to={`/clients/${item.clientId}`} className="text-primary-action hover:underline">
                        {item.clientName} ({item.clientId})
                      </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.phone || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{item.email || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-status-danger font-semibold text-right">{item.balance.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Link to={`/clients/${item.clientId}`}>
                        <Button variant="ghost" size="sm">View Details</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">No clients with outstanding payments found matching your criteria.</p>
      )}
    </div>
  );
};

export default ClientsToPayPage;