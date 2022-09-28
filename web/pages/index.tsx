import type { NextPage } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import styled from 'styled-components'
import { Canvas, setup } from '../util/Canvas'

const Home: NextPage = () => {
  return (
    <CanvasContainer onClick={async () => {
      // check if is mobile
      // await setDeviceOrientationPermission();
    }}>
      <Head>
        <title>hackr labs</title>
        <meta name="description" content="colorful dots go brrr" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"></meta>
        <link rel="icon" href="/hackrlabs.png" />
        <style>{`body { margin: 0px; padding: 0px; background-image: linear-gradient(120deg, #000000, #030303); overscroll-behavior-y: contain; touch-action: none; user-select: none; }`}</style>
      </Head>

      <Canvas style={{ width: "100%", height: "100%" }} />
    </CanvasContainer>
  )
}

const CanvasContainer = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  user-select: none;
`

export default Home
