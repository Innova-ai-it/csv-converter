import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const validateAndUpload = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('File size exceeds 10MB limit.');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ease-in-out cursor-pointer group
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
          }
        `}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          disabled={isLoading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
            <UploadCloud size={32} />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">
              Drag & Drop your CSV here
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or click to browse (max 10MB)
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Supports WooCommerce, Wix, PrestaShop exports
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
