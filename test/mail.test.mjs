import test from "node:test";import assert from "node:assert/strict";
import {MAIL} from "./helpers.mjs";
const parse=e=>{const [h,...rest]=e.split("\r\n\r\n");return{h,parts:rest.join("\r\n\r\n").split(/------=_cni_\w+/)}};
test("brouillon .eml : brouillon Outlook, texte exact, PDF joint intact",()=>{
  const pdf=new Uint8Array(5000).map((_,i)=>i%251);
  const e=MAIL.eml({subject:"Certificat de non-infestation – 5 RUE DES LILAS",files:[{name:"CNI_MVH_9001010002_20261110.pdf",bytes:pdf}]});
  assert.match(e,/^X-Unsent: 1\r\n/);assert.ok(!/^To:/m.test(e),"destinataire laissé à saisir");
  const subj=/Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(e);assert.equal(Buffer.from(subj[1],"base64").toString("utf8"),"Certificat de non-infestation – 5 RUE DES LILAS");
  const [txt,att]=[...e.matchAll(/Content-Transfer-Encoding: base64\r\n(?:Content-Disposition[^\r\n]*\r\n)?\r\n([\s\S]*?)\r\n\r\n/g)].map(m=>m[1].replace(/\r\n/g,""));
  assert.equal(Buffer.from(txt,"base64").toString("utf8"),"Bonjour,\r\n\r\nSuite à notre passage, vous trouverez ci-joint le certificat de non infestation.\r\n\r\nEn vous souhaitant bonne réception.\r\n");
  assert.deepEqual([...Buffer.from(att,"base64")],[...pdf]);
  assert.match(e,/filename="CNI_MVH_9001010002_20261110\.pdf"/);
  assert.ok(e.split("\r\n").every(l=>l.length<=200),"lignes courtes");
});
test("plusieurs certificats : texte au pluriel",()=>{
  assert.match(MAIL.body(3),/les certificats de non infestation/);assert.match(MAIL.body(1),/le certificat de non infestation/)});
