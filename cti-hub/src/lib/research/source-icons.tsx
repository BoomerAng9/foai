import { Database, FileText, Globe, Youtube } from 'lucide-react';
import type { NotebookSource } from './notebooklm';

export function sourceIcon(type: NotebookSource['type']) {
  if (type === 'youtube') return <Youtube className="w-4 h-4" />;
  if (type === 'url') return <Globe className="w-4 h-4" />;
  if (type === 'document' || type === 'text') return <FileText className="w-4 h-4" />;
  return <Database className="w-4 h-4" />;
}