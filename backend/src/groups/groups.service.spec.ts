import { Test, TestingModule } from '@nestjs/testing';
import mongoose, { Types } from 'mongoose';
import { Group, GroupSchema, type GroupEntity } from './group.schema.js';
import { ListGroupsQuerySchema } from './dto/list-groups-query.dto.js';
import type { GroupRecord } from './groups.repository.js';
import { GroupsRepository } from './groups.repository.js';
import { GroupsService } from './groups.service.js';

const GroupTestModel = mongoose.model<Group>(
  'GroupsServiceSpecGroup',
  GroupSchema,
);

describe('GroupsService', () => {
  let service: GroupsService;
  const repository = {
    create: vi.fn<GroupsRepository['create']>(),
    list: vi.fn<GroupsRepository['list']>(),
    findById: vi.fn<GroupsRepository['findById']>(),
    findDeletedForRestore: vi.fn<GroupsRepository['findDeletedForRestore']>(),
    existsByName: vi.fn<GroupsRepository['existsByName']>(),
    update: vi.fn<GroupsRepository['update']>(),
    softDelete: vi.fn<GroupsRepository['softDelete']>(),
    restore: vi.fn<GroupsRepository['restore']>(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: GroupsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('maps list results and calculates pagination metadata without internal fields', async () => {
    const records = [makeGroupRecord(), makeGroupRecord()];
    const query = ListGroupsQuerySchema.parse({ page: '2', limit: '3' });
    repository.list.mockResolvedValue({ data: records, total: 8 });

    await expect(service.list('owner-id', query)).resolves.toEqual({
      data: records.map(toExpectedResponse),
      meta: { total: 8, page: 2, limit: 3, totalPages: 3 },
    });
  });

  it('passes the owner argument separately when creating a group', async () => {
    const ownerUserId = new Types.ObjectId().toString();
    const input = { name: 'New group', isActive: false };
    const createdGroup = makeGroupEntity(input);
    repository.existsByName.mockResolvedValue(false);
    repository.create.mockResolvedValue(createdGroup);

    await expect(service.create(ownerUserId, input)).resolves.toEqual(
      toExpectedResponse(createdGroup),
    );

    expect(repository.create).toHaveBeenCalledWith(ownerUserId, input);
  });

  it('rejects a duplicate name on create', async () => {
    repository.existsByName.mockResolvedValue(true);

    await expect(
      service.create('owner-id', { name: 'Existing group' }),
    ).rejects.toMatchObject({ code: 'GROUP_NAME_EXISTS' });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects an empty update body', async () => {
    await expect(
      service.update('owner-id', new Types.ObjectId().toString(), {}),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns GROUP_NOT_FOUND for a missing group', async () => {
    const id = new Types.ObjectId().toString();
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('owner-id', id)).rejects.toMatchObject({
      code: 'GROUP_NOT_FOUND',
    });
  });

  it('returns GROUP_NOT_FOUND when the group belongs to another user', async () => {
    const id = new Types.ObjectId().toString();
    const ownerUserId = new Types.ObjectId().toString();
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(ownerUserId, id)).rejects.toMatchObject({
      code: 'GROUP_NOT_FOUND',
    });
    expect(repository.findById).toHaveBeenCalledWith(ownerUserId, id);
  });

  it('returns the mapped group after a successful update', async () => {
    const record = makeGroupRecord();
    repository.update.mockResolvedValue(record);

    await expect(
      service.update('owner-id', record._id.toString(), { isActive: false }),
    ).resolves.toEqual(toExpectedResponse(record));
    expect(repository.update).toHaveBeenCalledWith(
      'owner-id',
      record._id.toString(),
      { isActive: false },
    );
  });

  it('returns the mapped group after a successful soft delete', async () => {
    const record = makeGroupRecord();
    repository.softDelete.mockResolvedValue(record);

    await expect(
      service.softDelete('owner-id', record._id.toString()),
    ).resolves.toEqual(toExpectedResponse(record));
    expect(repository.softDelete).toHaveBeenCalledWith(
      'owner-id',
      record._id.toString(),
      expect.any(Date),
    );
  });

  it('returns GROUP_NOT_FOUND when soft-deleting a missing group', async () => {
    const id = new Types.ObjectId().toString();
    repository.softDelete.mockResolvedValue(null);

    await expect(service.softDelete('owner-id', id)).rejects.toMatchObject({
      code: 'GROUP_NOT_FOUND',
    });
  });

  it('returns BAD_REQUEST when restoring an active group', async () => {
    repository.findDeletedForRestore.mockResolvedValue(null);
    repository.findById.mockResolvedValue(makeGroupRecord());

    await expect(
      service.restore('owner-id', new Types.ObjectId().toString()),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('returns GROUP_NOT_FOUND when restoring a missing group', async () => {
    repository.findDeletedForRestore.mockResolvedValue(null);
    repository.findById.mockResolvedValue(null);

    await expect(
      service.restore('owner-id', new Types.ObjectId().toString()),
    ).rejects.toMatchObject({ code: 'GROUP_NOT_FOUND' });
  });
});

function makeGroupRecord(): GroupRecord {
  const now = new Date();
  return {
    _id: new Types.ObjectId(),
    name: 'Example',
    ownerUserId: new Types.ObjectId(),
    isActive: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function makeGroupEntity(
  values: Pick<Group, 'name' | 'isActive'>,
): GroupEntity {
  const now = new Date();
  return new GroupTestModel({
    ...values,
    ownerUserId: new Types.ObjectId(),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

function toExpectedResponse(
  group: GroupEntity | GroupRecord,
): {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: group._id.toString(),
    name: group.name,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
