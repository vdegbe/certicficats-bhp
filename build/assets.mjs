// Données privées chiffrées.
//   SITE_PASSWORDS=... node build/assets.mjs show              -> résumé (sans afficher les secrets)
//   SITE_PASSWORDS=... node build/assets.mjs set-history URL   -> adresse du service d'historique partagé
//   SITE_PASSWORDS=... node build/assets.mjs new-token         -> nouveau jeton d'historique (à recoller dans le script Google)
//   SITE_PASSWORDS=... node build/assets.mjs pack fichier.json -> (re)crée private.enc depuis un JSON
import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";import {fileURLToPath} from "node:url";
import {norm,encryptAssets,decryptAssets} from "./env.mjs";
const f=path.join(path.dirname(fileURLToPath(import.meta.url)),"..","assets","private.enc");
const pws=(process.env.SITE_PASSWORDS||"").split(",").map(norm).filter(Boolean);
if(!pws.length){console.error("Définissez SITE_PASSWORDS.");process.exit(1)}
const [cmd,arg]=process.argv.slice(2);
if(cmd==="pack"){fs.writeFileSync(f,encryptAssets(JSON.parse(fs.readFileSync(arg,"utf8")),pws[0]));console.log("private.enc écrit");process.exit(0)}
const a=decryptAssets(fs.readFileSync(f,"utf8"),pws);
if(cmd==="show"){console.log({sites:Object.keys(a.sites).length+" codes",policeCaracteres:a.fontChars.length,historique:{url:a.history.url||"(non configuré)",jeton:a.history.token?"défini ("+a.history.token.length+" car.)":"absent"}})}
else if(cmd==="set-history"){if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(arg||"")){console.error("Adresse attendue : https://script.google.com/macros/s/…/exec");process.exit(1)}a.history.url=arg;fs.writeFileSync(f,encryptAssets(a,pws[0]));console.log("Adresse enregistrée.")}
else if(cmd==="new-token"){a.history.token=crypto.randomBytes(18).toString("base64url");fs.writeFileSync(f,encryptAssets(a,pws[0]));console.log("Nouveau jeton :",a.history.token,"\n(collez-le aussi dans le script Google : l'app le met dans le script de l'onglet Réglages)")}
else{console.error("Commande inconnue.");process.exit(1)}
