import { useState, useEffect, useRef } from 'react'

const fmtThr = n => n > 1e6 ? (n / 1e6).toFixed(1) + 'M B/s' : n > 1000 ? Math.round(n / 1000) + 'K B/s' : Math.round(n) + ' B/s'
const fmtS = n => n.toFixed(2) + 's'

const FLOW_NODES = {
    pio: ['Issue I/O Request', 'Read Status Register', 'Device Ready? (Poll Loop)', 'CPU Reads Data', 'Resume Execution'],
    int: ['Issue I/O Command', 'Continue User Task', 'Device Raises IRQ', 'CPU Runs ISR', 'Restore Context & Resume'],
    dma: ['Program DMA Controller', 'CPU Releases Bus', 'DMA Block Transfer', 'DMA Raises Done IRQ', 'CPU Reclaims Bus'],
}

/* ────────────────────────────────────────────────────────────
   HEADER — left-heavy layout, no centred block
──────────────────────────────────────────────────────────── */
export function Header({ delay, dataSize, onDelayChange, onSizeChange, onRun, running }) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0d0f15]/95 backdrop-blur-lg px-8 py-4">
            <div className="max-w-[1600px] mx-auto flex items-center gap-8">
                {/* Brand — fixed width, left */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 grid place-items-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>memory</span>
                    </div>
                    <div>
                        <p className="text-[15px] font-bold tracking-tight leading-tight">I/O Transfer Simulator</p>
                        <p className="text-[10px] text-slate-500 leading-tight">COA Phase 1 · PBL</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-800 flex-shrink-0" />

                {/* Controls — grow to fill */}
                <div className="flex items-center gap-6 flex-1 min-w-0">
                    <SlimSlider label="Device Delay" value={delay} min={0.5} max={5} step={0.5}
                        display={`${delay.toFixed(1)}s`} onChange={onDelayChange} disabled={running} />
                    <SlimSlider label="Data Size" value={dataSize} min={50} max={2000} step={50}
                        display={`${dataSize}B`} onChange={v => onSizeChange(parseInt(v))} disabled={running} />
                </div>

                {/* Status + button — right */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {running && (
                        <span className="text-[11px] font-semibold text-primary/80 tabular-nums">Simulating…</span>
                    )}
                    <RunButton running={running} onClick={onRun} label="Run All" />
                </div>
            </div>
        </header>
    )
}

function SlimSlider({ label, value, min, max, step, display, onChange, disabled }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-slate-400 font-medium">{label}</p>
                <p className="text-[13px] font-bold text-primary tabular-nums">{display}</p>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                disabled={disabled}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-28 cursor-pointer accent-primary disabled:opacity-30 flex-shrink-0" style={{ height: '4px' }} />
        </div>
    )
}

export function RunButton({ running, onClick, label = 'Run Simulation', small = false }) {
    return (
        <button disabled={running} onClick={onClick}
            className={`flex items-center gap-2 font-semibold rounded-lg transition-all border
        ${small
                    ? 'px-3 py-1.5 text-[12px]'
                    : 'px-5 py-2 text-[13px]'}
        ${running
                    ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed border-slate-700'
                    : 'bg-primary text-white border-primary/70 hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer'
                }`}
        >
            {running
                ? <><svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>Simulating</>
                : <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span>{label}</>
            }
        </button>
    )
}

/* ────────────────────────────────────────────────────────────
   METRIC CARD — solid surface, no glass everywhere
──────────────────────────────────────────────────────────── */
const ACCENT = { pio: '#ef4444', int: '#3b82f6', dma: '#22c55e' }

export function MetricCard({ type, title, desc, icon, result, running, onRunSingle }) {
    const color = ACCENT[type]
    return (
        <div className="bg-[#111318] rounded-xl border border-slate-800 p-6 flex flex-col gap-5 relative overflow-hidden hover:border-slate-700 transition-colors">
            {/* Subtle corner tint */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none opacity-20"
                style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }} />

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg grid place-items-center flex-shrink-0"
                        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                        <span className="material-symbols-outlined" style={{ color, fontSize: '20px' }}>{icon}</span>
                    </div>
                    <div>
                        <p className="text-[14px] font-bold leading-tight">{title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                    </div>
                </div>
                <RunButton running={running} onClick={onRunSingle} label="Run" small />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                <Metric label="Latency" value={result ? fmtS(result.latency) : '—'} color={color} />
                <Metric label="Throughput" value={result ? fmtThr(result.throughput) : '—'} color={color} />
                <Metric label="CPU Free" value={result ? result.cpuAvail + '%' : '—'}
                    color={result?.cpuAvail === 0 ? '#ef4444' : '#22c55e'} />
            </div>
            {result?.cycles > 0 && (
                <p className="text-[11px] text-slate-500 font-mono -mt-2">
                    Wasted cycles: <span className="text-red-400">{result.cycles.toLocaleString()}</span>
                </p>
            )}
        </div>
    )
}

function Metric({ label, value, color }) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-[10px] text-slate-500 font-medium">{label}</p>
            <p className="text-[15px] font-bold tabular-nums" style={{ color }}>{value}</p>
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   VISUALISER PANEL
──────────────────────────────────────────────────────────── */
export function VisualizerPanel({ type, vizState, logs }) {
    const c = ACCENT[type]
    const logEl = useRef(null)
    useEffect(() => { if (logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight }, [logs])

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-slate-800 h-56 relative overflow-hidden flex items-center justify-center bg-[#0d0f15]">
                <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px] pointer-events-none" />
                <div className="z-10 w-full px-6">
                    {type === 'dma' ? <DMALayout vizState={vizState} c={c} /> : <StandardLayout type={type} vizState={vizState} c={c} />}
                </div>
                {vizState?.msg && (
                    <p className="absolute bottom-3 text-[10px] font-mono tracking-wider font-semibold"
                        style={{ color: vizState.msgColor === 'green' ? '#22c55e' : vizState.msgColor === 'blue' ? '#3b82f6' : vizState.msgColor === 'red' ? '#ef4444' : '#64748b' }}>
                        {vizState.msg}
                    </p>
                )}
            </div>
            <div ref={logEl}
                className="rounded-lg border border-slate-800/80 bg-[#080a0d] p-3 font-mono text-[11px] h-28 overflow-y-auto space-y-0.5 scanline"
                style={{ color: `${c}cc` }}>
                {logs.length === 0
                    ? <p className="text-slate-700">&gt; Idle — press Run to start</p>
                    : logs.map((l, i) => <p key={i} className="leading-relaxed">&gt; {l}</p>)
                }
            </div>
        </div>
    )
}

function ActorBox({ topLabel, botLabel, icon, active, color }) {
    return (
        <div className="w-[72px] h-[72px] rounded-lg bg-[#111318] flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-300 border border-slate-800"
            style={active ? { borderColor: `${color}90`, boxShadow: `0 0 18px ${color}30` } : {}}>
            {icon && <span className="material-symbols-outlined mb-0.5" style={{ fontSize: '16px', color: active ? color : '#475569' }}>{icon}</span>}
            {topLabel && <span className="text-slate-600 text-[8px]">{topLabel}</span>}
            <span style={{ color: active ? color : '#64748b' }}>{botLabel}</span>
        </div>
    )
}

function Packet({ visible, color, left = true }) {
    if (!visible) return null
    return (
        <div className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full animate-ping`}
            style={{ [left ? 'left' : 'right']: '10%', background: color, boxShadow: `0 0 10px ${color}`, opacity: 0.8 }} />
    )
}

// Map vizState color string → hex
const COLOR_MAP = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', default: '#64748b' }

function StandardLayout({ type, vizState, c }) {
    const icon = 'memory'
    const devIcon = type === 'pio' ? 'storage' : 'notifications'
    const cpuHex = COLOR_MAP[vizState?.cpuColor] ?? ACCENT[type]
    const devHex = COLOR_MAP[vizState?.devColor] ?? '#64748b'
    return (
        <div className="flex items-center justify-center gap-6">
            <ActorBox topLabel="CPU" botLabel={vizState?.cpuLbl || 'IDLE'} icon={icon}
                active={!!vizState?.cpuColor && vizState.cpuColor !== 'default'} color={cpuHex} />
            <div className="relative flex-1 h-1 bg-slate-800 rounded-full">
                <Packet visible={!!vizState?.pktVisible} color={c} left={true} />
            </div>
            <ActorBox topLabel="Device" botLabel={vizState?.devLbl || 'IDLE'} icon={devIcon}
                active={!!vizState?.devColor && vizState.devColor !== 'default'} color={devHex} />
        </div>
    )
}

function DMALayout({ vizState, c }) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-4">
                <ActorBox topLabel="CPU" botLabel={vizState?.cpuLbl || 'IDLE'} active={vizState?.cpuColor === 'green'} color="#22c55e" />
                <ActorBox topLabel="DMAC" botLabel={vizState?.ctrlLbl || 'IDLE'} active={vizState?.ctrlColor === 'green'} color={c} />
                <ActorBox topLabel="RAM" botLabel={vizState?.memLbl || '—'} active={vizState?.memColor === 'green'} color="#22c55e" />
            </div>
            <div className="relative w-44 h-1 bg-slate-800 rounded-full">
                <Packet visible={!!vizState?.pktVisible} color={c} left={true} />
            </div>
            <ActorBox topLabel="Device" botLabel="I/O Dev" active={false} color={c} />
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   FLOWCHART — with real SVG arrows
──────────────────────────────────────────────────────────── */
const FLOW_LABELS = {
    pio: 'Programmed I/O', int: 'Interrupt-driven I/O', dma: 'DMA Transfer'
}

export function FlowChart({ type, litNodes, activeNode }) {
    const nodes = FLOW_NODES[type]
    const color = ACCENT[type]

    const stateOf = i => {
        if (activeNode === i) return 'active'
        if (litNodes[i]) return 'done'
        return 'idle'
    }

    return (
        <div className="bg-[#111318] rounded-xl border border-slate-800 p-5 flex flex-col">
            <p className="text-[12px] font-bold uppercase tracking-widest mb-5" style={{ color }}>{FLOW_LABELS[type]}</p>
            <div className="flex flex-col items-center w-full gap-0">
                {nodes.map((node, i) => {
                    const s = stateOf(i)
                    const connDone = litNodes[i] && i < nodes.length - 1
                    return (
                        <div key={i} className="flex flex-col items-center w-full">
                            {/* Node box */}
                            <div className={`w-full px-4 py-2.5 rounded-lg text-[12px] font-semibold text-center transition-all duration-500 border
                ${s === 'active'
                                    ? 'animate-pulse'
                                    : s === 'done'
                                        ? ''
                                        : 'border-slate-800 text-slate-600 bg-transparent'
                                }`}
                                style={s === 'done'
                                    ? { borderColor: `${color}60`, background: `${color}0f`, color }
                                    : s === 'active'
                                        ? { borderColor: color, background: `${color}18`, color, boxShadow: `0 0 14px ${color}40` }
                                        : {}
                                }
                            >
                                {s === 'active' && (
                                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle animate-ping"
                                        style={{ background: color }} />
                                )}
                                {node}
                            </div>

                            {/* SVG Arrow connector */}
                            {i < nodes.length - 1 && (
                                <svg width="24" height="28" viewBox="0 0 24 28" className="flex-shrink-0 my-0.5">
                                    {/* Shaft */}
                                    <line x1="12" y1="0" x2="12" y2="18"
                                        stroke={connDone ? color : '#334155'} strokeWidth="1.5"
                                        className="transition-all duration-500"
                                        style={connDone ? { filter: `drop-shadow(0 0 3px ${color})` } : {}} />
                                    {/* Arrowhead */}
                                    <polygon points="12,28 6,16 18,16"
                                        fill={connDone ? color : '#334155'}
                                        className="transition-all duration-500"
                                        style={connDone ? { filter: `drop-shadow(0 0 4px ${color})` } : {}} />
                                </svg>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   BAR CHART — taller, labeled, clear
──────────────────────────────────────────────────────────── */
const BAR_PX = 160   // fixed pixel height for bar area

export function BarChart({ title, bars }) {
    const max = Math.max(...bars.map(b => b.value), 0.001)
    return (
        <div className="bg-[#111318] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-slate-400">{title}</p>

            {/* Value labels — separate row, always visible */}
            <div className="flex gap-3">
                {bars.map((b, i) => (
                    <div key={i} className="flex-1 text-center">
                        <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: b.color }}>
                            {b.value > 0 ? (b.displayVal ?? b.value.toFixed(2)) : '—'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Bar area — fixed pixel height, bars align to bottom */}
            <div className="flex items-end gap-3" style={{ height: `${BAR_PX}px` }}>
                {bars.map((b, i) => {
                    const px = b.value > 0 ? Math.max(Math.round((b.value / max) * BAR_PX), 6) : 0
                    return (
                        <div key={i} className="flex-1 rounded-t transition-all duration-1000 ease-out"
                            style={{
                                height: `${px}px`,
                                background: px > 0 ? `linear-gradient(to top, ${b.color}ee, ${b.color}66)` : 'transparent',
                                boxShadow: px > 0 ? `0 0 16px ${b.color}50` : 'none',
                            }}
                        />
                    )
                })}
            </div>

            {/* X labels */}
            <div className="flex gap-3">
                {bars.map((b, i) => (
                    <span key={i} className="flex-1 text-center text-[10px] text-slate-500 font-medium">{b.shortLabel}</span>
                ))}
            </div>
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   RADAR CHART — dynamic SVG
──────────────────────────────────────────────────────────── */
export function RadarChart({ results }) {
    const size = 160, cx = 80, cy = 80, r = 60
    const axes = ['CPU Avail', 'Throughput', 'Simplicity', 'Cost-Eff', 'Scalability']
    const n = axes.length
    const ang = i => (Math.PI * 2 * i) / n - Math.PI / 2

    const maxThr = Math.max(results?.pio?.throughput ?? 1, results?.int?.throughput ?? 1, results?.dma?.throughput ?? 1)
    const defaults = { pio: [0, 20, 90, 85, 15], int: [85, 55, 60, 65, 75], dma: [100, 100, 35, 45, 100] }
    const score = (type, ai) => {
        if (ai === 0 && results?.[type]) return results[type].cpuAvail
        if (ai === 1 && results?.[type]) return Math.round((results[type].throughput / maxThr) * 100)
        return defaults[type][ai]
    }
    const pts = type => axes.map((_, i) => {
        const s = score(type, i) / 100, a = ang(i)
        return `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`
    }).join(' ')

    const cfg = [
        { type: 'pio', color: '#ef4444' },
        { type: 'int', color: '#3b82f6' },
        { type: 'dma', color: '#22c55e' },
    ]

    return (
        <div className="bg-[#111318] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-slate-400">Comparison Radar</p>
            <div className="flex justify-center">
                <svg width={size + 50} height={size + 50} viewBox={`-25 -25 ${size + 50} ${size + 50}`} className="overflow-visible">
                    {[1, 0.75, 0.5, 0.25].map(s => (
                        <circle key={s} cx={cx} cy={cy} r={r * s} fill="none" stroke="#1e293b" strokeWidth="1" />
                    ))}
                    {axes.map((_, i) => (
                        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(ang(i))} y2={cy + r * Math.sin(ang(i))}
                            stroke="#1e293b" strokeWidth="1" />
                    ))}
                    {cfg.map(({ type, color }) => (
                        <polygon key={type} points={pts(type)}
                            fill={`${color}18`} stroke={color} strokeWidth="1.5"
                            className="transition-all duration-700" />
                    ))}
                    {axes.map((ax, i) => {
                        const a = ang(i), d = r + 18
                        return <text key={ax} x={cx + d * Math.cos(a)} y={cy + d * Math.sin(a)}
                            textAnchor="middle" dominantBaseline="middle" fontSize="8"
                            fill="#475569" fontFamily="Inter,sans-serif" fontWeight="600">{ax}</text>
                    })}
                </svg>
            </div>
            <div className="flex justify-center gap-4">
                {cfg.map(({ type, color }) => (
                    <span key={type} className="flex items-center gap-1 text-[10px] font-medium" style={{ color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        {type.toUpperCase()}
                    </span>
                ))}
            </div>
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   COMPARE TABLE
──────────────────────────────────────────────────────────── */
export function CompareTable({ results }) {
    const r = k => results?.[k]
    const rows = [
        ['Latency', r('pio') ? fmtS(r('pio').latency) : '—', r('int') ? fmtS(r('int').latency) : '—', r('dma') ? fmtS(r('dma').latency) : '—', '#ef4444', '#3b82f6', '#22c55e'],
        ['Throughput', r('pio') ? fmtThr(r('pio').throughput) : '—', r('int') ? fmtThr(r('int').throughput) : '—', r('dma') ? fmtThr(r('dma').throughput) : '—', '#ef4444', '#3b82f6', '#22c55e'],
        ['CPU Availability', '0% (busy wait)', '~100% free', '~100% free', '#ef4444', '#22c55e', '#22c55e'],
        ['Overhead', 'Wasted poll cycles', 'IRQ context switch', 'Bus arbitration', '#64748b', '#64748b', '#64748b'],
        ['Wasted cycles', r('pio') ? r('pio').cycles.toLocaleString() : '—', '~0', '~0', '#ef4444', '#22c55e', '#22c55e'],
        ['Best for', 'Simple slow devices', 'Keyboards, timers', 'NVMe, GPU, network', '#64748b', '#64748b', '#64748b'],
    ]
    return (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-[#111318] border-b border-slate-800">
                        {[['Characteristic', '#64748b'], ['Programmed I/O', '#ef4444'], ['Interrupt-driven', '#3b82f6'], ['DMA Transfer', '#22c55e']].map(([h, c]) => (
                            <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: c }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {rows.map(([ch, a, b, c, ca, cb, cc]) => (
                        <tr key={ch} className="hover:bg-white/[0.015] transition-colors">
                            <td className="px-5 py-3.5 text-[13px] font-medium text-slate-300">{ch}</td>
                            <td className="px-5 py-3.5 text-[13px] font-mono" style={{ color: ca }}>{a}</td>
                            <td className="px-5 py-3.5 text-[13px] font-mono" style={{ color: cb }}>{b}</td>
                            <td className="px-5 py-3.5 text-[13px] font-mono" style={{ color: cc }}>{c}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   FOOTER
──────────────────────────────────────────────────────────── */
export function Footer({ running }) {
    return (
        <footer className="border-t border-slate-800 bg-[#0d0f15] py-6 mt-auto">
            <div className="max-w-[1600px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-slate-500 text-[12px]">
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
                    <span>Computer Architecture PBL · COA · Woxsen University</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] transition-colors font-medium ${running ? 'bg-primary/15 text-primary' : 'bg-slate-800 text-slate-600'}`}>
                        {running ? '● Simulating' : '○ Idle'}
                    </span>
                </div>
                <p className="text-[11px] text-slate-700 font-mono">Phase 1 · Semester 4</p>
            </div>
        </footer>
    )
}
