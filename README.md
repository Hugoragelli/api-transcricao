**API de Transcrição de Áudio (EC2 + OpenAI Whisper)**

Este projeto oferece uma API simples para transcrever arquivos de áudio a partir de um `URL` público. Foi concebido para rodar numa instância EC2 e usa a API da OpenAI (modelo `whisper-1`) para gerar a transcrição.

**Características**:
- **Rota de transcrição**: envia um `url` e recebe o texto transcrito.
- **Download temporário**: o áudio é baixado para uma pasta temporária, transcrito e removido.
- **Limites**: timeout de download e limite de tamanho para evitar abusos.

**Stack técnico**
- **Express.js** — servidor HTTP minimalista e eficiente para Node.js.
- **OpenAI API** — integração com o modelo `whisper-1` para transcrição de áudio.
- **Node.js nativo** — uso de `fs`, `stream`, `crypto` para manipulação segura de arquivos.
- **dotenv** — gerenciamento seguro de variáveis de ambiente.
- **pm2** — gerenciador de processos para produção (mantém a API rodando 24/7).

**Pré-requisitos**
- Node.js 18+ (ou LTS compatível)
- npm
- Conta e chave de API da OpenAI (`OPENAI_API_KEY`)
- (Opcional) `pm2` para gerenciar o processo em produção

**Arquivos principais**
- `src/index.js` — servidor Express com as rotas `/health` e `/transcribe`.
- `ecosystem.config.js` — configuração `pm2` fornecida para deploy.

**Variáveis de ambiente**
- `OPENAI_API_KEY` (obrigatório): chave da OpenAI (deve ser gerada na sua conta openAI).
- `PORT` (opcional): porta onde a API escuta (padrão `3000`).

**Instalação local / Teste**
1. Clone o repositório:

```
git clone <seu-repo> && cd api-transcricao
```

2. Instale dependências:

```
npm install
```

3. Crie um arquivo `.env` com sua chave:

```
OPENAI_API_KEY=sk-xxxxx
# PORT=3000
```

4. Rode em modo de desenvolvimento:

```
npm run dev
```

ou produção:

```
npm start
```

**Uso (API)**

- Health check

```
GET /health
```

- Transcrição

Endpoint: `POST /transcribe`

Body JSON: `{ "url": "https://exemplo.com/audio.mp3" }`

Resposta de sucesso (JSON):

```
{ "text": "Texto transcrito..." }
```

Exemplo `curl`:

```
curl -X POST http://SEU_HOST:3000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.example.com/path/to/audio.mp3"}'
```

Exemplo em Node.js (fetch):

```js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function transcribe(url){
  const r = await fetch('http://SEU_HOST:3000/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  console.log(await r.json());
}

transcribe('https://www.example.com/audio.mp3');
```

**Deploy rápido numa EC2 (ex.: Ubuntu / Amazon Linux)**

1. Acesse sua instância EC2 via SSH.
2. Instale Node.js e Git (exemplo para Ubuntu/Debian):

```bash
sudo apt update; sudo apt install -y git build-essential curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; sudo apt-get install -y nodejs
```

3. Clone o repositório e instale dependências:

```bash
git clone <seu-repo> && cd api-transcricao
npm install --production
```

4. Crie o `.env` com a `OPENAI_API_KEY` (não comite este arquivo).

5. Instale `pm2` e inicialize usando o `ecosystem.config.js` já incluído:

```bash
sudo npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
# Para registrar o startup script no systemd (o comando exato é mostrado pelo pm2):
pm2 startup systemd
```

6. Bloqueie acesso à porta no Security Group e exponha apenas via proxy (recomendado). Considere usar Nginx como proxy reverso e TLS.

**Boas práticas / Segurança**
- Nunca exponha `OPENAI_API_KEY` em repositórios públicos.
- Use Security Groups para limitar quem pode acessar a API.
- Considere colocar autenticação (API key) na rota `/transcribe` em produção.
- Configure limites (size/timeouts) conforme o seu plano para evitar custos inesperados.

**Logs / Debug**
- Em desenvolvimento: `npm run dev` (nodemon).
- Em produção com `pm2`: `pm2 logs ec2-audio-stt` e `pm2 monit`.

**Erros comuns**
- `Timeout no download.` — o host do áudio está demorando; verifique conectividade.
- `Arquivo maior do que o permitido.` — limite de 100 MB por arquivo configurado no código.
- Transcrições silenciosas ou vazias — verifique `Content-Type` do áudio e compatibilidade do formato.
