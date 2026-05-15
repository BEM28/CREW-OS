import crypto from "crypto";

const getSecret = () => {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("KEY_ENCRYPTION_SECRET is not set in environment");
  }
  return Buffer.isBuffer(secret) ? secret : Buffer.from(secret.padEnd(32, "0").substring(0, 32), "utf8");
};

export function encryptKey(rawKey: string): string {
  const secret = getSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);

  let encrypted = cipher.update(rawKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptKey(encryptedKey: string): string {
  const secret = getSecret();
  const [ivHex, authTagHex, encryptedText] = encryptedKey.split(":");

  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error("Invalid encrypted key format. Expected iv:authTag:encrypted");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
