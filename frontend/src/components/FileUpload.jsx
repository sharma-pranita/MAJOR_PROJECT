import React, { useState, useCallback } from 'react';
import { filesAPI } from '../utils/api';
import { Button } from './ui/button';
import { CloudUpload, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes } from '../utils/constants';

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

  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const handleUpload = useCallback(async () => {
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
  }, [selectedFile, onUploadSuccess]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
          dragActive
            ? 'border-white bg-zinc-900/60'
            : 'border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/30'
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
          <CloudUpload className="w-8 h-8 text-white mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm font-medium text-zinc-300">
            {selectedFile ? selectedFile.name : 'Drop files here or click to browse'}
          </p>
          {selectedFile && (
            <p className="text-xs text-zinc-500 mt-1">{formatBytes(selectedFile.size)}</p>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 bg-white hover:bg-zinc-200 text-black font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            data-testid="upload-button"
          >
            {uploading ? `Uploading... ${progress}%` : 'Upload'}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={uploading}
            className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
