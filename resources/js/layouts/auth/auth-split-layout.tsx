import { Link, usePage } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import type { AuthLayoutProps } from '@/types';
import { home } from '@/routes';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col overflow-hidden border-r border-border bg-muted p-10 lg:flex">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.96_0.02_75),transparent_45%),linear-gradient(to_bottom,oklch(0.99_0_0),oklch(0.96_0_005_270))] dark:bg-[radial-gradient(circle_at_top_left,oklch(0.2_0.02_75),transparent_35%),linear-gradient(to_bottom,oklch(0.16_0.01_270),oklch(0.1_0_0))]" />
                <Link href={home()} className="relative z-20">
                    <AppLogo />
                </Link>
                <div className="relative z-20 mt-auto max-w-sm space-y-3">
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                        {name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Authentication and account management stay in the same
                        visual system as the rest of the product.
                    </p>
                </div>
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex items-center justify-center lg:hidden"
                    >
                        <AppLogo />
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
