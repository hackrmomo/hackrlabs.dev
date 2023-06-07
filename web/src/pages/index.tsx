import Head from "next/head";
import { Poppins } from "next/font/google";
const poppins = Poppins({ subsets: ["latin"], weight: "400", style: "normal" });

export default function Home() {
  return (
    <>
      <Head>
        <title>hackrlabs</title>
        <meta name="description" content="building the premium" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${poppins.className}`}>
        <h1>hackrlabs</h1>
      </main>
    </>
  );
}
