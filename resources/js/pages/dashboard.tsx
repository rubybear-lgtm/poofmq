import { Head, Link, usePage } from '@inertiajs/react';
import KoFiButton from '@/components/ko-fi-button';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { dashboard } from '@/routes';
import { index as apiKeysIndex } from '@/routes/api-keys';
import { index as developersIndex } from '@/routes/developers';
import { quickstart as docsQuickstart } from '@/routes/docs';
import { index as projectsIndex } from '@/routes/projects';

type Capacity = {
    base_limit_per_minute: number;
    effective_limit_per_minute: number;
    is_boost_active: boolean;
    boost_multiplier: number | null;
    boost_expires_at: string | null;
};

type Alert = {
    key: string;
    severity: string;
    message: string;
};

type Observability = {
    metrics: {
        throughput_total: number;
        error_rate_percent: number;
        avg_push_latency_ms: number;
        avg_pop_latency_ms: number;
        redis_memory_bytes: number;
    };
    alerts: Alert[];
};

type DashboardProps = {
    admin: {
        capacity: Capacity;
        observability: Observability;
    } | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

export default function Dashboard({ admin }: DashboardProps) {
    const { auth, donationUrl } = usePage().props as {
        auth: { is_admin: boolean };
        donationUrl: string | null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
                    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                PoofMQ dashboard
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Manage the core developer workflow
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Jump into projects, API keys, docs, and the
                                instant start flow from one place.
                            </p>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto">
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={projectsIndex()}>Projects</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={apiKeysIndex()}>API Keys</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={developersIndex()}>Developers</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={docsQuickstart.url()}>
                                    Quickstart docs
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {donationUrl && (
                        <div className="rounded-2xl border border-[#72a4f2]/40 bg-linear-to-br from-[#72a4f2]/14 via-background to-background p-5 shadow-[0_18px_60px_rgba(114,164,242,0.12)]">
                            <p className="text-xs font-semibold tracking-[0.2em] text-[#72a4f2] uppercase">
                                Support development
                            </p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight">
                                Help keep PoofMQ moving
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                If PoofMQ saves you time, support ongoing
                                development on Ko-fi.
                            </p>
                            <KoFiButton
                                href={donationUrl}
                                className="mt-4 w-full sm:w-auto"
                            />
                        </div>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account access</CardTitle>
                            <CardDescription>
                                What your current session can reach from the
                                dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground">
                            {auth.is_admin ? (
                                <p>
                                    Your account includes internal admin panels
                                    for capacity controls and observability.
                                </p>
                            ) : (
                                <p>
                                    Your account includes the standard developer
                                    workflow: projects, API keys, quickstart
                                    docs, and the instant start flow.
                                </p>
                            )}
                            <p>
                                Use the sidebar for day-to-day navigation and
                                the dashboard for quick entry points.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Start paths</CardTitle>
                            <CardDescription>
                                The fastest routes into the product
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={developersIndex()}>
                                    Open developer guides
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={docsQuickstart.url()}>
                                    Open quickstart docs
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href={projectsIndex()}>
                                    Manage projects
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {auth.is_admin && admin !== null && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Admin capacity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p>
                                    Effective limit:{' '}
                                    {admin.capacity.effective_limit_per_minute}{' '}
                                    req/min
                                </p>
                                <p>
                                    Baseline:{' '}
                                    {admin.capacity.base_limit_per_minute}{' '}
                                    req/min
                                </p>
                                <p>
                                    Boost:{' '}
                                    {admin.capacity.is_boost_active
                                        ? `x${admin.capacity.boost_multiplier}`
                                        : 'inactive'}
                                </p>
                                {admin.capacity.boost_expires_at !== null && (
                                    <p>
                                        Boost expires:{' '}
                                        {new Date(
                                            admin.capacity.boost_expires_at,
                                        ).toLocaleString()}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Admin observability</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p>
                                    Throughput:{' '}
                                    {
                                        admin.observability.metrics
                                            .throughput_total
                                    }{' '}
                                    ops
                                </p>
                                <p>
                                    Error rate:{' '}
                                    {
                                        admin.observability.metrics
                                            .error_rate_percent
                                    }
                                    %
                                </p>
                                <p>
                                    Avg push latency:{' '}
                                    {
                                        admin.observability.metrics
                                            .avg_push_latency_ms
                                    }{' '}
                                    ms
                                </p>
                                <p>
                                    Avg pop latency:{' '}
                                    {
                                        admin.observability.metrics
                                            .avg_pop_latency_ms
                                    }{' '}
                                    ms
                                </p>
                                <p>
                                    Redis memory:{' '}
                                    {
                                        admin.observability.metrics
                                            .redis_memory_bytes
                                    }{' '}
                                    bytes
                                </p>
                                <p>
                                    Alerts: {admin.observability.alerts.length}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
