import React, { useEffect, useState } from 'react';
import './DesktopSphereSplitView.css';
import MobileSphereView from './MobileSphereView';
import { MapPin, ExternalLink, Tag, Filter, X, Phone } from 'lucide-react';

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
  setBarrioFilterOpen,
  searchQuery,
  setSearchQuery,
  categories,
  setSpinTrigger,
  featuredAd,
  showIsland,
  setShowIsland,
  isLoggedIn
}) {
  const currentHovered = hoveredAd;

  // Constantes de datos
  const RUBROS = [
    'Celulares y Teléfonos', 'Computación', 'Electrodomésticos', 'Hogar, Muebles y Jardín',
    'Moda', 'Ferreteria', 'Deportes y Fitness', 'Juguetes y Bebés', 'Joyas y Relojes',
    'Instrumentos Musicales', 'Libros, Revistas y Comics', 'lavanderia', 'Repuestos de autos',
    'Gimnasio', 'Mascotas', 'supermercado', 'Productos de limpieza', 'Cafeteria',
    'Artículos de cocina', 'Calzado', 'Perfumeria', 'Reparaciones de celular',
    'Mudanzas y fletes', 'Instalación de electrodomésticos', 'peluqueria, Barberia',
    'Restaurante', 'Heladeria', 'Pintureria'
  ];

  const ZONAS_POR_CIUDAD = {
    'La Guaira (La Guaira)': [
      'Catia La Mar', 'Maiquetía', 'Macuto', 'Caraballeda', 'Caribe', 
      'Tanaguarena', 'Camurí Chico', 'Naiguatá', 'Camurí Grande', 
      'Los Caracas', 'Playa Grande', 'Carayaca', 'Puerto Cruz', 
      'Chichiriviche', 'Oricao'
    ],
    'Distrito Capital (Caracas)': [
      'Propatria', 'Agua Salud', 'Capitolio', 'La Hoyada', 'Bellas Artes', 
      'Plaza Venezuela', 'Sabana Grande', 'Chacaíto', 'Chacao', 'Altamira', 
      'Miranda', 'Los Dos Caminos', 'Los Cortijos', 'Petare', 'Palo Verde',
      'La Paz', 'Artigas', 'Maternidad', 'El Silencio', 'Zona Rental'
    ],
    'Miranda (Los Teques)': [
      'Los Teques', 'San Antonio de los Altos', 'Guarenas', 'Guatire', 
      'Charallave', 'Cúa', 'Santa Teresa', 'Ocumare del Tuy', 
      'Higuerote', 'Río Chico', 'Baruta', 'El Hatillo'
    ],
    'Carabobo (Valencia)': [
      'Valencia', 'Puerto Cabello', 'Guacara', 'Mariara', 
      'San Joaquín', 'Naguanagua', 'San Diego', 'Morón'
    ],
    'Nueva Esparta (La Asunción)': [
      'Porlamar', 'Pampatar', 'La Asunción', 'Juan Griego', 'El Valle'
    ]
  };

  const BARRIOS = [
    'Distrito Capital (Caracas)',
    'Miranda (Los Teques)',
    'La Guaira (La Guaira)',
    'Carabobo (Valencia)',
    'Nueva Esparta (La Asunción)'
  ];

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
        
        {/* Frase Promo + Línea Animada */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ 
            color: '#64748b', 
            fontSize: '11px', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginBottom: '10px'
          }}>
            lo mejor de venezuela esta acá buscalo facil y rapido
          </p>
          <div style={{ 
            height: '2px', 
            width: '100%', 
            background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmerLine 3s linear infinite',
            borderRadius: '2px'
          }} />
        </div>

        {/* Buscador Inteligente Desktop */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <input 
            type="text"
            placeholder="Buscar por nombre, categoría o zona..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '0 45px 0 20px',
              color: 'white',
              fontSize: '15px',
              outline: 'none',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <Filter 
            size={20} 
            style={{ 
              position: 'absolute', 
              right: '18px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: searchQuery ? '#6366f1' : '#64748b',
              transition: 'all 0.3s ease'
            }} 
          />
        </div>

        {/* Botonera de Filtros con Popovers */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '2.5rem', position: 'relative', zIndex: 100 }}>
          
          {/* BOTON RUBRO + POPOVER */}
          <div style={{ flex: 1, position: 'relative' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setFilterOpen(!filterOpen); setBarrioFilterOpen(false); }}
              className={`cyber-btn ${selectedCategory ? 'active' : ''}`}
              style={{ width: '100%', height: '45px', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#c9c9c9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              RUBRO: {selectedCategory ? selectedCategory.toUpperCase() : 'TODOS'}
            </button>

            {filterOpen && (
              <div className="desktop-popover">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', padding: '10px' }}>
                  <button 
                    onClick={() => { setSelectedCategory(null); setSpinTrigger(prev => prev + 1); setFilterOpen(false); }}
                    className={`popover-item ${!selectedCategory ? 'active' : ''}`}
                  >
                    MOSTRAR TODOS
                  </button>
                  {(() => {
                    const arr = (Array.isArray(categories) && categories.length > 0) 
                      ? categories.map(cat => ({ id: cat.id, name: cat.name }))
                      : RUBROS.map((r, i) => ({ id: i, name: r }));
                    
                    return arr.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedCategory(selectedCategory === item.name ? null : item.name); setSpinTrigger(prev => prev + 1); setFilterOpen(false); }}
                        className={`popover-item ${selectedCategory === item.name ? 'active' : ''}`}
                      >
                        {item.name.toUpperCase()}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* BOTON CIUDAD + POPOVER */}
          <div style={{ flex: 1, position: 'relative' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setBarrioFilterOpen(!barrioFilterOpen); setFilterOpen(false); }}
              className={`cyber-btn ${selectedBarrio ? 'active' : ''}`}
              style={{ width: '100%', height: '45px', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#c9c9c9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              CIUDAD: {selectedZona ? selectedZona.toUpperCase() : (selectedBarrio ? selectedBarrio.split(' ')[0].toUpperCase() : 'TODAS')}
            </button>

            {barrioFilterOpen && (
              <div className="desktop-popover">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', padding: '10px' }}>
                  {selectedBarrio && ZONAS_POR_CIUDAD[selectedBarrio] ? (
                    <>
                      <button 
                        onClick={() => { setSelectedZona(null); setBarrioFilterOpen(false); }}
                        className={`popover-item ${!selectedZona ? 'active' : ''}`}
                      >
                        CUALQUIER ZONA
                      </button>
                      {ZONAS_POR_CIUDAD[selectedBarrio].map(z => (
                        <button 
                          key={z}
                          onClick={() => { setSelectedZona(z); setBarrioFilterOpen(false); }}
                          className={`popover-item ${selectedZona === z ? 'active' : ''}`}
                        >
                          {z.toUpperCase()}
                        </button>
                      ))}
                      <button 
                        onClick={() => { setSelectedBarrio(null); setSelectedZona(null); }} 
                        style={{ marginTop: '10px', color: '#94a3b8', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        VOLVER A CIUDADES
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setSelectedBarrio(null); setSelectedZona(null); setSpinTrigger(prev => prev + 1); setBarrioFilterOpen(false); }}
                        className={`popover-item ${!selectedBarrio ? 'active' : ''}`}
                      >
                        TODAS
                      </button>
                      {BARRIOS.map(b => (
                        <button 
                          key={b}
                          onClick={() => { setSelectedBarrio(b); setSelectedZona(null); setSpinTrigger(prev => prev + 1); if (!ZONAS_POR_CIUDAD[b]) setBarrioFilterOpen(false); }}
                          className={`popover-item ${selectedBarrio === b ? 'active' : ''}`}
                        >
                          {b.split(' ')[0].toUpperCase()}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
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

            {/* Isla de Información (Solo Logueados) */}
            {isLoggedIn && showIsland && featuredAd && (
              <div 
                className="glass-card" 
                style={{ 
                  marginTop: '2rem',
                  width: '100%',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  position: 'relative',
                  animation: 'fadeIn 0.5s ease'
                }}
              >
                <button 
                  onClick={() => setShowIsland(false)} 
                  style={{ 
                    position: 'absolute', top: '10px', right: '10px', 
                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', 
                    width: '20px', height: '20px', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                  }}
                >
                  <X size={12} />
                </button>
                
                <div style={{ height: '60px', position: 'relative' }}>
                  {featuredAd.image ? (
                    <img src={featuredAd.image} style={{ width: '100%', height: '100%', objectCover: 'cover', opacity: 0.8 }} alt="" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(99, 102, 241, 0.2)' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f172a, transparent)' }} />
                  <div style={{ position: 'absolute', top: '10px', left: '15px', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.8)', borderRadius: '20px', fontSize: '8px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Destacado
                  </div>
                </div>

                <div style={{ padding: '15px', backgroundColor: '#0f172a' }}>
                  <h3 style={{ fontSize: '14px', color: 'white', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>{featuredAd.name}</h3>
                  <p style={{ fontSize: '10px', color: '#6366f1', margin: '2px 0 10px 0', fontWeight: '700' }}>{featuredAd.url}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {featuredAd.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '10px' }}>
                        <Phone size={12} /> {featuredAd.phone}
                      </div>
                    )}
                    {featuredAd.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '10px' }}>
                        <MapPin size={12} /> {featuredAd.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
          spinTrigger={spinTrigger}
        />
      </div>

    </div>
  );
}
