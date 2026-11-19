// ---------- sauvegarde / restauration de l'historique, et contrôle du format de l'export twimm ----------
// Dépend de : IMP, U, fr (définis plus haut)
const BAK=(()=>{
const HEAD=["reference","date","etabli_par","n_twimm","module","site","etage","porte","adresse","code_postal","ville","date_audit","date_signature","donnees"];
const cell=v=>{v=String(v==null?"":v);return/[;"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const dfr=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||"");return m?`${m[3]}/${m[2]}/${m[1]}`:""};
const diso=s=>{const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s||"").trim());return m?`${m[3]}-${m[2]}-${m[1]}`:(/^\d{4}-\d{2}-\d{2}/.test((s||"").trim())?s.trim().slice(0,10):"")};

// CSV lisible dans Excel (colonnes claires) ; la dernière colonne contient les données exactes pour une restauration sans perte.
function histCsv(hist){
  const rows=hist.slice().sort((a,b)=>(a.at||"").localeCompare(b.at||"")).map(h=>{const d=h.d||{};
    return[h.ref,h.at||"",h.by||"",d.twimm||"",d.num,`${d.siteCode||""} - ${U(d.siteNom)}`,d.etage,d.porte,U(d.adresse),d.cp,U(d.ville),dfr(d.dAudit),dfr(d.dSign),JSON.stringify(d)].map(cell).join(";")});
  return"﻿"+[HEAD.join(";")].concat(rows).join("\r\n")+"\r\n"}

// Relit un fichier de sauvegarde. Si la colonne « donnees » est absente ou abîmée, on reconstruit depuis les colonnes lisibles.
function histFromCsv(text){
  const rows=IMP.parseCSV(text),items=[];let bad=0;
  if(!rows.length||!("reference" in rows[0]))throw new Error("ce fichier ne ressemble pas à une sauvegarde de l'historique (colonne « reference » introuvable).");
  rows.forEach(r=>{
    const ref=(r.reference||"").trim();let d=null;
    try{d=JSON.parse(r.donnees)}catch(e){}
    if(!d||typeof d!=="object"){
      const site=(r.site||"").split(" - ");
      d={num:(r.module||"").trim(),siteCode:(site[0]||"").trim(),siteNom:site.slice(1).join(" - ").trim(),etage:(r.etage||"").trim(),porte:(r.porte||"").trim(),
        adresse:(r.adresse||"").trim(),cp:(r.codepostal||"").trim(),ville:(r.ville||"").trim(),dAudit:diso(r.dateaudit),dSign:diso(r.datesignature)};
      if(r.ntwimm)d.twimm=r.ntwimm.trim()}
    if(!ref||!/^\d{10}$/.test(String(d.num||""))||!d.dAudit||!d.adresse){bad++;return}
    items.push({ref,at:(r.date||"").trim()||new Date().toISOString(),by:(r.etablipar||"").trim(),d})});
  return{items,bad}}

// ---- contrôle des colonnes de l'export twimm ----
const COLS=[
  ["ntwimm","N° twimm",1,"impossible d'identifier les interventions"],
  ["objet","Objet",1,"le module et l'adresse du logement sont lus dans l'objet"],
  ["bilan","Bilan",0,"sans le bilan du technicien, aucun logement ne peut être jugé sans anomalie"],
  ["statut","Statut",0,"les interventions non terminées ne seront pas reconnues"],
  ["codezone","Code zone",0,"le module ne sera lu que dans l'objet, sans recoupement"],
  ["debutpassagesrealises","Début passages réalisés",0,"la date d'audit (dernier passage) ne pourra pas être déterminée"],
  ["localisationdubi","Localisation du BI",0,"l'adresse et l'étage ne seront pas recoupés"],
  ["codesite","Code Site",0,"le site sera déduit du module seulement"],
  ["nomsite","Nom Site",0,"le nom du site viendra des listes seulement"],
  ["cpsite","CP Site",0,"le code postal viendra de l'objet seulement"],
  ["ville","Ville",0,"la ville viendra de l'objet ou des listes seulement"]];
function checkColumns(rows){
  const keys=rows&&rows[0]?Object.keys(rows[0]):[];
  const missing=COLS.filter(c=>!keys.includes(c[0])).map(c=>({key:c[0],label:c[1],blocking:!!c[2],effect:c[3]}));
  return{keys,missing,blocking:missing.filter(m=>m.blocking),partial:missing.filter(m=>!m.blocking)}}

// Presque tout « à vérifier » pour le même motif : signe d'un export changé plutôt que de vrais problèmes.
function suspicion(cands){
  if(cands.length<5)return"";
  const n={};let chk=0;
  cands.forEach(c=>{if(c.status!=="check")return;chk++;const k=(c.reasons[0]||"").replace(/\d+/g,"#").slice(0,70);n[k]=(n[k]||0)+1});
  const top=Object.keys(n).sort((a,b)=>n[b]-n[a])[0];
  if(top&&n[top]/cands.length>=0.8)return`${n[top]} logement(s) sur ${cands.length} sont « à vérifier » pour le même motif (« ${top.replace(/#/g,"…")} ») : le format de l'export twimm a peut-être changé. Comparez avec un export récent avant de continuer.`;
  return""}

return{histCsv,histFromCsv,checkColumns,suspicion,HEAD}})();
