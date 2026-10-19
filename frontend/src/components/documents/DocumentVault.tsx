import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck,
  Search,
  Database,
  Layers,
  HardDrive
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { listDocuments, uploadDocument, deleteDocument, reindexDocument } from '../../api/documents';

export default function DocumentVault() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await listDocuments(0, 100);
      setDocuments(res.items);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch documents.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setNotification({ type: 'error', message: 'Only PDF documents (.pdf) are permitted.' });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'File size exceeds maximum permitted limit (15 MB).' });
      return;
    }

    try {
      setUploading(true);
      setNotification(null);
      await uploadDocument(file);
      setNotification({ type: 'success', message: `Document '${file.name}' uploaded and indexed successfully.` });
      await fetchDocs();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Upload failed.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete '${filename}'? This will remove all associated vector embeddings from pgvector.`)) {
      return;
    }
    try {
      await deleteDocument(id);
      setNotification({ type: 'success', message: `Document '${filename}' deleted.` });
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete document.' });
    }
  };

  const handleReindex = async (id: string, filename: string) => {
    try {
      setNotification(null);
      await reindexDocument(id);
      setNotification({ type: 'success', message: `Document '${filename}' re-indexed successfully.` });
      await fetchDocs();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to reindex document.' });
    }
  };

  const filteredDocs = documents.filter(d => 
    d.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size_bytes || 0), 0);
  const totalChunks = documents.reduce((acc, d) => acc + (d.total_chunks || 0), 0);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 bg-white">
      {/* Top Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Total Files</span>
            <Database className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 text-2xl font-bold text-black tracking-tight">{documents.length}</div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Uploaded PDF documents</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Search Chunks</span>
            <Layers className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 text-2xl font-bold text-black tracking-tight">{totalChunks}</div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Indexed pieces for fast search</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Storage Used</span>
            <HardDrive className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 text-2xl font-bold text-black tracking-tight">{formatBytes(totalBytes)}</div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Total size on disk</p>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div 
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all bg-white ${
          isDragging 
            ? 'border-black bg-neutral-50/80' 
            : 'border-neutral-300 hover:border-black'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mx-auto shadow-xs">
            <Upload className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-black tracking-tight">Upload PDF Documents</h4>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal">
              Drag and drop your PDF here, or click to browse. Files are checked, split into search chunks, and saved safely.
            </p>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              className="hidden"
            />
            
            {/* Solid Black Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing & Indexing Vector Chunks...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select PDF File</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-neutral-400">Supported format: PDF only &bull; Max file size: 15 MB</p>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 shadow-xs ${
          notification.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setNotification(null)} 
            className="text-[11px] font-semibold text-neutral-600 hover:text-black underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Document Library Table */}
      <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search uploaded documents..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div className="text-xs text-neutral-500 font-normal">
            Showing <strong className="text-black font-semibold">{filteredDocs.length}</strong> of {documents.length} files
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-neutral-500 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-black" />
            <p className="text-xs font-medium">Loading document catalog...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-black">No documents indexed</p>
            <p className="text-xs max-w-sm mx-auto text-neutral-500 font-normal leading-relaxed">
              {searchTerm 
                ? 'No documents match your search criteria.' 
                : 'Upload your first PDF document above to index its contents for grounded retrieval and citations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-neutral-700 font-semibold">
                  <th className="py-2.5 px-4">Document Name</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">Pages</th>
                  <th className="py-2.5 px-4">Chunks</th>
                  <th className="py-2.5 px-4">Uploaded</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-black">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-black flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-neutral-700 shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'INDEXED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          INDEXED
                        </span>
                      )}
                      {doc.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          <Clock className="w-3 h-3 animate-spin text-amber-700" />
                          PROCESSING
                        </span>
                      )}
                      {doc.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold" title={doc.error_message || ''}>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 font-normal">{formatBytes(doc.file_size_bytes)}</td>
                    <td className="py-3 px-4 text-neutral-700 font-normal">{doc.total_pages}</td>
                    <td className="py-3 px-4 font-mono font-bold text-black">{doc.total_chunks}</td>
                    <td className="py-3 px-4 text-neutral-500 font-normal">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleReindex(doc.id, doc.filename)}
                        title="Reindex Document & Embeddings"
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        title="Delete Document"
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
