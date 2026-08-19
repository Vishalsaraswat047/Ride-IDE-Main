const si = require("systeminformation");

(async () => {
  const [cpu, mem, graphics, fs, battery] = await Promise.all([si.cpu(), si.mem(), si.graphics(), si.fsSize(), si.battery().catch(() => null)]);
  const gpus = (graphics?.controllers ?? []).filter((g) => !g.model?.startsWith("Microsoft Basic"));
  console.log(JSON.stringify({
    cpu: `${cpu.manufacturer} ${cpu.brand} | physical:${cpu.physicalCores} threads:${cpu.cores}`,
    ramGB: { total: (mem.total / 1e9).toFixed(1), free: (mem.free / 1e9).toFixed(1) },
    gpus: gpus.map((g) => ({ name: g.model, vramGB: (g.vram / 1024).toFixed(1) })),
    freeStorageGB: (fs.reduce((a, d) => a + d.available, 0) / 1e9).toFixed(0),
    battery: battery ? { hasBattery: battery.hasBattery, isCharging: battery.isCharging, percent: battery.percent } : null,
  }, null, 2));
})();