const SERVICE_ACCOUNT = {
  project_id: "project-7dc71ffe-286a-4a0d-9f6",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCngbyOkDEgcP3U\nLg4RcotgcmXFrPo6OTSJqbJ2rguZYZpwGXrKN5DRsZXQZA7eX9IFJRf7y0mtjKro\nQcdq2BnBUjb2opSn84LRlfQpC+eyiEEMm1XQK+QxNwhrLzu9BncX3pf7LKNrY/rl\nGmaHu8AH6zNWEtyI9Mvn+mY4HgEuSwBIqlW7sitvL/DfidCW1Xvm6NuQ/GsU8THY\nkk6f002ImaMgeb+ygjjIyzQSA+mmtxHGxQ9RHnE/FswIH3Nd/WrLwjS/sP8n2HMW\n9uxzuHzB5mWB3zR0o2zKiEIfBkwBYZhzka9i4h95p9q9LqXP0ZJFxfehHkH0iLMg\nwVATBuJLAgMBAAECggEATj8ma5ojuLnPeIxC+hd90AHgVKTnBseuKRhiS1omBPI5\nCGB+oXOvbKT+DKiQ4YP1QX4AZBikRDPPqkr/8oMcFNho4HE16/auh2T69ymehCFt\n8YumXGYEZJEGl7sqtrQMcdQDPsutUv8TNm5Mst8bZxeRlYWeC0P+9FBd65zohEy3\nRawbIX+i3XsGHUX1nTo8eu3acDILINkJxmPvO4Hxe/7cvdGJNdgpgj07NJGFIYmx\nrwuQcw3cVwtG9o9A+9SL8qDsOjGXydWEwgSqeldv1B0U+jFH3RWi8m9CGdh6wN1n\nv23l2fkE7AKLWfTUp1QEAL3zp6b+BeHT6t67gBYFkQKBgQDTTA2V2lCQW9H82N8s\nVcRAOdqKG1Uu+CjKAXG/NHDvkcu3ySUhV7GBEK80nBvBOO+99lHnjkZYlAaYx/6L\naVBdH6nAJKH2+ZDUVGmwlCoPPwMAEKC3Qq2AGYcghEscgiheM2ayHmnmRDSVHfKu\nufyi7rWyvHtrt/eGsbrp4wAb3wKBgQDK8fsVw2vnqfiOhfjNzeeO9CG5SLpBjp/P\nc97WKxG2vNFs3Z/8mg4vZTvhEvWbWZGU7stMB/afl8iE+9/isfutMjwFZV/+q13+\nDzAGWMrElQbPMldw+7pJAmZ1s7qyDYvw8NSY44tqYvY2YcVIrqMErI8WM7QZYK0f\nJhFeBO6HFQKBgQDSogcM8kPLlGzhRIQ9GwZ3C/UqJZMmLmXi8culUq6ec1WEUXS9\nJ0EgqzQtGs2kMZD0aj89uJuxo2ZsGTpLWWGuY2kBzMLUg/Z3Y+q0Bw9igWsJPooo\nBcUVZN1Kcfa6ZZm+RjlCqITi8e0FFYSd33PULGhe0/uo5wxObpAopYyvOwKBgFcn\nvo3lJAUUcMM8c9JmmAhDfewleJ/I0Yb1GwDc9DmHM2VOdHO18VuXXTTWwJWbzLKq\nLrKTRO3a8Gl0Bf1ENHJ3/WDP3X7wN2hxO02uej4cRhVbaEQER0ctebUYn5fxy2SI\n+LREHE5u+4/1QxVosmfCd5ywTasMYqza22CGO63VAoGAQlIhuW1rd/cnIvpEN13Q\ni59ZD6hqgpVqxXBG6f6e5fZu6hzMEq8+EdY3t+/4ErGHWkHmEqKuCz+V1Wj5voBd\nzuCuocjCD8P226NBZ12dtVETTuzRakv0VG4ogE1oYk1FSi1DVKQaw9NRsjTbApmw\nbxAqYTjWSOrUoiJlxFRlxbA=\n-----END PRIVATE KEY-----\n",
  "client_email": "ais-gemini-key-a434f57a58ad471@117877414362.iam.gserviceaccount.com",
}

// In-memory token cache
let cachedToken: string | null = null
let tokenExpiryTime = 0

// Helper to base64url encode an ArrayBuffer
function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Helper to convert base64 string to ArrayBuffer
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binaryString = window.atob(b64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// Signs a JWT using Web Crypto API RSASSA-PKCS1-v1_5 with SHA-256
async function signJWT(payload: any, privateKeyPem: string, clientEmail: string): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  }

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)).buffer)
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)).buffer)
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Parse DER key from PEM string
  const pemContents = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "")

  const derBuffer = base64ToArrayBuffer(pemContents)

  // Import PKCS#8 Private Key
  const cryptoKey = await window.crypto.subtle.importKey(
    "pkcs8",
    derBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  )

  // Generate signature
  const signatureBuffer = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  return `${unsignedToken}.${base64urlEncode(signatureBuffer)}`
}

// Fetches an OAuth2 bearer token using service account credentials
async function getBearerToken(): Promise<string> {
  // Return cached token if valid (leave 1 min safety buffer)
  if (cachedToken && Date.now() < tokenExpiryTime - 60 * 1000) {
    return cachedToken
  }

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat
  }

  const assertion = await signJWT(payload, SERVICE_ACCOUNT.private_key, SERVICE_ACCOUNT.client_email)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Google OAuth2 token request failed: ${response.statusText}. Details: ${errorBody}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  tokenExpiryTime = Date.now() + (data.expires_in || 3600) * 1000

  return cachedToken!
}

export interface AIGeminiInitiativeResponse {
  pm_initiativename: string
  pm_businesscasedescription: string
  pm_estimatedcosteur: number
  pm_estimatedbenefitseur: number
  pm_initiativetype: number
  matched_portfolio_id: string | null
  matched_programme_id: string | null
  matched_requestedby_id: string | null
  matched_sponsor_id: string | null
  assistant_message: string
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
  hasFile?: boolean
  fileName?: string
}

// Regex utility to extract partial assistant message during streaming
export function extractAssistantMessage(jsonText: string): string {
  let cleaned = jsonText.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim()
  }

  if (!cleaned.startsWith("{")) {
    // Not a JSON string, return the whole raw text
    return jsonText
  }

  const match = cleaned.match(/"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`)
    } catch {
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }
  }
  return ""
}

// System instruction generator containing lists of users, portfolios, and programmes
function getSystemInstruction(
  portfolios: { id: string; name: string }[],
  programmes: { id: string; name: string; portfolioId?: string }[],
  users: { id: string; name: string }[]
): string {
  const portfoliosContext = portfolios.map(p => `- Name: "${p.name}", ID: "${p.id}"`).join('\n')
  const programmesContext = programmes.map(p => `- Name: "${p.name}", ID: "${p.id}", PortfolioID: "${p.portfolioId || 'None'}"`).join('\n')
  const usersContext = users.map(u => `- Name: "${u.name}", ID: "${u.id}"`).join('\n')

  return `You are an expert AI business analyst helping users formulate and create projects, programmes, and portfolios in a Project Portfolio Management (PPM) system.
Your job is to parse the user's description (or uploaded business case PDF document), extract key information to fill out the Initiative creation form, and respond with both the form data in a structured JSON payload and a styled HTML assistant message.

CRITICAL INSTRUCTION FOR MANUAL EDITS:
The user prompt may contain a block "[Current Form Fields State ...]" representing the current state of the form on the screen. If the user has made manual edits to any fields (e.g. they changed the name, description, cost, etc.), you MUST preserve these manual edits and return them unchanged in your JSON response, unless the user's prompt or the uploaded document explicitly requests a change to those specific fields.

Here are the target fields and guidelines:
- "pm_initiativename": Clear name of the project or initiative. MUST be under 100 characters.
- "pm_businesscasedescription": Summary justification and description of the initiative.
- "pm_estimatedcosteur": Total estimated cost in Euros (numeric). Default to 0 if unknown.
- "pm_estimatedbenefitseur": Total estimated benefit in Euros (numeric). Default to 0 if unknown.
- "pm_initiativetype": Integer code: 0 = Project, 1 = Programme, 2 = Portfolio. (If they say "project", set 0. If "programme" or "program", set 1. If "portfolio", set 2).
- "matched_portfolio_id": Find the best matching portfolio ID from the Portfolios list below. Set null if no match.
- "matched_programme_id": Find the best matching programme ID from the Programmes list below.
  CRITICAL RULE: The selected programme MUST be linked to the selected portfolio. Ensure that the selected programme's PortfolioID matches "matched_portfolio_id". If it does not belong to it, set null or select a different one.
- "matched_requestedby_id": Find the best matching user ID from the Users list below for the requester/creator. Set null if no match.
- "matched_sponsor_id": Find the best matching user ID from the Users list below for the business sponsor. Set null if no match.
- "assistant_message": Write a professional, friendly, and visually stunning summary of the initiative. You MUST use clean, styled HTML format (e.g. <p>, <strong>, <ul>, <ol>, <li>, <table>, <tr>, <th>, <td>, and <span style="..."> for highlights) to structure the information, show key metrics in a neat table, and provide recommendations. Do not return plain markdown. Make the UI look premium.

Available Portfolios:
${portfoliosContext || 'No Portfolios available.'}

Available Programmes:
${programmesContext || 'No Programmes available.'}

Available Users (Requester / Sponsor):
${usersContext || 'No Users available.'}

Return JSON output matching the requested schema. Ensure the "assistant_message" is beautiful HTML and fully populated.`
}

// Calls Gemini 3.1 Flash Lite via Vertex AI to extract and populate initiative form parameters
export async function generateAIInitiativeData(
  prompt: string,
  pdfBase64: string | undefined,
  pdfFileName: string | undefined,
  history: ChatMessage[],
  portfolios: { id: string; name: string }[],
  programmes: { id: string; name: string; portfolioId?: string }[],
  users: { id: string; name: string }[]
): Promise<AIGeminiInitiativeResponse> {
  const token = await getBearerToken()
  const systemInstruction = getSystemInstruction(portfolios, programmes, users)

  const contents: any[] = []
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })
  })

  const currentParts: any[] = []
  if (pdfBase64) {
    currentParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64
      }
    })
    const fileLabel = pdfFileName ? `[Attached PDF Document: ${pdfFileName}] ` : '[Attached PDF Document] '
    currentParts.push({ text: fileLabel + (prompt || "Extract initiative details from this document.") })
  } else {
    currentParts.push({ text: prompt })
  }

  contents.push({
    role: "user",
    parts: currentParts
  })

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          pm_initiativename: { type: "STRING" },
          pm_businesscasedescription: { type: "STRING" },
          pm_estimatedcosteur: { type: "NUMBER" },
          pm_estimatedbenefitseur: { type: "NUMBER" },
          pm_initiativetype: { type: "INTEGER" },
          matched_portfolio_id: { type: "STRING", nullable: true },
          matched_programme_id: { type: "STRING", nullable: true },
          matched_requestedby_id: { type: "STRING", nullable: true },
          matched_sponsor_id: { type: "STRING", nullable: true },
          assistant_message: { type: "STRING" }
        },
        required: [
          "pm_initiativename", 
          "pm_businesscasedescription", 
          "pm_estimatedcosteur", 
          "pm_estimatedbenefitseur", 
          "pm_initiativetype", 
          "assistant_message"
        ]
      }
    }
  }

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/locations/global/publishers/google/models/gemini-3.1-flash-lite:generateContent`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini API content generation failed: ${response.statusText}. Details: ${errorBody}`)
  }

  const result = await response.json()
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textOutput) {
    throw new Error("No response content generated from Gemini model.")
  }

  try {
    let cleaned = textOutput.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim()
    }
    if (!cleaned.startsWith("{")) {
      return {
        pm_initiativename: "",
        pm_businesscasedescription: "",
        pm_estimatedcosteur: 0,
        pm_estimatedbenefitseur: 0,
        pm_initiativetype: 0,
        matched_portfolio_id: null,
        matched_programme_id: null,
        matched_requestedby_id: null,
        matched_sponsor_id: null,
        assistant_message: textOutput
      }
    }
    const parsedData: AIGeminiInitiativeResponse = JSON.parse(cleaned)
    return parsedData
  } catch (err) {
    console.error("Failed to parse Gemini output as JSON. Raw output was:", textOutput)
    return {
      pm_initiativename: "",
      pm_businesscasedescription: "",
      pm_estimatedcosteur: 0,
      pm_estimatedbenefitseur: 0,
      pm_initiativetype: 0,
      matched_portfolio_id: null,
      matched_programme_id: null,
      matched_requestedby_id: null,
      matched_sponsor_id: null,
      assistant_message: textOutput
    }
  }
}

// Calls Gemini 3.1 Flash Lite via Vertex AI in streaming mode
export async function generateAIInitiativeDataStream(
  prompt: string,
  pdfBase64: string | undefined,
  pdfFileName: string | undefined,
  history: ChatMessage[],
  portfolios: { id: string; name: string }[],
  programmes: { id: string; name: string; portfolioId?: string }[],
  users: { id: string; name: string }[],
  onChunk: (textSoFar: string, assistantMessageSoFar: string) => void
): Promise<AIGeminiInitiativeResponse> {
  const token = await getBearerToken()
  const systemInstruction = getSystemInstruction(portfolios, programmes, users)

  const contents: any[] = []
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })
  })

  const currentParts: any[] = []
  if (pdfBase64) {
    currentParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64
      }
    })
    const fileLabel = pdfFileName ? `[Attached PDF Document: ${pdfFileName}] ` : '[Attached PDF Document] '
    currentParts.push({ text: fileLabel + (prompt || "Extract initiative details from this document.") })
  } else {
    currentParts.push({ text: prompt })
  }

  contents.push({
    role: "user",
    parts: currentParts
  })

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          pm_initiativename: { type: "STRING" },
          pm_businesscasedescription: { type: "STRING" },
          pm_estimatedcosteur: { type: "NUMBER" },
          pm_estimatedbenefitseur: { type: "NUMBER" },
          pm_initiativetype: { type: "INTEGER" },
          matched_portfolio_id: { type: "STRING", nullable: true },
          matched_programme_id: { type: "STRING", nullable: true },
          matched_requestedby_id: { type: "STRING", nullable: true },
          matched_sponsor_id: { type: "STRING", nullable: true },
          assistant_message: { type: "STRING" }
        },
        required: [
          "pm_initiativename", 
          "pm_businesscasedescription", 
          "pm_estimatedcosteur", 
          "pm_estimatedbenefitseur", 
          "pm_initiativetype", 
          "assistant_message"
        ]
      }
    }
  }

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/locations/global/publishers/google/models/gemini-3.1-flash-lite:streamGenerateContent`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini API streaming failed: ${response.statusText}. Details: ${errorBody}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Streaming is not supported in this browser.")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let inString = false
  let escape = false
  let braceDepth = 0
  let objectStartIdx = -1

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let i = 0
    while (i < buffer.length) {
      const char = buffer[i]
      if (escape) {
        escape = false
        i++
        continue
      }
      if (char === '\\') {
        escape = true
        i++
        continue
      }
      if (char === '"') {
        inString = !inString
        i++
        continue
      }
      if (!inString) {
        if (char === '{') {
          if (braceDepth === 0) {
            objectStartIdx = i
          }
          braceDepth++
        } else if (char === '}') {
          braceDepth--
          if (braceDepth === 0 && objectStartIdx !== -1) {
            const objStr = buffer.slice(objectStartIdx, i + 1)
            try {
              const obj = JSON.parse(objStr)
              const chunkText = obj.candidates?.[0]?.content?.parts?.[0]?.text
              if (chunkText) {
                fullText += chunkText
                const assistantMsgSoFar = extractAssistantMessage(fullText)
                onChunk(fullText, assistantMsgSoFar)
              }
            } catch (e) {
              console.warn("Error parsing chunk JSON:", e)
            }
            buffer = buffer.slice(i + 1)
            i = -1
            objectStartIdx = -1
          }
        }
      }
      i++
    }
  }

  try {
    let cleaned = fullText.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim()
    }
    const parsedData: AIGeminiInitiativeResponse = JSON.parse(cleaned)
    return parsedData
  } catch (err) {
    console.warn("Failed to parse full text as JSON. Doing regex fallback extraction...", err)
    const pm_initiativename = fullText.match(/"pm_initiativename"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_businesscasedescription = fullText.match(/"pm_businesscasedescription"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_estimatedcosteur = Number(fullText.match(/"pm_estimatedcosteur"\s*:\s*(\d+(?:\.\d+)?)/)?.[1] || 0)
    const pm_estimatedbenefitseur = Number(fullText.match(/"pm_estimatedbenefitseur"\s*:\s*(\d+(?:\.\d+)?)/)?.[1] || 0)
    const pm_initiativetype = Number(fullText.match(/"pm_initiativetype"\s*:\s*(\d+)/)?.[1] || 0)
    const matched_portfolio_id = fullText.match(/"matched_portfolio_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const matched_programme_id = fullText.match(/"matched_programme_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const matched_requestedby_id = fullText.match(/"matched_requestedby_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const matched_sponsor_id = fullText.match(/"matched_sponsor_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const assistant_message = extractAssistantMessage(fullText)

    return {
      pm_initiativename: pm_initiativename ? JSON.parse(`"${pm_initiativename}"`) : "",
      pm_businesscasedescription: pm_businesscasedescription ? JSON.parse(`"${pm_businesscasedescription}"`) : "",
      pm_estimatedcosteur,
      pm_estimatedbenefitseur,
      pm_initiativetype,
      matched_portfolio_id,
      matched_programme_id,
      matched_requestedby_id,
      matched_sponsor_id,
      assistant_message
    }
  }
}

export interface AIPortfolioResponse {
  pm_portfolioname: string
  pm_portfoliodescription: string
  pm_strategicobjective: string
  pm_approvedbudgeteur: number
  pm_startdate: string
  pm_enddate: string
  pm_businessunit: string
  pm_prioritylevel: number
  pm_portfoliostatus: number
  pm_ragstatus: number
  matched_owner_id: string | null
  assistant_message: string
}

export interface AIProgrammeResponse {
  pm_programmename: string
  pm_programmedescription: string
  pm_budgeteur: number
  pm_startdate: string
  pm_enddate: string
  pm_businessunit: string
  pm_programmephase: number
  pm_ragstatus: number
  matched_portfolio_id: string | null
  matched_programmemanager_id: string | null
  matched_sponsor_id: string | null
  assistant_message: string
}

// Calls Gemini 3.1 Flash Lite via Vertex AI in streaming mode to create a Portfolio
export async function generateAIPortfolioDataStream(
  prompt: string,
  pdfBase64: string | undefined,
  pdfFileName: string | undefined,
  history: ChatMessage[],
  users: { id: string; name: string }[],
  onChunk: (textSoFar: string, assistantMessageSoFar: string) => void
): Promise<AIPortfolioResponse> {
  const token = await getBearerToken()
  const usersContext = users.map(u => `- Name: "${u.name}", ID: "${u.id}"`).join('\n')

  const systemInstruction = `You are an expert AI business analyst helping users formulate and create Portfolios in a Project Portfolio Management (PPM) system.
Your job is to parse the user's description (or uploaded business case PDF document), extract key information to fill out the Portfolio creation form, and respond with both the form data in a structured JSON payload and a styled HTML assistant message.

CRITICAL INSTRUCTION FOR MANUAL EDITS:
The user prompt may contain a block "[Current Form Fields State ...]" representing the current state of the form on the screen. If the user has made manual edits to any fields (e.g. they changed the name, description, budget, BU, etc.), you MUST preserve these manual edits and return them unchanged in your JSON response, unless the user's prompt or the uploaded document explicitly requests a change to those specific fields.

Here are the target fields and guidelines:
- "pm_portfolioname": Clear name of the Portfolio. MUST be under 100 characters.
- "pm_portfoliodescription": Detailed summary/description of the Portfolio scope.
- "pm_strategicobjective": Strategic goal and objective for this Portfolio.
- "pm_approvedbudgeteur": Approved budget in Euros (numeric). Default to 0 if unknown.
- "pm_startdate": Start date (string formatted YYYY-MM-DD). If not specified, leave empty string.
- "pm_enddate": End date (string formatted YYYY-MM-DD). If not specified, leave empty string.
- "pm_businessunit": Must match one of these exact values if mentioned, otherwise leave empty: "Technology", "Finance", "HR", "Operations", "Sales & Marketing", "Legal", "Procurement", "Compliance".
- "pm_prioritylevel": Priority Level code: 1 = High, 2 = Medium, 3 = Low, 4 = Very Low. Default to 2.
- "pm_portfoliostatus": Status code: 0 = Active, 1 = Under Approval, 2 = Rejected. Default to 1.
- "pm_ragstatus": RAG Status code: 1 = Green (On Track), 0 = Amber (At Risk), 2 = Red (Critical). Default to 1.
- "matched_owner_id": Find the best matching owner/sponsor user ID from the Users list below. Set null if no match.
- "assistant_message": Write a professional, friendly, and visually stunning summary of the Portfolio. You MUST use clean, styled HTML format (e.g. <p>, <strong>, <ul>, <ol>, <li>, <table>, <tr>, <th>, <td>, and <span style="..."> for highlights) to structure the information, show key metrics in a neat table, and provide recommendations. Do not return plain markdown.

Available Users:
${usersContext || 'No Users available.'}

Return JSON output matching the requested schema.`

  const contents: any[] = []
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })
  })

  const currentParts: any[] = []
  if (pdfBase64) {
    currentParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64
      }
    })
    const fileLabel = pdfFileName ? `[Attached PDF Document: ${pdfFileName}] ` : '[Attached PDF Document] '
    currentParts.push({ text: fileLabel + (prompt || "Extract portfolio details from this document.") })
  } else {
    currentParts.push({ text: prompt })
  }

  contents.push({
    role: "user",
    parts: currentParts
  })

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          pm_portfolioname: { type: "STRING" },
          pm_portfoliodescription: { type: "STRING" },
          pm_strategicobjective: { type: "STRING" },
          pm_approvedbudgeteur: { type: "NUMBER" },
          pm_startdate: { type: "STRING" },
          pm_enddate: { type: "STRING" },
          pm_businessunit: { type: "STRING" },
          pm_prioritylevel: { type: "INTEGER" },
          pm_portfoliostatus: { type: "INTEGER" },
          pm_ragstatus: { type: "INTEGER" },
          matched_owner_id: { type: "STRING", nullable: true },
          assistant_message: { type: "STRING" }
        },
        required: [
          "pm_portfolioname",
          "pm_portfoliodescription",
          "pm_approvedbudgeteur",
          "assistant_message"
        ]
      }
    }
  }

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/locations/global/publishers/google/models/gemini-3.1-flash-lite:streamGenerateContent`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini Portfolio API streaming failed: ${response.statusText}. Details: ${errorBody}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Streaming is not supported in this browser.")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let inString = false
  let escape = false
  let braceDepth = 0
  let objectStartIdx = -1

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let i = 0
    while (i < buffer.length) {
      const char = buffer[i]
      if (escape) {
        escape = false
        i++
        continue
      }
      if (char === '\\') {
        escape = true
        i++
        continue
      }
      if (char === '"') {
        inString = !inString
        i++
        continue
      }
      if (!inString) {
        if (char === '{') {
          if (braceDepth === 0) {
            objectStartIdx = i
          }
          braceDepth++
        } else if (char === '}') {
          braceDepth--
          if (braceDepth === 0 && objectStartIdx !== -1) {
            const objStr = buffer.slice(objectStartIdx, i + 1)
            try {
              const obj = JSON.parse(objStr)
              const chunkText = obj.candidates?.[0]?.content?.parts?.[0]?.text
              if (chunkText) {
                fullText += chunkText
                const assistantMsgSoFar = extractAssistantMessage(fullText)
                onChunk(fullText, assistantMsgSoFar)
              }
            } catch (e) {
              console.warn("Error parsing chunk JSON:", e)
            }
            buffer = buffer.slice(i + 1)
            i = -1
            objectStartIdx = -1
          }
        }
      }
      i++
    }
  }

  try {
    let cleaned = fullText.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim()
    }
    const parsedData: AIPortfolioResponse = JSON.parse(cleaned)
    return parsedData
  } catch (err) {
    console.warn("Failed to parse full Portfolio text as JSON. Doing regex fallback extraction...", err)
    const pm_portfolioname = fullText.match(/"pm_portfolioname"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_portfoliodescription = fullText.match(/"pm_portfoliodescription"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_strategicobjective = fullText.match(/"pm_strategicobjective"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_approvedbudgeteur = Number(fullText.match(/"pm_approvedbudgeteur"\s*:\s*(\d+(?:\.\d+)?)/)?.[1] || 0)
    const pm_startdate = fullText.match(/"pm_startdate"\s*:\s*"([^"]+)"/)?.[1] || ""
    const pm_enddate = fullText.match(/"pm_enddate"\s*:\s*"([^"]+)"/)?.[1] || ""
    const pm_businessunit = fullText.match(/"pm_businessunit"\s*:\s*"([^"]+)"/)?.[1] || ""
    const pm_prioritylevel = Number(fullText.match(/"pm_prioritylevel"\s*:\s*(\d+)/)?.[1] || 2)
    const pm_portfoliostatus = Number(fullText.match(/"pm_portfoliostatus"\s*:\s*(\d+)/)?.[1] || 1)
    const pm_ragstatus = Number(fullText.match(/"pm_ragstatus"\s*:\s*(\d+)/)?.[1] || 1)
    const matched_owner_id = fullText.match(/"matched_owner_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const assistant_message = extractAssistantMessage(fullText)

    return {
      pm_portfolioname: pm_portfolioname ? JSON.parse(`"${pm_portfolioname}"`) : "",
      pm_portfoliodescription: pm_portfoliodescription ? JSON.parse(`"${pm_portfoliodescription}"`) : "",
      pm_strategicobjective: pm_strategicobjective ? JSON.parse(`"${pm_strategicobjective}"`) : "",
      pm_approvedbudgeteur,
      pm_startdate,
      pm_enddate,
      pm_businessunit,
      pm_prioritylevel,
      pm_portfoliostatus,
      pm_ragstatus,
      matched_owner_id,
      assistant_message
    }
  }
}

// Calls Gemini 3.1 Flash Lite via Vertex AI in streaming mode to create a Programme
export async function generateAIProgrammeDataStream(
  prompt: string,
  pdfBase64: string | undefined,
  pdfFileName: string | undefined,
  history: ChatMessage[],
  portfolios: { id: string; name: string }[],
  users: { id: string; name: string }[],
  onChunk: (textSoFar: string, assistantMessageSoFar: string) => void
): Promise<AIProgrammeResponse> {
  const token = await getBearerToken()
  const portfoliosContext = portfolios.map(p => `- Name: "${p.name}", ID: "${p.id}"`).join('\n')
  const usersContext = users.map(u => `- Name: "${u.name}", ID: "${u.id}"`).join('\n')

  const systemInstruction = `You are an expert AI business analyst helping users formulate and create Programmes in a Project Portfolio Management (PPM) system.
Your job is to parse the user's description (or uploaded business case PDF document), extract key information to fill out the Programme creation form, and respond with both the form data in a structured JSON payload and a styled HTML assistant message.

CRITICAL INSTRUCTION FOR MANUAL EDITS:
The user prompt may contain a block "[Current Form Fields State ...]" representing the current state of the form on the screen. If the user has made manual edits to any fields (e.g. they changed the name, description, budget, BU, manager, sponsor, etc.), you MUST preserve these manual edits and return them unchanged in your JSON response, unless the user's prompt or the uploaded document explicitly requests a change to those specific fields.

Here are the target fields and guidelines:
- "pm_programmename": Clear name of the Programme. MUST be under 100 characters.
- "pm_programmedescription": Detailed summary/description of the Programme scope and goals.
- "pm_budgeteur": Budget allocated to this Programme in Euros (numeric). Default to 0 if unknown.
- "pm_startdate": Start date (string formatted YYYY-MM-DD). If not specified, leave empty string.
- "pm_enddate": End date (string formatted YYYY-MM-DD). If not specified, leave empty string.
- "pm_businessunit": Must match one of these exact values if mentioned, otherwise leave empty: "Technology", "Finance", "HR", "Operations", "Sales & Marketing", "Legal", "Procurement", "Compliance".
- "pm_programmephase": Phase integer code: 0 = Planning, 1 = Definition, 2 = Execution, 3 = Closeout. Default to 0.
- "pm_ragstatus": RAG Status code: 1 = Green (On Track), 0 = Amber (At Risk), 2 = Red (Critical). Default to 1.
- "matched_portfolio_id": Find the best matching parent Portfolio ID from the Portfolios list below. Set null if no match.
- "matched_programmemanager_id": Find the best matching Program Manager user ID from the Users list below. Set null if no match.
- "matched_sponsor_id": Find the best matching Sponsor user ID from the Users list below. Set null if no match.
- "assistant_message": Write a professional, friendly, and visually stunning summary of the Programme. You MUST use clean, styled HTML format (e.g. <p>, <strong>, <ul>, <ol>, <li>, <table>, <tr>, <th>, <td>, and <span style="..."> for highlights) to structure the information, show key metrics in a neat table, and provide recommendations. Do not return plain markdown.

Available Portfolios:
${portfoliosContext || 'No Portfolios available.'}

Available Users:
${usersContext || 'No Users available.'}

Return JSON output matching the requested schema.`

  const contents: any[] = []
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })
  })

  const currentParts: any[] = []
  if (pdfBase64) {
    currentParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64
      }
    })
    const fileLabel = pdfFileName ? `[Attached PDF Document: ${pdfFileName}] ` : '[Attached PDF Document] '
    currentParts.push({ text: fileLabel + (prompt || "Extract programme details from this document.") })
  } else {
    currentParts.push({ text: prompt })
  }

  contents.push({
    role: "user",
    parts: currentParts
  })

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          pm_programmename: { type: "STRING" },
          pm_programmedescription: { type: "STRING" },
          pm_budgeteur: { type: "NUMBER" },
          pm_startdate: { type: "STRING" },
          pm_enddate: { type: "STRING" },
          pm_businessunit: { type: "STRING" },
          pm_programmephase: { type: "INTEGER" },
          pm_ragstatus: { type: "INTEGER" },
          matched_portfolio_id: { type: "STRING", nullable: true },
          matched_programmemanager_id: { type: "STRING", nullable: true },
          matched_sponsor_id: { type: "STRING", nullable: true },
          assistant_message: { type: "STRING" }
        },
        required: [
          "pm_programmename",
          "pm_programmedescription",
          "pm_budgeteur",
          "assistant_message"
        ]
      }
    }
  }

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/locations/global/publishers/google/models/gemini-3.1-flash-lite:streamGenerateContent`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini Programme API streaming failed: ${response.statusText}. Details: ${errorBody}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Streaming is not supported in this browser.")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let inString = false
  let escape = false
  let braceDepth = 0
  let objectStartIdx = -1

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let i = 0
    while (i < buffer.length) {
      const char = buffer[i]
      if (escape) {
        escape = false
        i++
        continue
      }
      if (char === '\\') {
        escape = true
        i++
        continue
      }
      if (char === '"') {
        inString = !inString
        i++
        continue
      }
      if (!inString) {
        if (char === '{') {
          if (braceDepth === 0) {
            objectStartIdx = i
          }
          braceDepth++
        } else if (char === '}') {
          braceDepth--
          if (braceDepth === 0 && objectStartIdx !== -1) {
            const objStr = buffer.slice(objectStartIdx, i + 1)
            try {
              const obj = JSON.parse(objStr)
              const chunkText = obj.candidates?.[0]?.content?.parts?.[0]?.text
              if (chunkText) {
                fullText += chunkText
                const assistantMsgSoFar = extractAssistantMessage(fullText)
                onChunk(fullText, assistantMsgSoFar)
              }
            } catch (e) {
              console.warn("Error parsing chunk JSON:", e)
            }
            buffer = buffer.slice(i + 1)
            i = -1
            objectStartIdx = -1
          }
        }
      }
      i++
    }
  }

  try {
    let cleaned = fullText.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim()
    }
    const parsedData: AIProgrammeResponse = JSON.parse(cleaned)
    return parsedData
  } catch (err) {
    console.warn("Failed to parse full Programme text as JSON. Doing regex fallback extraction...", err)
    const pm_programmename = fullText.match(/"pm_programmename"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_programmedescription = fullText.match(/"pm_programmedescription"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || ""
    const pm_budgeteur = Number(fullText.match(/"pm_budgeteur"\s*:\s*(\d+(?:\.\d+)?)/)?.[1] || 0)
    const pm_startdate = fullText.match(/"pm_startdate"\s*:\s*"([^"]+)"/)?.[1] || ""
    const pm_enddate = fullText.match(/"pm_enddate"\s*:\s*"([^"]+)"/)?.[1] || ""
    const pm_businessunit = fullText.match(/"pm_businessunit"\s*:\s*"([^"]+)"/)?.[1] || ""
    const pm_programmephase = Number(fullText.match(/"pm_programmephase"\s*:\s*(\d+)/)?.[1] || 0)
    const pm_ragstatus = Number(fullText.match(/"pm_ragstatus"\s*:\s*(\d+)/)?.[1] || 1)
    const matched_portfolio_id = fullText.match(/"matched_portfolio_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const matched_programmemanager_id = fullText.match(/"matched_programmemanager_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const matched_sponsor_id = fullText.match(/"matched_sponsor_id"\s*:\s*"([^"]+)"/)?.[1] || null
    const assistant_message = extractAssistantMessage(fullText)

    return {
      pm_programmename: pm_programmename ? JSON.parse(`"${pm_programmename}"`) : "",
      pm_programmedescription: pm_programmedescription ? JSON.parse(`"${pm_programmedescription}"`) : "",
      pm_budgeteur,
      pm_startdate,
      pm_enddate,
      pm_businessunit,
      pm_programmephase,
      pm_ragstatus,
      matched_portfolio_id,
      matched_programmemanager_id,
      matched_sponsor_id,
      assistant_message
    }
  }
}