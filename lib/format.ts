export function formatReward(type: string, amount: number | null) {
  if (type === "paid" && amount) return `₹${Number(amount).toLocaleString("en-IN")}`;
  if (type === "paid") return "Paid";
  if (type === "certificate") return "Certificate";
  if (type === "interview") return "Interview";
  return "Unpaid";
}

export function formatDeadline(deadline: string | null) {
  if (!deadline) return "No deadline";
  const d = new Date(deadline);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return "Closed";
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}
