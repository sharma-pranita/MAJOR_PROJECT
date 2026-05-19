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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { MoreVertical, Download, History, FileText, Image as ImageIcon, FileCode, File, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import VersionHistory from './VersionHistory';
import { formatDistanceToNow } from 'date-fns';
import { formatBytes } from '../utils/constants';

const getFileIcon = (contentType) => {
  const iconProps = { className: "w-4 h-4 text-zinc-400", strokeWidth: 1.5 };
  
  if (contentType.startsWith('image/')) return <ImageIcon {...iconProps} />;
  if (contentType.includes('pdf') || contentType.includes('text')) return <FileText {...iconProps} />;
  if (contentType.includes('code') || contentType.includes('javascript') || contentType.includes('python')) {
    return <FileCode {...iconProps} />;
  }
  return <File {...iconProps} />;
};

const FileRow = ({ file, onDownload, onShowVersions, onDeleteClick }) => {
  return (
    <TableRow
      className="group hover:bg-zinc-900/40 transition-all duration-300 border-b border-zinc-900 last:border-0"
      data-testid={`file-row-${file.id}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="group-hover:scale-110 transition-transform duration-300">
            {getFileIcon(file.content_type)}
          </div>
          <span className="text-white font-mono text-sm group-hover:translate-x-1.5 transition-transform duration-300 block">
            {file.filename}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-zinc-400">{formatBytes(file.size)}</TableCell>
      <TableCell className="text-zinc-400">
        {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors duration-300 group-hover:border-zinc-500">
          {file.version_count}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 hover:scale-110 active:scale-90 transition-all duration-200"
            onClick={() => onDeleteClick(file)}
            data-testid={`delete-${file.id}`}
            title="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800 hover:scale-110 active:scale-90 transition-all duration-200"
                data-testid={`file-actions-${file.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-white">
              <DropdownMenuItem
                onClick={() => onDownload(file)}
                data-testid={`download-${file.id}`}
                className="hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onShowVersions(file)}
                data-testid={`versions-${file.id}`}
                className="hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                <History className="mr-2 h-4 w-4" />
                Version History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

const FileList = ({ files, onFileChange }) => {
  const [localFiles, setLocalFiles] = useState(files);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showVersions, setShowVersions] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    setLocalFiles(files);
  }, [files]);

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

  const handleDeleteClick = useCallback((file) => {
    setFileToDelete(file);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!fileToDelete) return;
    setDeleting(true);

    // Optimistically remove from UI immediately
    setLocalFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
    setFileToDelete(null);

    try {
      await filesAPI.delete(fileToDelete.id);
      toast.success(`"${fileToDelete.filename}" deleted successfully`);
      onFileChange(); // sync parent state in background
    } catch (error) {
      // Restore the file in local state if the API call fails
      setLocalFiles(prev => [...prev, fileToDelete]);
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
    }
  }, [fileToDelete, onFileChange]);

  const handleDeleteCancel = useCallback(() => {
    setFileToDelete(null);
  }, []);

  if (localFiles.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-state">
        <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-white mb-2">No files yet</h3>
        <p className="text-zinc-400">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-900/50 hover:bg-zinc-900/50">
              <TableHead className="font-medium text-zinc-300">Name</TableHead>
              <TableHead className="font-medium text-zinc-300">Size</TableHead>
              <TableHead className="font-medium text-zinc-300">Uploaded</TableHead>
              <TableHead className="font-medium text-zinc-300">Versions</TableHead>
              <TableHead className="font-medium text-zinc-300 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onDownload={handleDownload}
                onShowVersions={handleShowVersions}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete file?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete <span className="font-semibold text-white">"{fileToDelete?.filename}"</span> and all its version history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
