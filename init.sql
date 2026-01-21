-- Criação do Schema (opcional, mas organizado)
CREATE SCHEMA IF NOT EXISTS dw;

-- ============================================================================
-- 1. CAMADA BRONZE (Dados Brutos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dw.bronze_enrichments (
    -- Usamos o ID original como chave primária para garantir idempotência (evitar duplicatas)
    id TEXT PRIMARY KEY, 
    
    -- O dado completo é armazenado em JSONB para flexibilidade total
    data JSONB NOT NULL,
    
    -- Metadados de controle do Data Warehouse
    dw_ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dw_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Registro da página atual
    page INTEGER
);

-- Índice GIN no campo JSONB para acelerar consultas futuras se necessário
CREATE INDEX IF NOT EXISTS idx_bronze_data ON dw.bronze_enrichments USING GIN (data);


-- ============================================================================
-- 2. CAMADA GOLD (Dados Processados e Analíticos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dw.gold_enrichments (
    -- Identificadores (Traduzidos conforme)
    id_enriquecimento TEXT PRIMARY KEY,
    id_workspace TEXT NOT NULL,
    nome_workspace TEXT,
    
    -- Métricas e Dados Originais
    total_contatos INTEGER,
    tipo_contato TEXT, -- Será traduzido para PESSOA/EMPRESA
    status_processamento TEXT, -- Será traduzido para CONCLUIDO/FALHOU etc.
    
    -- Datas Originais (do sistema fonte)
    data_criacao TIMESTAMP WITH TIME ZONE,
    data_atualizacao TIMESTAMP WITH TIME ZONE,
    
    -- CAMPOS CALCULADOS
    duracao_processamento_minutos FLOAT, -- Diferença entre update e create
    tempo_por_contato_minutos FLOAT,     -- duracao / total_contatos
    processamento_sucesso BOOLEAN,       -- true se CONCLUIDO
    categoria_tamanho_job TEXT,          -- PEQUENO, MEDIO, GRANDE...
    necessita_reprocessamento BOOLEAN,   -- true se FAILED ou CANCELED
    
    -- Metadados do DW
    data_atualizacao_dw TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance do Dashboard (Analytics)
CREATE INDEX IF NOT EXISTS idx_gold_workspace ON dw.gold_enrichments (id_workspace);
CREATE INDEX IF NOT EXISTS idx_gold_status ON dw.gold_enrichments (status_processamento);
CREATE INDEX IF NOT EXISTS idx_gold_data_criacao ON dw.gold_enrichments (data_criacao);


-- ============================================================================
-- 3. TABELAS DE CONTROLE (Para o n8n)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_control (
    workflow_name TEXT PRIMARY KEY,
    last_run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_records_ingested INTEGER DEFAULT 0
);


INSERT INTO public.pipeline_control (workflow_name, total_records_ingested)
VALUES ('wk3_orquestrador', 0)
ON CONFLICT (workflow_name) DO NOTHING;