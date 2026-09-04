import { Module } from '@nestjs/common';
import { DataPackModule } from '../data-pack/data-pack.module.js';
import { TenantGuard } from './tenant.guard.js';

@Module({
  imports: [DataPackModule],
  providers: [TenantGuard],
  exports: [TenantGuard, DataPackModule],
})
export class TenantModule {}
