### Instruções da API

API desenvolvida em Python com FastAPI. Responsável por simular a fonte de dados externa e fornecer endpoints analíticos para o Dashboard.

## Funcionalidades
* **Geração de Dados Fake:** Utiliza `faker` com seed baseado na página para garantir determinismo nos testes.
* **Chaos Engineering:** Simula erros 429 (Rate Limit) aleatórios para testar a resiliência do pipeline.
* **Analytics:** Conecta-se diretamente à camada Gold do PostgreSQL.

## Execução

A API sobe automaticamente com o `docker-compose` na raiz do projeto.
Porta: `3000`