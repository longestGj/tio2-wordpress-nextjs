import http from 'node:http'
import {surface,canonical} from './surface-contract.mjs'
const server=http.createServer((req,res)=>{
 const item=surface.objects.find(x=>x.path===req.url||canonical(x.path)===req.url)
 if(item&&req.url!==canonical(item.path)){res.writeHead(308,{location:canonical(item.path)});res.end();return}
 res.writeHead(item?.expectedStatus??404,{'content-type':'text/html'})
 res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${item?.name??'Missing'}</title><style>body{margin:20px;font:18px sans-serif}img{max-width:100%}</style><body><header><nav><a href="/">Home</a> <a href="/about">About</a></nav></header><main><h1>${item?.name??'Missing'}</h1><p>Local controller test harness fixture.</p><details><summary>Details</summary>Verified interaction</details><form><label>Name<input required name="name"></label></form></main></body></html>`)
})
server.listen(Number(process.env.TIO2_FIXTURE_PORT||31947),'127.0.0.1')
