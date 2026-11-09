import { Module } from '@nestjs/common';
import { OrderStagesService } from './order-stages.service';
import { OrderStagesController } from './order-stages.controller';

@Module({
  controllers: [OrderStagesController],
  providers: [OrderStagesService],
  exports: [OrderStagesService],
})
export class OrderStagesModule {}
