'use client';
import { useState, useRef, useEffect } from 'react';
import { useBillComments, type BillComment } from '@/hooks/useBillComments';

interface BillCommentsProps {
  billId: string;
  userRole?: string;
  readonly?: boolean;
  className?: string;
}

export default function BillComments({
  billId,
  userRole = 'viewer',
  readonly = false,
  className = '',
}: BillCommentsProps) {
  const {
    comments,
    loading,
    error,
    createComment,
    updateComment,
    deleteComment,
    getApprovalHistory,
    getRegularComments,
    canEditComment,
    canDeleteComment,
    formatCommentType,
    getCommentTypeStyle,
  } = useBillComments(billId);

  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [commentType, setCommentType] = useState<'comment' | 'note'>('comment');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'history'>('all');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);

    const success = await createComment({
      content: newComment,
      comment_type: commentType,
      is_internal: isInternal,
    });

    if (success) {
      setNewComment('');
      setIsInternal(false);
      setCommentType('comment');
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    setSubmitting(false);
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    const success = await updateComment(commentId, editContent);

    if (success) {
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    await deleteComment(commentId);
  };

  const startEdit = (comment: BillComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hour${Math.floor(diffHours) !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)} day${Math.floor(diffDays) !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const approvalHistory = getApprovalHistory();
  const regularComments = getRegularComments();
  const displayComments = activeTab === 'history' ? approvalHistory : comments;

  if (loading && comments.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Comments & Notes
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
          Comments & Notes
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            History ({approvalHistory.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* New Comment Form */}
      {!readonly &&
        activeTab === 'all' &&
        ['admin', 'approver', 'accountant', 'data_entry'].includes(
          userRole
        ) && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="comment"
                  name="commentType"
                  value="comment"
                  checked={commentType === 'comment'}
                  onChange={() => setCommentType('comment')}
                  className="w-4 h-4 text-blue-600 bg-white border-neutral-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="comment"
                  className="text-sm text-neutral-700 dark:text-neutral-300"
                >
                  Comment
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="note"
                  name="commentType"
                  value="note"
                  checked={commentType === 'note'}
                  onChange={() => setCommentType('note')}
                  className="w-4 h-4 text-blue-600 bg-white border-neutral-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="note"
                  className="text-sm text-neutral-700 dark:text-neutral-300"
                >
                  Internal Note
                </label>
              </div>
              {commentType === 'comment' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="internal"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="internal"
                    className="text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    Internal only
                  </label>
                </div>
              )}
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextareaChange}
                placeholder={`Add a ${commentType}...`}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 resize-none"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="absolute bottom-2 right-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        )}

      {/* Comments List */}
      <div className="space-y-4">
        {displayComments.length > 0 ? (
          displayComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg border transition-colors ${
                comment.is_internal
                  ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/50'
                  : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {comment.user_name || comment.user_email || 'System'}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getCommentTypeStyle(comment.comment_type)}`}
                  >
                    {formatCommentType(comment.comment_type)}
                  </span>
                  {comment.is_internal && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                      Internal
                    </span>
                  )}
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDateTime(comment.created_at)}
                  </span>
                  {comment.edited_at && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      (edited)
                    </span>
                  )}
                </div>

                {!readonly &&
                  ['comment', 'note'].includes(comment.comment_type) && (
                    <div className="flex items-center gap-2">
                      {canEditComment(comment, userRole) && (
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteComment(comment, userRole) && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
              </div>

              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {comment.content}
                </div>
              )}

              {/* Status change metadata */}
              {comment.comment_type === 'status_change' && comment.metadata && (
                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {comment.metadata.old_status &&
                    comment.metadata.new_status && (
                      <span>
                        Changed from{' '}
                        <strong>{comment.metadata.old_status}</strong> to{' '}
                        <strong>{comment.metadata.new_status}</strong>
                      </span>
                    )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <div className="text-4xl mb-2">
              <svg
                className="w-16 h-16 mx-auto text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm">
              {activeTab === 'history'
                ? 'No approval history yet'
                : 'No comments yet'}
            </p>
            <p className="text-xs">
              {activeTab === 'history'
                ? 'Status changes and approvals will appear here'
                : 'Start a conversation about this bill'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
