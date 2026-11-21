// Web: cria um <canvas> e roda o three.js nele
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { PalcoProps } from './palcoTipos';

export default function Palco3D({ iniciar }: PalcoProps) {
  const caixa = useRef<View>(null);
  useEffect(() => {
    const host = caixa.current as unknown as HTMLElement;
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block'; canvas.style.touchAction = 'none';
    host.appendChild(canvas);
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const fraco = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const ctrl = iniciar(renderer, w, h, !fraco);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, fraco ? 1.25 : 2));
    renderer.setSize(w, h, false);
    let raf = 0, ultimo = performance.now();
    const loop = (t: number) => { const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t; ctrl.quadro(dt); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { const nw = host.clientWidth, nh = host.clientHeight; if (nw && nh) ctrl.redimensionar(nw, nh); });
    ro.observe(host);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); ctrl.destruir(); canvas.remove(); };
  }, []);
  return <View ref={caixa} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />;
}
