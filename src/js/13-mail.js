// ---------- brouillon de mail Outlook (.eml) : texte prêt + PDF joint(s) ----------
// Un fichier .eml marqué « X-Unsent: 1 » s'ouvre dans Outlook comme un message à envoyer (destinataire à saisir).
// Le message est en HTML (et non en texte simple) : c'est ce qui permet à Outlook d'y insérer la signature de chacun AVEC son logo.
// Aucune signature n'est ajoutée ici : chacun l'insère lui-même (Message → Signature).
const MAIL=(()=>{
const b64=bytes=>{let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)};
const wrap=s=>s.replace(/.{1,76}/g,"$&\r\n").replace(/\r\n$/,"");
const enc=s=>new TextEncoder().encode(s);
const head=s=>"=?UTF-8?B?"+b64(enc(s))+"?=";
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const intro=n=>`Suite à notre passage, vous trouverez ci-joint ${n>1?"les certificats":"le certificat"} de non-infestation.`;
const body=n=>`Bonjour,\r\n\r\n${intro(n)}\r\n\r\nEn vous souhaitant bonne réception.\r\n`;
const html=n=>{const p=t=>`<p style="margin:0 0 11pt 0">${t}</p>`;
  return '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">'+p("Bonjour,")+p(esc(intro(n)))+p("En vous souhaitant bonne réception.")+"</div>"};
const part=(ct,txt)=>["Content-Type: "+ct,"Content-Transfer-Encoding: base64","",wrap(b64(enc(txt))),""];
function eml({subject,count,files}){
  const id=Math.random().toString(36).slice(2,12),M="----=_m_"+id,A="----=_a_"+id,n=count||files.length;
  const p=["X-Unsent: 1","MIME-Version: 1.0","Subject: "+head(subject),`Content-Type: multipart/mixed; boundary="${M}"`,"",
    "--"+M,`Content-Type: multipart/alternative; boundary="${A}"`,"",
    "--"+A,...part("text/plain; charset=utf-8",body(n)),
    "--"+A,...part("text/html; charset=utf-8",html(n)),
    "--"+A+"--",""];
  files.forEach(f=>{const nm=f.name.replace(/[^\w.\- ]/g,"_");
    p.push("--"+M,`Content-Type: application/pdf; name="${nm}"`,"Content-Transfer-Encoding: base64",`Content-Disposition: attachment; filename="${nm}"`,"",wrap(b64(f.bytes)),"")});
  p.push("--"+M+"--","");
  return p.join("\r\n")}
return{eml,body,html,b64}})();
