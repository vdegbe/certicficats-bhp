import test from "node:test";import assert from "node:assert/strict";
import {IMP,row,analyse,toCsv} from "./helpers.mjs";

const one=(o,hist)=>analyse([row(o)],hist)[0];
const has=(c,txt)=>c.reasons.some(r=>r.includes(txt));

test("lecture : Windows-1252, CRLF, retours à la ligne et guillemets dans les champs",()=>{
  const r=IMP.parseCSV(IMP.decode(toCsv([row({"Bilan":'Par A le 01/10/2026 : ligne 1\r\nligne "2" é à'})])));
  assert.equal(r.length,1);assert.match(r[0].bilan,/ligne "2" é à/);assert.equal(r[0].ntwimm,"100001")});

test("logement propre : prêt, étage et porte lus dans l'objet",()=>{
  const c=one();
  assert.equal(c.status,"ready");assert.deepEqual([c.d.num,c.d.etage,c.d.porte,c.d.adresse,c.d.cp,c.d.ville],["9001010002","3","12","5 RUE DES LILAS","75001","PARIS 1"]);
  assert.equal(c.d.siteNom,"RESIDENCE DES LILAS");assert.equal(c.d.dAudit,"2026-10-10");assert.equal(c.ref,"CNI_MVH_9001010002_20261010")});

test("sans étage ni porte : prêt, signalé en information",()=>{
  const c=one({"Objet":"MODULE 9001010002 5 RUE DES LILAS 75001 PARIS 1"});
  assert.equal(c.status,"ready");assert.equal(c.d.etage,"");assert.equal(c.d.porte,"");assert.ok(c.infos.includes("sans étage ni porte"))});

test("Code zone à 9 chiffres : le 0 initial est rétabli",()=>{
  const c=one({"Code Site":"901_PARC","Nom Site":"Le petit parc","Code zone":"901010003","Localisation du BI":"BAT01_Batiment 0901 / 01_3 RUE DU PARC_1 / 1 / 1","Objet":"MODULE 0901010003 3 RUE DU PARC 77000 MELUN","CP Site":"77000","Ville":"MELUN"});
  assert.equal(c.d.num,"0901010003");assert.equal(c.status,"ready")});

test("date d'audit : dernier passage réalisé",()=>{
  const c=one({"Début passages réalisés":"03/09/2026 09:00:00\r\n23/10/2026 11:30:00"});
  assert.equal(c.d.dAudit,"2026-10-23")});

test("l'étage 06 est écrit 6, la porte garde sa graphie (01)",()=>{
  const c=one({"Objet":"MODULE 9001010002 ETG 06 PORTE 01 5 RUE DES LILAS 75001 PARIS 1","Localisation du BI":"BAT01_5 RUE DES LILAS_1 / 6 / 1"});
  assert.equal(c.d.etage,"6");assert.equal(c.d.porte,"01");assert.equal(c.status,"ready")});

test("bilan : les négations ne déclenchent pas d'alerte",()=>{
  for(const t of ["Visite effectuée, aucune trace de nuisible. RAS","Je n’ai pas constaté de traces ou de présence de nuisibles","Traitement de relocation effectué, le logement n’est pas infesté.","Logement visité aucune trace d’infestation","Aucune présence de nuisibles et ou de traces. RAS"])
    assert.equal(IMP.bilanVerdict("Par X le 01/10/2026 : "+t).ok,true,t)});

test("bilan : infestation, déjà fait, impossible, logement occupé → à vérifier",()=>{
  for(const t of ["Le logement est infesté de cafards, prévoir une pulvérisation","Déjà faite","Le gardien m’a informé que le logement a déjà été reloué","Intervention non effectuée car le logement est déjà habité","J’ai des doutes sur une possible présence de punaises","Visite effectuée, quelques excréments de cafards"]){
    const c=one({"Bilan":"Par X le 01/10/2026 : "+t});assert.equal(c.status,"check",t);assert.ok(has(c,"bilan"),t)}});

test("bilan : seul le dernier passage compte, mais « impossible de faire le CNI » bloque partout",()=>{
  const b1="Par A le 01/10/2026 : Pas de réponse gardien\nPar B le 08/10/2026 : Visite effectuée RAS";
  assert.equal(one({"Bilan":b1}).status,"ready");
  const b2="Par A le 01/10/2026 : Impossible de faire le CNI il reste les affaires du locataire\nPar B le 08/10/2026 : Visite effectuée RAS";
  assert.equal(one({"Bilan":b2}).status,"check")});

test("plusieurs logements dans une intervention : tous à vérifier, un certificat par module",()=>{
  const cs=analyse([row({"Objet":"MODULE 9001010002 ETG 1 3 RUE DES LILAS 75001 PARIS 1 MODULE 9001010005 ETG 2 7 RUE DES LILAS 75001 PARIS 1"})]);
  assert.equal(cs.length,2);assert.ok(cs.every(c=>c.status==="check"&&has(c,"2 logements")));
  assert.deepEqual(cs.map(c=>c.d.num).sort(),["9001010002","9001010005"])});

test("rien ne disparaît : module absent ou mal saisi → ligne conservée, à vérifier",()=>{
  const c=one({"Code zone":"","Objet":"MODULE 90010224 5 RUE DES LILAS 75001 PARIS 1"});
  assert.equal(c.status,"check");assert.equal(c.d.num,"90010224");assert.ok(has(c,"illisible")||has(c,"Code zone"))});

test("numéro de rue différent de la localisation du BI → à vérifier (faute de frappe)",()=>{
  const c=one({"Objet":"MODULE 9001010002 2B RUE DES LILAS 75001 PARIS 1","Localisation du BI":"BAT01_32B RUE DES LILAS_1 / 3 / 12"});
  assert.equal(c.status,"check");assert.ok(has(c,"localisation"))});

test("étage de l'objet différent de la localisation du BI → à vérifier",()=>{
  const c=one({"Localisation du BI":"BAT01_Batiment 9001 / 01_5 RUE DES LILAS_1 / 1 / 12"});
  assert.equal(c.status,"check");assert.ok(has(c,"étage"))});

test("module d'un autre site : nom du site pris dans les listes, signalé",()=>{
  const c=one({"Code zone":"9002010001","Objet":"MODULE 9002010001 4 AVENUE DES TILLEULS 92100 BOULOGNE","Localisation du BI":"BAT01_4 AVENUE DES TILLEULS_1 / 1 / 1"});
  assert.equal(c.d.siteNom,"LES TILLEULS");assert.equal(c.status,"check");assert.ok(has(c,"site 9002"))});

test("site absent des listes mais présent dans le fichier : accepté",()=>{
  const c=one({"Code Site":"9555_NOUVEAU","Nom Site":"Nouveau site","Code zone":"9555010001","Objet":"MODULE 9555010001 8 RUE NEUVE 75001 PARIS 1","Localisation du BI":"BAT01_8 RUE NEUVE_1 / 1 / 1"});
  assert.equal(c.d.siteNom,"NOUVEAU SITE");assert.equal(c.status,"ready")});

test("statut non terminé → à vérifier",()=>{assert.ok(has(one({"Statut":"Planifié"}),"statut"))});

test("doublons : même certificat dans l'historique ou deux fois dans le fichier",()=>{
  const c1=one({},[{ref:"CNI_MVH_9001010002_20261010"}]);assert.equal(c1.status,"done");
  const cs=analyse([row(),row({"N° twimm":"100002"})]);assert.deepEqual(cs.map(c=>c.status),["ready","done"])});

test("fichier qui n'est pas un export twimm : colonnes absentes",()=>{
  const r=IMP.parseCSV("a;b\r\n1;2\r\n");assert.ok(!("ntwimm" in r[0]))});
