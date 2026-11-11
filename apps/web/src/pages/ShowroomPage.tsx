import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProductDto } from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Armchair, Sparkles, Eye, Search, Clock, CheckCircle } from 'lucide-react';

export const ShowroomPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 12;
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const { data: products, isLoading, error, refetch } = useQuery<ProductDto[]>({
    queryKey: ['products'],
    queryFn: () => apiClient<ProductDto[]>('/products'),
  });

  const categories = ['ALL', 'Living Room', 'Dining Room', 'Bedroom', 'Office'];

  const filteredProducts = (products || []).filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && p.isActive;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const backendHost = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'
  ).replace(/\/api\/v1$/, '');

  const getPrimaryImageUrl = (prod: ProductDto) => {
    const primaryImg = prod.images.find((i) => i.isPrimary) || prod.images[0];
    if (!primaryImg) return null;
    return primaryImg.imageUrl.startsWith('http')
      ? primaryImg.imageUrl
      : `${backendHost}${primaryImg.imageUrl}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Furniture Showroom"
        description="Digital catalog presentation optimized for client consultations, walk-in showroom tours, and order quotation."
      />

      {/* Filter and Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search showroom models..."
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
                {cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingState message="Loading showroom collection..." />}

      {error && (
        <ErrorState
          title="Failed to Load Showroom"
          message={(error as any)?.message || 'An error occurred while loading products.'}
          onRetry={() => refetch()}
        />
      )}

      {products && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((prod) => {
              const primaryImageUrl = getPrimaryImageUrl(prod);

              return (
                <Card
                  key={prod.id}
                  className="overflow-hidden border-wood-200/90 flex flex-col justify-between hover:shadow-md transition-shadow group"
                >
                  <div>
                    {/* Thumbnail Cover Photo */}
                    <div className="h-52 w-full bg-wood-100 flex items-center justify-center text-wood-700 relative overflow-hidden">
                      {primaryImageUrl ? (
                        <img
                          src={primaryImageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-wood-400">
                          <Armchair className="h-16 w-16 mb-1 opacity-40" />
                          <span className="text-[11px] font-medium text-wood-600/70">
                            Handcrafted Furniture
                          </span>
                        </div>
                      )}
                      <Badge variant="wood" className="absolute top-3 right-3 shadow-sm text-[11px]">
                        {prod.category}
                      </Badge>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-charcoal-900 group-hover:text-wood-900 transition-colors">
                            {prod.name}
                          </CardTitle>
                          <CardDescription className="text-xs font-mono">{prod.sku}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {prod.dimensions && (
                        <div className="text-xs text-charcoal-600 font-medium">
                          Size: {prod.dimensions}
                        </div>
                      )}
                      <p className="text-xs text-charcoal-600 line-clamp-2">
                        {prod.description || 'Custom handcrafted piece built to client specifications.'}
                      </p>
                      <div className="pt-2 flex items-baseline justify-between border-t border-wood-100">
                        <span className="text-xs uppercase text-muted-foreground font-semibold">
                          Base Price
                        </span>
                        <span className="text-lg font-bold text-wood-900">
                          {formatCurrency(prod.basePrice)}
                        </span>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="pt-2 border-t border-wood-100 bg-wood-50/40 flex justify-between items-center">
                    <span className="text-xs text-charcoal-600 flex items-center space-x-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-wood-600" />
                      <span>Est. {prod.estimatedProductionDays || 7} days</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setActivePhotoIndex(0);
                      }}
                      className="space-x-1 border-wood-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect</span>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {products && filteredProducts.length === 0 && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No Products Match"
          description="Try selecting a different furniture category or clearing your search term."
        />
      )}

      {/* Inspect Product Modal with High-Res Gallery */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        {selectedProduct && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center space-x-2">
                <Badge variant="wood">{selectedProduct.category}</Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {selectedProduct.sku}
                </span>
              </div>
              <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
              {selectedProduct.dimensions && (
                <DialogDescription>
                  Dimensions: <strong>{selectedProduct.dimensions}</strong>
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Photo Showcase */}
              {selectedProduct.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="h-64 sm:h-80 w-full rounded-lg overflow-hidden bg-wood-100 border border-wood-200">
                    <img
                      src={
                        selectedProduct.images[activePhotoIndex]?.imageUrl.startsWith('http')
                          ? selectedProduct.images[activePhotoIndex].imageUrl
                          : `${backendHost}${selectedProduct.images[activePhotoIndex]?.imageUrl}`
                      }
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`h-16 w-16 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                            activePhotoIndex === idx
                              ? 'border-wood-800 scale-105'
                              : 'border-wood-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={
                              img.thumbnailUrl?.startsWith('http')
                                ? img.thumbnailUrl
                                : `${backendHost}${img.thumbnailUrl || img.imageUrl}`
                            }
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 rounded-lg bg-wood-50 border border-wood-200 flex flex-col items-center justify-center text-wood-500">
                  <Armchair className="h-12 w-12 opacity-30 mb-1" />
                  <span className="text-xs text-muted-foreground">
                    No showroom photographs uploaded yet.
                  </span>
                </div>
              )}

              {/* Specifications Box */}
              <div className="p-4 rounded-lg bg-wood-50/80 border border-wood-200 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    Quoted Baseline Price
                  </span>
                  <span className="text-xl font-bold text-wood-950">
                    {formatCurrency(selectedProduct.basePrice)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-charcoal-700 pt-1 border-t border-wood-200/60">
                  <span>Standard Lead Time:</span>
                  <span className="font-semibold">{selectedProduct.estimatedProductionDays || 7} Days</span>
                </div>
              </div>

              {selectedProduct.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Specifications & Craftsmanship
                  </h4>
                  <p className="text-sm text-charcoal-700 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setSelectedProduct(null)}>
                Close
              </Button>
              <Button onClick={() => setSelectedProduct(null)}>
                Quote & Create Order
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
