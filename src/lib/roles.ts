export const userRoles = [
  "admin",
  "ceo",
  "marketing",
  "customer_care",
  "data_entry",
] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  admin: "Amministrazione",
  ceo: "CEO",
  marketing: "Marketing",
  customer_care: "Customer Care",
  data_entry: "Data Entry",
};

export function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}
