type BarItem = {
  label: string;
  value: string;
  percentage: number;
};

export default function BarList({ items }: { items: BarItem[] }) {
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-dark-text">{item.label}</span>
            <span className="text-gray-500">{item.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div
              className="h-2.5 rounded-full bg-primary"
              style={{ width: `${Math.min(item.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
