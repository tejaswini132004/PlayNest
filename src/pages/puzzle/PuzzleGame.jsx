import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PuzzleGame.css';

// ─────────────────────────────────────────
// DRAW BUILT-IN SCENES WITH CANVAS
// ─────────────────────────────────────────
function drawScene(sceneId) {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 400;
  const c = canvas.getContext('2d');
  const W = 400, H = 400;

  const scenes = {
    0: () => { // 🦁 Savanna Sunset
      const sky = c.createLinearGradient(0,0,0,H*0.65);
      sky.addColorStop(0,'#FF6B35'); sky.addColorStop(0.5,'#FFD700'); sky.addColorStop(1,'#FF8C42');
      c.fillStyle=sky; c.fillRect(0,0,W,H*0.65);
      c.fillStyle='#FFF176'; c.beginPath(); c.arc(W/2,H*0.32,60,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,255,255,0.25)'; c.beginPath(); c.arc(W/2,H*0.32,78,0,Math.PI*2); c.fill();
      const gnd=c.createLinearGradient(0,H*0.62,0,H); gnd.addColorStop(0,'#8B6914'); gnd.addColorStop(1,'#5D4037');
      c.fillStyle=gnd; c.fillRect(0,H*0.62,W,H*0.38);
      c.fillStyle='#2E1A00';
      c.fillRect(70,H*0.38,14,H*0.32); c.beginPath(); c.arc(77,H*0.35,38,0,Math.PI*2); c.fill();
      c.fillRect(W-100,H*0.42,11,H*0.28); c.beginPath(); c.arc(W-94,H*0.39,28,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(W/2,H*0.78,28,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(W/2+30,H*0.74,20,0,Math.PI*2); c.fill();
      c.fillStyle='#8B5E00'; c.beginPath(); c.arc(W/2+30,H*0.74,14,0,Math.PI*2); c.fill();
    },
    1: () => { // 🌸 Flower Garden
      const sky=c.createLinearGradient(0,0,0,H*0.6); sky.addColorStop(0,'#87CEEB'); sky.addColorStop(1,'#E0F7FA');
      c.fillStyle=sky; c.fillRect(0,0,W,H);
      c.fillStyle='white';
      [[80,55,45],[190,42,38],[310,60,42]].forEach(([x,y,r])=>{
        c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
        c.beginPath();c.arc(x+35,y+6,r*0.8,0,Math.PI*2);c.fill();
        c.beginPath();c.arc(x-28,y+10,r*0.7,0,Math.PI*2);c.fill();
      });
      c.fillStyle='#4CAF50'; c.fillRect(0,H*0.58,W,H*0.42);
      c.fillStyle='#66BB6A'; c.fillRect(0,H*0.55,W,H*0.07);
      const fl=[[55,H*0.55,'#F44336'],[110,H*0.52,'#E91E63'],[165,H*0.54,'#FF9800'],
        [220,H*0.51,'#FFEB3B'],[275,H*0.53,'#9C27B0'],[330,H*0.52,'#F44336'],
        [40,H*0.63,'#FF9800'],[95,H*0.61,'#E91E63'],[150,H*0.60,'#FFEB3B'],
        [205,H*0.63,'#F44336'],[260,H*0.61,'#9C27B0'],[315,H*0.62,'#FF9800']];
      fl.forEach(([x,y,col])=>{
        c.strokeStyle='#2E7D32'; c.lineWidth=2.5; c.beginPath(); c.moveTo(x,y+38); c.lineTo(x,y+12); c.stroke();
        c.fillStyle=col;
        for(let a=0;a<5;a++){const px=x+Math.cos(a*72*Math.PI/180)*13,py=y+Math.sin(a*72*Math.PI/180)*13;c.beginPath();c.arc(px,py,9,0,Math.PI*2);c.fill();}
        c.fillStyle='#FFF176'; c.beginPath(); c.arc(x,y,8,0,Math.PI*2); c.fill();
      });
    },
    2: () => { // 🌊 Ocean Waves
      const sky=c.createLinearGradient(0,0,0,H*0.48); sky.addColorStop(0,'#1565C0'); sky.addColorStop(1,'#42A5F5');
      c.fillStyle=sky; c.fillRect(0,0,W,H*0.48);
      c.fillStyle='#FFF9C4'; c.beginPath(); c.arc(W*0.82,H*0.18,38,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,249,196,0.2)'; c.beginPath(); c.arc(W*0.82,H*0.18,56,0,Math.PI*2); c.fill();
      const sea=c.createLinearGradient(0,H*0.48,0,H); sea.addColorStop(0,'#0288D1'); sea.addColorStop(0.5,'#0277BD'); sea.addColorStop(1,'#01579B');
      c.fillStyle=sea; c.fillRect(0,H*0.48,W,H*0.52);
      [[H*0.5,0.9],[H*0.57,0.7],[H*0.63,0.85],[H*0.7,0.6],[H*0.77,0.75]].forEach(([y,a])=>{
        c.strokeStyle=`rgba(255,255,255,${a})`; c.lineWidth=3.5; c.beginPath(); c.moveTo(0,y);
        for(let x=0;x<=W;x+=25) c.quadraticCurveTo(x+12,y-15,x+25,y); c.stroke();
      });
      c.fillStyle='rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(0,H*0.5);
      for(let x=0;x<=W;x+=25) c.quadraticCurveTo(x+12,H*0.46,x+25,H*0.5);
      c.lineTo(W,H*0.58); c.lineTo(0,H*0.58); c.fill();
      c.strokeStyle='#1A237E'; c.lineWidth=2;
      [[65,H*0.22],[105,H*0.18],[145,H*0.24],[260,H*0.15],[310,H*0.2]].forEach(([x,y])=>{
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+10,y-8,x+20,y);c.stroke();
      });
    },
    3: () => { // 🌲 Enchanted Forest
      const sky=c.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#0D1B2A'); sky.addColorStop(0.4,'#1B3A4B'); sky.addColorStop(1,'#0A1628');
      c.fillStyle=sky; c.fillRect(0,0,W,H);
      c.fillStyle='#FFFDE7'; c.beginPath(); c.arc(W*0.78,H*0.14,32,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,253,231,0.12)'; c.beginPath(); c.arc(W*0.78,H*0.14,48,0,Math.PI*2); c.fill();
      c.fillStyle='white';
      [[50,38,3],[90,20,2],[150,42,2.5],[220,28,2],[290,18,3],[350,35,2]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();});
      [[20,0,'#1B4020',55,H],[75,10,'#1E5025',44,H],[195,0,'#1B4020',55,H],[250,15,'#245A2A',42,H],[330,5,'#1E5025',48,H]].forEach(([x,y,col,w,h])=>{
        c.fillStyle='#1A0A00'; c.fillRect(x+w/2-7,y+h*0.45,14,h*0.6);
        c.fillStyle=col;
        c.beginPath();c.moveTo(x+w/2,y);c.lineTo(x+w,y+h*0.42);c.lineTo(x,y+h*0.42);c.closePath();c.fill();
        c.fillStyle=col==='#1B4020'?'#215226':'#2A6830';
        c.beginPath();c.moveTo(x+w/2,y+h*0.18);c.lineTo(x+w,y+h*0.6);c.lineTo(x,y+h*0.6);c.closePath();c.fill();
        c.beginPath();c.moveTo(x+w/2,y+h*0.36);c.lineTo(x+w,y+h*0.8);c.lineTo(x,y+h*0.8);c.closePath();c.fill();
      });
      c.fillStyle='#FFFF8D';
      [[90,H*0.28],[140,H*0.22],[195,H*0.32],[245,H*0.18],[280,H*0.26],[150,H*0.4],[310,H*0.35]].forEach(([x,y])=>{
        c.beginPath();c.arc(x,y,3.5,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(255,255,141,0.25)'; c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.fill();
        c.fillStyle='#FFFF8D';
      });
    },
    4: () => { // 🌅 Sunset Mountain
      const sky=c.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#2D0057'); sky.addColorStop(0.25,'#7B0099'); sky.addColorStop(0.5,'#E91E63'); sky.addColorStop(0.75,'#FF5722'); sky.addColorStop(1,'#FF9800');
      c.fillStyle=sky; c.fillRect(0,0,W,H);
      c.fillStyle='#FFD54F'; c.beginPath(); c.arc(W/2,H*0.62,46,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,213,79,0.25)'; c.beginPath(); c.arc(W/2,H*0.62,72,0,Math.PI*2); c.fill();
      c.strokeStyle='rgba(255,213,79,0.3)'; c.lineWidth=2.5;
      for(let a=0;a<16;a++){const r=a*22.5*Math.PI/180;c.beginPath();c.moveTo(W/2+Math.cos(r)*58,H*0.62+Math.sin(r)*58);c.lineTo(W/2+Math.cos(r)*96,H*0.62+Math.sin(r)*96);c.stroke();}
      c.fillStyle='#4A148C'; c.beginPath();c.moveTo(0,H*0.72);c.lineTo(W*0.2,H*0.38);c.lineTo(W*0.42,H*0.65);c.lineTo(W*0.65,H*0.3);c.lineTo(W*0.82,H*0.55);c.lineTo(W,H*0.5);c.lineTo(W,H);c.lineTo(0,H);c.fill();
      c.fillStyle='#311B92'; c.beginPath();c.moveTo(0,H*0.82);c.lineTo(W*0.22,H*0.54);c.lineTo(W*0.44,H*0.76);c.lineTo(W*0.66,H*0.5);c.lineTo(W*0.85,H*0.7);c.lineTo(W,H*0.65);c.lineTo(W,H);c.lineTo(0,H);c.fill();
      c.fillStyle='rgba(255,255,255,0.88)';
      [[W*0.22,H*0.54],[W*0.66,H*0.5]].forEach(([px,py])=>{c.beginPath();c.moveTo(px,py);c.lineTo(px-26,py+40);c.lineTo(px+26,py+40);c.fill();});
    },
    5: () => { // 🦋 Butterfly Meadow
      const sky=c.createLinearGradient(0,0,0,H*0.62); sky.addColorStop(0,'#E1F5FE'); sky.addColorStop(1,'#B3E5FC');
      c.fillStyle=sky; c.fillRect(0,0,W,H);
      c.fillStyle='#66BB6A'; c.fillRect(0,H*0.6,W,H*0.4);
      c.fillStyle='#81C784'; c.fillRect(0,H*0.57,W,H*0.07);
      [[W*0.18,H*0.28,'#F48FB1','#FCE4EC'],[W*0.42,H*0.18,'#CE93D8','#F3E5F5'],[W*0.68,H*0.26,'#FFB74D','#FFF3E0'],
       [W*0.12,H*0.46,'#80CBC4','#E0F2F1'],[W*0.55,H*0.38,'#F06292','#FCE4EC'],[W*0.82,H*0.16,'#AED581','#F1F8E9']].forEach(([x,y,c1,c2])=>{
        c.fillStyle=c1;
        c.beginPath();c.ellipse(x-18,y,18,13,Math.PI*0.2,0,Math.PI*2);c.fill();
        c.beginPath();c.ellipse(x+18,y,18,13,-Math.PI*0.2,0,Math.PI*2);c.fill();
        c.fillStyle=c2;
        c.beginPath();c.ellipse(x-15,y-4,10,7,Math.PI*0.2,0,Math.PI*2);c.fill();
        c.beginPath();c.ellipse(x+15,y-4,10,7,-Math.PI*0.2,0,Math.PI*2);c.fill();
        c.fillStyle='#5D4037'; c.beginPath();c.ellipse(x,y,3.5,13,0,0,Math.PI*2);c.fill();
        c.strokeStyle='#5D4037'; c.lineWidth=2;
        c.beginPath();c.moveTo(x,y-10);c.lineTo(x-11,y-26);c.stroke();
        c.beginPath();c.moveTo(x,y-10);c.lineTo(x+11,y-26);c.stroke();
        c.fillStyle='#5D4037';
        c.beginPath();c.arc(x-11,y-26,3.5,0,Math.PI*2);c.fill();
        c.beginPath();c.arc(x+11,y-26,3.5,0,Math.PI*2);c.fill();
      });
    },
    6: () => { // 🌈 Rainbow Sky
      const bg=c.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#E3F2FD'); bg.addColorStop(1,'#F3E5F5');
      c.fillStyle=bg; c.fillRect(0,0,W,H);
      ['#F44336','#FF9800','#FFEB3B','#4CAF50','#2196F3','#9C27B0'].forEach((col,i)=>{
        c.strokeStyle=col; c.lineWidth=18; c.beginPath(); c.arc(W/2,H*0.88,(H*0.78-i*16),Math.PI,0); c.stroke();
      });
      c.fillStyle='white';
      [[60,78,56],[W*0.56,62,46],[W*0.82,80,50]].forEach(([x,y,r])=>{
        c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
        c.beginPath();c.arc(x+38,y+7,r*0.78,0,Math.PI*2);c.fill();
        c.beginPath();c.arc(x-30,y+10,r*0.72,0,Math.PI*2);c.fill();
      });
      c.fillStyle='#FFD700'; c.beginPath(); c.arc(W*0.88,H*0.12,36,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(255,215,0,0.2)'; c.beginPath(); c.arc(W*0.88,H*0.12,52,0,Math.PI*2); c.fill();
      c.fillStyle='#A5D6A7';
      c.beginPath();c.arc(80,H+10,130,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(W-80,H+20,140,0,Math.PI*2);c.fill();
    },
    7: () => { // 🏔️ Snowy Mountains
      const sky=c.createLinearGradient(0,0,0,H*0.65); sky.addColorStop(0,'#0D2137'); sky.addColorStop(1,'#1A5276');
      c.fillStyle=sky; c.fillRect(0,0,W,H);
      c.fillStyle='rgba(255,255,255,0.9)';
      [[40,30,2.5],[80,15,2],[130,35,2.5],[200,22,2],[270,12,3],[340,28,2],[380,18,2.5]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();});
      c.fillStyle='#1A237E'; c.beginPath();c.moveTo(0,H*0.72);c.lineTo(W*0.18,H*0.42);c.lineTo(W*0.38,H*0.65);c.lineTo(W*0.6,H*0.36);c.lineTo(W*0.78,H*0.56);c.lineTo(W,H*0.46);c.lineTo(W,H);c.lineTo(0,H);c.fill();
      c.fillStyle='#283593'; c.beginPath();c.moveTo(0,H*0.85);c.lineTo(W*0.22,H*0.58);c.lineTo(W*0.42,H*0.78);c.lineTo(W*0.62,H*0.52);c.lineTo(W*0.8,H*0.68);c.lineTo(W,H*0.62);c.lineTo(W,H);c.lineTo(0,H);c.fill();
      c.fillStyle='#E8F4FD';
      [[W*0.18,H*0.42],[W*0.6,H*0.36],[W*0.22,H*0.58],[W*0.62,H*0.52]].forEach(([px,py])=>{c.beginPath();c.moveTo(px,py);c.lineTo(px-28,py+44);c.lineTo(px+28,py+44);c.fill();});
      c.fillStyle='#E8F4FD'; c.fillRect(0,H*0.92,W,H*0.08);
      c.fillStyle='white'; c.fillRect(0,H*0.96,W,H*0.04);
    },
  };

  if (scenes[sceneId]) scenes[sceneId]();
  return canvas.toDataURL('image/png');
}

// Pre-generate all scenes once
const SCENE_CACHE = {};
const getScene = (id) => {
  if (!SCENE_CACHE[id]) SCENE_CACHE[id] = drawScene(id);
  return SCENE_CACHE[id];
};

const DEFAULT_PHOTOS = [
  { label:'🦁 Savanna Sunset',   emoji:'🦁', sceneId:0 },
  { label:'🌸 Flower Garden',    emoji:'🌸', sceneId:1 },
  { label:'🌊 Ocean Waves',      emoji:'🌊', sceneId:2 },
  { label:'🌲 Enchanted Forest', emoji:'🌲', sceneId:3 },
  { label:'🌅 Sunset Mountain',  emoji:'🌅', sceneId:4 },
  { label:'🦋 Butterfly Meadow', emoji:'🦋', sceneId:5 },
  { label:'🌈 Rainbow Sky',      emoji:'🌈', sceneId:6 },
  { label:'🏔️ Snowy Mountains',  emoji:'🏔️', sceneId:7 },
];

const DIFFICULTIES = [
  { size:2, label:'Easy',   desc:'2×2 · 4 pieces',  emoji:'😊', color:'#34D399', light:'#F0FDF4' },
  { size:3, label:'Medium', desc:'3×3 · 9 pieces',  emoji:'🤔', color:'#FBBF24', light:'#FFFBEB' },
  { size:4, label:'Hard',   desc:'4×4 · 16 pieces', emoji:'🤯', color:'#F472B6', light:'#FDF2F8' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// KEY FIX: compute correct background style for a puzzle piece
// Uses the ACTUAL rendered slot size so the image slices correctly
function getPieceStyle(idx, gridSize, imgSrc, slotPx) {
  if (!imgSrc || !slotPx) return {};
  const col = idx % gridSize;
  const row = Math.floor(idx / gridSize);
  // background-size = full image = slotPx * gridSize
  const fullSize = slotPx * gridSize;
  return {
    backgroundImage:    `url('${imgSrc}')`,
    backgroundSize:     `${fullSize}px ${fullSize}px`,
    backgroundPosition: `-${col * slotPx}px -${row * slotPx}px`,
    backgroundRepeat:   'no-repeat',
  };
}

export default function PuzzleGame() {
  const navigate = useNavigate();

  // ── SHARED STATE ──
  const [view,          setView]         = useState('setup');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [gridSize,      setGridSize]     = useState(2);
  const [dragOver,      setDragOver]     = useState(false);
  const [saved,         setSaved]        = useState(false);
  const fileRef = useRef();

  // ── PLAY STATE ──
  const [photoIdx,    setPhotoIdx]    = useState(0);
  const [activeImg,   setActiveImg]   = useState(null);
  const [pieces,      setPieces]      = useState([]);
  const [slots,       setSlots]       = useState([]);
  const [placedCount, setPlacedCount] = useState(0);
  const [hintUses,    setHintUses]    = useState(3);
  const [hintSlot,    setHintSlot]    = useState(null);
  const [showWin,     setShowWin]     = useState(false);
  const [nextLabel,   setNextLabel]   = useState('');
  const [shakeSlot,   setShakeSlot]   = useState(null);

  // ── KEY: measure actual slot pixel size ──
  const gridRef  = useRef();
  const [slotPx, setSlotPx] = useState(0);

  const dragRef     = useRef({ pieceId:null, fromSlot:null, fromPool:false });
  const confettiRef = useRef();

  const totalPieces = gridSize * gridSize;
  const progress    = totalPieces > 0 ? Math.round((placedCount/totalPieces)*100) : 0;
  const photoLabel  = uploadedImage ? '📸 Your Photo' : DEFAULT_PHOTOS[photoIdx % DEFAULT_PHOTOS.length].label;

  // Measure grid slot size after render
  useEffect(() => {
    if (view !== 'play') return;
    const measure = () => {
      if (gridRef.current) {
        const firstSlot = gridRef.current.querySelector('.pg-slot');
        if (firstSlot) {
          setSlotPx(firstSlot.getBoundingClientRect().width);
        }
      }
    };
    // measure after paint
    const t = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [view, gridSize]);

  // ── INIT PUZZLE ──
  const initPuzzle = useCallback((idx=0, gSize=2, img=null) => {
    const src = img || getScene(DEFAULT_PHOTOS[idx % DEFAULT_PHOTOS.length].sceneId);
    setActiveImg(src);
    setPlacedCount(0);
    setHintUses(3);
    setHintSlot(null);
    setShowWin(false);
    setShakeSlot(null);
    setPieces(shuffle(Array.from({ length: gSize*gSize }, (_,i) => i)));
    setSlots(Array(gSize*gSize).fill(null));
  }, []);

  const switchToPlay = () => {
    setView('play');
    initPuzzle(photoIdx, gridSize, uploadedImage);
    // Re-measure after switching
    setTimeout(() => {
      if (gridRef.current) {
        const s = gridRef.current.querySelector('.pg-slot');
        if (s) setSlotPx(s.getBoundingClientRect().width);
      }
    }, 80);
  };

  // ── FILE UPLOAD ──
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); switchToPlay(); }, 1000);
  };

  // ── DRAG HANDLERS ──
  const onPieceDragStart = (pieceId, fromSlot=null) => {
    dragRef.current = { pieceId, fromSlot, fromPool: fromSlot === null };
  };

  const onSlotDrop = (targetSlot) => {
    const { pieceId, fromSlot, fromPool } = dragRef.current;
    if (pieceId === null) return;

    setSlots(prev => {
      const next = [...prev];
      let newPlaced = placedCount;

      if (fromSlot !== null) {
        if (prev[fromSlot] === pieceId && fromSlot === pieceId) newPlaced--;
        next[fromSlot] = null;
      }
      if (fromPool) setPieces(p => p.filter(id => id !== pieceId));

      if (prev[targetSlot] !== null) {
        const displaced = prev[targetSlot];
        if (displaced === targetSlot) newPlaced--;
        setPieces(p => [...p, displaced]);
      }

      next[targetSlot] = pieceId;

      if (pieceId === targetSlot) {
        newPlaced++;
        if (newPlaced === totalPieces) setTimeout(triggerWin, 400);
      } else {
        setShakeSlot(targetSlot);
        setTimeout(() => setShakeSlot(null), 450);
      }

      setPlacedCount(newPlaced);
      return next;
    });

    setHintSlot(null);
    dragRef.current = { pieceId:null, fromSlot:null, fromPool:false };
  };

  const onPoolDrop = () => {
    const { pieceId, fromSlot } = dragRef.current;
    if (pieceId === null || fromSlot === null) return;
    setSlots(prev => {
      const next = [...prev];
      if (prev[fromSlot] === pieceId && fromSlot === pieceId)
        setPlacedCount(p => Math.max(0, p-1));
      next[fromSlot] = null;
      return next;
    });
    setPieces(prev => [...prev, pieceId]);
    dragRef.current = { pieceId:null, fromSlot:null, fromPool:false };
  };

  const showHint = () => {
    if (hintUses <= 0) return;
    setHintUses(h => h-1);
    for (let i=0; i<totalPieces; i++) {
      if (slots[i] !== i) { setHintSlot(i); break; }
    }
    setTimeout(() => setHintSlot(null), 2500);
  };

  const triggerWin = () => {
    const nextIdx = (photoIdx+1) % DEFAULT_PHOTOS.length;
    if (!uploadedImage) setNextLabel(`${DEFAULT_PHOTOS[nextIdx].emoji} ${DEFAULT_PHOTOS[nextIdx].label}`);
    setShowWin(true);
    launchConfetti();
  };

  const playAgain = () => {
    const nextIdx = uploadedImage ? photoIdx : (photoIdx+1) % DEFAULT_PHOTOS.length;
    setPhotoIdx(nextIdx);
    setShowWin(false);
    if (confettiRef.current) confettiRef.current.innerHTML = '';
    initPuzzle(nextIdx, gridSize, uploadedImage);
  };

  const launchConfetti = () => {
    const wrap = confettiRef.current;
    if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#FBBF24','#F472B6','#7C3AED','#34D399','#38BDF8','#FB923C'];
    for (let i=0; i<80; i++) {
      const el = document.createElement('div');
      el.className = 'pg-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};width:${Math.random()*8+5}px;height:${Math.random()*12+7}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*2+2).toFixed(1)}s;--cd:${(Math.random()*1.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML=''; }, 5000);
  };

  // Pool piece size = slotPx (same size as grid slots)
 const poolPieceSize = slotPx ? Math.min(80, Math.floor(slotPx * 0.55)) : 70;

  return (
    <div className="pg-page">

      {/* TOP BAR */}
      <div className="pg-topbar">
        <div className="pg-logo">✨ Play<span>Nest</span></div>
        <div className="pg-tb-title">🧩 Picture Puzzle</div>
        <button className="pg-tb-btn" onClick={() => navigate('/home')}>🏠 Home</button>
      </div>

      {/* TOGGLE */}
      <div className="pg-toggle-wrap">
        <div className="pg-toggle">
          <button className={`pg-vt-btn ${view==='setup'?'active':''}`} onClick={() => setView('setup')}>
            🎨 Parent Setup
          </button>
          <button className={`pg-vt-btn ${view==='play'?'active':''}`} onClick={switchToPlay}>
            🧒 Child Play
          </button>
        </div>
      </div>

      {/* ══ PARENT SETUP ══ */}
      {view === 'setup' && (
        <div className="pg-setup">

          <div className="pg-card">
            <div className="pg-step-header">
              <div className="pg-step-num">1</div>
              <div>
                <div className="pg-step-title">Upload a Photo 📸</div>
                <div className="pg-step-sub">Upload your own — or skip to use 8 built-in scenes! 🌸🦁🌊</div>
              </div>
            </div>
            {!uploadedImage ? (
              <div className={`pg-upload-zone ${dragOver?'drag-over':''}`}
                onClick={() => fileRef.current.click()}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
              >
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                  onChange={e=>handleFile(e.target.files[0])} />
                <div className="pg-upload-icon">📸</div>
                <div className="pg-upload-title">Drag & Drop or Click to Upload</div>
                <div className="pg-upload-sub">JPG, PNG • Max 10MB</div>
              </div>
            ) : (
              <div className="pg-preview">
                <img src={uploadedImage} alt="Preview" className="pg-preview-img" />
                <button className="pg-change-btn" onClick={()=>setUploadedImage(null)}>🔄 Change Photo</button>
              </div>
            )}
          </div>

          <div className="pg-card">
            <div className="pg-step-header">
              <div className="pg-step-num">2</div>
              <div>
                <div className="pg-step-title">Choose Difficulty 🎯</div>
                <div className="pg-step-sub">How many pieces for the puzzle?</div>
              </div>
            </div>
            <div className="pg-diff-grid">
              {DIFFICULTIES.map(d => (
                <div key={d.size} className={`pg-diff-card ${gridSize===d.size?'selected':''}`}
                  style={{'--dc':d.color,'--dl':d.light}}
                  onClick={()=>setGridSize(d.size)}
                >
                  {gridSize===d.size && <div className="pg-diff-check">✓</div>}
                  <div className="pg-diff-emoji">{d.emoji}</div>
                  <div className="pg-diff-label">{d.label}</div>
                  <div className="pg-diff-desc">{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pg-card">
            <div className="pg-step-header">
              <div className="pg-step-num">3</div>
              <div>
                <div className="pg-step-title">Save & Publish 🚀</div>
                <div className="pg-step-sub">Arjun can start playing right away!</div>
              </div>
            </div>
            <button className="pg-save-btn" onClick={handleSave} disabled={saved}>
              {saved ? '✅ Saved! Opening Play Mode...' : '🎉 Save & Publish Game!'}
            </button>
          </div>

        </div>
      )}

      {/* ══ CHILD PLAY ══ */}
      {view === 'play' && (
        <div className="pg-play-wrap">
          <div className="pg-play-layout">

            {/* PUZZLE AREA */}
            <div className="pg-puzzle-area">
              <div className="pg-area-label">🧩 Drag pieces into the correct spots!</div>

              {/* PIECES POOL */}
              <div className="pg-pool"
                onDragOver={e=>e.preventDefault()}
                onDrop={onPoolDrop}
              >
                {pieces.map(id => (
                  <div key={id} className="pg-piece"
                    draggable
                    onDragStart={()=>onPieceDragStart(id,null)}
                    style={{
                      width: poolPieceSize,
                      height: poolPieceSize,
                      ...getPieceStyle(id, gridSize, activeImg, poolPieceSize),
                    }}
                  />
                ))}
                {pieces.length===0 && <div className="pg-pool-empty">🎉 All pieces placed!</div>}
              </div>

              {/* PUZZLE GRID */}
              <div ref={gridRef} className="pg-grid"
                style={{ gridTemplateColumns:`repeat(${gridSize},1fr)` }}
              >
                {slots.map((pieceId, slotIdx) => (
                  <div key={slotIdx}
                    className={[
                      'pg-slot',
                      pieceId!==null ? 'filled' : '',
                      pieceId!==null && pieceId===slotIdx ? 'correct' : '',
                      shakeSlot===slotIdx ? 'shake' : '',
                    ].join(' ')}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={()=>onSlotDrop(slotIdx)}
                  >
                    {/* GHOST HINT — shows exact image piece */}
                    {hintSlot===slotIdx && slotPx>0 && (
                      <div className="pg-hint-ghost"
                        style={getPieceStyle(slotIdx, gridSize, activeImg, slotPx)}
                      />
                    )}
                    {pieceId!==null && (
                      <div
                        className={`pg-piece in-slot ${pieceId===slotIdx?'correct':''}`}
                        draggable
                        onDragStart={()=>onPieceDragStart(pieceId,slotIdx)}
                        style={{
                          width:'100%', height:'100%',
                          ...getPieceStyle(pieceId, gridSize, activeImg, slotPx),
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SIDE PANEL */}
            <div className="pg-side">

              <div className="pg-side-card">
                <div className="pg-side-title">🖼️ Target Image</div>
                {activeImg
                  ? <img src={activeImg} alt="Target" className="pg-thumb"/>
                  : <div className="pg-thumb-empty">No image yet</div>
                }
                <div className="pg-photo-label">{photoLabel}</div>
              </div>

              <div className="pg-side-card">
                <div className="pg-side-title">📊 Progress</div>
                <div className="pg-prog-track">
                  <div className="pg-prog-fill" style={{width:`${progress}%`}}/>
                </div>
                <div className="pg-prog-label">{placedCount} / {totalPieces} pieces ✅</div>
              </div>

              <div className="pg-side-card">
                <div className="pg-side-title">💡 Need a hint?</div>
                <button className="pg-hint-btn" onClick={showHint} disabled={hintUses<=0}>
                  💡 Show Hint
                  <span className="pg-hint-left">{hintUses} left</span>
                </button>
              </div>

              <button className="pg-home-btn" onClick={()=>navigate('/child/dashboard')}>
                🏠 Back to Games
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WIN SCREEN */}
      {showWin && (
        <div className="pg-win-overlay">
          <div className="pg-win-card">
            <div className="pg-win-emoji">🏆</div>
            <div className="pg-win-title">Amazing <span>Arjun!</span></div>
            <div className="pg-win-sub">You solved the puzzle! You're a star! 🌟</div>
            <div className="pg-win-stars">
              {['⭐','⭐','⭐'].map((s,i)=>(
                <span key={i} style={{animationDelay:`${0.3+i*0.2}s`}}>{s}</span>
              ))}
            </div>
            {nextLabel && <div className="pg-next-teaser">🎉 Next up: {nextLabel}</div>}
            <div className="pg-win-actions">
              <button className="pg-btn-again" onClick={playAgain}>🔄 Next Puzzle!</button>
              <button className="pg-btn-home"  onClick={()=>navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="pg-confetti" ref={confettiRef}/>
    </div>
  );
}
