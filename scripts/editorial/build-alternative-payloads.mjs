import {createHash} from 'node:crypto'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {JSDOM} from 'jsdom'

const repoRoot=resolve(import.meta.dirname,'../..')
const planningRoot=resolve(process.env.TIO2_MY_PLANNING_ROOT??'D:/23MySec')
const checkOnly=process.argv.includes('--check')
const evidenceDirectory='docs/verification/tio2-my/de-it-su-r706-chemours-20260908'
const pages=[
  {
    id:'RES-R706',directory:'r706-alternative',slug:'ti-pure-r-706-alternative',
    packageSha256:'6b94e44cd514edee1adb6ab09bd2d45950509cffd3c6282e79ca3cb05ebd110c',
    bodySha256:'e19dcd07107cd20a368377abadaf607a4945f9a8614d96b3a7eeda894e40419b',
    contractVersion:'0.3',contractSha256:'dd48986e8f020f22448fc77d92b694300a5556d93bf305e091915eba552a452b',
    visualSha256:'decf85559122c536ee51b3b6da0a3f3165e9e8542a771b0c279382ec229e5041',
    title:'Ti-Pure R-706 Qualification Guide | TiO2 Malaysia',
    metaDescription:'Use Ti-Pure R-706 product facts, document labels and coating test dimensions to prepare an independent titanium dioxide qualification brief.',
    heading:'Qualify Another TiO2 Supply When Ti-Pure R-706 Is Your Reference',
    breadcrumbLabel:'R-706 Qualification Guide',
  },
  {
    id:'RES-CHEMOURS',directory:'chemours-alternatives',slug:'chemours-titanium-dioxide-alternatives',
    packageSha256:'708568bb8c03585856a66e48fc9f98ec53a359564d697f021d5c613c2105bd9c',
    bodySha256:'91ae0f0c13701dd9be8f8cdb68fe81781ebd7ad5f6e460ab022ac3466561e5f6',
    contractVersion:'0.7',contractSha256:'ab5ba6f7db66dd411974251dbfcb7201ea9bbf92928f638d2619cfc173ffaea4',
    visualSha256:'0bfcf6283310b7eb14699428e87e1b50aa4aeb8b8ff98bf9ced52fcd45e464d2',
    title:'How to Evaluate Chemours Titanium Dioxide Alternatives',
    metaDescription:'Use the exact Ti-Pure grade, application, documented product facts and your own qualification criteria to evaluate another titanium dioxide supply source.',
    heading:'How to Evaluate a Chemours Titanium Dioxide Alternative',
    breadcrumbLabel:'Chemours Titanium Dioxide Alternatives',
  },
]
const sha256=value=>createHash('sha256').update(value).digest('hex')
function assertHash(name,bytes,expected){
  if(sha256(bytes)!==expected)throw new Error(`${name}: approved source SHA-256 mismatch`)
}
function normalize(value){return value.replace(/\s+/gu,' ').trim()}
function assertBuyerCopy(main,copy,page){
  const publicCopy=page.id==='RES-R706'?copy.split('## Buyer Clean public copy')[1]:copy.replace(/<!--[\s\S]*?-->/gu,'')
  if(!publicCopy)throw new Error(`${page.id}: missing approved buyer body`)
  const observed=normalize(main.textContent)
  let cursor=0,blocks=0
  for(let line of publicCopy.split(/\r?\n/u)){
    line=line.trim()
    if(!line||line==='### Breadcrumb'||/^<a\s/iu.test(line))continue
    const heading=/^#{1,6}\s/u.test(line)
    line=line.replace(/^#{1,6}\s+/u,'')
    if(!heading)line=line.replace(/^(?:\d+\.|-)\s+/u,'')
    line=line.replace(/^\*\*(?:Primary action|Secondary action|Action):\*\*\s*/u,'')
      .replace(/\[([^\]]+)\]\([^)]+\)/gu,'$1').replace(/\*\*/gu,'')
    const target=normalize(line)
    const found=observed.indexOf(target,cursor)
    if(found<0)throw new Error(`${page.id}: approved buyer block missing or out of order: ${target}`)
    cursor=found+target.length;blocks++
  }
  return blocks
}
function matchingBrace(source,open){
  let depth=1
  for(let cursor=open+1;cursor<source.length;cursor++){
    if(source[cursor]==='{')depth++
    if(source[cursor]==='}')depth--
    if(depth===0)return cursor
  }
  throw new Error('Unbalanced approved CSS')
}
function scopeCss(source,pageId){
  const scope=`[data-editorial-page="${pageId}"]`
  const css=source.replace(/\/\*[\s\S]*?\*\//gu,'').replace(/\bInter\s*,\s*Arial\s*,\s*sans-serif\b/giu,'var(--font-my-shared),Arial,sans-serif').trim()
  let result='',cursor=0
  while(cursor<css.length){
    const open=css.indexOf('{',cursor)
    if(open<0)break
    const prelude=css.slice(cursor,open).trim(),close=matchingBrace(css,open),body=css.slice(open+1,close)
    if(/^@media\b/u.test(prelude))result+=`${prelude}{${scopeCss(body,pageId)}}\n`
    else if(prelude.startsWith('@'))throw new Error(`Unsupported page CSS: ${prelude}`)
    else{
      const selectors=prelude.split(',').flatMap(selector=>{
        const local=selector.trim().replace(/\b(?:body|html)\b/gu,'main')
        if(local==='*')return [`${scope} main`,`${scope} main *`]
        return [`${scope} ${local.startsWith('main')?local:`main ${local}`}`]
      })
      result+=`${selectors.join(',')}{${body.trim()}}\n`
    }
    cursor=close+1
  }
  return result
}
async function emit(relative,content){
  const path=resolve(repoRoot,relative)
  if(checkOnly){
    if(await readFile(path,'utf8')!==content)throw new Error(`Generated output is stale: ${relative}`)
  }else{
    await mkdir(dirname(path),{recursive:true})
    await writeFile(path,content,'utf8')
  }
}
const bindings=[]
for(const page of pages){
  const base=`pages/resources/${page.directory}`
  const paths={
    package:`${base}/06_handoff/${page.id}_GATE6_HANDOFF_PACKAGE_V0.2.md`,
    body:`${base}/04_planning/${page.id}_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md`,
    contract:`${base}/04_planning/${page.id}_GATE2_CONTENT_CONTRACT_V${page.contractVersion}.md`,
    visual:`${base}/04_planning/gate4-v0.1/${page.id}_GATE4_COMPLETE_VISUAL_V0.1.html`,
  }
  const files=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([kind,path])=>[kind,await readFile(resolve(planningRoot,path))])))
  for(const kind of Object.keys(paths))assertHash(`${page.id} ${kind}`,files[kind],page[`${kind}Sha256`])
  const document=new JSDOM(files.visual.toString('utf8')).window.document
  const main=document.querySelector('main')
  if(!main||main.querySelector('h1')?.textContent!==page.heading||main.querySelectorAll('section').length!==6)throw new Error(`${page.id}: wrong visual main/H1/modules`)
  const comparedBuyerBlocks=assertBuyerCopy(main,files.body.toString('utf8'),page)
  const bodyHtml=main.innerHTML
  const style=document.querySelector('style')?.textContent??''
  const pageStart=style.lastIndexOf('*{box-sizing:border-box}')
  if(pageStart<0)throw new Error(`${page.id}: no approved page CSS marker`)
  const css=scopeCss(style.slice(pageStart),page.id)
  const path=`/resources/${page.slug}/`
  const payload={
    identity:{pageId:page.id,siteScope:'tio2-my',locale:'en',path,section:'resources',provisional:true,schemaVersion:'editorial-v0.1'},
    source:{packageId:`${page.id}-G6-HANDOFF-02`,packageSha256:page.packageSha256,bodySha256:page.bodySha256,renderedBodySha256:sha256(bodyHtml),visualSha256:page.visualSha256},
    seo:{title:page.title,metaDescription:page.metaDescription,canonical:null,schemaType:'none'},
    heading:page.heading,
    breadcrumb:[{label:'Home',href:'/'},{label:'Resources',href:'/resources/'},{label:page.breadcrumbLabel,href:path}],
    bodyHtml,mainClass:main.getAttribute('class')??'',
    freshness:{lastReviewed:'2026-09-06',nextReviewDue:'2026-12-05',status:'unverified',evidenceDate:null},
  }
  const configPath=`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${page.id.toLowerCase()}.json`
  const cssPath=`components/sites/tio2-my/editorial/${page.id.toLowerCase()}.css`
  const routePath=`app/(en)/resources/${page.slug}/page.tsx`
  const config=`${JSON.stringify(payload,null,2)}\n`
  const route=`import '@/components/sites/tio2-my/editorial/${page.id.toLowerCase()}.css'\n\nimport {generateMalaysiaEditorialMetadata,renderMalaysiaEditorialRoute} from '@/lib/editorial/malaysia-editorial-route'\n\nconst PAGE_ID='${page.id}'\n\nexport function generateMetadata(){return generateMalaysiaEditorialMetadata(PAGE_ID)}\n\nexport default function MalaysiaAlternativeResourceRoute(){return renderMalaysiaEditorialRoute(PAGE_ID)}\n`
  await emit(configPath,config)
  await emit(cssPath,css)
  await emit(routePath,route)
  bindings.push({pageId:page.id,siteScope:'tio2-my',sources:Object.fromEntries(Object.entries(paths).map(([kind,path])=>[kind,{path,sha256:sha256(files[kind]),bytes:files[kind].length}])),comparedBuyerBlocks,outputs:{config:{path:configPath,sha256:sha256(config)},css:{path:cssPath,sha256:sha256(css)},route:{path:routePath,sha256:sha256(route)}},renderedBodySha256:sha256(bodyHtml),differences:['Frozen main content retained; shared chrome/scripts/assets excluded.','Page-only CSS scoped to Page ID; Inter consumes shared runtime font.','Candidate canonical and JSON-LD omitted pending specific authority.','Visible source review date unchanged; 90-day due 2026-12-05 is operational, not public copy.']})
}
await emit(`${evidenceDirectory}/alternatives-source-bindings.json`,`${JSON.stringify({schemaVersion:'alternatives-source-bindings-v0.1',siteScope:'tio2-my',planningPathsAreBuildTimeOnly:true,pages:bindings},null,2)}\n`)
process.stdout.write(`${checkOnly?'Checked':'Built'} ${pages.length} alternative payloads, routes and scoped styles; approved buyer blocks ${bindings.map(page=>`${page.pageId}:${page.comparedBuyerBlocks}`).join(', ')}.\n`)
