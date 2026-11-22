import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "bk_session";
export const SESSION_SHORT_MAX_AGE = 60 * 60 * 24; // 1 hari
export const SESSION_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari
export const SESSION_MAX_AGE = SESSION_REMEMBER_MAX_AGE;

export function isStaffRole(role) {
  return role === "ADMIN" || role === "MODERATOR";
}

function getSecretKey() {
  const secret =
    process.env.JWT_SECRET ||
    "bedahkarya-dev-secret-key-minimal-32-karakter-2026";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload, { rememberMe = false } = {}) {
  const subject = String(payload.sub || payload.id || "");
  if (!subject) {
    throw new Error("Subject ID wajib ada untuk membuat token sesi.");
  }

  const ttlSeconds = rememberMe
    ? SESSION_REMEMBER_MAX_AGE
    : SESSION_SHORT_MAX_AGE;

  return new SignJWT({
    username: payload.username,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (!payload?.sub || !payload?.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSafeRedirectPath(nextPath, role) {
  const defaultPath = isStaffRole(role) ? "/admin" : "/";

  if (
    typeof nextPath !== "string" ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    nextPath.includes("\\")
  ) {
    return defaultPath;
  }

  if (
    !isStaffRole(role) &&
    (nextPath === "/admin" || nextPath.startsWith("/admin/"))
  ) {
    return "/";
  }

  if (nextPath === "/login" || nextPath === "/register") {
    return defaultPath;
  }

  return nextPath;
}
