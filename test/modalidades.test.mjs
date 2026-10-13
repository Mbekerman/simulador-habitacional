import test from 'node:test';
import assert from 'node:assert/strict';
import {selectModality,getPreferredModality} from '../modalidades.mjs';
const linked={codigo:'a',versao:'1',nome:'Programa Minha Casa, Minha Vida - Recursos FGTS: Imóvel vinc. a Empreendimento financiado na CAIXA'};
const common={codigo:'b',versao:'2',nome:'MCMV / Recursos FGTS'};
const middle={codigo:'c',versao:'3',nome:'MCMV Classe Média'};
const sbpe={codigo:'d',versao:'4',nome:'SBPE (TR): Imóvel vinculado a Empreendimento Financiado na CAIXA'};
test('prioridade independe da ordem e dos códigos retornados',()=>{
 assert.equal(selectModality([sbpe,middle,common,linked]),linked);
 assert.equal(selectModality([sbpe,middle,common]),common);
 assert.equal(selectModality([sbpe,middle]),middle);
 assert.equal(selectModality([{nome:'Outro'},sbpe]),sbpe);
});
test('Pró-Cotista não substitui MCMV FGTS comum; usa primeira opção se nenhuma corresponder',()=>{
 const other={codigo:'x',versao:'1',nome:'Outro produto'};
 const cotista={codigo:'y',versao:'1',nome:'MCMV/Pró-Cotista - Recursos FGTS'};
 assert.equal(selectModality([other,cotista,middle]),middle);
 assert.equal(selectModality([other,cotista]),other);
 assert.throws(()=>selectModality([]));
});
test('consulta modalidades sem produto fixo e lê código e versão da resposta',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://example.com/api/v1/modalidades');
  assert.equal(options.headers['x-api-key'],'test-token');
  const body=JSON.parse(options.body);assert.equal(body.produto_codigo,undefined);assert.equal(body.produto_versao,undefined);assert.equal(body.prazo_meses,420);
  return Response.json([sbpe,linked]);
 });
 assert.deepEqual(await getPreferredModality({produto_codigo:'old',produto_versao:'old',prazo_meses:420},'https://example.com','test-token'),linked);
});
