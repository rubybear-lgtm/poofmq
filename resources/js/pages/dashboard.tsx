import { Head, Link, usePage } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    BookOpenCheck,
    CheckCircle2,
    FolderPlus,
    KeyRound,
    PencilLine,
} from 'lucide-react';
import KoFiButton from '@/components/ko-fi-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
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
    onboarding: {
        projectCount: number;
        apiKeyCount: number;
    };
    recentActivity: Array<{
        id: string;
        type: 'api_key_created' | 'project_created' | 'project_updated';
        title: string;
        description: string;
        href: string;
        occurred_at: string;
    }>;
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

function formatCount(value: number, singular: string, plural: string): string {
    return value === 1 ? `1 ${singular}` : `${value} ${plural}`;
}

export default function Dashboard({
    admin,
    onboarding,
    recentActivity,
}: DashboardProps) {
    const { auth, donationUrl } = usePage().props as {
        auth: { is_admin: boolean };
        donationUrl: string | null;
    };
    const checklistItems: Array<{
        key: string;
        complete: boolean;
        title: string;
        description: string;
        href: NonNullable<InertiaLinkProps['href']>;
        cta: string;
        icon: LucideIcon;
    }> = [
        {
            key: 'project',
            complete: onboarding.projectCount > 0,
            title: 'Create a project',
            description:
                onboarding.projectCount > 0
                    ? `${formatCount(onboarding.projectCount, 'active project', 'active projects')} ready for scoped work.`
                    : 'Start by creating a project so keys and workloads stay separated.',
            href: projectsIndex(),
            cta:
                onboarding.projectCount > 0
                    ? 'Manage projects'
                    : 'Create your first project',
            icon: FolderPlus,
        },
        {
            key: 'api-key',
            complete: onboarding.apiKeyCount > 0,
            title: 'Generate an API key',
            description:
                onboarding.apiKeyCount > 0
                    ? `${formatCount(onboarding.apiKeyCount, 'active API key', 'active API keys')} available for your integrations.`
                    : 'Generate a project-scoped API key once you have a project ready.',
            href: onboarding.apiKeyCount > 0 ? apiKeysIndex() : projectsIndex(),
            cta:
                onboarding.apiKeyCount > 0
                    ? 'Review API keys'
                    : 'Generate from a project',
            icon: KeyRound,
        },
        {
            key: 'docs',
            complete: onboarding.projectCount > 0 && onboarding.apiKeyCount > 0,
            title: 'Run the quickstart',
            description:
                onboarding.projectCount > 0 && onboarding.apiKeyCount > 0
                    ? 'Your account is ready for a full quickstart pass with a real project and key.'
                    : 'Use the quickstart guide to wire up your first push and pop flow end to end.',
            href: docsQuickstart.url(),
            cta: 'Open quickstart docs',
            icon: BookOpenCheck,
        },
    ];
    const completedChecklistSteps = checklistItems.filter(
        (item) => item.complete,
    ).length;

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
                                Move from first login to a working integration
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Projects, API keys, docs, and the developer
                                workflow are all reachable from here without
                                losing context.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge variant="secondary">
                                    {formatCount(
                                        onboarding.projectCount,
                                        'project',
                                        'projects',
                                    )}
                                </Badge>
                                <Badge variant="secondary">
                                    {formatCount(
                                        onboarding.apiKeyCount,
                                        'active key',
                                        'active keys',
                                    )}
                                </Badge>
                                <Badge variant="outline">
                                    {completedChecklistSteps}/3 setup steps
                                </Badge>
                            </div>
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
                                Tip jar
                            </p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight">
                                If PoofMQ saved you time
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Leave a tip on Ko-fi to help cover hosting and
                                ongoing development.
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
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <CardTitle>Getting started</CardTitle>
                                    <CardDescription>
                                        A lightweight checklist for the first
                                        useful PoofMQ session.
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary">
                                    {completedChecklistSteps}/3 complete
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {checklistItems.map(
                                ({
                                    complete,
                                    cta,
                                    description,
                                    href,
                                    icon: Icon,
                                    key,
                                    title,
                                }) => (
                                    <div
                                        key={key}
                                        className="flex gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4"
                                    >
                                        <div
                                            className={cn(
                                                'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                                                complete
                                                    ? 'border-primary/20 bg-primary/10 text-primary'
                                                    : 'border-border bg-background text-muted-foreground',
                                            )}
                                        >
                                            {complete ? (
                                                <CheckCircle2 className="size-5" />
                                            ) : (
                                                <Icon className="size-5" />
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium text-foreground">
                                                    {title}
                                                </p>
                                                <Badge
                                                    variant={
                                                        complete
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                >
                                                    {complete
                                                        ? 'Done'
                                                        : 'Next up'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {description}
                                            </p>
                                            <Button
                                                asChild
                                                variant={
                                                    complete
                                                        ? 'outline'
                                                        : 'default'
                                                }
                                                size="sm"
                                            >
                                                <Link href={href}>{cta}</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ),
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent activity</CardTitle>
                            <CardDescription>
                                New projects, key generation, and dashboard
                                momentum.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((item) => {
                                    const ActivityIcon =
                                        item.type === 'api_key_created'
                                            ? KeyRound
                                            : item.type === 'project_updated'
                                              ? PencilLine
                                              : FolderPlus;

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className="block rounded-2xl border border-border/70 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                                                    <ActivityIcon className="size-5" />
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <p className="font-medium text-foreground">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.description}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(
                                                            item.occurred_at,
                                                        ).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                                            <Activity className="size-5" />
                                        </div>
                                        <div className="space-y-3">
                                            <p className="font-medium text-foreground">
                                                No recent activity yet
                                            </p>
                                            <p>
                                                Create a project or generate
                                                your first API key to give the
                                                dashboard a heartbeat.
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                <Button asChild size="sm">
                                                    <Link
                                                        href={projectsIndex()}
                                                    >
                                                        Open projects
                                                    </Link>
                                                </Button>
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Link
                                                        href={developersIndex()}
                                                    >
                                                        Developer guides
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
