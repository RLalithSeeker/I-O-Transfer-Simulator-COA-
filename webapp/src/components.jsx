import { useState, useEffect, useRef } from 'react'

const fmtThr = n => n > 1e6 ? (n / 1e6).toFixed(1) + 'M B/s' : n > 1000 ? Math.round(n / 1000) + 'K B/s' : Math.round(n) + ' B/s'
const fmtS = n => n.toFixed(2) + 's'

const FLOW_NODES = {
    pio: ['Issue I/O Request', 'Read Status Register', 'Device Ready? (Loop)', 'CPU Reads Data', 'Resume Execution'],
    int: ['Issue I/O Command', 'Continue User Task', 'Device Raises IRQ', 'CPU Runs ISR', 'Restore Context & Resume'],
    dma: ['Program DMA Controller', 'CPU Releases Bus', 'DMA Block Transfer', 'DMA Raises Done IRQ', 'CPU Reclaims Bus'],
}

/* ─── HEADER ─────────────────────────────────────────────── */
export function Header({ delay, dataSize, onDelayChange, onSizeChange, onRun, running }) {
    return (
        <header className="sticky top-0 z-50 w-full bg-surface/90 backdrop-blur-md border-b border-border-mute px-6 py-3">
            <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary border border-primary/30">
                        <span className="material-symbols-outlined text-2xl">memory</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight font-display">
                            I/O Transfer Simulator
                            {running && <span className="text-primary text-sm ml-2 font-mono uppercase tracking-widest animate-pulse">[Active]</span>}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-tighter">
                            Computer Organization &amp; Architecture · Phase 1 PBL
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center gap-10 max-w-2xl">
                    <Slider label="Device Delay" value={delay} min={0.5} max={5} step={0.5}
                        display={`${delay.toFixed(1)}s`} onChange={onDelayChange} disabled={running} />
                    <Slider label="Data Size" value={dataSize} min={50} max={2000} step={50}
                        display={`${dataSize}B`} onChange={v => onSizeChange(parseInt(v))} disabled={running} />
                </div>

                <RunButton running={running} onClick={onRun} label="Run All" />
            </div>
        </header>
    )
}

export function RunButton({ running, onClick, label = 'Run Simulation', small = false }) {
    return (
        <button
            disabled={running}
            onClick={onClick}
            className={`${small ? 'px-3 py-1.5 text-xs' : 'px-6 py-2.5 text-sm'} rounded-lg font-bold transition-all flex items-center gap-2 border ${running
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-white/5'
                    : 'bg-primary hover:bg-primary/90 text-white border-primary/50 shadow-lg shadow-primary/30 cursor-pointer'
                }`}
        >
            {running ? (
                <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Simulating…
                </>
            ) : (
                <>
                    <span className="material-symbols-outlined text-sm leading-none">play_arrow</span>
                    {label}
                </>
            )}
        </button>
    )
}

function Slider({ label, value, min, max, step, display, onChange, disabled }) {
    return (
        <div className="flex flex-col w-full gap-1">
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <span>{label}</span><span className="text-primary">{display}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                disabled={disabled}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-primary disabled:opacity-40" />
        </div>
    )
}

/* ─── METRIC CARD ────────────────────────────────────────── */
export function MetricCard({ type, title, desc, icon, result, running, onRunSingle }) {
    const c = { pio: 'red', int: 'blue', dma: 'green' }[type]
    const borderCls = { red: 'neon-border-red', blue: 'neon-border-blue', green: 'neon-border-green' }[c]

    return (
        <div className={`glass ${borderCls} p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-40 h-40 bg-${c}-500/5 blur-3xl -mr-20 -mt-20 pointer-events-none`} />
            <div className="flex justify-between items-start">
                <div className={`bg-${c}-500/10 p-3 rounded-lg text-${c}-500 border border-${c}-500/20`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="flex items-center gap-2">
                    {running && <span className={`text-[10px] font-bold text-${c}-500 uppercase tracking-widest px-2 py-1 bg-${c}-500/20 rounded animate-pulse`}>Running</span>}
                    {!running && <RunButton running={false} onClick={onRunSingle} label="Run" small />}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold font-display">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
            </div>
            <div className="space-y-3 pt-4 border-t border-white/5 font-mono text-sm">
                <Row label="Latency" value={result ? fmtS(result.latency) : '—'} color={`text-${c}-400`} />
                <Row label="Throughput" value={result ? fmtThr(result.throughput) : '—'} color={`text-${c}-400`} />
                <Row label="CPU Availability" value={result ? result.cpuAvail + '%' : '—'}
                    color={result?.cpuAvail === 0 ? 'text-red-500' : 'text-green-500'} bold />
                {result?.cycles > 0 && <Row label="Wasted Cycles" value={result.cycles.toLocaleString()} color="text-red-400/70" />}
            </div>
        </div>
    )
}
function Row({ label, value, color, bold }) {
    return (
        <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
            <span className="text-slate-500">{label}</span>
            <span className={color}>{value}</span>
        </div>
    )
}

/* ─── VISUALIZER PANEL ───────────────────────────────────── */
export function VisualizerPanel({ type, vizState, logs }) {
    const c = { pio: 'red', int: 'blue', dma: 'green' }[type]
    const logEl = useRef(null)
    useEffect(() => { if (logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight }, [logs])

    return (
        <div className="space-y-3">
            <div className={`glass rounded-xl h-60 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center bg-${c}-950/5`}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
                <div className="z-10 flex items-center justify-center w-full px-4">
                    {type === 'dma' ? <DMALayout vizState={vizState} /> : <StandardLayout type={type} vizState={vizState} />}
                </div>
                <div className={`absolute bottom-3 text-[10px] font-mono tracking-widest font-bold transition-colors duration-300 text-${colorOf(vizState?.msgColor)}-${vizState?.msgColor === 'red' ? '500' : '400'}`}>
                    {vizState?.msg || 'WAITING TO START'}
                </div>
            </div>
            <div ref={logEl} className={`bg-black/80 rounded-lg p-3 font-mono text-[11px] text-${c}-400/80 h-28 overflow-y-auto border border-${c}-900/30 scanline`}>
                {logs.length === 0
                    ? <p className="text-slate-600">&gt; Idle. Press Run.</p>
                    : logs.map((l, i) => <p key={i} className="leading-relaxed">&gt; {l}</p>)
                }
            </div>
        </div>
    )
}
const colorOf = c => c || 'slate'

function ActorBox({ color, topLabel, botLabel, icon }) {
    const c = color || 'slate'
    const isActive = c !== 'slate'
    return (
        <div className={`w-20 h-20 bg-surface rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-300
      ${isActive ? `border border-${c}-500/80 shadow-lg shadow-${c}-500/20` : 'border border-slate-700'}`}>
            {icon && <span className={`material-symbols-outlined text-${c === 'slate' ? 'slate-400' : c + '-400'} mb-0.5 text-base`}>{icon}</span>}
            {topLabel && <span className="text-slate-500 text-[8px]">{topLabel}</span>}
            <span className={`text-${c === 'slate' ? 'slate' : c}-400`}>{botLabel || '—'}</span>
        </div>
    )
}

function StandardLayout({ type, vizState }) {
    const icon = type === 'pio' ? 'memory' : 'memory'
    const devIcon = type === 'pio' ? 'storage' : 'notifications'
    const c = { pio: 'red', int: 'blue', dma: 'green' }[type]
    return (
        <div className="flex items-center gap-8">
            <ActorBox color={vizState?.cpuColor} topLabel="STATUS" botLabel={vizState?.cpuLbl || 'IDLE'} icon={icon} />
            <div className="relative h-1 w-20 bg-slate-800 flex-shrink-0">
                {vizState?.pktVisible && (
                    <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-4 h-4 bg-${c}-500 rounded-full blur-sm animate-ping opacity-90`} />
                )}
            </div>
            <ActorBox color={vizState?.devColor} botLabel={vizState?.devLbl || 'IDLE'} icon={devIcon} />
        </div>
    )
}

function DMALayout({ vizState }) {
    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex items-center justify-center gap-6">
                <ActorBox color={vizState?.cpuColor} botLabel={vizState?.cpuLbl || 'IDLE'} topLabel="CPU" />
                <ActorBox color={vizState?.ctrlColor} botLabel={vizState?.ctrlLbl || 'IDLE'} topLabel="DMAC" />
                <ActorBox color={vizState?.memColor} botLabel="RAM" />
            </div>
            <div className="h-1 w-44 bg-slate-800 relative">
                {vizState?.pktVisible && (
                    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full blur-sm animate-ping" />
                )}
            </div>
            <ActorBox color="slate" botLabel={vizState?.devLbl || 'IDLE'} topLabel="Device" />
        </div>
    )
}

/* ─── FLOWCHART ──────────────────────────────────────────── */
export function FlowChart({ type, litNodes, activeNode }) {
    const nodes = FLOW_NODES[type]
    const litCls = { pio: 'node-lit-red', int: 'node-lit-blue', dma: 'node-lit-green' }[type]
    const connC = { pio: 'red', int: 'blue', dma: 'green' }[type]
    const titleC = { pio: 'text-red-500', int: 'text-blue-500', dma: 'text-green-500' }[type]
    const titles = { pio: 'Programmed I/O', int: 'Interrupt I/O', dma: 'DMA Transfer' }

    return (
        <div className="glass rounded-xl border border-white/5 p-5 h-full">
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-5 ${titleC}`}>{titles[type]} Flow</h3>
            <div className="flex flex-col items-center gap-0">
                {nodes.map((node, i) => {
                    const isLit = litNodes[i]
                    const isActive = activeNode === i
                    const isDone = isLit && !isActive
                    return (
                        <div key={i} className="flex flex-col items-center w-full">
                            <div className={`w-full px-3 py-2.5 border rounded text-xs font-bold text-center transition-all duration-500
                ${isActive
                                    ? `border-${connC}-400 bg-${connC}-500/10 text-${connC}-300 shadow-[0_0_16px_rgba(var(--conn),0.4)] animate-pulse`
                                    : isDone
                                        ? litCls
                                        : 'border-slate-700 bg-surface text-slate-500 node-dim'
                                }`}
                            >
                                {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-ping align-middle" />}
                                {node}
                            </div>
                            {i < nodes.length - 1 && (
                                <div className={`h-4 w-px transition-colors duration-500 ${isDone ? `bg-${connC}-500/60` : 'bg-slate-700'}`} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ─── BAR CHART ──────────────────────────────────────────── */
export function BarChart({ title, bars, unit = '' }) {
    const max = Math.max(...bars.map(b => b.value), 0.001)
    return (
        <div className="glass p-5 rounded-xl border border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
            {/* Value labels above */}
            <div className="flex gap-2 justify-around">
                {bars.map((b, i) => (
                    <span key={i} className={`text-[11px] font-mono font-bold ${b.labelCls} min-w-0 text-center flex-1`}>
                        {b.value > 0 ? `${b.displayVal ?? b.value.toFixed(2)}${unit}` : '—'}
                    </span>
                ))}
            </div>
            {/* Bars */}
            <div className="h-44 flex items-end gap-3">
                {bars.map((b, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full">
                        <div
                            className={`w-full rounded-t transition-all duration-1000 ease-out ${b.gradient} ${b.shadow}`}
                            style={{ height: b.value > 0 ? `${Math.max(Math.round((b.value / max) * 100), 4)}%` : '0%' }}
                        />
                    </div>
                ))}
            </div>
            {/* X labels */}
            <div className="flex justify-around text-[10px] text-slate-500 font-mono font-bold">
                {bars.map((b, i) => <span key={i} className="flex-1 text-center">{b.shortLabel}</span>)}
            </div>
        </div>
    )
}

/* ─── RADAR CHART (dynamic SVG) ──────────────────────────── */
export function RadarChart({ results }) {
    const size = 160
    const cx = size / 2, cy = size / 2, r = 62
    const axes = ['CPU Avail.', 'Throughput', 'Simplicity', 'Cost-Eff.', 'Scalability']
    const n = axes.length
    const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2

    // Static scores (0–100) + dynamic override for CPU Avail & Throughput
    const maxThr = Math.max(results?.pio?.throughput ?? 1, results?.int?.throughput ?? 1, results?.dma?.throughput ?? 1)
    const score = (type, axIdx) => {
        const defaults = {
            pio: [0, 20, 90, 85, 15],
            int: [85, 55, 60, 65, 75],
            dma: [100, 100, 35, 45, 100],
        }
        if (axIdx === 0 && results?.[type]) return results[type].cpuAvail
        if (axIdx === 1 && results?.[type]) return Math.round((results[type].throughput / maxThr) * 100)
        return defaults[type][axIdx]
    }

    const points = (type) =>
        axes.map((_, i) => {
            const s = score(type, i) / 100
            const a = angle(i)
            return [cx + r * s * Math.cos(a), cy + r * s * Math.sin(a)]
        }).map(p => p.join(',')).join(' ')

    const gridCircles = [0.25, 0.5, 0.75, 1]
    const gridLines = axes.map((_, i) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) }))
    const labelPos = axes.map((ax, i) => {
        const a = angle(i), dist = r + 18
        return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a), label: ax }
    })

    return (
        <div className="glass p-5 rounded-xl border border-white/5 flex flex-col items-center gap-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest self-start">Comparison Radar</h4>
            <svg width={size + 60} height={size + 60} viewBox={`-30 -30 ${size + 60} ${size + 60}`} className="overflow-visible">
                {/* Grid rings */}
                {gridCircles.map(s => (
                    <circle key={s} cx={cx} cy={cy} r={r * s} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                ))}
                {/* Grid spokes */}
                {gridLines.map((pt, i) => (
                    <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                ))}
                {/* Polygons */}
                {[
                    { type: 'pio', fill: 'rgba(239,68,68,0.2)', stroke: '#ef4444' },
                    { type: 'int', fill: 'rgba(59,130,246,0.2)', stroke: '#3b82f6' },
                    { type: 'dma', fill: 'rgba(34,197,94,0.2)', stroke: '#22c55e' },
                ].map(({ type, fill, stroke }) => (
                    <polygon key={type} points={points(type)} fill={fill} stroke={stroke} strokeWidth="1.5"
                        className="transition-all duration-700" />
                ))}
                {/* Axis labels */}
                {labelPos.map(({ x, y, label }) => (
                    <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                        fontSize="8" fill="#64748b" fontFamily="Inter,sans-serif" fontWeight="600">
                        {label}
                    </text>
                ))}
            </svg>
            <div className="flex gap-3 text-[9px] font-mono font-bold">
                <span className="text-red-400">■ PIO</span>
                <span className="text-blue-400">■ Interrupt</span>
                <span className="text-green-400">■ DMA</span>
            </div>
        </div>
    )
}

/* ─── COMPARE TABLE ──────────────────────────────────────── */
export function CompareTable({ results }) {
    const r = k => results?.[k]
    const rows = [
        ['Latency (Observed)', r('pio') ? fmtS(r('pio').latency) : '—', r('int') ? fmtS(r('int').latency) : '—', r('dma') ? fmtS(r('dma').latency) : '—', 'red', 'blue', 'green'],
        ['Throughput (Live)', r('pio') ? fmtThr(r('pio').throughput) : '—', r('int') ? fmtThr(r('int').throughput) : '—', r('dma') ? fmtThr(r('dma').throughput) : '—', 'red', 'blue', 'green'],
        ['CPU Availability', '0% Busy Wait', '~100% Free', '~100% Free', 'red', 'green', 'green'],
        ['Overhead Type', 'Wasted Poll Cycles', 'IRQ Context Sw.', 'Bus Arbitration', 'slate', 'slate', 'slate'],
        ['Wasted Cycles', r('pio') ? r('pio').cycles.toLocaleString() : '—', '~0', '~0', 'red', 'green', 'green'],
        ['Best Use Case', 'Simple slow devices', 'Keyboards, timers', 'NVMe, GPU, Net', 'slate', 'slate', 'slate'],
    ]
    return (
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-surface/80 border-b border-white/10">
                        {['Characteristic', 'Programmed I/O', 'Interrupt-Driven', 'DMA Transfer'].map((h, i) => (
                            <th key={h} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${['text-slate-400', 'text-red-500', 'text-blue-500', 'text-green-500'][i]}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-mono">
                    {rows.map(([ch, a, b, c, ca, cb, cc]) => (
                        <tr key={ch} className="hover:bg-white/[0.02]">
                            <td className="px-6 py-4 font-semibold font-display text-slate-300 text-sm">{ch}</td>
                            <td className={`px-6 py-4 text-${ca}-400`}>{a}</td>
                            <td className={`px-6 py-4 text-${cb}-400`}>{b}</td>
                            <td className={`px-6 py-4 text-${cc}-400`}>{c}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/* ─── FOOTER ─────────────────────────────────────────────── */
export function Footer({ running }) {
    return (
        <footer className="bg-surface py-8 border-t border-border-mute mt-auto">
            <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span className="material-symbols-outlined text-sm">school</span>
                    <span className="font-bold tracking-tight">Computer Architecture PBL · COA</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ml-2 transition-colors ${running ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-500'}`}>
                        {running ? 'SIM_SESSION_ACTIVE' : 'SIM_IDLE'}
                    </span>
                </div>
                <p className="text-xs text-slate-600 font-mono">Woxsen University · Semester 4 · COA Phase 1</p>
            </div>
        </footer>
    )
}
