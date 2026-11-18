import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmployeeInvitedEvent } from './employee-invite.event.js';

@Injectable()
export class EmployeeInviteListener {
  private readonly logger = new Logger(EmployeeInviteListener.name);

  @OnEvent('employee.invited')
  handle(event: EmployeeInvitedEvent): void {
    this.logger.log(
      `Employee invite ready for ${event.email}: /auth/accept-invite?token=${event.inviteToken}&companyCode=${event.companyCode}`,
    );
  }
}
