import { Folder, Loader2 } from 'lucide-react'
import { Icon } from './ui/icon'
import { getFileIconAndColor } from '@/utils/file-utils'
import type { FileUploadStatus } from '@/hooks/use-upload-files'

interface FilesPreviewProps {
    files: FileUploadStatus[]
    isUploading: boolean
    onRemove: (fileName: string) => void
}

const FilesPreview = ({ files, isUploading, onRemove }: FilesPreviewProps) => {
    if (files.length === 0) return null

    return (
        <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-2 overflow-auto pb-1">
            {files.map((file) => {
                if (file.isImage && file.preview) {
                    return (
                        <div key={file.name} className="relative shrink-0 rounded-[12px] border border-[var(--border-default)] bg-[#f7f5f1] p-1 shadow-[0_6px_18px_rgba(75,70,61,0.08)]">
                            <div className="size-14 overflow-hidden rounded-xl">
                                <img
                                    src={file.preview}
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {(isUploading || file.loading) && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-white/70">
                                    <Loader2 className="size-5 animate-spin text-white" />
                                </div>
                            )}
                            <button
                                onClick={() => onRemove(file.name)}
                                className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-[#2b2b29] text-white"
                                title={`Remove ${file.name}`}
                                aria-label={`Remove ${file.name}`}
                            >
                                <Icon name="close-circle" className="size-4" />
                            </button>
                        </div>
                    )
                }

                if (file.isFolder) {
                    return (
                        <div
                            key={file.name}
                            className="relative flex shrink-0 items-center gap-3 rounded-[12px] border border-[var(--border-default)] bg-[#f7f5f1] px-3 py-2.5 pr-8 text-[var(--text-primary)] shadow-[0_6px_18px_rgba(75,70,61,0.08)]"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--text-secondary)] border border-[var(--border-default)]">
                                {isUploading || file.loading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Folder className="size-4" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="type-body-xs-bold truncate max-w-[145px] text-[var(--text-primary)]">
                                    {file.name}
                                </span>
                                <span className="type-body-xs text-[var(--text-secondary)]">
                                    {file.fileCount ? `${file.fileCount} file${file.fileCount === 1 ? '' : 's'}` : 'Folder'}
                                </span>
                            </div>
                            <button
                                onClick={() => onRemove(file.name)}
                                className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-[#2b2b29] text-white"
                                title={`Remove ${file.name}`}
                                aria-label={`Remove ${file.name}`}
                            >
                                <Icon name="close-circle" className="size-4" />
                            </button>
                        </div>
                    )
                }

                const { label } = getFileIconAndColor(file.name)
                return (
                    <div
                        key={file.name}
                        className="relative flex shrink-0 items-center gap-3 rounded-[12px] border border-[var(--border-default)] bg-[#f7f5f1] px-3 py-2.5 pr-8 text-[var(--text-primary)] shadow-[0_6px_18px_rgba(75,70,61,0.08)]"
                    >
                        {(isUploading || file.loading) && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--text-secondary)] border border-[var(--border-default)]">
                                <Loader2 className="size-5 animate-spin" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="type-body-xs-bold truncate max-w-[145px] text-[var(--text-primary)]">
                                {file.name}
                            </span>
                            <span className="type-body-xs text-[var(--text-secondary)]">{label}</span>
                        </div>
                        <button
                            onClick={() => onRemove(file.name)}
                            className="absolute -right-1 -top-1 cursor-pointer rounded-full bg-[#2b2b29] text-white"
                            title={`Remove ${file.name}`}
                            aria-label={`Remove ${file.name}`}
                        >
                            <Icon name="close-circle" className="size-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default FilesPreview
