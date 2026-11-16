// ---------- import du fichier twimm (CSV) ----------
// Dépend de : SITES, U, iso, fr, refOf (définis plus haut dans l'application)
const IMP=(()=>{
const strip=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"");
const clean=s=>strip(s).replace(/[’‘`´]/g,"'").replace(/[ \t]+/g," ").replace(/\s+/g," ").trim();
const hkey=s=>strip(s).toLowerCase().replace(/[^a-z0-9]/g,"");
const pad4=s=>String(s||"").replace(/\D/g,"").padStart(4,"0").slice(-4);

function decode(buf){
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buf)}
  catch(e){return new TextDecoder("windows-1252").decode(buf)}}

function parseCSV(t){
  t=t.replace(/^﻿/,"");
  const first=t.split(/\r?\n/)[0]||"";
  const sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?";":",";
  const rows=[];let row=[],f="",q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===sep){row.push(f);f=""}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.some(x=>x!==""))rows.push(row);row=[]}
    else f+=c}
  if(f!==""||row.length){row.push(f);if(row.some(x=>x!==""))rows.push(row)}
  if(!rows.length)return[];
  const keys=rows[0].map(hkey);
  return rows.slice(1).map(r=>{const o={};keys.forEach((k,i)=>{if(!(k in o))o[k]=(r[i]||"").replace(/\r/g,"")});return o})}

// ---- villes connues par code postal (d'après les listes de sites) ----
let cpVilleMap=null;
function cpVille(cp){
  if(!cpVilleMap){cpVilleMap={};for(const k in SITES)for(const s of SITES[k]){
    if(!s[2]||!s[3])continue;const m=cpVilleMap[s[2]]||(cpVilleMap[s[2]]={});m[s[3]]=(m[s[3]]||0)+1}}
  const m=cpVilleMap[cp];if(!m)return"";
  return Object.keys(m).sort((a,b)=>m[b]-m[a])[0]}

// ---- module ----
const normMod=s=>{const d=String(s||"").replace(/\D/g,"");
  if(d.length===10)return d;if(d.length===9)return"0"+d;return""};
let extraSites=new Set(); // codes de site présents dans le fichier importé, même absents des listes
const siteKnown=m=>m&&(!!SITES[m.slice(0,4)]||extraSites.has(m.slice(0,4)));

function findModules(objet){
  let t=clean(objet).toUpperCase();
  t=t.replace(/(\d{4})[ .](\d{2})[ .](\d{4})(?!\d)/g,"$1$2$3").replace(/(?<!\d)(\d{4}) (\d{6})(?!\d)/g,"$1$2");
  const mods=[],bad=[];
  for(const m of t.matchAll(/(?<![\d])\d{8,11}(?!\d)/g)){
    const n=normMod(m[0]);
    if(n&&siteKnown(n))mods.push({m:n,i:m.index,e:m.index+m[0].length});
    else if(/MOD\w*\W{0,4}$/.test(t.slice(Math.max(0,m.index-12),m.index)))bad.push(m[0])}
  return{t,mods,bad}}

// ---- adresse / étage / porte ----
const TYPES="RUE|AVENUE|AV|ALLEE|ALLEES|ALL|BOULEVARD|BD|BLD|BVD|PLACE|PL|IMPASSE|IMP|CHEMIN|CHE|ROUTE|RTE|SQUARE|SQ|RESIDENCE|RES|MAIL|PASSAGE|PROMENADE|HAMEAU|VILLA|COURS|QUAI|SENTIER|DOMAINE|PLATEAU|CITE|PARC|RUELLE|CIRCEE|CLOS|PD|PONT|ESPLANADE|PARVIS|VOIE|LOTISSEMENT|TRAVERSE|VENELLE|FAUBOURG|FG|GRAND RUE|ROND POINT";
const RE_STREET=new RegExp("(?<![\\w])(\\d{1,3}(?:\\s?(?:BIS|TER|QUATER|[A-Z]))?(?:-\\d{1,3})?)\\s+((?:"+TYPES+")\\b.*)$");
const RE_CUT=/\s(?:RDC|ETG|ETAGE|\d{1,2}\s?(?:E|EME|ER|IEME)\s?(?:ETAGE|ETG)|PTE|PORTE(?!\s(?:DE|DU|DES|D')\b)|APPT|APT|LOGT|LOGEMENT|GAUCHE|DROITE|EX|ESC)\b.*$/;
function findAddress(region){
  let r=region.trim().replace(/^[-–:•,\s]+/,"");
  let m=RE_STREET.exec(r);let addr="",at=-1;
  if(m){addr=(m[1]+" "+m[2]);at=m.index}
  else{ // sans type de voie : dernier "n° MOTS" de la zone
    const m2=/(\d{1,3}(?:\s?(?:BIS|TER|[A-Z]))?)\s+([A-Z][A-Z' .\-_0-9]*)$/.exec(r);
    if(m2){addr=m2[1]+" "+m2[2];at=m2.index}}
  if(!addr)return null;
  addr=addr.replace(RE_CUT,"").replace(/[_\s]*(?:BATIMENT|BAT|BT)(?:\s+[A-Z0-9]{1,3})?\s*$/,"").replace(/_\d+\s*$/,"").replace(/\s+/g," ").trim();
  return{addr,at}}

function findEtagePorte(rest){
  let e="",p="";
  let m=/\b(?:ETG|ETAGE|ETAG)\s*[:\-.]?\s*(\d{1,2}|RDC)\b/.exec(rest)
    ||/\b(\d{1,2})\s?(?:E|EME|ER|IEME)\s?(?:ETAGE|ETG)\b/.exec(rest)
    ||/\bETAGE\s*(\d{1,2})\b/.exec(rest);
  if(m)e=m[1];else if(/\bRDC\b/.test(rest))e="RDC";
  e=e.replace(/^0+(?=\d)/,"");
  m=/\b(?:PORTE|PTE|APPT|APT|APPARTEMENT)\s*[:\-.N°]*\s*((?:[A-Z]{0,2}\d[A-Z0-9\-]*|GAUCHE|DROITE|FACE)(?:\s(?:GAUCHE|DROITE))?)\b/.exec(rest)
    ||/\b(?:LOGT|LOGEMENT)\s*[:\-.N°]*\s*([A-Z]{0,2}\d[A-Z0-9\-]*)\b/.exec(rest);
  if(m)p=m[1];
  else{const g=/\b(GAUCHE|DROITE)\b/.exec(rest);if(g)p=g[1]}
  return{etage:e,porte:p}}

// ---- recoupement avec la « Localisation du BI » ----
const STOP=new Set(["DE","DU","DES","LA","LE","LES","ET","D","L","AU","AUX","SUR","SOUS","EN"]);
const nnum=x=>String(x||"").replace(/\s+/g,"").replace(/BIS$/,"B").replace(/TER$/,"T").replace(/QUATER$/,"Q");
function locCheck(loc,addr){
  const L=clean(loc).toUpperCase().replace(/_/g," ");if(!L)return null;
  const mo=RE_STREET.exec(addr);
  const nm=(mo?mo[2]:addr).replace(new RegExp("^(?:"+TYPES+")\\s+"),"")
    .replace(/[^A-Z ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)).sort((a,b)=>b.length-a.length)[0];
  const nameOk=!nm||L.includes(nm.slice(0,Math.min(nm.length,6)));
  // numéro de rue : comparé à celui de l'adresse de la localisation (exactement)
  let numOk=true;
  if(mo){const nums=[...L.matchAll(new RegExp("(?<![\\w])(\\d{1,3}(?:\\s?(?:BIS|TER|QUATER|[A-Z]))?(?:-\\d{1,3})?)\\s+(?:"+TYPES+")\\b","g"))].map(x=>nnum(x[1]));
    if(nums.length)numOk=nums.includes(nnum(mo[1]))}
  return numOk&&nameOk}
function locEtage(loc){
  const m=/\/\s*(RDC|\d{1,2})\s*\/\s*[^\/]*$/.exec(clean(loc).toUpperCase());
  return m?m[1].replace(/^0+(?=\d)/,""):""}

// ---- verdict du bilan (dernier passage) ----
function bilanVerdict(bilan){
  const raw=String(bilan||"").replace(/\r/g,"");
  const parts=raw.split(/^Par .+? le \d\d\/\d\d\/\d{4}\s*:/m);
  const last=parts[parts.length-1];
  let t=clean(last).toLowerCase();
  const all=clean(raw).toLowerCase();
  const why=[];
  if(/impossible de faire le cni|cni impossible|pas de cni/.test(all))why.push("« impossible de faire le CNI »");
  const W="(?:de|d'|du|des|ou|et|ni)";
  const N="(?:trace|traces|trasse|nuisible|nuisibles|infestation|cafard|cafards|punaise|punaises|presence|deject\\w*|excrement\\w*)";
  const T=t.replace(/traitement de re?l?o?cation/g," ")
    .replace(/\b(?:pas|plus|non)\s+(?:d')?infest\w*/g," ")
    .replace(new RegExp("\\b(?:aucun[e]?|sans|pas)\\s+(?:"+W+"\\s*)*(?:"+N+"\\b\\s*(?:"+W+"\\s*)*)+","g")," ")
    .replace(/\bn' ?(?:ai|a)\s+pas\s+(?:constate|vu|trouve|observe)[^.;,!]*?(?=\s+mais\b|[.;,!]|$)/g," ");
  const NEG=[["infest","infestation"],["cafard","cafards"],["punaise","punaises"],["souris","souris"],["crotte","crottes"],["excrement","excréments"],
    ["deject","déjections"],["cadavre","cadavres"],["nuisible","nuisibles"],["\\btrace","traces"],["trasse","traces"],["doute","doute"],
    ["pulveris","pulvérisation"],["fumigation","fumigation"],["desinsect","désinsectisation"],["goliath","gel"],["bombe","bombe"],
    ["preconis","préconisation"],["prevoi","« prévoir »"],["recommand","recommandation"],["besoin","besoin"],
    ["deja","« déjà fait/loué »"],["doublon","doublon"],["relou","déjà reloué"],["habite","logement habité"],["occupe","logement occupé"],
    ["non effectu","non effectuée"],["impossible","impossible"],["pas possible","pas possible"],["report","reporté"],["suspendu","suspendu"],
    ["absent","absent"],["pas de reponse","pas de réponse"],["refus","refus"],["inaccessible","inaccessible"],["probleme","problème"]];
  for(const[k,l]of NEG)if(new RegExp(k).test(T)&&!why.includes(l))why.push(l);
  if(!why.length&&!/effectu|\bfait|\bras\b|r\.a\.s|rien|\bok\b|aucun|propre|succes|sain|conforme|a signaler|pas infest|tout va bien|non infest|n' ?(?:ai|a) pas (?:constate|vu|trouve|observe)|aucune? (?:trace|nuisible|infestation|presence)|pas de trace/.test(t))why.push("bilan non explicite");
  return{ok:!why.length,why,text:clean(last)}}

// ---- dates ----
function lastAudit(r){
  const src=r.debutpassagesrealises||r.finpassagesrealises||"";
  const ds=[...src.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)].map(m=>`${m[3]}-${m[2]}-${m[1]}`);
  return ds.length?ds.sort().pop():""}

const STATUTS_OK=/^(verifie|cloture|termine|realise|facture|valide)/;
const sName=code=>{const L=SITES[code]||[];const n=[...new Set(L.map(x=>U(x[0])))];return n.length===1?n[0]:""};

// ---- analyse d'une ligne du CSV ----
function analyse(r){
  const twimm=(r.ntwimm||"").trim();
  const reasons=[],infos=[];
  const csvSite=pad4((r.codesite||"").split("_")[0]);
  const z=normMod(r.codezone);
  const {t,mods,bad}=findModules(r.objet);
  const list=[];
  if(z)list.push(z);
  mods.forEach(x=>{if(!list.includes(x.m))list.push(x.m)});
  if(!list.length)list.push(""); // aucun module exploitable : on garde la ligne, à corriger à la main
  const multi=list.length>1;
  const common=[];
  if(!z)common.push(r.codezone?`Code zone invalide (${r.codezone})`:(mods.length?"Code zone absent : module lu dans le texte":"Code zone absent"));
  if(bad.length)common.push("numéro de module illisible dans l'objet ("+bad.join(", ")+")");
  if(z&&mods.length&&!mods.some(x=>x.m===z))common.push(`module ${z} (Code zone) absent de l'objet, qui indique ${mods.map(x=>x.m).join(", ")}`);
  if(!list.length)common.push("aucun module trouvé");
  if(!STATUTS_OK.test(clean(r.statut).toLowerCase()))common.push("statut « "+(r.statut||"?")+" »");
  const audit=lastAudit(r);
  if(!audit)common.push("aucun passage réalisé");
  const bv=bilanVerdict(r.bilan);
  if(!bv.ok)common.push("bilan : "+bv.why.join(", "));
  if(multi)common.push(`${list.length} logements dans l'intervention : vérifier lesquels ont été faits`);
  const out=[];
  list.forEach((m,k)=>{
    const rs=common.slice();
    const tok=m?mods.find(x=>x.m===m):null;
    let seg="",before="";
    if(!m){seg=t}
    else if(tok){const nx=mods.filter(x=>x.i>tok.i&&x.m!==m).sort((a,b)=>a.i-b.i)[0];
      seg=t.slice(tok.e,nx?nx.i:undefined);before=t.slice(0,tok.i)}
    // CP : après le module, 5 chiffres suivis d'une ville
    const mcp=/(?<![\d])(\d{5})\s+([A-Z][A-Z' .\-]*)/.exec(seg);
    const region=mcp?seg.slice(0,mcp.index):seg;
    let fa=findAddress(region)||(!multi?findAddress(before.replace(/\bMODULE\b\W*$/,"")):null);
    const addrTxt=fa?fa.addr:"";
    const restTxt=fa?(region.slice(0,fa.at)+" "+region.slice(fa.at).replace(fa.addr,"")):region;
    const ep=findEtagePorte(" "+restTxt+" ");
    const site4=m?m.slice(0,4):csvSite;
    const sameSite=site4===csvSite;
    let nom=sameSite?U(r.nomsite):sName(site4);
    if(!nom)rs.push("nom du site introuvable pour le site "+site4);
    if(!sameSite)rs.push(`le module est du site ${site4} mais l'intervention est sur le site ${csvSite}`);
    // adresse
    let adresse=addrTxt,cp="",ville="";
    if(!adresse){rs.push("adresse du logement introuvable dans l'objet")}
    else if(!multi){
      const ck=locCheck(r.localisationdubi,adresse);
      if(ck===null)rs.push("adresse non recoupée (localisation du BI vide)");
      else if(!ck)rs.push(`adresse de l'objet « ${adresse} » différente de la localisation du BI`)}
    const csvCp=(r.cpsite||"").trim();
    cp=mcp?mcp[1]:csvCp;
    if(cp===csvCp&&sameSite)ville=U(r.ville);
    else ville=cpVille(cp)||(mcp?mcp[2].trim().replace(/\s+/g," "):"");
    if(!/^\d{5}$/.test(cp))rs.push("code postal manquant");
    if(!ville)rs.push("ville introuvable");
    // étage
    if(!multi&&ep.etage){const le=locEtage(r.localisationdubi);
      if(le&&le!==ep.etage)rs.push(`étage ${ep.etage} dans l'objet mais ${le} dans la localisation du BI`)}
    if(!ep.etage&&!ep.porte)infos.push("sans étage ni porte");
    else if(!ep.etage)infos.push("sans étage");else if(!ep.porte)infos.push("sans porte");
    const d={num:m||(bad[0]||"").replace(/\D/g,""),dAudit:audit,siteNom:nom,etage:ep.etage,porte:ep.porte,adresse:U(adresse),cp,ville,
      siteCode:site4,dSign:iso(new Date()),twimm};
    out.push({d,reasons:[...new Set(rs)],infos:k===0?infos.slice():infos.slice(),multi,twimm,main:m===z})});
  return out}

function analyseAll(rows,hist){
  extraSites=new Set(rows.map(r=>pad4((r.codesite||"").split("_")[0])).filter(c=>c!=="0000"));
  const refs=new Map();(hist||[]).forEach(h=>refs.set(h.ref,h));
  const seen=new Map();const cands=[];
  rows.forEach((r,ri)=>{
    if(!(r.ntwimm||"").trim())return;
    analyse(r).forEach(c=>{
      c.ref=c.d.num&&c.d.dAudit?refOf(c.d):"";
      c.line=ri+2;c.status=c.reasons.length?"check":"ready";c.sel=c.status==="ready";
      if(c.ref&&refs.has(c.ref)){c.status="done";c.sel=false;c.reasons.unshift("déjà dans l'historique")}
      else if(c.ref&&seen.has(c.ref)){c.status="done";c.sel=false;c.reasons.unshift("même certificat que l'intervention "+seen.get(c.ref))}
      else if(c.ref)seen.set(c.ref,c.twimm);
      cands.push(c)})});
  return cands}

return{decode,parseCSV,analyse,analyseAll,bilanVerdict}})();
