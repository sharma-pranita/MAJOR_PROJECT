import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { filesAPI } from '../utils/api';
import { clearAuth, getAuth } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { CloudUpload, FolderOpen, LogOut, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const navigate = useNavigate();
  const user = getAuth().user;

  const loadFiles = async () => {
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
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const handleUploadSuccess = () => {
    loadFiles();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const storageLimit = 5 * 1024 * 1024 * 1024;
  const storagePercent = (storageUsed / storageLimit) * 100;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dashboard-page">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CloudUpload className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                CloudVault
              </h1>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl border border-slate-200 shadow-sm" data-testid="storage-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <HardDrive className="w-4 h-4" strokeWidth={1.5} />
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {formatBytes(storageUsed)}
                  </span>
                  <span className="text-sm text-slate-500 pb-1">/ {formatBytes(storageLimit)}</span>
                </div>
                <Progress value={storagePercent} className="h-2" data-testid="storage-progress" />
                <p className="text-xs text-slate-500">{storagePercent.toFixed(1)}% used</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-sm" data-testid="files-count-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
                Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {files.length}
              </div>
              <p className="text-xs text-slate-500 mt-2">Backed up files</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-1 lg:col-span-2 rounded-xl border-2 border-dashed border-indigo-200 bg-white shadow-sm" data-testid="upload-card">
            <CardContent className="p-6">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border border-slate-200 shadow-sm" data-testid="file-list-card">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Your Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading files...</div>
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