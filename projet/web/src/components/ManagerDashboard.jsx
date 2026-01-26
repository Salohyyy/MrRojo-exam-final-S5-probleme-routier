import React, { useState, useEffect } from 'react';
import { Download, Upload, Filter, Edit, Send, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { reportsAPI, adminAPI, utilsAPI } from '../services/api';
import '../assets/managerDashBoard.css';

const ManagerDashboard = () => {
    const [reports, setReports] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [syncStats, setSyncStats] = useState({ downloaded: 0, uploaded: 0 });
    const [syncMessage, setSyncMessage] = useState('');

    const [formData, setFormData] = useState({
        surface: '',
        budget: '',
        companyId: '',
        reportStatusId: '',
        progress: 0
    });

    // Charger les données au montage et lors du changement de filtre
    useEffect(() => {
        loadReports();
    }, [filter]);

    useEffect(() => {
        loadCompanies();
        loadStatuses();
    }, []);

    const loadReports = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.getAllReports(filter);
            setReports(response.data);
        } catch (error) {
            console.error('Erreur chargement reports:', error);
            showMessage('Erreur lors du chargement des signalements', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadCompanies = async () => {
        try {
            const response = await utilsAPI.getCompanies();
            setCompanies(response.data);
        } catch (error) {
            console.error('Erreur chargement entreprises:', error);
        }
    };

    const loadStatuses = async () => {
        try {
            const response = await utilsAPI.getReportStatuses();
            setStatuses(response.data);
        } catch (error) {
            console.error('Erreur chargement statuts:', error);
        }
    };

    const showMessage = (message, type = 'success') => {
        setSyncMessage({ text: message, type });
        setTimeout(() => setSyncMessage(''), 3000);
    };

    const handleDownloadFromFirebase = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.syncDownload();
            setSyncStats(prev => ({ ...prev, downloaded: response.data.count }));
            showMessage(`✓ ${response.data.count} signalements téléchargés depuis Firebase`, 'success');
            loadReports();
        } catch (error) {
            console.error('Erreur synchronisation download:', error);
            showMessage('✗ Erreur lors du téléchargement', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadToFirebase = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.uploadAllReports();
            setSyncStats(prev => ({ ...prev, uploaded: response.data.count }));
            showMessage(`✓ ${response.data.count} signalements envoyés vers Firebase`, 'success');
            loadReports();
        } catch (error) {
            console.error('Erreur synchronisation upload:', error);
            showMessage('✗ Erreur lors de l\'envoi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadSingleReport = async (reportId) => {
        try {
            await reportsAPI.uploadReport(reportId);
            showMessage('✓ Signalement envoyé avec succès', 'success');
            loadReports();
        } catch (error) {
            console.error('Erreur upload report:', error);
            showMessage('✗ Erreur lors de l\'envoi', 'error');
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
            await reportsAPI.updateReport(selectedReport.id, formData);
            showMessage('✓ Rapport mis à jour avec succès', 'success');
            setShowModal(false);
            loadReports();
        } catch (error) {
            console.error('Erreur mise à jour report:', error);
            showMessage('✗ Erreur lors de la mise à jour', 'error');
        }
    };

    const getStatusBadge = (report) => {
        if (report.sent_to_firebase) {
            return (
                <span className="status-badge badge-sent">
                    <CheckCircle size={12} /> Envoyé
                </span>
            );
        }
        if (report.sync_id) {
            return (
                <span className="status-badge badge-processed">
                    <AlertCircle size={12} /> Traité
                </span>
            );
        }
        return (
            <span className="status-badge badge-new">
                Nouveau
            </span>
        );
    };

    return (
        <div className="manager-dashboard">
            <div className="dashboard-container">
                {/* Header avec titre */}
                <div className="dashboard-header">
                    <h1 className="dashboard-title">
                        Dashboard Manager - Gestion des Signalements
                    </h1>

                    {/* Message de notification */}
                    {syncMessage && (
                        <div
                            className={`notification-message ${syncMessage.type === 'success'
                                    ? 'notification-success'
                                    : 'notification-error'
                                }`}
                        >
                            {syncMessage.text}
                        </div>
                    )}

                    {/* Boutons actions */}
                    <div className="action-buttons">
                        <button
                            onClick={handleDownloadFromFirebase}
                            disabled={loading}
                            className="action-button action-button-download"
                        >
                            <Download size={20} />
                            Télécharger depuis Firebase
                        </button>

                        <button
                            onClick={handleUploadToFirebase}
                            disabled={loading}
                            className="action-button action-button-upload"
                        >
                            <Upload size={20} />
                            Envoyer vers Firebase
                        </button>

                        <div className="stats-container">
                            <div className="stat-item stat-download">
                                <span className="stat-label">Téléchargés:</span>
                                <span className="stat-value">{syncStats.downloaded}</span>
                            </div>
                            <div className="stat-item stat-upload">
                                <span className="stat-label">Envoyés:</span>
                                <span className="stat-value">{syncStats.uploaded}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <div className="filter-section">
                    <div className="filter-container">
                        <Filter size={20} className="filter-icon" />
                        <span className="filter-label">Filtrer par:</span>
                        <div className="filter-buttons">
                            <button
                                onClick={() => setFilter('all')}
                                className={`filter-button ${filter === 'all' ? 'active filter-button-all' : ''}`}
                            >
                                Tous
                            </button>
                            <button
                                onClick={() => setFilter('not_sent')}
                                className={`filter-button ${filter === 'not_sent' ? 'active filter-button-not-sent' : ''}`}
                            >
                                Non envoyés
                            </button>
                            <button
                                onClick={() => setFilter('sent')}
                                className={`filter-button ${filter === 'sent' ? 'active filter-button-sent' : ''}`}
                            >
                                Envoyés
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table des signalements */}
                <div className="reports-table-container">
                    {loading ? (
                        <div className="loading-state">Chargement des signalements...</div>
                    ) : reports.length === 0 ? (
                        <div className="empty-state">Aucun signalement trouvé</div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="reports-table">
                                <thead className="table-header">
                                    <tr>
                                        <th>ID</th>
                                        <th>Date</th>
                                        <th>Ville</th>
                                        <th>Position</th>
                                        <th>Utilisateur</th>
                                        <th>Surface</th>
                                        <th>Budget</th>
                                        <th>Entreprise</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report) => (
                                        <tr key={report.id} className="table-row">
                                            <td className="table-cell table-cell-id">{report.id}</td>
                                            <td className="table-cell">
                                                {new Date(report.reported_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="table-cell">{report.city}</td>
                                            <td className="table-cell">
                                                <div className="location-info">
                                                    <MapPin size={14} />
                                                    <span className="location-coordinates">
                                                        {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="table-cell">{report.username || 'N/A'}</td>
                                            <td className="table-cell">{report.surface || '-'}</td>
                                            <td className="table-cell">
                                                {report.budget ? `${Number(report.budget).toLocaleString('fr-FR')} Ar` : '-'}
                                            </td>
                                            <td className="table-cell">{report.company_name || '-'}</td>
                                            <td className="table-cell">{getStatusBadge(report)}</td>
                                            <td className="table-cell">
                                                <div className="action-buttons-cell">
                                                    <button
                                                        onClick={() => handleEditReport(report)}
                                                        className="table-action-button edit-button"
                                                        title="Modifier"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {!report.sent_to_firebase && report.sync_id && (
                                                        <button
                                                            onClick={() => handleUploadSingleReport(report.id)}
                                                            className="table-action-button upload-button"
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

            {/* Modal de modification */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <h2 className="modal-title">Modifier le signalement #{selectedReport.id}</h2>

                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label">
                                    Surface (m²)
                                </label>
                                <input
                                    type="text"
                                    value={formData.surface}
                                    onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                                    className="form-input"
                                    placeholder="Ex: 100"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Budget (Ar)
                                </label>
                                <input
                                    type="number"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    className="form-input"
                                    placeholder="Ex: 5000000"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Entreprise
                                </label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">Sélectionner une entreprise</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Statut
                                </label>
                                <select
                                    value={formData.reportStatusId}
                                    onChange={(e) => setFormData({ ...formData, reportStatusId: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">Sélectionner un statut</option>
                                    {statuses.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Avancement (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.progress}
                                    onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="modal-buttons">
                            <button
                                onClick={handleSaveReport}
                                className="modal-button save-button"
                            >
                                Sauvegarder
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="modal-button cancel-button"
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