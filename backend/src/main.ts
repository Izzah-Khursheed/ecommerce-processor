import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Allow the frontend (different origin/port) to call this API.
  // In production, set FRONTEND_URL to lock CORS to your deployed UI.
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({ origin: frontendUrl || true, credentials: true });

  // Validate/transform all incoming DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableShutdownHooks();

  // Attach a RabbitMQ microservice to the SAME process so @EventPattern
  // handlers (MessagingController, NotificationController) receive events.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.get<string>('rabbitmq.url')!],
      queue: config.get<string>('rabbitmq.eventsQueue')!,
      queueOptions: { durable: true },
      noAck: false, // we ack manually in the consumers
    },
  });

  await app.startAllMicroservices();
  logger.log('RabbitMQ microservice is listening for events');

  const port = config.get<number>('app.port')!;
  await app.listen(port);
  logger.log(`HTTP API is running on http://localhost:${port}`);
}

bootstrap();
