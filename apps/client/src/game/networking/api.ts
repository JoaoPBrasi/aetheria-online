import {
  CharacterSummarySchema,
  SessionResponseSchema,
  type CreateCharacterInput,
} from '@aetheria/shared';
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request(path: string, token?: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? '{}' : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data: unknown = await response.json().catch(() => {
    throw new RequestError(
      response.status,
      'Servidor indisponível ou resposta inválida. Tente novamente.',
    );
  });
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? (data as { error: { message?: string } }).error.message
        : undefined;
    throw new RequestError(
      response.status,
      message ?? 'Falha ao contatar o servidor.',
    );
  }
  return data;
}
const SESSION_KEY = 'aetheria.dev-session.v1';
export async function resumeSession() {
  const token = localStorage.getItem(SESSION_KEY) ?? undefined;
  const session = SessionResponseSchema.parse(
    await request('/api/dev/session', token),
  );
  localStorage.setItem(SESSION_KEY, session.token);
  return session;
}
export async function newLocalIdentity() {
  localStorage.removeItem(SESSION_KEY);
  return resumeSession();
}
export async function createCharacter(
  token: string,
  input: CreateCharacterInput,
) {
  return CharacterSummarySchema.parse(
    await request('/api/characters', token, input),
  );
}
