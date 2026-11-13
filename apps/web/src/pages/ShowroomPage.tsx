import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProductDto, BranchDto, ProductBranchDto } from '@furniture/shared';
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
import { useLanguage } from '@/context/LanguageContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Armchair, Sparkles, Eye, Search, Clock, CheckCircle, MapPin, Building2 } from 'lucide-react';

export const ShowroomPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, translateCategory } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 12;
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const { data: products, isLoading, error, refetch } = useQuery<ProductDto[]>({
    queryKey: ['products'],
    queryFn: () => apiClient<ProductDto[]>('/products'),
  });

  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient<BranchDto[]>('/branches'),
  });

  const categoryFilters = [
    { id: 'ALL', label: t('showroom.allCategories', 'ALL') },
    { id: 'Living Room', label: t('showroom.livingRoom', 'Living Room') },
    { id: 'Dining Room', label: t('showroom.dining', 'Dining Room') },
    { id: 'Bedroom', label: t('showroom.bedroom', 'Bedroom') },
    { id: 'Office', label: t('showroom.office', 'Office') },
  ];

  const filteredProducts = (products || []).filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesBranch =
      selectedBranchId === 'ALL' ||
      !p.branches ||
      p.branches.length === 0 ||
      p.branches.some((b: ProductBranchDto) => b.id === selectedBranchId);
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.branches && p.branches.some((b: ProductBranchDto) => b.name.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesCategory && matchesBranch && matchesSearch && p.isActive;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const backendHost = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'
  ).replace(/\/api\/v1$/, '');

  const getPrimaryImageUrl = (prod: ProductDto) => {
    const primaryImg = prod.images.find((i: any) => i.isPrimary) || prod.images[0];
    if (!primaryImg) return null;
    return primaryImg.imageUrl.startsWith('http')
      ? primaryImg.imageUrl
      : `${backendHost}${primaryImg.imageUrl}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('showroom.title', 'Furniture Showroom')}
        description={t('showroom.subtitle', 'Browse finished furniture models and real-time branch display locations')}
      />

      {/* Filter and Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('showroom.searchPlaceholder', 'Search showroom models, SKUs, or locations...')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9"
              />
            </div>

            {branches.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-wood-50 border border-wood-200/90 rounded-lg px-2.5 h-9 shrink-0 shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-wood-700 shrink-0" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{t('dashboard.allBranches', 'All Showrooms')}</option>
                  {branches.map((b: BranchDto) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            {categoryFilters.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
                className="text-xs h-8 shrink-0"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      {isLoading ? (
        <LoadingState message={t('common.loading', 'Loading showroom items...')} />
      ) : error ? (
        <ErrorState
          title={t('common.error', 'Error')}
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : paginatedProducts.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedProducts.map((prod) => {
              const primaryUrl = getPrimaryImageUrl(prod);
              return (
                <Card
                  key={prod.id}
                  className="flex flex-col overflow-hidden border-wood-200/90 hover:shadow-md transition-shadow group"
                >
                  <div className="relative h-48 w-full bg-wood-100 overflow-hidden flex items-center justify-center border-b border-wood-100">
                    {primaryUrl ? (
                      <img
                        src={primaryUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-wood-500">
                        <Armchair className="h-10 w-10 opacity-40 mb-1" />
                        <span className="text-[11px] text-muted-foreground">{t('showroom.noPhotos', 'No photo')}</span>
                      </div>
                    )}
                    <Badge
                      variant="wood"
                      className="absolute top-2 left-2 text-[10px] shadow-sm backdrop-blur-xs bg-white/90 text-wood-900 border-wood-200"
                    >
                      {translateCategory(prod.category)}
                    </Badge>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-1">
                      <CardTitle className="text-base font-bold line-clamp-1 text-wood-950">
                        {prod.name}
                      </CardTitle>
                      <span className="text-[11px] font-mono font-medium text-muted-foreground shrink-0">
                        {prod.sku}
                      </span>
                    </div>
                    {prod.dimensions && (
                      <CardDescription className="text-xs text-charcoal-600 line-clamp-1">
                        {prod.dimensions}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-end space-y-2">
                    <div className="flex items-baseline justify-between pt-2 border-t border-wood-100">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          {t('showroom.startingPrice', 'Quoted Baseline Price')}
                        </span>
                        <span className="text-lg font-bold text-wood-900">
                          {formatCurrency(prod.basePrice)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          {t('showroom.productionTime', 'Lead Time')}
                        </span>
                        <span className="text-xs font-semibold text-charcoal-700 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-wood-600" />
                          {prod.estimatedProductionDays || 7} {t('common.days', 'Days')}
                        </span>
                      </div>
                    </div>

                    {/* Showroom Display Badges */}
                    {prod.branches && prod.branches.length > 0 && (
                      <div className="pt-2 border-t border-wood-100/70">
                        <div className="text-[10px] font-semibold text-stone-500 uppercase flex items-center gap-1 mb-1">
                          <Building2 className="h-3 w-3 text-wood-600" />
                          <span>{t('showroom.availableBranches', 'Showrooms')}:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prod.branches.slice(0, 2).map((b: ProductBranchDto) => (
                            <span
                              key={b.id}
                              className="text-[10px] font-medium bg-wood-50 text-wood-900 border border-wood-200/90 rounded px-1.5 py-0.5"
                            >
                              {b.name}
                            </span>
                          ))}
                          {prod.branches.length > 2 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{prod.branches.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setActivePhotoIndex(0);
                      }}
                      className="w-full space-x-1.5 border-wood-300 hover:bg-wood-50"
                    >
                      <Eye className="h-3.5 w-3.5 text-wood-700" />
                      <span>{t('showroom.inspectBtn', 'Inspect')}</span>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalItems={filteredProducts.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title={t('showroom.noProducts', 'No Products Match')}
          description={t('showroom.noProductsDesc', 'Try selecting a different furniture category or clearing your search term.')}
        />
      )}

      {/* Inspect Product Modal with High-Res Gallery - Perfectly Fitting & Vertically Responsive */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        {selectedProduct && (
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border-wood-200">
            {/* Modal Header (Sticky Top) */}
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-wood-100 bg-white shrink-0 text-left">
              <div className="flex items-center space-x-2">
                <Badge variant="wood">{translateCategory(selectedProduct.category)}</Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {selectedProduct.sku}
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-wood-950">
                {selectedProduct.name}
              </DialogTitle>
              {selectedProduct.dimensions && (
                <DialogDescription className="text-xs sm:text-sm text-charcoal-600">
                  {t('showroom.dimensions', 'Dimensions')}: <strong className="text-wood-900">{selectedProduct.dimensions}</strong>
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Modal Body (Scrollable, Vertically Responsive) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
              {/* Photo Showcase */}
              {selectedProduct.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="h-44 sm:h-56 md:h-64 max-h-[35vh] w-full rounded-xl overflow-hidden bg-wood-100 border border-wood-200 flex items-center justify-center">
                    <img
                      src={
                        selectedProduct.images[activePhotoIndex]?.imageUrl.startsWith('http')
                          ? selectedProduct.images[activePhotoIndex].imageUrl
                          : `${backendHost}${selectedProduct.images[activePhotoIndex]?.imageUrl}`
                      }
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain sm:object-cover"
                    />
                  </div>

                  {selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedProduct.images.map((img: any, idx: number) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                            activePhotoIndex === idx
                              ? 'border-wood-800 scale-105 shadow-sm'
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
                <div className="h-32 sm:h-40 rounded-xl bg-wood-50 border border-wood-200 flex flex-col items-center justify-center text-wood-500">
                  <Armchair className="h-10 w-10 opacity-30 mb-1" />
                  <span className="text-xs text-muted-foreground">
                    {t('showroom.noPhotos', 'No showroom photographs uploaded yet.')}
                  </span>
                </div>
              )}

              {/* Specifications Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-wood-50/80 border border-wood-200 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    {t('showroom.startingPrice', 'Quoted Baseline Price')}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-wood-950">
                    {formatCurrency(selectedProduct.basePrice)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-charcoal-700 pt-1 border-t border-wood-200/60">
                  <span>{t('showroom.productionTime', 'Standard Lead Time')}:</span>
                  <span className="font-semibold">{selectedProduct.estimatedProductionDays || 7} {t('common.days', 'Days')}</span>
                </div>
              </div>

              {/* Showroom & Display Locations Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-wood-50/80 border border-wood-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-wood-950">
                  <MapPin className="h-4 w-4 text-wood-700" />
                  <span>{t('showroom.availableBranches', 'Available Showrooms & Display Locations')}</span>
                </div>
                {selectedProduct.branches && selectedProduct.branches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {selectedProduct.branches.map((b: ProductBranchDto) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-lg bg-white border border-wood-200/80 text-xs space-y-1 shadow-2xs"
                      >
                        <div className="font-semibold text-stone-900 flex items-center justify-between">
                          <span>{b.name}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            {t('showroom.onDisplay', 'On Display')}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{b.address}</div>
                        {b.phone && (
                          <div className="text-[10.5px] font-mono text-wood-800 font-medium">
                            {b.phone}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {t('showroom.allBranchesAvailable', 'This piece is an Enterprise Standard model displayed across all branch showrooms.')}
                    </span>
                  </div>
                )}
              </div>

              {selectedProduct.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    {t('showroom.specifications', 'Specifications & Craftsmanship')}
                  </h4>
                  <p className="text-sm text-charcoal-700 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer (Sticky Bottom) */}
            <DialogFooter className="p-3 sm:p-4 border-t border-wood-100 bg-wood-50/70 shrink-0 flex flex-row justify-end space-x-2">
              <Button variant="secondary" onClick={() => setSelectedProduct(null)}>
                {t('common.close', 'Close')}
              </Button>
              <Button onClick={() => {
                setSelectedProduct(null);
                navigate('/orders');
              }}>
                {t('showroom.createOrder', 'Quote & Create Order')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
