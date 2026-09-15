(() => {
  const hero=document.querySelector('.hero>small'); if(hero) hero.textContent='Prototype V0.7.1';
  const photo=document.getElementById('photoInput'); if(photo) photo.multiple=true;

  // V0.7.1 hotfix: v07-import expects a dedicated summary target.
  // The V0.6 markup only had a generic .detected block, which caused the
  // timetable analysis to finish successfully and then throw while rendering.
  const timetableDetected=document.querySelector('#timetableResult .detected');
  if(timetableDetected && !document.getElementById('timetableSummary')){
    timetableDetected.id='timetableSummary';
    timetableDetected.textContent='Analyse de la grille en attente.';
  }

  const src=document.currentScript?.src||'';
  const base=src?src.slice(0,src.lastIndexOf('/')+1):'';
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href=base+'v07.css?v=71';
  document.head.appendChild(css);

  const files=['v07-core.js?v=71','v07-import.js?v=71'];
  const load=i=>{
    if(i>=files.length)return;
    const s=document.createElement('script');
    s.src=base+files[i];
    s.onload=()=>load(i+1);
    s.onerror=()=>console.error('KidooFlow: impossible de charger '+files[i]);
    document.body.appendChild(s);
  };
  load(0);
})();