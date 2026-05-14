import React, { useEffect, useState } from 'react';
import './DesktopSphereSplitView.css';
import MobileSphereView from './MobileSphereView';
import { MapPin, ExternalLink, Tag } from 'lucide-react';

export default function DesktopSphereSplitView({ 
  ads, 
  imageObjects, 
  hoveredAd, 
  setHoveredAd, 
  targetAd, 
  setTargetAd, 
  spinTrigger,
  // Props de Filtros
  selectedCategory,
  setSelectedCategory,
  selectedBarrio,
  setSelectedBarrio,
  selectedZona,
  setSelectedZona,
  filterOpen,
  setFilterOpen,
  barrioFilterOpen,
  setBarrioFilterOpen
}) {
  // Estado local para auto-rotación
  const [localSpinTrigger, setLocalSpinTrigger] = useState(0);

  // Auto-rotación eliminada a petición del usuario

  const currentHovered = hoveredAd;

  return (
    <div className="split-container">
      
      {/* Fondo borroso dinámico */}
      <div 
        className="split-bg-image"
        style={{
          backgroundImage: currentHovered && currentHovered.image ? `url(${currentHovered.image})` : 'none',
          backgroundColor: currentHovered && currentHovered.image ? 'transparent' : '#111'
        }}
      />

      {/* Panel Izquierdo (Información) */}
      <div className="split-left-panel">
        
        {/* Botonera de Filtros (Estilo Mobile) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', zIndex: 50 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setFilterOpen(!filterOpen); setBarrioFilterOpen(false); }}
            className={`cyber-btn ${selectedCategory ? 'active' : ''}`}
            style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            RUBRO: {selectedCategory ? selectedCategory.toUpperCase() : 'TODOS'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setBarrioFilterOpen(!barrioFilterOpen); setFilterOpen(false); }}
            className={`cyber-btn ${selectedBarrio ? 'active' : ''}`}
            style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            CIUDAD: {selectedZona ? selectedZona.toUpperCase() : (selectedBarrio ? selectedBarrio.split(' ')[0].toUpperCase() : 'TODAS')}
          </button>
        </div>

        {currentHovered ? (
          <div className="split-left-content" key={currentHovered.id}>
            <div className="split-ad-category">
              {currentHovered.category || 'Destacado'}
            </div>
            
            <h1 className="split-ad-title">
              {currentHovered.name || 'Comercio'}
            </h1>
            
            <p className="split-ad-desc">
              {currentHovered.description || 'Descubre los mejores productos y servicios que este negocio tiene para ofrecer en nuestra plataforma.'}
            </p>
            
            <div className="split-ad-meta">
              {(currentHovered.barrio || currentHovered.zona) && (
                <div className="split-meta-item">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{currentHovered.barrio || currentHovered.zona}</span>
                </div>
              )}
              {currentHovered.rubro && (
                <div className="split-meta-item">
                  <Tag size={16} className="text-gray-400" />
                  <span>{currentHovered.rubro}</span>
                </div>
              )}
            </div>
            
            <button 
              className="split-btn"
              onClick={() => setTargetAd(currentHovered)}
            >
              <ExternalLink size={20} />
              <span>Ver Detalles</span>
            </button>
          </div>
        ) : (
          <div className="split-empty-state">
            <h2 className="text-2xl font-bold text-white mb-2">Explora</h2>
            <p>Gira la esfera para descubrir negocios</p>
          </div>
        )}
      </div>

      {/* Panel Derecho (Esfera Interactiva) */}
      <div className="split-right-panel">
        <MobileSphereView 
          ads={ads}
          imageObjects={imageObjects}
          hoveredAd={hoveredAd}
          setHoveredAd={setHoveredAd}
          targetAd={targetAd}
          setTargetAd={setTargetAd}
          spinTrigger={spinTrigger > 0 ? spinTrigger : localSpinTrigger}
        />
      </div>

    </div>
  );
}
