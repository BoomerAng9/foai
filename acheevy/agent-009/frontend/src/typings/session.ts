import { ISession, IEvent } from './agent'
import type { SessionSettingsEnvelope } from './session-context'

export interface SessionsResponse {
    sessions: ISession[]
}

export interface SessionEventsResponse {
    events: IEvent[]
}

export interface CreateSessionRequest {
    deviceId: string
    name?: string
}

export interface UpdateSessionRequest {
    name?: string
    status?: string
    settings?: SessionSettingsEnvelope | null
}

export interface SessionFile {
    id: string
    name: string
    content_type?: string
    url: string
    size: number
}

export interface SessionFilesResponse {
    files: SessionFile[]
}
