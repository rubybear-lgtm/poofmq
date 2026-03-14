import { Head, Link } from '@inertiajs/react';
import { Check, Copy } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import { Label } from '@/components/ui/label';
import { useClipboard } from '@/hooks/use-clipboard';
import AppLayout from '@/layouts/app-layout';
import { jsonHeaders } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { storeApiKey as storeProjectApiKey } from '@/actions/App/Http/Controllers/ProjectController';
import { index as apiKeysIndex } from '@/routes/api-keys';
import {
    destroy as destroyProject,
    index as projectsIndex,
    store as storeProject,
    update as updateProject,
} from '@/routes/projects';

type Project = {
    id: string;
    name: string;
    description: string | null;
    api_keys_count: number;
    created_at: string;
    updated_at: string;
};

type EditableProject = {
    name: string;
    description: string;
};

type ValidationErrors = Record<string, string[]>;

type Feedback = {
    variant: 'destructive' | 'success';
    title: string;
    message: string;
};

type GeneratedApiKey = {
    projectId: string;
    projectName: string;
    keyName: string;
    plainTextKey: string;
};

type Props = {
    projects: Project[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Projects',
        href: projectsIndex(),
    },
];

function mapValidationErrors(
    errors: ValidationErrors | undefined,
): Record<string, string> {
    if (errors === undefined) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(errors).map(([field, messages]) => [
            field,
            messages[0] ?? 'Invalid value.',
        ]),
    );
}

function editableProject(project: Project): EditableProject {
    return {
        name: project.name,
        description: project.description ?? '',
    };
}

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString();
}

function apiKeyLabel(count: number): string {
    return count === 1 ? '1 API key' : `${count} API keys`;
}

export default function Projects({ projects: initialProjects }: Props) {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [newProjectName, setNewProjectName] = useState<string>('');
    const [newProjectDescription, setNewProjectDescription] =
        useState<string>('');
    const [editingProjects, setEditingProjects] = useState<
        Record<string, EditableProject>
    >(
        Object.fromEntries(
            initialProjects.map((project) => [
                project.id,
                editableProject(project),
            ]),
        ),
    );
    const [createErrors, setCreateErrors] = useState<Record<string, string>>(
        {},
    );
    const [updateErrors, setUpdateErrors] = useState<
        Record<string, Record<string, string>>
    >({});
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [generatedApiKey, setGeneratedApiKey] =
        useState<GeneratedApiKey | null>(null);
    const [createProcessing, setCreateProcessing] = useState<boolean>(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(
        null,
    );
    const [generatingProjectId, setGeneratingProjectId] = useState<
        string | null
    >(null);
    const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(
        null,
    );
    const [archiveProjectId, setArchiveProjectId] = useState<string | null>(
        null,
    );
    const [archivingProjectId, setArchivingProjectId] = useState<string | null>(
        null,
    );
    const [copiedValue, copyToClipboard] = useClipboard();

    const activeProject = useMemo(
        () =>
            editingProjectId === null
                ? null
                : (projects.find(
                      (project) => project.id === editingProjectId,
                  ) ?? null),
        [editingProjectId, projects],
    );
    const archiveProject = useMemo(
        () =>
            archiveProjectId === null
                ? null
                : (projects.find(
                      (project) => project.id === archiveProjectId,
                  ) ?? null),
        [archiveProjectId, projects],
    );
    const activeDraft =
        activeProject === null
            ? null
            : (editingProjects[activeProject.id] ??
              editableProject(activeProject));
    const hasUnsavedChanges =
        activeProject !== null &&
        activeDraft !== null &&
        (activeDraft.name !== activeProject.name ||
            activeDraft.description !== (activeProject.description ?? ''));

    const projectCountLabel =
        projects.length === 1
            ? '1 active project'
            : `${projects.length} active projects`;

    const clearFeedback = () => {
        setFeedback(null);
    };

    const openEditProject = (project: Project) => {
        clearFeedback();
        setEditingProjects((currentProjects) => ({
            ...currentProjects,
            [project.id]: editableProject(project),
        }));
        setUpdateErrors((currentErrors) => ({
            ...currentErrors,
            [project.id]: {},
        }));
        setEditingProjectId(project.id);
    };

    const closeEditProject = () => {
        if (activeProject !== null) {
            setEditingProjects((currentProjects) => ({
                ...currentProjects,
                [activeProject.id]: editableProject(activeProject),
            }));
            setUpdateErrors((currentErrors) => ({
                ...currentErrors,
                [activeProject.id]: {},
            }));
        }

        setEditingProjectId(null);
    };

    const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        clearFeedback();
        setCreateProcessing(true);

        try {
            const response = await fetch(storeProject.url(), {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    name: newProjectName,
                    description: newProjectDescription || null,
                }),
            });

            const payload = await response.json();

            if (response.status === 422) {
                setCreateErrors(
                    mapValidationErrors(
                        payload.errors as ValidationErrors | undefined,
                    ),
                );

                return;
            }

            if (!response.ok) {
                setFeedback({
                    variant: 'destructive',
                    title: 'Could not create project',
                    message: 'Try again in a moment.',
                });

                return;
            }

            const createdProject = payload.project as Project;

            setProjects((currentProjects) => [
                createdProject,
                ...currentProjects,
            ]);
            setEditingProjects((currentProjects) => ({
                ...currentProjects,
                [createdProject.id]: editableProject(createdProject),
            }));
            setCreateErrors({});
            setNewProjectName('');
            setNewProjectDescription('');
            setFeedback({
                variant: 'success',
                title: 'Project created',
                message: payload.message as string,
            });
        } finally {
            setCreateProcessing(false);
        }
    };

    const handleProjectChange = (
        projectId: string,
        field: keyof EditableProject,
        value: string,
    ) => {
        setEditingProjects((currentProjects) => ({
            ...currentProjects,
            [projectId]: {
                ...(currentProjects[projectId] ?? {
                    name: '',
                    description: '',
                }),
                [field]: value,
            },
        }));
    };

    const handleGenerateApiKey = async (project: Project) => {
        clearFeedback();
        setGeneratingProjectId(project.id);

        try {
            const response = await fetch(storeProjectApiKey.url(project.id), {
                method: 'POST',
                headers: jsonHeaders(),
            });

            const payload = await response.json();

            if (!response.ok) {
                setFeedback({
                    variant: 'destructive',
                    title: 'Could not generate API key',
                    message:
                        (payload.message as string | undefined) ??
                        'Try again in a moment.',
                });

                return;
            }

            const createdApiKey = payload.api_key as {
                name: string;
                project_name: string | null;
            };

            setProjects((currentProjects) =>
                currentProjects.map((currentProject) =>
                    currentProject.id === project.id
                        ? {
                              ...currentProject,
                              api_keys_count: currentProject.api_keys_count + 1,
                          }
                        : currentProject,
                ),
            );
            setGeneratedApiKey({
                projectId: project.id,
                projectName: createdApiKey.project_name ?? project.name,
                keyName: createdApiKey.name,
                plainTextKey: payload.plain_text_key as string,
            });
            setFeedback({
                variant: 'success',
                title: 'API key generated',
                message: payload.message as string,
            });
        } finally {
            setGeneratingProjectId(null);
        }
    };

    const handleUpdateProject = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (activeProject === null || activeDraft === null) {
            return;
        }

        clearFeedback();
        setUpdatingProjectId(activeProject.id);

        try {
            const response = await fetch(updateProject.url(activeProject.id), {
                method: 'PATCH',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    name: activeDraft.name,
                    description: activeDraft.description || null,
                }),
            });

            const payload = await response.json();

            if (response.status === 422) {
                setUpdateErrors((currentErrors) => ({
                    ...currentErrors,
                    [activeProject.id]: mapValidationErrors(
                        payload.errors as ValidationErrors | undefined,
                    ),
                }));

                return;
            }

            if (!response.ok) {
                setFeedback({
                    variant: 'destructive',
                    title: 'Could not save project',
                    message: 'Try again in a moment.',
                });

                return;
            }

            const updatedProject = payload.project as Project;

            setProjects((currentProjects) =>
                currentProjects.map((currentProject) =>
                    currentProject.id === updatedProject.id
                        ? updatedProject
                        : currentProject,
                ),
            );
            setEditingProjects((currentProjects) => ({
                ...currentProjects,
                [updatedProject.id]: editableProject(updatedProject),
            }));
            setUpdateErrors((currentErrors) => ({
                ...currentErrors,
                [updatedProject.id]: {},
            }));
            setFeedback({
                variant: 'success',
                title: 'Project updated',
                message: payload.message as string,
            });
            setEditingProjectId(null);
        } finally {
            setUpdatingProjectId(null);
        }
    };

    const handleArchiveProject = async () => {
        if (archiveProject === null) {
            return;
        }

        clearFeedback();
        setArchivingProjectId(archiveProject.id);

        try {
            const response = await fetch(
                destroyProject.url(archiveProject.id),
                {
                    method: 'DELETE',
                    headers: jsonHeaders(),
                },
            );

            const payload = await response.json();

            if (!response.ok) {
                setFeedback({
                    variant: 'destructive',
                    title: 'Could not archive project',
                    message: 'Try again in a moment.',
                });

                return;
            }

            setProjects((currentProjects) =>
                currentProjects.filter(
                    (project) => project.id !== archiveProject.id,
                ),
            );
            setEditingProjects((currentProjects) => {
                const remainingProjects = { ...currentProjects };
                delete remainingProjects[archiveProject.id];

                return remainingProjects;
            });
            setUpdateErrors((currentErrors) => {
                const remainingErrors = { ...currentErrors };
                delete remainingErrors[archiveProject.id];

                return remainingErrors;
            });
            setFeedback({
                variant: 'success',
                title: 'Project archived',
                message: payload.message as string,
            });
            setArchiveProjectId(null);
        } finally {
            setArchivingProjectId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projects" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Projects"
                    description="Manage projects, keep credentials scoped to each workload, and make changes without losing context."
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

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Heading
                                variant="small"
                                title="Active projects"
                                description={`${projectCountLabel}. Start from the project card, then edit only when needed.`}
                            />
                            <Badge variant="secondary">
                                {projectCountLabel}
                            </Badge>
                        </div>

                        {projects.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="p-0 text-sm text-muted-foreground">
                                    Create your first project to start
                                    generating project-scoped API keys and
                                    organizing workloads.
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-4">
                            {projects.map((project) => (
                                <Card key={project.id} className="gap-4">
                                    <CardHeader className="gap-3 pb-0">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <CardTitle>
                                                    {project.name}
                                                </CardTitle>
                                                <CardDescription>
                                                    {project.description ??
                                                        'No description yet. Add one when the project needs more context.'}
                                                </CardDescription>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="secondary">
                                                    {apiKeyLabel(
                                                        project.api_keys_count,
                                                    )}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Updated{' '}
                                                    {formatDateTime(
                                                        project.updated_at,
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                            <p className="font-medium text-foreground">
                                                API key workflow
                                            </p>
                                            <p className="mt-1">
                                                Generate a new key directly from
                                                this project and copy it once
                                                before closing.
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                            <p className="font-medium text-foreground">
                                                Project timeline
                                            </p>
                                            <p className="mt-1">
                                                Created{' '}
                                                {formatDateTime(
                                                    project.created_at,
                                                )}
                                            </p>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="flex flex-wrap justify-between gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                disabled={
                                                    generatingProjectId ===
                                                    project.id
                                                }
                                                onClick={() =>
                                                    void handleGenerateApiKey(
                                                        project,
                                                    )
                                                }
                                            >
                                                {generatingProjectId ===
                                                project.id
                                                    ? 'Generating key...'
                                                    : 'Generate API key'}
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    openEditProject(project)
                                                }
                                            >
                                                Edit details
                                            </Button>
                                            <Button
                                                asChild
                                                type="button"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={apiKeysIndex({
                                                        query: {
                                                            project: project.id,
                                                        },
                                                    })}
                                                >
                                                    View keys
                                                </Link>
                                            </Button>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            disabled={
                                                archivingProjectId ===
                                                project.id
                                            }
                                            onClick={() =>
                                                setArchiveProjectId(project.id)
                                            }
                                        >
                                            Archive
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </section>

                    <section>
                        <Card className="sticky top-4 gap-4">
                            <CardHeader>
                                <CardTitle>Create project</CardTitle>
                                <CardDescription>
                                    Add a project, then generate scoped
                                    credentials from its card when you are
                                    ready.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="space-y-4"
                                    onSubmit={handleCreateProject}
                                >
                                    <div className="grid gap-2">
                                        <Label htmlFor="project_name">
                                            Name
                                        </Label>
                                        <Input
                                            id="project_name"
                                            name="name"
                                            value={newProjectName}
                                            onChange={(event) => {
                                                setNewProjectName(
                                                    event.target.value,
                                                );
                                            }}
                                            placeholder="Production API"
                                            required
                                        />
                                        <InputError
                                            message={createErrors.name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="project_description">
                                            Description
                                        </Label>
                                        <textarea
                                            id="project_description"
                                            name="description"
                                            rows={4}
                                            value={newProjectDescription}
                                            onChange={(event) => {
                                                setNewProjectDescription(
                                                    event.target.value,
                                                );
                                            }}
                                            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            placeholder="Internal event queue for background workers"
                                        />
                                        <InputError
                                            message={createErrors.description}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={createProcessing}
                                    >
                                        {createProcessing
                                            ? 'Creating...'
                                            : 'Create project'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>

            <Dialog
                open={editingProjectId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditProject();
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {activeProject === null
                                ? 'Edit project'
                                : `Edit ${activeProject.name}`}
                        </DialogTitle>
                        <DialogDescription>
                            Update project details without losing your place in
                            the list.
                        </DialogDescription>
                    </DialogHeader>

                    {activeProject !== null && activeDraft !== null && (
                        <form
                            className="space-y-4"
                            onSubmit={handleUpdateProject}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant={
                                        hasUnsavedChanges
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {hasUnsavedChanges
                                        ? 'Unsaved changes'
                                        : 'Saved'}
                                </Badge>
                                <Badge variant="outline">
                                    {apiKeyLabel(activeProject.api_keys_count)}
                                </Badge>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_project_name">Name</Label>
                                <Input
                                    id="edit_project_name"
                                    value={activeDraft.name}
                                    onChange={(event) =>
                                        handleProjectChange(
                                            activeProject.id,
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError
                                    message={
                                        updateErrors[activeProject.id]?.name
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_project_description">
                                    Description
                                </Label>
                                <textarea
                                    id="edit_project_description"
                                    rows={4}
                                    value={activeDraft.description}
                                    onChange={(event) =>
                                        handleProjectChange(
                                            activeProject.id,
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError
                                    message={
                                        updateErrors[activeProject.id]
                                            ?.description
                                    }
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeEditProject}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        updatingProjectId ===
                                            activeProject.id ||
                                        !hasUnsavedChanges
                                    }
                                >
                                    {updatingProjectId === activeProject.id
                                        ? 'Saving...'
                                        : 'Save changes'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={generatedApiKey !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setGeneratedApiKey(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {generatedApiKey === null
                                ? 'API key generated'
                                : `API key for ${generatedApiKey.projectName}`}
                        </DialogTitle>
                        <DialogDescription>
                            This plain text key is shown once. Copy it now
                            before closing.
                        </DialogDescription>
                    </DialogHeader>

                    {generatedApiKey !== null && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm font-medium">
                                    {generatedApiKey.keyName}
                                </p>
                                <p className="mt-2 font-mono text-sm break-all">
                                    {generatedApiKey.plainTextKey}
                                </p>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        void copyToClipboard(
                                            generatedApiKey.plainTextKey,
                                        );
                                    }}
                                    className="gap-2"
                                >
                                    {copiedValue ===
                                    generatedApiKey.plainTextKey ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Copy className="size-4" />
                                    )}
                                    {copiedValue ===
                                    generatedApiKey.plainTextKey
                                        ? 'Copied'
                                        : 'Copy key'}
                                </Button>
                                <Button asChild type="button">
                                    <Link href={apiKeysIndex()}>
                                        View all API keys
                                    </Link>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={archiveProject !== null}
                onOpenChange={(open) => {
                    if (!open && archivingProjectId === null) {
                        setArchiveProjectId(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Archive project</DialogTitle>
                        <DialogDescription>
                            {archiveProject === null
                                ? 'Archive this project.'
                                : `Archive ${archiveProject.name}? This removes it from the active list and should only be done when you are finished with it.`}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={archivingProjectId !== null}
                            onClick={() => setArchiveProjectId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={archivingProjectId !== null}
                            onClick={() => void handleArchiveProject()}
                        >
                            {archivingProjectId !== null
                                ? 'Archiving...'
                                : 'Confirm archive'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
