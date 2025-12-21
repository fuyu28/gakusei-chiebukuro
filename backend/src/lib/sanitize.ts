export function sanitizeUserText(input: string): string {
  const stripped = input.replace(/<[^>]*>/g, '').replace(/\u0000/g, '');
  return stripped.trim();
}
