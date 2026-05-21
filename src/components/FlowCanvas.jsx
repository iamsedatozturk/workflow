import React, { useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { FiTrash2 } from 'react-icons/fi'
import classNames from 'classnames'
import { getNodeHeight, kindIcon, kindOptions, nodeSize } from '../workflowConstants'
import { collectLinks, getNodeOutcomes, outcomeLabel } from '../utils/workflowHelpers'

export function FlowCanvas({
  currentCriteria,
  dragPreview,
  zoom,
  activeNodeId,
  selectedId,
  pendingLink,
  canvasRef,
  onSelect,
  onOpenDetails,
  onClearSelection,
  onDelete,
  onDeleteLink,
  onBeginLink,
  onConnect,
}) {
  const canvasWidth = Math.max(
    1240,
    ...currentCriteria.map((item) => Number(item.positionX || 0) + nodeSize.width + 260),
  )
  const canvasHeight = Math.max(
    620,
    ...currentCriteria.map((item) => Number(item.positionY || 0) + getNodeHeight(item) + 280),
  )
  const arrowCriteria = useMemo(
    () =>
      currentCriteria.map((item) =>
        dragPreview?.id === item.id
          ? {
              ...item,
              positionX: Number(item.positionX || 0) + dragPreview.delta.x,
              positionY: Number(item.positionY || 0) + dragPreview.delta.y,
            }
          : item,
      ),
    [currentCriteria, dragPreview],
  )
  const links = useMemo(() => collectLinks(arrowCriteria), [arrowCriteria])

  const handleKeyDown = (event) => {
    if (event.key !== 'Delete') return
    event.preventDefault()
    if (pendingLink) {
      onDeleteLink(pendingLink.sourceId, pendingLink.outcome)
      return
    }
    if (!selectedId) return
    onDelete(selectedId)
  }

  const handleCanvasClick = (event) => {
    if (event.target.closest('.flow-node, .flow-link')) return
    onClearSelection()
  }

  return (
    <div
      ref={canvasRef}
      className="flow-canvas"
      tabIndex={0}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
    >
      {pendingLink && (
        <div className="linking-banner">
          {outcomeLabel(pendingLink.outcome)} çıkışı seçildi. Hedef iş akışı adımına tıklayın.
        </div>
      )}
      {currentCriteria.length === 0 && (
        <div className="empty-canvas">
          <strong>Boş canvas</strong>
          <span>Üstteki butonlardan adım ekleyin, sonra çıkış etiketleriyle bağlantıları kurun.</span>
        </div>
      )}
      <div
        className="flow-stage-viewport"
        style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
      >
        <div
          className="flow-stage"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${zoom})`,
          }}
        >
          <svg
            className="flow-arrows"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden="true"
          >
        <defs>
          <marker
            id="arrow-neutral"
            viewBox="0 0 10 10"
            markerWidth="9"
            markerHeight="9"
            refX="10"
            refY="5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,1 L10,5 L0,9 Z" fill="#475467" />
          </marker>
          <marker id="arrow-next" viewBox="0 0 10 10" markerWidth="9" markerHeight="9" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L10,5 L0,9 Z" fill="#2563eb" />
          </marker>
          <marker id="arrow-approve" viewBox="0 0 10 10" markerWidth="9" markerHeight="9" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L10,5 L0,9 Z" fill="#16a34a" />
          </marker>
          <marker id="arrow-reject" viewBox="0 0 10 10" markerWidth="9" markerHeight="9" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L10,5 L0,9 Z" fill="#dc2626" />
          </marker>
          <marker id="arrow-compare" viewBox="0 0 10 10" markerWidth="9" markerHeight="9" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,1 L10,5 L0,9 Z" fill="#b45309" />
          </marker>
        </defs>
        {links.map((link) => (
          <Arrow
            key={link.key}
            link={link}
            criteria={arrowCriteria}
            pendingLink={pendingLink}
            onBeginLink={onBeginLink}
            showLabel={false}
          />
        ))}
          </svg>
          {currentCriteria.map((item) => (
            <FlowNode
              key={item.id}
              item={item}
              criteria={currentCriteria}
              links={links}
              selected={item.id === selectedId}
              active={item.id === activeNodeId}
              pendingLink={pendingLink}
              onSelect={() => {
                if (pendingLink && pendingLink.sourceId !== item.id) {
                  onConnect(pendingLink.sourceId, pendingLink.outcome, item.id)
                  return
                }
                onSelect(item.id)
              }}
              onOpenDetails={() => onOpenDetails(item.id)}
              onDelete={() => onDelete(item.id)}
              onBeginLink={onBeginLink}
            />
          ))}
          <svg
            className="flow-labels"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden="true"
          >
            {links.map((link) => (
              <ArrowLabel
                key={`${link.key}-label`}
                link={link}
                criteria={arrowCriteria}
                pendingLink={pendingLink}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}

function FlowNode({ item, criteria, links, selected, active, pendingLink, onSelect, onOpenDetails, onDelete, onBeginLink }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(pendingLink),
  })
  const Icon = kindIcon[item.kind]
  const style = {
    left: item.positionX,
    top: item.positionY,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={classNames('flow-node', item.kind, { selected, active })}
      style={style}
      {...listeners}
      {...attributes}
      onPointerUp={(event) => {
        if (!pendingLink || pendingLink.sourceId === item.id) return
        event.preventDefault()
        event.stopPropagation()
        onSelect()
      }}
      onClick={onSelect}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenDetails()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Delete') return
        event.preventDefault()
        event.stopPropagation()
        onSelect()
        onDelete()
      }}
    >
      <span className="node-type">
        <Icon />
        {kindOptions.find((option) => option.value === item.kind)?.label}
      </span>
      <strong>{item.title}</strong>
      <small>{item.id}</small>
      <div className="node-handles">
        {getNodeOutcomes(item).map((outcome) => (
          <span
            key={outcome.field}
            role="button"
            tabIndex={0}
            className={classNames('node-handle', {
              active:
                pendingLink?.sourceId === item.id &&
                pendingLink?.outcome === outcome.field,
            })}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onBeginLink(item.id, outcome.field)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              event.stopPropagation()
              onBeginLink(item.id, outcome.field)
            }}
          >
            {outcome.label}
          </span>
        ))}
      </div>
      {getNodeOutcomes(item).map((outcome, index, outcomes) => {
        const link = links.find(
          (candidate) =>
            candidate.source.id === item.id &&
            candidate.sourcePort?.field === outcome.field,
        )
        const target = criteria.find((candidate) => candidate.id === outcome.targetId)
        const side = link ? sideToward(link.source, link.target) : target ? sideToward(item, target) : 'right'
        const sideIndex = link?.sourcePort?.sourceSlotIndex ?? index
        const sideCount = link?.sourcePort?.sourceSlotCount ?? outcomes.length
        return (
          <span
            key={`${outcome.field}-port`}
            className={classNames('node-port', 'outgoing', side, {
              active:
                pendingLink?.sourceId === item.id &&
                pendingLink?.outcome === outcome.field,
            })}
            style={getPortStyle(item, side, sideIndex, sideCount)}
          />
        )
      })}
      {links
        .filter((link) => link.target.id === item.id)
        .map((link) => {
          const side = sideToward(link.target, link.source)
          return (
            <span
              key={`${link.key}-incoming-port`}
              className={classNames('node-port', 'incoming', side)}
              style={getPortStyle(
                item,
                side,
                link.sourcePort?.targetSlotIndex ?? 0,
                link.sourcePort?.targetSlotCount ?? 1,
              )}
            />
          )
        })}
    </button>
  )
}

function Arrow({ link, criteria, pendingLink, onBeginLink, showLabel = true }) {
  const route = buildArrowRoute(link.source, link.target, link.sourcePort, criteria)
  const d = roundedPolylinePath(route.points)
  const tone = linkTone(link)
  const isActive =
    pendingLink?.sourceId === link.source.id &&
    pendingLink?.outcome === link.sourcePort?.field

  const selectLink = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!link.sourcePort?.field) return
    onBeginLink(link.source.id, link.sourcePort.field)
  }

  return (
    <g
      className={classNames('flow-link', tone, { active: isActive })}
      role="button"
      tabIndex={0}
      onClick={selectLink}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        selectLink(event)
      }}
    >
      <path className="flow-link-hit" d={d} fill="none" />
      <path className="flow-link-halo" d={d} fill="none" />
      <path className="flow-link-line" d={d} fill="none" markerEnd={`url(#arrow-${tone})`} />
      {showLabel && <ArrowLabel link={link} criteria={criteria} pendingLink={pendingLink} />}
    </g>
  )
}

function ArrowLabel({ link, criteria, pendingLink }) {
  if (!link.label) return null

  const route = buildArrowRoute(link.source, link.target, link.sourcePort, criteria)
  const labelPoint = route.labelPoint
  const tone = linkTone(link)
  const labelWidth = Math.max(38, (link.label || '').length * 6 + 14)
  const isActive =
    pendingLink?.sourceId === link.source.id &&
    pendingLink?.outcome === link.sourcePort?.field

  return (
    <g className={classNames('flow-link-label-wrap', 'flow-link', tone, { active: isActive })}>
      <rect
        className="flow-link-label-bg"
        x={labelPoint.x - labelWidth / 2}
        y={labelPoint.y - 12}
        width={labelWidth}
        height="18"
        rx="9"
      />
      <text
        className="flow-link-label"
        x={labelPoint.x}
        y={labelPoint.y}
        textAnchor="middle"
      >
        {link.label}
      </text>
    </g>
  )
}

function linkTone(link) {
  const field = link.sourcePort?.field || ''
  const label = link.label || ''
  if (field === 'nextOnReject' || label === 'Red') return 'reject'
  if (field === 'nextOnApprove' || label === 'Onay') return 'approve'
  if (field.startsWith('compareOutcomes:') || link.source.kind === 'Compare') return 'compare'
  if (field === 'nextOnStart') return 'next'
  return 'neutral'
}

function buildArrowRoute(source, target, sourcePort = null, criteria = []) {
  const sourceLeft = Number(source.positionX || 0)
  const sourceTop = Number(source.positionY || 0)
  const targetLeft = Number(target.positionX || 0)
  const targetTop = Number(target.positionY || 0)
  const sourceCenter = {
    x: sourceLeft + nodeSize.width / 2,
    y: sourceTop + getNodeHeight(source) / 2,
  }
  const targetCenter = {
    x: targetLeft + nodeSize.width / 2,
    y: targetTop + getNodeHeight(target) / 2,
  }

  if (sourcePort) {
    const sourceSide = sideToward(source, target)
    const targetSide = sideToward(target, source)
    const start = getPortPoint(
      source,
      sourceSide,
      sourcePort.sourceSlotIndex ?? sourcePort.index,
      sourcePort.sourceSlotCount ?? sourcePort.count,
      0,
    )
    const end = getPortPoint(
      target,
      targetSide,
      sourcePort.targetSlotIndex ?? 0,
      sourcePort.targetSlotCount ?? 1,
      arrowTargetOutward(targetSide),
    )
    return buildSideAwareRoute(start, sourceSide, end, targetSide, {
      sourceSlotIndex: sourcePort.sourceSlotIndex ?? sourcePort.index,
      sourceSlotCount: sourcePort.sourceSlotCount ?? sourcePort.count,
      targetSlotIndex: sourcePort.targetSlotIndex ?? 0,
      targetSlotCount: sourcePort.targetSlotCount ?? 1,
      routeIndex: sourcePort.routeIndex ?? 0,
      routeCount: sourcePort.routeCount ?? 1,
    })
  }

  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y

  if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 0.45) {
    const start = {
      x: sourceCenter.x,
      y: dy > 0 ? sourceTop + getNodeHeight(source) : sourceTop,
    }
    const end = {
      x: targetCenter.x,
      y: dy > 0 ? targetTop : targetTop + getNodeHeight(target),
    }
    const midY = start.y + (end.y - start.y) / 2

    return {
      points: [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end],
      labelPoint: { x: (start.x + end.x) / 2, y: midY - 10 },
    }
  }

  if (targetCenter.x >= sourceCenter.x) {
    const start = { x: sourceLeft + nodeSize.width, y: sourceCenter.y }
    const end = { x: targetLeft, y: targetCenter.y }
    const midX = start.x + Math.max(56, (end.x - start.x) / 2)
    if (Math.abs(start.y - end.y) < 1) {
      return {
        points: [start, end],
        labelPoint: { x: (start.x + end.x) / 2, y: start.y - 12 },
      }
    }

    return {
      points: [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
      labelPoint: { x: midX, y: Math.min(start.y, end.y) - 12 },
    }
  }

  const start = { x: sourceLeft, y: sourceCenter.y }
  const end = { x: targetLeft + nodeSize.width, y: targetCenter.y }
  const gutterX = Math.min(start.x, end.x) - 80
  if (Math.abs(start.y - end.y) < 1) {
    return {
      points: [start, { x: gutterX, y: start.y }, { x: gutterX, y: start.y + 110 }, { x: end.x, y: start.y + 110 }, end],
      labelPoint: { x: gutterX, y: start.y + 98 },
    }
  }

  return {
    points: [start, { x: gutterX, y: start.y }, { x: gutterX, y: end.y }, end],
    labelPoint: { x: gutterX, y: Math.min(start.y, end.y) - 12 },
  }
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

function getPortPoint(item, side, index = 0, count = 1, outward = 0) {
  const left = Number(item.positionX || 0)
  const top = Number(item.positionY || 0)
  const height = getNodeHeight(item)
  const horizontalOffset = getPortOffsetAlong(nodeSize.width, index, count)
  const verticalOffset = getPortOffsetAlong(height, index, count)

  if (side === 'left') return { x: left - outward, y: top + verticalOffset }
  if (side === 'right') return { x: left + nodeSize.width + outward, y: top + verticalOffset }
  if (side === 'top') return { x: left + horizontalOffset, y: top - outward }
  return { x: left + horizontalOffset, y: top + height + outward }
}

function arrowTargetOutward(side) {
  return 0
}

function getPortStyle(item, side, index, count) {
  const point = getPortPoint({ ...item, positionX: 0, positionY: 0 }, side, index, count, 0)
  const edgeOffset = -4
  const borderOffset = 2
  if (side === 'left') return { left: edgeOffset, top: point.y - borderOffset }
  if (side === 'right') return { right: edgeOffset, top: point.y - borderOffset }
  if (side === 'top') return { left: point.x - borderOffset, top: edgeOffset }
  return { left: point.x - borderOffset, bottom: edgeOffset }
}

function getPortOffsetAlong(length, index, count) {
  if (count <= 1) return length / 2
  const gap = 28
  const center = length / 2
  const offset = (index - (count - 1) / 2) * gap
  return Math.min(length - 18, Math.max(18, center + offset))
}

function buildSideAwareRoute(start, startSide, end, endSide, slots = {}) {
  const routeOffset = slotOffset(slots.routeIndex, slots.routeCount, 46)
  const exit = extendFromSide(start, startSide, 26)
  const entry = extendFromSide(end, endSide, 38)
  const startHorizontal = isHorizontalSide(startSide)
  const endHorizontal = isHorizontalSide(endSide)
  const points = [start, exit]

  if (!endHorizontal) {
    const approachY = entry.y
    const finalDirection = Math.sign(end.y - entry.y) || 1
    const laneDistance = targetLaneDistance(slots.targetSlotIndex, slots.targetSlotCount)
    const laneX = end.x
    const corridorY = end.y - finalDirection * laneDistance
    if (startHorizontal) {
      const bendX = laneX + routeOffset
      points.push({ x: bendX, y: exit.y }, { x: bendX, y: corridorY }, { x: laneX, y: corridorY }, entry)
    } else {
      const midY = Math.round((exit.y + corridorY) / 2 + routeOffset)
      points.push({ x: exit.x, y: midY }, { x: laneX, y: midY }, { x: laneX, y: approachY }, entry)
    }
  } else {
    const laneY = end.y
    const finalDirection = Math.sign(end.x - entry.x) || 1
    const laneDistance = targetLaneDistance(slots.targetSlotIndex, slots.targetSlotCount)
    const approachX = end.x - finalDirection * laneDistance
    if (startHorizontal) {
      points.push({ x: approachX, y: exit.y }, { x: approachX, y: laneY }, entry)
    } else {
      const bendY = laneY + routeOffset
      points.push({ x: exit.x, y: bendY }, { x: approachX, y: bendY }, { x: approachX, y: laneY }, entry)
    }
  }

  points.push(end)

  const routePoints = compactRoutePoints(points)

  return {
    points: routePoints,
    labelPoint: routeLabelPoint(routePoints, slots),
  }
}

function routeLabelPoint(points, slots = {}) {
  const segments = []
  for (let index = 1; index < points.length - 1; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    const horizontal = Math.abs(a.y - b.y) < 0.5
    const vertical = Math.abs(a.x - b.x) < 0.5
    if (!horizontal && !vertical) continue
    const length = horizontal ? Math.abs(a.x - b.x) : Math.abs(a.y - b.y)
    if (length < 36) continue
    segments.push({ a, b, horizontal, length })
  }

  const segment = segments.sort((a, b) => b.length - a.length)[0]
  const labelOffset = slotOffset(
    slots.targetSlotIndex ?? slots.routeIndex,
    slots.targetSlotCount ?? slots.routeCount,
    10,
  )

  if (!segment) {
    const first = points[0]
    const last = points[points.length - 1]
    return {
      x: Math.round((first.x + last.x) / 2 + labelOffset),
      y: Math.round((first.y + last.y) / 2 - 10),
    }
  }

  return {
    x: Math.round((segment.a.x + segment.b.x) / 2 + (segment.horizontal ? 0 : 12 + labelOffset)),
    y: Math.round((segment.a.y + segment.b.y) / 2 + (segment.horizontal ? -10 + labelOffset : 0)),
  }
}

function compactRoutePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) return true
    const previous = points[index - 1]
    return Math.abs(point.x - previous.x) > 0.5 || Math.abs(point.y - previous.y) > 0.5
  })
}

function slotOffset(index = 0, count = 1, gap = 18) {
  if (count <= 1) return 0
  return (index - (count - 1) / 2) * gap
}

function targetLaneDistance(index = 0, count = 1) {
  return 40 + Math.max(0, Math.min(index, count - 1)) * 32
}

function extendFromSide(point, side, distance) {
  if (side === 'left') return { x: point.x - distance, y: point.y }
  if (side === 'right') return { x: point.x + distance, y: point.y }
  if (side === 'top') return { x: point.x, y: point.y - distance }
  return { x: point.x, y: point.y + distance }
}

function isHorizontalSide(side) {
  return side === 'left' || side === 'right'
}

function findFreeHorizontalLane(preferredY, fromX, toX, criteria, sourceId, targetId) {
  const margin = 18
  const offsets = [0, -42, 42, -84, 84, -126, 126, -168, 168]
  const obstacles = criteria
    .filter((item) => item.id !== sourceId && item.id !== targetId)
    .map((item) => ({
      left: Number(item.positionX || 0) - margin,
      right: Number(item.positionX || 0) + nodeSize.width + margin,
      top: Number(item.positionY || 0) - margin,
      bottom: Number(item.positionY || 0) + getNodeHeight(item) + margin,
    }))

  for (const offset of offsets) {
    const candidateY = preferredY + offset
    const crossesNode = obstacles.some((box) => {
      const overlapsX = toX >= box.left && fromX <= box.right
      const overlapsY = candidateY >= box.top && candidateY <= box.bottom
      return overlapsX && overlapsY
    })

    if (!crossesNode) return candidateY
  }

  return preferredY
}

function getPortOffset(item, index, count) {
  const base = item.kind === 'Compare' ? 70 : 64
  const gap = item.kind === 'Compare' ? 28 : 25
  return Math.max(30, base - ((count - 1) * gap) / 2 + index * gap)
}

function roundedPolylinePath(points) {
  const routePoints = points.filter((point, index) => {
    if (index === 0) return true
    const previous = points[index - 1]
    return Math.abs(point.x - previous.x) > 0.5 || Math.abs(point.y - previous.y) > 0.5
  })
  if (routePoints.length < 2) return ''

  let path = `M ${routePoints[0].x} ${routePoints[0].y}`

  for (let index = 1; index < routePoints.length; index += 1) {
    const current = routePoints[index]
    path += ` L ${current.x} ${current.y}`
  }

  return path
}

