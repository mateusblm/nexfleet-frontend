# NexFleet — Frontend (shell + microfrontends)

Interface web do NexFleet, plataforma acadêmica de gestão de frotas (PJBL, PUCPR). Parte da v1.0.0; o sistema completo está no repositório guarda-chuva [nexfleet](https://github.com/mateusblm/nexfleet).

## Arquitetura

Um **shell** React carrega três **microfrontends** independentes em tempo de execução (`/mfes/<nome>/remoteEntry.js` na nuvem; servidor Vite de cada um no desenvolvimento). Todas as chamadas vão para a API pelo APIM (nuvem) ou pelo Gateway (local); o Painel usa `GET /api/v1/aggregated-data` no cartão "Visão consolidada", mostrando aviso quando `fontes` indica uma fonte indisponível. Na nuvem, tudo é servido pelo Azure Static Web Apps.

```text
Navegador → shell + microfrontends (Static Web Apps)
          → Azure API Management (APIM) → Gateway → BFF
              ├─ MS1 Frota ........ MongoDB Atlas
              ├─ MS2 Operações .... Azure SQL (schema operacoes)
              ├─ Identidade, Indicadores ... Azure SQL (um schema e um login por serviço)
              └─ Azure Function HTTP calcular-eficiencia
Operações → outbox → Service Bus (nuvem) / RabbitMQ (local) → Indicadores + Function (notificação)
```

| Aplicação | Pasta | Responsabilidade |
|---|---|---|
| Shell | `frontend/` | login (JWT), menu, gestão de usuários, host dos microfrontends e a página AsyncAPI `/docs/eventos/` |
| Frota | `microfrontends/frota/` | veículos, motoristas e vínculos |
| Operações | `microfrontends/operacoes/` | abastecimentos e manutenções |
| Painel | `microfrontends/painel/` | gastos, situação da frota, próximas manutenções e "Visão consolidada" |

**Organização.** Os princípios de Clean Architecture + Vertical Slice do back-end aparecem aqui como uma aplicação por domínio (fatia vertical), com componentes de tela separados dos módulos de acesso à API (`*-api.ts`, `dashboard.ts`, `dados-agregados.ts`). A página AsyncAPI é gerada no build (`scripts/copiar-asyncapi.mjs`) com o web component copiado para `vendor/`, sem CDN.

**Testes:** unitários de componentes com Vitest + Testing Library em cada aplicação (ex.: `Login.test.tsx`, `Veiculos.test.tsx`, `OperacoesApp.test.tsx`, `VisaoConsolidada.test.tsx`) e verificação da página de eventos (`docs-eventos.test.mjs`). Não há ArchUnit (ferramenta Java), que é usado nos serviços.

## Tecnologias

- React 19.3.1, TypeScript 7.0.2, Vite 8.3.4 (`@vitejs/plugin-react` 6.1.2)
- Vitest 5.0.5, Testing Library (React 16.3.3, jest-dom 7.0.1), jsdom 30.1.3
- AsyncAPI React/Web Component 3.1.8
- Node.js 24 no CI; GitHub Actions roda `npm ci`, `npm test` e `npm run build` nas quatro aplicações
- Azure Static Web Apps (nuvem)

## Como rodar localmente

Em cada aplicação (`frontend`, `microfrontends/frota`, `microfrontends/operacoes`, `microfrontends/painel`):

```bash
npm ci && npm test && npm run build
```

Para desenvolver, com o back-end rodando, um terminal por aplicação:

```bash
cd frontend && npm run dev                    # shell em http://127.0.0.1:5173
cd microfrontends/frota && npm run dev        # 5174
cd microfrontends/operacoes && npm run dev    # 5175
cd microfrontends/painel && npm run dev       # 5176
```

Variáveis de ambiente: `NEXFLEET_GATEWAY_URL` (Gateway local, padrão porta 8080), `VITE_API_BASE_URL`, `VITE_MFE_FROTA_URL`, `VITE_MFE_OPERACOES_URL`, `VITE_MFE_PAINEL_URL`. Este repositório não gera imagem Docker: na nuvem é publicado como site estático.

**Ambiente completo** (todos os serviços, SQL Server, MongoDB e RabbitMQ locais) sobe pelo repositório guarda-chuva [nexfleet](https://github.com/mateusblm/nexfleet), com os repositórios clonados lado a lado (`scripts/clonar-tudo.sh`):

```bash
scripts/iniciar-local.sh                                     # 1ª vez: gera o .env e a chave RSA local
docker compose -f compose.yaml -f compose.build.yaml up -d --build
scripts/seed-demo.sh                                         # dados de demonstração
```

Sem o override `compose.build.yaml`, o `docker compose up -d` usa as imagens publicadas no Docker Hub.

## URLs na nuvem

O frontend é o único componente acessado diretamente pelo navegador; o login exige uma conta. A API fica atrás do APIM.

Imagens Docker dos serviços: `mateusblm/nexfleet-{gateway,bff,identidade,frota,operacoes,indicadores}:v1.0.0` ([Docker Hub](https://hub.docker.com/u/mateusblm)).

| Recurso | Endereço |
|---|---|
| Frontend | https://white-mushroom-0cadda010.3.azurestaticapps.net |
| API (APIM) | https://apim-nexfleet-homolog-ukzjodf42myfe.azure-api.net |
| Swagger UI (BFF, Frota, Operações, Identidade, Indicadores) | https://apim-nexfleet-homolog-ukzjodf42myfe.azure-api.net/swagger-ui.html |
| Dados agregados (exige token) | https://apim-nexfleet-homolog-ukzjodf42myfe.azure-api.net/aggregated-data |
| AsyncAPI dos eventos | https://white-mushroom-0cadda010.3.azurestaticapps.net/docs/eventos/ |
| Repositório guarda-chuva | https://github.com/mateusblm/nexfleet |

> **Partida a frio:** os Container Apps escalam a zero e o Azure SQL pausa sem uso. A primeira chamada após um período de inatividade pode levar de 1 a 2 minutos (ou responder 503/504); tente de novo em seguida.

## Alunos

- Vinícius dos Reis Góes
- Mateus Burlamaqui
- Lucas Roussenq
- Erik Carvalho
