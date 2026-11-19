export const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const validPhone = value => /^(0\d{9}|\+84\d{9})$/.test(value.replace(/[\s.-]/g, ''));

export function passwordStrength(value) {
  if (value.length < 6) return 'Yếu';
  return value.length >= 10 && /[A-Z]/.test(value) && /\d/.test(value) ? 'Mạnh' : 'Trung bình';
}
