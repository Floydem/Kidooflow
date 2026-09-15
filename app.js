(() => {
  const KEY = 'kidooflow_v04';
  const DB_NAME = 'kidooflow_media';
  const DB_STORE = 'images';
  const demoInbox = [
    {id:'ed1',source:'ÉcoleDirecte',icon:'🏊',title:'Piscine vendredi',text:'Théo • prévoir maillot, bonnet et serviette.',tag:'Événement'},
    {id:'ed2',source:'ÉcoleDirecte',icon:'💬',title:'Demande de rendez-vous professeur',text:'Hayden • message personnel nécessitant une réponse.',tag:'Action'},
    {id:'book1',source:'Cahier papier',icon:'📚',title:'3 devoirs détectés',text:'Théo • lecture, dictée et exercice de maths.',tag:'À vérifier'},
    {id:'sport1',source:'Manuel',icon:'⚽️',title:'Football mercredi 17h30',text:'Hayden • événement hebdomadaire.',tag:'Sport'}
  ];
  const baseEvents = [
    {icon:'🧪',title:'Contrôle de maths',text:'Hayden • 14:00 • Fractions',tag:'École'},
    {icon:'⚽️',title:'Football',text:'Hayden • mercredi 17:30',tag:'Sport'},
    {icon:'🦷',title:'Dentiste',text:'Théo • 6 octobre • 16:30',tag:'Santé'}
  ];
  let pendingAnalysis = null;
  let deferredPrompt = null;
  let selectedPhotoData = null;

  function state(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(next){ localStorage.setItem(KEY, JSON.stringify(next)); render(); }
  function init(){ const s = state(); if(!s.initialized) save({initialized:true,inbox:demoInbox,events:[]}); else render(); }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function showToast(message){ const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),1900); }
  function goto(page){ document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page)); document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===page)); window.scrollTo(0,0); }
  function openModal(id){ const el=document.getElementById(id); el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
  function closeModal(id){ const el=document.getElementById(id); el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }

  function eventHtml(x){
    const source = x.sourceImageId ? `<button class="source-mini" data-action="view-source" data-image-id="${x.sourceImageId}" data-source-text="${encodeURIComponent(x.sourceText||'')}">📎 Voir la capture source</button>` : '';
    return `<article class="event"><div class="ico">${x.icon}</div><div><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.text)}</p></div><span class="tag">${escapeHtml(x.tag)}</span>${source}</article>`;
  }
  function inboxHtml(x){
    const source = x.sourceImageId ? `<div class="inbox-source"><button data-action="view-source" data-image-id="${x.sourceImageId}" data-source-text="${encodeURIComponent(x.sourceText||'')}">📎 Voir la capture</button></div>` : '';
    return `<article class="inbox-card"><div class="top"><span class="source">${x.icon} ${escapeHtml(x.source)}</span><span class="tag">${escapeHtml(x.tag)}</span></div><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.text)}</p>${source}<div class="inbox-actions"><button data-action="ignore-inbox" data-id="${x.id}">Ignorer</button><button class="accept" data-action="accept-inbox" data-id="${x.id}">Ajouter ✓</button></div></article>`;
  }
  function render(){
    const s=state(); const inbox=s.inbox||[]; const events=[...baseEvents,...(s.events||[])];
    document.getElementById('inboxCount').textContent=inbox.length;
    document.getElementById('inboxChip').textContent=`${inbox.length} élément${inbox.length===1?'':'s'} Inbox`;
    document.getElementById('eventCount').textContent=events.length;
    document.getElementById('todayList').innerHTML=events.slice(0,4).map(eventHtml).join('');
    document.getElementById('agendaList').innerHTML=events.map(eventHtml).join('');
    document.getElementById('inboxList').innerHTML=inbox.length ? inbox.map(inboxHtml).join('') : '<div class="empty">Inbox vide 🎉</div>';
  }
  function acceptInbox(id){
    const s=state(); const x=(s.inbox||[]).find(i=>i.id===id); if(!x)return;
    s.inbox=s.inbox.filter(i=>i.id!==id);
    s.events=[...(s.events||[]),{icon:x.icon,title:x.title,text:x.text,tag:x.tag,sourceImageId:x.sourceImageId,sourceText:x.sourceText}];
    save(s); showToast('Ajouté à l’agenda ✓');
  }
  function ignoreInbox(id){ const s=state(); s.inbox=(s.inbox||[]).filter(i=>i.id!==id); save(s); showToast('Élément ignoré'); }

  function classifyText(text){
    const clean=text.replace(/\s+/g,' ').trim();
    const l=clean.toLowerCase();
    const child=l.includes('théo')||l.includes('theo')?'Théo':l.includes('hayden')?'Hayden':'À confirmer';
    let icon='🏫', title='Capture ÉcoleDirecte', category='École';
    if(/devoir|travail à faire|travail a faire|exercice|leçon|lecon|dictée|dictee|cahier de texte/.test(l)){ icon='📚'; title='Devoirs détectés'; category='Devoirs'; }
    else if(/rendez-vous|rendez vous|rdv|rencontre|réunion|reunion/.test(l)){ icon='💬'; title='Demande de rendez-vous'; category='Action'; }
    else if(/sortie|piscine|voyage|visite|activité|activite|excursion/.test(l)){ icon='🚌'; title='Événement scolaire'; category='Événement'; }
    else if(/absence|retard|sanction|vie scolaire|punition/.test(l)){ icon='🏫'; title='Vie scolaire'; category='Vie scolaire'; }
    else if(/message|professeur|enseignant|enseignante|madame|monsieur/.test(l)){ icon='💬'; title='Message ÉcoleDirecte'; category='Message'; }
    const dateMatch=clean.match(/\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d{1,2}(?:\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))?/i) || clean.match(/\b\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?\b/);
    const timeMatch=clean.match(/\b\d{1,2}\s?[h:]\s?\d{0,2}\b/i);
    const actions=[];
    if(/signer|signature|autorisation/.test(l)) actions.push('document à signer');
    if(/apporter|prévoir|prevoir|venir avec/.test(l)) actions.push('matériel à préparer');
    if(/répondre|repondre|réponse|reponse/.test(l)) actions.push('réponse à faire');
    if(/payer|paiement|règlement|reglement/.test(l)) actions.push('paiement');
    return {clean,child,icon,title,category,date:dateMatch?.[0]||'',time:timeMatch?.[0]||'',actions};
  }
  function analyze(){
    const input=document.getElementById('inputText'); const text=input.value.trim(); if(!text){showToast('Ajoute une information');return;}
    const meta=classifyText(text);
    let tag=meta.category==='Événement'?'École':meta.category;
    if(meta.category==='Action') tag='École';
    pendingAnalysis={icon:meta.icon,title:meta.title,text:`${meta.child} • ${text}`,tag};
    document.getElementById('analysisBody').innerHTML=`<ul><li>Enfant : <b>${escapeHtml(meta.child)}</b></li><li>Catégorie : <b>${escapeHtml(meta.category)}</b></li><li>Titre : <b>${escapeHtml(meta.title)}</b></li><li>Source : <b>ajout manuel</b></li></ul>`;
    document.getElementById('analysis').classList.remove('hidden');
  }
  function saveAnalysis(){ if(!pendingAnalysis)return; const s=state(); s.events=[...(s.events||[]),pendingAnalysis]; save(s); pendingAnalysis=null; document.getElementById('inputText').value=''; document.getElementById('analysis').classList.add('hidden'); showToast('Ajouté à l’agenda ✓'); goto('agenda'); }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function putImage(id,data){ const db=await openDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(data,id); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); }
  async function getImage(id){ const db=await openDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).get(id); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
  function compressImage(file){
    return new Promise((resolve,reject)=>{
      const img=new Image(); const url=URL.createObjectURL(file);
      img.onload=()=>{ const max=1400; const scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg',.78)); };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image illisible'));}; img.src=url;
    });
  }
  function resetPhotoUi(){
    selectedPhotoData=null;
    document.getElementById('photoInput').value=''; document.getElementById('photoEmpty').classList.remove('hidden'); document.getElementById('photoWorkspace').classList.add('hidden'); document.getElementById('ocrResult').classList.add('hidden'); document.getElementById('ocrProgress').classList.add('hidden');
  }
  async function selectPhoto(file){
    if(!file)return; showToast('Préparation de la capture…');
    try{
      selectedPhotoData=await compressImage(file);
      document.getElementById('photoPreview').src=selectedPhotoData; document.getElementById('photoName').textContent=file.name||'capture.jpg'; document.getElementById('photoEmpty').classList.add('hidden'); document.getElementById('photoWorkspace').classList.remove('hidden'); document.getElementById('ocrResult').classList.add('hidden'); showToast('Capture prête ✓');
    }catch{ showToast('Impossible de lire cette image'); }
  }
  function setProgress(value,label){ document.getElementById('ocrProgressBar').style.width=`${Math.round(value*100)}%`; document.getElementById('ocrProgressText').textContent=label; }
  async function runOcr(){
    if(!selectedPhotoData){showToast('Choisis une image');return;}
    const btn=document.getElementById('ocrButton'); btn.disabled=true; btn.textContent='Lecture en cours…'; document.getElementById('ocrProgress').classList.remove('hidden'); setProgress(.03,'Chargement OCR…');
    try{
      if(!window.Tesseract) throw new Error('OCR indisponible');
      const result=await Tesseract.recognize(selectedPhotoData,'fra',{logger:m=>{ if(m.progress!=null) setProgress(m.progress, m.status==='recognizing text'?'Lecture du texte…':'Préparation OCR…'); }});
      const text=(result.data.text||'').trim();
      if(!text) throw new Error('Aucun texte reconnu');
      fillOcrResult(text); showToast('Capture lue ✓');
    }catch{
      fillOcrResult(''); showToast('OCR incomplet : tu peux saisir/corriger le texte');
    }finally{ btn.disabled=false; btn.textContent='🔎 Relire la capture'; setProgress(1,'Analyse terminée'); }
  }
  function fillOcrResult(text){
    const meta=classifyText(text);
    document.getElementById('ocrText').value=text;
    document.getElementById('ocrChild').value=['Hayden','Théo'].includes(meta.child)?meta.child:'À confirmer';
    const cat=['École','Devoirs','Événement','Message','Vie scolaire','Action'].includes(meta.category)?meta.category:'École'; document.getElementById('ocrCategory').value=cat;
    document.getElementById('ocrTitle').value=meta.title;
    const bits=[]; if(meta.date) bits.push(`📅 ${meta.date}`); if(meta.time) bits.push(`🕒 ${meta.time}`); if(meta.actions.length) bits.push(`✅ ${meta.actions.join(' • ')}`); document.getElementById('ocrDetected').innerHTML=bits.length?bits.map(escapeHtml).join('<br>'):'Aucune date/action certaine détectée. Tu peux quand même envoyer la capture dans l’Inbox et la vérifier.';
    document.getElementById('ocrResult').classList.remove('hidden');
  }
  async function sendPhotoInbox(){
    if(!selectedPhotoData){showToast('Aucune capture');return;}
    const raw=document.getElementById('ocrText').value.trim(); const child=document.getElementById('ocrChild').value; const category=document.getElementById('ocrCategory').value; const title=document.getElementById('ocrTitle').value.trim()||'Capture ÉcoleDirecte';
    const imageId=`img_${Date.now()}`; try{ await putImage(imageId,selectedPhotoData); }catch{ showToast('Stockage local impossible'); return; }
    const meta=classifyText(raw); const summary=[child,meta.date,meta.time].filter(Boolean).join(' • ') || child;
    const item={id:`in_${Date.now()}`,source:'ÉcoleDirecte • capture',icon:meta.icon||'🏫',title,text:raw?`${summary} • ${raw.slice(0,220)}`:`${child} • Capture à vérifier`,tag:category,sourceImageId:imageId,sourceText:raw};
    const s=state(); s.inbox=[item,...(s.inbox||[])]; save(s); closeModal('photoModal'); resetPhotoUi(); showToast('Capture ajoutée à l’Inbox ✓'); goto('inbox');
  }
  async function viewSource(imageId,sourceText){
    try{ const data=await getImage(imageId); if(!data){showToast('Capture introuvable sur cet appareil');return;} document.getElementById('sourceImage').src=data; document.getElementById('sourceText').textContent=sourceText||''; openModal('sourceModal'); }
    catch{ showToast('Impossible d’ouvrir la capture'); }
  }

  document.addEventListener('click', (e) => {
    const button=e.target.closest('button'); if(!button)return;
    if(button.dataset.nav){ goto(button.dataset.nav); return; }
    const action=button.dataset.action; const id=button.dataset.id;
    if(action==='accept-inbox') return acceptInbox(id);
    if(action==='ignore-inbox') return ignoreInbox(id);
    if(action==='analyze') return analyze();
    if(action==='save-analysis') return saveAnalysis();
    if(action==='reset'){ save({initialized:true,inbox:demoInbox,events:[]}); showToast('Démo réinitialisée'); return; }
    if(action==='today'){ showToast('Aujourd’hui sélectionné'); return; }
    if(action==='add-child'){ showToast('Ajout enfant prévu ensuite'); return; }
    if(action==='photo'){ resetPhotoUi(); openModal('photoModal'); return; }
    if(action==='choose-photo'){ document.getElementById('photoInput').click(); return; }
    if(action==='close-photo'){ closeModal('photoModal'); return; }
    if(action==='close-source'){ closeModal('sourceModal'); return; }
    if(action==='run-ocr') return runOcr();
    if(action==='send-photo-inbox') return sendPhotoInbox();
    if(action==='view-source') return viewSource(button.dataset.imageId,decodeURIComponent(button.dataset.sourceText||''));
    if(action==='homework'){ document.getElementById('inputText').value='Théo : lecture page 18, dictée vendredi, exercices 4 et 5 page 36.'; return; }
    if(action==='voice'){ document.getElementById('inputText').value='Dentiste Théo mardi 6 octobre à 16h30.'; showToast('Exemple de dictée chargé'); return; }
    if(action==='appointment'){ document.getElementById('inputText').value='Hayden entraînement football mercredi à 17h30 toutes les semaines.'; return; }
    if(action==='install'){
      if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt.userChoice.finally(()=>deferredPrompt=null); }
      else showToast('iPhone : Partager → Sur l’écran d’accueil');
    }
  });
  document.addEventListener('click',(e)=>{ const day=e.target.closest('.day'); if(!day)return; document.querySelectorAll('.day').forEach(d=>d.classList.remove('active')); day.classList.add('active'); });
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
  document.getElementById('photoInput').addEventListener('change',(e)=>selectPhoto(e.target.files?.[0]));
  document.getElementById('ocrText').addEventListener('input',(e)=>{ const m=classifyText(e.target.value); document.getElementById('ocrTitle').value=m.title; });
  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e;});
  init();
})();
