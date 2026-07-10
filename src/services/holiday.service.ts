import { Pm_holidaiesService } from '@/generated'
import type { Pm_holidaies } from '@/generated/models/Pm_holidaiesModel'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList } from './common'

export interface HolidayModel {
  pm_holidayid: string
  pm_holidayname: string
  pm_holidaydate: string
  pm_country?: string
  pm_year?: number
}

export async function fetchHolidays(year?: number): Promise<HolidayModel[]> {
  try {
    const options: IGetAllOptions = {
      select: ['pm_holidayid', 'pm_holidayname', 'pm_holidaydate', 'pm_country', 'pm_year'],
      filter: 'statecode eq 0',
      orderBy: ['createdon desc'],
      top: 500
    }
    if (year) {
      options.filter += ` and pm_year eq ${year}`
    }
    
    const result = await Pm_holidaiesService.getAll(options)
    if (!result.success) {
      console.error('[HolidayService] fetchHolidays failed:', result.error)
      return []
    }
    const list = unwrapList<Pm_holidaies>(result)
    return list.map(item => ({
      pm_holidayid: item.pm_holidayid!,
      pm_holidayname: item.pm_holidayname!,
      pm_holidaydate: item.pm_holidaydate!,
      pm_country: item.pm_country,
      pm_year: item.pm_year
    }))
  } catch (err) {
    console.error('[HolidayService] fetchHolidays exception:', err)
    return []
  }
}

