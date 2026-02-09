export class GeocodingService {
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`;
      const res = await fetch(url, { headers: { 'User-Agent': 'MrRojo-Mobile/1.0' } });
      const json = await res.json();
      const addr = json.address || {};
      return (
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        (json.display_name ? String(json.display_name).split(',')[0] : '')
      );
    } catch (e) {
      console.warn('Reverse geocoding failed', e);
      return '';
    }
  }
}

export const geocodingService = new GeocodingService();
