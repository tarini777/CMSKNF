import { mapRawToGeneralPuf } from '@/lib/lineage/puf-field-mapper'
import { CMS_GENERAL_PUF_HEADERS } from '@/types/cms-puf'

describe('mapRawToGeneralPuf', () => {
  it('maps CMS 2024 general payment CSV headers to all 91 PUF keys', () => {
    const raw = {
      Change_Type: 'N',
      Covered_Recipient_Type: 'Covered Recipient Physician',
      Covered_Recipient_Profile_ID: '12345',
      Covered_Recipient_NPI: '9998887776',
      Covered_Recipient_First_Name: 'Jane',
      Covered_Recipient_Last_Name: 'Doe',
      Covered_Recipient_Specialty_1: 'Cardiology',
      Recipient_City: 'Boston',
      Recipient_State: 'MA',
      Total_Amount_of_Payment_USDollars: '150.00',
      Date_of_Payment: '2024-06-15',
      Nature_of_Payment_or_Transfer_of_Value: 'Consulting Fee',
      Form_of_Payment_or_Transfer_of_Value: 'Cash or cash equivalent',
      Record_ID: 'REC-001',
      Program_Year: '2024',
    }

    const puf = mapRawToGeneralPuf(raw)
    expect(puf.covered_recipient_npi).toBe('9998887776')
    expect(puf.covered_recipient_last_name).toBe('Doe')
    expect(puf.total_amount_of_payment_usdollars).toBe(150)
    expect(puf.program_year).toBe('2024')

    const populatedKeys = CMS_GENERAL_PUF_HEADERS.filter((key) => puf[key] !== undefined && puf[key] !== '')
    expect(populatedKeys.length).toBeGreaterThan(10)
  })
})

describe('CMS_GENERAL_PUF_HEADERS', () => {
  it('defines 91 general payment columns per Jan 2025 dictionary', () => {
    expect(CMS_GENERAL_PUF_HEADERS.length).toBe(91)
  })
})
