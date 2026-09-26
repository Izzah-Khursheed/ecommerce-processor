import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

/**
 * Emit a RabbitMQ event and resolve once it has been dispatched.
 * `defaultValue` avoids an EmptyError if the observable completes
 * without emitting (events don't return a value).
 */
export async function emitEvent(
  client: ClientProxy,
  pattern: string,
  data: unknown,
): Promise<void> {
  await lastValueFrom(client.emit(pattern, data), { defaultValue: undefined });
}
