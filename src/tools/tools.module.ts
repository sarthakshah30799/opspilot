import { Module } from '@nestjs/common';
import { DataPackModule } from '../data-pack/data-pack.module.js';
import { OpsToolsService } from './ops-tools.service.js';

@Module({
  imports: [DataPackModule],
  providers: [OpsToolsService],
  exports: [OpsToolsService],
})
export class ToolsModule {}
