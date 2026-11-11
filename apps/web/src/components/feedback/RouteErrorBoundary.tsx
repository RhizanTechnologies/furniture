import React, { useState } from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  ShieldAlert,
  Armchair,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  let title = 'Something went wrong';
  let message = 'An unexpected error interrupted this view. Your offline data is safe.';
  let statusCode: number | null = null;
  let icon = <AlertTriangle className="h-8 w-8 text-amber-600" />;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      title = 'Page Not Found';
      message = "The page or record you are trying to view does not exist or has been moved.";
      icon = <FileQuestion className="h-8 w-8 text-wood-700" />;
    } else if (error.status === 403) {
      title = 'Access Restricted';
      message = 'You do not have permission to access this module with your current user role.';
      icon = <ShieldAlert className="h-8 w-8 text-red-600" />;
    } else {
      title = `Error ${error.status}: ${error.statusText || 'Application Error'}`;
      message = error.data?.message || 'A routing error occurred while rendering this page.';
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  const errorStack =
    error instanceof Error
      ? error.stack
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error, null, 2)
      : String(error || 'Unknown application error');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-wood-200/90 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl shadow-xl p-6 sm:p-8 text-center space-y-6">
        {/* Visual Brand Badge & Icon */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center shadow-inner">
            {icon}
          </div>
          {statusCode && (
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              HTTP {statusCode}
            </span>
          )}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-wood-950 dark:text-wood-100">
            {title}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300 max-w-md leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto bg-wood-700 hover:bg-wood-800 text-white space-x-1.5 h-9"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Page</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto border-wood-200 hover:bg-wood-50 text-wood-900 space-x-1.5 h-9"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>

          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              className="w-full text-stone-700 hover:text-stone-900 space-x-1.5 h-9"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>
          </Link>
        </div>

        {/* Technical Details Accordion for Developers / Troubleshooting */}
        <div className="pt-4 border-t border-dashed border-stone-200 dark:border-stone-800 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 py-1"
          >
            <span>Technical Diagnostics</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showDetails && (
            <div className="mt-2 p-3 rounded-lg bg-stone-950 text-stone-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 border border-stone-800 shadow-inner">
              <pre className="whitespace-pre-wrap break-all">{errorStack}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
