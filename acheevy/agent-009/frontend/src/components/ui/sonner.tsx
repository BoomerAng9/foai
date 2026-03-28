import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = 'system' } = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps['theme']}
            className="toaster group"
            style={
                {
                    '--normal-bg': 'var(--color-white)',
                    '--normal-text': 'var(--surface-raised)',
                    '--normal-border': 'var(--neutral-200)'
                } as React.CSSProperties
            }
            {...props}
        />
    )
}

export { Toaster }
