// ---------- suivi : certificats annulés / remplacés, liste « à faire », préparation des envois ----------
// Dépend de : refOf (défini plus haut). Aucune dépendance au navigateur : testable seul.
// Principe : l'historique partagé ne s'efface jamais. Une annulation ou un remplacement s'ajoute comme une ligne de plus :
//   annulation  -> { ref: "<réf>~ANNUL", d: { ...données, annule: "<réf annulée>", motif } }
//   remplacement-> le nouveau certificat porte d.remplace = "<réf remplacée>"
const SUI=(()=>{
const real=hist=>(hist||[]).filter(h=>h&&h.d&&!h.d.annule);            // vrais certificats (sans les lignes d'annulation)
function status(hist){ // clé -> {type:"annule"|"remplace", at, by, motif, via}
  const m=new Map();
  (hist||[]).forEach(h=>{const d=(h&&h.d)||{};
    if(d.annule)m.set(d.annule,{type:"annule",at:h.at,by:h.by,motif:d.motif||""});
    else if(d.remplace&&!m.has(d.remplace))m.set(d.remplace,{type:"remplace",at:h.at,by:h.by,via:h.ref})});
  return m}
const active=hist=>{const st=status(hist);return real(hist).filter(h=>!st.has(h.ref))};
const gone=hist=>{const st=status(hist),act=new Set(active(hist).map(h=>refOf(h.d)));
  return new Set(real(hist).filter(h=>st.has(h.ref)).map(h=>refOf(h.d)).filter(r=>!act.has(r)))};
// clé de stockage libre pour un certificat : la référence imprimée, ou « réf~R2 », « réf~R3 »… si elle existe déjà
function freeKey(hist,ref){const keys=new Set((hist||[]).map(h=>h.ref));if(!keys.has(ref))return ref;
  for(let n=2;;n++)if(!keys.has(ref+"~R"+n))return ref+"~R"+n}
const annulRec=(h,by,motif,at)=>({ref:h.ref+"~ANNUL",at,by:by||"",d:{...h.d,annule:h.ref,motif}});

// ---- liste « à faire » ----
const todoKey=e=>[e.twimm||"",e.d.num||"",e.d.dAudit||""].join("|");
function todoMerge(old,cands,today){
  const m=new Map();(old||[]).forEach(e=>m.set(todoKey(e),e));
  (cands||[]).forEach(c=>{const e={twimm:c.twimm,d:c.d,reasons:c.reasons||[],infos:c.infos||[],status:c.status,first:today},k=todoKey(e),o=m.get(k);
    if(o&&o.first)e.first=o.first;e.k=k;m.set(k,e)});
  return[...m.values()].map(e=>({...e,k:e.k||todoKey(e)}))}
function todoPrune(list,hist,ignored){
  const act=new Set(active(hist).map(h=>refOf(h.d))),ign=new Set(ignored||[]);
  return(list||[]).filter(e=>!act.has(refOf(e.d))&&!ign.has(e.k||todoKey(e)))}
const ageDays=(iso,today)=>{const a=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||""),b=/^(\d{4})-(\d{2})-(\d{2})/.exec(today||"");
  if(!a||!b)return null;return Math.round((Date.UTC(+b[1],b[2]-1,+b[3])-Date.UTC(+a[1],a[2]-1,+a[3]))/864e5)};

// ---- envois : certificats en vigueur regroupés par site ----
function bySite(items){
  const g=new Map();
  items.forEach(h=>{const c=h.d.siteCode||"????";if(!g.has(c))g.set(c,{code:c,nom:(h.d.siteNom||"").toUpperCase(),items:[]});
    const s=g.get(c);if(!s.nom&&h.d.siteNom)s.nom=h.d.siteNom.toUpperCase();s.items.push(h)});
  g.forEach(s=>s.items.sort((a,b)=>((a.d.adresse||"")+" "+(a.d.etage||"").padStart(3,"0")+" "+(a.d.porte||"")).localeCompare((b.d.adresse||"")+" "+(b.d.etage||"").padStart(3,"0")+" "+(b.d.porte||""))));
  return[...g.values()].sort((a,b)=>a.code.localeCompare(b.code))}
const safeName=s=>String(s||"").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim();
return{real,status,active,gone,freeKey,annulRec,todoKey,todoMerge,todoPrune,ageDays,bySite,safeName}})();
