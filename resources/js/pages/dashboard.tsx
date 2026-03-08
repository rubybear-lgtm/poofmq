import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
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

type FundingSummary = {
    gross_donations_cents: number;
    refunds_cents: number;
    net_funding_cents: number;
    event_count: number;
};

type FundingHistoryItem = {
    id: string;
    provider: string;
    provider_event_id: string;
    event_type: string;
    amount_cents: number;
    currency: string;
    donor_name: string | null;
    happened_at: string;
};

type BillingLatest = {
    balance_cents: number;
    month_to_date_spend_cents: number;
    runway_months: number;
    captured_at: string;
} | null;

type Billing = {
    latest: BillingLatest;
    trend: {
        balance_delta_cents: number;
        spend_delta_cents: number;
    };
};

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
    runbook: string;
};

type ObservabilityMetrics = {
    throughput_total: number;
    error_rate_percent: number;
    avg_push_latency_ms: number;
    avg_pop_latency_ms: number;
    redis_memory_bytes: number;
    burn_rate_cents_per_day: number;
};

type Observability = {
    metrics: ObservabilityMetrics;
    alerts: Alert[];
};

type DashboardProps = {
    funding: {
        summary: FundingSummary;
        history: FundingHistoryItem[];
    };
    billing: Billing;
    capacity: Capacity;
    observability: Observability;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
});

function formatCents(cents: number): string {
    return currencyFormatter.format(cents / 100);
}

function formatBytes(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);

    return `${megabytes.toFixed(2)} MB`;
}

function MetricRow({
    label,
    value,
    emphasize = false,
}: {
    label: string;
    value: ReactNode;
    emphasize?: boolean;
}) {
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 first:pt-0 last:border-b-0 last:pb-0">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
                {label}
            </span>
            <span
                className={
                    emphasize
                        ? 'font-mono text-sm font-medium text-primary'
                        : 'font-mono text-sm text-foreground'
                }
            >
                {value}
            </span>
        </div>
    );
}

export default function Dashboard({
    funding,
    billing,
    capacity,
    observability,
}: DashboardProps) {
    const billingLatest = billing.latest;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="space-y-6 p-6">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funding</CardTitle>
                            <CardDescription>
                                Donation ledger aggregate
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MetricRow
                                label="Net"
                                value={formatCents(
                                    funding.summary.net_funding_cents,
                                )}
                                emphasize
                            />
                            <MetricRow
                                label="Gross"
                                value={formatCents(
                                    funding.summary.gross_donations_cents,
                                )}
                            />
                            <MetricRow
                                label="Refunds"
                                value={formatCents(
                                    funding.summary.refunds_cents,
                                )}
                            />
                            <MetricRow
                                label="Events"
                                value={funding.summary.event_count}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Railway billing</CardTitle>
                            <CardDescription>
                                Latest balance and runway
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {billingLatest === null ? (
                                <p className="text-sm text-muted-foreground">
                                    No billing snapshots yet.
                                </p>
                            ) : (
                                <>
                                    <MetricRow
                                        label="Balance"
                                        value={formatCents(
                                            billingLatest.balance_cents,
                                        )}
                                        emphasize
                                    />
                                    <MetricRow
                                        label="Spend MTD"
                                        value={formatCents(
                                            billingLatest.month_to_date_spend_cents,
                                        )}
                                    />
                                    <MetricRow
                                        label="Runway"
                                        value={`${billingLatest.runway_months.toFixed(2)} months`}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Capacity limit</CardTitle>
                            <CardDescription>
                                Active rate limit controls
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-0">
                                <MetricRow
                                    label="Effective"
                                    value={`${capacity.effective_limit_per_minute} req/min`}
                                    emphasize
                                />
                                <MetricRow
                                    label="Baseline"
                                    value={`${capacity.base_limit_per_minute} req/min`}
                                />
                            </div>
                            {capacity.is_boost_active ? (
                                <Badge variant="default">
                                    Boost x{capacity.boost_multiplier}
                                </Badge>
                            ) : (
                                <Badge variant="outline">No active boost</Badge>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Observability</CardTitle>
                            <CardDescription>
                                Runtime SLO indicators
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MetricRow
                                label="Throughput"
                                value={`${observability.metrics.throughput_total} ops`}
                            />
                            <MetricRow
                                label="Error rate"
                                value={`${observability.metrics.error_rate_percent.toFixed(2)}%`}
                            />
                            <MetricRow
                                label="Redis memory"
                                value={formatBytes(
                                    observability.metrics.redis_memory_bytes,
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funding history</CardTitle>
                            <CardDescription>
                                Most recent donation ledger entries
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {funding.history.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No donation ledger entries yet.
                                </p>
                            ) : (
                                funding.history.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="rounded-xl border border-border bg-muted/30 px-4 py-3"
                                    >
                                        <p className="font-medium text-foreground">
                                            {entry.event_type}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {formatCents(entry.amount_cents)}{' '}
                                            via {entry.provider}
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Active alerts</CardTitle>
                            <CardDescription>
                                Threshold-driven operational alerts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {observability.alerts.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No active alerts.
                                </p>
                            ) : (
                                observability.alerts.map((alert) => (
                                    <div
                                        key={alert.key}
                                        className="rounded-xl border border-border bg-muted/30 px-4 py-3"
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    alert.severity ===
                                                    'critical'
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                            >
                                                {alert.severity}
                                            </Badge>
                                            <span className="font-medium text-foreground">
                                                {alert.key}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground">
                                            {alert.message}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {alert.runbook}
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
