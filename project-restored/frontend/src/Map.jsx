import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const Map = () => {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          antananarivo: {
            type: 'raster',
            tiles: [
              '/data/osm-2020-02-10-v3.11_madagascar_antananarivo/{z}/{x}/{y}.png'
            ],
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'antananarivo',
            type: 'raster',
            source: 'antananarivo'
          }
        ]
      },
      center: [47.5, -18.9],
      zoom: 12
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '500px' }}
    />
  );
};

export default Map;

