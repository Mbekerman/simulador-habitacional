import {randomUUID} from 'node:crypto';
import {recordSimulation,updateGPS} from './sheets.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const api = process.env.SIMULADOR_API_URL || 'https://simulador-cx.up.railway.app';
const fixedKeys = ['tipo_financiamento','categoria_imovel','possui_subsidio_fgts_uniao','possui_imovel_municipio','relacionamento_caixa','servidor_publico','conta_salario','autoriza_armazenamento','sistema_amortizacao'];
const types = { '/': ['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/style.css':['style.css','text/css'] };
const send = (res,status,data) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const locationCache=new Map();const gpsUpdates=new Map();
async function locationData(path){
 const cached=locationCache.get(path);if(cached&&Date.now()-cached.time<86400000)return cached.data;
 const response=await fetch(api+path,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('LOCATION');
 const data=await response.json();locationCache.set(path,{time:Date.now(),data});return data;
}
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function desiredProduct(products){return products.find(p=>{const name=normalize(p.nome);return name.includes('minha casa')&&name.includes('fgts')&&name.includes('empreendimento');});}
function desiredInsurer(options){return options.find(p=>normalize(p.nome).trim()==='caixa residencial habitacional');}
async function simulate(payload){
 const response=await fetch(api+'/api/v1/simulacoes',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.SIMULADOR_API_TOKEN},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
 if(!response.ok){const error=new Error(response.status===401||response.status===403?'A API recusou a autenticação.':'A API não concluiu a simulação. Confira os dados e tente novamente.');throw error;}
 return await response.json();
}
function sbpeProduct(products){return products.find(p=>{const name=normalize(p.nome);return name.includes('sbpe')&&/\btr\b/.test(name)&&name.includes('empreendimento');});}
async function finalizeInsurer(payload,result,product){
 const insurer=desiredInsurer([result.seguradora,...(result.opcoes_seguradora||[])]);
 if(!insurer)throw new Error('O plano CAIXA Residencial Habitacional não está disponível para estes dados.');
 if(result.seguradora.codigo!==insurer.codigo){payload.produto_codigo=product.codigo;payload.produto_versao=product.versao;payload.seguradora_codigo=insurer.codigo;result=await simulate(payload);}
 if(result.produto.codigo!==product.codigo||result.produto.versao!==product.versao||result.seguradora.codigo!==insurer.codigo||result.sistema_amortizacao!==payload.sistema_amortizacao)throw new Error('A API retornou condições diferentes das solicitadas.');
 return result;
}
async function configuredSimulation(payload){
 let lastError;
 for(const code of ['100501101','100501129','100501122']){
  const attempt={...payload,produto_codigo:code};
  delete attempt.produto_versao;
  delete attempt.seguradora_codigo;
  try{
   const result=await simulate(attempt);
   if(result.produto?.codigo!==code)throw new Error('A API retornou um produto diferente do solicitado.');
   const product=result.produto;
   attempt.produto_versao=product.versao;
   return await finalizeInsurer(attempt,result,product);
  }catch(error){lastError=error;}
 }
 throw lastError||new Error('Nenhum dos três produtos concluiu a simulação.');
}
async function config(){return JSON.parse(await readFile(root+'config.json','utf8'));}
http.createServer(async (req,res) => {
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if(path==='/health'&&req.method==='GET'){send(res,200,{status:'ok'});return;}
    if(req.method==='GET' && types[path]) {const [file,type]=types[path];res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(root+'public/'+file));return;}
    if(req.method==='GET'&&(path==='/api/ufs'||/^\/api\/municipios\/[A-Z]{2}$/.test(path))){try{send(res,200,await locationData(path));}catch{send(res,502,{error:'Não foi possível carregar a localização. Tente novamente.'});}return;}
    if(path==='/api/config' && req.method==='GET') {const cfg=await config();send(res,200,{pending:fixedKeys.filter(key=>cfg[key]===null||cfg[key]===undefined||cfg[key]===''),authenticated:Boolean(process.env.SIMULADOR_API_TOKEN)});return;}
    if(!['/api/simulate','/api/location-result'].includes(path)||req.method!=='POST'){send(res,404,{error:'Página não encontrada.'});return;}
    if(req.headers.origin && req.headers.origin!==`${process.env.RAILWAY_PROJECT_ID?'https':'http'}://${req.headers.host}`){send(res,403,{error:'Origem inválida.'});return;}
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000){send(res,413,{error:'Dados muito longos.'});return;}}
    let data;try{data=JSON.parse(raw);}catch{send(res,400,{error:'Dados inválidos.'});return;}
    if(path==='/api/location-result'){
      const entry=gpsUpdates.get(data.token);
      if(!entry||Date.now()>entry.expires||typeof data.location!=='string'||data.location.length>3000){send(res,400,{error:'Atualização inválida.'});return;}
      try{await updateGPS(entry.row,data.location);send(res,200,{saved:true});}catch{send(res,502,{error:'Falha ao atualizar localização.'});}return;
    }
    if(typeof data.uf!=='string'||! /^[A-Z]{2}$/.test(data.uf)||typeof data.municipio!=='string'){send(res,400,{error:'Selecione estado e cidade.'});return;}
    const cities=await locationData('/api/municipios/'+data.uf);
    if(!cities.some(city=>city.nome===data.municipio)){send(res,400,{error:'Selecione uma cidade do estado informado.'});return;}
    const cfg=await config();const pending=fixedKeys.filter(key=>cfg[key]===null||cfg[key]===undefined||cfg[key]==='');
    if(pending.length){send(res,503,{error:'Precisamos definir os parâmetros fixos antes de realizar a simulação.'});return;}
    if(!process.env.SIMULADOR_API_TOKEN){send(res,503,{error:'A autenticação da API ainda não foi configurada no servidor.'});return;}
    if(!/^\d{11}$/.test(data.cpf)||!/^\d{10,11}$/.test(data.telefone)||!/^\d{4}-\d{2}-\d{2}$/.test(data.data_nascimento)||typeof data.trabalho_fgts_3_anos!=='boolean'||typeof data.outro_comprador!=='boolean'||!(data.renda_mensal>0)||!(data.valor_imovel>0)){send(res,400,{error:'Revise os campos informados.'});return;}
    const payload={...cfg,sistema_amortizacao:data.sistema_amortizacao==='SAC'?'SAC':'PRICE',uf:data.uf,municipio:data.municipio,cpf:data.cpf,telefone:data.telefone,data_nascimento:data.data_nascimento,renda_mensal:data.renda_mensal,valor_imovel:data.valor_imovel,trabalho_fgts_3_anos:data.trabalho_fgts_3_anos,outro_comprador:data.outro_comprador};
    if(data.record===true&&!data.telemetry?.ip){
      data.telemetry={...data.telemetry};
      try{const address=req.socket.remoteAddress;const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);const response=await fetch('https://ipwho.is/'+(local?'':address.replace(/^::ffff:/,'')),{signal:AbortSignal.timeout(3000)});const geo=await response.json();if(geo.success){data.telemetry.ip=geo.ip;data.telemetry.ipLocation=[geo.city,geo.region,geo.country].filter(Boolean).join(', ');}}catch{}
    }
    const recordedAt=new Date();let result=null,simulationError=null;
    try{result=await configuredSimulation(payload);}catch(error){simulationError=error.name==='TimeoutError'?'A simulação demorou mais que o esperado. Tente novamente.':error.message;}
    let sheetStatus=null;
    if(data.record===true){try{const row=await recordSimulation(data,result,recordedAt);const token=randomUUID();gpsUpdates.set(token,{row,expires:Date.now()+600000});for(const [key,value]of gpsUpdates)if(value.expires<Date.now())gpsUpdates.delete(key);sheetStatus={saved:true,row,gpsUpdateToken:token};}catch{sheetStatus={saved:false,message:'Não foi possível confirmar o registro na planilha. Não repita a simulação apenas para tentar salvar.'};}}
    if(simulationError){send(res,502,{error:simulationError,spreadsheet:sheetStatus});return;}
    send(res,200,{...result,spreadsheet:sheetStatus});
  }catch(error){send(res,502,{error:error.name==='TimeoutError'?'A simulação demorou mais que o esperado. Tente novamente.':'Não foi possível concluir a solicitação.'});}
}).listen(port,process.env.HOST || (process.env.RAILWAY_PROJECT_ID?'0.0.0.0':'127.0.0.1'),()=>console.log(`Local: http://localhost:${port}`));
