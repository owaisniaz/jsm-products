import { Module } from '@nestjs/common';
import { QueryBuilderService } from './query-builder.service.js';

@Module({
  providers: [QueryBuilderService],
  exports: [QueryBuilderService],
})
export class QueryModule {}
