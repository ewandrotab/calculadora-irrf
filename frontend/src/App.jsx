import { useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function App() {
  const [form, setForm] = useState({
    rendimento_tributavel: '',
    previdencia_oficial: '',
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
      const resp = await fetch(`${API_BASE}/calcular-irrf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        throw new Error(data?.erro || `Erro ${resp.status}`)
      }
      const data = await resp.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Erro ao calcular IRRF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Cálculo de IRRF</h1>
        <p className="subtitle">Tabela vigente a partir de 05/2025</p>
      </header>

      <div className="layout">
        <form className="card form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Rendimento tributável (R$)</label>
            <input
              inputMode="decimal"
              placeholder="Ex.: 5000,00"
              value={form.rendimento_tributavel}
              onChange={e => updateField('rendimento_tributavel', e.target.value.replace(',', '.'))}
              required
            />
          </div>

          <div className="field">
            <label>Previdência oficial (R$)</label>
            <input
              inputMode="decimal"
              placeholder="Ex.: 750,00"
              value={form.previdencia_oficial}
              onChange={e => updateField('previdencia_oficial', e.target.value.replace(',', '.'))}
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
              inputMode="decimal"
              placeholder="Ex.: 0,00"
              value={form.pensao_alimenticia}
              onChange={e => updateField('pensao_alimenticia', e.target.value.replace(',', '.'))}
            />
          </div>

          {error && <div className="alert error">{error}</div>}

          <button className="btn" type="submit" disabled={loading || !isValid}>
            {loading ? 'Calculando...' : 'Calcular IRRF'}
          </button>
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
                <div className="result-message">{result.mensagem}</div>
              )}
            </div>
          )}
        </section>
      </div>

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

export default App
