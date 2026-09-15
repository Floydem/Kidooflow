(() => {
  const KEY = 'kidooflow_v03';
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

  function state(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(next){ localStorage.setItem(KEY, JSON.stringify(next)); render(); }
  function init(){ const s = state(); if(!s.initialized) save({initialized:true,inbox:demoInbox,events:[]}); else render(); }
  function escapeHtml(v){ return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function showToast(message){ const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),1600); }
  function goto(page){ document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page)); document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===page)); window.scrollTo(0,0); }
  function eventHtml(x){ return `<article class="event"><div class="ico">${x.icon}</div><div><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.text)}</p></div><span class="tag">${escapeHtml(x.tag)}</span></article>`; }
  function render(){
    const s=state(); const inbox=s.inbox||[]; const events=[...baseEvents,...(s.events||[])];
    document.getElementById('inboxCount').textContent=inbox.length;
    document.getElementById('inboxChip').textContent=`${inbox.length} élément${inbox.length===1?'':'s'} Inbox`;
    document.getElementById('eventCount').textContent=events.length;
    document.getElementById('todayList').innerHTML=events.slice(0,4).map(eventHtml).join('');
    document.getElementById('agendaList').innerHTML=events.map(eventHtml).join('');
    document.getElementById('inboxList').innerHTML=inbox.length ? inbox.map(x=>`<article class="inbox-card"><div class="top"><span class="source">${x.icon} ${escapeHtml(x.source)}</span><span class="tag">${escapeHtml(x.tag)}</span></div><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.text)}</p><div class="inbox-actions"><button data-action="ignore-inbox" data-id="${x.id}">Ignorer</button><button class="accept" data-action="accept-inbox" data-id="${x.id}">Ajouter ✓</button></div></article>`).join('') : '<div class="empty">Inbox vide 🎉</div>';
  }
  function acceptInbox(id){ const s=state(); const x=(s.inbox||[]).find(i=>i.id===id); if(!x)return; s.inbox=s.inbox.filter(i=>i.id!==id); s.events=[...(s.events||[]),{icon:x.icon,title:x.title,text:x.text,tag:x.tag}]; save(s); showToast('Ajouté à l’agenda ✓'); }
  function ignoreInbox(id){ const s=state(); s.inbox=(s.inbox||[]).filter(i=>i.id!==id); save(s); showToast('Élément ignoré'); }
  function analyze(){
    const input=document.getElementById('inputText'); const text=input.value.trim(); if(!text){showToast('Ajoute une information');return;}
    const l=text.toLowerCase(); const child=l.includes('théo')||l.includes('theo')?'Théo':l.includes('hayden')?'Hayden':'À confirmer';
    let icon='📝',title='Nouvelle information',tag='Famille';
    if(l.includes('dentiste')||l.includes('médecin')||l.includes('medecin')){icon='🦷';title=l.includes('dentiste')?'Dentiste':'Médecin';tag='Santé';}
    else if(l.includes('football')||l.includes('sport')){icon='⚽️';title='Activité sportive';tag='Sport';}
    else if(l.includes('dictée')||l.includes('exercice')||l.includes('lecture')){icon='📚';title='Devoirs détectés';tag='Devoirs';}
    else if(l.includes('prof')||l.includes('école')||l.includes('ecole')){icon='💬';title='Information scolaire';tag='École';}
    pendingAnalysis={icon,title,text:`${child} • ${text}`,tag};
    document.getElementById('analysisBody').innerHTML=`<ul><li>Enfant : <b>${child}</b></li><li>Catégorie : <b>${tag}</b></li><li>Titre : <b>${title}</b></li><li>Source : <b>ajout manuel</b></li></ul>`;
    document.getElementById('analysis').classList.remove('hidden');
  }
  function saveAnalysis(){ if(!pendingAnalysis)return; const s=state(); s.events=[...(s.events||[]),pendingAnalysis]; save(s); pendingAnalysis=null; document.getElementById('inputText').value=''; document.getElementById('analysis').classList.add('hidden'); showToast('Ajouté à l’agenda ✓'); goto('agenda'); }

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
    if(action==='photo'){ document.getElementById('photoInput').click(); return; }
    if(action==='homework'){ document.getElementById('inputText').value='Théo : lecture page 18, dictée vendredi, exercices 4 et 5 page 36.'; return; }
    if(action==='voice'){ document.getElementById('inputText').value='Dentiste Théo mardi 6 octobre à 16h30.'; showToast('Exemple de dictée chargé'); return; }
    if(action==='appointment'){ document.getElementById('inputText').value='Hayden entraînement football mercredi à 17h30 toutes les semaines.'; return; }
    if(action==='install'){
      if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt.userChoice.finally(()=>deferredPrompt=null); }
      else showToast('iPhone : Partager → Sur l’écran d’accueil');
    }
  });
  document.addEventListener('click',(e)=>{ const day=e.target.closest('.day'); if(!day)return; document.querySelectorAll('.day').forEach(d=>d.classList.remove('active')); day.classList.add('active'); });
  document.getElementById('photoInput').addEventListener('change',(e)=>{ if(e.target.files?.[0]) showToast('Capture sélectionnée ✓'); });
  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e;});
  init();
})();
