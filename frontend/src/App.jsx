import { useMemo, useRef, useState } from 'react'
import './App.css'

const ENV_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim()
const DEFAULT_DEV_BASE = ''
const DEFAULT_PROD_BASE = 'https://calculadora-irrf.onrender.com'
const API_BASE = ENV_BASE !== ''
  ? ENV_BASE
  : (import.meta.env.DEV ? DEFAULT_DEV_BASE : DEFAULT_PROD_BASE)

function App() {
  const rendimentoRef = useRef(null)
  const [form, setForm] = useState({
    rendimento_tributavel: '',
    previdencia_oficial: '0',
    quantidade_dependentes: '0',
    pensao_alimenticia: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const isValid = useMemo(() => {
    const rt = Number(form.rendimento_tributavel)
    const po = Number(form.previdencia_oficial)
    const qd = Number(form.quantidade_dependentes)
    const pa = form.pensao_alimenticia === '' ? 0 : Number(form.pensao_alimenticia)
    return (
      Number.isFinite(rt) && rt >= 0 &&
      Number.isFinite(po) && po >= 0 &&
      Number.isInteger(qd) && qd >= 0 &&
      Number.isFinite(pa) && pa >= 0
    )
  }, [form])

  function updateField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleNumberKeyDown(e) {
    // Impede inserir e/E/+/-, comuns em type=number
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

  function handleClear() {
    setForm({
      rendimento_tributavel: '',
      previdencia_oficial: '0',
      quantidade_dependentes: '0',
      pensao_alimenticia: ''
    })
    setResult(null)
    setError('')
    setLoading(false)
    setTimeout(() => rendimentoRef.current?.focus(), 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!isValid) {
      setError('Verifique os campos: valores inválidos.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        rendimento_tributavel: Number(form.rendimento_tributavel),
        previdencia_oficial: Number(form.previdencia_oficial),
        quantidade_dependentes: Number(form.quantidade_dependentes),
        pensao_alimenticia: form.pensao_alimenticia === '' ? 0 : Number(form.pensao_alimenticia)
      }
      const url = `${API_BASE}/calcular-irrf`
      let resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      // Fallback automático para 127.0.0.1 quando localhost falhar (ambiente Windows/rede)
      if (!resp.ok && import.meta.env.DEV && API_BASE.includes('localhost')) {
        const fallbackUrl = `${DEFAULT_DEV_BASE.replace('localhost', '127.0.0.1')}/calcular-irrf`
        try {
          resp = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        } catch (e) {
          // mantém erro original
        }
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        throw new Error(data?.erro || `Erro ${resp.status}`)
      }
      const data = await resp.json()
      setResult(data)
    } catch (err) {
      const message = (err && err.message === 'Failed to fetch')
        ? 'Falha ao conectar à API. Verifique se a API está em execução e acessível.'
        : (err.message || 'Erro ao calcular IRRF')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Simulador de IRRF</h1>
        <p className="subtitle">Tabela vigente a partir de 05/2025</p>
        <div className="card info-card">
          <div className="info-title">PL 1087/2025</div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Valor</span>
              <span className="info-value">978,62</span>
            </div>
            <div className="info-item">
              <span className="info-label">Fator</span>
              <span className="info-value">0,133145</span>
            </div>
          </div>
        </div>
      </header>

      <div className="layout">
        <form className="card form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Rendimento tributável (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ex.: 5000,00"
              autoFocus
              ref={rendimentoRef}
              value={form.rendimento_tributavel}
              onChange={e => updateField('rendimento_tributavel', e.target.value.replace(',', '.'))}
              onKeyDown={handleNumberKeyDown}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="field">
            <label>Previdência oficial (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ex.: 750,00"
              value={form.previdencia_oficial}
              onChange={e => updateField('previdencia_oficial', e.target.value.replace(',', '.'))}
              onKeyDown={handleNumberKeyDown}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="field">
            <label>Quantidade de dependentes</label>
            <input
              inputMode="numeric"
              placeholder="Ex.: 2"
              value={form.quantidade_dependentes}
              onChange={e => updateField('quantidade_dependentes', e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
          </div>

          <div className="field">
            <label>Pensão alimentícia (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ex.: 0,00"
              value={form.pensao_alimenticia}
              onChange={e => updateField('pensao_alimenticia', e.target.value.replace(',', '.'))}
              onKeyDown={handleNumberKeyDown}
              step="0.01"
              min="0"
            />
          </div>

          {error && <div className="alert error">{error}</div>}

          <div className="actions">
            <button className="btn secondary" type="button" onClick={handleClear}>
              Limpar
            </button>
            <button className="btn primary" type="submit" disabled={loading || !isValid}>
              {loading ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
        </form>

        <section className="card result">
          {!result && <p className="placeholder">Preencha os dados e calcule para ver os resultados.</p>}
          {result && (
            <div className="result-grid">
              <ResultItem label="Rendimento tributável" value={result.rendimento_tributavel} />
              {typeof result.previdencia_oficial === 'number' && (
                <ResultItem label="Previdência oficial" value={result.previdencia_oficial} />
              )}
              {typeof result.quantidade_dependentes === 'number' && (
                <ResultItem label="Qtd. dependentes" value={result.quantidade_dependentes} format="int" />
              )}
              {typeof result.pensao_alimenticia === 'number' && (
                <ResultItem label="Pensão alimentícia" value={result.pensao_alimenticia} />
              )}
              {typeof result.valor_deducoes_dependentes === 'number' && (
                <ResultItem label="Deduções por dependentes" value={result.valor_deducoes_dependentes} />
              )}
              {typeof result.desconto_simplificado_aplicado === 'number' && (
                <ResultItem label="Desconto simplificado aplicado" value={result.desconto_simplificado_aplicado} />
              )}
              <ResultItem label="Base líquida IRRF" value={result.base_liquida_irrf} emphasis />
              <ResultItem label="Alíquota IRRF" value={result.aliquota_irrf} format="percent" />
              <ResultItem label="Dedução conforme tabela" value={result.deducao_conforme_tabela} />
              <ResultItem label="Valor do IRRF" value={result.valor_irrf} emphasis />
              {typeof result.reducao_pl_1087_25 === 'number' && (
                <ResultItem label="Redução PL 1087/25" value={result.reducao_pl_1087_25} />
              )}
              {typeof result.valor_irrf_apos_pl_1087_25 === 'number' && (
                <ResultItem label="IRRF após PL 1087/25" value={result.valor_irrf_apos_pl_1087_25} emphasis />
              )}
              {result.mensagem && (
                <div className={`result-message ${result.mensagem.startsWith('A dedução prevista na PL 1085/25') ? 'pl-msg' : ''}`}>
                  {result.mensagem}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="card table-card">
        <div className="info-title">Tabela de IRRF (a partir de 05/2025)</div>
        <IRRFTabela />
      </section>

      <footer className="footer">API: {API_BASE}/calcular-irrf</footer>
    </div>
  )
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
}

function ResultItem({ label, value, format, emphasis }) {
  let display = value
  if (format === 'percent') display = `${Number(value)}%`
  else if (format === 'int') display = Number(value)
  else display = formatCurrency(value)
  return (
    <div className={`result-item ${emphasis ? 'emphasis' : ''}`}>
      <span className="result-label">{label}</span>
      <span className="result-value">{display}</span>
    </div>
  )
}

function formatPercent(value) {
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function IRRFTabela() {
  const rows = [
    { faixa: 'Faixa 1', base: 'Até R$ 2.428,80', aliquota: 0.0, deducao: 0.0 },
    { faixa: 'Faixa 2', base: 'De R$ 2.428,81 até R$ 2.826,65', aliquota: 7.5, deducao: 182.16 },
    { faixa: 'Faixa 3', base: 'De R$ 2.826,66 até R$ 3.751,05', aliquota: 15.0, deducao: 394.16 },
    { faixa: 'Faixa 4', base: 'De R$ 3.751,06 até R$ 4.664,68', aliquota: 22.5, deducao: 675.49 },
    { faixa: 'Faixa 5', base: 'Acima de R$ 4.664,68', aliquota: 27.5, deducao: 908.73 },
  ]
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Faixa</th>
            <th>Base (R$)</th>
            <th>Alíquota</th>
            <th>Dedução (R$)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.faixa}>
              <td>{r.faixa}</td>
              <td>{r.base}</td>
              <td>{formatPercent(r.aliquota)}</td>
              <td>{formatCurrency(r.deducao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
