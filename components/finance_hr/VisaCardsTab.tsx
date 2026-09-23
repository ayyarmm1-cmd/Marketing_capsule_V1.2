import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { VisaCard, VisaReload, VisaCardSpend } from '../../types';
import { apiGetVisaCards, apiAddVisaCard, apiGetVisaReloadsForCard, apiUpdateVisaCard, apiDeleteVisaCard, apiGetVisaCardSpends } from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';

const AddEditVisaCardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: Partial<Omit<VisaCard, 'id'>> & { id?: string }) => Promise<void>;
  existingCard?: VisaCard | null;
}> = ({ isOpen, onClose, onSave, existingCard }) => {
  const [cardName, setCardName] = useState('');
  const [last4Digits, setLast4Digits] = useState('');
  const [monthlyLimitUSD, setMonthlyLimitUSD] = useState<number | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingCard) {
        setCardName(existingCard.cardName);
        setLast4Digits(existingCard.last4Digits);
        // Use monthlyLimitUSD if available, otherwise convert monthlyLimitMMK to USD (assuming ~4152 rate as fallback)
        setMonthlyLimitUSD(existingCard.monthlyLimitUSD || (existingCard.monthlyLimitMMK ? existingCard.monthlyLimitMMK / 4152 : ''));
        setPhoneNumber(existingCard.phoneNumber || '');
        setEmail(existingCard.email || '');
      } else {
        setCardName('');
        setLast4Digits('');
        setMonthlyLimitUSD('');
        setPhoneNumber('');
        setEmail('');
      }
    }
  }, [isOpen, existingCard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || !last4Digits || monthlyLimitUSD === '') {
      alert("Card Name, Last 4 Digits, and Monthly Limit are required.");
      return;
    }
    setIsLoading(true);
    // Store USD limit, and also convert to MMK for backward compatibility (using 2000 as default rate)
    const usdLimit = Number(monthlyLimitUSD) || 0;
    const cardData: Partial<Omit<VisaCard, 'id'>> & { id?: string } = {
      id: existingCard?.id,
      cardName,
      last4Digits,
      monthlyLimitUSD: usdLimit,
      monthlyLimitMMK: usdLimit * 4152, // Store as MMK for backward compatibility
    };
    // Only include optional fields if they have values
    if (phoneNumber && phoneNumber.trim()) {
      cardData.phoneNumber = phoneNumber.trim();
    }
    if (email && email.trim()) {
      cardData.email = email.trim();
    }
    await onSave(cardData);
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingCard ? "Edit Visa Card" : "Register New Visa Card"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Card Name/Nickname*" value={cardName} onChange={e => setCardName(e.target.value)} required />
        <Input label="Last 4 Digits*" value={last4Digits} onChange={e => setLast4Digits(e.target.value)} maxLength={4} pattern="\d{4}" required />
        <Input label="Monthly Limit (USD)*" type="number" value={monthlyLimitUSD} onChange={e => setMonthlyLimitUSD(e.target.value === '' ? '' : parseFloat(e.target.value))} step="0.01" required />
        <Input label="Phone Number (Optional)" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone number registered to this card" />
        <Input label="Email (Optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email registered to this card" />
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{existingCard ? "Save Changes" : "Add Card"}</Button>
        </div>
      </form>
    </Modal>
  );
};

const VisaCardsTab: React.FC = () => {
    const [cards, setCards] = useState<VisaCard[]>([]);
    const [reloadsByCard, setReloadsByCard] = useState<Record<string, VisaReload[]>>({});
    const [spendsByCard, setSpendsByCard] = useState<Record<string, VisaCardSpend[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<VisaCard | null>(null);
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedCards = await apiGetVisaCards();
            setCards(fetchedCards);
            const reloadsData: Record<string, VisaReload[]> = {};
            const spendsData: Record<string, VisaCardSpend[]> = {};
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            for (const card of fetchedCards) {
                reloadsData[card.id] = await apiGetVisaReloadsForCard(card.id, currentYear, currentMonth);
                spendsData[card.id] = await apiGetVisaCardSpends(card.id);
            }
            setReloadsByCard(reloadsData);
            setSpendsByCard(spendsData);
        } catch (error) {
            console.error("Failed to fetch Visa card data:", error);
            addNotification("Failed to fetch Visa card data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (card: VisaCard | null = null) => {
        setEditingCard(card);
        setIsModalOpen(true);
    };

    const handleSaveCard = async (cardData: Partial<Omit<VisaCard, 'id'>> & { id?: string }) => {
        try {
            if (cardData.id) {
                await apiUpdateVisaCard(cardData as VisaCard);
                addNotification("Card updated successfully.", "success");
            } else {
                const { id, ...dataForCreation } = cardData; // Destructure to remove undefined id
                await apiAddVisaCard(dataForCreation as Omit<VisaCard, 'id'>);
                addNotification("Card added successfully.", "success");
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            addNotification(`Failed to save card: ${(error as Error).message}`, "error");
        }
    };

    const handleDeleteCard = async (card: VisaCard) => {
        const confirmed = await showConfirmation({
          title: 'Delete Visa Card',
          message: `Are you sure you want to delete the card "${card.cardName}"? This cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteVisaCard(card.id);
                addNotification("Card deleted successfully.", "success");
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete card: ${(error as Error).message}`, "error");
            }
        }
    };

    const calculateTotalReloadsThisMonth = (cardId: string): number => {
        return reloadsByCard[cardId]?.reduce((sum, reload) => sum + reload.amountMMK, 0) || 0;
    };

    const calculateRemainingBalance = (cardId: string): number => {
        const totalReloads = reloadsByCard[cardId]?.reduce((sum, reload) => sum + reload.amountMMK, 0) || 0;
        const totalSpends = spendsByCard[cardId]?.reduce((sum, spend) => sum + spend.amountMMK, 0) || 0;
        return totalReloads - totalSpends;
    };

    const calculateAvailableLimitUSD = (card: VisaCard): number => {
        const monthlyLimitUSD = card.monthlyLimitUSD || (card.monthlyLimitMMK ? card.monthlyLimitMMK / 4152 : 0);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        // Calculate total spend in USD for current month
        const cardSpends = spendsByCard[card.id] || [];
        const currentMonthSpends = cardSpends.filter(spend => {
            const spendDate = new Date(spend.spendDate);
            return spendDate.getMonth() + 1 === currentMonth && spendDate.getFullYear() === currentYear;
        });
        const totalSpendUSD = currentMonthSpends.reduce((sum, spend) => sum + spend.amountUSD, 0);
        
        return monthlyLimitUSD - totalSpendUSD;
    };

    const getLatestExchangeRate = (cardId: string): number | null => {
        const cardSpends = spendsByCard[cardId];
        if (!cardSpends || cardSpends.length === 0) return null;
        // Get the most recent spend (they're already sorted by date descending)
        return cardSpends[0].exchangeRate;
    };

    return (
        <div className="space-y-4 pt-4">
             <div className="text-right">
                <Button onClick={() => handleOpenModal()} variant="secondary">+ Register Card</Button>
            </div>
            {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
                cards.length > 0 ? (
                <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Card Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Last 4 Digits</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Monthly Limit (USD)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Available Limit (USD)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Total Reloads This Month (MMK)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Remaining Balance (MMK)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Latest Exchange Rate</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {cards.map(card => {
                            const totalReloads = calculateTotalReloadsThisMonth(card.id);
                            const remainingBalance = calculateRemainingBalance(card.id);
                            const latestExchangeRate = getLatestExchangeRate(card.id);
                            const availableLimitUSD = calculateAvailableLimitUSD(card);
                            return (
                            <tr key={card.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">
                                    <Link to={`/finance/visa-cards/${card.id}`} className="text-primary-action hover:underline dark:text-blue-400">
                                        {card.cardName}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">**** {card.last4Digits}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{(card.monthlyLimitUSD || (card.monthlyLimitMMK ? card.monthlyLimitMMK / 4152 : 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${availableLimitUSD < 0 ? 'text-status-danger dark:text-red-400' : availableLimitUSD < (card.monthlyLimitUSD || (card.monthlyLimitMMK ? card.monthlyLimitMMK / 4152 : 0)) * 0.1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-text-secondary dark:text-slate-400'}`}>
                                    {availableLimitUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{totalReloads.toLocaleString()}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${remainingBalance < 0 ? 'text-status-danger dark:text-red-400' : 'text-status-success dark:text-green-400'}`}>
                                    {remainingBalance.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">
                                    {latestExchangeRate ? latestExchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-1">
                                    <Link to={`/finance/visa-cards/${card.id}`}>
                                        <Button variant="ghost" size="sm">View Details</Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(card)}>Edit</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDeleteCard(card)}>Delete</Button>
                                </td>
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
                ) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">No Visa cards registered yet.</p>
            )}
            <AddEditVisaCardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveCard} existingCard={editingCard} />
        </div>
    );
};

export default VisaCardsTab;