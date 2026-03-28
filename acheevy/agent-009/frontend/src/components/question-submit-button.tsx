import { Button } from './ui/button'
import { Icon } from './ui/icon'

interface SubmitButtonProps {
  isLoading: boolean
  isCreatingSession: boolean
  disabled: boolean
  onCancel?: () => void
  onSubmit: () => void
}

const SubmitButton = ({ isLoading, isCreatingSession, disabled, onCancel, onSubmit }: SubmitButtonProps) => {
  if (isLoading && onCancel) {
    return (
      <Button
        onClick={onCancel}
        title="Stop generating"
        aria-label="Stop generating"
        className="cursor-pointer h-11 min-w-11 rounded-[12px] border border-[#d8c7c0] bg-[#f6ece8] p-0 text-[#7c4d42] hover:scale-105 hover:bg-[#f1e3dd] active:scale-95 transition-transform"
      >
        <div className="size-4 rounded-sm bg-current" />
      </Button>
    )
  }

  return (
    <Button
      disabled={disabled}
      onClick={onSubmit}
      title="Send message"
      aria-label="Send message"
      className={`cursor-pointer h-11 min-w-11 rounded-[12px] border border-[var(--border-default)] font-semibold ${isCreatingSession ? 'bg-[#f3f1ed] text-[var(--text-primary)]' : 'bg-[#1f1f1d] text-white hover:bg-[#2b2b29]'}`}
    >
      {isCreatingSession ? (
        <Icon name="loading" className="animate-spin size-5 fill-current" />
      ) : (
        <Icon name="arrow-up" className="fill-current" />
      )}
    </Button>
  )
}

export default SubmitButton

