import "server-only";

import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { postgresQuery, postgresTransaction } from "@/lib/postgres";

const PASSWORD_KEY_BYTES = 64;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  session_version: number;
  created_at: string | number;
  updated_at: string | number;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  sessionVersion: number;
};

export class DuplicateEmailError extends Error {}

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    sessionVersion: Number(row.session_version),
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}

export function passwordValidationError(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 200) return "Password must be 200 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      PASSWORD_KEY_BYTES,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key))
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derivePasswordKey(password, salt);
  return `scrypt-v1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, saltValue, keyValue] = stored.split("$");
  if (version !== "scrypt-v1" || !saltValue || !keyValue) return false;
  try {
    const expected = Buffer.from(keyValue, "base64url");
    const actual = await derivePasswordKey(
      password,
      Buffer.from(saltValue, "base64url")
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function createUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<AuthUser> {
  const now = Date.now();
  try {
    const result = await postgresQuery<UserRow>(
      `INSERT INTO users (
        id, email, first_name, last_name, password_hash, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *`,
      [
        randomUUID(),
        normalizeEmail(input.email),
        input.firstName.trim().slice(0, 100),
        input.lastName.trim().slice(0, 100),
        await hashPassword(input.password),
        now,
      ]
    );
    return mapUser(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new DuplicateEmailError("An account with this email already exists.");
    }
    throw error;
  }
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const result = await postgresQuery<UserRow>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function deleteUser(id: string): Promise<void> {
  await postgresQuery("DELETE FROM users WHERE id = $1", [id]);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const result = await postgresQuery<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [normalizeEmail(email)]
  );
  const row = result.rows[0];
  if (!row) {
    await derivePasswordKey(password.slice(0, 200), Buffer.alloc(16, 7));
    return null;
  }
  return (await verifyPassword(password, row.password_hash)) ? mapUser(row) : null;
}

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(
  email: string
): Promise<string | null> {
  const userResult = await postgresQuery<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [normalizeEmail(email)]
  );
  const user = userResult.rows[0];
  if (!user) return null;

  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await postgresTransaction(async (client) => {
    await client.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL",
      [user.id]
    );
    await client.query(
      `INSERT INTO password_reset_tokens (
        id, user_id, token_hash, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), user.id, tokenDigest(token), now + PASSWORD_RESET_TTL_MS, now]
    );
  });
  return token;
}

export async function resetPasswordWithToken(
  token: string,
  password: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  const now = Date.now();
  return postgresTransaction(async (client) => {
    const tokenResult = await client.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
       FOR UPDATE`,
      [tokenDigest(token), now]
    );
    const reset = tokenResult.rows[0];
    if (!reset) return false;
    await client.query(
      `UPDATE users
       SET password_hash = $1, session_version = session_version + 1, updated_at = $2
       WHERE id = $3`,
      [passwordHash, now, reset.user_id]
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2",
      [now, reset.id]
    );
    return true;
  });
}

export async function getJwtSecret(): Promise<string> {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) {
      throw new Error("AUTH_SECRET must contain at least 32 characters.");
    }
    return configured;
  }

  const generated = randomBytes(48).toString("base64url");
  await postgresQuery(
    `INSERT INTO app_secrets (secret_key, secret_value, created_at)
     VALUES ('jwt-signing-key', $1, $2)
     ON CONFLICT (secret_key) DO NOTHING`,
    [generated, Date.now()]
  );
  const result = await postgresQuery<{ secret_value: string }>(
    "SELECT secret_value FROM app_secrets WHERE secret_key = 'jwt-signing-key'"
  );
  return result.rows[0].secret_value;
}
