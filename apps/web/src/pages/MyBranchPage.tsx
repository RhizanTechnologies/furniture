import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/lib/api-client';
import { BranchDto, StockMode } from '@furniture/shared';
import { useLanguage } from '@/context/LanguageContext';
import { Building2, MapPin, Phone, Layers, ShieldCheck, UserCheck } from 'lucide-react';

export const MyBranchPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: branch, isLoading, error, refetch } = useQuery<BranchDto>({
    queryKey: ['my-branch', user?.branchId],
    queryFn: () => apiClient<BranchDto>(`/branches/${user?.branchId}`),
    enabled: !!user?.branchId,
  });

  if (!user?.branchId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-amber-800">{t('myBranch.title', 'No Branch Assigned')}</h2>
        <p className="text-sm text-charcoal-600 mt-2">
          {t('myBranch.subtitle', 'Your administrator account has not been assigned to a specific branch yet. Please contact the Business Owner.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('myBranch.title', 'My Assigned Branch')}
        description={t('myBranch.subtitle', 'Operational settings and inventory configuration for your local workshop / showroom.')}
      />

      {isLoading && <LoadingState message="Fetching your branch details..." />}

      {error && (
        <ErrorState
          title="Could Not Load Branch"
          message={(error as any)?.message || 'An error occurred while retrieving your assigned branch.'}
          onRetry={() => refetch()}
        />
      )}

      {branch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-wood-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">{branch.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">{branch.code}</CardDescription>
                </div>
                <Badge variant={branch.stockMode === StockMode.MAIN_STOCK ? 'secondary' : 'wood'}>
                  {branch.stockMode === StockMode.MAIN_STOCK ? t('branches.mainStock', 'Main Stock') : t('branches.branchStock', 'Branch Stock')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2 text-sm text-charcoal-700">
                <div className="flex items-center space-x-2.5">
                  <MapPin className="h-4 w-4 text-wood-700 shrink-0" />
                  <span>{branch.address}</span>
                </div>
                {branch.phone && (
                  <div className="flex items-center space-x-2.5">
                    <Phone className="h-4 w-4 text-wood-700 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{t('branches.activeStatus', 'Branch Status')}: <strong className="text-emerald-700">{t('common.active', 'Active')}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-wood-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Layers className="h-5 w-5 text-wood-700" />
                <span>{t('branches.stockPolicyTitle', 'Inventory & Operations Policy')}</span>
              </CardTitle>
              <CardDescription>{t('branches.stockPolicyDesc', 'Stock allocation and consumption rules')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-sm text-charcoal-700">
              {branch.stockMode === StockMode.MAIN_STOCK ? (
                <div className="p-3.5 rounded-lg bg-wood-50 border border-wood-200 space-y-2">
                  <div className="font-semibold text-wood-950">{t('branches.centralStockTitle', 'Centralized Warehouse Stock')}</div>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    {t('branches.centralStockDesc', 'This branch directly draws raw materials (timber, foam, fabric) from the central business inventory pool. When recording material consumption for orders, stock deductions are made authoritatively against main stock.')}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-wood-50 border border-wood-200 space-y-2">
                  <div className="font-semibold text-wood-950">{t('branches.branchStockTitle', 'Dedicated Branch Inventory')}</div>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    {t('branches.branchStockDesc', "This branch maintains an independent, physical stock room. Stock-in replenishments and order consumption are strictly isolated to this branch's warehouse inventory.")}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2 text-xs text-muted-foreground">
                <UserCheck className="h-4 w-4 text-wood-600" />
                <span>{t('branches.assignedAdmin', 'Assigned Administrator')}: <strong>{user.fullName}</strong> ({user.email})</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
