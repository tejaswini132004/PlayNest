import React, { useEffect, useRef } from 'react';
import './StarsBg.css';

function StarsBg() {
  const ref = useRef(null);
  const colors = ['#FBBF24','#F472B6','#A78BFA','#34D399','#38BDF8','#FB923C'];
  useEffect(() => {
    const container = ref.current;
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const size = Math.random() * 13 + 4;
      s.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        --dur:${(Math.random() * 3 + 2).toFixed(1)}s;
        animation-delay:${(Math.random() * 3).toFixed(1)}s;
      `;
      container.appendChild(s);
    }
  }, []);
  return <div className="stars-bg" ref={ref}></div>;
}
export default StarsBg;