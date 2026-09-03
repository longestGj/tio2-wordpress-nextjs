import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

export function malaysiaRequestSamplePageSource(overrides:Record<string,unknown>={}){return {id:'request-sample-page-101',modifiedGmt:'2026-09-03T10:00:00',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:'/request-sample'},malaysiaRequestSampleContractJson:JSON.stringify(contract),...overrides}}
