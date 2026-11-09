import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { StorageModule } from './modules/storage/storage.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrderStagesModule } from './modules/order-stages/order-stages.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { FinancialModule } from './modules/financial/financial.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    AuthModule,
    BranchesModule,
    StorageModule,
    ProductsModule,
    CustomersModule,
    OrderStagesModule,
    OrdersModule,
    InventoryModule,
    FinancialModule,
    HealthModule,
  ],
})
export class AppModule {}
