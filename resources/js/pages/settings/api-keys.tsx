import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { jsonHeaders } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import {
    destroy as destroyApiKey,
    index as apiKeysIndex,
} from '@/routes/api-keys';
import { index as projectsIndex } from '@/routes/projects';

type ProjectOption = {
    id: string;
    name: string;
};

type ApiKeyRecord = {
    id: string;
    name: string;
    key_prefix: string;
    project_id: string | null;
    project_name: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    revoked_by: number | null;
    created_at: string;
    is_valid: boolean;
};

type Feedback = {
    variant: 'destructive' | 'success';
    title: string;
    message: string;
};

type StatusFilter = 'all' | 'active' | 'revoked';

type Props = {
    apiKeys: ApiKeyRecord[];
    projects: ProjectOption[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'API Keys',
        href: apiKeysIndex(),
    },
];

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString();
}

function keyStatusVariant(apiKey: ApiKeyRecord): 'default' | 'destructive' {
    return apiKey.is_valid ? 'default' : 'destructive';
}

export default function ApiKeys({ apiKeys: initialApiKeys, projects }: Props) {
    const page = usePage();
    const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(initialApiKeys);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
    const [revokeCandidateId, setRevokeCandidateId] = useState<string | null>(
        null,
    );
    const initialProjectFilter = useMemo(() => {
        const query = new URL(page.url, 'https://poofmq.test').searchParams;

        return query.get('project') ?? '';
    }, [page.url]);
    const [selectedProjectId, setSelectedProjectId] =
        useState<string>(initialProjectFilter);

    const revokeCandidate = useMemo(
        () =>
            revokeCandidateId === null
                ? null
                : (apiKeys.find((apiKey) => apiKey.id === revokeCandidateId) ??
                  null),
        [apiKeys, revokeCandidateId],
    );
    const activeKeyCount = apiKeys.filter((apiKey) => apiKey.is_valid).length;
    const scopedKeyCount = apiKeys.filter(
        (apiKey) => apiKey.project_id !== null,
    ).length;
    const filteredApiKeys = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return apiKeys.filter((apiKey) => {
            if (statusFilter === 'active' && !apiKey.is_valid) {
                return false;
            }

            if (statusFilter === 'revoked' && apiKey.is_valid) {
                return false;
            }

            if (selectedProjectId !== '') {
                if (
                    selectedProjectId === '__unscoped__' &&
                    apiKey.project_id !== null
                ) {
                    return false;
                }

                if (
                    selectedProjectId !== '__unscoped__' &&
                    apiKey.project_id !== selectedProjectId
                ) {
                    return false;
                }
            }

            if (normalizedSearch === '') {
                return true;
            }

            return [
                apiKey.name,
                apiKey.project_name ?? '',
                apiKey.key_prefix,
            ].some((value) => value.toLowerCase().includes(normalizedSearch));
        });
    }, [apiKeys, searchTerm, selectedProjectId, statusFilter]);
    const hasFilters =
        searchTerm !== '' || selectedProjectId !== '' || statusFilter !== 'all';

    const handleRevokeApiKey = async () => {
        if (revokeCandidate === null) {
            return;
        }

        setFeedback(null);
        setRevokingKeyId(revokeCandidate.id);

        try {
            const response = await fetch(
                destroyApiKey.url(revokeCandidate.id),
                {
                    method: 'DELETE',
                    headers: jsonHeaders(),
                },
            );

            const payload = await response.json();

            if (!response.ok) {
                setFeedback({
                    variant: 'destructive',
                    title: 'Could not revoke API key',
                    message:
                        (payload.message as string | undefined) ??
                        'Try again in a moment.',
                });

                return;
            }

            setApiKeys((currentApiKeys) =>
                currentApiKeys.map((apiKey) =>
                    apiKey.id === revokeCandidate.id
                        ? {
                              ...apiKey,
                              revoked_at:
                                  apiKey.revoked_at ?? new Date().toISOString(),
                              is_valid: false,
                          }
                        : apiKey,
                ),
            );
            setFeedback({
                variant: 'success',
                title: 'API key revoked',
                message: payload.message as string,
            });
            setRevokeCandidateId(null);
        } finally {
            setRevokingKeyId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="API Keys" />

            <div className="space-y-6 p-4">
                <Heading
                    title="API Keys"
                    description="Review, filter, and revoke credentials across projects. Generate new keys from the project that owns the workload."
                />

                {feedback !== null && (
                    <Alert
                        variant={feedback.variant}
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <AlertTitle>{feedback.title}</AlertTitle>
                        <AlertDescription>{feedback.message}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                                {apiKeys.length}{' '}
                                {apiKeys.length === 1 ? 'key' : 'keys'}
                            </Badge>
                            <Badge variant="default">
                                {activeKeyCount} active
                            </Badge>
                            <Badge variant="outline">
                                {scopedKeyCount} project-scoped
                            </Badge>
                        </div>

                        <Card className="gap-4">
                            <CardHeader>
                                <CardTitle>Inventory filters</CardTitle>
                                <CardDescription>
                                    Narrow the list by project, status, or key
                                    name to find credentials quickly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <label
                                        htmlFor="api_key_search"
                                        className="text-sm font-medium"
                                    >
                                        Search
                                    </label>
                                    <Input
                                        id="api_key_search"
                                        value={searchTerm}
                                        onChange={(event) =>
                                            setSearchTerm(event.target.value)
                                        }
                                        placeholder="Search by key, project, or prefix"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label
                                        htmlFor="api_key_project_filter"
                                        className="text-sm font-medium"
                                    >
                                        Project
                                    </label>
                                    <select
                                        id="api_key_project_filter"
                                        value={selectedProjectId}
                                        onChange={(event) =>
                                            setSelectedProjectId(
                                                event.target.value,
                                            )
                                        }
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <option value="">All projects</option>
                                        <option value="__unscoped__">
                                            Unscoped keys
                                        </option>
                                        {projects.map((project) => (
                                            <option
                                                key={project.id}
                                                value={project.id}
                                            >
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-wrap gap-2 sm:col-span-2">
                                    {(
                                        [
                                            ['all', 'All'],
                                            ['active', 'Active'],
                                            ['revoked', 'Revoked'],
                                        ] as const
                                    ).map(([value, label]) => (
                                        <Button
                                            key={value}
                                            type="button"
                                            variant={
                                                statusFilter === value
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            onClick={() =>
                                                setStatusFilter(value)
                                            }
                                        >
                                            {label}
                                        </Button>
                                    ))}

                                    {hasFilters && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setSelectedProjectId('');
                                                setStatusFilter('all');
                                            }}
                                        >
                                            Reset filters
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {apiKeys.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="p-0 text-sm text-muted-foreground">
                                    No API keys yet. Generate project-scoped
                                    keys directly from{' '}
                                    <Link
                                        href={projectsIndex()}
                                        className="underline"
                                    >
                                        Projects
                                    </Link>
                                    .
                                </CardContent>
                            </Card>
                        )}

                        {apiKeys.length > 0 && filteredApiKeys.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="p-0 text-sm text-muted-foreground">
                                    No keys match the current filters.
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-4">
                            {filteredApiKeys.map((apiKey) => (
                                <Card key={apiKey.id} className="gap-4">
                                    <CardHeader className="gap-3 pb-0">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <CardTitle>
                                                    {apiKey.name}
                                                </CardTitle>
                                                <CardDescription>
                                                    {apiKey.project_name !==
                                                    null
                                                        ? `Scoped to ${apiKey.project_name}`
                                                        : 'Unscoped key available across projects.'}
                                                </CardDescription>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge
                                                    variant={keyStatusVariant(
                                                        apiKey,
                                                    )}
                                                >
                                                    {apiKey.is_valid
                                                        ? 'Active'
                                                        : 'Revoked'}
                                                </Badge>
                                                {apiKey.project_name !==
                                                    null && (
                                                    <Badge variant="outline">
                                                        {apiKey.project_name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                            <p className="font-medium text-foreground">
                                                Key prefix
                                            </p>
                                            <p className="mt-1 font-mono">
                                                {apiKey.key_prefix}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                            <p className="font-medium text-foreground">
                                                Created
                                            </p>
                                            <p className="mt-1">
                                                {formatDateTime(
                                                    apiKey.created_at,
                                                )}
                                            </p>
                                        </div>
                                        {apiKey.expires_at !== null && (
                                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                                <p className="font-medium text-foreground">
                                                    Expires
                                                </p>
                                                <p className="mt-1">
                                                    {formatDateTime(
                                                        apiKey.expires_at,
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        {apiKey.revoked_at !== null && (
                                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                                <p className="font-medium text-foreground">
                                                    Revoked
                                                </p>
                                                <p className="mt-1">
                                                    {formatDateTime(
                                                        apiKey.revoked_at,
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter className="justify-end">
                                        <div className="flex flex-wrap gap-2">
                                            {apiKey.project_id !== null && (
                                                <Button
                                                    asChild
                                                    type="button"
                                                    variant="secondary"
                                                >
                                                    <Link
                                                        href={projectsIndex()}
                                                    >
                                                        Open project
                                                    </Link>
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                disabled={!apiKey.is_valid}
                                                onClick={() =>
                                                    setRevokeCandidateId(
                                                        apiKey.id,
                                                    )
                                                }
                                            >
                                                Revoke key
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </section>

                    <section>
                        <Card className="sticky top-4 gap-4">
                            <CardHeader>
                                <CardTitle>Generate from Projects</CardTitle>
                                <CardDescription>
                                    Creation now lives in project context so
                                    ownership, access scope, and cleanup stay
                                    aligned.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-muted-foreground">
                                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                    Use the project page to generate keys, copy
                                    them once, and keep credentials scoped to
                                    the workload that owns them.
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button asChild type="button">
                                        <Link href={projectsIndex()}>
                                            Open Projects
                                        </Link>
                                    </Button>
                                    {projects[0] !== undefined && (
                                        <Button
                                            asChild
                                            type="button"
                                            variant="secondary"
                                        >
                                            <Link
                                                href={apiKeysIndex({
                                                    query: {
                                                        project: projects[0].id,
                                                    },
                                                })}
                                            >
                                                Filter to {projects[0].name}
                                            </Link>
                                        </Button>
                                    )}
                                </div>

                                <p>
                                    Unscoped keys are still supported
                                    technically, but they are no longer the
                                    recommended UX path.
                                </p>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>

            <Dialog
                open={revokeCandidate !== null}
                onOpenChange={(open) => {
                    if (!open && revokingKeyId === null) {
                        setRevokeCandidateId(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Revoke API key</DialogTitle>
                        <DialogDescription>
                            {revokeCandidate === null
                                ? 'Revoke this key.'
                                : `Revoke ${revokeCandidate.name}? Requests using this key will stop working immediately.`}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={revokingKeyId !== null}
                            onClick={() => setRevokeCandidateId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={revokingKeyId !== null}
                            onClick={() => void handleRevokeApiKey()}
                        >
                            {revokingKeyId !== null
                                ? 'Revoking...'
                                : 'Confirm revoke'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
