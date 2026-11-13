import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProductDto,
  BranchDto,
  createProductSchema,
  CreateProductInput,
  updateProductSchema,
  UpdateProductInput,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/components/forms/FormInput';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ImageUploader } from '@/components/products/ImageUploader';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import {
  Plus,
  Search,
  Image as ImageIcon,
  Edit2,
  Armchair,
  Filter,
  MapPin,
  Building2,
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, translateCategory } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [imageManagingProduct, setImageManagingProduct] = useState<ProductDto | null>(null);

  // Fetch all products
  const { data: products, isLoading, error, refetch } = useQuery<ProductDto[]>({
    queryKey: ['products'],
    queryFn: () => apiClient<ProductDto[]>('/products'),
  });

  // Fetch all branches for location assignment
  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient<BranchDto[]>('/branches'),
  });

  // Create Product Form
  const createForm = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      sku: '',
      name: '',
      category: 'Living Room',
      description: '',
      dimensions: '',
      basePrice: 10000,
      estimatedProductionDays: 7,
      isActive: true,
      branchIds: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductInput) =>
      apiClient<ProductDto>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsCreateOpen(false);
      createForm.reset();
    },
  });

  // Edit Product Form
  const editForm = useForm<UpdateProductInput>({
    resolver: zodResolver(updateProductSchema),
  });

  const editMutation = useMutation({
    mutationFn: (data: UpdateProductInput) =>
      apiClient<ProductDto>(`/products/${editingProduct?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
  });

  const handleStartEdit = (prod: ProductDto) => {
    setEditingProduct(prod);
    editForm.reset({
      name: prod.name,
      category: prod.category,
      description: prod.description || '',
      dimensions: prod.dimensions || '',
      basePrice: prod.basePrice,
      estimatedProductionDays: prod.estimatedProductionDays || undefined,
      isActive: prod.isActive,
      branchIds: (prod.branches || []).map((b) => b.id),
    });
  };

  const categories = ['ALL', 'Living Room', 'Dining Room', 'Bedroom', 'Office'];

  const filteredProducts = (products || []).filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('catalog.title', 'Furniture Catalog Management')}
        description={t('catalog.subtitle', 'Maintain the enterprise product models, specifications, baseline prices, and showroom photo galleries.')}
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="space-x-1.5 shadow">
            <Plus className="h-4 w-4" />
            <span>{t('catalog.addProductBtn', 'Add Product')}</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('catalog.searchPlaceholder', 'Search products by SKU, name...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
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
                className="text-xs h-8 px-3 shrink-0"
              >
                {cat === 'ALL' ? t('showroom.allCategories', 'ALL') : translateCategory(cat)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingState message="Loading furniture product catalog..." />}

      {error && (
        <ErrorState
          title="Failed to Load Catalog"
          message={(error as any)?.message || 'An error occurred while loading products.'}
          onRetry={() => refetch()}
        />
      )}

      {/* Product Catalog Table */}
      {products && (
        <Card className="border-wood-200/90 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-wood-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Catalog Items ({filteredProducts.length})</CardTitle>
              <CardDescription>All furniture lines currently configured.</CardDescription>
            </div>
          </CardHeader>

          {/* Phone & Tablet Responsive Cards (lg:hidden) */}
          <div className="lg:hidden space-y-3 p-3">
            {paginatedProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900 text-sm leading-snug break-words">{prod.name}</div>
                    <div className="font-mono text-xs text-wood-700">{prod.sku}</div>
                  </div>
                  <Badge variant="wood" className="text-[11px] shrink-0">
                    {prod.category}
                  </Badge>
                </div>

                {prod.dimensions && (
                  <p className="text-stone-600 text-[11px]">
                    Dimensions: {prod.dimensions}
                  </p>
                )}

                {/* Showroom Branch Locations */}
                {prod.branches && prod.branches.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] text-wood-800">
                    <MapPin className="h-3 w-3 text-wood-600 shrink-0" />
                    <span className="font-semibold text-stone-600 text-[10px] uppercase tracking-wider">Showrooms:</span>
                    {prod.branches.map((b) => (
                      <span
                        key={b.id}
                        className="bg-wood-50 border border-wood-200 px-1.5 py-0.5 rounded text-[10px] font-semibold text-wood-900"
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 pt-1 text-[11px] text-stone-500">
                    <Building2 className="h-3 w-3 shrink-0 text-stone-400" />
                    <span className="text-[10px]">All Branch Showrooms</span>
                  </div>
                )}

                <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block font-bold">{t('catalog.basePrice', 'Base Price')}</span>
                    <span className="font-semibold text-charcoal-900 font-mono text-sm">
                      {formatCurrency(prod.basePrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground block font-bold">{t('catalog.leadTimeDays', 'Lead Time')}</span>
                    <span className="font-mono text-stone-700">
                      {prod.estimatedProductionDays ? `${prod.estimatedProductionDays} ${t('orders.days', 'days')}` : '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImageManagingProduct(prod)}
                    className="h-7 text-xs space-x-1 border-wood-300 flex-1"
                  >
                    <ImageIcon className="h-3 w-3 text-wood-700" />
                    <span>{prod.images.length} {t('catalog.galleryCol', 'Photos')}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEdit(prod)}
                    className="h-7 text-xs space-x-1 border-wood-300"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{t('catalog.editProduct', 'Edit')}</span>
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">
                {t('common.noResultsFound', 'No products found matching your search and category filter.')}
              </p>
            )}
          </div>

          {/* Desktop Table View (lg:block) */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('catalog.sku', 'SKU')}</TableHead>
                  <TableHead>{t('catalog.productNameCol', 'Product Name')}</TableHead>
                  <TableHead>{t('catalog.category', 'Category')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('catalog.dimensions', 'Dimensions')}</TableHead>
                  <TableHead>{t('catalog.basePrice', 'Base Price')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('catalog.leadDaysCol', 'Lead Days')}</TableHead>
                  <TableHead>{t('catalog.galleryCol', 'Gallery')}</TableHead>
                  <TableHead className="text-right">{t('catalog.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell className="font-mono text-xs font-semibold text-wood-900">
                      {prod.sku}
                    </TableCell>
                    <TableCell className="font-medium text-charcoal-900">
                      <div>{prod.name}</div>
                      <div className="text-[11px] text-muted-foreground sm:hidden">
                        {translateCategory(prod.category)} • {prod.dimensions}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {prod.branches && prod.branches.length > 0 ? (
                          prod.branches.map((b) => (
                            <span
                              key={b.id}
                              className="inline-flex items-center text-[10px] bg-wood-50 border border-wood-200 text-wood-900 px-1.5 py-0.5 rounded font-medium"
                            >
                              <MapPin className="h-2.5 w-2.5 mr-0.5 text-wood-600" />
                              {b.name}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center text-[10px] bg-stone-50 border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                            <Building2 className="h-2.5 w-2.5 mr-0.5 text-stone-400" />
                            {t('showroom.allShowrooms', 'All Showrooms')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="wood" className="text-[11px]">
                        {translateCategory(prod.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-charcoal-600">
                      {prod.dimensions || '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-charcoal-900">
                      {formatCurrency(prod.basePrice)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-charcoal-600">
                      {prod.estimatedProductionDays ? `${prod.estimatedProductionDays} ${t('orders.days', 'days')}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setImageManagingProduct(prod)}
                        className="h-7 text-xs space-x-1 border-wood-300"
                      >
                        <ImageIcon className="h-3 w-3 text-wood-700" />
                        <span>{prod.images.length} {t('catalog.galleryCol', 'Photos')}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(prod)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('common.noResultsFound', 'No products found matching your search and category filter.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 pb-4">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* Create Product Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('catalog.addModelTitle', 'Add New Furniture Model')}</DialogTitle>
            <DialogDescription>
              {t('catalog.addModelDesc', 'Register a new product with dimensions and base pricing in Ethiopian Birr.')}
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <FormInput name="sku" label={t('catalog.skuLabel', 'Product SKU')} placeholder={t('catalog.skuPlaceholder', 'e.g. SKU-DIN-002')} />
                <div className="space-y-1.5 w-full">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    {t('catalog.category', 'Category')}
                  </label>
                  <select
                    {...createForm.register('category')}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Living Room">{translateCategory('Living Room')}</option>
                    <option value="Dining Room">{translateCategory('Dining Room')}</option>
                    <option value="Bedroom">{translateCategory('Bedroom')}</option>
                    <option value="Office">{translateCategory('Office')}</option>
                  </select>
                </div>
              </div>

              <FormInput name="name" label={t('catalog.productNameCol', 'Product Name')} placeholder="e.g. 6-Seater Walnut Dining Table" />
              <FormInput name="dimensions" label={t('catalog.dimensionsLabel', 'Dimensions (W x D x H)')} placeholder={t('catalog.dimensionsPlaceholder', 'e.g. 180cm x 90cm x 75cm')} />

              <div className="grid grid-cols-2 gap-3">
                <FormInput name="basePrice" label={t('catalog.basePrice', 'Base Selling Price (ETB)')} type="number" step="0.01" />
                <FormInput name="estimatedProductionDays" label={t('catalog.estimatedDaysLabel', 'Est. Lead Days')} type="number" />
              </div>

              <FormInput name="description" label={t('catalog.specificationsLabel', 'Detailed Specifications & Materials')} placeholder={t('catalog.specificationsPlaceholder', 'Wood type, foam density, upholstery fabric...')} />

              {/* Showroom Branch Selection */}
              {branches.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-wood-100">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-wood-700" />
                    {t('catalog.displayBranchesLabel', 'Assigned Showroom Branches (Optional)')}
                  </label>
                  <p className="text-[11px] text-stone-500">
                    {t('catalog.displayBranchesHint', 'Select which branches display this model in their showroom. Leave all unchecked to display across all showrooms.')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {branches.map((branch) => {
                      const selected = createForm.watch('branchIds') || [];
                      const isChecked = selected.includes(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-wood-600 bg-wood-50/80 font-medium text-wood-950 shadow-2xs'
                              : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                createForm.setValue('branchIds', [...selected, branch.id]);
                              } else {
                                createForm.setValue(
                                  'branchIds',
                                  selected.filter((id) => id !== branch.id)
                                );
                              }
                            }}
                            className="rounded border-stone-300 text-wood-700 focus:ring-wood-500"
                          />
                          <span className="truncate">{branch.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {createMutation.isError && (
                <p className="text-xs text-red-600 font-medium">
                  {(createMutation.error as any)?.message || 'Failed to create product.'}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('catalog.savingProduct', 'Saving...') : t('catalog.saveProductBtn', 'Create Product')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        {editingProduct && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('catalog.editProductTitle', 'Edit Product')}: {editingProduct.sku}</DialogTitle>
              <DialogDescription>
                {t('catalog.addModelDesc', 'Update specifications, base price guidelines, and lead times.')}
              </DialogDescription>
            </DialogHeader>

            <FormProvider {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => editMutation.mutate(data))} className="space-y-4 py-2">
                <FormInput name="name" label={t('catalog.productNameCol', 'Product Name')} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                      {t('catalog.category', 'Category')}
                    </label>
                    <select
                      {...editForm.register('category')}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Living Room">{translateCategory('Living Room')}</option>
                      <option value="Dining Room">{translateCategory('Dining Room')}</option>
                      <option value="Bedroom">{translateCategory('Bedroom')}</option>
                      <option value="Office">{translateCategory('Office')}</option>
                    </select>
                  </div>
                  <FormInput name="dimensions" label={t('catalog.dimensions', 'Dimensions')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput name="basePrice" label={t('catalog.basePrice', 'Base Price (ETB)')} type="number" step="0.01" />
                  <FormInput name="estimatedProductionDays" label={t('catalog.leadDaysCol', 'Lead Days')} type="number" />
                </div>

                <FormInput name="description" label={t('catalog.specificationsLabel', 'Specifications & Details')} />

                {/* Showroom Branch Selection */}
                {branches.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-wood-100">
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-wood-700" />
                      {t('catalog.displayBranchesLabel', 'Assigned Showroom Branches (Optional)')}
                    </label>
                    <p className="text-[11px] text-stone-500">
                      {t('catalog.displayBranchesHint', 'Select which branches display this model in their showroom. Leave all unchecked to display across all showrooms.')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {branches.map((branch) => {
                        const selected = editForm.watch('branchIds') || [];
                        const isChecked = selected.includes(branch.id);
                        return (
                          <label
                            key={branch.id}
                            className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-wood-600 bg-wood-50/80 font-medium text-wood-950 shadow-2xs'
                                : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  editForm.setValue('branchIds', [...selected, branch.id]);
                                } else {
                                  editForm.setValue(
                                    'branchIds',
                                    selected.filter((id) => id !== branch.id)
                                  );
                                }
                              }}
                              className="rounded border-stone-300 text-wood-700 focus:ring-wood-500"
                            />
                            <span className="truncate">{branch.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {editMutation.isError && (
                  <p className="text-xs text-red-600 font-medium">
                    {(editMutation.error as any)?.message || 'Failed to update product.'}
                  </p>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit" disabled={editMutation.isPending}>
                    {editMutation.isPending ? t('catalog.savingProduct', 'Saving...') : t('catalog.updateProductBtn', 'Save Changes')}
                  </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
        )}
      </Dialog>

      {/* Manage Images Dialog */}
      <Dialog open={!!imageManagingProduct} onOpenChange={(open) => !open && setImageManagingProduct(null)}>
        {imageManagingProduct && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t('catalog.managePhotosTitle', 'Manage Photos')}: {imageManagingProduct.name}</DialogTitle>
              <DialogDescription>
                {t('catalog.uploadPhotosDesc', 'Upload, replace, and designate primary cover photographs for showroom presentation.')}
              </DialogDescription>
            </DialogHeader>

            <ImageUploader product={imageManagingProduct} />

            <DialogFooter className="pt-3">
              <Button onClick={() => setImageManagingProduct(null)}>{t('common.close', 'Done')}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
