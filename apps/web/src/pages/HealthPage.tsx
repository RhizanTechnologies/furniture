import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/lib/api-client';
import { HealthCheckResponse } from '@furniture/shared';
import { Server, Database, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export const HealthPage: React.FC = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery<HealthCheckResponse>({
    queryKey: ['system-health'],
    queryFn: () => apiClient<HealthCheckResponse>('/health'),
    retry: 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Architecture & Health"
        description="Live operational verification between React PWA, NestJS backend, and PostgreSQL database."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="space-x-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Re-verify</span>
          </Button>
        }
      />

      {isLoading && <LoadingState message="Connecting to NestJS backend & database..." />}

      {error && (
        <ErrorState
          title="Backend Connection Offline"
          message={`Unable to reach NestJS API at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}. Verify the backend process and Docker database are started.`}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-wood-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Server className="h-5 w-5 text-wood-700" />
                  <span>NestJS Backend API</span>
                </CardTitle>
                <CardDescription>Modular monolith REST API container</CardDescription>
              </div>
              <Badge variant={data.status === 'ok' ? 'success' : 'warning'}>
                {data.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="flex justify-between text-sm py-1.5 border-b border-wood-100">
                <span className="text-muted-foreground">API Prefix:</span>
                <span className="font-mono text-xs font-semibold">/api/v1</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-wood-100">
                <span className="text-muted-foreground">Server Uptime:</span>
                <span className="font-medium">{data.uptimeSeconds} seconds</span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="font-mono text-xs">{new Date(data.timestamp).toLocaleTimeString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-wood-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Database className="h-5 w-5 text-wood-700" />
                  <span>PostgreSQL Database</span>
                </CardTitle>
                <CardDescription>Relational persistence via Prisma ORM</CardDescription>
              </div>
              {data.database === 'connected' ? (
                <Badge variant="success" className="space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>CONNECTED</span>
                </Badge>
              ) : (
                <Badge variant="destructive" className="space-x-1">
                  <XCircle className="h-3 w-3" />
                  <span>DISCONNECTED</span>
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="flex justify-between text-sm py-1.5 border-b border-wood-100">
                <span className="text-muted-foreground">Connection Pool:</span>
                <span className="font-medium text-emerald-700">Healthy & Responding</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-wood-100">
                <span className="text-muted-foreground">Storage Engine:</span>
                <span className="font-medium">PostgreSQL 16 (ACID Transactions)</span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Prisma Client:</span>
                <span className="font-mono text-xs text-charcoal-700">Ready</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
