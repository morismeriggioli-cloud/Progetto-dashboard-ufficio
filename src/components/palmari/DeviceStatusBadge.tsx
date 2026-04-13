import { getPalmareStatusClasses, type PalmareComputedStatus } from "@/lib/palmari";

type DeviceStatusBadgeProps = {
  status: PalmareComputedStatus;
};

export default function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPalmareStatusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}
