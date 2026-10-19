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
  Database
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { listDocuments, uploadDocument, deleteDocument, reindexDocument } from '../../api/documents';

export default function DocumentVault() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete '${filename}'? This will remove all associated vector embeddings.`)) {
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

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Upload Section */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3>Document Ingestion & Knowledge Index</h3>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Upload enterprise PDF documents. Files are validated for magic byte signatures, hashed for deduplication, recursively chunked, and embedded into pgvector.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing PDF...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload PDF Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 ${
          notification.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Table */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/30 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search uploaded documents..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="text-xs text-slate-400">
            Total Documents: <strong className="text-white">{documents.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
            <p className="text-xs">Loading indexed documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No documents found</p>
            <p className="text-xs max-w-sm mx-auto">
              {searchTerm ? 'No documents match your search query.' : 'Upload your first PDF document to begin asking questions with verified citations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'INDEXED' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          INDEXED
                        </span>
                      )}
                      {doc.status === 'PROCESSING' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 animate-spin" /> PROCESSING
                        </span>
                      )}
                      {doc.status === 'FAILED' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold" title={doc.error_message || ''}>
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{formatBytes(doc.file_size_bytes)}</td>
                    <td className="py-3 px-4">{doc.total_pages}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{doc.total_chunks}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleReindex(doc.id, doc.filename)}
                        title="Reindex Document"
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        title="Delete Document"
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
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
