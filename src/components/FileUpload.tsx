'use client';
import { Upload, X, FileText, Image } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type FileUploadProps = {
  linkedType: 'bill' | 'occurrence' | 'vendor' | 'project';
  linkedId: string;
  onUpload?: (attachment: {
    id: string;
    file_path: string;
    mime: string;
  }) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
};

type UploadedFile = {
  id: string;
  file_path: string;
  mime: string;
  name: string;
  size: number;
  uploading?: boolean;
};

export default function FileUpload({
  linkedType,
  linkedId,
  onUpload,
  maxFiles = 5,
  acceptedTypes = [
    'image/*',
    'application/pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
  ],
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        setError(null);
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        // Create file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `org_${orgId}/${linkedType}/${linkedId}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('billboard')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save attachment record
        const { data: attachment, error: dbError } = await (supabase as any)
          .from('attachments')
          .insert({
            org_id: orgId,
            linked_type: linkedType,
            linked_id: linkedId,
            file_path: uploadData.path,
            mime: file.type,
            name: file.name,
            size: file.size,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        const uploadedFile = {
          id: attachment.id,
          file_path: attachment.file_path,
          mime: attachment.mime,
          name: file.name,
          size: file.size,
        };

        setFiles((prev) => [...prev, uploadedFile]);
        onUpload?.(uploadedFile);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.message || 'Failed to upload file');
      }
    },
    [supabase, linkedType, linkedId, onUpload]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const fileArray = Array.from(e.dataTransfer.files);
        fileArray.slice(0, maxFiles - files.length).forEach(uploadFile);
      }
    },
    [uploadFile, files.length, maxFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        const fileArray = Array.from(e.target.files);
        fileArray.slice(0, maxFiles - files.length).forEach(uploadFile);
      }
    },
    [uploadFile, files.length, maxFiles]
  );

  const removeFile = useCallback(
    async (fileId: string) => {
      try {
        await (supabase as any).from('attachments').delete().eq('id', fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (err: any) {
        setError('Failed to remove file');
      }
    },
    [supabase]
  );

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-700'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto text-neutral-400" />
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-blue-600">Click to upload</span>{' '}
            or drag and drop
          </div>
          <div className="text-xs text-neutral-500">
            PDF, DOC, XLS, Images up to 10MB
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Uploaded Files</div>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {getFileIcon(file.mime)}
                <div className="text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-neutral-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeFile(file.id)}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
