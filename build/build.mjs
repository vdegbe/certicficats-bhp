// Assemble src/ + données privées, chiffre, écrit index.html.
// Usage : SITE_PASSWORDS="mdp1,mdp2" node build/build.mjs
// Le premier mot de passe qui ouvre assets/private.enc sert aussi à ouvrir la page ; les autres sont des accès supplémentaires.
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
import {norm,decryptAssets,envelopes} from "./env.mjs";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const rd=f=>fs.readFileSync(path.join(root,f),"utf8");
const pws=(process.env.SITE_PASSWORDS||"").split(",").map(norm).filter(Boolean);
if(!pws.length){console.error("Définissez SITE_PASSWORDS (mots de passe séparés par des virgules).");process.exit(1)}
if(new Set(pws).size!==pws.length){console.error("Deux mots de passe identiques dans SITE_PASSWORDS.");process.exit(1)}
const a=decryptAssets(rd("assets/private.enc"),pws);
const safe=s=>s.replace(/<\/script/gi,"<\\/script").replace(/<!--/g,"<\\!--");
const data=[
 `const SITES=${JSON.stringify(a.sites)};`,
 `const IMG={bg:"data:image/jpeg;base64,${a.bgJpeg}",sig:"data:image/png;base64,${a.sigPng}"};`,
 `const FONTS={r:"${a.fontR}",b:"${a.fontB}"};`,
 `const FONT_CHARS=${JSON.stringify(a.fontChars)};`,
 `const BK_DEFAULT=${JSON.stringify(process.env.HISTORY_URL??a.history.url)};`,
 `const BK_TOKEN=${JSON.stringify(process.env.HISTORY_TOKEN??a.history.token)};`].join("\n");
const app=fs.readdirSync(path.join(root,"src/js")).filter(f=>f.endsWith(".js")).sort().map(f=>rd("src/js/"+f)).join("\n");
const place=(t,k,v)=>t.replace(`/*@${k}@*/`,()=>v);
let page=rd("src/template.html");
page=place(page,"CSS",rd("src/style.css"));
page=place(page,"JSPDF",safe(rd("vendor/jspdf.umd.min.js")));
page=place(page,"DATA",safe(data));
page=place(page,"APP",safe(app));
if(/\/\*@\w+@\*\//.test(page)){console.error("Marqueur non remplacé dans le gabarit.");process.exit(1)}
if(process.env.APP_OUT)fs.writeFileSync(process.env.APP_OUT,page); // version claire pour les tests (jamais committée)
const {E,P}=envelopes(page,pws);
let w=rd("build/wrapper.html");w=place(w,"E",JSON.stringify(E));w=place(w,"P",JSON.stringify(P));
fs.writeFileSync(process.env.OUT||path.join(root,"index.html"),w);
console.log(`index.html écrit (${Math.round(w.length/1024)} Ko, ${pws.length} mot(s) de passe, ${a.history.url?"historique partagé configuré":"historique partagé NON configuré"})`);
