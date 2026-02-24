import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  /** Returns service liveness for probes and uptime checks. */
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    description: 'Service status',
    schema: { example: { status: 'ok' } },
  })
  health() {
    return { status: 'ok' };
  }
}
