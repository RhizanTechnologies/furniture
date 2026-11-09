import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/LoadingState';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Plus,
  TrendingUp,
  Layers,
  DollarSign,
  Store,
  Boxes,
  ArrowRight,
  BarChart3,
  CreditCard,
  ShoppingBag,
  UserPlus,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { ExecutiveDashboardAnalyticsDto, OrderDto } from '@furniture/shared';

export const DashboardPage: React.FC = () => {
  const { user, isOwner } = useAuth();

  // 1. Fetch Live Analytics (Only for Owner)
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery<ExecutiveDashboardAnalyticsDto>({
    queryKey: ['dashboard-analytics'],
    queryFn: () => apiClient<ExecutiveDashboardAnalyticsDto>('/analytics/dashboard?period=monthly'),
    enabled: isOwner,
  });

  // 2. Fetch Recent Orders (Owner gets all, Branch Admin gets branch orders)
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery<OrderDto[]>({
    queryKey: ['recent-orders'],
    queryFn: () => apiClient<OrderDto[]>('/orders'),
  });

  const fin = analytics?.financialOverview;
  const stock = analytics?.stockOverview;

  // Executive stats for Owner only
  const ownerStats = [
    {
      title: 'Monthly Sales Pipeline',
      value: formatCurrency(fin?.contractedRevenue || 0),
      icon: DollarSign,
      sub: `Earned: ${formatCurrency(fin?.earnedRevenue || 0)}`,
    },
    {
      title: 'Cash Collected (Inflow)',
      value: formatCurrency(fin?.cashCollected || 0),
      icon: CreditCard,
      sub: `Receivables: ${formatCurrency(fin?.outstandingReceivables || 0)}`,
    },
    {
      title: 'Net Business Profit',
      value: formatCurrency(fin?.netProfit || 0),
      icon: TrendingUp,
      sub: `${fin?.netMarginPercentage || 0}% Net Margin`,
    },
    {
      title: 'Raw Material Stock Value',
      value: formatCurrency(stock?.totalStockValue || 0),
      icon: Boxes,
      sub: `${stock?.activeMaterialsCount || 0} active materials`,
    },
  ];

  // Operational stats for Branch Admin
  const inProductionOrders = orders.filter((o) => !o.currentStage?.isFinalStage);
  const completedOrders = orders.filter((o) => o.currentStage?.isFinalStage);
  const uniqueCustomersCount = new Set(orders.map((o) => o.customerId).filter(Boolean)).size;

  const branchStats = [
    {
      title: 'Total Branch Orders',
      value: `${orders.length}`,
      icon: ShoppingBag,
      sub: `${orders.length} orders recorded`,
    },
    {
      title: 'In Production / Framing',
      value: `${inProductionOrders.length}`,
      icon: Layers,
      sub: 'Active workshop workflows',
    },
    {
      title: 'Fulfilled / Delivered',
      value: `${completedOrders.length}`,
      icon: CheckCircle2,
      sub: 'Completed deliveries',
    },
    {
      title: 'Registered Clients',
      value: `${uniqueCustomersCount}`,
      icon: Users,
      sub: 'Branch customer accounts',
    },
  ];

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOwner ? 'Executive Overview' : `${user?.branch?.name || 'Branch'} Operations`}
        description={
          isOwner
            ? 'Unified operations monitoring across business branches, workshops, inventory and financials.'
            : 'Track branch orders, update production stages, register customers and manage local fulfillments.'
        }
        action={
          <div className="flex items-center space-x-2">
            {isOwner && (
              <Link to="/analytics">
                <Button variant="outline" size="sm" className="space-x-1.5 border-wood-300">
                  <BarChart3 className="h-4 w-4" />
                  <span>Deep Analytics</span>
                </Button>
              </Link>
            )}
            <Link to="/customers">
              <Button variant="outline" size="sm" className="space-x-1.5 border-wood-300">
                <UserPlus className="h-4 w-4" />
                <span>Register Customer</span>
              </Button>
            </Link>
            <Link to="/orders">
              <Button size="sm" className="space-x-1.5 bg-wood-700 hover:bg-wood-800 text-white shadow">
                <Plus className="h-4 w-4" />
                <span>Create Order</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(isOwner ? ownerStats : branchStats).map((stat, idx) => {
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
                <div className="text-xl font-bold tracking-tight text-charcoal-900 font-mono">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
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
              <CardTitle className="text-lg">
                {isOwner ? 'Recent Business Orders' : 'Recent Branch Orders'}
              </CardTitle>
              <CardDescription>
                Live order stage progression, customer details and payment balances.
              </CardDescription>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm" className="text-xs text-wood-800 space-x-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isOrdersLoading ? (
            <LoadingState message="Loading recent orders..." />
          ) : recentOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">
              No orders recorded yet. Click "Create Order" to record an order.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  {isOwner && <TableHead className="hidden md:table-cell">Branch</TableHead>}
                  <TableHead className="text-right">Agreed Total</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                  <TableHead className="text-center">Current Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold text-wood-900 font-mono text-xs">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      <div>{order.customer?.fullName || 'Walk-In Customer'}</div>
                      <div className="text-[11px] text-muted-foreground">{order.customer?.phone}</div>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="hidden md:table-cell text-charcoal-600 text-xs">
                        {order.branch?.name}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium font-mono text-xs">
                      {formatCurrency(order.totalAgreedPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {order.outstandingBalance > 0 ? (
                        <span className="text-amber-800">{formatCurrency(order.outstandingBalance)}</span>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                          Fully Paid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        style={{
                          backgroundColor: order.currentStage?.color || '#8B5A2B',
                          color: '#ffffff',
                        }}
                        className="text-[10px]"
                      >
                        {order.currentStage?.name || 'In Production'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default DashboardPage;
