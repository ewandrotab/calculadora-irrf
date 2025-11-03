# Projeto IRRF – API + Frontend React

Este repositório contém:
- Backend: API REST em Node/Express para cálculo de IRRF (tabela vigente a partir de 05/2025)
- Frontend: SPA em React (Vite) para enviar os dados e visualizar os resultados

## Requisitos
- Node.js 18+ (recomendado) e npm
- Windows, macOS ou Linux

## Estrutura
```
C:\A\API\
  app.js                 # servidor Express (API)
  package.json           # scripts e dependências do backend
  frontend\              # app React (Vite)
    package.json         # scripts e dependências do frontend
    src\                 # código do app React
```

## 1) Rodando o Backend (API)

No diretório raiz do projeto (`C:\A\API`):

```bash
# instalar dependências (se necessário)
npm install

# desenvolvimento (com reinício automático)
npm run dev

# ou produção
npm run start
```

A API iniciará (por padrão) em `http://localhost:3000`.

- Documentação Swagger: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`
- Endpoint principal:
  - `POST /calcular-irrf`
  - Body (JSON):
    ```json
    {
      "rendimento_tributavel": 5000,
      "previdencia_oficial": 750,
      "quantidade_dependentes": 2,
      "pensao_alimenticia": 0
    }
    ```

## 2) Rodando o Frontend (React)

No diretório do frontend (`C:\A\API\frontend`):

```bash
# instalar dependências
npm install

# executar em modo desenvolvimento
npm run dev
```

O Vite mostrará a URL (por padrão `http://localhost:5173`).

### Observação para Windows PowerShell
Se aparecer erro de política de execução ao rodar `npm` no PowerShell, execute via CMD:
```bash
cmd /c npm run dev
```
Ou ajuste a política do PowerShell conforme a sua política de segurança local.

## 3) Configuração do Frontend (URL da API)

O frontend usa a variável `VITE_API_BASE_URL`. Por padrão, se não definida, ele aponta para `http://localhost:3000`.

Para configurar explicitamente, crie o arquivo `C:\A\API\frontend\.env` com:
```env
VITE_API_BASE_URL=http://localhost:3000
```

## 4) Uso da Aplicação
1. Abra o frontend no navegador (`http://localhost:5173`).
2. Preencha os campos:
   - Rendimento tributável (R$)
   - Previdência oficial (R$)
   - Quantidade de dependentes (inteiro ≥ 0)
   - Pensão alimentícia (R$) – opcional
3. Clique em “Calcular IRRF”.
4. Os resultados serão exibidos em cartões, incluindo:
   - Base líquida, alíquota, dedução conforme tabela, valor do IRRF,
   - Itens condicionais: desconto simplificado aplicado, deduções por dependentes, redução PL 1087/25, mensagem.

## 5) CORS
O backend já está configurado com CORS liberado (`origin: "*"`), permitindo que o frontend consuma a API localmente.

## 6) Scripts úteis
- Backend (em `C:\A\API`):
  - `npm run dev` – inicia a API com nodemon
  - `npm run start` – inicia a API com Node
- Frontend (em `C:\A\API\frontend`):
  - `npm run dev` – inicia o servidor de desenvolvimento Vite
  - `npm run build` – build de produção
  - `npm run preview` – serve o build localmente

## 7) Solução de Problemas
- Porta ocupada: altere a `PORT` no ambiente antes de iniciar o backend, por exemplo:
  ```bash
  set PORT=4000 && npm run start
  ```
  e ajuste `VITE_API_BASE_URL` no frontend para `http://localhost:4000`.
- Erro de política de execução no Windows: rode os comandos via `cmd /c ...` ou reveja a política do PowerShell.
- Erros de rede no frontend: verifique se a API está rodando e se `VITE_API_BASE_URL` aponta para o endereço correto.

## Licença
MIT
