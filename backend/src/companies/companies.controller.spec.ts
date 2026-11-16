import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AppError } from '../common/errors/app-error.js';
import type { AuthenticatedRequest } from '../auth/access-token.guard.js';
import { CreateCompanySchema } from './dto/create-company.dto.js';
import { ListCompaniesQuerySchema } from './dto/list-companies-query.dto.js';
import { UpdateCompanySchema } from './dto/update-company.dto.js';
import {
  CompaniesController,
  ParseCompanyObjectIdPipe,
} from './companies.controller.js';
import type {
  CompanyListResponse,
  CompanyResponse,
} from './companies.service.js';
import { CompaniesService } from './companies.service.js';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  const service = {
    create: vi.fn<CompaniesService['create']>(),
    list: vi.fn<CompaniesService['list']>(),
    findOne: vi.fn<CompaniesService['findOne']>(),
    update: vi.fn<CompaniesService['update']>(),
    softDelete: vi.fn<CompaniesService['softDelete']>(),
    restore: vi.fn<CompaniesService['restore']>(),
  };
  const request = makeRequest('owner-id');

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: service }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: vi.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('passes the current user and parsed DTO to create', async () => {
    const body = CreateCompanySchema.parse({
      name: ' Acme ',
      companyCode: ' acme_1 ',
    });
    const response = makeCompanyResponse();
    service.create.mockResolvedValue(response);

    await expect(controller.create(request, body)).resolves.toBe(response);
    expect(service.create).toHaveBeenCalledWith('owner-id', body);
  });

  it('passes the current user and parsed query to list', async () => {
    const query = ListCompaniesQuerySchema.parse({
      page: '2',
      groupId: 'none',
    });
    const response: CompanyListResponse = {
      data: [],
      meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
    };
    service.list.mockResolvedValue(response);

    await expect(controller.list(request, query)).resolves.toBe(response);
    expect(service.list).toHaveBeenCalledWith('owner-id', query);
  });

  it('passes the current user and id to get one company', async () => {
    const id = new Types.ObjectId().toString();
    const response = makeCompanyResponse();
    service.findOne.mockResolvedValue(response);

    await expect(controller.findOne(request, id)).resolves.toBe(response);
    expect(service.findOne).toHaveBeenCalledWith('owner-id', id);
  });

  it('passes the current user, id, and parsed DTO to update', async () => {
    const id = new Types.ObjectId().toString();
    const body = UpdateCompanySchema.parse({ name: 'Updated name' });
    const response = makeCompanyResponse({ name: 'Updated name' });
    service.update.mockResolvedValue(response);

    await expect(controller.update(request, id, body)).resolves.toBe(response);
    expect(service.update).toHaveBeenCalledWith('owner-id', id, body);
  });

  it('passes the current user and id to soft delete', async () => {
    const id = new Types.ObjectId().toString();
    const response = makeCompanyResponse();
    service.softDelete.mockResolvedValue(response);

    await expect(controller.softDelete(request, id)).resolves.toBe(response);
    expect(service.softDelete).toHaveBeenCalledWith('owner-id', id);
  });

  it('passes the current user and id to restore', async () => {
    const id = new Types.ObjectId().toString();
    const response = makeCompanyResponse();
    service.restore.mockResolvedValue(response);

    await expect(controller.restore(request, id)).resolves.toBe(response);
    expect(service.restore).toHaveBeenCalledWith('owner-id', id);
  });

  it('rejects invalid object ids with INVALID_ID', () => {
    let thrown: unknown;
    try {
      new ParseCompanyObjectIdPipe().transform('not-an-object-id');
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AppError);
    expect(thrown).toMatchObject({ code: 'INVALID_ID' });
  });
});

function makeRequest(ownerUserId: string): AuthenticatedRequest {
  return {
    method: 'GET',
    url: '/companies',
    user: { sub: ownerUserId, type: 'access' },
  } as AuthenticatedRequest;
}

function makeCompanyResponse(
  overrides: Partial<CompanyResponse> = {},
): CompanyResponse {
  const now = new Date();
  return {
    id: new Types.ObjectId().toString(),
    name: 'Acme',
    companyCode: 'ACME_1',
    groupId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
