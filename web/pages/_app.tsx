import type { AppProps } from 'next/app'
import React from 'react';
import { ThemeProvider, DefaultTheme } from 'styled-components'

const theme: DefaultTheme = {
  colors: {
    primary: '#111',
    secondary: '#0070f3',
  },
}

export default function App({ Component, pageProps }: AppProps) {

  const [pageLoaded, setPageLoaded] = React.useState(false);

  React.useEffect(() => {
    setPageLoaded(true);
  }, []);
  return (
    <>
      <ThemeProvider theme={theme}>
        {(pageLoaded) ?
          <Component {...pageProps} />
          : null
        }
      </ThemeProvider>
    </>
  )
}