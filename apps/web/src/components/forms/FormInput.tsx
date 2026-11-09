import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input, InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormInputProps extends InputProps {
  name: string;
  label: string;
  description?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  description,
  className,
  ...props
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-1.5 w-full">
      <label
        htmlFor={name}
        className="text-xs font-semibold uppercase tracking-wider text-charcoal-700"
      >
        {label}
      </label>
      <Input
        id={name}
        {...register(name)}
        className={cn(error && 'border-red-500 focus-visible:ring-red-500', className)}
        {...props}
      />
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};
