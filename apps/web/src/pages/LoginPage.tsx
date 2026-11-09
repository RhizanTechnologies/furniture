import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@furniture/shared';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { Armchair, Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setAuthError(null);
      setIsSubmitting(true);
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (email: string, pass: string) => {
    methods.setValue('email', email);
    methods.setValue('password', pass);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wood-800 text-wood-50 shadow-md mb-1">
            <Armchair className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
            Furniture Business ERP
          </h1>
          <p className="text-sm text-charcoal-600">
            Sign in to access workshop operations, catalog and branch management.
          </p>
        </div>

        <Card className="border-wood-200/90 shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>
              Enter your enterprise email and password.
            </CardDescription>
          </CardHeader>
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {authError && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <FormInput
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="e.g. owner@furniture.com"
                  autoComplete="email"
                />

                <FormInput
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full space-x-2"
                  disabled={isSubmitting}
                >
                  <Lock className="h-4 w-4" />
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                </Button>

                {/* Quick Demo Credentials for Reviewers */}
                <div className="w-full pt-3 border-t border-wood-100 text-center">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Quick Test Accounts:</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <button
                      type="button"
                      onClick={() => setDemoCredentials('owner@furniture.com', 'Owner@123456')}
                      className="text-[11px] bg-wood-100 hover:bg-wood-200 text-wood-800 px-2 py-1 rounded font-medium transition-colors"
                    >
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoCredentials('admin.bole@furniture.com', 'Admin@123456')}
                      className="text-[11px] bg-wood-100 hover:bg-wood-200 text-wood-800 px-2 py-1 rounded font-medium transition-colors"
                    >
                      Bole Branch Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoCredentials('admin.central@furniture.com', 'Admin@123456')}
                      className="text-[11px] bg-wood-100 hover:bg-wood-200 text-wood-800 px-2 py-1 rounded font-medium transition-colors"
                    >
                      Central Branch Admin
                    </button>
                  </div>
                </div>
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
      </div>
    </div>
  );
};
