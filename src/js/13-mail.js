// ---------- brouillon de mail Outlook (.eml) : texte prêt + PDF joint(s) ----------
// Un fichier .eml marqué « X-Unsent: 1 » s'ouvre dans Outlook comme un message à envoyer (destinataire à saisir).
const MAIL=(()=>{
const b64=bytes=>{let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)};
const wrap=s=>s.replace(/.{1,76}/g,"$&\r\n").replace(/\r\n$/,"");
const enc=s=>new TextEncoder().encode(s);
const head=s=>"=?UTF-8?B?"+b64(enc(s))+"?=";
const body=n=>`Bonjour,\r\n\r\nSuite à notre passage, vous trouverez ci-joint ${n>1?"les certificats":"le certificat"} de non infestation.\r\n\r\nEn vous souhaitant bonne réception.\r\n`;
function eml({subject,count,files}){
  const bd="----=_cni_"+Math.random().toString(36).slice(2,12);
  const p=["X-Unsent: 1","MIME-Version: 1.0","Subject: "+head(subject),`Content-Type: multipart/mixed; boundary="${bd}"`,"",
    "--"+bd,"Content-Type: text/plain; charset=utf-8","Content-Transfer-Encoding: base64","",wrap(b64(enc(body(count||files.length)))),""];
  files.forEach(f=>{const n=f.name.replace(/[^\w.\- ]/g,"_");
    p.push("--"+bd,`Content-Type: application/pdf; name="${n}"`,"Content-Transfer-Encoding: base64",`Content-Disposition: attachment; filename="${n}"`,"",wrap(b64(f.bytes)),"")});
  p.push("--"+bd+"--","");
  return p.join("\r\n")}
return{eml,body,b64}})();
