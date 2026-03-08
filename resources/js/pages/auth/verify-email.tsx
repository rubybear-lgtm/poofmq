// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';

const resendVerificationEmailPath = '/email/verification-notification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Verify email"
            description="Please verify your email address by clicking on the link we just emailed to you."
        >
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <Alert className="mb-4">
                    <AlertDescription>
                        A new verification link has been sent to the email
                        address you provided during registration.
                    </AlertDescription>
                </Alert>
            )}

            <Form
                action={resendVerificationEmailPath}
                method="post"
                className="space-y-6 text-center"
            >
                {({ processing }) => (
                    <>
                        <Button
                            disabled={processing}
                            className="h-12 px-8 text-base"
                        >
                            {processing && <Spinner />}
                            Resend Verification Email
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Sign Out
                        </TextLink>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
