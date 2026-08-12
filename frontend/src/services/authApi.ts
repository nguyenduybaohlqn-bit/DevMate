const BACKEND_URL = "http://127.0.0.1:8000/api/auth";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken?: string;
}

export async function sendSignInRequest(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${BACKEND_URL}/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  return await res.json();
}

export async function sendSignUpRequest(data: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${BACKEND_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  return await res.json();
}
