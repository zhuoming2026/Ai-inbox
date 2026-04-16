/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#f5f4ed',
        'bg-secondary': '#f9f9f9',
        'bg-white': '#ffffff',
        'text-primary': '#000000',
        'text-secondary': '#4a4a4a',
        'text-tertiary': '#666666',
        'accent-primary': '#fabb18',
        'accent-secondary': '#7d341c',
        'border-light': 'rgba(26, 26, 26, 0.05)',
        'border-medium': '#3c3c43',
        'tag-ready': '#1aae39',
        'tag-working': '#097fe8',
        'tag-finished': '#213183',
        'tag-neutral': '#3c3c43',
      },
      fontFamily: {
        'brand': ['Acme', 'PingFang SC', 'sans-serif'],
        'body': ['Inter', 'PingFang SC', 'sans-serif'],
        'serif': ['Newsreader', 'PingFang SC', 'serif'],
        'mono': ['Source Code Pro', 'PingFang SC', 'monospace'],
        'system': ['SF Pro Text', 'PingFang SC', 'sans-serif'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '16px',
        'pill': '9999px',
        'panel': '38px',
      },
      boxShadow: {
        'card': '0px 4px 4px 0px rgba(0, 0, 0, 0.25)',
        'card-hover': '0px 8px 16px 0px rgba(0, 0, 0, 0.25)',
        'input': '0px 4px 20px 0px rgba(0, 0, 0, 0.03)',
        'panel': '0px 16px 31px 0px rgba(0, 0, 0, 0.01)',
      },
    },
  },
  plugins: [],
}
