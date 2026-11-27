// ---------- brouillon de mail Outlook (.eml) : texte prêt, signature (logo compris) et PDF joint(s) ----------
// Un fichier .eml marqué « X-Unsent: 1 » s'ouvre dans Outlook comme un message à envoyer (destinataire à saisir).
// La signature est ajoutée par nous (Outlook n'ajoute pas la sienne à un brouillon ouvert depuis un fichier) ; le logo est une image intégrée au message.
const MAIL=(()=>{
const b64=bytes=>{let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)};
const wrap=s=>s.replace(/.{1,76}/g,"$&\r\n").replace(/\r\n$/,"");
const enc=s=>new TextEncoder().encode(s);
const head=s=>"=?UTF-8?B?"+b64(enc(s))+"?=";
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const intro=n=>`Suite à notre passage, vous trouverez ci-joint ${n>1?"les certificats":"le certificat"} de non-infestation.`;
const body=(n,sig)=>`Bonjour,\r\n\r\n${intro(n)}\r\n\r\nEn vous souhaitant bonne réception.\r\n\r\nCordialement,\r\n`+(sig&&sig.text?"\r\n"+sig.text.replace(/\r?\n/g,"\r\n")+"\r\n":"");
function html(n,sig){
  const p=(t,m)=>`<p style="margin:0 0 ${m||"11pt"} 0">${t}</p>`;
  let h='<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">'+p("Bonjour,")+p(esc(intro(n)))+p("En vous souhaitant bonne réception.")+p("Cordialement,","14pt");
  if(sig&&sig.img)h+=`<p style="margin:0 0 6pt 0"><img src="cid:logo@cni" alt="" style="max-width:300px;height:auto"></p>`;
  if(sig&&sig.text)h+=`<p style="margin:0">${esc(sig.text).replace(/\r?\n/g,"<br>")}</p>`;
  return h+"</div>"}
const part=(ct,txt)=>["Content-Type: "+ct,"Content-Transfer-Encoding: base64","",wrap(b64(enc(txt))),""];
function eml({subject,count,files,sig}){
  const id=Math.random().toString(36).slice(2,12),M="----=_m_"+id,R="----=_r_"+id,A="----=_a_"+id,n=count||files.length;
  const p=["X-Unsent: 1","MIME-Version: 1.0","Subject: "+head(subject),`Content-Type: multipart/mixed; boundary="${M}"`,"",
    "--"+M,`Content-Type: multipart/related; boundary="${R}"`,"",
    "--"+R,`Content-Type: multipart/alternative; boundary="${A}"`,"",
    "--"+A,...part("text/plain; charset=utf-8",body(n,sig)),
    "--"+A,...part("text/html; charset=utf-8",html(n,sig)),
    "--"+A+"--",""];
  if(sig&&sig.img)p.push("--"+R,`Content-Type: ${sig.img.type}; name="logo.png"`,"Content-Transfer-Encoding: base64","Content-ID: <logo@cni>",'Content-Disposition: inline; filename="logo.png"',"",wrap(b64(sig.img.bytes)),"");
  p.push("--"+R+"--","");
  files.forEach(f=>{const nm=f.name.replace(/[^\w.\- ]/g,"_");
    p.push("--"+M,`Content-Type: application/pdf; name="${nm}"`,"Content-Transfer-Encoding: base64",`Content-Disposition: attachment; filename="${nm}"`,"",wrap(b64(f.bytes)),"")});
  p.push("--"+M+"--","");
  return p.join("\r\n")}
return{eml,body,html,b64}})();
