import { ProblemStyle } from '../types/report.types';
import { COLORS } from './theme.constants';

export const PROBLEM_STYLES: Record<string, ProblemStyle> = {
  '1': { color: '#FF385C', fillColor: '#FF385C', label: 'nid de poule', icon: '🕳️' },
  '2': { color: '#FC642D', fillColor: '#FC642D', label: 'chaussée dégradée', icon: '🚧' },
  '3': { color: '#FFDB58', fillColor: '#FFDB58', label: 'lampadaires', icon: '💡' },
  '4': { color: '#00A699', fillColor: '#00A699', label: 'fissure', icon: '⚡' },
  '5': { color: '#008080', fillColor: '#008080', label: 'glissement', icon: '⛰️' },
  '6': { color: '#4285F4', fillColor: '#4285F4', label: 'inondation', icon: '💧' }
};

export const DEFAULT_STYLE: ProblemStyle = { 
  color: '#484848', 
  fillColor: '#484848', 
  label: 'problème',
  icon: '⚠️'
};

export const MAP_CONFIG = {
  center: { lat: -18.8792, lng: 47.5079 },
  zoom: 12,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,
  attribution: '© OpenStreetMap'
};
