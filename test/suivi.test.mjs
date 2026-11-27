import test from "node:test";import assert from "node:assert/strict";
import {SUI,refOf,analyse,row} from "./helpers.mjs";
const D=(num,dAudit="2026-10-10",x={})=>({num,dAudit,dSign:"2026-10-12",siteCode:num.slice(0,4),siteNom:"Les Lilas",etage:"3",porte:"12",adresse:"5 rue des Lilas",cp:"75001",ville:"Paris",...x});
const H=(d,ref=refOf(d),x={})=>({ref,at:"2026-10-12T08:00:00Z",by:"Jean",d,...x});

test("annulation : le certificat sort des certificats en vigueur mais reste dans l'historique",()=>{
  const a=H(D("9001010002")),b=H(D("9001010003"));
  const hist=[a,b,SUI.annulRec(a,"Jean","erreur d'adresse","2026-10-13T09:00:00Z")];
  assert.deepEqual(SUI.active(hist).map(h=>h.ref),[b.ref]);
  assert.equal(SUI.status(hist).get(a.ref).type,"annule");
  assert.equal(SUI.status(hist).get(a.ref).motif,"erreur d'adresse");
  assert.equal(SUI.real(hist).length,2,"la ligne d'annulation n'est pas un certificat");
  assert.ok(SUI.gone(hist).has(refOf(a.d)));
  assert.equal(hist.length,3,"rien n'est effacé");
});
test("remplacement : le nouveau est en vigueur, l'ancien est noté remplacé, même avec une référence identique",()=>{
  const a=H(D("9001010002"));
  const n=H(D("9001010002","2026-10-10",{adresse:"7 rue des Lilas",remplace:a.ref}),SUI.freeKey([a],refOf(a.d)));
  assert.equal(n.ref,a.ref+"~R2");
  const hist=[a,n];
  assert.deepEqual(SUI.active(hist).map(h=>h.ref),[n.ref]);
  assert.equal(SUI.status(hist).get(a.ref).type,"remplace");
  assert.equal(SUI.status(hist).get(a.ref).via,n.ref);
  assert.ok(!SUI.gone(hist).has(refOf(a.d)),"une référence remplacée n'est pas « annulée » : elle a un certificat en vigueur");
  assert.equal(SUI.freeKey(hist,refOf(a.d)),a.ref+"~R3");
});
test("freeKey : référence libre inchangée",()=>assert.equal(SUI.freeKey([],"CNI_X"),"CNI_X"));

test("import : un logement déjà certifié est « déjà généré », un certificat annulé revient « à vérifier »",()=>{
  const r=row(),probe=analyse([r])[0],a=H(probe.d);
  const dejà=analyse([r],SUI.active([a]),SUI.gone([a]))[0];
  assert.equal(dejà.status,"done");
  const hist=[a,SUI.annulRec(a,"Jean","doublon","2026-10-13T09:00:00Z")];
  const c=analyse([r],SUI.active(hist),SUI.gone(hist))[0];
  assert.equal(c.status,"check");assert.match(c.reasons[0],/annulé auparavant/);assert.equal(c.sel,false);
});

test("à faire : fusion, conservation de la date de première vue, retrait quand le certificat existe ou est ignoré",()=>{
  const c1={twimm:"1",d:D("9001010002"),status:"ready",reasons:[],infos:[]},c2={twimm:"2",d:D("9001010003"),status:"check",reasons:["bilan"],infos:[]};
  let l=SUI.todoMerge([],[c1,c2],"2026-10-12");
  assert.equal(l.length,2);
  l=SUI.todoMerge(l,[{...c1,status:"check",reasons:["x"]}],"2026-10-20");
  assert.equal(l.length,2,"pas de doublon");
  const e1=l.find(e=>e.twimm==="1");assert.equal(e1.first,"2026-10-12");assert.equal(e1.status,"check");
  const hist=[H(c1.d)];
  assert.deepEqual(SUI.todoPrune(l,hist,[]).map(e=>e.twimm),["2"],"certificat généré => retiré");
  assert.deepEqual(SUI.todoPrune(l,[],[e1.k]).map(e=>e.twimm),["2"],"ignoré => retiré");
  const gone=[H(c1.d),SUI.annulRec(H(c1.d),"J","m","2026-10-13T00:00:00Z")];
  assert.equal(SUI.todoPrune(l,gone,[]).length,2,"certificat annulé => revient à faire");
});
test("ageDays",()=>{assert.equal(SUI.ageDays("2026-10-10","2026-10-17"),7);assert.equal(SUI.ageDays("","2026-10-17"),null);assert.equal(SUI.ageDays("2026-10-17","2026-10-17"),0)});

test("envois : regroupement par site, tri par adresse puis étage, annulés exclus",()=>{
  const a=H(D("9001010002")),b=H(D("9001010003",undefined,{etage:"10"})),c=H(D("9002010001",undefined,{siteNom:"Tilleuls",adresse:"9 av"})),d=H(D("9001010009",undefined,{etage:"2"}));
  const hist=[a,b,c,d,SUI.annulRec(d,"J","m","2026-10-13T00:00:00Z")];
  const g=SUI.bySite(SUI.active(hist));
  assert.deepEqual(g.map(x=>x.code),["9001","9002"]);
  assert.deepEqual(g[0].items.map(x=>x.d.etage),["3","10"]);
  assert.equal(g[1].nom,"TILLEULS");
  assert.equal(SUI.safeName('A/B:C*"D"'),"A B C D");
});
