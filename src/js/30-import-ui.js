// ---------- import twimm : écran, génération en lot, ZIP ----------
const CRC32=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}
  return b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=t[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}})();
function makeZip(files){ // fichiers stockés sans compression (les PDF sont déjà compressés)
  const enc=new TextEncoder(),parts=[],cd=[],now=new Date();
  const dt=((now.getFullYear()-1980)<<9|(now.getMonth()+1)<<5|now.getDate())&0xFFFF,tm=(now.getHours()<<11|now.getMinutes()<<5|now.getSeconds()>>1)&0xFFFF;
  let off=0,cdSize=0;
  for(const f of files){
    const n=enc.encode(f.name),crc=CRC32(f.data),sz=f.data.length;
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);
    h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,n.length,true);h.setUint16(28,0,true);
    parts.push(h.buffer,n,f.data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,tm,true);c.setUint16(14,dt,true);
    c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,n.length,true);c.setUint32(42,off,true);
    cd.push(c.buffer,n);cdSize+=46+n.length;off+=30+n.length+sz}
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cd,e.buffer],{type:"application/zip"})}

const IM={cands:[],out:[]};
const imsg=(t,k)=>{const m=$("imsg");m.className="msg"+(k?" "+k:"");m.textContent=t};
const ST_LABEL={ready:"Prêt",check:"À vérifier",done:"Déjà généré"};

// erreurs bloquantes (mêmes règles que le formulaire « Nouveau », sauf étage/porte facultatifs)
function hard(c){const d=c.d,e=[],today=iso(new Date());
  if(!/^\d{10}$/.test(d.num))e.push("module sur 10 chiffres");
  if(!d.dAudit)e.push("date d'audit manquante");else if(d.dAudit>today)e.push("date d'audit dans le futur");
  if(!d.siteNom)e.push("nom du site");
  if(!d.adresse)e.push("adresse");
  if(!/^\d{5}$/.test(d.cp))e.push("code postal à 5 chiffres");
  if(!d.ville)e.push("ville");
  return e}

function iline(c){const d=c.d;
  const et=[d.etage?`ETG ${U(d.etage)}`:"",d.porte?`PORTE ${U(d.porte)}`:""].filter(Boolean).join(" ")||"sans étage ni porte";
  return `SITE ${d.siteCode} – ${U(d.siteNom)||"?"} · ${et} · ${U(d.adresse)||"adresse ?"}, ${d.cp} ${U(d.ville)} · audit ${fr(d.dAudit)||"?"}`}

function irender(){
  const box=$("ilist"),q=U($("iq").value).replace(/\s+/g," "),fl=$("ifl").value;
  box.innerHTML="";
  const show=IM.cands.filter(c=>(fl==="all"||c.status===fl)&&(!q||U([c.twimm,c.d.num,c.d.adresse,c.d.siteNom,c.d.ville].join(" ")).includes(q)));
  const n={ready:0,check:0,done:0};IM.cands.forEach(c=>n[c.status]++);
  const nt=new Set(IM.cands.map(c=>c.twimm)).size;
  $("isum").textContent=`${nt} intervention(s) lue(s) → ${IM.cands.length} logement(s) : ${n.ready} prêt(s) · ${n.check} à vérifier · ${n.done} déjà généré(s)`;
  const ns=IM.cands.filter(c=>c.sel).length;
  $("igen").textContent=ns?`Générer les ${ns} certificat(s) coché(s)`:"Générer (rien de coché)";$("igen").disabled=!ns;
  if(!show.length){box.textContent="Aucun logement à afficher.";return}
  show.slice(0,400).forEach(c=>box.append(irow(c)));
  if(show.length>400){const p=document.createElement("div");p.className="msg";p.textContent=`${show.length-400} autres lignes : affinez la recherche.`;box.append(p)}}

function irow(c){
  const div=document.createElement("div");div.className="irow "+c.status;
  const head=document.createElement("div");head.className="ihead";
  const cb=document.createElement("input");cb.type="checkbox";cb.checked=c.sel;cb.onchange=()=>{c.sel=cb.checked;irender()};
  const t=document.createElement("div");t.className="itxt";
  const b=document.createElement("b");b.textContent=`twimm ${c.twimm} · module ${c.d.num}`;
  const tag=document.createElement("span");tag.className="tag "+c.status;tag.textContent=ST_LABEL[c.status];
  const s=document.createElement("small");s.textContent=iline(c);
  t.append(b," ",tag,s);head.append(cb,t);div.append(head);
  const rs=c.reasons.concat(hard(c).map(x=>"à corriger : "+x).filter(x=>!c.reasons.includes(x)));
  rs.forEach(r=>{const p=document.createElement("div");p.className="rs warn";p.textContent="⚠ "+r;div.append(p)});
  if(c.status==="ready")c.infos.forEach(r=>{const p=document.createElement("div");p.className="rs";p.textContent="ℹ "+r;div.append(p)});
  const bar=document.createElement("div");bar.className="ibar";
  const be=document.createElement("button");be.textContent="Modifier";
  const bp=document.createElement("button");bp.textContent="PDF";
  bp.onclick=async()=>{const e=hard(c);if(e.length){imsg(`twimm ${c.twimm} : ${e.join(", ")}`,"err");return}
    bp.disabled=true;try{const d={...c.d,dSign:iso(new Date())};save(refOf(d)+".pdf",await makePdf(d))}catch(x){imsg("Erreur : "+x.message,"err")}bp.disabled=false};
  bar.append(be,bp);div.append(bar);
  const ed=document.createElement("div");ed.className="grid hide";ed.style.marginTop="8px";
  const fields=[["num","N° de module"],["dAudit","Date de l'audit","date"],["siteNom","Site (nom)",0,1],["etage","Étage"],["porte","Porte"],["adresse","Adresse",0,1],["cp","Code postal"],["ville","Ville"]];
  const ins={};
  fields.forEach(([k,l,ty,full])=>{const w=document.createElement("div");if(full)w.className="full";const lb=document.createElement("label");lb.textContent=l;
    const i=document.createElement("input");if(ty)i.type=ty;i.value=c.d[k]||"";ins[k]=i;w.append(lb,i);ed.append(w)});
  const ok=document.createElement("button");ok.className="pri full";ok.textContent="Appliquer";
  ok.onclick=()=>{fields.forEach(([k])=>c.d[k]=ins[k].value.trim());c.d.siteCode=c.d.num.slice(0,4);
    c.ref=c.d.num&&c.d.dAudit?refOf(c.d):"";c.infos=[];if(!c.d.etage&&!c.d.porte)c.infos.push("sans étage ni porte");irender()};
  ed.append(ok);div.append(ed);
  be.onclick=()=>ed.classList.toggle("hide");
  return div}

$("csvf").onchange=async ev=>{
  const f=ev.target.files[0];if(!f)return;imsg("Lecture du fichier…");
  try{
    const rows=IMP.parseCSV(IMP.decode(await f.arrayBuffer()));
    const cc=BAK.checkColumns(rows);
    if(!rows.length||cc.blocking.length)throw new Error(rows.length?`ce fichier ne ressemble pas à un export twimm : colonne(s) introuvable(s) : ${cc.blocking.map(m=>"« "+m.label+" »").join(", ")}. Colonnes lues : ${cc.keys.slice(0,12).join(", ")||"aucune"}.`:"le fichier est vide.");
    await load();
    IM.cands=IMP.analyseAll(rows,hist);IM.out=[];$("iout").classList.add("hide");
    const warn=cc.partial.map(m=>`colonne « ${m.label} » absente : ${m.effect}`),sus=BAK.suspicion(IM.cands);if(sus)warn.push(sus);
    $("ires").classList.remove("hide");imsg(`${f.name} : ${rows.length} ligne(s) lue(s).`+(warn.length?" ⚠ "+warn.join(" ⚠ "):""),warn.length?"err":"ok");irender()}
  catch(e){imsg("Erreur : "+e.message,"err")}};
$("iq").oninput=irender;$("ifl").onchange=irender;
$("iby").value=ls.g("by")||"";
$("iall").onclick=()=>{IM.cands.forEach(c=>c.sel=c.status==="ready");irender()};
$("inone").onclick=()=>{IM.cands.forEach(c=>c.sel=false);irender()};

const csvCell=v=>{v=String(v==null?"":v);return/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function indexCsv(list){
  const h=["n_twimm","n_module","fichier","site","etage","porte","adresse","code_postal","ville","date_audit","date_signature"];
  return"﻿"+[h.join(";")].concat(list.map(o=>[o.c.twimm,o.c.d.num,o.ref+".pdf",`${o.c.d.siteCode} - ${U(o.c.d.siteNom)}`,o.c.d.etage,o.c.d.porte,U(o.c.d.adresse),o.c.d.cp,U(o.c.d.ville),fr(o.c.d.dAudit),fr(o.d.dSign)].map(csvCell).join(";"))).join("\r\n")}

$("igen").onclick=async()=>{
  const sel=IM.cands.filter(c=>c.sel);if(!sel.length)return;
  const bad=[],refs=new Set();
  sel.forEach(c=>{const e=hard(c),r=c.ref;if(r&&refs.has(r))e.push("même certificat coché deux fois");refs.add(r);if(e.length)bad.push(`twimm ${c.twimm} / module ${c.d.num} : ${e.join(", ")}`)});
  if(bad.length){imsg("À corriger avant de générer — "+bad.slice(0,4).join(" | ")+(bad.length>4?` … (+${bad.length-4})`:""),"err");return}
  const manual=sel.filter(c=>c.status!=="ready").length;
  if(manual&&!confirm(`${sel.length} certificat(s) vont être générés, dont ${manual} marqué(s) « à vérifier » ou « déjà généré » que vous avez cochés vous-même. Continuer ?`))return;
  const by=normName($("iby").value);$("iby").value=by;ls.s("by",by);
  $("igen").disabled=true;IM.out=[];const fails=[];let shared=0,pending=0;
  for(let i=0;i<sel.length;i++){const c=sel[i];imsg(`Génération ${i+1}/${sel.length} (twimm ${c.twimm})…`);
    try{const d={...c.d,dSign:iso(new Date())},ref=refOf(d),blob=await makePdf(d);
      IM.out.push({c,d,ref,blob});
      const st=await add({ref,at:new Date().toISOString(),by,d});if(st==="pending")pending++;else if(st==="shared")shared++;
      c.status="done";c.sel=false;c.reasons=["généré à l'instant"]}
    catch(e){fails.push(`twimm ${c.twimm} : ${e.message}`)}}
  imsg(`${IM.out.length} certificat(s) généré(s)`+(fails.length?` — ${fails.length} échec(s) : ${fails.slice(0,3).join(" | ")}`:"")+(pending?` (${pending} en attente d'envoi à l'historique partagé)`:""),fails.length?"err":"ok");
  irender();showOut()};

function showOut(){
  const box=$("iolist");box.innerHTML="";
  if(!IM.out.length){$("iout").classList.add("hide");return}
  $("iout").classList.remove("hide");
  IM.out.forEach(o=>{const div=document.createElement("div");div.className="hist";const l=document.createElement("div");
    const b=document.createElement("b");b.textContent=`twimm ${o.c.twimm} · module ${o.c.d.num}`;
    const s=document.createElement("small");s.textContent=o.ref+".pdf";l.append(b,s);
    const bt=document.createElement("button");bt.textContent="PDF";bt.onclick=()=>save(o.ref+".pdf",o.blob);
    div.append(l,bt);box.append(div)})}

$("izip").onclick=async()=>{
  if(!IM.out.length)return;const b=$("izip");b.disabled=true;
  try{const dir=$("izd").checked,files=[];
    for(const o of IM.out)files.push({name:(dir?o.c.twimm+"/":"")+o.ref+".pdf",data:new Uint8Array(await o.blob.arrayBuffer())});
    files.push({name:"index_certificats.csv",data:new TextEncoder().encode(indexCsv(IM.out))});
    save(`certificats_${iso(new Date()).replace(/-/g,"")}.zip`,makeZip(files))}
  catch(e){imsg("Erreur ZIP : "+e.message,"err")}b.disabled=false};
$("iidx").onclick=()=>{if(IM.out.length)save("index_certificats.csv",new Blob([indexCsv(IM.out)],{type:"text/csv;charset=utf-8"}))};

