import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './group.schema.js';
import { GroupsRepository } from './groups.repository.js';
import { GroupsService } from './groups.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
  ],
  providers: [GroupsRepository, GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
