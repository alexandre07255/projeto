### Instruções do Dashboard

Frontend desenvolvido em **React** com **Vite**, focado em performance e visualização limpa de dados.

## Tecnologias
* **Recharts:** Para visualização gráfica da distribuição de jobs.
* **Vite:** Para build ultra-rápido.
* **Nginx:** Servidor web leve para produção (dentro do Docker).

## Estrutura
O Dashboard consome dois endpoints principais:
1.  `/analytics/overview`: Para os cartões de KPI.
2.  `/analytics/enrichments`: Para a tabela paginada com filtros server-side.

## Execução

O container é construído em dois estágios (Node Build -> Nginx Serve). Basta rodar `docker-compose up` na raiz.
Acesse em: `http://localhost:8080`