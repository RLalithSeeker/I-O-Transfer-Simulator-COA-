/* ============================================================
   COA PBL — I/O Simulator Engine
   Simulates Programmed I/O, Interrupt-driven I/O, and DMA
   ============================================================ */

'use strict';

// ── Helpers ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = (n, dec = 2) => n.toFixed(dec);
const fmtTh = n => n > 1000 ? (n / 1000).toFixed(1) + 'K' : n.toFixed(0);

// Chart references
let charts = {};

// ── Simulation State ─────────────────────────────────────────
function getParams() {
    return {
        delay: parseFloat($('deviceDelay').value),
        dataSize: parseInt($('dataSize').value, 10),
    };
}

// ── Core Simulation Logic ─────────────────────────────────────

/**
 * Programmed I/O — busy-wait polling simulation
 */
async function simProgrammedIO(delay, dataSize) {
    const TICK = 50; // ms per poll tick
    let wastedCycles = 0;
    const dataBytes = dataSize * 4; // "DATA" * dataSize
    const start = performance.now();

    setStatus('pioStatus', 'Initializing…');
    logAdd('pioLog', 'sys', 'CPU issues I/O request to device');
    setState('pioCpuState', 'POLLING', 'busy-state');
    setState('pioDevState', 'BUSY', null);

    const deadline = start + delay * 1000;
    let loggedPoll = false;

    while (performance.now() < deadline) {
        wastedCycles++;
        setStatus('pioStatus', `Polling… cycle ${wastedCycles}`);
        if (!loggedPoll || wastedCycles % 20 === 0) {
            logAdd('pioLog', 'pio', `Poll #${wastedCycles} — status: NOT READY`);
            loggedPoll = true;
        }
        spawnPacket('pioBus', 'packet-poll', true);
        await sleep(TICK);
    }

    setState('pioDevState', 'READY', 'free-state');
    logAdd('pioLog', 'pio', `Device READY after ${wastedCycles} polls!`);
    await sleep(120);
    spawnPacket('pioBus', 'packet-data', false);
    logAdd('pioLog', 'sys', `CPU reads ${dataBytes} bytes into register`);
    setState('pioCpuState', 'DONE', 'free-state');
    setStatus('pioStatus', 'Complete');

    const elapsed = (performance.now() - start) / 1000;
    const throughput = dataBytes / elapsed;
    return { latency: elapsed, throughput, wastedCycles, cpuAvail: 0, dataBytes };
}

/**
 * Interrupt-driven I/O — CPU does work, device fires IRQ
 */
async function simInterruptIO(delay, dataSize) {
    const dataBytes = dataSize * 4;
    const start = performance.now();

    setStatus('intStatus', 'Initializing…');
    logAdd('intLog', 'sys', 'CPU issues I/O request, returns to user tasks');
    setState('intCpuState', 'FREE', 'free-state');
    setState('intDevState', 'BUSY', null);

    // CPU doing other work animation
    const workInterval = setInterval(() => {
        logAdd('intLog', 'int', '🖥  CPU: running user process…');
        spawnPacket('intBus', 'packet-data', false);
        setStatus('intStatus', 'CPU doing useful work…');
    }, Math.max(delay * 250, 400));

    await sleep(delay * 1000);
    clearInterval(workInterval);

    // Device raises IRQ
    setState('intDevState', 'IRQ↑', 'irq-state');
    logAdd('intLog', 'int', '🔔 Hardware INTERRUPT raised (IRQ)!');
    logAdd('intLog', 'sys', 'CPU saves context → jumps to ISR');
    setState('intCpuState', 'ISR', 'irq-state');
    spawnPacket('intBus', 'packet-data', true);
    await sleep(300);

    logAdd('intLog', 'int', `ISR reads ${dataBytes} bytes into memory buffer`);
    await sleep(150);
    logAdd('intLog', 'sys', 'CPU restores context, resumes execution');
    setState('intCpuState', 'DONE', 'free-state');
    setState('intDevState', 'DONE', 'free-state');
    setStatus('intStatus', 'Complete');

    const elapsed = (performance.now() - start) / 1000;
    const throughput = dataBytes / elapsed;
    return { latency: elapsed, throughput, wastedCycles: 0, cpuAvail: 100, dataBytes };
}

/**
 * DMA Transfer — DMA controller handles entire transfer
 */
async function simDMA(delay, dataSize) {
    const dataBytes = dataSize * 4;
    const start = performance.now();

    setStatus('dmaStatus', 'Initializing…');
    logAdd('dmaLog', 'sys', 'CPU programs DMA: src=device, dst=RAM, len=' + dataBytes);
    setState('dmaCpuState', 'SETUP', null);
    setState('dmaCtrlState', 'PROG', null);
    setState('dmaMemState', 'WAIT', null);
    await sleep(200);

    logAdd('dmaLog', 'dma', 'CPU surrenders system bus to DMA controller');
    setState('dmaCpuState', 'FREE', 'free-state');
    setState('dmaCtrlState', 'XFER', 'active-state');

    // DMA bursting data
    const burstCount = Math.ceil(delay / 0.4);
    for (let i = 0; i < burstCount; i++) {
        await sleep(delay * 1000 / burstCount);
        const pct = Math.round(((i + 1) / burstCount) * 100);
        logAdd('dmaLog', 'dma', `DMA burst ${i + 1}/${burstCount} → ${pct}% transferred`);
        spawnPacket('dmaBus', 'packet-dma', false);
        setStatus('dmaStatus', `DMA transferring… ${pct}%`);
    }

    setState('dmaMemState', 'FULL', 'active-state');
    logAdd('dmaLog', 'dma', '✅ DMA done — raises completion interrupt');
    setState('dmaCtrlState', 'DONE', 'free-state');
    await sleep(200);
    logAdd('dmaLog', 'sys', 'CPU acknowledges, reclaims bus');
    setState('dmaCpuState', 'DONE', 'free-state');
    setStatus('dmaStatus', 'Complete');

    const elapsed = (performance.now() - start) / 1000;
    const throughput = dataBytes / elapsed;
    return { latency: elapsed, throughput, wastedCycles: 0, cpuAvail: 100, dataBytes };
}

// ── DOM Helpers ──────────────────────────────────────────────
function setStatus(id, txt) { $(id).textContent = txt; }

function setState(id, label, cssClass) {
    const el = $(id);
    if (!el) return;
    el.textContent = label;
    el.className = 'actor-state';
    if (cssClass) el.classList.add(cssClass);
}

function logAdd(logId, type, msg) {
    const log = $(logId);
    if (!log) return;
    const placeholder = log.querySelector('.log-placeholder');
    if (placeholder) placeholder.remove();

    const t = ((performance.now() % 100000) / 1000).toFixed(2);
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = `<span class="log-time">${t}s</span><span class="log-${type}">${msg}</span>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function spawnPacket(busId, cls, reverse) {
    const bus = $(busId);
    if (!bus) return;
    const pkt = document.createElement('div');
    pkt.className = `packet ${cls}`;
    if (reverse) {
        pkt.style.animation = 'move-packet-rev 0.6s linear forwards';
        pkt.style.left = '100%';
    }
    bus.appendChild(pkt);
    setTimeout(() => pkt.remove(), 700);
}

// Inject reverse packet keyframes once
const revStyle = document.createElement('style');
revStyle.textContent = `@keyframes move-packet-rev { from{right:-20px;left:auto;opacity:1} to{right:100%;left:auto;opacity:0.3} }`;
document.head.appendChild(revStyle);

function resetLogs() {
    ['pioLog', 'intLog', 'dmaLog'].forEach(id => {
        $(id).innerHTML = '<p class="log-placeholder">Running simulation…</p>';
    });
    ['pioStatus', 'intStatus', 'dmaStatus'].forEach(id => setStatus(id, 'Running…'));
}

function resetStates() {
    [['pioCpuState', 'FREE', 'free-state'], ['pioDevState', 'IDLE', null],
    ['intCpuState', 'FREE', 'free-state'], ['intDevState', 'IDLE', null],
    ['dmaCpuState', 'FREE', 'free-state'], ['dmaCtrlState', 'IDLE', null], ['dmaMemState', 'IDLE', null]
    ].forEach(([id, lbl, cls]) => setState(id, lbl, cls));
}

// ── Flowchart Lightup ────────────────────────────────────────
async function animateFlow(flowId, steps, colorClass, techDelay) {
    const panel = $(flowId);
    if (!panel) return;
    const nodes = panel.querySelectorAll('.flow-node');
    nodes.forEach(n => n.classList.remove('lit', 'pio-lit', 'int-lit', 'dma-lit'));

    for (let i = 0; i < Math.min(steps, nodes.length); i++) {
        await sleep(techDelay * 1000 / (nodes.length + 1));
        nodes[i].classList.add('lit', colorClass);
    }
}

// ── Cards Updater ─────────────────────────────────────────────
function updateCard(prefix, result) {
    const { latency, throughput, cpuAvail } = result;
    $(prefix + 'Lat').textContent = fmt(latency) + ' s';
    $(prefix + 'Thr').textContent = fmtTh(throughput) + ' B/s';
    $(prefix + 'Cpu').textContent = cpuAvail + '%';

    // Table
    $('tbl' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'Lat') &&
        ($('tbl' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'Lat').textContent = fmt(latency) + 's');
    $('tbl' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'Thr') &&
        ($('tbl' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'Thr').textContent = fmtTh(throughput) + ' B/s');
}

function updateTable(pio, int_, dma) {
    $('tblPioLat').textContent = fmt(pio.latency) + 's';
    $('tblIntLat').textContent = fmt(int_.latency) + 's';
    $('tblDmaLat').textContent = fmt(dma.latency) + 's';
    $('tblPioThr').textContent = fmtTh(pio.throughput) + ' B/s';
    $('tblIntThr').textContent = fmtTh(int_.throughput) + ' B/s';
    $('tblDmaThr').textContent = fmtTh(dma.throughput) + ' B/s';
    $('tblPioCyc').textContent = pio.wastedCycles.toLocaleString();
}

// ── Chart.js Setup ───────────────────────────────────────────
const TECHNIQUES = ['Programmed I/O', 'Interrupt I/O', 'DMA'];
const COLORS = {
    pio: '#ef4444', int: '#3b82f6', dma: '#22c55e',
    pioDim: 'rgba(239,68,68,0.18)', intDim: 'rgba(59,130,246,0.18)', dmaDim: 'rgba(34,197,94,0.18)'
};

Chart.defaults.color = '#7880a0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";

function buildCharts() {
    const barOpts = (label, unit, vals, backgrounds) => ({
        type: 'bar',
        data: {
            labels: TECHNIQUES,
            datasets: [{
                label, data: vals,
                backgroundColor: backgrounds,
                borderColor: backgrounds.map(c => c.replace('0.18', '0.9')),
                borderWidth: 1.5, borderRadius: 6, borderSkipped: false,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { display: false }, tooltip: {
                    callbacks: { label: ctx => ` ${fmt(ctx.raw)} ${unit}` }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });

    charts.lat = new Chart($('latencyChart'), barOpts(
        'Latency (s)', 's', [0, 0, 0],
        [COLORS.pioDim, COLORS.intDim, COLORS.dmaDim]
    ));

    charts.thr = new Chart($('throughputChart'), barOpts(
        'Throughput (B/s)', 'B/s', [0, 0, 0],
        [COLORS.pioDim, COLORS.intDim, COLORS.dmaDim]
    ));

    charts.cpu = new Chart($('cpuChart'), barOpts(
        'CPU Availability (%)', '%', [0, 0, 0],
        [COLORS.pioDim, COLORS.intDim, COLORS.dmaDim]
    ));

    // Radar chart
    charts.radar = new Chart($('radarChart'), {
        type: 'radar',
        data: {
            labels: ['CPU Avail.', 'Throughput', 'Simplicity', 'Cost-Eff.', 'Scalability'],
            datasets: [
                {
                    label: 'Programmed I/O',
                    data: [0, 30, 90, 90, 20],
                    borderColor: COLORS.pio, backgroundColor: COLORS.pioDim, pointBackgroundColor: COLORS.pio,
                },
                {
                    label: 'Interrupt I/O',
                    data: [85, 65, 60, 70, 75],
                    borderColor: COLORS.int, backgroundColor: COLORS.intDim, pointBackgroundColor: COLORS.int,
                },
                {
                    label: 'DMA',
                    data: [100, 100, 40, 50, 100],
                    borderColor: COLORS.dma, backgroundColor: COLORS.dmaDim, pointBackgroundColor: COLORS.dma,
                },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.07)' },
                    angleLines: { color: 'rgba(255,255,255,0.07)' },
                    pointLabels: { font: { size: 9 } },
                    ticks: { display: false, stepSize: 25 },
                    min: 0, max: 100,
                }
            }
        }
    });
}

function updateCharts(pio, int_, dma) {
    const update = (chart, vals) => {
        chart.data.datasets[0].data = vals;
        chart.update('active');
    };
    update(charts.lat, [pio.latency, int_.latency, dma.latency]);
    update(charts.thr, [pio.throughput, int_.throughput, dma.throughput]);
    update(charts.cpu, [pio.cpuAvail, int_.cpuAvail, dma.cpuAvail]);
    // Radar throughput axis update (normalize)
    const maxThr = Math.max(pio.throughput, int_.throughput, dma.throughput);
    charts.radar.data.datasets[0].data[1] = Math.round((pio.throughput / maxThr) * 100);
    charts.radar.data.datasets[1].data[1] = Math.round((int_.throughput / maxThr) * 100);
    charts.radar.data.datasets[2].data[1] = Math.round((dma.throughput / maxThr) * 100);
    charts.radar.update('active');
}

// ── Main Runner ───────────────────────────────────────────────
async function runSimulation() {
    const btn = $('runBtn');
    btn.classList.add('running');
    btn.querySelector('.run-btn-text').textContent = 'Simulating…';
    btn.disabled = true;

    const { delay, dataSize } = getParams();
    resetLogs();
    resetStates();

    // Run all three in parallel with flowchart animation
    const [pioResult, intResult, dmaResult] = await Promise.all([
        (async () => {
            animateFlow('flowPIO', 5, 'pio-lit', delay);
            return simProgrammedIO(delay, dataSize);
        })(),
        (async () => {
            animateFlow('flowINT', 6, 'int-lit', delay);
            return simInterruptIO(delay, dataSize);
        })(),
        (async () => {
            animateFlow('flowDMA', 6, 'dma-lit', delay);
            return simDMA(delay, dataSize);
        })(),
    ]);

    // Update UI with results
    updateCard('pio', pioResult);
    updateCard('int', intResult);
    updateCard('dma', dmaResult);
    updateTable(pioResult, intResult, dmaResult);
    updateCharts(pioResult, intResult, dmaResult);

    btn.classList.remove('running');
    btn.querySelector('.run-btn-text').textContent = 'Run Simulation';
    btn.disabled = false;

    console.table({
        'Programmed I/O': { Latency: pioResult.latency.toFixed(3) + 's', Throughput: fmtTh(pioResult.throughput) + ' B/s', WastedCycles: pioResult.wastedCycles, CpuAvail: pioResult.cpuAvail + '%' },
        'Interrupt I/O': { Latency: intResult.latency.toFixed(3) + 's', Throughput: fmtTh(intResult.throughput) + ' B/s', WastedCycles: 0, CpuAvail: intResult.cpuAvail + '%' },
        'DMA': { Latency: dmaResult.latency.toFixed(3) + 's', Throughput: fmtTh(dmaResult.throughput) + ' B/s', WastedCycles: 0, CpuAvail: dmaResult.cpuAvail + '%' },
    });
}

// ── Slider listeners ──────────────────────────────────────────
$('deviceDelay').addEventListener('input', e => {
    $('delayVal').textContent = parseFloat(e.target.value).toFixed(1) + ' s';
});
$('dataSize').addEventListener('input', e => {
    $('sizeVal').textContent = parseInt(e.target.value, 10) + ' B';
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    buildCharts();
    $('runBtn').addEventListener('click', runSimulation);
});
