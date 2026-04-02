import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Folder, File as FileIcon, Search, FileText, Image, LayoutGrid, List } from 'lucide-react';
import DocumentViewerModal from '../components/DocumentViewerModal';

const API_URL = "https://" + window.location.hostname + ":8000/api";

export default function FileHubDashboard() {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [selectedDoc, setSelectedDoc] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeCategory, search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

            const catRes = await fetch(`${API_URL}/files/categories`, { headers });
            if (catRes.ok) {
                const catData = await catRes.json();
                setCategories(catData);
            }

            let docUrl = `${API_URL}/files/`;
            const params = new URLSearchParams();
            if (activeCategory) params.append('category_id', activeCategory);
            if (search) params.append('search', search);

            if ([...params].length > 0) docUrl += `?${params.toString()}`;

            const docRes = await fetch(docUrl, { headers });
            if (docRes.ok) {
                const docData = await docRes.json();
                setDocuments(docData);
            }
        } catch (err) {
            console.error('Failed to fetch file hub data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (mimeType) => {
        if (mimeType?.startsWith('image/')) return <Image className="text-blue-500" size={32} />;
        if (mimeType === 'application/pdf') return <FileText className="text-red-500" size={32} />;
        return <FileIcon className="text-slate-500" size={32} />;
    };

    return (
        <div className="flex h-screen bg-slate-50 pt-16">

            {/* Sidebar - Categories */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <Folder className="mr-2 text-[#065590]" size={20} /> Categories
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!activeCategory ? 'bg-[#065590]/10 text-[#065590]' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        All Documents
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.id ? 'bg-[#065590]/10 text-[#065590]' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Topbar */}
                <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center flex-1 max-w-md">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Search documents..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#065590] focus:border-transparent outline-none text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-slate-100 text-[#065590]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-slate-100 text-[#065590]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>

                {/* Documents Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#065590]"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center mt-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                                <FileIcon size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-800">No documents found</h3>
                            <p className="text-slate-500 mt-1">Try changing your search or category filter.</p>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" : "space-y-3"}>
                            {documents.map(doc => (
                                viewMode === 'grid' ? (
                                    <div
                                        key={doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col group"
                                    >
                                        <div className="flex-1 flex justify-center items-center py-6 bg-slate-50 rounded-lg mb-4 group-hover:bg-slate-100 transition-colors">
                                            {getFileIcon(doc.mime_type)}
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-800 truncate" title={doc.original_name}>
                                            {doc.original_name}
                                        </h3>
                                        <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                            <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
                                    >
                                        <div className="p-2 bg-slate-50 rounded-lg">
                                            {getFileIcon(doc.mime_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-slate-800 truncate">{doc.original_name}</h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Category: {doc.category?.name || 'Uncategorized'} • Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-sm text-slate-500 font-medium px-4">
                                            {(doc.file_size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedDoc && (
                <DocumentViewerModal
                    document={selectedDoc}
                    onClose={() => setSelectedDoc(null)}
                />
            )}
        </div>
    );
}
