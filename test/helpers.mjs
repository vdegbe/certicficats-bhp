// Outils de test : charge l'analyseur du CSV et fabrique des CSV twimm fictifs.
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");

// Sites fictifs (le vrai fichier de sites est chiffré dans assets/private.enc)
export const SITES={
  "9001":[["RESIDENCE DES LILAS","1 RUE DES LILAS","75001","PARIS 1"]],
  "9002":[["LES TILLEULS","9 AVENUE DES TILLEULS","92100","BOULOGNE"]],
  "0901":[["LE PETIT PARC","3 RUE DU PARC","77000","MELUN"]],
};
export const U=s=>(s||"").toString().trim().toUpperCase();
export const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const refOf=d=>`CNI_MVH_${d.num}_${(d.dAudit||"").replace(/-/g,"")}`;
const src=fs.readFileSync(path.join(root,"src/js/20-import-core.js"),"utf8");
export const IMP=new Function("SITES","U","iso","refOf",src+";return IMP;")(SITES,U,iso,refOf);

const msrc=fs.readFileSync(path.join(root,"src/js/32-map-core.js"),"utf8");
export const MAPC=new Function("IMP",msrc+";return MAPC;")(IMP);

const HEAD=["N° twimm","Type","Code Site","Nom Site","Adresse Site","CP Site","Ville","Code zone","Localisation du BI","Objet","Bilan","Statut","Passages réalisés","Début passages réalisés","Fin passages réalisés"];
const cell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
// ligne par défaut : un logement propre, modifiable champ par champ
export const row=(o={})=>({
  "N° twimm":"100001","Type":"VISITE DE RELOCATION","Code Site":"9001_RESIDENCE","Nom Site":"Residence des Lilas","Adresse Site":"1 RUE DES LILAS","CP Site":"75001","Ville":"PARIS 1",
  "Code zone":"9001010002","Localisation du BI":"BAT01_Batiment 9001 / 01_5 RUE DES LILAS_1 / 3 / 12",
  "Objet":"VISITE DE RELOCATION LOGEMENT VACANT MODULE 9001010002 ETG 3 PORTE 12 5 RUE DES LILAS 75001 PARIS 1",
  "Bilan":"Par Jean Test le 10/10/2026 : Visite de relocation effectuée RAS","Statut":"Vérifié","Passages réalisés":"Jean Test","Début passages réalisés":"10/10/2026 09:00:00","Fin passages réalisés":"10/10/2026 09:40:00",...o});
// CSV au format twimm : séparateur ;, CRLF, champs entre guillemets avec retours à la ligne, encodage Windows-1252
export const toCsv=rows=>Buffer.from(HEAD.map(cell).join(";")+"\r\n"+rows.map(r=>HEAD.map(h=>cell(r[h])).join(";")).join("\r\n")+"\r\n","latin1");
export const analyse=(rows,hist=[])=>IMP.analyseAll(IMP.parseCSV(IMP.decode(toCsv(rows))),hist);
