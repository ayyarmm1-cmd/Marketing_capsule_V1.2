import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BalanceAdjustment, BalanceAdjustmentType, Business, Client, Service, User } from '../../../types';
import {
  apiGetBalanceAdjustmentById,
  apiGetBusinessById,
  apiGetClientById,
  apiGetServices,
  apiGetUsers,
} from '../../../services/api';
import Spinner from '../../ui/Spinner';
import Button from '../../ui/Button';
import { useNotification } from '../../../hooks/useNotification';
import { formatDateForDisplay } from '../../../utils/dateUtils';

const BalanceAdjustmentDetailPage: React.FC = () => {
  const { adjustmentId } = useParams<{ adjustmentId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [adjustment, setAdjustment] = useState<BalanceAdjustment | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!adjustmentId) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const fetchedAdjustment = await apiGetBalanceAdjustmentById(adjustmentId);
        if (!fetchedAdjustment) {
          addNotification('Balance adjustment not found.', 'error');
          setIsLoading(false);
          return;
        }
        setAdjustment(fetchedAdjustment);
        const [fClient, fBusiness, fServices, fUsers] = await Promise.all([
          apiGetClientById(fetchedAdjustment.clientId),
          apiGetBusinessById(fetchedAdjustment.businessId),
          apiGetServices(),
          apiGetUsers(),
        ]);
        setClient(fClient);
        setBusiness(fBusiness);
        setServices(fServices);
        setUsers(fUsers);
      } catch (error) {
        addNotification('Failed to load balance adjustment.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [adjustmentId, addNotification]);

  const formatDate = (dateString?: string) => formatDateForDisplay(dateString);

  const serviceName = useMemo(() => {
    if (!adjustment?.serviceId) return '-';
    return services.find(s => s.id === adjustment.serviceId)?.name || adjustment.serviceId;
  }, [adjustment?.serviceId, services]);

  const employeeName = useMemo(() => {
    if (!adjustment?.employeeId) return '-';
    return users.find(u => u.id === adjustment.employeeId)?.name || adjustment.employeeId;
  }, [adjustment?.employeeId, users]);

  const recordedByName = useMemo(() => {
    if (!adjustment?.recordedByUserId) return 'Unknown';
    return users.find(u => u.id === adjustment.recordedByUserId)?.name || adjustment.recordedByUserId;
  }, [adjustment?.recordedByUserId, users]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!adjustment) {
    return <div className="text-center p-8">Balance adjustment not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">
          Balance Adjustment: {adjustment.id}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Link to="/finance/balance-adjustments" className="text-sm text-primary-action hover:underline">
            &larr; Back to List
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Adjustment Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-secondary">Date</p>
            <p className="font-medium">{formatDate(adjustment.adjustmentDate)}</p>
          </div>
          <div>
            <p className="text-text-secondary">Type</p>
            <span
              className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                adjustment.type === BalanceAdjustmentType.INCREASE
                  ? 'bg-status-success text-white'
                  : 'bg-status-danger text-white'
              }`}
            >
              {adjustment.type}
            </span>
          </div>
          <div>
            <p className="text-text-secondary">Amount</p>
            <p className="font-medium">{adjustment.amountMMK.toLocaleString()} MMK</p>
          </div>
          <div>
            <p className="text-text-secondary">Business</p>
            {business ? (
              <Link to={`/businesses/${business.id}`} className="font-medium text-primary-action hover:underline">
                {business.name || business.id}
              </Link>
            ) : (
              <p className="font-medium">{adjustment.businessId}</p>
            )}
          </div>
          <div>
            <p className="text-text-secondary">Client</p>
            {client ? (
              <Link to={`/clients/${client.id}`} className="font-medium text-primary-action hover:underline">
                {client.name || client.id}
              </Link>
            ) : (
              <p className="font-medium">{adjustment.clientId}</p>
            )}
          </div>
          <div>
            <p className="text-text-secondary">Service</p>
            <p className="font-medium">{serviceName}</p>
          </div>
          <div>
            <p className="text-text-secondary">Employee</p>
            <p className="font-medium">{employeeName}</p>
          </div>
          {typeof adjustment.totalUSD === 'number' && (
            <div>
              <p className="text-text-secondary">Budget (USD)</p>
              <p className="font-medium">{adjustment.totalUSD.toLocaleString()}</p>
            </div>
          )}
          {typeof adjustment.rate === 'number' && (
            <div>
              <p className="text-text-secondary">Rate (MMK/USD)</p>
              <p className="font-medium">{adjustment.rate.toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-text-secondary">Reason</p>
            <p className="font-medium">{adjustment.reason || '-'}</p>
          </div>
          <div>
            <p className="text-text-secondary">Description</p>
            <p className="font-medium">{adjustment.description || '-'}</p>
          </div>
          <div>
            <p className="text-text-secondary">Recorded By</p>
            <p className="font-medium">{recordedByName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceAdjustmentDetailPage;





