import test from "node:test";import assert from "node:assert/strict";
import {BAK,IMP,row,toCsv,analyse} from "./helpers.mjs";

const mod=(i,o={})=>{const m="90010100"+String(10+i);return row({"N° twimm":String(200+i),"Code zone":m,"Objet":`VISITE DE RELOCATION LOGEMENT VACANT MODULE ${m} ETG 3 PORTE 12 5 RUE DES LILAS 75001 PARIS 1`,...o})};
const cert=(o={})=>({ref:"CNI_MVH_9001010002_20261110",at:"2026-11-10T09:00:00.000Z",by:"Marie",d:{num:"9001010002",siteCode:"9001",siteNom:"Résidence « des Lilas »; bât. A",etage:"3",porte:"12",adresse:"5 rue des Lilas",cp:"75001",ville:"Paris 1",dAudit:"2026-11-10",dSign:"2026-11-11",twimm:"100001"},...o});

test("sauvegarde de l'historique : export puis restauration sans aucune perte (accents, point-virgule, guillemets)",()=>{
  const h=[cert(),cert({ref:"CNI_MVH_9001010003_20261112",at:"2026-11-12T10:00:00.000Z",d:{...cert().d,num:"9001010003",dAudit:"2026-11-12",porte:""}})];
  const csv=BAK.histCsv(h),back=BAK.histFromCsv(csv);
  assert.equal(back.bad,0);assert.equal(back.items.length,2);
  assert.deepEqual(back.items.sort((a,b)=>a.ref.localeCompare(b.ref)),h.sort((a,b)=>a.ref.localeCompare(b.ref)));
  assert.ok(csv.startsWith("﻿reference;date;etabli_par;"),"lisible dans Excel (BOM, séparateur ;)")});

test("restauration depuis un fichier retouché dans Excel : on reconstruit depuis les colonnes lisibles",()=>{
  const csv="reference;date;etabli_par;n_twimm;module;site;etage;porte;adresse;code_postal;ville;date_audit;date_signature;donnees\r\n"+
    "CNI_MVH_9001010002_20261110;2026-11-10T09:00:00.000Z;Marie;100001;9001010002;9001 - LES LILAS;3;12;5 RUE DES LILAS;75001;PARIS 1;10/11/2026;11/11/2026;\r\n";
  const {items,bad}=BAK.histFromCsv(csv);assert.equal(bad,0);
  assert.deepEqual(items[0].d,{num:"9001010002",siteCode:"9001",siteNom:"LES LILAS",etage:"3",porte:"12",adresse:"5 RUE DES LILAS",cp:"75001",ville:"PARIS 1",dAudit:"2026-11-10",dSign:"2026-11-11",twimm:"100001"})});

test("restauration : un fichier qui n'est pas une sauvegarde est refusé, une ligne abîmée est comptée et ignorée",()=>{
  assert.throws(()=>BAK.histFromCsv("a;b\r\n1;2\r\n"),/sauvegarde/);
  const csv="reference;date;etabli_par;n_twimm;module;site;etage;porte;adresse;code_postal;ville;date_audit;date_signature;donnees\r\nX;;;;12;;;;;;;;;\r\n";
  const r=BAK.histFromCsv(csv);assert.equal(r.items.length,0);assert.equal(r.bad,1)});

test("export twimm : colonne indispensable absente = refus précis ; colonne utile absente = avertissement avec la conséquence",()=>{
  const ok=IMP.parseCSV(IMP.decode(toCsv([row()])));
  assert.equal(BAK.checkColumns(ok).missing.length,0);
  const sansBilan=ok.map(r=>{const o={...r};delete o.bilan;return o});
  const c1=BAK.checkColumns(sansBilan);assert.equal(c1.blocking.length,0);assert.deepEqual(c1.partial.map(m=>m.label),["Bilan"]);
  const sansObjet=ok.map(r=>{const o={...r};delete o.objet;return o});
  assert.deepEqual(BAK.checkColumns(sansObjet).blocking.map(m=>m.label),["Objet"]);
  assert.ok(BAK.checkColumns([]).blocking.length>0)});

test("export twimm changé : presque tout « à vérifier » pour le même motif déclenche une alerte, un fichier sain non",()=>{
  const sain=analyse(Array.from({length:8},(_,i)=>mod(i)));
  assert.equal(BAK.suspicion(sain),"");
  const casse=analyse(Array.from({length:8},(_,i)=>mod(i,{"Bilan":"Nouveau libellé twimm"})));
  assert.match(BAK.suspicion(casse),/format de l'export twimm a peut-être changé/);
  assert.equal(BAK.suspicion(casse.slice(0,3)),"","trop peu de lignes pour conclure")});
