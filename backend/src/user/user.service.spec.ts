import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
import { QueryBuilderService } from '../common/query/query-builder.service.js';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
        { provide: QueryBuilderService, useValue: {} },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
