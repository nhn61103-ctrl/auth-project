
import { DB_SECRET } from '../constants';

declare const CryptoJS: any;

export function encrypt(data: any): string {
  if (!data) return '';
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(str, DB_SECRET).toString();
}

export function decrypt(ciphertext: string): any {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, DB_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return ciphertext;
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  } catch (e) {
    return ciphertext;
  }
}
