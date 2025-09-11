/**
 * Hook for managing bill attachments
 * Provides functionality to load, upload, and manage file attachments for bills
 */

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';

export interface BillAttachment {
  id: string;
  file_path: string;
  mime: string;
  name: string;
  size: number;
  created_at: string;
  created_by?: string;
}

export function useBillAttachments(billId: string) {
  const [attachments, setAttachments] = useState<BillAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  /**
   * Load all attachments for a bill
   */
  const loadAttachments = useCallback(async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);

    try {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('attachments' as any)
        .select('*')
        .eq('org_id', orgId)
        .eq('linked_type', 'bill')
        .eq('linked_id', billId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAttachments((data as BillAttachment[]) || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load attachments'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, billId]);

  /**
   * Delete an attachment
   */
  const deleteAttachment = useCallback(
    async (attachmentId: string, filePath: string): Promise<boolean> => {
      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('billboard')
          .remove([filePath]);

        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Don't fail the operation if storage deletion fails
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('attachments' as any)
          .delete()
          .eq('id', attachmentId)
          .eq('org_id', orgId);

        if (dbError) throw dbError;

        // Update local state
        setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete attachment'
        );
        return false;
      }
    },
    [supabase]
  );

  /**
   * Get a signed URL for downloading/viewing a file
   */
  const getFileUrl = useCallback(
    async (filePath: string): Promise<string | null> => {
      try {
        const { data, error } = await supabase.storage
          .from('billboard')
          .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

        if (error) throw error;

        return data.signedUrl;
      } catch (err) {
        console.error('Failed to get file URL:', err);
        return null;
      }
    },
    [supabase]
  );

  /**
   * Download a file
   */
  const downloadFile = useCallback(
    async (attachment: BillAttachment) => {
      try {
        const url = await getFileUrl(attachment.file_path);
        if (!url) throw new Error('Failed to get download URL');

        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to download file'
        );
      }
    },
    [getFileUrl]
  );

  /**
   * Add an attachment (called by FileUpload component)
   */
  const addAttachment = useCallback((attachment: BillAttachment) => {
    setAttachments((prev) => [attachment, ...prev]);
  }, []);

  /**
   * Get file type information for display
   */
  const getFileTypeInfo = useCallback((mime: string, name: string) => {
    if (mime.startsWith('image/')) {
      return {
        type: 'image',
        icon: 'image',
        color:
          'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-400',
      };
    }

    if (mime === 'application/pdf') {
      return {
        type: 'pdf',
        icon: 'document',
        color:
          'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400',
      };
    }

    if (
      mime.includes('spreadsheet') ||
      name.includes('.xls') ||
      name.includes('.csv')
    ) {
      return {
        type: 'spreadsheet',
        icon: 'spreadsheet',
        color:
          'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400',
      };
    }

    if (mime.includes('document') || name.includes('.doc')) {
      return {
        type: 'document',
        icon: 'document',
        color:
          'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-400',
      };
    }

    return {
      type: 'file',
      icon: '📁',
      color:
        'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-400',
    };
  }, []);

  /**
   * Format file size for display
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Load attachments when bill ID changes
   */
  useEffect(() => {
    if (billId) {
      loadAttachments();
    }
  }, [billId, loadAttachments]);

  return {
    attachments,
    loading,
    error,
    loadAttachments,
    deleteAttachment,
    getFileUrl,
    downloadFile,
    addAttachment,
    getFileTypeInfo,
    formatFileSize,
  };
}
