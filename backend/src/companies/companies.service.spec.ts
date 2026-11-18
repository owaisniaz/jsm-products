import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import mongoose, { Types } from 'mongoose';
import { AppError } from '../common/errors/app-error.js';
import { GroupsService } from '../groups/groups.service.js';
import { Company, CompanySchema, type CompanyEntity } from './company.schema.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { ListCompaniesQuerySchema } from './dto/list-companies-query.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import type { CompanyRecord } from './companies.repository.js';
import { CompaniesRepository } from './companies.repository.js';
import { CompaniesService } from './companies.service.js';

const CompanyTestModel = mongoose.model<Company>(
  'CompaniesServiceSpecCompany',
  CompanySchema,
);

describe('CompaniesService', () => {
  let service: CompaniesService;
  const repository = {
    create: vi.fn<CompaniesRepository['create']>(),
    list: vi.fn<CompaniesRepository['list']>(),
    findById: vi.fn<CompaniesRepository['findById']>(),
    findDeletedForRestore: vi.fn<
      CompaniesRepository['findDeletedForRestore']
    >(),
    existsByCompanyCode: vi.fn<CompaniesRepository['existsByCompanyCode']>(),
    existsByName: vi.fn<CompaniesRepository['existsByName']>(),
    update: vi.fn<CompaniesRepository['update']>(),
    softDelete: vi.fn<CompaniesRepository['softDelete']>(),
    restore: vi.fn<CompaniesRepository['restore']>(),
  };
  const groupsService = {
    findOne: vi.fn<GroupsService['findOne']>(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: CompaniesRepository, useValue: repository },
        { provide: GroupsService, useValue: groupsService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('sets ownerUserId from the argument when creating', async () => {
    const ownerUserId = new Types.ObjectId().toString();
    const input = new CreateCompanyDto();
    Object.assign(input, {
      name: 'Acme',
      companyCode: 'ACME_1',
      isActive: false,
    });
    const created = makeCompanyEntity();
    repository.existsByCompanyCode.mockResolvedValue(false);
    repository.existsByName.mockResolvedValue(false);
    repository.create.mockResolvedValue(created);

    await expect(service.create(ownerUserId, input)).resolves.toEqual(
      toExpectedResponse(created),
    );
    expect(repository.create).toHaveBeenCalledWith(ownerUserId, {
      name: 'Acme',
      companyCode: 'ACME_1',
      groupId: null,
      isActive: false,
    });
  });

  it('rejects a duplicate company code', async () => {
    repository.existsByCompanyCode.mockResolvedValue(true);

    await expect(
      service.create('owner-id', createDto()),
    ).rejects.toMatchObject({ code: 'COMPANY_CODE_EXISTS' });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate name in the same group', async () => {
    const groupId = new Types.ObjectId().toString();
    groupsService.findOne.mockResolvedValue(makeGroupResponse(groupId));
    repository.existsByCompanyCode.mockResolvedValue(false);
    repository.existsByName.mockResolvedValue(true);

    await expect(
      service.create('owner-id', {
        name: 'Acme',
        companyCode: 'ACME_1',
        groupId,
      }),
    ).rejects.toMatchObject({ code: 'COMPANY_NAME_EXISTS' });
  });

  it('returns GROUP_NOT_FOUND when the requested group is not owned', async () => {
    groupsService.findOne.mockRejectedValue(new AppError('GROUP_NOT_FOUND'));

    await expect(
      service.create('owner-id', {
        name: 'Acme',
        companyCode: 'ACME_1',
        groupId: new Types.ObjectId().toString(),
      }),
    ).rejects.toMatchObject({ code: 'GROUP_NOT_FOUND' });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns GROUP_NOT_FOUND when the requested group is inactive', async () => {
    const groupId = new Types.ObjectId().toString();
    groupsService.findOne.mockResolvedValue({
      ...makeGroupResponse(groupId),
      isActive: false,
    });

    await expect(
      service.create('owner-id', {
        name: 'Acme',
        companyCode: 'ACME_1',
        groupId,
      }),
    ).rejects.toMatchObject({ code: 'GROUP_NOT_FOUND' });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns COMPANY_NOT_FOUND for a missing company', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.findOne('owner-id', new Types.ObjectId().toString()),
    ).rejects.toMatchObject({ code: 'COMPANY_NOT_FOUND' });
  });

  it('returns COMPANY_NOT_FOUND when the company belongs to another user', async () => {
    const id = new Types.ObjectId().toString();
    const ownerUserId = new Types.ObjectId().toString();
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(ownerUserId, id)).rejects.toMatchObject({
      code: 'COMPANY_NOT_FOUND',
    });
    expect(repository.findById).toHaveBeenCalledWith(ownerUserId, id);
  });

  it('returns the mapped company after an update', async () => {
    const current = makeCompanyRecord();
    const updated = makeCompanyRecord({ isActive: false });
    repository.findById.mockResolvedValue(current);
    repository.update.mockResolvedValue(updated);

    await expect(
      service.update('owner-id', current._id.toString(), { isActive: false }),
    ).resolves.toEqual(toExpectedResponse(updated));
  });

  it('rejects an empty update body', async () => {
    await expect(
      service.update('owner-id', new Types.ObjectId().toString(), {}),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects attempts to update companyCode', async () => {
    const changes = Object.assign(new UpdateCompanyDto(), {
      companyCode: 'NEW_CODE',
    });

    await expect(
      service.update('owner-id', new Types.ObjectId().toString(), changes),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows removing a company from its group', async () => {
    const groupId = new Types.ObjectId();
    const current = makeCompanyRecord({ groupId });
    const updated = makeCompanyRecord({ groupId: null });
    repository.findById.mockResolvedValue(current);
    repository.existsByName.mockResolvedValue(false);
    repository.update.mockResolvedValue(updated);

    await expect(
      service.update('owner-id', current._id.toString(), { groupId: null }),
    ).resolves.toEqual(toExpectedResponse(updated));
    expect(repository.update).toHaveBeenCalledWith(
      'owner-id',
      current._id.toString(),
      { groupId: null },
    );
  });

  it('returns the mapped company after a soft delete', async () => {
    const deleted = makeCompanyRecord({ deletedAt: new Date() });
    repository.softDelete.mockResolvedValue(deleted);

    await expect(
      service.softDelete('owner-id', deleted._id.toString()),
    ).resolves.toEqual(toExpectedResponse(deleted));
  });

  it('returns COMPANY_NOT_FOUND when soft-deleting a missing company', async () => {
    const id = new Types.ObjectId().toString();
    repository.softDelete.mockResolvedValue(null);

    await expect(service.softDelete('owner-id', id)).rejects.toMatchObject({
      code: 'COMPANY_NOT_FOUND',
    });
  });

  it('restores a deleted company', async () => {
    const deleted = makeCompanyRecord({ deletedAt: new Date() });
    const restored = makeCompanyRecord();
    repository.findDeletedForRestore.mockResolvedValue(deleted);
    repository.existsByName.mockResolvedValue(false);
    repository.restore.mockResolvedValue(restored);

    await expect(
      service.restore('owner-id', deleted._id.toString()),
    ).resolves.toEqual(toExpectedResponse(restored));
  });

  it('returns BAD_REQUEST when restoring a company that is not deleted', async () => {
    const active = makeCompanyRecord();
    repository.findDeletedForRestore.mockResolvedValue(null);
    repository.findById.mockResolvedValue(active);

    await expect(
      service.restore('owner-id', active._id.toString()),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('restores without a group when the previous group is no longer available', async () => {
    const groupId = new Types.ObjectId();
    const deleted = makeCompanyRecord({ deletedAt: new Date(), groupId });
    const restored = makeCompanyRecord({ groupId: null });
    repository.findDeletedForRestore.mockResolvedValue(deleted);
    groupsService.findOne.mockRejectedValue(new AppError('GROUP_NOT_FOUND'));
    repository.existsByName.mockResolvedValue(false);
    repository.restore.mockResolvedValue(restored);

    await expect(
      service.restore('owner-id', deleted._id.toString()),
    ).resolves.toEqual(toExpectedResponse(restored));
    expect(repository.restore).toHaveBeenCalledWith(
      'owner-id',
      deleted._id.toString(),
      null,
    );
  });

  it('returns pagination metadata and passes the "none" group filter', async () => {
    const records = [makeCompanyRecord()];
    const query = ListCompaniesQuerySchema.parse({
      page: '2',
      limit: '3',
      groupId: 'none',
    });
    repository.list.mockResolvedValue({ data: records, total: 8 });

    await expect(service.list('owner-id', query)).resolves.toEqual({
      data: records.map(toExpectedResponse),
      meta: { total: 8, page: 2, limit: 3, totalPages: 3 },
    });
    expect(repository.list).toHaveBeenCalledWith('owner-id', query);
  });
});

function createDto(): CreateCompanyDto {
  const dto = new CreateCompanyDto();
  Object.assign(dto, { name: 'Acme', companyCode: 'ACME_1' });
  return dto;
}

function makeCompanyRecord(
  overrides: Partial<CompanyRecord> = {},
): CompanyRecord {
  const now = new Date();
  return {
    _id: new Types.ObjectId(),
    name: 'Acme',
    companyCode: 'ACME_1',
    groupId: null,
    ownerUserId: new Types.ObjectId(),
    isActive: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCompanyEntity(): CompanyEntity {
  const now = new Date();
  return new CompanyTestModel({
    name: 'Acme',
    companyCode: 'ACME_1',
    groupId: null,
    ownerUserId: new Types.ObjectId(),
    isActive: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

function makeGroupResponse(id: string) {
  const now = new Date();
  return {
    id,
    name: 'Acme group',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function toExpectedResponse(
  company: CompanyEntity | CompanyRecord,
): {
  id: string;
  name: string;
  companyCode: string;
  groupId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: company._id.toString(),
    name: company.name,
    companyCode: company.companyCode,
    groupId: company.groupId?.toString() ?? null,
    isActive: company.isActive,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}
