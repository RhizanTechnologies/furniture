import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { Armchair, Sparkles, Plus, Eye } from 'lucide-react';

export const ShowroomPage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const sampleProducts = [
    {
      id: 'p1',
      name: 'Grand Dining Set (8-Seater)',
      category: 'Dining Room',
      dimensions: '240cm x 110cm x 76cm',
      basePrice: 85000,
      leadDays: 7,
      description: 'Solid Ethiopian Wanza wood with matte walnut polyurethane finish and hand-carved edge details.',
    },
    {
      id: 'p2',
      name: 'Chesterfield 3-Seater Velvet Sofa',
      category: 'Living Room',
      dimensions: '220cm x 95cm x 80cm',
      basePrice: 68000,
      leadDays: 10,
      description: 'Deep button-tufted upholstery with high-density polyurethane foam and solid eucalyptus inner framework.',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Furniture Showroom"
        description="Digital catalog presentation optimized for customer walk-in consultations and design reviews."
        action={
          <Button size="sm" className="space-x-1.5 shadow">
            <Plus className="h-4 w-4" />
            <span>Add Catalog Item</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleProducts.map((prod) => (
          <Card key={prod.id} className="overflow-hidden border-wood-200/90 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              {/* Product Thumbnail Mockup */}
              <div className="h-48 w-full bg-wood-100 flex items-center justify-center text-wood-700 relative">
                <Armchair className="h-16 w-16 opacity-40" />
                <Badge variant="wood" className="absolute top-3 right-3 shadow-sm">
                  {prod.category}
                </Badge>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{prod.name}</CardTitle>
                <CardDescription className="text-xs">{prod.dimensions}</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-charcoal-700 line-clamp-2">{prod.description}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Base Price</span>
                  <span className="text-lg font-bold text-wood-900">{formatCurrency(prod.basePrice)}</span>
                </div>
              </CardContent>
            </div>

            <CardFooter className="pt-2 border-t border-wood-100 bg-wood-50/40 flex justify-between items-center">
              <span className="text-xs text-charcoal-500 font-medium">Est. {prod.leadDays} days</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedProduct(prod)} className="space-x-1">
                <Eye className="h-3.5 w-3.5" />
                <span>Inspect</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {sampleProducts.length === 0 && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No Products in Catalog"
          description="Start building the showroom by adding your primary furniture models and dimensions."
          actionLabel="Create First Product"
          onAction={() => alert('New product form')}
        />
      )}

      {/* Inspect Product Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        {selectedProduct && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
              <DialogDescription>{selectedProduct.category} • {selectedProduct.dimensions}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-charcoal-700">{selectedProduct.description}</p>
              <div className="p-3 rounded-md bg-wood-50 border border-wood-200">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Baseline Price:</span>
                  <span className="font-bold text-wood-900">{formatCurrency(selectedProduct.basePrice)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Standard Lead Time:</span>
                  <span className="font-medium">{selectedProduct.leadDays} Days</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setSelectedProduct(null)}>Close</Button>
              <Button onClick={() => setSelectedProduct(null)}>Configure Order</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
