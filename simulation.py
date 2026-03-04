"""
COA PBL - I/O Data Transfer Simulation
Compares: Programmed I/O (Polling), Interrupt-driven I/O, and DMA
"""

import time
import threading
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# -----------------------------------------------------------------------
# 1. Programmed I/O (Polling)
# -----------------------------------------------------------------------
def programmed_io(device_delay=2, data_size=100):
    """
    CPU continuously polls (busy-waits) the device status register
    until data is ready. Wastes CPU cycles.
    """
    data_buffer = []
    wasted_cycles = 0

    start_time = time.time()

    # Simulate CPU busy-polling
    poll_deadline = start_time + device_delay
    while time.time() < poll_deadline:
        wasted_cycles += 1  # Each iteration = one wasted polling cycle

    # Device is now ready — CPU reads data
    data_buffer.append("DATA" * data_size)
    end_time = time.time()

    latency = end_time - start_time
    throughput = len(data_buffer[0]) / latency
    cpu_utilization = 100.0  # CPU is 100% busy (but doing nothing useful)
    cpu_availability = 0.0   # 0% available for other tasks

    return {
        "latency": latency,
        "throughput": throughput,
        "wasted_cycles": wasted_cycles,
        "cpu_utilization": cpu_utilization,
        "cpu_availability": cpu_availability,
        "data_size_bytes": len(data_buffer[0]),
    }


# -----------------------------------------------------------------------
# 2. Interrupt-driven I/O
# -----------------------------------------------------------------------
def interrupt_io(device_delay=2, data_size=100):
    """
    CPU issues I/O request and continues other work.
    Device raises an interrupt when data is ready.
    CPU handles ISR (Interrupt Service Routine) and resumes.
    """
    data_buffer = []
    other_work_done = 0

    def device_raises_interrupt(callback):
        time.sleep(device_delay)
        data_buffer.append("DATA" * data_size)
        callback()

    def interrupt_handler():
        pass  # ISR: CPU reads data from device buffer

    start_time = time.time()

    thread = threading.Thread(target=device_raises_interrupt, args=(interrupt_handler,))
    thread.start()

    # CPU does useful work while device is busy
    work_deadline = start_time + device_delay
    while time.time() < work_deadline:
        other_work_done += 1

    thread.join()
    end_time = time.time()

    latency = end_time - start_time
    throughput = len(data_buffer[0]) / latency
    cpu_utilization = 30.0   # CPU is mostly free (handles ISR briefly)
    cpu_availability = 100.0  # Other tasks can run freely

    return {
        "latency": latency,
        "throughput": throughput,
        "wasted_cycles": 0,
        "cpu_utilization": cpu_utilization,
        "cpu_availability": cpu_availability,
        "data_size_bytes": len(data_buffer[0]),
        "other_work_done": other_work_done,
    }


# -----------------------------------------------------------------------
# 3. Direct Memory Access (DMA)
# -----------------------------------------------------------------------
def dma_io(device_delay=2, data_size=1000):
    """
    CPU programs the DMA controller (source, dest, count) and surrenders bus.
    DMA controller transfers data directly between device and memory.
    CPU gets an interrupt only when the entire transfer is complete.
    """
    start_time = time.time()

    # CPU programs DMA controller (minimal setup)
    dma_setup_cycles = 10

    # DMA transfers data autonomously (CPU is free)
    time.sleep(device_delay)
    memory_buffer = "DATA" * data_size

    end_time = time.time()

    latency = end_time - start_time
    throughput = len(memory_buffer) / latency
    cpu_utilization = 5.0    # CPU only sets up DMA + handles completion interrupt
    cpu_availability = 100.0  # CPU is entirely free during transfer

    return {
        "latency": latency,
        "throughput": throughput,
        "wasted_cycles": 0,
        "cpu_utilization": cpu_utilization,
        "cpu_availability": cpu_availability,
        "data_size_bytes": len(memory_buffer),
        "dma_setup_cycles": dma_setup_cycles,
    }


# -----------------------------------------------------------------------
# Run Experiments
# -----------------------------------------------------------------------
def run_all(device_delay=2):
    results = {
        "Programmed I/O":     programmed_io(device_delay=device_delay, data_size=100),
        "Interrupt-driven I/O": interrupt_io(device_delay=device_delay, data_size=100),
        "DMA":                dma_io(device_delay=device_delay, data_size=1000),
    }

    print("\n" + "="*65)
    print(f"  COA PBL — I/O Transfer Comparison  (delay={device_delay}s)")
    print("="*65)
    headers = ["Technique", "Latency(s)", "Throughput(B/s)", "CPU Avail%", "Wasted Cycles"]
    print(f"{'Technique':<25} {'Latency':>10} {'Throughput':>15} {'CPU Avail%':>11} {'Wasted Cycles':>14}")
    print("-"*75)
    for name, r in results.items():
        print(f"{name:<25} {r['latency']:>10.3f} {r['throughput']:>15.1f} {r['cpu_availability']:>11.1f} {r['wasted_cycles']:>14}")

    return results


# -----------------------------------------------------------------------
# Plot Graphs
# -----------------------------------------------------------------------
def plot_results(results):
    techniques = list(results.keys())
    colors = ["#ef4444", "#3b82f6", "#22c55e"]

    latencies    = [results[t]["latency"]         for t in techniques]
    throughputs  = [results[t]["throughput"]       for t in techniques]
    cpu_avail    = [results[t]["cpu_availability"] for t in techniques]
    wasted       = [results[t]["wasted_cycles"]    for t in techniques]

    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle("I/O Data Transfer Techniques — Comparative Analysis", fontsize=14, fontweight="bold")

    ax = axes[0, 0]
    ax.bar(techniques, latencies, color=colors)
    ax.set_title("Latency (seconds)")
    ax.set_ylabel("Seconds")

    ax = axes[0, 1]
    ax.bar(techniques, throughputs, color=colors)
    ax.set_title("Throughput (Bytes/sec)")
    ax.set_ylabel("Bytes/sec")

    ax = axes[1, 0]
    ax.bar(techniques, cpu_avail, color=colors)
    ax.set_ylim(0, 110)
    ax.set_title("CPU Availability (%)")
    ax.set_ylabel("% Available for other tasks")

    ax = axes[1, 1]
    ax.bar(techniques, wasted, color=colors)
    ax.set_title("Wasted CPU Cycles (Polling Overhead)")
    ax.set_ylabel("Cycle count")

    patches = [mpatches.Patch(color=colors[i], label=techniques[i]) for i in range(3)]
    fig.legend(handles=patches, loc="lower center", ncol=3, bbox_to_anchor=(0.5, -0.02))

    plt.tight_layout()
    plt.savefig("io_comparison.png", dpi=150, bbox_inches="tight")
    plt.show()


if __name__ == "__main__":
    results = run_all(device_delay=2)
    plot_results(results)
