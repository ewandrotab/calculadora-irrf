const express = require('express');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
app.use(express.json());

app.use(cors({
	origin: [
	  'https://ewandrotab.github.io'
	]
	}));

// Constantes de regras
const DEDUCAO_POR_DEPENDENTE = 189.59;
const DESCONTO_SIMPLIFICADO_MINIMO = 607.20;

function round2(value) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Tabela IRRF vigente a partir de 05/2025
// Faixas mensais: limite (inclusive), aliquota (%) e parcela a deduzir (R$)
const TABELA_IRRF_052025 = [
	{ limite: 2428.80, aliquota: 0.0, deducao: 0.0 },
	{ limite: 2826.65, aliquota: 7.5, deducao: 182.16 },
	{ limite: 3751.05, aliquota: 15.0, deducao: 394.16 },
	{ limite: 4664.68, aliquota: 22.5, deducao: 675.49 },
	{ limite: Infinity, aliquota: 27.5, deducao: 908.73 }
];

function isFiniteNumber(value) {
	return typeof value === 'number' && Number.isFinite(value);
}

function escolherFaixa(base) {
	for (const faixa of TABELA_IRRF_052025) {
		if (base <= faixa.limite) return faixa;
	}
	return TABELA_IRRF_052025[TABELA_IRRF_052025.length - 1];
}

app.post('/calcular-irrf', (req, res) => {
	const {
		rendimento_tributavel,
		previdencia_oficial,
		quantidade_dependentes
	} = req.body || {};

	// Suportar chave com espaço acidental: 'pensao_alimenticia '
	const pensao_alimenticia = (req.body && (req.body.pensao_alimenticia ?? req.body['pensao_alimenticia '])) ?? 0;

	// Validações básicas
	if (!isFiniteNumber(rendimento_tributavel) ||
		!isFiniteNumber(previdencia_oficial) ||
		!isFiniteNumber(quantidade_dependentes) ||
		!isFiniteNumber(pensao_alimenticia)) {
		return res.status(400).json({
			erro: 'Campos inválidos: envie números em rendimento_tributavel, previdencia_oficial, quantidade_dependentes e pensao_alimenticia.'
		});
	}
	if (rendimento_tributavel < 0 || previdencia_oficial < 0 || pensao_alimenticia < 0) {
		return res.status(400).json({ erro: 'rendimento_tributavel, previdencia_oficial e pensao_alimenticia não podem ser negativos.' });
	}
	if (!Number.isInteger(quantidade_dependentes) || quantidade_dependentes < 0) {
		return res.status(400).json({ erro: 'quantidade_dependentes deve ser inteiro não negativo.' });
	}

	// Cálculo das deduções
	const deducao_dependentes = round2(quantidade_dependentes * DEDUCAO_POR_DEPENDENTE);
	const soma_deducoes = round2(previdencia_oficial + deducao_dependentes + round2(pensao_alimenticia));
	// Aplica a MAIOR dedução entre a soma real e o mínimo simplificado (sem somar duas vezes)
	const deducao_total_aplicada = round2(Math.max(soma_deducoes, DESCONTO_SIMPLIFICADO_MINIMO));
	const simplificado_minimo_usado = DESCONTO_SIMPLIFICADO_MINIMO > soma_deducoes;

	// Base líquida: rendimento menos a dedução total aplicada (sem dupla subtração)
	const base_liquida_irrf = round2(rendimento_tributavel - deducao_total_aplicada);

	// Seleção da faixa, alíquota e parcela a deduzir
	const faixa = escolherFaixa(base_liquida_irrf);
	const aliquota_irrf = faixa.aliquota;
	const deducao_conforme_tabela = faixa.deducao;

	// Cálculo do imposto
	let valor_irrf = (base_liquida_irrf * (aliquota_irrf / 100)) - deducao_conforme_tabela;
	if (!Number.isFinite(valor_irrf)) valor_irrf = 0;
	if (valor_irrf < 0) valor_irrf = 0; // Não retornar IR negativo
	valor_irrf = round2(valor_irrf); // 2 casas decimais

	// Redução conforme PL 1087/25 baseada no rendimento_tributavel (não na base)
	let reducao_pl_1087_25 = 0;
	if (rendimento_tributavel <= 5000) {
		reducao_pl_1087_25 = 312.89;
	} else if (rendimento_tributavel > 5000 && rendimento_tributavel <= 7350) {
		reducao_pl_1087_25 = 978.62 - (0.133145 * rendimento_tributavel);
	}
	// Limitar ao imposto calculado e não deixar negativo
	reducao_pl_1087_25 = Math.max(0, Math.min(round2(reducao_pl_1087_25), valor_irrf));
	const valor_irrf_apos_pl_1087_25 = round2(valor_irrf - reducao_pl_1087_25);

	const resposta = {
		rendimento_tributavel,
		...(!simplificado_minimo_usado ? {
			previdencia_oficial,
			quantidade_dependentes,
			pensao_alimenticia: round2(pensao_alimenticia),
			valor_deducoes_dependentes: round2(deducao_dependentes)
		} : {}),
		...(simplificado_minimo_usado ? { desconto_simplificado_aplicado: DESCONTO_SIMPLIFICADO_MINIMO } : {}),
		base_liquida_irrf: round2(base_liquida_irrf),
		aliquota_irrf,
		deducao_conforme_tabela: round2(deducao_conforme_tabela),
		valor_irrf,
		...(
			rendimento_tributavel > 7350
				? { mensagem: 'A dedução prevista na PL 1085/25 não se aplica porque o rendimento tributável ultrapassa R$ 7.350,00.' }
				: { reducao_pl_1087_25, valor_irrf_apos_pl_1087_25 }
		)
	};

	return res.json(resposta);
});

// OpenAPI 3.0 specification (Swagger)
const openApiSpec = {
	openapi: '3.0.3',
	info: {
		title: 'API IRRF',
		description: 'Cálculo do IRRF (tabela vigente a partir de 05/2025).',
		version: '1.0.0'
	},
	servers: [
		{ url: 'http://localhost:3000' }
	],
	paths: {
		'/calcular-irrf': {
			post: {
				summary: 'Calcula o IRRF mensal',
				description: 'Recebe rendimentos e deduções e retorna o valor do IRRF conforme a tabela vigente.',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: [
									'rendimento_tributavel',
									'previdencia_oficial',
										'quantidade_dependentes'
								],
								properties: {
									rendimento_tributavel: { type: 'number', example: 5000.0 },
									previdencia_oficial: { type: 'number', example: 750.0 },
										quantidade_dependentes: { type: 'integer', minimum: 0, example: 2 },
										pensao_alimenticia: { type: 'number', example: 0 }
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Cálculo efetuado com sucesso',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										rendimento_tributavel: { type: 'number' },
										previdencia_oficial: { type: 'number', description: 'Retornado somente quando o simplificado não for usado' },
										quantidade_dependentes: { type: 'integer', description: 'Retornado somente quando o simplificado não for usado' },
										pensao_alimenticia: { type: 'number', description: 'Retornado somente quando o simplificado não for usado' },
										base_liquida_irrf: { type: 'number' },
										aliquota_irrf: { type: 'number', description: 'Percentual (ex.: 15 para 15%)' },
										deducao_conforme_tabela: { type: 'number' },
										valor_irrf: { type: 'number', description: 'Arredondado para 2 casas decimais' },
										valor_deducoes_dependentes: { type: 'number', description: 'Retornado somente quando o simplificado não for usado' },
										desconto_simplificado_aplicado: { type: 'number', description: 'Presente apenas quando o mínimo (R$ 607,20) foi aplicado' }
									}
								},
									examples: {
										exemplo: {
											value: {
												rendimento_tributavel: 5000.0,
												previdencia_oficial: 750.0,
											quantidade_dependentes: 2,
											pensao_alimenticia: 0,
												base_liquida_irrf: 3870.82,
												aliquota_irrf: 7.5,
												deducao_conforme_tabela: 182.16,
												valor_irrf: 107.11,
												valor_deducoes_dependentes: 379.18
											}
										}
									}
							}
						}
					},
					'400': {
					description: 'Erro de validação',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: { erro: { type: 'string' } }
							}
						}
					}
					}
				}
			}
		}
	}
};

app.get('/openapi.json', (req, res) => {
	res.json(openApiSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Servidor iniciado na porta ${PORT}`);
});


