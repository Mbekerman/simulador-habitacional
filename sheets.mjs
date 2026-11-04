import { GoogleAuth } from 'google-auth-library';
const id='1tk_0Mx8k_9V5VToePJAIaklw3eO_1xcBG8BpwD4wo0Y';
const scopes=['https://www.googleapis.com/auth/spreadsheets'];
let clientPromise,queue=Promise.resolve();
async function client(){
 if(!clientPromise)clientPromise=(async()=>{
  // Local/legado: JSON explícito. Cloud Run: Application Default Credentials da conta de serviço do serviço.
  const raw=process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null;
  if(raw)return await new GoogleAuth({credentials:JSON.parse(raw),scopes}).getClient();
  return await new GoogleAuth({scopes}).getClient();
 })().catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
export function buildRow(data,result,date=new Date()){
 const text=value=>typeof value==='string'?value.slice(0,3000):'';
 const dateText=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
 const timeText=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date);
 return [data.perfil==='corretor'?'Corretor':'Cliente',text(data.nome),text(data.cpf),text(data.email),text(data.telefone),text(data.data_nascimento).split('-').reverse().join('/'),Number(data.renda_mensal),data.outro_comprador?'Sim':'Não',data.trabalho_fgts_3_anos?'Sim':'Não',Number(data.valor_imovel),text(data.uf),text(data.municipio),({leste:'Zona Leste',oeste:'Zona Oeste',norte:'Zona Norte',sul:'Zona Sul',centro:'Centro'})[data.regiao]||'',result?Number(result.valor_financiamento):'',result?Number(result.valor_subsidio||0):'',dateText,timeText,text(data.telemetry?.ip)||'Indisponível',text(data.telemetry?.ipLocation)||'Indisponível',text(data.telemetry?.gpsLocation)||'Não autorizado ou indisponível',text(data.telemetry?.device)||'Indisponível',text(data.simID)];
}
export function firstBlank(rows){let index=0;while(index<rows.length && (rows[index]||[]).some(value=>value!==''&&value!==null&&value!==undefined))index++;return index+1;}
async function write(data,result,date){
 const auth=await client(),base='https://sheets.googleapis.com/v4/spreadsheets/'+id;
 const meta=await auth.request({url:base,params:{fields:'sheets.properties'}});
 const sheet=meta.data.sheets.find(item=>item.properties.sheetId===0)?.properties;
 if(!sheet)throw new Error('Aba gid=0 não encontrada.');
 const name="'"+sheet.title.replace(/'/g,"''")+"'";
 if(sheet.gridProperties.columnCount<52)await auth.request({url:base+':batchUpdate',method:'POST',data:{requests:[{appendDimension:{sheetId:0,dimension:'COLUMNS',length:52-sheet.gridProperties.columnCount}}]}});
 const existing=await auth.request({url:base+'/values/'+encodeURIComponent(name+'!B3:AZ'+sheet.gridProperties.rowCount),params:{valueRenderOption:'FORMULA'}});
 const row=firstBlank(existing.data.values||[])+2;
 const requests=[];
 if(row>sheet.gridProperties.rowCount)requests.push({appendDimension:{sheetId:0,dimension:'ROWS',length:row-sheet.gridProperties.rowCount}});
 if(requests.length)await auth.request({url:base+':batchUpdate',method:'POST',data:{requests}});
 await auth.request({url:base+'/values/'+encodeURIComponent(name+'!B'+row+':W'+row),method:'PUT',params:{valueInputOption:'RAW'},data:{values:[buildRow(data,result,date)]}});
 return row;
}
export function recordSimulation(data,result,date){const operation=queue.then(()=>write(data,result,date));queue=operation.catch(()=>{});return operation;}

export async function verifySheetConnection(){const auth=await client();const response=await auth.request({url:'https://sheets.googleapis.com/v4/spreadsheets/'+id,params:{fields:'sheets.properties'}});return response.data.sheets.some(sheet=>sheet.properties.sheetId===0);}

export async function updateGPS(row,value){const auth=await client(),base='https://sheets.googleapis.com/v4/spreadsheets/'+id;const meta=await auth.request({url:base,params:{fields:'sheets.properties'}});const sheet=meta.data.sheets.find(s=>s.properties.sheetId===0).properties;const name="'"+sheet.title.replace(/'/g,"''")+"'";await auth.request({url:base+'/values/'+encodeURIComponent(name+'!U'+row),method:'PUT',params:{valueInputOption:'RAW'},data:{values:[[value]]}});}
