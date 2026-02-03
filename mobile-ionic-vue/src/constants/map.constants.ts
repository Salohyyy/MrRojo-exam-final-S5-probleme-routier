import { ProblemStyle } from '../types/report.types';

export const PROBLEM_STYLES: Record<string, ProblemStyle> = {
  '1': { color: '#e74c3c', fillColor: '#e74c3c', label: 'nid de poule' },
  '2': { color: '#e67e22', fillColor: '#e67e22', label: 'chaussée dégradée' },
  '3': { color: '#f1c40f', fillColor: '#f1c40f', label: 'lampadaires' },
  '4': { color: '#9b59b6', fillColor: '#9b59b6', label: 'fissure' },
  '5': { color: '#3498db', fillColor: '#3498db', label: 'glissement' }
};

export const DEFAULT_STYLE: ProblemStyle = { 
  color: '#2c3e50', 
  fillColor: '#2c3e50', 
  label: 'problème' 
};

export const MAP_CONFIG = {
  center: { lat: -18.8792, lng: 47.5079 },
  zoom: 12,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,
  attribution: '© OpenStreetMap'
};
