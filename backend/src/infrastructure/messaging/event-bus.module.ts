import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EVENT_BUS } from '../../common/constants';

/**
 * Provides a RabbitMQ ClientProxy (token EVENT_BUS) used to EMIT events.
 * The consuming side is a RabbitMQ microservice started in main.ts that
 * listens on the same queue and handles @EventPattern(...) methods.
 *
 * @Global so any service can inject @Inject(EVENT_BUS) without re-importing.
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENT_BUS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('rabbitmq.url')!],
            queue: config.get<string>('rabbitmq.eventsQueue')!,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class EventBusModule {}
