import { useGoogleLogin } from '@react-oauth/google'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID
const enableEmailAuth = import.meta.env.VITE_ENABLE_EMAIL_AUTH === 'true'

function GoogleSignupButton({ onSuccess }: { onSuccess: (code: string) => void }) {
    const googleLogin = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: async (codeResponse) => {
            onSuccess(codeResponse.code)
        },
        onError: (errorResponse) => {
            console.log('Login Failed:', errorResponse)
        }
    })

    return (
        <Button
            size="xl"
            onClick={() => googleLogin()}
            className="w-full bg-white text-black font-semibold shadow-btn"
        >
            <Icon name="google" className="size-[22px]" />
            Continue with Google Account
        </Button>
    )
}

const FormSchema = z.object({
    name: z.string({ error: 'Name is required' }).min(1, {
        message: 'Name is required'
    }),
    email: z.email({ error: 'Invalid email address' }),
    password: z.string({ error: 'Password is required' }).min(6, {
        message: 'Password must be at least 6 characters'
    })
})

export function SignupPage() {
    const navigate = useNavigate()
    const { loginWithAuthCode } = useAuth()
    const showEmailAuth = enableEmailAuth
    const showDivider = showEmailAuth && hasGoogleClientId

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: '',
            email: '',
            password: ''
        }
    })

    const handleGoogleSuccess = async (code: string) => {
        try {
            await loginWithAuthCode(code)
            navigate('/')
        } catch (error) {
            console.error('Failed to login with auth code:', error)
        }
    }

    const onSubmit = async (data: z.infer<typeof FormSchema>) => {
        console.log(data)
    }

    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <h1 className="type-h1 dark:text-[var(--text-brand)]">
                Welcome to ACHEEVY
            </h1>
            <p className="type-h2 dark:text-[var(--text-brand)] mb-12">
                Helping you with your task today
            </p>

            <div className="flex flex-col w-full justify-center max-w-[510px]">
                {showEmailAuth && (
                    <>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="flex flex-col gap-10"
                            >
                                <div className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="space-y-2 relative">
                                                        <Icon
                                                            name="user"
                                                            className="absolute top-3 left-4 fill-black dark:fill-white"
                                                        />
                                                        <Input
                                                            id="name"
                                                            className="pl-[56px]"
                                                            type="text"
                                                            placeholder="Enter your name"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="space-y-2 relative">
                                                        <Icon
                                                            name="email"
                                                            className="absolute top-3 left-4 fill-black dark:fill-white"
                                                        />
                                                        <Input
                                                            id="email"
                                                            className="pl-[56px]"
                                                            type="text"
                                                            placeholder="Enter your email address"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="space-y-2 relative">
                                                        <Icon
                                                            name="key"
                                                            className="absolute top-3 left-4 fill-black dark:fill-white"
                                                        />
                                                        <Input
                                                            id="password"
                                                            className="pl-[56px]"
                                                            type="password"
                                                            placeholder="Enter your password"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="w-full flex justify-center">
                                    <Button
                                        type="submit"
                                        size="xl"
                                        className=" bg-[var(--bg-base)] text-[var(--text-brand)] dark:bg-[var(--text-brand)] dark:text-[var(--bg-base)] font-semibold w-full max-w-[247px]"
                                        disabled={!form.formState.isValid}
                                    >
                                        Sign up
                                    </Button>
                                </div>
                            </form>
                        </Form>
                        <div className="flex justify-center items-center gap-2 dark:text-white text-sm mt-8">
                            <span>Already have an account?</span>
                            <Link
                                to="/login"
                                className="dark:text-white text-sm font-semibold"
                            >
                                Sign in
                            </Link>
                        </div>
                        {showDivider && (
                            <div className="flex w-full items-center gap-4 my-10">
                                <p className="flex-1 dark:bg-white/[0.31] h-[1px]"></p>
                                <span className="text-sm dark:text-white font-semibold">
                                    OR
                                </span>
                                <p className="flex-1 dark:bg-white/[0.31] h-[1px]"></p>
                            </div>
                        )}
                    </>
                )}
                {hasGoogleClientId && (
                    <GoogleSignupButton onSuccess={handleGoogleSuccess} />
                )}
                {!showEmailAuth && !hasGoogleClientId && (
                    <p className="mt-6 text-center text-sm dark:text-white/70 text-black/70">
                        Authentication is not configured for this environment.
                    </p>
                )}
            </div>
        </div>
    )
}

export const Component = SignupPage
