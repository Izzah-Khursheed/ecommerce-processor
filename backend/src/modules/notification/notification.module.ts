import { Module } from '@nestjs/common';
import { NotificationConsumer } from './notification.consumer';
import { MailerService } from './mailer.service';

@Module({
  controllers: [NotificationConsumer],
  providers: [MailerService],
})
export class NotificationModule {}
