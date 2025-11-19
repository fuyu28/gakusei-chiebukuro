const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email.length > 0);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.toLowerCase();
  return adminEmails.includes(normalized);
}
