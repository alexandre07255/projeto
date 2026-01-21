import random
import time
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from faker import Faker
from sqlalchemy import create_engine, text
import os
from fastapi.middleware.cors import CORSMiddleware


# Configuração
API_KEY = "driva_test_key_abc123xyz789"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:12346587@localhost:5432/driva_dw")

app = FastAPI(title="Driva Tech Test API")

# Configuração do CORS para permitir que o Frontend (porta 8080) fale com a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, etc.
    allow_headers=["*"],  # Permite cabeçalhos como Authorization
)

fake = Faker('pt_BR') # Dados em português

# Conexão com Banco de Dados (usando SQLAlchemy)
engine = create_engine(DATABASE_URL)

# --- MODELOS DE DADOS (Pydantic) ---

class EnrichmentItem(BaseModel):
    id: str
    id_workspace: str
    workspace_name: str
    total_contacts: int
    contact_type: str
    status: str
    created_at: datetime
    updated_at: datetime

class PaginationMeta(BaseModel):
    current_page: int
    items_per_page: int
    total_items: int
    total_pages: int

class EnrichmentResponse(BaseModel):
    meta: PaginationMeta
    data: List[EnrichmentItem]

# Validação de Autenticação
async def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header format")
    token = authorization.split(" ")[1]
    if token != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

# --- ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "ok", "service": "api-driva"}

# Endpoint de FONTE (Simulação)
@app.get("/people/v1/enrichments", response_model=EnrichmentResponse)
def get_enrichments(
    page: int = Query(1, ge=1), 
    limit: int = Query(50, le=100),
    token: str = Depends(verify_token) # Exige autenticação
):
    # Simulação de Rate Limiting (Erro 429)
    # 10% de chance de falhar
    if random.random() < 0.1:
        raise HTTPException(status_code=429, detail="Too Many Requests. Slow down!")

    # Geração de dados dummy em tempo real (Runtime)
    Faker.seed(page) 
    random.seed(page)

    total_items = 5000
    total_pages = (total_items // limit) + (1 if total_items % limit > 0 else 0)

    items = []
    # Gera apenas a quantidade solicitada (limit)
    for _ in range(limit):
        created = fake.date_time_between(start_date='-30d', end_date='now')
        updated = fake.date_time_between(start_date=created, end_date='now')
        
        item = EnrichmentItem(
            id=fake.uuid4(),
            id_workspace=fake.uuid4(),
            workspace_name=fake.company(),
            total_contacts=random.randint(50, 2000),
            contact_type=random.choice(["COMPANY", "PERSON"]),
            status=random.choice(["COMPLETED", "PROCESSING", "FAILED", "CANCELED"]),
            created_at=created,
            updated_at=updated
        )
        items.append(item)

    return {
        "meta": {
            "current_page": page,
            "items_per_page": limit,
            "total_items": total_items,
            "total_pages": total_pages
        },
        "data": items
    }

# Endpoints de ANALYTICS (Leitura da Gold)
@app.get("/analytics/overview")
def get_analytics_overview(token: str = Depends(verify_token)):
    # Consulta SQL direta na tabela Gold
    query = text("""
        SELECT 
            COUNT(*) as total_jobs,
            AVG(CASE WHEN processamento_sucesso THEN 1 ELSE 0 END) * 100 as taxa_sucesso,
            AVG(duracao_processamento_minutos) as tempo_medio_minutos
        FROM dw.gold_enrichments
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query).mappings().one()
            return {
                "kpis": {
                    "total_enriquecimentos": result['total_jobs'],
                    "taxa_sucesso_percentual": round(result['taxa_sucesso'] or 0, 2),
                    "tempo_medio_minutos": round(result['tempo_medio_minutos'] or 0, 2)
                }
            }
    except Exception as e:
        # Se a tabela ainda não existir ou estiver vazia
        return {"kpis": "Ainda não há dados processados na camada Gold.", "error": str(e)}

@app.get("/analytics/enrichments")
def list_gold_enrichments(
    page: int = Query(1, ge=1, description="Número da página"),
    limit: int = Query(10, le=100, description="Itens por página"),
    id_workspace: Optional[str] = Query(None, description="Filtrar por ID do workspace"),
    status: Optional[str] = Query(None, description="Filtrar por status (CONCLUIDO, FALHOU, etc)"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    token: str = Depends(verify_token)
):
    # Cálculo do Offset para paginação
    offset = (page - 1) * limit

    # Construção dinâmica da query (apenas adiciona WHERE se o filtro for enviado)
    conditions = []
    params = {"limit": limit, "offset": offset}

    if id_workspace:
        conditions.append("id_workspace = :id_workspace")
        params["id_workspace"] = id_workspace
    
    if status:
        conditions.append("status_processamento = :status")
        params["status"] = status
    
    if start_date:
        conditions.append("data_criacao >= :start_date")
        params["start_date"] = start_date

    if end_date:
        conditions.append("data_criacao <= :end_date")
        params["end_date"] = end_date

    # Junta as condições com AND, se existirem
    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    # Query Final
    sql = f"""
        SELECT 
            id_enriquecimento, 
            nome_workspace, 
            status_processamento, 
            categoria_tamanho_job,
            data_criacao,
            duracao_processamento_minutos
        FROM dw.gold_enrichments 
        {where_clause}
        ORDER BY data_criacao DESC 
        LIMIT :limit OFFSET :offset
    """
    
    # Query para contar o total (necessário para o frontend saber quantas páginas existem)
    sql_count = f"""
        SELECT COUNT(*) as total
        FROM dw.gold_enrichments
        {where_clause}
    """

    try:
        with engine.connect() as conn:
            # Busca os dados
            result = conn.execute(text(sql), params).mappings().all()
            
            # Busca o total para metadados de paginação
            total_items = conn.execute(text(sql_count), params).scalar()
            total_pages = (total_items // limit) + (1 if total_items % limit > 0 else 0)

            return {
                "meta": {
                    "current_page": page,
                    "items_per_page": limit,
                    "total_items": total_items,
                    "total_pages": total_pages
                },
                "data": result
            }
    except Exception as e:
        print(f"Erro no banco: {e}")
        return {"data": [], "meta": {"total_items": 0}, "error": str(e)}