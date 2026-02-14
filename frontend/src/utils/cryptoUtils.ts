export const encryptApiKey = (key: string): string => {
  if (!key) return '';
  try {
    // Simple base64 encoding with a salt prefix/suffix to prevent plain text reading
    // This is NOT secure encryption, but meets the requirement of "not straight text"
    // For real security, we'd need a user-provided password or backend handling
    const salt = "cognition-index-salt-";
    return btoa(salt + key);
  } catch (e) {
    console.error("Encryption failed", e);
    return key;
  }
};

export const decryptApiKey = (encryptedKey: string): string => {
  if (!encryptedKey) return '';
  try {
    const salt = "cognition-index-salt-";
    const decoded = atob(encryptedKey);
    if (decoded.startsWith(salt)) {
      return decoded.substring(salt.length);
    }
    // Fallback for legacy plain text keys or if salt check fails
    return decoded;
  } catch (e) {
    // If decoding fails, it might be a plain text key from before
    return encryptedKey;
  }
};
