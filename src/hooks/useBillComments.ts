/**
 * Hook for managing bill comments and notes
 * Provides functionality for comments, notes, and approval history
 */

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';

export interface BillComment {
  id: string;
  bill_id: string;
  user_id: string;
  content: string;
  comment_type: 'comment' | 'status_change' | 'approval' | 'rejection' | 'note';
  metadata?: Record<string, any>;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  edited_by?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

export interface CreateCommentData {
  content: string;
  comment_type?: BillComment['comment_type'];
  is_internal?: boolean;
  metadata?: Record<string, any>;
}

export function useBillComments(billId: string) {
  const [comments, setComments] = useState<BillComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  /**
   * Load all comments for a bill
   */
  const loadComments = useCallback(async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);

    try {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('bill_comments_with_users' as any)
        .select('*')
        .eq('org_id', orgId)
        .eq('bill_id', billId)
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist (404), silently return empty array
        if (
          error.message?.includes(
            'relation "bill_comments_with_users" does not exist'
          ) ||
          error.message?.includes('404')
        ) {
          setComments([]);
          return;
        }
        throw error;
      }

      setComments((data as BillComment[]) || []);
    } catch (err) {
      // Only show error for real failures, not missing tables
      if (
        err instanceof Error &&
        !err.message.includes('404') &&
        !err.message.includes('does not exist')
      ) {
        setError(err.message);
      } else {
        setComments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, billId]);

  /**
   * Create a new comment
   */
  const createComment = useCallback(
    async (commentData: CreateCommentData): Promise<BillComment | null> => {
      setError(null);

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        const { data, error } = await supabase
          .from('bill_comments' as any)
          .insert({
            org_id: orgId,
            bill_id: billId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            content: commentData.content.trim(),
            comment_type: commentData.comment_type || 'comment',
            is_internal: commentData.is_internal || false,
            metadata: commentData.metadata || {},
          })
          .select('*')
          .single();

        if (error) throw error;

        // Refresh comments to get the latest data with user info
        await loadComments();

        return data as BillComment;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create comment'
        );
        return null;
      }
    },
    [supabase, billId, loadComments]
  );

  /**
   * Update an existing comment
   */
  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<BillComment | null> => {
      setError(null);

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        const { data, error } = await supabase
          .from('bill_comments' as any)
          .update({
            content: content.trim(),
          })
          .eq('id', commentId)
          .eq('org_id', orgId)
          .select('*')
          .single();

        if (error) throw error;

        // Refresh comments to get the latest data
        await loadComments();

        return data as BillComment;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update comment'
        );
        return null;
      }
    },
    [supabase, loadComments]
  );

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        const { error } = await supabase
          .from('bill_comments' as any)
          .delete()
          .eq('id', commentId)
          .eq('org_id', orgId);

        if (error) throw error;

        // Remove from local state
        setComments((prev) =>
          prev.filter((comment) => comment.id !== commentId)
        );

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete comment'
        );
        return false;
      }
    },
    [supabase]
  );

  /**
   * Get comments filtered by type
   */
  const getCommentsByType = useCallback(
    (type: BillComment['comment_type']) => {
      return comments.filter((comment) => comment.comment_type === type);
    },
    [comments]
  );

  /**
   * Get approval history (approvals, rejections, status changes)
   */
  const getApprovalHistory = useCallback(() => {
    return comments.filter((comment) =>
      ['approval', 'rejection', 'status_change'].includes(comment.comment_type)
    );
  }, [comments]);

  /**
   * Get regular comments and notes (excluding system messages)
   */
  const getRegularComments = useCallback(() => {
    return comments.filter((comment) =>
      ['comment', 'note'].includes(comment.comment_type)
    );
  }, [comments]);

  /**
   * Check if a comment can be edited by current user
   */
  const canEditComment = useCallback(
    (comment: BillComment, userRole?: string) => {
      const now = new Date();
      const created = new Date(comment.created_at);
      const timeDiff = now.getTime() - created.getTime();
      const fifteenMinutes = 15 * 60 * 1000;

      // System comments cannot be edited
      if (comment.comment_type === 'status_change') return false;

      // Own comments within 15 minutes, or admin/approver role
      return (
        timeDiff < fifteenMinutes ||
        ['admin', 'approver'].includes(userRole || '')
      );
    },
    []
  );

  /**
   * Check if a comment can be deleted by current user
   */
  const canDeleteComment = useCallback(
    (comment: BillComment, userRole?: string) => {
      // System comments cannot be deleted
      if (comment.comment_type === 'status_change') return false;

      // Only admins can delete others' comments
      return userRole === 'admin';
    },
    []
  );

  /**
   * Format comment type for display
   */
  const formatCommentType = useCallback((type: BillComment['comment_type']) => {
    const typeMap = {
      comment: 'Comment',
      note: 'Note',
      status_change: 'Status Change',
      approval: 'Approval',
      rejection: 'Rejection',
    };

    return typeMap[type] || 'Comment';
  }, []);

  /**
   * Get comment type styling
   */
  const getCommentTypeStyle = useCallback(
    (type: BillComment['comment_type']) => {
      const styleMap = {
        comment:
          'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400',
        note: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-400',
        status_change:
          'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-400',
        approval:
          'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-400',
        rejection:
          'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400',
      };

      return styleMap[type] || styleMap.comment;
    },
    []
  );

  /**
   * Load comments when bill ID changes
   */
  useEffect(() => {
    if (billId) {
      loadComments();
    }
  }, [billId, loadComments]);

  return {
    comments,
    loading,
    error,
    loadComments,
    createComment,
    updateComment,
    deleteComment,
    getCommentsByType,
    getApprovalHistory,
    getRegularComments,
    canEditComment,
    canDeleteComment,
    formatCommentType,
    getCommentTypeStyle,
  };
}
