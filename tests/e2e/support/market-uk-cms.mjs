import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
const load = name => JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/'+name+'.json','utf8'))
const contract = load('tio2-my-market-uk-001')
const port = Number(process.env.UK_CMS_PORT ?? 4024)
const basePort = Number(process.env.DOC_REACH_CMS_PORT ?? 4025)
let mode = 'default'
const source = () => ({
  id:'market-uk-local-1',modifiedGmt:'2026-09-05T01:02:03',status:'publish',
  siteScopes:{nodes:[{slug:mode==='foreign'?'tio2-a':'tio2-my'}]},
  publishingFields:{publicPath:'/markets/united-kingdom'},
  malaysiaUkMarketContractJson:JSON.stringify(contract),
  routeReadiness:Object.fromEntries(contract.routeRegistry.map(r=>[r.targetPageId,mode==='grades-ready'&&r.targetPageId.startsWith('GRADE-')])),
})
// Shared fixture registry, not a real CMS or cross-site fallback.
process.env.DOC_REACH_CMS_PORT=String(basePort)
await import('./document-reach-cms.mjs')
createServer(async(req,res)=>{
  const send=(status,payload)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(payload))}
  if(req.url==='/__health')return send(200,{ok:true,mode})
  const chunks=[];for await(const chunk of req)chunks.push(chunk)
  const body=Buffer.concat(chunks)
  let input
  try{input=JSON.parse(body.toString('utf8'))}catch{return send(400,{error:'invalid json'})}
  if(req.url==='/__state'&&req.method==='PUT'){
    if(!['default','foreign','missing','grades-ready'].includes(input.mode))return send(400,{error:'invalid mode'})
    mode=input.mode;return send(200,{ok:true})
  }
  if(input.query?.includes('malaysiaUkMarketRecordJson'))return send(200,mode==='missing'?{errors:[{message:'Controlled missing UK record'}]}:{data:{malaysiaUkMarketRecordJson:JSON.stringify(source())}})
  if(input.query?.includes('malaysiaProductDetailRecordJson')){
    const slug=input.variables?.slug
    if(!['m-350','m-510','m-896','m-200','m-108','m-210'].includes(slug))return send(400,{errors:[{message:'Grade outside UK fixture'}]})
    const c=load('tio2-my-product-detail-'+slug.replace('-',''))
    const projection=Object.fromEntries(['reviewId','identity','releaseControls','seo','globalChromeRef','breadcrumb'].map(k=>[k,c[k]]))
    projection.modules=Object.fromEntries(['hero','positioning','applications','evaluation','technical'].map(k=>[k,c[k]]))
    return send(200,{data:{malaysiaProductDetailRecordJson:JSON.stringify({id:'uk-fixture-'+slug,modifiedGmt:'2026-09-05T01:02:03',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:'/products/'+slug},publicProjection:projection})}})
  }
  try{
    const response=await fetch('http://127.0.0.1:'+basePort+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body})
    res.writeHead(response.status,{'content-type':'application/json'});res.end(await response.text())
  }catch{return send(503,{errors:[{message:'Shared local fixture unavailable'}]})}
}).listen(port,'127.0.0.1',()=>process.stdout.write('UK controlled CMS listening on '+port+'\n'))
