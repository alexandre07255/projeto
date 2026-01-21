import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

// --- ESTILOS (Mantidos simples e inline) ---
const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Segoe UI, sans-serif' },
  header: { marginBottom: '30px', borderBottom: '2px solid #ddd', paddingBottom: '10px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  card: { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  kpiTitle: { fontSize: '14px', color: '#666', margin: '0 0 5px 0' },
  kpiValue: { fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#2c3e50' },
  section: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  
  // Estilos da Tabela e Controles
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  select: { padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginRight: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', color: '#666' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
  pagination: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', alignItems: 'center' },
  button: { padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: '#f8f9fa', cursor: 'pointer' },
  
  // Função para colorir os status
  status: (status) => ({
    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
    background: status === 'CONCLUIDO' ? '#d4edda' : status === 'FALHOU' ? '#f8d7da' : status === 'CANCELADO' ? '#e2e3e5' : '#fff3cd',
    color: status === 'CONCLUIDO' ? '#155724' : status === 'FALHOU' ? '#721c24' : status === 'CANCELADO' ? '#383d41' : '#856404'
  })
};

const API_URL = 'http://localhost:3000';
const API_KEY = 'driva_test_key_abc123xyz789';

function App() {
  // --- ESTADOS ---
  const [kpis, setKpis] = useState(null);
  const [enrichments, setEnrichments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Controle de Tabela
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState(''); // Filtro vazio = todos

  // --- FUNÇÃO DE BUSCA DE DADOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${API_KEY}` };
      
      // 1. Busca KPIs (Overview)
      const resKpi = await fetch(`${API_URL}/analytics/overview`, { headers });
      const dataKpi = await resKpi.json();
      
      // 2. Busca Lista com Paginação e Filtros
      // Monta a URL dinâmica baseada nos estados 'page' e 'filterStatus'
      let listUrl = `${API_URL}/analytics/enrichments?page=${page}&limit=10`;
      if (filterStatus) {
        listUrl += `&status=${filterStatus}`;
      }

      const resList = await fetch(listUrl, { headers });
      const dataList = await resList.json();

      setKpis(dataKpi.kpis || {}); // Proteção contra nulos
      setEnrichments(dataList.data || []);
      
      // Atualiza paginação baseada no 'meta' que retornamos na API Python
      if (dataList.meta) {
        setTotalPages(dataList.meta.total_pages);
      }
      
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- EFEITOS ---
  // Recarrega sempre que a página ou o filtro mudar
  useEffect(() => {
    fetchData();
  }, [page, filterStatus]); 

  // Atualização automática dos KPIs a cada 30s
  useEffect(() => {
    const interval = setInterval(() => {
        // Apenas recarrega KPIs em background para não resetar a tabela do usuário
        fetch(`${API_URL}/analytics/overview`, { headers: { 'Authorization': `Bearer ${API_KEY}` } })
            .then(res => res.json())
            .then(data => setKpis(data.kpis));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS ---
  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setPage(1); // Resetar para página 1 quando filtrar
  };

  // --- RENDERIZAÇÃO ---
  if (!kpis && loading) return <div style={{padding: 20}}>Carregando Dashboard...</div>;

  // Dados simplificados para o gráfico
  const chartData = enrichments.reduce((acc, curr) => {
    const found = acc.find(i => i.name === curr.categoria_tamanho_job);
    if (found) found.quantidade += 1;
    else acc.push({ name: curr.categoria_tamanho_job || 'N/A', quantidade: 1 });
    return acc;
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{margin: 0}}>🚀 Driva Analytics Dashboard</h1>
        <p>Monitoramento de Enriquecimento de Dados</p>
      </header>

      {/* KPI SECTION */}
      {kpis && (
        <div style={styles.kpiGrid}>
          <div style={styles.card}>
            <h3 style={styles.kpiTitle}>Total de Jobs</h3>
            <p style={styles.kpiValue}>{kpis.total_enriquecimentos || 0}</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.kpiTitle}>Taxa de Sucesso</h3>
            <p style={{...styles.kpiValue, color: kpis.taxa_sucesso_percentual > 80 ? 'green' : 'orange'}}>
              {kpis.taxa_sucesso_percentual || 0}%
            </p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.kpiTitle}>Tempo Médio</h3>
            <p style={styles.kpiValue}>{kpis.tempo_medio_minutos || 0} min</p>
          </div>
        </div>
      )}

      {/* CHART SECTION */}
      <div style={styles.section}>
        <h3>Distribuição (Página Atual)</h3>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#8884d8" name="Qtd. Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLE SECTION - COM FILTROS E PAGINAÇÃO */}
      <div style={styles.section}>
        <div style={styles.controls}>
            <h3>Histórico de Enriquecimentos</h3>
            
            {/* Filtro de Status */}
            <div>
                <label style={{marginRight: '10px', color: '#666'}}>Filtrar Status:</label>
                <select style={styles.select} value={filterStatus} onChange={handleFilterChange}>
                    <option value="">Todos</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="EM_PROCESSAMENTO">Em Processamento</option>
                    <option value="FALHOU">Falhou</option>
                    <option value="CANCELADO">Cancelado</option>
                </select>
            </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Data</th>
              <th style={styles.th}>Workspace</th>
              <th style={styles.th}>Tamanho</th>
              <th style={styles.th}>Duração</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {enrichments.map((job, index) => (
              <tr key={index}>
                <td style={styles.td}>
                    {new Date(job.data_criacao).toLocaleDateString('pt-BR')} <br/>
                    <small style={{color: '#999'}}>{new Date(job.data_criacao).toLocaleTimeString('pt-BR')}</small>
                </td>
                <td style={styles.td}>{job.nome_workspace}</td>
                <td style={styles.td}>{job.categoria_tamanho_job}</td>
                <td style={styles.td}>{job.duracao_processamento_minutos} min</td>
                <td style={styles.td}>
                  <span style={styles.status(job.status_processamento)}>
                    {job.status_processamento}
                  </span>
                </td>
              </tr>
            ))}
            {enrichments.length === 0 && (
                <tr>
                    <td colSpan="5" style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                        Nenhum registro encontrado para este filtro.
                    </td>
                </tr>
            )}
          </tbody>
        </table>

        {/* Controles de Paginação */}
        <div style={styles.pagination}>
            <button 
                style={{...styles.button, opacity: page === 1 ? 0.5 : 1}} 
                onClick={handlePrevPage} 
                disabled={page === 1}
            >
                Anterior
            </button>
            
            <span style={{color: '#666'}}>
                Página <b>{page}</b> de <b>{totalPages}</b>
            </span>
            
            <button 
                style={{...styles.button, opacity: page === totalPages ? 0.5 : 1}} 
                onClick={handleNextPage} 
                disabled={page === totalPages}
            >
                Próxima
            </button>
        </div>

      </div>
    </div>
  );
}

export default App;