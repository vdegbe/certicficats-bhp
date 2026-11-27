// ---------- réglages ----------
const SCRIPT=`const TOKEN='${BK_TOKEN}';
function sh_(){return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function doGet(e){
  if(e.parameter.k!==TOKEN)return out_({error:'auth'});
  const v=sh_().getDataRange().getValues();
  return out_(v.filter(r=>r[0]).map(r=>({ref:r[0],at:r[1],data:r[2],by:r[3]})));
}
function doPost(e){
  const b=JSON.parse(e.postData.contents);
  if(b.k!==TOKEN)return out_({error:'auth'});
  const d=b.d,l=LockService.getScriptLock();l.waitLock(20000);
  try{
    const sh=sh_(),n=sh.getLastRow();
    if(n>0&&sh.getRange(1,1,n,1).getValues().some(r=>r[0]===b.ref))return out_({ok:true,dup:true});
    sh.appendRow([b.ref,new Date().toISOString(),JSON.stringify(d),b.by||'',"'"+d.siteCode,d.siteNom,d.etage,d.porte,d.adresse,d.cp,d.ville,d.dAudit,d.dSign]);
    return out_({ok:true});
  }finally{l.releaseLock();}
}`;
$("scr").textContent=SCRIPT;$("bk").value=BK;
$("bmsg").textContent=BK_DEFAULT&&BK===BK_DEFAULT?"Service partagé préconfiguré : rien à faire.":BK?"Adresse personnalisée enregistrée sur cet appareil.":"Aucun service partagé configuré : l'historique reste sur cet appareil.";
$("cpS").onclick=async()=>{try{await navigator.clipboard.writeText(SCRIPT);$("bmsg").textContent="Script copié."}catch(e){$("bmsg").textContent="Copie impossible : sélectionnez le texte à la main."}};
$("bkSave").onclick=async()=>{BK=$("bk").value.trim();ls.s("bk",BK);const m=$("bmsg");m.className="msg";m.textContent="Test…";
  await load();m.className=$("hmsg").textContent.startsWith("Historique partagé")?"msg ok":"msg err";m.textContent=$("hmsg").textContent};

// ---------- onglets / init ----------
function tab(n){document.body.dataset.tab=n;if(n===1)schedPreview();[1,2,3,4,5,6].forEach(i=>{$("p"+i).classList.toggle("hide",i!==n);$("t"+i).classList.toggle("on",i===n)});if(n===2){load().then(()=>{renderHist();const a=bkAge();if(a==null||a>30)$("hmsg").textContent+=" · Sauvegarde conseillée (onglet Réglages)"})}if(n===3)bkInfo()}
[1,2,3,4,5,6].forEach(i=>$("t"+i).onclick=()=>tab(i));
$("q").oninput=renderHist;
$("num").addEventListener("input",detect);
["dAudit","siteNom","etage","porte","adresse","cp","ville"].forEach(f=>$(f).addEventListener("input",upd));
$("dAudit").value=iso(new Date());$("dSign").value=fr(iso(new Date()));$("by").value=ls.g("by")||"";
renderChips();upd();load().then(()=>{if($("num").value)detect()});

// ---------- sauvegarde de l'historique ----------
const bkAge=()=>{const a=ls.g("bkAt");return a?Math.floor((Date.now()-new Date(a))/864e5):null};
function bkInfo(){const a=ls.g("bkAt"),n=bkAge();
  $("bkInfo").textContent=a?`Dernière sauvegarde faite depuis cet appareil : ${fr(a)}${n>30?" (plus de 30 jours : une sauvegarde mensuelle est conseillée)":""}.`:"Aucune sauvegarde faite depuis cet appareil. Faites-en une chaque mois : le fichier permet de reconstruire l’historique.";
  $("bkInfo").className="msg"+(a&&n<=30?" ok":"")}
bkInfo();
$("bkExp").onclick=async()=>{const m=$("bkRmsg");m.className="msg";m.textContent="Préparation…";
  try{await load();if(!hist.length){m.className="msg err";m.textContent="L’historique est vide : rien à sauvegarder.";return}
    save(`historique_certificats_${iso(new Date())}.csv`,new Blob([BAK.histCsv(hist)],{type:"text/csv;charset=utf-8"}));
    ls.s("bkAt",new Date().toISOString());bkInfo();m.className="msg ok";m.textContent=`${hist.length} certificat(s) sauvegardé(s) dans le fichier téléchargé. Gardez-le dans un dossier de l’entreprise.`}
  catch(e){m.className="msg err";m.textContent="Erreur : "+e.message}};
$("bkf").onchange=async ev=>{const f=ev.target.files[0],m=$("bkRmsg");if(!f)return;m.className="msg";m.textContent="Lecture du fichier…";
  try{const {items,bad}=BAK.histFromCsv(IMP.decode(await f.arrayBuffer()));await load();
    const have=new Set(hist.map(h=>h.ref)),todo=items.filter(x=>!have.has(x.ref));
    if(!todo.length){m.className="msg ok";m.textContent=`Rien à restaurer : les ${items.length} certificat(s) du fichier sont déjà dans l’historique.`+(bad?` ${bad} ligne(s) illisible(s) ignorée(s).`:"");return}
    if(!confirm(`${todo.length} certificat(s) du fichier sont absents de l’historique. Les restaurer${BK?" dans l’historique partagé":" (sur cet appareil seulement : aucun service partagé configuré)"} ?`)){m.textContent="Restauration annulée.";return}
    let shared=0,local=0,pend=0;
    for(let i=0;i<todo.length;i++){m.textContent=`Restauration ${i+1}/${todo.length}…`;const st=await add(todo[i]);if(st==="shared")shared++;else if(st==="pending")pend++;else local++}
    refreshNames();renderHist();m.className="msg ok";
    m.textContent=`${todo.length} certificat(s) restauré(s)`+(shared?` dans l’historique partagé`:"")+(local?` sur cet appareil`:"")+(pend?` (${pend} en attente : service injoignable, renvoi automatique plus tard)`:"")+(bad?`. ${bad} ligne(s) illisible(s) ignorée(s).`:".")}
  catch(e){m.className="msg err";m.textContent="Erreur : "+e.message}
  ev.target.value=""};
