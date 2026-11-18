import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '../../user/user.schema.js';
import { UserRepository } from '../../user/user.repository.js';
import { RoleRepository } from './role.repository.js';

export interface EmployeeInviteMembership {
  companyId: Types.ObjectId;
  groupId: Types.ObjectId | null;
  roleIds: Types.ObjectId[];
}

@Injectable()
export class IamFacadeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  findById(userId: string): Promise<UserDocument | null> {
    return this.userRepository.findById(userId);
  }

  async findOrCreateInvited(
    email: string,
    membership: EmployeeInviteMembership,
    session: ClientSession,
  ): Promise<UserDocument> {
    const normalizedEmail = email.trim().toLowerCase();
    let user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      user = await this.userRepository.createWithSession(
        {
          email: normalizedEmail,
          password: '',
          passwordHash: null,
          status: 'INVITED',
          memberships: [{
            companyId: membership.companyId,
            groupId: membership.groupId,
            accountType: 'STAFF',
            roles: membership.roleIds,
          }],
        },
        session,
      );
    } else if (!user.memberships?.some((item) =>
      item.companyId.toString() === membership.companyId.toString(),
    )) {
      await this.userRepository.pushMembershipWithSession(
        user.id,
        {
          companyId: membership.companyId,
          groupId: membership.groupId,
          accountType: 'STAFF',
          roles: membership.roleIds,
        },
        session,
      );
      user = await this.userRepository.findByIdWithSession(user.id, session);
    }
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async addMembershipRole(
    userId: string,
    companyId: string,
    roleIds: string[],
  ): Promise<boolean> {
    return this.userRepository.addMembershipRoles(userId, companyId, roleIds);
  }

  async acceptInvite(
    userId: string,
    password: string,
  ): Promise<UserDocument | null> {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.userRepository.updateById(userId, {
      passwordHash,
      status: 'ACTIVE',
    });
  }

  async getMembershipRolePermissions(
    userId: string,
    companyId: string,
  ): Promise<{ accountType: 'OWNER' | 'STAFF'; permissions: string[] }> {
    const user = await this.userRepository.findById(userId);
    const membership = user?.memberships?.find((item) =>
      item.companyId.toString() === companyId,
    );
    if (!membership) return { accountType: 'STAFF', permissions: [] };
    if (membership.accountType === 'OWNER') {
      return { accountType: 'OWNER', permissions: ['*'] };
    }
    const roles = await this.roleRepository.findByIds(membership.roles);
    return {
      accountType: 'STAFF',
      permissions: [...new Set(roles.flatMap((role) => role.permissions))],
    };
  }
}
