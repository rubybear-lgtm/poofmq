<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified as Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified extends Middleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle($request, Closure $next, $redirectToRoute = null): Response
    {
        if (! config('fortify.email_verification_required')) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute);
    }
}
