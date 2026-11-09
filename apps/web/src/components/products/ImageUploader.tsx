import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductDto, ProductImageDto } from '@furniture/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { db, OfflineImageRecord } from '@/lib/db';
import { syncEngine } from '@/lib/sync-engine';
import {
  UploadCloud,
  X,
  Star,
  Trash2,
  AlertCircle,
  Loader2,
  Camera,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';

interface ImageUploaderProps {
  product: ProductDto;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ product }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offlinePendingImages, setOfflinePendingImages] = useState<
    Array<{ id: string; previewUrl: string; fileName: string; status: string }>
  >([]);

  // Load offline pending images from IndexedDB
  const loadOfflineImages = async () => {
    try {
      const records = await db.offlineImages
        .where('productId')
        .equals(product.id)
        .toArray();

      const items = records
        .filter((r) => r.status === 'PENDING' || r.status === 'UPLOADING')
        .map((r) => ({
          id: r.id,
          previewUrl: URL.createObjectURL(r.blob),
          fileName: r.fileName,
          status: r.status,
        }));
      setOfflinePendingImages(items);
    } catch (e) {
      console.error('Failed to load offline images', e);
    }
  };

  useEffect(() => {
    loadOfflineImages();
    const unsub = syncEngine.subscribe(() => {
      loadOfflineImages();
    });
    return unsub;
  }, [product.id]);

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!navigator.onLine) {
        throw new Error('OFFLINE_MODE');
      }

      const formData = new FormData();
      formData.append('image', file);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_BASE_URL}/products/${product.id}/images`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const resJson = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(resJson?.error?.message || 'Failed to upload image');
      }
      return resJson.data as ProductImageDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      handleClearSelection();
    },
    onError: async (err: any) => {
      // If offline or network error, safely store Blob in IndexedDB
      if (selectedFile) {
        await syncEngine.enqueueImage(selectedFile, selectedFile.name, product.id);
        await loadOfflineImages();
        handleClearSelection();
      }
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      apiClient(`/products/${product.id}/images/${imageId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
    },
  });

  // Set Primary Mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) =>
      apiClient(`/products/${product.id}/images/${imageId}/primary`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
    },
  });

  const handleValidateAndSelect = (file: File) => {
    setValidationError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setValidationError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      setValidationError('Image size exceeds the 5MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleValidateAndSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    if (!navigator.onLine) {
      // Offline: save Blob directly to IndexedDB
      await syncEngine.enqueueImage(selectedFile, selectedFile.name, product.id);
      await loadOfflineImages();
      handleClearSelection();
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const backendHost = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(
    /\/api\/v1$/,
    '',
  );

  return (
    <div className="space-y-5">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
          isDragging ? 'border-wood-700 bg-wood-100/50' : 'border-wood-300 bg-wood-50/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="product-photo-upload"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-wood-100 rounded-full text-wood-800">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-wood-900">
                Drag and drop your workshop photo here, or browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, or WebP up to 5MB (Offline capture supported)
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="space-x-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Select Photo</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-wood-200 shadow-sm max-w-xs">
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleStartUpload}
                disabled={uploadMutation.isPending}
                className="space-x-1.5"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>{navigator.onLine ? 'Upload Image' : 'Save Locally (Offline)'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Offline Pending Images Section */}
      {offlinePendingImages.length > 0 && (
        <div className="space-y-3 p-3 bg-amber-500/10 rounded-lg border border-amber-300 dark:border-amber-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>Locally Saved Photos ({offlinePendingImages.length}) — Pending Sync</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {offlinePendingImages.map((img) => (
              <div
                key={img.id}
                className="relative rounded-lg overflow-hidden border border-amber-300 bg-background shadow-sm"
              >
                <img
                  src={img.previewUrl}
                  alt={img.fileName}
                  className="w-full h-28 object-cover opacity-90"
                />
                <div className="p-1.5 bg-background/90 text-[10px] font-medium flex items-center justify-between">
                  <span className="truncate">{img.fileName}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-100 text-amber-800">
                    Pending
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Confirmed Product Gallery */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" />
          <span>Confirmed Product Gallery ({product.images?.length || 0})</span>
        </h4>

        {(!product.images || product.images.length === 0) ? (
          <p className="text-sm text-muted-foreground italic py-3 text-center border border-dashed rounded-lg">
            No confirmed images yet for this product.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {product.images.map((img) => {
              const fullUrl = img.imageUrl.startsWith('http')
                ? img.imageUrl
                : `${backendHost}${img.imageUrl}`;

              return (
                <div
                  key={img.id}
                  className="group relative rounded-lg overflow-hidden border border-wood-200 bg-card shadow-sm"
                >
                  <img
                    src={fullUrl}
                    alt={product.name}
                    className="w-full h-32 object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {img.isPrimary && (
                    <div className="absolute top-1.5 left-1.5">
                      <Badge className="bg-wood-800 text-wood-50 text-[10px] px-1.5 py-0.5 shadow-sm space-x-1">
                        <Star className="w-3 h-3 fill-wood-300 text-wood-300" />
                        <span>Primary</span>
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.isPrimary && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrimaryMutation.mutate(img.id)}
                        disabled={setPrimaryMutation.isPending}
                        className="h-8 px-2 text-xs"
                        title="Set as Primary"
                      >
                        <Star className="w-3.5 h-3.5 mr-1" />
                        Primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(img.id)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
