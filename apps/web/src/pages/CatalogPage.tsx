import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProductDto,
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
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ImageUploader } from '@/components/products/ImageUploader';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Search,
  Image as ImageIcon,
  Edit2,
  Armchair,
  Filter,
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [imageManagingProduct, setImageManagingProduct] = useState<ProductDto | null>(null);

  // Fetch all products
  const { data: products, isLoading, error, refetch } = useQuery<ProductDto[]>({
    queryKey: ['products'],
    queryFn: () => apiClient<ProductDto[]>('/products'),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Furniture Catalog Management"
        description="Maintain the enterprise product models, specifications, baseline prices, and showroom photo galleries."
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="space-x-1.5 shadow">
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by SKU, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                onClick={() => setSelectedCategory(cat)}
                className="text-xs h-8 px-3 shrink-0"
              >
                {cat}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Dimensions</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead className="hidden sm:table-cell">Lead Days</TableHead>
                <TableHead>Gallery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell className="font-mono text-xs font-semibold text-wood-900">
                    {prod.sku}
                  </TableCell>
                  <TableCell className="font-medium text-charcoal-900">
                    <div>{prod.name}</div>
                    <div className="text-[11px] text-muted-foreground sm:hidden">
                      {prod.category} • {prod.dimensions}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="wood" className="text-[11px]">
                      {prod.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-charcoal-600">
                    {prod.dimensions || '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-charcoal-900">
                    {formatCurrency(prod.basePrice)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-charcoal-600">
                    {prod.estimatedProductionDays ? `${prod.estimatedProductionDays} days` : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setImageManagingProduct(prod)}
                      className="h-7 text-xs space-x-1 border-wood-300"
                    >
                      <ImageIcon className="h-3 w-3 text-wood-700" />
                      <span>{prod.images.length} Photos</span>
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
                    No products found matching your search and category filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Product Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Furniture Model</DialogTitle>
            <DialogDescription>
              Register a new product with dimensions and base pricing in Ethiopian Birr.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <FormInput name="sku" label="Product SKU" placeholder="e.g. SKU-DIN-002" />
                <div className="space-y-1.5 w-full">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Category
                  </label>
                  <select
                    {...createForm.register('category')}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Dining Room">Dining Room</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Office">Office</option>
                  </select>
                </div>
              </div>

              <FormInput name="name" label="Product Name" placeholder="e.g. 6-Seater Walnut Dining Table" />
              <FormInput name="dimensions" label="Dimensions (W x D x H)" placeholder="e.g. 180cm x 90cm x 75cm" />

              <div className="grid grid-cols-2 gap-3">
                <FormInput name="basePrice" label="Base Selling Price (ETB)" type="number" step="0.01" />
                <FormInput name="estimatedProductionDays" label="Est. Lead Days" type="number" />
              </div>

              <FormInput name="description" label="Detailed Specifications & Materials" placeholder="Wood type, foam density, upholstery fabric..." />

              {createMutation.isError && (
                <p className="text-xs text-red-600 font-medium">
                  {(createMutation.error as any)?.message || 'Failed to create product.'}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Create Product'}
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
              <DialogTitle>Edit Product: {editingProduct.sku}</DialogTitle>
              <DialogDescription>
                Update specifications, base price guidelines, and lead times.
              </DialogDescription>
            </DialogHeader>

            <FormProvider {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => editMutation.mutate(data))} className="space-y-4 py-2">
                <FormInput name="name" label="Product Name" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                      Category
                    </label>
                    <select
                      {...editForm.register('category')}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Living Room">Living Room</option>
                      <option value="Dining Room">Dining Room</option>
                      <option value="Bedroom">Bedroom</option>
                      <option value="Office">Office</option>
                    </select>
                  </div>
                  <FormInput name="dimensions" label="Dimensions" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput name="basePrice" label="Base Price (ETB)" type="number" step="0.01" />
                  <FormInput name="estimatedProductionDays" label="Lead Days" type="number" />
                </div>

                <FormInput name="description" label="Specifications & Details" />

                {editMutation.isError && (
                  <p className="text-xs text-red-600 font-medium">
                    {(editMutation.error as any)?.message || 'Failed to update product.'}
                  </p>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editMutation.isPending}>
                    {editMutation.isPending ? 'Saving...' : 'Save Changes'}
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
              <DialogTitle>Manage Photos: {imageManagingProduct.name}</DialogTitle>
              <DialogDescription>
                Upload, replace, and designate primary cover photographs for showroom presentation.
              </DialogDescription>
            </DialogHeader>

            <ImageUploader product={imageManagingProduct} />

            <DialogFooter className="pt-3">
              <Button onClick={() => setImageManagingProduct(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
