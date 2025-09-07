"use client";
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Bug, Lightbulb, Plus, MessageCircle, Check, X, Clock, MoreHorizontal } from 'lucide-react';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'idea';
  title: string;
  body: string | null;
  status: string;
  created_at: string;
  author_id: string | null;
  org_id: string | null;
}

export default function AdminFeedbackPage() {
  const supabase = getSupabaseClient();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setFeedback(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      const { error: err } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (err) throw err;

      // Update local state
      setFeedback(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      ));
    } catch (e: any) {
      setError(e.message);
    }
  }

  const filteredFeedback = feedback.filter(item => {
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return Bug;
      case 'feature': return Plus;
      case 'idea': return Lightbulb;
      default: return MessageCircle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'feature': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'idea': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return Clock;
      case 'in_progress': return MoreHorizontal;
      case 'resolved': return Check;
      case 'closed': return X;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20';
      case 'in_progress': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20';
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20';
      case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Feedback Management</h1>
        <div className="animate-pulse rounded-2xl border border-neutral-200 p-8 dark:border-neutral-800">
          Loading feedback...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feedback Management</h1>
        <div className="text-sm text-neutral-500">
          {filteredFeedback.length} of {feedback.length} items
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-800"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-800"
          >
            <option value="all">All</option>
            <option value="bug">Bugs</option>
            <option value="feature">Features</option>
            <option value="idea">Ideas</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No feedback items match your filters.
          </div>
        ) : (
          filteredFeedback.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            const StatusIcon = getStatusIcon(item.status);

            return (
              <div key={item.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${getTypeColor(item.type)}`}>
                        <TypeIcon className="w-3 h-3" />
                        {item.type}
                      </div>
                      <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        {item.status.replace('_', ' ')}
                      </div>
                      <span className="text-xs text-neutral-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-medium mb-1 text-base">{item.title}</h3>
                    {item.body && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
                        {item.body}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(item.id, status)}
                        className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          item.status === status
                            ? 'bg-blue-600 text-white'
                            : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                        }`}
                        title={`Mark as ${status.replace('_', ' ')}`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: feedback.length, color: 'text-blue-600' },
          { label: 'Open', value: feedback.filter(f => f.status === 'open').length, color: 'text-orange-600' },
          { label: 'Resolved', value: feedback.filter(f => f.status === 'resolved').length, color: 'text-green-600' },
          { label: 'Bugs', value: feedback.filter(f => f.type === 'bug').length, color: 'text-red-600' }
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 font-medium">{stat.label}</div>
            <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}