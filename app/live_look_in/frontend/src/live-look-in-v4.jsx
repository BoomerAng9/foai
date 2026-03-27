import { useState, useEffect, useRef, useCallback } from "react";

const STATUS_COLORS = {
  healthy: "#22c55e",
  online: "#22c55e",
  active: "#3b82f6",
  monitoring: "#3b82f6",
  directive_received: "#f59e0b",
  unhealthy: "#ef4444",
  unreachable: "#ef4444",
  offline: "#6b7280",
  no_data: "#6b7280",
  unknown: "#6b7280",
};

function statusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.unknown;
}

function Pulse({ color }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        marginRight: 8,
        animation: "pulse 2s infinite",
      }}
    />
  );
}

function ServiceCard({ name, data }) {
  const color = statusColor(data.status);
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Pulse color={color} />
        <span style={styles.cardTitle}>{name}</span>
      </div>
      <div style={{ ...styles.statusBadge, backgroundColor: color + "22", color }}>
        {data.status}
      </div>
      {data.http_code && (
        <div style={styles.meta}>HTTP {data.http_code}</div>
      )}
    </div>
  );
}

function AgentCard({ name, data }) {
  const status = data.status || "no_data";
  const color = statusColor(status);
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Pulse color={color} />
        <span style={styles.cardTitle}>{name}</span>
      </div>
      <div style={{ ...styles.statusBadge, backgroundColor: color + "22", color }}>
        {status}
      </div>
      {data.currentTask && (
        <div style={styles.task}>{data.currentTask}</div>
      )}
      {data.lastUpdated && (
        <div style={styles.meta}>{new Date(data.lastUpdated).toLocaleTimeString()}</div>
      )}
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div style={styles.metricBox}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

export default function LiveLookIn() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setLastUpdate(msg.timestamp);

      if (msg.type === "full") {
        setState(msg.data);
      } else if (msg.type === "diff") {
        setState((prev) => {
          if (!prev) return msg.data;
          const next = { ...prev };
          if (msg.data.agents) next.agents = { ...prev.agents, ...msg.data.agents };
          if (msg.data.services) next.services = { ...prev.services, ...msg.data.services };
          if (msg.data.metrics) next.metrics = { ...prev.metrics, ...msg.data.metrics };
          return next;
        });
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const services = state?.services || {};
  const agents = state?.agents || {};
  const metrics = state?.metrics || {};
  const healthyCount = Object.values(services).filter((s) => s.status === "healthy").length;
  const totalServices = Object.keys(services).length;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>FOAI-AIMS Live Look In</h1>
        <div style={styles.headerRight}>
          <Pulse color={connected ? "#22c55e" : "#ef4444"} />
          <span style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 13 }}>
            {connected ? "LIVE" : "RECONNECTING"}
          </span>
          {lastUpdate && (
            <span style={styles.timestamp}>
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* Metrics */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Revenue Engine</h2>
        <div style={styles.metricsRow}>
          <MetricBox label="Revenue" value={`$${(metrics.total_revenue || 0).toFixed(2)}`} />
          <MetricBox label="Enrollments" value={metrics.enrollment_count || 0} />
          <MetricBox label="Open Seats" value={metrics.open_seats_tracked || 0} />
          <MetricBox label="Fleet Health" value={`${healthyCount}/${totalServices}`} />
        </div>
      </section>

      {/* Services */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Services ({totalServices})</h2>
        <div style={styles.grid}>
          {Object.entries(services).map(([name, data]) => (
            <ServiceCard key={name} name={name} data={data} />
          ))}
        </div>
      </section>

      {/* Agents */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Agents ({Object.keys(agents).length})</h2>
        <div style={styles.grid}>
          {Object.entries(agents).map(([name, data]) => (
            <AgentCard key={name} name={name} data={data} />
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "24px 32px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    borderBottom: "1px solid #1e293b",
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    background: "linear-gradient(135deg, #3b82f6, #22c55e)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 12,
  },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 16,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: "16px 18px",
    border: "1px solid #1e293b",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  statusBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  task: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
    wordBreak: "break-word",
  },
  meta: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
  },
  metricBox: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: "20px 18px",
    border: "1px solid #1e293b",
    textAlign: "center",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
};
