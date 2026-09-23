import React, { useEffect, useMemo, useState } from 'react';
import { Lead, Permission } from '../../types';
import { apiGetLeads, apiUpdateLead } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const LeadNotesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = hasPermission(Permission.MANAGE_LEAD_NOTES) || hasPermission(Permission.EDIT_ALL_LEADS);

  useEffect(() => {
    const load = async () => {
      try {
        const fetchedLeads = await apiGetLeads();
        setLeads(fetchedLeads);
        const initialDrafts: Record<string, string> = {};
        fetchedLeads.forEach((lead) => {
          initialDrafts[lead.id] = lead.notes || '';
        });
        setNotesDraft(initialDrafts);
      } catch (error) {
        console.error('Failed to load leads for notes', error);
        addNotification('Unable to load leads for note management.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [addNotification]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const term = search.toLowerCase();
    return leads.filter((lead) =>
      lead.name.toLowerCase().includes(term) ||
      lead.businessName.toLowerCase().includes(term) ||
      lead.id.toLowerCase().includes(term)
    );
  }, [leads, search]);

  const handleSave = async (lead: Lead) => {
    if (!canEdit) return;
    setSavingId(lead.id);
    try {
      await apiUpdateLead({ id: lead.id, notes: notesDraft[lead.id] || '' });
      addNotification(`Notes updated for ${lead.name}.`, 'success');
    } catch (error) {
      console.error('Failed to save lead notes', error);
      addNotification('Could not save notes. Please try again.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (!hasPermission(Permission.VIEW_LEADS)) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Permission Required</h2>
        <p className="text-text-secondary dark:text-slate-400 mt-2">
          You do not have access to lead notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-400">Context Hub</p>
        <h2 className="text-2xl font-bold text-text-primary dark:text-slate-100">Lead Notes</h2>
        <p className="text-text-secondary dark:text-slate-400">Capture tribal knowledge, call recaps, and qualifiers for every lead.</p>
      </div>

      <Input
        label="Search by ID, Lead or Business Name"
        placeholder="Filter leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 shadow">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-secondary dark:text-slate-400">No leads found. Adjust your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredLeads.map((lead) => (
              <li key={lead.id} className="p-5 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm uppercase tracking-wider text-text-secondary dark:text-slate-500">{lead.id}</p>
                    <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100">{lead.name}</h3>
                    <p className="text-text-secondary dark:text-slate-400">{lead.businessName}</p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave(lead)}
                      isLoading={savingId === lead.id}
                    >
                      Save Notes
                    </Button>
                  )}
                </div>
                {canEdit ? (
                  <textarea
                    value={notesDraft[lead.id] ?? ''}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                    rows={4}
                    placeholder="Add meeting recaps, budget context, objections, etc."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-3 text-sm text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-action/30"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-sm text-text-secondary dark:text-slate-300 whitespace-pre-wrap">
                    {lead.notes || 'No notes yet.'}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LeadNotesPage;
