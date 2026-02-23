import React, { useState, useCallback } from 'react';
import { filesAPI } from '../utils/api';
import { Button } from './ui/button';
import { CloudUpload, X } from 'lucide-react';
import { toast } from 'sonner';

const FileUpload = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      await filesAPI.upload(selectedFile, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
      toast.success('File uploaded successfully!');
      setSelectedFile(null);
      setProgress(0);
      onUploadSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
        data-testid="file-upload-dropzone"
      >
        <input
          type="file"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
          data-testid="file-input"
        />
        <div className="text-center">
          <CloudUpload className="w-8 h-8 text-indigo-600 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-700">
            {selectedFile ? selectedFile.name : 'Drop files here or click to browse'}
          </p>
          {selectedFile && (
            <p className="text-xs text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 hover:-translate-y-0.5"
            data-testid="upload-button"
          >
            {uploading ? `Uploading... ${progress}%` : 'Upload'}
          </Button>
          <Button
            onClick={() => setSelectedFile(null)}
            variant="outline"
            disabled={uploading}
            className="border-slate-300"
            data-testid="cancel-upload-button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;