import type { NotebookSource } from './notebooklm';

export interface SourceMetadata {
  content?: string;
  url?: string;
  notebookSourceId?: string;
}

export interface PersistedSourceRecord {
  id: string;
  notebook_id: string;
  title: string;
  type: NotebookSource['type'];
  metadata?: SourceMetadata;
}

export interface NotebookSourceRecord extends NotebookSource {
  notebookId: string;
  metadata?: SourceMetadata;
}

export interface ChatAttachment {
  id: string;
  title: string;
  kind: 'notebook-source' | 'upload';
  type: NotebookSource['type'] | 'text';
  notebookId?: string;
  sourceId?: string;
  notebookSourceId?: string;
  mimeType?: string;
  content?: string;
  url?: string;
}

export function mapPersistedSourceRecord(source: PersistedSourceRecord): NotebookSourceRecord {
  const content = source.metadata?.content;
  return {
    id: source.id,
    notebookId: source.notebook_id,
    title: source.title,
    type: source.type,
    metadata: source.metadata,
    status: 'ready',
    wordCount: content ? content.split(/\s+/).filter(Boolean).length : 0,
  };
}
