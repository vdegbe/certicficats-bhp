import test from "node:test";import assert from "node:assert/strict";
import {encryptAssets,decryptAssets,envelopes,openPage} from "../build/env.mjs";

test("données privées : aller-retour, et refus avec un mauvais mot de passe",()=>{
  const f=encryptAssets({a:1,b:"é"},"Mot-De-Passe");
  assert.deepEqual(decryptAssets(f,["mot-de-passe"]),{a:1,b:"é"});
  assert.throws(()=>decryptAssets(f,["autre"]))});

test("plusieurs mots de passe : chacun ouvre la page, un mot de passe retiré n'ouvre plus la nouvelle version",()=>{
  const html="<html>page secrète</html>";
  const v1=envelopes(html,["alice-1","bob-2"]);
  assert.equal(openPage(v1,"alice-1"),html);assert.equal(openPage(v1,"bob-2"),html);assert.equal(openPage(v1,"intrus"),null);
  const v2=envelopes(html,["alice-1"]); // Bob retiré
  assert.equal(openPage(v2,"alice-1"),html);assert.equal(openPage(v2,"bob-2"),null);
  assert.notEqual(v1.P.c,v2.P.c)}); // chaque version a sa propre clé

test("le texte clair n'apparaît pas dans la page chiffrée",()=>{
  const {E,P}=envelopes("MOT-TRES-SECRET",["x"]);
  assert.ok(!JSON.stringify({E,P}).includes("SECRET"))});
