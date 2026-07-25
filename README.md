# LFG 2026 — dashboard

Liga de pontos corridos (Cartola). Front na **Vercel**. Dados sincronizados por **GitHub Actions** (JSON estático) — sem Render / sem cold start.

## Produção

- Site: JSON em `/data/calendario.json`, `classificacao.json`, `estatisticas.json`, `meta.json`
- Sync automático: `.github/workflows/sync-lfg.yml` a cada 5 min (+ botão “Run workflow”)
- O Express em `server/` **não** é usado em produção

## Dev local

```bash
# gerar / atualizar JSON (precisa de rede p/ API Cartola)
cd server && npm install && cd ..
node scripts/sync_lfg.js

# front
cd client && npm install && npm run dev
```

API Express opcional (legado / debug):

```bash
cd server && npm start
# e no client: VITE_API_URL=http://localhost:3001/api npm run dev
```

## Observação

Repo **público** = Actions grátis ilimitado (recomendado). Repo privado consome minutos do plano free.
