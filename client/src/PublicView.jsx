import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { ZoomIn, ZoomOut, Maximize, MapPin, Tag, Image as ImageIcon, ExternalLink, Phone, Mail, Filter, X, ChevronDown, Zap, Menu } from 'lucide-react';
import MobileSphereView from './MobileSphereView';

const CANVAS_SIZE = 1000;
const API_URL = '/api/ads';

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

const StarRating = ({ initialRating, count, onRate, readOnly = false }) => {
  const [hover, setHover] = useState(0);
  const [currentRating, setCurrentRating] = useState(initialRating);

  useEffect(() => {
    setCurrentRating(initialRating);
  }, [initialRating]);

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-row items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (hover || currentRating) >= star;
          return (
            <button
              key={star}
              disabled={readOnly}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentRating(star);
                if (onRate) onRate(star);
              }}
              onMouseEnter={() => !readOnly && setHover(star)}
              onMouseLeave={() => !readOnly && setHover(0)}
              className={`relative flex items-center justify-center transition-transform duration-200 ${
                readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-125'
              }`}
              style={{ width: '16px', height: '16px', padding: 0, border: 'none', background: 'transparent' }}
            >
              <Zap 
                size={14} 
                style={{
                  fill: active ? '#00e5ff' : '#1e293b',
                  color: active ? '#00e5ff' : '#1e293b',
                  filter: active ? 'drop-shadow(0 0 4px rgba(0,229,255,0.8))' : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PublicView = () => {
  const canvasRef = useRef(null);
  const [ads, setAds] = useState([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [hoveredAd, setHoveredAd] = useState(null);
  const [imageObjects, setImageObjects] = useState({});
  const [loadedImageIds, setLoadedImageIds] = useState(new Set());
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [featuredAd, setFeaturedAd] = useState(null);
  const [showIsland, setShowIsland] = useState(true);
  const [targetAd, setTargetAd] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBarrio, setSelectedBarrio] = useState(null);
  const [selectedZona, setSelectedZona] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [barrioFilterOpen, setBarrioFilterOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visitorData, setVisitorData] = useState(null);
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [adRating, setAdRating] = useState({ avg: 0, count: 0 });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteAdIds, setFavoriteAdIds] = useState(new Set());

  const fetchFavorites = async () => {
    if (!visitorData?.id) return;
    try {
      const res = await axios.get(`/api/visitors/${visitorData.id}/ratings`);
      const ids = new Set(res.data.map(r => r.ad_id));
      setFavoriteAdIds(ids);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (hoveredAd) {
      axios.get(`/api/ads/${hoveredAd.id}/rating`)
        .then(res => setAdRating(res.data))
        .catch(() => setAdRating({ avg: 0, count: 0 }));
    } else {
      setAdRating({ avg: 0, count: 0 });
    }
  }, [hoveredAd]);

  const handleRate = async (score) => {
    if (!isLoggedIn || !visitorData) {
      setAuthModalMode('login');
      return;
    }
    try {
      await axios.post(`/api/ads/${hoveredAd.id}/rate`, { 
        visitor_id: visitorData.id, 
        score 
      });
      // Refresh rating
      const res = await axios.get(`/api/ads/${hoveredAd.id}/rating`);
      setAdRating(res.data);
    } catch (err) {
      console.error('Error al calificar:', err);
    }
  };

  useEffect(() => {
    const safeAds = Array.isArray(ads) ? ads : [];
    if (safeAds.length > 0 && !featuredAd) {
      const activeAds = safeAds.filter(a => a.expiration_date ? new Date(a.expiration_date) > new Date() : true);
      const listToPick = activeAds.length > 0 ? activeAds : safeAds;
      const randomAd = listToPick[Math.floor(Math.random() * listToPick.length)];
      
      axios.post(`${API_URL}/batch`, { ids: [randomAd.id] }).then(res => {
        if (res.data.length > 0) {
          setFeaturedAd({ ...randomAd, image: res.data[0].image });
        }
      });
    }
  }, [ads, featuredAd]);

  useEffect(() => {
    fetchMetadata();
    fetchCategories();
    handleResize();
    window.addEventListener('resize', handleResize);

    const savedVisitor = localStorage.getItem('visitorData');
    if (savedVisitor) {
      try {
        setVisitorData(JSON.parse(savedVisitor));
        setIsLoggedIn(true);
      } catch(e) {}
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
      @keyframes marqueeRight {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .marquee-text {
        display: inline-block;
        padding-left: 100%;
        animation: marqueeRight 15s linear infinite;
        white-space: nowrap;
        font-weight: 900;
        text-transform: uppercase;
        color: #94a3b8;
        font-size: 14px;
        letter-spacing: 1px;
      }
      @keyframes rotateCyber {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .cyber-btn {
        position: relative;
        overflow: hidden;
        background: #101010;
        color: #c9c9c9;
        border: 1px solid rgba(201, 201, 201, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
        z-index: 1;
      }
      .cyber-btn.active::before {
        content: '';
        position: absolute;
        top: -150%;
        left: -50%;
        width: 200%;
        height: 400%;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          #00e5ff 90deg,
          #ffc400 180deg,
          #ff0055 270deg,
          transparent 360deg
        );
        animation: rotateCyber 3s linear infinite;
        z-index: -2;
      }
      .cyber-btn.active::after {
        content: '';
        position: absolute;
        inset: 2px;
        background: #101010;
        border-radius: inherit;
        z-index: -1;
      }
      .cyber-btn.active {
        color: #fff;
        background: transparent;
        border-color: transparent;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
      }
      .main-header {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        width: 340px;
        height: 55px;
        display: grid;
        grid-template-columns: 55px 1fr 55px;
        align-items: center;
        border-radius: 12px;
        overflow: hidden;
        background: transparent;
        border: 1px solid rgba(201, 201, 201, 0.2);
        box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
      }
      .main-header::before {
        content: '';
        position: absolute;
        top: -150%;
        left: -50%;
        width: 200%;
        height: 400%;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          #00e5ff 90deg,
          #ffc400 180deg,
          #ff0055 270deg,
          transparent 360deg
        );
        animation: rotateCyber 3s linear infinite;
        z-index: -2;
      }
      .main-header::after {
        content: '';
        position: absolute;
        inset: 2px;
        background: #101010;
        border-radius: 10px;
        z-index: -1;
      }
      .header-logo {
        width: 24px;
        height: 24px;
        object-fit: contain;
        justify-self: center;
        z-index: 2;
        filter: drop-shadow(0 0 8px rgba(148, 163, 184, 0.3));
      }
      .header-title {
        font-family: 'Josefin Sans', sans-serif;
        font-weight: 700;
        font-size: 24px;
        color: #f1f5f9;
        letter-spacing: 0.05em;
        line-height: 1;
        margin: 0;
        text-align: center;
        white-space: nowrap;
        z-index: 2;
      }
      .is-posta-font {
        font-family: 'Pacifico', cursive;
        font-size: 1.4em;
        display: inline-block;
        margin-top: 5px;
      }
      .menu-btn {
        width: 55px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #f1f5f9;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
        position: relative;
        gap: 6px;
      }
      .menu-btn:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .menu-btn-container {
        display: flex;
        align-items: center;
        padding-left: 5px;
        z-index: 10;
      }
      .isotype-icon {
        width: 20px;
        height: 20px;
        filter: drop-shadow(0 0 5px rgba(148, 163, 184, 0.5));
      }
      .user-drawer {
        position: fixed;
        top: 0;
        left: 0;
        width: 280px;
        height: 100%;
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(20px);
        z-index: 2000;
        transform: translateX(-100%);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        padding: 60px 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .user-drawer.open {
        transform: translateX(0);
      }
      .drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s ease;
      }
      .drawer-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .drawer-item {
        padding: 15px 20px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: #f1f5f9;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .drawer-item:hover {
        background: rgba(71, 85, 105, 0.2);
        border-color: rgba(71, 85, 105, 0.4);
      }
      .modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
        z-index: 3000; display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .modal-content {
        background: #101010; border: 1px solid #334155; border-radius: 16px;
        width: 100%; max-width: 400px; padding: 24px; color: white;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .modal-input {
        width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        color: white; font-size: 14px;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleResize = () => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scale = winW / CANVAS_SIZE;
    setTransform({
      scale,
      x: (winW - CANVAS_SIZE * scale) / 2,
      y: (winH - CANVAS_SIZE * scale) / 2
    });
  };

  const fetchMetadata = async () => {
    try {
      const res = await axios.get(API_URL);
      setAds(res.data);
    } catch (err) {
      console.error('Error fetching metadata', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const fetchVisibleImages = useCallback(async () => {
    const safeAds = Array.isArray(ads) ? ads : [];
    if (safeAds.length === 0 || isFetchingBatch) return;

    let visibleUnloaded = [];

    if (isMobile) {
      // En móvil, como los anuncios rotan en la esfera, simplemente cargamos los que falten por lotes
      visibleUnloaded = safeAds.filter(ad => !loadedImageIds.has(ad.id)).slice(0, 50);
    } else {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const minX = -transform.x / transform.scale;
      const minY = -transform.y / transform.scale;
      const maxX = (rect.width - transform.x) / transform.scale;
      const maxY = (rect.height - transform.y) / transform.scale;

      // Encontrar anuncios en el viewport que no tengan imagen cargada
      visibleUnloaded = safeAds.filter(ad => 
        ad.x + ad.width >= minX && ad.x <= maxX &&
        ad.y + ad.height >= minY && ad.y <= maxY &&
        !loadedImageIds.has(ad.id)
      ).slice(0, 50);
    }

    if (visibleUnloaded.length === 0) return;

    setIsFetchingBatch(true);
    try {
      const ids = visibleUnloaded.map(ad => ad.id);
      const res = await axios.post(`${API_URL}/batch`, { ids });
      
      const newImages = { ...imageObjects };
      const newLoadedIds = new Set(loadedImageIds);

      res.data.forEach(item => {
        if (item.image) {
          const img = new Image();
          img.src = item.image;
          img.onload = () => {
            setImageObjects(prev => ({ ...prev, [item.id]: img }));
          };
        }
        newLoadedIds.add(item.id);
      });

      setLoadedImageIds(newLoadedIds);
    } catch (err) {
      console.error('Error fetching images batch', err);
    } finally {
      setIsFetchingBatch(false);
    }
  }, [ads, transform, loadedImageIds, isFetchingBatch, imageObjects]);

  // Run lazy loader when transform or ads change
  useEffect(() => {
    const timer = setTimeout(fetchVisibleImages, 200);
    return () => clearTimeout(timer);
  }, [transform, ads, fetchVisibleImages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 0.5;
    
    // 1. Draw all background ads (the grid squares)
    const validAds = Array.isArray(ads) ? ads : [];
    const filteredAds = validAds.filter(ad => {
      let isFilteredOut = (selectedCategory && ad.category !== selectedCategory) || 
                           (selectedBarrio && ad.barrio !== selectedBarrio) ||
                           (selectedZona && ad.zona !== selectedZona);
      
      if (showFavoritesOnly && !favoriteAdIds.has(ad.id)) {
        isFilteredOut = true;
      }
      
      return !isFilteredOut;
    });

    filteredAds.forEach(ad => {
      if (ad.id === hoveredAd?.id) return;
      
      const img = imageObjects[ad.id];
      const isFilteredOut = (selectedCategory && ad.category !== selectedCategory) || 
                           (selectedBarrio && ad.barrio !== selectedBarrio);

      if (img) {
        if (isFilteredOut) {
          ctx.filter = 'grayscale(100%) brightness(0.2)';
        } else {
          ctx.filter = 'none';
        }
        ctx.drawImage(img, ad.x, ad.y, ad.width, ad.height);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = isFilteredOut ? '#333333' : '#9ca3af';
        ctx.fillRect(ad.x, ad.y, ad.width, ad.height);
      }
    });

      // 2. Draw hovered ad with zoom effect on top
    if (hoveredAd) {
      const cx = hoveredAd.x + hoveredAd.width / 2;
      const cy = hoveredAd.y + hoveredAd.height / 2;
      
      // Dynamic zoom: 5x multiplier.
      // 10x10 -> 50x50
      // 20x20 -> 100x100
      // 50x50 -> 250x250
      const targetSize = Math.max(50, hoveredAd.width * 5);
      
      const hx = cx - targetSize / 2;
      const hy = cy - targetSize / 2;

      ctx.save();
      let isFilteredOut = (selectedCategory && hoveredAd.category !== selectedCategory) || 
                           (selectedBarrio && hoveredAd.barrio !== selectedBarrio) ||
                           (selectedZona && hoveredAd.zona !== selectedZona);
      
      if (showFavoritesOnly && !favoriteAdIds.has(hoveredAd.id)) {
        isFilteredOut = true;
      }

      if (!isFilteredOut) {
        ctx.shadowColor = '#9ca3af';
        ctx.shadowBlur = 30 / transform.scale;
        ctx.filter = 'none';
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10 / transform.scale;
        ctx.filter = 'grayscale(100%) brightness(0.2)';
      }

      const img = imageObjects[hoveredAd.id];
      if (img) {
        ctx.drawImage(img, hx, hy, targetSize, targetSize);
      } else {
        ctx.fillStyle = isFilteredOut ? '#333333' : '#cbd5e1';
        ctx.fillRect(hx, hy, targetSize, targetSize);
      }
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / transform.scale;
      ctx.strokeRect(hx, hy, targetSize, targetSize);
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2 / transform.scale;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  }, [ads, transform, hoveredAd, imageObjects, selectedCategory, selectedBarrio, selectedZona]);

  const handleWhatsAppClick = async (e) => {
    if (e) e.preventDefault();
    if (!hoveredAd || !hoveredAd.phone) return;
    
    if (!isLoggedIn) {
      setAuthModalMode('login');
      return;
    }

    try {
      await axios.post(`/api/visitors/${visitorData.id}/click`, { ad_id: hoveredAd.id, ad_name: hoveredAd.name });
    } catch (err) {
      console.error('Error logging click', err);
    }

    const cleanPhone = hoveredAd.phone.replace(/\D/g, '');
    const msg = encodeURIComponent("Hola, te vi en el Elkilombo de Buenos Aires y quería consultar por...");
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (authModalMode === 'register' && !acceptedTerms) {
      setAuthError('Debes aceptar los Términos y Condiciones');
      return;
    }

    try {
      const endpoint = authModalMode === 'login' ? '/api/visitors/login' : '/api/visitors/register';
      const res = await axios.post(endpoint, authForm);
      
      if (authModalMode === 'register') {
        // Auto-login after register
        const loginRes = await axios.post('/api/visitors/login', { email: authForm.email, password: authForm.password });
        setVisitorData(loginRes.data.visitor);
        localStorage.setItem('visitorData', JSON.stringify(loginRes.data.visitor));
        setIsLoggedIn(true);
        setAuthModalMode(null);
      } else {
        setVisitorData(res.data.visitor);
        localStorage.setItem('visitorData', JSON.stringify(res.data.visitor));
        setIsLoggedIn(true);
        setAuthModalMode(null);
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Error de conexión');
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      
      setTransform(prev => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const limitX = winW - CANVAS_SIZE * prev.scale;
        const limitY = winH - CANVAS_SIZE * prev.scale;

        return { 
          ...prev, 
          x: prev.scale * CANVAS_SIZE < winW ? (winW - CANVAS_SIZE * prev.scale) / 2 : Math.min(0, Math.max(newX, limitX)),
          y: prev.scale * CANVAS_SIZE < winH ? (winH - CANVAS_SIZE * prev.scale) / 2 : Math.min(0, Math.max(newY, limitY))
        };
      });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;
    
    const safeAds = Array.isArray(ads) ? ads : [];
    const found = safeAds.find(ad => 
      mouseX >= ad.x && mouseX <= ad.x + ad.width &&
      mouseY >= ad.y && mouseY <= ad.y + ad.height
    );
    setHoveredAd(found || null);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    
    // Min scale ensures it at least fills the width or height
    const minScale = Math.max(winW / CANVAS_SIZE, winH / CANVAS_SIZE);
    const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, minScale), 10);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const canvasMouseX = (mouseX - transform.x) / transform.scale;
    const canvasMouseY = (mouseY - transform.y) / transform.scale;
    
    let nextX = mouseX - canvasMouseX * newScale;
    let nextY = mouseY - canvasMouseY * newScale;

    // Constrain pan on zoom
    const limitX = winW - CANVAS_SIZE * newScale;
    const limitY = winH - CANVAS_SIZE * newScale;

    setTransform({
      scale: newScale,
      x: newScale * CANVAS_SIZE < winW ? (winW - CANVAS_SIZE * newScale) / 2 : Math.min(0, Math.max(nextX, limitX)),
      y: newScale * CANVAS_SIZE < winH ? (winH - CANVAS_SIZE * newScale) / 2 : Math.min(0, Math.max(nextY, limitY))
    });
  };

  const handleClick = () => {
    if (hoveredAd) {
      window.open(hoveredAd.url.startsWith('http') ? hoveredAd.url : `https://${hoveredAd.url}`, '_blank');
    }
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-[#1a1a1a] select-none"
      onMouseDown={!isMobile ? handleMouseDown : undefined}
      onMouseMove={!isMobile ? handleMouseMove : undefined}
      onMouseUp={!isMobile ? handleMouseUp : undefined}
      onWheel={!isMobile ? handleWheel : undefined}
      onClick={!isMobile ? handleClick : undefined}
      style={{ cursor: isMobile ? 'default' : (isDragging ? 'grabbing' : (hoveredAd ? 'pointer' : 'grab')) }}
    >
      {/* Menú Lateral (Drawer) */}
      <div className={`drawer-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <div className={`user-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="flex flex-col items-center text-center gap-3 mb-8 px-2">
          <img src="/favicon.svg" alt="logo" className="w-16 h-16 mb-2" />
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
              {isLoggedIn && visitorData?.name ? visitorData.name : (isLoggedIn ? 'Usuario' : 'Bienvenido')}
            </h2>
            {isLoggedIn && (
              <p className="text-slate-400 text-xs mt-3 leading-relaxed font-medium">
                Ya eres parte. de los mejores locales que hacen que Venezuela sea única. Todo lo que aparece acá
              </p>
            )}
          </div>
        </div>
        
        {isLoggedIn ? (
          <>
            <button className="drawer-item" onClick={() => setMenuOpen(false)}>
              <Zap size={18} className="text-slate-400" />
              <span>Mi Cuenta</span>
            </button>
            <button className="drawer-item" onClick={() => { 
              if (showFavoritesOnly) {
                setShowFavoritesOnly(false);
              } else {
                fetchFavorites();
                setShowFavoritesOnly(true);
              }
              setMenuOpen(false); 
            }}>
              <Tag size={18} className={showFavoritesOnly ? "text-emerald-400" : "text-slate-400"} />
              <span>{showFavoritesOnly ? 'Ver Todos' : 'Mis Favoritos'}</span>
            </button>
            <button className="drawer-item" onClick={() => setMenuOpen(false)}>
              <Mail size={18} className="text-slate-400" />
              <span>Mensajes</span>
            </button>
            
            <div className="mt-auto pt-8 border-t border-white/5">
              <button className="drawer-item w-full bg-red-500/10 border-red-500/20 text-red-400" onClick={() => {
                setIsLoggedIn(false);
                setVisitorData(null);
                localStorage.removeItem('visitorData');
                setMenuOpen(false);
              }}>
                <X size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="drawer-item bg-slate-600/20 border-slate-500/30 text-slate-300" onClick={() => { setAuthModalMode('login'); setMenuOpen(false); }}>
              <span>Logearse</span>
            </button>
            <button className="drawer-item bg-emerald-600/20 border-emerald-500/30 text-emerald-300" onClick={() => { setAuthModalMode('register'); setMenuOpen(false); }}>
              <span>Registrarse</span>
            </button>
          </>
        )}
      </div>

      {/* Auth Modal */}
      {authModalMode && (
        <div className="modal-overlay">
          <div className="modal-content relative pointer-events-auto">
            <button onClick={() => setAuthModalMode(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
            <h2 className="text-xl font-black text-center mb-6 uppercase tracking-widest">{authModalMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h2>
            
            {authError && <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs p-3 rounded mb-4 text-center">{authError}</div>}
            
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              {authModalMode === 'register' && (
                <>
                  <input className="modal-input" placeholder="Nombre completo" value={authForm.name} onChange={e=>setAuthForm({...authForm, name: e.target.value})} required />
                  <input className="modal-input" placeholder="Teléfono" type="tel" value={authForm.phone} onChange={e=>setAuthForm({...authForm, phone: e.target.value})} required />
                </>
              )}
              <input className="modal-input" placeholder="Correo electrónico" type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm, email: e.target.value})} required />
              <input className="modal-input" placeholder="Contraseña" type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm, password: e.target.value})} required />
              
              {authModalMode === 'register' && (
                <div className="flex items-center gap-2 mt-2 mb-4">
                  <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} className="accent-slate-500" />
                  <label htmlFor="terms" className="text-xs text-slate-400">
                    Acepto los <span className="text-slate-400 cursor-pointer underline" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>Términos y Condiciones</span>
                  </label>
                </div>
              )}
              
              <button type="submit" className="w-full py-3 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-black uppercase tracking-wider transition-colors mt-2">
                {authModalMode === 'login' ? 'Ingresar' : 'Registrarme'}
              </button>
            </form>
            
            <div className="mt-4 text-center text-xs text-slate-400">
              {authModalMode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <span className="text-slate-400 cursor-pointer underline" onClick={() => { setAuthModalMode(authModalMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                {authModalMode === 'login' ? 'Regístrate aquí' : 'Inicia Sesión'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content max-w-lg max-h-[80vh] flex flex-col relative">
            <h2 className="text-lg font-black text-center mb-4 text-slate-400">Términos y Condiciones de Uso y Política de Tratamiento de Datos</h2>
            <div className="flex-1 overflow-y-auto no-scrollbar text-xs text-slate-300 space-y-4 pr-2">
              <p><strong>1. Aceptación de las Condiciones de Servicio</strong><br/>El acceso y utilización de este sitio web (en adelante, "la Plataforma") atribuye la condición de Usuario, quien, mediante la navegación y/o interacción en el mismo, manifiesta su aceptación plena y sin reservas de las presentes cláusulas. El desconocimiento del contenido de estas condiciones no exime al Usuario de las responsabilidades derivadas de su aceptación técnica.</p>
              <p><strong>2. Consentimiento Informado y Finalidad del Tratamiento</strong><br/>De conformidad con el Art. 5 de la Ley 25.326, el Usuario presta su consentimiento expreso para que los datos recabados de forma directa o indirecta (mediante cookies, metadatos, registros de actividad o formularios) sean incorporados a una base de datos de titularidad privada.</p>
              <p>El tratamiento de dichos datos tendrá como finalidad principal y secundaria:<br/>- La optimización de algoritmos de segmentación conductual.<br/>- La explotación comercial y publicitaria de la información mediante perfiles de consumo.<br/>- La provisión de servicios de marketing directo y telemarketing por parte de la Plataforma o de terceros asociados.<br/>- La transferencia de activos digitales de información a socios comerciales de diversas industrias.</p>
              <p><strong>3. Cesión y Transferencia Internacional de Datos</strong><br/>El Usuario queda debidamente notificado de que sus datos personales podrán ser objeto de cesión a terceras empresas vinculadas al sector del marketing, la publicidad y el análisis de datos masivos (Big Data).<br/>Asimismo, se autoriza la transferencia internacional de datos a servidores ubicados en jurisdicciones que podrían no contar con niveles de protección equivalentes a los de la República Argentina, bajo las previsiones del Art. 12 de la Ley 25.326, con el único fin de garantizar la redundancia técnica y la eficiencia publicitaria.</p>
              <p><strong>4. Carácter No Obligatorio y Derechos ARCO</strong><br/>Si bien la entrega de datos no es obligatoria para la navegación básica, la negativa a suministrarlos o la revocación del consentimiento para su uso publicitario impedirá el acceso a las funciones personalizadas y beneficios de la Plataforma.<br/>El Usuario podrá ejercer sus derechos de Acceso, Rectificación, Actualización y Supresión (Derechos ARCO) mediante el envío de un correo electrónico a la dirección de contacto legal de la Plataforma, acreditando fehacientemente su identidad. No obstante, los datos utilizados de forma anonimizada para estadísticas publicitarias no estarán sujetos a supresión inmediata si han sido disociados del titular de forma irreversible.</p>
              <p><strong>5. Jurisdicción y Ley Aplicable</strong><br/>Para cualquier controversia derivada del presente documento, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero o jurisdicción. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.</p>
            </div>
            <button 
              onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }} 
              className="w-full mt-4 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-black uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Aceptar Términos
            </button>
          </div>
        </div>
      )}

      {/* Header Superior con Menú Hamburguesa e Isotipo */}
      <div className="main-header">
        <div className="menu-btn-container">
          <button className="menu-btn" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
            <img src="/favicon.svg" alt="isotype" className="isotype-icon" />
          </button>
        </div>
        <h1 className="header-title">MegustaVenezuela</h1>
        <div style={{ width: 55 }} /> {/* Espaciador para balancear */}
      </div>

      {isMobile ? (
        <MobileSphereView 
          ads={(Array.isArray(ads) ? ads : []).filter(a => {
            if (selectedCategory && a.category !== selectedCategory) return false;
            if (selectedBarrio && a.barrio !== selectedBarrio) return false;
            if (selectedZona && a.zona !== selectedZona) return false;
            return true;
          })} 
          imageObjects={imageObjects} 
          hoveredAd={hoveredAd} 
          setHoveredAd={setHoveredAd}
          targetAd={targetAd}
          setTargetAd={setTargetAd}
          spinTrigger={spinTrigger}
        />
      ) : (
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="absolute inset-0" />
      )}

      {/* Desktop Filters (Top Left) */}
      {!isMobile && (
        <div className="absolute top-5 left-5 z-[60] pointer-events-auto flex flex-col gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setFilterOpen(!filterOpen); setBarrioFilterOpen(false); }}
            className={`w-52 flex items-center justify-between px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-xl border shadow-lg ${
              selectedCategory
                ? 'bg-indigo-600/90 text-white border-indigo-400/40 shadow-indigo-600/30'
                : 'bg-slate-900/80 text-slate-300 border-white/10 shadow-black/20 hover:bg-slate-800/90 hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Filter size={14} />
              <span className="truncate">{selectedCategory || 'Filtrar Rubro'}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setBarrioFilterOpen(!barrioFilterOpen); setFilterOpen(false); }}
            className={`w-52 flex items-center justify-between px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-xl border shadow-lg ${
              selectedBarrio
                ? 'bg-emerald-600/90 text-white border-emerald-400/40 shadow-emerald-600/30'
                : 'bg-slate-900/80 text-slate-300 border-white/10 shadow-black/20 hover:bg-slate-800/90 hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MapPin size={14} />
              <span className="truncate">{selectedZona || selectedBarrio || 'Filtrar Ciudad'}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-300 ${barrioFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Dropdown Portals (Global - Center on mobile, Top-left on desktop) */}
      <div 
        onClick={() => { setFilterOpen(false); setBarrioFilterOpen(false); }}
        className={`fixed z-[100] pointer-events-none flex flex-col gap-3 transition-all duration-500 ${
        isMobile 
          ? 'hidden' 
          : 'top-5 left-5'
      } ${!isMobile && (filterOpen || barrioFilterOpen) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          
          {/* Rubro Dropdown Container */}
          <div className={`relative pointer-events-auto transition-all duration-300 ${
            filterOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 hidden'
          }`}>
            <div
              className={`w-80 max-h-[60vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/20 bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] p-5`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Seleccionar Rubro</h3>
                <button onClick={() => setFilterOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <button
                onClick={() => { setSelectedCategory(null); setFilterOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl mb-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  !selectedCategory
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-800'
                }`}
              >
                <span>Mostrar Todos</span>
                {!selectedCategory && <Filter size={12} />}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const arr = (Array.isArray(categories) && categories.length > 0) 
                    ? categories.map(cat => ({ id: cat.id, name: cat.name }))
                    : RUBROS.map((r, i) => ({ id: i, name: r }));
                  
                  return arr.map(item => {
                    const isActive = selectedCategory === item.name;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedCategory(isActive ? null : item.name); setFilterOpen(false); }}
                        className={`px-4 py-4 rounded-2xl text-[9px] font-black uppercase tracking-wide transition-all text-center border ${
                          isActive 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                            : 'bg-slate-800/30 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {item.name}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Barrio Dropdown Container */}
          <div className={`relative pointer-events-auto transition-all duration-300 ${
            barrioFilterOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 hidden'
          }`}>
            <div
              className={`w-80 max-h-[60vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/20 bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] p-5`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Seleccionar Ciudad</h3>
                <button onClick={() => setBarrioFilterOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <button
                onClick={() => { setSelectedBarrio(null); setSelectedZona(null); setBarrioFilterOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl mb-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  !selectedBarrio
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-800'
                }`}
              >
                <span>Cualquier Ciudad</span>
                {!selectedBarrio && <MapPin size={12} />}
              </button>

              {BARRIOS.map(b => {
                const isActive = selectedBarrio === b;
                return (
                  <button
                    key={b}
                    onClick={() => { 
                      if (isActive) {
                        setSelectedBarrio(null);
                        setSelectedZona(null);
                      } else {
                        setSelectedBarrio(b);
                        setSelectedZona(null);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all mb-1 ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' 
                        : 'bg-slate-800/30 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}

              {selectedBarrio && ZONAS_POR_CIUDAD[selectedBarrio] && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Seleccionar Zona en {selectedBarrio.split(' ')[0]}</h3>
                  <button
                    onClick={() => { setSelectedZona(null); setBarrioFilterOpen(false); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl mb-2 transition-all ${
                      !selectedZona
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800/50 text-slate-400 border border-white/5 hover:bg-slate-800'
                    }`}
                  >
                    <span>Cualquier Zona</span>
                    {!selectedZona && <MapPin size={12} />}
                  </button>
                  {ZONAS_POR_CIUDAD[selectedBarrio].map(z => {
                    const isZonaActive = selectedZona === z;
                    return (
                      <button
                        key={z}
                        onClick={() => { setSelectedZona(isZonaActive ? null : z); setBarrioFilterOpen(false); }}
                        className={`w-full text-left p-3 rounded-xl transition-all mb-1 ${
                          isZonaActive 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' 
                            : 'bg-slate-800/30 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {z}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Featured Ad — Bottom Center (Only Desktop) */}
      {!isMobile && showIsland && featuredAd && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[280px] glass-card border border-slate-500/30 shadow-[0_-10px_50px_-12px_rgba(100,116,139,0.3)] rounded-[24px] overflow-hidden flex flex-col pointer-events-auto transition-all duration-500 z-50" style={{ animation: 'slideUp 0.5s ease' }}>
          <button onClick={() => setShowIsland(false)} className="absolute top-2.5 right-2.5 p-1.5 bg-black/50 hover:bg-black/90 rounded-full text-white transition-colors z-10 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          
          <div className="h-[70px] bg-indigo-950 relative">
            {featuredAd.image ? <img src={featuredAd.image} className="w-full h-full object-cover opacity-90" alt="" /> : <div className="w-full h-full bg-indigo-600/20" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
            <div className="absolute top-2 left-3 px-2 py-0.5 bg-indigo-600/80 rounded-full text-[6px] font-black uppercase text-white tracking-widest backdrop-blur-sm">Destacado</div>
            {featuredAd.category && (
              <div className="absolute top-2 right-10 px-2 py-0.5 bg-emerald-600/80 rounded-full text-[6px] font-black uppercase text-white tracking-widest backdrop-blur-sm flex items-center gap-1">
                <Tag size={6} /> {featuredAd.category}
              </div>
            )}
          </div>
          
          <div className="bg-[#1a1a1a] p-3 cursor-pointer hover:bg-[#333333] transition-colors relative" onClick={() => window.open(featuredAd.url.startsWith('http') ? featuredAd.url : `https://${featuredAd.url}`, '_blank')}>
            <span className="text-[12px] text-white font-black uppercase leading-tight truncate block drop-shadow-md">{featuredAd.name || 'Anunciante'}</span>
            <span className="text-[9px] text-indigo-400 truncate block font-bold mt-0.5">{featuredAd.url}</span>
            
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {featuredAd.phone && (
                <span className="text-[8px] text-slate-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {featuredAd.phone}
                </span>
              )}
              {featuredAd.location && (
                <span className="text-[8px] text-indigo-300 flex items-center gap-1">
                  <MapPin size={8} /> {featuredAd.location}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RUBROS FLOTANTE */}
      {isMobile && filterOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            width: '90%', maxHeight: '75vh', backgroundColor: '#0f172a',
            borderRadius: '16px', border: '1px solid #334155', padding: '20px',
            overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out forwards'
          }}>
            <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Filter size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
              Seleccionar Rubro
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                onClick={() => {
                  setSelectedCategory(null);
                  setSpinTrigger(prev => prev + 1);
                  setFilterOpen(false);
                }} 
                className={`cyber-btn ${!selectedCategory ? 'active' : ''}`} 
                style={{ padding: '12px', fontSize: '10px', fontWeight: '900', borderRadius: '8px' }}
              >
                MOSTRAR TODOS
              </button>
              {(() => {
                const arr = (Array.isArray(categories) && categories.length > 0) 
                  ? categories.map(cat => ({ id: cat.id, name: cat.name }))
                  : RUBROS.map((r, i) => ({ id: i, name: r }));
                
                return arr.map(item => {
                  const isActive = selectedCategory === item.name;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { 
                        setSelectedCategory(isActive ? null : item.name); 
                        setSpinTrigger(prev => prev + 1);
                        setFilterOpen(false); 
                      }}
                      className={`cyber-btn ${isActive ? 'active' : ''}`}
                      style={{ padding: '12px', fontSize: '10px', fontWeight: '900', borderRadius: '8px' }}
                    >
                      {item.name.toUpperCase()}
                    </button>
                  );
                });
              })()}
            </div>
            <button 
              onClick={() => setFilterOpen(false)} 
              style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontWeight: '900', textTransform: 'uppercase', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE BARRIOS FLOTANTE */}
      {isMobile && barrioFilterOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            width: '90%', maxHeight: '75vh', backgroundColor: '#0f172a',
            borderRadius: '16px', border: '1px solid #334155', padding: '20px',
            overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out forwards'
          }}>
            <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <MapPin size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
              {selectedBarrio ? `Seleccionar Zona en ${selectedBarrio.split(' ')[0]}` : 'Seleccionar Ciudad'}
            </h2>
            {selectedBarrio && ZONAS_POR_CIUDAD[selectedBarrio] ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={() => { setSelectedZona(null); setBarrioFilterOpen(false); }}
                  className={`cyber-btn ${!selectedZona ? 'active' : ''}`} 
                  style={{ width: '100%', height: '45px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: !selectedZona ? '#fff' : '#94a3b8' }}
                >
                  Cualquier Zona
                </button>
                {ZONAS_POR_CIUDAD[selectedBarrio].map(z => (
                  <button 
                    key={z}
                    onClick={() => { setSelectedZona(z); setBarrioFilterOpen(false); }}
                    className={`cyber-btn ${selectedZona === z ? 'active' : ''}`} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: selectedZona === z ? '#fff' : '#94a3b8' }}
                  >
                    {z}
                  </button>
                ))}
                <button 
                  onClick={() => { setSelectedBarrio(null); setSelectedZona(null); }} 
                  style={{ marginTop: '10px', color: '#94a3b8', textDecoration: 'underline', background: 'none', border: 'none', padding: '10px', width: '100%' }}
                >
                  Volver a Ciudades
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  onClick={() => {
                    setSelectedBarrio(null);
                    setSelectedZona(null);
                    setSpinTrigger(prev => prev + 1);
                    setBarrioFilterOpen(false);
                  }} 
                  className={`cyber-btn ${!selectedBarrio ? 'active' : ''}`} 
                  style={{ padding: '12px', fontSize: '10px', fontWeight: '900', borderRadius: '8px' }}
                >
                  TODAS
                </button>
                {BARRIOS.map(b => (
                  <button 
                    key={b} 
                    onClick={() => {
                      setSelectedBarrio(b);
                      setSelectedZona(null);
                      setSpinTrigger(prev => prev + 1);
                      if (!ZONAS_POR_CIUDAD[b]) setBarrioFilterOpen(false);
                    }} 
                    className={`cyber-btn ${selectedBarrio === b ? 'active' : ''}`} 
                    style={{ padding: '12px', fontSize: '10px', fontWeight: '900', borderRadius: '8px' }}
                  >
                    {b.split(' ')[0].toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={() => setBarrioFilterOpen(false)} 
              style={{ marginTop: '20px', width: '100%', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontWeight: '900', textTransform: 'uppercase', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Side Details Panel (Only Desktop) */}
      {!isMobile && (
        <div className={`fixed z-[70] transition-all duration-500 transform top-20 right-6 w-72 ${hoveredAd ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          {hoveredAd && (
            <div className="glass-card overflow-hidden border border-indigo-500/30 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] h-full overflow-y-auto no-scrollbar rounded-[24px]">
              {/* Header / Category */}
              <div className="bg-indigo-600/20 px-4 py-2 border-b border-indigo-500/20 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Detalles</span>
                <div className="flex gap-1.5 overflow-hidden">
                  <span className="text-[8px] bg-indigo-500/40 text-white px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">{hoveredAd.category || 'General'}</span>
                  {hoveredAd.barrio && <span className="text-[8px] bg-emerald-500/40 text-white px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">{hoveredAd.barrio}</span>}
                  {hoveredAd.zona && <span className="text-[8px] bg-blue-500/40 text-white px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">{hoveredAd.zona}</span>}
                </div>
              </div>

              {/* Brand Logo / Name */}
              <div className="p-5 bg-gradient-to-b from-slate-950/50 to-transparent">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-slate-500/30 overflow-hidden flex-shrink-0 shadow-xl">
                    {imageObjects[hoveredAd.id] ? (
                      <img src={imageObjects[hoveredAd.id].src} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-950">
                        <ImageIcon className="text-indigo-800" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-white uppercase leading-tight truncate">{hoveredAd.name || 'ANUNCIANTE'}</h2>
                    <div className="flex items-center gap-1.5 text-indigo-400 mt-1">
                      <ExternalLink size={10} />
                      <span className="text-[10px] font-bold truncate">{hoveredAd.url}</span>
                    </div>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="space-y-3">
                  {hoveredAd.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Phone size={10} /> Teléfono</span>
                      <span className="text-[10px] font-black text-slate-200">{hoveredAd.phone}</span>
                    </div>
                  )}
                  {hoveredAd.email && (
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Mail size={10} /> Email</span>
                      <span className="text-[10px] font-black text-slate-200 truncate max-w-[120px]">{hoveredAd.email}</span>
                    </div>
                  )}
                  {hoveredAd.location && (
                    <div className="flex flex-col gap-1 py-2 border-b border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><MapPin size={10} /> Ubicación Física</span>
                      <span className="text-[10px] font-black text-indigo-300 italic">{hoveredAd.location}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Posición</span>
                      <span className="text-[10px] font-black text-white">X:{hoveredAd.x} Y:{hoveredAd.y}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Tamaño</span>
                      <span className="text-[10px] font-black text-white">{hoveredAd.width}x{hoveredAd.height}px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer / Expiration */}
              <div className="bg-[#1a1a1a]/80 p-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Estado</span>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">MAPA ACTIVO ✓</span>
                </div>
                {hoveredAd.expiration_date && (
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Expira</span>
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter underline decoration-red-400/30">{hoveredAd.expiration_date}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pure Inline CSS Mobile Bottom Bar (20% height) */}
      {isMobile && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '20%', backgroundColor: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'sans-serif' }}>
          
          {/* Detalles del anuncio */}
          <div style={{ flex: 1, padding: '10px 15px', overflowY: 'visible' }}>
            {hoveredAd ? (
               <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                 {imageObjects[hoveredAd.id] ? (
                    <img src={imageObjects[hoveredAd.id].src} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} alt="" />
                 ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }} />
                 )}
                 <div style={{ flex: 1.5, minWidth: 0 }}>
                   <h3 
                     onClick={() => {
                        if (hoveredAd.url && window.confirm(`¿Deseas visitar el sitio oficial de ${hoveredAd.name}?`)) {
                          window.open(hoveredAd.url.startsWith('http') ? hoveredAd.url : `https://${hoveredAd.url}`, '_blank');
                        }
                     }}
                     style={{ 
                       margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', 
                       whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
                       letterSpacing: '0.5px', color: '#9ca3af', cursor: 'pointer'
                     }}
                   >
                     {hoveredAd.name || 'ANUNCIANTE'}
                   </h3>
                   <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                     <span style={{ fontSize: '8px', backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '900', border: '1px solid rgba(99,102,241,0.3)' }}>
                       {hoveredAd.category || 'General'}
                     </span>
                     {hoveredAd.barrio && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '900', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                           {hoveredAd.zona ? `${hoveredAd.barrio} - ${hoveredAd.zona}` : hoveredAd.barrio}
                         </span>
                        </div>
                     )}
                   </div>
                 </div>

                 {/* Marquee Section (Espacio de noticias a la derecha) */}
                 <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '4px' }}>
                   <div style={{ width: '100%', overflow: 'hidden', position: 'relative', height: '18px', display: 'flex', alignItems: 'center' }}>
                     {hoveredAd.description ? (
                       <div className="marquee-text">
                         {hoveredAd.description}
                       </div>
                     ) : (
                       <div style={{ fontSize: '8px', color: '#334155', fontStyle: 'italic', textAlign: 'right', width: '100%' }}>
                         SIN DESCRIPCIÓN
                       </div>
                     )}
                   </div>
                   <StarRating 
                     initialRating={adRating.avg} 
                     count={adRating.count} 
                     onRate={handleRate}
                     readOnly={!isLoggedIn}
                   />
                 </div>
               </div>
            ) : (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '12px', gap: '8px' }}>
                  <MapPin size={14} /> Gira la esfera o usa GPS
               </div>
            )}
          </div>

          {/* Botonera de Acciones (Filtros y Mapa) */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px 15px 5px 15px', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#020617' }}>
            <button 
              onClick={() => { setFilterOpen(true); setBarrioFilterOpen(false); }}
              onTouchEnd={(e) => { e.preventDefault(); setFilterOpen(true); setBarrioFilterOpen(false); }}
              className={`cyber-btn ${selectedCategory ? 'active' : ''}`}
              style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9' }}
            >
              RUBRO: {selectedCategory || 'TODOS'}
            </button>
            <button 
              onClick={() => { setBarrioFilterOpen(true); setFilterOpen(false); }}
              onTouchEnd={(e) => { e.preventDefault(); setBarrioFilterOpen(true); setFilterOpen(false); }}
              className={`cyber-btn ${selectedBarrio ? 'active' : ''}`}
              style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9' }}
            >
              CIUDAD: {selectedZona || selectedBarrio || 'TODAS'}
            </button>
            <button 
              onClick={() => {
                if (hoveredAd && hoveredAd.location) {
                  const query = encodeURIComponent(`${hoveredAd.name} ${hoveredAd.location} ${hoveredAd.barrio || ''} Buenos Aires`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                } else {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(pos => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    let closest = null;
                    let minDist = Infinity;
                    const safeAds = Array.isArray(ads) ? ads : [];
                    safeAds.forEach(ad => {
                      if (ad.lat && ad.lng) {
                        const d = Math.sqrt(Math.pow(ad.lat - uLat, 2) + Math.pow(ad.lng - uLng, 2));
                        if (d < minDist) { minDist = d; closest = ad; }
                      }
                    });
                    if (closest) setTargetAd(closest);
                  });
                }
              }} 
              onTouchEnd={(e) => {
                e.preventDefault();
                if (hoveredAd && hoveredAd.location) {
                  const query = encodeURIComponent(`${hoveredAd.name} ${hoveredAd.location} ${hoveredAd.barrio || ''} Buenos Aires`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                } else {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(pos => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    let closest = null;
                    let minDist = Infinity;
                    const safeAds = Array.isArray(ads) ? ads : [];
                    safeAds.forEach(ad => {
                      if (ad.lat && ad.lng) {
                        const d = Math.sqrt(Math.pow(ad.lat - uLat, 2) + Math.pow(ad.lng - uLng, 2));
                        if (d < minDist) { minDist = d; closest = ad; }
                      }
                    });
                    if (closest) setTargetAd(closest);
                  });
                }
              }}
              className={`cyber-btn ${hoveredAd || targetAd ? 'active' : ''}`}
              style={{ flex: 1.2, height: '40px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', color: '#c9c9c9' }}
            >
              {hoveredAd ? <MapPin size={12} /> : null}
              {hoveredAd ? 'CÓMO LLEGAR' : 'MAPA / GPS'}
            </button>
          </div>

          {/* Botón de WhatsApp One-Click */}
          <div style={{ padding: '5px 15px 15px 15px', backgroundColor: '#020617' }}>
            <button 
              onClick={handleWhatsAppClick}
              onTouchEnd={handleWhatsAppClick}
              disabled={!hoveredAd}
              className={`cyber-btn ${hoveredAd ? 'active' : ''}`}
              style={{ 
                width: '100%', 
                height: '55px', 
                borderRadius: '12px', 
                fontSize: '14px', 
                fontWeight: '900', 
                color: '#c9c9c9',
                opacity: hoveredAd ? 1 : 0.5,
                cursor: hoveredAd ? 'pointer' : 'default'
              }}
            >
              <Phone size={20} /> 
              {hoveredAd ? 'CONSULTAR POR WHATSAPP' : 'SELECCIONA UN COMERCIO'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicView;
