function browserSimID(){
 const match=document.cookie.split(';').map(value=>value.trim()).find(value=>value.startsWith('SimID='));
 let id='';try{id=match?decodeURIComponent(match.slice(6)):'';}catch{}
 if(!id)id=crypto.randomUUID();
 document.cookie='SimID='+encodeURIComponent(id)+'; Max-Age=31536000; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
 return id;
}
const simID=browserSimID();
const form=document.querySelector('#form');
for(const input of form.querySelectorAll('input:not([type]),input[type="text"],input[type="email"],input[type="tel"],textarea')){
  input.addEventListener('focus',()=>input.select());
  input.addEventListener('click',()=>input.select());
}
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
const digits=value=>value.replace(/\D/g,'');
function amount(value){return Number(value.replace(/[^\d,]/g,'').replace(',','.'));}
function validCpf(value){const cpf=digits(value);if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(cpf[i])*(n+1-i);let check=(sum*10)%11;if(check===10)check=0;if(check!==Number(cpf[n]))return false;}return true;}
form.cpf.addEventListener('input',()=>{let d=digits(form.cpf.value).slice(0,11);form.cpf.value=d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1-$2');});
form.telefone.addEventListener('input',()=>{const d=digits(form.telefone.value).slice(0,11);form.telefone.value=d.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2');});
for(const name of ['renda_mensal','valor_imovel']){
  const input=form[name];
  input.addEventListener('input',()=>{
    const raw=input.value;
    const caret=input.selectionStart??raw.length;
    const digitsToRight=digits(raw.slice(caret)).length;
    const numeric=digits(raw);
    if(!numeric){input.value='';return;}
    input.value=money(Number(numeric)/100);
    let position=input.value.length;
    let remaining=digitsToRight;
    while(position>0 && remaining>0){position--;if(/\d/.test(input.value[position]))remaining--;}
    input.setSelectionRange(position,position);
  });
}
function birthDateISO(value){
  const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if(!match)return '';
  const [,day,month,year]=match;
  const date=new Date(Number(year),Number(month)-1,Number(day));
  const today=new Date();today.setHours(0,0,0,0);
  if(Number(year)<1920||date.getFullYear()!==Number(year)||date.getMonth()!==Number(month)-1||date.getDate()!==Number(day)||date>today)return '';
  return year+'-'+month+'-'+day;
}
const birthDateParts=['day','month','year'].map(part=>form.querySelector('[data-birth-part="'+part+'"]'));
function sizeBirthDateParts(){
  for(const input of birthDateParts)input.previousElementSibling.textContent=input.value||input.placeholder;
}
form.querySelector('.birthdate-parts').addEventListener('click',event=>{
  if(event.target===event.currentTarget)(birthDateParts.find(input=>!input.value)||birthDateParts[0]).focus();
});
function syncBirthDate(){
  sizeBirthDateParts();
  const values=birthDateParts.map(input=>input.value);
  form.data_nascimento.value=values.some(Boolean)?values.join('/'):'';
  form.data_nascimento.dispatchEvent(new Event('input',{bubbles:true}));
}
function restoreBirthDateParts(){
  const values=form.data_nascimento.value.split('/');
  birthDateParts.forEach((input,index)=>{input.value=values[index]||'';input.dataset.acceptedValue=input.value;});
  sizeBirthDateParts();
}
function birthPartError(input,value){
  if(value.length!==input.maxLength)return '';
  const numeric=Number(value);
  if(input===birthDateParts[0]&&(numeric<1||numeric>31))return 'Informe um dia entre 01 e 31.';
  if(input===birthDateParts[1]&&(numeric<1||numeric>12))return 'Informe um mês entre 01 e 12.';
  const currentYear=new Date().getFullYear();
  if(input===birthDateParts[2]&&(numeric<1920||numeric>currentYear))return 'Informe um ano entre 1920 e '+currentYear+'.';
  return '';
}
function showBirthPartError(input,error){
  input.setAttribute('aria-invalid',Boolean(error));
  form.querySelector('.birthdate-field small').textContent=error;
}
for(const [index,input] of birthDateParts.entries()){
  input.dataset.acceptedValue='';
  input.addEventListener('input',()=>{
    const candidate=digits(input.value).slice(0,input.maxLength);
    const error=birthPartError(input,candidate);
    input.value=error?input.dataset.acceptedValue:candidate;
    if(!error)input.dataset.acceptedValue=candidate;
    showBirthPartError(input,error);
    syncBirthDate();
    if(!error&&candidate.length===2&&index<2)birthDateParts[index+1].focus();
  });
  input.addEventListener('blur',()=>{
    if(input.maxLength===2&&input.value.length===1){
      const candidate=input.value.padStart(2,'0');
      const error=birthPartError(input,candidate);
      input.value=error?'':candidate;
      input.dataset.acceptedValue=input.value;
      showBirthPartError(input,error);
    }
    syncBirthDate();
  });
}

const initialNames=['nome','cpf','email','telefone'];
function initialError(input){
  const value=input.value.trim();
  if(!value)return 'Campo obrigatório.';
  if(input.name==='nome' && !/^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*)+$/u.test(value))return 'Informe o nome completo, com nome e sobrenome.';
  if(input.name==='cpf'&&!validCpf(value))return 'Informe um CPF válido.';
  if(input.name==='email'&&(!input.validity.valid||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))return 'Informe um e-mail válido.';
  if(input.name==='telefone'&&!/^[1-9][1-9]9\d{8}$/.test(digits(value)))return 'Informe um celular válido com DDD e 9 dígitos.';
  return '';
}
function initialValid(){return initialNames.every(name=>!initialError(form.elements.namedItem(name)))&&['cliente','corretor'].includes(form.perfil.value);}
function updateGate(){
  const ready=initialValid();
  document.querySelector('#simulation-fields').disabled=!ready;
  document.querySelector('#property-fields').disabled=!ready;
  document.dispatchEvent(new CustomEvent('gatechange',{detail:ready}));
  document.querySelector('#unlock-status').textContent=ready?'Dados iniciais completos. Você já pode preencher os dados da simulação.':'Preencha nome, CPF, e-mail e celular e escolha seu perfil para liberar os dados da simulação.';
  document.querySelector('#unlock-status').classList.toggle('unlocked',ready);
  document.querySelector('#profile-help').textContent=form.perfil.value==='corretor'?'Você está simulando para um cliente. Preencha os dados de quem vai comprar o imóvel.':form.perfil.value==='cliente'?'Você está simulando para comprar seu imóvel. Preencha seus dados abaixo.':'Escolha se você está buscando um imóvel ou atendendo um cliente.';
}
for(const name of initialNames){const input=form.elements.namedItem(name);input.addEventListener('input',()=>{if(input.dataset.touched){const error=initialError(input);input.closest('label').querySelector('small').textContent=error;input.setAttribute('aria-invalid',Boolean(error));}updateGate();});input.addEventListener('blur',()=>{input.dataset.touched='true';const error=initialError(input);input.closest('label').querySelector('small').textContent=error;input.setAttribute('aria-invalid',Boolean(error));updateGate();});}
form.addEventListener('input',()=>{document.querySelector('#result').hidden=true;});
form.querySelectorAll('[name=perfil]').forEach(input=>input.addEventListener('change',()=>{document.querySelector('#profile-field > small').textContent='';updateGate();}));
updateGate();

function rows(target,values){target.replaceChildren();for(const [key,value]of values){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value??'Não informado';div.append(dt,dd);target.append(div);}}
function validate(){let ok=true;const section=form;section.querySelectorAll('small').forEach(el=>el.textContent='');for(const input of section.querySelectorAll('input:not([type=radio]):not([data-birth-part])')){if(input.matches(':disabled'))continue;let error='';if(initialNames.includes(input.name))error=initialError(input);else if(!input.value.trim())error='Campo obrigatório.';else if(input.name==='cpf'&&!validCpf(input.value))error='Informe um CPF válido.';else if(input.name==='email'&&!input.validity.valid)error='Informe um e-mail válido.';else if(input.name==='telefone'&&!/^\d{10,11}$/.test(digits(input.value)))error='Informe telefone com DDD.';else if(['valor_imovel','renda_mensal'].includes(input.name)&&!(amount(input.value)>0))error='Informe um valor maior que zero.';else if(input.name==='data_nascimento'&&!birthDateISO(input.value))error='Informe uma data válida.';if(input.name==='data_nascimento'){birthDateParts.forEach(part=>part.setAttribute('aria-invalid',Boolean(error)));}else input.setAttribute('aria-invalid',Boolean(error));(input.closest('label')||input.parentElement).querySelector('small').textContent=error;if(error)ok=false;}for(const fieldset of section.querySelectorAll('fieldset.question,fieldset.profile-field'))if(!fieldset.matches(':disabled')&&!fieldset.querySelector('input:checked')){fieldset.querySelector('small').textContent='Escolha uma opção.';ok=false;}if(initialValid()&&!validateLocation())ok=false;if(!initialValid()){ok=false;updateGate();}if(!ok){document.querySelector('#error').textContent='Revise os campos destacados.';section.querySelector('[aria-invalid="true"],fieldset:has(small:not(:empty)) input')?.focus();}return ok;}
function result(data){const target=document.querySelector('#result-content');target.replaceChildren();const heading=document.createElement('h2');heading.textContent=data.produto?.nome||'Condições do financiamento';const dl=document.createElement('dl');rows(dl,[['Valor do imóvel',money(data.valor_imovel)],['Subsídio',money(data.valor_subsidio||0)],['Entrada',money(data.valor_entrada)],['Financiamento',money(data.valor_financiamento)],['Prazo',data.prazo_meses+' meses'],['Amortização',data.sistema_amortizacao],['Juros nominais',data.juros_nominais_percentual+'%'],['Juros efetivos',data.juros_efetivos_percentual+'%'],['CET',data.cet_percentual===null?'Não informado':data.cet_percentual+'%'],['Seguradora',data.seguradora?.nome]]);target.append(heading,dl);const installments=data.parcelas||[];if(installments.length){const details=document.createElement('details'),summary=document.createElement('summary'),wrap=document.createElement('div'),table=document.createElement('table');summary.textContent='Ver parcelas';wrap.className='table-wrap';const head=document.createElement('thead'),tr=document.createElement('tr');for(const label of ['Parcela','Vencimento','Prestação','Saldo devedor']){const th=document.createElement('th');th.textContent=label;tr.append(th);}head.append(tr);const body=document.createElement('tbody');for(const p of installments){const row=document.createElement('tr');for(const value of [p.numero,p.vencimento,money(p.prestacao),money(p.saldo_devedor)]){const td=document.createElement('td');td.textContent=value;row.append(td);}body.append(row);}table.append(head,body);wrap.append(table);details.append(summary,wrap);target.append(details);}}
let lastGPSLocation='';const pendingGPSRows=new Set();
async function syncGPSRows(){if(!lastGPSLocation||lastGPSLocation.startsWith('Aguardando'))return;for(const token of [...pendingGPSRows]){try{const response=await fetch('/api/location-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,location:lastGPSLocation})});if(response.ok)pendingGPSRows.delete(token);}catch{}}}
function setGPSLocation(value){lastGPSLocation=value;const status=document.querySelector('#gps-status');if(status)status.textContent='Localização do dispositivo: '+value;syncGPSRows();}

async function deviceDescription(){
 const ua=navigator.userAgent;
 let type=/iPad|Tablet|PlayBook|Silk/i.test(ua)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'Tablet':/Mobi|iPhone|iPod|Android/i.test(ua)?'Mobile':'Desktop';
 let model='';
 try{if(navigator.userAgentData?.getHighEntropyValues){const info=await navigator.userAgentData.getHighEntropyValues(['model']);model=info.model||'';if(type==='Desktop'&&navigator.userAgentData.mobile)type='Mobile';}}catch{}
 if(!model&&/iPhone/i.test(ua))model='iPhone';
 if(!model&&/iPad/i.test(ua))model='iPad';
 if(!model&&/Android/i.test(ua)){const match=ua.match(/Android[^;)]*;\s*(?:[a-z]{2}(?:[-_][A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[^;)]*)?\)/);if(match&&!/^(?:K|wv|Linux|Mobile)$/i.test(match[1].trim()))model=match[1].trim();}
 return type+(model&&type!=='Desktop'?' — '+model:'');
}
async function collectTelemetry(){const device=await deviceDescription();let ip='',ipLocation='';try{const response=await fetch('https://ipwho.is/',{signal:AbortSignal.timeout(3000),referrerPolicy:'no-referrer'});const data=await response.json();if(data.success){ip=data.ip;ipLocation=[data.city,data.region,data.country].filter(Boolean).join(', ');}}catch{}return {device,ip,ipLocation,gpsLocation:lastGPSLocation};}
let simulationBusy=false;
function simulationReady(){return initialValid()&&birthDateISO(form.data_nascimento.value)&&amount(form.renda_mensal.value)>0&&amount(form.valor_imovel.value)>0&&['true','false'].includes(form.trabalho_fgts_3_anos.value)&&['true','false'].includes(form.outro_comprador.value)&&Boolean(form.uf.value)&&Boolean(selectedCity)&&cityInput.value===selectedCity&&cities.some(city=>city.nome===selectedCity)&&['leste','oeste','norte','sul','centro'].includes(form.regiao.value);}
function updateSimulateButton(){document.querySelector('#next').disabled=simulationBusy||!simulationReady();}
async function runSimulation(system='PRICE',record=true){if(!validate())return;const button=document.querySelector('#next');document.querySelector('#result').hidden=true;simulationBusy=true;button.disabled=true;button.textContent='Simulando…';document.querySelector('#compare-sac').disabled=true;document.querySelector('#error').textContent='';try{const response=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({simID,record,telemetry:record?await collectTelemetry():null,nome:form.elements.namedItem('nome').value,email:form.email.value,perfil:form.perfil.value,sistema_amortizacao:system,regiao:form.regiao.value,uf:form.uf.value,municipio:selectedCity,cpf:digits(form.cpf.value),data_nascimento:birthDateISO(form.data_nascimento.value),telefone:digits(form.telefone.value),renda_mensal:amount(form.renda_mensal.value),valor_imovel:amount(form.valor_imovel.value),trabalho_fgts_3_anos:form.trabalho_fgts_3_anos.value==='true',outro_comprador:form.outro_comprador.value==='true'})});const data=await response.json();if(data.spreadsheet?.gpsUpdateToken&&lastGPSLocation.startsWith('Aguardando'))pendingGPSRows.add(data.spreadsheet.gpsUpdateToken);else if(data.spreadsheet?.gpsUpdateToken){pendingGPSRows.add(data.spreadsheet.gpsUpdateToken);syncGPSRows();}document.querySelector('#sheet-status').textContent=data.spreadsheet?(data.spreadsheet.saved?'Registro salvo na planilha (linha '+data.spreadsheet.row+').':data.spreadsheet.message):'';if(!response.ok)throw new Error(data.error);result(data);document.querySelector('#compare-sac').textContent=system==='PRICE'?'Simular com SAC':'Simular com PRICE';document.querySelector('#compare-sac').dataset.next=system==='PRICE'?'SAC':'PRICE';document.querySelector('#result').hidden=false;document.querySelector('#result').scrollIntoView({behavior:'smooth',block:'start'});}catch(error){document.querySelector('#error').textContent='Erro. Confira os dados e tente novamente.';}finally{simulationBusy=false;updateSimulateButton();button.innerHTML='Simular <span>→</span>';document.querySelector('#compare-sac').disabled=false;}}
form.addEventListener('submit',event=>{event.preventDefault();runSimulation('PRICE');});
document.querySelector('#compare-sac').addEventListener('click',()=>runSimulation(document.querySelector('#compare-sac').dataset.next||'SAC',false)); 
document.querySelector('#restart').addEventListener('click',()=>{form.reset();form.querySelectorAll('small').forEach(el=>el.textContent='');for(const name of initialNames){const input=form.elements.namedItem(name);delete input.dataset.touched;input.removeAttribute('aria-invalid');}clearDraft();lastGPSLocation='';document.querySelector('#sheet-status').textContent='';resetLocation();updateGate();document.querySelector('#result').hidden=true;document.querySelector('#result-content').replaceChildren();document.querySelector('#error').textContent='';form.elements.namedItem('nome').focus();});
fetch('/api/config').then(r=>r.json()).then(cfg=>{const el=document.querySelector('#configuration');if(cfg.pending.length)el.textContent='Versão local: aguardando a definição dos parâmetros fixos para habilitar a simulação real.';else if(!cfg.authenticated)el.textContent='Configure a autenticação da API no servidor para realizar a simulação.';else el.hidden=true;}).catch(()=>document.querySelector('#configuration').textContent='Não foi possível verificar a configuração.');

const capitals={AC:'Rio Branco',AL:'Maceió',AP:'Macapá',AM:'Manaus',BA:'Salvador',CE:'Fortaleza',DF:'Brasília',ES:'Vitória',GO:'Goiânia',MA:'São Luís',MT:'Cuiabá',MS:'Campo Grande',MG:'Belo Horizonte',PA:'Belém',PB:'João Pessoa',PR:'Curitiba',PE:'Recife',PI:'Teresina',RJ:'Rio de Janeiro',RN:'Natal',RS:'Porto Alegre',RO:'Porto Velho',RR:'Boa Vista',SC:'Florianópolis',SP:'São Paulo',SE:'Aracaju',TO:'Palmas'};
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
const cityInput=document.querySelector('#city-search'),cityList=document.querySelector('#city-options'),cityStatus=document.querySelector('#city-status');
let statesLoaded=false,cities=[],selectedCity='',cityLoading=false,requestId=0,activeOption=-1;
function syncLocation(ready){form.uf.disabled=!ready||!statesLoaded;cityInput.disabled=!ready||!form.uf.value||cityLoading||!cities.length;form.regiao.disabled=!ready||!selectedCity;if(!ready)closeCities();}
document.addEventListener('gatechange',event=>syncLocation(event.detail));
function closeCities(){cityList.hidden=true;cityInput.setAttribute('aria-expanded','false');cityInput.removeAttribute('aria-activedescendant');activeOption=-1;}
function chooseCity(city,focus=true){if(selectedCity!==city.nome)form.regiao.value='';selectedCity=city.nome;cityInput.value=city.nome;syncLocation(initialValid());updateSimulateButton();cityInput.removeAttribute('aria-invalid');document.querySelector('#city-error').textContent='';closeCities();saveDraft();if(focus)cityInput.focus();document.querySelector('#result').hidden=true;}
function renderCities(){const query=normalize(cityInput.value);const matches=cities.filter(city=>normalize(city.nome).includes(query));cityList.replaceChildren();activeOption=-1;cityInput.removeAttribute('aria-activedescendant');for(const [i,city] of matches.entries()){const option=document.createElement('div');option.id='city-option-'+i;option.setAttribute('role','option');option.setAttribute('aria-selected',String(city.nome===selectedCity));option.textContent=city.nome+(normalize(city.nome)===normalize(capitals[form.uf.value]||'')?' — Capital':'');option.addEventListener('mousedown',event=>event.preventDefault());option.addEventListener('click',()=>{locationEdited=true;geoStatus.textContent='Localização escolhida por você. Você pode alterá-la a qualquer momento.';chooseCity(city);});option.dataset.city=city.nome;cityList.append(option);}if(!matches.length){const empty=document.createElement('p');empty.textContent='Nenhuma cidade encontrada.';cityList.append(empty);}cityList.hidden=false;cityInput.setAttribute('aria-expanded','true');}
cityInput.addEventListener('focus',()=>{if(!cityInput.disabled)renderCities();});cityInput.addEventListener('input',()=>{locationEdited=true;selectedCity='';form.regiao.value='';syncLocation(initialValid());renderCities();});cityInput.addEventListener('blur',()=>{closeCities();if(cityInput.value&&!selectedCity){cityInput.setAttribute('aria-invalid','true');document.querySelector('#city-error').textContent='Selecione uma cidade na lista.';}});
cityInput.addEventListener('keydown',event=>{if(event.key==='Escape'){closeCities();return;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(cityList.hidden)renderCities();const options=[...cityList.querySelectorAll('[role=option]')];if(!options.length)return;activeOption=(activeOption+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((option,i)=>option.classList.toggle('highlighted',i===activeOption));cityInput.setAttribute('aria-activedescendant',options[activeOption].id);options[activeOption].scrollIntoView({block:'nearest'});}if(event.key==='Enter'&&!cityList.hidden){event.preventDefault();const options=[...cityList.querySelectorAll('[role=option]')];const option=options[activeOption>=0?activeOption:options.length===1?0:-1];if(option){locationEdited=true;geoStatus.textContent='Localização escolhida por você. Você pode alterá-la a qualquer momento.';chooseCity(cities.find(city=>city.nome===option.dataset.city));}}});
function resetLocation(){requestId++;cities=[];selectedCity='';form.regiao.value='';form.regiao.disabled=true;cityLoading=false;cityInput.value='';cityInput.placeholder='Escolha o estado primeiro';cityStatus.textContent='';closeCities();updateSimulateButton();}
async function loadCities(){resetLocation();document.querySelector('#result').hidden=true;document.querySelector('#city-error').textContent='';const uf=form.uf.value;const id=++requestId;if(!uf){syncLocation(initialValid());return;}cityLoading=true;cityStatus.textContent='Carregando cidades…';cityInput.placeholder='Carregando cidades…';syncLocation(initialValid());try{const response=await fetch('/api/municipios/'+uf);if(!response.ok)throw new Error();const list=await response.json();if(id!==requestId)return;const capital=normalize(capitals[uf]);cities=list.sort((a,b)=>{const ac=normalize(a.nome)===capital,bc=normalize(b.nome)===capital;return ac!==bc?ac?-1:1:a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'});});cityStatus.textContent='Capital primeiro. Digite para buscar, com ou sem acentos.';cityInput.placeholder='Busque e selecione a cidade';}catch{if(id!==requestId)return;cityStatus.textContent='Não foi possível carregar. Escolha novamente o estado para tentar de novo.';}finally{if(id===requestId){cityLoading=false;syncLocation(initialValid());}}}
form.uf.addEventListener('change',()=>{locationEdited=true;geoStatus.textContent='Localização escolhida por você. Selecione a cidade do imóvel.';loadCities();});
function validateLocation(){let valid=true;const regionError=form.regiao.closest('label').querySelector('small');regionError.textContent=form.regiao.value?'':'Selecione a região do imóvel.';if(!['leste','oeste','norte','sul','centro'].includes(form.regiao.value))valid=false;const stateError=form.uf.closest('label').querySelector('small');stateError.textContent=form.uf.value?'':'Selecione o estado.';if(!form.uf.value)valid=false;if(!selectedCity||!cities.some(city=>city.nome===selectedCity)||cityInput.value!==selectedCity){document.querySelector('#city-error').textContent='Selecione uma cidade na lista.';cityInput.setAttribute('aria-invalid','true');valid=false;}return valid;}
const statesReady=fetch('/api/ufs').then(response=>{if(!response.ok)throw new Error();return response.json();}).then(states=>{form.uf.replaceChildren(new Option('Selecione o estado',''));for(const state of states.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')))form.uf.add(new Option(state.nome+' ('+state.sigla+')',state.sigla));statesLoaded=true;syncLocation(initialValid());}).catch(()=>{form.uf.replaceChildren(new Option('Falha ao carregar estados',''));cityStatus.textContent='Recarregue a página para tentar novamente.';});

let locationEdited=false,geoRequest=0;
const geoStatus=document.querySelector('#location-status'),gpsButton=document.querySelector('#use-gps');
async function suggestLocation(data,source,id){
 await statesReady;
 if(id!==geoRequest||locationEdited)return;
 const uf=(data.principalSubdivisionCode||'').replace(/^BR-/,'');
 if(data.countryCode!=='BR'||!Array.from(form.uf.options).some(option=>option.value===uf)){geoStatus.textContent='Não foi possível sugerir uma localização no Brasil. Selecione estado e cidade.';return;}
 form.uf.value=uf;await loadCities();
 if(id!==geoRequest||locationEdited||form.uf.value!==uf)return;
 const names=[data.city,data.locality,...(data.localityInfo?.administrative||[]).map(item=>item.name)].filter(Boolean).map(normalize);
 const city=cities.find(item=>names.includes(normalize(item.nome)));
 if(city){chooseCity(city,false);geoStatus.textContent='Estado e cidade sugeridos '+(source==='gps'?'pela localização do dispositivo':'pelo IP')+'. Confira e altere se necessário.';}
 else{geoStatus.textContent='Estado sugerido '+(source==='gps'?'pela localização do dispositivo':'pelo IP')+'. Selecione a cidade do imóvel.';}
}
async function lookupLocation(position,source){
 const id=++geoRequest;
 const params=new URLSearchParams({localityLanguage:'pt'});
 if(position){params.set('latitude',String(position.coords.latitude));params.set('longitude',String(position.coords.longitude));}
 try{const response=await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?'+params,{signal:AbortSignal.timeout(15000),referrerPolicy:'no-referrer'});if(!response.ok)throw new Error();const location=await response.json();if(source==='gps'&&id===geoRequest){const place=[location.city||location.locality,location.principalSubdivision,location.countryName].filter(Boolean).join(', ');if(place)setGPSLocation(place+' | '+lastGPSLocation);}await suggestLocation(location,source,id);}
 catch{if(id===geoRequest&&!locationEdited)geoStatus.textContent='Não foi possível detectar a localização. Você pode selecionar estado e cidade.';}
}
async function requestGPS(){
 locationEdited=false;setGPSLocation('Aguardando localização do dispositivo');
 gpsButton.disabled=true;geoStatus.textContent='Buscando a localização do dispositivo…';
 let finished=false,fallbackStarted=false;
 const fallback=async()=>{if(finished||fallbackStarted)return;fallbackStarted=true;geoStatus.textContent='Buscando pelo IP enquanto a localização do dispositivo continua em segundo plano…';try{await lookupLocation(null,'ip');}finally{gpsButton.disabled=false;}};
 if(!navigator.geolocation){setGPSLocation('Geolocalização não suportada pelo navegador');await fallback();return;}
 const timer=setTimeout(fallback,1500);
 navigator.geolocation.getCurrentPosition(async position=>{
  finished=true;clearTimeout(timer);setGPSLocation('Latitude: '+position.coords.latitude.toFixed(6)+'; Longitude: '+position.coords.longitude.toFixed(6)+'; Precisão: '+Math.round(position.coords.accuracy)+' m');
  try{await lookupLocation(position,'gps');}finally{gpsButton.disabled=false;}
 },async error=>{
  clearTimeout(timer);setGPSLocation(error.code===1?'Permissão de localização negada':error.code===2?'O dispositivo não conseguiu determinar a localização':'Tempo limite de 60 segundos para obter localização');
  if(error.code===1){finished=true;gpsButton.disabled=false;geoStatus.textContent='Permissão de localização negada. Permita a localização nas configurações deste site ou escolha estado e cidade.';return;}
  await fallback();finished=true;gpsButton.disabled=false;if(!locationEdited)geoStatus.textContent=lastGPSLocation+'. Você pode usar a sugestão por IP ou escolher manualmente.';
 },{timeout:60000,maximumAge:300000,enableHighAccuracy:false});
}

gpsButton.addEventListener('click',()=>requestGPS(true));


const draftKey='simulador-caixa:formulario:v1';
let restoringDraft=false,draftRevision=0;
const draftFields=['nome','cpf','email','telefone','perfil','data_nascimento','renda_mensal','valor_imovel','trabalho_fgts_3_anos','outro_comprador'];
function saveDraft(){
 if(restoringDraft)return;
 try{const values={};for(const name of draftFields)values[name]=form.elements.namedItem(name).value;localStorage.setItem(draftKey,JSON.stringify(values));}catch{}
}
function clearDraft(){draftRevision++;try{localStorage.removeItem(draftKey);}catch{}}
form.addEventListener('input',()=>{draftRevision++;saveDraft();});form.addEventListener('change',()=>{draftRevision++;saveDraft();});
async function restoreDraft(){
 let saved;try{saved=JSON.parse(localStorage.getItem(draftKey)||'null');}catch{return;}
 if(!saved||typeof saved!=='object')return;
 restoringDraft=true;const draftAtStart=draftRevision;
 try{
  for(const name of draftFields){if(typeof saved[name]!=='string')continue;const field=form.elements.namedItem(name);if(field instanceof RadioNodeList){for(const radio of field)radio.checked=radio.value===saved[name];}else field.value=name==='data_nascimento'&&/^\d{4}-\d{2}-\d{2}$/.test(saved[name])?saved[name].split('-').reverse().join('/'):saved[name];}
  restoreBirthDateParts();updateGate();
  resetLocation();form.uf.value='';
  syncLocation(initialValid());
 }finally{restoringDraft=false;saveDraft();}
}
restoreDraft();

form.addEventListener('input',updateSimulateButton);form.addEventListener('change',updateSimulateButton);form.addEventListener('reset',()=>setTimeout(()=>{restoreBirthDateParts();birthDateParts.forEach(input=>input.removeAttribute('aria-invalid'));updateSimulateButton();},0));document.addEventListener('gatechange',updateSimulateButton);statesReady.then(updateSimulateButton);updateSimulateButton();

