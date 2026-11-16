import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  PipeTransform,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AppError } from '../common/errors/app-error.js';
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../auth/access-token.guard.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompaniesService } from './companies.service.js';

export class ParseCompanyObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new AppError('INVALID_ID');
    }

    return value;
  }
}

@Controller('companies')
@UseGuards(AccessTokenGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateCompanyDto) {
    return this.companiesService.create(request.user.sub, body);
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListCompaniesQueryDto,
  ) {
    return this.companiesService.list(request.user.sub, query);
  }

  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseCompanyObjectIdPipe()) id: string,
  ) {
    return this.companiesService.findOne(request.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseCompanyObjectIdPipe()) id: string,
    @Body() body: UpdateCompanyDto,
  ) {
    return this.companiesService.update(request.user.sub, id, body);
  }

  @Delete(':id')
  softDelete(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseCompanyObjectIdPipe()) id: string,
  ) {
    return this.companiesService.softDelete(request.user.sub, id);
  }

  @Post(':id/restore')
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseCompanyObjectIdPipe()) id: string,
  ) {
    return this.companiesService.restore(request.user.sub, id);
  }
}
