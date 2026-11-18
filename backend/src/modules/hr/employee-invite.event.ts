export class EmployeeInvitedEvent {
  constructor(
    public readonly email: string,
    public readonly inviteToken: string,
    public readonly companyCode: string,
  ) {}
}
