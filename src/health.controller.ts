import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /** Returns service liveness for probes and uptime checks. */
  @Get()
  health() {
    return { status: 'ok' };
  }
}
