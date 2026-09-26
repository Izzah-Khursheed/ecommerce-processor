import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { S3Module } from './infrastructure/storage/s3.module';
import { EventBusModule } from './infrastructure/messaging/event-bus.module';
import { UploadModule } from './modules/upload/upload.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProductModule } from './modules/product/product.module';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Shared BullMQ (Redis) connection used by all queues.
    // Uses REDIS_URL (rediss://, TLS) in the cloud, else local host/port.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redis.url');
        const base = { maxRetriesPerRequest: null }; // required by BullMQ
        if (url) {
          const useTls = url.startsWith('rediss://');
          return {
            connection: {
              ...base,
              url,
              ...(useTls ? { tls: {} } : {}),
            },
          };
        }
        return {
          connection: {
            ...base,
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
            password: config.get<string>('redis.password'),
          },
        };
      },
    }),

    // Infrastructure (all @Global)
    PrismaModule,
    S3Module,
    EventBusModule,

    // Feature modules
    UploadModule,
    ProcessingModule,
    NotificationModule,
    ProductModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
