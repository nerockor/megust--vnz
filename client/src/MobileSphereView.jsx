import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// VIRTUAL TREADMILL SPHERE — Canvas 2D Implementation
// Réplica exacta del sistema Three.js original sin dependencia de WebGL.
// ════════════════════════════════════════════════════════════════════════════

// 1. PARÁMETROS FUNDAMENTALES (idénticos al original)
const COLS = 9;          // Columnas visibles (pool)
const ROWS = 13;         // Filas visibles (pool)
const SPACING = 0.045;   // Separación angular en radianes
const RADIUS = 600;      // Radio de la esfera
const ITEM_SIZE = 25.14; // Tamaño visual del bloque (176px en pantalla)
const FRICTION = 0.92;   // Fricción de inercia
const SNAP_SPEED = 0.15; // Velocidad de interpolación del encaje magnético
const SNAP_THRESHOLD = 0.002; // Umbral de velocidad para activar snap
const SNAP_DIST = 0.0005;     // Distancia para considerar "encajado"
const CAM_DISTANCE = 700;     // Distancia de la cámara (FOV simulado)
const TOUCH_SENSITIVITY = 0.0015; // Sensibilidad del gesto táctil

export default function MobileSphereView({ ads, imageObjects, hoveredAd, setHoveredAd, targetAd, setTargetAd, spinTrigger }) {
  const canvasRef = useRef(null);
  const [isSnapped, setIsSnapped] = useState(false);

  // ─── REFS mutables para 60fps sin re-renders ─────────────────────────────
  const scrollRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);
  const snappedRef = useRef(false);
  const lastHoveredId = useRef(null);
  const imgCacheRef = useRef({}); // Canvas-ready image cache

  // ─── Datos constantes de la cuadrícula (pool de 117 bloques) ─────────────
  const totalWidth = COLS * SPACING;
  const totalHeight = ROWS * SPACING;
  const halfWidth = totalWidth / 2;
  const halfHeight = totalHeight / 2;

  const effectiveAds = useMemo(() => {
    if (ads && ads.length > 0) return ads;
    return [{ id: 'fallback', name: 'Espacio Disponible', url: '#', description: 'Tu negocio aquí' }];
  }, [ads]);

  // ─── Pre-cargar imágenes como objetos Image ──────────────────────────────
  useEffect(() => {
    effectiveAds.forEach(ad => {
      if (imageObjects[ad.id] && !imgCacheRef.current[ad.id]) {
        // imageObjects[ad.id] puede ser un HTMLImageElement o tener .src
        const src = imageObjects[ad.id].src || imageObjects[ad.id];
        if (typeof src === 'string') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = src;
          imgCacheRef.current[ad.id] = img;
        } else if (imageObjects[ad.id] instanceof HTMLImageElement) {
          imgCacheRef.current[ad.id] = imageObjects[ad.id];
        }
      }
    });
  }, [effectiveAds, imageObjects]);

  // ─── A. Spin Trigger (giro cinematográfico) ──────────────────────────────
  useEffect(() => {
    if (spinTrigger > 0) {
      velocityRef.current.x = (Math.random() > 0.5 ? 1 : -1) * 0.8;
      velocityRef.current.y = (Math.random() > 0.5 ? 1 : -1) * 0.8;
      isDragging.current = false;
      if (setTargetAd) setTargetAd(null);
    }
  }, [spinTrigger, setTargetAd]);

  // ─── Resize canvas al tamaño real del contenedor ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // BUCLE PRINCIPAL DE ANIMACIÓN (60fps vía requestAnimationFrame)
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      // ── Limpiar ──
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // ════════════════════════════════════════════════════════════════════
      // B. SISTEMA DE CINTA DE CORRER — GPS Snap
      // ════════════════════════════════════════════════════════════════════
      if (targetAd && !isDragging.current) {
        const adIndex = effectiveAds.findIndex(a => a.id === targetAd.id);
        if (adIndex !== -1) {
          let tgtTheta = 0, tgtPhi = 0, found = false;
          for (let r = -5; r <= 5; r++) {
            for (let c = -5; c <= 5; c++) {
              const hash = Math.abs(r * 31 + c * 17);
              if (hash % effectiveAds.length === adIndex) {
                tgtTheta = -c * SPACING;
                tgtPhi = -r * SPACING;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          if (found) {
            scrollRef.current.x += (tgtTheta - scrollRef.current.x) * 0.1;
            scrollRef.current.y += (tgtPhi - scrollRef.current.y) * 0.1;
            velocityRef.current.x = 0;
            velocityRef.current.y = 0;
            const dist = Math.abs(tgtTheta - scrollRef.current.x) + Math.abs(tgtPhi - scrollRef.current.y);
            if (dist < 0.001 && setTargetAd) setTargetAd(null);
          }
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // C. FÍSICA DE INERCIA Y ENCAJE MAGNÉTICO
      // ════════════════════════════════════════════════════════════════════
      if (!isDragging.current && !targetAd) {
        // Solo aplicar velocidad si es significativa para evitar drift microscópico
        if (Math.abs(velocityRef.current.x) > 0.0001 || Math.abs(velocityRef.current.y) > 0.0001) {
          scrollRef.current.x += velocityRef.current.x;
          scrollRef.current.y += velocityRef.current.y;
          velocityRef.current.x *= FRICTION;
          velocityRef.current.y *= FRICTION;
        } else {
          velocityRef.current.x = 0;
          velocityRef.current.y = 0;
        }

        // ── D. ENCAJE MAGNÉTICO (Snap to Grid) ──
        if (Math.abs(velocityRef.current.x) < SNAP_THRESHOLD && Math.abs(velocityRef.current.y) < SNAP_THRESHOLD) {
          const snapX = Math.round(scrollRef.current.x / SPACING) * SPACING;
          const snapY = Math.round(scrollRef.current.y / SPACING) * SPACING;
          
          const dx = snapX - scrollRef.current.x;
          const dy = snapY - scrollRef.current.y;

          if (Math.abs(dx) > SNAP_DIST || Math.abs(dy) > SNAP_DIST) {
            scrollRef.current.x += dx * SNAP_SPEED;
            scrollRef.current.y += dy * SNAP_SPEED;
            if (snappedRef.current) {
              snappedRef.current = false;
              setIsSnapped(false);
            }
          } else {
            // Ya está encajado perfectamente
            scrollRef.current.x = snapX;
            scrollRef.current.y = snapY;
            if (!snappedRef.current) {
              snappedRef.current = true;
              setIsSnapped(true);
            }
          }
        } else {
          if (snappedRef.current) {
            snappedRef.current = false;
            setIsSnapped(false);
          }
        }
      }
 else if (isDragging.current) {
        if (snappedRef.current) {
          snappedRef.current = false;
          setIsSnapped(false);
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // A. GEOMETRÍA ESFÉRICA — Calcular posiciones de todos los bloques
      // ════════════════════════════════════════════════════════════════════
      const tiles = [];
      let closestDist = Infinity;
      let centerAd = null;

      for (let i = 0; i < COLS * ROWS; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);

        let theta = (col - Math.floor(COLS / 2)) * SPACING + scrollRef.current.x;
        let phi = (row - Math.floor(ROWS / 2)) * SPACING + scrollRef.current.y;

        // ── B. WRAPPING — Cinta de correr infinita ──
        let wrapX = 0, wrapY = 0;
        while (theta > halfWidth) { theta -= totalWidth; wrapX++; }
        while (theta < -halfWidth) { theta += totalWidth; wrapX--; }
        while (phi > halfHeight) { phi -= totalHeight; wrapY++; }
        while (phi < -halfHeight) { phi += totalHeight; wrapY--; }

        // ── Hash determinista para asignar contenido ──
        const globalCol = col - wrapX * COLS;
        const globalRow = row - wrapY * ROWS;
        const hash = Math.abs(globalRow * 31 + globalCol * 17);
        const adIndex = hash % effectiveAds.length;
        const ad = effectiveAds[adIndex];

        // ── Coordenadas esféricas a cartesianas ──
        const x3 = Math.sin(theta) * Math.cos(phi) * RADIUS;
        const y3 = Math.sin(phi) * RADIUS;
        const z3 = Math.cos(theta) * Math.cos(phi) * RADIUS;

        // ── Proyección de perspectiva ──
        const depth = CAM_DISTANCE - z3;
        if (depth <= 0) continue; // Detrás de la cámara
        const scale = CAM_DISTANCE / depth;
        const screenX = W / 2 + x3 * scale;
        const screenY = H / 2 - y3 * scale;
        const screenSize = ITEM_SIZE * scale;

        // ── Brillo basado en profundidad ──
        const normalizedZ = (z3 + RADIUS) / (2 * RADIUS);
        const brightness = Math.max(0.1, Math.min(1, normalizedZ * normalizedZ * 1.5));

        // ── Detectar bloque más cercano al centro ──
        const distToCenter = Math.abs(theta) + Math.abs(phi);
        if (distToCenter < closestDist) {
          closestDist = distToCenter;
          centerAd = ad;
        }

        tiles.push({ screenX, screenY, screenSize, brightness, z3, ad, distToCenter });
      }

      // ── Ordenar de atrás hacia adelante (painter's algorithm) ──
      tiles.sort((a, b) => a.z3 - b.z3);

      // ════════════════════════════════════════════════════════════════════
      // RENDERIZADO DE BLOQUES
      // ════════════════════════════════════════════════════════════════════
      tiles.forEach(tile => {
        const { screenX, screenY, screenSize, brightness, z3, ad, distToCenter } = tile;
        const half = screenSize / 2;

        // Ocultar bloques muy detrás de la esfera
        if (z3 < -RADIUS * 0.3) return;

        const isCenterTile = distToCenter < SPACING / 2;

        ctx.save();
        ctx.globalAlpha = brightness;

        // ── Dibujar imagen o placeholder gris ──
        const img = imgCacheRef.current[ad.id];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, screenX - half, screenY - half, screenSize, screenSize);
        } else {
          const gv = Math.round(50 * brightness);
          ctx.fillStyle = `rgb(${gv + 15}, ${gv + 15}, ${gv + 15})`;
          ctx.fillRect(screenX - half, screenY - half, screenSize, screenSize);
        }

        // ── Borde del bloque ──
        if (isCenterTile) {
          ctx.strokeStyle = `rgba(200, 200, 200, ${brightness})`;
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.18})`;
          ctx.lineWidth = 0.6;
        }
        ctx.strokeRect(screenX - half, screenY - half, screenSize, screenSize);

        // ── Nombre del comercio en el bloque central ──
        if (isCenterTile && screenSize > 15) {
          const labelH = Math.max(14, screenSize * 0.28);
          // Fondo semitransparente
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = '#000';
          ctx.fillRect(screenX - half, screenY + half - labelH, screenSize, labelH);
          // Texto
          ctx.globalAlpha = brightness;
          ctx.fillStyle = '#fff';
          ctx.font = `900 ${Math.max(7, screenSize * 0.13)}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = (ad.name || 'COMERCIO').substring(0, 16).toUpperCase();
          ctx.fillText(label, screenX, screenY + half - labelH / 2);
        }

        ctx.restore();
      });

      // ── Notificar bloque central seleccionado ──
      if (centerAd && closestDist < SPACING / 2) {
        if (lastHoveredId.current !== centerAd.id) {
          lastHoveredId.current = centerAd.id;
          setHoveredAd(centerAd);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [effectiveAds, targetAd, setTargetAd, setHoveredAd, setIsSnapped]);

  // ════════════════════════════════════════════════════════════════════════
  // C. CAPTURA DE GESTOS — Touch / Mouse
  // ════════════════════════════════════════════════════════════════════════
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    velocityRef.current = { x: 0, y: 0 };
    const p = e.touches ? e.touches[0] : e;
    lastPointer.current = { x: p.clientX, y: p.clientY };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastPointer.current.x;
    const dy = p.clientY - lastPointer.current.y;

    // El dedo añade VELOCIDAD, no mueve directamente
    const sx = dx * TOUCH_SENSITIVITY;
    const sy = dy * TOUCH_SENSITIVITY;
    scrollRef.current.x += sx;
    scrollRef.current.y += sy;
    velocityRef.current.x = sx;
    velocityRef.current.y = sy;

    lastPointer.current = { x: p.clientX, y: p.clientY };
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '80%',
      backgroundColor: '#000', overflow: 'hidden', touchAction: 'none', zIndex: 0
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />

      {/* ── D. CUADRO CENTRAL INTELIGENTE (Feedback visual de snap) ── */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '176px', height: '176px',
        border: isSnapped ? '3px solid #9ca3af' : '3px solid rgba(255,255,255,0.1)',
        backgroundColor: isSnapped ? 'rgba(156, 163, 175, 0.2)' : 'transparent',
        pointerEvents: 'none', zIndex: 20,
        boxShadow: isSnapped ? '0 0 30px rgba(156, 163, 175, 0.6)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />

      {/* ── VIÑETA RADIAL (profundidad visual) ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 10,
        background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.9) 80%, #000 100%)'
      }} />
    </div>
  );
}
