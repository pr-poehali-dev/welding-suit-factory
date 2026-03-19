import { STOCK_OPTIONS, StockStatus } from "./admin.types";

export default function StockBadge({ status }: { status: StockStatus }) {
  const opt = STOCK_OPTIONS.find(o => o.value === status) ?? STOCK_OPTIONS[1];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="rounded-full inline-block" style={{
            width: 7, height: 7,
            background: i < opt.filled ? "#f57c00" : "transparent",
            border: `1.5px solid ${i < opt.filled ? "#f57c00" : "rgba(245,124,0,0.3)"}`,
          }} />
        ))}
      </span>
      <span className="text-xs" style={{ color: opt.filled <= 1 ? "#facc15" : "#f57c00" }}>{opt.label}</span>
    </span>
  );
}
