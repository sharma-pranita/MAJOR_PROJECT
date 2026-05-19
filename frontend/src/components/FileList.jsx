import React, { useState, useCallback } from 'react';
import { filesAPI } from '../utils/api';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { MoreVertical, Download, History, FileText, Image as ImageIcon, FileCode, File } from 'lucide-react';
import { toast } from 'sonner';
import VersionHistory from './VersionHistory';
import { formatDistanceToNow } from 'date-fns';
import { formatBytes } from '../utils/constants';

// Extract file icon logic to separate function
const getFileIcon = (contentType) => {
  const iconProps = { className: "w-4 h-4 text-indigo-600", strokeWidth: 1.5 };
  
  if (contentType.startsWith('image/')) return <ImageIcon {...iconProps} />;
  if (contentType.includes('pdf') || contentType.includes('text')) return <FileText {...iconProps} />;
  if (contentType.includes('code') || contentType.includes('javascript') || contentType.includes('python')) {
    return <FileCode {...iconProps} />;
  }
  return <File {...iconProps} />;
};

// Extract file row component
const FileRow = ({ file, onDownload, onShowVersions }) => {
  return (
    <TableRow
      className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
      data-testid={`file-row-${file.id}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          {getFileIcon(file.content_type)}
          <span className="text-slate-900 font-mono text-sm">{file.filename}</span>
        </div>
      </TableCell>
      <TableCell className="text-slate-600">{formatBytes(file.size)}</TableCell>
      <TableCell className="text-slate-600">
        {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          {file.version_count}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              data-testid={`file-actions-${file.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onDownload(file)}
              data-testid={`download-${file.id}`}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onShowVersions(file)}
              data-testid={`versions-${file.id}`}
            >
              <History className="mr-2 h-4 w-4" />
              Version History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

const FileList = ({ files, onFileChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showVersions, setShowVersions] = useState(false);

  const handleDownload = useCallback(async (file) => {
    try {
      const response = await filesAPI.download(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.error('Download failed');
    }
  }, []);

  const handleShowVersions = useCallback((file) => {
    setSelectedFile(file);
    setShowVersions(true);
  }, []);

  const handleCloseVersions = useCallback(() => {
    setShowVersions(false);
    setSelectedFile(null);
    onFileChange();
  }, [onFileChange]);

  if (files.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-state">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No files yet</h3>
        <p className="text-slate-500">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-medium text-slate-700">Name</TableHead>
              <TableHead className="font-medium text-slate-700">Size</TableHead>
              <TableHead className="font-medium text-slate-700">Uploaded</TableHead>
              <TableHead className="font-medium text-slate-700">Versions</TableHead>
              <TableHead className="font-medium text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onDownload={handleDownload}
                onShowVersions={handleShowVersions}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {showVersions && selectedFile && (
        <VersionHistory
          file={selectedFile}
          open={showVersions}
          onClose={handleCloseVersions}
        />
      )}
    </>
  );
};

export default FileList;
