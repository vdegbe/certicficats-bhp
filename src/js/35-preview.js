// ---------- aperçu du certificat (écrans larges) : même PDF que celui qui sera téléchargé ----------
const PV={t:0,n:0,url:""};
const pvReady=d=>/^\d{10}$/.test(d.num)&&d.dAudit&&d.dAudit<=d.dSign&&d.siteNom&&d.adresse&&/^\d{5}$/.test(d.cp)&&d.ville;
const pvWide=()=>window.matchMedia("(min-width:1180px)").matches;
function schedPreview(){if(!$("pv")||!pvWide())return;clearTimeout(PV.t);PV.t=setTimeout(drawPreview,350)}
async function drawPreview(){
  const d=form(),m=$("pvm"),n=++PV.n;
  if(!pvReady(d)){$("pv").removeAttribute("src");m.className="msg";m.textContent="Renseignez le module, la date d’audit, le site, l’adresse, le code postal et la ville pour voir l’aperçu.";return}
  try{const blob=await makePdf(d);if(n!==PV.n)return;
    const old=PV.url;PV.url=URL.createObjectURL(blob);$("pv").src=PV.url+"#toolbar=0&navpanes=0&view=Fit";
    if(old)setTimeout(()=>URL.revokeObjectURL(old),5000);
    m.className="msg";m.textContent=(d.etage&&d.porte?"":"Étage et porte à renseigner avant de générer. ")+"L’aperçu suit vos modifications."}
  catch(e){if(n===PV.n){$("pv").removeAttribute("src");m.className="msg err";m.textContent="Aperçu impossible : "+e.message}}}
window.matchMedia("(min-width:1180px)").addEventListener("change",schedPreview);
