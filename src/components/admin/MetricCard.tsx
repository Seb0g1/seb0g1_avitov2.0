import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="metric">
      <div className="toolbar" style={{ marginBottom: 0, justifyContent: "space-between" }}>
        <span className="muted">{label}</span>
        <Icon size={18} aria-hidden />
      </div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
