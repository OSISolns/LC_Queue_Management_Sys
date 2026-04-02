import React from 'react';
import { X, Download, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DocumentViewerModal({ document, onClose }) {
    const { user } = useAuth();

    if (!document) return null;

    // Find user's permission for this document
    let canDownload = false;
    if (user?.role === 'Admin') {
        canDownload = true;
    } else {
        const access = document.role_access?.find(a => a.role?.category === user?.role);
        if (access?.permission_type === 'view_download') {
            canDownload = true;
        }
    }

    const fileUrl = `https://${window.location.hostname}:8000/api/files/${document.id}/download?token=${localStorage.getItem('token')}`;

    const isImage = document.mime_type?.startsWith('image/');
    const isPdf = document.mime_type === 'application/pdf';

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{document.original_name}</h2>
                        <p className="text-sm text-slate-500">
                            Uploaded: {new Date(document.upload_date).toLocaleDateString()} | Size: {(document.file_size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!canDownload && (
                            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-200">
                                <ShieldAlert size={16} className="mr-2" />
                                View Only
                            </div>
                        )}

                        {canDownload && (
                            <a
                                href={fileUrl}
                                download={document.original_name}
                                className="flex items-center text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                onClick={(e) => {
                                    // If it's a link click, native download triggers. 
                                    // If we need custom auth headers for the download, we might need to fetch as blob.
                                    // For now, assuming token in query string works if backend supports it.
                                    // Wait, backend explicitly expects Bearer token. We'll handle this in the services layer if needed.
                                }}
                            >
                                <Download size={16} className="mr-2" />
                                Download
                            </a>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Viewer Area */}
                <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto">
                    {isImage ? (
                        <img
                            src={fileUrl}
                            alt={document.original_name}
                            className="max-w-full max-h-full object-contain bg-white shadow-sm border border-slate-200 rounded"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={`${fileUrl}#toolbar=${canDownload ? 1 : 0}`}
                            className="w-full h-full bg-white shadow-sm border border-slate-200 rounded"
                            title="PDF Viewer"
                        />
                    ) : (
                        <div className="text-center bg-white p-12 rounded-xl shadow-sm border border-slate-200 max-w-md">
                            <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-400 flex items-center justify-center rounded-full mb-4">
                                <ShieldAlert size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Preview Not Available</h3>
                            <p className="text-slate-500 mb-6 font-medium">
                                This file type cannot be previewed in the browser.
                                {canDownload ? ' Please download the file to view it.' : ' You do not have permission to download this file.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
