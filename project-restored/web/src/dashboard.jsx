import React, { useState, useEffect } from 'react';
import { Download, Upload, Filter, Edit, Send, CheckCircle, AlertCircle, MapPin } from 'lucide-react';

const ManagerDashboard = () => {
    const [reports, setReports] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [syncStats, setSyncStats] = useState({ downloaded: 0, uploaded: 0 });

    const [formData, setFormData] = useState({
        surface: '',
        budget: '',
        companyId: '',
        reportStatusId: '',
        progress: 0
    });

    const API_URL = 'http://localhost:4000';
    const TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50aXR5dG9vbGtpdC5nb29nbGVhcGlzLmNvbS9nb29nbGUuaWRlbnRpdHkuaWRlbnRpdHl0b29sa2l0LnYxLklkZW50aXR5VG9vbGtpdCIsImlhdCI6MTc2ODY3OTYyOSwiZXhwIjoxNzY4NjgzMjI5LCJpc3MiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BzaWduYWwtOWIzYjkuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJzdWIiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BzaWduYWwtOWIzYjkuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJ1aWQiOiJwNlVhTUFHUk01V0hSRXhwaXBGYVRqbEY2R2syIn0.nEraqpJmt53K2sWvFaaaw8hO_v1S0SvBJmHjTq3_6pmdF6VlGC3GWXdF4wZA-EpdOXebRFJgAfp-ogYiGAOALR7rTCziE2kTjjt2nCdPWHnPliG_s4eTRxKKYJeUp9S7fI_yn_--6oH8nmfW3VFLxSqcXBAG_fUtegJKJkgmdyCciMsNOBrtqybAUAXjV6AJFkHhxLgenuurt16GADPXedl9NQrFhywhtFdiHfzL3OnPIpfe6530mTrOsPV3qtVV1FyZ1NacbOGB09AKZNDg1wcL40Hg6ublS6o687g12g51QHHz1Ak6ITifaKZnuDRlgZJJE3OeRtLAxpCcVN6SLQ';

    useEffect(() => {
        loadReports();
        loadCompanies();
        loadStatuses();
    }, [filter]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/reports/local?filter=${filter}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await response.json();
            setReports(data);
        } catch (error) {
            console.error('Erreur chargement reports:', error);
        }
        setLoading(false);
    };

    const loadCompanies = async () => {
        try {
            const response = await fetch(`${API_URL}/companies`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await response.json();
            setCompanies(data);
        } catch (error) {
            console.error('Erreur chargement entreprises:', error);
        }
    };

    const loadStatuses = async () => {
        try {
            const response = await fetch(`${API_URL}/report-statuses`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await response.json();
            setStatuses(data);
        } catch (error) {
            console.error('Erreur chargement statuts:', error);
        }
    };

    const handleDownloadFromFirebase = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/sync/download`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await response.json();
            setSyncStats(prev => ({ ...prev, downloaded: data.count }));
            alert(`${data.count} signalements téléchargés depuis Firebase`);
            loadReports();
        } catch (error) {
            console.error('Erreur synchronisation download:', error);
            alert('Erreur lors du téléchargement');
        }
        setLoading(false);
    };

    const handleUploadToFirebase = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/sync/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await response.json();
            setSyncStats(prev => ({ ...prev, uploaded: data.count }));
            alert(`${data.count} signalements envoyés vers Firebase`);
            loadReports();
        } catch (error) {
            console.error('Erreur synchronisation upload:', error);
            alert('Erreur lors de l\'envoi');
        }
        setLoading(false);
    };

    const handleUploadSingleReport = async (reportId) => {
        try {
            const response = await fetch(`${API_URL}/reports/local/${reportId}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await response.json();
            alert(data.message);
            loadReports();
        } catch (error) {
            console.error('Erreur upload report:', error);
            alert('Erreur lors de l\'envoi');
        }
    };

    const handleEditReport = (report) => {
        setSelectedReport(report);
        setFormData({
            surface: report.surface || '',
            budget: report.budget || '',
            companyId: report.company_id || '',
            reportStatusId: report.report_status_id || '',
            progress: report.progress || 0
        });
        setShowModal(true);
    };

    const handleSaveReport = async () => {
        try {
            const response = await fetch(`${API_URL}/reports/local/${selectedReport.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            alert(data.message);
            setShowModal(false);
            loadReports();
        } catch (error) {
            console.error('Erreur mise à jour report:', error);
            alert('Erreur lors de la mise à jour');
        }
    };

    const getStatusBadge = (report) => {
        if (report.sent_to_firebase) {
            return (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle size={12} /> Envoyé
                </span>
            );
        }
        if (report.sync_id) {
            return (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
                    <AlertCircle size={12} /> Traité
                </span>
            );
        }
        return (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Nouveau
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Dashboard Manager - Gestion des Signalements
                    </h1>

                    <div className="flex gap-4 flex-wrap">
                        <button
                            onClick={handleDownloadFromFirebase}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            <Download size={20} />
                            Télécharger depuis Firebase
                        </button>

                        <button
                            onClick={handleUploadToFirebase}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                        >
                            <Upload size={20} />
                            Envoyer vers Firebase
                        </button>

                        <div className="ml-auto flex gap-4 text-sm">
                            <div className="bg-blue-50 px-4 py-2 rounded-lg">
                                <span className="text-gray-600">Téléchargés:</span>
                                <span className="font-bold ml-2 text-blue-700">{syncStats.downloaded}</span>
                            </div>
                            <div className="bg-green-50 px-4 py-2 rounded-lg">
                                <span className="text-gray-600">Envoyés:</span>
                                <span className="font-bold ml-2 text-green-700">{syncStats.uploaded}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <span className="text-gray-700 font-medium">Filtrer par:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Tous
                            </button>
                            <button
                                onClick={() => setFilter('not_sent')}
                                className={`px-4 py-2 rounded-lg ${filter === 'not_sent' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Non envoyés
                            </button>
                            <button
                                onClick={() => setFilter('sent')}
                                className={`px-4 py-2 rounded-lg ${filter === 'sent' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Envoyés
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Chargement...</div>
                    ) : reports.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">Aucun signalement trouvé</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ville</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Position</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Utilisateur</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Surface</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Budget</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Entreprise</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm">{report.id}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {new Date(report.reported_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{report.city}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <MapPin size={14} />
                                                    {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{report.username || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm">{report.surface || '-'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {report.budget ? `${Number(report.budget).toLocaleString()} Ar` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{report.company_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {getStatusBadge(report)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditReport(report)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Modifier"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {!report.sent_to_firebase && report.sync_id && (
                                                        <button
                                                            onClick={() => handleUploadSingleReport(report.id)}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            title="Envoyer vers Firebase"
                                                        >
                                                            <Send size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Modifier le signalement #{selectedReport.id}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Surface (m²)
                                </label>
                                <input
                                    type="text"
                                    value={formData.surface}
                                    onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: 100 m²"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Budget (Ar)
                                </label>
                                <input
                                    type="number"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: 5000000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Entreprise
                                </label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Sélectionner une entreprise</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Statut
                                </label>
                                <select
                                    value={formData.reportStatusId}
                                    onChange={(e) => setFormData({ ...formData, reportStatusId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Sélectionner un statut</option>
                                    {statuses.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Avancement (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.progress}
                                    onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveReport}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                            >
                                Sauvegarder
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;