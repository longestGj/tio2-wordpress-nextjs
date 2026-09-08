import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {JSDOM} from 'jsdom';
const out='docs/verification/tio2-my/country-editorial-dependencies-20260908';
fs.mkdirSync(out,{recursive:true});
const ids=['APP-COAT','APP-PLAS','APP-MB','RES-TRADE-EU','RES-TRADE-IN'];
const base='http://127.0.0.1:3216',build='UV4ipmsCJ7cj7M2EHPfID';
const env=Object.fromEntries(fs.readFileSync('wordpress/.env','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const intake=JSON.parse(fs.readFileSync('docs/verification/tio2-my/trade4-app5-20260908/intake.json','utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=text=>String(text??'').replace(/\s+/gu,' ').trim();
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const id of ids){
  const contract=JSON.parse(fs.readFileSync(`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`,'utf8'));
  const original=intake.results.find(r=>r.id===id);
  const sources=[{path:original.packagePath,sha256:original.sha256},{path:original.manifestPath,sha256:original.manifestSha256},...original.boundFiles.filter(f=>f.path.startsWith(path.posix.dirname(original.manifestPath)+'/'))].map(f=>{const actual=sha(fs.readFileSync(path.join('D:/23MySec',f.path)));assert.equal(actual,f.sha256,`Source changed ${f.path}`);return {...f,verifiedSha256:actual}});
  const cmsResponse=await fetch('http://127.0.0.1:8186/graphql',{method:'POST',headers:{'content-type':'application/json','x-tio2-editorial-token':env.WORDPRESS_EDITORIAL_API_TOKEN},body:JSON.stringify({query:'query($pageId:String!,$siteScope:String!){malaysiaEditorialRecordJson(pageId:$pageId,siteScope:$siteScope)}',variables:{pageId:id,siteScope:'tio2-my'}})});
  const cms=JSON.parse((await cmsResponse.json()).data.malaysiaEditorialRecordJson);
  assert.equal(cms.recordPageId,id);assert.deepEqual(cms.siteScopes.nodes,[{slug:'tio2-my'}]);assert.equal(cms.status,'publish');assert.deepEqual(JSON.parse(cms.editorialContractJson),contract);
  const sourcePath=id==='RES-TRADE-IN'?'/markets/india/':'/markets/spain/';
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const sourceResponse=await page.goto(base+sourcePath,{waitUntil:'networkidle'});assert.equal(sourceResponse.status(),200);
  const sourceHtml=await sourceResponse.text();assert.ok(sourceHtml.includes(build));
  const anchor=page.locator(`main a[href="${contract.identity.path}"]`).first();assert.equal(await anchor.count(),1);
  const approvedHref=await anchor.getAttribute('href'),label=normalize(await anchor.textContent());
  await Promise.all([page.waitForURL(base+contract.identity.path),anchor.click()]);
  await page.waitForLoadState('networkidle');
  const target=await fetch(page.url()),html=await target.text();assert.equal(target.status,200);assert.ok(html.includes(build));
  const doc=new JSDOM(html).window.document,approved=new JSDOM(`<main>${contract.bodyHtml}</main>`).window.document;
  for(const a of approved.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(/^\/products\/m-[0-9]+\/$/u.test(href)&&!cms.availableGradePaths.includes(href))a.remove();}
  assert.equal(normalize(doc.querySelector('main')?.textContent),normalize(approved.querySelector('main')?.textContent));
  assert.equal(doc.querySelector('[data-editorial-page]')?.getAttribute('data-editorial-page'),id);
  assert.equal(doc.querySelector('h1')?.textContent,contract.heading);
  assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),contract.seo.canonical);
  assert.ok(doc.querySelector('meta[name="robots"]')?.getAttribute('content').includes('noindex'));
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${id}-target-1440.png`});
  const targetUrl=page.url();await page.goBack({waitUntil:'networkidle'});assert.equal(page.url(),base+sourcePath);assert.equal(await page.locator(`main a[href="${contract.identity.path}"]`).count()>0,true);
  const backUrl=page.url();
  let explicitTradeReturn=null;
  if(id.startsWith('RES-TRADE-')){const returnPath=id==='RES-TRADE-IN'?'/markets/india/':'/markets/european-union/';await page.goto(targetUrl,{waitUntil:'networkidle'});const link=page.locator(`main a[href="${returnPath}"]`).first();assert.equal(await link.count(),1);await Promise.all([page.waitForURL(base+returnPath),link.click()]);await page.waitForLoadState('networkidle');const r=await fetch(page.url());assert.equal(r.status,200);explicitTradeReturn={href:returnPath,url:page.url(),status:r.status};assert.equal(cms.freshnessControl.status,'verified');assert.equal(cms.freshnessControl.eventStatus,'no_open_trigger');}
  const other=await fetch('http://127.0.0.1:3029'+contract.identity.path),otherHtml=await other.text();
  results.push({id,finding:id==='RES-TRADE-IN'?'IN-G9-F01':'ES-G9-F03',time:new Date().toISOString(),build,siteScope:'tio2-my',cmsId:cms.id,approvedPayloadExact:true,approvedRenderedTextExact:true,sources,cmsReview:cms.freshnessControl??null,click:{source:base+sourcePath,sourceStatus:sourceResponse.status(),sourceBuild:build,label,approvedHref,target:targetUrl,targetStatus:target.status,back:backUrl,backVerified:true},explicitTradeReturn,otherCandidate:{base:'http://127.0.0.1:3029',finalUrl:other.url,status:other.status,containsExpectedEditorialPage:otherHtml.includes(`data-editorial-page="${id}"`)},screenshot:`${id}-target-1440.png`});
  await page.close();console.log(`${id}: 3216 approved target and actual click/back passed; 3029=${other.status}`);
 }
}finally{await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),runtimeCode:'b325aec6b5121f2ded604bcf3afad7886515990f',deliveryCommit:'6de21ad',sameCandidateClickReturn:true,countryLatestRepairsIncluded:false,gate9FindingClosure:false,rows:results},null,2)+'\n');}
assert.equal(results.length,5);
