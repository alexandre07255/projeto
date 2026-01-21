# Desafio Técnico Driva - Pipeline de Dados & Dashboard

Este repositório contém a solução do Alexandre Aires Amorim para o teste técnico da Driva.

## Visão Geral da Solução

A arquitetura foi construída utilizando **Docker** para orquestração de containers, garantindo um ambiente reproduzível.

* **Fonte de Dados (API):** Desenvolvida em **Python (FastAPI)**, simula um sistema de enriquecimento de dados com paginação, autenticação e *chaos engineering* (erros aleatórios 429).
* **Orquestração (n8n):** Responsável pela ingestão periódica (5 min) e tratamento de falhas (retry/backoff).
* **Armazenamento (PostgreSQL):** Modelado em arquitetura de camadas:
    * **Bronze:** Dados brutos (JSONB) para garantia de ingestão.
    * **Gold:** Dados tratados, traduzidos e com métricas calculadas para análise.
* **Visualização (Dashboard):** Desenvolvido em **React + Vite** (servido via Nginx), consumindo a API de Analytics para exibir KPIs e gráficos em tempo real.

## Como Subir o Ambiente

Pré-requisitos: Docker e Docker Compose instalados.

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/seu-usuario/driva-tech-challenge.git](https://github.com/seu-usuario/driva-tech-challenge.git)
    cd driva-tech-challenge
    ```

2.  Suba os containers (o banco de dados será inicializado automaticamente via `init.sql`):
    ```bash
    docker-compose up --build
    ```

3.  Aguarde até que todos os serviços estejam rodando:
    * **API:** http://localhost:3000
    * **Dashboard:** http://localhost:8080
    * **n8n:** http://localhost:5678
    * **Postgres:** localhost:5432

---

## Configuração dos Workflows (n8n)

Para que o pipeline funcione, é necessário importar os fluxos de trabalho no n8n:

1.  Acesse http://localhost:5678.
2.  Configure a credencial do PostgreSQL:
    * **Host:** `postgres`
    * **Database:** `driva_dw`
    * **User:** `admin`
    * **Password:** `12346587`
3.  Vá em **Workflows** > **Import from File** e selecione os arquivos da pasta `/workflows` deste repositório:
    * `1_ingestao.json`
    * `2_processamento.json`
    * `3_orquestrador.json`
4.  Ative o workflow **Orquestrador** (Toggle "Active") para rodar a cada 5 minutos, ou clique em "Execute Workflow" manualmente para carga inicial.

---

## Dashboard e API

### Acesso ao Dashboard
Após subir o Docker, acesse **http://localhost:8080**.
* O dashboard exibe KPIs de sucesso, tempo médio e total de jobs.
* Possui filtro por Status e Paginação real integrada ao Backend.

### Documentação da API (Exemplos de Chamadas)

A API requer autenticação via Bearer Token.
**Token:** `driva_test_key_abc123xyz789`

#### 1. Listar Enriquecimentos (Camada Gold)
Retorna dados processados com paginação e filtros.

```bash
curl -X GET "http://localhost:3000/analytics/enrichments?page=1&limit=10&status=CONCLUIDO" \
     -H "Authorization: Bearer driva_test_key_abc123xyz789"
```

#### 2. Obter KPIs Gerais
Retorna métricas para os cards do topo do dashboard.

```bash
curl -X GET "http://localhost:3000/analytics/overview" \
     -H "Authorization: Bearer driva_test_key_abc123xyz789"
```

#### 3. Simulação da Fonte (Ingestão)
Endpoint consumido pelo n8n para popular a camada Bronze.

```bash
curl -X GET "http://localhost:3000/people/v1/enrichments?page=1&limit=50" \
     -H "Authorization: Bearer driva_test_key_abc123xyz789"
```

