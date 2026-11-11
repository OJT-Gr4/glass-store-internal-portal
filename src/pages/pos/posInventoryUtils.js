export function resolvePosBranchCode(selectedBranch) {
  if (!selectedBranch || typeof selectedBranch !== 'string') return '';
  const value = selectedBranch.trim();
  if (!value) return '';
  const upper = value.toUpperCase();
  if (upper === 'BRANCH_01' || upper === 'BRANCH_02' || upper === 'LAB') {
    return upper;
  }
  const lower = value.toLowerCase();
  if (lower.includes('01') || lower.includes('q.1') || lower.includes('chi nhánh 1')) {
    return 'BRANCH_01';
  }
  if (lower.includes('02') || lower.includes('q.3') || lower.includes('chi nhánh 2')) {
    return 'BRANCH_02';
  }
  if (lower.includes('lab')) {
    return 'LAB';
  }
  return upper;
}

export function getPosSellableQuantity(inventoryRow, branchCode) {
  if (!inventoryRow || !branchCode) return 0;
  const raw =
    inventoryRow.sellableQuantities?.[branchCode]
    ?? inventoryRow.quantities?.[branchCode]
    ?? 0;
  const qty = Number(raw);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}
