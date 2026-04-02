import React, { useState, useEffect } from 'react';
import { Upload, Plus, FolderPlus, Shield, Trash2, Edit } from 'lucide-react';

const API_URL = "https://" + window.location.hostname + ":8000/api";

export default function AdminFileManager() {
    const [activeTab, setActiveTab] = useState('uploads');
    const [categories, setCategories] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [roles, setRoles] = useState([]);

    // Forms
    const [newCatName, setNewCatName] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadCategory, setUploadCategory] = useState('');

    // Access Management
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [roleAccessList, setRoleAccessList] = useState([]);

    useEffect(() => {
        fetchData();
        // Fetch roles - Assuming there's a generic endpoint or we can hardcode for this demo
        // Actually, we can fetch roles from /admin/users or similar if it existed, 
        // but let's mock the ones we know or fetch from a known endpoint.
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_URL}/roles`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
        }
    };

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
            const [catRes, docRes] = await Promise.all([
                fetch(`${API_URL}/files/categories`, { headers }),
                fetch(`${API_URL}/files/`, { headers })
            ]);

            if (catRes.ok) setCategories(await catRes.json());
            if (docRes.ok) setDocuments(await docRes.json());
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCatName) return;
        try {
            const res = await fetch(`${API_URL}/files/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: newCatName, description: '' })
            });
            if (res.ok) {
                setNewCatName('');
                fetchData();
                alert("Category created successfully");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return alert("Select a file first");

        const formData = new FormData();
        formData.append('file', uploadFile);
        if (uploadCategory) formData.append('category_id', uploadCategory);

        try {
            const res = await fetch(`${API_URL}/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            if (res.ok) {
                setUploadFile(null);
                document.getElementById('file-upload').value = '';
                fetchData();
                alert("File uploaded successfully");
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm("Are you sure you want to delete this category? Make sure no documents are inside it.")) return;
        try {
            const res = await fetch(`${API_URL}/files/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                fetchData();
                alert("Category deleted");
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to delete category");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this document forever?")) return;
        try {
            const res = await fetch(`${API_URL}/files/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                fetchData();
                alert("Document deleted");
            } else {
                alert("Failed to delete document");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openAccessModal = (doc) => {
        setSelectedDoc(doc);
        // Initialize access list from doc
        const currentAccess = doc.role_access.map(a => ({
            role_id: a.role_id,
            permission_type: a.permission_type
        }));
        setRoleAccessList(currentAccess);
    };

    const toggleRoleAccess = (roleId, currPermission) => {
        let newList = [...roleAccessList];
        const existingIdx = newList.findIndex(a => a.role_id === roleId);

        if (currPermission === 'none') {
            if (existingIdx >= 0) newList.splice(existingIdx, 1);
        } else {
            if (existingIdx >= 0) {
                newList[existingIdx].permission_type = currPermission;
            } else {
                newList.push({ role_id: roleId, permission_type: currPermission });
            }
        }
        setRoleAccessList(newList);
    };

    const saveAccess = async () => {
        try {
            const res = await fetch(`${API_URL}/files/${selectedDoc.id}/access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(roleAccessList)
            });

            if (res.ok) {
                setSelectedDoc(null);
                fetchData();
                alert("Access updated successfully");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">File Manager</h1>
                    <p className="text-slate-500 mt-1">Upload files, manage categories, and configure role-based access.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Left Column - Forms */}
                <div className="md:col-span-1 space-y-8">

                    {/* Upload Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <Upload className="mr-2 text-blue-600" size={20} />
                            Upload Document
                        </h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select File</label>
                                <input
                                    type="file"
                                    id="file-upload"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                >
                                    <option value="">-- No Category --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                                Upload File
                            </button>
                        </form>
                    </div>

                    {/* Category Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <FolderPlus className="mr-2 text-emerald-600" size={20} />
                            New Category
                        </h2>
                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder="e.g., HR Polices"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                                Create Category
                            </button>
                        </form>

                        <div className="mt-6 border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-bold text-slate-500 mb-3">Manage Categories</h3>
                            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {categories.map(c => (
                                    <li key={c.id} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-slate-700 font-medium truncate">{c.name}</span>
                                        <button onClick={() => handleDeleteCategory(c.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete category">
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>

                {/* Right Column - Document List */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Managed Documents</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-slate-100 text-sm text-slate-500">
                                        <th className="px-6 py-3 font-medium">Filename</th>
                                        <th className="px-6 py-3 font-medium">Category</th>
                                        <th className="px-6 py-3 font-medium">Date</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {documents.map(doc => (
                                        <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-medium text-slate-800">{doc.original_name}</td>
                                            <td className="px-6 py-4 text-slate-500">{doc.category?.name || '-'}</td>
                                            <td className="px-6 py-4 text-slate-500">{new Date(doc.upload_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openAccessModal(doc)}
                                                    className="inline-flex items-center text-[#065590] hover:text-blue-800 bg-[#065590]/10 hover:bg-[#065590]/20 px-3 py-1.5 rounded-lg transition-colors mr-2"
                                                >
                                                    <Shield size={16} className="md:mr-1.5" /> <span className="hidden md:inline">Access</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="inline-flex items-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    title="Delete Document"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {documents.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No documents found. Upload one to get started.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            {/* Access Control Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">RBAC: {selectedDoc.original_name}</h3>
                                <p className="text-sm text-slate-500">Configure which roles can access this file.</p>
                            </div>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {roles.filter(r => r.name !== 'Admin').map(role => {
                                const currentSetting = roleAccessList.find(a => a.role_id === role.id)?.permission_type || 'none';

                                return (
                                    <div key={role.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                        <div className="font-medium text-slate-800">{role.name}</div>
                                        <div className="flex gap-2">
                                            <select
                                                className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-[#065590]"
                                                value={currentSetting}
                                                onChange={(e) => toggleRoleAccess(role.id, e.target.value)}
                                            >
                                                <option value="none">No Access</option>
                                                <option value="view_only">View Only</option>
                                                <option value="view_download">View & Download</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                            <p className="text-xs text-slate-400 mt-4">* Admins implicitly have full access to all files.</p>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedDoc(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveAccess}
                                className="px-4 py-2 bg-[#065590] hover:bg-blue-800 text-white rounded-lg font-medium transition-colors"
                            >
                                Save Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
