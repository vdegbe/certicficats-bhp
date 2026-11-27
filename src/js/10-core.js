const $=id=>document.getElementById(id);
const ls={g(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let BK=ls.g("bk")||BK_DEFAULT, hist=[], cands=[], curCode="";
const F=["num","dAudit","siteNom","etage","porte","adresse","cp","ville"];
const U=s=>(s||"").toString().trim().toUpperCase();
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fr=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||"");return m?`${m[3]}/${m[2]}/${m[1]}`:""};
const refOf=d=>`CNI_MVH_${d.num}_${(d.dAudit||"").replace(/-/g,"")}`;
const form=()=>{const d={};F.forEach(f=>d[f]=$(f).value.trim());d.siteCode=d.num.slice(0,4);d.dSign=iso(new Date());return d};

// ---------- détection du site ----------
function learned(code){const seen=new Set(),out=[];
  SUI.real(hist).sort((a,b)=>(b.at||"").localeCompare(a.at||"")).forEach(h=>{const d=h.d;if(d.siteCode!==code)return;
    const k=[d.siteNom,d.adresse,d.cp,d.ville].map(U).join("|");if(seen.has(k))return;seen.add(k);
    out.push({nom:U(d.siteNom),adr:U(d.adresse),cp:d.cp,ville:U(d.ville),used:1})});return out}
function detect(){
  const n=$("num").value.replace(/\D/g,"");$("num").value=n;const code=n.slice(0,4),det=$("det");
  if(code!==curCode){curCode=code;cands=[];
    if(code.length===4){const seen=new Set(),L=learned(code);
      L.forEach(c=>seen.add([c.nom,c.adr,c.cp,c.ville].join("|")));cands=L.slice();
      (SITES[code]||[]).forEach(s=>{const c={nom:U(s[0]),adr:U(s[1]),cp:s[2],ville:U(s[3])},k=[c.nom,c.adr,c.cp,c.ville].join("|");if(!seen.has(k)){seen.add(k);cands.push(c)}})}
    renderChips();if(cands.length)pick(0)}
  if(code.length<4)det.innerHTML="";
  else if(cands.length){det.innerHTML="";const b=document.createElement("b");b.textContent=`Site ${code} reconnu`;det.append(b)}
  else det.innerHTML=`<span class="warn">Site ${code} introuvable dans vos listes : saisissez-le à la main.</span>`;
  upd()}
function renderChips(){const box=$("chips");box.innerHTML="";
  if(!cands.length){box.innerHTML='<span class="msg">Saisissez le module pour voir les sites et adresses.</span>';return}
  cands.forEach((c,i)=>{const b=document.createElement("button");b.className="chip";b.dataset.i=i;
    b.textContent=`${c.used?"★ ":""}${c.nom} · ${c.adr||"(adresse non renseignée)"}, ${c.cp} ${c.ville}`;b.onclick=()=>pick(i);box.append(b)})}
function pick(i){const c=cands[i];$("siteNom").value=c.nom;$("adresse").value=c.adr;$("cp").value=c.cp;$("ville").value=c.ville;
  document.querySelectorAll(".chip").forEach(b=>b.classList.toggle("sel",+b.dataset.i===i));upd()}
function upd(){const d=form();$("ref").textContent=d.num&&d.dAudit?refOf(d):"—";schedPreview()}

// ---------- rendu du certificat (même mise en page que le modèle PowerPoint) ----------
// PDF vectoriel : le texte est du vrai texte (sélectionnable, léger) ; seul le fond est une image.
const W=338.667,H=190.5,CX=W/2;
function checkChars(list){ // la police n'affiche rien pour un caractère absent : on refuse plutôt que d'imprimer un trou
  const bad=new Set();list.join("").split("").forEach(c=>{if(c.trim()&&!FONT_CHARS.includes(c))bad.add(c)});
  if(bad.size)throw new Error("caractère non pris en charge par la police : « "+[...bad].join(" ")+" » — corrigez-le dans le champ concerné")}
function certDoc(){const {jsPDF}=window.jspdf;
  const p=new jsPDF({orientation:"landscape",unit:"mm",format:[W,H],compress:true});
  p.addFileToVFS("Adv-r.ttf",FONTS.r);p.addFont("Adv-r.ttf","Adv","normal");
  p.addFileToVFS("Adv-b.ttf",FONTS.b);p.addFont("Adv-b.ttf","Adv","bold");
  return p}
async function makePdf(d){
  const et=[d.etage?`ETG ${U(d.etage)}`:"",d.porte?`PORTE ${U(d.porte)}`:""].filter(Boolean).join(" ");
  const siteL=`SITE ${d.siteCode} – ${U(d.siteNom)}`,cpL=`${d.cp} ${U(d.ville)}`,adrL=U(d.adresse);
  const p1=`Atteste avoir réalisé le ${fr(d.dAudit)}, un audit du logement suivant, en procédant au contrôle de l’ensemble des pièces, notamment des zones sensibles`;
  const p2="En vue de sa remise en location et attestons qu’à l’issue de notre passage de ce jour, le logement est exempt de toute infestation d’espèces nuisibles et parasites.";
  const dateL=`Le ${fr(d.dSign)}`;
  checkChars([refOf(d),siteL,cpL,adrL,et,p1,p2,dateL]);
  const p=certDoc();
  p.addImage(IMG.bg,"JPEG",0,0,W,H,"bg","FAST");
  p.addImage(IMG.sig,"PNG",247.6,133.3,49.8,38.1,"sig","FAST");
  const T=(t,x,y,pt,b,col,al)=>{p.setFont("Adv",b?"bold":"normal");p.setFontSize(pt);p.setTextColor(col||"#000000");p.text(t,x,y+DY*pt,{align:al||"center",baseline:"middle"})};
  const wrap=(t,max,pt)=>{p.setFont("Adv","normal");p.setFontSize(pt);const o=[];let l="";t.split(" ").forEach(w=>{const n=l?l+" "+w:w;if(p.getTextWidth(n)>max&&l){o.push(l);l=w}else l=n});o.push(l);return o};
  // titre
  let tp=48;const title="Certificat de Non-Infestation";p.setFont("Adv","bold");p.setFontSize(tp);
  while(p.getTextWidth(title)>262){p.setFontSize(--tp)}
  const tw=p.getTextWidth(title);
  T(title,CX+0.5,44.6,tp,1,"#ff0000");
  p.setFillColor("#ff0000");p.rect(CX+0.5-tw/2,52.9,tw,1.1,"F");
  T(refOf(d),CX,71.1,13,1);
  wrap(p1,280,13).forEach((l,i)=>T(l,CX,83.1+i*4.5,13));
  if(et){T(siteL,CX,99.1,13,1);T(et,CX,104.6,13,1);T(adrL,CX,109.2,13,1);T(cpL,CX,113.6,13,1)}
  else{T(siteL,CX,101.1,13,1);T(adrL,CX,106.4,13,1);T(cpL,CX,111.3,13,1)}
  wrap(p2,280,13).forEach((l,i)=>T(l,CX,125.2+i*4.6,13));
  T("Pour faire valoir ce que de droit",233.5,146.6,10,0,"#000000","left");T(dateL,233.5,150.6,10,0,"#000000","left");
  return p.output("blob")}
const DY=0; // décalage vertical (mm par point de police), calé par comparaison avec l'ancien rendu
function save(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000)}

// ---------- prénoms : même graphie pour tout le monde ----------
const normName=v=>(v||"").trim().replace(/\s+/g," ").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
function refreshNames(){const dl=$("names");if(!dl)return;const seen=new Map();
  hist.forEach(h=>{const n=normName(h.by);if(n&&!seen.has(n.toLowerCase()))seen.set(n.toLowerCase(),n)});
  dl.innerHTML="";[...seen.values()].sort().forEach(n=>{const o=document.createElement("option");o.value=n;dl.append(o)})}

// ---------- historique partagé ----------
const bkUrl=()=>BK+(BK.includes("?")?"&":"?")+"k="+encodeURIComponent(BK_TOKEN);
async function post(r){const x=await fetch(BK,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({k:BK_TOKEN,ref:r.ref,d:r.d,by:r.by})});const j=await x.json();if(!j.ok)throw new Error("refusé")}
async function load(){try{return await load_()}finally{refreshNames()}}
async function load_(){
  const pend=ls.g("pend")||[];
  if(!BK){hist=(ls.g("hist")||[]);$("hmsg").textContent="Historique local (non partagé) : voir Réglages.";return}
  try{for(const r of pend.slice()){await post(r);pend.splice(pend.indexOf(r),1)}ls.s("pend",pend);
    const j=await (await fetch(bkUrl())).json();if(j.error)throw new Error("accès refusé");
    hist=j.map(x=>{try{return{ref:x.ref,at:x.at,by:x.by,d:JSON.parse(x.data)}}catch(e){return null}}).filter(Boolean);
    ls.s("hist",hist.slice(-500));$("hmsg").textContent=`Historique partagé · ${SUI.active(hist).length} certificat(s) en vigueur`}
  catch(e){hist=(ls.g("hist")||[]).concat(pend);$("hmsg").textContent="Service partagé injoignable : historique local affiché."}}
async function add(r){hist.push(r);const l=(ls.g("hist")||[]);l.push(r);ls.s("hist",l.slice(-500));
  if(!BK)return"local";try{await post(r);return"shared"}catch(e){const p=ls.g("pend")||[];p.push(r);ls.s("pend",p);return"pending"}}
const LAST={d:null,blob:null};
const REP={key:""}; // certificat en cours de remplacement (choisi dans l'historique)
function repBanner(){const b=$("repb");if(!REP.key){b.classList.add("hide");return}b.classList.remove("hide");$("rept").textContent=`Vous remplacez le certificat ${REP.key}. Corrigez les champs puis générez : l’ancien sera noté « remplacé » dans l’historique.`}
function reopen(h){F.forEach(f=>$(f).value=h.d[f]||"");curCode=h.d.siteCode;detect();tab(1)}
async function annuler(h){
  const m=prompt(`Annuler le certificat ${h.ref} ?\nIl restera visible dans l’historique, marqué « annulé ». Indiquez le motif (obligatoire) :`);
  if(m===null)return;if(!m.trim()){alert("Le motif est obligatoire : annulation non faite.");return}
  const st=await add(SUI.annulRec(h,ls.g("by")||"",m.trim(),new Date().toISOString()));
  $("hmsg").textContent=st==="pending"?"Annulation enregistrée sur cet appareil ; service partagé injoignable, elle sera renvoyée plus tard.":"Certificat annulé.";
  renderHist();todoBadge()}
function renderHist(){const box=$("hist"),q=U($("q").value),all=$("hf").value==="all",st=SUI.status(hist);box.innerHTML="";
  const rows=SUI.real(hist).sort((a,b)=>(b.at||"").localeCompare(a.at||"")).filter(h=>(all||!st.has(h.ref))&&(!q||U(h.ref+" "+(h.d.twimm||"")+" "+h.d.siteNom+" "+h.d.adresse+" "+(h.by||"")).includes(q))).slice(0,300);
  if(!rows.length){box.textContent="Aucun certificat.";return}
  rows.forEach(h=>{const s=st.get(h.ref),div=document.createElement("div");div.className="hist"+(s?" off":"");const l=document.createElement("div");
    const b=document.createElement("b");b.textContent=`${U(h.d.adresse)} — ${h.d.etage?"ÉT. "+h.d.etage:""}${h.d.porte?" P. "+h.d.porte:""}`;
    const tg=document.createElement("span");if(s){tg.className="tag "+s.type;tg.textContent=s.type==="annule"?"Annulé":"Remplacé"}
    const sm=document.createElement("small");
    sm.textContent=`${h.ref}${h.d.twimm?" · twimm "+h.d.twimm:""} · ${h.at?new Date(h.at).toLocaleString("fr-FR"):""}${h.by?" · "+h.by:""}`
      +(s?(s.type==="annule"?` · annulé le ${s.at?new Date(s.at).toLocaleDateString("fr-FR"):"?"}${s.by?" par "+s.by:""} : ${s.motif}`:` · remplacé par ${s.via}`):"");
    l.append(b," ",tg,sm);
    const bt=document.createElement("div");bt.className="bt";
    const mk=(t,f)=>{const x=document.createElement("button");x.textContent=t;x.onclick=()=>f(x);bt.append(x);return x};
    mk("Rouvrir",()=>{REP.key="";repBanner();reopen(h)});
    mk("Mail",async x=>{x.disabled=true;try{await mailFor([{d:h.d,blob:await makePdf(h.d)}])}catch(e){alert("Erreur : "+e.message)}x.disabled=false});
    mk("PDF",async x=>{x.disabled=true;try{save(refOf(h.d)+".pdf",await makePdf(h.d))}catch(e){alert("Erreur PDF : "+e.message)}x.disabled=false});
    if(!s){mk("Remplacer",()=>{REP.key=h.ref;reopen(h);repBanner()});mk("Annuler",()=>annuler(h))}
    div.append(l,bt);box.append(div)})}

// ---------- génération ----------
$("gen").onclick=async()=>{const m=$("msg"),d=form(),err=t=>{m.className="msg err";m.textContent=t};
  if(!/^\d+$/.test(d.num))return err("Le n° de module ne doit contenir que des chiffres.");
  if(!d.dAudit)return err("Indiquez la date de l’audit.");
  if(d.dAudit>d.dSign)return err("La date d’audit ne peut pas être après aujourd’hui.");
  if(!d.siteNom)return err("Indiquez le nom du site.");
  if(!d.adresse)return err("Indiquez l’adresse.");
  if(!/^\d{5}$/.test(d.cp))return err("Le code postal doit avoir 5 chiffres.");
  if(!d.ville)return err("Indiquez la ville.");
  if(d.num.length!==10&&!confirm(`Le module ${d.num} n’a pas 10 chiffres. Continuer ?`))return;
  if(!SITES[d.siteCode]&&!learned(d.siteCode).length&&!confirm(`Le site ${d.siteCode} n’est pas dans vos listes. Continuer ?`))return;
  const ref=refOf(d),act=SUI.active(hist);
  let rep=REP.key?act.find(h=>h.ref===REP.key):null;
  if(!rep){rep=act.find(h=>refOf(h.d)===ref)||null;
    if(rep&&!confirm(`Un certificat ${ref} existe déjà. Le remplacer par celui-ci ? (l’ancien sera noté « remplacé » dans l’historique)`))return}
  $("gen").disabled=true;m.className="msg";m.textContent="Génération…";
  try{const blob=await makePdf(d);save(ref+".pdf",blob);LAST.d=d;LAST.blob=blob;$("mailb").textContent="Préparer le mail Outlook pour "+ref;$("mailb").classList.remove("hide");
    const by=normName($("by").value);$("by").value=by;ls.s("by",by);const st=await add({ref:SUI.freeKey(hist,ref),at:new Date().toISOString(),by,d:rep?{...d,remplace:rep.ref}:d});REP.key="";repBanner();todoBadge();
    m.className="msg ok";m.textContent=`PDF généré : ${ref}.pdf`+(st==="pending"?" (historique partagé injoignable : sera renvoyé plus tard)":"")}
  catch(e){err("Erreur : "+e.message)}$("gen").disabled=false};

