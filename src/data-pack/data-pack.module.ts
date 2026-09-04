import { Module } from '@nestjs/common';
import { DataPackService } from './data-pack.service.js';

@Module({
  providers: [DataPackService],
  exports: [DataPackService],
})
export class DataPackModule {}
