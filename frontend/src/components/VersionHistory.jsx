import React, { useState, useEffect, useCallback } from 'react';
import { filesAPI } from '../utils/api';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Download, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { formatBytes } from '../utils/constants';

const VersionItem = ({ version, index, totalVersions, onDownload, onRestore, restoring }) => {
  const versionNumber = totalVersions - index;
  const isRestoring = restoring === version.version_id;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        version.is_latest
          ? 'border-l-4 border-l-white bg-zinc-900 border-zinc-800'
          : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40'
      }`}
      data-testid={`version-${index}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">
              Version {versionNumber}
            </span>
            {version.is_latest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-black border border-white">
                <CheckCircle2 className="w-3 h-3" />
                Current
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-300">
            {formatDistanceToNow(new Date(version.uploaded_at), { addSuffix: true })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{formatBytes(version.size)}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(version.version_id)}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white"
            data-testid={`download-version-${index}`}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          {!version.is_latest && (
            <Button
              size="sm"
              onClick={() => onRestore(version.version_id)}
              disabled={isRestoring}
              className="bg-white hover:bg-zinc-200 text-black font-medium"
              data-testid={`restore-version-${index}`}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const VersionHistory = ({ file, open, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  const loadVersions = useCallback(async () => {
    if (!file) return;
    
    try {
      const response = await filesAPI.getVersions(file.id);
      setVersions(response.data);
    } catch (error) {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (open && file) {
      loadVersions();
    }
  }, [open, file, loadVersions]);

  const handleDownloadVersion = useCallback(async (versionId) => {
    try {
      const response = await filesAPI.download(file.id, versionId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Version downloaded successfully');
    } catch (error) {
      toast.error('Download failed');
    }
  }, [file]);

  const handleRestoreVersion = useCallback(async (versionId) => {
    if (restoring) return;
    
    setRestoring(versionId);
    try {
      await filesAPI.restore(file.id, versionId);
      toast.success('Version restored successfully');
      await loadVersions();
    } catch (error) {
      toast.error('Restore failed');
    } finally {
      setRestoring(null);
    }
  }, [file, restoring, loadVersions]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800 text-white" data-testid="version-history-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Version History
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {file.filename} - {versions.length} version{versions.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading versions...</div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <VersionItem
                  key={version.version_id}
                  version={version}
                  index={index}
                  totalVersions={versions.length}
                  onDownload={handleDownloadVersion}
                  onRestore={handleRestoreVersion}
                  restoring={restoring}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistory;
