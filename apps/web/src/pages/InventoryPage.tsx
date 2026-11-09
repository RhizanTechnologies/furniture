import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RawMaterialDto,
  MaterialStockInDto,
  MaterialConsumptionDto,
  StockValuationDto,
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
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
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
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isOwner } = useAuth();
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN';
  const isBranchStock = !isBranchAdmin || user?.branch?.stockMode === 'BRANCH_STOCK';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [selectedMaterialForStockIn, setSelectedMaterialForStockIn] = useState<RawMaterialDto | null>(null);
  const [selectedMaterialHistoryId, setSelectedMaterialHistoryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Materials
  const { data: materials = [], isLoading: isMaterialsLoading, error: materialsError, refetch } = useQuery<RawMaterialDto[]>({
    queryKey: ['raw-materials', searchTerm, selectedCategory, onlyLowStock],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (onlyLowStock) params.append('onlyLowStock', 'true');
      return apiClient<RawMaterialDto[]>(`/inventory/materials?${params.toString()}`);
    },
    enabled: isBranchStock,
  });

  // 2. Fetch Stock Valuation (Executive & Owner only - hidden for Branch Admin)
  const { data: valuation, isLoading: isValuationLoading } = useQuery<StockValuationDto>({
    queryKey: ['stock-valuation'],
    queryFn: () => apiClient<StockValuationDto>('/inventory/valuation'),
    enabled: !isBranchAdmin,
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

  const watchStockInQty = stockInForm.watch('receivedQuantity') || 0;
  const watchStockInCost = stockInForm.watch('unitCost') || 0;
  const computedStockInTotal = watchStockInQty * watchStockInCost;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Raw Materials"
        description="Monitor physical stock levels, record replenishments with automatic Weighted Average Cost (WAC) calculations, and view authoritative stock valuations."
        action={
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => openStockInModal()}
              className="bg-wood-700 hover:bg-wood-800 text-white space-x-1.5"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Stock In</span>
            </Button>
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => setIsAddMaterialOpen(true)}
                className="space-x-1.5 border-wood-300 text-wood-900"
              >
                <Plus className="h-4 w-4" />
                <span>New Material</span>
              </Button>
            )}
          </div>
        }
      />

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Inventory Alert</p>
            <p>{actionError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Stock Valuation Metric Cards (Executive Owner Only - hidden for Branch Admin) */}
      {!isBranchAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500">
                Total Stock Valuation
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-wood-900 font-mono">
                {formatCurrency(valuation?.totalStockValue || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-charcoal-600">
              Weighted average cost valuation across all active materials
            </CardContent>
          </Card>

          <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500">
                Active Materials
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-charcoal-900 font-mono">
                {valuation?.totalItemsInStock || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-charcoal-600">
              Catalog materials with positive on-hand quantity
            </CardContent>
          </Card>

          <Card className={`border-wood-200/80 ${
            (valuation?.lowStockCount || 0) > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-gradient-to-br from-white to-wood-50/40'
          }`}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500 flex items-center justify-between">
                <span>Reorder Alerts</span>
                {(valuation?.lowStockCount || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </CardDescription>
              <CardTitle className={`text-2xl font-bold font-mono ${
                (valuation?.lowStockCount || 0) > 0 ? 'text-amber-800' : 'text-charcoal-900'
              }`}>
                {valuation?.lowStockCount || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-charcoal-600">
              Materials at or below minimum threshold
            </CardContent>
          </Card>

          <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500">
                Stock Location
              </CardDescription>
              <CardTitle className="text-sm font-bold text-wood-900 truncate">
                {valuation?.stockLocation || 'Central Main Warehouse'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-charcoal-600">
              Authoritative warehouse pool
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notice for branches operating under Central Main Stock */}
      {isBranchAdmin && !isBranchStock && (
        <Card className="border-wood-200 bg-wood-50/50 p-6 text-center space-y-3">
          <Boxes className="h-10 w-10 text-wood-600 mx-auto" />
          <h3 className="text-base font-semibold text-charcoal-900">
            Central Main Stock Allocation
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
              placeholder="Search by material code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                onClick={() => setSelectedCategory(cat)}
                className="text-xs h-8 px-3"
              >
                {cat}
              </Button>
            ))}

            <Button
              type="button"
              variant={onlyLowStock ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className="text-xs h-8 px-2.5 space-x-1"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock</span>
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
        <Card className="border-wood-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-wood-50/50">
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Available Qty</TableHead>
                <TableHead className="text-right">Unit Cost (WAC)</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((mat) => (
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
                  <TableCell className="text-right font-mono text-sm text-stone-700">
                    {formatCurrency(mat.currentUnitCost)} / {mat.unitOfMeasurement}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-sm text-wood-900">
                    {formatCurrency(mat.stockValue)}
                  </TableCell>
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
      )}

      {/* Stock-In Modal */}
      <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Material Replenishment (Stock-In)</DialogTitle>
            <DialogDescription>
              Add newly purchased materials. The Weighted Average Cost (WAC) will automatically recalculate.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={stockInForm.handleSubmit((data) => stockInMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Select Raw Material <span className="text-red-500">*</span>
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
                    {m.name} ({m.code}) — {m.currentStockQuantity} {m.unitOfMeasurement} on hand
                  </option>
                ))}
              </select>
              {stockInForm.formState.errors.rawMaterialId && (
                <p className="text-xs text-red-500 mt-1">
                  {stockInForm.formState.errors.rawMaterialId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Quantity Received ({selectedMaterialForStockIn?.unitOfMeasurement || 'Units'}) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.00"
                  {...stockInForm.register('receivedQuantity', { valueAsNumber: true })}
                />
                {stockInForm.formState.errors.receivedQuantity && (
                  <p className="text-xs text-red-500 mt-1">
                    {stockInForm.formState.errors.receivedQuantity.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Unit Cost (ETB) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...stockInForm.register('unitCost', { valueAsNumber: true })}
                />
                {stockInForm.formState.errors.unitCost && (
                  <p className="text-xs text-red-500 mt-1">
                    {stockInForm.formState.errors.unitCost.message}
                  </p>
                )}
              </div>
            </div>

            {/* Total Batch Cost Preview */}
            <div className="p-3 bg-wood-50 rounded-lg border border-wood-200 flex justify-between items-center text-sm">
              <span className="text-wood-800 font-medium">Batch Purchase Value:</span>
              <span className="font-mono font-bold text-wood-950 text-base">
                {formatCurrency(computedStockInTotal)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Supplier Invoice / Receipt Ref
              </label>
              <Input
                placeholder="e.g. INV-2026-092 or Cash Voucher #44"
                {...stockInForm.register('supplierInvoiceRef')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockInOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wood-700 hover:bg-wood-800"
                disabled={stockInMutation.isPending}
              >
                {stockInMutation.isPending ? 'Recording Batch...' : 'Confirm Stock-In'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Raw Material Modal (Owner Only) */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Define New Raw Material</DialogTitle>
            <DialogDescription>
              Register a workshop material with base measurement units and optional opening inventory.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={materialForm.handleSubmit((data) => createMaterialMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Material Code <span className="text-red-500">*</span>
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
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...materialForm.register('category')}
                >
                  <option value="Timber">Timber / Wood</option>
                  <option value="Fabric">Fabric / Upholstery</option>
                  <option value="Foam">Foam / Padding</option>
                  <option value="Hardware">Hardware / Fasteners</option>
                  <option value="Finishing">Finishing / Varnishes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Material Name <span className="text-red-500">*</span>
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
                  Unit of Measure <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Meter, Sheet, Liter, Kg"
                  {...materialForm.register('unitOfMeasurement')}
                />
                {materialForm.formState.errors.unitOfMeasurement && (
                  <p className="text-xs text-red-500 mt-1">
                    {materialForm.formState.errors.unitOfMeasurement.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Reorder Alert Threshold
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 10.0"
                  {...materialForm.register('reorderAlertQuantity', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
                  Opening Quantity
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
                  Initial Cost (ETB)
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
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wood-700 hover:bg-wood-800"
                disabled={createMaterialMutation.isPending}
              >
                {createMaterialMutation.isPending ? 'Saving Material...' : 'Create Material'}
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
                    {materialHistory?.name || 'Material History'}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs text-wood-700">
                    {materialHistory?.code} • {materialHistory?.category} •{' '}
                    {materialHistory?.unitOfMeasurement}
                  </DialogDescription>
                </div>
                {materialHistory && (
                  <Badge variant="wood" className="text-xs">
                    Current WAC: {formatCurrency(materialHistory.currentUnitCost)} /{' '}
                    {materialHistory.unitOfMeasurement}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {isHistoryLoading ? (
              <LoadingState message="Loading historical batches and consumptions..." />
            ) : !materialHistory ? (
              <p className="text-stone-500 py-4">No historical records available.</p>
            ) : (
              <div className="space-y-6 pt-2">
                {/* Stock-In Batches */}
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center">
                    <ArrowDownToLine className="w-4 h-4 mr-1.5 text-wood-700" />
                    Recent Replenishment Batches (Stock-Ins)
                  </h4>
                  {materialHistory.stockIns.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">No replenishment records.</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden text-xs">
                      <Table>
                        <TableHeader className="bg-stone-50">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Qty Received</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total Batch Cost</TableHead>
                            <TableHead>Invoice Ref</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materialHistory.stockIns.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{new Date(s.receivedDate).toLocaleDateString()}</TableCell>
                              <TableCell>{s.branchName}</TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {s.receivedQuantity} {s.unitOfMeasurement}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(s.unitCost)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-wood-900">
                                {formatCurrency(s.totalCost)}
                              </TableCell>
                              <TableCell className="text-stone-600">
                                {s.supplierInvoiceRef || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Consumption Records */}
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center">
                    <History className="w-4 h-4 mr-1.5 text-wood-700" />
                    Recent Production Consumptions
                  </h4>
                  {materialHistory.consumptions.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">No order consumption records.</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden text-xs">
                      <Table>
                        <TableHeader className="bg-stone-50">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Order #</TableHead>
                            <TableHead>Workshop</TableHead>
                            <TableHead className="text-right">Qty Consumed</TableHead>
                            <TableHead className="text-right">Allocated WAC Cost</TableHead>
                            <TableHead className="text-right">Total Cost Contribution</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materialHistory.consumptions.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>{new Date(c.consumedAt).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono font-bold text-wood-800">
                                {c.orderNumber}
                              </TableCell>
                              <TableCell>{c.branchName}</TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {c.consumedQuantity} {c.unitOfMeasurement}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(c.unitCostAllocated)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-wood-900">
                                {formatCurrency(c.totalMaterialCost)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
