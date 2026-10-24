// The token is kept in sessionStorage so a refresh in the same tab still works.
// sessionStorage is readable by any script on this page, so it is not production-grade
// secret storage. A production app should use an httpOnly cookie instead.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getSession() {
  return {
    token: sessionStorage.getItem("access_token"),
    username: sessionStorage.getItem("username"),
    role: sessionStorage.getItem("role"),
  };
}

export function saveSession(data) {
  sessionStorage.setItem("access_token", data.access_token);
  sessionStorage.setItem("username", data.username);
  sessionStorage.setItem("role", data.role);
}

export function clearSession() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("username");
  sessionStorage.removeItem("role");
}

function errorMessage(payload) {
  if (!payload) {
    return "Something went wrong. Please try again.";
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => String(item.msg || "Invalid input").replace(/^Value error, /, ""))
      .join(" ");
  }
  return "Something went wrong. Please try again.";
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && getSession().token) {
    headers.Authorization = `Bearer ${getSession().token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Start the backend and try again.");
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
    }
    const error = new Error(
      response.status === 401 && auth
        ? "Your session has expired. Please sign in again."
        : errorMessage(payload),
    );
    error.status = response.status;
    throw error;
  }

  return payload;
}
