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
      <div className="border border-slate-200 rounded-2xl bg-white p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 text-black font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-4 h-4" />
            </div>
            <h3>Document Ingestion & Knowledge Index</h3>
          </div>
          <p className="text-xs text-slate-600 max-w-xl font-normal leading-relaxed">
            Upload enterprise PDF documents. Files are validated for magic byte signatures, hashed with SHA-256 for deduplication, recursively chunked, and embedded into pgvector.
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing PDF...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload PDF Document</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 shadow-xs ${
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
          <button onClick={() => setNotification(null)} className="text-[11px] font-semibold text-slate-600 hover:text-black underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Table */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search uploaded documents by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-black placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors shadow-2xs"
            />
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Total Documents: <strong className="text-black font-bold">{documents.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-medium">Loading indexed documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-black">No documents found</p>
            <p className="text-xs max-w-sm mx-auto text-slate-500 font-medium">
              {searchTerm ? 'No documents match your search query.' : 'Upload your first PDF document to begin asking questions with verified citations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-black">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-black flex items-center gap-2.5">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.status === 'INDEXED' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          INDEXED
                        </span>
                      )}
                      {doc.status === 'PROCESSING' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 animate-spin text-amber-700" /> PROCESSING
                        </span>
                      )}
                      {doc.status === 'FAILED' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold" title={doc.error_message || ''}>
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{formatBytes(doc.file_size_bytes)}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">{doc.total_pages}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{doc.total_chunks}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleReindex(doc.id, doc.filename)}
                        title="Reindex Document"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-black transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        title="Delete Document"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
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
