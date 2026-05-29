import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const filePath = path.join(__dirname, 'src/services/dataverseService.ts')
let content = fs.readFileSync(filePath, 'utf8')
let changes = 0

// 1. Add Pm_riskmitigationactionsService import
const importMarker = "Pm_performancemeasuresService,"
const importReplacement = "Pm_performancemeasuresService,\n  Pm_riskmitigationactionsService,"
if (content.includes(importMarker) && !content.includes('Pm_riskmitigationactionsService')) {
  content = content.replace(importMarker, importReplacement)
  changes++
  console.log('✅ Added Pm_riskmitigationactionsService import')
}

// 2. Add type import
const typeMarker = "import type { Pm_benefits } from '../generated/models/Pm_benefitsModel'"
const typeAfter = typeMarker + "\nimport type { Pm_riskmitigationactions } from '../generated/models/Pm_riskmitigationactionsModel'"
if (content.includes(typeMarker) && !content.includes('Pm_riskmitigationactions')) {
  content = content.replace(typeMarker, typeAfter)
  changes++
  console.log('✅ Added Pm_riskmitigationactions type import')
}

// 3. Add RiskMitigationActionModel to imports
const modelMarker = "PerformanceMeasureModel,"
const modelReplacement = "PerformanceMeasureModel,\n  RiskMitigationActionModel,"
if (content.includes(modelMarker) && !content.includes('RiskMitigationActionModel')) {
  content = content.replace(modelMarker, modelReplacement)
  changes++
  console.log('✅ Added RiskMitigationActionModel import')
}

// 4. Add the map function and fetch function - insert before fetchAllRisks
const insertAfter = "export async function fetchAllRisks()"
const funcs = `
const mapMitigationAction = (item: Pm_riskmitigationactions): RiskMitigationActionModel => ({
  pm_riskmitigationactionid: item.pm_riskmitigationactionid,
  pm_actiontitle: item.pm_actiontitle,
  pm_actiondescription: item.pm_actiondescription,
  pm_actionowner: item.pm_actionowner,
  pm_status: item.pm_status,
  pm_duedate: item.pm_duedate,
  pm_completiondate: item.pm_completiondate,
  pm_effectiveness: item.pm_effectiveness,
  pm_notes: item.pm_notes,
  _pm_risk_value: item._pm_risk_value,
  pm_riskidentifier: item.pm_riskidentifier,
  statecode: item.statecode,
})

export async function fetchMitigationActions(riskId: string): Promise<RiskMitigationActionModel[]> {
  const result = await Pm_riskmitigationactionsService.getAll({
    filter: \`_pm_risk_value eq '\${riskId}' and statecode eq 0\`,
    select: [
      'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
      'pm_actionowner', 'pm_status', 'pm_duedate', 'pm_completiondate',
      'pm_effectiveness', 'pm_notes', '_pm_risk_value', 'pm_riskidentifier',
    ],
    orderBy: ['pm_duedate asc'],
    top: 100,
  })
  try { console.debug('[dataverseService] fetchMitigationActions result:', result, 'riskId:', riskId) } catch (e) {}
  let list = unwrapList<Pm_riskmitigationactions>(result).map(mapMitigationAction)
  if (list.length === 0) {
    try { console.warn('[dataverseService] fetchMitigationActions: empty result, raw:', JSON.stringify(result).slice(0, 1000)) } catch (e) {}
    const fallbackResult = await Pm_riskmitigationactionsService.getAll({
      select: [
        'pm_riskmitigationactionid', 'pm_actiontitle', 'pm_actiondescription',
        'pm_actionowner', 'pm_status', 'pm_duedate', 'pm_completiondate',
        'pm_effectiveness', 'pm_notes', '_pm_risk_value', 'pm_riskidentifier',
      ],
      orderBy: ['pm_duedate asc'],
      top: 100,
    })
    list = unwrapList<Pm_riskmitigationactions>(fallbackResult).map(mapMitigationAction)
  }
  return list
}

export async function fetchAllRisks()`

if (content.includes(insertAfter) && !content.includes('mapMitigationAction')) {
  content = content.replace(insertAfter, funcs)
  changes++
  console.log('✅ Added mapMitigationAction function and fetchMitigationActions')
}

fs.writeFileSync(filePath, content, 'utf8')
console.log(`\n✅ ${changes} changes applied`)
