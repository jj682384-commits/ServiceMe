#!/usr/bin/env node
// Kill any processes listening on the given ports using /proc/net/tcp
const fs = require("fs");

const ports = process.argv.slice(2).map(Number).filter(Boolean);
if (!ports.length) process.exit(0);

for (const port of ports) {
  const hex = port.toString(16).toUpperCase().padStart(4, "0");
  const inodes = new Set();

  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    try {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[1] && parts[1].toUpperCase().endsWith(":" + hex)) {
          inodes.add(parts[9]);
        }
      }
    } catch (_) {}
  }

  if (!inodes.size) continue;

  const myPid = process.pid;
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = parseInt(entry);
    if (pid === myPid) continue;
    try {
      const fds = fs.readdirSync(`/proc/${pid}/fd`);
      for (const fd of fds) {
        try {
          const link = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
          if ([...inodes].some((i) => link === `socket:[${i}]`)) {
            process.kill(pid, "SIGKILL");
            console.log(`Killed PID ${pid} holding port ${port}`);
            break;
          }
        } catch (_) {}
      }
    } catch (_) {}
  }
}
