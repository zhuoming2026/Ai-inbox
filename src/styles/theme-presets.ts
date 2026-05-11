export type ThemePresetId = string
export type ThemeVariant = 'light' | 'dark'

export interface ButtonToken {
  bg: string
  bgHover: string
  bgPressed: string
  text: string
  border: string
  borderHover: string
  shadow?: string
  icon?: string
}

export interface ThemePresetTokens {
  system: {
    accent: string
    focus: string
    selectionBg: string
    selectionText: string
    success: string
    successText: string
    danger: string
    dangerText: string
    warning: string
    warningText: string
    info: string
    infoText: string
  }
  fonts: {
    ui: string
    body: string
    heading: string
    code: string
  }
  radius: {
    sm: string
    md: string
    lg: string
    xl: string
    pill: string
  }
  app: {
    surfaces: {
      page: string
      pageSubtle: string
      sidebar: string
      card: string
      cardHover: string
      panel: string
      panelSoft: string
      control: string
      controlHover: string
      input: string
      inputFocus: string
      modal: string
      empty: string
      codePreview: string
    }
    text: {
      primary: string
      body: string
      muted: string
      subtle: string
      placeholder: string
      inverse: string
      accent: string
      link: string
    }
    border: {
      default: string
      subtle: string
      strong: string
      control: string
      controlHover: string
      controlStrong: string
      focus: string
      divider: string
      accent: string
      empty: string
    }
    actions: {
      primary: ButtonToken
      secondary: ButtonToken
      ghost: ButtonToken
      subtle: ButtonToken
      danger: ButtonToken
      warning: ButtonToken
      success: ButtonToken
      icon: ButtonToken
      iconActive: ButtonToken
    }
    navigation: {
      segmentedBg: string
      segmentedBorder: string
      segmentedShadow: string
      tabText: string
      tabHoverText: string
      tabActiveBg: string
      tabActiveText: string
      separator: string
      chipBg: string
      chipText: string
      chipLabel: string
      chipBorder: string
      chipSubtleBg: string
    }
    calendar: {
      controlBg: string
      controlHoverBg: string
      controlText: string
      todayBg: string
      todayText: string
      todayBorder: string
      cellText: string
      cellMutedOpacity: string
      cellHoverBg: string
      cellSelectedBg: string
      cellSelectedText: string
      cellSelectedBorder: string
      cellTodayText: string
      itemDot: string
    }
    cards: {
      itemBg: string
      itemBorder: string
      itemHoverShadow: string
      collectedBg: string
      collectedBorder: string
      collectedShadow: string
      deletedBg: string
      deletedBorder: string
      deletedHoverShadow: string
      imageBg: string
    }
    status: {
      successBg: string
      successText: string
      warningBg: string
      warningText: string
      dangerBg: string
      dangerText: string
      infoBg: string
      infoText: string
      neutralBg: string
      neutralText: string
    }
    overlay: {
      mask: string
      fade: string
      modalShadow: string
    }
    header: {
      bg: string
      border: string
    }
    shadow: {
      panel: string
      card: string
      button: string
      popover: string
    }
  }
  editorChrome: {
    shellBg: string
    contentBg: string
    border: string
    borderStrong: string
    focusBorder: string
    focusRing: string
    shadow: string
    toolbarBg: string
    toolbarBorder: string
    toolbarHoverBg: string
    toolbarActiveBg: string
    toolbarActiveStrongBg: string
    toolbarIcon: string
    toolbarIconHover: string
    toolbarIconActive: string
    popoverBg: string
    popoverBorder: string
    popoverShadow: string
    popoverItemHover: string
    popoverItemActive: string
    popoverIcon: string
    popoverIconHover: string
    popoverIconActive: string
    popoverInputColor: string
    popoverInputPlaceholder: string
    popoverSubtleBg: string
    popoverSubtleBorder: string
    popoverLabel: string
    frontmatterBg: string
    frontmatterHoverBg: string
    frontmatterBodyBg: string
    frontmatterBorder: string
    frontmatterShadow: string
  }
  article: {
    bg: string
    text: string
    textMuted: string
    heading: string
    placeholder: string
    link: string
    measure: string
    fontSize: string
    lineHeight: string
    letterSpacing: string
    paragraphSpacing: string
    h1Size: string
    h2Size: string
    h3Size: string
    h1Align: string
    h1Weight: string
    h2Weight: string
    h3Weight: string
  }
  code: {
    inlineBg: string
    inlineText: string
    blockBg: string
    blockText: string
    blockBorder: string
    fontSize: string
    lineHeight: string
  }
  blocks: {
    blockquoteBg: string
    blockquoteText: string
    blockquoteBorder: string
    tableBorder: string
    tableHeaderBg: string
    tableCellBg: string
    hr: string
    imageRadius: string
  }
}

export interface ThemePresetConfig {
  id?: string
  name?: string
  codeThemeId: string
  variant: ThemeVariant
  tokens: ThemePresetTokens
  articleCss?: string
  codeCss?: string
}

export const BASE_THEME_IDS = ['light', 'dark'] as const

export const themePresetMeta: Array<{ id: ThemePresetId; label: string; description: string; base?: boolean }> = [
  { id: 'light', label: 'Default Light', description: '正式基线浅色主题' },
  { id: 'dark', label: 'Default Dark', description: '正式基线深色主题' },
]

const DEPRECATED_BUILT_IN_THEME_IDS = new Set(['notion', 'claude'])

const fonts = {
  ui: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  body: '"New York", Charter, "Iowan Old Style", Georgia, "PingFang SC", "Songti SC", serif',
  heading: '"SF Pro Display", "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif',
  code: '"SF Mono", Menlo, Monaco, Consolas, monospace',
}

export const defaultThemeConfigs: Record<ThemePresetId, ThemePresetConfig> = {
  light: {
    id: 'light',
    name: 'Default Light',
    codeThemeId: 'github',
    variant: 'light',
    tokens: {
      system: {
        accent: '#c99512',
        focus: '#1f6feb',
        selectionBg: 'rgba(31, 111, 235, 0.2)',
        selectionText: '#111111',
        success: '#198754',
        successText: '#ffffff',
        danger: '#d14343',
        dangerText: '#9f1d1d',
        warning: '#c99512',
        warningText: '#734a00',
        info: '#0969da',
        infoText: '#0a4f9e',
      },
      fonts,
      radius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
        pill: '999px',
      },
      app: {
        surfaces: {
          page: '#f5f4ed',
          pageSubtle: '#faf9f6',
          sidebar: '#f8f7f1',
          card: '#fffefa',
          cardHover: '#ffffff',
          panel: '#ffffff',
          panelSoft: 'rgba(255, 252, 244, 0.74)',
          control: '#ffffff',
          controlHover: 'rgba(255, 255, 255, 0.96)',
          input: 'rgba(255, 255, 255, 0.7)',
          inputFocus: 'rgba(255, 255, 255, 0.94)',
          modal: '#ffffff',
          empty: 'rgba(255, 255, 255, 0.46)',
          codePreview: 'rgba(24, 20, 12, 0.04)',
        },
        text: {
          primary: '#171717',
          body: '#34332f',
          muted: '#706f68',
          subtle: '#918f86',
          placeholder: 'rgba(23, 23, 23, 0.32)',
          inverse: '#ffffff',
          accent: '#7a5200',
          link: '#0969da',
        },
        border: {
          default: 'rgba(42, 37, 24, 0.08)',
          subtle: 'rgba(42, 37, 24, 0.12)',
          strong: 'rgba(216, 210, 193, 0.92)',
          control: 'rgba(66, 60, 44, 0.12)',
          controlHover: 'rgba(66, 60, 44, 0.2)',
          controlStrong: 'rgba(66, 60, 44, 0.26)',
          focus: '#1f6feb',
          divider: 'rgba(42, 37, 24, 0.14)',
          accent: 'rgba(201, 149, 18, 0.34)',
          empty: 'rgba(93, 89, 82, 0.14)',
        },
        actions: {
          primary: {
            bg: '#f2c94c',
            bgHover: '#f5d76a',
            bgPressed: '#d9a928',
            text: '#3f2a00',
            border: 'rgba(183, 133, 10, 0.36)',
            borderHover: 'rgba(183, 133, 10, 0.5)',
            shadow: '0 10px 22px rgba(171, 121, 8, 0.16)',
          },
          secondary: {
            bg: 'rgba(255, 255, 255, 0.78)',
            bgHover: 'rgba(255, 255, 255, 0.96)',
            bgPressed: 'rgba(247, 244, 235, 0.96)',
            text: '#34332f',
            border: 'rgba(66, 60, 44, 0.12)',
            borderHover: 'rgba(66, 60, 44, 0.2)',
          },
          ghost: {
            bg: 'transparent',
            bgHover: 'rgba(42, 37, 24, 0.05)',
            bgPressed: 'rgba(42, 37, 24, 0.08)',
            text: '#34332f',
            border: 'transparent',
            borderHover: 'rgba(66, 60, 44, 0.12)',
          },
          subtle: {
            bg: 'rgba(42, 37, 24, 0.04)',
            bgHover: 'rgba(42, 37, 24, 0.07)',
            bgPressed: 'rgba(42, 37, 24, 0.1)',
            text: '#34332f',
            border: 'rgba(66, 60, 44, 0.08)',
            borderHover: 'rgba(66, 60, 44, 0.16)',
          },
          danger: {
            bg: 'rgba(209, 67, 67, 0.1)',
            bgHover: 'rgba(209, 67, 67, 0.16)',
            bgPressed: 'rgba(209, 67, 67, 0.22)',
            text: '#9f1d1d',
            border: 'rgba(209, 67, 67, 0.18)',
            borderHover: 'rgba(209, 67, 67, 0.28)',
          },
          warning: {
            bg: 'rgba(201, 149, 18, 0.14)',
            bgHover: 'rgba(201, 149, 18, 0.2)',
            bgPressed: 'rgba(201, 149, 18, 0.26)',
            text: '#734a00',
            border: 'rgba(201, 149, 18, 0.22)',
            borderHover: 'rgba(201, 149, 18, 0.34)',
          },
          success: {
            bg: '#198754',
            bgHover: '#157347',
            bgPressed: '#146c43',
            text: '#ffffff',
            border: 'rgba(25, 135, 84, 0.26)',
            borderHover: 'rgba(25, 135, 84, 0.38)',
          },
          icon: {
            bg: 'rgba(255, 255, 255, 0.82)',
            bgHover: 'rgba(42, 37, 24, 0.04)',
            bgPressed: 'rgba(42, 37, 24, 0.08)',
            text: '#34332f',
            border: 'rgba(66, 60, 44, 0.12)',
            borderHover: 'rgba(66, 60, 44, 0.22)',
          },
          iconActive: {
            bg: 'rgba(242, 201, 76, 0.18)',
            bgHover: 'rgba(242, 201, 76, 0.24)',
            bgPressed: 'rgba(242, 201, 76, 0.3)',
            text: '#7a5200',
            border: 'rgba(201, 149, 18, 0.34)',
            borderHover: 'rgba(201, 149, 18, 0.46)',
          },
        },
        navigation: {
          segmentedBg: 'rgba(255, 255, 255, 0.72)',
          segmentedBorder: 'rgba(77, 76, 72, 0.08)',
          segmentedShadow: '0 8px 22px rgba(36, 31, 18, 0.04)',
          tabText: '#706f68',
          tabHoverText: '#171717',
          tabActiveBg: 'rgba(242, 201, 76, 0.16)',
          tabActiveText: '#7a5200',
          separator: 'rgba(42, 37, 24, 0.18)',
          chipBg: 'rgba(242, 201, 76, 0.14)',
          chipText: '#34332f',
          chipLabel: '#706f68',
          chipBorder: 'rgba(201, 149, 18, 0.18)',
          chipSubtleBg: 'rgba(42, 37, 24, 0.04)',
        },
        calendar: {
          controlBg: 'rgba(255, 255, 255, 0.82)',
          controlHoverBg: 'rgba(255, 255, 255, 0.96)',
          controlText: '#34332f',
          todayBg: 'rgba(242, 201, 76, 0.22)',
          todayText: '#734a00',
          todayBorder: 'rgba(201, 149, 18, 0.34)',
          cellText: '#171717',
          cellMutedOpacity: '0.28',
          cellHoverBg: 'rgba(242, 201, 76, 0.12)',
          cellSelectedBg: 'rgba(242, 201, 76, 0.3)',
          cellSelectedText: '#3f2a00',
          cellSelectedBorder: 'rgba(201, 149, 18, 0.42)',
          cellTodayText: '#7a5200',
          itemDot: '#c99512',
        },
        cards: {
          itemBg: '#fffefa',
          itemBorder: 'rgba(42, 37, 24, 0.08)',
          itemHoverShadow: '0 14px 30px rgba(35, 30, 18, 0.08)',
          collectedBg: 'radial-gradient(circle at top right, rgba(242, 201, 76, 0.2), transparent 28%), linear-gradient(180deg, rgba(255, 249, 225, 0.94), rgba(255, 255, 255, 0.98))',
          collectedBorder: 'rgba(201, 149, 18, 0.36)',
          collectedShadow: '0 10px 24px rgba(171, 121, 8, 0.1)',
          deletedBg: 'linear-gradient(180deg, rgba(120, 125, 137, 0.05), rgba(255, 255, 255, 0.96))',
          deletedBorder: 'rgba(120, 125, 137, 0.24)',
          deletedHoverShadow: '0 12px 24px rgba(95, 98, 110, 0.08)',
          imageBg: 'linear-gradient(135deg, rgba(242, 201, 76, 0.18), rgba(31, 111, 235, 0.06))',
        },
        status: {
          successBg: 'rgba(25, 135, 84, 0.1)',
          successText: '#198754',
          warningBg: 'rgba(201, 149, 18, 0.14)',
          warningText: '#734a00',
          dangerBg: 'rgba(209, 67, 67, 0.1)',
          dangerText: '#9f1d1d',
          infoBg: 'rgba(9, 105, 218, 0.1)',
          infoText: '#0a4f9e',
          neutralBg: 'rgba(42, 37, 24, 0.05)',
          neutralText: '#706f68',
        },
        overlay: {
          mask: 'rgba(17, 24, 39, 0.18)',
          fade: 'linear-gradient(180deg, #f5f4ed 78%, rgba(245, 244, 237, 0))',
          modalShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
        },
        header: {
          bg: 'linear-gradient(180deg, rgba(255, 253, 247, 0.94), rgba(255, 255, 255, 0.7))',
          border: 'rgba(216, 210, 193, 0.92)',
        },
        shadow: {
          panel: '0 12px 28px rgba(40, 32, 16, 0.05)',
          card: '0 4px 20px rgba(0, 0, 0, 0.03)',
          button: '0 4px 12px rgba(36, 31, 18, 0.05)',
          popover: '0 18px 42px rgba(26, 26, 26, 0.1), 0 4px 14px rgba(26, 26, 26, 0.06)',
        },
      },
      editorChrome: {
        shellBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, #fffefa 20%)',
        contentBg: 'rgba(255, 255, 255, 0.88)',
        border: 'rgba(66, 60, 44, 0.12)',
        borderStrong: 'rgba(66, 60, 44, 0.18)',
        focusBorder: '#1f6feb',
        focusRing: 'rgba(31, 111, 235, 0.16)',
        shadow: '0 8px 22px rgba(40, 32, 16, 0.03)',
        toolbarBg: 'rgba(250, 249, 246, 0.9)',
        toolbarBorder: 'rgba(66, 60, 44, 0.12)',
        toolbarHoverBg: 'rgba(242, 201, 76, 0.12)',
        toolbarActiveBg: 'rgba(242, 201, 76, 0.18)',
        toolbarActiveStrongBg: 'rgba(242, 201, 76, 0.24)',
        toolbarIcon: '#706f68',
        toolbarIconHover: '#171717',
        toolbarIconActive: '#7a5200',
        popoverBg: 'rgba(255, 255, 255, 0.98)',
        popoverBorder: 'rgba(66, 60, 44, 0.12)',
        popoverShadow: '0 18px 42px rgba(26, 26, 26, 0.1), 0 4px 14px rgba(26, 26, 26, 0.06)',
        popoverItemHover: 'rgba(42, 37, 24, 0.06)',
        popoverItemActive: 'rgba(242, 201, 76, 0.18)',
        popoverIcon: '#34332f',
        popoverIconHover: '#171717',
        popoverIconActive: '#7a5200',
        popoverInputColor: '#171717',
        popoverInputPlaceholder: 'rgba(23, 23, 23, 0.32)',
        popoverSubtleBg: 'rgba(250, 249, 246, 0.94)',
        popoverSubtleBorder: 'rgba(66, 60, 44, 0.1)',
        popoverLabel: '#918f86',
        frontmatterBg: 'rgba(255, 255, 255, 0.96)',
        frontmatterHoverBg: '#ffffff',
        frontmatterBodyBg: 'rgba(255, 255, 255, 0.98)',
        frontmatterBorder: 'rgba(26, 26, 26, 0.06)',
        frontmatterShadow: '0 24px 48px rgba(48, 35, 14, 0.14)',
      },
      article: {
        bg: '#fffefa',
        text: '#30302c',
        textMuted: '#706f68',
        heading: '#171717',
        placeholder: 'rgba(23, 23, 23, 0.3)',
        link: '#0969da',
        measure: '70ch',
        fontSize: '16px',
        lineHeight: '1.68',
        letterSpacing: '0',
        paragraphSpacing: '0.78rem',
        h1Size: '2.35rem',
        h2Size: '1.78rem',
        h3Size: '1.34rem',
        h1Align: 'center',
        h1Weight: '750',
        h2Weight: '700',
        h3Weight: '680',
      },
      code: {
        inlineBg: '#f1f3f5',
        inlineText: '#cf222e',
        blockBg: '#f6f8fa',
        blockText: '#24292f',
        blockBorder: '#d0d7de',
        fontSize: '0.92em',
        lineHeight: '1.75',
      },
      blocks: {
        blockquoteBg: '#fbf7ec',
        blockquoteText: '#625b4c',
        blockquoteBorder: '#e5d7b5',
        tableBorder: '#ded8cb',
        tableHeaderBg: '#f4f0e6',
        tableCellBg: '#fffefa',
        hr: 'rgba(42, 37, 24, 0.14)',
        imageRadius: '16px',
      },
    },
  },
  dark: {
    id: 'dark',
    name: 'Default Dark',
    codeThemeId: 'night',
    variant: 'dark',
    tokens: {
      system: {
        accent: '#e0b84a',
        focus: '#78a9ff',
        selectionBg: 'rgba(120, 169, 255, 0.28)',
        selectionText: '#f5f4ed',
        success: '#41c783',
        successText: '#0f2418',
        danger: '#ff6b6b',
        dangerText: '#ffb3b3',
        warning: '#e0b84a',
        warningText: '#ffe2a0',
        info: '#78a9ff',
        infoText: '#b8d4ff',
      },
      fonts,
      radius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
        pill: '999px',
      },
      app: {
        surfaces: {
          page: '#181818',
          pageSubtle: '#202020',
          sidebar: '#1d1d1d',
          card: '#232323',
          cardHover: '#292929',
          panel: '#242424',
          panelSoft: 'rgba(45, 45, 45, 0.72)',
          control: '#2d2d2d',
          controlHover: 'rgba(58, 58, 58, 0.96)',
          input: 'rgba(255, 255, 255, 0.08)',
          inputFocus: 'rgba(255, 255, 255, 0.12)',
          modal: '#242424',
          empty: 'rgba(36, 36, 36, 0.5)',
          codePreview: 'rgba(255, 255, 255, 0.06)',
        },
        text: {
          primary: '#f5f4ed',
          body: 'rgba(245, 244, 237, 0.86)',
          muted: 'rgba(245, 244, 237, 0.62)',
          subtle: 'rgba(245, 244, 237, 0.42)',
          placeholder: 'rgba(245, 244, 237, 0.3)',
          inverse: '#171717',
          accent: '#ffe2a0',
          link: '#78a9ff',
        },
        border: {
          default: 'rgba(245, 244, 237, 0.1)',
          subtle: 'rgba(245, 244, 237, 0.14)',
          strong: 'rgba(245, 244, 237, 0.18)',
          control: 'rgba(245, 244, 237, 0.12)',
          controlHover: 'rgba(245, 244, 237, 0.22)',
          controlStrong: 'rgba(245, 244, 237, 0.28)',
          focus: '#78a9ff',
          divider: 'rgba(245, 244, 237, 0.18)',
          accent: 'rgba(224, 184, 74, 0.38)',
          empty: 'rgba(245, 244, 237, 0.12)',
        },
        actions: {
          primary: {
            bg: '#e0b84a',
            bgHover: '#efc95d',
            bgPressed: '#c99f31',
            text: '#241800',
            border: 'rgba(224, 184, 74, 0.46)',
            borderHover: 'rgba(224, 184, 74, 0.6)',
            shadow: '0 10px 22px rgba(224, 184, 74, 0.16)',
          },
          secondary: {
            bg: 'rgba(45, 45, 45, 0.82)',
            bgHover: 'rgba(58, 58, 58, 0.96)',
            bgPressed: 'rgba(67, 67, 67, 0.98)',
            text: 'rgba(245, 244, 237, 0.86)',
            border: 'rgba(245, 244, 237, 0.12)',
            borderHover: 'rgba(245, 244, 237, 0.22)',
          },
          ghost: {
            bg: 'transparent',
            bgHover: 'rgba(245, 244, 237, 0.06)',
            bgPressed: 'rgba(245, 244, 237, 0.1)',
            text: 'rgba(245, 244, 237, 0.86)',
            border: 'transparent',
            borderHover: 'rgba(245, 244, 237, 0.12)',
          },
          subtle: {
            bg: 'rgba(245, 244, 237, 0.05)',
            bgHover: 'rgba(245, 244, 237, 0.08)',
            bgPressed: 'rgba(245, 244, 237, 0.12)',
            text: 'rgba(245, 244, 237, 0.86)',
            border: 'rgba(245, 244, 237, 0.08)',
            borderHover: 'rgba(245, 244, 237, 0.16)',
          },
          danger: {
            bg: 'rgba(255, 107, 107, 0.12)',
            bgHover: 'rgba(255, 107, 107, 0.18)',
            bgPressed: 'rgba(255, 107, 107, 0.24)',
            text: '#ffb3b3',
            border: 'rgba(255, 107, 107, 0.2)',
            borderHover: 'rgba(255, 107, 107, 0.32)',
          },
          warning: {
            bg: 'rgba(224, 184, 74, 0.16)',
            bgHover: 'rgba(224, 184, 74, 0.22)',
            bgPressed: 'rgba(224, 184, 74, 0.28)',
            text: '#ffe2a0',
            border: 'rgba(224, 184, 74, 0.26)',
            borderHover: 'rgba(224, 184, 74, 0.38)',
          },
          success: {
            bg: '#41c783',
            bgHover: '#55d293',
            bgPressed: '#32ad6e',
            text: '#0f2418',
            border: 'rgba(65, 199, 131, 0.3)',
            borderHover: 'rgba(65, 199, 131, 0.42)',
          },
          icon: {
            bg: 'rgba(45, 45, 45, 0.82)',
            bgHover: 'rgba(245, 244, 237, 0.06)',
            bgPressed: 'rgba(245, 244, 237, 0.1)',
            text: 'rgba(245, 244, 237, 0.76)',
            border: 'rgba(245, 244, 237, 0.12)',
            borderHover: 'rgba(245, 244, 237, 0.22)',
          },
          iconActive: {
            bg: 'rgba(224, 184, 74, 0.18)',
            bgHover: 'rgba(224, 184, 74, 0.24)',
            bgPressed: 'rgba(224, 184, 74, 0.3)',
            text: '#ffe2a0',
            border: 'rgba(224, 184, 74, 0.36)',
            borderHover: 'rgba(224, 184, 74, 0.5)',
          },
        },
        navigation: {
          segmentedBg: 'rgba(36, 36, 36, 0.78)',
          segmentedBorder: 'rgba(245, 244, 237, 0.08)',
          segmentedShadow: '0 8px 22px rgba(0, 0, 0, 0.12)',
          tabText: 'rgba(245, 244, 237, 0.62)',
          tabHoverText: '#f5f4ed',
          tabActiveBg: 'rgba(224, 184, 74, 0.18)',
          tabActiveText: '#ffe2a0',
          separator: 'rgba(245, 244, 237, 0.18)',
          chipBg: 'rgba(224, 184, 74, 0.14)',
          chipText: 'rgba(245, 244, 237, 0.86)',
          chipLabel: 'rgba(245, 244, 237, 0.58)',
          chipBorder: 'rgba(224, 184, 74, 0.2)',
          chipSubtleBg: 'rgba(245, 244, 237, 0.05)',
        },
        calendar: {
          controlBg: 'rgba(45, 45, 45, 0.82)',
          controlHoverBg: 'rgba(58, 58, 58, 0.96)',
          controlText: 'rgba(245, 244, 237, 0.86)',
          todayBg: 'rgba(224, 184, 74, 0.18)',
          todayText: '#ffe2a0',
          todayBorder: 'rgba(224, 184, 74, 0.36)',
          cellText: '#f5f4ed',
          cellMutedOpacity: '0.3',
          cellHoverBg: 'rgba(224, 184, 74, 0.12)',
          cellSelectedBg: 'rgba(224, 184, 74, 0.3)',
          cellSelectedText: '#fff0c1',
          cellSelectedBorder: 'rgba(224, 184, 74, 0.46)',
          cellTodayText: '#ffe2a0',
          itemDot: '#e0b84a',
        },
        cards: {
          itemBg: '#232323',
          itemBorder: 'rgba(245, 244, 237, 0.1)',
          itemHoverShadow: '0 16px 34px rgba(0, 0, 0, 0.24)',
          collectedBg: 'radial-gradient(circle at top right, rgba(224, 184, 74, 0.18), transparent 28%), linear-gradient(180deg, rgba(45, 40, 26, 0.96), rgba(35, 35, 35, 0.98))',
          collectedBorder: 'rgba(224, 184, 74, 0.38)',
          collectedShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
          deletedBg: 'linear-gradient(180deg, rgba(120, 125, 137, 0.1), rgba(35, 35, 35, 0.94))',
          deletedBorder: 'rgba(245, 244, 237, 0.16)',
          deletedHoverShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
          imageBg: 'linear-gradient(135deg, rgba(224, 184, 74, 0.16), rgba(120, 169, 255, 0.08))',
        },
        status: {
          successBg: 'rgba(65, 199, 131, 0.12)',
          successText: '#8ee8b7',
          warningBg: 'rgba(224, 184, 74, 0.16)',
          warningText: '#ffe2a0',
          dangerBg: 'rgba(255, 107, 107, 0.12)',
          dangerText: '#ffb3b3',
          infoBg: 'rgba(120, 169, 255, 0.14)',
          infoText: '#b8d4ff',
          neutralBg: 'rgba(245, 244, 237, 0.06)',
          neutralText: 'rgba(245, 244, 237, 0.62)',
        },
        overlay: {
          mask: 'rgba(0, 0, 0, 0.42)',
          fade: 'linear-gradient(180deg, #181818 78%, rgba(24, 24, 24, 0))',
          modalShadow: '0 24px 60px rgba(0, 0, 0, 0.34)',
        },
        header: {
          bg: 'linear-gradient(180deg, rgba(36, 36, 36, 0.96), rgba(32, 32, 32, 0.76))',
          border: 'rgba(245, 244, 237, 0.14)',
        },
        shadow: {
          panel: '0 12px 28px rgba(0, 0, 0, 0.22)',
          card: '0 4px 20px rgba(0, 0, 0, 0.16)',
          button: '0 4px 12px rgba(0, 0, 0, 0.16)',
          popover: '0 18px 42px rgba(0, 0, 0, 0.32), 0 4px 14px rgba(0, 0, 0, 0.2)',
        },
      },
      editorChrome: {
        shellBg: 'linear-gradient(180deg, rgba(36, 36, 36, 0.96) 0%, #232323 20%)',
        contentBg: 'rgba(35, 35, 35, 0.86)',
        border: 'rgba(245, 244, 237, 0.12)',
        borderStrong: 'rgba(245, 244, 237, 0.22)',
        focusBorder: '#78a9ff',
        focusRing: 'rgba(120, 169, 255, 0.2)',
        shadow: '0 8px 22px rgba(0, 0, 0, 0.2)',
        toolbarBg: 'rgba(32, 32, 32, 0.92)',
        toolbarBorder: 'rgba(245, 244, 237, 0.12)',
        toolbarHoverBg: 'rgba(245, 244, 237, 0.06)',
        toolbarActiveBg: 'rgba(224, 184, 74, 0.18)',
        toolbarActiveStrongBg: 'rgba(224, 184, 74, 0.24)',
        toolbarIcon: 'rgba(245, 244, 237, 0.66)',
        toolbarIconHover: '#f5f4ed',
        toolbarIconActive: '#ffe2a0',
        popoverBg: 'rgba(36, 36, 36, 0.98)',
        popoverBorder: 'rgba(245, 244, 237, 0.12)',
        popoverShadow: '0 18px 42px rgba(0, 0, 0, 0.32), 0 4px 14px rgba(0, 0, 0, 0.2)',
        popoverItemHover: 'rgba(245, 244, 237, 0.06)',
        popoverItemActive: 'rgba(224, 184, 74, 0.18)',
        popoverIcon: 'rgba(245, 244, 237, 0.78)',
        popoverIconHover: '#f5f4ed',
        popoverIconActive: '#ffe2a0',
        popoverInputColor: '#f5f4ed',
        popoverInputPlaceholder: 'rgba(245, 244, 237, 0.3)',
        popoverSubtleBg: 'rgba(245, 244, 237, 0.06)',
        popoverSubtleBorder: 'rgba(245, 244, 237, 0.1)',
        popoverLabel: 'rgba(245, 244, 237, 0.48)',
        frontmatterBg: 'rgba(36, 36, 36, 0.96)',
        frontmatterHoverBg: '#2f2f2f',
        frontmatterBodyBg: 'rgba(36, 36, 36, 0.98)',
        frontmatterBorder: 'rgba(245, 244, 237, 0.1)',
        frontmatterShadow: '0 24px 48px rgba(0, 0, 0, 0.34)',
      },
      article: {
        bg: '#232323',
        text: 'rgba(245, 244, 237, 0.86)',
        textMuted: 'rgba(245, 244, 237, 0.62)',
        heading: '#fff7dc',
        placeholder: 'rgba(245, 244, 237, 0.3)',
        link: '#78a9ff',
        measure: '70ch',
        fontSize: '16px',
        lineHeight: '1.68',
        letterSpacing: '0',
        paragraphSpacing: '0.78rem',
        h1Size: '2.35rem',
        h2Size: '1.78rem',
        h3Size: '1.34rem',
        h1Align: 'center',
        h1Weight: '750',
        h2Weight: '700',
        h3Weight: '680',
      },
      code: {
        inlineBg: 'rgba(110, 118, 129, 0.18)',
        inlineText: '#ffb86b',
        blockBg: '#0d1117',
        blockText: '#c9d1d9',
        blockBorder: '#30363d',
        fontSize: '0.92em',
        lineHeight: '1.75',
      },
      blocks: {
        blockquoteBg: 'rgba(55, 49, 35, 0.7)',
        blockquoteText: 'rgba(245, 244, 237, 0.68)',
        blockquoteBorder: 'rgba(224, 184, 74, 0.26)',
        tableBorder: 'rgba(245, 244, 237, 0.14)',
        tableHeaderBg: 'rgba(53, 47, 34, 0.96)',
        tableCellBg: 'rgba(35, 35, 35, 0.94)',
        hr: 'rgba(245, 244, 237, 0.16)',
        imageRadius: '16px',
      },
    },
  },
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T>(fallback: T, value: unknown): T {
  if (!isObject(fallback)) {
    return typeof value === typeof fallback ? value as T : fallback
  }

  const source = isObject(value) ? value : {}
  const next: Record<string, unknown> = {}
  for (const [key, fallbackValue] of Object.entries(fallback)) {
    const sourceValue = source[key]
    next[key] = isObject(fallbackValue)
      ? deepMerge(fallbackValue, sourceValue)
      : (typeof sourceValue === typeof fallbackValue ? sourceValue : fallbackValue)
  }
  return next as T
}

export function isBaseThemeId(id: string) {
  return BASE_THEME_IDS.includes(id as (typeof BASE_THEME_IDS)[number])
}

export function getThemeName(id: string, config?: ThemePresetConfig) {
  return config?.name || themePresetMeta.find((preset) => preset.id === id)?.label || id
}

export function slugifyThemeName(name: string, existingIds: string[] = []) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'theme'

  let next = base
  let counter = 2
  while (existingIds.includes(next)) {
    next = `${base}-${counter}`
    counter += 1
  }
  return next
}

export function normalizeThemeConfig(id: string, raw: unknown, fallback: ThemePresetConfig = defaultThemeConfigs.light): ThemePresetConfig {
  const candidate = isObject(raw) ? raw : {}
  const variant: ThemeVariant = candidate.variant === 'dark' ? 'dark' : fallback.variant
  const baseline = variant === 'dark' ? defaultThemeConfigs.dark : defaultThemeConfigs.light
  const effectiveFallback = fallback.variant === variant ? fallback : baseline

  return {
    id,
    name: typeof candidate.name === 'string' ? candidate.name : getThemeName(id, effectiveFallback),
    codeThemeId: typeof candidate.codeThemeId === 'string' ? candidate.codeThemeId : effectiveFallback.codeThemeId,
    variant,
    tokens: deepMerge(effectiveFallback.tokens, candidate.tokens),
    articleCss: typeof candidate.articleCss === 'string' ? candidate.articleCss : effectiveFallback.articleCss,
    codeCss: typeof candidate.codeCss === 'string' ? candidate.codeCss : effectiveFallback.codeCss,
  }
}

export function normalizeThemeConfigs(raw: unknown): Record<ThemePresetId, ThemePresetConfig> {
  const source = isObject(raw) ? raw : {}
  const next: Record<ThemePresetId, ThemePresetConfig> = {}

  for (const [id, config] of Object.entries(defaultThemeConfigs)) {
    next[id] = normalizeThemeConfig(id, source[id] || config, config)
  }

  for (const [id, config] of Object.entries(source)) {
    if (next[id]) continue
    if (DEPRECATED_BUILT_IN_THEME_IDS.has(id)) continue
    const rawConfig = isObject(config) ? config : {}
    const fallback = rawConfig.variant === 'dark' ? defaultThemeConfigs.dark : defaultThemeConfigs.light
    next[id] = normalizeThemeConfig(id, config, fallback)
  }

  return next
}

export function listThemeOptions(configs: Record<string, ThemePresetConfig>) {
  return Object.entries(configs).map(([id, config]) => ({
    id,
    label: getThemeName(id, config),
    base: isBaseThemeId(id),
    variant: config.variant,
  }))
}

export function exportThemeConfig(config: ThemePresetConfig) {
  const file = {
    name: config.name,
    variant: config.variant,
    codeThemeId: config.codeThemeId,
    tokens: config.tokens,
    articleCss: config.articleCss || '',
    codeCss: config.codeCss || '',
  }

  return [
    '/* ai-inbox theme v2',
    '   tokens: system/fonts/radius/app/editorChrome/article/code/blocks',
    '   Typora 导入只应覆盖 article/code/blocks 及字体，不应污染 app actions。',
    '*/',
    JSON.stringify(file, null, 2),
  ].join('\n')
}
