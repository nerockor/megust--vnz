import React, { useMemo } from 'react';
import './DesktopNetflixView.css';
import { ExternalLink, Star } from 'lucide-react';

const RUBROS = [
  'Celulares y Teléfonos', 'Computación', 'Electrodomésticos', 'Hogar, Muebles y Jardín',
  'Moda', 'Ferreteria', 'Deportes y Fitness', 'Juguetes y Bebés', 'Joyas y Relojes',
  'Instrumentos Musicales', 'Libros, Revistas y Comics', 'lavanderia', 'Repuestos de autos',
  'Gimnasio', 'Mascotas', 'supermercado', 'Productos de limpieza', 'Cafeteria',
  'Artículos de cocina', 'Calzado', 'Perfumeria', 'Reparaciones de celular',
  'Mudanzas y fletes', 'Instalación de electrodomésticos', 'peluqueria, Barberia',
  'Restaurante', 'Heladeria', 'Pintureria'
];

const DesktopNetflixView = ({ ads, onAdClick, featuredAd }) => {
  // Agrupar los anuncios por Rubro
  const groupedAds = useMemo(() => {
    if (!ads || ads.length === 0) return {};
    
    const groups = {};
    ads.forEach(ad => {
      const cat = ad.category || 'Otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ad);
    });
    return groups;
  }, [ads]);

  // Si no pasaron un featuredAd, seleccionamos uno aleatorio
  const heroAd = useMemo(() => {
    if (featuredAd) return featuredAd;
    if (ads && ads.length > 0) {
      return ads[Math.floor(Math.random() * ads.length)];
    }
    return null;
  }, [ads, featuredAd]);

  return (
    <div className="netflix-container">
      
      {/* Hero Banner (Anuncio Destacado) */}
      {heroAd && (
        <div 
          className="netflix-hero" 
          style={{ 
            backgroundImage: heroAd.image ? `url(${heroAd.image})` : 'none',
            backgroundColor: heroAd.image ? 'transparent' : '#333'
          }}
        >
          <div className="netflix-hero-overlay" />
          <div className="netflix-hero-content">
            <h1 className="netflix-hero-title">{heroAd.name}</h1>
            <p className="netflix-hero-desc">
              {heroAd.description || 'Visita este increíble negocio en nuestra plataforma y descubre todo lo que tiene para ofrecer.'}
            </p>
            <button 
              className="netflix-hero-btn" 
              onClick={() => onAdClick(heroAd)}
            >
              <ExternalLink size={20} />
              <span>Ver Detalles</span>
            </button>
          </div>
        </div>
      )}

      {/* Filas de Categorías (Carouseles) */}
      {RUBROS.map(rubro => {
        const rowAds = groupedAds[rubro];
        if (!rowAds || rowAds.length === 0) return null;

        return (
          <div key={rubro} className="netflix-row">
            <h2 className="netflix-row-title">{rubro}</h2>
            
            <div className="netflix-row-posters">
              {rowAds.map(ad => (
                <div 
                  key={ad.id} 
                  className="netflix-card"
                  onClick={() => onAdClick(ad)}
                >
                  {ad.image ? (
                    <img src={ad.image} alt={ad.name} className="netflix-card-img" loading="lazy" />
                  ) : (
                    <div className="netflix-card-placeholder">{ad.name?.substring(0,2)}</div>
                  )}
                  
                  {/* Info revelada en Hover */}
                  <div className="netflix-card-info">
                    <div className="netflix-card-title">{ad.name}</div>
                    <div className="netflix-card-meta">
                      <span>{ad.zona || ad.barrio}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Fila genérica para anuncios sin categoría válida */}
      {groupedAds['Otros'] && groupedAds['Otros'].length > 0 && (
        <div className="netflix-row">
          <h2 className="netflix-row-title">Más para descubrir</h2>
          <div className="netflix-row-posters">
            {groupedAds['Otros'].map(ad => (
              <div 
                key={ad.id} 
                className="netflix-card"
                onClick={() => onAdClick(ad)}
              >
                {ad.image ? (
                  <img src={ad.image} alt={ad.name} className="netflix-card-img" loading="lazy" />
                ) : (
                  <div className="netflix-card-placeholder">{ad.name?.substring(0,2)}</div>
                )}
                <div className="netflix-card-info">
                  <div className="netflix-card-title">{ad.name}</div>
                  <div className="netflix-card-meta">
                    <span>{ad.zona || ad.barrio}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Espacio extra al final para que se pueda hacer scroll bien */}
      <div style={{ height: '100px' }}></div>
      
    </div>
  );
};

export default DesktopNetflixView;
