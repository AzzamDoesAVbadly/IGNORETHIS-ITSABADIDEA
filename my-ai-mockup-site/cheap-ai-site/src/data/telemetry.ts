const telemetryData = [
  {
    id: 1,
    metric: "CPU Usage",
    value: "87%",
    status: "Critical",
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    metric: "Memory Usage",
    value: "92%",
    status: "Critical",
    timestamp: new Date().toISOString(),
  },
  {
    id: 3,
    metric: "Disk Space",
    value: "15GB",
    status: "Warning",
    timestamp: new Date().toISOString(),
  },
  {
    id: 4,
    metric: "Network Latency",
    value: "250ms",
    status: "Normal",
    timestamp: new Date().toISOString(),
  },
  {
    id: 5,
    metric: "System Uptime",
    value: "72 hours",
    status: "Normal",
    timestamp: new Date().toISOString(),
  },
  {
    id: 6,
    metric: "Error Rate",
    value: "5%",
    status: "Warning",
    timestamp: new Date().toISOString(),
  },
];

export default telemetryData;