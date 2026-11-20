export const prescriptionFields = [
  ['odSph', 'OD SPH'], ['odCyl', 'OD CYL'], ['odAxis', 'OD AXIS'], ['odAdd', 'OD ADD'],
  ['osSph', 'OS SPH'], ['osCyl', 'OS CYL'], ['osAxis', 'OS AXIS'], ['osAdd', 'OS ADD'], ['pd', 'PD'],
];

export function prescriptionDifferences(entered, clinical) {
  if (!entered || !clinical) return [];
  return prescriptionFields.filter(([key]) => {
    const left = entered[key], right = clinical[key];
    return left == null || left === '' || right == null || right === ''
      || !Number.isFinite(Number(left)) || !Number.isFinite(Number(right)) || Number(left) !== Number(right);
  });
}
