import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductDto, ProductImageDto } from '@furniture/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  UploadCloud,
  X,
  Star,
  Trash2,
  AlertCircle,
  Loader2,
  Camera,
  Image as ImageIcon,
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

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
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

  const handleStartUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
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
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-wood-100 flex items-center justify-center text-wood-700">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium text-charcoal-800">
              Drag and drop a photo here, or browse files
            </div>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, and WebP (up to 5MB). Automatically converted and resized.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="space-x-1.5"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Select Photo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="space-x-1.5 sm:hidden"
              >
                <Camera className="h-4 w-4" />
                <span>Camera</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative mx-auto max-w-[200px] rounded-lg overflow-hidden border border-wood-200 shadow-sm">
              <img
                src={previewUrl!}
                alt="Selected preview"
                className="w-full h-36 object-cover"
              />
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-xs text-charcoal-700 font-medium truncate max-w-xs mx-auto">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
            <div className="flex justify-center space-x-2 pt-1">
              <Button
                type="button"
                variant="secondary"
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing & Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload to Storage</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {validationError && (
          <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center space-x-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {uploadMutation.isError && (
          <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center space-x-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{(uploadMutation.error as any)?.message || 'Upload failed.'}</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleStartUpload}
              className="text-xs text-red-800 underline p-0 h-auto ml-1"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Gallery of Existing Images */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-3">
          Product Gallery ({product.images?.length || 0} Photos)
        </h4>

        {(!product.images || product.images.length === 0) ? (
          <p className="text-xs text-muted-foreground italic">
            No photographs uploaded yet for this product.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {product.images.map((img) => {
              const fullImgUrl = img.imageUrl.startsWith('http')
                ? img.imageUrl
                : `${backendHost}${img.imageUrl}`;

              return (
                <div
                  key={img.id}
                  className="group relative rounded-lg border border-wood-200 overflow-hidden bg-white shadow-sm flex flex-col"
                >
                  <div className="h-28 w-full relative bg-wood-100">
                    <img
                      src={fullImgUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {img.isPrimary && (
                      <Badge
                        variant="wood"
                        className="absolute top-1.5 left-1.5 text-[10px] space-x-1 shadow"
                      >
                        <Star className="h-3 w-3 fill-wood-700 text-wood-700" />
                        <span>Primary</span>
                      </Badge>
                    )}
                  </div>

                  <div className="p-2 flex items-center justify-between bg-wood-50/50 text-xs">
                    {!img.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => setPrimaryMutation.mutate(img.id)}
                        disabled={setPrimaryMutation.isPending}
                        className="text-[11px] text-wood-800 hover:underline flex items-center space-x-1 font-medium"
                      >
                        <Star className="h-3 w-3" />
                        <span>Make Primary</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        Default Cover
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this photograph from storage?')) {
                          deleteMutation.mutate(img.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-charcoal-400 hover:text-red-600 transition-colors p-1"
                      title="Delete photograph"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
