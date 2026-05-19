import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI } from '../utils/api';
import { clearAuth, getAuth } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Shield, FolderOpen, LogOut, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes, STORAGE_LIMITS } from '../utils/constants';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const navigate = useNavigate();
  const user = getAuth().user;

  const loadFiles = useCallback(async () => {
    try {
      const response = await filesAPI.list();
      setFiles(response.data);
      const totalSize = response.data.reduce((acc, file) => acc + file.size, 0);
      setStorageUsed(totalSize);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/');
    toast.success('Logged out successfully');
  }, [navigate]);

  const handleUploadSuccess = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const storagePercent = (storageUsed / STORAGE_LIMITS.DEFAULT_LIMIT) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-white animate-fade-in" data-testid="dashboard-page">
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none active:scale-[0.98] transition-transform duration-200"
            onClick={() => window.location.reload()}
            title="Click to refresh page"
          >
            <div className="group w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg ring-2 ring-zinc-800 hover:scale-105 active:scale-95 transition-all duration-300">
              <Shield className="w-5 h-5 text-black group-hover:rotate-12 transition-transform duration-300" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                CloudShield
              </h1>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all duration-200"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/60 group cursor-pointer" data-testid="storage-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-zinc-400 group-hover:scale-110 group-hover:text-white transition-all duration-300" strokeWidth={1.5} />
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {formatBytes(storageUsed)}
                  </span>
                  <span className="text-sm text-zinc-500 pb-1">/ {formatBytes(STORAGE_LIMITS.DEFAULT_LIMIT)}</span>
                </div>
                <Progress value={storagePercent} className="h-2 bg-zinc-800" data-testid="storage-progress" />
                <p className="text-xs text-zinc-400">{storagePercent.toFixed(1)}% used</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/60 group cursor-pointer" data-testid="files-count-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zinc-400 group-hover:scale-110 group-hover:text-white transition-all duration-300" strokeWidth={1.5} />
                Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {files.length}
              </div>
              <p className="text-xs text-zinc-400 mt-2">Backed up files</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-1 lg:col-span-2 rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/10 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-zinc-700" data-testid="upload-card">
            <CardContent className="p-6">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-zinc-800" data-testid="file-list-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Your Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-zinc-400">Loading files...</div>
            ) : (
              <FileList files={files} onFileChange={loadFiles} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
