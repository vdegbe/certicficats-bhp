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
function tab(n){[1,2,3,4].forEach(i=>{$("p"+i).classList.toggle("hide",i!==n);$("t"+i).classList.toggle("on",i===n)});if(n===2){load().then(renderHist)}}
[1,2,3,4].forEach(i=>$("t"+i).onclick=()=>tab(i));
$("q").oninput=renderHist;
$("num").addEventListener("input",detect);
["dAudit","siteNom","etage","porte","adresse","cp","ville"].forEach(f=>$(f).addEventListener("input",upd));
$("dAudit").value=iso(new Date());$("dSign").value=fr(iso(new Date()));$("by").value=ls.g("by")||"";
renderChips();upd();load().then(()=>{if($("num").value)detect()});
