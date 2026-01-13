import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.AUTH_SECRET || "default-secret-key-change-this";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // Session lasts 24 hours
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function login(password: string) {
  // Verify Password
  if (password !== process.env.ADMIN_PASSWORD) {
    return false;
  }

  // Create Session
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const session = await encrypt({ role: "admin", expires });

  const cookieStore = await cookies();

  cookieStore.set("admin_session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}
