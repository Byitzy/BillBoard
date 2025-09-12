'use client';
import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  Edit2,
  Trash2,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
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

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (commentId: string) => {
    if (deletingId) return; // Prevent multiple deletes

    setDeletingId(commentId);
    const success = await deleteComment(commentId);

    if (!success) {
      // Reset if delete failed
      setDeletingId(null);
    }
    // If successful, the comment will be removed from state by the hook
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
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white dark:bg-neutral-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            All ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-neutral-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            History ({approvalHistory.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* New Comment Form */}
      {!readonly && activeTab === 'all' && (
        <div className="space-y-3">
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
              className="w-full px-4 py-3 pr-20 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 resize-none transition-all duration-200"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any);
              }}
              disabled={!newComment.trim() || submitting}
              className="absolute bottom-3 right-3 p-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
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
                    <div className="flex items-center gap-1">
                      {canEditComment(comment, userRole) && (
                        <button
                          onClick={() => startEdit(comment)}
                          className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200"
                          title="Edit comment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDeleteComment(comment, userRole) && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                          className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200 disabled:opacity-50"
                          title="Delete comment"
                        >
                          {deletingId === comment.id ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border border-red-600 border-t-transparent" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
              </div>

              {editingId === comment.id ? (
                <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all duration-200"
                    placeholder="Edit your comment..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      disabled={!editContent.trim()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all duration-200 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 rounded-md transition-all duration-200 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
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
          <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
            <div className="mb-4">
              {activeTab === 'history' ? (
                <Clock className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600" />
              ) : (
                <MessageSquare className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600" />
              )}
            </div>
            <p className="text-base font-medium mb-2">
              {activeTab === 'history'
                ? 'No approval history yet'
                : 'No comments yet'}
            </p>
            <p className="text-sm">
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
