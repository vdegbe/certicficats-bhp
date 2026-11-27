// ---------- écrans : « À faire » (certificats oubliés) et « Envois » (préparation par site) ----------
// Dépend de : SUI, IM, irender, imsg, makeZip, csvCell, makePdf, save, hist, load, ls, iso, fr, U, refOf, tab, $
const todayIso=()=>iso(new Date());

// ---- À faire : mémorise, après chaque import, les logements non encore certifiés ----
function todoSave(cands){
  const list=SUI.todoMerge(ls.g("todo")||[],cands.filter(c=>c.status!=="done").map(c=>({twimm:c.twimm,d:c.d,reasons:c.reasons,infos:c.infos,status:c.status})),todayIso());
  ls.s("todo",list);ls.s("todoAt",new Date().toISOString())}
function todoList(){const l=SUI.todoPrune(ls.g("todo")||[],hist,ls.g("ign")||[]);return l}
function todoBadge(){const n=todoList().length;$("t7").textContent=n?`À faire (${n})`:"À faire"}
function renderTodo(){
  const box=$("tlist"),list=todoList().sort((a,b)=>(a.d.dAudit||"").localeCompare(b.d.dAudit||""));box.innerHTML="";
  const at=ls.g("todoAt"),old=at&&SUI.ageDays(at.slice(0,10),todayIso());
  const nr=list.filter(e=>e.status==="ready").length;
  $("tsum").textContent=list.length?`${list.length} logement(s) sans certificat : ${nr} prêt(s), ${list.length-nr} à vérifier.`:"Rien à faire pour l’instant.";
  $("tinfo").textContent=at?`Liste construite à partir de vos imports (dernier import : ${fr(at.slice(0,10))})${old>7?` — il date de ${old} jours : importez un export récent pour la mettre à jour`:""}.`:"Cette liste se remplit toute seule quand vous importez un export twimm (onglet Import). Elle ne contient que les logements qui n’ont pas encore de certificat.";
  $("tinfo").className="msg"+(old>7?" err":"");
  $("tgo").disabled=!list.length;$("tclr").disabled=!list.length;
  if(!list.length){box.textContent="";return}
  list.forEach(e=>{const div=document.createElement("div");div.className="hist";const l=document.createElement("div");
    const age=SUI.ageDays(e.d.dAudit,todayIso()),cls=age==null?"":age>=30?"red":age>=7?"warn":"";
    const b=document.createElement("b");b.textContent=`${U(e.d.adresse)||"adresse ?"} — ${e.d.etage?"ÉT. "+e.d.etage:""}${e.d.porte?" P. "+e.d.porte:""}`;
    const tg=document.createElement("span");tg.className="tag "+(age!=null&&age>=7?"annule":e.status);tg.textContent=age==null?"date ?":age<=0?"audit du jour":`audit il y a ${age} j`;
    const sm=document.createElement("small");sm.textContent=`module ${e.d.num} · site ${e.d.siteCode} ${U(e.d.siteNom)} · audit ${fr(e.d.dAudit)||"?"} · twimm ${e.twimm}`;
    l.append(b," ",tg,sm);
    (e.status==="check"?e.reasons:[]).forEach(r=>{const p=document.createElement("small");p.className="warn";p.textContent="⚠ "+r;l.append(p)});
    const bt=document.createElement("div");bt.className="bt";
    const o=document.createElement("button");o.textContent="Ouvrir";o.onclick=()=>{REP.key="";repBanner();reopen({d:e.d})};
    const ig=document.createElement("button");ig.textContent="Ignorer";ig.onclick=()=>{if(!confirm("Retirer ce logement de la liste ? (il ne reviendra pas, même à un prochain import)"))return;
      const g=ls.g("ign")||[];g.push(e.k);ls.s("ign",g);renderTodo();todoBadge()};
    bt.append(o,ig);div.append(l,bt);box.append(div)})}
$("tgo").onclick=()=>{ // envoie toute la liste dans l'écran Import, qui sait vérifier, corriger et générer en lot
  const list=todoList();if(!list.length)return;
  IM.cands=list.map(e=>({d:{...e.d,dSign:todayIso()},twimm:e.twimm,reasons:(e.reasons||[]).slice(),infos:(e.infos||[]).slice(),status:e.status,sel:e.status==="ready",ref:refOf(e.d),multi:false,main:true,line:0}));
  IM.out=[];$("iout").classList.add("hide");$("ires").classList.remove("hide");
  imsg(`${list.length} logement(s) repris de la liste « À faire ». Vérifiez, corrigez si besoin, puis générez.`,"ok");irender();tab(4)};
$("tclr").onclick=()=>{if(!confirm("Vider toute la liste « À faire » ? Elle se remplira à nouveau au prochain import."))return;ls.s("todo",[]);ls.s("ign",[]);renderTodo();todoBadge()};

// ---- Envois : certificats en vigueur regroupés par site ----
const sentMap=()=>ls.g("sent")||{};
function sendItems(){
  const per=$("sp").value,only=$("snew").checked,sent=sentMap(),t=todayIso();
  const lim=per==="all"?null:per==="today"?0:+per;
  return SUI.active(hist).filter(h=>{
    if(only&&sent[h.ref])return false;
    if(lim==null)return true;const a=SUI.ageDays(h.d.dSign,t);return a!=null&&a<=lim})}
function renderSend(){
  const box=$("slist"),items=sendItems(),groups=SUI.bySite(items),sent=sentMap();box.innerHTML="";
  $("ssum").textContent=items.length?`${items.length} certificat(s) pour ${groups.length} site(s).`:"Aucun certificat pour ces critères.";
  $("szall").disabled=$("sfall").disabled=!items.length;
  groups.forEach(g=>{
    const card=document.createElement("div");card.className="card";
    const h=document.createElement("b");h.textContent=`SITE ${g.code} – ${g.nom||"?"} · ${g.items.length} certificat(s)`;card.append(h);
    const tools=document.createElement("div");tools.className="tools";
    const z=document.createElement("button");z.className="pri";z.textContent="ZIP du site";z.onclick=()=>sendZip([g],z,false);
    const c=document.createElement("button");c.textContent="Copier la liste";c.onclick=()=>copyList(g);
    const m=document.createElement("button");m.textContent="Marquer envoyé";m.onclick=()=>{const s=sentMap();g.items.forEach(x=>s[x.ref]=todayIso());ls.s("sent",s);renderSend()};
    tools.append(z,c,m);card.append(tools);
    g.items.forEach(x=>{const row=document.createElement("label");row.className="srow";
      const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!sent[x.ref];
      cb.onchange=()=>{const s=sentMap();if(cb.checked)s[x.ref]=todayIso();else delete s[x.ref];ls.s("sent",s);renderSend()};
      const t=document.createElement("span");t.textContent=`${U(x.d.adresse)}${x.d.etage?" · ÉT. "+x.d.etage:""}${x.d.porte?" · P. "+x.d.porte:""} — ${refOf(x.d)}${sent[x.ref]?" (envoyé le "+fr(sent[x.ref])+")":""}`;
      row.append(cb,t);card.append(row)});
    box.append(card)})}
function sendIndex(groups){
  const h=["site","module","fichier","etage","porte","adresse","code_postal","ville","date_audit","date_signature","etabli_par"];
  const rows=[];groups.forEach(g=>g.items.forEach(x=>rows.push([`${g.code} - ${g.nom}`,x.d.num,refOf(x.d)+".pdf",x.d.etage,x.d.porte,U(x.d.adresse),x.d.cp,U(x.d.ville),fr(x.d.dAudit),fr(x.d.dSign),x.by||""].map(csvCell).join(";"))));
  return"﻿"+[h.join(";")].concat(rows).join("\r\n")}
async function sendZip(groups,btn,folders){
  const m=$("smsg"),n=groups.reduce((a,g)=>a+g.items.length,0);btn.disabled=true;m.className="msg";
  try{const files=[];let i=0;
    for(const g of groups){const dir=folders?SUI.safeName(`${g.code} - ${g.nom}`)+"/":"";
      for(const x of g.items){m.textContent=`Préparation ${++i}/${n}…`;files.push({name:dir+refOf(x.d)+".pdf",data:new Uint8Array(await (await makePdf(x.d)).arrayBuffer())})}}
    files.push({name:"index_envoi.csv",data:new TextEncoder().encode(sendIndex(groups))});
    save(folders?`envoi_${todayIso().replace(/-/g,"")}.zip`:`envoi_site${groups[0].code}_${todayIso().replace(/-/g,"")}.zip`,makeZip(files));
    m.className="msg ok";m.textContent=`ZIP prêt : ${n} certificat(s). Pensez à « Marquer envoyé » une fois le mail parti.`}
  catch(e){m.className="msg err";m.textContent="Erreur : "+e.message}btn.disabled=false}
async function copyList(g){
  const txt=`SITE ${g.code} – ${g.nom} (${g.items.length} certificat(s))\n`+g.items.map(x=>`${U(x.d.adresse)}${x.d.etage?" ETG "+x.d.etage:""}${x.d.porte?" PORTE "+x.d.porte:""} — ${refOf(x.d)}`).join("\n");
  const m=$("smsg");try{await navigator.clipboard.writeText(txt);m.className="msg ok";m.textContent="Liste copiée."}catch(e){m.className="msg err";m.textContent="Copie impossible."}}
$("sp").onchange=$("snew").onchange=renderSend;
$("szall").onclick=()=>sendZip(SUI.bySite(sendItems()),$("szall"),true);
$("sfall").onclick=()=>{const s=sentMap();sendItems().forEach(x=>s[x.ref]=todayIso());ls.s("sent",s);renderSend()};
$("hf").onchange=renderHist;
$("repx").onclick=()=>{REP.key="";repBanner()};
load().then(todoBadge);
