import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncBatchDto, SyncEntityType } from './dto/sync-batch.dto';
import { CustomersService } from '../customers/customers.service';
import { OrdersService } from '../orders/orders.service';
import { FinancialService } from '../financial/financial.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { CreatePaymentDto } from '../financial/dto/create-payment.dto';
import { CreateExpenseDto } from '../financial/dto/create-expense.dto';
import { CreateMaterialConsumptionDto } from '../inventory/dto/create-material-consumption.dto';
import { UserRole } from '@furniture/shared';
import { Prisma } from '@prisma/client';

export interface SyncOperationResult {
  clientMutationId: string;
  entityType: SyncEntityType;
  status: 'SUCCESS' | 'CONFLICT' | 'VALIDATION_ERROR' | 'RETRYABLE_ERROR';
  result?: any;
  error?: string;
  conflictType?: string;
  conflictDetails?: any;
  isDuplicate?: boolean;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly ordersService: OrdersService,
    private readonly financialService: FinancialService,
    private readonly inventoryService: InventoryService,
  ) {}

  async processBatch(dto: SyncBatchDto, user: any): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];
    const tempIdMap = new Map<string, string>();

    for (const op of dto.operations) {
      try {
        // 1. Idempotency Check
        const existingRecord = await this.prisma.idempotencyRecord.findUnique({
          where: { idempotencyKey: op.clientMutationId },
        });

        if (existingRecord) {
          const payload = existingRecord.responsePayload as any;
          if (op.tempEntityId && payload?.id) {
            tempIdMap.set(op.tempEntityId, payload.id);
          }
          results.push({
            clientMutationId: op.clientMutationId,
            entityType: op.entityType,
            status: 'SUCCESS',
            result: payload,
            isDuplicate: true,
          });
          continue;
        }

        // 2. Process according to entity type
        let opResult: any;

        switch (op.entityType) {
          case SyncEntityType.CUSTOMER: {
            const cleanPhone = (op.payload.phone || '').replace(/[\s\-\(\)]/g, '').trim();
            const existingCustomer = await this.prisma.customer.findFirst({
              where: { phone: cleanPhone },
            });

            if (existingCustomer) {
              opResult = {
                ...existingCustomer,
                syncedNote: 'MERGED_EXISTING_CUSTOMER',
              };
            } else {
              const branchId =
                user.role === UserRole.OWNER
                  ? op.payload.branchId || user.branchId
                  : user.branchId;

              const customerDto = {
                ...op.payload,
                branchId,
              } as CreateCustomerDto;

              opResult = await this.customersService.createCustomer(customerDto, user);
            }

            if (op.tempEntityId && opResult?.id) {
              tempIdMap.set(op.tempEntityId, opResult.id);
            }
            break;
          }

          case SyncEntityType.ORDER: {
            let customerId = op.payload.customerId;
            if (tempIdMap.has(customerId)) {
              customerId = tempIdMap.get(customerId)!;
            }

            const branchId =
              user.role === UserRole.OWNER
                ? op.payload.branchId || user.branchId
                : user.branchId;

            const orderDto = {
              ...op.payload,
              customerId,
              branchId,
            } as CreateOrderDto;

            opResult = await this.ordersService.createOrder(orderDto, user);

            if (op.tempEntityId && opResult?.id) {
              tempIdMap.set(op.tempEntityId, opResult.id);
            }
            break;
          }

          case SyncEntityType.ORDER_STAGE_ADVANCE: {
            let orderId = op.payload.orderId;
            if (tempIdMap.has(orderId)) {
              orderId = tempIdMap.get(orderId)!;
            }

            const order = await this.prisma.order.findUnique({
              where: { id: orderId },
            });

            if (!order) {
              throw new Error(`Order ${orderId} not found`);
            }

            if (order.currentStageId === op.payload.toStageId) {
              opResult = order;
            } else {
              opResult = await this.ordersService.changeOrderStage(
                orderId,
                {
                  toStageId: op.payload.toStageId,
                  notes: op.payload.notes,
                },
                user,
              );
            }
            break;
          }

          case SyncEntityType.PAYMENT: {
            let orderId = op.payload.orderId;
            if (tempIdMap.has(orderId)) {
              orderId = tempIdMap.get(orderId)!;
            }

            const order = await this.prisma.order.findUnique({
              where: { id: orderId },
            });

            if (!order) {
              throw new Error(`Order ${orderId} not found for payment`);
            }

            const pAmount = new Prisma.Decimal(op.payload.amount);
            if (pAmount.greaterThan(order.outstandingBalance)) {
              results.push({
                clientMutationId: op.clientMutationId,
                entityType: op.entityType,
                status: 'CONFLICT',
                conflictType: 'OVERPAYMENT_REJECTED',
                conflictDetails: {
                  orderId,
                  orderNumber: order.orderNumber,
                  outstandingBalance: Number(order.outstandingBalance),
                  attemptedAmount: Number(pAmount),
                },
                error: `Payment amount ${pAmount} exceeds remaining balance of ${order.outstandingBalance}`,
              });
              continue;
            }

            const paymentDto = {
              ...op.payload,
              orderId,
              idempotencyKey: op.clientMutationId,
            } as CreatePaymentDto;

            opResult = await this.financialService.recordPayment(paymentDto, user);
            break;
          }

          case SyncEntityType.EXPENSE: {
            const branchId =
              user.role === UserRole.OWNER
                ? op.payload.branchId || user.branchId
                : user.branchId;

            const expenseDto = {
              ...op.payload,
              branchId,
              idempotencyKey: op.clientMutationId,
            } as CreateExpenseDto;

            opResult = await this.financialService.recordExpense(expenseDto, user);
            break;
          }

          case SyncEntityType.MATERIAL_CONSUMPTION: {
            let orderId = op.payload.orderId;
            if (tempIdMap.has(orderId)) {
              orderId = tempIdMap.get(orderId)!;
            }

            const rawMaterial = await this.prisma.rawMaterial.findUnique({
              where: { id: op.payload.rawMaterialId },
            });

            if (!rawMaterial) {
              throw new Error(`Raw material ${op.payload.rawMaterialId} not found`);
            }

            const consumedQty = new Prisma.Decimal(op.payload.consumedQuantity);
            if (rawMaterial.currentStockQuantity.lessThan(consumedQty)) {
              results.push({
                clientMutationId: op.clientMutationId,
                entityType: op.entityType,
                status: 'CONFLICT',
                conflictType: 'INSUFFICIENT_STOCK',
                conflictDetails: {
                  rawMaterialId: rawMaterial.id,
                  rawMaterialName: rawMaterial.name,
                  availableStock: Number(rawMaterial.currentStockQuantity),
                  requestedQuantity: Number(consumedQty),
                  unitOfMeasurement: rawMaterial.unitOfMeasurement,
                },
                error: `Insufficient stock for ${rawMaterial.name}. Available: ${rawMaterial.currentStockQuantity}, requested: ${consumedQty}`,
              });
              continue;
            }

            const consumptionDto: CreateMaterialConsumptionDto = {
              orderId,
              rawMaterialId: op.payload.rawMaterialId,
              consumedQuantity: Number(op.payload.consumedQuantity),
            };

            opResult = await this.inventoryService.recordConsumption(consumptionDto, user);
            break;
          }

          default:
            throw new Error(`Unsupported entity type: ${op.entityType}`);
        }

        // 3. Save Idempotency Record if not already recorded by the underlying service
        const alreadySaved = await this.prisma.idempotencyRecord.findUnique({
          where: { idempotencyKey: op.clientMutationId },
        });

        if (!alreadySaved) {
          await this.prisma.idempotencyRecord.create({
            data: {
              idempotencyKey: op.clientMutationId,
              userId: user.id,
              resourceType: op.entityType,
              resourceId: opResult?.id || null,
              responsePayload: opResult ? JSON.parse(JSON.stringify(opResult)) : {},
            },
          });
        }

        results.push({
          clientMutationId: op.clientMutationId,
          entityType: op.entityType,
          status: 'SUCCESS',
          result: opResult,
        });
      } catch (err: any) {
        this.logger.error(`Error processing mutation ${op.clientMutationId}: ${err.message}`, err.stack);
        results.push({
          clientMutationId: op.clientMutationId,
          entityType: op.entityType,
          status: 'VALIDATION_ERROR',
          error: err.message || 'Operation failed',
        });
      }
    }

    return results;
  }
}
