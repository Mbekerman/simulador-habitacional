import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import { buildRow, firstBlank } from '../sheets.mjs';

test('linha vazia respeita dados até AZ e começa na linha 3', () => {
  const rows=[['ocupada'],Array(51).fill('')];
  rows[1][50]='valor em AZ';
  rows.push([]);
  assert.equal(firstBlank(rows)+2,5);
});

test('registro preserva zeros, CPF como texto e fuso de Brasília', () => {
  const row=buildRow({perfil:'cliente',cpf:'01234567890',data_nascimento:'2000-01-02',renda_mensal:2000,valor_imovel:200000}, {valor_financiamento:100000,valor_subsidio:0},new Date('2026-10-09T15:00:00Z'));
  assert.equal(row.length,22);
  assert.equal(row[2],'01234567890');
  assert.equal(row[14],0);
  assert.equal(row[16],'12:00:00');
});

async function start(extra={}){
  const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const env={...process.env,PORT:String(port),HOST:'127.0.0.1',...extra};
  delete env.GOOGLE_APPLICATION_CREDENTIALS;delete env.GOOGLE_SERVICE_ACCOUNT_JSON;delete env.SIMULADOR_API_TOKEN;delete env.RAILWAY_PROJECT_ID;
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Servidor não iniciou')),10000);child.stdout.on('data',()=>{clearTimeout(timeout);resolve();});child.once('error',reject);child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Servidor encerrou: '+code));});});
  return {child,base:'http://127.0.0.1:'+port,port};
}

test('servidor inicia sem segredos e responde ao healthcheck', async () => {
  const {child,base}=await start();
  try{
    const response=await fetch(base+'/health');assert.equal(response.status,200);assert.equal((await response.json()).status,'ok');
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await (await fetch(base+'/api/config')).json()).authenticated,false);
  }finally{child.kill();}
});

test('PUBLIC_HTTPS exige origem https do próprio host', async () => {
  const {child,base,port}=await start({PUBLIC_HTTPS:'1'});
  try{
    const post=origin=>fetch(base+'/api/simulate',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});
    assert.equal((await post('http://127.0.0.1:'+port)).status,403);
    assert.equal((await post('https://evil.example')).status,403);
    assert.equal((await post('https://127.0.0.1:'+port)).status,400);
  }finally{child.kill();}
});
