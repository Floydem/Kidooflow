(() => {
  const hero=document.querySelector('.hero>small'); if(hero) hero.textContent='Prototype V0.7';
  const photo=document.getElementById('photoInput'); if(photo) photo.multiple=true;
  const src=document.currentScript?.src||''; const base=src?src.slice(0,src.lastIndexOf('/')+1):'';
  const css=document.createElement('link'); css.rel='stylesheet'; css.href=base+'v07.css?v=7'; document.head.appendChild(css);
  const files=['v07-core.js?v=7','v07-import.js?v=7'];
  const load=i=>{ if(i>=files.length)return; const s=document.createElement('script'); s.src=base+files[i]; s.onload=()=>load(i+1); s.onerror=()=>console.error('KidooFlow: impossible de charger '+files[i]); document.body.appendChild(s); };
  load(0);
})();