// Chiffrement : mots de passe -> enveloppes -> clé de contenu -> page.
import crypto from "node:crypto";
export const N=600000;
export const norm=p=>String(p).trim().toLowerCase(); // même règle que l'écran de connexion
const b64=b=>Buffer.from(b).toString("base64");
const pbk=(pw,salt)=>crypto.pbkdf2Sync(norm(pw),salt,N,32,"sha256");
const seal=(key,iv,plain)=>{const c=crypto.createCipheriv("aes-256-gcm",key,iv);return Buffer.concat([c.update(plain),c.final(),c.getAuthTag()])};
const unseal=(key,iv,blob)=>{const d=crypto.createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(blob.subarray(blob.length-16));return Buffer.concat([d.update(blob.subarray(0,blob.length-16)),d.final()])};

// Données privées du dépôt (assets/private.enc) : un seul mot de passe les protège.
export function encryptAssets(obj,pw){
  const s=crypto.randomBytes(16),i=crypto.randomBytes(12);
  return JSON.stringify({v:1,s:b64(s),i:b64(i),c:b64(seal(pbk(pw,s),i,Buffer.from(JSON.stringify(obj))))})+"\n"}
export function decryptAssets(file,passwords){
  const f=JSON.parse(file);
  for(const pw of passwords){try{return JSON.parse(unseal(pbk(pw,Buffer.from(f.s,"base64")),Buffer.from(f.i,"base64"),Buffer.from(f.c,"base64")).toString("utf8"))}catch(e){}}
  throw new Error("Aucun des mots de passe fournis n'ouvre assets/private.enc")}

// Page protégée : une clé de contenu aléatoire par version, enveloppée pour chaque mot de passe.
export function envelopes(html,passwords){
  const ck=crypto.randomBytes(32),pi=crypto.randomBytes(12);
  const P={i:b64(pi),c:b64(seal(ck,pi,Buffer.from(html,"utf8")))};
  const E=passwords.map(pw=>{const s=crypto.randomBytes(16),i=crypto.randomBytes(12);return{s:b64(s),i:b64(i),w:b64(seal(pbk(pw,s),i,ck))}})
    .sort(()=>crypto.randomInt(0,2)-0.5);
  return{E,P}}

// Ouvre la page chiffrée avec un mot de passe (même logique que l'écran de connexion) ; utilisé par les tests.
export function openPage({E,P},pw){
  for(const e of E){
    try{
      const ck=unseal(pbk(pw,Buffer.from(e.s,"base64")),Buffer.from(e.i,"base64"),Buffer.from(e.w,"base64"));
      return unseal(ck,Buffer.from(P.i,"base64"),Buffer.from(P.c,"base64")).toString("utf8");
    }catch(err){}
  }
  return null}
