import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'
import { ensureDefaultDataSources } from '../src/lib/lineage/hcp-master-service'
import { seedDemoWorkflows } from './seed-demo-workflows'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await hashPassword('admin123')
  const officerHash = await hashPassword('compliance123')
  const analystHash = await hashPassword('analyst123')
  const execHash = await hashPassword('exec123')

  await prisma.user.upsert({
    where: { email: 'admin@cms-compliance.local' },
    update: { passwordHash: adminHash },
    create: {
      email: 'admin@cms-compliance.local',
      name: 'Sam Ortiz',
      role: 'admin',
      passwordHash: adminHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'compliance@cms-compliance.local' },
    update: { passwordHash: officerHash },
    create: {
      email: 'compliance@cms-compliance.local',
      name: 'Maria Chen',
      role: 'compliance_officer',
      passwordHash: officerHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'analyst@cms-compliance.local' },
    update: { passwordHash: analystHash },
    create: {
      email: 'analyst@cms-compliance.local',
      name: 'Derek Walsh',
      role: 'data_analyst',
      passwordHash: analystHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'exec@cms-compliance.local' },
    update: { passwordHash: execHash },
    create: {
      email: 'exec@cms-compliance.local',
      name: 'Priya Mehta',
      role: 'executive',
      passwordHash: execHash,
    },
  })

  const defaultRules = [
    {
      name: 'High Value Manual Review',
      description: 'Payments over $10,000 require manual compliance review',
      ruleType: 'threshold',
      priority: 100,
      conditions: {
        field: 'totalAmountOfPaymentUsdollars',
        operator: 'greater_than',
        value: 10000,
      },
    },
    {
      name: 'Discount Rebate Exclusion (Company Policy)',
      description: 'Align with CMS statutory discount/rebate exemption',
      ruleType: 'exclusion',
      priority: 95,
      conditions: { natureOfPaymentContains: 'rebate' },
    },
    {
      name: 'Small Gift Exclusion',
      description: 'Non-reportable gifts under $10 total value',
      ruleType: 'exclusion',
      priority: 90,
      conditions: {
        field: 'totalAmountOfPaymentUsdollars',
        operator: 'less_than',
        value: 10,
      },
    },
    {
      name: 'Consulting Fee Inclusion',
      description: 'Consulting fees are reportable when above CMS threshold',
      ruleType: 'inclusion',
      priority: 80,
      conditions: {
        natureOfPaymentContains: 'consulting',
      },
    },
  ]

  for (const rule of defaultRules) {
    const existing = await prisma.companyRule.findFirst({ where: { name: rule.name } })
    if (!existing) {
      await prisma.companyRule.create({
        data: {
          ...rule,
          isActive: true,
          createdBy: 'seed',
        },
      })
    }
  }

  await ensureDefaultDataSources()
  await seedDemoWorkflows(prisma)
  console.log('Seed complete: users, company rules, data sources, and demo workflows ready')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
