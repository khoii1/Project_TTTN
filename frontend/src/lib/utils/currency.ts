export const formatVndAmount = (
  amount?: number | string | null,
): string => {
  if (
    amount === null ||
    amount === undefined ||
    (typeof amount === "string" && amount.trim() === "")
  ) {
    return "-";
  }

  const value =
    typeof amount === "number" ? amount : Number(amount.trim());

  if (!Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};
