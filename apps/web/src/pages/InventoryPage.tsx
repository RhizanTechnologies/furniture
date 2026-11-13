import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RawMaterialDto,
  MaterialStockInDto,
  MaterialConsumptionDto,
  StockValuationDto,
  BranchDto,
  createRawMaterialSchema,
  createStockInSchema,
  CreateRawMaterialInput,
  CreateStockInInput,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import {
  Boxes,
  Plus,
  Search,
  ArrowDownToLine,
  TrendingUp,
  AlertTriangle,
  History,
  Layers,
  DollarSign,
  PackageCheck,
  CheckCircle2,
  Calendar,
  Eye,
  Building2,
  MapPin,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isOwner } = useAuth();
  const { t } = useLanguage();
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN';
  const isBranchStock = isOwner || !isBranchAdmin || user?.branch?.stockMode === 'BRANCH_STOCK';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [selectedMaterialForStockIn, setSelectedMaterialForStockIn] = useState<RawMaterialDto | null>(null);
  const [selectedMaterialHistoryId, setSelectedMaterialHistoryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch branches if Owner (so Owner can filter stock by branch or choose destination in Stock-In)
  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient<BranchDto[]>('/branches'),
    enabled: isOwner,
  });

  // 1. Fetch Materials
  const { data: materials = [], isLoading: isMaterialsLoading, error: materialsError, refetch } = useQuery<RawMaterialDto[]>({
    queryKey: ['raw-materials', searchTerm, selectedCategory, onlyLowStock, selectedBranchId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (onlyLowStock) params.append('onlyLowStock', 'true');
      if (isOwner && selectedBranchId !== 'ALL') params.append('branchId', selectedBranchId);
      return apiClient<RawMaterialDto[]>(`/inventory/materials?${params.toString()}`);
    },
    enabled: isBranchStock,
  });

  const paginatedMaterials = materials.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 2. Fetch Stock Valuation (Both Owner and Branch Admin can see their authoritative stock valuation)
  const { data: valuation, isLoading: isValuationLoading } = useQuery<StockValuationDto>({
    queryKey: ['stock-valuation', selectedBranchId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (isOwner && selectedBranchId !== 'ALL') params.append('branchId', selectedBranchId);
      return apiClient<StockValuationDto>(`/inventory/valuation?${params.toString()}`);
    },
  });

  // 3. Fetch Selected Material History
  const { data: materialHistory, isLoading: isHistoryLoading } = useQuery<
    RawMaterialDto & { stockIns: MaterialStockInDto[]; consumptions: MaterialConsumptionDto[] }
  >({
    queryKey: ['raw-material-history', selectedMaterialHistoryId],
    queryFn: () => apiClient<any>(`/inventory/materials/${selectedMaterialHistoryId}`),
    enabled: !!selectedMaterialHistoryId,
  });

  // Create Material Form
  const materialForm = useForm<CreateRawMaterialInput>({
    resolver: zodResolver(createRawMaterialSchema),
    defaultValues: {
      code: '',
      name: '',
      category: 'Timber',
      unitOfMeasurement: 'Meter',
      initialStockQuantity: 0,
      initialUnitCost: 0,
      reorderAlertQuantity: 10,
    },
  });

  // Stock-In Form
  const stockInForm = useForm<CreateStockInInput>({
    resolver: zodResolver(createStockInSchema),
    defaultValues: {
      rawMaterialId: '',
      receivedQuantity: 1,
      unitCost: 0,
      supplierInvoiceRef: '',
    },
  });

  // Mutations
  const createMaterialMutation = useMutation({
    mutationFn: (data: CreateRawMaterialInput) =>
      apiClient<RawMaterialDto>('/inventory/materials', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['stock-valuation'] });
      setIsAddMaterialOpen(false);
      materialForm.reset();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to create raw material');
    },
  });

  const stockInMutation = useMutation({
    mutationFn: (data: CreateStockInInput) =>
      apiClient<MaterialStockInDto>('/inventory/stock-in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['stock-valuation'] });
      setIsStockInOpen(false);
      stockInForm.reset();
      setSelectedMaterialForStockIn(null);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to record stock-in batch');
    },
  });

  const openStockInModal = (material?: RawMaterialDto) => {
    if (material) {
      setSelectedMaterialForStockIn(material);
      stockInForm.setValue('rawMaterialId', material.id);
      stockInForm.setValue('unitCost', material.currentUnitCost);
    } else if (materials.length > 0) {
      setSelectedMaterialForStockIn(materials[0]);
      stockInForm.setValue('rawMaterialId', materials[0].id);
      stockInForm.setValue('unitCost', materials[0].currentUnitCost);
    }
    setIsStockInOpen(true);
  };

  const categories = ['ALL', 'Timber', 'Fabric', 'Foam', 'Hardware', 'Finishing'];

  const watchMaterialUnit = materialForm.watch('unitOfMeasurement') || 'Unit';
  const watchStockInQty = stockInForm.watch('receivedQuantity') || 0;
  const watchStockInCost = stockInForm.watch('unitCost') || 0;
  const computedStockInTotal = watchStockInQty * watchStockInCost;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.title', 'Inventory & Raw Materials')}
        description={
          isOwner
            ? t('inventory.subtitle', 'Monitor central and branch stock levels, record replenishments, and view authoritative stock valuations.')
            : `Showing physical stock and material balances allocated to ${user?.branch?.name || 'this branch'}.`
        }
        action={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {isOwner && branches.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-wood-50 border border-wood-200/90 rounded-lg px-2.5 h-8 sm:h-9 shadow-xs">
                <Building2 className="h-3.5 w-3.5 text-wood-700 shrink-0" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{t('dashboard.allBranches', 'All Branches & Central Pool')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.stockMode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isBranchAdmin && (
              <Badge variant="wood" className="text-xs h-8 sm:h-9 px-2.5 flex items-center space-x-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{user?.branch?.name || t('common.branch', 'Branch')} {t('nav.stock', 'Stock')}</span>
              </Badge>
            )}

            <Button
              onClick={() => openStockInModal()}
              className="flex-1 sm:flex-none bg-wood-700 hover:bg-wood-800 text-white space-x-1 sm:space-x-1.5 text-xs px-2.5 sm:px-3 h-8 sm:h-9"
            >
              <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" />
              <span>{t('inventory.addStockBtn', 'Stock In')}</span>
            </Button>
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => setIsAddMaterialOpen(true)}
                className="flex-1 sm:flex-none space-x-1 sm:space-x-1.5 border-wood-300 text-wood-900 text-xs px-2.5 sm:px-3 h-8 sm:h-9"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('inventory.stockInModalTitle', 'New Material')}</span>
                <span className="sm:hidden">{t('inventory.materialName', 'Material')}</span>
              </Button>
            )}
          </div>
        }
      />

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{t('common.warning', 'Inventory Alert')}</p>
            <p>{actionError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            {t('common.close', 'Dismiss')}
          </Button>
        </div>
      )}

      {/* Stock Operational & Valuation Metric Cards */}
      <div className={`grid grid-cols-1 ${isOwner ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3 sm:gap-4`}>
        {isOwner && (
          <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
            <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
              <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
                {t('inventory.totalStockCost', 'Total Stock Valuation')}
              </CardDescription>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-wood-900 font-mono tracking-tight leading-snug sm:leading-normal">
                {formatCurrency(valuation?.totalStockValue || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
              {t('inventory.subtitle', 'Weighted average cost valuation across all active materials')}
            </CardContent>
          </Card>
        )}

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
              {t('inventory.totalItemsInStock', 'Active Materials')}
            </CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-charcoal-900 font-mono tracking-tight leading-snug sm:leading-normal">
              {valuation?.totalItemsInStock || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('inventory.materialsTab', 'Catalog materials with positive on-hand quantity')}
          </CardContent>
        </Card>

        <Card className={`border-wood-200/80 ${
          (valuation?.lowStockCount || 0) > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-gradient-to-br from-white to-wood-50/40'
        }`}>
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500 flex items-center justify-between">
              <span>{t('inventory.lowStockAlert', 'Reorder Alerts')}</span>
              {(valuation?.lowStockCount || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </CardDescription>
            <CardTitle className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight leading-snug sm:leading-normal ${
              (valuation?.lowStockCount || 0) > 0 ? 'text-amber-800' : 'text-charcoal-900'
            }`}>
              {valuation?.lowStockCount || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('inventory.minThreshold', 'Materials at or below minimum threshold')}
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
              {t('inventory.stockLocation', 'Stock Location')}
            </CardDescription>
            <CardTitle className="text-xs sm:text-sm font-bold text-wood-900 truncate">
              {valuation?.stockLocation || 'Central Main Warehouse'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('branches.stockMode', 'Authoritative warehouse pool')}
          </CardContent>
        </Card>
      </div>

      {/* Notice for branches operating under Central Main Stock */}
      {isBranchAdmin && !isBranchStock && (
        <Card className="border-wood-200 bg-wood-50/50 p-6 text-center space-y-3">
          <Boxes className="h-10 w-10 text-wood-600 mx-auto" />
          <h3 className="text-base font-semibold text-charcoal-900">
            {t('branches.mainStock', 'Central Main Stock Allocation')}
          </h3>
          <p className="text-sm text-charcoal-600 max-w-md mx-auto">
            Your branch (<strong>{user?.branch?.name}</strong>) operates under the <strong>Main Central Stock</strong> model. Raw materials, timber replenishment, and inventory accounting are managed centrally by the workshop.
          </p>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('inventory.searchPlaceholder', 'Search by material code or name...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <Button
                key={cat}
                type="button"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className="text-xs h-8 px-3"
              >
                {cat === 'ALL'
                  ? t('inventory.allCategories', 'ALL')
                  : cat === 'Timber'
                  ? t('inventory.timber', 'Timber')
                  : cat === 'Fabric'
                  ? t('inventory.fabric', 'Fabric')
                  : cat === 'Foam'
                  ? t('inventory.foam', 'Foam')
                  : cat === 'Hardware'
                  ? t('inventory.hardware', 'Hardware')
                  : cat === 'Finishing'
                  ? t('inventory.finishes', 'Finishing')
                  : cat}
              </Button>
            ))}

            <Button
              type="button"
              variant={onlyLowStock ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => {
                setOnlyLowStock(!onlyLowStock);
                setCurrentPage(1);
              }}
              className="text-xs h-8 px-2.5 space-x-1"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{t('inventory.lowStockFilter', 'Low Stock')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Inventory Table */}
      {isMaterialsLoading ? (
        <LoadingState message="Loading inventory and stock balances..." />
      ) : materialsError ? (
        <ErrorState
          title="Could not load inventory"
          message={(materialsError as Error).message}
          onRetry={refetch}
        />
      ) : materials.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Boxes className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No Raw Materials Found</h3>
            <p className="text-sm text-stone-500 mt-1 mb-4">
              {searchTerm || selectedCategory !== 'ALL' || onlyLowStock
                ? 'No materials match the active filters.'
                : 'Define raw materials to start tracking workshop inventory and production costing.'}
            </p>
            {isOwner && (
              <Button onClick={() => setIsAddMaterialOpen(true)} className="bg-wood-600 hover:bg-wood-700">
                <Plus className="w-4 h-4 mr-2" /> Add First Material
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Phone & Tablet Responsive Cards (lg:hidden) */}
          <div className="lg:hidden space-y-3">
            {paginatedMaterials.map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900 text-sm leading-snug break-words">{mat.name}</div>
                    <div className="font-mono text-xs text-wood-700">{mat.code}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {mat.category}
                    </Badge>
                    {mat.currentStockQuantity <= 0 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Out of Stock
                      </Badge>
                    ) : mat.isLowStock ? (
                      <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] space-x-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600 inline mr-0.5" />
                        <span>Low Stock</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                        In Stock
                      </Badge>
                    )}
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg bg-stone-50 text-xs ${isOwner ? 'grid grid-cols-2 gap-2' : ''}`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Available Stock</span>
                    <span className="font-mono font-bold text-stone-900 text-sm">
                      {mat.currentStockQuantity.toLocaleString()}
                    </span>{' '}
                    <span className="text-stone-500 text-[11px]">{mat.unitOfMeasurement}</span>
                  </div>
                  {isOwner && (
                    <>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Stock Valuation</span>
                        <span className="font-mono font-bold text-wood-950 text-sm">
                          {formatCurrency(mat.stockValue)}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-dashed border-stone-200 flex justify-between text-[11px]">
                        <span className="text-stone-500">Unit WAC Cost:</span>
                        <span className="font-mono font-medium text-stone-800">
                          {formatCurrency(mat.currentUnitCost)} / {mat.unitOfMeasurement}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMaterialHistoryId(mat.id)}
                    className="h-8 text-xs text-stone-600 space-x-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Audit Log</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openStockInModal(mat)}
                    className="h-8 text-xs bg-wood-700 hover:bg-wood-800 text-white space-x-1"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Stock In</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (lg:block) */}
          <Card className="hidden lg:block border-wood-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-wood-50/50">
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  {isOwner && (
                    <>
                      <TableHead className="text-right">Unit Cost (WAC)</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                    </>
                  )}
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMaterials.map((mat) => (
                  <TableRow key={mat.id} className="hover:bg-wood-50/30">
                    <TableCell>
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{mat.name}</div>
                        <div className="font-mono text-xs text-wood-700">{mat.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {mat.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="font-mono text-sm">{mat.currentStockQuantity.toLocaleString()}</span>{' '}
                      <span className="text-xs text-muted-foreground">{mat.unitOfMeasurement}</span>
                    </TableCell>
                    {isOwner && (
                      <>
                        <TableCell className="text-right font-mono text-sm text-stone-700">
                          {formatCurrency(mat.currentUnitCost)} / {mat.unitOfMeasurement}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-wood-900">
                          {formatCurrency(mat.stockValue)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      {mat.currentStockQuantity <= 0 ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of Stock
                        </Badge>
                      ) : mat.isLowStock ? (
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] space-x-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 inline mr-0.5" />
                          <span>Low Stock</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStockInModal(mat)}
                        className="h-8 text-xs text-wood-800 hover:bg-wood-50"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
                        Stock In
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMaterialHistoryId(mat.id)}
                        className="h-8 text-xs text-stone-600"
                        title="View replenishment and consumption history"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalItems={materials.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Stock-In Modal */}
      <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.stockInTitle', 'Record Material Replenishment (Stock-In)')}</DialogTitle>
            <DialogDescription>
              {t('inventory.stockInDesc', 'Add newly purchased materials. The Weighted Average Cost (WAC) will automatically recalculate.')}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={stockInForm.handleSubmit((data) => stockInMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('inventory.selectMaterial', 'Select Raw Material')} <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                {...stockInForm.register('rawMaterialId')}
                onChange={(e) => {
                  stockInForm.setValue('rawMaterialId', e.target.value);
                  const found = materials.find((m) => m.id === e.target.value);
                  if (found) {
                    setSelectedMaterialForStockIn(found);
                    stockInForm.setValue('unitCost', found.currentUnitCost);
                  }
                }}
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code}) — {m.currentStockQuantity} {m.unitOfMeasurement}
                  </option>
                ))}
              </select>
              {stockInForm.formState.errors.rawMaterialId && (
                <p className="text-xs text-red-500 mt-1">
                  {stockInForm.formState.errors.rawMaterialId.message}
                </p>
              )}
            </div>

            {isOwner && branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('inventory.targetLocation', 'Target Destination Location')}
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...stockInForm.register('branchId')}
                >
                  <option value="">{t('inventory.centralMainWarehouse', 'Central Main Warehouse (Global Pool)')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.stockMode}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('inventory.targetLocationHint', "Select a dedicated branch to allocate this batch directly to that location's inventory.")}
                </p>
              </div>
            )}

            <div className={`grid ${isOwner ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('inventory.qtyReceived', 'Quantity Received')} ({selectedMaterialForStockIn?.unitOfMeasurement || t('common.items', 'Units')}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="0.00"
                    {...stockInForm.register('receivedQuantity', { valueAsNumber: true })}
                    className={selectedMaterialForStockIn ? 'pr-16 font-mono' : 'font-mono'}
                  />
                  {selectedMaterialForStockIn && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded bg-wood-100 text-wood-900 pointer-events-none">
                      {selectedMaterialForStockIn.unitOfMeasurement}
                    </span>
                  )}
                </div>
                {stockInForm.formState.errors.receivedQuantity && (
                  <p className="text-xs text-red-500 mt-1">
                    {stockInForm.formState.errors.receivedQuantity.message}
                  </p>
                )}
              </div>

              {isOwner && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {t('inventory.batchUnitCost', 'Purchase Unit Cost (ETB)')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...stockInForm.register('unitCost', { valueAsNumber: true })}
                    className="font-mono"
                  />
                  {stockInForm.formState.errors.unitCost && (
                    <p className="text-xs text-red-500 mt-1">
                      {stockInForm.formState.errors.unitCost.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedMaterialForStockIn && (
              <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 p-2.5 rounded-lg flex items-center justify-between">
                <span>{t('inventory.presetUnit', 'Preset Unit')}: <strong className="text-wood-950 font-semibold">{selectedMaterialForStockIn.unitOfMeasurement}</strong></span>
                <span className="text-stone-500 text-[11px]">{selectedMaterialForStockIn.currentStockQuantity} {selectedMaterialForStockIn.unitOfMeasurement}</span>
              </p>
            )}

            {/* Total Batch Cost Preview (Executive Owner Only) */}
            {isOwner && (
              <div className="p-3 bg-wood-50 rounded-lg border border-wood-200 flex justify-between items-center text-sm">
                <span className="text-wood-800 font-medium">{t('inventory.batchTotalCost', 'Total Batch Cost (ETB)')}:</span>
                <span className="font-mono font-bold text-wood-950 text-base">
                  {formatCurrency(computedStockInTotal)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('inventory.invoiceRef', 'Supplier Invoice / Receipt Ref')}
              </label>
              <Input
                placeholder={t('inventory.invoicePlaceholder', 'e.g. INV-2026-092 or Cash Voucher #44')}
                {...stockInForm.register('supplierInvoiceRef')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockInOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-wood-700 hover:bg-wood-800"
                disabled={stockInMutation.isPending}
              >
                {stockInMutation.isPending ? t('inventory.recordingStockIn', 'Recording Stock-In...') : t('inventory.confirmStockIn', 'Confirm Stock-In')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Raw Material Modal (Owner Only) */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.addMaterialTitle', 'Define New Raw Material')}</DialogTitle>
            <DialogDescription>
              {t('inventory.addMaterialDesc', 'Register a workshop material with base measurement units and optional opening inventory.')}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={materialForm.handleSubmit((data) => createMaterialMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('inventory.materialCode', 'Material Code')} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. MAT-TIM-005"
                  {...materialForm.register('code')}
                />
                {materialForm.formState.errors.code && (
                  <p className="text-xs text-red-500 mt-1">
                    {materialForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('inventory.materialCategory', 'Category')} <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...materialForm.register('category')}
                >
                  <option value="Timber">{t('inventory.timber', 'Timber / Wood')}</option>
                  <option value="Fabric">{t('inventory.fabric', 'Fabric / Upholstery')}</option>
                  <option value="Foam">{t('inventory.foam', 'Foam / Padding')}</option>
                  <option value="Hardware">{t('inventory.hardware', 'Hardware / Fasteners')}</option>
                  <option value="Finishing">{t('inventory.finishes', 'Finishing / Varnishes')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t('inventory.materialName', 'Material Name')} <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Solid Zigba Wood Plank 2.5m"
                {...materialForm.register('name')}
              />
              {materialForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {materialForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('inventory.presetUnit', 'Preset Unit of Measure')} <span className="text-red-500">*</span>
                </label>
                <input
                  list="preset-material-units"
                  placeholder="e.g. Meter, Piece, Sheet, Kg"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...materialForm.register('unitOfMeasurement')}
                />
                <datalist id="preset-material-units">
                  <option value="Meter" />
                  <option value="Piece" />
                  <option value="Sheet" />
                  <option value="Square Meter" />
                  <option value="Board Foot" />
                  <option value="Kilogram" />
                  <option value="Liter" />
                  <option value="Roll" />
                  <option value="Set" />
                  <option value="Box" />
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Meter', 'Piece', 'Sheet', 'Sq.M', 'Kg', 'Liter'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => materialForm.setValue('unitOfMeasurement', u)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors"
                    >
                      +{u}
                    </button>
                  ))}
                </div>
                {materialForm.formState.errors.unitOfMeasurement && (
                  <p className="text-xs text-red-500 mt-1">
                    {materialForm.formState.errors.unitOfMeasurement.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('inventory.reorderThreshold', 'Reorder Alert Threshold')} ({watchMaterialUnit})
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 10.0"
                  {...materialForm.register('reorderAlertQuantity', { valueAsNumber: true })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('inventory.reorderHint', 'Triggers alert when balance falls below this level.')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
                  {t('inventory.openingQuantity', 'Opening Quantity')} ({watchMaterialUnit})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.00"
                  {...materialForm.register('initialStockQuantity', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
                  {t('inventory.openingUnitCost', 'Initial Cost per Unit (ETB)')}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...materialForm.register('initialUnitCost', { valueAsNumber: true })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMaterialOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-wood-700 hover:bg-wood-800"
                disabled={createMaterialMutation.isPending}
              >
                {createMaterialMutation.isPending ? t('inventory.creatingMaterial', 'Saving Material...') : t('inventory.createMaterialBtn', 'Create Material')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Material Detail & History Modal */}
      {selectedMaterialHistoryId && (
        <Dialog
          open={!!selectedMaterialHistoryId}
          onOpenChange={(open) => !open && setSelectedMaterialHistoryId(null)}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {materialHistory?.name || t('inventory.materialHistory', 'Material History')}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs text-wood-700">
                    {materialHistory?.code} • {materialHistory?.category} •{' '}
                    {materialHistory?.unitOfMeasurement}
                  </DialogDescription>
                </div>
                {materialHistory && isOwner && (
                  <Badge variant="wood" className="text-xs">
                    {t('inventory.currentWAC', 'Current WAC')}: {formatCurrency(materialHistory.currentUnitCost)} /{' '}
                    {materialHistory.unitOfMeasurement}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {isHistoryLoading ? (
              <LoadingState message={t('common.loading', 'Loading historical batches and consumptions...')} />
            ) : !materialHistory ? (
              <p className="text-stone-500 py-4">{t('inventory.noReplenishments', 'No historical records available.')}</p>
            ) : (
              <div className="space-y-6 pt-2">
                {/* Stock-In Batches */}
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center">
                    <ArrowDownToLine className="w-4 h-4 mr-1.5 text-wood-700" />
                    {t('inventory.replenishmentBatches', 'Recent Replenishment Batches (Stock-Ins)')}
                  </h4>
                  {materialHistory.stockIns.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">{t('inventory.noReplenishments', 'No replenishment records.')}</p>
                  ) : (
                    <>
                      {/* Mobile & Tablet Card View */}
                      <div className="lg:hidden space-y-2">
                        {materialHistory.stockIns.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-lg border border-wood-100 bg-stone-50/60 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-900">{s.branchName || t('common.centralOperations', 'Central')}</span>
                              <span className="text-[11px] text-muted-foreground">{new Date(s.receivedDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-stone-700">{t('inventory.qtyReceived', 'Received')}: <strong>{s.receivedQuantity} {s.unitOfMeasurement}</strong></span>
                              {isOwner && <span className="text-wood-900 font-bold">{formatCurrency(s.totalCost)}</span>}
                            </div>
                            {(isOwner || s.supplierInvoiceRef) && (
                              <div className="pt-1 border-t border-dashed border-stone-200 flex justify-between text-[11px] text-muted-foreground">
                                {isOwner && <span>{t('common.unitCost', 'Unit Cost')}: {formatCurrency(s.unitCost)} / {s.unitOfMeasurement}</span>}
                                {s.supplierInvoiceRef && <span>{t('inventory.invoiceRef', 'Inv')}: {s.supplierInvoiceRef}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block border rounded-md overflow-hidden text-xs">
                        <Table>
                          <TableHeader className="bg-stone-50">
                            <TableRow>
                              <TableHead>{t('common.date', 'Date')}</TableHead>
                              <TableHead>{t('common.branch', 'Location')}</TableHead>
                              <TableHead className="text-right">{t('inventory.qtyReceived', 'Qty Received')}</TableHead>
                              {isOwner && (
                                <>
                                  <TableHead className="text-right">{t('common.unitCost', 'Unit Cost')}</TableHead>
                                  <TableHead className="text-right">{t('inventory.batchTotalCost', 'Total Batch Cost')}</TableHead>
                                </>
                              )}
                              <TableHead>{t('inventory.invoiceRef', 'Invoice Ref')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {materialHistory.stockIns.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell>{new Date(s.receivedDate).toLocaleDateString()}</TableCell>
                                <TableCell>{s.branchName || t('common.centralOperations', 'Central')}</TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {s.receivedQuantity} {s.unitOfMeasurement}
                                </TableCell>
                                {isOwner && (
                                  <>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(s.unitCost)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-wood-900">
                                      {formatCurrency(s.totalCost)}
                                    </TableCell>
                                  </>
                                )}
                                <TableCell className="text-stone-600">
                                  {s.supplierInvoiceRef || '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>

                {/* Consumption Records */}
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center">
                    <History className="w-4 h-4 mr-1.5 text-wood-700" />
                    {t('inventory.productionConsumptions', 'Recent Production Consumptions')}
                  </h4>
                  {materialHistory.consumptions.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">{t('inventory.noConsumptions', 'No order consumption records.')}</p>
                  ) : (
                    <>
                      {/* Mobile & Tablet Card View */}
                      <div className="lg:hidden space-y-2">
                        {materialHistory.consumptions.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-lg border border-wood-100 bg-stone-50/60 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-wood-900">{c.orderNumber}</span>
                              <span className="text-[11px] text-muted-foreground">{new Date(c.consumedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-stone-700">{t('orderDetail.qtyConsumed', 'Consumed')}: <strong>{c.consumedQuantity} {c.unitOfMeasurement}</strong></span>
                              {isOwner && <span className="text-wood-900 font-bold">{formatCurrency(c.totalMaterialCost)}</span>}
                            </div>
                            <div className="pt-1 border-t border-dashed border-stone-200 flex justify-between text-[11px] text-muted-foreground">
                              {isOwner && <span>{t('orderDetail.allocatedWACUnitCost', 'Allocated WAC')}: {formatCurrency(c.unitCostAllocated)} / {c.unitOfMeasurement}</span>}
                              <span>{c.branchName || t('common.centralOperations', 'Central')}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block border rounded-md overflow-hidden text-xs">
                        <Table>
                          <TableHeader className="bg-stone-50">
                            <TableRow>
                              <TableHead>{t('common.date', 'Date')}</TableHead>
                              <TableHead>{t('orders.orderNumber', 'Order #')}</TableHead>
                              <TableHead>{t('common.branch', 'Workshop')}</TableHead>
                              <TableHead className="text-right">{t('orderDetail.qtyConsumed', 'Qty Consumed')}</TableHead>
                              {isOwner && (
                                <>
                                  <TableHead className="text-right">{t('orderDetail.allocatedWACUnitCost', 'Allocated WAC Cost')}</TableHead>
                                  <TableHead className="text-right">{t('inventory.allocatedCostContribution', 'Total Cost Contribution')}</TableHead>
                                </>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {materialHistory.consumptions.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>{new Date(c.consumedAt).toLocaleDateString()}</TableCell>
                                <TableCell className="font-mono font-bold text-wood-800">
                                  {c.orderNumber}
                                </TableCell>
                                <TableCell>{c.branchName || t('common.centralOperations', 'Central')}</TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {c.consumedQuantity} {c.unitOfMeasurement}
                                </TableCell>
                                {isOwner && (
                                  <>
                                    <TableCell className="text-right font-mono">
                                      {formatCurrency(c.unitCostAllocated)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-wood-900">
                                      {formatCurrency(c.totalMaterialCost)}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default InventoryPage;
