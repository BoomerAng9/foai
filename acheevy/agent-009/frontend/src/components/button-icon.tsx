import * as React from 'react'
import { Button } from './ui/button'
import { Icon } from './ui/icon'

interface ButtonIconProps extends React.ComponentProps<typeof Button> {
    name: string
    iconClassName?: string
}

const ButtonIcon = ({
    name,
    className,
    iconClassName,
    ...props
}: ButtonIconProps) => {
    return (
        <Button
            variant="secondary"
            size="icon"
            className={`size-7 rounded-full bg-white cursor-pointer ${className}`}
            {...props}
        >
            <Icon
                name={name}
                className={`size-[18px] fill-[var(--text-primary)] ${iconClassName}`}
            />
        </Button>
    )
}

export default ButtonIcon
