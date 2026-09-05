import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataPackService } from '../data-pack/data-pack.service.js';

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
    this.dataPack.assertTenant(tenantId);
    return true;
  }
}
