import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import {listenFixture} from './fixture-server.mjs'
import {documentReachResponse} from './document-reach-cms.mjs'
const load = name => JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/'+name+'.json','utf8'))
const contract = load('tio2-my-market-uk-001')
let mode = 'default'
const source = () => ({
  id:'market-uk-local-1',modifiedGmt:'2026-09-05T01:02:03',status:'publish',
  siteScopes:{nodes:[{slug:mode==='foreign'?'tio2-a':'tio2-my'}]},
  publishingFields:{publicPath:'/markets/united-kingdom'},
  malaysiaUkMarketContractJson:JSON.stringify(contract),
  routeReadiness:Object.fromEntries(contract.routeRegistry.map(r=>[r.targetPageId,mode==='grades-ready'&&r.targetPageId.startsWith('GRADE-')])),
})
// Reuse the controlled records in this listener; no second hidden fixture port.
listenFixture(createServer(async(req,res)=>{
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
  return documentReachResponse(req,res,body)
}))
