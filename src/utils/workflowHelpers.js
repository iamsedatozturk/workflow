import { getNodeHeight, nodeSize } from '../workflowConstants'

export function collectLinks(criteria) {
  const links = []
  criteria.forEach((source) => {
    if (source.kind === 'Compare' && source.compareOutcomes?.length) {
      source.compareOutcomes.forEach((outcome, index) => {
        addLink(links, criteria, source, outcome.targetId, outcome.label, `compare-${index}`, {
          index,
          count: source.compareOutcomes.length,
          field: `compareOutcomes:${index}`,
        })
      })
      return
    }

    addLink(links, criteria, source, source.nextOnStart, 'Sonraki', 'next', {
      index: 0,
      count: 1,
      field: 'nextOnStart',
    })
    addLink(links, criteria, source, source.nextOnTrue, 'Doğru', 'true', {
      index: 0,
      count: 2,
      field: 'nextOnTrue',
    })
    addLink(links, criteria, source, source.nextOnFalse, 'Yanlış', 'false', {
      index: 1,
      count: 2,
      field: 'nextOnFalse',
    })
    addLink(links, criteria, source, source.nextOnApprove, 'Onay', 'approve', {
      index: 0,
      count: 2,
      field: 'nextOnApprove',
    })
    addLink(links, criteria, source, source.nextOnReject, 'Red', 'reject', {
      index: 1,
      count: 2,
      field: 'nextOnReject',
    })
  })
  return assignLinkSlots(links, criteria)
}

export function assignLinkSlots(links, criteria) {
  const endpointGroups = new Map()
  const addEndpoint = (nodeId, side, endpoint) => {
    const key = `${nodeId}:${side}`
    if (!endpointGroups.has(key)) endpointGroups.set(key, [])
    endpointGroups.get(key).push(endpoint)
  }

  links.forEach((link) => {
    addEndpoint(link.source.id, sideToward(link.source, link.target), {
      link,
      role: 'source',
    })
    addEndpoint(link.target.id, sideToward(link.target, link.source), {
      link,
      role: 'target',
    })
  })

  endpointGroups.forEach((endpoints) => {
    endpoints.forEach((endpoint, index) => {
      if (endpoint.role === 'source') {
        endpoint.link.sourcePort.sourceSlotIndex = index
        endpoint.link.sourcePort.sourceSlotCount = endpoints.length
      } else {
        endpoint.link.sourcePort.targetSlotIndex = index
        endpoint.link.sourcePort.targetSlotCount = endpoints.length
      }
    })
  })

  links.forEach((link) => {
    link.sourcePort.routeIndex = link.sourcePort.targetSlotIndex ?? 0
    link.sourcePort.routeCount = link.sourcePort.targetSlotCount ?? 1
  })

  return links
}

function sideToward(from, to) {
  const fromLeft = Number(from.positionX || 0)
  const fromTop = Number(from.positionY || 0)
  const fromCenter = {
    x: fromLeft + nodeSize.width / 2,
    y: fromTop + getNodeHeight(from) / 2,
  }
  const toCenter = {
    x: Number(to.positionX || 0) + nodeSize.width / 2,
    y: Number(to.positionY || 0) + getNodeHeight(to) / 2,
  }

  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y

  const horizontalDistance = Math.abs(dx) / (nodeSize.width / 2)
  const verticalDistance = Math.abs(dy) / (getNodeHeight(from) / 2)
  if (horizontalDistance >= verticalDistance) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}

export function getNodeOutcomes(item) {
  if (item.kind === 'Compare') {
    const outcomes = item.compareOutcomes?.length
      ? item.compareOutcomes
      : [
          { label: 'Doğru', targetId: item.nextOnTrue },
          { label: 'Yanlış', targetId: item.nextOnFalse },
        ]

    return outcomes.slice(0, 4).map((outcome, index) => ({
      field: `compareOutcomes:${index}`,
      label: outcome.label || `Durum ${index + 1}`,
      targetId: outcome.targetId,
    }))
  }

  if (item.kind === 'Approval') {
    return [
      { field: 'nextOnApprove', label: 'Onay', targetId: item.nextOnApprove },
      { field: 'nextOnReject', label: 'Red', targetId: item.nextOnReject },
    ]
  }

  if (item.kind === 'End') return []

  return [{ field: 'nextOnStart', label: 'Sonraki', targetId: item.nextOnStart }]
}

export function outcomeLabel(field) {
  if (field?.startsWith('compareOutcomes:')) return 'Karşılaştırma durumu'

  return {
    nextOnStart: 'Sonraki',
    nextOnTrue: 'Doğru',
    nextOnFalse: 'Yanlış',
    nextOnApprove: 'Onay',
    nextOnReject: 'Red',
  }[field]
}

export function addLink(links, criteria, source, targetId, label, type, sourcePort = null) {
  if (!targetId) return
  const target = criteria.find((item) => item.id === targetId)
  if (target) {
    links.push({ key: `${source.id}-${target.id}-${type}`, source, target, label, sourcePort })
  }
}

export function emptyCriteria(kind = 'Compare', workflowItemId = null) {
  return {
    id: '',
    workflowItemId,
    kind,
    title: defaultTitle(kind),
    column: 'Tutar',
    operator: '>',
    compareValue: 5000,
    approver: '',
    informPerson: '',
    nextOnStart: '',
    nextOnTrue: '',
    nextOnFalse: '',
    nextOnApprove: '',
    nextOnReject: '',
    compareOutcomes:
      kind === 'Compare'
        ? [
            emptyCompareOutcome('Durum 1'),
            emptyCompareOutcome('Durum 2'),
          ]
        : [],
    positionX: 32,
    positionY: 150,
  }
}

export function toCriteriaForm(item) {
  const sharedPerson = item.approver || item.informPerson || ''

  return {
    ...emptyCriteria(item.kind),
    ...item,
    approver: sharedPerson,
    informPerson: sharedPerson,
    nextOnStart: item.nextOnStart || '',
    nextOnTrue: item.nextOnTrue || '',
    nextOnFalse: item.nextOnFalse || '',
    nextOnApprove: item.nextOnApprove || '',
    nextOnReject: item.nextOnReject || '',
    compareOutcomes:
      item.compareOutcomes?.length
        ? item.compareOutcomes.map(toCompareOutcomeForm)
        : emptyCriteria(item.kind).compareOutcomes,
  }
}

export function normalizeCriteria(item) {
  const sharedPerson = item.approver || item.informPerson || ''

  return {
    ...item,
    workflowItemId: Number(item.workflowItemId || 0),
    compareValue: Number(item.compareValue || 0),
    approver: sharedPerson,
    informPerson: sharedPerson,
    positionX: Number(item.positionX || 32),
    positionY: Number(item.positionY || 150),
    compareOutcomes: (item.compareOutcomes || [])
      .slice(0, 4)
      .filter((outcome) => outcome.label?.trim())
      .map(normalizeCompareOutcome),
  }
}

export function defaultTitle(kind) {
  return {
    Start: 'İş Akışı Başlat',
    Compare: 'Tutar > 5000 TL',
    Approval: 'Onaylanacak Kişi',
    Inform: 'Bilgilendirme Yapılacak Personel',
    End: 'Akışı Bitir',
  }[kind]
}

export function emptyCompareOutcome(label = 'Durum') {
  return {
    label,
    targetId: '',
    conditions: [{ column: 'Tutar', operator: '>', compareValue: 5000 }],
  }
}

export function toCompareOutcomeForm(outcome) {
  const conditions = outcome.conditions?.length
    ? outcome.conditions
    : [{ column: outcome.column || 'Tutar', operator: outcome.operator || '>', compareValue: outcome.compareValue || 0 }]

  return {
    label: outcome.label || '',
    targetId: outcome.targetId || '',
    conditions: conditions.map((condition) => ({
      column: condition.column || 'Tutar',
      operator: condition.operator || '>',
      compareValue: condition.compareValue ?? 0,
    })),
  }
}

export function normalizeCompareOutcome(outcome) {
  const conditions = (outcome.conditions?.length
    ? outcome.conditions
    : [{ column: outcome.column || 'Tutar', operator: outcome.operator || '>', compareValue: outcome.compareValue || 0 }]
  )
    .filter((condition) => condition.operator && condition.compareValue !== '')
    .map((condition) => ({
      column: condition.column || 'Tutar',
      operator: condition.operator || '>',
      compareValue: Number(condition.compareValue || 0),
    }))

  return {
    label: outcome.label.trim(),
    targetId: outcome.targetId || null,
    conditions,
  }
}

export function compareOutcomeRuleText(outcome) {
  const conditions = outcome.conditions?.length
    ? outcome.conditions
    : outcome.operator
      ? [{ column: outcome.column || 'Tutar', operator: outcome.operator, compareValue: outcome.compareValue }]
      : []

  return conditions.length
    ? conditions.map((condition) => `${condition.column} ${condition.operator} ${formatCompactValue(condition.compareValue)}`).join(' ve ')
    : 'Kural yok'
}

export function formatCompactValue(value) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function criteriaSummary(item) {
  if (item.kind === 'Compare') {
    return (item.compareOutcomes || [])
      .map((outcome) => `${outcome.label}: ${compareOutcomeRuleText(outcome)}`)
      .join(' / ') || '-'
  }
  if (item.kind === 'Approval') return item.approver || item.informPerson || '-'
  if (item.kind === 'Inform') return item.approver || item.informPerson || '-'
  return item.title
}

export function targetTitle(criteria, id) {
  if (!id) return '-'
  const item = criteria.find((candidate) => candidate.id === id)
  return item ? `${item.id} - ${item.title}` : id
}

export function statusClass(status) {
  if (status === 'Onay Bekliyor') return 'pending'
  if (status === 'Bitti') return 'done'
  if (status === 'Bilgilendirildi') return 'info'
  return ''
}

export function formatMoney(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value || 0)
}
