import { StockStatus, STOCK_LEVELS } from "./catalogTypes";

export default function StockBadge({ status }: { status: StockStatus }) {
  const s = STOCK_LEVELS[status] ?? STOCK_LEVELS.in_stock;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-1">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="rounded-full inline-block"
            style={{
              width: 8, height: 8,
              background: i < s.filled ? "#f57c00" : "transparent",
              border: `1.5px solid ${i < s.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
            }} />
        ))}
      </span>
      <span className="text-xs" style={{ color: s.filled === 0 ? "#f87171" : s.filled === 1 ? "#facc15" : "#f57c00" }}>
        {s.label}
      </span>
    </span>
  );
}
