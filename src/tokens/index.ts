import designTokens from "./design-tokens.json"

export const tokens = designTokens
export default designTokens

export type DesignTokens = typeof designTokens
export type TextColor = keyof typeof designTokens.color.text
export type IconColor = keyof typeof designTokens.color.icon
export type SurfaceColor = keyof typeof designTokens.color.surface
export type StrokeColor = keyof typeof designTokens.color.stroke
export type BackgroundColor = keyof typeof designTokens.color.background

export type HeaderStyle = keyof typeof designTokens.typography.header
export type TitleStyle = keyof typeof designTokens.typography.title
export type ParagraphStyle = keyof typeof designTokens.typography.paragraph
