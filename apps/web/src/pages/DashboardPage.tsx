import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Plus, TrendingUp, Layers, DollarSign, Store } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  // Foundation demonstration metrics
  const stats = [
    { title: 'Total Sales Pipeline', value: formatCurrency(450000), icon: DollarSign, change: '+12% this month' },
    { title: 'Active Workshop Orders', value: '18 Orders', icon: Layers, change: 'Across 2 branches' },
    { title: 'Production Velocity', value: '4.2 Days Avg', icon: TrendingUp, change: 'Consistent' },
    { title: 'Registered Branches', value: '2 Active', icon: Store, change: 'Main & Bole Branch' },
  ];

  const recentOrders = [
    { id: 'ORD-2026-001', customer: 'Dawit Abebe', product: 'Mahogany Dining Table', branch: 'Main Branch', total: 65000, paid: 35000, balance: 30000, stage: 'Carpentry & Framing' },
    { id: 'ORD-2026-002', customer: 'Sara Tesfaye', product: 'Chesterfield Velvet Sofa', branch: 'Bole Branch', total: 85000, paid: 85000, balance: 0, stage: 'Delivered & Fulfilled' },
    { id: 'ORD-2026-003', customer: 'Henok Girma', product: 'Executive Oak Desk', branch: 'Main Branch', total: 42000, paid: 20000, balance: 22000, stage: 'Deposit Received' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        description="Unified operations monitoring across business branches and furniture workshops."
        action={
          <Button size="sm" className="space-x-1.5 shadow">
            <Plus className="h-4 w-4" />
            <span>New Order</span>
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border-wood-200/80 hover:border-wood-400 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  {stat.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-wood-100 flex items-center justify-center text-wood-800">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold tracking-tight text-charcoal-900">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Production Pipeline Table */}
      <Card className="border-wood-200/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Workshop Orders</CardTitle>
              <CardDescription>Real-time order stage progression and financial balances.</CardDescription>
            </div>
            <Badge variant="wood">Active Batches</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Product</TableHead>
                <TableHead className="hidden sm:table-cell">Branch</TableHead>
                <TableHead>Agreed Total</TableHead>
                <TableHead>Remaining Balance</TableHead>
                <TableHead>Current Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold text-wood-900">{order.id}</TableCell>
                  <TableCell className="font-medium">{order.customer}</TableCell>
                  <TableCell className="hidden md:table-cell text-charcoal-600">{order.product}</TableCell>
                  <TableCell className="hidden sm:table-cell text-charcoal-500">{order.branch}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    {order.balance > 0 ? (
                      <span className="text-amber-700 font-semibold">{formatCurrency(order.balance)}</span>
                    ) : (
                      <Badge variant="success">Fully Paid</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="border border-wood-300">
                      {order.stage}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
