function normalized(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function selectModality(options){
 if(!Array.isArray(options)||!options.length)throw new Error('Nenhuma modalidade disponível para estes dados.');
 const predicates=[
  name=>(name.includes('mcmv')||name.includes('minha casa'))&&name.includes('fgts')&&name.includes('empreendimento'),
  name=>(name.includes('mcmv')||name.includes('minha casa'))&&name.includes('fgts')&&!name.includes('empreendimento')&&!name.includes('classe media')&&!name.includes('pro cotista'),
  name=>name.includes('classe media'),
  name=>name.includes('sbpe')&&name.includes('empreendimento')
 ];
 for(const predicate of predicates){const selected=options.find(option=>predicate(normalized(option.nome)));if(selected)return selected;}
 return options[0];
}
export async function getPreferredModality(payload,api,token){
 const request={...payload};delete request.produto_codigo;delete request.produto_versao;delete request.seguradora_codigo;
 const response=await fetch(api+'/api/v1/modalidades',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':token},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw new Error('Não foi possível consultar as modalidades disponíveis.');
 const selected=selectModality(await response.json());
 if(typeof selected.codigo!=='string'||!selected.codigo||typeof selected.versao!=='string'||!selected.versao)throw new Error('A API retornou uma modalidade sem código ou versão.');
 return selected;
}
