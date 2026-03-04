import { useState, useCallback } from 'react'
import {
  Header, MetricCard, VisualizerPanel, FlowChart,
  BarChart, RadarChart, CompareTable, Footer,
} from './components'
import { simProgrammedIO, simInterruptIO, simDMA } from './simulation'
import './index.css'

const TECH_KEYS = ['pio', 'int', 'dma']
const mkInit = val => Object.fromEntries(TECH_KEYS.map(k => [k, val instanceof Function ? val() : val]))
const sleep = ms => new Promise(r => setTimeout(r, ms))

const fmtThr = n => n > 1e6 ? (n / 1e6).toFixed(1) + 'M B/s' : n > 1000 ? Math.round(n / 1000) + 'K B/s' : Math.round(n) + ' B/s'

const CARD_CONFIG = {
  pio: { title: 'Programmed I/O', desc: 'Busy-waiting data transfer', icon: 'hourglass_empty' },
  int: { title: 'Interrupt-driven I/O', desc: 'On-demand, interrupt-triggered', icon: 'notifications_active' },
  dma: { title: 'DMA Transfer', desc: 'Direct Memory Access controller', icon: 'bolt' },
}

export default function App() {
  const [delay, setDelay] = useState(2)
  const [dataSize, setDataSize] = useState(500)
  const [running, setRunning] = useState(mkInit(false))   // per-tech running flag
  const [results, setResults] = useState(mkInit(null))
  const [logs, setLogs] = useState(mkInit(() => []))
  const [vizState, setVizState] = useState(mkInit(null))
  const [litNodes, setLitNodes] = useState(mkInit(() => [false, false, false, false, false]))
  const [activeNode, setActiveNode] = useState(mkInit(null))

  const isAnyRunning = TECH_KEYS.some(k => running[k])

  const addLog = (type, msg) => setLogs(prev => ({ ...prev, [type]: [...prev[type], msg] }))
  const setViz = (type, st) => setVizState(prev => ({ ...prev, [type]: { ...prev[type], ...st } }))
  const setRun = (type, val) => setRunning(prev => ({ ...prev, [type]: val }))
  const setRes = (type, r) => setResults(prev => ({ ...prev, [type]: r }))

  const resetTech = (type) => {
    setLogs(prev => ({ ...prev, [type]: [] }))
    setVizState(prev => ({ ...prev, [type]: null }))
    setLitNodes(prev => ({ ...prev, [type]: [false, false, false, false, false] }))
    setActiveNode(prev => ({ ...prev, [type]: null }))
  }

  // Animate flowchart: show active pulse node, then mark as lit
  const animateFlow = async (type, totalDelay) => {
    const n = 5
    const stepMs = (totalDelay * 1000) / n
    for (let i = 0; i < n; i++) {
      setActiveNode(prev => ({ ...prev, [type]: i }))
      await sleep(stepMs * 0.7)
      setLitNodes(prev => { const a = [...prev[type]]; a[i] = true; return { ...prev, [type]: a } })
      setActiveNode(prev => ({ ...prev, [type]: null }))
      await sleep(stepMs * 0.3)
    }
  }

  // Run a single technique
  const runTech = useCallback(async (type) => {
    setRun(type, true)
    resetTech(type)

    const simFn = { pio: simProgrammedIO, int: simInterruptIO, dma: simDMA }[type]

    const [result] = await Promise.all([
      simFn(delay, dataSize,
        msg => addLog(type, msg),
        st => setViz(type, st)
      ),
      animateFlow(type, delay),
    ])

    setRes(type, result)
    setRun(type, false)
  }, [delay, dataSize])

  // Run all three in parallel
  const runAll = useCallback(async () => {
    await Promise.all(TECH_KEYS.map(k => runTech(k)))
  }, [runTech])

  const maxThr = Math.max(...TECH_KEYS.map(k => results[k]?.throughput ?? 0), 0.001)

  const barDef = (key, gradient, shadow, labelCls) => ({
    value: results[key]?.latency ?? 0,
    displayVal: results[key]?.latency.toFixed(2) ?? null,
    shortLabel: key.toUpperCase(),
    gradient, shadow, labelCls,
  })

  return (
    <div className="dark min-h-screen bg-bg-dark text-slate-100 font-display selection:bg-primary/30">
      <Header delay={delay} dataSize={dataSize}
        onDelayChange={setDelay} onSizeChange={setDataSize}
        onRun={runAll} running={isAnyRunning} />

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">

        {/* ── Metric Cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TECH_KEYS.map(k => (
            <MetricCard key={k} type={k} {...CARD_CONFIG[k]}
              result={results[k]}
              running={running[k]}
              onRunSingle={() => runTech(k)}
            />
          ))}
        </section>

        {/* ── Visualizer ── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-bold tracking-tight">Live Simulation Visualizer</h2>
            <div className="flex gap-4">
              {[['red', 'Busy/Polling'], ['blue', 'ISR Active'], ['green', 'Bus Master']].map(([c, l]) => (
                <span key={c} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                  <span className={`w-2 h-2 rounded-full bg-${c}-500`} style={{ boxShadow: `0 0 8px ${{ red: '#ef4444', blue: '#3b82f6', green: '#22c55e' }[c]}` }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {TECH_KEYS.map(k => (
              <VisualizerPanel key={k} type={k} vizState={vizState[k]} logs={logs[k]} />
            ))}
          </div>
        </section>

        {/* ── Flowcharts ── */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4">
            Transfer Logic Flowcharts
            <span className="text-xs font-mono text-slate-500 ml-2 uppercase">Tracing execution path</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TECH_KEYS.map(k => (
              <FlowChart key={k} type={k} litNodes={litNodes[k]} activeNode={activeNode[k]} />
            ))}
          </div>
        </section>

        {/* ── Analytics ── */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4">
            Performance Analytics
            <span className="text-xs font-mono text-primary ml-2 uppercase">Streaming telemetry</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BarChart title="Latency (s)" unit="s" bars={[
              { value: results.pio?.latency ?? 0, displayVal: results.pio?.latency.toFixed(2), shortLabel: 'PIO', gradient: 'bg-gradient-to-t from-red-600 to-red-400', shadow: 'shadow-[0_0_12px_#ef444460]', labelCls: 'text-red-400' },
              { value: results.int?.latency ?? 0, displayVal: results.int?.latency.toFixed(2), shortLabel: 'INT', gradient: 'bg-gradient-to-t from-blue-600 to-blue-400', shadow: 'shadow-[0_0_12px_#3b82f660]', labelCls: 'text-blue-400' },
              { value: results.dma?.latency ?? 0, displayVal: results.dma?.latency.toFixed(2), shortLabel: 'DMA', gradient: 'bg-gradient-to-t from-green-600 to-green-400', shadow: 'shadow-[0_0_12px_#22c55e60]', labelCls: 'text-green-400' },
            ]} />
            <BarChart title="Throughput" bars={[
              { value: results.pio?.throughput ?? 0, displayVal: results.pio ? fmtThr(results.pio.throughput) : null, shortLabel: 'PIO', gradient: 'bg-gradient-to-t from-red-600 to-red-400', shadow: 'shadow-[0_0_12px_#ef444460]', labelCls: 'text-red-400' },
              { value: results.int?.throughput ?? 0, displayVal: results.int ? fmtThr(results.int.throughput) : null, shortLabel: 'INT', gradient: 'bg-gradient-to-t from-blue-600 to-blue-400', shadow: 'shadow-[0_0_12px_#3b82f660]', labelCls: 'text-blue-400' },
              { value: results.dma?.throughput ?? 0, displayVal: results.dma ? fmtThr(results.dma.throughput) : null, shortLabel: 'DMA', gradient: 'bg-gradient-to-t from-green-600 to-green-400', shadow: 'shadow-[0_0_15px_#22c55e80]', labelCls: 'text-green-400' },
            ]} />
            <BarChart title="CPU Availability (%)" unit="%" bars={[
              { value: results.pio?.cpuAvail ?? 0, displayVal: results.pio?.cpuAvail + '%', shortLabel: 'PIO', gradient: 'bg-gradient-to-t from-red-800 to-red-500', shadow: '', labelCls: 'text-red-400' },
              { value: results.int?.cpuAvail ?? 0, displayVal: results.int?.cpuAvail + '%', shortLabel: 'INT', gradient: 'bg-gradient-to-t from-blue-600 to-blue-400', shadow: 'shadow-[0_0_15px_#3b82f666]', labelCls: 'text-blue-400' },
              { value: results.dma?.cpuAvail ?? 0, displayVal: results.dma?.cpuAvail + '%', shortLabel: 'DMA', gradient: 'bg-gradient-to-t from-green-600 to-green-400', shadow: 'shadow-[0_0_15px_#22c55e66]', labelCls: 'text-green-400' },
            ]} />
            <RadarChart results={results} />
          </div>
        </section>

        {/* ── Table ── */}
        <section className="pb-12">
          <h2 className="text-xl font-bold tracking-tight mb-4">
            Detailed Technique Comparison
            <span className="text-xs font-mono text-slate-500 ml-2 uppercase">Live Metrics</span>
          </h2>
          <CompareTable results={results} />
        </section>
      </main>

      <Footer running={isAnyRunning} />
    </div>
  )
}
