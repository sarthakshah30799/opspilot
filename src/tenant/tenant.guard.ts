import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataPackService } from '../data-pack/data-pack.service.js';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly dataPack: DataPackService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      params: { tenantId?: string };
    }>();
    const tenantId = request.params.tenantId;
    if (!tenantId) {
      throw new NotFoundException('tenantId is required');
    }
    if (!UUID_V4_RE.test(tenantId)) {
      throw new BadRequestException('tenantId must be a UUID v4');
    }
    this.dataPack.assertTenant(tenantId);
    return true;
  }
}
