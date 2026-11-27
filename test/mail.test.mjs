import test from "node:test";import assert from "node:assert/strict";
import {MAIL} from "./helpers.mjs";
const parts=e=>[...e.matchAll(/((?:[A-Za-z-]+: [^\r\n]*\r\n)+)\r\n([A-Za-z0-9+\/=\r\n]+?)\r\n(?=\r\n|--)/g)].filter(m=>/Content-Transfer-Encoding: base64/.test(m[1])).map(m=>({h:m[1],data:Buffer.from(m[2].replace(/\r\n/g,""),"base64")}));
const pdf=new Uint8Array(5000).map((_,i)=>i%251);
const e=MAIL.eml({subject:"Certificat de non-infestation – 5 RUE DES LILAS",files:[{name:"CNI_MVH_9001010002_20261110.pdf",bytes:pdf}]});
test("brouillon .eml : brouillon Outlook, sans destinataire, objet exact",()=>{
  assert.match(e,/^X-Unsent: 1\r\n/);assert.ok(!/^To:/m.test(e));
  const s=/Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(e);assert.equal(Buffer.from(s[1],"base64").toString("utf8"),"Certificat de non-infestation – 5 RUE DES LILAS");
  assert.ok(e.split("\r\n").every(l=>l.length<=200))});
test("texte demandé, en texte et en HTML (HTML : Outlook y garde le logo de la signature), sans signature ni formule de politesse",()=>{
  const P=parts(e),txt=P.find(x=>/text\/plain/.test(x.h)).data.toString("utf8"),html=P.find(x=>/text\/html/.test(x.h)).data.toString("utf8");
  assert.equal(txt,"Bonjour,\r\n\r\nSuite à notre passage, vous trouverez ci-joint le certificat de non-infestation.\r\n\r\nEn vous souhaitant bonne réception.\r\n");
  assert.match(html,/ci-joint le certificat de non-infestation/);assert.ok(!/Cordialement|<img/.test(html))});
test("PDF joint intact, aucune image intégrée",()=>{
  const P=parts(e),att=P.find(x=>/application\/pdf/.test(x.h));
  assert.deepEqual([...att.data],[...pdf]);assert.match(att.h,/filename="CNI_MVH_9001010002_20261110\.pdf"/);assert.ok(!P.some(x=>/image\//.test(x.h)))});
test("plusieurs certificats : pluriel ; le HTML échappe le texte",()=>{
  assert.match(MAIL.body(3),/les certificats de non-infestation/);assert.match(MAIL.body(1),/le certificat de non-infestation/)});
