import { promotionApi } from '../api/promotionApi';
// Protected membership rank comes from the loyalty account, never the remaining balance.
export async function enrichCustomerLoyalty(customers) {
  const result = [...customers];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, customers.length) }, async () => {
    while (next < customers.length) {
      const index = next++;
      try {
        const account = await promotionApi.account(customers[index].id);
        result[index] = { ...customers[index], tier: account.tier, tierCode: account.tierCode, loyaltyPoints: Number(account.balance || 0) };
      } catch { result[index] = { ...customers[index], tier: 'Chưa tải được hạng' }; }
    }
  }));
  return result;
}
