'use client';
import { useState } from 'react';
import {
  useBillAttachments,
  type BillAttachment,
} from '@/hooks/useBillAttachments';
import FileUpload from '@/components/FileUpload';

interface BillAttachmentsProps {
  billId: string;
  readonly?: boolean;
  className?: string;
}

export default function BillAttachments({
  billId,
  readonly = false,
  className = '',
}: BillAttachmentsProps) {
  const {
    attachments,
    loading,
    error,
    deleteAttachment,
    downloadFile,
    addAttachment,
    getFileTypeInfo,
    formatFileSize,
  } = useBillAttachments(billId);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (attachment: BillAttachment) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    setDeletingIds((prev) => new Set(prev).add(attachment.id));

    const success = await deleteAttachment(attachment.id, attachment.file_path);

    setDeletingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(attachment.id);
      return newSet;
    });
  };

  const handleUpload = (uploadedFile: any) => {
    addAttachment({
      id: uploadedFile.id,
      file_path: uploadedFile.file_path,
      mime: uploadedFile.mime,
      name: uploadedFile.name || 'Unknown',
      size: uploadedFile.size || 0,
      created_at: new Date().toISOString(),
    });
  };

  if (loading && attachments.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Attachments
          </h3>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Attachments
        </h3>
        {attachments.length > 0 && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* File Upload */}
      {!readonly && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <FileUpload
            linkedType="bill"
            linkedId={billId}
            onUpload={handleUpload}
            maxFiles={10}
            acceptedTypes={[
              'image/*',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/csv',
            ]}
          />
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const fileInfo = getFileTypeInfo(attachment.mime, attachment.name);
            const isDeleting = deletingIds.has(attachment.id);

            return (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* File type indicator */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg border text-sm font-medium ${fileInfo.color}`}
                  >
                    {fileInfo.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {attachment.name}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                        {fileInfo.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{formatFileSize(attachment.size)}</span>
                      <span>
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Download button */}
                  <button
                    onClick={() => downloadFile(attachment)}
                    className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    title="Download file"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </button>

                  {/* Delete button */}
                  {!readonly && (
                    <button
                      onClick={() => handleDelete(attachment)}
                      disabled={isDeleting}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete file"
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !readonly && (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm">No attachments yet</p>
            <p className="text-xs">
              Upload invoices, receipts, or other documents
            </p>
          </div>
        )
      )}
    </div>
  );
}
