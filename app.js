(() => {
  const KEY = 'kidooflow_v05';
  const LEGACY_KEY = 'kidooflow_v04';
  const DB_NAME = 'kidooflow_media';
  const DB_STORE = 'images';
  const CHILDREN = ['Hayden','Théo'];
  const MONTHS = {janvier:0,'février':1,fevrier:1,mars:2,avril:3,mai:4,juin:5,juillet:6,'août':7,aout:7,septembre:8,octobre:9,novembre:10,'décembre':11,decembre:11};
  const WEEKDAYS = {dimanche:0,lundi:1,mardi:2,mercredi:3,jeudi:4,vendredi:5,samedi:6};
  let pendingAnalysis = null;
  let deferredPrompt = null;
  let selectedPhotoData = null;
  let selectedDate = dateKey(new Date());

  const demoInbox = [
    {id:'ed1',source:'ÉcoleDirecte',icon:'🏊',title:'Piscine',text:'Théo • prévoir maillot, bonnet et serviette.',tag:'Événement',date:addDaysKey(3),time:'',action:'Préparer les affaires'},
    {id:'ed2',source:'ÉcoleDirecte',icon:'💬',title:'Rendez-vous professeur',text:'Hayden • message personnel nécessitant une réponse.',tag:'Action',date:addDaysKey(2),time:'18:00',action:'Répondre / confirmer le rendez-vous'},
    {id:'book1',source:'Cahier papier',icon:'📚',title:'Devoirs',text:'Théo • lecture, dictée et exercice de maths.',tag:'Devoirs',date:addDaysKey(1),time:'',action:'Faire les devoirs'},
    {id:'sport1',source:'Manuel',icon:'⚽️',title:'Football',text:'Hayden • entraînement hebdomadaire.',tag:'Sport',date:nextWeekdayKey(3),time:'17:30',action:''}
  ];

  function baseEvents(){
    return [
      {id:'base1',icon:'🧪',title:'Contrôle de maths',text:'Hayden • Fractions',tag:'École',date:dateKey(new Date()),time:'14:00'},
      {id:'base2',icon:'⚽️',title:'Football',text:'Hayden • entraînement',tag:'Sport',date:nextWeekdayKey(3),time:'17:30'},
      {id:'base3',icon:'🦷',title:'Dentiste',text:'Théo • rendez-vous',tag:'Santé',date:isoForMonthDay(10,6),time:'16:30'}
    ];
  }

  function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function dateFromKey(k){ const [y,m,d]=String(k).split('-').map(Number); return new Date(y,m-1,d,12); }
  function addDaysKey(days, from=new Date()){ const d=new Date(from); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return dateKey(d); }
  function nextWeekdayKey(day){ const d=new Date(); d.setHours(12,0,0,0); let delta=(day-d.getDay()+7)%7; if(delta===0) delta=7; d.setDate(d.getDate()+delta); return dateKey(d); }
  function isoForMonthDay(month,day){ const now=new Date(); let y=now.getFullYear(); let d=new Date(y,month-1,day,12); if(d < new Date(now.getFullYear(),now.getMonth(),now.getDate(),0)) d=new Date(y+1,month-1,day,12); return dateKey(d); }
  function formatDate(k, long=true){ if(!k) return 'Sans date'; const d=dateFromKey(k); return new Intl.DateTimeFormat('fr-FR', long?{weekday:'long',day:'numeric',month:'long'}:{day:'2-digit',month:'2-digit'}).format(d); }
  function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function normalize(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }

  function state(){ try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return{};} }
  function save(next){ localStorage.setItem(KEY,JSON.stringify(next)); render(); }
  function init(){
    let s=state();
    if(!s.initialized){
      let legacy={}; try{legacy=JSON.parse(localStorage.getItem(LEGACY_KEY))||{};}catch{}
      const migrated=(legacy.events||[]).map(x=>({...x,id:x.id||`m_${Math.random()}`,date:x.date||dateKey(new Date()),time:x.time||''}));
      s={initialized:true,inbox:demoInbox,events:migrated}; save(s);
    } else render();
  }
  function showToast(message){ const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),1900); }
  function goto(page){ document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page)); document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===page)); window.scrollTo(0,0); if(page==='agenda') renderAgenda(); }
  function openModal(id){ const el=document.getElementById(id); el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
  function closeModal(id){ const el=document.getElementById(id); el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }

  function eventHtml(x){
    const source=x.sourceImageId?`<button class="source-mini" data-action="view-source" data-image-id="${x.sourceImageId}" data-source-text="${encodeURIComponent(x.sourceText||'')}">📎 Voir la capture source</button>`:'';
    const when=[x.time, x.action].filter(Boolean).map(escapeHtml).join(' • ');
    return `<article class="event"><div class="ico">${x.icon||'📌'}</div><div><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.text||'')}${when?`<br><b>${when}</b>`:''}</p></div><span class="tag">${escapeHtml(x.tag||'Info')}</span>${source}</article>`;
  }
  function inboxHtml(x){
    const source=x.sourceImageId?`<div class="inbox-source"><button data-action="view-source" data-image-id="${x.sourceImageId}" data-source-text="${encodeURIComponent(x.sourceText||'')}">📎 Voir la capture</button></div>`:'';
    const date=`${x.date?`📅 ${capitalize(formatDate(x.date))}`:'📅 Date à confirmer'}${x.time?` • ${x.time}`:''}`;
    return `<article class="inbox-card"><div class="top"><span class="source">${x.icon||'🏫'} ${escapeHtml(x.source)}</span><span class="tag">${escapeHtml(x.tag||'École')}</span></div><h4>${escapeHtml(x.title)}</h4><p class="structured-line">${escapeHtml(date)}</p><p>${escapeHtml(x.text||'')}</p>${x.action?`<p class="action-line">✅ ${escapeHtml(x.action)}</p>`:''}${source}<div class="inbox-actions"><button data-action="ignore-inbox" data-id="${x.id}">Ignorer</button><button class="accept" data-action="accept-inbox" data-id="${x.id}">Ajouter ✓</button></div></article>`;
  }
  function allEvents(){ const s=state(); return [...baseEvents(),...(s.events||[])]; }
  function render(){
    const s=state(), inbox=s.inbox||[], events=allEvents(), today=dateKey(new Date());
    const todayEvents=events.filter(x=>x.date===today);
    document.getElementById('inboxCount').textContent=inbox.length;
    document.getElementById('inboxChip').textContent=`${inbox.length} élément${inbox.length===1?'':'s'} Inbox`;
    document.getElementById('eventCount').textContent=todayEvents.length;
    document.getElementById('todayList').innerHTML=todayEvents.length?todayEvents.map(eventHtml).join(''):'<div class="empty">Rien de prévu aujourd’hui 🎉</div>';
    document.getElementById('inboxList').innerHTML=inbox.length?inbox.map(inboxHtml).join(''):'<div class="empty">Inbox vide 🎉</div>';
    renderAgenda();
  }
  function renderAgenda(){
    const anchor=dateFromKey(selectedDate); const monday=new Date(anchor); const diff=(anchor.getDay()+6)%7; monday.setDate(anchor.getDate()-diff);
    const fmtDay=new Intl.DateTimeFormat('fr-FR',{weekday:'short'});
    document.getElementById('agendaWeek').innerHTML=Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); const k=dateKey(d); return `<button class="day ${k===selectedDate?'active':''}" data-date="${k}"><span>${capitalize(fmtDay.format(d).replace('.',''))}</span><b>${d.getDate()}</b></button>`; }).join('');
    document.getElementById('selectedDateLabel').textContent=capitalize(formatDate(selectedDate));
    const list=allEvents().filter(x=>x.date===selectedDate).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
    document.getElementById('agendaList').innerHTML=list.length?list.map(eventHtml).join(''):'<div class="empty">Aucun événement ce jour-là.</div>';
  }
  function acceptInbox(id){
    const s=state(),x=(s.inbox||[]).find(i=>i.id===id); if(!x)return;
    if(!x.date){showToast('Confirme d’abord une date');return;}
    s.inbox=s.inbox.filter(i=>i.id!==id);
    s.events=[...(s.events||[]),{id:`ev_${Date.now()}`,icon:x.icon,title:x.title,text:x.text,tag:x.tag,date:x.date,time:x.time||'',action:x.action||'',sourceImageId:x.sourceImageId,sourceText:x.sourceText}];
    save(s); selectedDate=x.date; showToast('Ajouté à l’agenda ✓');
  }
  function ignoreInbox(id){ const s=state(); s.inbox=(s.inbox||[]).filter(i=>i.id!==id); save(s); showToast('Élément ignoré'); }

  function extractDates(text){
    const clean=String(text||'').replace(/\s+/g,' '); const lower=normalize(clean); const now=new Date(); now.setHours(12,0,0,0); const out=[];
    const add=(date,raw,index,score=0)=>{ if(!date||Number.isNaN(date.getTime()))return; const key=dateKey(date); if(!out.some(x=>x.key===key&&x.index===index))out.push({key,raw,index,score}); };
    for(const m of clean.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/g)){
      let y=m[3]?Number(m[3]):now.getFullYear(); if(y<100)y+=2000; const d=new Date(y,Number(m[2])-1,Number(m[1]),12); const before=normalize(clean.slice(Math.max(0,m.index-25),m.index)); const score=/(pour|avant|le|date|rendez|sortie|devoir|jusqu)/.test(before)?3:1; add(d,m[0],m.index,score);
    }
    const monthNames='janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
    const rx=new RegExp(`\\b(?:(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\s+)?(\\d{1,2})\\s+(${monthNames})(?:\\s+(\\d{4}))?\\b`,'gi');
    for(const m of clean.matchAll(rx)){ const y=m[4]?Number(m[4]):now.getFullYear(); let d=new Date(y,MONTHS[normalize(m[3])],Number(m[2]),12); if(!m[4]&&d<new Date(now.getTime()-86400000*30)) d=new Date(y+1,MONTHS[normalize(m[3])],Number(m[2]),12); const before=normalize(clean.slice(Math.max(0,m.index-30),m.index)); const score=/(pour|avant|le|date|rendez|sortie|devoir|jusqu)/.test(before)?4:2; add(d,m[0],m.index,score); }
    if(/apres[- ]?demain/.test(lower)){ const d=new Date(now);d.setDate(d.getDate()+2);add(d,'après-demain',clean.length,5); }
    else if(/\bdemain\b/.test(lower)){ const d=new Date(now);d.setDate(d.getDate()+1);add(d,'demain',clean.length,5); }
    else if(/aujourd['’]?hui/.test(lower)) add(now,"aujourd'hui",clean.length,5);
    for(const [name,wd] of Object.entries(WEEKDAYS)){
      const idx=lower.search(new RegExp(`\\b${name}\\b`)); if(idx<0)continue;
      if(out.some(x=>Math.abs(x.index-idx)<25))continue;
      let delta=(wd-now.getDay()+7)%7; if(delta===0&&/prochain/.test(lower.slice(Math.max(0,idx-15),idx+20)))delta=7; const d=new Date(now);d.setDate(d.getDate()+delta); const before=lower.slice(Math.max(0,idx-25),idx); add(d,name,idx,/(pour|avant|le|rendez|sortie|devoir)/.test(before)?3:1);
    }
    return out.sort((a,b)=>b.score-a.score || b.index-a.index);
  }
  function extractTimes(text){ const out=[]; for(const m of String(text||'').matchAll(/\b([01]?\d|2[0-3])\s*(?:h|:|H)\s*([0-5]\d)?\b/g)){ out.push({value:`${String(Number(m[1])).padStart(2,'0')}:${m[2]||'00'}`,index:m.index}); } return out; }
  function extractObject(text,category){
    const lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const labelled=lines.find(l=>/^(objet|sujet|titre|intitul[ée]|activité|activite)\s*[:\-]/i.test(l));
    if(labelled) return labelled.replace(/^[^:\-]+[:\-]\s*/,'').slice(0,90);
    const matter=String(text||'').match(/(?:mati[eè]re|discipline)\s*[:\-]\s*([^\n]{2,45})/i)?.[1]?.trim();
    if(category==='Devoirs'&&matter)return `Devoirs • ${matter}`;
    const ignore=/ecoledirecte|école directe|accueil|messagerie|notification|menu|retour|déconnexion|deconnexion|publié|publie|envoyé|envoye|classe|élève|eleve/i;
    const candidate=lines.find(l=>l.length>=5&&l.length<=100&&!ignore.test(l)&&!/^\d{1,2}[\/.]/.test(l)&&!/^\d{1,2}:\d{2}/.test(l));
    if(candidate) return candidate.replace(/^[•\-–]\s*/,'').slice(0,90);
    return category==='Devoirs'?'Devoirs':category==='Événement'?'Événement scolaire':category==='Action'?'Action demandée':category==='Message'?'Message ÉcoleDirecte':'Information ÉcoleDirecte';
  }
  function classifyText(text){
    const raw=String(text||''); const clean=raw.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim(); const l=normalize(clean);
    const child=l.includes('theo')?'Théo':l.includes('hayden')?'Hayden':'À confirmer';
    let icon='🏫', category='École';
    if(/travail a faire|devoir|exercice|lecon|dictee|cahier de texte|a faire pour|pour le .* apprendre|apprendre/.test(l)){icon='📚';category='Devoirs';}
    else if(/rendez[- ]?vous|rdv|rencontre|reunion|entretien/.test(l)){icon='💬';category='Action';}
    else if(/sortie|piscine|voyage|visite|excursion|spectacle|cross|activite scolaire/.test(l)){icon='🚌';category='Événement';}
    else if(/absence|retard|sanction|vie scolaire|punition|dispense/.test(l)){icon='🏫';category='Vie scolaire';}
    else if(/message|professeur|enseignant|enseignante|madame|monsieur|direction/.test(l)){icon='💬';category='Message';}
    const dates=extractDates(clean), times=extractTimes(clean); const date=dates[0]?.key||''; const time=times[0]?.value||'';
    const actions=[];
    if(/signer|signature|autorisation/.test(l))actions.push('Signer le document');
    if(/apporter|prevoir|venir avec|amener|ne pas oublier/.test(l))actions.push('Préparer le matériel demandé');
    if(/repondre|reponse|merci de confirmer|confirmer votre presence|confirmer/.test(l))actions.push('Répondre / confirmer');
    if(/payer|paiement|reglement|cotisation/.test(l))actions.push('Effectuer le paiement');
    if(/rendre|a rendre|remettre/.test(l))actions.push('Rendre le travail / document');
    if(category==='Devoirs'&&!actions.length)actions.push('Faire le travail demandé');
    const title=extractObject(clean,category);
    const confidence=[date?1:0,title?1:0,category!=='École'?1:0,child!=='À confirmer'?1:0].reduce((a,b)=>a+b,0);
    return {clean,child,icon,title,category,date,time,actions,dates,times,confidence};
  }

  function analyze(){
    const input=document.getElementById('inputText'),text=input.value.trim(); if(!text){showToast('Ajoute une information');return;}
    const m=classifyText(text); pendingAnalysis={id:`ev_${Date.now()}`,icon:m.icon,title:m.title,text:`${m.child} • ${m.clean.slice(0,220)}`,tag:m.category,date:m.date||dateKey(new Date()),time:m.time,action:m.actions.join(' • ')};
    document.getElementById('analysisBody').innerHTML=`<ul><li>Enfant : <b>${escapeHtml(m.child)}</b></li><li>Objet : <b>${escapeHtml(m.title)}</b></li><li>Date : <b>${escapeHtml(m.date?capitalize(formatDate(m.date)):'à confirmer')}</b></li><li>Catégorie : <b>${escapeHtml(m.category)}</b></li></ul>`;
    document.getElementById('analysis').classList.remove('hidden');
  }
  function saveAnalysis(){ if(!pendingAnalysis)return; const s=state(); s.events=[...(s.events||[]),pendingAnalysis]; selectedDate=pendingAnalysis.date; save(s); pendingAnalysis=null; document.getElementById('inputText').value=''; document.getElementById('analysis').classList.add('hidden'); showToast('Ajouté à l’agenda ✓'); goto('agenda'); }

  function openDb(){ return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}); }
  async function putImage(id,data){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(data,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  async function getImage(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1800,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/jpeg',.84));};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image illisible'));};img.src=url;});}
  function resetPhotoUi(){selectedPhotoData=null;document.getElementById('photoInput').value='';document.getElementById('photoEmpty').classList.remove('hidden');document.getElementById('photoWorkspace').classList.add('hidden');document.getElementById('ocrResult').classList.add('hidden');document.getElementById('ocrProgress').classList.add('hidden');}
  async function selectPhoto(file){if(!file)return;showToast('Préparation de la capture…');try{selectedPhotoData=await compressImage(file);document.getElementById('photoPreview').src=selectedPhotoData;document.getElementById('photoName').textContent=file.name||'capture.jpg';document.getElementById('photoEmpty').classList.add('hidden');document.getElementById('photoWorkspace').classList.remove('hidden');document.getElementById('ocrResult').classList.add('hidden');showToast('Capture prête ✓');}catch{showToast('Impossible de lire cette image');}}
  function setProgress(value,label){document.getElementById('ocrProgressBar').style.width=`${Math.round(value*100)}%`;document.getElementById('ocrProgressText').textContent=label;}
  async function runOcr(){
    if(!selectedPhotoData){showToast('Choisis une image');return;} const btn=document.getElementById('ocrButton');btn.disabled=true;btn.textContent='Lecture en cours…';document.getElementById('ocrProgress').classList.remove('hidden');setProgress(.03,'Chargement OCR…');
    try{if(!window.Tesseract)throw new Error();const result=await Tesseract.recognize(selectedPhotoData,'fra',{logger:m=>{if(m.progress!=null)setProgress(m.progress,m.status==='recognizing text'?'Lecture du texte…':'Préparation OCR…');}});const text=(result.data.text||'').trim();if(!text)throw new Error();fillOcrResult(text);showToast('Capture lue et structurée ✓');}
    catch{fillOcrResult('');showToast('OCR incomplet : corrige le texte puis relance l’analyse');}
    finally{btn.disabled=false;btn.textContent='🔎 Relire la capture';setProgress(1,'Analyse terminée');}
  }
  function fillOcrResult(text, preserveChild=false){
    const m=classifyText(text); document.getElementById('ocrText').value=text;
    if(!preserveChild) document.getElementById('ocrChild').value=CHILDREN.includes(m.child)?m.child:'À confirmer';
    document.getElementById('ocrCategory').value=['École','Devoirs','Événement','Message','Vie scolaire','Action'].includes(m.category)?m.category:'École';
    document.getElementById('ocrTitle').value=m.title; document.getElementById('ocrDate').value=m.date; document.getElementById('ocrTime').value=m.time; document.getElementById('ocrAction').value=m.actions.join(' • ');
    const dateCandidates=m.dates.slice(0,3).map(x=>capitalize(formatDate(x.key,false))).join(', ');
    const bits=[`🎯 Objet : ${m.title}`,m.date?`📅 Date retenue : ${capitalize(formatDate(m.date))}`:'📅 Date à confirmer',m.time?`🕒 Heure : ${m.time}`:'',dateCandidates&&m.dates.length>1?`🔎 Autres dates vues : ${dateCandidates}`:'',m.actions.length?`✅ Action : ${m.actions.join(' • ')}`:''].filter(Boolean);
    document.getElementById('ocrDetected').innerHTML=bits.map(escapeHtml).join('<br>'); document.getElementById('ocrResult').classList.remove('hidden');
  }
  async function sendPhotoInbox(){
    if(!selectedPhotoData){showToast('Aucune capture');return;}
    const raw=document.getElementById('ocrText').value.trim(),child=document.getElementById('ocrChild').value,category=document.getElementById('ocrCategory').value,title=document.getElementById('ocrTitle').value.trim()||'Information ÉcoleDirecte',date=document.getElementById('ocrDate').value,time=document.getElementById('ocrTime').value,action=document.getElementById('ocrAction').value.trim();
    if(!date){showToast('Confirme une date avant l’Inbox');document.getElementById('ocrDate').focus();return;}
    const imageId=`img_${Date.now()}`;try{await putImage(imageId,selectedPhotoData);}catch{showToast('Stockage local impossible');return;}
    const m=classifyText(raw); const item={id:`in_${Date.now()}`,source:'ÉcoleDirecte • capture',icon:m.icon,title,text:`${child} • ${raw.slice(0,240)}`,tag:category,date,time,action,sourceImageId:imageId,sourceText:raw};
    const s=state();s.inbox=[item,...(s.inbox||[])];save(s);closeModal('photoModal');resetPhotoUi();showToast('Capture structurée dans l’Inbox ✓');goto('inbox');
  }
  async function viewSource(imageId,sourceText){try{const data=await getImage(imageId);if(!data){showToast('Capture introuvable sur cet appareil');return;}document.getElementById('sourceImage').src=data;document.getElementById('sourceText').textContent=sourceText||'';openModal('sourceModal');}catch{showToast('Impossible d’ouvrir la capture');}}

  document.addEventListener('click',e=>{
    const day=e.target.closest('.day[data-date]'); if(day){selectedDate=day.dataset.date;renderAgenda();return;}
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.nav){goto(button.dataset.nav);return;}
    const a=button.dataset.action,id=button.dataset.id;
    if(a==='accept-inbox')return acceptInbox(id); if(a==='ignore-inbox')return ignoreInbox(id); if(a==='analyze')return analyze(); if(a==='save-analysis')return saveAnalysis();
    if(a==='reset'){save({initialized:true,inbox:demoInbox,events:[]});showToast('Démo réinitialisée');return;}
    if(a==='today'){selectedDate=dateKey(new Date());renderAgenda();return;}
    if(a==='prev-week'){const d=dateFromKey(selectedDate);d.setDate(d.getDate()-7);selectedDate=dateKey(d);renderAgenda();return;}
    if(a==='next-week'){const d=dateFromKey(selectedDate);d.setDate(d.getDate()+7);selectedDate=dateKey(d);renderAgenda();return;}
    if(a==='add-child'){showToast('Ajout enfant prévu ensuite');return;}
    if(a==='photo'){resetPhotoUi();openModal('photoModal');return;} if(a==='choose-photo'){document.getElementById('photoInput').click();return;} if(a==='close-photo'){closeModal('photoModal');return;} if(a==='run-ocr')return runOcr(); if(a==='reanalyze-ocr'){fillOcrResult(document.getElementById('ocrText').value,true);showToast('Analyse mise à jour');return;} if(a==='send-photo-inbox')return sendPhotoInbox(); if(a==='view-source')return viewSource(button.dataset.imageId,decodeURIComponent(button.dataset.sourceText||'')); if(a==='close-source'){closeModal('sourceModal');return;}
    if(a==='homework'){document.getElementById('inputText').value='Théo : lecture page 18, dictée vendredi, exercices 4 et 5 page 36.';return;} if(a==='voice'){document.getElementById('inputText').value='Dentiste Théo mardi 6 octobre à 16h30.';showToast('Exemple de dictée chargé');return;} if(a==='appointment'){document.getElementById('inputText').value='Hayden entraînement football mercredi à 17h30 toutes les semaines.';return;}
    if(a==='install'){if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.finally(()=>deferredPrompt=null);}else showToast('iPhone : Partager → Sur l’écran d’accueil');}
  });
  document.getElementById('photoInput').addEventListener('change',e=>selectPhoto(e.target.files?.[0]));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
  init();
})();