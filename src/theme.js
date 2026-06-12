import { alpha, createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c9cff',
    },
    secondary: {
      main: '#6ce5c8',
    },
    success: {
      main: '#63d28f',
    },
    warning: {
      main: '#f7b267',
    },
    error: {
      main: '#ff7b8f',
    },
    background: {
      default: '#090e18',
      paper: '#11182b',
    },
    text: {
      primary: '#edf2ff',
      secondary: '#a7b3cc',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 650,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at top left, rgba(124, 156, 255, 0.22), transparent 32%), radial-gradient(circle at top right, rgba(108, 229, 200, 0.16), transparent 28%), #090e18',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
          backdropFilter: 'blur(18px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#0d1321', 0.82),
        },
      },
    },
  },
});
