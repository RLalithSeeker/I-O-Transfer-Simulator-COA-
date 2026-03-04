// Simulation logic — returns {latency, throughput, cycles, cpuAvail}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtS = n => n.toFixed(2) + 's';
const fmtThr = n => n > 1e6 ? (n / 1e6).toFixed(1) + 'M B/s' : n > 1000 ? (n / 1000).toFixed(0) + 'K B/s' : n.toFixed(0) + ' B/s';

export { fmtS, fmtThr };

export async function simProgrammedIO(delay, dataSize, onLog, onState) {
    const TICK = 50;
    let cycles = 0;
    const dataBytes = dataSize * 4;
    const start = performance.now();

    onState({ cpuLbl: 'POLLING', cpuColor: 'red', devLbl: 'BUSY', devColor: 'default', msg: 'CONTINUOUS BUSY WAITING LOOP', msgColor: 'red', pktVisible: true });
    onLog('CPU issues I/O request to device');

    const deadline = start + delay * 1000;
    while (performance.now() < deadline) {
        cycles++;
        if (cycles === 1 || cycles % 20 === 0) onLog(`Poll #${cycles} — status: NOT READY`);
        await sleep(TICK);
    }

    onState({ cpuLbl: 'DONE', cpuColor: 'green', devLbl: 'READY', devColor: 'green', pktVisible: false, msg: 'TRANSFER COMPLETE', msgColor: 'green' });
    onLog(`Device READY after ${cycles} polls!`);
    await sleep(120);
    onLog(`CPU reads ${dataBytes} bytes into register`);

    const elapsed = (performance.now() - start) / 1000;
    return { latency: elapsed, throughput: dataBytes / elapsed, cycles, cpuAvail: 0 };
}

export async function simInterruptIO(delay, dataSize, onLog, onState) {
    const dataBytes = dataSize * 4;
    const start = performance.now();
    const userMsgs = ['CPU: running user process...', 'Thread 0x021: compute_shader_v2', 'Background task: render_pipeline', 'CPU: executing user task...'];

    onState({ cpuLbl: 'FREE', cpuColor: 'green', devLbl: 'BUSY', devColor: 'default', msg: 'CPU EXECUTING USER TASKS', msgColor: 'blue', pktVisible: true });
    onLog('CPU issues I/O request, resumes user tasks');

    let count = 0;
    const wid = setInterval(() => { count++; onLog(userMsgs[count % userMsgs.length]); }, Math.max(delay * 250, 400));
    try {
        await sleep(delay * 1000);
    } finally {
        clearInterval(wid);
    }

    onState({ cpuLbl: 'ISR', cpuColor: 'blue', devLbl: 'IRQ↑', devColor: 'blue', pktVisible: false });
    onLog('🔔 Hardware INTERRUPT raised (IRQ)!');
    onLog('CPU saves context → jumps to ISR');
    await sleep(300);
    onLog(`ISR reads ${dataBytes} bytes into buffer`);
    await sleep(150);
    onLog('CPU restores context, resumes execution');
    onState({ cpuLbl: 'DONE', cpuColor: 'green', devLbl: 'DONE', devColor: 'green', msg: 'TRANSFER COMPLETE', msgColor: 'green' });

    const elapsed = (performance.now() - start) / 1000;
    return { latency: elapsed, throughput: dataBytes / elapsed, cycles: 0, cpuAvail: 100 };
}

export async function simDMA(delay, dataSize, onLog, onState) {
    const dataBytes = dataSize * 4;
    const start = performance.now();

    onLog(`CPU programs DMA: dst=RAM, len=${dataBytes}`);
    onState({ cpuLbl: 'SETUP', cpuColor: 'default', ctrlLbl: 'PROG', ctrlColor: 'default', memLbl: 'WAIT', pktVisible: false, msg: 'PROGRAMMING DMA', msgColor: 'green' });
    await sleep(200);

    onLog('CPU surrenders system bus to DMA controller');
    onState({ cpuLbl: 'FREE', cpuColor: 'green', ctrlLbl: 'XFER', ctrlColor: 'green', pktVisible: true, msg: 'BUS MASTER: DMAC', msgColor: 'green' });

    const bursts = Math.ceil(delay / 0.4);
    for (let i = 0; i < bursts; i++) {
        await sleep(delay * 1000 / bursts);
        const pct = Math.round(((i + 1) / bursts) * 100);
        onLog(`DMA burst ${i + 1}/${bursts} → ${pct}% transferred`);
    }

    onState({ ctrlLbl: 'DONE', ctrlColor: 'default', memLbl: 'FULL', memColor: 'green', pktVisible: false });
    onLog('✅ DMA done — raises completion interrupt');
    await sleep(200);
    onLog('CPU acknowledges, reclaims bus');
    onState({ cpuLbl: 'DONE', cpuColor: 'green', msg: 'TRANSFER COMPLETE', msgColor: 'green' });

    const elapsed = (performance.now() - start) / 1000;
    return { latency: elapsed, throughput: dataBytes / elapsed, cycles: 0, cpuAvail: 100 };
}
