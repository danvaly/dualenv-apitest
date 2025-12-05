/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern dark theme palette
        dark: {
          bg: '#0d1117',
          'bg-secondary': '#161b22',
          'bg-tertiary': '#21262d',
          card: '#1c2128',
          'card-hover': '#262c36',
          border: '#30363d',
          'border-light': '#484f58',
        },
        // Accent colors
        accent: {
          primary: '#58a6ff',
          'primary-hover': '#79b8ff',
          success: '#3fb950',
          warning: '#d29922',
          error: '#f85149',
          purple: '#a371f7',
        },
        // Text colors
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          tertiary: '#6e7681',
          link: '#58a6ff',
        },
        // Method colors
        method: {
          get: '#3fb950',
          post: '#58a6ff',
          put: '#d29922',
          patch: '#db6d28',
          delete: '#f85149',
        },
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': ['10px', { lineHeight: '1.4' }],
        'sm': ['11px', { lineHeight: '1.4' }],
        'base': ['12px', { lineHeight: '1.5' }],
        'lg': ['14px', { lineHeight: '1.4' }],
        'xl': ['16px', { lineHeight: '1.3' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
        'card-lg': '0 4px 12px rgba(0,0,0,0.4)',
        'glow': '0 0 20px rgba(88,166,255,0.15)',
        'glow-success': '0 0 20px rgba(63,185,80,0.15)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
    },
  },
  plugins: [],
}
