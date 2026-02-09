export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} Ar`;
}
