# Mapa de Credenciais — muv.log (Portal Entregador)

> **Este documento é só o MAPA — aqui NUNCA entram senhas, chaves ou tokens.**
> Os valores ficam no **Bitwarden** (cofre `muv.log`) e no **Secret Manager** do GCP.
> Regra de ouro: credencial viva não entra em `.env` commitado, nem em documento, nem em chat.

## Onde está cada coisa

| Serviço | Para que serve | Onde está a credencial | Quem tem acesso |
|---|---|---|---|
| **GitHub** (`meslopes/portal_entregador`) | código-fonte, histórico, CI | Bitwarden → *GitHub* | Mauro, Éverton |
| **Vercel** (time `muvy`) | hospedagem do frontend + deploy | Bitwarden → *Vercel* (conta `enilton26011967-9022`) | Mauro |
| **Google Cloud / GCP** (projeto `project-0799c4fd-…`) | backend Cloud Run, Secret Manager, chaves Google Maps | Bitwarden → *Google Cloud* (conta `maedaray@gmail.com`) | Mauro |
| **Supabase** (projeto `dxcjudzyotitfqcpabmi`) | banco PostgreSQL, Storage (fotos), Realtime (GPS) | Bitwarden → *Supabase* + service key no Secret Manager do GCP | Mauro |
| **Firebase** (projeto `muv-log`) | notificações push (FCM) | Bitwarden → *Firebase* · service account no Secret Manager | Mauro |
| **Asaas** | cobrança/pagamentos (faturas, saques) | Bitwarden → *Asaas* | Mauro |
| **Cloudflare** (conta Meslopes) | DNS do `muv.log.br` + Email Routing (e-mail próprio ativo desde 2026-11-19) | Bitwarden → *Cloudflare* | Mauro |
| **Registro.br** (usuário `MESLO36`) | titularidade do domínio `muv.log.br` | Bitwarden → *Registro.br* | Mauro |
| **Google Maps Platform** | geocoding/rotas (chave de servidor) | Secret Manager do GCP (`google-maps-api-key`) | — (só o backend) |

## Segredos do APLICATIVO (runtime)

Estes vivem no **Secret Manager do GCP** (Cloud Run) e no `.env` local (não commitado):

| Segredo | Uso |
|---|---|
| `DATABASE_URL` | conexão com o Postgres (Supabase) |
| `SECRET_KEY` / `JWT_SECRET_KEY` | sessões e tokens |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | envio de push |
| `SUPABASE_SERVICE_KEY` | upload de fotos/logos |
| `GOOGLE_MAPS_API_KEY` | geocoding no servidor |
| `OWN_DRIVER_SECRET` | tokens do app do entregador próprio |

## Acessos que existem SÓ aqui (sem conta online)

| Item | Onde |
|---|---|
| `.env` do backend (dev local) | `portal-backend/.env` — **nunca commitar** |
| CLI `gcloud` logada no notebook | comando `gcloud auth list` mostra a conta |
| CLI `vercel` logada no notebook | comando `vercel whoami` mostra a conta |

## Regras (obrigatórias)

1. Senha nova = **no Bitwarden**, nunca em texto solto (bloco de notas, planilha, chat).
2. Vazou em algum lugar (git, print, chat) = **rotacionar** e atualizar o Bitwarden.
3. Éverton precisa de acesso? → compartilhar pelo Bitwarden (nunca por mensagem).
4. Serviço novo entrando no projeto? → **adicionar uma linha nesta tabela** e a credencial no Bitwarden.

## Pendência imediata

- [ ] Criar o cofre **Bitwarden** e popular com as contas da tabela acima (Mauro)

_Ultima atualização: 2026-11-19._
