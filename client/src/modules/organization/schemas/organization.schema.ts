import { z } from 'zod'

export const organizationSchema = z.object({
  setupType: z.enum(['standalone', 'group']),
  companyName: z.string().trim().min(2).max(100),
  companyCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{4,20}$/),
  groupName: z.string().trim().max(100).optional(),
  childCompanyName: z.string().trim().max(100).optional(),
  childCompanyCode: z.string().trim().toUpperCase().max(20).optional(),
}).superRefine((value, context) => {
  if (value.setupType === 'group') {
    if (!value.groupName || value.groupName.length < 2) {
      context.addIssue({ code: 'custom', path: ['groupName'], message: 'Group name must be at least 2 characters' })
    }
    if (!value.childCompanyName || value.childCompanyName.length < 2) {
      context.addIssue({ code: 'custom', path: ['childCompanyName'], message: 'Child company name is required' })
    }
    if (!value.childCompanyCode || !/^[A-Z0-9_-]{4,20}$/.test(value.childCompanyCode)) {
      context.addIssue({ code: 'custom', path: ['childCompanyCode'], message: 'Use 4-20 letters, numbers, hyphens or underscores' })
    }
  }
})

export type OrganizationValues = z.infer<typeof organizationSchema>
