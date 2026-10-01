import type { MemberType } from '../api/membershipApi'

export interface WingDefinition {
  type: MemberType
  label: string
  plural: string
}

export const WINGS: WingDefinition[] = [
  { type: 'SCOUT', label: 'Scout', plural: 'Scouts' },
  { type: 'GUIDE', label: 'Guide', plural: 'Guides' },
  { type: 'CUB', label: 'Cub', plural: 'Cubs' },
  { type: 'BULBUL', label: 'Bulbul', plural: 'Bulbuls' },
  { type: 'ROVER', label: 'Rover', plural: 'Rovers' },
  { type: 'RANGER', label: 'Ranger', plural: 'Rangers' },
  { type: 'ALUMNI', label: 'Life Member', plural: 'Life Members' },
  { type: 'LEADER', label: 'Leader', plural: 'Leaders' },
]

export const wingLabel = (type: MemberType | string, plural = false) => {
  const wing = WINGS.find((item) => item.type === type)
  return plural ? wing?.plural ?? type : wing?.label ?? type
}

export const isLeaderOrLifeMember = (type: MemberType | string) => type === 'ALUMNI' || type === 'LEADER'
