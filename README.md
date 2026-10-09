# Simulador Caixa

Webapp em preparação, com identidade visual baseada nas referências fornecidas.

## Contrato consultado

- Documentação: https://simulador-cx.up.railway.app/docs
- Contrato: `openapi.json`
- Simulação: `POST /api/v1/simulacoes`
- Saúde: `GET /api/v1/saude`
- Estados: `GET /api/ufs`
- Municípios: `GET /api/municipios/{uf}`

O token deverá ficar somente em variável de ambiente do servidor. Não incluir em Git ou no navegador.
Autenticação confirmada: enviar o token no header `x-api-key`, somente em chamadas feitas pelo servidor.

## Campos visíveis solicitados

CPF, e-mail, telefone, data de nascimento, renda total familiar conjunta, valor do imóvel,
três anos ou mais de contribuição ao FGTS e existência de outro comprador ou dependentes.
O contrato não possui campo de e-mail. Não transmitir o e-mail à API sem suporte documentado.

## Definições pendentes

Tipo de financiamento, categoria do imóvel, subsídio anterior, imóvel no município,
relacionamento CAIXA, servidor público, conta salário, autorização de armazenamento,
produto, seguradora, amortização, entrada e prazo. Campos condicionais: benefício concedido,
portabilidade, valor de obra e lote hipotecado.

Os resultados serão apresentados a partir da API, sem substituir por cálculos inventados.
A aplicação será identificada como simulador independente, conforme a API não oficial.


Estado e cidade são campos obrigatórios escolhidos no formulário. A lista usa os municípios da API, com a capital primeiro e busca sem distinção de acentos.

