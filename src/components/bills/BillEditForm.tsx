'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import SharedSelect, { type SelectOption } from '@/components/ui/SharedSelect';
import BillAttachments from './BillAttachments';
import BillComments from './BillComments';

interface Bill {
  id: string;
  title: string;
  amount_total: number;
  currency: string;
  due_date: string | null;
  vendor_name: string | null;
  project_name: string | null;
  description: string | null;
  category: string | null;
  recurring_rule: any | null;
  vendor_id: string | null;
  project_id: string | null;
}

interface BillEditFormProps {
  bill: Bill;
  vendorOptions: SelectOption[];
  projectOptions: SelectOption[];
  onSaved: () => void;
  onCancel: () => void;
}

export default function BillEditForm({
  bill,
  vendorOptions,
  projectOptions,
  onSaved,
  onCancel,
}: BillEditFormProps) {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState(bill.title);
  const [amount, setAmount] = useState(bill.amount_total.toString());
  const [currency, setCurrency] = useState(bill.currency);
  const [dueDate, setDueDate] = useState(bill.due_date || '');
  const [description, setDescription] = useState(bill.description || '');
  const [category, setCategory] = useState(bill.category || '');

  // Vendor and project selection
  const [vendor, setVendor] = useState<SelectOption | null>(
    bill.vendor_id && bill.vendor_name
      ? { id: bill.vendor_id, name: bill.vendor_name }
      : null
  );
  const [project, setProject] = useState<SelectOption | null>(
    bill.project_id && bill.project_name
      ? { id: bill.project_id, name: bill.project_name }
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Amount must be a valid positive number');
      }

      const updates = {
        title: title.trim(),
        amount_total: amountValue,
        currency,
        due_date: dueDate || null,
        description: description.trim() || null,
        category: category.trim() || null,
        vendor_id: vendor?.id || null,
        project_id: project?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', bill.id)
        .eq('org_id', orgId);

      if (updateError) throw updateError;

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bill');
    } finally {
      setLoading(false);
    }
  };

  const createVendor = async (name: string): Promise<SelectOption | null> => {
    try {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('vendors')
        .insert({
          name: name.trim(),
          org_id: orgId,
        })
        .select('id, name')
        .single();

      if (error) throw error;
      return { id: data.id, name: data.name };
    } catch (err) {
      console.error('Failed to create vendor:', err);
      return null;
    }
  };

  const createProject = async (name: string): Promise<SelectOption | null> => {
    try {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          org_id: orgId,
        })
        .select('id, name')
        .single();

      if (error) throw error;
      return { id: data.id, name: data.name };
    } catch (err) {
      console.error('Failed to create project:', err);
      return null;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Edit Bill
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            placeholder="Enter bill title"
          />
        </div>

        {/* Amount and Currency */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Amount *
          </label>
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Due Date {bill.recurring_rule && '(Leave empty for recurring)'}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!!bill.recurring_rule}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
          />
        </div>

        {/* Vendor */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Vendor
          </label>
          <SharedSelect
            value={vendor}
            onChange={setVendor}
            options={vendorOptions}
            placeholder="Select or create vendor"
            allowCreate
            onCreate={createVendor}
          />
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Project
          </label>
          <SharedSelect
            value={project}
            onChange={setProject}
            options={projectOptions}
            placeholder="Select or create project"
            allowCreate
            onCreate={createProject}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            placeholder="e.g., Utilities, Office Supplies"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            placeholder="Add any additional details about this bill"
          />
        </div>
      </div>

      {bill.recurring_rule && (
        <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <span className="font-medium">Note:</span> This is a recurring bill.
            To modify the schedule, use the schedule editor in the bill details
            page.
          </p>
        </div>
      )}

      {/* Attachments section */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <BillAttachments billId={bill.id} />
      </div>

      {/* Comments section */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <BillComments billId={bill.id} />
      </div>
    </form>
  );
}
