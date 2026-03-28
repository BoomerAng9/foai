import { useRef, useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './ui/dropdown-menu'
import { Icon } from './ui/icon'

interface QuestionFileUploadProps {
    onFileChange: (files: File[]) => void
    onGoogleDriveClick?: () => void
    isDisabled?: boolean
    isGoogleDriveConnected?: boolean
    isGoogleDriveAuthLoading?: boolean
}

const QuestionFileUpload = ({
    onFileChange,
    onGoogleDriveClick,
    isDisabled,
    isGoogleDriveConnected = false,
    isGoogleDriveAuthLoading = false
}: QuestionFileUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isOpen, setIsOpen] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return

        const filesToUpload = Array.from(e.target.files)
        onFileChange(filesToUpload)

        // Clear the input
        e.target.value = ''
    }

    const handleLocalUpload = () => {
        fileInputRef.current?.click()
        setIsOpen(false)
    }

    const handleGoogleDrive = () => {
        setIsOpen(false)
        if (!onGoogleDriveClick) return
        onGoogleDriveClick()
    }

    return (
        <>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        disabled={isDisabled}
                        aria-label="Add files"
                        className="inline-flex size-11 items-center justify-center rounded-[12px] border border-[var(--border-default)] bg-white text-[var(--text-primary)] transition hover:border-[var(--border-brand-strong)] hover:bg-[#f3f1ed] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Icon name="plus" className="size-5 fill-current" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-64 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-raised)] p-2 text-[var(--text-primary)] shadow-[0_10px_24px_rgba(75,70,61,0.08)]"
                >
                    <DropdownMenuItem
                        onClick={handleLocalUpload}
                        disabled={isDisabled}
                        className="cursor-pointer rounded-xl px-3 py-3"
                    >
                        <Icon name="link" className="size-5 fill-current" />
                        Add images and files
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleGoogleDrive}
                        disabled={
                            isDisabled ||
                            isGoogleDriveAuthLoading ||
                            !onGoogleDriveClick
                        }
                        className="cursor-pointer rounded-xl px-3 py-3"
                    >
                        {isGoogleDriveAuthLoading ? (
                            <Icon
                                name="spinner"
                                className="size-5 animate-spin fill-current"
                            />
                        ) : (
                            <Icon
                                name="google-drive"
                                className="size-5 fill-current"
                            />
                        )}
                        {isGoogleDriveConnected
                            ? 'Add from Google Drive'
                            : 'Connect with Google Drive'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isDisabled}
                title="Upload files"
            />
        </>
    )
}

export default QuestionFileUpload
