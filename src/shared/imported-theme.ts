/**
 * Imported Theme Types (整体主题模型)
 * 一个导入主题是一个整体主题包，同时包含 App 外观 token、正文排版、代码块样式、字体。
 */

export interface ImportedThemeMetadata {
  id: string
  name: string
  source: 'typora'
  sourceFileName: string
  createdAt: string
  isDark: boolean
  warnings: string[]
  assets: {
    fontsDir: string
    imagesDir: string
  }
}

export interface ImportedThemeRecord {
  metadata: ImportedThemeMetadata
  css: string
}

/** 主题导入草稿（preview 阶段返回） */
export interface TyporaThemeImportDraft {
  id: string
  name: string
  css: string
  metadata: ImportedThemeMetadata
  warnings: string[]
  themeConfig?: {
    accent?: string
    surface?: string
    ink?: string
    headingColor?: string
    linkColor?: string
    blockquoteBg?: string
    blockquoteBorder?: string
    tableBorder?: string
    tableHeaderBg?: string
    inlineCodeBg?: string
    inlineCodeColor?: string
    codeBlockBg?: string
    codeBlockColor?: string
    fonts?: {
      ui?: string
      code?: string
      article?: string
      heading?: string
    }
  }
}

/** 兼容旧字段（内部使用，不暴露给新 UI） */
export interface LegacyImportedThemeMetadata extends ImportedThemeMetadata {
  supportsTypography: boolean
  supportsAppShell: boolean
}
