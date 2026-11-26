export class HttpError extends Error {
  readonly status: number
  readonly payload: Record<string, unknown>

  constructor(message: string, status: number, payload: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.payload = payload
  }
}

type RequestOptions = Omit<RequestInit, 'credentials'>

export class HttpClient {
  private readonly basePath: string
  private readonly request: typeof fetch

  constructor(basePath: string, request?: typeof fetch) {
    this.basePath = basePath
    this.request = request ?? ((input, init) => globalThis.fetch(input, init))
  }

  async get<T>(path: string): Promise<T> {
    return this.send<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>(path, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.send<T>(path, { method: 'DELETE' })
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const response = await this.request(`${this.basePath}${path}`, { ...options, credentials: 'include' })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new HttpError(typeof payload.error === 'string' ? payload.error : 'No pudimos conectar con BDC OS.', response.status, payload)
    return payload as T
  }
}
