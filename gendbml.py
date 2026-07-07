import re, os, glob

MODELS_DIR = "src/generated/models"

# ---------------------------------------------------------------------------
# Files that are custom API / action payloads, NOT Dataverse tables -- skip.
# ---------------------------------------------------------------------------
SKIP_FILES = {
    "CommonModels.ts", "AddMembersTeamModel.ts", "CreateOutlookEventModel.ts",
    "GetOutlookEventsModel.ts", "InitiateWorkflowModel.ts", "ManageTeamsModel.ts",
    "RemoveMembersTeamModel.ts", "SendMessageModel.ts", "WorkflowRoutingHandlerModel.ts",
}

# ---------------------------------------------------------------------------
# Same FK resolution map used previously for this schema
# ---------------------------------------------------------------------------
FK_MAP = {
    "pm_portfolio": "pm_portfolios",
    "pm_portfoliolookup": "pm_portfolios",
    "pm_programme": "pm_programmes",
    "pm_programmelookup": "pm_programmes",
    "pm_programmefk": "pm_programmes",
    "pm_programmename": "pm_programmes",
    "pm_project": "pm_projects",
    "pm_projectmanager": "pm_resources",
    "pm_risk": "pm_risks",
    "pm_riskowner": "pm_resources",
    "pm_benifitowner": "pm_resources",
    "pm_benefit": "pm_benefits",
    "pm_fiscalperiod": "pm_fiscalperiods",
    "pm_fiscalperiod1": "pm_fiscalperiods",
    "pm_reportingfiscalperiod": "pm_fiscalperiods",
    "pm_fundingsource": "pm_fundingsources",
    "pm_budgetline": "pm_budgetlines",
    "pm_changeby": "systemusers",
    "pm_changerequest": "pm_changerequests",
    "pm_checklistconfiguration": "pm_workflowchecklistconfigurations",
    "pm_workflowapprovalstep": "pm_workflowapprovalsteps",
    "pm_issueowner": "pm_resources",
    "pm_ownerlookup": "pm_resources",
    "pm_programmemanager": "pm_resources",
    "pm_requestedby": "systemusers",
    "pm_responsible": "pm_resources",
    "pm_assignedtoresource": "pm_resources",
    "pm_predecessortask": "pm_projecttasks",
    "pm_projecttask": "pm_projecttasks",
    "pm_resource": "pm_resources",
    "pm_skill": "pm_skills",
    "pm_systemuser": "systemusers",
    "pm_timesheet": "pm_timesheets",
    "pm_workflowinstancelookup": "pm_workflowinstances",
    "pm_workflowtemplate": "pm_workflowsteptemplates",
    "pm_workflowsteptemplate": "pm_workflowsteptemplates",
    "pm_initiatedbylookup": "systemusers",
    "pm_workflowlookup": "pm_workflows",
    "pm_initiative": "pm_initiatives",
    "pm_performancemeasure": "pm_performancemeasures",
    "pm_financialreportconfig": "pm_financialreportconfigs",
    "pm_document": "pm_documents",
    "pm_changelogentry": "pm_changelogentries",
    "pm_changerequestimpact": "pm_changerequestimpacts",
    "pm_checklistresponse": "pm_checklistresponses",
    "pm_projectapprovalrequest": "pm_projectapprovalrequests",
    "pm_projectgatereview": "pm_projectgatereviews",
    "pm_projectmilestone": "pm_projectmilestones",
    "pm_projectstatussnapshot": "pm_projectstatussnapshots",
    "pm_resourceallocation": "pm_resourceallocations",
    "pm_resourceskill": "pm_resourceskills",
    "pm_riskmitigationaction": "pm_riskmitigationactions",
    "pm_timesheetentry": "pm_timesheetentries",
    "pm_workflowinstance": "pm_workflowinstances",
    "pm_workflow": "pm_workflows",
    "pm_agentinsight": "pm_agentinsights",
    "pm_holiday": "pm_holidaies",
    "pm_cashflowentry": "pm_cashflowentries",
    "systemuserid": "systemusers",
    "teamid": "teams",
}

# ---------------------------------------------------------------------------
# Generic Dataverse "out of the box" fields that appear on virtually every
# custom table (audit metadata, ownership, state, currency, routing, etc.)
# These are NOT business data -- drop them entirely from the ERD.
# ---------------------------------------------------------------------------
GENERIC_DATAVERSE_DROP = {
    "importsequencenumber", "overriddencreatedon", "timezoneruleversionnumber",
    "utcconversiontimezonecode", "versionnumber",
    "ownerid", "owneridtype",
    "statecode", "statuscode",
    "transactioncurrencyid", "exchangerate",
    "processid", "stageid", "traversedpath", "regardingobjecttypecode",
    "businessunitid", "calendarid", "mobileofflineprofileid", "positionid",
    "queueid", "territoryid", "delegatedauthorizationid", "regardingobjectid",
    "teamtemplateid", "administratorid",
    "createdby", "createdon", "createdonbehalfby",
    "modifiedby", "modifiedon", "modifiedonbehalfby",
}

# For the two core Dataverse platform tables, only keep fields relevant
# to the PPM business model (identity / display info).
SYSTEMUSERS_KEEP = {
    "systemuserid", "fullname", "firstname", "lastname", "domainname",
    "internalemailaddress", "title", "isdisabled",
}
TEAMS_KEEP = {
    "teamid", "name", "description", "emailaddress",
    "membershiptype", "teamtype",
}

# explicit PK field per table
PK_OVERRIDE = {
    "teammemberships": "teammembershipid",
}

ENUM_RE = re.compile(r"export const (\w+) = \{(.*?)\}\s*as const;", re.DOTALL)
ENUM_PAIR_RE = re.compile(r"(-?\d+)\s*:\s*'([^']*)'")
INTERFACE_RE = re.compile(r"export interface (\w+)(?:\s+extends\s+\w+)?\s*\{(.*?)\n\}", re.DOTALL)
FIELD_RE = re.compile(r'^\s*"?([A-Za-z_][A-Za-z0-9_@./]*)"?(\?)?\s*:\s*([^;]+);\s*$')


def parse_file(path):
    text = open(path, encoding="utf-8").read()

    file_enums = {}
    for m in ENUM_RE.finditer(text):
        ename = m.group(1)
        body = m.group(2)
        pairs = ENUM_PAIR_RE.findall(body)
        if pairs:
            file_enums[ename] = [(k, v) for k, v in pairs]

    # find candidate interfaces; prefer the one ending in "Base"
    interfaces = {}
    for m in INTERFACE_RE.finditer(text):
        iname = m.group(1)
        body = m.group(2)
        interfaces[iname] = body

    base_name = None
    for iname in interfaces:
        if iname.endswith("Base"):
            base_name = iname
            break
    if base_name is None:
        # plain interface, e.g. Teammemberships (no Base variant)
        candidates = [n for n in interfaces if n not in ("IGetOptions", "IGetAllOptions")]
        if not candidates:
            return None
        base_name = candidates[0]

    table = re.sub(r"Base$", "", base_name).lower()
    body = interfaces[base_name]

    fields = []
    fk_binds = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        m = FIELD_RE.match(line)
        if not m:
            continue
        raw_name, optional, raw_type = m.groups()
        required = optional != "?"
        raw_type = raw_type.strip()

        if raw_name.endswith("@odata.bind"):
            lookup = raw_name[: -len("@odata.bind")]
            fk_binds.append(lookup)
            continue

        fields.append((raw_name, raw_type, required))

    return table, fields, fk_binds, file_enums


all_entities = {}
all_enums = {}

for path in sorted(glob.glob(os.path.join(MODELS_DIR, "*.ts"))):
    fname = os.path.basename(path)
    if fname in SKIP_FILES:
        continue
    result = parse_file(path)
    if result is None:
        continue
    table, fields, fk_binds, file_enums = result
    all_entities[table] = {"fields": fields, "fk_binds": fk_binds}
    all_enums.update(file_enums)

# ---------------------------------------------------------------------------
# For the two core OOB Dataverse platform tables, trim to identity-relevant
# fields *before* PK detection so a stray OOB "...id" field (e.g.
# address1_addressid, azureactivedirectoryobjectid) can't be mistaken for
# the primary key.
# ---------------------------------------------------------------------------
if "systemusers" in all_entities:
    f = all_entities["systemusers"]["fields"]
    all_entities["systemusers"]["fields"] = [
        t for t in f if t[0].lower() in SYSTEMUSERS_KEEP or t[0].lower() == "systemuserid"
    ]
if "teams" in all_entities:
    f = all_entities["teams"]["fields"]
    all_entities["teams"]["fields"] = [
        t for t in f if t[0].lower() in TEAMS_KEEP or t[0].lower() == "teamid"
    ]

# ---------------------------------------------------------------------------
# Apply per-table field pruning
# ---------------------------------------------------------------------------
def keep_field(table, fname):
    low = fname.lower()
    if table == "systemusers":
        return low in SYSTEMUSERS_KEEP
    if table == "teams":
        return low in TEAMS_KEEP
    if low in GENERIC_DATAVERSE_DROP:
        return False
    return True


def keep_fk(table, lookup):
    low = lookup.lower()
    if low in GENERIC_DATAVERSE_DROP:
        return False
    if table == "teams" and low not in ("administratorid",):
        # Teams OOB routing/security lookups (queue, business unit, currency,
        # delegated auth, team template) -- not part of the business model.
        if low not in FK_MAP:
            return False
    return True


def pk_field_for(table, fields):
    if table in PK_OVERRIDE:
        return PK_OVERRIDE[table]
    cands = [f for f in fields if f[0].lower().endswith("id") and f[0].lower() != "ownerid"]
    if not cands:
        return None
    # The Dataverse primary key is always the required (non-optional) id
    # field on the Base interface -- rely on that rather than guessing
    # pluralization, since some table names pluralize irregularly
    # (e.g. table "pm_holidaies" but PK field "pm_holidayid").
    required_cands = [f[0] for f in cands if f[2]]
    if len(required_cands) == 1:
        return required_cands[0]
    if required_cands:
        singular = table[:-1] if table.endswith("s") else table
        for c in required_cands:
            if c.lower() in (f"{table}id", f"{singular}id"):
                return c
        return required_cands[0]
    return cands[0][0]


used_enums = {}


def col_type_for(ftype):
    if ftype in all_enums:
        used_enums[ftype.lower()] = all_enums[ftype]
        return ftype.lower()
    if ftype == "boolean":
        return "boolean"
    if ftype == "number":
        return "decimal"
    return "varchar"


def dbml_str(v):
    return v.replace('"', "'")


table_blocks = []
refs = []

for table in sorted(all_entities):
    info = all_entities[table]
    fields = info["fields"]
    fk_binds = info["fk_binds"]
    pk = pk_field_for(table, fields)

    col_lines = []
    seen = set()

    if pk:
        col_lines.append(f'  "{pk}" uuid [pk, note: "Primary key"]')
        seen.add(pk.lower())

    for fname, ftype, required in fields:
        low = fname.lower()
        if low in seen or low == "ownerid":
            continue
        if not keep_field(table, fname):
            continue
        col_type = col_type_for(ftype)
        settings = []
        if required:
            settings.append("not null")
        setting_str = f" [{', '.join(settings)}]" if settings else ""
        col_lines.append(f'  "{fname}" {col_type}{setting_str}')
        seen.add(low)

    for lookup in fk_binds:
        low = lookup.lower()
        if low in seen:
            continue
        if not keep_fk(table, lookup):
            continue
        col_name = low if low.endswith("id") else f"{low}_id"
        if col_name in seen:
            continue
        col_lines.append(f'  "{col_name}" uuid')
        seen.add(col_name)
        target = FK_MAP.get(low)
        if target and target in all_entities:
            target_pk = pk_field_for(target, all_entities[target]["fields"])
            if target_pk:
                refs.append(f'Ref: "{table}"."{col_name}" > "{target}"."{target_pk}"')

    table_blocks.append((table, col_lines))

# ---------------------------------------------------------------------------
# Emit DBML
# ---------------------------------------------------------------------------
lines = []
lines.append("// =====================================================================")
lines.append("// Power Platform / Dataverse PPM Solution -- Entity Relationship Model")
lines.append("// Auto-generated from Dataverse-generated TypeScript model definitions")
lines.append("// Default/OOB Dataverse columns (audit fields, ownership, state, currency,")
lines.append("// routing, etc.) have been excluded -- only business-relevant columns and")
lines.append("// custom (pm_*) fields, plus core identity fields on Systemusers/Teams, remain.")
lines.append("// =====================================================================")
lines.append("")

for ename in sorted(used_enums):
    pairs = used_enums[ename]
    lines.append(f"Enum {ename} {{")
    seen_vals = set()
    for _, label in pairs:
        if label in seen_vals:
            continue
        seen_vals.add(label)
        lines.append(f'  "{dbml_str(label)}"')
    lines.append("}")
    lines.append("")

for table, col_lines in table_blocks:
    lines.append(f'Table "{table}" {{')
    lines.extend(col_lines)
    lines.append("}")
    lines.append("")

lines.append("// ---------------------------------------------------------------------")
lines.append("// Relationships")
lines.append("// ---------------------------------------------------------------------")
for r in refs:
    lines.append(r)

out_path = "ppm_model_no_default_columns.dbml"
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Tables:", len(table_blocks))
print("Enums:", len(used_enums))
print("Refs:", len(refs))
print("Written to:", out_path)
