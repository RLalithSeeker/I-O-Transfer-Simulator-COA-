# I/O Transfer Simulator — COA Phase 1 PBL

**Woxsen University · Computer Organization & Architecture · Semester 4**

A full-stack interactive simulator that models and compares three I/O data transfer techniques: **Programmed I/O**, **Interrupt-driven I/O**, and **DMA**, with real-time visualizations, animated flowcharts, and live performance analytics.

---

## Problem Statement

In computer systems, efficient data transfer between CPU, memory, and I/O devices is critical for overall performance. Traditional techniques like **Programmed I/O** waste CPU cycles due to busy-waiting, while **Interrupt-driven I/O** improves efficiency by allowing the CPU to respond only when needed. **Direct Memory Access (DMA)** further enhances performance by transferring data directly between devices and memory without CPU involvement.

This project simulates and evaluates these three techniques to understand their impact on CPU utilization, latency, and throughput.

---

## Objectives

- Model and analyze different I/O data transfer techniques
- Compare Programmed I/O, Interrupt-driven I/O, and DMA
- Evaluate efficiency using CPU utilization, latency, and throughput
- Provide a conceptual foundation for hardware implementation in Phase 2

---

## Project Structure

```
PBL/
├── simulation.py        # Python simulation backend with matplotlib charts
├── dashboard.html       # Standalone HTML/JS dashboard (no build step needed)
├── index.html           # Original prototype dashboard
├── simulation.js        # Vanilla JS simulation engine
├── styles.css           # Dashboard styles
└── webapp/              # Vite + React + Tailwind web application
    ├── src/
    │   ├── App.jsx          # Main app — state management & simulation orchestration
    │   ├── components.jsx   # All UI components
    │   ├── simulation.js    # Async simulation engine with callbacks
    │   └── index.css        # Global styles & Tailwind config
    ├── tailwind.config.js
    └── package.json
```

---

## Features

### Simulation Engine
| Technique | Mechanism | CPU Usage |
|---|---|---|
| **Programmed I/O** | CPU polls device status in a tight loop (busy-wait) | 100% occupied |
| **Interrupt-driven I/O** | CPU issues command, continues other work, wakes on IRQ | ~0% blocked |
| **DMA Transfer** | DMA controller owns the bus, transfers block directly to RAM | ~0% blocked |

- Configurable **Device Delay** (0.5s – 5s) and **Data Size** (50B – 2000B)
- Real-time wasted cycle counting for PIO
- Accurate latency and throughput calculation per run

### Live Simulation Visualizer
- Animated actor boxes (CPU ↔ Device ↔ DMAC ↔ RAM)
- Packet-travel animation on the bus
- Status labels update live during simulation
- Scrollable log terminal per technique

### Animated Flowcharts
- 5-node execution flow per technique
- Active node **pulses** while being processed
- Each node **glows** solid when step completes
- SVG arrowheads between nodes light up progressively

### Performance Analytics
- **Latency bar chart** — red/blue/green bars with pixel-height scaling
- **Throughput bar chart** — normalised across all three techniques
- **CPU Availability bar chart** — highlights 0% for PIO
- **Comparison Radar** — dynamic 5-axis SVG (CPU Avail, Throughput, Simplicity, Cost-Efficiency, Scalability) with live data

### Detailed Comparison Table
Live-updated table showing latency, throughput, CPU availability, overhead type, wasted cycles, and best use cases for each technique.

### UX
- **Run All** — runs all three simulations in parallel
- **Individual Run buttons** per technique card — run PIO, INT, or DMA independently
- Sticky header with slider controls
- Simulation status indicator in footer

---

## Running the Web App

```bash
cd webapp
npm install
npm run dev
```

Open **http://localhost:5173**

**Production build:**
```bash
npm run build   # Output in webapp/dist/
```

---

## Running the Python Simulation

```bash
pip install matplotlib
python simulation.py
```

Generates comparison plots for latency, throughput, and CPU utilization.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v3 |
| Charts | Custom SVG (no external chart library) |
| Simulation | Pure async JavaScript with callbacks |
| Python Backend | Python 3, matplotlib, threading |

---

## GitHub

[github.com/RLalithSeeker/I-O-Transfer-Simulator-COA-](https://github.com/RLalithSeeker/I-O-Transfer-Simulator-COA-.git)

| Commit | Description |
|---|---|
| `d9b1b28` | Phase 1 — Python sim + standalone HTML dashboard |
| `90788c2` | Phase 2 — React web app + UI humanization + bug fixes |
