function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return diff + ' min ago';
  if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
  return d.toLocaleDateString();
}

function formatMoney(amount) {
  return amount.toLocaleString() + ' ETB';
}
