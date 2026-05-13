import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDrag } from '@use-gesture/react';

const COLS = 9;  // Columnas visibles
const ROWS = 13; // Filas visibles
const SPACING = 0.085; // Separación angular
const RADIUS = 600;
const ITEM_SIZE = 45;

function VirtualTreadmill({ ads, imageObjects, setHoveredAd, setIsSnapped, targetAd, setTargetAd, spinTrigger }) {
  const groupRef = useRef();
  
  // Estados físicos mutables para 60fps
  const scrollRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const snappedStateRef = useRef(false);
  
  // Generar la matriz fija de mallas una sola vez
  const meshData = useMemo(() => {
    const arr = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const baseTheta = (col - Math.floor(COLS / 2)) * SPACING;
      const basePhi = (row - Math.floor(ROWS / 2)) * SPACING;
      arr.push({ id: i, col, row, baseTheta, basePhi, currentAdIndex: -1 });
    }
    return arr;
  }, []);

  const totalWidth = COLS * SPACING;
  const totalHeight = ROWS * SPACING;
  const halfWidth = totalWidth / 2;
  const halfHeight = totalHeight / 2;

  // Cinematic Fast Spin Transition
  useEffect(() => {
    if (spinTrigger > 0) {
      // Inject high velocity in random diagonal direction
      velocityRef.current.x = (Math.random() > 0.5 ? 1 : -1) * 0.8;
      velocityRef.current.y = (Math.random() > 0.5 ? 1 : -1) * 0.8;
      isDragging.current = false; // Ensure it spins freely
      setTargetAd(null); // Cancel any active GPS snap
    }
  }, [spinTrigger, setTargetAd]);

  const effectiveAds = useMemo(() => {
    if (ads && ads.length > 0) return ads;
    // Fallback if no ads in this filter
    return [{ id: 'fallback', name: 'Espacio Disponible', url: '#', description: 'Tu negocio aquí' }];
  }, [ads]);

  useFrame(() => {
    if (!groupRef.current || effectiveAds.length === 0) return;

    // Lógica de Autocontrol / Snap GPS
    if (targetAd && !isDragging.current) {
      const adIndex = effectiveAds.findIndex(a => a.id === targetAd.id);
      if (adIndex !== -1) {
        // Encontrar la instancia más cercana en la cuadrícula infinita
        // Buscamos en un rango pequeño de la cuadrícula virtual alrededor del centro
        let targetTheta = 0;
        let targetPhi = 0;
        let found = false;

        // Buscamos el hash que coincida con nuestro adIndex
        // Para simplificar, buscamos en un radio de 5 tiles
        for (let r = -5; r <= 5; r++) {
          for (let c = -5; c <= 5; c++) {
            const hash = Math.abs(r * 31 + c * 17);
            if (hash % effectiveAds.length === adIndex) {
              targetTheta = -c * SPACING;
              targetPhi = -r * SPACING;
              found = true;
              break;
            }
          }
          if (found) break;
        }

        if (found) {
          // Interpolar suavemente hacia el objetivo
          scrollRef.current.x += (targetTheta - scrollRef.current.x) * 0.1;
          scrollRef.current.y += (targetPhi - scrollRef.current.y) * 0.1;
          velocityRef.current.x = 0;
          velocityRef.current.y = 0;

          const dist = Math.abs(targetTheta - scrollRef.current.x) + Math.abs(targetPhi - scrollRef.current.y);
          if (dist < 0.001) {
            setTargetAd(null); // Snap completado
          }
        }
      }
    } else if (!isDragging.current) {
      scrollRef.current.x += velocityRef.current.x;
      scrollRef.current.y += velocityRef.current.y;
      velocityRef.current.x *= 0.92; // Fricción
      velocityRef.current.y *= 0.92;

      // Encaje magnético (Snap to Grid)
      if (Math.abs(velocityRef.current.x) < 0.002 && Math.abs(velocityRef.current.y) < 0.002) {
        const targetX = Math.round(scrollRef.current.x / SPACING) * SPACING;
        const targetY = Math.round(scrollRef.current.y / SPACING) * SPACING;
        
        scrollRef.current.x += (targetX - scrollRef.current.x) * 0.15;
        scrollRef.current.y += (targetY - scrollRef.current.y) * 0.15;

        // Comprobar si estamos perfectamente encajados
        const distToSnap = Math.abs(targetX - scrollRef.current.x) + Math.abs(targetY - scrollRef.current.y);
        const currentlySnapped = distToSnap < 0.0005;
        
        if (currentlySnapped !== snappedStateRef.current) {
          snappedStateRef.current = currentlySnapped;
          setIsSnapped(currentlySnapped);
        }
      } else {
        if (snappedStateRef.current) {
          snappedStateRef.current = false;
          setIsSnapped(false);
        }
      }
    } else {
      if (snappedStateRef.current) {
        snappedStateRef.current = false;
        setIsSnapped(false);
      }
    }

    let closestDist = Infinity;
    let centerAd = null;

    const children = groupRef.current.children;
    
    meshData.forEach((data, i) => {
      let theta = data.baseTheta + scrollRef.current.x;
      let phi = data.basePhi + scrollRef.current.y;
      
      let wrapX = 0;
      while (theta > halfWidth) { theta -= totalWidth; wrapX++; }
      while (theta < -halfWidth) { theta += totalWidth; wrapX--; }
      
      let wrapY = 0;
      while (phi > halfHeight) { phi -= totalHeight; wrapY++; }
      while (phi < -halfHeight) { phi += totalHeight; wrapY--; }
      
      const globalCol = data.col - wrapX * COLS;
      const globalRow = data.row - wrapY * ROWS;
      
      const hash = Math.abs(globalRow * 31 + globalCol * 17);
      const adIndex = hash % effectiveAds.length;
      const ad = effectiveAds[adIndex];
      
      const x = Math.sin(theta) * Math.cos(phi) * RADIUS;
      const y = Math.sin(phi) * RADIUS;
      const z = Math.cos(theta) * Math.cos(phi) * RADIUS;
      
      const mesh = children[i];
      if (mesh && mesh.isMesh) {
        mesh.position.set(x, y, z);
        // Para que las imágenes no se vean invertidas (espejadas),
        // deben mirar hacia AFUERA de la esfera, no hacia el centro.
        mesh.lookAt(x * 2, y * 2, z * 2);
        
        if (data.currentAdIndex !== adIndex) {
          data.currentAdIndex = adIndex;
          const mat = mesh.material;
          
          if (imageObjects[ad.id]) {
            if (!mat.map || mat.map.image !== imageObjects[ad.id]) {
              const tex = new THREE.Texture(imageObjects[ad.id]);
              tex.colorSpace = THREE.SRGBColorSpace;
              mat.map = tex;
              mat.map.needsUpdate = true;
            }
            mat.color.setHex(0xffffff);
          } else {
            mat.map = null;
            mat.color.setHex(0x1e293b);
          }
          mat.needsUpdate = true;
        }

        const distToCenter = Math.abs(theta) + Math.abs(phi);
        if (distToCenter < closestDist) {
          closestDist = distToCenter;
          centerAd = ad;
        }
      }
    });

    if (centerAd && closestDist < (SPACING / 2)) {
      setHoveredAd(centerAd);
    }
  });

  const bind = useDrag(({ delta: [dx, dy], down, event }) => {
    event.stopPropagation();
    isDragging.current = down;
    if (down) {
      const sx = dx * 0.0015;
      const sy = dy * 0.0015;
      scrollRef.current.x += sx;
      scrollRef.current.y += sy;
      velocityRef.current.x = sx;
      velocityRef.current.y = sy;
    }
  }, { pointerEvents: true });

  return (
    <group ref={groupRef} {...bind()}>
      {meshData.map((data) => (
        <mesh key={data.id}>
          <planeGeometry args={[ITEM_SIZE, ITEM_SIZE]} />
          <meshBasicMaterial transparent side={THREE.DoubleSide} />
          {/* Borde sutil blanco */}
          <lineSegments>
            <edgesGeometry attach="geometry" args={[new THREE.PlaneGeometry(ITEM_SIZE, ITEM_SIZE)]} />
            <lineBasicMaterial attach="material" color="#ffffff" opacity={0.2} transparent />
          </lineSegments>
        </mesh>
      ))}
    </group>
  );
}

export default function MobileSphereView({ ads, imageObjects, hoveredAd, setHoveredAd, targetAd, setTargetAd, spinTrigger }) {
  const [isSnapped, setIsSnapped] = useState(false);
  const lastHoveredId = useRef(null);
  
  const handleHoveredAd = (ad) => {
    if (ad && lastHoveredId.current !== ad.id) {
      lastHoveredId.current = ad.id;
      setHoveredAd(ad);
    }
  };

  return (
    <div style={{ 
      position: 'absolute', top: 0, left: 0, width: '100%', height: '80%', 
      backgroundColor: '#000000', overflow: 'hidden', touchAction: 'none', zIndex: 0 
    }}>
      <Canvas camera={{ position: [0, 0, RADIUS + 100], fov: 90 }}>
        <VirtualTreadmill 
          ads={ads} 
          imageObjects={imageObjects} 
          setHoveredAd={handleHoveredAd} 
          setIsSnapped={setIsSnapped}
          targetAd={targetAd}
          setTargetAd={setTargetAd}
          spinTrigger={spinTrigger}
        />
      </Canvas>

      {/* Cuadro Central Inteligente (Solo se enciende si está encajado) */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '176px', height: '176px', 
        border: isSnapped ? '3px solid #9ca3af' : '3px solid rgba(255,255,255,0.1)', 
        backgroundColor: isSnapped ? 'rgba(156, 163, 175, 0.2)' : 'transparent',
        pointerEvents: 'none', zIndex: 20, 
        boxShadow: isSnapped ? '0 0 30px rgba(156, 163, 175, 0.6)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />

      {/* Viñeta */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 10,
        background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.9) 80%, #000 100%)'
      }} />
    </div>
  );
}
