import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockPrismaService: { isHealthy: jest.Mock };

  beforeEach(async () => {
    mockPrismaService = {
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return ok status when database is healthy', async () => {
    const health = await service.checkHealth();
    expect(health.status).toBe('ok');
    expect(health.database).toBe('connected');
    expect(typeof health.uptimeSeconds).toBe('number');
  });

  it('should return degraded status when database is down', async () => {
    mockPrismaService.isHealthy.mockResolvedValue(false);
    const health = await service.checkHealth();
    expect(health.status).toBe('degraded');
    expect(health.database).toBe('disconnected');
  });
});
