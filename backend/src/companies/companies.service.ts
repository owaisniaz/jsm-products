import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppError } from '../common/errors/app-error.js';
import { GroupsService } from '../groups/groups.service.js';
import type { CompanyEntity } from './company.schema.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { ListCompaniesQueryDto } from './dto/list-companies-query.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';
import type { CompanyRecord } from './companies.repository.js';
import {
  CompaniesRepository,
  type UpdateCompanyData,
} from './companies.repository.js';

export interface CompanyResponse {
  id: string;
  name: string;
  companyCode: string;
  groupId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyListResponse {
  data: CompanyResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type CompanySource = CompanyEntity | CompanyRecord;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async create(
    ownerUserId: string,
    data: CreateCompanyDto,
  ): Promise<CompanyResponse> {
    const groupId = await this.resolveGroupId(ownerUserId, data.groupId);
    if (await this.companiesRepository.existsByCompanyCode(data.companyCode)) {
      throw new AppError('COMPANY_CODE_EXISTS');
    }
    if (
      await this.companiesRepository.existsByName(
        ownerUserId,
        groupId,
        data.name,
      )
    ) {
      throw new AppError('COMPANY_NAME_EXISTS');
    }

    const company = await this.companiesRepository.create(ownerUserId, {
      name: data.name,
      companyCode: data.companyCode,
      groupId,
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    return this.toCompanyResponse(company);
  }

  async list(
    ownerUserId: string,
    query: ListCompaniesQueryDto,
  ): Promise<CompanyListResponse> {
    if (
      query.groupId !== undefined &&
      query.groupId !== 'none' &&
      !Types.ObjectId.isValid(query.groupId)
    ) {
      throw new AppError('INVALID_ID');
    }

    const { data, total } = await this.companiesRepository.list(
      ownerUserId,
      query,
    );

    return {
      data: data.map((company) => this.toCompanyResponse(company)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(ownerUserId: string, id: string): Promise<CompanyResponse> {
    const company = await this.companiesRepository.findById(ownerUserId, id);
    if (!company) {
      throw new AppError('COMPANY_NOT_FOUND');
    }

    // TODO: employee sign-in must reject inactive or deleted companies.
    return this.toCompanyResponse(company);
  }

  async update(
    ownerUserId: string,
    id: string,
    changes: UpdateCompanyDto,
  ): Promise<CompanyResponse> {
    if (Object.hasOwn(changes, 'companyCode')) {
      throw new AppError('BAD_REQUEST', {
        message: 'Company code cannot be changed',
      });
    }
    if (Object.keys(changes).length === 0) {
      throw new AppError('BAD_REQUEST', {
        message: 'Update body must not be empty',
      });
    }

    const hasGroupId = changes.groupId !== undefined;
    const needsCurrentCompany =
      changes.name !== undefined || hasGroupId;
    const currentCompany = needsCurrentCompany
      ? await this.companiesRepository.findById(ownerUserId, id)
      : null;

    if (needsCurrentCompany && !currentCompany) {
      throw new AppError('COMPANY_NOT_FOUND');
    }

    const groupId = hasGroupId
      ? await this.resolveGroupId(ownerUserId, changes.groupId)
      : currentCompany?.groupId ?? null;
    const name = changes.name ?? currentCompany?.name;
    if (
      name !== undefined &&
      (changes.name !== undefined || hasGroupId) &&
      (await this.companiesRepository.existsByName(
        ownerUserId,
        groupId,
        name,
        id,
      ))
    ) {
      throw new AppError('COMPANY_NAME_EXISTS');
    }

    const updateData: UpdateCompanyData = {};
    if (changes.name !== undefined) {
      updateData.name = changes.name;
    }
    if (hasGroupId) {
      updateData.groupId = groupId;
    }
    if (changes.isActive !== undefined) {
      updateData.isActive = changes.isActive;
    }

    const company = await this.companiesRepository.update(
      ownerUserId,
      id,
      updateData,
    );
    if (!company) {
      throw new AppError('COMPANY_NOT_FOUND');
    }

    return this.toCompanyResponse(company);
  }

  async softDelete(
    ownerUserId: string,
    id: string,
  ): Promise<CompanyResponse> {
    const company = await this.companiesRepository.softDelete(
      ownerUserId,
      id,
      new Date(),
    );
    if (!company) {
      throw new AppError('COMPANY_NOT_FOUND');
    }

    return this.toCompanyResponse(company);
  }

  async restore(ownerUserId: string, id: string): Promise<CompanyResponse> {
    const deletedCompany =
      await this.companiesRepository.findDeletedForRestore(ownerUserId, id);
    if (!deletedCompany) {
      if (await this.companiesRepository.findById(ownerUserId, id)) {
        throw new AppError('BAD_REQUEST', {
          message: 'Company is not deleted',
        });
      }
      throw new AppError('COMPANY_NOT_FOUND');
    }

    const groupId = await this.resolveRestoreGroupId(
      ownerUserId,
      deletedCompany.groupId,
    );
    if (
      await this.companiesRepository.existsByName(
        ownerUserId,
        groupId,
        deletedCompany.name,
      )
    ) {
      throw new AppError('COMPANY_NAME_EXISTS');
    }

    const company = await this.companiesRepository.restore(
      ownerUserId,
      id,
      groupId,
    );
    if (!company) {
      throw new AppError('COMPANY_NOT_FOUND');
    }

    return this.toCompanyResponse(company);
  }

  private async resolveGroupId(
    ownerUserId: string,
    groupId: string | null | undefined,
  ): Promise<Types.ObjectId | null> {
    if (groupId === null || groupId === undefined) {
      return null;
    }
    if (!Types.ObjectId.isValid(groupId)) {
      throw new AppError('GROUP_NOT_FOUND');
    }

    const group = await this.groupsService.findOne(ownerUserId, groupId);
    if (!group.isActive) {
      throw new AppError('GROUP_NOT_FOUND');
    }

    return new Types.ObjectId(groupId);
  }

  private async resolveRestoreGroupId(
    ownerUserId: string,
    groupId: Types.ObjectId | null,
  ): Promise<Types.ObjectId | null> {
    if (groupId === null) {
      return null;
    }

    try {
      await this.groupsService.findOne(ownerUserId, groupId.toString());
      return groupId;
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === 'GROUP_NOT_FOUND') {
        // The group may have been deleted while the company was soft-deleted.
        return null;
      }
      throw error;
    }
  }

  private toCompanyResponse(company: CompanySource): CompanyResponse {
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
}
