import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { Express, Request, Response } from 'express';
import cookieParser = require('cookie-parser');
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

let cachedServer: Express | null = null;
const logger = new Logger('VercelServerless');

export async function bootstrapServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  logger.log('Bootstrapping NestJS serverless application for Vercel...');

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  // Configure CORS
  const corsOriginEnv = process.env.CORS_ORIGIN || '*';
  const corsOrigin =
    corsOriginEnv === '*'
      ? true
      : corsOriginEnv.includes(',')
        ? corsOriginEnv.split(',').map((o) => o.trim())
        : corsOriginEnv;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.use(cookieParser());

  // Static uploads directory (supports /tmp fallback in serverless)
  const uploadsPath =
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? path.join('/tmp', 'uploads')
      : path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Friendly Root & API index routes
  expressApp.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Furniture Business ERP API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/v1/health',
        docs: '/api/docs',
        api: '/api/v1',
      },
    });
  });

  expressApp.get('/api', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Furniture Business ERP API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/v1/health',
        docs: '/api/docs',
        api: '/api/v1',
      },
    });
  });

  // Global prefix: api/v1
  app.setGlobalPrefix('api/v1');

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter & Logging
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Furniture Business ERP API')
    .setDescription('Production-quality modular monolith REST API for Furniture Business ERP')
    .setVersion('1.0')
    .addTag('Health', 'System and database health checks')
    .addCookieAuth('agy_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  cachedServer = expressApp;
  logger.log('NestJS serverless application ready to serve requests.');
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
