import test from "node:test";import assert from "node:assert/strict";
import {MAIL} from "./helpers.mjs";
// décode toutes les parties base64 (dans l'ordre) : [{headers, data(Buffer)}]
const parts=e=>[...e.matchAll(/((?:[A-Za-z-]+: [^\r\n]*\r\n)+)\r\n([A-Za-z0-9+\/=\r\n]+?)\r\n(?=\r\n|--)/g)].filter(m=>/Content-Transfer-Encoding: base64/.test(m[1])).map(m=>({h:m[1],data:Buffer.from(m[2].replace(/\r\n/g,""),"base64")}));
const pdf=new Uint8Array(5000).map((_,i)=>i%251),logo=new Uint8Array(900).map((_,i)=>(i*7)%256);
const sig={text:"Prénom NOM\nFonction\nStandard : 01 02 03 04 05",img:{type:"image/png",bytes:logo}};
const e=MAIL.eml({subject:"Certificat de non-infestation – 5 RUE DES LILAS",files:[{name:"CNI_MVH_9001010002_20261110.pdf",bytes:pdf}],sig});

test("brouillon .eml : brouillon Outlook, sans destinataire, objet exact",()=>{
  assert.match(e,/^X-Unsent: 1\r\n/);assert.ok(!/^To:/m.test(e));
  const s=/Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(e);assert.equal(Buffer.from(s[1],"base64").toString("utf8"),"Certificat de non-infestation – 5 RUE DES LILAS");
  assert.ok(e.split("\r\n").every(l=>l.length<=200))});
test("texte demandé + signature, en texte et en HTML",()=>{
  const P=parts(e),txt=P.find(x=>/text\/plain/.test(x.h)).data.toString("utf8"),html=P.find(x=>/text\/html/.test(x.h)).data.toString("utf8");
  assert.equal(txt,"Bonjour,\r\n\r\nSuite à notre passage, vous trouverez ci-joint le certificat de non-infestation.\r\n\r\nEn vous souhaitant bonne réception.\r\n\r\nCordialement,\r\n\r\nPrénom NOM\r\nFonction\r\nStandard : 01 02 03 04 05\r\n");
  assert.match(html,/Cordialement,/);assert.match(html,/Prénom NOM<br>Fonction<br>Standard/);assert.match(html,/<img src="cid:logo@cni"/)});
test("logo intégré (cid) et PDF joint intacts",()=>{
  const P=parts(e),img=P.find(x=>/Content-ID: <logo@cni>/.test(x.h)),att=P.find(x=>/application\/pdf/.test(x.h));
  assert.match(img.h,/Content-Type: image\/png/);assert.deepEqual([...img.data],[...logo]);
  assert.deepEqual([...att.data],[...pdf]);assert.match(att.h,/filename="CNI_MVH_9001010002_20261110\.pdf"/);
  assert.ok(e.indexOf("cid:logo@cni")<e.indexOf("application/pdf"),"le logo est dans la partie corps, le PDF en pièce jointe")});
test("sans signature : pas d'image ni de bloc vide ; le HTML échappe le texte",()=>{
  const e2=MAIL.eml({subject:"x",files:[{name:"a.pdf",bytes:pdf}],sig:null});
  assert.ok(!/logo@cni/.test(e2));assert.ok(!parts(e2).some(x=>/image\//.test(x.h)));
  assert.match(MAIL.html(1,{text:"<b>&"}),/&lt;b&gt;&amp;/)});
test("plusieurs certificats : pluriel",()=>{assert.match(MAIL.body(3),/les certificats de non-infestation/);assert.match(MAIL.body(1),/le certificat de non-infestation/)});
